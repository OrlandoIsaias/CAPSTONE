import { apiClient } from "./client";
import type { GenericAbortSignal } from "axios";
import type {
  PerfilAdoptante,
  PerfilAdoptanteInput,
  PerfilRefugio,
  PerfilRefugioInput,
  TokenOut,
  UsuarioLogin,
  UsuarioRegistro,
} from "../types/auth";

export async function registrar(datos: UsuarioRegistro): Promise<TokenOut> {
  const { data } = await apiClient.post<TokenOut>("/auth/registro", datos);
  return data;
}

export async function iniciarSesion(datos: UsuarioLogin): Promise<TokenOut> {
  const { data } = await apiClient.post<TokenOut>("/auth/login", datos);
  return data;
}

export async function guardarPerfilAdoptante(
  datos: PerfilAdoptanteInput
): Promise<PerfilAdoptante> {
  const { data } = await apiClient.post<PerfilAdoptante>("/auth/perfil-adoptante", datos);
  return data;
}

export async function obtenerPerfilAdoptante(signal?: GenericAbortSignal): Promise<PerfilAdoptante> {
  const { data } = await apiClient.get<PerfilAdoptante>("/auth/perfil-adoptante", { signal });
  return data;
}

export async function guardarPerfilRefugio(
  datos: PerfilRefugioInput
): Promise<PerfilRefugio> {
  const { data } = await apiClient.post<PerfilRefugio>("/auth/perfil-refugio", datos);
  return data;
}

export async function obtenerPerfilRefugio(signal?: GenericAbortSignal): Promise<PerfilRefugio> {
  const { data } = await apiClient.get<PerfilRefugio>("/auth/perfil-refugio", { signal });
  return data;
}
