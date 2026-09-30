import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Pencil, PawPrint, Inbox } from "lucide-react";
import { obtenerPerfilRefugio } from "../api/auth";
import { misMascotas } from "../api/mascotas";
import { postulacionesRecibidas } from "../api/postulaciones";
import { PantallaRefugio } from "../components/BarraRefugio";
import { useAuth } from "../context/AuthContext";
import { fechaCorta } from "../utils/tiempo";
import { guardarPerfilRefugioCache, leerPerfilRefugioCache } from "../utils/perfilRefugioCache";
import type { PerfilRefugio as IPerfilRefugio } from "../types/auth";

export default function PerfilRefugio() {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  const [perfil, setPerfil] = useState<IPerfilRefugio | null>(() =>
    usuario ? leerPerfilRefugioCache(usuario.id) : null
  );
  const [cargando, setCargando] = useState(() =>
    usuario ? leerPerfilRefugioCache(usuario.id) === null : true
  );
  const [totalMascotas, setTotalMascotas] = useState<number | null>(null);
  const [totalSolicitudes, setTotalSolicitudes] = useState<number | null>(null);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<number | null>(null);

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

    misMascotas(controlador.signal)
      .then((m) => setTotalMascotas(m.length))
      .catch(() => {});

    postulacionesRecibidas(controlador.signal)
      .then((s) => {
        setTotalSolicitudes(s.length);
        setSolicitudesPendientes(s.filter((p) => p.estado === "pendiente").length);
      })
      .catch(() => {});

    return () => controlador.abort();
  }, [usuario]);

  return (
    <PantallaRefugio>
      {/* Encabezado */}
      <header className="mb-5">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-black text-slate-900 leading-tight">
          Mi Perfil
        </h1>
        <p className="text-xs font-medium text-slate-500 mt-1">Gestiona los datos y métricas de tu refugio.</p>
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

      {/* Tarjetas de estadísticas / resumen de gestión */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => navigate("/mis-mascotas")}
          className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 hover:bg-emerald-50/20 text-left transition-all active:scale-[0.98] group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <PawPrint size={18} strokeWidth={2.2} />
            </span>
            <span className="text-2xl font-black text-slate-900 font-[family-name:var(--font-display)]">
              {totalMascotas !== null ? totalMascotas : "…"}
            </span>
          </div>
          <p className="text-xs font-black text-slate-800">Mis Mascotas</p>
          <p className="text-[11px] font-medium text-slate-400">Animales registrados</p>
        </button>

        <button
          onClick={() => navigate("/solicitudes")}
          className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:border-indigo-300 hover:bg-indigo-50/20 text-left transition-all active:scale-[0.98] group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Inbox size={18} strokeWidth={2.2} />
            </span>
            <span className="text-2xl font-black text-slate-900 font-[family-name:var(--font-display)]">
              {totalSolicitudes !== null ? totalSolicitudes : "…"}
            </span>
          </div>
          <p className="text-xs font-black text-slate-800">Solicitudes</p>
          <p className="text-[11px] font-medium text-slate-400">
            {solicitudesPendientes ? `${solicitudesPendientes} por revisar` : "Recibidas en total"}
          </p>
        </button>
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
            Editar datos
          </button>
        </div>
      </div>

      {/* Resumen de Información del Refugio */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs mb-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Resumen del Refugio
          </h2>
          <Link
            to="/perfil-refugio/editar"
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
          >
            Modificar
          </Link>
        </div>

        {cargando && (
          <div className="grid grid-cols-2 gap-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        )}

        {!cargando && perfil && (
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Refugio</p>
              <p className="text-xs font-black text-slate-800 mt-0.5 truncate">
                {perfil.nombre_refugio}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contacto</p>
              <p className="text-xs font-black text-slate-800 mt-0.5 truncate">
                {perfil.telefono_contacto || "Sin registrar"}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dirección / Sede</p>
              <p className="text-xs font-black text-slate-800 mt-0.5">
                {perfil.direccion || "Sin dirección especificada"}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Correo</p>
              <p className="text-xs font-black text-slate-800 mt-0.5 truncate">
                {usuario?.email}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Miembro Desde</p>
              <p className="text-xs font-black text-slate-800 mt-0.5">
                {usuario?.fecha_registro ? fechaCorta(usuario.fecha_registro) : "Activo"}
              </p>
            </div>
          </div>
        )}

        {!cargando && !perfil && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
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
      </div>

      {/* Botón de Cerrar Sesión con degradé rojo y texto blanco */}
      <button
        onClick={cerrarSesion}
        className="w-full bg-gradient-to-r from-rose-500 via-red-500 to-rose-600 hover:from-rose-600 hover:via-red-600 hover:to-rose-700 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-sm hover:shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Cerrar sesión
      </button>
    </PantallaRefugio>
  );
}
