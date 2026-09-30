import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { solicitarCodigoRefugio, verificarCodigoRefugio } from "../../api/auth";
import { Spinner } from "../Spinner";
import { useAuth } from "../../context/AuthContext";
import { formatearRut, limpiarRut, validarRut } from "../../utils/rut";

const claseEtiqueta =
  "block text-[11px] font-semibold tracking-[0.1em] uppercase text-[var(--color-texto-suave)] mb-1.5";
const claseInput =
  "w-full rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 px-4 py-3 text-sm placeholder:text-[var(--color-texto-suave)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/40 focus:bg-white";
const claseBotonPrincipal =
  "w-full flex items-center justify-center gap-2 bg-slate-800 text-white hover:bg-slate-900 font-semibold py-3.5 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60 disabled:active:scale-100 shadow-sm";
const claseBotonTexto =
  "text-sm font-semibold text-[var(--color-primario)] hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed";

function mensajeDeError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detalle = err.response?.data?.detail;
    if (typeof detalle === "string") return detalle;
    if (err.response?.status === 422) return "Revisa los datos ingresados.";
  }
  return "No pudimos completar la solicitud. Intenta de nuevo.";
}

export default function FormularioLoginRefugio() {
  const navigate = useNavigate();
  const { iniciarSesion } = useAuth();

  const [paso, setPaso] = useState<"rut" | "codigo">("rut");
  const [rut, setRut] = useState("");
  const [errorRut, setErrorRut] = useState<string | null>(null);
  const [correoEnmascarado, setCorreoEnmascarado] = useState("");
  const [codigo, setCodigo] = useState("");
  const [segundosReenvio, setSegundosReenvio] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const inputCodigo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (segundosReenvio <= 0) return;
    const temporizador = setTimeout(() => setSegundosReenvio((s) => s - 1), 1000);
    return () => clearTimeout(temporizador);
  }, [segundosReenvio]);

  useEffect(() => {
    if (paso === "codigo") inputCodigo.current?.focus();
  }, [paso]);

  async function enviarCodigo(): Promise<boolean> {
    setError(null);
    setAviso(null);
    setCargando(true);
    try {
      const respuesta = await solicitarCodigoRefugio(limpiarRut(rut));
      setCorreoEnmascarado(respuesta.correo_enmascarado);
      setSegundosReenvio(respuesta.reenviar_en_segundos);
      return true;
    } catch (err) {
      setError(mensajeDeError(err));
      return false;
    } finally {
      setCargando(false);
    }
  }

  async function manejarEnvioRut(evento: FormEvent) {
    evento.preventDefault();
    if (!validarRut(rut)) {
      setErrorRut("Ingresa un RUT válido, ej: 65.196.644-2");
      return;
    }
    setErrorRut(null);
    if (await enviarCodigo()) {
      setCodigo("");
      setPaso("codigo");
    }
  }

  async function reenviar() {
    if (await enviarCodigo()) {
      setCodigo("");
      setAviso("Te enviamos un código nuevo.");
      inputCodigo.current?.focus();
    }
  }

  async function verificar(valor: string) {
    setError(null);
    setAviso(null);
    setCargando(true);
    try {
      const resultado = await verificarCodigoRefugio(limpiarRut(rut), valor);
      iniciarSesion(resultado.access_token, resultado.usuario);
      navigate("/inicio");
    } catch (err) {
      setError(mensajeDeError(err));
      setCodigo("");
      inputCodigo.current?.focus();
    } finally {
      setCargando(false);
    }
  }

  function manejarCambioCodigo(valor: string) {
    const digitos = valor.replace(/\D/g, "").slice(0, 6);
    setCodigo(digitos);
    if (digitos.length === 6 && !cargando) verificar(digitos);
  }

  function cambiarRut() {
    setPaso("rut");
    setCodigo("");
    setError(null);
    setAviso(null);
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-3xl font-bold leading-tight mb-1.5 text-[var(--color-texto)]">Acceso Institucional</h2>
        <p className="text-[var(--color-texto-suave)]">
          {paso === "rut"
            ? "Ingresa el RUT de tu organización y te enviaremos un código de acceso."
            : "Revisa el correo registrado de tu organización."}
        </p>
      </div>

      {paso === "rut" ? (
        <form onSubmit={manejarEnvioRut} className="space-y-4" noValidate>
          <div>
            <label className={claseEtiqueta} htmlFor="rut-refugio">
              RUT de la organización
            </label>
            <input
              id="rut-refugio"
              inputMode="text"
              autoComplete="off"
              value={rut}
              onChange={(e) => {
                setRut(formatearRut(e.target.value));
                setErrorRut(null);
              }}
              placeholder="65.196.644-2"
              maxLength={12}
              aria-invalid={errorRut ? true : undefined}
              className={claseInput}
            />
            {errorRut && <p className="text-sm text-[var(--color-rojo)] mt-1">{errorRut}</p>}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-[var(--color-rojo)]">
              {error}
            </div>
          )}

          <button type="submit" disabled={cargando} className={claseBotonPrincipal}>
            {cargando && <Spinner />}
            {cargando ? "Enviando código…" : "Enviar código"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (codigo.length === 6) verificar(codigo);
          }}
          className="space-y-4"
          noValidate
        >
          <p className="text-sm text-[var(--color-texto)]">
            Enviamos un código de 6 dígitos a <span className="font-semibold">{correoEnmascarado}</span>{" "}
            para <span className="font-semibold">{rut}</span>.
          </p>

          <div>
            <label className={claseEtiqueta} htmlFor="codigo-refugio">
              Código de verificación
            </label>
            <input
              id="codigo-refugio"
              ref={inputCodigo}
              inputMode="numeric"
              autoComplete="one-time-code"
              value={codigo}
              onChange={(e) => manejarCambioCodigo(e.target.value)}
              placeholder="••••••"
              maxLength={6}
              disabled={cargando}
              className={`${claseInput} text-center text-2xl font-bold tracking-[0.6em] py-4`}
            />
          </div>

          {aviso && !error && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-700">
              {aviso}
            </div>
          )}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-[var(--color-rojo)]">
              {error}
            </div>
          )}

          <button type="submit" disabled={cargando || codigo.length !== 6} className={claseBotonPrincipal}>
            {cargando && <Spinner />}
            {cargando ? "Verificando…" : "Entrar al panel"}
          </button>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[var(--color-texto-suave)]">
              ¿No es tu organización?{" "}
              <button type="button" onClick={cambiarRut} disabled={cargando} className={claseBotonTexto}>
                Volver
              </button>
            </p>
            <button
              type="button"
              onClick={reenviar}
              disabled={cargando || segundosReenvio > 0}
              className={claseBotonTexto}
            >
              {segundosReenvio > 0 ? `Reenviar en ${segundosReenvio} s` : "Reenviar código"}
            </button>
          </div>
        </form>
      )}

      <p className="text-center text-xs text-[var(--color-texto-suave)] mt-6">
        Acceso exclusivo para organizaciones de rescate animal inscritas en el SII.
      </p>
    </>
  );
}
