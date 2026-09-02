import { Link } from "react-router-dom";
import { InsigniaScore } from "./InsigniaScore";

export function TarjetaMascota({
  mascotaId,
  nombre,
  especie,
  raza,
  score,
  urlFoto,
}: {
  mascotaId: number;
  nombre: string;
  especie?: string;
  raza?: string;
  score?: number;
  urlFoto?: string;
}) {
  return (
    <Link
      to={`/mascota/${mascotaId}`}
      className="flex gap-4 items-center bg-[var(--color-superficie)] rounded-lg border border-[var(--color-borde)] p-3 hover:shadow-md transition-shadow"
    >
      <div className="w-20 h-20 rounded-md bg-[var(--color-primario)]/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
        {urlFoto ? (
          <img src={urlFoto} alt={nombre} className="w-full h-full object-cover" />
        ) : (
          <span className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-primario)]">
            {nombre.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-[family-name:var(--font-display)] text-lg truncate">{nombre}</p>
        <p className="text-sm text-black/60 dark:text-white/60 truncate">
          {[especie, raza].filter(Boolean).join(" · ") || "Sin datos adicionales"}
        </p>
        {score !== undefined && (
          <div className="mt-1.5">
            <InsigniaScore score={score} />
          </div>
        )}
      </div>
    </Link>
  );
}
