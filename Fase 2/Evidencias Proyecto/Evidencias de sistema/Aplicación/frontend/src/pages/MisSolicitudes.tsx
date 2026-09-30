import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { ChevronLeft } from "lucide-react";
import { misPostulaciones } from "../api/postulaciones";
import { PantallaAdoptante } from "../components/BarraAdoptante";
import { AvatarIniciales, EstadoPostulacionBadge } from "../components/Badges";
import { CargandoVista } from "../components/Spinner";
import { fechaCorta } from "../utils/tiempo";
import { linkWhatsApp } from "../utils/telefono";
import type { Postulacion } from "../types/postulaciones";

export default function MisSolicitudes() {
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState<Postulacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controlador = new AbortController();

    misPostulaciones(controlador.signal)
      .then(setSolicitudes)
      .catch((err) => {
        if (!axios.isCancel(err)) setError("No pudimos cargar tus solicitudes.");
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false);
      });

    return () => controlador.abort();
  }, []);

  return (
    <PantallaAdoptante>
      <header className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          aria-label="Volver"
          className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center shrink-0 active:scale-90 transition-transform shadow-2xs"
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-900 leading-tight">Mis Solicitudes</h1>
        </div>
      </header>

      {cargando && <CargandoVista mensaje="Cargando tus solicitudes…" />}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium mb-4">
          {error}
        </div>
      )}

      {!cargando && !error && solicitudes.length === 0 && (
        <div className="rounded-3xl bg-white border border-slate-200/90 p-8 text-center shadow-xs">
          <h2 className="font-extrabold text-slate-800 text-base mb-1">
            No tienes postulaciones activas
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto mb-5 leading-relaxed">
            Cuando encuentres una mascota que te interese, presiona "Postular a esta mascota" para iniciar el proceso de adopción.
          </p>
          <Link
            to="/explorar"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs shadow-sm hover:shadow-md active:scale-95 transition-all"
          >
            Explorar Compañeros
          </Link>
        </div>
      )}

      <div className="space-y-3.5">
        {solicitudes.map((s) => {
          const esAprobada = s.estado === "aprobada";
          return (
            <div
              key={s.id}
              className={`rounded-3xl border p-4 shadow-xs transition-all ${
                esAprobada
                  ? "bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40 border-emerald-300"
                  : "bg-white border-slate-200/90"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <AvatarIniciales nombre={s.mascota_nombre} />
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-slate-900 text-base truncate">{s.mascota_nombre}</p>
                  <p className="text-xs font-semibold text-slate-400">
                    Enviada el {fechaCorta(s.fecha_postulacion)}
                  </p>
                </div>
                <EstadoPostulacionBadge estado={s.estado} />
              </div>

              {s.estado === "pendiente" && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50/60 px-3 py-2 rounded-2xl">
                  <span>El refugio está evaluando tu perfil de estilo de vida.</span>
                </div>
              )}

              {s.estado === "aprobada" && (
                <div className="mt-3 pt-3 border-t border-emerald-200/70 space-y-2.5">
                  <p className="text-xs font-bold text-emerald-900">
                    {s.mascota_estado === "adoptada"
                      ? `La adopción de ${s.mascota_nombre} fue concretada con éxito.`
                      : `¡Tu postulación fue aprobada! Coordina los detalles con ${s.refugio_nombre ?? "el refugio"}.`}
                  </p>
                  {s.mascota_estado !== "adoptada" &&
                    (s.refugio_telefono ? (
                      <a
                        href={linkWhatsApp(
                          s.refugio_telefono,
                          `Hola, te escribo por la adopción de ${s.mascota_nombre}. ¿Coordinamos la entrega?`
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm hover:shadow-md active:scale-95 transition-all text-xs"
                      >
                        <IconoWhatsApp />
                        Coordinar Entrega por WhatsApp
                      </a>
                    ) : (
                      <p className="text-xs text-slate-400 font-medium text-center py-1.5 bg-slate-50 rounded-xl">
                        El refugio se comunicará pronto para coordinar la entrega.
                      </p>
                    ))}
                </div>
              )}

              {s.estado === "rechazada" && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-400 px-2">
                  Esta solicitud no prosperó. Puedes postular a otros animales disponibles.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PantallaAdoptante>
  );
}

function IconoWhatsApp() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.05c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.11.11-1.79-.11-.41-.13-.94-.3-1.62-.6-2.85-1.23-4.71-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94 0-1.4.73-2.09 1-2.38.26-.28.57-.35.76-.35h.55c.18 0 .42-.03.65.5.24.55.81 1.9.88 2.04.07.14.12.3.02.49-.09.19-.14.3-.28.46-.14.16-.29.36-.42.48-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.45.12.61-.07.16-.19.7-.82.89-1.1.19-.28.37-.23.62-.14.26.09 1.63.77 1.91.91.28.14.47.21.54.33.07.12.07.68-.17 1.36Z" />
    </svg>
  );
}
