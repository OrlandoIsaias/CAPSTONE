import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerRecomendaciones } from "../api/matching";
import { TarjetaMascota } from "../components/TarjetaMascota";
import { useAuth } from "../context/AuthContext";
import type { Recomendacion } from "../types/matching";
import axios from "axios";

export default function Recomendaciones() {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const [recomendaciones, setRecomendaciones] = useState<Recomendacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerRecomendaciones()
      .then(setRecomendaciones)
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 400) {
          // El backend nos dice que falta el perfil — en vez de dejar al
          // usuario varado leyendo un error, lo mandamos directo al
          // formulario para que lo complete ahora mismo.
          navigate("/perfil-adoptante", { replace: true });
          return;
        }
        setError("No pudimos cargar tus recomendaciones. Intenta de nuevo más tarde.");
      })
      .finally(() => setCargando(false));
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-sm text-[var(--color-primario)] font-medium mb-1">
              Hola, {usuario?.nombre}
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl">
              Tus recomendaciones
            </h1>
          </div>
          <button onClick={cerrarSesion} className="text-sm text-black/50 dark:text-white/50 hover:text-black">
            Cerrar sesión
          </button>
        </div>

        {cargando && <p className="text-black/50 dark:text-white/50">Calculando compatibilidad…</p>}

        {error && <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>}

        {!cargando && !error && recomendaciones.length === 0 && (
          <p className="text-black/60 dark:text-white/60">
            Todavía no hay mascotas disponibles. Vuelve a revisar más tarde.
          </p>
        )}

        <div className="space-y-3">
          {recomendaciones.map((rec) => (
            <TarjetaMascota
              key={rec.mascota_id}
              mascotaId={rec.mascota_id}
              nombre={rec.nombre}
              especie={rec.especie}
              raza={rec.raza}
              score={rec.score_compatibilidad}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
