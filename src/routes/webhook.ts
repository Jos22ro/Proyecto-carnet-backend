import { Router } from 'express';
import { body } from 'express-validator';
import { 
  receiveFormSubmission, 
  testWebhook, 
  getWebhookStatus 
} from '../controllers/webhook.js';

const router = Router();

// POST /api/webhook/solicitud - Receive Google Forms submission
router.post('/solicitud', [
  body('tipo_solicitud').isIn(['emprendedor', 'mascota']),
  body('email_contacto').isEmail().normalizeEmail()
], receiveFormSubmission);

// GET /api/webhook/test - Test webhook endpoint
router.get('/test', testWebhook);

// GET /api/webhook/status - Get webhook status
router.get('/status', getWebhookStatus);

export default router;