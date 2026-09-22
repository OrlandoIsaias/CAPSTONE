import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

const PESTANAS = [
  { to: "/inicio", etiqueta: "Inicio", icono: <IconoCasa /> },
  { to: "/mis-mascotas", etiqueta: "Mascotas", icono: <IconoHuella /> },
  { to: "/solicitudes", etiqueta: "Solicitudes", icono: <IconoDocumento /> },
  { to: "/cuestionarios", etiqueta: "Preguntas", icono: <IconoGlobo /> },
];

export function BarraRefugio() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-[var(--color-superficie)] border-t border-[var(--color-borde)] z-40">
      <div className="flex">
        {PESTANAS.map((p) => (
          <NavLink key={p.to} to={p.to} className="flex-1 py-2 flex flex-col items-center gap-1">
            {({ isActive }) => (
              <>
                <span
                  className={`w-10 h-8 rounded-xl flex items-center justify-center transition-colors ${
                    isActive
                      ? "bg-[var(--color-primario-suave)] text-[var(--color-primario)]"
                      : "text-[var(--color-texto-suave)]"
                  }`}
                >
                  {p.icono}
                </span>
                <span
                  className={`text-[11px] leading-none ${
                    isActive
                      ? "text-[var(--color-primario)] font-semibold"
                      : "text-[var(--color-texto-suave)]"
                  }`}
                >
                  {p.etiqueta}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
      {/* Respeta la barra gestual de los teléfonos sin notch físico */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

/** Contenedor común de las pantallas del refugio: ancho de teléfono centrado
    (para que en escritorio no se estire y pierda la forma del mockup) y
    espacio inferior reservado para que la barra no tape el contenido. */
export function PantallaRefugio({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-fondo)]">
      <div className="mx-auto w-full max-w-[480px] px-5 pt-6 pb-28">{children}</div>
      <BarraRefugio />
    </div>
  );
}

function IconoCasa() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function IconoHuella() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="6" cy="9" rx="1.9" ry="2.6" />
      <ellipse cx="10.5" cy="5.8" rx="1.9" ry="2.6" />
      <ellipse cx="15.5" cy="5.8" rx="1.9" ry="2.6" />
      <ellipse cx="19" cy="9.5" rx="1.9" ry="2.6" />
      <path d="M12.5 12c2.6 0 4.8 1.9 4.8 4.3 0 2-1.5 3.2-3.4 3.2-1 0-1.3-.4-2.4-.4s-1.4.4-2.4.4c-1.9 0-3.4-1.2-3.4-3.2 0-2.4 2.2-4.3 4.8-4.3Z" />
    </svg>
  );
}

function IconoDocumento() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5Z" />
      <path d="M14 3v4.5h4.5" />
    </svg>
  );
}

function IconoGlobo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12.5c0 3.6-3.6 6.5-8 6.5-1 0-2-.15-2.9-.42L4 20.5l1.3-3.3C4.2 16 3.5 14.4 3.5 12.5 3.5 8.9 7.1 6 11.5 6s8.5 2.9 8.5 6.5Z" />
    </svg>
  );
}
