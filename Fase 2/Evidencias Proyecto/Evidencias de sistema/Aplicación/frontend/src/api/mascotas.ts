import { apiClient } from "./client";
import type { Mascota, MascotaInput } from "../types/mascotas";

export async function listarMascotas(estado?: string): Promise<Mascota[]> {
  const { data } = await apiClient.get<Mascota[]>("/mascotas", {
    params: estado ? { estado } : undefined,
  });
  return data;
}

export async function obtenerMascota(id: number): Promise<Mascota> {
  const { data } = await apiClient.get<Mascota>(`/mascotas/${id}`);
  return data;
}

export async function misMascotas(): Promise<Mascota[]> {
  const { data } = await apiClient.get<Mascota[]>("/mascotas/mias");
  return data;
}

export async function crearMascota(datos: MascotaInput): Promise<Mascota> {
  const { data } = await apiClient.post<Mascota>("/mascotas", datos);
  return data;
}

export async function agregarFoto(mascotaId: number, url: string): Promise<void> {
  await apiClient.post(`/mascotas/${mascotaId}/fotos`, { url, es_principal: true, orden: 1 });
}

