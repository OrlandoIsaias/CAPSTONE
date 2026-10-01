import { apiClient } from "./client";
import type { Recomendacion } from "../types/matching";

/** Por defecto (pantalla Recomendaciones): solo mascotas compatibles de la
    especie preferida. Con explorar, todas las disponibles, con las no
    compatibles marcadas (excluida) y las de otra especie señaladas. */
export async function obtenerRecomendaciones(
  signal?: AbortSignal,
  opciones?: { explorar?: boolean }
): Promise<Recomendacion[]> {
  const { data } = await apiClient.get<Recomendacion[]>("/matching/recomendaciones", {
    signal,
    params: opciones?.explorar ? { explorar: true } : undefined,
  });
  return data;
}

export async function obtenerScoreIndividual(mascotaId: number): Promise<Recomendacion> {
  const { data } = await apiClient.get<Recomendacion>(`/matching/mascota/${mascotaId}`);
  return data;
}
