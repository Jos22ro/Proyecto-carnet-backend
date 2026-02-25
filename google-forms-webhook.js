// Google Apps Script para conectar Google Forms con el backend webhook
// Este script debe ser implementado en el editor de Google Apps Script

// URL del webhook (reemplazar con tu URL pública)
const WEBHOOK_URL = 'https://tu-dominio.com/api/webhook/solicitud';

/**
 * Función principal que se ejecuta cuando se envía el formulario
 * @param {Object} e - Event object del formulario
 */
function onFormSubmit(e) {
  try {
    const formResponse = e.response;
    const itemResponses = formResponse.getItemResponses();
    
    // Extraer datos del formulario
    const formData = extractFormData(itemResponses);
    
    // Validar datos requeridos
    if (!formData.tipo_solicitud || !formData.email_contacto) {
      console.error('Faltan campos requeridos: tipo_solicitud o email_contacto');
      return;
    }
    
    // Enviar datos al webhook
    sendToWebhook(formData);
    
  } catch (error) {
    console.error('Error procesando el formulario:', error);
  }
}

/**
 * Extrae y mapea los datos del formulario
 * @param {Array} itemResponses - Respuestas del formulario
 * @returns {Object} Datos formateados
 */
function extractFormData(itemResponses) {
  const formData = {};
  
  // Mapear preguntas del formulario a campos del backend
  itemResponses.forEach(response => {
    const question = response.getItem().getTitle();
    const answer = response.getResponse();
    
    // Mapeo según el título de la pregunta
    switch (question.toLowerCase()) {
      case 'tipo de solicitud':
      case 'tipo_solicitud':
        formData.tipo_solicitud = answer.toLowerCase();
        break;
        
      case 'email de contacto':
      case 'email_contacto':
      case 'correo electrónico':
        formData.email_contacto = answer.toLowerCase().trim();
        break;
        
      // Campos para emprendedor
      case 'documento del titular':
      case 'documento_titular':
        formData.documento_titular = answer;
        break;
        
      case 'razón social':
      case 'razon_social':
        formData.razon_social = answer;
        break;
        
      case 'nombre comercial':
      case 'nombre_comercial':
        formData.nombre_comercial = answer;
        break;
        
      case 'registro fiscal':
      case 'registro_fiscal':
        formData.registro_fiscal = answer;
        break;
        
      case 'descripción de la actividad':
      case 'descripcion_actividad':
        formData.descripcion_actividad = answer;
        break;
        
      case 'tipo de persona':
      case 'tipo_persona':
        formData.tipo_persona = answer.toLowerCase();
        break;
        
      case 'dirección física':
      case 'direccion_fisica':
        formData.direccion_fisica = answer;
        break;
        
      case 'teléfono de contacto':
      case 'telefono_contacto':
        formData.telefono_contacto = answer;
        break;
        
      case 'fecha de vencimiento':
      case 'fecha_vencimiento':
        formData.fecha_vencimiento = answer;
        break;
        
      case 'rubro':
        formData.rubro = answer;
        break;
        
      // Campos para mascotas
      case 'nombre de la mascota':
      case 'nombre_mascota':
        formData.nombre_mascota = answer;
        break;
        
      case 'especie':
        formData.especie = answer.toLowerCase();
        break;
        
      case 'raza':
        formData.raza = answer;
        break;
        
      case 'nombre del tutor':
      case 'nombre_tutor':
        formData.nombre_tutor = answer;
        break;
        
      // Campos para solicitud global
      case 'nombre completo':
      case 'nombre_completo':
        formData.nombre_completo = answer;
        break;
        
      case 'documento':
      case 'documento_identidad':
        formData.documento = answer;
        break;
        
      case 'domicilio':
        formData.domicilio = answer;
        break;
        
      default:
        // Guardar campos adicionales no mapeados
        formData[question.toLowerCase().replace(/\s+/g, '_')] = answer;
    }
  });
  
  return formData;
}

/**
 * Envía los datos al webhook del backend
 * @param {Object} formData - Datos del formulario
 */
function sendToWebhook(formData) {
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(formData),
    headers: {
      'User-Agent': 'Google-Apps-Script-Webhook'
    },
    muteHttpExceptions: true // Para capturar errores
  };
  
  try {
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();
    
    console.log('Respuesta del webhook:', responseCode, responseBody);
    
    if (responseCode === 201) {
      console.log('✅ Formulario procesado exitosamente');
      // Opcional: enviar email de confirmación
      // sendConfirmationEmail(formData.email_contacto, responseBody);
    } else {
      console.error('❌ Error en el webhook:', responseCode, responseBody);
    }
    
  } catch (error) {
    console.error('❌ Error enviando al webhook:', error);
  }
}

/**
 * Función para probar el webhook manualmente
 */
function testWebhook() {
  const testData = {
    tipo_solicitud: 'emprendedor',
    email_contacto: 'test@example.com',
    documento_titular: '12345678',
    razon_social: 'Empresa de Prueba',
    nombre_comercial: 'Nombre Comercial Prueba',
    direccion_fisica: 'Dirección de prueba',
    telefono_contacto: '+1234567890',
    tipo_persona: 'natural',
    rubro: 'Comercio'
  };
  
  sendToWebhook(testData);
}

/**
 * Función auxiliar para enviar email de confirmación (opcional)
 * @param {string} email - Email del destinatario
 * @param {string} response - Respuesta del webhook
 */
function sendConfirmationEmail(email, response) {
  const subject = 'Confirmación de solicitud recibida';
  const body = `
    Hola,
    
    Tu solicitud ha sido recibida y está siendo procesada.
    
    Respuesta del sistema: ${response}
    
    Saludos,
    Sistema de Carnet Comunitario
  `;
  
  MailApp.sendEmail(email, subject, body);
}

// Instalar el trigger para que se ejecute cuando se envíe el formulario
// En el editor de Apps Script: Edit > Current project's triggers > Add Trigger
// Function: onFormSubmit
// Events: From spreadsheet, On form submit