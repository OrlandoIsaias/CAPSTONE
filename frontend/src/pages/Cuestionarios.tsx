import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { detallePostulacion, postulacionesRecibidas } from "../api/postulaciones";
import { AvatarIniciales } from "../components/Badges";
import { PantallaRefugio } from "../components/BarraRefugio";
import type { PostulacionDetalle } from "../types/postulaciones";

const ESPACIO: Record<string, string> = {
  departamento: "Departamento",
  casa_patio: "Casa con patio",
  casa_grande: "Casa grande",
};

const EXPERIENCIA: Record<string, string> = {
  ninguna: "Sin experiencia",
  basica: "Experiencia básica",
  alta: "Mucha experiencia",
};

export default function Cuestionarios() {
  const navigate = useNavigate();
  const [fichas, setFichas] = useState<PostulacionDetalle[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    postulacionesRecibidas()
      .then(async (lista) => {
        // Un mismo adoptante puede postular a varias mascotas: su cuestionario
        // es uno solo, así que nos quedamos con su postulación más reciente.
        const porAdoptante = new Map<number, number>();
        for (const p of lista) {
          if (!porAdoptante.has(p.adoptante_id)) porAdoptante.set(p.adoptante_id, p.id);
        }
        const detalles = await Promise.all(
          [...porAdoptante.values()].map((id) => detallePostulacion(id).catch(() => null))
        );
        setFichas(detalles.filter((d): d is PostulacionDetalle => d !== null));
      })
      .catch(() => setError("No pudimos cargar los cuestionarios."))
      .finally(() => setCargando(false));
  }, []);

  return (
    <PantallaRefugio>
      <h1 className="text-2xl font-bold mb-1">Cuestionarios</h1>
      <p className="text-sm text-[var(--color-texto-suave)] mb-5">
        El estilo de vida que declaró cada persona que postuló a tus mascotas.
      </p>

      {cargando && <p className="text-[var(--color-texto-suave)] text-sm">Cargando…</p>}
      {error && <p className="text-[var(--color-rojo)] text-sm">{error}</p>}

      {!cargando && !error && fichas.length === 0 && (
        <div className="rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] p-6 text-center">
          <p className="font-medium">Todavía no hay cuestionarios</p>
          <p className="text-sm text-[var(--color-texto-suave)] mt-1">
            Cada persona que postula responde uno antes de poder hacerlo.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {fichas.map((f) => {
          const nombre = f.adoptante_nombre ?? `Adoptante #${f.adoptante_id}`;
          const rasgos = [
            f.espacio_disponible ? ESPACIO[f.espacio_disponible] : null,
            f.experiencia_previa ? EXPERIENCIA[f.experiencia_previa] : null,
            f.tiempo_disponible_horas_dia != null ? `${f.tiempo_disponible_horas_dia} h/día` : null,
            f.tiene_ninos ? "Con niños" : null,
            f.otras_mascotas ? "Con otras mascotas" : null,
          ].filter(Boolean) as string[];

          return (
            <button
              key={f.id}
              onClick={() => navigate(`/solicitudes/${f.id}`)}
              className="w-full text-left bg-[var(--color-superficie)] rounded-2xl border border-[var(--color-borde)] p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <AvatarIniciales nombre={nombre} />
                <div className="min-w-0">
                  <p className="font-bold truncate">{nombre}</p>
                  <p className="text-sm text-[var(--color-texto-suave)] truncate">
                    Postuló a {f.mascota_nombre}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {rasgos.map((r) => (
                  <span
                    key={r}
                    className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-superficie-apagada)] text-[var(--color-texto)]"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </PantallaRefugio>
  );
}
