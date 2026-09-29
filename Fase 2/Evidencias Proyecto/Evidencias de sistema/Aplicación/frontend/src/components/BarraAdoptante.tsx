import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

type TabColor = "orange" | "emerald" | "rose" | "indigo";

const PESTANAS: { to: string; etiqueta: string; icono: ReactNode; color: TabColor }[] = [
  { to: "/explorar", etiqueta: "Inicio", icono: <IconoCasa />, color: "orange" },
  { to: "/recomendaciones", etiqueta: "Coincidencias", icono: <IconoCoincidencia />, color: "emerald" },
  { to: "/guardados", etiqueta: "Guardados", icono: <IconoCorazon />, color: "rose" },
  { to: "/perfil-adoptante", etiqueta: "Mi perfil", icono: <IconoPerfil />, color: "indigo" },
];

const ESTILOS_PESTANA: Record<TabColor, { iconoActivo: string; textoActivo: string }> = {
  orange: {
    iconoActivo: "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-xs shadow-orange-500/30",
    textoActivo: "text-orange-600 font-bold",
  },
  emerald: {
    iconoActivo: "bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-xs shadow-emerald-600/30",
    textoActivo: "text-emerald-700 font-bold",
  },
  rose: {
    iconoActivo: "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-xs shadow-rose-500/30",
    textoActivo: "text-rose-600 font-bold",
  },
  indigo: {
    iconoActivo: "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xs shadow-indigo-600/30",
    textoActivo: "text-indigo-700 font-bold",
  },
};

export function BarraAdoptante() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg z-40">
      <div className="flex px-1 py-1">
        {PESTANAS.map((p) => {
          const estilo = ESTILOS_PESTANA[p.color];
          return (
            <NavLink
              key={p.to}
              to={p.to}
              className="flex-1 py-1.5 flex flex-col items-center gap-1 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2 rounded-xl"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`w-10 h-8 rounded-xl flex items-center justify-center transition-all ${
                      isActive
                        ? estilo.iconoActivo
                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/60"
                    }`}
                  >
                    {p.icono}
                  </span>
                  <span
                    className={`text-[11px] leading-none transition-colors ${
                      isActive ? estilo.textoActivo : "text-slate-500 font-medium"
                    }`}
                  >
                    {p.etiqueta}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
      {/* Respeta la barra gestual de los teléfonos sin notch físico */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

/** Contenedor común de las pantallas del adoptante: mismo ancho de teléfono
    centrado que PantallaRefugio, con espacio inferior reservado para la barra. */
export function PantallaAdoptante({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-fondo)]">
      <div className="mx-auto w-full max-w-[480px] px-5 pt-6 pb-28">{children}</div>
      <BarraAdoptante />
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

/** Huella dentro de una mano abierta: representa el "match" */
function IconoCoincidencia() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 13.5c0-4.5 2.7-8 6-8 1.6 0 2.7 1 3 2" />
      <ellipse cx="15.3" cy="7.3" rx="1.5" ry="2" />
      <ellipse cx="18.6" cy="10.2" rx="1.4" ry="1.9" />
      <path d="M20.2 14c0 3.2-3.2 6-7.2 6-1.7 0-2.7-.5-3.8-.5-1.2 0-2 .5-3.4.5C3.6 20 2 18.4 2 16.3c0-1.8 1.3-3.3 3-3.3.9 0 1.4.3 2.2.3 1.5 0 2-1.2 4-1.2 3.4 0 9 1.1 9 1.9Z" />
    </svg>
  );
}

function IconoCorazon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20.2s-7.8-4.7-9.9-9.3C.6 7.5 2.3 4.2 5.6 3.6c1.9-.4 3.8.4 4.9 2 .3.4.8.4 1 0 1.1-1.6 3-2.4 4.9-2 3.3.6 5 3.9 3.5 7.3-2.1 4.6-9.9 9.3-9.9 9.3Z" />
    </svg>
  );
}

function IconoPerfil() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.4" />
      <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
    </svg>
  );
}
