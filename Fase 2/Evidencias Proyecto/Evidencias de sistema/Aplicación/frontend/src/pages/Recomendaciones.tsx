import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, LayoutList } from "lucide-react";
import { obtenerRecomendaciones } from "../api/matching";
import { PantallaAdoptante } from "../components/BarraAdoptante";
import { TarjetaMascota } from "../components/TarjetaMascota";
import { SwipeDeckMascotas } from "../components/SwipeDeckMascotas";
import { CargandoVista } from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import { descripcionCorta } from "../utils/descripcion";
import { useGuardados } from "../utils/guardados";
import type { Recomendacion } from "../types/matching";
import axios from "axios";

export default function Recomendaciones() {
  const { usuario } = useAuth();
  const { ids: guardados, alternar } = useGuardados();
  const navigate = useNavigate();
  const [recomendaciones, setRecomendaciones] = useState<Recomendacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modoVista, setModoVista] = useState<"swipe" | "lista">("swipe");

  // 1. Filtrar las mascotas que ya tengan me gusta cuando cargo la vista
  const [guardadosAlCargar] = useState(() => new Set(guardados));
  const [versionMazo, setVersionMazo] = useState(0);

  useEffect(() => {
    const controlador = new AbortController();

    obtenerRecomendaciones(controlador.signal)
      .then(setRecomendaciones)
      .catch((err) => {
        if (axios.isCancel(err)) return;
        setError("No pudimos cargar tus recomendaciones. Intenta de nuevo más tarde.");
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false);
      });

    return () => controlador.abort();
  }, []);

  // Mascotas organizadas: de mayor a menor %, aleatorias dentro de cada % y sin incompatibles
  const recomendacionesDisponibles = useMemo(() => {
    return ordenarPorCompatibilidadAleatoria(recomendaciones, guardadosAlCargar);
  }, [recomendaciones, guardadosAlCargar, versionMazo]);

  const handleReiniciar = () => {
    try {
      sessionStorage.removeItem("housefound_swipe_orden_ids");
      sessionStorage.removeItem("housefound_swipe_indice_actual");
      sessionStorage.removeItem("housefound_swipe_historial");
    } catch {}
    setVersionMazo((v) => v + 1);
  };

  return (
    <PantallaAdoptante>
      {/* 2. Header adaptativo y compacto que no desborda en pantallas angostas */}
      <header className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              Coincidencias
            </h1>
            <p className="text-[11px] sm:text-xs font-medium text-slate-500">
              Para <span className="font-bold text-slate-700">{usuario?.nombre}</span>
            </p>
          </div>

          {!cargando && !error && recomendacionesDisponibles.length > 0 && (
            <div className="flex bg-slate-200/70 p-0.5 rounded-xl border border-slate-200 shrink-0">
              <button
                onClick={() => setModoVista("swipe")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  modoVista === "swipe"
                    ? "bg-white text-emerald-700 shadow-2xs font-extrabold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Modo Swipe"
              >
                <Flame size={13} className={modoVista === "swipe" ? "text-emerald-600 fill-emerald-500/20" : ""} />
                <span>Swipe</span>
              </button>
              <button
                onClick={() => setModoVista("lista")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  modoVista === "lista"
                    ? "bg-white text-emerald-700 shadow-2xs font-extrabold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Modo Lista"
              >
                <LayoutList size={13} className={modoVista === "lista" ? "text-emerald-600" : ""} />
                <span>Lista</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {cargando && <CargandoVista mensaje="Buscando tus coincidencias…" />}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium mb-4">
          {error}
        </div>
      )}

      {/* Caso: No hay recomendaciones en el sistema */}
      {!cargando && !error && recomendaciones.length === 0 && (
        <div className="rounded-3xl bg-white border border-slate-200 p-8 text-center shadow-xs">
          <p className="font-extrabold text-slate-800 text-base">
            Por ahora no encontramos mascotas compatibles
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Los refugios publican mascotas nuevas seguido. Mientras tanto, en Explorar puedes verlas todas y por qué algunas no calzan con tu hogar.
          </p>
          <button
            onClick={() => navigate("/explorar")}
            className="mt-4 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs"
          >
            Ir a Explorar
          </button>
        </div>
      )}

      {/* Caso: Había recomendaciones pero todas ya tenían Me Gusta previo */}
      {!cargando && !error && recomendaciones.length > 0 && recomendacionesDisponibles.length === 0 && (
        <div className="rounded-3xl bg-white border border-slate-200 p-8 text-center shadow-xs">
          <p className="font-extrabold text-slate-800 text-base">
            ¡Ya guardaste todas tus coincidencias actuales!
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Todas las mascotas afines a tu perfil ya están en tu lista de guardados.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={() => navigate("/guardados")}
              className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs"
            >
              Ver mis guardados
            </button>
            <button
              onClick={() => navigate("/explorar")}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl"
            >
              Explorar otras mascotas
            </button>
          </div>
        </div>
      )}

      {/* Modo Swipe (Tipo Tinder) */}
      {!cargando && !error && recomendacionesDisponibles.length > 0 && modoVista === "swipe" && (
        <SwipeDeckMascotas
          mascotas={recomendacionesDisponibles}
          guardados={guardados}
          onAlternarGuardado={alternar}
          onVerDetalle={(id) => navigate(`/mascota/${id}`)}
          onReiniciar={handleReiniciar}
        />
      )}

      {/* Modo Lista Clásica (directa y limpia, sin títulos ni subtítulos redundantes) */}
      {!cargando && !error && recomendacionesDisponibles.length > 0 && modoVista === "lista" && (
        <div className="space-y-3">
          {recomendacionesDisponibles.map((rec) => (
            <TarjetaMascota
              key={rec.mascota_id}
              mascotaId={rec.mascota_id}
              nombre={rec.nombre}
              especie={rec.especie}
              raza={rec.raza}
              edad={rec.edad}
              urlFoto={rec.url_foto}
              score={rec.score_compatibilidad}
              descripcion={descripcionCorta(rec)}
              guardado={guardados.includes(rec.mascota_id)}
              onAlternarGuardado={alternar}
            />
          ))}
        </div>
      )}
    </PantallaAdoptante>
  );
}

/** Orden no lineal:
 * 1. Excluye estrictamente mascotas no compatibles (excluidas o < 50% de afinidad)
 *    y las que ya tenían me gusta al cargar.
 * 2. Agrupa por % de afinidad en orden descendente (100%, 95%, 90%...).
 * 3. Mezcla aleatoriamente las mascotas dentro de cada % para que no aparezcan lineales.
 * 4. Preserva el orden en sessionStorage durante la sesión (para volver de la ficha).
 */
function ordenarPorCompatibilidadAleatoria(
  lista: Recomendacion[],
  guardadosExcluidos: Set<number>
): Recomendacion[] {
  // 1. Filtrar compatibles reales
  const compatibles = lista.filter(
    (r) =>
      !r.excluida &&
      r.score_compatibilidad >= 0.5 &&
      !guardadosExcluidos.has(r.mascota_id)
  );

  if (compatibles.length === 0) return [];

  // 2. Si ya hay un orden generado en la sesión actual, preservarlo
  try {
    const guardado = sessionStorage.getItem("housefound_swipe_orden_ids");
    if (guardado) {
      const idsGuardados: number[] = JSON.parse(guardado);
      if (Array.isArray(idsGuardados) && idsGuardados.length > 0) {
        const mapa = new Map(compatibles.map((r) => [r.mascota_id, r]));
        const restauradas: Recomendacion[] = [];
        for (const id of idsGuardados) {
          const rec = mapa.get(id);
          if (rec) {
            restauradas.push(rec);
            mapa.delete(id);
          }
        }
        if (mapa.size === 0 && restauradas.length === compatibles.length) {
          return restauradas;
        }
      }
    }
  } catch {}

  // 3. Agrupar por porcentaje exacto (100%, 95%, 90%...)
  const gruposPorPct = new Map<number, Recomendacion[]>();
  for (const r of compatibles) {
    const pct = Math.round(r.score_compatibilidad * 100);
    const grupo = gruposPorPct.get(pct) ?? [];
    grupo.push(r);
    gruposPorPct.set(pct, grupo);
  }

  // 4. Ordenar de mayor % a menor %, y barajar aleatoriamente dentro de cada tier
  const pctsOrdenados = Array.from(gruposPorPct.keys()).sort((a, b) => b - a);
  const resultado: Recomendacion[] = [];

  for (const pct of pctsOrdenados) {
    const grupo = gruposPorPct.get(pct)!;
    // Fisher-Yates shuffle
    const mezclado = [...grupo];
    for (let i = mezclado.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mezclado[i], mezclado[j]] = [mezclado[j], mezclado[i]];
    }
    resultado.push(...mezclado);
  }

  // 5. Persistir en sessionStorage
  try {
    sessionStorage.setItem(
      "housefound_swipe_orden_ids",
      JSON.stringify(resultado.map((r) => r.mascota_id))
    );
  } catch {}

  return resultado;
}

