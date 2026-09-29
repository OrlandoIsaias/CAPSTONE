import { useState, type FormEvent } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { iniciarSesion as iniciarSesionApi } from "../api/auth";
import { Spinner } from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import { REGEX_EMAIL } from "../utils/validacion";
import type { Rol } from "../types/auth";
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
  // cargando (de useAuth) = todavía revisando si hay una sesión guardada en
  // localStorage; se renombra para no chocar con el "cargando" propio del
  // envío del formulario, más abajo.
  const { usuario, cargando: cargandoSesion, iniciarSesion } = useAuth();

  const [rol, setRol] = useState<Rol>("refugio");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Ya hay una sesión activa (token guardado y válido) — no tiene sentido
  // mostrar el formulario de login de nuevo. Se manda directo al panel que
  // corresponde según el rol REAL de la cuenta (no un selector que ni se
  // llegó a tocar), igual que hace RutaProtegida en el resto de la app.
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

      // El rol real lo define la cuenta, no el selector. Si no coinciden,
      // usamos el mismo mensaje genérico que credenciales incorrectas —
      // ver MENSAJE_CREDENCIALES_INVALIDAS arriba.
      if (resultado.usuario.rol !== rol) {
        setError(MENSAJE_CREDENCIALES_INVALIDAS);
        return;
      }

      iniciarSesion(resultado.access_token, resultado.usuario);
      navigate(resultado.usuario.rol === "adoptante" ? "/explorar" : "/inicio");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        // Límite de intentos: acá sí mostramos el detalle del servidor
        // (cuántos minutos faltan) — a esta altura ya no hay nada que
        // ocultar, cinco intentos fallidos seguidos es señal suficiente.
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
    <div className="min-h-screen bg-[var(--color-fondo)] flex items-center">
      <div className="mx-auto w-full max-w-[480px] px-6 py-10">
        <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[var(--color-primario)] mb-2">
          Bienvenido de vuelta
        </p>
        <h1 className="text-3xl font-bold leading-tight mb-1.5">Inicia sesión</h1>
        <p className="text-[var(--color-texto-suave)] mb-7">Sigamos creando finales felices.</p>

        <div className="flex p-1 rounded-2xl bg-[var(--color-superficie-apagada)] mb-7">
          {(["refugio", "adoptante"] as Rol[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRol(r)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-colors ${
                rol === r
                  ? "bg-[var(--color-superficie)] text-[var(--color-texto)] shadow-sm"
                  : "text-[var(--color-texto-suave)]"
              }`}
            >
              {r}
            </button>
          ))}
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
              className="w-full rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] px-4 py-3 text-sm placeholder:text-[var(--color-texto-suave)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/40"
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
                className="w-full rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] px-4 py-3 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/40"
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

          {error && <p className="text-sm text-[var(--color-rojo)]">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full flex items-center justify-center gap-2 bg-[var(--color-primario)] text-white font-semibold py-3.5 rounded-xl hover:bg-[var(--color-primario-oscuro)] active:scale-[0.98] transition-transform disabled:opacity-60 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2"
          >
            {cargando && <Spinner />}
            {cargando ? "Ingresando…" : `Entrar como ${rol}`}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--color-texto-suave)] mt-6">
          ¿Aún no tienes cuenta?{" "}
          <Link to="/registro" className="font-semibold text-[var(--color-primario)]">
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
