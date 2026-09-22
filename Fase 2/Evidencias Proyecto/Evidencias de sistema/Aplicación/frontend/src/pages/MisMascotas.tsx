import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { misMascotas } from "../api/mascotas";
import { postulacionesRecibidas } from "../api/postulaciones";
import { PantallaRefugio } from "../components/BarraRefugio";
import { EstadoMascotaBadge } from "../components/Badges";
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
      <header className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">Mis Mascotas</h1>
        <Link
          to="/mascota/nueva"
          className="shrink-0 bg-[var(--color-primario)] text-white text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-[var(--color-primario-oscuro)] transition-colors"
        >
          + Agregar
        </Link>
      </header>

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
          placeholder="Buscar mascota..."
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

      {!cargando && !error && visibles.length === 0 && (
        <div className="rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] p-6 text-center">
          <p className="font-medium">
            {mascotas.length === 0 ? "Todavía no publicas ninguna mascota" : "Sin resultados"}
          </p>
          <p className="text-sm text-[var(--color-texto-suave)] mt-1">
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
              className="w-full text-left flex gap-3.5 items-center bg-[var(--color-superficie)] rounded-2xl border border-[var(--color-borde)] p-3"
            >
              <span className="w-16 h-16 rounded-xl bg-[var(--color-primario-suave)] shrink-0 overflow-hidden flex items-center justify-center">
                {foto ? (
                  <img src={foto.url} alt={m.nombre} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-[var(--color-primario)]">
                    {m.nombre.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>

              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold truncate">{m.nombre}</span>
                  <EstadoMascotaBadge estado={m.estado} />
                </span>
                <span className="block text-sm text-[var(--color-texto-suave)] truncate">
                  {[m.raza || m.especie, m.edad != null ? `${m.edad} años` : null]
                    .filter(Boolean)
                    .join(" · ") || "Sin datos adicionales"}
                </span>
                {solicitudes > 0 && (
                  <span className="block text-sm font-medium text-[var(--color-primario)] mt-0.5">
                    {solicitudes} {solicitudes === 1 ? "solicitud" : "solicitudes"}
                  </span>
                )}
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
