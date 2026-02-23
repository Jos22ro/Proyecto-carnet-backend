# Configuración de Google Forms con Webhook

## Pasos para configurar Google Forms

### 1. Crear el Formulario
1. Ve a [Google Forms](https://forms.google.com)
2. Crea un nuevo formulario
3. Añade las siguientes preguntas básicas:
   - **Tipo de solicitud** (Opción múltiple: Emprendedor, Mascota, Global)
   - **Email de contacto** (Campo de texto corto, validación de email)

### 2. Añadir Campos Específicos

#### Para Emprendedores:
- Documento del titular
- Razón social
- Nombre comercial (opcional)
- Registro fiscal (opcional)
- Descripción de la actividad
- Tipo de persona (Natural/Jurídica)
- Dirección física
- Teléfono de contacto
- Fecha de vencimiento (opcional)
- Rubro (opcional)

#### Para Mascotas:
- Nombre de la mascota
- Especie
- Raza
- Nombre del tutor

#### Para Solicitudes Globales:
- Nombre completo
- Documento de identidad
- Domicilio

### 3. Conectar con Google Apps Script

1. Abre el editor de Apps Script:
   - En el formulario, ve a `Respuestas` > `Hoja de cálculo vinculada`
   - Crea una nueva hoja de cálculo
   - En la hoja de cálculo, ve a `Extensiones` > `Apps Script`

2. Reemplaza el código por defecto con el contenido de `google-forms-webhook.js`

3. **Importante**: Actualiza la URL del webhook en la línea 5:
   ```javascript
   const WEBHOOK_URL = 'https://tu-dominio.com/api/webhook/solicitud';
   ```

4. Guarda el proyecto (Ctrl + S o 📁 icon)

### 4. Configurar el Trigger

1. En el editor de Apps Script, haz clic en el reloj ⏰ (Triggers)
2. Haz clic en "Añadir trigger"
3. Configura así:
   - Function: `onFormSubmit`
   - Event source: "From spreadsheet"
   - Event type: "On form submit"
4. Guarda el trigger

### 5. Probar la Integración

1. Rellena el formulario de prueba
2. Revisa el log de Apps Script para ver la respuesta
3. Verifica que los datos aparezcan en tu base de datos

## URLs del Backend

Una vez que tu servidor esté corriendo, las URLs importantes son:

- **Webhook**: `POST http://localhost:3001/api/webhook/solicitud`
- **Health check**: `GET http://localhost:3001/health`
- **Estado del webhook**: `GET http://localhost:3001/api/webhook/status`
- **Test del webhook**: `GET http://localhost:3001/api/webhook/test`

## Ejemplo de Payload JSON

### Emprendedor:
```json
{
  "tipo_solicitud": "emprendedor",
  "email_contacto": "usuario@email.com",
  "documento_titular": "12345678",
  "razon_social": "Mi Empresa",
  "nombre_comercial": "Mi Comercio",
  "direccion_fisica": "Calle Principal #123",
  "telefono_contacto": "+581234567890",
  "tipo_persona": "natural"
}
```

### Mascota:
```json
{
  "tipo_solicitud": "mascota",
  "email_contacto": "usuario@email.com",
  "nombre_mascota": "Firulais",
  "especie": "perro",
  "raza": "Labrador",
  "nombre_tutor": "Juan Pérez"
}
```

### Global:
```json
{
  "tipo_solicitud": "global",
  "email_contacto": "usuario@email.com",
  "nombre_completo": "María González",
  "documento": "V-12345678",
  "domicilio": "Avenida Central #456"
}
```

## Notas Importantes

- Para producción, necesitarás un dominio público y HTTPS
- Google Apps Script tiene límites de cuota diaria
- Considera usar servicios como ngrok para testing local
- Los nombres de las preguntas en el formulario deben coincidir con los mapeos en el script