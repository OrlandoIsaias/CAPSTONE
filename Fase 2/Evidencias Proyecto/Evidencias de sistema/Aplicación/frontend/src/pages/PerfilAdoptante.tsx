import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";
import { obtenerPerfilAdoptante } from "../api/auth";
import { PantallaAdoptante } from "../components/BarraAdoptante";
import { CargandoVista } from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import type { PerfilAdoptante as IPerfilAdoptante } from "../types/auth";
import {
  etiquetaEspeciePreferida,
  OPCIONES_ACEPTA_CUIDADOS,
  OPCIONES_ALERGIAS,
  OPCIONES_AMBIENTE_HOGAR,
  OPCIONES_ESPACIO_DISPONIBLE,
  OPCIONES_ETAPA,
  OPCIONES_EXPERIENCIA_PREVIA,
  OPCIONES_HORAS_SOLA,
  OPCIONES_NINOS_HOGAR,
  OPCIONES_RESTRICCION_VIVIENDA,
  OPCIONES_TIEMPO_ACTIVIDAD,
  resumenAnimales,
} from "../utils/opcionesAdoptante";
import { etiquetaOpcion, OPCIONES_SEXO, OPCIONES_TAMANO, resumenOpcion, type Opcion } from "../utils/opcionesMascota";

// "Pequeño o mediano"; una lista vacía o null significa "me da igual".
function listaPreferida<V extends string>(opciones: Opcion<V>[], valores: V[] | null | undefined): string {
  if (!valores || valores.length === 0) return "Me da igual";
  const etiquetas = valores.map((v) => etiquetaOpcion(opciones, v).toLowerCase());
  const texto = etiquetas.length > 1 ? `${etiquetas.slice(0, -1).join(", ")} o ${etiquetas.at(-1)}` : etiquetas[0];
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function claveCache(usuarioId: number) {
  return `housefound_perfil_adoptante_cache_${usuarioId}`;
}

// Una caché anterior a los cuestionarios v2 no trae cuestionario_completo:
// sus respuestas ya no existen, así que se ignora.
function leerCache(usuarioId: number): IPerfilAdoptante | null {
  try {
    const crudo = localStorage.getItem(claveCache(usuarioId));
    const perfil: IPerfilAdoptante | null = crudo ? JSON.parse(crudo) : null;
    return perfil?.cuestionario_completo ? perfil : null;
  } catch {
    return null;
  }
}

/* RutaProtegida solo deja llegar aquí a un adoptante con el cuestionario
   completo, así que esta pantalla siempre muestra sus respuestas. */
export default function PerfilAdoptante() {
  const { usuario, cerrarSesion } = useAuth();

  const [perfil, setPerfil] = useState<IPerfilAdoptante | null>(() =>
    usuario ? leerCache(usuario.id) : null
  );
  // Con caché la pantalla se muestra de inmediato y la consulta solo la actualiza;
  // si la consulta falla, quedan a la vista los últimos datos conocidos.
  const [cargando, setCargando] = useState(() => perfil === null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    obtenerPerfilAdoptante()
      .then((p) => {
        setPerfil(p);
        if (usuario) {
          try {
            localStorage.setItem(claveCache(usuario.id), JSON.stringify(p));
          } catch {
            // localStorage fallback
          }
        }
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [usuario, intento]);

  function reintentar() {
    setCargando(true);
    setIntento((n) => n + 1);
  }

  return (
    <PantallaAdoptante>
      {/* Encabezado */}
      <header className="mb-5">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-black text-slate-900 leading-tight">
          Mi Perfil
        </h1>
        <p className="text-xs font-medium text-slate-500 mt-1">
          Gestiona tu información y preferencias de adopción.
        </p>
      </header>

      {/* Tarjeta de Identidad */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs mb-4 space-y-4">
        {/* Cabecera del usuario con Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-[family-name:var(--font-display)] text-2xl font-black flex items-center justify-center shadow-md border-2 border-white ring-2 ring-indigo-200 shrink-0">
            {usuario?.nombre?.charAt(0).toUpperCase() || "U"}
            <span className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-white shadow-2xs" title="Cuenta activa" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-extrabold text-slate-900 text-lg leading-snug truncate">
              {usuario?.nombre}
            </h2>
            <p className="text-xs font-semibold text-slate-500 truncate">
              {usuario?.email}
            </p>
            {cargando ? (
              <p className="h-3.5 w-24 mt-1 rounded bg-slate-100 animate-pulse" />
            ) : perfil?.telefono ? (
              <p className="text-xs font-bold text-indigo-600 mt-0.5">
                Tel: {perfil.telefono}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 italic mt-0.5">
                Sin teléfono de contacto
              </p>
            )}
          </div>
        </div>
      </div>

      {cargando && (
        <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs mb-4">
          <CargandoVista mensaje="Cargando tu perfil…" className="text-slate-400 py-8" />
        </div>
      )}

      {!cargando && !perfil && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center mb-4">
          <p className="text-sm font-medium text-rose-700">No pudimos cargar tu perfil.</p>
          <button
            onClick={reintentar}
            className="mt-3 bg-white border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold px-4 py-2 rounded-xl"
          >
            Reintentar
          </button>
        </div>
      )}

      {!cargando && perfil && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs mb-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Tu estilo de vida
            </h2>
            <Link
              to="/perfil-adoptante/editar"
              className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
            >
              <Pencil size={12} />
              Editar
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { etiqueta: "Vivienda", valor: resumenOpcion(OPCIONES_ESPACIO_DISPONIBLE, perfil.espacio_disponible) },
              { etiqueta: "Condiciones", valor: resumenOpcion(OPCIONES_RESTRICCION_VIVIENDA, perfil.restriccion_vivienda) },
              { etiqueta: "Tiempo sola", valor: resumenOpcion(OPCIONES_HORAS_SOLA, perfil.horas_sola) },
              { etiqueta: "Para pasear o jugar", valor: resumenOpcion(OPCIONES_TIEMPO_ACTIVIDAD, perfil.tiempo_actividad) },
              { etiqueta: "Ambiente", valor: resumenOpcion(OPCIONES_AMBIENTE_HOGAR, perfil.ambiente_hogar) },
              { etiqueta: "Niños", valor: resumenOpcion(OPCIONES_NINOS_HOGAR, perfil.ninos_hogar) },
              { etiqueta: "Otras mascotas", valor: resumenAnimales(perfil.tiene_perros, perfil.tiene_gatos) },
              { etiqueta: "Alergias", valor: resumenOpcion(OPCIONES_ALERGIAS, perfil.alergias) },
              { etiqueta: "Experiencia", valor: resumenOpcion(OPCIONES_EXPERIENCIA_PREVIA, perfil.experiencia_previa) },
              { etiqueta: "Cuidados especiales", valor: resumenOpcion(OPCIONES_ACEPTA_CUIDADOS, perfil.acepta_cuidados) },
            ].map(({ etiqueta, valor }) => (
              <div key={etiqueta} className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{etiqueta}</p>
                <p className="text-xs font-black text-slate-800 mt-0.5">{valor}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preferencias: solo ordenan las recomendaciones (la especie filtra) */}
      {!cargando && perfil && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs mb-4">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700">Preferencias</p>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-black text-slate-900 mt-0.5 mb-2">
            Tu búsqueda ideal
          </h2>
          <dl>
            {[
              { etiqueta: "Tipo de mascota", valor: etiquetaEspeciePreferida(perfil.especie_preferida) },
              ...(perfil.especie_preferida !== "Gato"
                ? [{ etiqueta: "Tamaño", valor: listaPreferida(OPCIONES_TAMANO, perfil.tamanos_preferidos) }]
                : []),
              { etiqueta: "Edad", valor: listaPreferida(OPCIONES_ETAPA, perfil.etapas_preferidas) },
              {
                etiqueta: "Sexo",
                valor: perfil.sexo_preferido ? etiquetaOpcion(OPCIONES_SEXO, perfil.sexo_preferido) : "Me da igual",
              },
            ].map(({ etiqueta, valor }, i, filas) => (
              <div
                key={etiqueta}
                className={`flex items-baseline justify-between gap-4 py-2.5 ${
                  i < filas.length - 1 ? "border-b border-slate-100" : ""
                }`}
              >
                <dt className="text-xs font-medium text-slate-500">{etiqueta}</dt>
                <dd className="text-xs font-black text-slate-800 text-right">{valor}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Botón de Cerrar Sesión con degradé rojo y texto blanco */}
      <button
        onClick={cerrarSesion}
        className="w-full bg-gradient-to-r from-rose-500 via-red-500 to-rose-600 hover:from-rose-600 hover:via-red-600 hover:to-rose-700 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-sm hover:shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Cerrar sesión
      </button>
    </PantallaAdoptante>
  );
}
