import { apiClient } from "./client";
import type { Mascota, MascotaInput } from "../types/mascotas";

export async function listarMascotas(estado?: string, signal?: AbortSignal): Promise<Mascota[]> {
  const { data } = await apiClient.get<Mascota[]>("/mascotas", {
    params: estado ? { estado } : undefined,
    signal,
  });
  return data;
}

export async function obtenerMascota(id: number, signal?: AbortSignal): Promise<Mascota> {
  const { data } = await apiClient.get<Mascota>(`/mascotas/${id}`, { signal });
  return data;
}

export async function misMascotas(signal?: AbortSignal): Promise<Mascota[]> {
  const { data } = await apiClient.get<Mascota[]>("/mascotas/mias", { signal });
  return data;
}

export async function crearMascota(datos: MascotaInput): Promise<Mascota> {
  const { data } = await apiClient.post<Mascota>("/mascotas", datos);
  return data;
}

export async function agregarFoto(
  mascotaId: number, 
  archivoImagen: File, 
  esPrincipal: boolean = false, 
  orden: number = 1
): Promise<void> {
  const formData = new FormData();
  formData.append("foto", archivoImagen);
  formData.append("es_principal", String(esPrincipal));
  formData.append("orden", String(orden));

  await apiClient.post(`/mascotas/${mascotaId}/fotos`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

export async function eliminarFoto(mascotaId: number, fotoId: number): Promise<void> {
  await apiClient.delete(`/mascotas/${mascotaId}/fotos/${fotoId}`);
}