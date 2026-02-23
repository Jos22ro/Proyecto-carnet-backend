-- Base de datos para el sistema de carnet comunitario
-- Creado para integración con Google Forms

-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS carnet_comunitario 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE carnet_comunitario;

-- Tabla principal de solicitudes
CREATE TABLE IF NOT EXISTS solicitudes (
    id_solicitud BIGINT AUTO_INCREMENT PRIMARY KEY,
    tipo_solicitud ENUM('emprendedor', 'mascota') NOT NULL,
    estado ENUM('pendiente', 'aprobado', 'rechazado') DEFAULT 'pendiente',
    origen ENUM('formulario', 'manual') DEFAULT 'formulario',
    email_contacto VARCHAR(255) NOT NULL,
    codigo_qr_hash VARCHAR(255) NOT NULL UNIQUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_aprobacion TIMESTAMP NULL,
    
    INDEX idx_tipo_solicitud (tipo_solicitud),
    INDEX idx_estado (estado),
    INDEX idx_email_contacto (email_contacto),
    INDEX idx_codigo_qr_hash (codigo_qr_hash),
    INDEX idx_fecha_creacion (fecha_creacion)
) ENGINE=InnoDB;

-- Tabla de detalles para emprendedores
CREATE TABLE IF NOT EXISTS detalles_emprendedores (
    id_detalle BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud BIGINT NOT NULL,
    documento_titular VARCHAR(50) NOT NULL,
    razon_social VARCHAR(255) NOT NULL,
    nombre_comercial VARCHAR(255) NULL,
    registro_fiscal VARCHAR(50) NULL,
    descripcion_actividad TEXT NULL,
    tipo_persona ENUM('natural', 'juridica') DEFAULT 'natural',
    direccion_fisica TEXT NOT NULL,
    telefono_contacto VARCHAR(50) NOT NULL,
    fecha_vencimiento DATE NULL,
    rubro VARCHAR(100) NULL,
    
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE,
    INDEX idx_documento_titular (documento_titular),
    INDEX id_razon_social (razon_social)
) ENGINE=InnoDB;

-- Tabla de detalles para mascotas
CREATE TABLE IF NOT EXISTS detalles_mascotas (
    id_detalle BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud BIGINT NOT NULL,
    nombre_mascota VARCHAR(100) NOT NULL,
    especie VARCHAR(50) NOT NULL,
    raza VARCHAR(100) NOT NULL,
    nombre_tutor VARCHAR(255) NOT NULL,
    edad_mascota INT NULL,
    telefono_tutor VARCHAR(50) NULL,
    zona_residente VARCHAR(255) NULL,
    
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE,
    INDEX idx_nombre_mascota (nombre_mascota),
    INDEX idx_especie (especie)
) ENGINE=InnoDB;

-- Tabla de logs de envío
CREATE TABLE IF NOT EXISTS logs_envio (
    id_log BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud BIGINT NULL,
    email_enviado VARCHAR(255) NULL,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resultado ENUM('éxito', 'error') NOT NULL,
    mensaje_error TEXT NULL,
    
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE SET NULL,
    INDEX idx_resultado (resultado),
    INDEX idx_fecha_envio (fecha_envio)
) ENGINE=InnoDB;

-- Tabla de usuarios para autenticación (opcional)
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Insertar usuario administrador por defecto (password: admin123)
INSERT IGNORE INTO usuarios (email, password, role) 
VALUES ('admin@carnet.comunitario', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Vista para consultar solicitudes con detalles
CREATE OR REPLACE VIEW solicitudes_completas AS
SELECT 
    s.id_solicitud,
    s.tipo_solicitud,
    s.estado,
    s.origen,
    s.email_contacto,
    s.codigo_qr_hash,
    s.fecha_creacion,
    s.fecha_aprobacion,
    CASE 
        WHEN s.tipo_solicitud = 'emprendedor' THEN e.razon_social
        WHEN s.tipo_solicitud = 'mascota' THEN m.nombre_mascota
        ELSE 'N/A'
    END as nombre_referencia,
    CASE 
        WHEN s.tipo_solicitud = 'emprendedor' THEN e.documento_titular
        WHEN s.tipo_solicitud = 'mascota' THEN m.nombre_tutor
        ELSE 'N/A'
    END as documento_referencia
FROM solicitudes s
LEFT JOIN detalles_emprendedores e ON s.id_solicitud = e.id_solicitud
LEFT JOIN detalles_mascotas m ON s.id_solicitud = m.id_solicitud;