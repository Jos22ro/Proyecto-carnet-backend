import { Router } from 'express';
import { 
  getMascotas, 
  getMascotaById, 
  getMascotaStats, 
  createMascota,
  updateMascotaEstado,
  exportDetallesMascotasExcel,
  getMesesMascotasDisponibles
} from '../controllers/mascotas.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/mascotas - Get all mascotas
router.get('/', getMascotas);

// GET /api/mascotas/stats - Get mascota statistics
router.get('/stats', getMascotaStats);

router.get("/meses", getMesesMascotasDisponibles);
router.get("/excel", exportDetallesMascotasExcel);


// GET /api/mascotas/:id - Get mascota by ID
router.get('/:id', getMascotaById);

router.post('/', createMascota);

router.patch("/:id/estado", updateMascotaEstado);




export default router;