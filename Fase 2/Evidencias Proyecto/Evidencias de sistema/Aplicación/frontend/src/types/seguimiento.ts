import type { Rol } from "./auth";
import type { EstadoMascota } from "./mascotas";

export type TipoMensaje = "texto" | "imagen" | "audio" | "video" | "encuesta";
export type TipoArchivo = Extract<TipoMensaje, "imagen" | "audio" | "video">;

export interface Mensaje {
  id: number;
  postulacion_id: number;
  autor_rol: Rol;
  es_mio: boolean;
  tipo: TipoMensaje;
  texto?: string | null;
  /** URL de Cloudinary ya convertida a un formato que reproduce cualquier
      celular (mp4 para video, mp3 para audio). */
  media_url?: string | null;
  /** Primer cuadro del video, para mostrarlo antes de reproducir. */
  media_miniatura_url?: string | null;
  duracion_seg?: number | null;
  creado_en: string;
  leido_en?: string | null;
}

export type ResultadoEncuesta = "exitosa" | "devuelta" | "en_proceso";

export interface EncuestaEstado {
  dias: 30 | 90;
  /** pendiente: aún no se cumple el plazo o el refugio no confirma la adopción. */
  estado: "respondida" | "disponible" | "pendiente";
  disponible_desde?: string | null;
  resultado?: ResultadoEncuesta | null;
}

export interface ChatResumen {
  postulacion_id: number;
  mascota_id: number;
  mascota_nombre: string;
  mascota_foto?: string | null;
  mascota_estado: EstadoMascota;
  /** Nombre del refugio (para el adoptante) o del adoptante (para el refugio). */
  contraparte_nombre: string;
  fecha_adopcion?: string | null;
  ultimo_mensaje?: {
    tipo: TipoMensaje;
    texto?: string | null;
    es_mio: boolean;
    creado_en: string;
  } | null;
  no_leidos: number;
  /** Solo para el adoptante: hay una encuesta que ya puede responder. */
  encuesta_disponible: boolean;
}

export interface ChatDetalle extends ChatResumen {
  mi_rol: Rol;
  encuestas: EncuestaEstado[];
}

export interface NuevoMensaje {
  tipo: Exclude<TipoMensaje, "encuesta">;
  texto?: string;
  media_public_id?: string;
  duracion_seg?: number;
}

export interface FirmaSubida {
  cloud_name: string;
  api_key: string;
  timestamp: number;
  folder: string;
  signature: string;
}
