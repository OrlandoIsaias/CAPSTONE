import { useCallback, useEffect, useState } from "react";

/* "Guardados" (favoritos del adoptante) todavía no existe como endpoint en el
   backend — se resuelve en el cliente con localStorage, igual que las
   notificaciones leídas del refugio (ver InicioRefugio). Un CustomEvent avisa
   a las demás pantallas montadas cuando la lista cambia, para que el corazón
   de una tarjeta y la pantalla de Guardados nunca queden desincronizados. */
const CLAVE = "housefound_guardados";
const EVENTO = "housefound:guardados-cambio";

function leer(): number[] {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
    return Array.isArray(crudo) ? crudo : [];
  } catch {
    return [];
  }
}

function escribir(lista: number[]) {
  localStorage.setItem(CLAVE, JSON.stringify(lista));
  window.dispatchEvent(new CustomEvent(EVENTO));
}

export function estaGuardado(mascotaId: number): boolean {
  return leer().includes(mascotaId);
}

export function alternarGuardado(mascotaId: number): boolean {
  const actuales = leer();
  const yaEstaba = actuales.includes(mascotaId);
  escribir(yaEstaba ? actuales.filter((id) => id !== mascotaId) : [...actuales, mascotaId]);
  return !yaEstaba;
}

/** Lista reactiva de ids guardados — se actualiza sola cuando alguna
    pantalla (o pestaña) modifica el localStorage. */
export function useGuardados() {
  const [ids, setIds] = useState<number[]>(() => leer());

  useEffect(() => {
    const actualizar = () => setIds(leer());
    window.addEventListener(EVENTO, actualizar);
    window.addEventListener("storage", actualizar);
    return () => {
      window.removeEventListener(EVENTO, actualizar);
      window.removeEventListener("storage", actualizar);
    };
  }, []);

  const alternar = useCallback((mascotaId: number) => alternarGuardado(mascotaId), []);

  return { ids, alternar };
}
