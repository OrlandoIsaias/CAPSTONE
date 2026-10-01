import { useId, type ReactNode } from "react";
import { Check, type LucideIcon } from "lucide-react";
import type { Opcion } from "../utils/opcionesMascota";

/* Piezas de los cuestionarios por pasos (adoptante y ficha de mascota).
   Las opciones son tarjetas para tocar en vez de listas desplegables: con 2
   a 4 alternativas se responde de un vistazo. Por dentro son radios y
   checkboxes nativos (ocultos visualmente), así que el teclado y los
   lectores de pantalla funcionan sin código extra. */

export type Tono = "indigo" | "emerald";

const ESTILOS: Record<
  Tono,
  { activa: string; marca: string; foco: string; hover: string; barra: string; pasoActual: string; pasoHecho: string }
> = {
  indigo: {
    activa: "border-indigo-500 bg-indigo-50/70 shadow-xs",
    marca: "bg-indigo-600 border-indigo-600 text-white",
    foco: "peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/40",
    hover: "hover:border-indigo-300 hover:bg-indigo-50/30",
    barra: "bg-gradient-to-r from-indigo-600 to-purple-600",
    pasoActual: "bg-indigo-600 text-white shadow-sm ring-4 ring-indigo-100",
    pasoHecho: "bg-indigo-100 text-indigo-700",
  },
  emerald: {
    activa: "border-emerald-500 bg-emerald-50/70 shadow-xs",
    marca: "bg-emerald-600 border-emerald-600 text-white",
    foco: "peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/40",
    hover: "hover:border-emerald-300 hover:bg-emerald-50/30",
    barra: "bg-gradient-to-r from-emerald-600 to-teal-600",
    pasoActual: "bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-100",
    pasoHecho: "bg-emerald-100 text-emerald-700",
  },
};

const COLUMNAS = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
} as const;

export function Pregunta({
  titulo,
  ayuda,
  error,
  opcional,
  children,
}: {
  titulo: string;
  /** Por qué se pregunta: ayuda a responder con sinceridad. */
  ayuda?: string;
  error?: string;
  opcional?: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-2.5">
      <legend className="text-sm font-extrabold text-slate-800 leading-snug">
        {titulo}
        {opcional && <span className="ml-1.5 text-xs font-semibold text-slate-400">(opcional)</span>}
      </legend>
      {ayuda && <p className="text-xs font-medium text-slate-500 leading-relaxed">{ayuda}</p>}
      {children}
      {error && (
        <p role="alert" className="text-xs font-semibold text-rose-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function Tarjeta<V extends string>({
  opcion,
  marcada,
  tipo,
  nombre,
  tono,
  deshabilitada,
  compacta,
  onElegir,
}: {
  opcion: Opcion<V>;
  marcada: boolean;
  tipo: "radio" | "checkbox";
  nombre: string;
  tono: Tono;
  deshabilitada: boolean;
  compacta: boolean;
  onElegir: () => void;
}) {
  const estilo = ESTILOS[tono];
  return (
    <label className={`block ${deshabilitada ? "cursor-not-allowed" : "cursor-pointer"}`}>
      <input
        type={tipo}
        name={nombre}
        value={opcion.valor}
        checked={marcada}
        disabled={deshabilitada}
        onChange={onElegir}
        className="peer sr-only"
      />
      <div
        className={`h-full flex items-center rounded-2xl border transition-all ${estilo.foco} ${
          compacta ? "gap-2 px-3 py-2.5" : "gap-3 px-3.5 py-3"
        } ${
          deshabilitada
            ? "border-slate-200 bg-slate-50 opacity-50"
            : marcada
              ? estilo.activa
              : `border-slate-200/90 bg-white ${estilo.hover}`
        }`}
      >
        <span className="flex-1 min-w-0">
          <span className={`block font-bold text-slate-800 ${compacta ? "text-xs" : "text-sm"}`}>
            {opcion.etiqueta}
          </span>
          {opcion.descripcion && !compacta && (
            <span className="block text-xs font-medium text-slate-500 mt-0.5 leading-snug">
              {opcion.descripcion}
            </span>
          )}
        </span>
        <span
          aria-hidden="true"
          className={`shrink-0 flex items-center justify-center border-2 transition-colors ${
            compacta ? "w-4 h-4" : "w-5 h-5"
          } ${tipo === "radio" ? "rounded-full" : "rounded-md"} ${
            marcada ? estilo.marca : "border-slate-300 bg-white"
          }`}
        >
          {marcada && <Check size={compacta ? 10 : 12} strokeWidth={3.5} />}
        </span>
      </div>
    </label>
  );
}

export function SelectorOpciones<V extends string>({
  opciones,
  valor,
  onCambio,
  tono,
  columnas = 1,
  deshabilitadas = [],
  compacta = false,
}: {
  opciones: Opcion<V>[];
  valor: V | "";
  onCambio: (valor: V) => void;
  tono: Tono;
  columnas?: keyof typeof COLUMNAS;
  deshabilitadas?: V[];
  /** Solo la etiqueta (para respuestas cortas como Sí / No). */
  compacta?: boolean;
}) {
  const nombre = useId();
  return (
    <div className={`grid gap-2 ${COLUMNAS[columnas]}`}>
      {opciones.map((opcion) => (
        <Tarjeta
          key={opcion.valor}
          opcion={opcion}
          marcada={valor === opcion.valor}
          tipo="radio"
          nombre={nombre}
          tono={tono}
          deshabilitada={deshabilitadas.includes(opcion.valor)}
          compacta={compacta}
          onElegir={() => onCambio(opcion.valor)}
        />
      ))}
    </div>
  );
}

export function SelectorMultiple<V extends string>({
  opciones,
  valores,
  onCambio,
  tono,
  columnas = 1,
  excluyente,
  compacta = false,
}: {
  opciones: Opcion<V>[];
  valores: V[];
  onCambio: (valores: V[]) => void;
  tono: Tono;
  columnas?: keyof typeof COLUMNAS;
  /** Opción que desmarca las demás (ej. "Ninguno"). */
  excluyente?: V;
  /** Solo la etiqueta (para respuestas cortas). */
  compacta?: boolean;
}) {
  const nombre = useId();

  function alternar(valor: V) {
    if (valores.includes(valor)) {
      onCambio(valores.filter((v) => v !== valor));
    } else if (valor === excluyente) {
      onCambio([valor]);
    } else {
      onCambio([...valores.filter((v) => v !== excluyente), valor]);
    }
  }

  return (
    <div className={`grid gap-2 ${COLUMNAS[columnas]}`}>
      {opciones.map((opcion) => (
        <Tarjeta
          key={opcion.valor}
          opcion={opcion}
          marcada={valores.includes(opcion.valor)}
          tipo="checkbox"
          nombre={nombre}
          tono={tono}
          deshabilitada={false}
          compacta={compacta}
          onElegir={() => alternar(opcion.valor)}
        />
      ))}
    </div>
  );
}

export interface PasoCuestionario {
  titulo: string;
  icono: LucideIcon;
}

export function BarraPasos({
  pasos,
  actual,
  tono,
  hastaPaso,
  onIrA,
}: {
  pasos: PasoCuestionario[];
  actual: number;
  tono: Tono;
  /** Último paso al que se puede saltar desde la barra. */
  hastaPaso: number;
  onIrA: (paso: number) => void;
}) {
  const estilo = ESTILOS[tono];
  const progreso = ((actual + 1) / pasos.length) * 100;

  return (
    <nav aria-label="Pasos del cuestionario" className="mb-5">
      <p className="text-xs font-bold text-slate-500 mb-2">
        Paso {actual + 1} de {pasos.length} · <span className="text-slate-800">{pasos[actual].titulo}</span>
      </p>
      <div className="h-2 rounded-full bg-slate-200/80 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${estilo.barra}`}
          style={{ width: `${progreso}%` }}
        />
      </div>
      <ol className="flex justify-between mt-3">
        {pasos.map((paso, i) => {
          const Icono = paso.icono;
          const alcanzable = i <= hastaPaso;
          return (
            <li key={paso.titulo}>
              <button
                type="button"
                onClick={() => onIrA(i)}
                disabled={!alcanzable}
                aria-current={i === actual ? "step" : undefined}
                aria-label={`Paso ${i + 1}: ${paso.titulo}`}
                title={paso.titulo}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  i === actual
                    ? estilo.pasoActual
                    : alcanzable
                      ? `${estilo.pasoHecho} hover:brightness-95 active:scale-90`
                      : "bg-slate-100 text-slate-300 cursor-not-allowed"
                }`}
              >
                <Icono size={16} strokeWidth={2.2} />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
