import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { obtenerMascota } from "../api/mascotas";
import { obtenerScoreIndividual } from "../api/matching";
import { crearPostulacion } from "../api/postulaciones";
import { InsigniaScore } from "../components/InsigniaScore";
import type { Mascota } from "../types/mascotas";

const ETIQUETAS: Record<string, string> = {
  bajo: "Bajo",
  medio: "Medio",
  alto: "Alto",
  departamento: "Departamento",
  casa_patio: "Casa con patio",
  casa_grande: "Casa grande",
};

function etiqueta(valor?: string) {
  if (!valor) return "No especificado";
  return ETIQUETAS[valor] ?? valor;
}

export default function FichaMascota() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [mascota, setMascota] = useState<Mascota | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [postulando, setPostulando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    const mascotaId = Number(id);

    obtenerMascota(mascotaId)
      .then(setMascota)
      .catch(() => setMensaje({ tipo: "error", texto: "No pudimos cargar esta mascota." }))
      .finally(() => setCargando(false));

    obtenerScoreIndividual(mascotaId)
      .then((rec) => setScore(rec.score_compatibilidad))
      .catch(() => {
        // Si falla (ej. el usuario es refugio, o no tiene perfil), simplemente no mostramos el score.
      });
  }, [id]);

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

  if (cargando) {
    return <div className="min-h-screen bg-[var(--color-fondo)] px-6 py-10">Cargando…</div>;
  }

  if (!mascota) {
    return (
      <div className="min-h-screen bg-[var(--color-fondo)] px-6 py-10">
        <p className="text-red-700 dark:text-red-400">No encontramos esta mascota.</p>
      </div>
    );
  }

  const fotoPrincipal = mascota.fotos.find((f) => f.es_principal) ?? mascota.fotos[0];

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] px-6 py-10">
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-black/50 dark:text-white/50 hover:text-black mb-6"
        >
          ← Volver
        </button>

        <div className="w-full h-64 rounded-lg bg-[var(--color-primario)]/10 mb-6 overflow-hidden flex items-center justify-center">
          {fotoPrincipal ? (
            <img src={fotoPrincipal.url} alt={mascota.nombre} className="w-full h-full object-cover" />
          ) : (
            <span className="font-[family-name:var(--font-display)] text-6xl text-[var(--color-primario)]">
              {mascota.nombre.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex items-start justify-between mb-2">
          <h1 className="font-[family-name:var(--font-display)] text-3xl">{mascota.nombre}</h1>
          {score !== null && <InsigniaScore score={score} />}
        </div>
        <p className="text-black/60 dark:text-white/60 mb-6">
          {[mascota.especie, mascota.raza].filter(Boolean).join(" · ") || "Sin datos adicionales"}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8 bg-[var(--color-superficie)] rounded-lg border border-[var(--color-borde)] p-4 text-sm">
          <div>
            <p className="text-black/50 dark:text-white/50">Nivel de energía</p>
            <p className="font-medium">{etiqueta(mascota.nivel_energia)}</p>
          </div>
          <div>
            <p className="text-black/50 dark:text-white/50">Socialización</p>
            <p className="font-medium">{etiqueta(mascota.nivel_socializacion)}</p>
          </div>
          <div>
            <p className="text-black/50 dark:text-white/50">Experiencia requerida</p>
            <p className="font-medium">{etiqueta(mascota.nivel_experiencia_requerida)}</p>
          </div>
          <div>
            <p className="text-black/50 dark:text-white/50">Espacio mínimo</p>
            <p className="font-medium">{etiqueta(mascota.espacio_minimo_requerido)}</p>
          </div>
          <div>
            <p className="text-black/50 dark:text-white/50">Compatible con niños</p>
            <p className="font-medium">{mascota.compatible_ninos ? "Sí" : "No"}</p>
          </div>
          <div>
            <p className="text-black/50 dark:text-white/50">Compatible con otras mascotas</p>
            <p className="font-medium">{mascota.compatible_otras_mascotas ? "Sí" : "No"}</p>
          </div>
        </div>

        {mensaje && (
          <p className={`text-sm mb-4 ${mensaje.tipo === "exito" ? "text-[var(--color-primario)]" : "text-red-700 dark:text-red-400"}`}>
            {mensaje.texto}
          </p>
        )}

        {mascota.estado === "disponible" ? (
          <button
            onClick={manejarPostular}
            disabled={postulando || mensaje?.tipo === "exito"}
            className="w-full bg-[var(--color-acento)] text-[var(--color-texto)] font-semibold py-3 rounded-md hover:brightness-95 transition disabled:opacity-60"
          >
            {postulando ? "Enviando…" : mensaje?.tipo === "exito" ? "Postulación enviada" : "Postular a esta mascota"}
          </button>
        ) : (
          <p className="text-center text-black/50 dark:text-white/50 text-sm py-3">
            Esta mascota ya no está disponible para postular.
          </p>
        )}
      </div>
    </div>
  );
}
