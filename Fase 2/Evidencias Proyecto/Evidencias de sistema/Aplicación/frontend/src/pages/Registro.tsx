import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registrar } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { REGEX_SOLO_LETRAS } from "../utils/validacion";
import { validarTelefonoCL, normalizarTelefonoCL } from "../utils/telefono";
import axios from "axios";

type Errores = Partial<Record<"nombre" | "password" | "telefono", string>>;

export default function Registro() {
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
    if (!REGEX_SOLO_LETRAS.test(nombre.trim())) {
      nuevosErrores.nombre = "Solo letras, mínimo 2 caracteres, sin números ni símbolos.";
    }
    if (telefono.trim() && !validarTelefonoCL(telefono)) {
      nuevosErrores.telefono = "Ingresa un celular chileno válido (+56 9 1234 5678).";
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
      const telefonoNormalizado = telefono.trim() ? normalizarTelefonoCL(telefono) : undefined;
      const resultado = await registrar({
        nombre,
        email,
        password,
        rol: "adoptante",
        telefono: telefonoNormalizado,
      });
      iniciarSesion(resultado.access_token, resultado.usuario);
      try {
        sessionStorage.setItem("housefound_mostrar_tutorial_registro", "1");
      } catch {}
      navigate("/perfil-adoptante/editar", { state: { recienRegistrado: true } });
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

      {/* Tarjeta / Cuadrado estilizado */}
      <div className="w-full max-w-[480px] bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-3xl p-8 sm:p-10 shadow-sm">
        {/* Encabezado */}
        <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[var(--color-primario)] mb-2">
          Portal Adoptantes
        </p>
        <h2 className="text-3xl font-bold leading-tight mb-1.5 text-[var(--color-texto)]">Crea tu cuenta</h2>
        <p className="text-[var(--color-texto-suave)] mb-7">
          ¿Ya tienes una?{" "}
          <Link to="/login/adoptante" className="font-semibold text-[var(--color-primario)] hover:underline">
            Inicia sesión
          </Link>
        </p>

        {/* Formulario */}
        <form onSubmit={manejarEnvio} className="space-y-4">
          <div>
            <label className={claseEtiqueta} htmlFor="nombre">
              Nombre completo
            </label>
            <input
              id="nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre y apellido"
              className="w-full rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 px-4 py-3 text-sm placeholder:text-[var(--color-texto-suave)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/40 focus:bg-white"
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
              className="w-full rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 px-4 py-3 text-sm placeholder:text-[var(--color-texto-suave)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/40 focus:bg-white"
            />
          </div>

          <div>
            <label className={claseEtiqueta} htmlFor="telefono">
              Teléfono celular
            </label>
            <input
              id="telefono"
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+56 9 1234 5678"
              className="w-full rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 px-4 py-3 text-sm placeholder:text-[var(--color-texto-suave)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/40 focus:bg-white"
            />
            <p className="text-[11px] text-[var(--color-texto-suave)] mt-1">
              Estructura: <span className="font-medium text-slate-700">+56 9 XXXX XXXX</span> (9 dígitos)
            </p>
            {errores.telefono && (
              <p className="text-xs text-[var(--color-rojo)] mt-1">{errores.telefono}</p>
            )}
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

          {error && <p className="text-sm text-[var(--color-rojo)]">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-[var(--color-primario)] text-white font-semibold py-3.5 rounded-xl hover:bg-[var(--color-primario-oscuro)] active:scale-[0.98] transition-transform disabled:opacity-60 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2"
          >
            {cargando ? "Creando cuenta..." : "Crear cuenta de Adoptante"}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--color-texto-suave)] mt-6">
          Al registrarte aceptas usar la plataforma de forma responsable.
        </p>
      </div>
    </div>
  );
}
