import { Request, Response } from "express";
import crypto from "crypto";
import { executeQuery } from "../db/connection.js";
import { ApiResponse } from "../types/index.js";
import ExcelJS from "exceljs";
import { generateEmprendedorCardPdf } from "../utils/generateEmprendedorCardPdf.js";
import { mailer } from "../utils/sendMail.js";
import { autosizeColumns, buildMonthRange } from "../utils/excel.js";

// Get all emprendedores with their solicitud info
export const getEmprendedores = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const query = `
      SELECT 
        s.id_solicitud,
        s.*,
        e.*
      FROM solicitudes s
      INNER JOIN detalles_emprendedores e ON s.id_solicitud = e.id_solicitud
      WHERE s.tipo_solicitud = 'emprendedor'
      ORDER BY s.fecha_creacion DESC
    `;

    const emprendedores = await executeQuery(query);

    res.json({
      success: true,
      data: emprendedores,
    } as ApiResponse);
  } catch (error) {
    console.error("Error getting emprendedores:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    } as ApiResponse);
  }
};

// Get emprendedor by ID
export const getEmprendedorById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        s.*,
        e.*
      FROM solicitudes s
      INNER JOIN detalles_emprendedores e ON s.id_solicitud = e.id_solicitud
      WHERE s.tipo_solicitud = 'emprendedor' AND s.id_solicitud = ?
    `;

    const emprendedor = await executeQuery(query, [id]);

    if (!Array.isArray(emprendedor) || emprendedor.length === 0) {
      res.status(404).json({
        success: false,
        error: "Emprendedor not found",
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: emprendedor[0],
    } as ApiResponse);
  } catch (error) {
    console.error("Error getting emprendedor by ID:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    } as ApiResponse);
  }
};

// Get emprendedor statistics
export const getEmprendedorStats = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const stats = await executeQuery(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN s.estado = 'pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN s.estado = 'aprobado' THEN 1 END) as aprobados,
        COUNT(CASE WHEN s.estado = 'rechazado' THEN 1 END) as rechazados,
        COUNT(CASE WHEN e.tipo_persona = 'natural' THEN 1 END) as personas_naturales,
        COUNT(CASE WHEN e.tipo_persona = 'juridica' THEN 1 END) as personas_juridicas
      FROM solicitudes s
      INNER JOIN detalles_emprendedores e ON s.id_solicitud = e.id_solicitud
      WHERE s.tipo_solicitud = 'emprendedor'
    `);

    res.json({
      success: true,
      data: Array.isArray(stats) ? stats[0] : stats,
    } as ApiResponse);
  } catch (error) {
    console.error("Error getting emprendedor stats:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    } as ApiResponse);
  }
};

// POST - Create emprendedor (guarda en solicitudes + detalles_emprendedores)
export const createEmprendedor = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      // solicitud
      email_contacto,
      origen = "manual",

      // detalles_emprendedores (sin ids)
      documento_titular,
      razon_social,
      nombre_comercial,
      registro_fiscal,
      descripcion_actividad,
      tipo_persona,
      direccion_fisica,
      telefono_contacto,
      fecha_vencimiento,
      rubro,
    } = req.body;

    // Validación mínima
    if (
      !email_contacto ||
      !documento_titular ||
      !tipo_persona ||
      !["natural", "juridica"].includes(tipo_persona)
    ) {
      res.status(400).json({
        success: false,
        error:
          "Faltan campos obligatorios: email_contacto, documento_titular, tipo_persona (natural o juridica)",
      } as ApiResponse);
      return;
    }

    // ✅ Generar hash único para QR (evita errores por NOT NULL/UNIQUE)
    const codigo_qr_hash = crypto.randomBytes(16).toString("hex"); // 32 chars

    // 1) Insert en solicitudes (aprobado)
    const insertSolicitudQuery = `
      INSERT INTO solicitudes (
        tipo_solicitud,
        estado,
        origen,
        email_contacto,
        codigo_qr_hash,
        fecha_creacion,
        fecha_aprobacion
      ) VALUES ('emprendedor', 'pendiente', ?, ?, ?, NOW(), NOW())
    `;

    const solicitudResult: any = await executeQuery(insertSolicitudQuery, [
      origen,
      email_contacto,
      codigo_qr_hash,
    ]);

    const id_solicitud = solicitudResult.insertId;

    // 2) Insert en detalles_emprendedores
    const insertDetalleQuery = `
      INSERT INTO detalles_emprendedores (
        id_solicitud,
        documento_titular,
        razon_social,
        nombre_comercial,
        registro_fiscal,
        descripcion_actividad,
        tipo_persona,
        direccion_fisica,
        telefono_contacto,
        fecha_vencimiento,
        rubro
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await executeQuery(insertDetalleQuery, [
      id_solicitud,
      documento_titular,
      razon_social ?? null,
      nombre_comercial ?? null,
      registro_fiscal ?? null,
      descripcion_actividad ?? null,
      tipo_persona,
      direccion_fisica ?? null,
      telefono_contacto ?? null,
      fecha_vencimiento ?? null, // ideal: YYYY-MM-DD
      rubro ?? null,
    ]);

    // 3) Retornar creado
    const created = await executeQuery(
      `
        SELECT s.*, e.*
        FROM solicitudes s
        INNER JOIN detalles_emprendedores e ON s.id_solicitud = e.id_solicitud
        WHERE s.id_solicitud = ?
      `,
      [id_solicitud],
    );

    res.status(201).json({
      success: true,
      data: Array.isArray(created) ? created[0] : created,
    } as ApiResponse);
  } catch (error: any) {
    console.error("Error creating emprendedor:", error);
    res.status(500).json({
      success: false,
      error: error?.sqlMessage || error?.message || "Internal server error",
    } as ApiResponse);
  }
};

export const updateEmprendedorEstado = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { estado } = req.body as {
      estado: "pendiente" | "aprobado" | "rechazado";
    };

    if (!estado || !["pendiente", "aprobado", "rechazado"].includes(estado)) {
      res.status(400).json({
        success: false,
        error: "Estado inválido. Usa: pendiente | aprobado | rechazado",
      } as ApiResponse);
      return;
    }

    const query =
      estado === "aprobado"
        ? `UPDATE solicitudes SET estado = ?, fecha_aprobacion = NOW() WHERE id_solicitud = ? AND tipo_solicitud = 'emprendedor'`
        : `UPDATE solicitudes SET estado = ? WHERE id_solicitud = ? AND tipo_solicitud = 'emprendedor'`;

    const result: any = await executeQuery(query, [estado, id]);

    if (result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        error: "Emprendedor not found",
      } as ApiResponse);
      return;
    }

    // Traer datos completos actualizados
    const updated: any[] = await executeQuery(
      `
        SELECT s.*, e.*
        FROM solicitudes s
        INNER JOIN detalles_emprendedores e ON s.id_solicitud = e.id_solicitud
        WHERE s.id_solicitud = ? AND s.tipo_solicitud = 'emprendedor'
      `,
      [id],
    );

    const emprendedor = updated[0];

    // ✅ Si se aprobó, enviar PDF por correo
    if (estado === "aprobado" && emprendedor?.email_contacto) {
      try {
        const pdfBuffer = await generateEmprendedorCardPdf(emprendedor);

        await mailer.sendMail({
          from: process.env.MAIL_USER,
          to: emprendedor.email_contacto,
          subject: "✅ Carnet de Emprendedor",
          text: `Hola, adjunto encontrarás el carnet de tu emprendimiento: ${emprendedor.nombre_comercial ?? emprendedor.razon_social}.`,
          attachments: [
            {
              filename: `carnet-emprendedor-${emprendedor.id_solicitud}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
        });
      } catch (mailError) {
        console.error("❌ Error enviando correo con PDF:", mailError);
        // No hacemos fallar la aprobación por el correo.
      }
    }

    res.json({ success: true, data: emprendedor } as ApiResponse);
  } catch (error: any) {
    console.error("Error updating emprendedor estado:", error);
    res.status(500).json({
      success: false,
      error: error?.sqlMessage || error?.message || "Internal server error",
    } as ApiResponse);
  }
};

// Traer meses disponibles de la db
type MesDisponible = { year: number; month: number };

export const getMesesEmprendedoresDisponibles = async (
  req: Request,
  res: Response,
) => {
  try {
    const query = `
      SELECT
        YEAR(s.fecha_creacion) AS year,
        MONTH(s.fecha_creacion) AS month
      FROM solicitudes s
      WHERE s.tipo_solicitud = 'emprendedor'
      GROUP BY YEAR(s.fecha_creacion), MONTH(s.fecha_creacion)
      ORDER BY YEAR(s.fecha_creacion) DESC, MONTH(s.fecha_creacion) DESC
    `;

    const meses = await executeQuery<MesDisponible>(query);
    return res.status(200).json(meses);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      message: "Error obteniendo meses disponibles",
      error: String(error?.message || error),
    });
  }
};

type EmprendedorRow = {
  id_detalle: number;
  id_solicitud: number;
  documento_titular: string | null;
  razon_social: string | null;
  nombre_comercial: string | null;
  registro_fiscal: string | null;
  descripcion_actividad: string | null;
  tipo_persona: string | null;
  direccion_fisica: string | null;
  telefono_contacto: string | null;
  fecha_vencimiento: string | Date | null;
  rubro: string | null;
};

export const exportDetallesEmprendedoresExcel = async (
  req: Request,
  res: Response,
) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return res
        .status(400)
        .json({ message: "Parámetro 'year' inválido. Ej: 2026" });
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return res
        .status(400)
        .json({ message: "Parámetro 'month' inválido. Debe ser 1-12" });
    }

    const { start, end } = buildMonthRange(year, month);

    const query = `
      SELECT
        de.id_detalle,
        de.id_solicitud,
        de.documento_titular,
        de.razon_social,
        de.nombre_comercial,
        de.registro_fiscal,
        de.descripcion_actividad,
        de.tipo_persona,
        de.direccion_fisica,
        de.telefono_contacto,
        de.fecha_vencimiento,
        de.rubro
      FROM detalles_emprendedores de
      INNER JOIN solicitudes s ON s.id_solicitud = de.id_solicitud
      WHERE s.tipo_solicitud = 'emprendedor'
        AND s.fecha_creacion >= ?
        AND s.fecha_creacion < ?
      ORDER BY s.fecha_creacion ASC, de.id_solicitud ASC, de.id_detalle ASC
    `;

    const rows = await executeQuery<EmprendedorRow>(query, [start, end]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Backend";
    workbook.created = new Date();

    const ws = workbook.addWorksheet("detalles_emprendedores");
    ws.columns = [
      { header: "id_detalle", key: "id_detalle" },
      { header: "id_solicitud", key: "id_solicitud" },
      { header: "documento_titular", key: "documento_titular" },
      { header: "razon_social", key: "razon_social" },
      { header: "nombre_comercial", key: "nombre_comercial" },
      { header: "registro_fiscal", key: "registro_fiscal" },
      { header: "descripcion_actividad", key: "descripcion_actividad" },
      { header: "tipo_persona", key: "tipo_persona" },
      { header: "direccion_fisica", key: "direccion_fisica" },
      { header: "telefono_contacto", key: "telefono_contacto" },
      { header: "fecha_vencimiento", key: "fecha_vencimiento" },
      { header: "rubro", key: "rubro" },
    ];

    ws.addRows(rows);
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    autosizeColumns(ws);

    const fileName = `detalles_emprendedores_${year}-${String(month).padStart(2, "0")}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    await workbook.xlsx.write(res);
    return res.end();
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      message: "Error generando el Excel",
      error: String(error?.message || error),
    });
  }
};

