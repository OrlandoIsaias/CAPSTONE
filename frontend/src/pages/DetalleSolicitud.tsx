import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  confirmarAdopcion,
  detallePostulacion,
  evaluarPostulacion,
} from "../api/postulaciones";
import { AvatarIniciales, EstadoPostulacionBadge } from "../components/Badges";
import { PantallaRefugio } from "../components/BarraRefugio";
import { fechaCorta } from "../utils/tiempo";
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

  const [solicitud, setSolicitud] = useState<PostulacionDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    detallePostulacion(Number(id))
      .then(setSolicitud)
      .catch(() => setError("No pudimos cargar esta solicitud."))
      .finally(() => setCargando(false));
  }, [id]);

  async function evaluar(estado: "aprobada" | "rechazada") {
    if (!solicitud) return;
    setProcesando(true);
    setError(null);
    try {
      await evaluarPostulacion(solicitud.id, estado);
      const actualizada = await detallePostulacion(solicitud.id);
      setSolicitud(actualizada);
    } catch {
      setError("No pudimos actualizar la solicitud. Intenta de nuevo.");
    } finally {
      setProcesando(false);
    }
  }

  async function confirmar() {
    if (!solicitud) return;
    setProcesando(true);
    setError(null);
    try {
      await confirmarAdopcion(solicitud.id);
      const actualizada = await detallePostulacion(solicitud.id);
      setSolicitud(actualizada);
    } catch {
      setError("No pudimos confirmar la adopción. Intenta de nuevo.");
    } finally {
      setProcesando(false);
    }
  }

  const nombre = solicitud?.adoptante_nombre ?? `Adoptante #${solicitud?.adoptante_id ?? ""}`;

  return (
    <PantallaRefugio>
      <header className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate("/solicitudes")}
          aria-label="Volver"
          className="w-10 h-10 rounded-full bg-[var(--color-superficie-apagada)] flex items-center justify-center shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 5-7 7 7 7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">Solicitud de adopción</h1>
      </header>

      {cargando && <p className="text-[var(--color-texto-suave)] text-sm">Cargando…</p>}
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
                disabled={procesando}
                className="flex-1 py-3 rounded-xl font-semibold bg-[var(--color-primario-suave)] text-[var(--color-primario)] disabled:opacity-50"
              >
                Rechazar
              </button>
              <button
                onClick={() => evaluar("aprobada")}
                disabled={procesando}
                className="flex-[1.4] py-3 rounded-xl font-semibold bg-[var(--color-primario)] text-white hover:bg-[var(--color-primario-oscuro)] transition-colors disabled:opacity-50"
              >
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
              <button
                onClick={confirmar}
                disabled={procesando}
                className="w-full py-3 rounded-xl font-semibold bg-[var(--color-primario)] text-white hover:bg-[var(--color-primario-oscuro)] transition-colors disabled:opacity-50"
              >
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
