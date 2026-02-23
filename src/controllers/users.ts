import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { executeQuery } from "../db/connection.js";
import { ApiResponse } from "../types/index.js";

type CreateUserBody = {
  email: string;
  password: string;
  role?: string; // default: "admin" o "user" según tu app
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role }: CreateUserBody = req.body;

    // Validaciones mínimas
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: "Campos requeridos: email, password",
      } as ApiResponse);
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const finalRole = (role ?? "admin").trim(); // ajusta el default si quieres "user"

    // Verificar si ya existe
    const existing: any[] = await executeQuery(
      "SELECT id_usuario FROM usuarios WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (existing.length > 0) {
      res.status(409).json({
        success: false,
        error: "Ya existe un usuario con ese email",
      } as ApiResponse);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert
    const insertResult: any = await executeQuery(
      `
      INSERT INTO usuarios (email, password, role, created_at, updated_at)
      VALUES (?, ?, ?, NOW(), NOW())
      `,
      [normalizedEmail, hashedPassword, finalRole]
    );

    const id_usuario = insertResult.insertId;

    // Retornar el usuario creado (sin password)
    const created: any[] = await executeQuery(
      `
      SELECT id_usuario, email, role, created_at, updated_at
      FROM usuarios
      WHERE id_usuario = ?
      `,
      [id_usuario]
    );

    res.status(201).json({
      success: true,
      data: created[0],
    } as ApiResponse);
  } catch (error: any) {
    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      error: error?.sqlMessage || error?.message || "Internal server error",
    } as ApiResponse);
  }
};
