import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerPerfilRefugio } from "../api/auth";
import { misMascotas } from "../api/mascotas";
import { postulacionesRecibidas } from "../api/postulaciones";
import { PantallaRefugio } from "../components/BarraRefugio";
import { SkeletonMetrica, Skeleton } from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import { tiempoRelativo } from "../utils/tiempo";
import type { Mascota } from "../types/mascotas";
import type { Postulacion } from "../types/postulaciones";

const CLAVE_LEIDAS = "housefound_notificaciones_leidas";

type Actividad = {
  id: string;
  tipo: "solicitud" | "aprobada" | "adoptada";
  titulo: string;
  detalle: string;
  fecha: string;
};

export default function InicioRefugio() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [nombreRefugio, setNombreRefugio] = useState<string | null>(null);
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
    Promise.all([
      obtenerPerfilRefugio()
        .then((p) => setNombreRefugio(p.nombre_refugio))
        // 404 = el refugio todavía no completó su perfil; no es un error
        .catch(() => setNombreRefugio(null)),
      misMascotas()
        .then(setMascotas)
        .catch(() => setMascotas([])),
      postulacionesRecibidas()
        .then(setPostulaciones)
        .catch(() => setPostulaciones([])),
    ]).finally(() => setCargando(false));
  }, []);

  const activos = mascotas.filter((m) => m.estado !== "adoptada").length;
  const adoptados = mascotas.filter((m) => m.estado === "adoptada").length;
  const pendientes = postulaciones.filter((p) => p.estado === "pendiente").length;
  // Todo postulante tuvo que completar el cuestionario de estilo de vida para
  // poder postular, así que los postulantes distintos son los cuestionarios
  // que este refugio tiene disponibles para revisar.
  const cuestionarios = new Set(postulaciones.map((p) => p.adoptante_id)).size;

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
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--color-primario)] uppercase">
            Refugio
          </p>
          <h1 className="text-2xl font-bold leading-tight">
            {nombreRefugio ?? usuario?.nombre ?? "Tu refugio"}{" "}
            <span aria-hidden="true">🐾</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate("/perfil-refugio")}
            aria-label="Datos del refugio"
            className="w-10 h-10 rounded-full bg-[var(--color-superficie)] border border-[var(--color-borde)] flex items-center justify-center text-[var(--color-texto)] active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="3.4" />
              <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
            </svg>
          </button>

          <div className="relative">
            <button
              onClick={() => setMostrarNotificaciones((v) => !v)}
              aria-label="Notificaciones"
              aria-expanded={mostrarNotificaciones}
              className="w-10 h-10 rounded-full bg-[var(--color-superficie)] border border-[var(--color-borde)] flex items-center justify-center text-[var(--color-texto)] active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5Z" />
                <path d="M10.5 19a1.8 1.8 0 0 0 3 0" />
              </svg>
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
          className="w-full text-left mb-5 rounded-2xl bg-[var(--color-primario-suave)] p-4 active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2"
        >
          <p className="font-semibold text-[var(--color-primario)]">Completa tu perfil</p>
          <p className="text-sm text-[var(--color-texto-suave)]">
            Los adoptantes ven estos datos en cada mascota que publicas.
          </p>
        </button>
      )}

      {cargando ? (
        <div className="grid grid-cols-2 gap-3 mb-8">
          <SkeletonMetrica />
          <SkeletonMetrica />
          <SkeletonMetrica />
          <SkeletonMetrica />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Metrica
            valor={activos}
            etiqueta="Animales activos"
            fondo="var(--color-primario-suave)"
            tinta="var(--color-primario)"
            icono={<IconoHuellaRelleno />}
          />
          <Metrica
            valor={pendientes}
            etiqueta="Solicitudes"
            fondo="var(--color-teal-suave)"
            tinta="var(--color-teal)"
            icono={<IconoDocRelleno />}
          />
          <Metrica
            valor={cuestionarios}
            etiqueta="Cuestionarios"
            fondo="var(--color-morado-suave)"
            tinta="var(--color-morado)"
            icono={<IconoGloboRelleno />}
          />
          <Metrica
            valor={adoptados}
            etiqueta="Adoptados"
            fondo="var(--color-verde-suave)"
            tinta="var(--color-verde)"
            icono={<IconoCasaRelleno />}
          />
        </div>
      )}

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

      {cargando && (
        <div className="space-y-2.5">
          <Skeleton className="h-[72px] rounded-2xl" />
          <Skeleton className="h-[72px] rounded-2xl" />
          <Skeleton className="h-[72px] rounded-2xl" />
        </div>
      )}

      {!cargando && actividad.length === 0 && (
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
          return (
            <button
              key={a.id}
              onClick={() => navigate("/solicitudes")}
              className={`w-full text-left flex gap-3 p-3.5 rounded-2xl border transition-colors active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2 ${
                leida
                  ? "bg-[var(--color-superficie-apagada)]/60 border-transparent"
                  : "bg-[var(--color-superficie)] border-[var(--color-borde)]"
              }`}
            >
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor:
                    a.tipo === "solicitud"
                      ? "var(--color-primario-suave)"
                      : a.tipo === "aprobada"
                        ? "var(--color-teal-suave)"
                        : "var(--color-verde-suave)",
                  color:
                    a.tipo === "solicitud"
                      ? "var(--color-primario)"
                      : a.tipo === "aprobada"
                        ? "var(--color-teal)"
                        : "var(--color-verde)",
                }}
              >
                {a.tipo === "adoptada" ? <IconoCheck /> : <IconoDocRelleno />}
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block font-semibold text-[15px] ${leida ? "text-[var(--color-texto-suave)]" : ""}`}>
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
                <span className="w-2 h-2 rounded-full bg-[var(--color-primario)] shrink-0 mt-1.5" />
              )}
            </button>
          );
        })}
      </div>
    </PantallaRefugio>
  );
}

function Metrica({
  valor,
  etiqueta,
  fondo,
  tinta,
  icono,
}: {
  valor: number;
  etiqueta: string;
  fondo: string;
  tinta: string;
  icono: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: fondo }}>
      <span className="shrink-0" style={{ color: tinta }}>
        {icono}
      </span>
      <span className="min-w-0">
        <span className="block text-[26px] font-bold leading-none" style={{ color: tinta }}>
          {valor}
        </span>
        <span className="block text-xs text-[var(--color-texto-suave)] mt-1 truncate">
          {etiqueta}
        </span>
      </span>
    </div>
  );
}

function IconoHuellaRelleno() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <ellipse cx="6" cy="9" rx="1.9" ry="2.6" />
      <ellipse cx="10.5" cy="5.8" rx="1.9" ry="2.6" />
      <ellipse cx="15.5" cy="5.8" rx="1.9" ry="2.6" />
      <ellipse cx="19" cy="9.5" rx="1.9" ry="2.6" />
      <path d="M12.5 12c2.6 0 4.8 1.9 4.8 4.3 0 2-1.5 3.2-3.4 3.2-1 0-1.3-.4-2.4-.4s-1.4.4-2.4.4c-1.9 0-3.4-1.2-3.4-3.2 0-2.4 2.2-4.3 4.8-4.3Z" />
    </svg>
  );
}

function IconoDocRelleno() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5Z" />
      <path d="M14 3v4.5h4.5" />
    </svg>
  );
}

function IconoGloboRelleno() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12.5c0 3.6-3.6 6.5-8 6.5-1 0-2-.15-2.9-.42L4 20.5l1.3-3.3C4.2 16 3.5 14.4 3.5 12.5 3.5 8.9 7.1 6 11.5 6s8.5 2.9 8.5 6.5Z" />
    </svg>
  );
}

function IconoCasaRelleno() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function IconoCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}
