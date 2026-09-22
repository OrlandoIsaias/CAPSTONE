import type { EspacioDisponible, ExperienciaPrevia, NivelActividad } from "./auth";
import type { EstadoMascota } from "./mascotas";

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
}

/** Respuestas del cuestionario de estilo de vida del postulante, que el
    refugio consulta antes de decidir. */
export interface PostulacionDetalle extends Postulacion {
  espacio_disponible?: EspacioDisponible | null;
  tiempo_disponible_horas_dia?: number | null;
  experiencia_previa?: ExperienciaPrevia | null;
  tiene_ninos?: boolean | null;
  otras_mascotas?: boolean | null;
  nivel_actividad_fisica?: NivelActividad | null;
}
