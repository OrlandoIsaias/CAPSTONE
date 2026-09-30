import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { ImagePlus, Trash2, Check, Star, Undo2 } from "lucide-react";
import {
  actualizarMascota,
  agregarFoto,
  crearMascota,
  eliminarFoto,
  obtenerMascota,
} from "../api/mascotas";
import { BotonVolver } from "../components/BotonVolver";
import { CargandoVista, Spinner } from "../components/Spinner";
import { useToast } from "../context/ToastContext";
import { useAjusteFotos } from "../hooks/useAjusteFotos";
import { leerArchivoComoDataUrl } from "../utils/imagen";
import {
  EDAD_OPCIONES,
  ESPECIES,
  RAZAS_POR_ESPECIE,
  REGEX_SOLO_LETRAS,
  TAMANO_MAXIMO_FOTO_BYTES,
  TIPOS_FOTO_ACEPTADOS,
  type EspecieMascota,
} from "../utils/opcionesMascota";
import type {
  EspacioMinimo,
  FotoMascota,
  MascotaInput,
  NivelEnergiaSocializacion,
} from "../types/mascotas";

type Errores = Partial<
  Record<"nombre" | "especie" | "raza" | "edad" | "foto" | "cuidadosEspeciales", string>
>;

interface FotoItem {
  id: string;
  archivo: File;
  preview: string;
  esPrincipal: boolean;
}

/* La misma pantalla sirve para publicar (/mascota/nueva) y para editar
   (/mis-mascotas/:id/editar). Al editar, las fotos existentes solo se pueden
   quitar (se borran al guardar); agregarlas sigue siendo desde el perfil de
   la mascota (MascotaRefugio). */
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

  const [nombre, setNombre] = useState("");
  const [especie, setEspecie] = useState<EspecieMascota | "">("");
  const [raza, setRaza] = useState("");
  const [edad, setEdad] = useState<number | "">("");
  const [nivelEnergia, setNivelEnergia] = useState<NivelEnergiaSocializacion>("medio");
  const [nivelSocializacion, setNivelSocializacion] = useState<NivelEnergiaSocializacion>("medio");
  const [compatibleNinos, setCompatibleNinos] = useState(true);
  const [compatibleOtras, setCompatibleOtras] = useState(true);
  const [experienciaRequerida, setExperienciaRequerida] = useState<NivelEnergiaSocializacion>("bajo");
  const [espacioMinimo, setEspacioMinimo] = useState<EspacioMinimo>("departamento");

  const [tieneCuidadosEspeciales, setTieneCuidadosEspeciales] = useState(false);
  const [cuidadosEspeciales, setCuidadosEspeciales] = useState("");

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
        setNombre(m.nombre);
        // Si la especie guardada no está en el catálogo, queda vacía y la
        // validación obliga a elegir una antes de guardar.
        const especieCatalogo = ESPECIES.find(
          (e) => e.toLowerCase() === (m.especie ?? "").toLowerCase()
        );
        setEspecie(especieCatalogo ?? "");
        setRaza(especieCatalogo ? m.raza ?? "" : "");
        setEdad(m.edad ?? "");
        setNivelEnergia(m.nivel_energia ?? "medio");
        setNivelSocializacion(m.nivel_socializacion ?? "medio");
        // Un valor vacío (null) puntúa igual que "sí" en el motor de matching
        // (beneficio de la duda), así que marcarlo no cambia el score.
        setCompatibleNinos(m.compatible_ninos ?? true);
        setCompatibleOtras(m.compatible_otras_mascotas ?? true);
        setExperienciaRequerida(m.nivel_experiencia_requerida ?? "bajo");
        setEspacioMinimo(m.espacio_minimo_requerido ?? "departamento");
        setTieneCuidadosEspeciales(Boolean(m.cuidados_especiales));
        setCuidadosEspeciales(m.cuidados_especiales ?? "");
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
  const razasCatalogo = especie ? RAZAS_POR_ESPECIE[especie] : [];
  const razasDisponibles =
    raza && !razasCatalogo.includes(raza) ? [...razasCatalogo, raza] : razasCatalogo;
  const edadOpciones =
    edad !== "" && !EDAD_OPCIONES.some((o) => o.valor === edad)
      ? [...EDAD_OPCIONES, { valor: edad, etiqueta: `${edad} años` }]
      : EDAD_OPCIONES;

  function manejarCambioEspecie(valor: string) {
    setEspecie(valor as EspecieMascota);
    setRaza("");
    setErrores((prev) => ({ ...prev, especie: undefined, raza: undefined }));
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

      // El usuario encuadra cada foto en formato cuadrado (1:1)
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

  function quitarFoto(id: string) {
    setFotos((prev) => {
      const filtradas = prev.filter((f) => f.id !== id);
      if (filtradas.length > 0 && !filtradas.some((f) => f.esPrincipal)) {
        filtradas[0].esPrincipal = true;
      }
      return filtradas;
    });
  }

  function marcarComoPrincipal(id: string) {
    setFotos((prev) =>
      prev.map((f) => ({
        ...f,
        esPrincipal: f.id === id,
      }))
    );
  }

  function alternarEliminarFoto(fotoId: number) {
    setFotosAEliminar((prev) =>
      prev.includes(fotoId) ? prev.filter((idFoto) => idFoto !== fotoId) : [...prev, fotoId]
    );
  }

  function validar(): boolean {
    const nuevosErrores: Errores = {};
    if (!REGEX_SOLO_LETRAS.test(nombre.trim())) {
      nuevosErrores.nombre = "Solo letras, mínimo 2 caracteres, sin números ni símbolos.";
    }
    if (!especie) {
      nuevosErrores.especie = "Elige la especie de la mascota.";
    }
    if (!raza) {
      nuevosErrores.raza = "Elige la raza de la mascota.";
    }
    if (edad === "") {
      nuevosErrores.edad = "Elige la edad aproximada de la mascota.";
    }
    if (tieneCuidadosEspeciales && !cuidadosEspeciales.trim()) {
      nuevosErrores.cuidadosEspeciales =
        "Describe qué cuidados especiales necesita (o desmarca la casilla si no los requiere).";
    }
    setErrores(nuevosErrores);
    return Object.values(nuevosErrores).every((v) => !v);
  }

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();
    setError(null);

    if (!validar()) return;

    setCargando(true);
    try {
      const payload: MascotaInput = {
        nombre: nombre.trim(),
        especie: especie as EspecieMascota,
        raza,
        edad: edad as number,
        nivel_energia: nivelEnergia,
        nivel_socializacion: nivelSocializacion,
        compatible_ninos: compatibleNinos,
        compatible_otras_mascotas: compatibleOtras,
        nivel_experiencia_requerida: experienciaRequerida,
        espacio_minimo_requerido: espacioMinimo,
        cuidados_especiales: tieneCuidadosEspeciales ? cuidadosEspeciales.trim() : undefined,
      };

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
      if (fotos.length > 0) {
        for (let i = 0; i < fotos.length; i++) {
          const f = fotos[i];
          await agregarFoto(mascotaCreada.id, f.archivo, f.esPrincipal, i + 1);
        }
      }

      mostrarToast("¡Mascota publicada con éxito!");
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

  const claseCampo =
    "w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all";
  const claseEtiqueta = "block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5";
  const claseErrorCampo = "text-xs font-semibold text-rose-600 mt-1";

  return (
    <div className="min-h-screen bg-[var(--color-fondo)]">
      <div className="mx-auto w-full max-w-[480px] px-5 pt-6 pb-20">
        <BotonVolver />
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-black text-slate-900 mt-2 mb-6 leading-tight">
          {modoEdicion ? "Editar Mascota" : "Publicar Mascota"}
        </h1>

        {cargandoMascota && <CargandoVista mensaje="Cargando datos de la mascota…" />}

        {errorCarga && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
            {errorCarga}
          </div>
        )}

        {!cargandoMascota && !errorCarga && (
        <form onSubmit={manejarEnvio} className="space-y-4">
          {/* Fotos actuales (solo al editar): se marcan para borrar y se
              eliminan recién al guardar, así el refugio puede arrepentirse. */}
          {modoEdicion && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Fotos de la Mascota
                  </h2>
                  <p className="text-[11px] font-medium text-slate-400">
                    Las fotos marcadas se eliminan al guardar los cambios.
                  </p>
                </div>
                <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                  {fotosExistentes.length - fotosAEliminar.length}{" "}
                  {fotosExistentes.length - fotosAEliminar.length === 1 ? "foto" : "fotos"}
                </span>
              </div>

              {fotosExistentes.length === 0 ? (
                <p className="text-xs font-medium text-slate-500 text-center py-3">
                  Esta mascota no tiene fotos.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2.5 pt-1">
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
                          className={`w-full h-full object-cover transition-all ${
                            marcada ? "opacity-30 grayscale" : ""
                          }`}
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
                            marcada
                              ? "bg-emerald-600 hover:bg-emerald-700"
                              : "bg-slate-900/70 hover:bg-rose-600"
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

              <p className="text-[11px] font-medium text-slate-400">
                Para agregar fotos, usa el botón "+ Foto" en el perfil de la mascota.
              </p>
            </div>
          )}

          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Datos Básicos
            </h2>

            <div>
              <label className={claseEtiqueta}>Nombre</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Max, Luna..."
                className={claseCampo}
              />
              {errores.nombre && <p className={claseErrorCampo}>{errores.nombre}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={claseEtiqueta}>Especie</label>
                <select
                  value={especie}
                  onChange={(e) => manejarCambioEspecie(e.target.value)}
                  className={claseCampo}
                >
                  <option value="">Selecciona...</option>
                  {ESPECIES.map((esp) => (
                    <option key={esp} value={esp}>
                      {esp}
                    </option>
                  ))}
                </select>
                {errores.especie && <p className={claseErrorCampo}>{errores.especie}</p>}
              </div>
              <div>
                <label className={claseEtiqueta}>Raza</label>
                <select
                  value={raza}
                  onChange={(e) => setRaza(e.target.value)}
                  disabled={!especie}
                  className={claseCampo}
                >
                  <option value="">{especie ? "Selecciona..." : "Elige la especie primero"}</option>
                  {razasDisponibles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {errores.raza && <p className={claseErrorCampo}>{errores.raza}</p>}
              </div>
            </div>

            <div>
              <label className={claseEtiqueta}>Edad</label>
              <select
                value={edad}
                onChange={(e) => setEdad(e.target.value === "" ? "" : Number(e.target.value))}
                className={claseCampo}
              >
                <option value="">Selecciona...</option>
                {edadOpciones.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.etiqueta}
                  </option>
                ))}
              </select>
              {errores.edad && <p className={claseErrorCampo}>{errores.edad}</p>}
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Comportamiento y Requisitos
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={claseEtiqueta}>Nivel de energía</label>
                <select
                  value={nivelEnergia}
                  onChange={(e) => setNivelEnergia(e.target.value as NivelEnergiaSocializacion)}
                  className={claseCampo}
                >
                  <option value="bajo">Bajo</option>
                  <option value="medio">Medio</option>
                  <option value="alto">Alto</option>
                </select>
              </div>
              <div>
                <label className={claseEtiqueta}>Socialización</label>
                <select
                  value={nivelSocializacion}
                  onChange={(e) => setNivelSocializacion(e.target.value as NivelEnergiaSocializacion)}
                  className={claseCampo}
                >
                  <option value="bajo">Bajo</option>
                  <option value="medio">Medio</option>
                  <option value="alto">Alto</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={claseEtiqueta}>Experiencia requerida</label>
                <select
                  value={experienciaRequerida}
                  onChange={(e) => setExperienciaRequerida(e.target.value as NivelEnergiaSocializacion)}
                  className={claseCampo}
                >
                  <option value="bajo">Bajo</option>
                  <option value="medio">Medio</option>
                  <option value="alto">Alto</option>
                </select>
              </div>
              <div>
                <label className={claseEtiqueta}>Espacio requerido</label>
                <select
                  value={espacioMinimo}
                  onChange={(e) => setEspacioMinimo(e.target.value as EspacioMinimo)}
                  className={claseCampo}
                >
                  <option value="departamento">Departamento</option>
                  <option value="casa_patio">Casa con patio</option>
                  <option value="casa_grande">Casa grande</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={compatibleNinos}
                  onChange={(e) => setCompatibleNinos(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                />
                <span className="text-xs font-bold text-slate-700">Con niños</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={compatibleOtras}
                  onChange={(e) => setCompatibleOtras(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                />
                <span className="text-xs font-bold text-slate-700">Otras mascotas</span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={tieneCuidadosEspeciales}
                  onChange={(e) => {
                    const marcado = e.target.checked;
                    setTieneCuidadosEspeciales(marcado);
                    if (!marcado) {
                      setCuidadosEspeciales("");
                      setErrores((prev) => ({ ...prev, cuidadosEspeciales: undefined }));
                    }
                  }}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                />
                <span className="text-xs font-bold text-slate-700">Cuidados especiales</span>
              </label>

              {tieneCuidadosEspeciales && (
                <div className="mt-2.5">
                  <textarea
                    value={cuidadosEspeciales}
                    onChange={(e) => setCuidadosEspeciales(e.target.value)}
                    rows={3}
                    placeholder="Ej: toma medicamento diario, alergias, dieta especial..."
                    className={`${claseCampo} resize-none`}
                  />
                  {errores.cuidadosEspeciales && (
                    <p className={claseErrorCampo}>{errores.cuidadosEspeciales}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sección Fotos Múltiples (solo al publicar) */}
          {!modoEdicion && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Fotos de la Mascota
                </h2>
                <p className="text-[11px] font-medium text-slate-400">
                  Al elegir cada foto podrás encuadrarla en formato cuadrado (1:1).
                </p>
              </div>
              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                {fotos.length} {fotos.length === 1 ? "foto" : "fotos"}
              </span>
            </div>

            {/* Grid de fotos seleccionadas */}
            {fotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {fotos.map((f) => (
                  <div
                    key={f.id}
                    className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-all group ${
                      f.esPrincipal
                        ? "border-emerald-500 shadow-sm ring-2 ring-emerald-200/60"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <img src={f.preview} alt="Foto mascota" className="w-full h-full object-cover" />

                    {/* Botón Principal */}
                    <button
                      type="button"
                      onClick={() => marcarComoPrincipal(f.id)}
                      className={`absolute top-1.5 left-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 backdrop-blur-xs transition-colors ${
                        f.esPrincipal
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-900/60 text-white hover:bg-slate-900"
                      }`}
                      title={f.esPrincipal ? "Foto principal" : "Definir como foto principal"}
                    >
                      {f.esPrincipal ? (
                        <>
                          <Check size={10} strokeWidth={3} /> Principal
                        </>
                      ) : (
                        <>
                          <Star size={10} /> Principal
                        </>
                      )}
                    </button>

                    {/* Botón Quitar */}
                    <button
                      type="button"
                      onClick={() => quitarFoto(f.id)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/70 hover:bg-rose-600 text-white flex items-center justify-center backdrop-blur-xs active:scale-90 transition-all"
                      title="Eliminar foto"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input para agregar fotos */}
            <div>
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
            </div>
            {errores.foto && <p className={claseErrorCampo}>{errores.foto}</p>}
          </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando || procesandoFotos}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black py-4 rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-60"
          >
            {cargando && <Spinner />}
            {cargando
              ? modoEdicion
                ? "Guardando cambios..."
                : "Publicando mascota..."
              : modoEdicion
                ? "Guardar Cambios"
                : "Publicar Mascota"}
          </button>
        </form>
        )}
      </div>
      {editorFotos}
    </div>
  );
}
