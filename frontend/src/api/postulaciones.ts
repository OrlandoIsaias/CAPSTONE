import { apiClient } from "./client";
import type { EstadoPostulacion, Postulacion, PostulacionDetalle } from "../types/postulaciones";

export async function crearPostulacion(mascotaId: number): Promise<Postulacion> {
  const { data } = await apiClient.post<Postulacion>("/postulaciones", { mascota_id: mascotaId });
  return data;
}

export async function misPostulaciones(signal?: AbortSignal): Promise<Postulacion[]> {
  const { data } = await apiClient.get<Postulacion[]>("/postulaciones/mias", { signal });
  return data;
}

export async function postulacionesRecibidas(signal?: AbortSignal): Promise<Postulacion[]> {
  const { data } = await apiClient.get<Postulacion[]>("/postulaciones/recibidas", { signal });
  return data;
}

export async function detallePostulacion(
  postulacionId: number,
  signal?: AbortSignal
): Promise<PostulacionDetalle> {
  const { data } = await apiClient.get<PostulacionDetalle>(`/postulaciones/${postulacionId}`, { signal });
  return data;
}

export async function evaluarPostulacion(
  postulacionId: number,
  estado: Extract<EstadoPostulacion, "aprobada" | "rechazada">
): Promise<Postulacion> {
  const { data } = await apiClient.patch<Postulacion>(`/postulaciones/${postulacionId}/estado`, { estado });
  return data;
}

export async function confirmarAdopcion(postulacionId: number): Promise<Postulacion> {
  const { data } = await apiClient.patch<Postulacion>(`/postulaciones/${postulacionId}/confirmar-adopcion`);
  return data;
}
