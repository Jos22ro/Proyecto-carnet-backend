import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/index.js';

// Middleware to verify JWT token
export const authenticateToken = (req: Request, res: Response, next: Function): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Access token required'
    });
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err, decoded) => {
    if (err) {
      res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }

    req.user = decoded as JwtPayload;
    next();
  });
};

// Middleware to check if user has specific role
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: Function): void => {
    const user = req.user as JwtPayload;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // For now, we'll assume all authenticated users have admin rights
    // In a real app, you'd check user.role against the required roles
    next();
  };
};

// Utility to generate JWT token
export const generateToken = (payload: { userId: string; email: string }): string => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );
};

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}