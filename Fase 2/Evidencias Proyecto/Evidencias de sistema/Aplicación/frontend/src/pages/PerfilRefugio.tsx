import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { guardarPerfilRefugio, obtenerPerfilRefugio } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function PerfilRefugio() {
  const navigate = useNavigate();
  const { cerrarSesion } = useAuth();

  const [nombreRefugio, setNombreRefugio] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  // null mientras no sabemos si el perfil existe: cambia el texto de la
  // pantalla entre "alta inicial" y "edición".
  const [yaExiste, setYaExiste] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    obtenerPerfilRefugio()
      .then((p) => {
        setNombreRefugio(p.nombre_refugio);
        setDireccion(p.direccion ?? "");
        setTelefono(p.telefono_contacto ?? "");
        setYaExiste(true);
      })
      // 404 = todavía no lo completa; es el flujo normal tras registrarse
      .catch(() => setYaExiste(false));
  }, []);

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setGuardado(false);
    setCargando(true);
    try {
      await guardarPerfilRefugio({
        nombre_refugio: nombreRefugio,
        direccion: direccion || undefined,
        telefono_contacto: telefono || undefined,
      });
      if (yaExiste) {
        setGuardado(true);
        setTimeout(() => setGuardado(false), 2500);
      } else {
        navigate("/inicio");
      }
    } catch {
      setError("No pudimos guardar el perfil. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  const claseCampo =
    "w-full rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/40";
  const claseEtiqueta =
    "block text-[11px] font-semibold tracking-[0.1em] uppercase text-[var(--color-texto-suave)] mb-1.5";

  return (
    <div className="min-h-screen bg-[var(--color-fondo)]">
      <div className="mx-auto w-full max-w-[480px] px-5 py-8">
        <header className="flex items-start justify-between gap-3 mb-7">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--color-primario)] uppercase mb-1">
              {yaExiste ? "Tu refugio" : "Un último paso"}
            </p>
            <h1 className="text-2xl font-bold leading-tight">
              {yaExiste ? "Datos del refugio" : "Cuéntanos sobre tu refugio"}
            </h1>
            <p className="text-sm text-[var(--color-texto-suave)] mt-1.5">
              Esta información acompaña a cada mascota que publiques.
            </p>
          </div>
          {yaExiste && (
            <button
              onClick={() => navigate("/inicio")}
              aria-label="Volver"
              className="w-10 h-10 rounded-full bg-[var(--color-superficie-apagada)] flex items-center justify-center shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 5-7 7 7 7" />
              </svg>
            </button>
          )}
        </header>

        <form onSubmit={manejarEnvio} className="space-y-4">
          <div>
            <label className={claseEtiqueta}>Nombre del refugio</label>
            <input
              required
              value={nombreRefugio}
              onChange={(e) => setNombreRefugio(e.target.value)}
              placeholder="Huellitas Felices"
              className={claseCampo}
            />
          </div>

          <div>
            <label className={claseEtiqueta}>Dirección</label>
            <input
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Opcional"
              className={claseCampo}
            />
          </div>

          <div>
            <label className={claseEtiqueta}>Teléfono de contacto</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Opcional"
              className={claseCampo}
            />
          </div>

          {error && <p className="text-sm text-[var(--color-rojo)]">{error}</p>}
          {guardado && (
            <p className="text-sm font-medium text-[var(--color-verde)]">Cambios guardados.</p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-[var(--color-primario)] text-white font-semibold py-3.5 rounded-xl hover:bg-[var(--color-primario-oscuro)] transition-colors disabled:opacity-60"
          >
            {cargando ? "Guardando…" : yaExiste ? "Guardar cambios" : "Continuar"}
          </button>
        </form>

        {yaExiste && (
          <button
            onClick={cerrarSesion}
            className="w-full mt-3 py-3.5 rounded-xl font-semibold text-[var(--color-texto-suave)]"
          >
            Cerrar sesión
          </button>
        )}
      </div>
    </div>
  );
}
