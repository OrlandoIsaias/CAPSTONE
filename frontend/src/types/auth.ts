import type { Especie, Sexo, Tamano, TramoHoras } from "./mascotas";

export type Rol = "adoptante" | "refugio";

export interface Usuario {
  id: number;
  nombre: string;
  email?: string | null;
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
  telefono?: string;
}

export interface CodigoEnviado {
  correo_enmascarado: string;
  expira_en_segundos: number;
  reenviar_en_segundos: number;
}

export interface UsuarioLogin {
  email: string;
  password: string;
  rol?: Rol;
}

// Espejo exacto de los CHECK constraints de la base de datos (migración
// 006) — si agregan una opción nueva, hay que actualizarla aquí también
// (ver la nota del equipo sobre "registro centralizado de valores válidos").
export type EspacioDisponible = "departamento" | "casa_patio" | "casa_grande";
export type RestriccionVivienda = "ninguna" | "solo_pequenas" | "solo_gatos" | "no_se";
export type TiempoActividad = "menos_30m" | "30_60m" | "mas_60m";
export type ExperienciaPrevia = "ninguna" | "basica" | "alta";
export type AmbienteHogar = "tranquilo" | "moderado" | "movido";
/** "mayores" = 6 años o más; "pequenos" = menores de 6. */
export type NinosHogar = "no" | "mayores" | "pequenos";
export type Alergias = "ninguna" | "perros" | "gatos" | "ambos";
export type AceptaCuidados = "no" | "leves" | "complejos";
export type EtapaVida = "cachorro" | "joven" | "adulto" | "senior";

/** Respuestas del cuestionario. Cómo se usa cada una en el matching:
    backend/matching-service/scoring.py. */
export interface CuestionarioAdoptante {
  espacio_disponible: EspacioDisponible;
  restriccion_vivienda: RestriccionVivienda;
  /** Horas seguidas que la mascota quedaría sola en un día normal. */
  horas_sola: TramoHoras;
  tiempo_actividad: TiempoActividad;
  experiencia_previa: ExperienciaPrevia;
  ambiente_hogar: AmbienteHogar;
  ninos_hogar: NinosHogar;
  tiene_perros: boolean;
  tiene_gatos: boolean;
  alergias: Alergias;
  acepta_cuidados: AceptaCuidados;
  // Preferencias, null = me da igual: la especie filtra las
  // recomendaciones; tamaño, etapa y sexo solo las ordenan.
  especie_preferida: Especie | null;
  tamanos_preferidos: Tamano[] | null;
  etapas_preferidas: EtapaVida[] | null;
  sexo_preferido: Sexo | null;
}

type Nulos<T> = { [K in keyof T]: T[K] | null };

// Las respuestas son null en un perfil recién registrado (solo tiene el
// teléfono) hasta que el adoptante completa el cuestionario.
export interface PerfilAdoptante extends Nulos<CuestionarioAdoptante> {
  id: number;
  usuario_id: number;
  tiene_perros: boolean;
  tiene_gatos: boolean;
  cuestionario_completo: boolean;
  telefono?: string | null;
  foto_perfil?: string | null;
}

export interface PerfilAdoptanteInput extends CuestionarioAdoptante {
  // Opcional: EditarPerfilAdoptante.tsx permite guardar sin teléfono (el
  // botón de WhatsApp ya sabe mostrar el estado "sin celular registrado").
  telefono?: string;
  foto_perfil?: string;
}

export interface PerfilRefugio {
  id: number;
  usuario_id: number;
  nombre_refugio: string;
  direccion?: string;
  // Optional acá por la misma razón que PerfilAdoptante.telefono: refugios
  // registrados cuando este campo era opcional pueden no tenerlo aún.
  telefono_contacto?: string;
}

export interface PerfilRefugioInput {
  nombre_refugio: string;
  direccion?: string;
  telefono_contacto: string;
}
