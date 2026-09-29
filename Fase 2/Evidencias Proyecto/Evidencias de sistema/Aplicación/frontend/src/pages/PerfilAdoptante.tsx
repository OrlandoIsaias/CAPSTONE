import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { guardarPerfilAdoptante, obtenerPerfilAdoptante } from "../api/auth";
import { PantallaAdoptante } from "../components/BarraAdoptante";
import { Spinner } from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import { normalizarTelefonoCL, validarTelefonoCL } from "../utils/telefono";
import type { EspacioDisponible, ExperienciaPrevia, NivelActividad } from "../types/auth";

type Errores = Partial<Record<"telefono", string>>;

export default function PerfilAdoptante() {
  const navigate = useNavigate();
  const { cerrarSesion } = useAuth();

  const [espacioDisponible, setEspacioDisponible] = useState<EspacioDisponible>("departamento");
  const [tiempoDisponible, setTiempoDisponible] = useState(4);
  const [experienciaPrevia, setExperienciaPrevia] = useState<ExperienciaPrevia>("ninguna");
  const [tieneNinos, setTieneNinos] = useState(false);
  const [otrasMascotas, setOtrasMascotas] = useState(false);
  const [nivelActividad, setNivelActividad] = useState<NivelActividad>("medio");
  const [telefono, setTelefono] = useState("");

  const [yaExiste, setYaExiste] = useState<boolean | null>(null);
  const [errores, setErrores] = useState<Errores>({});
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    obtenerPerfilAdoptante()
      .then((p) => {
        setEspacioDisponible(p.espacio_disponible);
        setTiempoDisponible(p.tiempo_disponible_horas_dia);
        setExperienciaPrevia(p.experiencia_previa);
        setTieneNinos(p.tiene_ninos);
        setOtrasMascotas(p.otras_mascotas);
        setNivelActividad(p.nivel_actividad_fisica);
        setTelefono(p.telefono ?? "");
        setYaExiste(true);
      })
      .catch(() => setYaExiste(false));
  }, []);

  function validar(): boolean {
    const nuevosErrores: Errores = {};
    if (!validarTelefonoCL(telefono)) {
      nuevosErrores.telefono = "Ingresa un celular chileno válido, ej: +56 9 1234 5678.";
    }
    setErrores(nuevosErrores);
    return Object.values(nuevosErrores).every((v) => !v);
  }

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setGuardado(false);

    if (!validar()) return;

    setCargando(true);
    try {
      await guardarPerfilAdoptante({
        espacio_disponible: espacioDisponible,
        tiempo_disponible_horas_dia: tiempoDisponible,
        experiencia_previa: experienciaPrevia,
        tiene_ninos: tieneNinos,
        otras_mascotas: otrasMascotas,
        nivel_actividad_fisica: nivelActividad,
        telefono: normalizarTelefonoCL(telefono),
      });
      if (yaExiste) {
        setGuardado(true);
        setTimeout(() => setGuardado(false), 2500);
      } else {
        navigate("/explorar");
      }
    } catch {
      setError("No pudimos guardar tu perfil. Revisa los datos e intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  const claseCampo =
    "w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all";
  const claseEtiqueta = "block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5";
  const claseErrorCampo = "text-xs font-semibold text-rose-600 mt-1";

  return (
    <PantallaAdoptante>
      {/* Encabezado */}
      <header className="mb-5">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-black text-slate-900 leading-tight">
          {yaExiste ? "Tu perfil de adoptante" : "Cuéntanos cómo vives"}
        </h1>
        <p className="text-xs font-medium text-slate-500 mt-1">
          Usamos esta información para conectar contigo mascotas compatibles con tu ritmo diario.
        </p>
      </header>

      {/* Banner de acceso a solicitudes */}
      {yaExiste && (
        <Link
          to="/mis-solicitudes"
          className="flex items-center justify-between mb-5 rounded-3xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/5 border border-blue-200 p-4 shadow-xs hover:border-blue-300 active:scale-[0.99] transition-all group"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-lg shadow-2xs">
              📋
            </span>
            <div>
              <p className="font-extrabold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
                Historial de Solicitudes
              </p>
              <p className="text-xs font-medium text-slate-500">
                Revisa el estado de tus postulaciones y chats.
              </p>
            </div>
          </div>
          <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 group-hover:text-slate-700 shadow-2xs">
            →
          </span>
        </Link>
      )}

      <form onSubmit={manejarEnvio} className="space-y-4">
        {/* Sección 1: Vivienda y Horarios */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span>🏡</span> Hogar y Disponibilidad
          </h2>

          <div>
            <label className={claseEtiqueta}>Espacio disponible en casa</label>
            <select
              value={espacioDisponible}
              onChange={(e) => setEspacioDisponible(e.target.value as EspacioDisponible)}
              className={claseCampo}
            >
              <option value="departamento">Departamento</option>
              <option value="casa_patio">Casa con patio</option>
              <option value="casa_grande">Casa grande / Parcela</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={claseEtiqueta}>Tiempo diario disponible</label>
              <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/70">
                {tiempoDisponible} {tiempoDisponible === 1 ? "hora" : "horas"} al día
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={12}
              value={tiempoDisponible}
              onChange={(e) => setTiempoDisponible(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
              <span>0h (Poco tiempo)</span>
              <span>6h</span>
              <span>12h (Dedicación alta)</span>
            </div>
          </div>
        </div>

        {/* Sección 2: Rutina y Convivencia */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span>⚡</span> Experiencia y Convivencia
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={claseEtiqueta}>Experiencia previa</label>
              <select
                value={experienciaPrevia}
                onChange={(e) => setExperienciaPrevia(e.target.value as ExperienciaPrevia)}
                className={claseCampo}
              >
                <option value="ninguna">Ninguna (Primera vez)</option>
                <option value="basica">Básica</option>
                <option value="alta">Alta / Experto</option>
              </select>
            </div>
            <div>
              <label className={claseEtiqueta}>Nivel de actividad</label>
              <select
                value={nivelActividad}
                onChange={(e) => setNivelActividad(e.target.value as NivelActividad)}
                className={claseCampo}
              >
                <option value="bajo">Bajo (Sedentario/Tranquilo)</option>
                <option value="medio">Medio (Paseos diarios)</option>
                <option value="alto">Alto (Deportista/Muy activo)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition-colors">
              <input
                type="checkbox"
                checked={tieneNinos}
                onChange={(e) => setTieneNinos(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
              />
              <span className="text-xs font-bold text-slate-700">Tengo niños</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition-colors">
              <input
                type="checkbox"
                checked={otrasMascotas}
                onChange={(e) => setOtrasMascotas(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
              />
              <span className="text-xs font-bold text-slate-700">Otras mascotas</span>
            </label>
          </div>
        </div>

        {/* Sección 3: Teléfono */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span>📱</span> Contacto Directo
          </h2>
          <div>
            <label className={claseEtiqueta}>Número de Celular / WhatsApp</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+56 9 1234 5678"
              className={claseCampo}
            />
            <p className="text-[11px] font-medium text-slate-400 mt-1.5">
              Solo se comparte con el refugio tras ser aprobada una postulación para coordinar la entrega.
            </p>
            {errores.telefono && <p className={claseErrorCampo}>{errores.telefono}</p>}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {error}
          </div>
        )}

        {guardado && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <span>✓</span> ¡Tu perfil y preferencias fueron guardados exitosamente!
          </div>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black py-4 rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-60"
        >
          {cargando && <Spinner />}
          {cargando
            ? "Guardando cambios…"
            : yaExiste
            ? "Actualizar Perfil de Convivencia"
            : "Completar Perfil y Ver Recomendaciones 🎯"}
        </button>
      </form>

      {yaExiste && (
        <button
          onClick={cerrarSesion}
          className="w-full mt-4 py-3 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 active:scale-95 transition-all"
        >
          Cerrar sesión de la cuenta
        </button>
      )}
    </PantallaAdoptante>
  );
}
