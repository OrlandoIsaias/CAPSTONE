import { CircleCheck, CircleMinus, CircleX, ShieldAlert, TriangleAlert } from "lucide-react";
import type { CriterioCompatibilidad, CriterioMatching, Motivo } from "../types/matching";
import {
  OPCIONES_AMBIENTE_HOGAR,
  OPCIONES_ESPACIO_DISPONIBLE,
  OPCIONES_EXPERIENCIA_PREVIA,
  OPCIONES_HORAS_SOLA,
  OPCIONES_TIEMPO_ACTIVIDAD,
} from "../utils/opcionesAdoptante";
import {
  etiquetaOpcion,
  OPCIONES_ENERGIA,
  OPCIONES_ESPACIO_MINIMO,
  OPCIONES_EXPERIENCIA_REQUERIDA,
  OPCIONES_TEMPERAMENTO,
  OPCIONES_TOLERANCIA_SOLEDAD,
  resumenOpcion,
  type Opcion,
} from "../utils/opcionesMascota";

/* Explica el % de afinidad: qué criterios se cumplen, cuáles no y por qué
   una mascota es "No compatible". El adoptante lo ve en la ficha de la
   mascota (le hablamos de tú) y el refugio en cada solicitud (tercera
   persona). Los valores vienen de backend/matching-service/scoring.py. */

type Perspectiva = "adoptante" | "refugio";

function minuscula(opciones: Opcion<string>[], valor: string, resumen = true): string {
  const texto = resumen ? resumenOpcion(opciones, valor) : etiquetaOpcion(opciones, valor);
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

const CRITERIOS: Record<
  CriterioMatching,
  { nombre: string; hogar: (v: string, p: Perspectiva) => string; mascota: (v: string) => string }
> = {
  soledad: {
    nombre: "Tiempo a solas",
    hogar: (v) => `Quedaría ${minuscula(OPCIONES_HORAS_SOLA, v)} sola`,
    mascota: (v) => `tolera ${minuscula(OPCIONES_TOLERANCIA_SOLEDAD, v)}`,
  },
  actividad: {
    nombre: "Actividad diaria",
    hogar: (v, p) => `${p === "adoptante" ? "Tienes" : "Tiene"} ${minuscula(OPCIONES_TIEMPO_ACTIVIDAD, v)} al día`,
    mascota: (v) => `necesita actividad ${minuscula(OPCIONES_ENERGIA.Perro, v, false)}`,
  },
  experiencia: {
    nombre: "Experiencia",
    hogar: (v, p) => `${p === "adoptante" ? "Tu experiencia" : "Experiencia"}: ${minuscula(OPCIONES_EXPERIENCIA_PREVIA, v)}`,
    mascota: (v) => minuscula(OPCIONES_EXPERIENCIA_REQUERIDA, v, false),
  },
  ambiente: {
    nombre: "Ambiente del hogar",
    hogar: (v) => `Hogar ${minuscula(OPCIONES_AMBIENTE_HOGAR, v, false)}`,
    mascota: (v) => `es ${minuscula(OPCIONES_TEMPERAMENTO, v)}`,
  },
  espacio: {
    nombre: "Espacio",
    hogar: (v) => resumenOpcion(OPCIONES_ESPACIO_DISPONIBLE, v),
    mascota: (v) => minuscula(OPCIONES_ESPACIO_MINIMO, v, false),
  },
};

// El backend redacta los motivos para el adoptante; al refugio se le
// cuentan en tercera persona.
const MOTIVOS_REFUGIO: Record<string, string> = {
  vivienda_solo_gatos: "La vivienda del postulante solo permite gatos.",
  vivienda_solo_pequenas: "La vivienda del postulante solo permite mascotas pequeñas.",
  alergia: "En el hogar del postulante hay alergia a esta especie.",
  ninos_pequenos: "En el hogar hay niños menores de 6 años y la mascota no es apta para ellos.",
  ninos: "En el hogar hay niños y la mascota no convive bien con ellos.",
  convive_perros: "En el hogar hay perros y la mascota no convive bien con ellos.",
  convive_gatos: "En el hogar hay gatos y la mascota no convive bien con ellos.",
  cuidados: "El postulante indicó que no puede asumir los cuidados que necesita.",
  ninos_sin_evaluar: "En el hogar hay niños y aún no evalúas cómo convive con ellos.",
  perros_sin_evaluar: "En el hogar hay perros y aún no evalúas cómo convive con ellos.",
  gatos_sin_evaluar: "En el hogar hay gatos y aún no evalúas cómo convive con ellos.",
  vivienda_por_confirmar: "El postulante no sabe si su vivienda permite mascotas: conviene confirmarlo.",
};

function mensaje(motivo: Motivo, perspectiva: Perspectiva): string {
  return perspectiva === "refugio" ? (MOTIVOS_REFUGIO[motivo.codigo] ?? motivo.mensaje) : motivo.mensaje;
}

function IconoPuntaje({ puntaje }: { puntaje: number }) {
  const [Icono, color, texto] =
    puntaje >= 1
      ? ([CircleCheck, "text-emerald-600", "Se cumple"] as const)
      : puntaje > 0
        ? ([CircleMinus, "text-amber-500", "Se cumple a medias"] as const)
        : ([CircleX, "text-rose-500", "No se cumple"] as const);
  return (
    <span className="shrink-0">
      <Icono size={18} strokeWidth={2.2} className={color} aria-hidden="true" />
      <span className="sr-only">{texto}</span>
    </span>
  );
}

export function DesgloseCompatibilidad({
  score,
  criterios,
  exclusiones,
  alertas,
  topeAplicado,
  perspectiva,
}: {
  score: number;
  criterios: CriterioCompatibilidad[];
  exclusiones: Motivo[];
  alertas: Motivo[];
  topeAplicado: boolean;
  perspectiva: Perspectiva;
}) {
  const porcentaje = Math.round(score * 100);
  const excluida = exclusiones.length > 0;

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3.5">
      <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
        {excluida ? "¿Por qué no es compatible?" : `¿Por qué ${porcentaje}% de afinidad?`}
      </h2>

      {exclusiones.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 flex gap-2.5">
          <ShieldAlert size={18} strokeWidth={2.2} className="text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-rose-800">
              {perspectiva === "adoptante" ? "No es compatible con tu hogar" : "No compatible con este hogar"}
            </p>
            <ul className="mt-1 space-y-0.5">
              {exclusiones.map((m) => (
                <li key={m.codigo} className="text-xs font-medium text-rose-700">
                  {mensaje(m, perspectiva)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {alertas.map((m) => (
        <div key={m.codigo} className="rounded-2xl bg-amber-50 border border-amber-200 p-3 flex gap-2.5">
          <TriangleAlert size={16} strokeWidth={2.2} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-amber-800">{mensaje(m, perspectiva)}</p>
        </div>
      ))}

      <ul className="divide-y divide-slate-100">
        {criterios.map((c) => {
          const info = CRITERIOS[c.criterio];
          if (!info) return null;
          return (
            <li key={c.criterio} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
              <IconoPuntaje puntaje={c.puntaje} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{info.nombre}</p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  {info.hogar(c.adoptante, perspectiva)} · {info.mascota(c.mascota)}
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-400 shrink-0 mt-1">
                {Math.round(c.peso * 100)}%
              </span>
            </li>
          );
        })}
      </ul>

      {excluida ? (
        <p className="text-[11px] font-medium text-slate-500">
          Sin considerar lo anterior, la afinidad {perspectiva === "adoptante" ? "con tu hogar" : "con este hogar"} sería
          de {porcentaje}%.
        </p>
      ) : (
        topeAplicado && (
          <p className="text-[11px] font-medium text-slate-500">
            Hay un criterio que no se cumple, así que la afinidad queda en máximo 50%: es una diferencia
            que pesa mucho en la convivencia diaria.
          </p>
        )
      )}
    </div>
  );
}
