import { useState, useEffect } from "react";
import {
  PawPrint,
  SlidersHorizontal,
  Flame,
  Send,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Heart,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export const CLAVE_TUTORIAL_VISTO = "housefound_tutorial_adoptante_visto";

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  usuarioId?: number;
}

interface Diapositiva {
  insignia: string;
  colorInsignia: string;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  colorGradiente: string;
  colorBoton: string;
  icono: React.ReactNode;
  destacado: string;
}

const DIAPOSITIVAS: Diapositiva[] = [
  {
    insignia: "Bienvenido a HouseFound",
    colorInsignia: "bg-emerald-100 text-emerald-800 border-emerald-200",
    titulo: "Tu viaje de adopción",
    subtitulo: "comienza aquí",
    descripcion:
      "Encontrar a tu compañero peludo ideal no es cuestión de suerte, sino de afinidad real. Conectamos vidas considerando tu espacio, tiempos y estilo de vida.",
    colorGradiente: "from-emerald-500 via-teal-500 to-emerald-600",
    colorBoton: "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white",
    icono: <PawPrint size={44} className="text-white" strokeWidth={2.2} />,
    destacado: "Adopción responsable y con sentido",
  },
  {
    insignia: "Paso clave: El cuestionario",
    colorInsignia: "bg-amber-100 text-amber-800 border-amber-200",
    titulo: "Preguntas que",
    subtitulo: "marcan la diferencia",
    descripcion:
      "A continuación responderás un cuestionario muy breve sobre tu casa, tu rutina y tu experiencia. Con estas respuestas nuestro algoritmo calcula tu porcentaje de compatibilidad con cada mascota.",
    colorGradiente: "from-amber-500 via-orange-500 to-amber-600",
    colorBoton: "from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white",
    icono: <SlidersHorizontal size={42} className="text-white" strokeWidth={2.2} />,
    destacado: "Te mostrará solo mascotas que calzan con tu vida",
  },
  {
    insignia: "Coincidencias y Guardados",
    colorInsignia: "bg-rose-100 text-rose-800 border-rose-200",
    titulo: "Swipe o Lista",
    subtitulo: "",
    descripcion:
      "Explora tus coincidencias deslizando en modo Swipe o revisándolas en modo Lista. Podrás guardar las mascotas que más te gusten, para luego ir a tu pestaña de Guardados a revisar y decidir cuál es tu mascota ideal.",
    colorGradiente: "from-rose-500 via-pink-500 to-rose-600",
    colorBoton: "from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white",
    icono: (
      <div className="relative flex items-center justify-center">
        <Flame size={44} className="text-white" strokeWidth={2.2} />
        <Heart size={20} className="fill-white text-white absolute -top-1 -right-2" />
      </div>
    ),
    destacado: "Revisa tu lista en Guardados para decidir cuál es tu mascota ideal",
  },
  {
    insignia: "Postulación digital",
    colorInsignia: "bg-indigo-100 text-indigo-800 border-indigo-200",
    titulo: "Conecta directo",
    subtitulo: "con fundaciones y refugios",
    descripcion:
      "Cuando sientas esa conexión especial, envía tu postulación de adopción con un solo clic. Podrás hacer seguimiento, chatear y coordinar visitas con refugios verificados.",
    colorGradiente: "from-indigo-600 via-purple-600 to-indigo-700",
    colorBoton: "from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white",
    icono: (
      <div className="relative flex items-center justify-center">
        <Send size={40} className="text-white" strokeWidth={2.2} />
        <ShieldCheck size={20} className="fill-emerald-400 text-slate-900 absolute -bottom-1 -right-2" />
      </div>
    ),
    destacado: "Sin trámites engorrosos ni papeleos infinitos",
  },
];

export function ModalTutorialAdoptante({ abierto, onCerrar, usuarioId }: Props) {
  const [pasoActual, setPasoActual] = useState(0);

  // Cada vez que se abre el modal, comienza desde el paso 1
  useEffect(() => {
    if (abierto) {
      setPasoActual(0);
    }
  }, [abierto]);

  if (!abierto) return null;

  const diapositiva = DIAPOSITIVAS[pasoActual];
  const esUltimo = pasoActual === DIAPOSITIVAS.length - 1;

  const cerrarYGuardar = () => {
    try {
      sessionStorage.removeItem("housefound_mostrar_tutorial_registro");
      if (usuarioId) {
        localStorage.setItem(`housefound_tutorial_visto_${usuarioId}`, "1");
      }
      localStorage.removeItem(CLAVE_TUTORIAL_VISTO);
    } catch {}
    onCerrar();
  };

  const avanzar = () => {
    if (esUltimo) {
      cerrarYGuardar();
    } else {
      setPasoActual((p) => Math.min(DIAPOSITIVAS.length - 1, p + 1));
    }
  };

  const retroceder = () => {
    setPasoActual((p) => Math.max(0, p - 1));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]">
      <div className="relative w-full max-w-[420px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-[sheet-in_0.25s_ease-out]">
        {/* Barra superior con paso y botón saltar */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" />
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Paso {pasoActual + 1} de {DIAPOSITIVAS.length}
            </span>
          </div>

          <button
            onClick={cerrarYGuardar}
            className="text-xs font-bold text-slate-400 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1"
          >
            <span>Saltar</span>
            <X size={14} />
          </button>
        </div>

        {/* Contenido de la diapositiva */}
        <div className="px-6 pt-3 pb-6 flex flex-col items-center text-center">
          {/* Ícono Ilustrado con Gradiente y Sombras Suaves */}
          <div
            key={pasoActual}
            className={`w-24 h-24 rounded-3xl bg-gradient-to-tr ${diapositiva.colorGradiente} shadow-xl flex items-center justify-center mb-5 transform transition-all duration-300 hover:scale-105`}
          >
            {diapositiva.icono}
          </div>

          {/* Insignia / Tag del paso */}
          <span
            className={`text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border mb-3 shadow-2xs ${diapositiva.colorInsignia}`}
          >
            {diapositiva.insignia}
          </span>

          {/* Título Principal */}
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-black text-slate-900 leading-tight">
            {diapositiva.titulo}
            {diapositiva.subtitulo && (
              <>
                <br />
                <span className="text-slate-600 font-extrabold">{diapositiva.subtitulo}</span>
              </>
            )}
          </h2>

          {/* Descripción */}
          <p className="text-xs text-slate-600 mt-3 leading-relaxed max-w-[340px]">
            {diapositiva.descripcion}
          </p>

          {/* Píldora de Punto Clave */}
          <div className="mt-4 px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] font-bold text-slate-700 max-w-[340px]">
            {diapositiva.destacado}
          </div>
        </div>

        {/* Barra inferior de navegación: Dots + Botones */}
        <div className="bg-slate-50/80 border-t border-slate-100 px-6 py-4 flex items-center justify-between gap-3">
          {/* Indicadores de progreso (Dots/Pills) */}
          <div className="flex items-center gap-1.5">
            {DIAPOSITIVAS.map((_, i) => (
              <button
                key={i}
                onClick={() => setPasoActual(i)}
                aria-label={`Ir al paso ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-200 ${
                  i === pasoActual
                    ? "w-6 bg-slate-800"
                    : "w-2 bg-slate-300 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-2">
            {pasoActual > 0 && (
              <button
                onClick={retroceder}
                aria-label="Paso anterior"
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-all active:scale-95 shadow-2xs"
              >
                <ChevronLeft size={18} strokeWidth={2.4} />
              </button>
            )}

            <button
              onClick={avanzar}
              className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all bg-gradient-to-r ${diapositiva.colorBoton}`}
            >
              <span>{esUltimo ? "¡Comenzar cuestionario!" : "Siguiente"}</span>
              {esUltimo ? (
                <CheckCircle2 size={15} strokeWidth={2.4} />
              ) : (
                <ChevronRight size={15} strokeWidth={2.4} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
