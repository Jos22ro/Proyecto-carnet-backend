import { Router } from 'express';
import { body, query } from 'express-validator';
import { 
  getSolicitudes, 
  getSolicitudById, 
  createSolicitud, 
  updateSolicitud, 
  deleteSolicitud 
} from '../controllers/solicitudes.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Apply authentication to all routes except GET (public read)
router.use(authenticateToken);

// GET /api/solicitudes - Get all solicitudes with filters
router.get('/', [
  query('estado').optional().isIn(['pendiente', 'aprobado', 'rechazado']),
  query('tipo_solicitud').optional().isIn(['emprendedor', 'mascota']),
  query('origen').optional().isIn(['formulario', 'manual']),
  query('email_contacto').optional().isEmail(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], getSolicitudes);

// GET /api/solicitudes/:id - Get solicitud by ID
router.get('/:id', [
  query('id').isInt({ min: 1 })
], getSolicitudById);

// POST /api/solicitudes - Create new solicitud
router.post('/', [
  body('tipo_solicitud').isIn(['emprendedor', 'mascota']),
  body('origen').isIn(['formulario', 'manual']),
  body('email_contacto').isEmail().normalizeEmail(),
  body('detalles').notEmpty().isObject()
], createSolicitud);

// PUT /api/solicitudes/:id - Update solicitud
router.put('/:id', [
  query('id').isInt({ min: 1 }),
  body('estado').optional().isIn(['pendiente', 'aprobado', 'rechazado']),
  body('email_contacto').optional().isEmail().normalizeEmail()
], updateSolicitud);

// DELETE /api/solicitudes/:id - Delete solicitud
router.delete('/:id', [
  query('id').isInt({ min: 1 })
], deleteSolicitud);

export default router;