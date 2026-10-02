import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SlidersHorizontal, RotateCcw, X, Check } from "lucide-react";
import { listarMascotas } from "../api/mascotas";
import { obtenerRecomendaciones } from "../api/matching";
import { misPostulaciones } from "../api/postulaciones";
import { PantallaAdoptante } from "../components/BarraAdoptante";
import { Skeleton, SkeletonFila } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import { useGuardados } from "../utils/guardados";
import { formatearEdad } from "../utils/opcionesMascota";
import type { FotoMascota, Mascota } from "../types/mascotas";
import type { Recomendacion } from "../types/matching";
import type { Postulacion } from "../types/postulaciones";

export type FiltroEspecie = "todos" | "perros" | "gatos";
export type FiltroEdad = "todos" | "cachorro" | "joven" | "adulto" | "senior";
export type FiltroTamano = "todos" | "pequeno" | "mediano" | "grande";
export type FiltroSexo = "todos" | "hembra" | "macho";
export type FiltroEspacio = "todos" | "departamento" | "casa_patio";
export type FiltroEnergia = "todos" | "bajo" | "medio" | "alto";

export interface FiltrosAvanzados {
  especie: FiltroEspecie;
  edad: FiltroEdad;
  tamano: FiltroTamano;
  sexo: FiltroSexo;
  espacio: FiltroEspacio;
  conNinos: boolean;
  convivePerros: boolean;
  conviveGatos: boolean;
  energia: FiltroEnergia;
}

/** Cuántas tarjetas se agregan cada vez que el usuario llega al final. */
const MASCOTAS_POR_TANDA = 20;

const FILTROS_INICIALES: FiltrosAvanzados = {
  especie: "todos",
  edad: "todos",
  tamano: "todos",
  sexo: "todos",
  espacio: "todos",
  conNinos: false,
  convivePerros: false,
  conviveGatos: false,
  energia: "todos",
};

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
  excluida,
}: {
  mascota: Mascota;
  guardado: boolean;
  onAlternarGuardado: (id: number) => void;
  score?: number;
  /** No compatible por seguridad con el hogar del adoptante. */
  excluida?: boolean;
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
              loading="lazy"
              decoding="async"
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
              mascota.edad != null ? formatearEdad(mascota.edad) : null,
            ]
              .filter(Boolean)
              .join(" • ") || "Sin detalles"}
          </p>
        </div>
      </div>

      <div className="px-1 pt-2">
        {excluida ? (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-md inline-block text-rose-700 bg-rose-50 border border-rose-200/70">
            No compatible
          </span>
        ) : score != null ? (
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
  const [filtros, setFiltros] = useState<FiltrosAvanzados>(FILTROS_INICIALES);
  const [modalFiltrosAbierto, setModalFiltrosAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [cargandoRecomendaciones, setCargandoRecomendaciones] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgHeroError, setImgHeroError] = useState(false);

  const contenedorGridRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const scrollTopRef = useRef(0);
  const hasMovedRef = useRef(false);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!contenedorGridRef.current) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startYRef.current = e.pageY - contenedorGridRef.current.offsetTop;
    scrollTopRef.current = contenedorGridRef.current.scrollTop;
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !contenedorGridRef.current) return;
    const y = e.pageY - contenedorGridRef.current.offsetTop;
    const walk = (y - startYRef.current) * 1.2;
    if (Math.abs(walk) > 6) {
      hasMovedRef.current = true;
    }
    contenedorGridRef.current.scrollTop = scrollTopRef.current - walk;
  };

  const onMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (hasMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      hasMovedRef.current = false;
    }
  };

  // Las tres consultas van en paralelo y cada una se muestra apenas llega:
  // el listado no espera al matching, que es la más lenta (calcula y guarda
  // la compatibilidad de todas las disponibles). Los % de afinidad aparecen
  // en las tarjetas cuando el matching responde.
  useEffect(() => {
    listarMascotas("disponible")
      .then(setMascotas)
      .catch(() => setError("No pudimos cargar las mascotas disponibles."))
      .finally(() => setCargando(false));
    obtenerRecomendaciones(undefined, { explorar: true })
      .then(setRecomendaciones)
      .catch(() => setRecomendaciones([]))
      .finally(() => setCargandoRecomendaciones(false));
    misPostulaciones()
      .then((lista) => {
        const pendiente = lista.find(
          (p) => p.estado === "pendiente" || p.estado === "aprobada"
        );
        setSolicitudActiva(pendiente || null);
      })
      .catch(() => setSolicitudActiva(null));
  }, []);

  const compatibilidadPorMascota = useMemo(() => {
    const mapa: Record<number, Recomendacion> = {};
    for (const r of recomendaciones) {
      mapa[r.mascota_id] = r;
    }
    return mapa;
  }, [recomendaciones]);

  const filtrosActivosCount = useMemo(() => {
    let count = 0;
    if (filtros.especie !== "todos") count++;
    if (filtros.edad !== "todos") count++;
    if (filtros.tamano !== "todos") count++;
    if (filtros.sexo !== "todos") count++;
    if (filtros.espacio !== "todos") count++;
    if (filtros.conNinos) count++;
    if (filtros.convivePerros) count++;
    if (filtros.conviveGatos) count++;
    if (filtros.energia !== "todos") count++;
    return count;
  }, [filtros]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return mascotas.filter((m) => {
      // 1. Búsqueda por texto
      if (texto) {
        const coincide = [m.nombre, m.especie, m.raza]
          .filter(Boolean)
          .some((campo) => campo!.toLowerCase().includes(texto));
        if (!coincide) return false;
      }

      // 2. Especie
      if (filtros.especie === "perros" && !esPerro(m.especie)) return false;
      if (filtros.especie === "gatos" && !esGato(m.especie)) return false;

      // 3. Edad
      if (filtros.edad === "cachorro" && m.edad > 1) return false;
      if (filtros.edad === "joven" && (m.edad < 1 || m.edad > 3)) return false;
      if (filtros.edad === "adulto" && (m.edad < 4 || m.edad > 7)) return false;
      if (filtros.edad === "senior" && m.edad < 8) return false;

      // 4. Tamaño
      if (filtros.tamano !== "todos" && m.tamano && m.tamano !== filtros.tamano) return false;

      // 5. Sexo
      if (filtros.sexo !== "todos" && m.sexo !== filtros.sexo) return false;

      // 6. Espacio / Vivienda
      if (filtros.espacio === "departamento" && m.espacio_minimo_requerido !== "departamento") return false;
      if (filtros.espacio === "casa_patio" && m.espacio_minimo_requerido === "casa_grande") return false;

      // 7. Convivencia
      if (filtros.conNinos && m.convivencia_ninos === "no") return false;
      if (filtros.convivePerros && m.convive_perros === false) return false;
      if (filtros.conviveGatos && m.convive_gatos === false) return false;

      // 8. Energía
      if (filtros.energia !== "todos" && m.nivel_energia && m.nivel_energia !== filtros.energia) return false;

      return true;
    });
  }, [mascotas, filtros, busqueda]);

  // Mascota destacada del día: adaptada al filtro de especie activo (perros, gatos o todos)
  const destacado = useMemo(() => {
    const candidatos = recomendaciones.filter((r) => {
      if (r.excluida) return false;
      const m = mascotas.find((masc) => masc.id === r.mascota_id);
      if (!m) return false;
      if (filtros.especie === "perros" && !esPerro(m.especie)) return false;
      if (filtros.especie === "gatos" && !esGato(m.especie)) return false;
      return true;
    });

    const mejor = candidatos.find((r) => r.coincide_preferencia) || candidatos[0];
    if (mejor) {
      const encontrada = mascotas.find((m) => m.id === mejor.mascota_id);
      if (encontrada) return encontrada;
    }

    const disponible = visibles.find((m) => !compatibilidadPorMascota[m.id]?.excluida);
    if (disponible) return disponible;

    return visibles[0] || null;
  }, [recomendaciones, mascotas, compatibilidadPorMascota, filtros.especie, visibles]);

  const destacadoScore = destacado ? compatibilidadPorMascota[destacado.id]?.score_compatibilidad : null;
  const fotoDestacada = destacado?.fotos?.find((f: FotoMascota) => f.es_principal) ?? destacado?.fotos?.[0];

  // Scroll infinito dentro del recuadro de la grilla: con cientos de
  // mascotas, dibujar todas las tarjetas (y pedir todas sus fotos) de una vez
  // hace lenta la pantalla. Se muestran de a MASCOTAS_POR_TANDA y se agregan
  // más al acercarse al final del recuadro. La cantidad queda asociada a la
  // búsqueda y los filtros actuales, así al cambiarlos se parte de nuevo
  // desde la primera tanda.
  const claveBusqueda = `${JSON.stringify(filtros)}|${busqueda.trim().toLowerCase()}`;
  const [tandas, setTandas] = useState({ clave: claveBusqueda, cantidad: MASCOTAS_POR_TANDA });
  const cantidadVisible = tandas.clave === claveBusqueda ? tandas.cantidad : MASCOTAS_POR_TANDA;
  const mostradas = visibles.slice(0, cantidadVisible);
  const hayMas = cantidadVisible < visibles.length;
  const centinelaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const centinela = centinelaRef.current;
    if (!centinela || !hayMas) return;
    // Se recrea en cada tanda: si tras agregar mascotas el final sigue a la
    // vista, el observador nuevo carga la siguiente tanda.
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas[0]?.isIntersecting) {
          setTandas({ clave: claveBusqueda, cantidad: cantidadVisible + MASCOTAS_POR_TANDA });
        }
      },
      { root: contenedorGridRef.current, rootMargin: "0px 0px 400px 0px" }
    );
    observador.observe(centinela);
    return () => observador.disconnect();
  }, [hayMas, claveBusqueda, cantidadVisible]);

  // Al cambiar los filtros o la búsqueda, el recuadro vuelve arriba.
  useEffect(() => {
    if (contenedorGridRef.current) contenedorGridRef.current.scrollTop = 0;
  }, [claveBusqueda]);

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
          onClick={() => navigate("/guardados?tab=solicitudes")}
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

      {/* 3. Tarjeta Hero / Destacado del Día (si no hay búsqueda). Espera al
          matching para elegir la mascota más afín y no cambiar de golpe. */}
      {!busqueda && cargandoRecomendaciones && (
        <Skeleton className="w-full h-52 rounded-3xl mb-5" />
      )}
      {!busqueda && !cargandoRecomendaciones && destacado && (
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
                  {[destacado.especie, destacado.raza, destacado.edad != null ? formatearEdad(destacado.edad) : null]
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

      {/* 4. Buscador Moderno y Botón de Filtros */}
      <div className="flex items-center gap-2 mb-3.5">
        <div className="relative flex-1">
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
            className="w-full rounded-2xl bg-white border border-slate-200/90 pl-11 pr-10 py-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all"
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

        {/* Botón Filtros */}
        <button
          onClick={() => setModalFiltrosAbierto(true)}
          className={`flex items-center gap-1.5 px-3.5 py-3 rounded-2xl text-xs font-black shrink-0 transition-all active:scale-95 shadow-2xs border ${
            filtrosActivosCount > 0
              ? "bg-orange-600 text-white border-orange-600 shadow-xs"
              : "bg-white border-slate-200 text-slate-800 hover:border-orange-300"
          }`}
        >
          <SlidersHorizontal size={15} strokeWidth={2.5} />
          <span>Filtros</span>
          {filtrosActivosCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-white text-orange-600 text-[10px] font-black flex items-center justify-center">
              {filtrosActivosCount}
            </span>
          )}
        </button>
      </div>

      {/* Etiquetas de filtros activos si los hay */}
      {filtrosActivosCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-4 px-0.5">
          <span className="text-[11px] font-bold text-slate-400">Filtros:</span>
          {filtros.especie !== "todos" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
              {filtros.especie === "perros" ? "Perros" : "Gatos"}
              <button
                onClick={() => setFiltros((f) => ({ ...f, especie: "todos" }))}
                className="hover:text-orange-950 font-bold ml-0.5"
              >
                ✕
              </button>
            </span>
          )}
          {filtros.edad !== "todos" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
              {filtros.edad.charAt(0).toUpperCase() + filtros.edad.slice(1)}
              <button
                onClick={() => setFiltros((f) => ({ ...f, edad: "todos" }))}
                className="hover:text-orange-950 font-bold ml-0.5"
              >
                ✕
              </button>
            </span>
          )}
          {filtros.tamano !== "todos" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
              {filtros.tamano.charAt(0).toUpperCase() + filtros.tamano.slice(1)}
              <button
                onClick={() => setFiltros((f) => ({ ...f, tamano: "todos" }))}
                className="hover:text-orange-950 font-bold ml-0.5"
              >
                ✕
              </button>
            </span>
          )}
          {filtros.sexo !== "todos" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
              {filtros.sexo.charAt(0).toUpperCase() + filtros.sexo.slice(1)}
              <button
                onClick={() => setFiltros((f) => ({ ...f, sexo: "todos" }))}
                className="hover:text-orange-950 font-bold ml-0.5"
              >
                ✕
              </button>
            </span>
          )}
          {filtros.espacio !== "todos" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
              {filtros.espacio === "departamento" ? "Depto" : "Casa"}
              <button
                onClick={() => setFiltros((f) => ({ ...f, espacio: "todos" }))}
                className="hover:text-orange-950 font-bold ml-0.5"
              >
                ✕
              </button>
            </span>
          )}
          {filtros.conNinos && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
              Con niños
              <button
                onClick={() => setFiltros((f) => ({ ...f, conNinos: false }))}
                className="hover:text-orange-950 font-bold ml-0.5"
              >
                ✕
              </button>
            </span>
          )}
          {filtros.convivePerros && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
              Con perros
              <button
                onClick={() => setFiltros((f) => ({ ...f, convivePerros: false }))}
                className="hover:text-orange-950 font-bold ml-0.5"
              >
                ✕
              </button>
            </span>
          )}
          {filtros.conviveGatos && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
              Con gatos
              <button
                onClick={() => setFiltros((f) => ({ ...f, conviveGatos: false }))}
                className="hover:text-orange-950 font-bold ml-0.5"
              >
                ✕
              </button>
            </span>
          )}
          {filtros.energia !== "todos" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
              Energía {filtros.energia}
              <button
                onClick={() => setFiltros((f) => ({ ...f, energia: "todos" }))}
                className="hover:text-orange-950 font-bold ml-0.5"
              >
                ✕
              </button>
            </span>
          )}
          <button
            onClick={() => setFiltros(FILTROS_INICIALES)}
            className="text-[11px] font-bold text-orange-600 hover:text-orange-800 underline ml-1 active:scale-95"
          >
            Limpiar todo
          </button>
        </div>
      )}

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
                {filtrosActivosCount === 0 && !busqueda ? "Recién Llegados" : "Mascotas encontradas"}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                {visibles.length} {visibles.length === 1 ? "animal disponible" : "animales disponibles"}
              </p>
            </div>
            {visibles.length > 4 ? (
              <span className="text-[10px] font-bold text-slate-500 bg-white/80 border border-slate-200 px-2.5 py-1 rounded-full shadow-2xs">
                Desliza para ver más ↓
              </span>
            ) : (
              <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200/60">
                En adopción
              </span>
            )}
          </div>

          {visibles.length === 0 ? (
            <div className="rounded-3xl bg-white border border-slate-200 p-8 text-center shadow-xs">
              <p className="font-extrabold text-slate-800 text-base">
                No encontramos coincidencias
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto mb-4">
                Prueba relajando algunos filtros para ver más animales en adopción.
              </p>
              <button
                onClick={() => {
                  setBusqueda("");
                  setFiltros(FILTROS_INICIALES);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 hover:bg-orange-100 active:scale-95 transition-all"
              >
                Limpiar todos los filtros
              </button>
            </div>
          ) : (
            <div className="bg-white/75 border border-slate-200/90 rounded-3xl p-2.5 sm:p-3 shadow-xs">
              <div
                ref={contenedorGridRef}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUpOrLeave}
                onMouseLeave={onMouseUpOrLeave}
                onClickCapture={onClickCapture}
                className={`overflow-y-auto overscroll-contain touch-pan-y pr-1 pb-1 scrollbar-suave select-none cursor-grab active:cursor-grabbing rounded-2xl ${
                  visibles.length > 4 ? "max-h-[495px]" : ""
                }`}
              >
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  {mostradas.map((m) => (
                    <TarjetaMascotaGrid
                      key={m.id}
                      mascota={m}
                      guardado={guardados.includes(m.id)}
                      onAlternarGuardado={alternar}
                      score={compatibilidadPorMascota[m.id]?.score_compatibilidad}
                      excluida={compatibilidadPorMascota[m.id]?.excluida}
                    />
                  ))}
                </div>
                {hayMas ? (
                  <div ref={centinelaRef} className="flex justify-center py-4 text-slate-400">
                    <Spinner className="w-5 h-5" />
                  </div>
                ) : (
                  visibles.length > MASCOTAS_POR_TANDA && (
                    <p className="text-center text-[11px] font-medium text-slate-400 py-3">
                      Viste las {visibles.length} mascotas disponibles
                    </p>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. Modal Completo de Filtros Avanzados */}
      {modalFiltrosAbierto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Fondo oscuro */}
          <div
            onClick={() => setModalFiltrosAbierto(false)}
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs animate-[fade-in_0.15s_ease-out]"
          />

          {/* Panel modal */}
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col z-10 animate-[sheet-in_0.2s_ease-out]">
            {/* Cabecera */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-orange-600">
                  <SlidersHorizontal size={16} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                    Filtros de Búsqueda
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {filtrosActivosCount > 0
                      ? `${filtrosActivosCount} ${filtrosActivosCount === 1 ? "filtro activo" : "filtros activos"}`
                      : "Personaliza según tu hogar y estilo de vida"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalFiltrosAbierto(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center active:scale-95 transition-all"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Opciones con scroll */}
            <div className="p-5 overflow-y-auto space-y-5 scrollbar-suave">
              {/* Especie */}
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Especie
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "todos", label: "Todos" },
                    { id: "perros", label: "Perros" },
                    { id: "gatos", label: "Gatos" },
                  ].map((op) => (
                    <button
                      key={op.id}
                      onClick={() =>
                        setFiltros((prev) => ({ ...prev, especie: op.id as FiltroEspecie }))
                      }
                      className={`py-2 px-3 rounded-2xl text-xs font-bold transition-all ${
                        filtros.especie === op.id
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200/70"
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Etapa de vida / Edad */}
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Etapa de Vida / Edad
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "todos", label: "Cualquier edad" },
                    { id: "cachorro", label: "Cachorro (< 1 año)" },
                    { id: "joven", label: "Joven (1 a 3 años)" },
                    { id: "adulto", label: "Adulto (4 a 7 años)" },
                    { id: "senior", label: "Senior (8+ años)" },
                  ].map((op) => (
                    <button
                      key={op.id}
                      onClick={() =>
                        setFiltros((prev) => ({ ...prev, edad: op.id as FiltroEdad }))
                      }
                      className={`py-2 px-3 rounded-2xl text-xs font-bold transition-all text-left ${
                        filtros.edad === op.id
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200/70"
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tamaño */}
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Tamaño Estimado
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "todos", label: "Todos los tamaños" },
                    { id: "pequeno", label: "Pequeño (< 10 kg)" },
                    { id: "mediano", label: "Mediano (10 a 25 kg)" },
                    { id: "grande", label: "Grande (> 25 kg)" },
                  ].map((op) => (
                    <button
                      key={op.id}
                      onClick={() =>
                        setFiltros((prev) => ({ ...prev, tamano: op.id as FiltroTamano }))
                      }
                      className={`py-2 px-3 rounded-2xl text-xs font-bold transition-all text-left ${
                        filtros.tamano === op.id
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200/70"
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sexo */}
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Sexo
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "todos", label: "Ambos" },
                    { id: "hembra", label: "Hembra" },
                    { id: "macho", label: "Macho" },
                  ].map((op) => (
                    <button
                      key={op.id}
                      onClick={() =>
                        setFiltros((prev) => ({ ...prev, sexo: op.id as FiltroSexo }))
                      }
                      className={`py-2 px-3 rounded-2xl text-xs font-bold transition-all ${
                        filtros.sexo === op.id
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200/70"
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Espacio / Vivienda */}
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Vivienda Requerida
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "todos", label: "Cualquier vivienda" },
                    { id: "departamento", label: "Apto departamento" },
                    { id: "casa_patio", label: "Casa con patio" },
                  ].map((op) => (
                    <button
                      key={op.id}
                      onClick={() =>
                        setFiltros((prev) => ({ ...prev, espacio: op.id as FiltroEspacio }))
                      }
                      className={`py-2 px-3 rounded-2xl text-xs font-bold transition-all text-left ${
                        filtros.espacio === op.id
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200/70"
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Convivencia */}
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Convivencia en el Hogar
                </p>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Compatible con niños</p>
                      <p className="text-[11px] text-slate-400">Tolerante y cariñoso en hogares familiares</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={filtros.conNinos}
                      onChange={(e) =>
                        setFiltros((prev) => ({ ...prev, conNinos: e.target.checked }))
                      }
                      className="w-5 h-5 rounded-lg text-orange-600 focus:ring-orange-500 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Convive con otros perros</p>
                      <p className="text-[11px] text-slate-400">Socializado para compartir con canes</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={filtros.convivePerros}
                      onChange={(e) =>
                        setFiltros((prev) => ({ ...prev, convivePerros: e.target.checked }))
                      }
                      className="w-5 h-5 rounded-lg text-orange-600 focus:ring-orange-500 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Convive con gatos</p>
                      <p className="text-[11px] text-slate-400">Apto para hogares con felinos</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={filtros.conviveGatos}
                      onChange={(e) =>
                        setFiltros((prev) => ({ ...prev, conviveGatos: e.target.checked }))
                      }
                      className="w-5 h-5 rounded-lg text-orange-600 focus:ring-orange-500 rounded"
                    />
                  </label>
                </div>
              </div>

              {/* Nivel de Energía */}
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Nivel de Energía
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "todos", label: "Todos" },
                    { id: "bajo", label: "Baja" },
                    { id: "medio", label: "Media" },
                    { id: "alto", label: "Alta" },
                  ].map((op) => (
                    <button
                      key={op.id}
                      onClick={() =>
                        setFiltros((prev) => ({ ...prev, energia: op.id as FiltroEnergia }))
                      }
                      className={`py-2 px-2 text-center rounded-2xl text-xs font-bold transition-all ${
                        filtros.energia === op.id
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200/70"
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pie del modal */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 rounded-b-3xl flex items-center gap-3 shrink-0">
              {filtrosActivosCount > 0 && (
                <button
                  onClick={() => setFiltros(FILTROS_INICIALES)}
                  className="px-4 py-3 rounded-2xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
                >
                  <RotateCcw size={14} />
                  Limpiar
                </button>
              )}
              <button
                onClick={() => setModalFiltrosAbierto(false)}
                className="flex-1 py-3 px-5 rounded-2xl font-black text-xs text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-sm hover:shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <Check size={16} strokeWidth={2.5} />
                Mostrar {visibles.length} {visibles.length === 1 ? "mascota" : "mascotas"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PantallaAdoptante>
  );
}
