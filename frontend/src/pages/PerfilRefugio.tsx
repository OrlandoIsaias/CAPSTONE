import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Pencil } from "lucide-react";
import { obtenerPerfilRefugio } from "../api/auth";
import { PantallaRefugio } from "../components/BarraRefugio";
import { useAuth } from "../context/AuthContext";
import { guardarPerfilRefugioCache, leerPerfilRefugioCache } from "../utils/perfilRefugioCache";
import type { PerfilRefugio as IPerfilRefugio } from "../types/auth";

export default function PerfilRefugio() {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  const [perfil, setPerfil] = useState<IPerfilRefugio | null>(() =>
    usuario ? leerPerfilRefugioCache(usuario.id) : null
  );
  // Si ya había algo en caché, se muestra de inmediato — no hace falta
  // tapar la pantalla con el spinner mientras se refresca por detrás.
  const [cargando, setCargando] = useState(() =>
    usuario ? leerPerfilRefugioCache(usuario.id) === null : true
  );

  useEffect(() => {
    const controlador = new AbortController();

    obtenerPerfilRefugio(controlador.signal)
      .then((p) => {
        setPerfil(p);
        if (usuario) guardarPerfilRefugioCache(usuario.id, p);
      })
      .catch((err) => {
        if (axios.isCancel(err)) return;
        // 404 = el refugio todavía no completó su perfil; no es un error.
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setPerfil(null);
        }
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false);
      });

    return () => controlador.abort();
  }, [usuario]);

  return (
    <PantallaRefugio>
      {/* Encabezado */}
      <header className="mb-5">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-black text-slate-900 leading-tight">
          Mi Perfil
        </h1>
        <p className="text-xs font-medium text-slate-500 mt-1">Gestiona los datos de tu refugio.</p>
      </header>

      {/* Tarjeta de Identidad */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs mb-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-[family-name:var(--font-display)] text-2xl font-black flex items-center justify-center shadow-md border-2 border-white ring-2 ring-indigo-200">
              {(perfil?.nombre_refugio ?? usuario?.nombre)?.charAt(0).toUpperCase() || "R"}
            </div>
            <span
              className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-white"
              title="Cuenta activa"
            />
          </div>
          <div className="min-w-0 flex-1">
            {cargando ? (
              <>
                <p className="h-5 w-32 rounded bg-slate-100 animate-pulse mb-1.5" />
                <p className="h-3.5 w-40 rounded bg-slate-100 animate-pulse" />
              </>
            ) : perfil ? (
              <>
                <h2 className="font-extrabold text-slate-900 text-lg leading-snug truncate">
                  {perfil.nombre_refugio}
                </h2>
                <p className="text-xs font-semibold text-slate-500 truncate">
                  {perfil.direccion || usuario?.email}
                </p>
                <p className="text-xs font-bold text-indigo-600 mt-0.5">
                  {perfil.telefono_contacto ? `Tel: ${perfil.telefono_contacto}` : "Sin teléfono de contacto"}
                </p>
              </>
            ) : (
              <>
                <h2 className="font-extrabold text-slate-900 text-lg leading-snug truncate">
                  {usuario?.nombre}
                </h2>
                <p className="text-xs font-semibold text-slate-500 truncate">{usuario?.email}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cuadro destacado para Editar */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-[1.5px] shadow-sm mb-4">
        <div className="bg-white rounded-[22px] p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
              <Pencil size={20} strokeWidth={2} />
            </span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Editar datos del refugio</h3>
              <p className="text-xs text-slate-500 mt-0.5">Nombre, dirección y teléfono de contacto.</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/perfil-refugio/editar")}
            className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-black px-4 py-2.5 rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all"
          >
            Editar datos →
          </button>
        </div>
      </div>

      {!cargando && !perfil && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 text-center mb-4">
          <p className="text-xs font-extrabold text-amber-900">
            Aún no has completado el perfil de tu refugio.
          </p>
          <p className="text-[11px] text-amber-700 mt-1 mb-3">
            Los adoptantes necesitan tu nombre y contacto para postular con confianza.
          </p>
          <button
            onClick={() => navigate("/perfil-refugio/editar")}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs"
          >
            Completar Ahora
          </button>
        </div>
      )}

      {/* Botón de Cerrar Sesión */}
      <button
        onClick={cerrarSesion}
        className="w-full py-3 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 active:scale-95 transition-all"
      >
        Cerrar sesión de la cuenta
      </button>
    </PantallaRefugio>
  );
}
