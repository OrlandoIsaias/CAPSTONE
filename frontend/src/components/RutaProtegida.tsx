import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Rol } from "../types/auth";

export function RutaProtegida({
  children,
  rolRequerido,
}: {
  children: ReactNode;
  rolRequerido?: Rol;
}) {
  const { usuario, cargando } = useAuth();

  if (cargando) return null;

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (rolRequerido && usuario.rol !== rolRequerido) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
