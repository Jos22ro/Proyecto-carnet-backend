// Enum types based on SQL
export enum SolicitudTipo {
  EMPRENDEDOR = 'emprendedor',
  MASCOTA = 'mascota'
}

export enum SolicitudEstado {
  PENDIENTE = 'pendiente',
  APROBADO = 'aprobado',
  RECHAZADO = 'rechazado'
}

export enum SolicitudOrigen {
  FORMULARIO = 'formulario',
  MANUAL = 'manual'
}

export enum EnvioResultado {
  EXITO = 'éxito',
  ERROR = 'error'
}

export enum TipoPersona {
  NATURAL = 'natural',
  JURIDICA = 'juridica'
}

// Main table interfaces
export interface Solicitud {
  id_solicitud: bigint;
  tipo_solicitud: SolicitudTipo;
  estado: SolicitudEstado;
  origen: SolicitudOrigen;
  email_contacto: string;
  codigo_qr_hash: string;
  fecha_creacion: Date;
  fecha_aprobacion?: Date;
}

export interface DetallesEmprendedor {
  id_solicitud: bigint;
  documento_titular: string;
  razon_social: string;
  nombre_comercial?: string;
  registro_fiscal?: string;
  descripcion_actividad?: string;
  tipo_persona: TipoPersona;
  direccion_fisica: string;
  telefono_contacto: string;
  fecha_vencimiento?: Date;
  rubro?: string;
}

export interface DetallesMascota {
  id_solicitud: bigint;
  nombre_mascota: string;
  especie: string;
  raza: string;
  nombre_tutor: string;
}

export interface LogEnvio {
  id_log: bigint;
  id_solicitud?: bigint;
  email_enviado?: string;
  fecha_envio?: Date;
  resultado?: EnvioResultado;
  mensaje_error?: string;
}

// Extended interfaces with relations
export interface SolicitudConDetalles extends Solicitud {
  detalles?: DetallesEmprendedor | DetallesMascota;
  logs_envio?: LogEnvio[];
}

// Request/response types
export interface CreateSolicitudRequest {
  tipo_solicitud: SolicitudTipo;
  origen: SolicitudOrigen;
  email_contacto: string;
  detalles: DetallesEmprendedor | DetallesMascota;
}

export interface UpdateSolicitudRequest {
  estado?: SolicitudEstado;
  email_contacto?: string;
}

export interface WebhookFormData {
  tipo_solicitud: SolicitudTipo;
  email_contacto: string;
  // Dynamic fields based on type
  [key: string]: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

// User for authentication (simple implementation)
export interface User {
  id: string;
  email: string;
  password: string;
  role: string;
}

// Query filters
export interface SolicitudFilters {
  estado?: SolicitudEstado;
  tipo_solicitud?: SolicitudTipo;
  origen?: SolicitudOrigen;
  email_contacto?: string;
  fecha_inicio?: Date;
  fecha_fin?: Date;
  page?: number;
  limit?: number;
}