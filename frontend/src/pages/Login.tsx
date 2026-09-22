import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { iniciarSesion as iniciarSesionApi } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import type { Rol } from "../types/auth";
import axios from "axios";

export default function Login() {
  const navigate = useNavigate();
  const { iniciarSesion } = useAuth();

  const [rol, setRol] = useState<Rol>("refugio");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const resultado = await iniciarSesionApi({ email, password });

      // El rol real lo define la cuenta, no el selector. Si no coinciden lo
      // decimos en vez de mandar al usuario a una sección que no le toca.
      if (resultado.usuario.rol !== rol) {
        setError(
          `Esta cuenta está registrada como ${resultado.usuario.rol}. Cambia la opción de arriba para entrar.`
        );
        return;
      }

      iniciarSesion(resultado.access_token, resultado.usuario);
      navigate(resultado.usuario.rol === "adoptante" ? "/recomendaciones" : "/inicio");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError("Email o contraseña incorrectos.");
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
          </div>

          {error && <p className="text-sm text-[var(--color-rojo)]">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-[var(--color-primario)] text-white font-semibold py-3.5 rounded-xl hover:bg-[var(--color-primario-oscuro)] transition-colors disabled:opacity-60"
          >
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
