import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { EVENTO_SESION_EXPIRADA } from "../api/client";
import type { Usuario } from "../types/auth";

function tokenExpirado(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

interface AuthContextValue {
  usuario: Usuario | null;
  token: string | null;
  cargando: boolean;
  iniciarSesion: (token: string, usuario: Usuario) => void;
  cerrarSesion: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  // Al cargar la app, recupera la sesión guardada (si existe), para que
  // el usuario no tenga que loguearse de nuevo cada vez que refresca.
  useEffect(() => {
    const tokenGuardado = localStorage.getItem("housefound_token");
    const usuarioGuardado = localStorage.getItem("housefound_usuario");
    if (tokenGuardado && usuarioGuardado && !tokenExpirado(tokenGuardado)) {
      setToken(tokenGuardado);
      setUsuario(JSON.parse(usuarioGuardado));
    } else {
      localStorage.removeItem("housefound_token");
      localStorage.removeItem("housefound_usuario");
    }
    setCargando(false);

    // El interceptor de apiClient avisa cuando el backend rechaza el token,
    // para que la UI salga del panel en vez de quedarse mostrando errores.
    function alExpirar() {
      setToken(null);
      setUsuario(null);
    }
    window.addEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
  }, []);

  function iniciarSesion(nuevoToken: string, nuevoUsuario: Usuario) {
    localStorage.setItem("housefound_token", nuevoToken);
    localStorage.setItem("housefound_usuario", JSON.stringify(nuevoUsuario));
    setToken(nuevoToken);
    setUsuario(nuevoUsuario);
  }

  function cerrarSesion() {
    localStorage.removeItem("housefound_token");
    localStorage.removeItem("housefound_usuario");
    setToken(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, token, cargando, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth debe usarse dentro de un <AuthProvider>");
  }
  return contexto;
}
