export type EstadoPostulacion = "pendiente" | "aprobada" | "rechazada";

export interface Postulacion {
  id: number;
  adoptante_id: number;
  mascota_id: number;
  mascota_nombre: string;
  mascota_especie?: string;
  estado: EstadoPostulacion;
  fecha_postulacion: string;
}
