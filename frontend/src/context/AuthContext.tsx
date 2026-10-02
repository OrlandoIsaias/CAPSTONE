import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import axios from "axios";
import { obtenerPerfilAdoptante } from "../api/auth";
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
  // Solo adoptantes; null mientras se consulta. RutaProtegida lo usa para
  // llevarlo al cuestionario antes de dejarlo usar la app.
  cuestionarioCompleto: boolean | null;
  marcarCuestionarioCompleto: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cuestionarioCompleto, setCuestionarioCompleto] = useState<boolean | null>(null);

  // Al cargar la app, se usa sessionStorage para que la sesión solo persista
  // mientras la pestaña/navegador esté abierta, y se pida login al reabrir el navegador.
  useEffect(() => {
    // Limpieza de cualquier sesión persistente anterior en localStorage
    localStorage.removeItem("housefound_token");
    localStorage.removeItem("housefound_usuario");

    const tokenGuardado = sessionStorage.getItem("housefound_token");
    const usuarioGuardado = sessionStorage.getItem("housefound_usuario");
    let sesionRestaurada = false;
    if (tokenGuardado && usuarioGuardado && !tokenExpirado(tokenGuardado)) {
      try {
        setUsuario(JSON.parse(usuarioGuardado));
        setToken(tokenGuardado);
        sesionRestaurada = true;
      } catch {
        sesionRestaurada = false;
      }
    }
    if (!sesionRestaurada) {
      sessionStorage.removeItem("housefound_token");
      sessionStorage.removeItem("housefound_usuario");
    }
    setCargando(false);

    // El interceptor de apiClient avisa cuando el backend rechaza el token,
    // para que la UI salga del panel en vez de quedarse mostrando errores.
    function alExpirar() {
      setToken(null);
      setUsuario(null);
      setCuestionarioCompleto(null);
    }
    window.addEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
  }, []);

  // Una consulta por sesión. 404 = se registró sin teléfono y aún no tiene
  // perfil. Ante otro error no se bloquea la app: el backend igual exige el
  // cuestionario para recomendar y para postular.
  useEffect(() => {
    if (usuario?.rol !== "adoptante") return;
    let vigente = true;
    obtenerPerfilAdoptante()
      .then((perfil) => {
        if (vigente) setCuestionarioCompleto(perfil.cuestionario_completo);
      })
      .catch((err) => {
        if (vigente) setCuestionarioCompleto(!(axios.isAxiosError(err) && err.response?.status === 404));
      });
    return () => {
      vigente = false;
    };
  }, [usuario]);

  function iniciarSesion(nuevoToken: string, nuevoUsuario: Usuario) {
    sessionStorage.setItem("housefound_token", nuevoToken);
    sessionStorage.setItem("housefound_usuario", JSON.stringify(nuevoUsuario));
    setToken(nuevoToken);
    setUsuario(nuevoUsuario);
    setCuestionarioCompleto(null);
  }

  function cerrarSesion() {
    sessionStorage.removeItem("housefound_token");
    sessionStorage.removeItem("housefound_usuario");
    localStorage.removeItem("housefound_token");
    localStorage.removeItem("housefound_usuario");
    setToken(null);
    setUsuario(null);
    setCuestionarioCompleto(null);
  }

  function marcarCuestionarioCompleto() {
    setCuestionarioCompleto(true);
  }

  return (
    <AuthContext.Provider
      value={{ usuario, token, cargando, iniciarSesion, cerrarSesion, cuestionarioCompleto, marcarCuestionarioCompleto }}
    >
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
