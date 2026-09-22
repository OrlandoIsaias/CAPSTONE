import { useEffect, useState } from "react";
import { listarMascotas } from "../api/mascotas";
import { PantallaAdoptante } from "../components/BarraAdoptante";
import { TarjetaMascota } from "../components/TarjetaMascota";
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
      <h1 className="font-[family-name:var(--font-display)] text-3xl mb-5">Guardados</h1>

      {cargando && <p className="text-[var(--color-texto-suave)] text-sm">Cargando…</p>}
      {error && <p className="text-[var(--color-rojo)] text-sm">{error}</p>}

      {!cargando && !error && guardadas.length === 0 && (
        <div className="rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] p-6 text-center">
          <p className="font-medium">Todavía no guardas ninguna mascota</p>
          <p className="text-sm text-[var(--color-texto-suave)] mt-1">
            Toca el corazón en "Explora mascotas" para guardarla aquí.
          </p>
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
