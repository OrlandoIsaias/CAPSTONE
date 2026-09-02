import { useTheme } from "../context/ThemeContext";

export function BotonTema() {
  const { tema, alternarTema } = useTheme();

  return (
    <button
      onClick={alternarTema}
      aria-label={tema === "claro" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-md flex items-center justify-center text-lg hover:brightness-95 transition"
    >
      {tema === "claro" ? "🌙" : "☀️"}
    </button>
  );
}
