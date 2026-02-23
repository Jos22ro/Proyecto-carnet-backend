import { Request, Response } from "express";
import { executeQuery } from "../db/connection.js";
import { ApiResponse } from "../types/index.js";
import crypto from "crypto";
import { generateMascotaCardPdf } from "../utils/generateMascotaCardPdf.js";
import { mailer } from "../utils/sendMail.js";
import ExcelJS from "exceljs";
import { autosizeColumns, buildMonthRange } from "../utils/excel.js";

// Get all mascotas with their solicitud info
export const getMascotas = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const query = `
      SELECT 
        s.id_solicitud,
        s.*,
        m.*
      FROM solicitudes s
      INNER JOIN detalles_mascotas m ON s.id_solicitud = m.id_solicitud
      WHERE s.tipo_solicitud = 'mascota'
      ORDER BY s.fecha_creacion DESC
    `;

    const mascotas = await executeQuery(query);

    if (mascotas.length > 0) {
      console.log("🔍 DEBUG: First mascota item:", mascotas[0]);
    }

    res.json({
      success: true,
      data: mascotas,
    } as ApiResponse);
  } catch (error) {
    console.error("Error getting mascotas:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    } as ApiResponse);
  }
};

// Get mascota by ID
export const getMascotaById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        s.*,
        m.*
      FROM solicitudes s
      INNER JOIN detalles_mascotas m ON s.id_solicitud = m.id_solicitud
      WHERE s.tipo_solicitud = 'mascota' AND s.id_solicitud = ?
    `;

    const mascota = await executeQuery(query, [id]);

    if (mascota.length === 0) {
      res.status(404).json({
        success: false,
        error: "Mascota not found",
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: mascota[0],
    } as ApiResponse);
  } catch (error) {
    console.error("Error getting mascota by ID:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    } as ApiResponse);
  }
};

// Get mascota statistics
export const getMascotaStats = async (
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
        COUNT(DISTINCT m.especie) as especies_unicas,
        COUNT(DISTINCT m.raza) as razas_unicas
      FROM solicitudes s
      INNER JOIN detalles_mascotas m ON s.id_solicitud = m.id_solicitud
      WHERE s.tipo_solicitud = 'mascota'
    `);

    res.json({
      success: true,
      data: stats[0],
    } as ApiResponse);
  } catch (error) {
    console.error("Error getting mascota stats:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    } as ApiResponse);
  }
};

export const createMascota = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      email_contacto,
      origen = "manual",
      nombre_mascota,
      especie,
      raza,
      nombre_tutor,
      edad_mascota,
      telefono_tutor,
      zona_residente,
    } = req.body;

    if (!email_contacto || !nombre_mascota || !especie || !nombre_tutor) {
      res.status(400).json({
        success: false,
        error:
          "Faltan campos obligatorios: email_contacto, nombre_mascota, especie, nombre_tutor",
      } as ApiResponse);
      return;
    }

    // Generar QR hash único
    const codigo_qr_hash = crypto.randomBytes(16).toString("hex"); // 32 chars

    // 1) Crear solicitud
    const insertSolicitudQuery = `
      INSERT INTO solicitudes (
        tipo_solicitud,
        estado,
        origen,
        email_contacto,
        codigo_qr_hash,
        fecha_creacion
      ) VALUES ('mascota', 'pendiente', ?, ?, ?, NOW())
    `;

    const solicitudResult: any = await executeQuery(insertSolicitudQuery, [
      origen,
      email_contacto,
      codigo_qr_hash,
    ]);

    // ✅ AQUÍ se define correctamente
    const id_solicitud = solicitudResult.insertId;

    // 2) Crear detalle mascota
    const insertDetallesQuery = `
      INSERT INTO detalles_mascotas (
        id_solicitud,
        nombre_mascota,
        especie,
        raza,
        nombre_tutor,
        edad_mascota,
        telefono_tutor,
        zona_residente
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await executeQuery(insertDetallesQuery, [
      id_solicitud,
      nombre_mascota,
      especie,
      raza ?? null,
      nombre_tutor,
      edad_mascota ?? null,
      telefono_tutor ?? null,
      zona_residente ?? null,
    ]);

    // 3) Retornar el registro creado
    const created = await executeQuery(
      `
        SELECT s.*, m.*
        FROM solicitudes s
        INNER JOIN detalles_mascotas m ON s.id_solicitud = m.id_solicitud
        WHERE s.id_solicitud = ?
      `,
      [id_solicitud],
    );

    res.status(201).json({
      success: true,
      data: created[0],
    } as ApiResponse);
  } catch (error: any) {
    console.error("Error creating mascota:", error);
    res.status(500).json({
      success: false,
      error: error?.sqlMessage || error?.message || "Internal server error",
    } as ApiResponse);
  }
};

export const updateMascotaEstado = async (
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
        ? `UPDATE solicitudes SET estado = ?, fecha_aprobacion = NOW() WHERE id_solicitud = ? AND tipo_solicitud = 'mascota'`
        : `UPDATE solicitudes SET estado = ? WHERE id_solicitud = ? AND tipo_solicitud = 'mascota'`;

    const result: any = await executeQuery(query, [estado, id]);

    if (result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        error: "Mascota not found",
      } as ApiResponse);
      return;
    }

    // Traer datos actualizados completos
    const updated: any[] = await executeQuery(
      `
        SELECT s.*, m.*
        FROM solicitudes s
        INNER JOIN detalles_mascotas m ON s.id_solicitud = m.id_solicitud
        WHERE s.id_solicitud = ? AND s.tipo_solicitud = 'mascota'
      `,
      [id],
    );

    const mascota = updated[0];

    // ✅ Si se aprobó, generar PDF y enviar correo
    if (estado === "aprobado" && mascota?.email_contacto) {
      try {
        const pdfBuffer = await generateMascotaCardPdf(mascota);

        await mailer.sendMail({
          from: process.env.MAIL_USER,
          to: mascota.email_contacto,
          subject: "✅ Carnet de tu mascota",
          text: `Hola ${mascota.nombre_tutor}, adjunto encontrarás el carnet de ${mascota.nombre_mascota}.`,
          attachments: [
            {
              filename: `carnet-${mascota.nombre_mascota}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
        });
      } catch (mailError) {
        console.error("❌ Error enviando correo con PDF:", mailError);
        // No hacemos fallar la aprobación por un error de correo.
      }
    }

    res.json({ success: true, data: mascota } as ApiResponse);
  } catch (error: any) {
    console.error("Error updating mascota estado:", error);
    res.status(500).json({
      success: false,
      error: error?.sqlMessage || error?.message || "Internal server error",
    } as ApiResponse);
  }
};

type DetalleMascotaRow = {
  id_detalle: number;
  id_solicitud: number;
  nombre_mascota: string | null;
  especie: string | null;
  raza: string | null;
  edad_mascota: number | string | null;
  nombre_tutor: string | null;
  telefono_tutor: string | null;
  zona_residente: string | null;
  // si tu tabla tiene más columnas, agrégalas aquí y abajo en columns
};

export const exportDetallesMascotasExcel = async (
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

    // Trae SOLO detalles_mascotas, filtrados por solicitudes (tipo=mascota + mes)
    const query = `
      SELECT
        dm.id_detalle,
        dm.id_solicitud,
        dm.nombre_mascota,
        dm.especie,
        dm.raza,
        dm.edad_mascota,
        dm.nombre_tutor,
        dm.telefono_tutor,
        dm.zona_residente
      FROM detalles_mascotas dm
      INNER JOIN solicitudes s
        ON s.id_solicitud = dm.id_solicitud
      WHERE s.tipo_solicitud = 'mascota'
        AND s.fecha_creacion >= ?
        AND s.fecha_creacion < ?
      ORDER BY s.fecha_creacion ASC, dm.id_solicitud ASC, dm.id_detalle ASC
    `;

    const detalles = await executeQuery<DetalleMascotaRow>(query, [start, end]);

    // Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Backend";
    workbook.created = new Date();

    const ws = workbook.addWorksheet("detalles_mascotas");

    ws.columns = [
      { header: "id_detalle", key: "id_detalle" },
      { header: "id_solicitud", key: "id_solicitud" },
      { header: "nombre_mascota", key: "nombre_mascota" },
      { header: "especie", key: "especie" },
      { header: "raza", key: "raza" },
      { header: "edad_mascota", key: "edad_mascota" },
      { header: "nombre_tutor", key: "nombre_tutor" },
      { header: "telefono_tutor", key: "telefono_tutor" },
      { header: "zona_residente", key: "zona_residente" },
    ];

    ws.addRows(detalles);

    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    autosizeColumns(ws);

    const fileName = `detalles_mascotas_${year}-${String(month).padStart(2, "0")}.xlsx`;

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

// Traer meses de la db
type MesDisponible = { year: number; month: number };

export const getMesesMascotasDisponibles = async (
  req: Request,
  res: Response,
) => {
  try {
    const query = `
      SELECT
        YEAR(s.fecha_creacion) AS year,
        MONTH(s.fecha_creacion) AS month
      FROM solicitudes s
      WHERE s.tipo_solicitud = 'mascota'
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

