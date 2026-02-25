import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { 
  executeInsert
} from '../db/connection.js';
import { 
  WebhookFormData, 
  ApiResponse, 
  SolicitudTipo 
} from '../types/index.js';

// Google Forms webhook - receives form submissions
export const receiveFormSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation errors',
        details: errors.array()
      } as ApiResponse);
      return;
    }

    const formData: WebhookFormData = req.body;

    // Validate required fields
    if (!formData.tipo_solicitud || !formData.email_contacto) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: tipo_solicitud, email_contacto'
      } as ApiResponse);
      return;
    }

    // Generate QR hash (simple implementation)
    const qrHash = Buffer.from(`${formData.email_contacto}${Date.now()}`).toString('base64').substring(0, 32);

    // Execute INSERT into solicitudes first
    const solicitudId = await executeInsert(
      `INSERT INTO solicitudes (tipo_solicitud, estado, origen, email_contacto, codigo_qr_hash)
       VALUES (?, 'pendiente', 'formulario', ?, ?)`,
      [formData.tipo_solicitud, formData.email_contacto, qrHash]
    );

    // Insert details based on type
    switch (formData.tipo_solicitud) {
      case 'emprendedor':
        await executeInsert(
          `INSERT INTO detalles_emprendedores (
            id_solicitud, documento_titular, razon_social, nombre_comercial, 
            registro_fiscal, descripcion_actividad, tipo_persona, direccion_fisica, 
            telefono_contacto, fecha_vencimiento, rubro
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            Number(solicitudId),
            formData.documento_titular || '',
            formData.razon_social || '',
            formData.nombre_comercial || null,
            formData.registro_fiscal || null,
            formData.descripcion_actividad || null,
            formData.tipo_persona || 'natural',
            formData.direccion_fisica || '',
            formData.telefono_contacto || '',
            formData.fecha_vencimiento ? new Date(formData.fecha_vencimiento) : null,
            formData.rubro || null
          ]
        );
        break;

      case 'mascota':
        await executeInsert(
          `INSERT INTO detalles_mascotas (id_solicitud, nombre_mascota, especie, raza, nombre_tutor)
           VALUES (?, ?, ?, ?, ?)`,
          [
            Number(solicitudId),
            formData.nombre_mascota || '',
            formData.especie || '',
            formData.raza || '',
            formData.nombre_tutor || ''
          ]
        );
        break;

      default:
        res.status(400).json({
          success: false,
          error: 'Invalid solicitud type'
        } as ApiResponse);
        return;
    }

    // Log the webhook receipt
    await executeInsert(
      `INSERT INTO logs_envio (id_solicitud, email_enviado, fecha_envio, resultado, mensaje_error)
       VALUES (?, ?, NOW(), 'éxito', 'Form submission received successfully')`,
      [Number(solicitudId), formData.email_contacto]
    );

    res.status(201).json({
      success: true,
      message: 'Form submission processed successfully',
      data: {
        solicitud_id: Number(solicitudId),
        qr_hash: qrHash,
        status: 'pendiente'
      }
    } as ApiResponse);

    // TODO: Send confirmation email to the user
    // TODO: Generate QR code image
    
  } catch (error) {
    console.error('Error processing form submission:', error);
    
    // Log the error
    try {
      await executeInsert(
        `INSERT INTO logs_envio (email_enviado, fecha_envio, resultado, mensaje_error)
         VALUES (?, NOW(), 'error', ?)`,
        [req.body.email_contacto || 'unknown', error instanceof Error ? error.message : 'Unknown error']
      );
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error while processing form submission'
    } as ApiResponse);
  }
};

// Test webhook endpoint
export const testWebhook = (req: Request, res: Response): void => {
  res.json({
    success: true,
    message: 'Webhook endpoint is working',
    timestamp: new Date().toISOString(),
    received_data: req.body
  } as ApiResponse);
};

// Get webhook status
export const getWebhookStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    // This could check recent webhook activity
    const query = `
      SELECT 
        COUNT(*) as total_submissions,
        COUNT(CASE WHEN resultado = 'éxito' THEN 1 END) as successful,
        COUNT(CASE WHEN resultado = 'error' THEN 1 END) as failed,
        MAX(fecha_envio) as last_submission
      FROM logs_envio 
      WHERE fecha_envio >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `;
    
    const stats = await require('../db/connection.js').executeQuery(query);
    
    res.json({
      success: true,
      data: {
        ...stats[0],
        webhook_url: `${req.protocol}://${req.get('host')}/api/webhook/solicitud`
      }
    } as ApiResponse);
  } catch (error) {
    console.error('Error getting webhook status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    } as ApiResponse);
  }
};