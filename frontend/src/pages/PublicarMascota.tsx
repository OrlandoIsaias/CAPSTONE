import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { agregarFoto, crearMascota } from "../api/mascotas";
import type { EspacioMinimo, MascotaInput, NivelEnergiaSocializacion } from "../types/mascotas";

export default function PublicarMascota() {
  const navigate = useNavigate();

  const [nombre, setNombre] = useState("");
  const [especie, setEspecie] = useState("");
  const [raza, setRaza] = useState("");
  const [edad, setEdad] = useState<number | "">("");
  const [nivelEnergia, setNivelEnergia] = useState<NivelEnergiaSocializacion>("medio");
  const [nivelSocializacion, setNivelSocializacion] = useState<NivelEnergiaSocializacion>("medio");
  const [compatibleNinos, setCompatibleNinos] = useState(true);
  const [compatibleOtras, setCompatibleOtras] = useState(true);
  const [experienciaRequerida, setExperienciaRequerida] = useState<NivelEnergiaSocializacion>("bajo");
  const [espacioMinimo, setEspacioMinimo] = useState<EspacioMinimo>("departamento");
  const [urlFoto, setUrlFoto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setCargando(true);

    const datos: MascotaInput = {
      nombre,
      especie: especie || undefined,
      raza: raza || undefined,
      edad: edad === "" ? undefined : edad,
      nivel_energia: nivelEnergia,
      nivel_socializacion: nivelSocializacion,
      compatible_ninos: compatibleNinos,
      compatible_otras_mascotas: compatibleOtras,
      nivel_experiencia_requerida: experienciaRequerida,
      espacio_minimo_requerido: espacioMinimo,
    };

    try {
      const mascota = await crearMascota(datos);
      if (urlFoto.trim()) {
        // Si algo falla al agregar la foto, no bloqueamos la publicación
        // de la mascota — ya quedó creada, la foto se puede agregar después.
        await agregarFoto(mascota.id, urlFoto.trim()).catch(() => {});
      }
      navigate("/mis-mascotas");
    } catch {
      setError("No pudimos publicar la mascota. Revisa los datos e intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] px-6 py-10">
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-black/50 hover:text-black mb-6"
        >
          ← Volver
        </button>

        <h1 className="font-[family-name:var(--font-display)] text-3xl mb-2">
          Publicar una mascota
        </h1>
        <p className="text-black/60 mb-8">
          Completa su ficha para que el sistema pueda calcular su compatibilidad con adoptantes.
        </p>

        <form onSubmit={manejarEnvio} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Nombre</label>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-md border border-[var(--color-borde)] px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Especie</label>
              <input
                value={especie}
                onChange={(e) => setEspecie(e.target.value)}
                placeholder="Perro, gato…"
                className="w-full rounded-md border border-[var(--color-borde)] px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Raza</label>
              <input
                value={raza}
                onChange={(e) => setRaza(e.target.value)}
                className="w-full rounded-md border border-[var(--color-borde)] px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Edad (años)</label>
            <input
              type="number"
              min={0}
              value={edad}
              onChange={(e) => setEdad(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded-md border border-[var(--color-borde)] px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nivel de energía</label>
              <select
                value={nivelEnergia}
                onChange={(e) => setNivelEnergia(e.target.value as NivelEnergiaSocializacion)}
                className="w-full rounded-md border border-[var(--color-borde)] px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
              >
                <option value="bajo">Bajo</option>
                <option value="medio">Medio</option>
                <option value="alto">Alto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Socialización</label>
              <select
                value={nivelSocializacion}
                onChange={(e) => setNivelSocializacion(e.target.value as NivelEnergiaSocializacion)}
                className="w-full rounded-md border border-[var(--color-borde)] px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
              >
                <option value="bajo">Bajo</option>
                <option value="medio">Medio</option>
                <option value="alto">Alto</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Experiencia requerida</label>
              <select
                value={experienciaRequerida}
                onChange={(e) => setExperienciaRequerida(e.target.value as NivelEnergiaSocializacion)}
                className="w-full rounded-md border border-[var(--color-borde)] px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
              >
                <option value="bajo">Bajo</option>
                <option value="medio">Medio</option>
                <option value="alto">Alto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Espacio mínimo</label>
              <select
                value={espacioMinimo}
                onChange={(e) => setEspacioMinimo(e.target.value as EspacioMinimo)}
                className="w-full rounded-md border border-[var(--color-borde)] px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
              >
                <option value="departamento">Departamento</option>
                <option value="casa_patio">Casa con patio</option>
                <option value="casa_grande">Casa grande</option>
              </select>
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={compatibleNinos}
                onChange={(e) => setCompatibleNinos(e.target.checked)}
                className="accent-[var(--color-primario)]"
              />
              Compatible con niños
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={compatibleOtras}
                onChange={(e) => setCompatibleOtras(e.target.checked)}
                className="accent-[var(--color-primario)]"
              />
              Compatible con otras mascotas
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              URL de una foto <span className="text-black/40 font-normal">(opcional por ahora)</span>
            </label>
            <input
              value={urlFoto}
              onChange={(e) => setUrlFoto(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-md border border-[var(--color-borde)] px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
            />
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-[var(--color-primario)] text-white font-semibold py-2.5 rounded-md hover:bg-[var(--color-primario-oscuro)] transition disabled:opacity-60"
          >
            {cargando ? "Publicando…" : "Publicar mascota"}
          </button>
        </form>
      </div>
    </div>
  );
}
