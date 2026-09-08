export function InsigniaScore({ score }: { score: number }) {
  const porcentaje = Math.round(score * 100);

  let colorFondo = "bg-[var(--color-primario)]";
  if (porcentaje < 50) colorFondo = "bg-black/30";
  else if (porcentaje < 80) colorFondo = "bg-[var(--color-acento)]";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold text-white ${colorFondo}`}
    >
      {porcentaje}% compatible
    </span>
  );
}
