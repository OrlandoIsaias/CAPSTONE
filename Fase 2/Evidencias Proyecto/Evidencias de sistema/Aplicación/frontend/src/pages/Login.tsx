import { useState, type FormEvent } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { iniciarSesion as iniciarSesionApi } from "../api/auth";
import { Spinner } from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import { REGEX_EMAIL } from "../utils/validacion";
import axios from "axios";

type Errores = Partial<Record<"email" | "password", string>>;

// Un solo mensaje para correo inexistente, contraseña incorrecta o rol
// equivocado — nunca decimos cuál de los tres fue. Diferenciarlos le
// confirma a quien esté probando credenciales que el correo existe (y, si
// distinguiéramos el rol, hasta qué tipo de cuenta es), incluso cuando el
// backend ya responde igual para los dos primeros casos.
const MENSAJE_CREDENCIALES_INVALIDAS = "Correo o contraseña inválidos.";

export default function Login() {
  const navigate = useNavigate();
  const { usuario, cargando: cargandoSesion, iniciarSesion } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  if (!cargandoSesion && usuario) {
    return <Navigate to={usuario.rol === "adoptante" ? "/explorar" : "/inicio"} replace />;
  }

  function validar(): boolean {
    const nuevosErrores: Errores = {};
    if (!REGEX_EMAIL.test(email.trim())) {
      nuevosErrores.email = "Ingresa un correo válido.";
    }
    if (!password) {
      nuevosErrores.password = "Ingresa tu contraseña.";
    }
    setErrores(nuevosErrores);
    return Object.values(nuevosErrores).every((v) => !v);
  }

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();
    setError(null);

    if (!validar()) return;

    setCargando(true);
    try {
      const resultado = await iniciarSesionApi({ email, password });

      if (resultado.usuario.rol !== "adoptante") {
        setError("Esta cuenta pertenece a una organización. Ingresa desde el Portal Organizaciones.");
        return;
      }

      iniciarSesion(resultado.access_token, resultado.usuario);
      navigate("/explorar");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        setError(
          typeof err.response.data?.detail === "string"
            ? err.response.data.detail
            : "Demasiados intentos. Intenta de nuevo más tarde."
        );
      } else if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError(MENSAJE_CREDENCIALES_INVALIDAS);
      } else {
        setError("No pudimos iniciar sesión. Intenta de nuevo.");
      }
    } finally {
      setCargando(false);
    }
  }

  const claseEtiqueta =
    "block text-[11px] font-semibold tracking-[0.1em] uppercase text-[var(--color-texto-suave)] mb-1.5";

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo e Isotipo HouseFound */}
      <div className="w-full max-w-[480px] mb-8 flex flex-col items-center justify-center text-center">
        <img
          src="/img/logo.png"
          alt="HouseFound"
          className="w-28 h-28 sm:w-32 sm:h-32 object-contain mb-3 drop-shadow-md transition-transform hover:scale-105 duration-200"
        />
        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-black text-[var(--color-texto)] tracking-tight">
          HouseFound
        </h1>
      </div>

      <div className="w-full max-w-[480px] bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-3xl p-8 sm:p-10 shadow-sm">
        <div className="mb-6">
          <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[var(--color-primario)] mb-2">
            Portal Adoptantes
          </p>
          <h2 className="text-3xl font-bold leading-tight mb-1.5 text-[var(--color-texto)]">Inicia sesión</h2>
          <p className="text-[var(--color-texto-suave)]">
            Encuentra a tu compañero ideal y sigue tus postulaciones.
          </p>
        </div>

        <form onSubmit={manejarEnvio} className="space-y-4">
          <div>
            <label className={claseEtiqueta} htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 px-4 py-3 text-sm placeholder:text-[var(--color-texto-suave)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/40 focus:bg-white"
            />
            {errores.email && <p className="text-sm text-[var(--color-rojo)] mt-1">{errores.email}</p>}
          </div>

          <div>
            <label className={claseEtiqueta} htmlFor="password">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={verPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 px-4 py-3 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/40 focus:bg-white"
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

        {/* Separador y tarjeta exclusiva para Organizaciones / Refugios */}
        <div className="mt-8 pt-6 border-t border-[var(--color-borde)]">
          <div className="rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5 text-center shadow-sm">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--color-primario)]/10 text-[var(--color-primario)] mb-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-[var(--color-texto)] mb-1">
              ¿Eres una Fundación o Refugio?
            </h2>
            <p className="text-xs text-[var(--color-texto-suave)] mb-4">
              Accede al portal de gestión institucional para publicar animales y revisar postulaciones.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                to="/refugio/login"
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[var(--color-superficie-apagada)] text-[var(--color-texto)] hover:bg-[var(--color-borde)] transition-colors"
              >
                Ingreso Refugios
              </Link>
              <Link
                to="/registro-refugio"
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--color-primario)] border border-[var(--color-primario)]/30 hover:bg-[var(--color-primario)]/10 transition-colors"
              >
                Solicitar Registro Institucional
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
