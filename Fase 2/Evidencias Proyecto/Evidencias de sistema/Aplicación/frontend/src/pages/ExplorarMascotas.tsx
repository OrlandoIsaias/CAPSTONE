import { useEffect, useMemo, useState } from "react";
import { listarMascotas } from "../api/mascotas";
import { PantallaAdoptante } from "../components/BarraAdoptante";
import { TarjetaMascota } from "../components/TarjetaMascota";
import { SkeletonFila } from "../components/Skeleton";
import { descripcionCorta } from "../utils/descripcion";
import { useGuardados } from "../utils/guardados";
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

export default function ExplorarMascotas() {
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { ids: guardados, alternar } = useGuardados();

  useEffect(() => {
    listarMascotas("disponible")
      .then(setMascotas)
      .catch(() => setError("No pudimos cargar las mascotas disponibles."))
      .finally(() => setCargando(false));
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
    <PantallaAdoptante>
      {/* Encabezado Principal */}
      <header className="mb-5">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-black text-slate-900 leading-tight">
          Explorar mascotas
        </h1>
        <p className="text-xs font-medium text-slate-500 mt-1">
          Animales rescatados en búsqueda de un hogar responsable.
        </p>
      </header>

      {/* Buscador Moderno */}
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
          placeholder="Busca por nombre, raza o especie…"
          className="w-full rounded-2xl bg-white border border-slate-200/90 pl-11 pr-10 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all"
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

      {!cargando && !error && (
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            {visibles.length} {visibles.length === 1 ? "compañero disponible" : "compañeros disponibles"}
          </p>
          <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200/60">
            Catálogo
          </span>
        </div>
      )}

      {!cargando && !error && visibles.length === 0 && (
        <div className="rounded-3xl bg-white border border-slate-200 p-8 text-center shadow-xs">
          <p className="font-extrabold text-slate-800 text-base">
            {mascotas.length === 0 ? "No hay mascotas publicadas todavía" : "No encontramos coincidencias"}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {mascotas.length === 0
              ? "Pronto los refugios agregarán nuevos animales en adopción."
              : "Prueba escribiendo otro nombre o seleccionando la pestaña 'Todos'."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {visibles.map((m) => {
          const foto = m.fotos.find((f) => f.es_principal) ?? m.fotos[0];
          return (
            <TarjetaMascota
              key={m.id}
              mascotaId={m.id}
              nombre={m.nombre}
              especie={m.especie}
              raza={m.raza}
              edad={m.edad}
              urlFoto={foto?.url}
              descripcion={descripcionCorta(m)}
              guardado={guardados.includes(m.id)}
              onAlternarGuardado={alternar}
            />
          );
        })}
      </div>
    </PantallaAdoptante>
  );
}
