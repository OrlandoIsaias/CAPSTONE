import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { ClipboardCheck, MessageCircle } from "lucide-react";
import { listarChats } from "../api/seguimiento";
import { PantallaAdoptante } from "../components/BarraAdoptante";
import { PantallaRefugio } from "../components/BarraRefugio";
import { AvatarIniciales } from "../components/Badges";
import { CargandoVista } from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import { tiempoRelativo } from "../utils/tiempo";
import type { ChatResumen, TipoMensaje } from "../types/seguimiento";

const VISTA_PREVIA: Record<Exclude<TipoMensaje, "texto" | "encuesta">, string> = {
  imagen: "📷 Foto",
  audio: "🎤 Audio",
  video: "🎬 Video",
};

function vistaPrevia(chat: ChatResumen): string {
  const ultimo = chat.ultimo_mensaje;
  if (!ultimo) return "Aún no hay mensajes. ¡Cuéntale cómo va!";
  const contenido =
    ultimo.tipo === "texto" || ultimo.tipo === "encuesta"
      ? (ultimo.texto ?? "")
      : VISTA_PREVIA[ultimo.tipo] + (ultimo.texto ? ` · ${ultimo.texto}` : "");
  return ultimo.es_mio ? `Tú: ${contenido}` : contenido;
}

export default function Chats() {
  const { usuario } = useAuth();
  const esRefugio = usuario?.rol === "refugio";
  const [chats, setChats] = useState<ChatResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controlador = new AbortController();

    listarChats(controlador.signal)
      .then(setChats)
      .catch((err) => {
        if (!axios.isCancel(err)) setError("No pudimos cargar tus chats de seguimiento.");
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false);
      });

    return () => controlador.abort();
  }, []);

  const Pantalla = esRefugio ? PantallaRefugio : PantallaAdoptante;

  return (
    <Pantalla>
      <header className="mb-5">
        <h1 className="text-xl font-black text-slate-900 leading-tight">Seguimiento</h1>
        <p className="text-xs font-medium text-slate-500 mt-1">
          {esRefugio
            ? "Mira cómo están las mascotas que entregaste en sus nuevos hogares."
            : "Comparte con el refugio cómo está tu mascota en su nuevo hogar."}
        </p>
      </header>

      {cargando && <CargandoVista mensaje="Cargando tus chats…" />}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium mb-4">
          {error}
        </div>
      )}

      {!cargando && !error && chats.length === 0 && (
        <EstadoVacio>
          {esRefugio
            ? "Cuando apruebes una solicitud se abrirá aquí un chat con el adoptante, para seguir cómo le va a la mascota."
            : "Cuando un refugio apruebe tu solicitud se abrirá aquí un chat para que le cuentes cómo le va a tu mascota, con fotos, audios y videos."}
        </EstadoVacio>
      )}

      <ul className="space-y-3">
        {chats.map((chat) => (
          <li key={chat.postulacion_id}>
            <Link
              to={`/seguimiento/${chat.postulacion_id}`}
              className="flex items-center gap-3.5 rounded-3xl bg-white border border-slate-200/90 p-3.5 shadow-xs hover:shadow-sm active:scale-[0.99] transition-all"
            >
              {chat.mascota_foto ? (
                <img
                  src={chat.mascota_foto}
                  alt={chat.mascota_nombre}
                  className="w-14 h-14 rounded-2xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                />
              ) : (
                <AvatarIniciales nombre={chat.mascota_nombre} grande />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-extrabold text-slate-900 truncate">{chat.mascota_nombre}</p>
                  {chat.ultimo_mensaje && (
                    <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                      {tiempoRelativo(chat.ultimo_mensaje.creado_en)}
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-semibold text-purple-700 truncate">{chat.contraparte_nombre}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p
                    className={`flex-1 text-xs truncate ${
                      chat.no_leidos > 0 ? "font-bold text-slate-800" : "font-medium text-slate-500"
                    }`}
                  >
                    {vistaPrevia(chat)}
                  </p>
                  {chat.no_leidos > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white text-[11px] font-bold leading-5 text-center shrink-0">
                      {chat.no_leidos}
                    </span>
                  )}
                </div>
                {chat.encuesta_disponible && (
                  <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                    <ClipboardCheck size={12} strokeWidth={2.4} />
                    Encuesta de seguimiento pendiente
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Pantalla>
  );
}

function EstadoVacio({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-3xl bg-white border border-slate-200/90 p-8 text-center shadow-xs">
      <span className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
        <MessageCircle size={22} strokeWidth={2} />
      </span>
      <h2 className="font-extrabold text-slate-800 text-base mb-1">Aún no tienes chats</h2>
      <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">{children}</p>
    </div>
  );
}
