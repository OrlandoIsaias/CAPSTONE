import type { Mascota } from "../types/mascotas";

/* El backend no guarda una frase de presentación por mascota, así que se
   deriva una a partir de sus rasgos reales (mismo criterio que usa el
   matching). Es determinista: la misma mascota siempre muestra la misma
   frase, en vez de un texto aleatorio que cambie entre pantallas. */
export function descripcionCorta(mascota: Pick<Mascota, "nivel_energia" | "nivel_socializacion" | "compatible_ninos" | "compatible_otras_mascotas">): string {
  if (mascota.compatible_ninos && mascota.compatible_otras_mascotas) {
    return "Amable y sociable";
  }
  if (mascota.nivel_socializacion === "alto") {
    return "Curiosa y muy dulce";
  }
  if (mascota.nivel_energia === "alto") {
    return "Para una vida con movimiento";
  }
  if (mascota.nivel_energia === "bajo") {
    return "Una compañía tranquila";
  }
  return "Ideal para tu espacio y tu ritmo";
}
