import { useEffect, useState } from "react";
import { EVENTO_NO_LEIDOS, totalNoLeidos } from "../api/seguimiento";

const INTERVALO_MS = 30_000;

/** Total de mensajes de seguimiento sin leer, para el globo de la barra.
    Se consulta al montar, cada 30 s mientras la pestaña está visible y al
    volver a ella; marcarLeidos() lo actualiza al instante con un evento. */
export function useNoLeidos(): number {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let controlador: AbortController | null = null;

    function consultar() {
      if (document.visibilityState !== "visible") return;
      controlador?.abort();
      controlador = new AbortController();
      totalNoLeidos(controlador.signal)
        .then(setTotal)
        .catch(() => {
          // Un globo desactualizado no justifica mostrar un error.
        });
    }

    function alCambiar(e: Event) {
      setTotal((e as CustomEvent<number>).detail);
    }

    consultar();
    const intervalo = window.setInterval(consultar, INTERVALO_MS);
    document.addEventListener("visibilitychange", consultar);
    window.addEventListener(EVENTO_NO_LEIDOS, alCambiar);
    return () => {
      controlador?.abort();
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", consultar);
      window.removeEventListener(EVENTO_NO_LEIDOS, alCambiar);
    };
  }, []);

  return total;
}
