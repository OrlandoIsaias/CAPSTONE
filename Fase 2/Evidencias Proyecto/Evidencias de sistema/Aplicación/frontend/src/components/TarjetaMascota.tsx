import { useState } from "react";
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
  /** Frase corta bajo la raza, en el tono del primario. */
  descripcion?: string;
  /** Si se pasa, la tarjeta muestra el corazón/pill de guardado en vez del score. */
  guardado?: boolean;
  onAlternarGuardado?: (mascotaId: number) => void;
}) {
  const mostrarGuardado = onAlternarGuardado !== undefined;
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      to={`/mascota/${mascotaId}`}
      className="group relative flex gap-3.5 items-center bg-white rounded-3xl border border-slate-200/90 p-3.5 shadow-xs hover:shadow-md hover:border-orange-300 transition-all active:scale-[0.99]"
    >
      {/* Marco de fotografía limpio y ajustado */}
      <div className="w-22 h-22 rounded-2xl overflow-hidden shadow-2xs border-2 border-white ring-2 ring-orange-200/80 bg-slate-100 shrink-0 flex items-center justify-center">
        {urlFoto && !imgError ? (
          <img
            src={urlFoto}
            alt={nombre}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-100 to-amber-200 text-orange-600">
            <span className="font-[family-name:var(--font-display)] text-2xl font-black">
              {nombre.charAt(0).toUpperCase()}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-orange-700/80">Sin foto</span>
          </div>
        )}
      </div>

      {/* Contenido e información */}
      <div className="flex-1 min-w-0 pr-10">
        <div className="mb-0.5">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-slate-900 truncate group-hover:text-orange-600 transition-colors">
            {nombre}
          </h3>
        </div>

        <p className="text-xs font-semibold text-slate-500 truncate">
          {[raza || especie, edad != null ? `${edad} ${edad === 1 ? "año" : "años"}` : undefined]
            .filter(Boolean)
            .join(" • ") || "Sin datos adicionales"}
        </p>

        {descripcion && (
          <p className="text-xs font-semibold text-orange-600 truncate mt-1 bg-orange-50/80 px-2 py-0.5 rounded-md inline-block max-w-full">
            {descripcion}
          </p>
        )}

        {score !== undefined && (
          <div className="mt-2">
            <InsigniaScore score={score} />
          </div>
        )}
      </div>

      {/* Botón de Guardar en Favoritos */}
      {mostrarGuardado && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAlternarGuardado(mascotaId);
          }}
          aria-label={guardado ? "Quitar de guardados" : "Guardar mascota"}
          className={`absolute top-3.5 right-3.5 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-2xs ${
            guardado
              ? "bg-rose-500 text-white shadow-rose-200"
              : "bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-500"
          }`}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill={guardado ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20.2s-7.8-4.7-9.9-9.3C.6 7.5 2.3 4.2 5.6 3.6c1.9-.4 3.8.4 4.9 2 .3.4.8.4 1 0 1.1-1.6 3-2.4 4.9-2 3.3.6 5 3.9 3.5 7.3-2.1 4.6-9.9 9.3-9.9 9.3Z" />
          </svg>
        </button>
      )}
    </Link>
  );
}
