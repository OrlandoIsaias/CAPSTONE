import { useCallback, useState, type ReactNode } from "react";
import { AlertCircle, Check } from "lucide-react";
import { ToastContext, type MostrarToast, type TipoToast } from "../context/ToastContext";

interface ToastItem {
  id: number;
  tipo: TipoToast;
  mensaje: string;
}

/** Sistema de feedback global: cualquier pantalla puede confirmar una acción
    ("Solicitud aprobada", "Mascota publicada") sin tener que inventar su
    propio mensaje inline que aparece y desaparece a mano. Se monta una sola
    vez en App.tsx, así que funciona igual en cualquier ruta. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const mostrarToast = useCallback<MostrarToast>((mensaje, tipo = "exito") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, tipo, mensaje }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={mostrarToast}>
      {children}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 w-full max-w-[420px] px-5 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto w-full flex items-center gap-2.5 rounded-2xl px-4 py-3 shadow-lg text-sm font-semibold text-white animate-[toast-in_0.25s_ease-out]"
            style={{
              backgroundColor:
                t.tipo === "exito"
                  ? "var(--color-verde)"
                  : t.tipo === "error"
                    ? "var(--color-rojo)"
                    : "var(--color-texto)",
            }}
          >
            {t.tipo === "exito" && <Check size={18} strokeWidth={2.4} className="shrink-0" />}
            {t.tipo === "error" && <AlertCircle size={18} strokeWidth={2.2} className="shrink-0" />}
            <span className="flex-1">{t.mensaje}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
