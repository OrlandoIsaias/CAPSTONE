import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ChevronRight } from "lucide-react";
import { postulacionesRecibidas } from "../api/postulaciones";
import { AvatarIniciales, EstadoPostulacionBadge } from "../components/Badges";
import { PantallaRefugio } from "../components/BarraRefugio";
import { CargandoVista } from "../components/Spinner";
import type { EstadoPostulacion, Postulacion } from "../types/postulaciones";

type Filtro = "todas" | EstadoPostulacion;

const FILTROS: { id: Filtro; etiqueta: string; color: string }[] = [
  { id: "todas", etiqueta: "Todas", color: "from-slate-800 to-slate-900" },
  { id: "pendiente", etiqueta: "Pendientes", color: "from-orange-500 to-amber-500" },
  { id: "aprobada", etiqueta: "Aprobadas", color: "from-emerald-600 to-teal-600" },
  { id: "rechazada", etiqueta: "Rechazadas", color: "from-rose-600 to-red-600" },
];

export default function Solicitudes() {
  const navigate = useNavigate();
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controlador = new AbortController();

    postulacionesRecibidas(controlador.signal)
      .then(setPostulaciones)
      .catch((err) => {
        if (!axios.isCancel(err)) setError("No pudimos cargar las solicitudes.");
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false);
      });

    return () => controlador.abort();
  }, []);

  const visibles = useMemo(
    () => (filtro === "todas" ? postulaciones : postulaciones.filter((p) => p.estado === filtro)),
    [postulaciones, filtro]
  );

  return (
    <PantallaRefugio>
      <header className="mb-5">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-black text-slate-900 leading-tight">
          Solicitudes Recibidas
        </h1>
        <p className="text-xs font-medium text-slate-500 mt-1">
          Revisa y evalúa a las personas interesadas en tus animales en adopción.
        </p>
      </header>

      {/* Filtros por Estado */}
      <div className="flex gap-2.5 mb-5 overflow-x-auto pb-1">
        {FILTROS.map((f) => {
          const activo = filtro === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 shadow-2xs ${
                activo
                  ? `bg-gradient-to-r ${f.color} text-white shadow-xs`
                  : "bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>{f.etiqueta}</span>
            </button>
          );
        })}
      </div>

      {cargando && <CargandoVista mensaje="Cargando solicitudes…" />}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium mb-4">
          {error}
        </div>
      )}

      {!cargando && !error && (
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            {visibles.length} {visibles.length === 1 ? "solicitud encontrada" : "solicitudes encontradas"}
          </p>
          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
            Bandeja
          </span>
        </div>
      )}

      {!cargando && !error && visibles.length === 0 && (
        <div className="rounded-3xl bg-white border border-slate-200 p-8 text-center shadow-xs">
          <p className="font-extrabold text-slate-800 text-base">
            {postulaciones.length === 0 ? "Aún no hay solicitudes recibidas" : "Sin resultados para este filtro"}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {postulaciones.length === 0
              ? "Cuando los adoptantes postulen a tus mascotas, aparecerán en este listado."
              : "Prueba seleccionando otra pestaña de estado."}
          </p>
        </div>
      )}

      <div className="space-y-3.5">
        {visibles.map((p) => {
          const nombre = p.adoptante_nombre ?? `Adoptante #${p.adoptante_id}`;
          const pct = p.score_compatibilidad != null ? Math.round(p.score_compatibilidad * 100) : null;

          let estiloScore = "bg-slate-100 text-slate-700 border-slate-200";
          if (pct != null && pct >= 80) estiloScore = "bg-emerald-100 text-emerald-800 border-emerald-300/80";
          else if (pct != null && pct >= 50) estiloScore = "bg-amber-100 text-amber-900 border-amber-300/80";

          return (
            <button
              key={p.id}
              onClick={() => navigate(`/solicitudes/${p.id}`)}
              className="w-full text-left flex gap-3.5 items-center bg-white rounded-3xl border border-slate-200/90 p-4 shadow-xs hover:shadow-md hover:border-blue-300 active:scale-[0.99] transition-all group"
            >
              <AvatarIniciales nombre={nombre} />

              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="font-extrabold text-slate-900 text-base truncate group-hover:text-blue-700 transition-colors">
                    {nombre}
                  </p>
                  <EstadoPostulacionBadge estado={p.estado} />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200/70 px-2.5 py-0.5 rounded-full truncate">
                    <span className="truncate">{p.mascota_nombre}</span>
                  </span>
                  {pct != null && (
                    <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-2xs ${estiloScore}`}>
                      {pct}% compat.
                    </span>
                  )}
                </div>
              </div>

              <span className="text-slate-300 group-hover:text-slate-600 shrink-0 pr-1 transition-colors">
                <ChevronRight size={18} strokeWidth={2.5} />
              </span>
            </button>
          );
        })}
      </div>
    </PantallaRefugio>
  );
}
