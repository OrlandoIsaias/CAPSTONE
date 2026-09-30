import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { leerArchivoComoDataUrl, recortarCuadrado } from "../utils/imagen";
import { Spinner } from "./Spinner";

/** Lado del visor cuadrado, en píxeles de pantalla. */
const VISOR = 280;
const ZOOM_MAX = 3;

interface Props {
  archivo: File;
  /** Posición de esta foto en la tanda elegida (para "Foto 2 de 3"). */
  numero: number;
  total: number;
  onUsar: (archivo: File) => void;
  onOmitir: () => void;
}

/** Hoja para encuadrar una foto antes de subirla: el usuario la arrastra y
    la acerca dentro de un visor cuadrado, y lo que queda dentro del visor es
    exactamente lo que se guarda (mismo formato 1:1 que el recorte
    automático). La imagen siempre cubre el visor completo, así la foto
    final nunca queda con bordes vacíos. */
export function AjustarFoto({ archivo, numero, total, onUsar, onOmitir }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [posicion, setPosicion] = useState({ x: 0, y: 0 });
  const [guardando, setGuardando] = useState(false);
  const [errorLectura, setErrorLectura] = useState(false);
  const arrastre = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    let vigente = true;
    leerArchivoComoDataUrl(archivo)
      .then((datos) => {
        if (vigente) setUrl(datos);
      })
      .catch(() => {
        if (vigente) setErrorLectura(true);
      });
    return () => {
      vigente = false;
    };
  }, [archivo]);

  // Escala con la que el lado más corto de la foto llena justo el visor
  const escalaBase = natural ? VISOR / Math.min(natural.w, natural.h) : 1;
  const escala = escalaBase * zoom;
  const ancho = natural ? natural.w * escala : VISOR;
  const alto = natural ? natural.h * escala : VISOR;

  /** Impide que la foto se salga del visor y deje espacio vacío. */
  function limitar(x: number, y: number, anchoImg = ancho, altoImg = alto) {
    return {
      x: Math.min(0, Math.max(VISOR - anchoImg, x)),
      y: Math.min(0, Math.max(VISOR - altoImg, y)),
    };
  }

  function centrar(w: number, h: number, nuevoZoom: number) {
    const e = (VISOR / Math.min(w, h)) * nuevoZoom;
    setPosicion({ x: (VISOR - w * e) / 2, y: (VISOR - h * e) / 2 });
  }

  function alCargar(img: HTMLImageElement) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    setNatural({ w, h });
    setZoom(1);
    centrar(w, h, 1);
  }

  /** Cambia el zoom manteniendo fijo el punto que está al centro del visor. */
  function cambiarZoom(valor: number) {
    if (!natural) return;
    const nuevoZoom = Math.min(ZOOM_MAX, Math.max(1, valor));
    const nuevaEscala = escalaBase * nuevoZoom;
    const centroX = (VISOR / 2 - posicion.x) / escala;
    const centroY = (VISOR / 2 - posicion.y) / escala;
    setZoom(nuevoZoom);
    setPosicion(
      limitar(
        VISOR / 2 - centroX * nuevaEscala,
        VISOR / 2 - centroY * nuevaEscala,
        natural.w * nuevaEscala,
        natural.h * nuevaEscala
      )
    );
  }

  function alPresionar(e: PointerEvent<HTMLDivElement>) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Sin captura el arrastre igual funciona mientras el puntero siga en el visor
    }
    arrastre.current = { x: e.clientX, y: e.clientY, px: posicion.x, py: posicion.y };
  }

  function alMover(e: PointerEvent<HTMLDivElement>) {
    const inicio = arrastre.current;
    if (!inicio) return;
    setPosicion(limitar(inicio.px + e.clientX - inicio.x, inicio.py + e.clientY - inicio.y));
  }

  function alSoltar() {
    arrastre.current = null;
  }

  function alRueda(e: WheelEvent<HTMLDivElement>) {
    cambiarZoom(zoom - e.deltaY * 0.002);
  }

  async function usarFoto() {
    if (!natural) return;
    setGuardando(true);
    try {
      const recortada = await recortarCuadrado(archivo, {
        x: -posicion.x / escala,
        y: -posicion.y / escala,
        lado: VISOR / escala,
      });
      onUsar(recortada);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 animate-[fade-in_0.15s_ease-out]" />
      <div className="relative w-full sm:max-w-sm mx-auto bg-white rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-[sheet-in_0.2s_ease-out] shadow-2xl">
        <div className="flex items-baseline justify-between mb-1">
          <h3 className="text-lg font-bold text-slate-900">Ajustar foto</h3>
          {total > 1 && (
            <span className="text-xs font-bold text-slate-400">
              Foto {numero} de {total}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Arrastra la foto para encuadrarla y usa el zoom para acercarla.
        </p>

        <div
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          onWheel={alRueda}
          className="relative mx-auto overflow-hidden rounded-2xl bg-slate-900 cursor-grab active:cursor-grabbing touch-none select-none"
          style={{ width: VISOR, height: VISOR }}
        >
          {url && (
            <img
              src={url}
              alt="Foto a ajustar"
              draggable={false}
              onLoad={(e) => alCargar(e.currentTarget)}
              onError={() => setErrorLectura(true)}
              className="absolute top-0 left-0 max-w-none pointer-events-none"
              style={{
                width: ancho,
                height: alto,
                transform: `translate(${posicion.x}px, ${posicion.y}px)`,
                visibility: natural ? "visible" : "hidden",
              }}
            />
          )}
          {/* Guías de tercios para ayudar a encuadrar */}
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="border border-white/25" />
            ))}
          </div>
          {!natural && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-semibold text-center px-6">
              {errorLectura ? "No pudimos abrir esta foto. Omítela y elige otra." : <Spinner />}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={() => cambiarZoom(zoom - 0.25)}
            aria-label="Alejar"
            className="text-slate-500 hover:text-slate-800 active:scale-90 transition-transform"
          >
            <ZoomOut size={18} />
          </button>
          <input
            type="range"
            min={1}
            max={ZOOM_MAX}
            step={0.01}
            value={zoom}
            onChange={(e) => cambiarZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="flex-1 accent-emerald-600"
          />
          <button
            type="button"
            onClick={() => cambiarZoom(zoom + 0.25)}
            aria-label="Acercar"
            className="text-slate-500 hover:text-slate-800 active:scale-90 transition-transform"
          >
            <ZoomIn size={18} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!natural) return;
              setZoom(1);
              centrar(natural.w, natural.h, 1);
            }}
            aria-label="Restablecer"
            title="Restablecer"
            className="text-slate-500 hover:text-slate-800 active:scale-90 transition-transform"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={onOmitir}
            disabled={guardando}
            className="flex-1 py-3 rounded-xl font-semibold bg-slate-100 text-slate-700 active:scale-[0.97] transition-transform disabled:opacity-60"
          >
            {total > 1 ? "Omitir foto" : "Cancelar"}
          </button>
          <button
            type="button"
            onClick={usarFoto}
            disabled={!natural || guardando}
            className="flex-1 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 active:scale-[0.97] transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {guardando && <Spinner />}
            Usar foto
          </button>
        </div>
      </div>
    </div>
  );
}
