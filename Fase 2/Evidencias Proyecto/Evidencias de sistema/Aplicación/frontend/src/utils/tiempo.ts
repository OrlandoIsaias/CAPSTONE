/** El backend serializa los timestamps sin zona horaria (columnas
    `timestamp without time zone` alimentadas por `now()` del servidor, que
    corre en UTC). Si se los pasa tal cual a `new Date()`, el navegador los
    interpreta como hora LOCAL y una postulación recién creada aparece con
    horas de antigüedad. Por eso marcamos explícitamente el valor como UTC. */
function aFecha(iso: string): Date {
  const tieneZona = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
  return new Date(tieneZona ? iso : `${iso}Z`);
}

export function tiempoRelativo(iso: string): string {
  const minutos = Math.floor((Date.now() - aFecha(iso).getTime()) / 60000);

  if (minutos < 1) return "recién";
  if (minutos < 60) return `hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;

  return aFecha(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

export function fechaCorta(iso: string): string {
  return aFecha(iso).toLocaleDateString("es-CL", { day: "numeric", month: "long" });
}

/** Días completos transcurridos desde `iso` — para detectar solicitudes o
    publicaciones "estancadas" (ver InicioRefugio.tsx). */
export function diasDesde(iso: string): number {
  return Math.floor((Date.now() - aFecha(iso).getTime()) / 86_400_000);
}

/** "14:32" — hora de un mensaje del chat. */
export function horaCorta(iso: string): string {
  return aFecha(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

/** Separador de días del chat: "Hoy", "Ayer" o "12 de octubre". */
export function etiquetaDia(iso: string): string {
  const fecha = aFecha(iso);
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  if (fecha.toDateString() === hoy.toDateString()) return "Hoy";
  if (fecha.toDateString() === ayer.toDateString()) return "Ayer";
  return fechaCorta(iso);
}

/** "1:05" — duración de un audio o video. */
export function duracionCorta(segundos: number): string {
  const total = Math.max(0, Math.round(segundos));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
