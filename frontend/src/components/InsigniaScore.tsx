export function InsigniaScore({ score }: { score: number }) {
  const porcentaje = Math.round(score * 100);

  let estilo: string;
  if (porcentaje >= 80) {
    estilo = "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs shadow-emerald-500/20";
  } else if (porcentaje >= 50) {
    estilo = "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs shadow-amber-500/20";
  } else {
    estilo = "bg-slate-200 text-slate-700";
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-black tracking-wide ${estilo}`}
    >
      {porcentaje}% compatible
    </span>
  );
}
