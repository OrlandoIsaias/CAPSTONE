export interface Recomendacion {
  mascota_id: number;
  nombre: string;
  especie?: string;
  raza?: string;
  edad?: number;
  url_foto?: string;
  estado: string;
  score_compatibilidad: number;
  fecha_calculo: string;
}
