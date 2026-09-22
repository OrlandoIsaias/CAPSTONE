import { createContext, useContext } from "react";

export type TipoToast = "exito" | "error" | "info";
export type MostrarToast = (mensaje: string, tipo?: TipoToast) => void;

export const ToastContext = createContext<MostrarToast | undefined>(undefined);

export function useToast(): MostrarToast {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de un <ToastProvider>");
  return ctx;
}
