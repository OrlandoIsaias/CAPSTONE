/** Bloque de esqueleto genérico — reemplaza el texto plano "Cargando…" por
    una silueta del contenido real, para que la pantalla no "salte" cuando
    los datos llegan y se perciba más rápida. Se compone según cada pantalla
    (ver SkeletonTarjeta / SkeletonMetrica más abajo, o uso directo). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[var(--color-superficie-apagada)] ${className}`} />;
}

/** Silueta de una fila tipo lista (foto + dos líneas de texto) — cubre
    MisMascotas, Solicitudes, Cuestionarios, etc. */
export function SkeletonFila() {
  return (
    <div className="flex items-center gap-3.5 bg-[var(--color-superficie)] rounded-2xl border border-[var(--color-borde)] p-3">
      <Skeleton className="w-16 h-16 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3.5 w-3/5" />
      </div>
    </div>
  );
}

/** Silueta de una tarjeta de métrica (los 4 cuadros de InicioRefugio). */
export function SkeletonMetrica() {
  return (
    <div className="rounded-2xl p-4 flex items-center gap-3 bg-[var(--color-superficie-apagada)]">
      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-8" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
