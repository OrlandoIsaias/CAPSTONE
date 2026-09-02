export type Especie = string;
export type NivelEnergiaSocializacion = "bajo" | "medio" | "alto";
export type EspacioMinimo = "departamento" | "casa_patio" | "casa_grande";
export type EstadoMascota = "disponible" | "en_proceso" | "adoptada";

export interface FotoMascota {
  id: number;
  mascota_id: number;
  url: string;
  es_principal: boolean;
  orden?: number;
}

export interface Mascota {
  id: number;
  refugio_id: number;
  nombre: string;
  especie?: string;
  raza?: string;
  edad?: number;
  nivel_energia?: NivelEnergiaSocializacion;
  nivel_socializacion?: NivelEnergiaSocializacion;
  compatible_ninos?: boolean;
  compatible_otras_mascotas?: boolean;
  nivel_experiencia_requerida?: NivelEnergiaSocializacion;
  espacio_minimo_requerido?: EspacioMinimo;
  estado: EstadoMascota;
  fecha_publicacion: string;
  fotos: FotoMascota[];
}

export interface MascotaInput {
  nombre: string;
  especie?: string;
  raza?: string;
  edad?: number;
  nivel_energia: NivelEnergiaSocializacion;
  nivel_socializacion: NivelEnergiaSocializacion;
  compatible_ninos?: boolean;
  compatible_otras_mascotas?: boolean;
  nivel_experiencia_requerida: NivelEnergiaSocializacion;
  espacio_minimo_requerido: EspacioMinimo;
}
