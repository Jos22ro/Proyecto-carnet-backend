
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

dotenv.config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'carnet_comunitario',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: process.env.DB_SSL_MODE === 'REQUIRED' ? { rejectUnauthorized: false } : undefined
};

async function test() {
    console.log('1. Starting DB Connection test...');
    console.time('DB Connection');
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.timeEnd('DB Connection');
        console.log('✅ DB Connected.');

        console.log('2. Testing Query for "usuarios" table...');
        console.time('Query Time');
        const [rows] = await connection.execute('SELECT * FROM usuarios LIMIT 1');
        console.timeEnd('Query Time');
        console.log('✅ Query success. Rows found:', (rows as any[]).length);
        if ((rows as any[]).length > 0) {
            console.log('Sample user:', (rows as any[])[0]);
        }

        console.log('3. Testing Password Hash (Bcrypt)...');
        // Test a sample hash comparison
        const password = 'password123';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        console.log('Generated hash:', hash);

        console.time('Bcrypt Compare');
        await bcrypt.compare(password, hash);
        console.timeEnd('Bcrypt Compare');

    } catch (error) {
        console.error('❌ Error during test:', error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

test();
