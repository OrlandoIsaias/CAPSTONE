import type {
  ConvivenciaNinos,
  EspacioMinimo,
  Especie,
  Nivel,
  NivelCuidados,
  Sexo,
  Tamano,
  Temperamento,
  TramoHoras,
} from "../types/mascotas";

/* Catálogos cerrados para el formulario de "Publicar mascota". Mantenerlos
   como listas fijas (en vez de texto libre) evita razas mal escritas o
   especies inventadas, que son justo el tipo de dato sucio que rompe el
   cálculo de compatibilidad más adelante. */

export const ESPECIES = ["Perro", "Gato"] as const satisfies readonly Especie[];
export type EspecieMascota = (typeof ESPECIES)[number];

export const RAZAS_POR_ESPECIE: Record<EspecieMascota, string[]> = {
  Perro: [
    "Labrador Retriever",
    "Golden Retriever",
    "Pastor Alemán",
    "Bulldog Francés",
    "Bulldog Inglés",
    "Caniche (Poodle)",
    "Chihuahua",
    "Beagle",
    "Boxer",
    "Salchicha (Dachshund)",
    "Rottweiler",
    "Yorkshire Terrier",
    "Shih Tzu",
    "Husky Siberiano",
    "Pug (Carlino)",
    "Border Collie",
    "Cocker Spaniel",
    "Doberman",
    "Gran Danés",
    "San Bernardo",
    "Schnauzer",
    "Maltés",
    "Pitbull",
    "Corgi",
    "Galgo",
    "Dálmata",
    "Basset Hound",
    "Akita",
    "Chow Chow",
    "Quiltro (mestizo)",
    "Otra",
  ],
  Gato: [
    "Doméstico / criollo",
    "Persa",
    "Siamés",
    "Maine Coon",
    "Angora",
    "Bengalí",
    "Sphynx",
    "Ragdoll",
    "British Shorthair",
    "Abisinio",
    "Himalayo",
    "Bosque de Noruega",
    "Azul Ruso",
    "Munchkin",
    "Scottish Fold",
    "Birmano",
    "Devon Rex",
    "Exótico de pelo corto",
    "Quiltro (mestizo)",
    "Otra",
  ],
};

export const EDAD_OPCIONES: { valor: number; etiqueta: string }[] = [
  { valor: 0, etiqueta: "Menos de 1 año" },
  ...Array.from({ length: 15 }, (_, i) => ({
    valor: i + 1,
    etiqueta: `${i + 1} ${i + 1 === 1 ? "año" : "años"}`,
  })),
  { valor: 16, etiqueta: "Más de 15 años" },
];

// Muestra la edad con la misma etiqueta del formulario: 0 -> "Menos de 1 año".
export function formatearEdad(edad: number): string {
  const opcion = EDAD_OPCIONES.find((o) => o.valor === edad);
  return opcion ? opcion.etiqueta : `${edad} ${edad === 1 ? "año" : "años"}`;
}

/* Opciones de los cuestionarios. Los valores son los que acepta el backend
   (CHECK de la BD); etiqueta y descripcion son el texto del formulario, y
   resumen (si existe) el texto corto para fichas y listados. Cada respuesta
   de la mascota se compara en matching-service con su par del adoptante
   (ver utils/opcionesAdoptante.ts y backend/matching-service/scoring.py). */
export interface Opcion<V extends string> {
  valor: V;
  etiqueta: string;
  descripcion?: string;
  resumen?: string;
}

export function etiquetaOpcion<V extends string>(
  opciones: Opcion<V>[],
  valor: V | null | undefined
): string {
  return opciones.find((o) => o.valor === valor)?.etiqueta ?? "Sin responder";
}

export function resumenOpcion<V extends string>(
  opciones: Opcion<V>[],
  valor: V | null | undefined,
  sinRespuesta = "Sin responder"
): string {
  const opcion = opciones.find((o) => o.valor === valor);
  return opcion ? (opcion.resumen ?? opcion.etiqueta) : sinRespuesta;
}

export const OPCIONES_ESPECIE: Opcion<Especie>[] = [
  { valor: "Perro", etiqueta: "Perro" },
  { valor: "Gato", etiqueta: "Gato" },
];

export const OPCIONES_SEXO: Opcion<Sexo>[] = [
  { valor: "hembra", etiqueta: "Hembra" },
  { valor: "macho", etiqueta: "Macho" },
];

// Tamaño adulto estimado (en cachorros, el que tendrá de adulto).
export const OPCIONES_TAMANO: Opcion<Tamano>[] = [
  { valor: "pequeno", etiqueta: "Pequeño", descripcion: "Hasta 10 kg" },
  { valor: "mediano", etiqueta: "Mediano", descripcion: "Entre 10 y 25 kg" },
  { valor: "grande", etiqueta: "Grande", descripcion: "Más de 25 kg" },
];

// Par del adoptante: horas que la mascota quedaría sola (mismos tramos).
export const OPCIONES_TOLERANCIA_SOLEDAD: Opcion<TramoHoras>[] = [
  { valor: "menos_2h", etiqueta: "Menos de 2 horas", descripcion: "Necesita compañía casi todo el día", resumen: "Menos de 2 h" },
  { valor: "2_4h", etiqueta: "Hasta 4 horas", descripcion: "Tolera ratos cortos a solas", resumen: "Hasta 4 h" },
  { valor: "4_8h", etiqueta: "Hasta 8 horas", descripcion: "Puede esperar una jornada de trabajo", resumen: "Hasta 8 h" },
  { valor: "mas_8h", etiqueta: "Más de 8 horas", descripcion: "Es muy independiente", resumen: "Más de 8 h" },
];

// Par del adoptante: tiempo diario para pasear o jugar. La descripción
// cambia con la especie (a un gato no se le pasea); el valor guardado es el mismo.
export const OPCIONES_ENERGIA: Record<Especie, Opcion<Nivel>[]> = {
  Perro: [
    { valor: "bajo", etiqueta: "Baja", descripcion: "Le bastan paseos cortos", resumen: "Tranquila" },
    { valor: "medio", etiqueta: "Media", descripcion: "1 o 2 paseos de 30 minutos al día", resumen: "Moderada" },
    { valor: "alto", etiqueta: "Alta", descripcion: "Más de 1 hora de ejercicio al día", resumen: "Muy activa" },
  ],
  Gato: [
    { valor: "bajo", etiqueta: "Baja", descripcion: "Tranquilo, duerme gran parte del día", resumen: "Tranquila" },
    { valor: "medio", etiqueta: "Media", descripcion: "Juega a ratos", resumen: "Moderada" },
    { valor: "alto", etiqueta: "Alta", descripcion: "Muy juguetón: necesita juego y estímulo a diario", resumen: "Muy activa" },
  ],
};

// Par del adoptante: experiencia previa.
export const OPCIONES_EXPERIENCIA_REQUERIDA: Opcion<Nivel>[] = [
  { valor: "bajo", etiqueta: "Apta para primerizos", descripcion: "Fácil de manejar" },
  { valor: "medio", etiqueta: "Mejor con experiencia", descripcion: "Ideal para alguien que ya tuvo mascotas" },
  { valor: "alto", etiqueta: "Solo con experiencia", descripcion: "Necesita manejo de conducta (miedo o reactividad)" },
];

// Par del adoptante: ambiente del hogar (una mascota tímida necesita calma).
export const OPCIONES_TEMPERAMENTO: Opcion<Temperamento>[] = [
  { valor: "sociable", etiqueta: "Sociable", descripcion: "Se acerca a todos y disfruta las visitas" },
  { valor: "reservado", etiqueta: "Reservada", descripcion: "Tarda un poco en tomar confianza" },
  { valor: "timido", etiqueta: "Tímida o miedosa", descripcion: "Necesita un hogar tranquilo y paciencia", resumen: "Tímida" },
];

// Par del adoptante: dónde vivirá la mascota.
export const OPCIONES_ESPACIO_MINIMO: Opcion<EspacioMinimo>[] = [
  { valor: "departamento", etiqueta: "Se adapta a departamento", descripcion: "Le basta con salir a pasear" },
  { valor: "casa_patio", etiqueta: "Necesita patio", descripcion: "Un espacio exterior para moverse" },
  { valor: "casa_grande", etiqueta: "Necesita mucho espacio", descripcion: "Patio grande o parcela" },
];

/* Respuestas que el refugio puede no saber todavía: "sin_dato" se envía
   como null. En la convivencia, el matching lo muestra como alerta y nunca
   excluye por eso; en la ficha de salud, significa "sin información". */
export type ConvivenciaNinosForm = ConvivenciaNinos | "sin_dato";
export type TriEstado = "si" | "no" | "sin_dato";

export const OPCIONES_CONVIVENCIA_NINOS: Opcion<ConvivenciaNinosForm>[] = [
  { valor: "todos", etiqueta: "Sí, incluso con pequeños", descripcion: "Convive bien con niños de todas las edades", resumen: "Con niños de todas las edades" },
  { valor: "mayores", etiqueta: "Solo con niños de 6 años o más", resumen: "Solo con niños de 6+" },
  { valor: "no", etiqueta: "No convive bien con niños", resumen: "No convive con niños" },
  { valor: "sin_dato", etiqueta: "No lo sabemos", descripcion: "Aún no lo hemos evaluado", resumen: "Sin evaluar" },
];

export const OPCIONES_CONVIVE: Opcion<TriEstado>[] = [
  { valor: "si", etiqueta: "Sí" },
  { valor: "no", etiqueta: "No" },
  { valor: "sin_dato", etiqueta: "No lo sabemos" },
];

export const OPCIONES_SALUD: Opcion<TriEstado>[] = [
  { valor: "si", etiqueta: "Sí" },
  { valor: "no", etiqueta: "No" },
  { valor: "sin_dato", etiqueta: "No sé" },
];

// Par del adoptante: cuidados que puede asumir.
export const OPCIONES_NIVEL_CUIDADOS: Opcion<NivelCuidados>[] = [
  { valor: "ninguno", etiqueta: "No", descripcion: "No necesita cuidados especiales", resumen: "Ninguno" },
  { valor: "leves", etiqueta: "Cuidados simples", descripcion: "Medicación o una dieta especial", resumen: "Simples" },
  { valor: "complejos", etiqueta: "Cuidados exigentes", descripcion: "Enfermedad crónica o discapacidad", resumen: "Exigentes" },
];

export function aTriEstado(valor: boolean | null | undefined): TriEstado {
  if (valor == null) return "sin_dato";
  return valor ? "si" : "no";
}

export function deTriEstado(valor: TriEstado): boolean | null {
  return valor === "sin_dato" ? null : valor === "si";
}

export function etiquetaTriEstado(valor: boolean | null | undefined, sinDato = "Sin evaluar"): string {
  if (valor == null) return sinDato;
  return valor ? "Sí" : "No";
}

// REGEX_SOLO_LETRAS vive en utils/validacion.ts (se reutiliza en registro y
// perfiles). Se re-exporta acá para no romper los imports existentes.
export { REGEX_SOLO_LETRAS } from "./validacion";

export const TAMANO_MAXIMO_FOTO_BYTES = 4 * 1024 * 1024;
export const TIPOS_FOTO_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp'];
