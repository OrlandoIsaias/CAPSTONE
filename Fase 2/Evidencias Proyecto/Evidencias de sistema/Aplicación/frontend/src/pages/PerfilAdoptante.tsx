import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { guardarPerfilAdoptante, obtenerPerfilAdoptante } from "../api/auth";
import { PantallaAdoptante } from "../components/BarraAdoptante";
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

  // null mientras no sabemos si el perfil existe: cambia el texto de la
  // pantalla entre "alta inicial" y "edición" (mismo criterio que PerfilRefugio).
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
      // 404 = todavía no lo completa; es el flujo normal tras registrarse
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
    "w-full rounded-md border border-[var(--color-borde)] px-3 py-2.5 text-sm bg-[var(--color-superficie)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]";
  const claseErrorCampo = "text-xs text-[var(--color-rojo)] mt-1";

  return (
    <PantallaAdoptante>
      <p className="text-sm text-[var(--color-primario)] font-medium mb-2">
        {yaExiste ? "Tu perfil" : "Un último paso"}
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-3xl mb-2">
        {yaExiste ? "Cómo vives" : "Cuéntanos cómo vives"}
      </h1>
      <p className="text-[var(--color-texto-suave)] mb-8">
        Con esto calculamos qué mascotas realmente calzan contigo — no solo por especie, sino
        por rutina real.
      </p>

        {yaExiste && (
          <Link
            to="/mis-solicitudes"
            className="flex items-center justify-between mb-6 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] p-4 hover:shadow-sm transition-shadow"
          >
            <div>
              <p className="font-semibold">Tus solicitudes</p>
              <p className="text-sm text-[var(--color-texto-suave)]">
                Revisa el estado de tus postulaciones y coordina la entrega.
              </p>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-texto-suave)] shrink-0">
              <path d="m9 5 7 7-7 7" />
            </svg>
          </Link>
        )}

        <form onSubmit={manejarEnvio} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1.5">Espacio disponible en casa</label>
            <select
              value={espacioDisponible}
              onChange={(e) => setEspacioDisponible(e.target.value as EspacioDisponible)}
              className={claseCampo}
            >
              <option value="departamento">Departamento</option>
              <option value="casa_patio">Casa con patio</option>
              <option value="casa_grande">Casa grande</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Horas al día que puedes dedicarle: {tiempoDisponible}h
            </label>
            <input
              type="range"
              min={0}
              max={12}
              value={tiempoDisponible}
              onChange={(e) => setTiempoDisponible(Number(e.target.value))}
              className="w-full accent-[var(--color-primario)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Experiencia previa con mascotas</label>
            <select
              value={experienciaPrevia}
              onChange={(e) => setExperienciaPrevia(e.target.value as ExperienciaPrevia)}
              className={claseCampo}
            >
              <option value="ninguna">Ninguna</option>
              <option value="basica">Básica</option>
              <option value="alta">Alta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Tu nivel de actividad física</label>
            <select
              value={nivelActividad}
              onChange={(e) => setNivelActividad(e.target.value as NivelActividad)}
              className={claseCampo}
            >
              <option value="bajo">Bajo</option>
              <option value="medio">Medio</option>
              <option value="alto">Alto</option>
            </select>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={tieneNinos}
                onChange={(e) => setTieneNinos(e.target.checked)}
                className="accent-[var(--color-primario)]"
              />
              Tengo niños en casa
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={otrasMascotas}
                onChange={(e) => setOtrasMascotas(e.target.checked)}
                className="accent-[var(--color-primario)]"
              />
              Tengo otras mascotas
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Tu celular</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+56 9 1234 5678"
              className={claseCampo}
            />
            <p className="text-xs text-[var(--color-texto-suave)] mt-1">
              Solo se comparte con el refugio si tu solicitud es aprobada, para coordinar la
              entrega.
            </p>
            {errores.telefono && <p className={claseErrorCampo}>{errores.telefono}</p>}
          </div>

          {error && <p className="text-sm text-[var(--color-rojo)]">{error}</p>}
          {guardado && (
            <p className="text-sm font-medium text-[var(--color-verde)]">Cambios guardados.</p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-[var(--color-primario)] text-white font-semibold py-2.5 rounded-md hover:bg-[var(--color-primario-oscuro)] transition disabled:opacity-60"
          >
            {cargando ? "Guardando…" : yaExiste ? "Guardar cambios" : "Ver mis recomendaciones"}
          </button>
        </form>

      {yaExiste && (
        <button
          onClick={cerrarSesion}
          className="w-full mt-3 py-2.5 rounded-md font-semibold text-[var(--color-texto-suave)]"
        >
          Cerrar sesión
        </button>
      )}
    </PantallaAdoptante>
  );
}
