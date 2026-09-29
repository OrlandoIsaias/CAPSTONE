import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarMascotas } from "../api/mascotas";
import { PantallaAdoptante } from "../components/BarraAdoptante";
import { TarjetaMascota } from "../components/TarjetaMascota";
import { SkeletonFila } from "../components/Skeleton";
import { descripcionCorta } from "../utils/descripcion";
import { useGuardados } from "../utils/guardados";
import type { Mascota } from "../types/mascotas";

export default function Guardados() {
  const { ids: guardados, alternar } = useGuardados();
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarMascotas()
      .then(setMascotas)
      .catch(() => setError("No pudimos cargar tus mascotas guardadas."))
      .finally(() => setCargando(false));
  }, []);

  const guardadas = mascotas.filter((m) => guardados.includes(m.id));

  return (
    <PantallaAdoptante>
      {/* Encabezado */}
      <header className="mb-5">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-black text-slate-900 leading-tight">
          Mascotas guardadas
        </h1>
        <p className="text-xs font-medium text-slate-500 mt-1">
          Tus candidatos favoritos guardados para postular cuando estés listo.
        </p>
      </header>

      {cargando && (
        <div className="space-y-3">
          <SkeletonFila />
          <SkeletonFila />
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium mb-4">
          {error}
        </div>
      )}

      {!cargando && !error && (
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            {guardadas.length} {guardadas.length === 1 ? "mascota guardada" : "mascotas guardadas"}
          </p>
          {guardadas.length > 0 && (
            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/60">
              Favoritos
            </span>
          )}
        </div>
      )}

      {!cargando && !error && guardadas.length === 0 && (
        <div className="rounded-3xl bg-white border border-slate-200/90 p-8 text-center shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center text-3xl mb-3 shadow-2xs border border-rose-100">
            💖
          </div>
          <h2 className="font-extrabold text-slate-800 text-base mb-1">
            Todavía no tienes favoritos guardados
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto mb-5 leading-relaxed">
            Explora los perfiles de mascotas y presiona el corazón para guardarlas en tu lista personalizada.
          </p>
          <Link
            to="/explorar"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs shadow-sm hover:shadow-md active:scale-95 transition-all"
          >
            Explorar Mascotas 🐾
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {guardadas.map((m) => {
          const foto = m.fotos.find((f) => f.es_principal) ?? m.fotos[0];
          return (
            <TarjetaMascota
              key={m.id}
              mascotaId={m.id}
              nombre={m.nombre}
              especie={m.especie}
              raza={m.raza}
              edad={m.edad}
              urlFoto={foto?.url}
              descripcion={descripcionCorta(m)}
              guardado
              onAlternarGuardado={alternar}
            />
          );
        })}
      </div>
    </PantallaAdoptante>
  );
}
