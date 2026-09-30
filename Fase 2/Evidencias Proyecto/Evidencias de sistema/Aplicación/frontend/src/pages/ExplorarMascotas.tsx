import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listarMascotas } from "../api/mascotas";
import { obtenerRecomendaciones } from "../api/matching";
import { misPostulaciones } from "../api/postulaciones";
import { PantallaAdoptante } from "../components/BarraAdoptante";
import { SkeletonFila } from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import { useGuardados } from "../utils/guardados";
import type { FotoMascota, Mascota } from "../types/mascotas";
import type { Recomendacion } from "../types/matching";
import type { Postulacion } from "../types/postulaciones";

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

/** Tarjeta compacta para la cuadrícula moderna de 2 columnas */
function TarjetaMascotaGrid({
  mascota,
  guardado,
  onAlternarGuardado,
  score,
}: {
  mascota: Mascota;
  guardado: boolean;
  onAlternarGuardado: (id: number) => void;
  score?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const foto = mascota.fotos?.find((f) => f.es_principal) ?? mascota.fotos?.[0];

  return (
    <Link
      to={`/mascota/${mascota.id}`}
      className="bg-white rounded-3xl border border-slate-200/90 p-2.5 shadow-xs hover:shadow-md hover:border-orange-300 transition-all flex flex-col justify-between group active:scale-[0.98]"
    >
      <div>
        <div className="relative w-full h-36 rounded-2xl overflow-hidden mb-2 bg-slate-100 flex items-center justify-center">
          {foto?.url && !imgError ? (
            <img
              src={foto.url}
              alt={mascota.nombre}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-200 flex items-center justify-center text-orange-600 font-[family-name:var(--font-display)] text-3xl font-black">
              {mascota.nombre.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Botón Favorito flotante */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAlternarGuardado(mascota.id);
            }}
            aria-label={guardado ? "Quitar de guardados" : "Guardar mascota"}
            className={`absolute top-2 right-2 w-7 h-7 rounded-full backdrop-blur-md flex items-center justify-center shadow-xs transition-transform active:scale-90 ${
              guardado
                ? "bg-rose-500 text-white"
                : "bg-white/90 text-slate-400 hover:text-rose-500"
            }`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={guardado ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20.2s-7.8-4.7-9.9-9.3C.6 7.5 2.3 4.2 5.6 3.6c1.9-.4 3.8.4 4.9 2 .3.4.8.4 1 0 1.1-1.6 3-2.4 4.9-2 3.3.6 5 3.9 3.5 7.3-2.1 4.6-9.9 9.3-9.9 9.3Z" />
            </svg>
          </button>
        </div>

        <div className="px-1">
          <h4 className="font-[family-name:var(--font-display)] font-black text-sm text-slate-900 truncate group-hover:text-orange-600 transition-colors">
            {mascota.nombre}
          </h4>
          <p className="text-[11px] font-semibold text-slate-400 truncate mt-0.5">
            {[
              mascota.raza || mascota.especie,
              mascota.edad != null ? `${mascota.edad} ${mascota.edad === 1 ? "año" : "años"}` : null,
            ]
              .filter(Boolean)
              .join(" • ") || "Sin detalles"}
          </p>
        </div>
      </div>

      <div className="px-1 pt-2">
        {score != null ? (
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded-md inline-block ${
              score >= 0.8
                ? "text-emerald-700 bg-emerald-50 border border-emerald-200/70"
                : score >= 0.5
                ? "text-amber-700 bg-amber-50 border border-amber-200/70"
                : "text-slate-600 bg-slate-100"
            }`}
          >
            {Math.round(score * 100)}% afinidad
          </span>
        ) : (
          <span className="text-[10px] font-bold text-slate-400">Disponible</span>
        )}
      </div>
    </Link>
  );
}

export default function ExplorarMascotas() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { ids: guardados, alternar } = useGuardados();

  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [recomendaciones, setRecomendaciones] = useState<Recomendacion[]>([]);
  const [solicitudActiva, setSolicitudActiva] = useState<Postulacion | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgHeroError, setImgHeroError] = useState(false);

  useEffect(() => {
    Promise.all([
      listarMascotas("disponible")
        .then(setMascotas)
        .catch(() => setError("No pudimos cargar las mascotas disponibles.")),
      obtenerRecomendaciones()
        .then(setRecomendaciones)
        .catch(() => setRecomendaciones([])),
      misPostulaciones()
        .then((lista) => {
          const pendiente = lista.find(
            (p) => p.estado === "pendiente" || p.estado === "aprobada"
          );
          setSolicitudActiva(pendiente || null);
        })
        .catch(() => setSolicitudActiva(null)),
    ]).finally(() => setCargando(false));
  }, []);

  const scoresMap = useMemo(() => {
    const mapa: Record<number, number> = {};
    for (const r of recomendaciones) {
      mapa[r.mascota_id] = r.score_compatibilidad;
    }
    return mapa;
  }, [recomendaciones]);

  // Mascota destacada del día
  const destacado = useMemo(() => {
    if (recomendaciones.length > 0) {
      const encontrada = mascotas.find((m) => m.id === recomendaciones[0].mascota_id);
      if (encontrada) return encontrada;
    }
    return mascotas[0] || null;
  }, [recomendaciones, mascotas]);

  const destacadoScore = destacado ? scoresMap[destacado.id] : null;

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

  const fotoDestacada = destacado?.fotos?.find((f: FotoMascota) => f.es_principal) ?? destacado?.fotos?.[0];

  return (
    <PantallaAdoptante>
      {/* 1. Encabezado con Saludo Personalizado */}
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
            ¡Hola, {usuario?.nombre?.split(" ")[0] || "Adoptante"}!
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Encuentra al compañero ideal para tu hogar.
          </p>
        </div>

        <Link
          to="/perfil-adoptante"
          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-[family-name:var(--font-display)] text-xl font-black flex items-center justify-center shadow-md border-2 border-white ring-2 ring-indigo-200 shrink-0 hover:scale-105 active:scale-95 transition-all"
          title="Ver mi perfil"
        >
          {usuario?.nombre?.charAt(0).toUpperCase() || "U"}
        </Link>
      </header>

      {/* 2. Banner de Notificación / Solicitud Activa (si existe) */}
      {solicitudActiva && (
        <div
          onClick={() => navigate("/guardados")}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-3.5 text-white shadow-md mb-4 flex items-center justify-between gap-3 cursor-pointer hover:shadow-lg active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                Postulación en curso
              </p>
              <p className="text-xs font-black truncate">
                {solicitudActiva.estado === "aprobada"
                  ? "¡Tu postulación fue aprobada!"
                  : "Tu solicitud está siendo revisada por el refugio"}
              </p>
            </div>
          </div>
          <span className="text-xs font-black bg-white text-emerald-700 px-3 py-1.5 rounded-xl shadow-xs shrink-0">
            Ver estado
          </span>
        </div>
      )}

      {/* 3. Tarjeta Hero / Destacado del Día (si no hay búsqueda) */}
      {!busqueda && filtro === "todos" && destacado && (
        <div className="mb-5">
          <div
            onClick={() => navigate(`/mascota/${destacado.id}`)}
            className="relative rounded-3xl overflow-hidden shadow-md hover:shadow-xl border-2 border-white ring-2 ring-orange-200/80 group cursor-pointer transition-all"
          >
            <div className="w-full h-52 bg-slate-900 overflow-hidden relative flex items-center justify-center">
              {fotoDestacada?.url && !imgHeroError ? (
                <img
                  src={fotoDestacada.url}
                  alt={destacado.nombre}
                  onError={() => setImgHeroError(true)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-500 to-amber-600 flex flex-col items-center justify-center text-white p-4 text-center">
                  <span className="font-[family-name:var(--font-display)] text-6xl font-black mb-1">
                    {destacado.nombre.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                    {destacado.especie || "Mascota"} en adopción
                  </span>
                </div>
              )}
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent flex flex-col justify-between p-4 text-white">
              {/* Tag Superior */}
              <div className="flex justify-between items-start">
                <span className="bg-orange-500 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                  Destacado del Día
                </span>
                {destacadoScore != null && (
                  <span className="bg-emerald-500 text-white font-black text-xs px-2.5 py-1 rounded-full shadow-md">
                    {Math.round(destacadoScore * 100)}% afinidad
                  </span>
                )}
              </div>

              {/* Info Inferior */}
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-2xl font-black leading-tight text-white drop-shadow-xs">
                  {destacado.nombre}
                </h3>
                <p className="text-xs text-slate-200 font-medium">
                  {[destacado.especie, destacado.raza, destacado.edad != null ? `${destacado.edad} ${destacado.edad === 1 ? "año" : "años"}` : null]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-300">
                    {destacado.espacio_minimo_requerido === "departamento" ? "Ideal para depto" : "Casa con patio"}
                  </span>
                  <span className="text-xs font-black bg-white text-slate-900 px-3.5 py-1.5 rounded-xl shadow-xs group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    Conocer a {destacado.nombre} →
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Buscador Moderno (Ubicado justo arriba de las categorías) */}
      <div className="relative mb-3.5">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, raza o especie..."
          className="w-full rounded-2xl bg-white border border-slate-200/90 pl-11 pr-10 py-3.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all"
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

      {/* 5. Categorías (Todos, Perros, Gatos) */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2 px-0.5">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Categorías
          </h2>
          {filtro !== "todos" && (
            <button
              onClick={() => setFiltro("todos")}
              className="text-[11px] font-bold text-orange-600 hover:text-orange-800"
            >
              Restablecer
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {FILTROS.map((f) => {
            const activo = filtro === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`flex items-center px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all active:scale-95 shadow-2xs ${
                  activo
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white border border-slate-200/90 text-slate-700 hover:border-orange-300 hover:bg-slate-50"
                }`}
              >
                <span>{f.etiqueta}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Estados de carga */}
      {cargando && (
        <div className="space-y-3">
          <SkeletonFila />
          <SkeletonFila />
          <SkeletonFila />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium mb-4">
          {error}
        </div>
      )}

      {/* 6. Sección: Recién Llegados / Grid de Mascotas */}
      {!cargando && !error && (
        <div>
          <div className="flex items-center justify-between mb-3 px-0.5">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-black text-slate-900">
                {filtro === "todos" && !busqueda ? "Recién Llegados" : "Mascotas encontradas"}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                {visibles.length} {visibles.length === 1 ? "animal disponible" : "animales disponibles"}
              </p>
            </div>
            <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200/60">
              En adopción
            </span>
          </div>

          {visibles.length === 0 ? (
            <div className="rounded-3xl bg-white border border-slate-200 p-8 text-center shadow-xs">
              <p className="font-extrabold text-slate-800 text-base">
                No encontramos coincidencias
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Prueba con otra categoría o término de búsqueda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-6">
              {visibles.map((m) => (
                <TarjetaMascotaGrid
                  key={m.id}
                  mascota={m}
                  guardado={guardados.includes(m.id)}
                  onAlternarGuardado={alternar}
                  score={scoresMap[m.id]}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </PantallaAdoptante>
  );
}
