import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { testConnection } from './db/connection.js';

// Import routes
import authRoutes from './routes/auth.js';
import solicitudRoutes from './routes/solicitudes.js';
import emprendedorRoutes from './routes/emprendedores.js';
import mascotaRoutes from './routes/mascotas.js';
import webhookRoutes from './routes/webhook.js';
import usersRoutes from "./routes/users.js";
import { createMascota } from './controllers/mascotas.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-domain.com']
    : [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080'
    ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/solicitudes', solicitudRoutes);
app.use('/api/emprendedores', emprendedorRoutes);
app.use('/api/mascotas', mascotaRoutes);
app.use('/api/webhook', webhookRoutes);
app.use("/api/users", usersRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Unhandled error:', err);

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    console.log('🔍 Testing TCP connection to database...');
    try {
      const net = await import('net');
      const host = process.env.DB_HOST || 'localhost';
      const port = Number(process.env.DB_PORT) || 3306;

      await new Promise<void>((resolve, reject) => {
        const socket = net.createConnection(port, host, () => {
          console.log(`✅ TCP Connection to ${host}:${port} successful!`);
          socket.end();
          resolve();
        });
        socket.on('error', (err) => {
          reject(err);
        });
        socket.setTimeout(5000, () => {
          socket.destroy();
          reject(new Error('TCP Connection timed out after 5s'));
        });
      });
    } catch (netError: any) {
      console.error('❌ TCP Connection failed:', netError.message);
      console.log('⚠️ Could not reach the database server via TCP. Check your Firewall or VPN.');
    }

    const dbConnected = await testConnection();
    if (dbConnected) {
      // Run migrations
      const { runMigrations } = await import('./db/migrate.js');
      await runMigrations();
    }
    if (!dbConnected) {
      console.error('❌ Cannot start server without database connection');
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 API docs available at http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

export default app;