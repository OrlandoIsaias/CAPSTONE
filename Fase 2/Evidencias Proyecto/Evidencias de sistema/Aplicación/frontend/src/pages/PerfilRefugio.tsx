import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { guardarPerfilRefugio, obtenerPerfilRefugio } from "../api/auth";
import { Spinner } from "../components/Spinner";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { normalizarTelefonoCL, validarTelefonoCL } from "../utils/telefono";

type Errores = Partial<Record<"nombreRefugio" | "telefono", string>>;

export default function PerfilRefugio() {
  const navigate = useNavigate();
  const { cerrarSesion } = useAuth();
  const mostrarToast = useToast();

  const [nombreRefugio, setNombreRefugio] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  // null mientras no sabemos si el perfil existe: cambia el texto de la
  // pantalla entre "alta inicial" y "edición".
  const [yaExiste, setYaExiste] = useState<boolean | null>(null);
  const [errores, setErrores] = useState<Errores>({});
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

  function validar(): boolean {
    const nuevosErrores: Errores = {};
    if (nombreRefugio.trim().length < 2) {
      nuevosErrores.nombreRefugio = "Ingresa el nombre del refugio.";
    }
    if (!validarTelefonoCL(telefono)) {
      nuevosErrores.telefono = "Ingresa un celular chileno válido, ej: +56 9 1234 5678.";
    }
    setErrores(nuevosErrores);
    return Object.values(nuevosErrores).every((v) => !v);
  }

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();

    if (!validar()) return;

    setCargando(true);
    try {
      await guardarPerfilRefugio({
        nombre_refugio: nombreRefugio.trim(),
        direccion: direccion || undefined,
        telefono_contacto: normalizarTelefonoCL(telefono),
      });
      if (yaExiste) {
        mostrarToast("Cambios guardados");
      } else {
        navigate("/inicio");
      }
    } catch {
      mostrarToast("No pudimos guardar el perfil. Intenta de nuevo.", "error");
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
          <button
            onClick={() => navigate(-1)}
            aria-label="Volver"
            className="w-10 h-10 rounded-full bg-[var(--color-superficie-apagada)] flex items-center justify-center shrink-0 active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 5-7 7 7 7" />
            </svg>
          </button>
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
            {errores.nombreRefugio && (
              <p className="text-sm text-[var(--color-rojo)] mt-1">{errores.nombreRefugio}</p>
            )}
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
              placeholder="+56 9 1234 5678"
              className={claseCampo}
            />
            <p className="text-xs text-[var(--color-texto-suave)] mt-1">
              Se comparte con el adoptante cuando apruebas su solicitud, para coordinar la
              entrega.
            </p>
            {errores.telefono && (
              <p className="text-sm text-[var(--color-rojo)] mt-1">{errores.telefono}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full flex items-center justify-center gap-2 bg-[var(--color-primario)] text-white font-semibold py-3.5 rounded-xl hover:bg-[var(--color-primario-oscuro)] active:scale-[0.98] transition-transform disabled:opacity-60 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2"
          >
            {cargando && <Spinner />}
            {cargando ? "Guardando…" : yaExiste ? "Guardar cambios" : "Continuar"}
          </button>
        </form>

        <button
          onClick={cerrarSesion}
          className="w-full mt-3 py-3.5 rounded-xl font-semibold text-[var(--color-texto-suave)] active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
