import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Check, Clock, ImagePlus, PawPrint, Smile, Star, Stethoscope, Trash2, Undo2, Users } from "lucide-react";
import {
  actualizarMascota,
  agregarFoto,
  crearMascota,
  eliminarFoto,
  obtenerMascota,
} from "../api/mascotas";
import { BotonVolver } from "../components/BotonVolver";
import {
  BarraPasos,
  Pregunta,
  SelectorOpciones,
  type PasoCuestionario,
} from "../components/Preguntas";
import { CargandoVista, Spinner } from "../components/Spinner";
import { useToast } from "../context/ToastContext";
import { useAjusteFotos } from "../hooks/useAjusteFotos";
import { leerArchivoComoDataUrl } from "../utils/imagen";
import {
  aTriEstado,
  deTriEstado,
  EDAD_OPCIONES,
  ESPECIES,
  OPCIONES_CONVIVE,
  OPCIONES_CONVIVENCIA_NINOS,
  OPCIONES_ENERGIA,
  OPCIONES_ESPACIO_MINIMO,
  OPCIONES_ESPECIE,
  OPCIONES_EXPERIENCIA_REQUERIDA,
  OPCIONES_NIVEL_CUIDADOS,
  OPCIONES_SALUD,
  OPCIONES_SEXO,
  OPCIONES_TAMANO,
  OPCIONES_TEMPERAMENTO,
  OPCIONES_TOLERANCIA_SOLEDAD,
  RAZAS_POR_ESPECIE,
  REGEX_SOLO_LETRAS,
  TAMANO_MAXIMO_FOTO_BYTES,
  TIPOS_FOTO_ACEPTADOS,
  type ConvivenciaNinosForm,
  type EspecieMascota,
  type TriEstado,
} from "../utils/opcionesMascota";
import type {
  ConvivenciaNinos,
  EspacioMinimo,
  FotoMascota,
  Mascota,
  MascotaInput,
  Nivel,
  NivelCuidados,
  Sexo,
  Tamano,
  Temperamento,
  TramoHoras,
} from "../types/mascotas";

/* La misma pantalla sirve para publicar (/mascota/nueva) y para editar
   (/mis-mascotas/:id/editar). La ficha va en pasos cortos para que publicar
   no se sienta como un formulario eterno. Al editar, las fotos existentes
   solo se pueden quitar (se borran al guardar); agregarlas sigue siendo
   desde el perfil de la mascota (MascotaRefugio). */

const PASOS: PasoCuestionario[] = [
  { titulo: "Datos básicos", icono: PawPrint },
  { titulo: "Día a día", icono: Clock },
  { titulo: "Personalidad", icono: Smile },
  { titulo: "Convivencia", icono: Users },
  { titulo: "Salud", icono: Stethoscope },
  { titulo: "Fotos", icono: ImagePlus },
];
const ULTIMO_PASO = PASOS.length - 1;

const INTRO_PASO = [
  "Lo esencial para presentarla a los adoptantes.",
  "Con esto buscamos hogares que puedan darle el tiempo y el espacio que necesita.",
  "Nos ayuda a encontrar personas preparadas para su forma de ser.",
  "Responde lo que sepan: «No lo sabemos» nunca la deja fuera, pero el adoptante verá un aviso.",
  "Los cuidados especiales se comparan con lo que cada adoptante puede asumir; el resto es información para conocer su salud.",
];

// "" = sin responder: el refugio elige cada rasgo, en vez de publicar uno
// preseleccionado que nadie evaluó. La ficha de salud parte en "No sé"
// porque es informativa y equivale a no tener el dato.
interface Ficha {
  nombre: string;
  especie: EspecieMascota | "";
  raza: string;
  sexo: Sexo | "";
  edad: number | "";
  tamano: Tamano | "";
  tolerancia_soledad: TramoHoras | "";
  nivel_energia: Nivel | "";
  espacio_minimo_requerido: EspacioMinimo | "";
  temperamento: Temperamento | "";
  nivel_experiencia_requerida: Nivel | "";
  convivencia_ninos: ConvivenciaNinosForm | "";
  convive_perros: TriEstado | "";
  convive_gatos: TriEstado | "";
  nivel_cuidados: NivelCuidados | "";
  cuidados_especiales: string;
  esterilizado: TriEstado;
  vacunas_al_dia: TriEstado;
  desparasitado: TriEstado;
  microchip: TriEstado;
  notas_salud: string;
}

type Campo = keyof Ficha;
type Errores = Partial<Record<Campo | "foto", string>>;

const FICHA_VACIA: Ficha = {
  nombre: "",
  especie: "",
  raza: "",
  sexo: "",
  edad: "",
  tamano: "",
  tolerancia_soledad: "",
  nivel_energia: "",
  espacio_minimo_requerido: "",
  temperamento: "",
  nivel_experiencia_requerida: "",
  convivencia_ninos: "",
  convive_perros: "",
  convive_gatos: "",
  nivel_cuidados: "",
  cuidados_especiales: "",
  esterilizado: "sin_dato",
  vacunas_al_dia: "sin_dato",
  desparasitado: "sin_dato",
  microchip: "sin_dato",
  notas_salud: "",
};

const OBLIGATORIAS: Partial<Record<Campo, string>>[] = [
  {
    especie: "Elige si es perro o gato.",
    raza: "Elige la raza.",
    sexo: "Elige el sexo.",
    edad: "Elige la edad aproximada.",
  },
  {
    tolerancia_soledad: "Indica cuánto tiempo puede pasar sin compañía.",
    nivel_energia: "Indica cuánta actividad necesita.",
    espacio_minimo_requerido: "Indica qué espacio necesita como mínimo.",
  },
  {
    temperamento: "Indica cómo se relaciona con las personas.",
    nivel_experiencia_requerida: "Indica para qué tipo de adoptante es adecuada.",
  },
  {
    convivencia_ninos: "Elige una opción (puede ser «No lo sabemos»).",
    convive_perros: "Elige una opción (puede ser «No lo sabemos»).",
    convive_gatos: "Elige una opción (puede ser «No lo sabemos»).",
  },
  { nivel_cuidados: "Indica si necesita cuidados especiales." },
  {},
];

function pendientes(f: Ficha, paso: number): Errores {
  const errores: Errores = {};
  for (const [campo, aviso] of Object.entries(OBLIGATORIAS[paso]) as [Campo, string][]) {
    if (f[campo] === "") errores[campo] = aviso;
  }
  if (paso === 0) {
    if (!REGEX_SOLO_LETRAS.test(f.nombre.trim())) {
      errores.nombre = "Solo letras, mínimo 2 caracteres, sin números ni símbolos.";
    }
    if (f.especie === "Perro" && !f.tamano) errores.tamano = "Indica el tamaño que tendrá de adulto.";
  }
  if (paso === 4 && f.nivel_cuidados && f.nivel_cuidados !== "ninguno" && !f.cuidados_especiales.trim()) {
    errores.cuidados_especiales = "Cuéntale al adoptante qué cuidados necesita.";
  }
  return errores;
}

const hayPendientes = (errores: Errores) => Object.keys(errores).length > 0;

// Lleva la vista a la primera pregunta sin responder: puede quedar sobre el
// botón "Siguiente", fuera de la pantalla.
function mostrarPrimerError() {
  setTimeout(() => document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
}

function desdeMascota(m: Mascota): Ficha {
  // Si la especie guardada no está en el catálogo, queda vacía y la
  // validación obliga a elegir una antes de guardar.
  const especieCatalogo = ESPECIES.find((e) => e.toLowerCase() === (m.especie ?? "").toLowerCase());
  return {
    nombre: m.nombre,
    especie: especieCatalogo ?? "",
    raza: especieCatalogo ? (m.raza ?? "") : "",
    sexo: m.sexo ?? "",
    edad: m.edad ?? "",
    tamano: m.tamano ?? "",
    tolerancia_soledad: m.tolerancia_soledad ?? "",
    nivel_energia: m.nivel_energia ?? "",
    espacio_minimo_requerido: m.espacio_minimo_requerido ?? "",
    temperamento: m.temperamento ?? "",
    nivel_experiencia_requerida: m.nivel_experiencia_requerida ?? "",
    // null es lo que se guardó como "No lo sabemos".
    convivencia_ninos: m.convivencia_ninos ?? "sin_dato",
    convive_perros: aTriEstado(m.convive_perros),
    convive_gatos: aTriEstado(m.convive_gatos),
    nivel_cuidados: m.nivel_cuidados ?? "",
    cuidados_especiales: m.cuidados_especiales ?? "",
    esterilizado: aTriEstado(m.esterilizado),
    vacunas_al_dia: aTriEstado(m.vacunas_al_dia),
    desparasitado: aTriEstado(m.desparasitado),
    microchip: aTriEstado(m.microchip),
    notas_salud: m.notas_salud ?? "",
  };
}

function aPayload(f: Ficha): MascotaInput {
  return {
    nombre: f.nombre.trim(),
    especie: f.especie as EspecieMascota,
    raza: f.raza,
    edad: f.edad as number,
    sexo: f.sexo as Sexo,
    tamano: f.especie === "Perro" ? (f.tamano as Tamano) : null,
    espacio_minimo_requerido: f.espacio_minimo_requerido as EspacioMinimo,
    tolerancia_soledad: f.tolerancia_soledad as TramoHoras,
    nivel_energia: f.nivel_energia as Nivel,
    nivel_experiencia_requerida: f.nivel_experiencia_requerida as Nivel,
    temperamento: f.temperamento as Temperamento,
    convivencia_ninos: f.convivencia_ninos === "sin_dato" ? null : (f.convivencia_ninos as ConvivenciaNinos),
    convive_perros: deTriEstado(f.convive_perros as TriEstado),
    convive_gatos: deTriEstado(f.convive_gatos as TriEstado),
    nivel_cuidados: f.nivel_cuidados as NivelCuidados,
    cuidados_especiales: f.nivel_cuidados === "ninguno" ? null : f.cuidados_especiales.trim(),
    esterilizado: deTriEstado(f.esterilizado),
    vacunas_al_dia: deTriEstado(f.vacunas_al_dia),
    desparasitado: deTriEstado(f.desparasitado),
    microchip: deTriEstado(f.microchip),
    notas_salud: f.notas_salud.trim() || null,
  };
}

interface FotoItem {
  id: string;
  archivo: File;
  preview: string;
  esPrincipal: boolean;
}

export default function PublicarMascota() {
  const navigate = useNavigate();
  const mostrarToast = useToast();
  const { ajustarFotos, editorFotos } = useAjusteFotos();
  const { id } = useParams<{ id: string }>();
  const modoEdicion = id !== undefined;
  const mascotaId = Number(id);

  const [cargandoMascota, setCargandoMascota] = useState(modoEdicion);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [fotosExistentes, setFotosExistentes] = useState<FotoMascota[]>([]);
  const [fotosAEliminar, setFotosAEliminar] = useState<number[]>([]);

  const [ficha, setFicha] = useState<Ficha>(FICHA_VACIA);
  const [paso, setPaso] = useState(0);
  // Al publicar solo se puede volver a pasos ya vistos; al editar, a cualquiera.
  const [pasoMaximo, setPasoMaximo] = useState(modoEdicion ? ULTIMO_PASO : 0);

  const [fotos, setFotos] = useState<FotoItem[]>([]);
  const [procesandoFotos, setProcesandoFotos] = useState(false);

  const [errores, setErrores] = useState<Errores>({});
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!modoEdicion) return;
    const controlador = new AbortController();

    obtenerMascota(mascotaId, controlador.signal)
      .then((m) => {
        setFicha(desdeMascota(m));
        setFotosExistentes(m.fotos ?? []);
      })
      .catch((err) => {
        if (!axios.isCancel(err)) setErrorCarga("No pudimos cargar los datos de esta mascota.");
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargandoMascota(false);
      });

    return () => controlador.abort();
  }, [modoEdicion, mascotaId]);

  // Una raza o edad cargada que no esté en el catálogo se agrega como opción
  // extra, para que el select la muestre y no se pierda al guardar.
  const razasCatalogo = ficha.especie ? RAZAS_POR_ESPECIE[ficha.especie] : [];
  const razasDisponibles =
    ficha.raza && !razasCatalogo.includes(ficha.raza) ? [...razasCatalogo, ficha.raza] : razasCatalogo;
  const edadOpciones =
    ficha.edad !== "" && !EDAD_OPCIONES.some((o) => o.valor === ficha.edad)
      ? [...EDAD_OPCIONES, { valor: ficha.edad, etiqueta: `${ficha.edad} años` }]
      : EDAD_OPCIONES;

  function responder<C extends Campo>(campo: C, valor: Ficha[C]) {
    setFicha((prev) => {
      const nueva: Ficha = { ...prev };
      nueva[campo] = valor;
      if (campo === "especie") {
        nueva.raza = "";
        // El tamaño adulto solo se registra en perros.
        if (valor === "Gato") nueva.tamano = "";
      }
      return nueva;
    });
    setErrores((prev) => ({ ...prev, [campo]: undefined, ...(campo === "especie" ? { raza: undefined } : {}) }));
  }

  function irAPaso(destino: number) {
    setPaso(destino);
    setPasoMaximo((maximo) => Math.max(maximo, destino));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function siguiente() {
    const faltan = pendientes(ficha, paso);
    setErrores(faltan);
    if (hayPendientes(faltan)) mostrarPrimerError();
    else irAPaso(paso + 1);
  }

  async function manejarCambioFotos(evento: ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(evento.target.files ?? []);
    evento.target.value = "";
    if (archivos.length === 0) return;

    setProcesandoFotos(true);
    const nuevasFotos: FotoItem[] = [];
    let errorMsg: string | undefined;

    try {
      const validos: File[] = [];
      for (const archivo of archivos) {
        if (!TIPOS_FOTO_ACEPTADOS.includes(archivo.type as (typeof TIPOS_FOTO_ACEPTADOS)[number])) {
          errorMsg = "Solo se aceptan imágenes en formato PNG, JPEG o WebP.";
          continue;
        }
        if (archivo.size > TAMANO_MAXIMO_FOTO_BYTES) {
          errorMsg = "Cada imagen no puede pesar más de 4 MB.";
          continue;
        }
        validos.push(archivo);
      }

      // El refugio encuadra cada foto en formato cuadrado (1:1)
      const recortadas = await ajustarFotos(validos);

      for (const archivoCuadrado of recortadas) {
        const preview = await leerArchivoComoDataUrl(archivoCuadrado);
        nuevasFotos.push({
          id: `${Date.now()}-${Math.random()}`,
          archivo: archivoCuadrado,
          preview,
          esPrincipal: false,
        });
      }

      if (errorMsg && nuevasFotos.length === 0) {
        setErrores((prev) => ({ ...prev, foto: errorMsg }));
        return;
      }

      setFotos((prev) => {
        const combinadas = [...prev, ...nuevasFotos];
        if (combinadas.length > 0 && !combinadas.some((f) => f.esPrincipal)) {
          combinadas[0].esPrincipal = true;
        }
        return combinadas;
      });

      setErrores((prev) => ({ ...prev, foto: errorMsg }));
    } finally {
      setProcesandoFotos(false);
    }
  }

  function quitarFoto(idFoto: string) {
    setFotos((prev) => {
      const filtradas = prev.filter((f) => f.id !== idFoto);
      if (filtradas.length > 0 && !filtradas.some((f) => f.esPrincipal)) {
        filtradas[0].esPrincipal = true;
      }
      return filtradas;
    });
  }

  function marcarComoPrincipal(idFoto: string) {
    setFotos((prev) => prev.map((f) => ({ ...f, esPrincipal: f.id === idFoto })));
  }

  function alternarEliminarFoto(fotoId: number) {
    setFotosAEliminar((prev) =>
      prev.includes(fotoId) ? prev.filter((idFoto) => idFoto !== fotoId) : [...prev, fotoId]
    );
  }

  async function guardar() {
    setError(null);
    // Revisa todos los pasos y lleva al primero que tenga algo pendiente.
    for (let i = 0; i <= ULTIMO_PASO; i++) {
      const faltan = pendientes(ficha, i);
      if (hayPendientes(faltan)) {
        setErrores(faltan);
        irAPaso(i);
        mostrarPrimerError();
        return;
      }
    }

    setCargando(true);
    try {
      const payload = aPayload(ficha);

      if (modoEdicion) {
        await actualizarMascota(mascotaId, payload);
        for (const fotoId of fotosAEliminar) {
          await eliminarFoto(mascotaId, fotoId);
        }
        mostrarToast("¡Cambios guardados!");
        navigate(`/mis-mascotas/${mascotaId}`);
        return;
      }

      const mascotaCreada = await crearMascota(payload);

      // Subir fotos en secuencia
      for (let i = 0; i < fotos.length; i++) {
        const f = fotos[i];
        await agregarFoto(mascotaCreada.id, f.archivo, f.esPrincipal, i + 1);
      }

      mostrarToast(`¡${payload.nombre} ya está publicada!`);
      navigate(`/mis-mascotas/${mascotaCreada.id}`);
    } catch {
      setError(
        modoEdicion
          ? "No pudimos guardar los cambios. Revisa los datos e intenta de nuevo."
          : "No pudimos publicar la mascota. Revisa los datos e intenta de nuevo."
      );
    } finally {
      setCargando(false);
    }
  }

  function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();
    // Enter en el último paso (o al editar) guarda; antes, avanza.
    if (paso === ULTIMO_PASO || modoEdicion) guardar();
    else siguiente();
  }

  const claseCampo =
    "w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all disabled:opacity-60";
  const claseEtiqueta = "block text-sm font-extrabold text-slate-800 mb-2";
  // role="alert": lo usa mostrarPrimerError para encontrar el primer pendiente.
  const claseErrorCampo = "text-xs font-semibold text-rose-600 mt-1.5";
  const botonPrincipal =
    "flex-[1.6] flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-black py-3.5 rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-60";
  const botonSecundario =
    "flex-1 py-3.5 rounded-2xl text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 active:scale-95 transition-all";
  const nombreVisible = ficha.nombre.trim() || "la mascota";

  return (
    <div className="min-h-screen bg-[var(--color-fondo)]">
      <div className="mx-auto w-full max-w-[480px] px-5 pt-6 pb-20">
        <BotonVolver />
        {/* mt-12: deja espacio al botón de volver, que flota sobre la página. */}
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-black text-slate-900 mt-12 mb-1 leading-tight">
          {modoEdicion ? `Editar a ${nombreVisible}` : "Publicar mascota"}
        </h1>
        <p className="text-xs font-medium text-slate-500 mb-5">
          {modoEdicion
            ? "Puedes saltar a cualquier paso y guardar cuando quieras."
            : "Son 6 pasos cortos. Con estas respuestas calculamos su compatibilidad con cada adoptante."}
        </p>

        {cargandoMascota && <CargandoVista mensaje="Cargando datos de la mascota…" />}

        {errorCarga && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
            {errorCarga}
          </div>
        )}

        {!cargandoMascota && !errorCarga && (
          <>
            <BarraPasos pasos={PASOS} actual={paso} tono="emerald" hastaPaso={pasoMaximo} onIrA={irAPaso} />

            <form onSubmit={manejarEnvio} noValidate className="space-y-4">
              <section className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-6">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-xl font-black text-slate-900">
                    {PASOS[paso].titulo}
                  </h2>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    {paso < ULTIMO_PASO
                      ? INTRO_PASO[paso]
                      : modoEdicion
                        ? "Las fotos marcadas se eliminan al guardar. Para agregar fotos, usa «+ Foto» en el perfil de la mascota."
                        : "Una buena foto aumenta mucho sus posibilidades de adopción. Podrás encuadrar cada una."}
                  </p>
                </div>

                {paso === 0 && (
                  <>
                    <div>
                      <label htmlFor="nombre" className={claseEtiqueta}>
                        ¿Cómo se llama?
                      </label>
                      <input
                        id="nombre"
                        value={ficha.nombre}
                        onChange={(e) => responder("nombre", e.target.value)}
                        placeholder="Ej: Luna, Max..."
                        aria-invalid={errores.nombre ? true : undefined}
                        className={claseCampo}
                      />
                      {errores.nombre && <p role="alert" className={claseErrorCampo}>{errores.nombre}</p>}
                    </div>

                    <Pregunta titulo="¿Es perro o gato?" error={errores.especie}>
                      <SelectorOpciones
                        opciones={OPCIONES_ESPECIE}
                        valor={ficha.especie}
                        onCambio={(v) => responder("especie", v)}
                        tono="emerald"
                        columnas={2}
                      />
                    </Pregunta>

                    <div>
                      <label htmlFor="raza" className={claseEtiqueta}>
                        Raza
                      </label>
                      <select
                        id="raza"
                        value={ficha.raza}
                        onChange={(e) => responder("raza", e.target.value)}
                        disabled={!ficha.especie}
                        className={claseCampo}
                      >
                        <option value="">{ficha.especie ? "Selecciona..." : "Elige primero si es perro o gato"}</option>
                        {razasDisponibles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      {errores.raza && <p role="alert" className={claseErrorCampo}>{errores.raza}</p>}
                    </div>

                    <Pregunta titulo="Sexo" error={errores.sexo}>
                      <SelectorOpciones
                        opciones={OPCIONES_SEXO}
                        valor={ficha.sexo}
                        onCambio={(v) => responder("sexo", v)}
                        tono="emerald"
                        columnas={2}
                      />
                    </Pregunta>

                    <div>
                      <label htmlFor="edad" className={claseEtiqueta}>
                        Edad aproximada
                      </label>
                      <select
                        id="edad"
                        value={ficha.edad}
                        onChange={(e) => responder("edad", e.target.value === "" ? "" : Number(e.target.value))}
                        className={claseCampo}
                      >
                        <option value="">Selecciona...</option>
                        {edadOpciones.map((o) => (
                          <option key={o.valor} value={o.valor}>
                            {o.etiqueta}
                          </option>
                        ))}
                      </select>
                      {errores.edad && <p role="alert" className={claseErrorCampo}>{errores.edad}</p>}
                    </div>

                    {ficha.especie === "Perro" && (
                      <Pregunta
                        titulo="¿Qué tamaño tendrá de adulto?"
                        ayuda="Si es cachorro, el que estimas que alcanzará."
                        error={errores.tamano}
                      >
                        <SelectorOpciones
                          opciones={OPCIONES_TAMANO}
                          valor={ficha.tamano}
                          onCambio={(v) => responder("tamano", v)}
                          tono="emerald"
                        />
                      </Pregunta>
                    )}
                  </>
                )}

                {paso === 1 && (
                  <>
                    <Pregunta
                      titulo={`¿Cuánto tiempo puede pasar ${nombreVisible} sin compañía?`}
                      ayuda="Piensa en horas seguidas a solas sin angustiarse (llantos, destrozos)."
                      error={errores.tolerancia_soledad}
                    >
                      <SelectorOpciones
                        opciones={OPCIONES_TOLERANCIA_SOLEDAD}
                        valor={ficha.tolerancia_soledad}
                        onCambio={(v) => responder("tolerancia_soledad", v)}
                        tono="emerald"
                      />
                    </Pregunta>
                    <Pregunta titulo="¿Cuánta actividad necesita al día?" error={errores.nivel_energia}>
                      <SelectorOpciones
                        opciones={OPCIONES_ENERGIA[ficha.especie || "Perro"]}
                        valor={ficha.nivel_energia}
                        onCambio={(v) => responder("nivel_energia", v)}
                        tono="emerald"
                      />
                    </Pregunta>
                    <Pregunta titulo="¿Qué espacio necesita como mínimo?" error={errores.espacio_minimo_requerido}>
                      <SelectorOpciones
                        opciones={OPCIONES_ESPACIO_MINIMO}
                        valor={ficha.espacio_minimo_requerido}
                        onCambio={(v) => responder("espacio_minimo_requerido", v)}
                        tono="emerald"
                      />
                    </Pregunta>
                  </>
                )}

                {paso === 2 && (
                  <>
                    <Pregunta titulo="¿Cómo se relaciona con las personas?" error={errores.temperamento}>
                      <SelectorOpciones
                        opciones={OPCIONES_TEMPERAMENTO}
                        valor={ficha.temperamento}
                        onCambio={(v) => responder("temperamento", v)}
                        tono="emerald"
                      />
                    </Pregunta>
                    <Pregunta
                      titulo="¿Para qué tipo de adoptante es adecuada?"
                      error={errores.nivel_experiencia_requerida}
                    >
                      <SelectorOpciones
                        opciones={OPCIONES_EXPERIENCIA_REQUERIDA}
                        valor={ficha.nivel_experiencia_requerida}
                        onCambio={(v) => responder("nivel_experiencia_requerida", v)}
                        tono="emerald"
                      />
                    </Pregunta>
                  </>
                )}

                {paso === 3 && (
                  <>
                    <Pregunta titulo="¿Cómo convive con niños?" error={errores.convivencia_ninos}>
                      <SelectorOpciones
                        opciones={OPCIONES_CONVIVENCIA_NINOS}
                        valor={ficha.convivencia_ninos}
                        onCambio={(v) => responder("convivencia_ninos", v)}
                        tono="emerald"
                      />
                    </Pregunta>
                    <Pregunta titulo="¿Convive bien con perros?" error={errores.convive_perros}>
                      <SelectorOpciones
                        opciones={OPCIONES_CONVIVE}
                        valor={ficha.convive_perros}
                        onCambio={(v) => responder("convive_perros", v)}
                        tono="emerald"
                        columnas={3}
                        compacta
                      />
                    </Pregunta>
                    <Pregunta titulo="¿Y con gatos?" error={errores.convive_gatos}>
                      <SelectorOpciones
                        opciones={OPCIONES_CONVIVE}
                        valor={ficha.convive_gatos}
                        onCambio={(v) => responder("convive_gatos", v)}
                        tono="emerald"
                        columnas={3}
                        compacta
                      />
                    </Pregunta>
                  </>
                )}

                {paso === 4 && (
                  <>
                    <Pregunta titulo="¿Necesita cuidados especiales?" error={errores.nivel_cuidados}>
                      <SelectorOpciones
                        opciones={OPCIONES_NIVEL_CUIDADOS}
                        valor={ficha.nivel_cuidados}
                        onCambio={(v) => responder("nivel_cuidados", v)}
                        tono="emerald"
                      />
                    </Pregunta>

                    {ficha.nivel_cuidados && ficha.nivel_cuidados !== "ninguno" && (
                      <div>
                        <label htmlFor="cuidados" className={claseEtiqueta}>
                          ¿Qué cuidados necesita?
                        </label>
                        <textarea
                          id="cuidados"
                          value={ficha.cuidados_especiales}
                          onChange={(e) => responder("cuidados_especiales", e.target.value)}
                          rows={3}
                          placeholder="Ej: toma un medicamento diario para la tiroides y come alimento renal."
                          className={`${claseCampo} resize-none`}
                        />
                        {errores.cuidados_especiales && (
                          <p role="alert" className={claseErrorCampo}>{errores.cuidados_especiales}</p>
                        )}
                      </div>
                    )}

                    <div className="space-y-4 pt-1">
                      <div>
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                          Ficha de salud
                        </h3>
                        <p className="text-xs font-medium text-slate-500 mt-1">
                          Es informativa: no afecta la compatibilidad, pero da confianza al adoptante.
                        </p>
                      </div>
                      {(
                        [
                          ["esterilizado", "Esterilización"],
                          ["vacunas_al_dia", "Vacunas al día"],
                          ["desparasitado", "Desparasitación"],
                          ["microchip", "Microchip"],
                        ] as const
                      ).map(([campo, titulo]) => (
                        <Pregunta key={campo} titulo={titulo}>
                          <SelectorOpciones
                            opciones={OPCIONES_SALUD}
                            valor={ficha[campo]}
                            onCambio={(v) => responder(campo, v)}
                            tono="emerald"
                            columnas={3}
                            compacta
                          />
                        </Pregunta>
                      ))}
                      <div>
                        <label htmlFor="notas-salud" className={claseEtiqueta}>
                          Otras cosas que el adoptante debería saber
                          <span className="ml-1.5 text-xs font-semibold text-slate-400">(opcional)</span>
                        </label>
                        <textarea
                          id="notas-salud"
                          value={ficha.notas_salud}
                          onChange={(e) => responder("notas_salud", e.target.value)}
                          rows={3}
                          placeholder="Ej: operada de cadera en 2024; le asustan los fuegos artificiales."
                          className={`${claseCampo} resize-none`}
                        />
                      </div>
                    </div>
                  </>
                )}

                {paso === 5 && modoEdicion && (
                  /* Fotos actuales: se marcan para borrar y se eliminan recién
                     al guardar, así el refugio puede arrepentirse. */
                  <div className="space-y-3">
                    <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                      {fotosExistentes.length - fotosAEliminar.length}{" "}
                      {fotosExistentes.length - fotosAEliminar.length === 1 ? "foto" : "fotos"}
                    </span>
                    {fotosExistentes.length === 0 ? (
                      <p className="text-xs font-medium text-slate-500 text-center py-3">Esta mascota no tiene fotos.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2.5">
                        {fotosExistentes.map((f) => {
                          const marcada = fotosAEliminar.includes(f.id);
                          return (
                            <div
                              key={f.id}
                              className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-all ${
                                marcada ? "border-rose-400" : "border-slate-200"
                              }`}
                            >
                              <img
                                src={f.url}
                                alt="Foto mascota"
                                className={`w-full h-full object-cover transition-all ${marcada ? "opacity-30 grayscale" : ""}`}
                              />
                              {f.es_principal && !marcada && (
                                <span className="absolute top-1.5 left-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-600 text-white shadow-xs">
                                  Principal
                                </span>
                              )}
                              {marcada && (
                                <span className="absolute inset-x-0 bottom-1.5 text-center text-[10px] font-black text-rose-700">
                                  Se eliminará
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => alternarEliminarFoto(f.id)}
                                className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full text-white flex items-center justify-center backdrop-blur-xs active:scale-90 transition-all ${
                                  marcada ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-900/70 hover:bg-rose-600"
                                }`}
                                title={marcada ? "Conservar esta foto" : "Eliminar esta foto"}
                                aria-label={marcada ? "Conservar esta foto" : "Eliminar esta foto"}
                              >
                                {marcada ? <Undo2 size={12} /> : <Trash2 size={12} />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {paso === 5 && !modoEdicion && (
                  <div className="space-y-3.5">
                    <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                      {fotos.length} {fotos.length === 1 ? "foto" : "fotos"}
                    </span>

                    {fotos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2.5">
                        {fotos.map((f) => (
                          <div
                            key={f.id}
                            className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-all ${
                              f.esPrincipal
                                ? "border-emerald-500 shadow-sm ring-2 ring-emerald-200/60"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <img src={f.preview} alt="Foto mascota" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => marcarComoPrincipal(f.id)}
                              className={`absolute top-1.5 left-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 backdrop-blur-xs transition-colors ${
                                f.esPrincipal ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-900/60 text-white hover:bg-slate-900"
                              }`}
                              title={f.esPrincipal ? "Foto principal" : "Definir como foto principal"}
                            >
                              {f.esPrincipal ? <Check size={10} strokeWidth={3} /> : <Star size={10} />} Principal
                            </button>
                            <button
                              type="button"
                              onClick={() => quitarFoto(f.id)}
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/70 hover:bg-rose-600 text-white flex items-center justify-center backdrop-blur-xs active:scale-90 transition-all"
                              title="Eliminar foto"
                              aria-label="Eliminar foto"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 rounded-2xl cursor-pointer transition-all group">
                      <div className="flex items-center gap-2 text-slate-600 group-hover:text-emerald-700">
                        {procesandoFotos ? (
                          <>
                            <Spinner />
                            <span className="text-xs font-bold">Ajustando fotos...</span>
                          </>
                        ) : (
                          <>
                            <ImagePlus size={18} strokeWidth={2.2} />
                            <span className="text-xs font-bold">
                              {fotos.length === 0 ? "Seleccionar fotos..." : "+ Agregar más fotos"}
                            </span>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/webp"
                        disabled={procesandoFotos}
                        onChange={manejarCambioFotos}
                        className="hidden"
                      />
                    </label>
                    {errores.foto && <p role="alert" className={claseErrorCampo}>{errores.foto}</p>}
                  </div>
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
                {!modoEdicion && paso < ULTIMO_PASO ? (
                  <button type="button" onClick={siguiente} className={botonPrincipal}>
                    Siguiente
                  </button>
                ) : (
                  <button type="submit" disabled={cargando || procesandoFotos} className={botonPrincipal}>
                    {cargando && <Spinner />}
                    {cargando
                      ? modoEdicion
                        ? "Guardando cambios..."
                        : "Publicando..."
                      : modoEdicion
                        ? "Guardar cambios"
                        : `Publicar a ${nombreVisible}`}
                  </button>
                )}
              </div>

              {modoEdicion && paso < ULTIMO_PASO && (
                <button
                  type="button"
                  onClick={siguiente}
                  className="w-full py-2.5 rounded-2xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
                >
                  Siguiente paso: {PASOS[paso + 1].titulo} →
                </button>
              )}
            </form>
          </>
        )}
      </div>
      {editorFotos}
    </div>
  );
}
