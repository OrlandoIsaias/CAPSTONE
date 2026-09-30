import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registrar } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { REGEX_SOLO_LETRAS } from "../utils/validacion";
import type { Rol } from "../types/auth";
import axios from "axios";

type Errores = Partial<Record<"nombre" | "password", string>>;

export default function Registro() {
  const navigate = useNavigate();
  const { iniciarSesion } = useAuth();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [rol, setRol] = useState<Rol>("refugio");
  const [errores, setErrores] = useState<Errores>({});
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  function validar(): boolean {
    const nuevosErrores: Errores = {};
    if (!REGEX_SOLO_LETRAS.test(nombre.trim())) {
      nuevosErrores.nombre = "Solo letras, mínimo 2 caracteres, sin números ni símbolos.";
    }
    if (password.length < 6) {
      nuevosErrores.password = "La contraseña debe tener al menos 6 caracteres.";
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

  const claseEtiqueta =
    "block text-[11px] font-semibold tracking-[0.1em] uppercase text-[var(--color-texto-suave)] mb-1.5";

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] flex items-center">
      <div className="mx-auto w-full max-w-[480px] px-6 py-10">

        {/* Logo / marca grande y en negro */}
        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-black text-slate-900 mb-6 tracking-tight">
          HouseFound
        </h1>

        {/* Encabezado */}
        <h2 className="text-3xl font-bold leading-tight mb-1.5">Crea tu cuenta</h2>
        <p className="text-[var(--color-texto-suave)] mb-7">
          ¿Ya tienes una?{" "}
          <Link to="/login" className="font-semibold text-[var(--color-primario)]">
            Inicia sesión
          </Link>
        </p>

        {/* Selector de rol idéntico al Login */}
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

        {/* Formulario */}
        <form onSubmit={manejarEnvio} className="space-y-4">
          <div>
            <label className={claseEtiqueta} htmlFor="nombre">
              {rol === "refugio" ? "Nombre de contacto" : "Nombre"}
            </label>
            <input
              id="nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={rol === "refugio" ? "Nombre del responsable" : "Tu nombre"}
              className="w-full rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] px-4 py-3 text-sm placeholder:text-[var(--color-texto-suave)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/40"
            />
            {errores.nombre && (
              <p className="text-xs text-[var(--color-rojo)] mt-1">{errores.nombre}</p>
            )}
          </div>

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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] px-4 py-3 pr-16 text-sm placeholder:text-[var(--color-texto-suave)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/40"
              />
              <button
                type="button"
                onClick={() => setVerPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--color-primario)]"
              >
                {verPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
            {errores.password && (
              <p className="text-xs text-[var(--color-rojo)] mt-1">{errores.password}</p>
            )}
          </div>

          {error && <p className="text-sm text-[var(--color-rojo)]">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-[var(--color-primario)] text-white font-semibold py-3.5 rounded-xl hover:bg-[var(--color-primario-oscuro)] transition-colors disabled:opacity-60"
          >
            {cargando ? "Creando cuenta…" : `Crear cuenta como ${rol}`}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--color-texto-suave)] mt-6">
          Al registrarte aceptas usar la plataforma de forma responsable.
        </p>
      </div>
    </div>
  );
}
