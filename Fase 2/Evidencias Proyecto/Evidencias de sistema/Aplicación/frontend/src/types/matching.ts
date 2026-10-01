import type {
  ConvivenciaNinos,
  Especie,
  Nivel,
  NivelCuidados,
  Sexo,
  Tamano,
  Temperamento,
  TramoHoras,
} from "./mascotas";
import type { EtapaVida } from "./auth";

export type CriterioMatching = "soledad" | "actividad" | "experiencia" | "ambiente" | "espacio";

/** Motivo de exclusión o alerta. El mensaje viene listo para mostrar. */
export interface Motivo {
  codigo: string;
  mensaje: string;
}

/** Un criterio del % de afinidad: 1 = el hogar cubre la necesidad,
    0.5 = le falta un nivel, 0 = le faltan dos o más. */
export interface CriterioCompatibilidad {
  criterio: CriterioMatching;
  peso: number;
  puntaje: number;
  /** Respuesta del adoptante y de la mascota (valores del catálogo). */
  adoptante: string;
  mascota: string;
}

/** Forma en que matching-service guarda el detalle en matches.desglose
    (lo devuelve postulaciones-service al refugio). */
export interface DetalleCompatibilidad {
  version: number;
  criterios: CriterioCompatibilidad[];
  exclusiones: Motivo[];
  alertas: Motivo[];
  discrepancias: string[];
  tope_aplicado: boolean;
}

export interface Recomendacion {
  mascota_id: number;
  nombre: string;
  especie: Especie;
  raza?: string | null;
  edad?: number | null;
  etapa?: EtapaVida | null;
  sexo?: Sexo | null;
  tamano?: Tamano | null;
  url_foto?: string | null;
  estado: string;
  score_compatibilidad: number;
  fecha_calculo: string;
  nivel_energia?: Nivel | null;
  tolerancia_soledad?: TramoHoras | null;
  temperamento?: Temperamento | null;
  convivencia_ninos?: ConvivenciaNinos | null;
  convive_perros?: boolean | null;
  convive_gatos?: boolean | null;
  nivel_cuidados?: NivelCuidados | null;
  /** false si no es de la especie que prefiere el adoptante (solo en Explorar o en la ficha). */
  coincide_preferencia: boolean;
  /** Preferencias de orden que no cumple: "tamano", "etapa", "sexo". */
  discrepancias_preferencias: string[];
  /** No compatible por seguridad: no aparece en Recomendaciones. */
  excluida: boolean;
  motivos_exclusion: Motivo[];
  alertas: Motivo[];
  desglose: CriterioCompatibilidad[];
  tope_aplicado: boolean;
}
