import { NavLink } from "react-router-dom";
import { CircleUserRound, Heart, HeartHandshake, Home } from "lucide-react";
import type { ReactNode } from "react";

type TabColor = "orange" | "emerald" | "rose" | "indigo";

const PESTANAS: { to: string; etiqueta: string; icono: ReactNode; color: TabColor }[] = [
  { to: "/explorar", etiqueta: "Inicio", icono: <Home size={20} strokeWidth={1.8} />, color: "orange" },
  {
    to: "/recomendaciones",
    etiqueta: "Coincidencias",
    icono: <HeartHandshake size={20} strokeWidth={1.8} />,
    color: "emerald",
  },
  { to: "/guardados", etiqueta: "Guardados", icono: <Heart size={20} strokeWidth={1.8} />, color: "rose" },
  {
    to: "/perfil-adoptante",
    etiqueta: "Mi perfil",
    icono: <CircleUserRound size={20} strokeWidth={1.8} />,
    color: "indigo",
  },
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
