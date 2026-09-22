import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { obtenerMascota } from "../api/mascotas";
import { postulacionesRecibidas } from "../api/postulaciones";
import { EstadoMascotaBadge } from "../components/Badges";
import { PantallaRefugio } from "../components/BarraRefugio";
import type { Mascota } from "../types/mascotas";

const NIVEL: Record<string, string> = { bajo: "Baja", medio: "Media", alto: "Alta" };
const ESPACIO: Record<string, string> = {
  departamento: "Departamento",
  casa_patio: "Casa con patio",
  casa_grande: "Casa grande",
};

export default function MascotaRefugio() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [mascota, setMascota] = useState<Mascota | null>(null);
  const [solicitudes, setSolicitudes] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const mascotaId = Number(id);
    Promise.all([
      obtenerMascota(mascotaId)
        .then(setMascota)
        .catch(() => setError("No pudimos cargar esta mascota.")),
      postulacionesRecibidas()
        .then((lista) =>
          setSolicitudes(
            lista.filter((p) => p.mascota_id === mascotaId && p.estado === "pendiente").length
          )
        )
        .catch(() => setSolicitudes(0)),
    ]).finally(() => setCargando(false));
  }, [id]);

  const foto = mascota?.fotos.find((f) => f.es_principal) ?? mascota?.fotos[0];

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
          aria-label="Volver"
          className="w-10 h-10 rounded-full bg-[var(--color-superficie-apagada)] flex items-center justify-center shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 5-7 7 7 7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">Perfil de mascota</h1>
      </header>

      {cargando && <p className="text-[var(--color-texto-suave)] text-sm">Cargando…</p>}
      {error && <p className="text-[var(--color-rojo)] text-sm">{error}</p>}

      {mascota && (
        <>
          <div className="w-full h-48 rounded-2xl bg-[var(--color-primario-suave)] overflow-hidden flex items-center justify-center mb-4">
            {foto ? (
              <img src={foto.url} alt={mascota.nombre} className="w-full h-full object-cover" />
            ) : (
              <span className="text-5xl font-bold text-[var(--color-primario)]">
                {mascota.nombre.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 mb-1">
            <h2 className="text-2xl font-bold truncate">{mascota.nombre}</h2>
            <EstadoMascotaBadge estado={mascota.estado} />
          </div>
          <p className="text-[var(--color-texto-suave)] mb-4">
            {[mascota.raza || mascota.especie, mascota.edad != null ? `${mascota.edad} años` : null]
              .filter(Boolean)
              .join(" · ") || "Sin datos adicionales"}
          </p>

          <div className="flex flex-wrap gap-2 mb-5">
            {rasgos.map((r) => (
              <span
                key={r}
                className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-superficie-apagada)]"
              >
                {r}
              </span>
            ))}
            {mascota.compatible_ninos && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-verde-suave)] text-[var(--color-verde)] font-medium">
                ✓ Compatible con niños
              </span>
            )}
            {mascota.compatible_otras_mascotas && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-verde-suave)] text-[var(--color-verde)] font-medium">
                ✓ Compatible con otras mascotas
              </span>
            )}
          </div>

          <div className="rounded-2xl bg-[var(--color-primario-suave)] p-4 flex items-center justify-between mb-5">
            <div>
              <p className="text-sm text-[var(--color-texto-suave)]">Solicitudes activas</p>
              <p className="text-3xl font-bold text-[var(--color-primario)] leading-tight">
                {solicitudes}
              </p>
            </div>
            <button
              onClick={() => navigate("/solicitudes")}
              aria-label="Ver solicitudes"
              className="w-12 h-12 rounded-xl bg-[var(--color-primario)] text-white flex items-center justify-center"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5Z" />
                <path d="M14 3v4.5h4.5" />
              </svg>
            </button>
          </div>

          <button
            onClick={() => navigate("/solicitudes")}
            className="w-full py-3.5 rounded-xl font-semibold bg-[var(--color-primario)] text-white hover:bg-[var(--color-primario-oscuro)] transition-colors"
          >
            Ver solicitudes
          </button>
        </>
      )}
    </PantallaRefugio>
  );
}
