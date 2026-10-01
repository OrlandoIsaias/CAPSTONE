// Espejo de los CHECK de la migración 006 (mascotas-service/schemas.py).
export type Especie = "Perro" | "Gato";
export type Sexo = "macho" | "hembra";
/** Tamaño adulto estimado; solo perros. */
export type Tamano = "pequeno" | "mediano" | "grande";
/** Escala de actividad que necesita y de experiencia requerida. */
export type Nivel = "bajo" | "medio" | "alto";
export type EspacioMinimo = "departamento" | "casa_patio" | "casa_grande";
/** Tramos de horas seguidas a solas: la mascota los tolera, el adoptante
    indica cuántas pasaría sola (mismos valores para compararlos). */
export type TramoHoras = "menos_2h" | "2_4h" | "4_8h" | "mas_8h";
export type Temperamento = "sociable" | "reservado" | "timido";
export type ConvivenciaNinos = "todos" | "mayores" | "no";
export type NivelCuidados = "ninguno" | "leves" | "complejos";
export type EstadoMascota = "disponible" | "en_proceso" | "adoptada";

export interface FotoMascota {
  id: number;
  mascota_id: number;
  url: string;
  es_principal: boolean;
  orden?: number;
}

/** Respuestas de la ficha que llena el refugio. null en convivencia y en la
    ficha de salud = el refugio aún no lo sabe. */
export interface DatosMascota {
  nombre: string;
  especie: Especie;
  raza?: string | null;
  edad: number;
  sexo: Sexo;
  tamano?: Tamano | null;
  espacio_minimo_requerido: EspacioMinimo;
  tolerancia_soledad: TramoHoras;
  nivel_energia: Nivel;
  nivel_experiencia_requerida: Nivel;
  temperamento: Temperamento;
  convivencia_ninos: ConvivenciaNinos | null;
  convive_perros: boolean | null;
  convive_gatos: boolean | null;
  nivel_cuidados: NivelCuidados;
  cuidados_especiales?: string | null;
  esterilizado: boolean | null;
  vacunas_al_dia: boolean | null;
  desparasitado: boolean | null;
  microchip: boolean | null;
  notas_salud?: string | null;
}

export interface Mascota extends DatosMascota {
  id: number;
  refugio_id: number;
  estado: EstadoMascota;
  fecha_publicacion: string;
  fotos: FotoMascota[];
}

export type MascotaInput = DatosMascota;
