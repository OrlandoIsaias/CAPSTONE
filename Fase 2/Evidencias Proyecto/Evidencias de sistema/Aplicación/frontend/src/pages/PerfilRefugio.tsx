import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { guardarPerfilRefugio } from "../api/auth";

export default function PerfilRefugio() {
  const navigate = useNavigate();

  const [nombreRefugio, setNombreRefugio] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await guardarPerfilRefugio({
        nombre_refugio: nombreRefugio,
        direccion: direccion || undefined,
        telefono_contacto: telefono || undefined,
      });
      navigate("/mis-mascotas");
    } catch {
      setError("No pudimos guardar el perfil. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] px-6 py-12 flex justify-center">
      <div className="w-full max-w-lg">
        <p className="text-sm text-[var(--color-primario)] font-medium mb-2">Un último paso</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl mb-2">
          Cuéntanos sobre tu refugio
        </h1>
        <p className="text-black/60 dark:text-white/60 mb-8">
          Esta información aparece en cada mascota que publiques.
        </p>

        <form onSubmit={manejarEnvio} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Nombre del refugio</label>
            <input
              required
              value={nombreRefugio}
              onChange={(e) => setNombreRefugio(e.target.value)}
              className="w-full rounded-md border border-[var(--color-borde)] px-3 py-2.5 text-sm bg-[var(--color-superficie)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Dirección (opcional)</label>
            <input
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="w-full rounded-md border border-[var(--color-borde)] px-3 py-2.5 text-sm bg-[var(--color-superficie)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Teléfono de contacto (opcional)</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full rounded-md border border-[var(--color-borde)] px-3 py-2.5 text-sm bg-[var(--color-superficie)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
            />
          </div>

          {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-[var(--color-primario)] text-white font-semibold py-2.5 rounded-md hover:bg-[var(--color-primario-oscuro)] transition disabled:opacity-60"
          >
            {cargando ? "Guardando…" : "Continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}
