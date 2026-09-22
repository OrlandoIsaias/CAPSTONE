import { createContext, useContext } from "react";

export interface OpcionesConfirmacion {
  titulo: string;
  descripcion?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  /** true = botón de confirmar en rojo (rechazar, acciones destructivas). */
  peligroso?: boolean;
}

export type Confirmar = (opciones: OpcionesConfirmacion) => Promise<boolean>;

export const ConfirmContext = createContext<Confirmar | undefined>(undefined);

export function useConfirm(): Confirmar {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm debe usarse dentro de un <ConfirmProvider>");
  return ctx;
}
