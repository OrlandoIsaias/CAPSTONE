import type {
  AceptaCuidados,
  Alergias,
  AmbienteHogar,
  EspacioDisponible,
  ExperienciaPrevia,
  NinosHogar,
  RestriccionVivienda,
  TiempoActividad,
} from "./auth";
import type { EstadoMascota, TramoHoras } from "./mascotas";
import type { DetalleCompatibilidad } from "./matching";

export type EstadoPostulacion = "pendiente" | "aprobada" | "rechazada";

export interface Postulacion {
  id: number;
  adoptante_id: number;
  adoptante_nombre?: string | null;
  mascota_id: number;
  mascota_nombre: string;
  mascota_especie?: string;
  mascota_estado: EstadoMascota;
  estado: EstadoPostulacion;
  /** null si el adoptante nunca abrió la ficha y no hay match calculado. */
  score_compatibilidad?: number | null;
  fecha_postulacion: string;
  /** Datos de contacto para coordinar la entrega (botón de WhatsApp) — solo
      tienen sentido de mostrar una vez que la postulación está aprobada. */
  adoptante_telefono?: string | null;
  refugio_nombre?: string | null;
  refugio_telefono?: string | null;
}

/** Respuestas del cuestionario de estilo de vida del postulante, que el
    refugio consulta antes de decidir. */
export interface PostulacionDetalle extends Postulacion {
  espacio_disponible?: EspacioDisponible | null;
  restriccion_vivienda?: RestriccionVivienda | null;
  horas_sola?: TramoHoras | null;
  tiempo_actividad?: TiempoActividad | null;
  experiencia_previa?: ExperienciaPrevia | null;
  ambiente_hogar?: AmbienteHogar | null;
  ninos_hogar?: NinosHogar | null;
  tiene_perros?: boolean | null;
  tiene_gatos?: boolean | null;
  alergias?: Alergias | null;
  acepta_cuidados?: AceptaCuidados | null;
  /** Detalle del score que guardó matching-service; null si nunca se calculó. */
  detalle_compatibilidad?: DetalleCompatibilidad | null;
}
