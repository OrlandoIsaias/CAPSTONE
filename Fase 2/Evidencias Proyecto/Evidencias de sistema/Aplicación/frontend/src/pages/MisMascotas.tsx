import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { misMascotas } from "../api/mascotas";
import { postulacionesRecibidas } from "../api/postulaciones";
import { PantallaRefugio } from "../components/BarraRefugio";
import { EstadoMascotaBadge } from "../components/Badges";
import { SkeletonFila } from "../components/Skeleton";
import type { Mascota } from "../types/mascotas";

type Filtro = "todos" | "perros" | "gatos";

const FILTROS: { id: Filtro; etiqueta: string }[] = [
  { id: "todos", etiqueta: "Todos" },
  { id: "perros", etiqueta: "Perros" },
  { id: "gatos", etiqueta: "Gatos" },
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-700 mb-1 border border-emerald-200/80 shadow-xs">
            🐾 Catálogo
          </span>
          <h1 className="text-2xl font-bold leading-tight">Mis Mascotas</h1>
        </div>
        <Link
          to="/mascota/nueva"
          className="shrink-0 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-xs active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          + Agregar
        </Link>
      </header>

      <div className="relative mb-4">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/70">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar mascota por nombre o raza..."
          className="w-full rounded-2xl bg-slate-100/80 border border-slate-200/80 pl-11 pr-4 py-3 text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 transition-all"
        />
      </div>

      <div className="flex gap-2 mb-5">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
              filtro === f.id
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs"
                : "bg-emerald-50/70 text-emerald-900 border border-emerald-200/60 hover:bg-emerald-100/70"
            }`}
          >
            {f.etiqueta}
          </button>
        ))}
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
            {mascotas.length === 0 ? "Todavía no publicas ninguna mascota" : "Sin resultados"}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {mascotas.length === 0
              ? "Publica la primera para que empiece a recibir solicitudes."
              : "Prueba con otro nombre o cambia el filtro."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {visibles.map((m) => {
          const solicitudes = conteoSolicitudes[m.id] ?? 0;
          const foto = m.fotos.find((f) => f.es_principal) ?? m.fotos[0];
          return (
            <button
              key={m.id}
              onClick={() => navigate(`/mis-mascotas/${m.id}`)}
              className="w-full text-left flex gap-3.5 items-center bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs hover:shadow-sm hover:border-emerald-300 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              <span className="w-16 h-16 rounded-xl bg-emerald-100/80 shrink-0 overflow-hidden flex items-center justify-center border border-emerald-200/60">
                {foto ? (
                  <img src={foto.url} alt={m.nombre} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-black text-emerald-700">
                    {m.nombre.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>

              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-slate-900 truncate">{m.nombre}</span>
                  <EstadoMascotaBadge estado={m.estado} />
                </span>
                <span className="block text-sm text-slate-500 truncate">
                  {[m.raza || m.especie, m.edad != null ? `${m.edad} años` : null]
                    .filter(Boolean)
                    .join(" · ") || "Sin datos adicionales"}
                </span>
                {solicitudes > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 bg-orange-100 border border-orange-200/80 px-2.5 py-0.5 rounded-full mt-1.5 shadow-xs">
                    <span>📩</span> {solicitudes} {solicitudes === 1 ? "solicitud pendiente" : "solicitudes pendientes"}
                  </span>
                )}
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
