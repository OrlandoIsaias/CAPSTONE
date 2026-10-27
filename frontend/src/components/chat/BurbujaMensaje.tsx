import { ClipboardCheck } from "lucide-react";
import { horaCorta } from "../../utils/tiempo";
import type { Mensaje } from "../../types/seguimiento";

export function BurbujaMensaje({ mensaje }: { mensaje: Mensaje }) {
  // La respuesta a una encuesta es un aviso del sistema, no una burbuja.
  if (mensaje.tipo === "encuesta") {
    return (
      <div className="flex justify-center my-1">
        <div className="max-w-[85%] flex items-start gap-2 px-3.5 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
          <ClipboardCheck size={16} strokeWidth={2.2} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold leading-relaxed whitespace-pre-wrap break-words">{mensaje.texto}</p>
            <p className="text-[10px] font-medium text-amber-700/80 mt-0.5">{horaCorta(mensaje.creado_en)}</p>
          </div>
        </div>
      </div>
    );
  }

  const mio = mensaje.es_mio;
  const conArchivo = mensaje.tipo !== "texto";

  return (
    <div className={`flex ${mio ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-3xl shadow-2xs overflow-hidden ${
          mio
            ? "bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white rounded-br-lg"
            : "bg-white border border-slate-200/90 text-slate-800 rounded-bl-lg"
        } ${conArchivo ? "p-1.5" : "px-3.5 py-2"}`}
      >
        <ContenidoArchivo mensaje={mensaje} />
        {mensaje.texto && (
          <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${conArchivo ? "px-2 pt-1.5" : ""}`}>
            {mensaje.texto}
          </p>
        )}
        <p
          className={`text-[10px] font-medium text-right mt-0.5 ${conArchivo ? "px-2 pb-0.5" : ""} ${
            mio ? "text-white/75" : "text-slate-400"
          }`}
        >
          {horaCorta(mensaje.creado_en)}
        </p>
      </div>
    </div>
  );
}

function ContenidoArchivo({ mensaje }: { mensaje: Mensaje }) {
  if (!mensaje.media_url) return null;

  if (mensaje.tipo === "imagen") {
    return (
      <a href={mensaje.media_url} target="_blank" rel="noreferrer" className="block">
        <img
          src={mensaje.media_url}
          alt="Foto del seguimiento"
          loading="lazy"
          className="rounded-2xl w-64 max-w-full max-h-80 object-cover bg-slate-200"
        />
      </a>
    );
  }

  if (mensaje.tipo === "video") {
    return (
      <video
        src={mensaje.media_url}
        poster={mensaje.media_miniatura_url ?? undefined}
        controls
        playsInline
        preload="none"
        className="rounded-2xl w-64 max-w-full max-h-80 bg-black"
      />
    );
  }

  return <audio src={mensaje.media_url} controls preload="none" className="w-60 max-w-full h-10" />;
}
