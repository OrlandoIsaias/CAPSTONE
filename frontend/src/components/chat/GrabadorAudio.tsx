import { useEffect, useRef, useState } from "react";
import { Mic, Send, Trash2 } from "lucide-react";
import { DURACION_MAXIMA_SEG } from "../../api/seguimiento";
import { duracionCorta } from "../../utils/tiempo";

/** Graba una nota de voz con la API MediaRecorder del navegador (sin
    librerías). Un toque empieza, otro la envía y el basurero la descarta.
    Chrome graba en webm y Safari en mp4; Cloudinary entrega ambos como mp3.
    El micrófono solo funciona en localhost o con HTTPS. */
export function GrabadorAudio({
  deshabilitado,
  alGrabar,
  alError,
  alCambiarGrabando,
}: {
  deshabilitado?: boolean;
  alGrabar: (audio: Blob, duracionSeg: number) => void;
  alError: (mensaje: string) => void;
  /** Para que el chat oculte la caja de texto mientras se graba. */
  alCambiarGrabando?: (grabando: boolean) => void;
}) {
  const [grabando, setGrabandoEstado] = useState(false);

  function setGrabando(valor: boolean) {
    setGrabandoEstado(valor);
    alCambiarGrabando?.(valor);
  }
  const [segundos, setSegundos] = useState(0);
  const grabadorRef = useRef<MediaRecorder | null>(null);
  const trozosRef = useRef<Blob[]>([]);
  const inicioRef = useRef(0);
  const enviarAlDetenerRef = useRef(false);
  // onstop y el temporizador corren después de varios renders: se leen las
  // funciones más recientes desde refs.
  const alGrabarRef = useRef(alGrabar);
  const detenerRef = useRef<(enviar: boolean) => void>(() => {});
  useEffect(() => {
    alGrabarRef.current = alGrabar;
    detenerRef.current = detener;
  });

  // Si se sale del chat a mitad de una grabación, se suelta el micrófono.
  useEffect(() => () => detenerRef.current(false), []);

  useEffect(() => {
    if (!grabando) return;
    const intervalo = window.setInterval(() => {
      const transcurridos = (Date.now() - inicioRef.current) / 1000;
      setSegundos(transcurridos);
      if (transcurridos >= DURACION_MAXIMA_SEG.audio) detenerRef.current(true);
    }, 250);
    return () => window.clearInterval(intervalo);
  }, [grabando]);

  async function empezar() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      alError("Tu navegador no permite grabar audio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const grabador = new MediaRecorder(stream);
      trozosRef.current = [];
      grabador.ondataavailable = (e) => {
        if (e.data.size > 0) trozosRef.current.push(e.data);
      };
      grabador.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const duracion = (Date.now() - inicioRef.current) / 1000;
        if (enviarAlDetenerRef.current && trozosRef.current.length > 0) {
          alGrabarRef.current(new Blob(trozosRef.current, { type: grabador.mimeType || "audio/webm" }), duracion);
        }
      };
      grabadorRef.current = grabador;
      inicioRef.current = Date.now();
      setSegundos(0);
      grabador.start();
      setGrabando(true);
    } catch {
      alError("No pudimos usar el micrófono. Revisa los permisos del navegador.");
    }
  }

  function detener(enviar: boolean) {
    const grabador = grabadorRef.current;
    if (!grabador || grabador.state === "inactive") return;
    enviarAlDetenerRef.current = enviar;
    grabador.stop();
    grabadorRef.current = null;
    setGrabando(false);
  }

  if (!grabando) {
    return (
      <button
        type="button"
        onClick={empezar}
        disabled={deshabilitado}
        aria-label="Grabar audio"
        className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white flex items-center justify-center shrink-0 shadow-sm active:scale-90 transition-transform disabled:opacity-50"
      >
        <Mic size={20} strokeWidth={2} />
      </button>
    );
  }

  return (
    <div className="flex-1 flex items-center gap-2">
      <button
        type="button"
        onClick={() => detener(false)}
        aria-label="Descartar audio"
        className="w-11 h-11 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 active:scale-90 transition-transform"
      >
        <Trash2 size={18} strokeWidth={2} />
      </button>
      <div className="flex-1 h-11 rounded-full bg-rose-50 border border-rose-200 flex items-center gap-2 px-4">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
        <span className="text-sm font-bold text-rose-700 tabular-nums">{duracionCorta(segundos)}</span>
        <span className="text-xs font-medium text-rose-600/80 truncate">
          Grabando · máx. {duracionCorta(DURACION_MAXIMA_SEG.audio)}
        </span>
      </div>
      <button
        type="button"
        onClick={() => detener(true)}
        aria-label="Enviar audio"
        className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white flex items-center justify-center shrink-0 shadow-sm active:scale-90 transition-transform"
      >
        <Send size={18} strokeWidth={2} />
      </button>
    </div>
  );
}
