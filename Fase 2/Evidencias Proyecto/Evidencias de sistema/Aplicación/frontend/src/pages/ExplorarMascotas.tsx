import { useEffect, useMemo, useState } from "react";
import { listarMascotas } from "../api/mascotas";
import { PantallaAdoptante } from "../components/BarraAdoptante";
import { TarjetaMascota } from "../components/TarjetaMascota";
import { descripcionCorta } from "../utils/descripcion";
import { useGuardados } from "../utils/guardados";
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

export default function ExplorarMascotas() {
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { ids: guardados, alternar } = useGuardados();

  useEffect(() => {
    // Solo tiene sentido explorar mascotas que todavía se pueden postular.
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
      <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--color-primario)] uppercase mb-1">
        Encuentra a tu compañero
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-3xl mb-4">Explora mascotas</h1>

      <div className="relative mb-4">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-texto-suave)]">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Busca por nombre o raza"
          className="w-full rounded-full bg-[var(--color-superficie-apagada)] pl-11 pr-4 py-3 text-sm placeholder:text-[var(--color-texto-suave)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/40"
        />
      </div>

      <div className="flex gap-2 mb-5">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
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

      {!cargando && !error && (
        <p className="text-sm font-semibold mb-3">
          {visibles.length} {visibles.length === 1 ? "mascota" : "mascotas"} para conocer
        </p>
      )}

      {!cargando && !error && visibles.length === 0 && (
        <div className="rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] p-6 text-center">
          <p className="font-medium">
            {mascotas.length === 0 ? "Todavía no hay mascotas disponibles" : "Sin resultados"}
          </p>
          <p className="text-sm text-[var(--color-texto-suave)] mt-1">
            {mascotas.length === 0
              ? "Vuelve a revisar más tarde."
              : "Prueba con otro nombre o cambia el filtro."}
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
