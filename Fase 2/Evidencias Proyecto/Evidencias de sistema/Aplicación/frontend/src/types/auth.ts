export type Rol = "adoptante" | "refugio";

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  fecha_registro: string;
}

export interface TokenOut {
  access_token: string;
  token_type: string;
  usuario: Usuario;
}

export interface UsuarioRegistro {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
}

export interface UsuarioLogin {
  email: string;
  password: string;
}

// Espejo exacto de los CHECK constraints de la base de datos —
// si agregan una opción nueva, hay que actualizarla aquí también
// (ver la nota del equipo sobre "registro centralizado de valores válidos").
export type EspacioDisponible = "departamento" | "casa_patio" | "casa_grande";
export type ExperienciaPrevia = "ninguna" | "basica" | "alta";
export type NivelActividad = "bajo" | "medio" | "alto";

export interface PerfilAdoptante {
  id: number;
  usuario_id: number;
  espacio_disponible: EspacioDisponible;
  tiempo_disponible_horas_dia: number;
  experiencia_previa: ExperienciaPrevia;
  tiene_ninos: boolean;
  otras_mascotas: boolean;
  nivel_actividad_fisica: NivelActividad;
}

export interface PerfilAdoptanteInput {
  espacio_disponible: EspacioDisponible;
  tiempo_disponible_horas_dia: number;
  experiencia_previa: ExperienciaPrevia;
  tiene_ninos: boolean;
  otras_mascotas: boolean;
  nivel_actividad_fisica: NivelActividad;
}

export interface PerfilRefugio {
  id: number;
  usuario_id: number;
  nombre_refugio: string;
  direccion?: string;
  telefono_contacto?: string;
}

export interface PerfilRefugioInput {
  nombre_refugio: string;
  direccion?: string;
  telefono_contacto?: string;
}
