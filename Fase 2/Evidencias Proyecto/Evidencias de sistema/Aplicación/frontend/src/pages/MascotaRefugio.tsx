import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ImagePlus, ChevronLeft, ChevronRight, Users, Pencil } from "lucide-react";
import { agregarFoto, obtenerMascota } from "../api/mascotas";
import { postulacionesRecibidas } from "../api/postulaciones";
import {
  AvatarIniciales,
  EstadoMascotaBadge,
  EstadoPostulacionBadge,
} from "../components/Badges";
import { PantallaRefugio } from "../components/BarraRefugio";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { useToast } from "../context/ToastContext";
import { useAjusteFotos } from "../hooks/useAjusteFotos";
import { fechaCorta } from "../utils/tiempo";
import { TAMANO_MAXIMO_FOTO_BYTES, TIPOS_FOTO_ACEPTADOS } from "../utils/opcionesMascota";
import type { Mascota } from "../types/mascotas";
import type { Postulacion } from "../types/postulaciones";

const NIVEL: Record<string, string> = { bajo: "Baja", medio: "Media", alto: "Alta" };
const ESPACIO: Record<string, string> = {
  departamento: "Departamento",
  casa_patio: "Casa con patio",
  casa_grande: "Casa grande",
};

export default function MascotaRefugio() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const mostrarToast = useToast();
  const { ajustarFotos, editorFotos } = useAjusteFotos();

  const [mascota, setMascota] = useState<Mascota | null>(null);
  const [postulacionesMascota, setPostulacionesMascota] = useState<Postulacion[]>([]);
  const [fotoActivaIndex, setFotoActivaIndex] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carruselRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  function cargarDatos() {
    if (!id) return;
    const mascotaId = Number(id);
    return Promise.all([
      obtenerMascota(mascotaId)
        .then((m) => {
          setMascota(m);
        })
        .catch(() => setError("No pudimos cargar esta mascota.")),
      postulacionesRecibidas()
        .then((lista) => {
          const deEstaMascota = lista.filter((p) => p.mascota_id === mascotaId);
          setPostulacionesMascota(deEstaMascota);
        })
        .catch(() => setPostulacionesMascota([])),
    ]);
  }

  useEffect(() => {
    cargarDatos()?.finally(() => setCargando(false));
  }, [id]);

  function manejarScroll() {
    if (!carruselRef.current) return;
    const ancho = carruselRef.current.clientWidth;
    if (ancho > 0) {
      const nuevoIndex = Math.round(carruselRef.current.scrollLeft / ancho);
      const fotosCount = mascota?.fotos?.length ?? 0;
      if (nuevoIndex >= 0 && nuevoIndex < fotosCount && nuevoIndex !== fotoActivaIndex) {
        setFotoActivaIndex(nuevoIndex);
      }
    }
  }

  function irAFoto(index: number) {
    setFotoActivaIndex(index);
    if (carruselRef.current) {
      carruselRef.current.scrollTo({
        left: index * carruselRef.current.clientWidth,
        behavior: "smooth",
      });
    }
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (!carruselRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - carruselRef.current.offsetLeft;
    scrollLeftRef.current = carruselRef.current.scrollLeft;
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !carruselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carruselRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    carruselRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const onMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  async function manejarSubirFotos(evento: ChangeEvent<HTMLInputElement>) {
    if (!mascota) return;
    const archivos = Array.from(evento.target.files ?? []);
    evento.target.value = "";
    if (archivos.length === 0) return;

    for (const archivo of archivos) {
      if (!TIPOS_FOTO_ACEPTADOS.includes(archivo.type as (typeof TIPOS_FOTO_ACEPTADOS)[number])) {
        mostrarToast("Solo se aceptan imágenes en formato PNG, JPG o WebP.");
        return;
      }
      if (archivo.size > TAMANO_MAXIMO_FOTO_BYTES) {
        mostrarToast("Cada foto no debe superar los 4 MB.");
        return;
      }
    }

    // El usuario encuadra cada foto antes de subirla
    const recortadas = await ajustarFotos(archivos);
    if (recortadas.length === 0) return;

    setSubiendoFoto(true);
    try {
      const tieneFotos = (mascota.fotos ?? []).length > 0;
      for (let i = 0; i < recortadas.length; i++) {
        const esPrimera = !tieneFotos && i === 0;
        await agregarFoto(
          mascota.id,
          recortadas[i],
          esPrimera,
          (mascota.fotos?.length ?? 0) + i + 1
        );
      }
      mostrarToast(
        recortadas.length === 1
          ? "¡Foto agregada exitosamente!"
          : `¡${recortadas.length} fotos agregadas exitosamente!`
      );
      await cargarDatos();
    } catch {
      mostrarToast("No pudimos subir las fotos. Intenta de nuevo.");
    } finally {
      setSubiendoFoto(false);
    }
  }

  const fotos = mascota?.fotos ?? [];
  const fotoActual = fotos[fotoActivaIndex] ?? fotos[0] ?? null;

  const rasgos = mascota
    ? ([
        mascota.nivel_energia ? `Energía ${NIVEL[mascota.nivel_energia]?.toLowerCase()}` : null,
        mascota.nivel_socializacion
          ? `Socialización ${NIVEL[mascota.nivel_socializacion]?.toLowerCase()}`
          : null,
        mascota.espacio_minimo_requerido ? ESPACIO[mascota.espacio_minimo_requerido] : null,
        mascota.nivel_experiencia_requerida
          ? `Experiencia ${NIVEL[mascota.nivel_experiencia_requerida]?.toLowerCase()}`
          : null,
      ].filter(Boolean) as string[])
    : [];

  return (
    <PantallaRefugio>
      <header className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate("/mis-mascotas")}
          aria-label="Volver a mis mascotas"
          className="w-10 h-10 rounded-full bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-600 hover:text-slate-900 active:scale-90 transition-transform shrink-0"
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900">Perfil de Mascota</h1>
          <p className="text-xs text-slate-500">Gestión y solicitudes de la mascota</p>
        </div>
        {mascota && (
          <button
            onClick={() => navigate(`/mis-mascotas/${mascota.id}/editar`)}
            className="ml-auto shrink-0 flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-3 py-2 rounded-xl active:scale-95 transition-all"
          >
            <Pencil size={13} strokeWidth={2.5} />
            Editar
          </button>
        )}
      </header>

      {cargando && (
        <>
          <Skeleton className="w-full h-56 rounded-3xl mb-4" />
          <Skeleton className="h-7 w-2/5 mb-2" />
          <Skeleton className="h-4 w-1/3 mb-5" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </>
      )}

      {error && <p className="text-rose-600 text-sm font-semibold">{error}</p>}

      {mascota && (
        <div className="space-y-4 pb-8">
          {/* Galería Swipeable de fotos */}
          <div className="space-y-2.5">
            <div className="w-full h-64 rounded-3xl bg-slate-100 overflow-hidden flex items-center justify-center border-2 border-white ring-2 ring-emerald-300/80 shadow-md relative">
              {fotos.length > 0 ? (
                <div
                  ref={carruselRef}
                  onScroll={manejarScroll}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUpOrLeave}
                  onMouseLeave={onMouseUpOrLeave}
                  className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-none touch-pan-x cursor-grab active:cursor-grabbing select-none"
                >
                  {fotos.map((f, i) => (
                    <div
                      key={f.id || f.url || i}
                      className="w-full h-full shrink-0 snap-center relative overflow-hidden flex items-center justify-center bg-slate-900"
                    >
                      <img
                        src={f.url}
                        alt={`${mascota.nombre} - Foto ${i + 1}`}
                        draggable={false}
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-teal-200 flex flex-col items-center justify-center text-emerald-700">
                  <span className="font-[family-name:var(--font-display)] text-6xl font-black">
                    {mascota.nombre.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800/80 mt-1">
                    Sin foto
                  </span>
                </div>
              )}

              {fotoActual?.es_principal && (
                <span className="absolute top-3 left-3 bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs z-10">
                  Foto Principal
                </span>
              )}

              {/* Contador flotante */}
              {fotos.length > 1 && (
                <div className="absolute bottom-3 right-3 bg-slate-950/70 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-xs pointer-events-none z-10">
                  {fotoActivaIndex + 1} / {fotos.length}
                </div>
              )}

              {/* Puntos indicadores */}
              {fotos.length > 1 && (
                <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-none z-10">
                  {fotos.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === fotoActivaIndex ? "w-5 bg-white shadow-xs" : "w-1.5 bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Fila de Miniaturas + Botón Agregar Foto Abajo */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
              {fotos.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => irAFoto(i)}
                  className={`w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all block shrink-0 ${
                    i === fotoActivaIndex
                      ? "border-emerald-500 shadow-sm ring-2 ring-emerald-200 scale-105"
                      : "border-slate-200 opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={f.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}

              {/* Botón miniatura para agregar fotos */}
              <label className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/40 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-600 cursor-pointer shrink-0 transition-all">
                {subiendoFoto ? (
                  <Spinner />
                ) : (
                  <>
                    <ImagePlus size={16} strokeWidth={2.2} />
                    <span className="text-[9px] font-black mt-0.5">+ Foto</span>
                  </>
                )}
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  disabled={subiendoFoto}
                  onChange={manejarSubirFotos}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Información y Datos de la Mascota */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h2 className="text-2xl font-black text-slate-900 truncate">{mascota.nombre}</h2>
              <EstadoMascotaBadge estado={mascota.estado} />
            </div>

            <p className="text-sm font-semibold text-slate-500 mb-4">
              {[
                mascota.raza || mascota.especie,
                mascota.edad != null ? `${mascota.edad} ${mascota.edad === 1 ? "año" : "años"}` : null,
              ]
                .filter(Boolean)
                .join(" • ") || "Sin datos adicionales"}
            </p>

            <div className="flex flex-wrap gap-2">
              {rasgos.map((r) => (
                <span
                  key={r}
                  className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700"
                >
                  {r}
                </span>
              ))}
              {mascota.compatible_ninos && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                  Compatible con niños
                </span>
              )}
              {mascota.compatible_otras_mascotas && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                  Compatible con otras mascotas
                </span>
              )}
            </div>

            {mascota.cuidados_especiales && (
              <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 mt-4">
                <p className="text-xs font-black text-rose-700 uppercase tracking-wider mb-1">
                  Cuidados especiales
                </p>
                <p className="text-xs font-semibold text-slate-800">{mascota.cuidados_especiales}</p>
              </div>
            )}
          </div>

          {/* Sección: Solicitudes para esta Mascota */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <Users size={16} strokeWidth={2.2} />
              </div>
              <h2 className="text-sm font-extrabold text-slate-900 leading-snug">
                Personas interesadas en adoptar a {mascota.nombre}
              </h2>
            </div>

            {postulacionesMascota.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-6 text-center">
                <p className="font-bold text-slate-700 text-xs">
                  Aún no hay solicitudes para {mascota.nombre}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Cuando un adoptante postule por ella, aparecerá aquí listado.
                </p>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {postulacionesMascota.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/solicitudes/${p.id}`)}
                    className="w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/70 hover:bg-emerald-50/40 border border-slate-200/80 hover:border-emerald-300 cursor-pointer active:scale-[0.99] transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <AvatarIniciales nombre={p.adoptante_nombre || "Adoptante"} />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                          {p.adoptante_nombre || `Solicitud #${p.id}`}
                        </p>
                        <p className="text-[11px] font-medium text-slate-400">
                          Recibida el {fechaCorta(p.fecha_postulacion)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <EstadoPostulacionBadge estado={p.estado} />
                      <ChevronRight
                        size={16}
                        className="text-slate-400 group-hover:text-emerald-600 transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {editorFotos}
    </PantallaRefugio>
  );
}
