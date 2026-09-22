import { apiClient } from "./client";
import type { EstadoPostulacion, Postulacion, PostulacionDetalle } from "../types/postulaciones";

export async function crearPostulacion(mascotaId: number): Promise<Postulacion> {
  const { data } = await apiClient.post<Postulacion>("/postulaciones", { mascota_id: mascotaId });
  return data;
}

export async function misPostulaciones(): Promise<Postulacion[]> {
  const { data } = await apiClient.get<Postulacion[]>("/postulaciones/mias");
  return data;
}

export async function postulacionesRecibidas(): Promise<Postulacion[]> {
  const { data } = await apiClient.get<Postulacion[]>("/postulaciones/recibidas");
  return data;
}

export async function detallePostulacion(postulacionId: number): Promise<PostulacionDetalle> {
  const { data } = await apiClient.get<PostulacionDetalle>(`/postulaciones/${postulacionId}`);
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
