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

  // Al cargar la app, recupera la sesión guardada (si existe), para que
  // el usuario no tenga que loguearse de nuevo cada vez que refresca.
  useEffect(() => {
    const tokenGuardado = localStorage.getItem("housefound_token");
    const usuarioGuardado = localStorage.getItem("housefound_usuario");
    if (tokenGuardado && usuarioGuardado) {
      setToken(tokenGuardado);
      setUsuario(JSON.parse(usuarioGuardado));
    }
    setCargando(false);
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
