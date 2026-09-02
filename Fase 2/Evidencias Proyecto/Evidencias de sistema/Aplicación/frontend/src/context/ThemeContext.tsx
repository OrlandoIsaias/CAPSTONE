import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

type Tema = "claro" | "oscuro";

interface ThemeContextValue {
  tema: Tema;
  alternarTema: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function obtenerTemaInicial(): Tema {
  const temaGuardado = localStorage.getItem("housefound_theme");
  if (temaGuardado === "claro" || temaGuardado === "oscuro") {
    return temaGuardado;
  }
  const prefiereOscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefiereOscuro ? "oscuro" : "claro";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(obtenerTemaInicial);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", tema === "oscuro");
    localStorage.setItem("housefound_theme", tema);
  }, [tema]);

  function alternarTema() {
    setTema((actual) => (actual === "claro" ? "oscuro" : "claro"));
  }

  return (
    <ThemeContext.Provider value={{ tema, alternarTema }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const contexto = useContext(ThemeContext);
  if (!contexto) {
    throw new Error("useTheme debe usarse dentro de un <ThemeProvider>");
  }
  return contexto;
}
