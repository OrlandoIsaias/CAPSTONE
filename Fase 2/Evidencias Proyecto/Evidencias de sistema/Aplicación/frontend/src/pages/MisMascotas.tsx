import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { misMascotas } from "../api/mascotas";
import { useAuth } from "../context/AuthContext";
import type { Mascota } from "../types/mascotas";

const ESTADO_ESTILOS: Record<string, string> = {
  disponible: "bg-[var(--color-primario)]/10 text-[var(--color-primario)]",
  en_proceso: "bg-[var(--color-acento)]/20 text-[var(--color-acento)]",
  adoptada: "bg-black/10 text-black/60 dark:text-white/60",
};

const ESTADO_ETIQUETAS: Record<string, string> = {
  disponible: "Disponible",
  en_proceso: "En proceso",
  adoptada: "Adoptada",
};

export default function MisMascotas() {
  const { usuario, cerrarSesion } = useAuth();
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    misMascotas()
      .then(setMascotas)
      .catch(() => setError("No pudimos cargar tus mascotas."))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-sm text-[var(--color-primario)] font-medium mb-1">
              Hola, {usuario?.nombre}
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl">Tus mascotas</h1>
          </div>
          <button onClick={cerrarSesion} className="text-sm text-black/50 dark:text-white/50 hover:text-black">
            Cerrar sesión
          </button>
        </div>

        <Link
          to="/mascota/nueva"
          className="inline-block mb-6 bg-[var(--color-acento)] text-[var(--color-texto)] font-semibold px-4 py-2.5 rounded-md hover:brightness-95 transition"
        >
          + Publicar una mascota
        </Link>

        {cargando && <p className="text-black/50 dark:text-white/50">Cargando…</p>}
        {error && <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>}

        {!cargando && !error && mascotas.length === 0 && (
          <p className="text-black/60 dark:text-white/60">Todavía no has publicado ninguna mascota.</p>
        )}

        <div className="space-y-3">
          {mascotas.map((m) => (
            <div
              key={m.id}
              className="flex gap-4 items-center bg-[var(--color-superficie)] rounded-lg border border-[var(--color-borde)] p-3"
            >
              <div className="w-16 h-16 rounded-md bg-[var(--color-primario)]/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
                {m.fotos[0] ? (
                  <img src={m.fotos[0].url} alt={m.nombre} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-[family-name:var(--font-display)] text-xl text-[var(--color-primario)]">
                    {m.nombre.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-[family-name:var(--font-display)] text-lg truncate">{m.nombre}</p>
                <p className="text-sm text-black/60 dark:text-white/60 truncate">
                  {[m.especie, m.raza].filter(Boolean).join(" · ") || "Sin datos adicionales"}
                </p>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ESTADO_ESTILOS[m.estado] ?? ""}`}
              >
                {ESTADO_ETIQUETAS[m.estado] ?? m.estado}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
