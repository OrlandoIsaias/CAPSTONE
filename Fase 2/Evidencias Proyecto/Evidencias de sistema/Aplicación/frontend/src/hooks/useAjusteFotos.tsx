import { useCallback, useRef, useState } from "react";
import { AjustarFoto } from "../components/AjustarFoto";

interface Tanda {
  archivos: File[];
  indice: number;
  listas: File[];
}

/** Muestra el editor de recorte para cada foto elegida, una tras otra.
    Uso: `const ajustadas = await ajustarFotos(archivos)` resuelve con las
    fotos ya recortadas (sin las que el usuario omitió), y `editorFotos` se
    renderiza en cualquier parte de la pantalla. */
export function useAjusteFotos() {
  const [tanda, setTanda] = useState<Tanda | null>(null);
  const resolverRef = useRef<((archivos: File[]) => void) | null>(null);

  const ajustarFotos = useCallback((archivos: File[]) => {
    if (archivos.length === 0) return Promise.resolve([]);
    setTanda({ archivos, indice: 0, listas: [] });
    return new Promise<File[]>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  function avanzar(recortada: File | null) {
    if (!tanda) return;
    const listas = recortada ? [...tanda.listas, recortada] : tanda.listas;
    const siguiente = tanda.indice + 1;
    if (siguiente < tanda.archivos.length) {
      setTanda({ ...tanda, indice: siguiente, listas });
      return;
    }
    setTanda(null);
    resolverRef.current?.(listas);
    resolverRef.current = null;
  }

  const editorFotos = tanda ? (
    <AjustarFoto
      key={tanda.indice}
      archivo={tanda.archivos[tanda.indice]}
      numero={tanda.indice + 1}
      total={tanda.archivos.length}
      onUsar={(archivo) => avanzar(archivo)}
      onOmitir={() => avanzar(null)}
    />
  ) : null;

  return { ajustarFotos, editorFotos };
}
