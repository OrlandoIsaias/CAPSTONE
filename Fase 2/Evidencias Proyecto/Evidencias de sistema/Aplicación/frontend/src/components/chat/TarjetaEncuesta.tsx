import { useState } from "react";
import axios from "axios";
import { ClipboardCheck } from "lucide-react";
import { responderEncuesta } from "../../api/seguimiento";
import { Spinner } from "../Spinner";
import type { ResultadoEncuesta } from "../../types/seguimiento";

const OPCIONES: { valor: ResultadoEncuesta; etiqueta: string }[] = [
  { valor: "exitosa", etiqueta: "Va todo bien" },
  { valor: "en_proceso", etiqueta: "Seguimos adaptándonos" },
  { valor: "devuelta", etiqueta: "Tuve que devolverla" },
];

/** Encuesta de 30 o 90 días dentro del chat. Al responderla, el backend deja
    un aviso en el chat para el refugio; una devolución reabre la ficha de la
    mascota (seguimiento-service). */
export function TarjetaEncuesta({
  postulacionId,
  dias,
  mascotaNombre,
  alResponder,
}: {
  postulacionId: number;
  dias: 30 | 90;
  mascotaNombre: string;
  alResponder: () => void;
}) {
  const [resultado, setResultado] = useState<ResultadoEncuesta | null>(null);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const faltaMotivo = resultado === "devuelta" && !motivo.trim();

  async function enviar() {
    if (!resultado || faltaMotivo) return;
    setEnviando(true);
    setError(null);
    try {
      await responderEncuesta(postulacionId, dias, resultado, resultado === "devuelta" ? motivo.trim() : undefined);
      alResponder();
    } catch (err) {
      const detalle = axios.isAxiosError(err) ? err.response?.data?.detail : null;
      setError(typeof detalle === "string" ? detalle : "No pudimos enviar tu respuesta. Intenta de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <div className="rounded-3xl bg-amber-50 border border-amber-200 p-4 shadow-2xs">
      <div className="flex items-center gap-2 mb-1">
        <ClipboardCheck size={18} strokeWidth={2.2} className="text-amber-700" />
        <p className="font-extrabold text-amber-900 text-sm">Encuesta de {dias} días</p>
      </div>
      <p className="text-xs font-medium text-amber-800 mb-3">
        ¿Cómo le ha ido a {mascotaNombre} en su nuevo hogar? El refugio verá tu respuesta en este chat.
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {OPCIONES.map((o) => (
          <button
            key={o.valor}
            type="button"
            onClick={() => setResultado(o.valor)}
            className={`px-3 py-2 rounded-2xl text-xs font-bold border transition-all active:scale-95 ${
              resultado === o.valor
                ? "bg-amber-600 border-amber-600 text-white shadow-xs"
                : "bg-white border-amber-200 text-amber-900 hover:bg-amber-100"
            }`}
          >
            {o.etiqueta}
          </button>
        ))}
      </div>

      {resultado === "devuelta" && (
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          maxLength={1500}
          rows={3}
          placeholder="Cuéntanos qué pasó. Nos ayuda a mejorar las recomendaciones."
          className="w-full mb-3 px-3 py-2 rounded-2xl border border-amber-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      )}

      {error && <p className="text-xs font-semibold text-rose-700 mb-2">{error}</p>}

      <button
        type="button"
        onClick={enviar}
        disabled={!resultado || faltaMotivo || enviando}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl font-bold text-sm bg-amber-600 text-white disabled:opacity-50 active:scale-[0.98] transition-transform"
      >
        {enviando && <Spinner />}
        Enviar respuesta
      </button>
    </div>
  );
}
