import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { guardarPerfilAdoptante, obtenerPerfilAdoptante } from "../api/auth";
import { Spinner } from "../components/Spinner";
import { useToast } from "../context/ToastContext";
import { normalizarTelefonoCL, validarTelefonoCL } from "../utils/telefono";
import type { EspacioDisponible, ExperienciaPrevia, NivelActividad } from "../types/auth";

type Errores = Partial<Record<"telefono", string>>;

export default function EditarPerfilAdoptante() {
  const navigate = useNavigate();
  const mostrarToast = useToast();

  const [espacioDisponible, setEspacioDisponible] = useState<EspacioDisponible>("departamento");
  const [tiempoDisponible, setTiempoDisponible] = useState(4);
  const [experienciaPrevia, setExperienciaPrevia] = useState<ExperienciaPrevia>("ninguna");
  const [tieneNinos, setTieneNinos] = useState(false);
  const [otrasMascotas, setOtrasMascotas] = useState(false);
  const [nivelActividad, setNivelActividad] = useState<NivelActividad>("medio");
  const [telefono, setTelefono] = useState("");

  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [error, setError] = useState<string | null>(null);

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
      })
      .catch(() => {
        // Puede ser primer registro
      })
      .finally(() => setCargandoInicial(false));
  }, []);

  function validar(): boolean {
    const nuevosErrores: Errores = {};
    if (telefono.trim() && !validarTelefonoCL(telefono)) {
      nuevosErrores.telefono = "Ingresa un celular chileno válido, ej: +56 9 1234 5678.";
    }
    setErrores(nuevosErrores);
    return Object.values(nuevosErrores).every((v) => !v);
  }

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();
    setError(null);

    if (!validar()) return;

    setGuardando(true);
    try {
      await guardarPerfilAdoptante({
        espacio_disponible: espacioDisponible,
        tiempo_disponible_horas_dia: tiempoDisponible,
        experiencia_previa: experienciaPrevia,
        tiene_ninos: tieneNinos,
        otras_mascotas: otrasMascotas,
        nivel_actividad_fisica: nivelActividad,
        telefono: telefono.trim() ? normalizarTelefonoCL(telefono) : "",
      });
      mostrarToast("¡Perfil y cuestionario actualizados correctamente!");
      navigate("/perfil-adoptante");
    } catch {
      setError("No pudimos guardar los cambios. Revisa los datos e intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  const claseCampo =
    "w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all";
  const claseEtiqueta = "block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5";
  const claseErrorCampo = "text-xs font-semibold text-rose-600 mt-1";

  if (cargandoInicial) {
    return (
      <div className="min-h-screen bg-[var(--color-fondo)] flex items-center justify-center p-6">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-fondo)]">
      <div className="mx-auto w-full max-w-[480px] px-5 pt-6 pb-20">
        {/* Encabezado con Botón Volver */}
        <header className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/perfil-adoptante")}
            aria-label="Volver al perfil"
            className="w-10 h-10 rounded-full bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-600 hover:text-slate-900 active:scale-90 transition-transform shrink-0"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-black text-slate-900 leading-tight">
              Editar Estilo de Vida
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Modifica tus respuestas para el cálculo de afinidad.
            </p>
          </div>
        </header>

        <form onSubmit={manejarEnvio} className="space-y-4">
          {/* Sección 1: Vivienda y Horarios */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Hogar y Disponibilidad
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
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Experiencia y Convivencia
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
                  <option value="bajo">Bajo (Tranquilo)</option>
                  <option value="medio">Medio (Paseos diarios)</option>
                  <option value="alto">Alto (Deportista)</option>
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

          {/* Sección 3: Contacto */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Teléfono de Contacto
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
                Se compartirá con el refugio solo cuando tu postulación sea aprobada.
              </p>
              {errores.telefono && <p className={claseErrorCampo}>{errores.telefono}</p>}
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {error}
            </div>
          )}

          <div className="pt-2 space-y-2.5">
            <button
              type="submit"
              disabled={guardando}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black py-4 rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-60"
            >
              {guardando && <Spinner />}
              {guardando ? "Guardando cambios…" : "Guardar Cambios"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/perfil-adoptante")}
              className="w-full py-3 rounded-2xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
