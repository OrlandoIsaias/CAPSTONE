import { apiClient } from "./client";
import type { Postulacion } from "../types/postulaciones";

export async function crearPostulacion(mascotaId: number): Promise<Postulacion> {
  const { data } = await apiClient.post<Postulacion>("/postulaciones", { mascota_id: mascotaId });
  return data;
}

export async function misPostulaciones(): Promise<Postulacion[]> {
  const { data } = await apiClient.get<Postulacion[]>("/postulaciones/mias");
  return data;
}
