import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  confirmarAdopcion,
  detallePostulacion,
  evaluarPostulacion,
} from "../api/postulaciones";
import { AvatarIniciales, EstadoPostulacionBadge } from "../components/Badges";
import { PantallaRefugio } from "../components/BarraRefugio";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";
import { fechaCorta } from "../utils/tiempo";
import { linkWhatsApp } from "../utils/telefono";
import type { PostulacionDetalle } from "../types/postulaciones";

const ESPACIO: Record<string, string> = {
  departamento: "Departamento",
  casa_patio: "Casa con patio",
  casa_grande: "Casa grande",
};

const EXPERIENCIA: Record<string, string> = {
  ninguna: "Sin experiencia previa",
  basica: "Experiencia básica",
  alta: "Con mucha experiencia",
};

const ACTIVIDAD: Record<string, string> = {
  bajo: "Baja",
  medio: "Media",
  alto: "Alta",
};

export default function DetalleSolicitud() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const confirmarAccion = useConfirm();
  const mostrarToast = useToast();

  const [solicitud, setSolicitud] = useState<PostulacionDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<"aprobar" | "rechazar" | "confirmar" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    detallePostulacion(Number(id))
      .then(setSolicitud)
      .catch(() => setError("No pudimos cargar esta solicitud."))
      .finally(() => setCargando(false));
  }, [id]);

  const nombre = solicitud?.adoptante_nombre ?? `Adoptante #${solicitud?.adoptante_id ?? ""}`;

  async function evaluar(estado: "aprobada" | "rechazada") {
    if (!solicitud) return;

    const ok = await confirmarAccion(
      estado === "aprobada"
        ? {
            titulo: `¿Aprobar a ${nombre}?`,
            descripcion: `Las demás solicitudes pendientes para ${solicitud.mascota_nombre} se rechazarán automáticamente.`,
            textoConfirmar: "Aprobar",
          }
        : {
            titulo: "¿Rechazar esta solicitud?",
            descripcion: `${nombre} ya no podrá ser reconsiderado para ${solicitud.mascota_nombre}. Esta acción no se puede deshacer.`,
            textoConfirmar: "Rechazar",
            peligroso: true,
          }
    );
    if (!ok) return;

    setProcesando(estado === "aprobada" ? "aprobar" : "rechazar");
    try {
      await evaluarPostulacion(solicitud.id, estado);
      const actualizada = await detallePostulacion(solicitud.id);
      setSolicitud(actualizada);
      mostrarToast(
        estado === "aprobada" ? `Solicitud aprobada — ${solicitud.mascota_nombre} quedó reservada` : "Solicitud rechazada",
        estado === "aprobada" ? "exito" : "info"
      );
    } catch {
      mostrarToast("No pudimos actualizar la solicitud. Intenta de nuevo.", "error");
    } finally {
      setProcesando(null);
    }
  }

  async function confirmar() {
    if (!solicitud) return;

    const ok = await confirmarAccion({
      titulo: `¿Confirmar la adopción de ${solicitud.mascota_nombre}?`,
      descripcion: "Esto la marca como adoptada de forma permanente y ya no aparecerá disponible para nadie más.",
      textoConfirmar: "Confirmar adopción",
    });
    if (!ok) return;

    setProcesando("confirmar");
    try {
      await confirmarAdopcion(solicitud.id);
      const actualizada = await detallePostulacion(solicitud.id);
      setSolicitud(actualizada);
      mostrarToast(`¡${solicitud.mascota_nombre} está en su nuevo hogar! 🎉`);
    } catch {
      mostrarToast("No pudimos confirmar la adopción. Intenta de nuevo.", "error");
    } finally {
      setProcesando(null);
    }
  }

  return (
    <PantallaRefugio>
      <header className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          aria-label="Volver"
          className="w-10 h-10 rounded-full bg-[var(--color-superficie-apagada)] flex items-center justify-center shrink-0 active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 5-7 7 7 7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">Solicitud de adopción</h1>
      </header>

      {cargando && (
        <>
          <Skeleton className="h-20 rounded-2xl mb-3" />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
          <Skeleton className="h-56 rounded-2xl mb-5" />
        </>
      )}
      {error && <p className="text-[var(--color-rojo)] text-sm mb-4">{error}</p>}

      {solicitud && (
        <>
          <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl p-4 flex items-center gap-3 mb-3">
            <AvatarIniciales nombre={nombre} grande />
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{nombre}</p>
              <p className="text-sm text-[var(--color-texto-suave)]">
                {fechaCorta(solicitud.fecha_postulacion)}
              </p>
            </div>
            <EstadoPostulacionBadge estado={solicitud.estado} />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-2xl p-4 bg-[var(--color-primario-suave)]">
              <p className="text-xs text-[var(--color-texto-suave)] mb-1.5">Mascota solicitada</p>
              <p className="font-bold text-[var(--color-primario)] truncate">
                {solicitud.mascota_nombre}
              </p>
            </div>
            <div className="rounded-2xl p-4 bg-[var(--color-verde-suave)]">
              <p className="text-xs text-[var(--color-texto-suave)] mb-1.5">
                Score de compatibilidad
              </p>
              {solicitud.score_compatibilidad != null ? (
                <p className="font-bold text-[var(--color-verde)] text-2xl leading-none">
                  {Math.round(solicitud.score_compatibilidad * 100)}
                  <span className="text-base">%</span>
                </p>
              ) : (
                <p className="text-sm text-[var(--color-texto-suave)]">Sin calcular</p>
              )}
            </div>
          </div>

          <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl p-4 mb-5">
            <h2 className="font-bold mb-1">Datos del hogar</h2>
            <p className="text-xs text-[var(--color-texto-suave)] mb-3">
              Respuestas del cuestionario de estilo de vida
            </p>
            <dl>
              <Dato
                etiqueta="Tipo de vivienda"
                valor={solicitud.espacio_disponible ? ESPACIO[solicitud.espacio_disponible] : null}
              />
              <Dato
                etiqueta="Experiencia previa"
                valor={
                  solicitud.experiencia_previa ? EXPERIENCIA[solicitud.experiencia_previa] : null
                }
              />
              <Dato
                etiqueta="Otras mascotas"
                valor={solicitud.otras_mascotas == null ? null : solicitud.otras_mascotas ? "Sí" : "No"}
              />
              <Dato
                etiqueta="Niños en casa"
                valor={solicitud.tiene_ninos == null ? null : solicitud.tiene_ninos ? "Sí" : "No"}
              />
              <Dato
                etiqueta="Disponibilidad"
                valor={
                  solicitud.tiempo_disponible_horas_dia != null
                    ? `${solicitud.tiempo_disponible_horas_dia} horas al día`
                    : null
                }
              />
              <Dato
                etiqueta="Actividad física"
                valor={
                  solicitud.nivel_actividad_fisica
                    ? ACTIVIDAD[solicitud.nivel_actividad_fisica]
                    : null
                }
                ultimo
              />
            </dl>
          </div>

          {solicitud.estado === "pendiente" && (
            <div className="flex gap-3">
              <button
                onClick={() => evaluar("rechazada")}
                disabled={procesando !== null}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold bg-[var(--color-primario-suave)] text-[var(--color-primario)] disabled:opacity-50 active:scale-[0.97] transition-transform disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2"
              >
                {procesando === "rechazar" && <Spinner />}
                Rechazar
              </button>
              <button
                onClick={() => evaluar("aprobada")}
                disabled={procesando !== null}
                className="flex-[1.4] flex items-center justify-center gap-2 py-3 rounded-xl font-semibold bg-[var(--color-primario)] text-white hover:bg-[var(--color-primario-oscuro)] transition-colors disabled:opacity-50 active:scale-[0.97] transition-transform disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2"
              >
                {procesando === "aprobar" && <Spinner />}
                Aprobar
              </button>
            </div>
          )}

          {solicitud.estado === "aprobada" && solicitud.mascota_estado === "en_proceso" && (
            <div className="rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] p-4">
              <p className="font-semibold mb-1">¿Ya entregaste a {solicitud.mascota_nombre}?</p>
              <p className="text-sm text-[var(--color-texto-suave)] mb-3">
                Confírmalo solo cuando la adopción se haya concretado. Mientras tanto la
                mascota queda reservada para {nombre}.
              </p>

              {solicitud.adoptante_telefono ? (
                <a
                  href={linkWhatsApp(
                    solicitud.adoptante_telefono,
                    `Hola ${nombre}, te escribo por la adopción de ${solicitud.mascota_nombre} 🐾 ¿Coordinamos la entrega?`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold bg-[var(--color-verde-suave)] text-[var(--color-verde)] mb-2.5 hover:brightness-95 active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-verde)] focus-visible:ring-offset-2"
                >
                  <IconoWhatsApp />
                  Coordinar por WhatsApp
                </a>
              ) : (
                <p className="text-xs text-[var(--color-texto-suave)] text-center mb-2.5">
                  {nombre} no registró un celular — no se puede coordinar por WhatsApp todavía.
                </p>
              )}

              <button
                onClick={confirmar}
                disabled={procesando !== null}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold bg-[var(--color-primario)] text-white hover:bg-[var(--color-primario-oscuro)] transition-colors disabled:opacity-50 active:scale-[0.98] transition-transform disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2"
              >
                {procesando === "confirmar" && <Spinner />}
                Confirmar adopción
              </button>
            </div>
          )}

          {solicitud.estado === "aprobada" && solicitud.mascota_estado === "adoptada" && (
            <div className="rounded-2xl bg-[var(--color-verde-suave)] p-4 text-center">
              <p className="font-semibold text-[var(--color-verde)]">Adopción confirmada</p>
              <p className="text-sm text-[var(--color-texto-suave)] mt-1">
                {solicitud.mascota_nombre} ya está en su nuevo hogar.
              </p>
            </div>
          )}

          {solicitud.estado === "rechazada" && (
            <div className="rounded-2xl bg-[var(--color-superficie-apagada)] p-4 text-center">
              <p className="font-medium text-[var(--color-texto-suave)]">
                Esta solicitud fue rechazada.
              </p>
            </div>
          )}
        </>
      )}
    </PantallaRefugio>
  );
}

function IconoWhatsApp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.05c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.11.11-1.79-.11-.41-.13-.94-.3-1.62-.6-2.85-1.23-4.71-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94 0-1.4.73-2.09 1-2.38.26-.28.57-.35.76-.35h.55c.18 0 .42-.03.65.5.24.55.81 1.9.88 2.04.07.14.12.3.02.49-.09.19-.14.3-.28.46-.14.16-.29.36-.42.48-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.45.12.61-.07.16-.19.7-.82.89-1.1.19-.28.37-.23.62-.14.26.09 1.63.77 1.91.91.28.14.47.21.54.33.07.12.07.68-.17 1.36Z" />
    </svg>
  );
}

function Dato({
  etiqueta,
  valor,
  ultimo,
}: {
  etiqueta: string;
  valor?: string | null;
  ultimo?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-2.5 ${
        ultimo ? "" : "border-b border-[var(--color-borde)]"
      }`}
    >
      <dt className="text-sm text-[var(--color-texto-suave)] shrink-0">{etiqueta}</dt>
      <dd className="text-sm font-semibold text-right">{valor ?? "No indicado"}</dd>
    </div>
  );
}
