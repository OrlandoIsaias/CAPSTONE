import { apiClient } from "./client";
import type { Recomendacion } from "../types/matching";

export async function obtenerRecomendaciones(signal?: AbortSignal): Promise<Recomendacion[]> {
  const { data } = await apiClient.get<Recomendacion[]>("/matching/recomendaciones", { signal });
  return data;
}

export async function obtenerScoreIndividual(mascotaId: number): Promise<Recomendacion> {
  const { data } = await apiClient.get<Recomendacion>(`/matching/mascota/${mascotaId}`);
  return data;
}
