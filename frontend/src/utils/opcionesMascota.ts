/* Catálogos cerrados para el formulario de "Publicar mascota". Mantenerlos
   como listas fijas (en vez de texto libre) evita razas mal escritas o
   especies inventadas, que son justo el tipo de dato sucio que rompe el
   cálculo de compatibilidad más adelante. */

export const ESPECIES = ["Perro", "Gato"] as const;
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

// REGEX_SOLO_LETRAS vive en utils/validacion.ts (se reutiliza en registro y
// perfiles). Se re-exporta acá para no romper los imports existentes.
export { REGEX_SOLO_LETRAS } from "./validacion";

export const TAMANO_MAXIMO_FOTO_BYTES = 4 * 1024 * 1024;
export const TIPOS_FOTO_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp'];