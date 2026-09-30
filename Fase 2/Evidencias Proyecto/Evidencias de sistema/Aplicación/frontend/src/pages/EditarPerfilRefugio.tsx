import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ChevronLeft } from "lucide-react";
import { guardarPerfilRefugio, obtenerPerfilRefugio } from "../api/auth";
import { Spinner } from "../components/Spinner";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { normalizarTelefonoCL, validarTelefonoCL } from "../utils/telefono";
import { guardarPerfilRefugioCache, leerPerfilRefugioCache } from "../utils/perfilRefugioCache";

type Errores = Partial<Record<"nombreRefugio" | "telefono", string>>;

export default function EditarPerfilRefugio() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const mostrarToast = useToast();

  // Si la vista (PerfilRefugio.tsx) ya cacheó los datos, se llega acá con
  // el formulario prellenado al instante — sin caché, se ve el spinner
  // mientras se pide por primera vez.
  const [cacheInicial] = useState(() => (usuario ? leerPerfilRefugioCache(usuario.id) : null));

  const [nombreRefugio, setNombreRefugio] = useState(cacheInicial?.nombre_refugio ?? "");
  const [direccion, setDireccion] = useState(cacheInicial?.direccion ?? "");
  const [telefono, setTelefono] = useState(cacheInicial?.telefono_contacto ?? "");

  const [cargandoInicial, setCargandoInicial] = useState(cacheInicial === null);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Errores>({});

  useEffect(() => {
    const controlador = new AbortController();

    obtenerPerfilRefugio(controlador.signal)
      .then((p) => {
        setNombreRefugio(p.nombre_refugio);
        setDireccion(p.direccion ?? "");
        setTelefono(p.telefono_contacto ?? "");
        if (usuario) guardarPerfilRefugioCache(usuario.id, p);
      })
      .catch((err) => {
        if (axios.isCancel(err)) return;
        // 404 = primer registro; no es un error, el formulario queda vacío.
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargandoInicial(false);
      });

    return () => controlador.abort();
  }, [usuario]);

  function validar(): boolean {
    const nuevosErrores: Errores = {};
    if (nombreRefugio.trim().length < 2) {
      nuevosErrores.nombreRefugio = "Ingresa el nombre del refugio.";
    }
    if (!validarTelefonoCL(telefono)) {
      nuevosErrores.telefono = "Ingresa un celular chileno válido, ej: +56 9 1234 5678.";
    }
    setErrores(nuevosErrores);
    return Object.values(nuevosErrores).every((v) => !v);
  }

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();
    if (!validar()) return;

    setGuardando(true);
    try {
      const guardado = await guardarPerfilRefugio({
        nombre_refugio: nombreRefugio.trim(),
        direccion: direccion || undefined,
        telefono_contacto: normalizarTelefonoCL(telefono),
      });
      if (usuario) guardarPerfilRefugioCache(usuario.id, guardado);
      mostrarToast("¡Datos del refugio guardados correctamente!");
      navigate("/perfil-refugio");
    } catch {
      mostrarToast("No pudimos guardar los cambios. Intenta de nuevo.", "error");
    } finally {
      setGuardando(false);
    }
  }

  const claseCampo =
    "w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all";
  const claseEtiqueta = "block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5";
  const claseErrorCampo = "text-xs font-semibold text-rose-600 mt-1";

  if (cargandoInicial) {
    return (
      <div className="min-h-screen bg-[var(--color-fondo)] flex items-center justify-center p-6">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-fondo)]">
      <div className="mx-auto w-full max-w-[480px] px-5 pt-6 pb-20">
        <header className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/perfil-refugio")}
            aria-label="Volver al perfil"
            className="w-10 h-10 rounded-full bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-600 hover:text-slate-900 active:scale-90 transition-transform shrink-0"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-black text-slate-900 leading-tight">
              Editar datos del refugio
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Esta información acompaña a cada mascota que publiques.
            </p>
          </div>
        </header>

        <form onSubmit={manejarEnvio} className="space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
            <div>
              <label className={claseEtiqueta}>Nombre del refugio</label>
              <input
                required
                value={nombreRefugio}
                onChange={(e) => setNombreRefugio(e.target.value)}
                placeholder="Huellitas Felices"
                className={claseCampo}
              />
              {errores.nombreRefugio && <p className={claseErrorCampo}>{errores.nombreRefugio}</p>}
            </div>

            <div>
              <label className={claseEtiqueta}>Dirección</label>
              <input
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Opcional"
                className={claseCampo}
              />
            </div>

            <div>
              <label className={claseEtiqueta}>Teléfono de contacto</label>
              <input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+56 9 1234 5678"
                className={claseCampo}
              />
              <p className="text-[11px] font-medium text-slate-400 mt-1.5">
                Se comparte con el adoptante cuando apruebas su solicitud, para coordinar la
                entrega.
              </p>
              {errores.telefono && <p className={claseErrorCampo}>{errores.telefono}</p>}
            </div>
          </div>

          <div className="pt-1 space-y-2.5">
            <button
              type="submit"
              disabled={guardando}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black py-4 rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-60"
            >
              {guardando && <Spinner />}
              {guardando ? "Guardando cambios…" : "Guardar Cambios"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/perfil-refugio")}
              className="w-full py-3 rounded-2xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
