import { Router } from 'express';
import { body } from 'express-validator';
import { login, logout, refreshToken, getProfile } from '../controllers/auth.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Login validation
const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
];

// Routes
router.post('/login', loginValidation, login);
router.post('/logout', logout);
router.post('/refresh', authenticateToken, refreshToken);
router.get('/profile', authenticateToken, getProfile);

export default router;