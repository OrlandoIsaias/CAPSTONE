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

export async function agregarFoto(
  mascotaId: number, 
  archivoImagen: File, 
  esPrincipal: boolean = true, 
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