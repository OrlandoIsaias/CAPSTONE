import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { detallePostulacion, postulacionesRecibidas } from "../api/postulaciones";
import { AvatarIniciales } from "../components/Badges";
import { PantallaRefugio } from "../components/BarraRefugio";
import { CargandoVista } from "../components/Spinner";
import type { PostulacionDetalle } from "../types/postulaciones";

const ESPACIO: Record<string, string> = {
  departamento: "Departamento",
  casa_patio: "Casa con patio",
  casa_grande: "Casa grande",
};

const EXPERIENCIA: Record<string, string> = {
  ninguna: "Sin experiencia",
  basica: "Experiencia básica",
  alta: "Mucha experiencia",
};

export default function Cuestionarios() {
  const navigate = useNavigate();
  const [fichas, setFichas] = useState<PostulacionDetalle[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // AbortController: acá importa más que en otras vistas — sin cancelar,
    // StrictMode no solo duplica postulacionesRecibidas, sino también TODA
    // la cascada de detallePostulacion que sigue (una por cada adoptante).
    const controlador = new AbortController();

    postulacionesRecibidas(controlador.signal)
      .then(async (lista) => {
        const porAdoptante = new Map<number, number>();
        for (const p of lista) {
          if (!porAdoptante.has(p.adoptante_id)) porAdoptante.set(p.adoptante_id, p.id);
        }
        const detalles = await Promise.all(
          [...porAdoptante.values()].map((id) =>
            detallePostulacion(id, controlador.signal).catch(() => null)
          )
        );
        if (!controlador.signal.aborted) {
          setFichas(detalles.filter((d): d is PostulacionDetalle => d !== null));
        }
      })
      .catch((err) => {
        if (!axios.isCancel(err)) setError("No pudimos cargar los cuestionarios.");
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false);
      });

    return () => controlador.abort();
  }, []);

  return (
    <PantallaRefugio>
      <header className="mb-5">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-black text-slate-900 leading-tight">
          Cuestionarios de Adoptantes
        </h1>
        <p className="text-xs font-medium text-slate-500 mt-1">
          Estilo de vida y rutinas declaradas por cada postulante para tus mascotas.
        </p>
      </header>

      {cargando && <CargandoVista mensaje="Cargando cuestionarios…" />}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium mb-4">
          {error}
        </div>
      )}

      {!cargando && !error && (
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            {fichas.length} {fichas.length === 1 ? "cuestionario disponible" : "cuestionarios disponibles"}
          </p>
          <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60">
            Perfiles
          </span>
        </div>
      )}

      {!cargando && !error && fichas.length === 0 && (
        <div className="rounded-3xl bg-white border border-slate-200/90 p-8 text-center shadow-xs">
          <h2 className="font-extrabold text-slate-800 text-base mb-1">
            Todavía no hay cuestionarios recibidos
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Aparecerán automáticamente aquí a medida que los adoptantes postulen a tus animales.
          </p>
        </div>
      )}

      <div className="space-y-3.5">
        {fichas.map((f) => {
          const nombre = f.adoptante_nombre ?? `Adoptante #${f.adoptante_id}`;

          return (
            <button
              key={f.id}
              onClick={() => navigate(`/solicitudes/${f.id}`)}
              className="w-full text-left bg-white rounded-3xl border border-slate-200/90 p-4.5 shadow-xs hover:shadow-md hover:border-purple-300 active:scale-[0.99] transition-all group"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <AvatarIniciales nombre={nombre} />
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-900 text-base truncate group-hover:text-purple-700 transition-colors">
                      {nombre}
                    </p>
                    <p className="text-xs font-semibold text-purple-600 truncate">
                      Postuló por {f.mascota_nombre}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-200/60 shrink-0">
                  Ver Ficha →
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                {f.espacio_disponible && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    {ESPACIO[f.espacio_disponible]}
                  </span>
                )}
                {f.tiempo_disponible_horas_dia != null && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/60">
                    {f.tiempo_disponible_horas_dia}h/día
                  </span>
                )}
                {f.experiencia_previa && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/60">
                    {EXPERIENCIA[f.experiencia_previa]}
                  </span>
                )}
                {f.tiene_ninos && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60">
                    Con niños
                  </span>
                )}
                {f.otras_mascotas && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/60">
                    Otras mascotas
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </PantallaRefugio>
  );
}
