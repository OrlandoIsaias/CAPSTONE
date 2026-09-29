import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { misMascotas } from "../api/mascotas";
import { postulacionesRecibidas } from "../api/postulaciones";
import { PantallaRefugio } from "../components/BarraRefugio";
import { EstadoMascotaBadge } from "../components/Badges";
import { SkeletonFila } from "../components/Skeleton";
import type { Mascota } from "../types/mascotas";

type Filtro = "todos" | "perros" | "gatos";

const FILTROS: { id: Filtro; etiqueta: string; color: string }[] = [
  { id: "todos", etiqueta: "Todos", color: "from-slate-800 to-slate-900" },
  { id: "perros", etiqueta: "Perros", color: "from-orange-500 to-amber-500" },
  { id: "gatos", etiqueta: "Gatos", color: "from-emerald-600 to-teal-600" },
];

function esPerro(especie?: string) {
  return (especie ?? "").toLowerCase().includes("perr");
}

function esGato(especie?: string) {
  return (especie ?? "").toLowerCase().includes("gat");
}

export default function MisMascotas() {
  const navigate = useNavigate();
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [conteoSolicitudes, setConteoSolicitudes] = useState<Record<number, number>>({});
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      misMascotas()
        .then(setMascotas)
        .catch(() => setError("No pudimos cargar tus mascotas.")),
      postulacionesRecibidas()
        .then((lista) => {
          const conteo: Record<number, number> = {};
          for (const p of lista) {
            if (p.estado === "pendiente") {
              conteo[p.mascota_id] = (conteo[p.mascota_id] ?? 0) + 1;
            }
          }
          setConteoSolicitudes(conteo);
        })
        .catch(() => setConteoSolicitudes({})),
    ]).finally(() => setCargando(false));
  }, []);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return mascotas.filter((m) => {
      if (filtro === "perros" && !esPerro(m.especie)) return false;
      if (filtro === "gatos" && !esGato(m.especie)) return false;
      if (!texto) return true;
      return [m.nombre, m.especie, m.raza]
        .filter(Boolean)
        .some((campo) => campo!.toLowerCase().includes(texto));
    });
  }, [mascotas, filtro, busqueda]);

  return (
    <PantallaRefugio>
      <header className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-black text-slate-900 leading-tight">
            Mis Mascotas
          </h1>
        </div>
        <Link
          to="/mascota/nueva"
          className="shrink-0 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black px-4 py-2.5 rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all"
        >
          + Publicar
        </Link>
      </header>

      {/* Buscador */}
      <div className="relative mb-4">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar mascota por nombre o raza…"
          className="w-full rounded-2xl bg-white border border-slate-200/90 pl-11 pr-10 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
        />
        {busqueda && (
          <button
            onClick={() => setBusqueda("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-100 w-5 h-5 rounded-full flex items-center justify-center"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filtros por Categoría */}
      <div className="flex gap-2.5 mb-5 overflow-x-auto pb-1">
        {FILTROS.map((f) => {
          const activo = filtro === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-2xs ${
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

      {cargando && (
        <div className="space-y-3">
          <SkeletonFila />
          <SkeletonFila />
          <SkeletonFila />
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium mb-4">
          {error}
        </div>
      )}

      {!cargando && !error && visibles.length === 0 && (
        <div className="rounded-3xl bg-white border border-slate-200 p-8 text-center shadow-xs">
          <p className="font-extrabold text-slate-800 text-base">
            {mascotas.length === 0 ? "Todavía no publicas ninguna mascota" : "Sin resultados"}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {mascotas.length === 0
              ? "Publica la primera para que empiece a recibir solicitudes de adoptantes."
              : "Prueba con otro término de búsqueda."}
          </p>
        </div>
      )}

      <div className="space-y-3.5">
        {visibles.map((m) => {
          const solicitudes = conteoSolicitudes[m.id] ?? 0;
          const foto = m.fotos.find((f) => f.es_principal) ?? m.fotos[0];

          return (
            <button
              key={m.id}
              onClick={() => navigate(`/mis-mascotas/${m.id}`)}
              className="w-full text-left flex gap-3.5 items-center bg-white rounded-3xl border border-slate-200/90 p-3.5 shadow-xs hover:shadow-md hover:border-emerald-300 active:scale-[0.99] transition-all group"
            >
              {/* Marco fotográfico limpio */}
              <div className="relative w-22 h-22 rounded-2xl overflow-hidden shadow-2xs border-2 border-white ring-2 ring-emerald-300/80 bg-slate-100 shrink-0 flex items-center justify-center">
                {foto ? (
                  <img
                    src={foto.url}
                    alt={m.nombre}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-200 text-emerald-700">
                    <span className="font-[family-name:var(--font-display)] text-2xl font-black">
                      {m.nombre.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800/80">Sin foto</span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <p className="font-[family-name:var(--font-display)] text-lg font-extrabold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                      {m.nombre}
                    </p>
                  </div>
                  <EstadoMascotaBadge estado={m.estado} />
                </div>

                <p className="text-xs font-semibold text-slate-500 truncate">
                  {[m.raza || m.especie, m.edad != null ? `${m.edad} ${m.edad === 1 ? "año" : "años"}` : null]
                    .filter(Boolean)
                    .join(" • ") || "Sin datos adicionales"}
                </p>

                {solicitudes > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-orange-700 bg-orange-100 border border-orange-200/80 px-2.5 py-0.5 rounded-full mt-1.5 shadow-2xs">
                    {solicitudes} {solicitudes === 1 ? "solicitud pendiente" : "solicitudes pendientes"}
                  </span>
                )}
              </div>

              <span className="text-slate-300 group-hover:text-slate-600 shrink-0 pr-1 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </span>
            </button>
          );
        })}
      </div>
    </PantallaRefugio>
  );
}
