import { apiClient } from "./client";
import type { Recomendacion } from "../types/matching";

export async function obtenerRecomendaciones(): Promise<Recomendacion[]> {
  const { data } = await apiClient.get<Recomendacion[]>("/matching/recomendaciones");
  return data;
}

export async function obtenerScoreIndividual(mascotaId: number): Promise<Recomendacion> {
  const { data } = await apiClient.get<Recomendacion>(`/matching/mascota/${mascotaId}`);
  return data;
}
