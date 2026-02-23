import { Router } from 'express';
import { 
  getEmprendedores, 
  getEmprendedorById, 
  getEmprendedorStats, 
  createEmprendedor,
  updateEmprendedorEstado,
  exportDetallesEmprendedoresExcel,
  getMesesEmprendedoresDisponibles,
} from '../controllers/emprendedores.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/emprendedores - Get all emprendedores
router.get('/', getEmprendedores);

// GET /api/emprendedores/stats - Get emprendedor statistics
router.get('/stats', getEmprendedorStats);
router.get('/excel', exportDetallesEmprendedoresExcel);
router.get('/meses', getMesesEmprendedoresDisponibles);

router.post('/', createEmprendedor);

// GET /api/emprendedores/:id - Get emprendedor by ID
router.get('/:id', getEmprendedorById);

router.patch('/:id/estado', updateEmprendedorEstado);


export default router;