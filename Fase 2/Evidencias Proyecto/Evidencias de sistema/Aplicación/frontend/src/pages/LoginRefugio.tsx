import { useState, type FormEvent } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { iniciarSesion as iniciarSesionApi } from "../api/auth";
import { Spinner } from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import { REGEX_EMAIL } from "../utils/validacion";
import axios from "axios";

type Errores = Partial<Record<"email" | "password", string>>;

const MENSAJE_CREDENCIALES_INVALIDAS = "Correo institucional o contraseña inválidos.";

export default function LoginRefugio() {
  const navigate = useNavigate();
  const { usuario, cargando: cargandoSesion, iniciarSesion } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Si ya tiene sesión activa:
  if (!cargandoSesion && usuario) {
    return <Navigate to={usuario.rol === "refugio" ? "/inicio" : "/explorar"} replace />;
  }

  function validar(): boolean {
    const nuevosErrores: Errores = {};
    if (!REGEX_EMAIL.test(email.trim())) {
      nuevosErrores.email = "Ingresa un correo institucional válido.";
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

      if (resultado.usuario.rol !== "refugio") {
        setError("Esta cuenta es de adoptante. Por favor ingresa desde el acceso para adoptantes.");
        return;
      }

      iniciarSesion(resultado.access_token, resultado.usuario);
      navigate("/inicio");
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
    <div className="min-h-screen bg-[var(--color-fondo)] flex items-center py-10">
      <div className="mx-auto w-full max-w-[480px] px-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-texto-suave)] hover:text-[var(--color-primario)] transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver al portal de adoptantes
        </Link>

        <div className="rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-8 shadow-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-bold tracking-wide uppercase mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Portal Organizaciones & Refugios
          </div>

          <h1 className="text-2xl font-bold leading-tight mb-2 text-[var(--color-texto)]">
            Acceso Institucional
          </h1>
          <p className="text-sm text-[var(--color-texto-suave)] mb-6">
            Panel de administración para fundaciones y agrupaciones de rescate animal.
          </p>

          <form onSubmit={manejarEnvio} className="space-y-4">
            <div>
              <label className={claseEtiqueta} htmlFor="email">
                Correo institucional
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contacto@fundacion.cl"
                className="w-full rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] px-4 py-3 text-sm placeholder:text-[var(--color-texto-suave)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/40"
              />
              {errores.email && <p className="text-sm text-[var(--color-rojo)] mt-1">{errores.email}</p>}
            </div>

            <div>
              <label className={claseEtiqueta} htmlFor="password">
                Contraseña institucional
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={verPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] px-4 py-3 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/40"
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
              className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white hover:bg-slate-900 font-semibold py-3.5 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60 disabled:active:scale-100 shadow-sm"
            >
              {cargando && <Spinner />}
              {cargando ? "Ingresando al panel…" : "Ingresar al Panel de Gestión"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[var(--color-borde)] text-center text-xs text-[var(--color-texto-suave)]">
            ¿Tu organización aún no está en HouseFound?{" "}
            <Link to="/registro-refugio" className="font-semibold text-[var(--color-primario)] hover:underline block mt-1">
              Solicitar registro y verificación de refugio →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
