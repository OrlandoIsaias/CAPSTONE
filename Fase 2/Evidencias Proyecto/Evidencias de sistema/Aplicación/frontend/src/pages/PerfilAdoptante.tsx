import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { guardarPerfilAdoptante } from "../api/auth";
import type { EspacioDisponible, ExperienciaPrevia, NivelActividad } from "../types/auth";

export default function PerfilAdoptante() {
  const navigate = useNavigate();

  const [espacioDisponible, setEspacioDisponible] = useState<EspacioDisponible>("departamento");
  const [tiempoDisponible, setTiempoDisponible] = useState(4);
  const [experienciaPrevia, setExperienciaPrevia] = useState<ExperienciaPrevia>("ninguna");
  const [tieneNinos, setTieneNinos] = useState(false);
  const [otrasMascotas, setOtrasMascotas] = useState(false);
  const [nivelActividad, setNivelActividad] = useState<NivelActividad>("medio");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await guardarPerfilAdoptante({
        espacio_disponible: espacioDisponible,
        tiempo_disponible_horas_dia: tiempoDisponible,
        experiencia_previa: experienciaPrevia,
        tiene_ninos: tieneNinos,
        otras_mascotas: otrasMascotas,
        nivel_actividad_fisica: nivelActividad,
      });
      navigate("/recomendaciones");
    } catch {
      setError("No pudimos guardar tu perfil. Revisa los datos e intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] px-6 py-12 flex justify-center">
      <div className="w-full max-w-lg">
        <p className="text-sm text-[var(--color-primario)] font-medium mb-2">Un último paso</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl mb-2">
          Cuéntanos cómo vives
        </h1>
        <p className="text-black/60 dark:text-white/60 mb-8">
          Con esto calculamos qué mascotas realmente calzan contigo — no solo por especie, sino
          por rutina real.
        </p>

        <form onSubmit={manejarEnvio} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1.5">Espacio disponible en casa</label>
            <select
              value={espacioDisponible}
              onChange={(e) => setEspacioDisponible(e.target.value as EspacioDisponible)}
              className="w-full rounded-md border border-[var(--color-borde)] px-3 py-2.5 text-sm bg-[var(--color-superficie)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
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
              className="w-full rounded-md border border-[var(--color-borde)] px-3 py-2.5 text-sm bg-[var(--color-superficie)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
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
              className="w-full rounded-md border border-[var(--color-borde)] px-3 py-2.5 text-sm bg-[var(--color-superficie)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
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

          {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-[var(--color-primario)] text-white font-semibold py-2.5 rounded-md hover:bg-[var(--color-primario-oscuro)] transition disabled:opacity-60"
          >
            {cargando ? "Guardando…" : "Ver mis recomendaciones"}
          </button>
        </form>
      </div>
    </div>
  );
}
