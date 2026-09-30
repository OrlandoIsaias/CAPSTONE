import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { iniciarSesion as iniciarSesionApi } from "../../api/auth";
import { Spinner } from "../Spinner";
import { useAuth } from "../../context/AuthContext";
import { REGEX_EMAIL } from "../../utils/validacion";

type Errores = Partial<Record<"email" | "password", string>>;

// Un solo mensaje para correo inexistente o contraseña incorrecta, para no
// confirmar qué correos están registrados. El aviso de portal equivocado (403)
// solo aparece con la contraseña correcta.
const MENSAJE_CREDENCIALES_INVALIDAS = "Correo o contraseña inválidos.";

const claseEtiqueta =
  "block text-[11px] font-semibold tracking-[0.1em] uppercase text-[var(--color-texto-suave)] mb-1.5";
const claseInput =
  "w-full rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 px-4 py-3 text-sm placeholder:text-[var(--color-texto-suave)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/40 focus:bg-white";

export default function FormularioLoginAdoptante() {
  const navigate = useNavigate();
  const { iniciarSesion } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  function validar(): boolean {
    const nuevosErrores: Errores = {};
    if (!REGEX_EMAIL.test(email.trim())) nuevosErrores.email = "Ingresa un correo válido.";
    if (!password) nuevosErrores.password = "Ingresa tu contraseña.";
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    if (!validar()) return;

    setCargando(true);
    try {
      const resultado = await iniciarSesionApi({ email, password, rol: "adoptante" });
      iniciarSesion(resultado.access_token, resultado.usuario);
      navigate("/explorar");
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status === 403) {
        setError("Esta cuenta pertenece a un refugio. Ingresa desde la pestaña Refugio.");
      } else if (status === 429) {
        const detalle = axios.isAxiosError(err) ? err.response?.data?.detail : undefined;
        setError(typeof detalle === "string" ? detalle : "Demasiados intentos. Intenta de nuevo más tarde.");
      } else if (status === 401) {
        setError(MENSAJE_CREDENCIALES_INVALIDAS);
      } else {
        setError("No pudimos iniciar sesión. Intenta de nuevo.");
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-3xl font-bold leading-tight mb-1.5 text-[var(--color-texto)]">Inicia sesión</h2>
        <p className="text-[var(--color-texto-suave)]">
          Encuentra a tu compañero ideal y sigue tus postulaciones.
        </p>
      </div>

      <form onSubmit={manejarEnvio} className="space-y-4">
        <div>
          <label className={claseEtiqueta} htmlFor="email-adoptante">
            Correo electrónico
          </label>
          <input
            id="email-adoptante"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className={claseInput}
          />
          {errores.email && <p className="text-sm text-[var(--color-rojo)] mt-1">{errores.email}</p>}
        </div>

        <div>
          <label className={claseEtiqueta} htmlFor="password-adoptante">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password-adoptante"
              type={verPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${claseInput} pr-16`}
            />
            <button
              type="button"
              onClick={() => setVerPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--color-primario)]"
            >
              {verPassword ? "Ocultar" : "Ver"}
            </button>
          </div>
          {errores.password && <p className="text-sm text-[var(--color-rojo)] mt-1">{errores.password}</p>}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-[var(--color-rojo)]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="w-full flex items-center justify-center gap-2 bg-[var(--color-primario)] text-white font-semibold py-3.5 rounded-xl hover:bg-[var(--color-primario-oscuro)] active:scale-[0.98] transition-transform disabled:opacity-60 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2 shadow-sm"
        >
          {cargando && <Spinner />}
          {cargando ? "Ingresando…" : "Entrar como Adoptante"}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--color-texto-suave)] mt-6">
        ¿Aún no tienes cuenta?{" "}
        <Link to="/registro" className="font-semibold text-[var(--color-primario)] hover:underline">
          Crear cuenta de adoptante
        </Link>
      </p>
    </>
  );
}
