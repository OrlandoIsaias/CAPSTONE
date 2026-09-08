import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { registrar } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import type { Rol } from "../types/auth";
import axios from "axios";

export default function Registro() {
  const navigate = useNavigate();
  const { iniciarSesion } = useAuth();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<Rol>("adoptante");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const resultado = await registrar({ nombre, email, password, rol });
      iniciarSesion(resultado.access_token, resultado.usuario);
      navigate(rol === "adoptante" ? "/perfil-adoptante" : "/perfil-refugio");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setError("Ese email ya está registrado.");
      } else {
        setError("No pudimos crear tu cuenta. Intenta de nuevo.");
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <AuthLayout
      titulo="Encuentra a quien ya te estaba esperando"
      subtitulo="Un cuestionario breve, y te mostramos las mascotas que de verdad calzan con tu día a día."
    >
      <h2 className="font-[family-name:var(--font-display)] text-2xl mb-1">Crea tu cuenta</h2>
      <p className="text-sm text-black/60 dark:text-white/60 mb-6">
        ¿Ya tienes una?{" "}
        <Link to="/login" className="text-[var(--color-primario)] font-medium">
          Inicia sesión
        </Link>
      </p>

      <div className="grid grid-cols-2 gap-2 mb-6">
        <button
          type="button"
          onClick={() => setRol("adoptante")}
          className={`py-2.5 rounded-md text-sm font-medium border transition-colors ${
            rol === "adoptante"
              ? "bg-[var(--color-primario)] text-white border-[var(--color-primario)]"
              : "border-[var(--color-borde)] text-black/70"
          }`}
        >
          Quiero adoptar
        </button>
        <button
          type="button"
          onClick={() => setRol("refugio")}
          className={`py-2.5 rounded-md text-sm font-medium border transition-colors ${
            rol === "refugio"
              ? "bg-[var(--color-primario)] text-white border-[var(--color-primario)]"
              : "border-[var(--color-borde)] text-black/70"
          }`}
        >
          Soy un refugio
        </button>
      </div>

      <form onSubmit={manejarEnvio} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="nombre">
            {rol === "refugio" ? "Nombre de contacto" : "Nombre"}
          </label>
          <input
            id="nombre"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-md border border-[var(--color-borde)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
          />
        </div>

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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-[var(--color-borde)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
          />
        </div>

        {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-[var(--color-acento)] text-[var(--color-texto)] font-semibold py-2.5 rounded-md hover:brightness-95 transition disabled:opacity-60"
        >
          {cargando ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>
    </AuthLayout>
  );
}
