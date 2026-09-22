import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { misPostulaciones } from "../api/postulaciones";
import { PantallaAdoptante } from "../components/BarraAdoptante";
import { AvatarIniciales, EstadoPostulacionBadge } from "../components/Badges";
import { fechaCorta } from "../utils/tiempo";
import { linkWhatsApp } from "../utils/telefono";
import type { Postulacion } from "../types/postulaciones";

export default function MisSolicitudes() {
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState<Postulacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    misPostulaciones()
      .then(setSolicitudes)
      .catch(() => setError("No pudimos cargar tus solicitudes."))
      .finally(() => setCargando(false));
  }, []);

  return (
    <PantallaAdoptante>
      <header className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          aria-label="Volver"
          className="w-10 h-10 rounded-full bg-[var(--color-superficie-apagada)] flex items-center justify-center shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 5-7 7 7 7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">Mis solicitudes</h1>
      </header>

      {cargando && <p className="text-[var(--color-texto-suave)] text-sm">Cargando…</p>}
      {error && <p className="text-[var(--color-rojo)] text-sm">{error}</p>}

      {!cargando && !error && solicitudes.length === 0 && (
        <div className="rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] p-6 text-center">
          <p className="font-medium">Todavía no postulas a ninguna mascota</p>
          <p className="text-sm text-[var(--color-texto-suave)] mt-1">
            Explora mascotas disponibles y postula a la que más te calce.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {solicitudes.map((s) => (
          <div
            key={s.id}
            className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl p-4"
          >
            <div className="flex items-center gap-3 mb-1">
              <AvatarIniciales nombre={s.mascota_nombre} />
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{s.mascota_nombre}</p>
                <p className="text-sm text-[var(--color-texto-suave)]">
                  {fechaCorta(s.fecha_postulacion)}
                </p>
              </div>
              <EstadoPostulacionBadge estado={s.estado} />
            </div>

            {s.estado === "aprobada" && (
              <div className="mt-3 pt-3 border-t border-[var(--color-borde)]">
                <p className="text-sm text-[var(--color-texto-suave)] mb-2">
                  {s.mascota_estado === "adoptada"
                    ? `¡${s.mascota_nombre} ya está en su nuevo hogar! 🎉`
                    : `¡Tu solicitud fue aprobada! Coordina la entrega con ${s.refugio_nombre ?? "el refugio"}.`}
                </p>
                {s.mascota_estado !== "adoptada" &&
                  (s.refugio_telefono ? (
                    <a
                      href={linkWhatsApp(
                        s.refugio_telefono,
                        `Hola, te escribo por la adopción de ${s.mascota_nombre} 🐾 ¿Coordinamos la entrega?`
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold bg-[var(--color-verde-suave)] text-[var(--color-verde)] hover:brightness-95 transition"
                    >
                      <IconoWhatsApp />
                      Coordinar por WhatsApp
                    </a>
                  ) : (
                    <p className="text-xs text-[var(--color-texto-suave)]">
                      El refugio no registró un celular todavía.
                    </p>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </PantallaAdoptante>
  );
}

function IconoWhatsApp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.05c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.11.11-1.79-.11-.41-.13-.94-.3-1.62-.6-2.85-1.23-4.71-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94 0-1.4.73-2.09 1-2.38.26-.28.57-.35.76-.35h.55c.18 0 .42-.03.65.5.24.55.81 1.9.88 2.04.07.14.12.3.02.49-.09.19-.14.3-.28.46-.14.16-.29.36-.42.48-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.45.12.61-.07.16-.19.7-.82.89-1.1.19-.28.37-.23.62-.14.26.09 1.63.77 1.91.91.28.14.47.21.54.33.07.12.07.68-.17 1.36Z" />
    </svg>
  );
}
