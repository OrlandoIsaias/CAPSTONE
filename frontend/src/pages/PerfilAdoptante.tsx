import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { obtenerPerfilAdoptante } from "../api/auth";
import { PantallaAdoptante } from "../components/BarraAdoptante";
import { CargandoVista } from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import type { PerfilAdoptante as IPerfilAdoptante } from "../types/auth";

// El correo/nombre aparecen al instante porque ya están en localStorage
// desde el login (AuthContext). El perfil (teléfono incluido) vive en otra
// tabla y se pide aparte — cachearlo acá logra el mismo efecto: se muestra
// de inmediato desde la segunda visita en adelante, mientras se refresca
// en silencio por si cambió en otro dispositivo.
function claveCache(usuarioId: number) {
  return `housefound_perfil_adoptante_cache_${usuarioId}`;
}

function leerCache(usuarioId: number): IPerfilAdoptante | null {
  try {
    const crudo = localStorage.getItem(claveCache(usuarioId));
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

const ETIQUETAS_ESPACIO: Record<string, string> = {
  departamento: "Departamento",
  casa_patio: "Casa con patio",
  casa_grande: "Casa grande / Parcela",
};

const ETIQUETAS_EXPERIENCIA: Record<string, string> = {
  ninguna: "Primera vez (Ninguna)",
  basica: "Básica",
  alta: "Alta / Experto",
};

const ETIQUETAS_ACTIVIDAD: Record<string, string> = {
  bajo: "Tranquilo / Bajo",
  medio: "Moderado / Medio",
  alto: "Deportista / Alto",
};

export default function PerfilAdoptante() {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  const [perfil, setPerfil] = useState<IPerfilAdoptante | null>(() =>
    usuario ? leerCache(usuario.id) : null
  );
  // Si ya había algo en caché, se muestra de inmediato — no hace falta
  // tapar la pantalla con el spinner mientras se refresca por detrás.
  const [cargando, setCargando] = useState(() => (usuario ? leerCache(usuario.id) === null : true));

  useEffect(() => {
    obtenerPerfilAdoptante()
      .then((p) => {
        setPerfil(p);
        if (usuario) {
          try {
            localStorage.setItem(claveCache(usuario.id), JSON.stringify(p));
          } catch {
            // localStorage lleno/deshabilitado — no es crítico, simplemente
            // no se cachea y la próxima visita vuelve a pedirlo.
          }
        }
      })
      .catch((err) => {
        // 404 = el usuario genuinamente no tiene perfil todavía. Cualquier
        // otro error (red, servidor caído) no debería borrar un dato en
        // caché que sabemos que es válido.
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setPerfil(null);
        }
      })
      .finally(() => setCargando(false));
  }, [usuario]);

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
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-[family-name:var(--font-display)] text-2xl font-black flex items-center justify-center shadow-md border-2 border-white ring-2 ring-indigo-200">
              {usuario?.nombre?.charAt(0).toUpperCase() || "U"}
            </div>
            <span className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-white" title="Cuenta activa" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-extrabold text-slate-900 text-lg leading-snug truncate">
              {usuario?.nombre}
            </h2>
            <p className="text-xs font-semibold text-slate-500 truncate">
              {usuario?.email}
            </p>
            {cargando ? (
              // Mientras se espera la respuesta, `perfil` todavía es null —
              // sin este caso se alcanza a mostrar "Sin teléfono" un
              // instante antes de que llegue el dato real.
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

      {/* Cuadro destacado para Editar Perfil o Cuestionario */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-[1.5px] shadow-sm mb-4">
        <div className="bg-white rounded-[22px] p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Editar estilo de vida y cuestionario
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Actualiza vivienda, horarios y convivencia para recalcular tu afinidad.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/perfil-adoptante/editar")}
            className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-black px-4 py-2.5 rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all"
          >
            Editar datos →
          </button>
        </div>
      </div>

      {/* Resumen de Datos Importantes (Estilo de Vida) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs mb-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Resumen de Estilo de Vida
          </h2>
          <Link
            to="/perfil-adoptante/editar"
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
          >
            Modificar
          </Link>
        </div>

        {cargando && <CargandoVista mensaje="Cargando tu perfil…" className="text-slate-400 py-8" />}

        {!cargando && perfil && (
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vivienda</p>
              <p className="text-xs font-black text-slate-800 mt-0.5">
                {ETIQUETAS_ESPACIO[perfil.espacio_disponible] ?? perfil.espacio_disponible}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tiempo Diario</p>
              <p className="text-xs font-black text-slate-800 mt-0.5">
                {perfil.tiempo_disponible_horas_dia} {perfil.tiempo_disponible_horas_dia === 1 ? "hora" : "horas"}/día
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Experiencia</p>
              <p className="text-xs font-black text-slate-800 mt-0.5">
                {ETIQUETAS_EXPERIENCIA[perfil.experiencia_previa] ?? perfil.experiencia_previa}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Actividad Física</p>
              <p className="text-xs font-black text-slate-800 mt-0.5">
                {ETIQUETAS_ACTIVIDAD[perfil.nivel_actividad_fisica] ?? perfil.nivel_actividad_fisica}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Niños en Casa</p>
              <p className="text-xs font-black text-slate-800 mt-0.5">
                {perfil.tiene_ninos ? "Sí tiene niños" : "Sin niños"}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Otras Mascotas</p>
              <p className="text-xs font-black text-slate-800 mt-0.5">
                {perfil.otras_mascotas ? "Sí tiene mascotas" : "Sin mascotas"}
              </p>
            </div>
          </div>
        )}

        {!cargando && !perfil && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
            <p className="text-xs font-extrabold text-amber-900">
              Aún no has completado tu cuestionario de afinidad.
            </p>
            <p className="text-[11px] text-amber-700 mt-1 mb-3">
              Completa tus datos para encontrar las mascotas más compatibles contigo.
            </p>
            <button
              onClick={() => navigate("/perfil-adoptante/editar")}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs"
            >
              Completar Cuestionario Ahora
            </button>
          </div>
        )}
      </div>

      {/* Botón de Cerrar Sesión */}
      <button
        onClick={cerrarSesion}
        className="w-full py-3 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 active:scale-95 transition-all"
      >
        Cerrar sesión de la cuenta
      </button>
    </PantallaAdoptante>
  );
}
