import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { postulacionesRecibidas } from "../api/postulaciones";
import { AvatarIniciales, EstadoPostulacionBadge } from "../components/Badges";
import { PantallaRefugio } from "../components/BarraRefugio";
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
      <h1 className="text-2xl font-bold mb-4">Solicitudes</h1>

      <div className="flex gap-2 mb-5 overflow-x-auto -mx-5 px-5 pb-1">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              filtro === f.id
                ? "bg-[var(--color-primario)] text-white"
                : "bg-[var(--color-superficie-apagada)] text-[var(--color-texto)]"
            }`}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      {cargando && <p className="text-[var(--color-texto-suave)] text-sm">Cargando…</p>}
      {error && <p className="text-[var(--color-rojo)] text-sm">{error}</p>}

      {!cargando && !error && visibles.length === 0 && (
        <div className="rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] p-6 text-center">
          <p className="font-medium">
            {postulaciones.length === 0 ? "Aún no hay solicitudes" : "Nada en este filtro"}
          </p>
          <p className="text-sm text-[var(--color-texto-suave)] mt-1">
            {postulaciones.length === 0
              ? "Cuando alguien postule a una de tus mascotas, la verás acá."
              : "Prueba con otro estado."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {visibles.map((p) => {
          const nombre = p.adoptante_nombre ?? `Adoptante #${p.adoptante_id}`;
          return (
            <button
              key={p.id}
              onClick={() => navigate(`/solicitudes/${p.id}`)}
              className="w-full text-left flex gap-3.5 items-center bg-[var(--color-superficie)] rounded-2xl border border-[var(--color-borde)] p-3.5"
            >
              <AvatarIniciales nombre={nombre} />

              <span className="flex-1 min-w-0">
                <span className="block font-bold truncate">{nombre}</span>
                <span className="flex items-center gap-1.5 text-sm text-[var(--color-primario)] truncate">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                    <ellipse cx="6" cy="9" rx="1.9" ry="2.6" />
                    <ellipse cx="10.5" cy="5.8" rx="1.9" ry="2.6" />
                    <ellipse cx="15.5" cy="5.8" rx="1.9" ry="2.6" />
                    <ellipse cx="19" cy="9.5" rx="1.9" ry="2.6" />
                    <path d="M12.5 12c2.6 0 4.8 1.9 4.8 4.3 0 2-1.5 3.2-3.4 3.2-1 0-1.3-.4-2.4-.4s-1.4.4-2.4.4c-1.9 0-3.4-1.2-3.4-3.2 0-2.4 2.2-4.3 4.8-4.3Z" />
                  </svg>
                  {p.mascota_nombre}
                </span>
                <span className="flex items-center gap-2 mt-1">
                  <EstadoPostulacionBadge estado={p.estado} />
                  {p.score_compatibilidad != null && (
                    <span className="text-sm font-semibold text-[var(--color-primario)]">
                      {Math.round(p.score_compatibilidad * 100)}% compat.
                    </span>
                  )}
                </span>
              </span>

              <span className="text-[var(--color-texto-suave)]/50 shrink-0">
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
