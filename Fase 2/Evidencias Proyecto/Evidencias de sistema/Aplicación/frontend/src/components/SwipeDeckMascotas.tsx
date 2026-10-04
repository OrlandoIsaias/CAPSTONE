import { useState, useRef, useEffect, useCallback } from "react";
import { Heart, X, RotateCcw, Sparkles, Flame, Users, RefreshCw } from "lucide-react";
import { formatearEdad } from "../utils/opcionesMascota";
import { descripcionCorta } from "../utils/descripcion";
import type { Recomendacion } from "../types/matching";

interface Props {
  mascotas: Recomendacion[];
  guardados: number[];
  onAlternarGuardado: (mascotaId: number) => void;
  onVerDetalle: (mascotaId: number) => void;
  onReiniciar?: () => void;
}

interface RegistroHistorial {
  indice: number;
  mascotaId: number;
  accion: "like" | "pass";
  fueGuardadoAntes: boolean;
}

const CLAVE_SESSION_INDICE = "housefound_swipe_indice_actual";
const CLAVE_SESSION_HISTORIAL = "housefound_swipe_historial";
export const CLAVE_SESSION_ORDEN_IDS = "housefound_swipe_orden_ids";

export function SwipeDeckMascotas({
  mascotas,
  guardados,
  onAlternarGuardado,
  onVerDetalle,
  onReiniciar,
}: Props) {
  // 5. Persistencia del índice para volver a la misma mascota tras ver su perfil
  const [indiceActual, setIndiceActual] = useState<number>(() => {
    try {
      const guardado = sessionStorage.getItem(CLAVE_SESSION_INDICE);
      if (guardado !== null) {
        const parsed = parseInt(guardado, 10);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
    } catch {}
    return 0;
  });

  const [historial, setHistorial] = useState<RegistroHistorial[]>(() => {
    try {
      const guardado = sessionStorage.getItem(CLAVE_SESSION_HISTORIAL);
      if (guardado) {
        const parsed = JSON.parse(guardado);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [animatingExit, setAnimatingExit] = useState<"left" | "right" | null>(null);
  const [imgError, setImgError] = useState<Record<number, boolean>>({});

  // 3. Notificación/Animación visual de acción (Guardar / Descartar)
  const [notificacion, setNotificacion] = useState<{
    tipo: "like" | "pass";
    nombre: string;
    id: number;
  } | null>(null);
  const timerNotifRef = useRef<number | null>(null);

  const startPosRef = useRef({ x: 0, y: 0 });
  const isPointerDownRef = useRef(false);
  const topCardRef = useRef<HTMLDivElement | null>(null);

  // Asegurar que el índice no quede fuera de rango
  useEffect(() => {
    if (mascotas.length > 0 && indiceActual > mascotas.length) {
      setIndiceActual(mascotas.length);
    }
  }, [mascotas.length, indiceActual]);

  // Guardar en sessionStorage al cambiar
  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE_SESSION_INDICE, String(indiceActual));
      sessionStorage.setItem(CLAVE_SESSION_HISTORIAL, JSON.stringify(historial));
    } catch {}
  }, [indiceActual, historial]);

  const mascotaActual = mascotas[indiceActual] as Recomendacion | undefined;
  const siguienteMascota = mascotas[indiceActual + 1] as Recomendacion | undefined;
  const esUltima = indiceActual >= mascotas.length;

  const estaGuardado = mascotaActual ? guardados.includes(mascotaActual.mascota_id) : false;

  const mostrarNotificacion = (tipo: "like" | "pass", nombre: string, id: number) => {
    if (timerNotifRef.current) {
      clearTimeout(timerNotifRef.current);
    }
    setNotificacion({ tipo, nombre, id });
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(35);
      } catch {}
    }
    timerNotifRef.current = window.setTimeout(() => {
      setNotificacion(null);
    }, 1200);
  };

  // Acciones de swipe
  const ejecutarSwipe = useCallback(
    (direccion: "left" | "right") => {
      if (!mascotaActual || animatingExit) return;

      const id = mascotaActual.mascota_id;
      const nombre = mascotaActual.nombre;
      const yaGuardado = guardados.includes(id);

      setAnimatingExit(direccion);
      mostrarNotificacion(direccion === "right" ? "like" : "pass", nombre, id);

      if (direccion === "right") {
        if (!yaGuardado) {
          onAlternarGuardado(id);
        }
      }

      setHistorial((prev) => [
        ...prev,
        {
          indice: indiceActual,
          mascotaId: id,
          accion: direccion === "right" ? "like" : "pass",
          fueGuardadoAntes: yaGuardado,
        },
      ]);

      setTimeout(() => {
        setIndiceActual((prev) => prev + 1);
        setDragOffset({ x: 0, y: 0 });
        setAnimatingExit(null);
      }, 230);
    },
    [mascotaActual, animatingExit, guardados, onAlternarGuardado, indiceActual]
  );

  const deshacerUltimo = useCallback(() => {
    if (historial.length === 0 || animatingExit) return;

    const ultimo = historial[historial.length - 1];
    setHistorial((prev) => prev.slice(0, -1));

    // Si le dio a Guardar y antes no estaba guardado, revertir el guardado
    if (ultimo.accion === "like" && !ultimo.fueGuardadoAntes) {
      onAlternarGuardado(ultimo.mascotaId);
    }

    setIndiceActual(ultimo.indice);
    setDragOffset({ x: 0, y: 0 });
    setAnimatingExit(null);
  }, [historial, animatingExit, onAlternarGuardado]);

  // Manejo de teclado (flechas izquierda / derecha para deslizar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "ArrowRight") {
        ejecutarSwipe("right");
      } else if (e.key === "ArrowLeft") {
        ejecutarSwipe("left");
      } else if (e.key === "ArrowUp" && mascotaActual) {
        onVerDetalle(mascotaActual.mascota_id);
      } else if ((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey)) {
        deshacerUltimo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ejecutarSwipe, mascotaActual, onVerDetalle, deshacerUltimo]);

  // Eventos de Touch
  const handleTouchStart = (e: React.TouchEvent) => {
    if (animatingExit) return;
    const touch = e.touches[0];
    startPosRef.current = { x: touch.clientX, y: touch.clientY };
    isPointerDownRef.current = true;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPointerDownRef.current || animatingExit) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startPosRef.current.x;
    const dy = touch.clientY - startPosRef.current.y;
    setDragOffset({ x: dx, y: dy });
  };

  const handleTouchEnd = () => {
    if (!isPointerDownRef.current || animatingExit) return;
    isPointerDownRef.current = false;
    setIsDragging(false);

    if (dragOffset.x > 85) {
      ejecutarSwipe("right");
    } else if (dragOffset.x < -85) {
      ejecutarSwipe("left");
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  // Eventos de Mouse (Desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (animatingExit || e.button !== 0) return;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    isPointerDownRef.current = true;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPointerDownRef.current || animatingExit) return;
    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;
    setDragOffset({ x: dx, y: dy });
  };

  const handleMouseUpOrLeave = () => {
    if (!isPointerDownRef.current || animatingExit) return;
    isPointerDownRef.current = false;
    setIsDragging(false);

    if (dragOffset.x > 85) {
      ejecutarSwipe("right");
    } else if (dragOffset.x < -85) {
      ejecutarSwipe("left");
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  // Cálculo de rotación y opacidades
  const rotacion = animatingExit === "right" ? 22 : animatingExit === "left" ? -22 : dragOffset.x * 0.08;
  const transX = animatingExit === "right" ? 450 : animatingExit === "left" ? -450 : dragOffset.x;
  const transY = animatingExit ? dragOffset.y : dragOffset.y * 0.25;

  const likeOpacity = Math.min(1, Math.max(0, (dragOffset.x - 25) / 60));
  const passOpacity = Math.min(1, Math.max(0, (-dragOffset.x - 25) / 60));

  // Fin del mazo
  if (esUltima) {
    return (
      <div className="w-full max-w-[420px] mx-auto min-h-[460px] bg-white rounded-3xl border border-slate-200/90 shadow-md p-6 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-100 to-teal-100 text-emerald-600 flex items-center justify-center mb-4 shadow-inner">
          <Sparkles size={36} />
        </div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-black text-slate-900 leading-tight">
          ¡Has visto todas tus coincidencias!
        </h2>
        <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
          Ya revisaste a todas las mascotas recomendadas de hoy. Puedes volver a verlas desde el inicio o revisar tus guardadas.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-2.5 w-full max-w-xs">
          <button
            onClick={() => {
              sessionStorage.removeItem(CLAVE_SESSION_INDICE);
              sessionStorage.removeItem(CLAVE_SESSION_HISTORIAL);
              sessionStorage.removeItem(CLAVE_SESSION_ORDEN_IDS);
              setIndiceActual(0);
              setHistorial([]);
              if (onReiniciar) onReiniciar();
            }}
            className="flex-1 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xs"
          >
            <RefreshCw size={15} />
            Volver a empezar
          </button>
          {historial.length > 0 && (
            <button
              onClick={deshacerUltimo}
              className="py-3 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <RotateCcw size={14} />
              Deshacer último
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[420px] mx-auto select-none relative touch-none overflow-hidden">
      {/* 3. Notificación flotante animada al dar Guardar o Descartar (centrada estrictamente en la tarjeta) */}
      {notificacion && (
        <div className="absolute top-14 inset-x-0 flex justify-center z-50 pointer-events-none px-4">
          <div
            key={notificacion.id + notificacion.tipo}
            className={`px-4 py-2 rounded-2xl shadow-xl border flex items-center gap-2.5 max-w-[92%] backdrop-blur-md transition-all ${
              notificacion.tipo === "like"
                ? "bg-emerald-600/95 border-emerald-400 text-white shadow-emerald-950/40"
                : "bg-slate-900/95 border-slate-700 text-white shadow-slate-950/40"
            }`}
          >
            {notificacion.tipo === "like" ? (
              <>
                <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Heart size={16} className="fill-white text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black leading-tight truncate">¡Guardaste a {notificacion.nombre}!</p>
                  <p className="text-[10px] text-emerald-100 font-medium leading-tight">Añadido a tus guardados</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-7 h-7 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <X size={16} strokeWidth={2.8} className="text-rose-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-tight truncate">Pasaste a {notificacion.nombre}</p>
                  <p className="text-[10px] text-slate-300 font-medium leading-tight">Siguiente recomendación</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Contenedor de la pila de cartas */}
      <div
        className="relative w-full h-[490px] sm:h-[515px] rounded-3xl overflow-hidden touch-none select-none overscroll-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        {/* Carta del fondo (Peek siguiente) */}
        {siguienteMascota && (
          <div
            className="absolute inset-0 rounded-3xl overflow-hidden shadow-sm border border-slate-200/80 bg-slate-900 pointer-events-none transition-transform duration-300"
            style={{
              transform: "scale(0.94) translateY(16px)",
              opacity: 0.75,
              zIndex: 10,
            }}
          >
            {siguienteMascota.url_foto && !imgError[siguienteMascota.mascota_id] ? (
              <img
                src={siguienteMascota.url_foto}
                alt={siguienteMascota.nombre}
                className="w-full h-full object-cover opacity-80"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white">
                <span className="font-[family-name:var(--font-display)] text-5xl font-black">
                  {siguienteMascota.nombre.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent p-5 flex flex-col justify-end text-white">
              <h3 className="text-xl font-black text-white/90">
                {siguienteMascota.nombre}
              </h3>
            </div>
          </div>
        )}

        {/* Carta Principal Interactiva */}
        {mascotaActual && (
          <div
            ref={topCardRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            className={`absolute inset-0 rounded-3xl overflow-hidden shadow-xl border border-slate-200/90 bg-slate-950 cursor-grab active:cursor-grabbing z-20 touch-none select-none ${
              isDragging ? "" : "transition-transform duration-300 ease-out"
            }`}
            style={{
              transform: `translate3d(${transX}px, ${transY}px, 0) rotate(${rotacion}deg)`,
              opacity: animatingExit ? 0.2 : 1,
            }}
          >
            {/* Foto de fondo */}
            <div className="absolute inset-0 bg-slate-900">
              {mascotaActual.url_foto && !imgError[mascotaActual.mascota_id] ? (
                <img
                  src={mascotaActual.url_foto}
                  alt={mascotaActual.nombre}
                  onError={() =>
                    setImgError((prev) => ({ ...prev, [mascotaActual.mascota_id]: true }))
                  }
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-500 via-amber-600 to-rose-600 flex flex-col items-center justify-center text-white p-6 text-center">
                  <span className="font-[family-name:var(--font-display)] text-7xl font-black mb-2">
                    {mascotaActual.nombre.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                    {mascotaActual.especie} en adopción
                  </span>
                </div>
              )}
            </div>

            {/* Sello Dinámico: GUARDAR (Verde/Emerald) */}
            <div
              className="absolute top-6 left-6 border-4 border-emerald-400 text-emerald-400 font-[family-name:var(--font-display)] font-black text-2xl uppercase tracking-wider px-3.5 py-1 rounded-2xl rotate-[-16deg] pointer-events-none z-30 shadow-lg bg-emerald-950/60 backdrop-blur-xs transition-opacity duration-100"
              style={{ opacity: likeOpacity > 0 ? likeOpacity : animatingExit === "right" ? 1 : 0 }}
            >
              GUARDAR ❤️
            </div>

            {/* Sello Dinámico: PASAR (Rojo/Rose) */}
            <div
              className="absolute top-6 right-6 border-4 border-rose-400 text-rose-400 font-[family-name:var(--font-display)] font-black text-2xl uppercase tracking-wider px-3.5 py-1 rounded-2xl rotate-[16deg] pointer-events-none z-30 shadow-lg bg-rose-950/60 backdrop-blur-xs transition-opacity duration-100"
              style={{ opacity: passOpacity > 0 ? passOpacity : animatingExit === "left" ? 1 : 0 }}
            >
              PASAR ✕
            </div>

            {/* Badges superiores fijos en la carta */}
            <div className="absolute top-4 inset-x-4 flex items-center justify-between z-25 pointer-events-none">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-white font-black text-xs shadow-md">
                <Sparkles size={13} />
                <span>{Math.round(mascotaActual.score_compatibilidad * 100)}% afinidad</span>
              </div>

              {estaGuardado && (
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-500 text-white font-bold text-xs shadow-md">
                  <Heart size={12} fill="currentColor" />
                  <span>En Guardados</span>
                </div>
              )}
            </div>

            {/* Resumen e información inferior con degradado */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-transparent flex flex-col justify-end p-5 text-white z-20 pointer-events-none">
              <div className="space-y-1.5 pointer-events-auto">
                {/* Nombre y Edad */}
                <div className="flex items-baseline gap-2">
                  <h2 className="font-[family-name:var(--font-display)] text-3xl font-black text-white leading-tight drop-shadow-sm">
                    {mascotaActual.nombre}
                  </h2>
                  <span className="text-xl font-bold text-slate-300">
                    {mascotaActual.edad != null ? formatearEdad(mascotaActual.edad) : ""}
                  </span>
                </div>

                {/* Especie, raza y sexo */}
                <p className="text-xs font-semibold text-slate-300">
                  {[
                    mascotaActual.especie,
                    mascotaActual.raza,
                    mascotaActual.sexo === "hembra" ? "Hembra" : mascotaActual.sexo === "macho" ? "Macho" : null,
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </p>

                {/* Pequeño resumen de personalidad */}
                <div className="pt-1">
                  <p className="text-xs font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 px-3 py-1.5 rounded-xl inline-block shadow-2xs">
                    ✨ {descripcionCorta(mascotaActual)}
                  </p>
                </div>

                {/* Tags de compatibilidad rápida */}
                <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-semibold text-slate-200">
                  {mascotaActual.convivencia_ninos === "todos" && (
                    <span className="bg-white/15 px-2.5 py-0.5 rounded-lg backdrop-blur-xs flex items-center gap-1">
                      <Users size={11} /> Con niños
                    </span>
                  )}
                  {mascotaActual.convive_perros === true && (
                    <span className="bg-white/15 px-2.5 py-0.5 rounded-lg backdrop-blur-xs">
                      Acepta perros
                    </span>
                  )}
                  {mascotaActual.convive_gatos === true && (
                    <span className="bg-white/15 px-2.5 py-0.5 rounded-lg backdrop-blur-xs">
                      Acepta gatos
                    </span>
                  )}
                  {mascotaActual.nivel_energia && (
                    <span className="bg-white/15 px-2.5 py-0.5 rounded-lg backdrop-blur-xs flex items-center gap-1">
                      <Flame size={11} className="text-amber-400" />
                      Energía {mascotaActual.nivel_energia}
                    </span>
                  )}
                </div>

                {/* 5. Botón directo a la ficha completa */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onVerDetalle(mascotaActual.mascota_id);
                    }}
                    className="text-xs font-black text-amber-300 hover:text-amber-200 flex items-center gap-1 hover:underline active:scale-95 transition-transform"
                  >
                    Conocer más sobre {mascotaActual.nombre} →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Botonera centrada: [ Pasar ] [ Retroceder ] [ Guardar ] */}
      <div className="flex items-center justify-center gap-5 mt-5">
        {/* Pasar (Izquierda) */}
        <button
          onClick={() => ejecutarSwipe("left")}
          disabled={!mascotaActual || !!animatingExit}
          aria-label="Pasar al siguiente"
          title="Pasar (Flecha izquierda)"
          className="w-14 h-14 rounded-full bg-white text-rose-500 border-2 border-rose-200 hover:border-rose-400 hover:bg-rose-50 shadow-md flex items-center justify-center transition-all active:scale-90"
        >
          <X size={26} strokeWidth={2.8} />
        </button>

        {/* Retroceder / Deshacer (Al Medio) */}
        <button
          onClick={deshacerUltimo}
          disabled={historial.length === 0 || !!animatingExit}
          aria-label="Retroceder a la mascota anterior"
          title="Retroceder (Z)"
          className={`w-12 h-12 rounded-full flex items-center justify-center border shadow-xs transition-all active:scale-90 ${
            historial.length === 0 || !!animatingExit
              ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed"
              : "bg-white text-amber-500 border-amber-200 hover:bg-amber-50 hover:border-amber-300"
          }`}
        >
          <RotateCcw size={19} strokeWidth={2.4} />
        </button>

        {/* Guardar (Derecha) */}
        <button
          onClick={() => ejecutarSwipe("right")}
          disabled={!mascotaActual || !!animatingExit}
          aria-label="Guardar"
          title="Guardar (Flecha derecha)"
          className="w-14 h-14 rounded-full bg-white text-emerald-500 border-2 border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 shadow-md flex items-center justify-center transition-all active:scale-90"
        >
          <Heart size={26} strokeWidth={2.6} className="fill-emerald-500" />
        </button>
      </div>

      {/* Indicador de ayuda */}
      <div className="mt-3 text-center">
        <p className="text-[11px] font-medium text-slate-400">
          ← Desliza a la <span className="text-rose-500 font-bold">izquierda</span> para pasar • Desliza a la{" "}
          <span className="text-emerald-600 font-bold">derecha</span> para guardar →
        </p>
      </div>
    </div>
  );
}
