/** Spinner inline para botones en estado "procesando" — evita que el único
    indicador de que algo está pasando sea el texto cambiando ("Guardando…"),
    que es fácil de no notar en un botón. */
export function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Vista de carga a pantalla completa (dentro del contenido): spinner grande
    centrado + mensaje. Se usa mientras se espera la respuesta de la API en
    las pantallas que muestran resultados de una búsqueda/consulta. */
export function CargandoVista({
  mensaje = "Cargando…",
  className = "text-slate-400 py-16",
}: {
  mensaje?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Spinner className="w-9 h-9" />
      <p className="text-sm font-semibold">{mensaje}</p>
    </div>
  );
}
