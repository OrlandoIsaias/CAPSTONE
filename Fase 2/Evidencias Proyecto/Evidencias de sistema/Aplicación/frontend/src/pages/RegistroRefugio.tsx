import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registrar } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { validarTelefonoCL, normalizarTelefonoCL } from "../utils/telefono";
import { REGEX_EMAIL } from "../utils/validacion";
import axios from "axios";

type Errores = Partial<Record<"nombre" | "email" | "password" | "telefono", string>>;

export default function RegistroRefugio() {
  const navigate = useNavigate();
  const { iniciarSesion } = useAuth();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  function validar(): boolean {
    const nuevosErrores: Errores = {};
    if (nombre.trim().length < 2) {
      nuevosErrores.nombre = "Ingresa el nombre oficial de la organización o refugio.";
    }
    if (!REGEX_EMAIL.test(email.trim())) {
      nuevosErrores.email = "Ingresa un correo electrónico institucional válido.";
    }
    if (!telefono.trim() || !validarTelefonoCL(telefono)) {
      nuevosErrores.telefono = "Ingresa un celular de contacto válido (+56 9 1234 5678).";
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
      const telefonoNormalizado = normalizarTelefonoCL(telefono);
      const resultado = await registrar({
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        password,
        rol: "refugio",
        telefono: telefonoNormalizado,
      });
      iniciarSesion(resultado.access_token, resultado.usuario);
      navigate("/perfil-refugio/editar");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setError("Este correo electrónico ya está registrado en la plataforma.");
      } else {
        setError("No pudimos procesar el registro institucional. Intenta de nuevo.");
      }
    } finally {
      setCargando(false);
    }
  }

  const claseEtiqueta =
    "block text-[11px] font-semibold tracking-[0.1em] uppercase text-[var(--color-texto-suave)] mb-1.5";

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] flex flex-col items-center justify-center px-4 py-12">
      {/* Volver a adoptantes */}
      <div className="w-full max-w-[480px] mb-4">
        <Link
          to="/registro"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-texto-suave)] hover:text-[var(--color-primario)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          ¿Buscas adoptar? Ir al registro de Adoptantes
        </Link>
      </div>

      {/* Tarjeta institucional */}
      <div className="w-full max-w-[480px] bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-3xl p-8 sm:p-10 shadow-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-bold tracking-wide uppercase mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Portal Organizaciones & Refugios
        </div>

        <h1 className="text-2xl font-bold leading-tight mb-1.5 text-[var(--color-texto)]">
          Registro de Organización
        </h1>
        <p className="text-xs text-[var(--color-texto-suave)] mb-6">
          Inscribe tu fundación, protectora o refugio para publicar mascotas y recibir postulaciones filtradas por compatibilidad.
        </p>

        <form onSubmit={manejarEnvio} className="space-y-4">
          <div>
            <label className={claseEtiqueta} htmlFor="nombre">
              Nombre de la Fundación o Refugio
            </label>
            <input
              id="nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Fundación Garras y Bigotes"
              className="w-full rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 px-4 py-3 text-sm placeholder:text-[var(--color-texto-suave)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/40 focus:bg-white"
            />
            {errores.nombre && (
              <p className="text-xs text-[var(--color-rojo)] mt-1">{errores.nombre}</p>
            )}
          </div>

          <div>
            <label className={claseEtiqueta} htmlFor="email">
              Correo institucional oficial
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contacto@fundacion.cl"
              className="w-full rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 px-4 py-3 text-sm placeholder:text-[var(--color-texto-suave)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/40 focus:bg-white"
            />
            {errores.email && (
              <p className="text-xs text-[var(--color-rojo)] mt-1">{errores.email}</p>
            )}
          </div>

          <div>
            <label className={claseEtiqueta} htmlFor="telefono">
              Teléfono / Celular de contacto oficial
            </label>
            <input
              id="telefono"
              type="tel"
              required
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+56 9 1234 5678"
              className="w-full rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 px-4 py-3 text-sm placeholder:text-[var(--color-texto-suave)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/40 focus:bg-white"
            />
            <p className="text-[11px] text-[var(--color-texto-suave)] mt-1">
              Se utilizará para coordinar con adoptantes preseleccionados (+56 9 XXXX XXXX).
            </p>
            {errores.telefono && (
              <p className="text-xs text-[var(--color-rojo)] mt-1">{errores.telefono}</p>
            )}
          </div>

          <div>
            <label className={claseEtiqueta} htmlFor="password">
              Contraseña de acceso
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
                className="w-full rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 px-4 py-3 pr-16 text-sm placeholder:text-[var(--color-texto-suave)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/40 focus:bg-white"
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

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-[var(--color-rojo)]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3.5 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60 disabled:active:scale-100 shadow-sm"
          >
            {cargando ? "Registrando organización…" : "Solicitar Registro Institucional"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[var(--color-borde)] text-center text-xs text-[var(--color-texto-suave)]">
          ¿Tu organización ya tiene cuenta?{" "}
          <Link to="/refugio/login" className="font-semibold text-[var(--color-primario)] hover:underline">
            Inicia sesión aquí →
          </Link>
        </div>
      </div>
    </div>
  );
}
