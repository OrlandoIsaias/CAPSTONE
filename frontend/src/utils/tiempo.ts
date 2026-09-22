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
