import { Link } from "react-router-dom";
import { InsigniaScore } from "./InsigniaScore";

export function TarjetaMascota({
  mascotaId,
  nombre,
  especie,
  raza,
  edad,
  score,
  urlFoto,
  descripcion,
  guardado,
  onAlternarGuardado,
}: {
  mascotaId: number;
  nombre: string;
  especie?: string;
  raza?: string;
  edad?: number;
  score?: number;
  urlFoto?: string;
  /** Frase corta bajo la raza, en el tono del primario (ver mockup "Explora mascotas"). */
  descripcion?: string;
  /** Si se pasa, la tarjeta muestra el corazón/pill de guardado en vez del score. */
  guardado?: boolean;
  onAlternarGuardado?: (mascotaId: number) => void;
}) {
  const mostrarGuardado = onAlternarGuardado !== undefined;

  return (
    <Link
      to={`/mascota/${mascotaId}`}
      className="relative flex gap-4 items-center bg-[var(--color-superficie)] rounded-2xl border border-[var(--color-borde)] p-3 hover:shadow-md transition-shadow"
    >
      <div className="w-20 h-20 rounded-xl bg-[var(--color-primario)]/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
        {urlFoto ? (
          <img src={urlFoto} alt={nombre} className="w-full h-full object-cover" />
        ) : (
          <span className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-primario)]">
            {nombre.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0 pr-8">
        <p className="font-[family-name:var(--font-display)] text-lg truncate">{nombre}</p>
        <p className="text-sm text-[var(--color-texto-suave)] truncate">
          {[raza || especie, edad != null ? `${edad} años` : undefined]
            .filter(Boolean)
            .join(" · ") || "Sin datos adicionales"}
        </p>
        {descripcion && (
          <p className="text-sm text-[var(--color-primario)] font-medium truncate mt-0.5">{descripcion}</p>
        )}
        {!mostrarGuardado && score !== undefined && (
          <div className="mt-1.5">
            <InsigniaScore score={score} />
          </div>
        )}
      </div>

      {mostrarGuardado &&
        (guardado ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onAlternarGuardado(mascotaId);
            }}
            className="absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "var(--color-primario-suave)", color: "var(--color-primario)" }}
          >
            Guardado
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onAlternarGuardado(mascotaId);
            }}
            aria-label="Guardar mascota"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[var(--color-superficie-apagada)] flex items-center justify-center text-[var(--color-primario)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20.2s-7.8-4.7-9.9-9.3C.6 7.5 2.3 4.2 5.6 3.6c1.9-.4 3.8.4 4.9 2 .3.4.8.4 1 0 1.1-1.6 3-2.4 4.9-2 3.3.6 5 3.9 3.5 7.3-2.1 4.6-9.9 9.3-9.9 9.3Z" />
            </svg>
          </button>
        ))}
    </Link>
  );
}
