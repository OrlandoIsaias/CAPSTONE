import { useCallback, useRef, useState, type ReactNode } from "react";
import { ConfirmContext, type Confirmar, type OpcionesConfirmacion } from "../context/ConfirmContext";

/** Hoja de confirmación global para decisiones que no se pueden deshacer
    (rechazar una solicitud, confirmar una adopción). En vez de ejecutar la
    acción al primer clic, se le pide al usuario que confirme — evita que un
    toque accidental tenga consecuencias reales. Uso: `await confirmar({...})`
    resuelve `true`/`false` según lo que elija la persona. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opciones, setOpciones] = useState<OpcionesConfirmacion | null>(null);
  const resolverRef = useRef<((valor: boolean) => void) | null>(null);

  const confirmar = useCallback<Confirmar>((nuevasOpciones) => {
    setOpciones(nuevasOpciones);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  function responder(valor: boolean) {
    setOpciones(null);
    resolverRef.current?.(valor);
    resolverRef.current = null;
  }

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      {opciones && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          <button
            aria-label="Cancelar"
            onClick={() => responder(false)}
            className="absolute inset-0 bg-black/40 animate-[fade-in_0.15s_ease-out]"
          />
          <div className="relative w-full sm:max-w-sm mx-4 sm:mx-auto mb-0 sm:mb-auto bg-[var(--color-superficie)] rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-[sheet-in_0.2s_ease-out] shadow-2xl">
            <h3 className="text-lg font-bold mb-1.5">{opciones.titulo}</h3>
            {opciones.descripcion && (
              <p className="text-sm text-[var(--color-texto-suave)] mb-5">{opciones.descripcion}</p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => responder(false)}
                className="flex-1 py-3 rounded-xl font-semibold bg-[var(--color-superficie-apagada)] text-[var(--color-texto)] active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2"
              >
                {opciones.textoCancelar ?? "Cancelar"}
              </button>
              <button
                onClick={() => responder(true)}
                autoFocus
                className="flex-1 py-3 rounded-xl font-semibold text-white active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{
                  backgroundColor: opciones.peligroso ? "var(--color-rojo)" : "var(--color-primario)",
                }}
              >
                {opciones.textoConfirmar ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
