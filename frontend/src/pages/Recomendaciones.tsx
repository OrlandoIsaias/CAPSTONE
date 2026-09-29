import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerRecomendaciones } from "../api/matching";
import { listarMascotas } from "../api/mascotas";
import { PantallaAdoptante } from "../components/BarraAdoptante";
import { TarjetaMascota } from "../components/TarjetaMascota";
import { SkeletonFila } from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import { descripcionCorta } from "../utils/descripcion";
import { useGuardados } from "../utils/guardados";
import type { Recomendacion } from "../types/matching";
import type { Mascota } from "../types/mascotas";
import axios from "axios";

export default function Recomendaciones() {
  const { usuario, cerrarSesion } = useAuth();
  const { ids: guardados, alternar } = useGuardados();
  const navigate = useNavigate();
  const [recomendaciones, setRecomendaciones] = useState<Recomendacion[]>([]);
  const [mascotasMap, setMascotasMap] = useState<Map<number, Mascota>>(new Map());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      obtenerRecomendaciones(),
      listarMascotas().catch(() => [] as Mascota[]),
    ])
      .then(([recs, listadoMascotas]) => {
        setRecomendaciones(recs);
        const map = new Map<number, Mascota>();
        for (const m of listadoMascotas) {
          map.set(m.id, m);
        }
        setMascotasMap(map);
      })
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
    <PantallaAdoptante>
      <div className="flex justify-between items-start mb-5">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-black text-slate-900 leading-tight">
            Tus recomendaciones
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Priorizadas especialmente para <span className="font-bold text-slate-700">{usuario?.nombre}</span>
          </p>
        </div>
        <button
          onClick={cerrarSesion}
          className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shadow-2xs"
        >
          Salir
        </button>
      </div>

      {cargando && (
        <div className="space-y-3">
          <SkeletonFila />
          <SkeletonFila />
          <SkeletonFila />
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium mb-4">
          {error}
        </div>
      )}

      {!cargando && !error && recomendaciones.length === 0 && (
        <div className="rounded-3xl bg-white border border-slate-200 p-8 text-center shadow-xs">
          <span className="text-4xl block mb-2">🐾</span>
          <p className="font-extrabold text-slate-800 text-base">
            Todavía no hay mascotas disponibles
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Vuelve a revisar más tarde para ver nuevas sugerencias de compatibilidad.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {recomendaciones.map((rec) => {
          const mascota = mascotasMap.get(rec.mascota_id);
          const fotoObj = mascota?.fotos.find((f) => f.es_principal) ?? mascota?.fotos[0];
          const urlFoto = rec.url_foto || fotoObj?.url;
          const edad = rec.edad ?? mascota?.edad;
          const descripcion = mascota ? descripcionCorta(mascota) : undefined;

          return (
            <TarjetaMascota
              key={rec.mascota_id}
              mascotaId={rec.mascota_id}
              nombre={rec.nombre}
              especie={rec.especie}
              raza={rec.raza}
              edad={edad}
              urlFoto={urlFoto}
              score={rec.score_compatibilidad}
              descripcion={descripcion}
              guardado={guardados.includes(rec.mascota_id)}
              onAlternarGuardado={alternar}
            />
          );
        })}
      </div>
    </PantallaAdoptante>
  );
}
