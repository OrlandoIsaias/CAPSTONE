import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { obtenerMascota } from "../api/mascotas";
import { obtenerScoreIndividual } from "../api/matching";
import { crearPostulacion } from "../api/postulaciones";
import { BotonVolver } from "../components/BotonVolver";
import { SkeletonFila } from "../components/Skeleton";
import type { Mascota } from "../types/mascotas";

function etiqueta(v?: string) {
  if (!v) return "-";
  return v.charAt(0).toUpperCase() + v.slice(1).replace("_", " ");
}

export default function FichaMascota() {
  const { id } = useParams<{ id: string }>();

  const [mascota, setMascota] = useState<Mascota | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [fotoActiva, setFotoActiva] = useState(0);
  const [postulando, setPostulando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const [cargando, setCargando] = useState(true);

  const carruselRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  useEffect(() => {
    if (!id) return;
    const mascotaId = Number(id);

    obtenerMascota(mascotaId)
      .then((m) => {
        setMascota(m);
        setFotoActiva(0);
      })
      .catch(() =>
        setMensaje({ tipo: "error", texto: "No pudimos cargar esta mascota." })
      )
      .finally(() => setCargando(false));

    obtenerScoreIndividual(mascotaId)
      .then((rec) => setScore(rec.score_compatibilidad))
      .catch(() => {
        // Omitir score si no aplica
      });
  }, [id]);

  function manejarScroll() {
    if (!carruselRef.current) return;
    const ancho = carruselRef.current.clientWidth;
    if (ancho > 0) {
      const nuevoIndex = Math.round(carruselRef.current.scrollLeft / ancho);
      const fotosCount = mascota?.fotos?.length ?? 0;
      if (nuevoIndex >= 0 && nuevoIndex < fotosCount && nuevoIndex !== fotoActiva) {
        setFotoActiva(nuevoIndex);
      }
    }
  }

  function irAFoto(index: number) {
    setFotoActiva(index);
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

  async function manejarPostular() {
    if (!mascota) return;
    setPostulando(true);
    setMensaje(null);
    try {
      await crearPostulacion(mascota.id);
      setMensaje({ tipo: "exito", texto: "¡Postulación enviada! El refugio la va a revisar pronto." });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setMensaje({ tipo: "error", texto: "Ya tienes una postulación pendiente para esta mascota." });
      } else if (axios.isAxiosError(err) && err.response?.status === 400) {
        setMensaje({ tipo: "error", texto: "Esta mascota ya no está disponible para postular." });
      } else {
        setMensaje({ tipo: "error", texto: "No pudimos enviar tu postulación. Intenta de nuevo." });
      }
    } finally {
      setPostulando(false);
    }
  }

  /* Estado de carga */
  if (cargando) {
    return (
      <div className="min-h-screen bg-[var(--color-fondo)]">
        <div className="mx-auto w-full max-w-[480px] px-5 pt-6 pb-10">
          <BotonVolver />
          <div className="w-full h-72 rounded-3xl bg-slate-100 mb-6 animate-pulse" />
          <div className="space-y-3">
            <SkeletonFila />
            <SkeletonFila />
          </div>
        </div>
      </div>
    );
  }

  /* Mascota no encontrada */
  if (!mascota) {
    return (
      <div className="min-h-screen bg-[var(--color-fondo)]">
        <div className="mx-auto w-full max-w-[480px] px-5 pt-6 pb-10">
          <BotonVolver />
          <div className="mt-6 rounded-3xl bg-white border border-rose-200 p-8 text-center shadow-xs">
            <p className="font-extrabold text-slate-800 text-base mb-1">No encontramos esta mascota</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Puede que ya no esté disponible o el enlace sea incorrecto.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const fotos = mascota.fotos ?? [];

  const ATRIBUTOS = [
    { etiq: "Nivel de energía", val: etiqueta(mascota.nivel_energia) },
    { etiq: "Socialización", val: etiqueta(mascota.nivel_socializacion) },
    { etiq: "Experiencia req.", val: etiqueta(mascota.nivel_experiencia_requerida) },
    { etiq: "Espacio mínimo", val: etiqueta(mascota.espacio_minimo_requerido) },
    { etiq: "Compatible niños", val: mascota.compatible_ninos ? "Sí" : "No" },
    { etiq: "Otras mascotas", val: mascota.compatible_otras_mascotas ? "Sí" : "No" },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-fondo)]">
      <div className="mx-auto w-full max-w-[480px] px-5 pt-6 pb-24">
        <BotonVolver />

        {/* Galería Swipeable de fotos */}
        <div className="mt-4 mb-6">
          <div className="w-full h-72 rounded-3xl bg-slate-100 overflow-hidden border-2 border-white ring-2 ring-slate-200/80 shadow-md relative">
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
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-100 to-amber-200 text-orange-600">
                <span className="font-[family-name:var(--font-display)] text-6xl font-black">
                  {mascota.nombre.charAt(0).toUpperCase()}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-orange-700/80 mt-1">
                  Sin foto
                </span>
              </div>
            )}

            {/* Score superpuesto */}
            {score !== null && (
              <div className="absolute top-3.5 right-3.5 z-10">
                <span className="bg-emerald-600 text-white font-black text-xs px-2.5 py-1 rounded-full shadow-md">
                  {Math.round(score * 100)}% afinidad
                </span>
              </div>
            )}

            {/* Contador flotante */}
            {fotos.length > 1 && (
              <div className="absolute bottom-3 right-3 bg-slate-950/70 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-xs pointer-events-none z-10">
                {fotoActiva + 1} / {fotos.length}
              </div>
            )}

            {/* Puntos indicadores */}
            {fotos.length > 1 && (
              <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-none z-10">
                {fotos.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === fotoActiva ? "w-5 bg-white shadow-xs" : "w-1.5 bg-white/50"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Miniaturas interactivas */}
          {fotos.length > 1 && (
            <div className="flex gap-2 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
              {fotos.map((f, i) => (
                <button
                  key={f.id || f.url || i}
                  type="button"
                  onClick={() => irAFoto(i)}
                  className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                    i === fotoActiva
                      ? "border-orange-500 shadow-sm ring-2 ring-orange-200 scale-105"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={f.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nombre y subtítulo */}
        <div className="mb-5">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-black text-slate-900 leading-tight">
            {mascota.nombre}
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            {[mascota.especie, mascota.raza].filter(Boolean).join(" • ") || "Sin datos adicionales"}
            {mascota.edad != null && (
              <span className="ml-2 text-orange-600 font-bold">
                • {mascota.edad} {mascota.edad === 1 ? "año" : "años"}
              </span>
            )}
          </p>
        </div>

        {/* Grid de atributos */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs mb-5">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3.5">
            Características
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {ATRIBUTOS.map(({ etiq, val }) => (
              <div key={etiq} className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{etiq}</p>
                <p className="text-xs font-black text-slate-800 mt-0.5">{val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback de postulación */}
        {mensaje && (
          <div
            className={`p-4 rounded-2xl border text-sm font-semibold mb-4 ${
              mensaje.tipo === "exito"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-700"
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        {/* Botón de postulación */}
        {mascota.estado === "disponible" ? (
          <button
            onClick={manejarPostular}
            disabled={postulando || mensaje?.tipo === "exito"}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black py-4 rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all disabled:opacity-60"
          >
            {postulando
              ? "Enviando..."
              : mensaje?.tipo === "exito"
              ? "Postulación enviada"
              : "Postular a esta mascota"}
          </button>
        ) : (
          <div className="w-full text-center py-4 rounded-2xl bg-slate-100 border border-slate-200 text-sm font-semibold text-slate-500">
            Esta mascota ya no está disponible para postular.
          </div>
        )}
      </div>
    </div>
  );
}
