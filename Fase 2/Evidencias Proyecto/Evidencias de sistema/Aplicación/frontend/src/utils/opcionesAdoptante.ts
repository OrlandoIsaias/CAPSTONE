import type {
  AceptaCuidados,
  Alergias,
  AmbienteHogar,
  EspacioDisponible,
  EtapaVida,
  ExperienciaPrevia,
  NinosHogar,
  RestriccionVivienda,
  TiempoActividad,
} from "../types/auth";
import type { Especie, Sexo, TramoHoras } from "../types/mascotas";
import type { Opcion } from "./opcionesMascota";

/* Opciones del cuestionario del adoptante (backend/matching-service/scoring.py):
     Compatibilidad (% de afinidad), cada una contra su par de la mascota:
       horas sola   -> tolerancia a la soledad   30%
       actividad    -> energía                   25%
       experiencia  -> experiencia requerida     20%
       ambiente     -> temperamento              15%
       espacio      -> espacio mínimo            10%
     Exclusión (seguridad): vivienda, niños, animales en casa, alergias y
     cuidados. Preferencias (solo ordenan): especie filtra; tamaño, etapa y
     sexo ordenan. */

export const OPCIONES_ESPACIO_DISPONIBLE: Opcion<EspacioDisponible>[] = [
  { valor: "departamento", etiqueta: "Departamento o casa sin patio", descripcion: "Saldrá a pasear para hacer ejercicio", resumen: "Departamento o casa sin patio" },
  { valor: "casa_patio", etiqueta: "Casa con patio", descripcion: "Tendrá un espacio exterior para jugar" },
  { valor: "casa_grande", etiqueta: "Casa con patio grande o parcela", descripcion: "Mucho espacio para correr", resumen: "Patio grande o parcela" },
];

export const OPCIONES_RESTRICCION_VIVIENDA: Opcion<RestriccionVivienda>[] = [
  { valor: "ninguna", etiqueta: "No, ninguna", resumen: "Sin restricciones" },
  { valor: "solo_pequenas", etiqueta: "Solo mascotas pequeñas", descripcion: "Por ejemplo, el reglamento del edificio" },
  { valor: "solo_gatos", etiqueta: "Solo gatos" },
  { valor: "no_se", etiqueta: "No lo sé", descripcion: "Te recordaremos confirmarlo antes de adoptar", resumen: "Por confirmar" },
];

// Mismos tramos que la tolerancia a la soledad de la mascota.
export const OPCIONES_HORAS_SOLA: Opcion<TramoHoras>[] = [
  { valor: "menos_2h", etiqueta: "Casi nunca", descripcion: "Menos de 2 horas", resumen: "Menos de 2 h" },
  { valor: "2_4h", etiqueta: "Un rato", descripcion: "Entre 2 y 4 horas", resumen: "2 a 4 h" },
  { valor: "4_8h", etiqueta: "Una jornada de trabajo", descripcion: "Entre 4 y 8 horas", resumen: "4 a 8 h" },
  { valor: "mas_8h", etiqueta: "Gran parte del día", descripcion: "Más de 8 horas", resumen: "Más de 8 h" },
];

export const OPCIONES_TIEMPO_ACTIVIDAD: Opcion<TiempoActividad>[] = [
  { valor: "menos_30m", etiqueta: "Un ratito", descripcion: "Menos de 30 minutos", resumen: "Menos de 30 min" },
  { valor: "30_60m", etiqueta: "Un buen rato", descripcion: "Entre 30 minutos y 1 hora", resumen: "30 min a 1 h" },
  { valor: "mas_60m", etiqueta: "Bastante", descripcion: "Más de 1 hora: paseos largos, trekking o deporte", resumen: "Más de 1 h" },
];

export const OPCIONES_AMBIENTE_HOGAR: Opcion<AmbienteHogar>[] = [
  { valor: "tranquilo", etiqueta: "Tranquilo", descripcion: "1 o 2 personas y pocas visitas" },
  { valor: "moderado", etiqueta: "Moderado", descripcion: "Familia, con visitas de vez en cuando" },
  { valor: "movido", etiqueta: "Movido", descripcion: "Muchas personas, visitas o ruido frecuente" },
];

export const OPCIONES_NINOS_HOGAR: Opcion<NinosHogar>[] = [
  { valor: "no", etiqueta: "No", resumen: "Sin niños" },
  { valor: "mayores", etiqueta: "Sí, de 6 años o más", resumen: "Niños de 6 años o más" },
  { valor: "pequenos", etiqueta: "Sí, menores de 6 años", resumen: "Niños menores de 6" },
];

// Selección múltiple: "ninguno" es excluyente.
export type AnimalHogar = "perros" | "gatos" | "ninguno";

export const OPCIONES_ANIMALES_HOGAR: Opcion<AnimalHogar>[] = [
  { valor: "perros", etiqueta: "Perro(s)" },
  { valor: "gatos", etiqueta: "Gato(s)" },
  { valor: "ninguno", etiqueta: "Ninguno" },
];

export function resumenAnimales(tienePerros: boolean, tieneGatos: boolean): string {
  if (tienePerros && tieneGatos) return "Perros y gatos";
  if (tienePerros) return "Perro(s)";
  if (tieneGatos) return "Gato(s)";
  return "Ninguno";
}

export const OPCIONES_ALERGIAS: Opcion<Alergias>[] = [
  { valor: "ninguna", etiqueta: "No", resumen: "Sin alergias" },
  { valor: "perros", etiqueta: "Sí, a los perros", resumen: "A los perros" },
  { valor: "gatos", etiqueta: "Sí, a los gatos", resumen: "A los gatos" },
  { valor: "ambos", etiqueta: "Sí, a ambos", resumen: "A perros y gatos" },
];

export const OPCIONES_EXPERIENCIA_PREVIA: Opcion<ExperienciaPrevia>[] = [
  { valor: "ninguna", etiqueta: "Sería mi primera mascota", descripcion: "¡Todos empezamos alguna vez!", resumen: "Primera mascota" },
  { valor: "basica", etiqueta: "He tenido perros o gatos", resumen: "Ha tenido mascotas" },
  { valor: "alta", etiqueta: "Tengo mucha experiencia", descripcion: "Con animales miedosos, reactivos o rescatados", resumen: "Mucha experiencia" },
];

export const OPCIONES_ACEPTA_CUIDADOS: Opcion<AceptaCuidados>[] = [
  { valor: "no", etiqueta: "Por ahora no", resumen: "No por ahora" },
  { valor: "leves", etiqueta: "Sí, si son cuidados simples", descripcion: "Medicación o una dieta especial", resumen: "Cuidados simples" },
  { valor: "complejos", etiqueta: "Sí, aunque sean exigentes", descripcion: "Enfermedad crónica o discapacidad", resumen: "Incluso exigentes" },
];

/* Preferencias: "cualquiera" se envía como null (me da igual). */
export type PreferenciaEspecie = Especie | "cualquiera";
export type PreferenciaSexo = Sexo | "cualquiera";

export const OPCIONES_ESPECIE_PREFERIDA: Opcion<PreferenciaEspecie>[] = [
  { valor: "Perro", etiqueta: "Un perro" },
  { valor: "Gato", etiqueta: "Un gato" },
  { valor: "cualquiera", etiqueta: "Me da igual" },
];

export const OPCIONES_ETAPA: Opcion<EtapaVida>[] = [
  { valor: "cachorro", etiqueta: "Cachorro", descripcion: "Menos de 1 año" },
  { valor: "joven", etiqueta: "Joven", descripcion: "1 a 2 años" },
  { valor: "adulto", etiqueta: "Adulto", descripcion: "3 a 7 años" },
  { valor: "senior", etiqueta: "Senior", descripcion: "8 años o más" },
];

export const OPCIONES_SEXO_PREFERIDO: Opcion<PreferenciaSexo>[] = [
  { valor: "hembra", etiqueta: "Hembra" },
  { valor: "macho", etiqueta: "Macho" },
  { valor: "cualquiera", etiqueta: "Me da igual" },
];

export function etiquetaEspeciePreferida(valor: Especie | null | undefined): string {
  if (valor === "Perro") return "Un perro";
  if (valor === "Gato") return "Un gato";
  return "Perro o gato";
}

/** Especies que las propias respuestas vuelven imposibles (misma regla que
    PerfilAdoptanteIn.validar_especie_posible en auth-service). */
export function especiesImposibles(
  alergias: Alergias | "" | null | undefined,
  restriccion: RestriccionVivienda | "" | null | undefined
): Especie[] {
  const imposibles: Especie[] = [];
  if (alergias === "perros" || alergias === "ambos" || restriccion === "solo_gatos") imposibles.push("Perro");
  if (alergias === "gatos" || alergias === "ambos") imposibles.push("Gato");
  return imposibles;
}
