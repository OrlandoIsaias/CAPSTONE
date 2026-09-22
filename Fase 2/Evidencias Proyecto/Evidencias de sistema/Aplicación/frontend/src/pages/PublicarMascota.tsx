import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { agregarFoto, crearMascota } from "../api/mascotas";
import { BotonVolver } from "../components/BotonVolver";
import { Spinner } from "../components/Spinner";
import { useToast } from "../context/ToastContext";
import {
  EDAD_OPCIONES,
  ESPECIES,
  RAZAS_POR_ESPECIE,
  REGEX_SOLO_LETRAS,
  TAMANO_MAXIMO_FOTO_BYTES,
  TIPOS_FOTO_ACEPTADOS,
  type EspecieMascota,
} from "../utils/opcionesMascota";
import type { EspacioMinimo, MascotaInput, NivelEnergiaSocializacion } from "../types/mascotas";

type Errores = Partial<
  Record<"nombre" | "especie" | "raza" | "edad" | "foto" | "cuidadosEspeciales", string>
>;

function leerArchivoComoDataUrl(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result as string);
    lector.onerror = () => reject(lector.error);
    lector.readAsDataURL(archivo);
  });
}

export default function PublicarMascota() {
  const navigate = useNavigate();
  const mostrarToast = useToast();

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

  const [fotoArchivo, setFotoArchivo] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  const [errores, setErrores] = useState<Errores>({});
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const razasDisponibles = especie ? RAZAS_POR_ESPECIE[especie] : [];

  function manejarCambioEspecie(valor: string) {
    setEspecie(valor as EspecieMascota);
    // La raza pertenece a la especie anterior — no tiene sentido conservarla.
    setRaza("");
    setErrores((prev) => ({ ...prev, especie: undefined, raza: undefined }));
  }

  async function manejarCambioFoto(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = ""; // permite re-seleccionar el mismo archivo si lo corrige
    if (!archivo) return;

    if (!TIPOS_FOTO_ACEPTADOS.includes(archivo.type as (typeof TIPOS_FOTO_ACEPTADOS)[number])) {
      setErrores((prev) => ({ ...prev, foto: "Solo se aceptan imágenes en formato PNG o JPEG." }));
      setFotoArchivo(null);
      setFotoPreview(null);
      return;
    }
    if (archivo.size > TAMANO_MAXIMO_FOTO_BYTES) {
      setErrores((prev) => ({ ...prev, foto: "La imagen no puede pesar más de 4 MB." }));
      setFotoArchivo(null);
      setFotoPreview(null);
      return;
    }

    setErrores((prev) => ({ ...prev, foto: undefined }));
    setFotoArchivo(archivo);
    setFotoPreview(await leerArchivoComoDataUrl(archivo));
  }

  function quitarFoto() {
    setFotoArchivo(null);
    setFotoPreview(null);
    setErrores((prev) => ({ ...prev, foto: undefined }));
  }

  function validar(): boolean {
    const nuevosErrores: Errores = {};

    if (!REGEX_SOLO_LETRAS.test(nombre.trim())) {
      nuevosErrores.nombre = "Ingresa solo letras (mínimo 2 caracteres), sin números ni símbolos.";
    }
    if (!especie) {
      nuevosErrores.especie = "Selecciona una especie.";
    }
    if (!raza) {
      nuevosErrores.raza = "Selecciona una raza.";
    }
    if (edad === "") {
      nuevosErrores.edad = "Selecciona la edad de la mascota.";
    }
    if (tieneCuidadosEspeciales && !cuidadosEspeciales.trim()) {
      nuevosErrores.cuidadosEspeciales = "Describe brevemente el cuidado especial, o desmarca la casilla.";
    }
    // El archivo ya se valida al elegirlo (manejarCambioFoto); si quedó un
    // error pendiente ahí, no dejamos avanzar el envío.
    if (errores.foto) {
      nuevosErrores.foto = errores.foto;
    }

    setErrores(nuevosErrores);
    return Object.values(nuevosErrores).every((v) => !v);
  }

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();
    setError(null);

    if (!validar()) return;

    setCargando(true);
    const datos: MascotaInput = {
      nombre: nombre.trim(),
      especie: especie || undefined,
      raza: raza || undefined,
      edad: edad === "" ? undefined : edad,
      nivel_energia: nivelEnergia,
      nivel_socializacion: nivelSocializacion,
      compatible_ninos: compatibleNinos,
      compatible_otras_mascotas: compatibleOtras,
      nivel_experiencia_requerida: experienciaRequerida,
      espacio_minimo_requerido: espacioMinimo,
      cuidados_especiales: tieneCuidadosEspeciales ? cuidadosEspeciales.trim() : undefined,
    };

    try {
      const mascota = await crearMascota(datos);
      if (fotoPreview) {
        // Si algo falla al agregar la foto, no bloqueamos la publicación
        // de la mascota — ya quedó creada, la foto se puede agregar después.
        await agregarFoto(mascota.id, fotoPreview).catch(() => {});
      }
      mostrarToast(`¡${mascota.nombre} fue publicado! 🐾`);
      navigate("/mis-mascotas");
    } catch {
      setError("No pudimos publicar la mascota. Revisa los datos e intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  const claseCampo =
    "w-full rounded-md border border-[var(--color-borde)] px-3 py-2.5 text-sm bg-[var(--color-superficie)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)] disabled:opacity-50 disabled:cursor-not-allowed";
  const claseEtiqueta = "block text-sm font-medium mb-1.5";
  const claseErrorCampo = "text-xs text-[var(--color-rojo)] mt-1";

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] px-6 pt-20 pb-10">
      <BotonVolver />
      <div className="max-w-lg mx-auto">
        <h1 className="font-[family-name:var(--font-display)] text-3xl mb-2">
          Publicar una mascota
        </h1>
        <p className="text-[var(--color-texto-suave)] mb-8">
          Completa su ficha para que el sistema pueda calcular su compatibilidad con adoptantes.
        </p>

        <form onSubmit={manejarEnvio} className="space-y-4" noValidate>
          <div>
            <label className={claseEtiqueta}>Nombre</label>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Luna, Max, Michi…"
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
                <option value="">Selecciona…</option>
                {ESPECIES.map((e) => (
                  <option key={e} value={e}>
                    {e}
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
                <option value="">{especie ? "Selecciona…" : "Elige la especie primero"}</option>
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
              <option value="">Selecciona…</option>
              {EDAD_OPCIONES.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
            {errores.edad && <p className={claseErrorCampo}>{errores.edad}</p>}
          </div>

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

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={compatibleNinos}
                onChange={(e) => setCompatibleNinos(e.target.checked)}
                className="accent-[var(--color-primario)]"
              />
              Compatible con niños
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={compatibleOtras}
                onChange={(e) => setCompatibleOtras(e.target.checked)}
                className="accent-[var(--color-primario)]"
              />
              Compatible con otras mascotas
            </label>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={tieneCuidadosEspeciales}
                onChange={(e) => {
                  const marcado = e.target.checked;
                  setTieneCuidadosEspeciales(marcado);
                  if (!marcado) {
                    // Si se desmarca, el texto ya no aplica — se limpia junto
                    // con cualquier error pendiente de ese campo.
                    setCuidadosEspeciales("");
                    setErrores((prev) => ({ ...prev, cuidadosEspeciales: undefined }));
                  }
                }}
                className="accent-[var(--color-primario)]"
              />
              Cuidados especiales
            </label>

            {tieneCuidadosEspeciales && (
              <div className="mt-2">
                <textarea
                  value={cuidadosEspeciales}
                  onChange={(e) => setCuidadosEspeciales(e.target.value)}
                  rows={3}
                  placeholder="Ej: toma medicamento diario, es alérgico a…, necesita dieta especial…"
                  className={`${claseCampo} resize-none`}
                />
                {errores.cuidadosEspeciales && (
                  <p className={claseErrorCampo}>{errores.cuidadosEspeciales}</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className={claseEtiqueta}>
              Foto <span className="text-[var(--color-texto-suave)] font-normal">(opcional, PNG o JPEG, máx. 4 MB)</span>
            </label>

            {fotoPreview ? (
              <div className="flex items-center gap-3">
                <img
                  src={fotoPreview}
                  alt="Vista previa"
                  className="w-16 h-16 rounded-md object-cover border border-[var(--color-borde)]"
                />
                <div className="flex-1 min-w-0 text-sm truncate">{fotoArchivo?.name}</div>
                <button
                  type="button"
                  onClick={quitarFoto}
                  className="text-sm font-medium text-[var(--color-rojo)]"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={manejarCambioFoto}
                className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-primario-suave)] file:text-[var(--color-primario)] file:font-semibold file:px-3 file:py-2 file:cursor-pointer"
              />
            )}
            {errores.foto && <p className={claseErrorCampo}>{errores.foto}</p>}
          </div>

          {error && <p className="text-sm text-[var(--color-rojo)]">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full flex items-center justify-center gap-2 bg-[var(--color-primario)] text-white font-semibold py-2.5 rounded-md hover:bg-[var(--color-primario-oscuro)] active:scale-[0.98] transition-transform disabled:opacity-60 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2"
          >
            {cargando && <Spinner />}
            {cargando ? "Publicando…" : "Publicar mascota"}
          </button>
        </form>
      </div>
    </div>
  );
}
