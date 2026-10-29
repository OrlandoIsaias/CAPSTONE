import { Fragment, useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { ChevronLeft, Paperclip, Send } from "lucide-react";
import {
  DURACION_MAXIMA_SEG,
  LIMITE_MB,
  detalleChat,
  enviarMensaje,
  listarMensajes,
  marcarLeidos,
  subirArchivo,
} from "../api/seguimiento";
import { AvatarIniciales } from "../components/Badges";
import { BurbujaMensaje } from "../components/chat/BurbujaMensaje";
import { GrabadorAudio } from "../components/chat/GrabadorAudio";
import { TarjetaEncuesta } from "../components/chat/TarjetaEncuesta";
import { CargandoVista, Spinner } from "../components/Spinner";
import { useToast } from "../context/ToastContext";
import { etiquetaDia, fechaCorta } from "../utils/tiempo";
import type { ChatDetalle, EncuestaEstado, Mensaje, TipoArchivo } from "../types/seguimiento";

/** Cada cuánto se buscan mensajes nuevos con el chat abierto. */
const INTERVALO_MS = 4000;

const ETIQUETA_SUBIDA: Record<TipoArchivo, string> = {
  imagen: "Enviando foto",
  audio: "Enviando audio",
  video: "Enviando video",
};

interface Subida {
  clave: number;
  tipo: TipoArchivo;
  progreso: number;
}

function mensajeDeError(err: unknown, porDefecto: string): string {
  const detalle = axios.isAxiosError(err) ? err.response?.data?.detail : null;
  return typeof detalle === "string" ? detalle : porDefecto;
}

function duracionDeVideo(archivo: File): Promise<number | null> {
  return new Promise((resolver) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(archivo);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolver(Number.isFinite(video.duration) ? video.duration : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolver(null);
    };
    video.src = url;
  });
}

export default function ChatSeguimiento() {
  const { id } = useParams();
  const postulacionId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [chat, setChat] = useState<ChatDetalle | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [enviandoTexto, setEnviandoTexto] = useState(false);
  const [subidas, setSubidas] = useState<Subida[]>([]);
  const [grabando, setGrabando] = useState(false);

  const ultimoIdRef = useRef<number | undefined>(undefined);
  const consultandoRef = useRef(false);
  const finRef = useRef<HTMLDivElement>(null);
  const archivoRef = useRef<HTMLInputElement>(null);

  const agregar = useCallback((nuevos: Mensaje[]) => {
    if (nuevos.length === 0) return;
    ultimoIdRef.current = Math.max(ultimoIdRef.current ?? 0, ...nuevos.map((m) => m.id));
    setMensajes((previos) => {
      const ids = new Set(previos.map((m) => m.id));
      return [...previos, ...nuevos.filter((m) => !ids.has(m.id))].sort((a, b) => a.id - b.id);
    });
  }, []);

  const recargarChat = useCallback(() => {
    detalleChat(postulacionId)
      .then(setChat)
      .catch(() => {
        // Se mantiene la cabecera anterior; el chat sigue usable.
      });
  }, [postulacionId]);

  // Carga inicial.
  useEffect(() => {
    const controlador = new AbortController();
    ultimoIdRef.current = undefined;

    Promise.all([detalleChat(postulacionId, controlador.signal), listarMensajes(postulacionId, undefined, controlador.signal)])
      .then(([detalle, iniciales]) => {
        setChat(detalle);
        setMensajes([]);
        agregar(iniciales);
        if (detalle.no_leidos > 0) marcarLeidos(postulacionId).catch(() => {});
      })
      .catch((err) => {
        if (!axios.isCancel(err)) setError(mensajeDeError(err, "No pudimos abrir este chat."));
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false);
      });

    return () => controlador.abort();
  }, [postulacionId, agregar]);

  // Mensajes nuevos mientras el chat está abierto y visible.
  useEffect(() => {
    if (!chat) return;

    const intervalo = window.setInterval(async () => {
      if (consultandoRef.current || document.visibilityState !== "visible") return;
      consultandoRef.current = true;
      try {
        const nuevos = await listarMensajes(postulacionId, ultimoIdRef.current);
        agregar(nuevos);
        if (nuevos.some((m) => !m.es_mio)) marcarLeidos(postulacionId).catch(() => {});
        // El refugio ve al instante el estado de una encuesta recién respondida.
        if (nuevos.some((m) => m.tipo === "encuesta")) recargarChat();
      } catch {
        // Un corte momentáneo no interrumpe el chat: se reintenta en la próxima vuelta.
      } finally {
        consultandoRef.current = false;
      }
    }, INTERVALO_MS);

    return () => window.clearInterval(intervalo);
  }, [chat, postulacionId, agregar, recargarChat]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [mensajes.length, subidas.length]);

  async function enviarTexto(e: FormEvent) {
    e.preventDefault();
    const contenido = texto.trim();
    if (!contenido || enviandoTexto) return;
    setEnviandoTexto(true);
    try {
      agregar([await enviarMensaje(postulacionId, { tipo: "texto", texto: contenido })]);
      setTexto("");
    } catch (err) {
      toast(mensajeDeError(err, "No pudimos enviar tu mensaje."), "error");
    } finally {
      setEnviandoTexto(false);
    }
  }

  async function subirYEnviar(tipo: TipoArchivo, archivo: Blob, duracionSeg?: number) {
    if (archivo.size > LIMITE_MB[tipo] * 1024 * 1024) {
      toast(`El archivo supera el máximo de ${LIMITE_MB[tipo]} MB.`, "error");
      return;
    }
    const clave = Date.now() + Math.random();
    setSubidas((s) => [...s, { clave, tipo, progreso: 0 }]);
    try {
      const subido = await subirArchivo(postulacionId, tipo, archivo, (progreso) =>
        setSubidas((s) => s.map((x) => (x.clave === clave ? { ...x, progreso } : x)))
      );
      const mensaje = await enviarMensaje(postulacionId, {
        tipo,
        media_public_id: subido.publicId,
        duracion_seg: subido.duracionSeg ?? duracionSeg,
      });
      agregar([mensaje]);
    } catch (err) {
      toast(mensajeDeError(err, "No pudimos enviar el archivo. Intenta de nuevo."), "error");
    } finally {
      setSubidas((s) => s.filter((x) => x.clave !== clave));
    }
  }

  async function alElegirArchivo(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;

    if (archivo.type.startsWith("image/")) {
      subirYEnviar("imagen", archivo);
      return;
    }
    if (archivo.type.startsWith("video/")) {
      const duracion = await duracionDeVideo(archivo);
      if (duracion !== null && duracion > DURACION_MAXIMA_SEG.video + 1) {
        toast(`El video dura más de ${DURACION_MAXIMA_SEG.video} segundos. Recórtalo antes de enviarlo.`, "error");
        return;
      }
      subirYEnviar("video", archivo, duracion ?? undefined);
      return;
    }
    toast("Solo puedes enviar fotos o videos.", "error");
  }

  if (cargando) return <CargandoVista mensaje="Abriendo el chat…" />;

  if (error || !chat) {
    return (
      <div className="min-h-screen bg-[var(--color-fondo)] flex items-center justify-center px-5">
        <div className="max-w-sm w-full rounded-3xl bg-white border border-slate-200/90 p-6 text-center shadow-xs">
          <p className="font-bold text-slate-800 mb-4">{error ?? "No pudimos abrir este chat."}</p>
          <Link
            to="/seguimiento"
            className="inline-flex px-5 py-2.5 rounded-2xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-xs"
          >
            Volver a Seguimiento
          </Link>
        </div>
      </div>
    );
  }

  const esAdoptante = chat.mi_rol === "adoptante";
  const encuestasDisponibles = esAdoptante ? chat.encuestas.filter((e) => e.estado === "disponible") : [];
  const ocupado = subidas.length > 0;

  return (
    <div className="h-[100dvh] bg-[var(--color-fondo)] overflow-hidden">
      <div className="mx-auto w-full max-w-[480px] h-full flex flex-col">
        {/* Cabecera */}
        <header className="flex items-center gap-3 px-4 py-3 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
          <button
            onClick={() => navigate("/seguimiento")}
            aria-label="Volver"
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center shrink-0 active:scale-90 transition-transform"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <Link
            to={esAdoptante ? `/mascota/${chat.mascota_id}` : `/mis-mascotas/${chat.mascota_id}`}
            className="flex items-center gap-3 min-w-0 flex-1"
          >
            {chat.mascota_foto ? (
              <img
                src={chat.mascota_foto}
                alt={chat.mascota_nombre}
                className="w-11 h-11 rounded-2xl object-cover bg-slate-100 border border-slate-200 shrink-0"
              />
            ) : (
              <AvatarIniciales nombre={chat.mascota_nombre} />
            )}
            <div className="min-w-0">
              <p className="font-extrabold text-slate-900 truncate leading-tight">{chat.mascota_nombre}</p>
              <p className="text-[11px] font-semibold text-purple-700 truncate">{chat.contraparte_nombre}</p>
            </div>
          </Link>
        </header>

        {/* Mensajes */}
        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          <EstadoEncuestas chat={chat} />

          {encuestasDisponibles.map((e) => (
            <TarjetaEncuesta
              key={e.dias}
              postulacionId={postulacionId}
              dias={e.dias}
              mascotaNombre={chat.mascota_nombre}
              alResponder={() => {
                recargarChat();
                listarMensajes(postulacionId, ultimoIdRef.current).then(agregar).catch(() => {});
              }}
            />
          ))}

          {mensajes.length === 0 && subidas.length === 0 && (
            <p className="text-center text-xs font-medium text-slate-500 py-8 px-6 leading-relaxed">
              {esAdoptante
                ? `Cuéntale a ${chat.contraparte_nombre} cómo está ${chat.mascota_nombre}: manda fotos, videos o un audio.`
                : `Aquí verás cómo está ${chat.mascota_nombre} en su nuevo hogar. También puedes escribirle a ${chat.contraparte_nombre}.`}
            </p>
          )}

          {mensajes.map((m, i) => {
            const nuevoDia = i === 0 || etiquetaDia(mensajes[i - 1].creado_en) !== etiquetaDia(m.creado_en);
            return (
              <Fragment key={m.id}>
                {nuevoDia && (
                  <div className="flex justify-center py-1">
                    <span className="px-3 py-1 rounded-full bg-white/80 border border-slate-200 text-[10px] font-bold text-slate-500">
                      {etiquetaDia(m.creado_en)}
                    </span>
                  </div>
                )}
                <BurbujaMensaje mensaje={m} />
              </Fragment>
            );
          })}

          {subidas.map((s) => (
            <div key={s.clave} className="flex justify-end">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-3xl rounded-br-lg bg-purple-100 text-purple-800 text-xs font-bold">
                <Spinner />
                {ETIQUETA_SUBIDA[s.tipo]}… {s.progreso}%
              </div>
            </div>
          ))}
          <div ref={finRef} />
        </main>

        {/* Caja de mensaje */}
        <form
          onSubmit={enviarTexto}
          className="flex items-end gap-2 px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] bg-white border-t border-slate-200/80"
        >
          {!grabando && (
            <>
              <button
                type="button"
                onClick={() => archivoRef.current?.click()}
                disabled={ocupado}
                aria-label="Enviar foto o video"
                className="w-11 h-11 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center shrink-0 active:scale-90 transition-transform disabled:opacity-50"
              >
                <Paperclip size={19} strokeWidth={2} />
              </button>
              <input
                ref={archivoRef}
                type="file"
                accept="image/*,video/*"
                onChange={alElegirArchivo}
                className="hidden"
              />
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder="Escribe un mensaje…"
                className="flex-1 min-h-11 max-h-32 px-4 py-2.5 rounded-3xl bg-slate-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 field-sizing-content"
              />
            </>
          )}

          {texto.trim() && !grabando ? (
            <button
              type="submit"
              disabled={enviandoTexto}
              aria-label="Enviar mensaje"
              className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white flex items-center justify-center shrink-0 shadow-sm active:scale-90 transition-transform disabled:opacity-50"
            >
              {enviandoTexto ? <Spinner /> : <Send size={18} strokeWidth={2} />}
            </button>
          ) : (
            <GrabadorAudio
              deshabilitado={ocupado}
              alCambiarGrabando={setGrabando}
              alGrabar={(audio, duracion) => subirYEnviar("audio", audio, duracion)}
              alError={(mensaje) => toast(mensaje, "error")}
            />
          )}
        </form>
      </div>
    </div>
  );
}

/** Estado de las encuestas de 30 y 90 días, como franja informativa. */
function EstadoEncuestas({ chat }: { chat: ChatDetalle }) {
  const textos = chat.encuestas.map((e) => textoEncuesta(e, chat)).filter(Boolean);
  if (textos.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-center gap-1.5 pb-1">
      {textos.map((t) => (
        <span key={t} className="px-2.5 py-1 rounded-full bg-white/80 border border-slate-200 text-[10px] font-bold text-slate-500">
          {t}
        </span>
      ))}
    </div>
  );
}

const RESULTADO: Record<string, string> = {
  exitosa: "va bien",
  en_proceso: "en adaptación",
  devuelta: "devuelta",
};

function textoEncuesta(e: EncuestaEstado, chat: ChatDetalle): string | null {
  const nombre = `Encuesta ${e.dias} días`;
  if (e.estado === "respondida") return `${nombre}: ${RESULTADO[e.resultado ?? ""] ?? "respondida"}`;
  if (e.estado === "disponible") return chat.mi_rol === "refugio" ? `${nombre}: esperando respuesta` : null;
  if (!chat.fecha_adopcion && chat.mascota_estado !== "adoptada") {
    return e.dias === 30 ? "Las encuestas se activan al confirmar la adopción" : null;
  }
  return e.disponible_desde ? `${nombre}: desde el ${fechaCorta(e.disponible_desde)}` : null;
}
