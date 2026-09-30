import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Usuario } from "../types/auth";

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

  // Al cargar la app, se usa sessionStorage para que la sesión solo persista
  // mientras la pestaña/navegador esté abierta, y se pida login al reabrir el navegador.
  useEffect(() => {
    // Limpieza de cualquier sesión persistente anterior en localStorage
    localStorage.removeItem("housefound_token");
    localStorage.removeItem("housefound_usuario");

    const tokenGuardado = sessionStorage.getItem("housefound_token");
    const usuarioGuardado = sessionStorage.getItem("housefound_usuario");
    if (tokenGuardado && usuarioGuardado) {
      try {
        setToken(tokenGuardado);
        setUsuario(JSON.parse(usuarioGuardado));
      } catch {
        sessionStorage.removeItem("housefound_token");
        sessionStorage.removeItem("housefound_usuario");
      }
    }
    setCargando(false);
  }, []);

  function iniciarSesion(nuevoToken: string, nuevoUsuario: Usuario) {
    sessionStorage.setItem("housefound_token", nuevoToken);
    sessionStorage.setItem("housefound_usuario", JSON.stringify(nuevoUsuario));
    setToken(nuevoToken);
    setUsuario(nuevoUsuario);
  }

  function cerrarSesion() {
    sessionStorage.removeItem("housefound_token");
    sessionStorage.removeItem("housefound_usuario");
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
