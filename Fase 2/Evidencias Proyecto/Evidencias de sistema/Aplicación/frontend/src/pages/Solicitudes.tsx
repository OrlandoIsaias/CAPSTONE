import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { postulacionesRecibidas } from "../api/postulaciones";
import { AvatarIniciales, EstadoPostulacionBadge } from "../components/Badges";
import { PantallaRefugio } from "../components/BarraRefugio";
import { SkeletonFila } from "../components/Skeleton";
import type { EstadoPostulacion, Postulacion } from "../types/postulaciones";

type Filtro = "todas" | EstadoPostulacion;

const FILTROS: { id: Filtro; etiqueta: string }[] = [
  { id: "todas", etiqueta: "Todas" },
  { id: "pendiente", etiqueta: "Pendiente" },
  { id: "aprobada", etiqueta: "Aprobada" },
  { id: "rechazada", etiqueta: "Rechazada" },
];

export default function Solicitudes() {
  const navigate = useNavigate();
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    postulacionesRecibidas()
      .then(setPostulaciones)
      .catch(() => setError("No pudimos cargar las solicitudes."))
      .finally(() => setCargando(false));
  }, []);

  const visibles = useMemo(
    () => (filtro === "todas" ? postulaciones : postulaciones.filter((p) => p.estado === filtro)),
    [postulaciones, filtro]
  );

  return (
    <PantallaRefugio>
      <div className="mb-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-blue-100 text-blue-700 mb-1 border border-blue-200/80 shadow-xs">
          📩 Gestión de adopciones
        </span>
        <h1 className="text-2xl font-bold leading-tight">Solicitudes</h1>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto -mx-5 px-5 pb-1">
        {FILTROS.map((f) => {
          const esActivo = filtro === f.id;
          let estiloActivo = "bg-slate-900 text-white shadow-xs";
          if (f.id === "pendiente") estiloActivo = "bg-orange-500 text-white shadow-xs shadow-orange-500/30";
          if (f.id === "aprobada") estiloActivo = "bg-emerald-600 text-white shadow-xs shadow-emerald-600/30";
          if (f.id === "rechazada") estiloActivo = "bg-rose-600 text-white shadow-xs shadow-rose-600/30";

          return (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                esActivo
                  ? estiloActivo
                  : "bg-slate-100/80 text-slate-700 border border-slate-200/80 hover:bg-slate-200/70"
              }`}
            >
              {f.etiqueta}
            </button>
          );
        })}
      </div>

      {cargando && (
        <div className="space-y-3">
          <SkeletonFila />
          <SkeletonFila />
          <SkeletonFila />
        </div>
      )}
      {error && <p className="text-[var(--color-rojo)] text-sm font-medium">{error}</p>}

      {!cargando && !error && visibles.length === 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center shadow-xs">
          <p className="font-bold text-slate-800">
            {postulaciones.length === 0 ? "Aún no hay solicitudes" : "Nada en este filtro"}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {postulaciones.length === 0
              ? "Cuando alguien postule a una de tus mascotas, la verás acá."
              : "Prueba con otro estado."}
          </p>
        </div>
      )}

      <div className="space-y-3">
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
              className="w-full text-left flex gap-3.5 items-center bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs hover:shadow-sm hover:border-blue-300 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <AvatarIniciales nombre={nombre} />

              <span className="flex-1 min-w-0">
                <span className="block font-bold text-slate-900 truncate">{nombre}</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200/70 px-2 py-0.5 rounded-full mt-0.5 truncate">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-blue-600">
                    <ellipse cx="6" cy="9" rx="1.9" ry="2.6" />
                    <ellipse cx="10.5" cy="5.8" rx="1.9" ry="2.6" />
                    <ellipse cx="15.5" cy="5.8" rx="1.9" ry="2.6" />
                    <ellipse cx="19" cy="9.5" rx="1.9" ry="2.6" />
                    <path d="M12.5 12c2.6 0 4.8 1.9 4.8 4.3 0 2-1.5 3.2-3.4 3.2-1 0-1.3-.4-2.4-.4s-1.4.4-2.4.4c-1.9 0-3.4-1.2-3.4-3.2 0-2.4 2.2-4.3 4.8-4.3Z" />
                  </svg>
                  <span className="truncate">{p.mascota_nombre}</span>
                </span>
                <span className="flex items-center gap-2 mt-1.5">
                  <EstadoPostulacionBadge estado={p.estado} />
                  {pct != null && (
                    <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border shadow-2xs ${estiloScore}`}>
                      🎯 {pct}% compat.
                    </span>
                  )}
                </span>
              </span>

              <span className="text-slate-400 shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </span>
            </button>
          );
        })}
      </div>
    </PantallaRefugio>
  );
}
