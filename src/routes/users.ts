import { Router } from "express";
import { createUser } from "../controllers/users.js";
import { authenticateToken } from "../middleware/auth.js"; // si tu auth middleware se llama así

const router = Router();

// Recomendado: protegerlo para solo admins
router.post("/", authenticateToken, createUser);

export default router;
