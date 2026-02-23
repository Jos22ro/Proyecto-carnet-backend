# Carnet Comunitario Backend

Backend para el sistema de gestión de carnets comunitarios con Node.js, Express, TypeScript y MySQL.

## 🚀 Iniciar

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus credenciales de MySQL y otros ajustes
```

### 3. Ejecutar en desarrollo
```bash
npm run dev
```

### 4. Construir para producción
```bash
npm run build
npm start
```

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── types/           # Tipos TypeScript
│   ├── db/              # Conexión y utilidades de base de datos
│   ├── middleware/      # Middleware de autenticación
│   ├── routes/          # Rutas de la API
│   ├── controllers/     # Controladores
│   ├── utils/           # Utilidades
│   └── app.ts           # Configuración principal
├── uploads/             # Archivos subidos
├── dist/                # TypeScript compilado
└── package.json
```

## 🔗 Endpoints de la API

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/profile` - Obtener perfil

### Solicitudes (CRUD)
- `GET /api/solicitudes` - Listar solicitudes (con filtros)
- `GET /api/solicitudes/:id` - Obtener solicitud por ID
- `POST /api/solicitudes` - Crear nueva solicitud
- `PUT /api/solicitudes/:id` - Actualizar solicitud
- `DELETE /api/solicitudes/:id` - Eliminar solicitud

### Específicos por tipo
- `GET /api/emprendedores` - Listar emprendedores
- `GET /api/mascotas` - Listar mascotas
- `GET /api/global` - Listar solicitudes globales

### Webhook Google Forms
- `POST /api/webhook/solicitud` - Recibir datos del formulario
- `GET /api/webhook/test` - Probar webhook
- `GET /api/webhook/status` - Estado del webhook

## 🔑 Autenticación

El sistema usa JWT tokens para autenticación.

**Usuario por defecto:**
- Email: `admin@carnet.com`
- Contraseña: `admin123`

## 📊 Filtros de Solicitudes

Puedes filtrar las solicitudes con estos parámetros GET:
- `estado` - pendiente, aprobado, rechazado
- `tipo_solicitud` - emprendedor, mascota, global
- `origen` - formulario, manual
- `email_contacto` - búsqueda parcial
- `page` - número de página
- `limit` - resultados por página

## 🔧 Configuración

### Variables de Entorno
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=carnet_comunitario
JWT_SECRET=your_secret_key
PORT=3001
```

### Google Apps Script (Webhook)

Para conectar Google Forms con el backend:

1. **En Google Apps Script:**
```javascript
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const url = 'https://tu-api.com/api/webhook/solicitud';
  
  UrlFetchApp.fetch(url, {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(data)
  });
}
```

2. **Publicar como aplicación web** y obtener la URL del webhook

3. **Configurar Google Form** para enviar datos al script

## 🗄️ Estructura de la Base de Datos

El backend espera esta estructura (basada en tu SQL):

```sql
-- Tabla principal
CREATE TABLE solicitudes (
  id_solicitud BIGINT PRIMARY KEY,
  tipo_solicitud ENUM('emprendedor', 'mascota', 'global'),
  estado ENUM('pendiente', 'aprobado', 'rechazado'),
  origen ENUM('formulario', 'manual'),
  email_contacto VARCHAR(255),
  codigo_qr_hash CHAR(32),
  fecha_creacion TIMESTAMP,
  fecha_aprobacion TIMESTAMP
);

-- Tablas específicas
CREATE TABLE detalles_emprendedores (...);
CREATE TABLE detalles_mascotas (...);
CREATE TABLE detalles_global (...);
CREATE TABLE logs_envio (...);
```

## 🧪 Testing

```bash
# Probar conexión a BD
curl http://localhost:3001/health

# Probar webhook
curl -X GET http://localhost:3001/api/webhook/test

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@carnet.com","password":"admin123"}'
```

## 🚀 Despliegue

1. **Construir:** `npm run build`
2. **Configurar variables de entorno**
3. **Iniciar:** `npm start`
4. **Configurar proxy reverso (Nginx)**
5. **Configurar SSL**

## 📝 Notas

- El backend genera hashes QR automáticamente
- Los archivos se guardan en la carpeta `uploads/`
- Todos los endpoints (excepto webhook y health) requieren autenticación
- El webhook procesa automáticamente los datos de Google Forms