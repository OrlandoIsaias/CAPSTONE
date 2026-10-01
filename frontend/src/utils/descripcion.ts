import type { DatosMascota } from "../types/mascotas";

type CampoRasgo =
  | "nivel_energia"
  | "tolerancia_soledad"
  | "temperamento"
  | "convivencia_ninos"
  | "convive_perros"
  | "convive_gatos";

// Sirve tanto para una Mascota como para una Recomendación (donde pueden venir null).
type Rasgos = { [K in CampoRasgo]?: DatosMascota[K] | null };

/* El backend no guarda una frase de presentación por mascota, así que se
   deriva una a partir de sus rasgos reales (los mismos que usa el
   matching). Es determinista: la misma mascota siempre muestra la misma
   frase, en vez de un texto aleatorio que cambie entre pantallas. */
export function descripcionCorta(mascota: Rasgos): string {
  if (
    mascota.temperamento === "sociable" &&
    mascota.convivencia_ninos === "todos" &&
    mascota.convive_perros === true &&
    mascota.convive_gatos === true
  ) {
    return "Amable y sociable";
  }
  if (mascota.temperamento === "timido") {
    return "Busca un hogar tranquilo";
  }
  if (mascota.tolerancia_soledad === "menos_2h") {
    return "Muy apegada, busca compañía";
  }
  if (mascota.nivel_energia === "alto") {
    return "Para una vida con movimiento";
  }
  if (mascota.nivel_energia === "bajo") {
    return "Una compañía tranquila";
  }
  if (mascota.tolerancia_soledad === "mas_8h") {
    return "Independiente";
  }
  return "Ideal para tu espacio y tu ritmo";
}
