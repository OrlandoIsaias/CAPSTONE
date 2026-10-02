import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Rol } from "../types/auth";

export function RutaProtegida({
  children,
  rolRequerido,
  permitirSinCuestionario = false,
}: {
  children: ReactNode;
  rolRequerido?: Rol;
  // Solo la pantalla del cuestionario: el resto exige haberlo completado.
  permitirSinCuestionario?: boolean;
}) {
  const { usuario, cargando, cuestionarioCompleto } = useAuth();

  if (cargando) return null;

  if (!usuario) {
    return <Navigate to={rolRequerido === "adoptante" ? "/login/adoptante" : "/login/refugio"} replace />;
  }

  if (rolRequerido && usuario.rol !== rolRequerido) {
    return <Navigate to="/" replace />;
  }

  // Sin cuestionario no hay compatibilidad que mostrar: el adoptante lo
  // completa antes de usar la app.
  if (usuario.rol === "adoptante" && !permitirSinCuestionario) {
    if (cuestionarioCompleto === null) return null;
    if (!cuestionarioCompleto) return <Navigate to="/perfil-adoptante/editar" replace />;
  }

  return <>{children}</>;
}
