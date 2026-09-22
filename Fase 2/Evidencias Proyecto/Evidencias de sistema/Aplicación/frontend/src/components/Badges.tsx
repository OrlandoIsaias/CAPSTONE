import type { EstadoMascota } from "../types/mascotas";
import type { EstadoPostulacion } from "../types/postulaciones";

/* El color nunca va solo: cada badge lleva siempre su etiqueta de texto,
   para que el estado se entienda sin depender de distinguir tonos. */

const BASE = "text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0";

const MASCOTA: Record<EstadoMascota, { texto: string; fondo: string; tinta: string }> = {
  disponible: {
    texto: "Disponible",
    fondo: "var(--color-verde-suave)",
    tinta: "var(--color-verde)",
  },
  en_proceso: {
    texto: "En proceso",
    fondo: "var(--color-primario-suave)",
    tinta: "var(--color-primario)",
  },
  adoptada: {
    texto: "Adoptada",
    fondo: "var(--color-superficie-apagada)",
    tinta: "var(--color-texto-suave)",
  },
};

const POSTULACION: Record<EstadoPostulacion, { texto: string; fondo: string; tinta: string }> = {
  pendiente: {
    texto: "Pendiente",
    fondo: "var(--color-primario-suave)",
    tinta: "var(--color-primario)",
  },
  aprobada: {
    texto: "Aprobada",
    fondo: "var(--color-verde-suave)",
    tinta: "var(--color-verde)",
  },
  rechazada: {
    texto: "Rechazada",
    fondo: "var(--color-rojo-suave)",
    tinta: "var(--color-rojo)",
  },
};

export function EstadoMascotaBadge({ estado }: { estado: EstadoMascota }) {
  const e = MASCOTA[estado];
  if (!e) return null;
  return (
    <span className={BASE} style={{ backgroundColor: e.fondo, color: e.tinta }}>
      {e.texto}
    </span>
  );
}

export function EstadoPostulacionBadge({ estado }: { estado: EstadoPostulacion }) {
  const e = POSTULACION[estado];
  if (!e) return null;
  return (
    <span className={BASE} style={{ backgroundColor: e.fondo, color: e.tinta }}>
      {e.texto}
    </span>
  );
}

/** Avatar con iniciales — el color se deriva del nombre para que una misma
    persona conserve siempre el mismo tono entre pantallas. */
const TONOS = [
  { fondo: "var(--color-morado-suave)", tinta: "var(--color-morado)" },
  { fondo: "var(--color-teal-suave)", tinta: "var(--color-teal)" },
  { fondo: "var(--color-primario-suave)", tinta: "var(--color-primario)" },
  { fondo: "var(--color-verde-suave)", tinta: "var(--color-verde)" },
  { fondo: "var(--color-rojo-suave)", tinta: "var(--color-rojo)" },
];

export function AvatarIniciales({ nombre, grande }: { nombre: string; grande?: boolean }) {
  const iniciales = nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

  let suma = 0;
  for (const c of nombre) suma += c.charCodeAt(0);
  const tono = TONOS[suma % TONOS.length];

  return (
    <span
      className={`rounded-full flex items-center justify-center font-bold shrink-0 ${
        grande ? "w-12 h-12 text-base" : "w-11 h-11 text-sm"
      }`}
      style={{ backgroundColor: tono.fondo, color: tono.tinta }}
    >
      {iniciales || "?"}
    </span>
  );
}
