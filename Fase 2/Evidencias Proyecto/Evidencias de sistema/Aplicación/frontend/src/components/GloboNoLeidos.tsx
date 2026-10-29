/** Contador rojo sobre el ícono de Seguimiento en las barras de navegación. */
export function GloboNoLeidos({ total }: { total: number }) {
  if (total <= 0) return null;
  return (
    <span
      aria-label={`${total} mensajes sin leer`}
      className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold leading-[18px] text-center ring-2 ring-white"
    >
      {total > 9 ? "9+" : total}
    </span>
  );
}
