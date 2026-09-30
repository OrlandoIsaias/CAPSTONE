import type { PerfilRefugio } from "../types/auth";

/* Caché compartida del perfil de refugio (localStorage), usada tanto por
   InicioRefugio.tsx (título de la cabecera) como por PerfilRefugio.tsx
   (formulario completo) — un solo lugar de verdad evita que las dos
   pantallas queden desincronizadas entre sí después de una edición.
   El nombre/dirección/teléfono del refugio casi no cambian, así que desde
   la segunda visita se puede mostrar de inmediato sin esperar al servidor. */

function clave(usuarioId: number) {
  return `housefound_perfil_refugio_cache_${usuarioId}`;
}

export function leerPerfilRefugioCache(usuarioId: number): PerfilRefugio | null {
  try {
    const crudo = localStorage.getItem(clave(usuarioId));
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

export function guardarPerfilRefugioCache(usuarioId: number, perfil: PerfilRefugio) {
  try {
    localStorage.setItem(clave(usuarioId), JSON.stringify(perfil));
  } catch {
    // localStorage lleno/deshabilitado — no es crítico, simplemente no se cachea.
  }
}
