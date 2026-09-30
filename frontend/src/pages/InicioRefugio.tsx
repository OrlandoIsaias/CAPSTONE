import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Bell,
  Camera,
  Check,
  Clock,
  FileText,
  Home,
  MessageCircle,
  PawPrint,
  Pencil,
  Plus,
} from "lucide-react";
import { obtenerPerfilRefugio } from "../api/auth";
import { misMascotas } from "../api/mascotas";
import { postulacionesRecibidas } from "../api/postulaciones";
import { PantallaRefugio } from "../components/BarraRefugio";
import { CargandoVista } from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import { diasDesde, tiempoRelativo } from "../utils/tiempo";
import { guardarPerfilRefugioCache, leerPerfilRefugioCache } from "../utils/perfilRefugioCache";
import type { Mascota } from "../types/mascotas";
import type { Postulacion } from "../types/postulaciones";

const CLAVE_LEIDAS = "housefound_notificaciones_leidas";

// Una solicitud pendiente o una publicación sin interés durante más de este
// tiempo se considera "estancada" — lo suficiente para ser una señal real,
// no tan poco que marque como urgente algo publicado ayer.
const DIAS_ESTANCADO = 2;
const DIAS_SIN_INTERES = 14;

type Actividad = {
  id: string;
  tipo: "solicitud" | "aprobada" | "adoptada";
  titulo: string;
  detalle: string;
  fecha: string;
};

function saludo(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default function InicioRefugio() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  // Con caché: si ya visitaste esta pantalla (o Datos del refugio) antes,
  // se muestra el nombre real del refugio de inmediato. Sin esto, mientras
  // se espera la respuesta del servidor se caía al nombre personal de la
  // cuenta (usuario?.nombre, más abajo) y luego "saltaba" al del refugio.
  const [nombreRefugio, setNombreRefugio] = useState<string | null>(() =>
    usuario ? (leerPerfilRefugioCache(usuario.id)?.nombre_refugio ?? null) : null
  );
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  const [leidas, setLeidas] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(CLAVE_LEIDAS) ?? "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    // AbortController: sin esto, StrictMode (solo en desarrollo) dispara
    // las 3 peticiones dos veces — ver el mismo patrón en Recomendaciones.tsx.
    const controlador = new AbortController();

    Promise.all([
      obtenerPerfilRefugio(controlador.signal)
        .then((p) => {
          setNombreRefugio(p.nombre_refugio);
          if (usuario) guardarPerfilRefugioCache(usuario.id, p);
        })
        // 404 = el refugio todavía no completó su perfil; no es un error
        .catch((err) => {
          if (!axios.isCancel(err)) setNombreRefugio(null);
        }),
      misMascotas(controlador.signal)
        .then(setMascotas)
        .catch((err) => {
          if (!axios.isCancel(err)) setMascotas([]);
        }),
      postulacionesRecibidas(controlador.signal)
        .then(setPostulaciones)
        .catch((err) => {
          if (!axios.isCancel(err)) setPostulaciones([]);
        }),
    ]).finally(() => {
      if (!controlador.signal.aborted) setCargando(false);
    });

    return () => controlador.abort();
  }, [usuario]);

  const activos = mascotas.filter((m) => m.estado !== "adoptada").length;
  const adoptados = mascotas.filter((m) => m.estado === "adoptada").length;
  const pendientes = postulaciones.filter((p) => p.estado === "pendiente").length;
  // Todo postulante tuvo que completar el cuestionario de estilo de vida para
  // poder postular, así que los postulantes distintos son los cuestionarios
  // que este refugio tiene disponibles para revisar.
  const cuestionarios = new Set(postulaciones.map((p) => p.adoptante_id)).size;

  // Todo lo que sigue se deriva de `mascotas` y `postulaciones`, que ya están
  // en memoria — ninguna de estas mejoras agrega una consulta nueva al backend.

  // Solicitudes que nadie ha revisado en un buen rato — más urgentes que una
  // solicitud recién llegada, aunque ambas cuenten igual en "Solicitudes".
  const solicitudesEstancadas = useMemo(
    () =>
      postulaciones.filter(
        (p) => p.estado === "pendiente" && diasDesde(p.fecha_postulacion) >= DIAS_ESTANCADO
      ),
    [postulaciones]
  );

  // Aprobadas pero todavía no confirmadas como adoptadas: el refugio le debe
  // un siguiente paso al adoptante (coordinar la entrega).
  const entregasPendientes = useMemo(
    () => postulaciones.filter((p) => p.estado === "aprobada" && p.mascota_estado === "en_proceso"),
    [postulaciones]
  );

  const mascotasSinFoto = useMemo(
    () => mascotas.filter((m) => m.estado !== "adoptada" && m.fotos.length === 0),
    [mascotas]
  );

  // Disponibles desde hace tiempo y sin una sola solicitud — candidatas a
  // revisar precio, fotos o descripción.
  const mascotasSinInteres = useMemo(() => {
    const idsConSolicitud = new Set(postulaciones.map((p) => p.mascota_id));
    return mascotas.filter(
      (m) =>
        m.estado === "disponible" &&
        diasDesde(m.fecha_publicacion) >= DIAS_SIN_INTERES &&
        !idsConSolicitud.has(m.id)
    );
  }, [mascotas, postulaciones]);

  // La mascota con más solicitudes en los últimos 7 días — un dato con cara,
  // no solo un número.
  const mascotaDestacada = useMemo(() => {
    const hace7Dias = new Map<number, number>();
    for (const p of postulaciones) {
      if (diasDesde(p.fecha_postulacion) <= 7) {
        hace7Dias.set(p.mascota_id, (hace7Dias.get(p.mascota_id) ?? 0) + 1);
      }
    }
    let mejorId: number | null = null;
    let mejorConteo = 1; // con 1 sola solicitud no amerita destacarla
    for (const [id, conteo] of hace7Dias) {
      if (conteo > mejorConteo) {
        mejorId = id;
        mejorConteo = conteo;
      }
    }
    const mascota = mejorId ? mascotas.find((m) => m.id === mejorId) : undefined;
    return mascota ? { mascota, conteo: mejorConteo } : null;
  }, [postulaciones, mascotas]);

  const mascotasRecientes = useMemo(
    () =>
      mascotas
        .filter((m) => m.estado !== "adoptada")
        .sort((a, b) => new Date(b.fecha_publicacion).getTime() - new Date(a.fecha_publicacion).getTime())
        .slice(0, 6),
    [mascotas]
  );

  const accionesPendientes = useMemo(() => {
    const acciones: {
      id: string;
      titulo: string;
      detalle: string;
      icono: React.ReactNode;
      color: "amber" | "blue" | "rose";
    }[] = [];

    if (solicitudesEstancadas.length > 0) {
      acciones.push({
        id: "estancadas",
        titulo: `${solicitudesEstancadas.length} ${solicitudesEstancadas.length === 1 ? "solicitud lleva" : "solicitudes llevan"} más de ${DIAS_ESTANCADO} días esperando`,
        detalle: "Revísalas antes de que el adoptante pierda el interés.",
        icono: <Clock size={19} strokeWidth={2} />,
        color: "amber",
      });
    }
    if (entregasPendientes.length > 0) {
      acciones.push({
        id: "entregas",
        titulo: `${entregasPendientes.length} ${entregasPendientes.length === 1 ? "entrega" : "entregas"} por coordinar`,
        detalle: "Aprobadas — confirma la adopción cuando se concreten.",
        icono: <Home size={21} strokeWidth={2} />,
        color: "blue",
      });
    }
    if (mascotasSinFoto.length > 0) {
      acciones.push({
        id: "sin-foto",
        titulo: `${mascotasSinFoto.length} ${mascotasSinFoto.length === 1 ? "mascota" : "mascotas"} sin fotos`,
        detalle: "Las publicaciones con fotos reciben más solicitudes.",
        icono: <Camera size={19} strokeWidth={2} />,
        color: "rose",
      });
    }
    if (mascotasSinInteres.length > 0) {
      acciones.push({
        id: "sin-interes",
        titulo: `${mascotasSinInteres.length} ${mascotasSinInteres.length === 1 ? "mascota" : "mascotas"} sin solicitudes hace ${DIAS_SIN_INTERES}+ días`,
        detalle: "Prueba actualizar sus fotos o descripción.",
        icono: <PawPrint size={22} strokeWidth={2} />,
        color: "rose",
      });
    }
    return acciones;
  }, [solicitudesEstancadas, entregasPendientes, mascotasSinFoto, mascotasSinInteres]);

  const actividad = useMemo<Actividad[]>(() => {
    return postulaciones
      .map((p): Actividad => {
        const quien = p.adoptante_nombre ?? `Adoptante #${p.adoptante_id}`;
        if (p.estado === "aprobada" && p.mascota_estado === "adoptada") {
          return {
            id: `p${p.id}-adoptada`,
            tipo: "adoptada",
            titulo: "Adopción confirmada",
            detalle: `La adopción de ${p.mascota_nombre} por ${quien} fue confirmada`,
            fecha: p.fecha_postulacion,
          };
        }
        if (p.estado === "aprobada") {
          return {
            id: `p${p.id}-aprobada`,
            tipo: "aprobada",
            titulo: "Solicitud aprobada",
            detalle: `${p.mascota_nombre} quedó reservada para ${quien}`,
            fecha: p.fecha_postulacion,
          };
        }
        return {
          id: `p${p.id}-solicitud`,
          tipo: "solicitud",
          titulo: "Nueva solicitud de adopción",
          detalle: `${quien} quiere adoptar a ${p.mascota_nombre}`,
          fecha: p.fecha_postulacion,
        };
      })
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [postulaciones]);

  const sinLeer = actividad.filter((a) => !leidas.includes(a.id)).length;

  function marcarTodoLeido() {
    const todas = actividad.map((a) => a.id);
    setLeidas(todas);
    localStorage.setItem(CLAVE_LEIDAS, JSON.stringify(todas));
  }

  function irASolicitud() {
    setMostrarNotificaciones(false);
    navigate("/solicitudes");
  }

  return (
    <PantallaRefugio>
      <header className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm font-medium text-[var(--color-texto-suave)] mb-0.5">{saludo()}</p>
          <h1 className="text-2xl font-bold leading-tight">
            {nombreRefugio ?? usuario?.nombre ?? "Tu refugio"}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <button
              onClick={() => setMostrarNotificaciones((v) => !v)}
              aria-label="Notificaciones"
              aria-expanded={mostrarNotificaciones}
              className="w-10 h-10 rounded-full bg-[var(--color-superficie)] border border-[var(--color-borde)] flex items-center justify-center text-[var(--color-texto)] active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2"
            >
              <Bell size={18} strokeWidth={1.8} />
            </button>
            {sinLeer > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[var(--color-primario)] text-white text-[11px] font-semibold flex items-center justify-center pointer-events-none">
                {sinLeer}
              </span>
            )}

            {mostrarNotificaciones && (
              <>
                {/* Fondo invisible: cierra el panel al tocar afuera, sin librería aparte. */}
                <button
                  aria-label="Cerrar notificaciones"
                  onClick={() => setMostrarNotificaciones(false)}
                  className="fixed inset-0 z-40 cursor-default"
                />
                <div className="absolute right-0 top-12 z-50 w-72 max-w-[80vw] rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-lg overflow-hidden animate-[toast-in_0.15s_ease-out]">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-borde)]">
                    <p className="font-bold text-sm">Notificaciones</p>
                    {sinLeer > 0 && (
                      <button
                        onClick={marcarTodoLeido}
                        className="text-xs font-medium text-[var(--color-primario)]"
                      >
                        Marcar todo leído
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {actividad.length === 0 && (
                      <p className="text-sm text-[var(--color-texto-suave)] text-center py-6 px-4">
                        Todo tranquilo por ahora.
                      </p>
                    )}
                    {actividad.slice(0, 6).map((a) => {
                      const leida = leidas.includes(a.id);
                      return (
                        <button
                          key={a.id}
                          onClick={irASolicitud}
                          className={`w-full text-left flex gap-2.5 px-4 py-3 border-b border-[var(--color-borde)] last:border-b-0 ${
                            leida ? "" : "bg-[var(--color-primario-suave)]/40"
                          }`}
                        >
                          <span className="flex-1 min-w-0">
                            <span className={`block text-sm font-semibold truncate ${leida ? "text-[var(--color-texto-suave)]" : ""}`}>
                              {a.titulo}
                            </span>
                            <span className="block text-xs text-[var(--color-texto-suave)] truncate">
                              {a.detalle}
                            </span>
                            <span className="block text-[11px] text-[var(--color-texto-suave)]/70 mt-0.5">
                              {tiempoRelativo(a.fecha)}
                            </span>
                          </span>
                          {!leida && (
                            <span className="w-2 h-2 rounded-full bg-[var(--color-primario)] shrink-0 mt-1.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {!nombreRefugio && !cargando && (
        <button
          onClick={() => navigate("/perfil-refugio")}
          className="w-full text-left mb-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-rose-500/10 border border-amber-300/70 p-4 flex items-center justify-between gap-3 shadow-xs hover:border-amber-400 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs shrink-0 font-bold text-sm">
              <Pencil size={18} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-amber-950 text-sm truncate">Completa el perfil de tu refugio</p>
              <p className="text-xs text-amber-900/80 truncate mt-0.5">
                Los adoptantes verán tu contacto y datos en cada publicación.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-500 text-white shadow-xs shrink-0 hover:bg-amber-600 transition-colors">
            Editar →
          </span>
        </button>
      )}

      {cargando ? (
        <CargandoVista mensaje="Cargando tu panel…" className="text-[var(--color-texto-suave)] py-16" />
      ) : mascotas.length === 0 ? (
        <div className="rounded-3xl bg-[var(--color-superficie)] border border-[var(--color-borde)] p-8 text-center shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center mb-4 shadow-md">
            <PawPrint size={22} strokeWidth={2} />
          </div>
          <h2 className="font-extrabold text-lg mb-1.5">¡Bienvenido a HouseFound!</h2>
          <p className="text-sm text-[var(--color-texto-suave)] max-w-xs mx-auto mb-5">
            Publica tu primera mascota para que los adoptantes puedan encontrarla y empezar a
            postular.
          </p>
          <button
            onClick={() => navigate("/mascota/nueva")}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm shadow-md hover:shadow-lg active:scale-95 transition-all"
          >
            <Plus size={16} strokeWidth={2.5} />
            Publicar tu primera mascota
          </button>
        </div>
      ) : (
        <>
          {accionesPendientes.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-3">Requiere tu atención</h2>
              <div className="space-y-2.5">
                {accionesPendientes.map((a) => {
                  const estilo = ESTILOS_ACCION[a.color];
                  return (
                    <button
                      key={a.id}
                      onClick={() => navigate("/solicitudes")}
                      className={`w-full text-left flex gap-3 p-3.5 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs hover:shadow-sm active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2 ${estilo.borde}`}
                    >
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${estilo.iconoBox}`}>
                        {a.icono}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-sm">{a.titulo}</span>
                        <span className="block text-xs text-[var(--color-texto-suave)] leading-snug mt-0.5">
                          {a.detalle}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={() => navigate("/mascota/nueva")}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-black py-3.5 rounded-2xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all mb-6"
          >
            <Plus size={16} strokeWidth={2.5} />
            Publicar una mascota
          </button>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <Metrica
              valor={activos}
              etiqueta="Animales activos"
              color="orange"
              icono={<PawPrint size={22} strokeWidth={2} />}
              onClick={() => navigate("/mis-mascotas")}
            />
            <Metrica
              valor={pendientes}
              etiqueta="Solicitudes"
              color="blue"
              icono={<FileText size={20} strokeWidth={2} />}
              onClick={() => navigate("/solicitudes")}
            />
            <Metrica
              valor={cuestionarios}
              etiqueta="Cuestionarios"
              color="purple"
              icono={<MessageCircle size={20} strokeWidth={2} />}
              onClick={() => navigate("/solicitudes")}
            />
            <Metrica
              valor={adoptados}
              etiqueta="Adoptados"
              color="emerald"
              icono={<Home size={21} strokeWidth={2} />}
              onClick={() => navigate("/mis-mascotas")}
            />
          </div>

          {mascotaDestacada && (
            <div className="flex items-center gap-2.5 text-sm font-semibold text-[var(--color-primario)] bg-[var(--color-primario-suave)] rounded-2xl px-4 py-3 mb-8">
              <span className="text-base">🔥</span>
              <span>
                <strong>{mascotaDestacada.mascota.nombre}</strong> es tu mascota más solicitada esta
                semana ({mascotaDestacada.conteo} solicitudes)
              </span>
            </div>
          )}

          <div className="mb-8">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg font-bold">Tus mascotas</h2>
              <button
                onClick={() => navigate("/mis-mascotas")}
                className="text-sm font-medium text-[var(--color-primario)]"
              >
                Ver todas
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
              {mascotasRecientes.map((m) => {
                const foto = m.fotos.find((f) => f.es_principal) ?? m.fotos[0];
                return (
                  <button
                    key={m.id}
                    onClick={() => navigate(`/mis-mascotas/${m.id}`)}
                    className="shrink-0 w-24 text-center active:scale-95 transition-transform"
                  >
                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[var(--color-superficie-apagada)] border-2 border-white ring-2 ring-emerald-300/70 shadow-xs mb-1.5 flex items-center justify-center">
                      {foto ? (
                        <img src={foto.url} alt={m.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-black text-emerald-700">
                          {m.nombre.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold truncate">{m.nombre}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-bold">Notificaciones</h2>
            {sinLeer > 0 && (
              <button
                onClick={marcarTodoLeido}
                className="text-sm font-medium text-[var(--color-primario)]"
              >
                Marcar todo leído
              </button>
            )}
          </div>

          {actividad.length === 0 && (
            <div className="rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] p-6 text-center">
              <p className="font-medium">Todo tranquilo por ahora</p>
              <p className="text-sm text-[var(--color-texto-suave)] mt-1">
                Cuando alguien postule a una de tus mascotas, aparecerá aquí.
              </p>
            </div>
          )}

          <div className="space-y-2.5">
            {actividad.map((a) => {
          const leida = leidas.includes(a.id);
          const esAdoptada = a.tipo === "adoptada";
          const esAprobada = a.tipo === "aprobada";

          const estiloBadge = esAdoptada
            ? "bg-emerald-100 text-emerald-700 border border-emerald-200/80 shadow-xs"
            : esAprobada
              ? "bg-blue-100 text-blue-700 border border-blue-200/80 shadow-xs"
              : "bg-orange-100 text-orange-700 border border-orange-200/80 shadow-xs";

          const bordeNoLeida = esAdoptada
            ? "border-l-4 border-l-emerald-500 bg-emerald-50/15"
            : esAprobada
              ? "border-l-4 border-l-blue-500 bg-blue-50/15"
              : "border-l-4 border-l-orange-500 bg-orange-50/15";

          const puntoNoLeida = esAdoptada
            ? "bg-emerald-500"
            : esAprobada
              ? "bg-blue-500"
              : "bg-orange-500";

          return (
            <button
              key={a.id}
              onClick={() => navigate("/solicitudes")}
              className={`w-full text-left flex gap-3 p-3.5 rounded-2xl border transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2 ${
                leida
                  ? "bg-[var(--color-superficie-apagada)]/50 border-transparent hover:bg-[var(--color-superficie-apagada)]/80"
                  : `bg-[var(--color-superficie)] border-[var(--color-borde)] shadow-xs hover:shadow-sm ${bordeNoLeida}`
              }`}
            >
              <span
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${estiloBadge}`}
              >
                {esAdoptada ? <Check size={18} strokeWidth={2.4} /> : <FileText size={20} strokeWidth={2} />}
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block font-semibold text-[15px] ${leida ? "text-[var(--color-texto-suave)]" : "text-[var(--color-texto)]"}`}>
                  {a.titulo}
                </span>
                <span className="block text-sm text-[var(--color-texto-suave)] leading-snug">
                  {a.detalle}
                </span>
                <span className="block text-xs text-[var(--color-texto-suave)]/70 mt-1">
                  {tiempoRelativo(a.fecha)}
                </span>
              </span>
              {!leida && (
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 shadow-xs ${puntoNoLeida}`} />
              )}
            </button>
          );
            })}
          </div>
        </>
      )}
    </PantallaRefugio>
  );
}

type MetricaColor = "orange" | "blue" | "purple" | "emerald";

const ESTILOS_METRICA: Record<
  MetricaColor,
  {
    tarjeta: string;
    iconoBox: string;
    numero: string;
    etiqueta: string;
  }
> = {
  orange: {
    tarjeta: "bg-gradient-to-br from-orange-50 via-amber-50/60 to-orange-100/30 border border-orange-200/80 shadow-xs hover:border-orange-300",
    iconoBox: "bg-orange-500 text-white shadow-xs",
    numero: "text-orange-950",
    etiqueta: "text-orange-900/75",
  },
  blue: {
    tarjeta: "bg-gradient-to-br from-sky-50 via-blue-50/60 to-indigo-100/30 border border-blue-200/80 shadow-xs hover:border-blue-300",
    iconoBox: "bg-blue-600 text-white shadow-xs",
    numero: "text-blue-950",
    etiqueta: "text-blue-900/75",
  },
  purple: {
    tarjeta: "bg-gradient-to-br from-purple-50 via-fuchsia-50/60 to-purple-100/30 border border-purple-200/80 shadow-xs hover:border-purple-300",
    iconoBox: "bg-purple-600 text-white shadow-xs",
    numero: "text-purple-950",
    etiqueta: "text-purple-900/75",
  },
  emerald: {
    tarjeta: "bg-gradient-to-br from-emerald-50 via-teal-50/60 to-emerald-100/30 border border-emerald-200/80 shadow-xs hover:border-emerald-300",
    iconoBox: "bg-emerald-600 text-white shadow-xs",
    numero: "text-emerald-950",
    etiqueta: "text-emerald-900/75",
  },
};

function Metrica({
  valor,
  etiqueta,
  color,
  icono,
  onClick,
}: {
  valor: number;
  etiqueta: string;
  color: MetricaColor;
  icono: React.ReactNode;
  onClick?: () => void;
}) {
  const estilo = ESTILOS_METRICA[color];
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl p-4 flex items-center gap-3.5 transition-all text-left active:scale-[0.97] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2 ${estilo.tarjeta}`}
    >
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${estilo.iconoBox}`}>
        {icono}
      </span>
      <span className="min-w-0">
        <span className={`block text-[28px] font-extrabold leading-none tracking-tight ${estilo.numero}`}>
          {valor}
        </span>
        <span className={`block text-xs font-semibold mt-1 truncate ${estilo.etiqueta}`}>
          {etiqueta}
        </span>
      </span>
    </button>
  );
}

type AccionColor = "amber" | "blue" | "rose";

const ESTILOS_ACCION: Record<AccionColor, { iconoBox: string; borde: string }> = {
  amber: { iconoBox: "bg-amber-500 text-white", borde: "border-l-4 border-l-amber-500" },
  blue: { iconoBox: "bg-blue-600 text-white", borde: "border-l-4 border-l-blue-500" },
  rose: { iconoBox: "bg-rose-500 text-white", borde: "border-l-4 border-l-rose-500" },
};
