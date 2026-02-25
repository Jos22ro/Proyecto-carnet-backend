import { Request, Response } from "express";
import crypto from "crypto";
import {
  executeQuery,
  executeQueryOne,
  executeInsert,
  executeUpdate,
  executeTransaction,
} from "../db/connection.js";
import {
  Solicitud,
  SolicitudFilters,
  ApiResponse,
  PaginatedResponse,
  CreateSolicitudRequest,
  UpdateSolicitudRequest,
  SolicitudConDetalles,
} from "../types/index.js";

// Generate QR hash
const generateQRHash = (email: string): string => {
  return crypto.createHash("md5").update(`${email}${Date.now()}`).digest("hex");
};

// Get all solicitudes with filters and pagination
export const getSolicitudes = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      estado,
      tipo_solicitud,
      origen,
      email_contacto,
      fecha_inicio,
      fecha_fin,
      page = 1,
      limit = 20,
    } = req.query as SolicitudFilters;

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100); // max 100
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause
    const whereConditions: string[] = [];
    const params: any[] = [];

    if (estado) {
      whereConditions.push("estado = ?");
      params.push(estado);
    }

    if (tipo_solicitud) {
      whereConditions.push("tipo_solicitud = ?");
      params.push(tipo_solicitud);
    }

    if (origen) {
      whereConditions.push("origen = ?");
      params.push(origen);
    }

    if (email_contacto) {
      whereConditions.push("email_contacto LIKE ?");
      params.push(`%${email_contacto}%`);
    }

    if (fecha_inicio) {
      whereConditions.push("fecha_creacion >= ?");
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      whereConditions.push("fecha_creacion <= ?");
      params.push(fecha_fin);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM solicitudes ${whereClause}`;
    const countResult = await executeQueryOne<{ total: bigint }>(
      countQuery,
      params,
    );
    const total = Number(countResult?.total || 0);

    // ✅ IMPORTANTE: NO usar ? en LIMIT/OFFSET
    // Solo se insertan números enteros ya validados (seguro)
    const solicitudesQuery = `
      SELECT * FROM solicitudes
      ${whereClause}
      ORDER BY fecha_creacion DESC
      LIMIT ${Math.floor(limitNum)} OFFSET ${Math.floor(offset)}
    `;

    const solicitudes = await executeQuery<Solicitud>(solicitudesQuery, params);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: solicitudes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    } as PaginatedResponse<Solicitud>);
  } catch (error: any) {
    console.error("Error getting solicitudes:", error);
    res.status(500).json({
      success: false,
      error: error?.sqlMessage || error?.message || "Internal server error",
    } as ApiResponse);
  }
};

// Get solicitud by ID with details
export const getSolicitudById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    // Get main solicitud
    const solicitud = await executeQueryOne<Solicitud>(
      "SELECT * FROM solicitudes WHERE id_solicitud = ?",
      [id],
    );

    if (!solicitud) {
      res.status(404).json({
        success: false,
        error: "Solicitud not found",
      } as ApiResponse);
      return;
    }

    let detalles: any = null;

    // Get specific details based on type
    switch (solicitud.tipo_solicitud) {
      case "emprendedor":
        detalles = await executeQueryOne(
          "SELECT * FROM detalles_emprendedores WHERE id_solicitud = ?",
          [id],
        );
        break;
      case "mascota":
        detalles = await executeQueryOne(
          "SELECT * FROM detalles_mascotas WHERE id_solicitud = ?",
          [id],
        );
        break;
    }

    // Get logs
    const logs = await executeQuery(
      "SELECT * FROM logs_envio WHERE id_solicitud = ? ORDER BY fecha_envio DESC",
      [id],
    );

    const solicitudCompleta: SolicitudConDetalles = {
      ...solicitud,
      detalles: detalles === null ? undefined : detalles,
      logs_envio: logs,
    };

    res.json({
      success: true,
      data: solicitudCompleta,
    } as ApiResponse<SolicitudConDetalles>);
  } catch (error) {
    console.error("Error getting solicitud by ID:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    } as ApiResponse);
  }
};

// Create new solicitud
export const createSolicitud = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      tipo_solicitud,
      origen,
      email_contacto,
      detalles,
    }: CreateSolicitudRequest = req.body;

    // Validate required fields
    if (!tipo_solicitud || !origen || !email_contacto || !detalles) {
      res.status(400).json({
        success: false,
        error: "Missing required fields",
      } as ApiResponse);
      return;
    }

    const qrHash = generateQRHash(email_contacto);

    // Create solicitud in a transaction
    const queries = [
      {
        query: `
          INSERT INTO solicitudes (tipo_solicitud, origen, email_contacto, codigo_qr_hash)
          VALUES (?, ?, ?, ?)
        `,
        params: [tipo_solicitud, origen, email_contacto, qrHash],
      },
    ];

    // Add specific details query
    switch (tipo_solicitud) {
      case "emprendedor":
        const emp = detalles as any;
        queries.push({
          query: `
            INSERT INTO detalles_emprendedores (
              id_solicitud, documento_titular, razon_social, nombre_comercial, 
              registro_fiscal, descripcion_actividad, tipo_persona, direccion_fisica, 
              telefono_contacto, fecha_vencimiento, rubro
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          params: [
            "LAST_INSERT_ID()",
            emp.documento_titular,
            emp.razon_social,
            emp.nombre_comercial || null,
            emp.registro_fiscal || null,
            emp.descripcion_actividad || null,
            emp.tipo_persona,
            emp.direccion_fisica,
            emp.telefono_contacto,
            emp.fecha_vencimiento || null,
            emp.rubro || null,
          ],
        });
        break;
      case "mascota":
        const masc = detalles as any;
        queries.push({
          query: `
            INSERT INTO detalles_mascotas (id_solicitud, nombre_mascota, especie, raza, nombre_tutor)
            VALUES (?, ?, ?, ?, ?)
          `,
          params: [
            "LAST_INSERT_ID()",
            masc.nombre_mascota,
            masc.especie,
            masc.raza,
            masc.nombre_tutor,
          ],
        });
        break;
    }

    const results = await executeTransaction(queries);
    const solicitudId = (results[0] as any).insertId;

    // Get the created solicitud
    const solicitud = await getSolicitudWithDetails(Number(solicitudId));

    res.status(201).json({
      success: true,
      message: "Solicitud created successfully",
      data: solicitud,
    } as ApiResponse<SolicitudConDetalles>);
  } catch (error) {
    console.error("Error creating solicitud:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    } as ApiResponse);
  }
};

// Update solicitud
export const updateSolicitud = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const updates: UpdateSolicitudRequest = req.body;

    // Check if solicitud exists
    const existing = await executeQueryOne<Solicitud>(
      "SELECT * FROM solicitudes WHERE id_solicitud = ?",
      [id],
    );

    if (!existing) {
      res.status(404).json({
        success: false,
        error: "Solicitud not found",
      } as ApiResponse);
      return;
    }

    // Build update query
    const updateFields: string[] = [];
    const params: any[] = [];

    if (updates.estado !== undefined) {
      updateFields.push("estado = ?");
      params.push(updates.estado);

      if (updates.estado === "aprobado") {
        updateFields.push("fecha_aprobacion = ?");
        params.push(new Date());
      }
    }

    if (updates.email_contacto !== undefined) {
      updateFields.push("email_contacto = ?");
      params.push(updates.email_contacto);
    }

    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        error: "No valid fields to update",
      } as ApiResponse);
      return;
    }

    params.push(id);

    const updateQuery = `
      UPDATE solicitudes 
      SET ${updateFields.join(", ")}
      WHERE id_solicitud = ?
    `;

    await executeUpdate(updateQuery, params);

    // Get updated solicitud
    const solicitud = await getSolicitudWithDetails(Number(id));

    res.json({
      success: true,
      message: "Solicitud updated successfully",
      data: solicitud,
    } as ApiResponse<SolicitudConDetalles>);
  } catch (error) {
    console.error("Error updating solicitud:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    } as ApiResponse);
  }
};

// Delete solicitud
export const deleteSolicitud = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if solicitud exists
    const existing = await executeQueryOne<Solicitud>(
      "SELECT * FROM solicitudes WHERE id_solicitud = ?",
      [id],
    );

    if (!existing) {
      res.status(404).json({
        success: false,
        error: "Solicitud not found",
      } as ApiResponse);
      return;
    }

    // Delete in transaction (logs first, then details, then main)
    await executeTransaction([
      { query: "DELETE FROM logs_envio WHERE id_solicitud = ?", params: [id] },
      {
        query: `DELETE FROM detalles_${existing.tipo_solicitud}s WHERE id_solicitud = ?`,
        params: [id],
      },
      { query: "DELETE FROM solicitudes WHERE id_solicitud = ?", params: [id] },
    ]);

    res.json({
      success: true,
      message: "Solicitud deleted successfully",
    } as ApiResponse);
  } catch (error) {
    console.error("Error deleting solicitud:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    } as ApiResponse);
  }
};

// Helper function to get solicitud with details
async function getSolicitudWithDetails(
  id: number,
): Promise<SolicitudConDetalles | null> {
  const solicitud = await executeQueryOne<Solicitud>(
    "SELECT * FROM solicitudes WHERE id_solicitud = ?",
    [id],
  );

  if (!solicitud) return null;

  let detalles = null;

  switch (solicitud.tipo_solicitud) {
    case "emprendedor":
      detalles = await executeQueryOne(
        "SELECT * FROM detalles_emprendedores WHERE id_solicitud = ?",
        [id],
      );
      break;
    case "mascota":
      detalles = await executeQueryOne(
        "SELECT * FROM detalles_mascotas WHERE id_solicitud = ?",
        [id],
      );
      break;
  }

  return {
    ...solicitud,
    detalles: detalles as any,
  };
}

