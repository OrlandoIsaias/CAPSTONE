import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ChevronLeft, Clock, Heart, House, Phone, Sparkles, Users } from "lucide-react";
import { guardarPerfilAdoptante, obtenerPerfilAdoptante } from "../api/auth";
import {
  BarraPasos,
  Pregunta,
  SelectorMultiple,
  SelectorOpciones,
  type PasoCuestionario,
} from "../components/Preguntas";
import { Spinner } from "../components/Spinner";
import { useToast } from "../context/ToastContext";
import { normalizarTelefonoCL, validarTelefonoCL } from "../utils/telefono";
import {
  especiesImposibles,
  OPCIONES_ACEPTA_CUIDADOS,
  OPCIONES_ALERGIAS,
  OPCIONES_AMBIENTE_HOGAR,
  OPCIONES_ANIMALES_HOGAR,
  OPCIONES_ESPACIO_DISPONIBLE,
  OPCIONES_ESPECIE_PREFERIDA,
  OPCIONES_ETAPA,
  OPCIONES_EXPERIENCIA_PREVIA,
  OPCIONES_HORAS_SOLA,
  OPCIONES_NINOS_HOGAR,
  OPCIONES_RESTRICCION_VIVIENDA,
  OPCIONES_SEXO_PREFERIDO,
  OPCIONES_TIEMPO_ACTIVIDAD,
  type AnimalHogar,
  type PreferenciaEspecie,
  type PreferenciaSexo,
} from "../utils/opcionesAdoptante";
import { OPCIONES_TAMANO } from "../utils/opcionesMascota";
import type {
  AceptaCuidados,
  Alergias,
  AmbienteHogar,
  EspacioDisponible,
  EtapaVida,
  ExperienciaPrevia,
  NinosHogar,
  PerfilAdoptante,
  RestriccionVivienda,
  TiempoActividad,
} from "../types/auth";
import type { Tamano, TramoHoras } from "../types/mascotas";

/* Cuestionario del adoptante en 5 pasos cortos (2 o 3 preguntas cada uno),
   para que no se sienta como un formulario largo. Cada pregunta explica para
   qué sirve: así se responde con sinceridad, que es lo que hace funcionar
   el matching. */

const PASOS: PasoCuestionario[] = [
  { titulo: "Tu hogar", icono: House },
  { titulo: "Tu rutina", icono: Clock },
  { titulo: "Con quién vivirá", icono: Users },
  { titulo: "Tu experiencia", icono: Sparkles },
  { titulo: "Qué buscas", icono: Heart },
];
const ULTIMO_PASO = PASOS.length - 1;

const INTRO_PASO = [
  "Empecemos por tu casa: así sabremos qué mascotas pueden vivir cómodas contigo.",
  "Tu día a día nos dice cuánto tiempo y energía pueden compartir.",
  "Queremos que la convivencia sea segura para todos los que viven contigo.",
  "No hay respuestas malas: hay una mascota ideal para cada experiencia.",
  "Esto es opcional: solo ordena tus recomendaciones, no deja a ninguna mascota fuera.",
];

// "" = sin responder: un perfil recién registrado no trae respuestas y el
// adoptante debe elegirlas, en vez de guardar valores por defecto.
interface Respuestas {
  espacio_disponible: EspacioDisponible | "";
  restriccion_vivienda: RestriccionVivienda | "";
  horas_sola: TramoHoras | "";
  tiempo_actividad: TiempoActividad | "";
  ambiente_hogar: AmbienteHogar | "";
  ninos_hogar: NinosHogar | "";
  /** [] = sin responder; ["ninguno"] = no vive ningún animal. */
  animales: AnimalHogar[];
  alergias: Alergias | "";
  experiencia_previa: ExperienciaPrevia | "";
  acepta_cuidados: AceptaCuidados | "";
  especie_preferida: PreferenciaEspecie;
  tamanos_preferidos: Tamano[];
  etapas_preferidas: EtapaVida[];
  sexo_preferido: PreferenciaSexo;
  telefono: string;
}

type Campo = keyof Respuestas;
type Errores = Partial<Record<Campo, string>>;

const SIN_RESPUESTAS: Respuestas = {
  espacio_disponible: "",
  restriccion_vivienda: "",
  horas_sola: "",
  tiempo_actividad: "",
  ambiente_hogar: "",
  ninos_hogar: "",
  animales: [],
  alergias: "",
  experiencia_previa: "",
  acepta_cuidados: "",
  especie_preferida: "cualquiera",
  tamanos_preferidos: [],
  etapas_preferidas: [],
  sexo_preferido: "cualquiera",
  telefono: "",
};

// Preguntas obligatorias de cada paso y qué decir si falta responderlas.
const OBLIGATORIAS: Errores[] = [
  {
    espacio_disponible: "Cuéntanos dónde vivirá.",
    restriccion_vivienda: "Elige una opción; si no estás seguro, marca «No lo sé».",
  },
  {
    horas_sola: "Elige el tramo que más se parezca a tu día.",
    tiempo_actividad: "Elige cuánto tiempo puedes dedicarle.",
    ambiente_hogar: "Elige cómo es el ambiente en tu casa.",
  },
  {
    ninos_hogar: "Cuéntanos si hay niños.",
    animales: "Marca los animales que viven contigo, o «Ninguno».",
    alergias: "Cuéntanos si hay alergias en tu hogar.",
  },
  {
    experiencia_previa: "Elige tu experiencia con mascotas.",
    acepta_cuidados: "Elige una opción.",
  },
  {},
];

function desdePerfil(p: PerfilAdoptante): Respuestas {
  const animales: AnimalHogar[] = [];
  if (p.tiene_perros) animales.push("perros");
  if (p.tiene_gatos) animales.push("gatos");
  return {
    espacio_disponible: p.espacio_disponible ?? "",
    restriccion_vivienda: p.restriccion_vivienda ?? "",
    horas_sola: p.horas_sola ?? "",
    tiempo_actividad: p.tiempo_actividad ?? "",
    ambiente_hogar: p.ambiente_hogar ?? "",
    ninos_hogar: p.ninos_hogar ?? "",
    // Un perfil completo sin animales los tiene como "Ninguno"; uno sin
    // responder deja la pregunta en blanco.
    animales: animales.length > 0 ? animales : p.cuestionario_completo ? ["ninguno"] : [],
    alergias: p.alergias ?? "",
    experiencia_previa: p.experiencia_previa ?? "",
    acepta_cuidados: p.acepta_cuidados ?? "",
    especie_preferida: p.especie_preferida ?? "cualquiera",
    tamanos_preferidos: p.tamanos_preferidos ?? [],
    etapas_preferidas: p.etapas_preferidas ?? [],
    sexo_preferido: p.sexo_preferido ?? "cualquiera",
    telefono: p.telefono ?? "",
  };
}

function pendientes(r: Respuestas, paso: number): Errores {
  const errores: Errores = {};
  for (const [campo, aviso] of Object.entries(OBLIGATORIAS[paso]) as [Campo, string][]) {
    const valor = r[campo];
    if (Array.isArray(valor) ? valor.length === 0 : !valor) errores[campo] = aviso;
  }
  if (paso === ULTIMO_PASO && r.telefono.trim() && !validarTelefonoCL(r.telefono)) {
    errores.telefono = "Ingresa un celular chileno válido, ej: +56 9 1234 5678.";
  }
  return errores;
}

const hayPendientes = (errores: Errores) => Object.keys(errores).length > 0;

// Lleva la vista a la primera pregunta sin responder: puede quedar sobre el
// botón "Siguiente", fuera de la pantalla.
function mostrarPrimerError() {
  setTimeout(() => document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
}

export default function EditarPerfilAdoptante() {
  const navigate = useNavigate();
  const mostrarToast = useToast();

  const [respuestas, setRespuestas] = useState<Respuestas>(SIN_RESPUESTAS);
  const [paso, setPaso] = useState(0);
  // La primera vez solo se puede volver a pasos ya vistos; al editar, a cualquiera.
  const [pasoMaximo, setPasoMaximo] = useState(0);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  // true si nunca respondió el cuestionario (perfil sin respuestas o sin
  // perfil): la pantalla se presenta como primer paso y no como edición.
  const [primeraVez, setPrimeraVez] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerPerfilAdoptante()
      .then((p) => {
        setPrimeraVez(!p.cuestionario_completo);
        setRespuestas(desdePerfil(p));
        if (p.cuestionario_completo) setPasoMaximo(ULTIMO_PASO);
      })
      .catch((err) => {
        // 404: el adoptante se registró sin teléfono y aún no tiene perfil.
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setPrimeraVez(true);
        } else {
          setError("No pudimos cargar tus respuestas guardadas. Recarga la página antes de editarlas.");
        }
      })
      .finally(() => setCargandoInicial(false));
  }, []);

  const imposibles = especiesImposibles(respuestas.alergias, respuestas.restriccion_vivienda);

  function responder<C extends Campo>(campo: C, valor: Respuestas[C]) {
    setRespuestas((prev) => {
      const nuevas: Respuestas = { ...prev };
      nuevas[campo] = valor;
      // Si una respuesta vuelve imposible la especie elegida (alergia, solo
      // gatos), la preferencia vuelve a "Me da igual".
      if (
        nuevas.especie_preferida !== "cualquiera" &&
        especiesImposibles(nuevas.alergias, nuevas.restriccion_vivienda).includes(nuevas.especie_preferida)
      ) {
        nuevas.especie_preferida = "cualquiera";
      }
      // El tamaño solo aplica a perros.
      if (nuevas.especie_preferida === "Gato") nuevas.tamanos_preferidos = [];
      return nuevas;
    });
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
  }

  function irAPaso(destino: number) {
    setPaso(destino);
    setPasoMaximo((maximo) => Math.max(maximo, destino));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function siguiente() {
    const faltan = pendientes(respuestas, paso);
    setErrores(faltan);
    if (hayPendientes(faltan)) mostrarPrimerError();
    else irAPaso(paso + 1);
  }

  async function guardar() {
    setError(null);
    // Revisa todos los pasos y lleva al primero que tenga algo pendiente.
    for (let i = 0; i <= ULTIMO_PASO; i++) {
      const faltan = pendientes(respuestas, i);
      if (hayPendientes(faltan)) {
        setErrores(faltan);
        irAPaso(i);
        mostrarPrimerError();
        return;
      }
    }

    setGuardando(true);
    try {
      await guardarPerfilAdoptante({
        espacio_disponible: respuestas.espacio_disponible as EspacioDisponible,
        restriccion_vivienda: respuestas.restriccion_vivienda as RestriccionVivienda,
        horas_sola: respuestas.horas_sola as TramoHoras,
        tiempo_actividad: respuestas.tiempo_actividad as TiempoActividad,
        experiencia_previa: respuestas.experiencia_previa as ExperienciaPrevia,
        ambiente_hogar: respuestas.ambiente_hogar as AmbienteHogar,
        ninos_hogar: respuestas.ninos_hogar as NinosHogar,
        tiene_perros: respuestas.animales.includes("perros"),
        tiene_gatos: respuestas.animales.includes("gatos"),
        alergias: respuestas.alergias as Alergias,
        acepta_cuidados: respuestas.acepta_cuidados as AceptaCuidados,
        especie_preferida: respuestas.especie_preferida === "cualquiera" ? null : respuestas.especie_preferida,
        tamanos_preferidos: respuestas.tamanos_preferidos.length > 0 ? respuestas.tamanos_preferidos : null,
        etapas_preferidas: respuestas.etapas_preferidas.length > 0 ? respuestas.etapas_preferidas : null,
        sexo_preferido: respuestas.sexo_preferido === "cualquiera" ? null : respuestas.sexo_preferido,
        telefono: respuestas.telefono.trim() ? normalizarTelefonoCL(respuestas.telefono) : "",
      });
      if (primeraVez) {
        mostrarToast("¡Cuestionario completado! Estas son tus recomendaciones.");
        navigate("/recomendaciones");
      } else {
        mostrarToast("Cambios guardados. Recalculamos tu compatibilidad.");
        navigate("/perfil-adoptante");
      }
    } catch {
      setError("No pudimos guardar tus respuestas. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();
    // Enter en el último paso (o al editar) guarda; antes, avanza.
    if (paso === ULTIMO_PASO || !primeraVez) guardar();
    else siguiente();
  }

  if (cargandoInicial) {
    return (
      <div className="min-h-screen bg-[var(--color-fondo)] flex items-center justify-center p-6">
        <Spinner />
      </div>
    );
  }

  const textos = primeraVez
    ? {
        titulo: "Completa tu cuestionario",
        subtitulo: "Con tus respuestas buscamos las mascotas más compatibles con tu hogar. Son 5 pasos cortos.",
        secundario: "Completar más tarde",
      }
    : {
        titulo: "Editar cuestionario",
        subtitulo: "Si cambias tus respuestas, recalculamos tu compatibilidad con cada mascota.",
        secundario: "Cancelar",
      };

  const botonPrincipal = "flex-[1.6] flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-black py-3.5 rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-60";
  const botonSecundario = "flex-1 py-3.5 rounded-2xl text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 active:scale-95 transition-all";

  return (
    <div className="min-h-screen bg-[var(--color-fondo)]">
      <div className="mx-auto w-full max-w-[480px] px-5 pt-6 pb-20">
        <header className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => navigate("/perfil-adoptante")}
            aria-label="Volver al perfil"
            className="w-10 h-10 rounded-full bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-600 hover:text-slate-900 active:scale-90 transition-transform shrink-0"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-black text-slate-900 leading-tight">
              {textos.titulo}
            </h1>
            <p className="text-xs font-medium text-slate-500">{textos.subtitulo}</p>
          </div>
        </header>

        <BarraPasos
          pasos={PASOS}
          actual={paso}
          tono="indigo"
          hastaPaso={primeraVez ? pasoMaximo : ULTIMO_PASO}
          onIrA={irAPaso}
        />

        <form onSubmit={manejarEnvio} noValidate className="space-y-4">
          <section className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-6">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-black text-slate-900">
                {PASOS[paso].titulo}
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-1">{INTRO_PASO[paso]}</p>
            </div>

            {paso === 0 && (
              <>
                <Pregunta titulo="¿Dónde vivirá la mascota?" error={errores.espacio_disponible}>
                  <SelectorOpciones
                    opciones={OPCIONES_ESPACIO_DISPONIBLE}
                    valor={respuestas.espacio_disponible}
                    onCambio={(v) => responder("espacio_disponible", v)}
                    tono="indigo"
                  />
                </Pregunta>
                <Pregunta
                  titulo="¿Tu arriendo o edificio pone alguna condición sobre mascotas?"
                  ayuda="Así evitamos recomendarte una mascota que después no puedas tener."
                  error={errores.restriccion_vivienda}
                >
                  <SelectorOpciones
                    opciones={OPCIONES_RESTRICCION_VIVIENDA}
                    valor={respuestas.restriccion_vivienda}
                    onCambio={(v) => responder("restriccion_vivienda", v)}
                    tono="indigo"
                  />
                </Pregunta>
              </>
            )}

            {paso === 1 && (
              <>
                <Pregunta
                  titulo="En un día normal, ¿cuántas horas seguidas quedaría sola?"
                  ayuda="Algunas mascotas lo pasan mal si están mucho tiempo solas. Responde con sinceridad: así encontramos la ideal para ti."
                  error={errores.horas_sola}
                >
                  <SelectorOpciones
                    opciones={OPCIONES_HORAS_SOLA}
                    valor={respuestas.horas_sola}
                    onCambio={(v) => responder("horas_sola", v)}
                    tono="indigo"
                    columnas={2}
                  />
                </Pregunta>
                <Pregunta
                  titulo="¿Cuánto tiempo al día puedes dedicar a pasearla o jugar con ella?"
                  error={errores.tiempo_actividad}
                >
                  <SelectorOpciones
                    opciones={OPCIONES_TIEMPO_ACTIVIDAD}
                    valor={respuestas.tiempo_actividad}
                    onCambio={(v) => responder("tiempo_actividad", v)}
                    tono="indigo"
                  />
                </Pregunta>
                <Pregunta
                  titulo="¿Cómo es el ambiente en tu casa?"
                  ayuda="Las mascotas tímidas se sienten más seguras en hogares tranquilos."
                  error={errores.ambiente_hogar}
                >
                  <SelectorOpciones
                    opciones={OPCIONES_AMBIENTE_HOGAR}
                    valor={respuestas.ambiente_hogar}
                    onCambio={(v) => responder("ambiente_hogar", v)}
                    tono="indigo"
                  />
                </Pregunta>
              </>
            )}

            {paso === 2 && (
              <>
                <Pregunta titulo="¿Hay niños en tu hogar o que te visiten seguido?" error={errores.ninos_hogar}>
                  <SelectorOpciones
                    opciones={OPCIONES_NINOS_HOGAR}
                    valor={respuestas.ninos_hogar}
                    onCambio={(v) => responder("ninos_hogar", v)}
                    tono="indigo"
                  />
                </Pregunta>
                <Pregunta
                  titulo="¿Qué animales viven contigo?"
                  ayuda="Puedes marcar más de uno."
                  error={errores.animales}
                >
                  <SelectorMultiple
                    opciones={OPCIONES_ANIMALES_HOGAR}
                    valores={respuestas.animales}
                    onCambio={(v) => responder("animales", v)}
                    tono="indigo"
                    columnas={3}
                    excluyente="ninguno"
                    compacta
                  />
                </Pregunta>
                <Pregunta
                  titulo="¿Alguien en tu hogar tiene alergia a los perros o a los gatos?"
                  error={errores.alergias}
                >
                  <SelectorOpciones
                    opciones={OPCIONES_ALERGIAS}
                    valor={respuestas.alergias}
                    onCambio={(v) => responder("alergias", v)}
                    tono="indigo"
                    columnas={2}
                  />
                </Pregunta>
              </>
            )}

            {paso === 3 && (
              <>
                <Pregunta titulo="¿Qué experiencia tienes con mascotas?" error={errores.experiencia_previa}>
                  <SelectorOpciones
                    opciones={OPCIONES_EXPERIENCIA_PREVIA}
                    valor={respuestas.experiencia_previa}
                    onCambio={(v) => responder("experiencia_previa", v)}
                    tono="indigo"
                  />
                </Pregunta>
                <Pregunta
                  titulo="¿Podrías cuidar a una mascota con necesidades especiales?"
                  ayuda="Muchas mascotas rescatadas necesitan un cuidado extra y son las que más esperan un hogar."
                  error={errores.acepta_cuidados}
                >
                  <SelectorOpciones
                    opciones={OPCIONES_ACEPTA_CUIDADOS}
                    valor={respuestas.acepta_cuidados}
                    onCambio={(v) => responder("acepta_cuidados", v)}
                    tono="indigo"
                  />
                </Pregunta>
              </>
            )}

            {paso === 4 && (
              <>
                <Pregunta titulo="¿Qué te gustaría adoptar?" opcional>
                  <SelectorOpciones
                    opciones={OPCIONES_ESPECIE_PREFERIDA}
                    valor={respuestas.especie_preferida}
                    onCambio={(v) => responder("especie_preferida", v)}
                    tono="indigo"
                    columnas={3}
                    deshabilitadas={imposibles}
                    compacta
                  />
                  {imposibles.length > 0 && (
                    <p className="text-[11px] font-medium text-slate-400">
                      Según lo que nos contaste, en tu hogar no es posible tener{" "}
                      {imposibles.length === 2 ? "perros ni gatos" : imposibles[0] === "Perro" ? "un perro" : "un gato"}.
                    </p>
                  )}
                </Pregunta>

                {respuestas.especie_preferida !== "Gato" && (
                  <Pregunta
                    titulo="¿De qué tamaño?"
                    ayuda="Solo aplica a perros. Si no marcas ninguno, te da igual."
                    opcional
                  >
                    <SelectorMultiple
                      opciones={OPCIONES_TAMANO}
                      valores={respuestas.tamanos_preferidos}
                      onCambio={(v) => responder("tamanos_preferidos", v)}
                      tono="indigo"
                    />
                  </Pregunta>
                )}

                <Pregunta
                  titulo="¿Qué edad te gustaría que tenga?"
                  ayuda="Marca una o más. Los seniors suelen ser los que más esperan un hogar."
                  opcional
                >
                  <SelectorMultiple
                    opciones={OPCIONES_ETAPA}
                    valores={respuestas.etapas_preferidas}
                    onCambio={(v) => responder("etapas_preferidas", v)}
                    tono="indigo"
                    columnas={2}
                  />
                </Pregunta>

                <Pregunta titulo="¿Macho o hembra?" opcional>
                  <SelectorOpciones
                    opciones={OPCIONES_SEXO_PREFERIDO}
                    valor={respuestas.sexo_preferido}
                    onCambio={(v) => responder("sexo_preferido", v)}
                    tono="indigo"
                    columnas={3}
                    compacta
                  />
                </Pregunta>

                <div className="space-y-2.5">
                  <label htmlFor="telefono" className="block text-sm font-extrabold text-slate-800">
                    Tu celular o WhatsApp
                    <span className="ml-1.5 text-xs font-semibold text-slate-400">(opcional)</span>
                  </label>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">
                    Solo lo verá el refugio si aprueba tu postulación, para coordinar el encuentro.
                  </p>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 pointer-events-none">
                      <Phone size={15} strokeWidth={2.2} />
                    </div>
                    <input
                      id="telefono"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={respuestas.telefono}
                      onChange={(e) => responder("telefono", e.target.value)}
                      placeholder="+56 9 1234 5678"
                      aria-invalid={errores.telefono ? true : undefined}
                      className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/60 pl-14 pr-4 py-3.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 hover:bg-white hover:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    />
                  </div>
                  {errores.telefono && (
                    <p role="alert" className="text-xs font-semibold text-rose-600">
                      {errores.telefono}
                    </p>
                  )}
                </div>
              </>
            )}
          </section>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {error}
            </div>
          )}

          <div className="flex gap-2.5">
            {paso > 0 && (
              <button type="button" onClick={() => irAPaso(paso - 1)} className={botonSecundario}>
                Atrás
              </button>
            )}
            {primeraVez && paso < ULTIMO_PASO ? (
              <button type="button" onClick={siguiente} className={botonPrincipal}>
                Siguiente
              </button>
            ) : (
              <button type="submit" disabled={guardando} className={botonPrincipal}>
                {guardando && <Spinner />}
                {guardando
                  ? "Guardando..."
                  : primeraVez
                    ? "Guardar y ver mis recomendaciones"
                    : "Guardar cambios"}
              </button>
            )}
          </div>

          {!primeraVez && paso < ULTIMO_PASO && (
            <button
              type="button"
              onClick={siguiente}
              className="w-full py-2.5 rounded-2xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              Siguiente paso: {PASOS[paso + 1].titulo} →
            </button>
          )}

          {/* Primera vez: saltarlo lleva a Explorar, que funciona sin
              cuestionario (muestra las mascotas sin % de afinidad). */}
          <button
            type="button"
            onClick={() => navigate(primeraVez ? "/explorar" : "/perfil-adoptante")}
            className="w-full py-3 rounded-2xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            {textos.secundario}
          </button>
        </form>
      </div>
    </div>
  );
}
