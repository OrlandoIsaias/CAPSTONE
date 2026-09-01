import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { iniciarSesion as iniciarSesionApi } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

export default function Login() {
  const navigate = useNavigate();
  const { iniciarSesion } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const resultado = await iniciarSesionApi({ email, password });
      iniciarSesion(resultado.access_token, resultado.usuario);
      navigate(resultado.usuario.rol === "adoptante" ? "/recomendaciones" : "/mis-mascotas");
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

  return (
    <AuthLayout
      titulo="Bienvenido de vuelta"
      subtitulo="Sigue viendo las mascotas que más se ajustan a tu estilo de vida."
    >
      <h2 className="font-[family-name:var(--font-display)] text-2xl mb-1">Inicia sesión</h2>
      <p className="text-sm text-black/60 mb-6">
        ¿Aún no tienes cuenta?{" "}
        <Link to="/registro" className="text-[var(--color-primario)] font-medium">
          Regístrate
        </Link>
      </p>

      <form onSubmit={manejarEnvio} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-[var(--color-borde)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-[var(--color-borde)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
          />
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-[var(--color-acento)] text-[var(--color-texto)] font-semibold py-2.5 rounded-md hover:brightness-95 transition disabled:opacity-60"
        >
          {cargando ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </AuthLayout>
  );
}
