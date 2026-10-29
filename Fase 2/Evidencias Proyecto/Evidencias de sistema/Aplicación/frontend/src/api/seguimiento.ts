import axios from "axios";
import { apiClient } from "./client";
import type {
  ChatDetalle,
  ChatResumen,
  FirmaSubida,
  Mensaje,
  NuevoMensaje,
  ResultadoEncuesta,
  TipoArchivo,
} from "../types/seguimiento";

/** Avisa a las barras de navegación que cambió el total de no leídos, para
    que el globo se actualice sin esperar su próxima consulta. */
export const EVENTO_NO_LEIDOS = "housefound:no-leidos";

export async function listarChats(signal?: AbortSignal): Promise<ChatResumen[]> {
  const { data } = await apiClient.get<ChatResumen[]>("/seguimientos/chats", { signal });
  return data;
}

export async function totalNoLeidos(signal?: AbortSignal): Promise<number> {
  const { data } = await apiClient.get<{ total: number }>("/seguimientos/chats/no-leidos", { signal });
  return data.total;
}

export async function detalleChat(postulacionId: number, signal?: AbortSignal): Promise<ChatDetalle> {
  const { data } = await apiClient.get<ChatDetalle>(`/seguimientos/chats/${postulacionId}`, { signal });
  return data;
}

/** Sin `despuesDe`: los últimos mensajes. Con `despuesDe`: solo los nuevos. */
export async function listarMensajes(
  postulacionId: number,
  despuesDe?: number,
  signal?: AbortSignal
): Promise<Mensaje[]> {
  const { data } = await apiClient.get<Mensaje[]>(`/seguimientos/chats/${postulacionId}/mensajes`, {
    params: despuesDe !== undefined ? { despues_de: despuesDe } : undefined,
    signal,
  });
  return data;
}

export async function enviarMensaje(postulacionId: number, mensaje: NuevoMensaje): Promise<Mensaje> {
  const { data } = await apiClient.post<Mensaje>(`/seguimientos/chats/${postulacionId}/mensajes`, mensaje);
  return data;
}

export async function marcarLeidos(postulacionId: number): Promise<void> {
  const { data } = await apiClient.patch<{ total: number }>(`/seguimientos/chats/${postulacionId}/leidos`);
  window.dispatchEvent(new CustomEvent(EVENTO_NO_LEIDOS, { detail: data.total }));
}

export async function responderEncuesta(
  postulacionId: number,
  dias: 30 | 90,
  resultado: ResultadoEncuesta,
  motivoDevolucion?: string
): Promise<void> {
  await apiClient.post("/seguimientos", {
    postulacion_id: postulacionId,
    dias_transcurridos: dias,
    resultado,
    motivo_devolucion: motivoDevolucion || null,
  });
}

/* ---------- Archivos ---------- */

export const LIMITE_MB: Record<TipoArchivo, number> = { imagen: 10, audio: 10, video: 50 };
export const DURACION_MAXIMA_SEG: Record<"audio" | "video", number> = { audio: 120, video: 60 };

export interface ArchivoSubido {
  publicId: string;
  duracionSeg?: number;
}

/** Sube el archivo DIRECTO a Cloudinary con una firma del backend: el video
    no pasa por el gateway (en Render chocaría con los tiempos de espera). */
export async function subirArchivo(
  postulacionId: number,
  tipo: TipoArchivo,
  archivo: Blob,
  alProgresar?: (porcentaje: number) => void
): Promise<ArchivoSubido> {
  const { data: firma } = await apiClient.post<FirmaSubida>(
    `/seguimientos/chats/${postulacionId}/firma-subida`
  );

  const formulario = new FormData();
  formulario.append("file", archivo);
  formulario.append("api_key", firma.api_key);
  formulario.append("timestamp", String(firma.timestamp));
  formulario.append("folder", firma.folder);
  formulario.append("signature", firma.signature);

  // Cloudinary guarda el audio como recurso "video".
  const recurso = tipo === "imagen" ? "image" : "video";
  // axios directo (no apiClient): Cloudinary no debe recibir nuestro token.
  const { data } = await axios.post<{ public_id: string; duration?: number }>(
    `https://api.cloudinary.com/v1_1/${firma.cloud_name}/${recurso}/upload`,
    formulario,
    {
      onUploadProgress: (e) => {
        if (alProgresar && e.total) alProgresar(Math.round((e.loaded / e.total) * 100));
      },
    }
  );
  return { publicId: data.public_id, duracionSeg: data.duration };
}
