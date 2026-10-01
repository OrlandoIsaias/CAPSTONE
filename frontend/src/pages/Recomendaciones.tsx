import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerRecomendaciones } from "../api/matching";
import { PantallaAdoptante } from "../components/BarraAdoptante";
import { TarjetaMascota } from "../components/TarjetaMascota";
import { CargandoVista } from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import { descripcionCorta } from "../utils/descripcion";
import { useGuardados } from "../utils/guardados";
import type { Recomendacion } from "../types/matching";
import axios from "axios";

export default function Recomendaciones() {
  const { usuario } = useAuth();
  const { ids: guardados, alternar } = useGuardados();
  const navigate = useNavigate();
  const [recomendaciones, setRecomendaciones] = useState<Recomendacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // AbortController: en desarrollo, StrictMode monta este efecto dos
    // veces a propósito (para detectar efectos no idempotentes) — sin
    // cancelar la primera petición, ambas llegan a golpear la base de
    // datos real. Al abortar en el cleanup, la primera nunca llega a
    // completarse y solo la segunda cuenta.
    const controlador = new AbortController();

    // El backend ya incluye todo lo que necesita esta pantalla (foto, edad,
    // rasgos para la descripción) — no hace falta un segundo pedido con el
    // listado completo de mascotas.
    obtenerRecomendaciones(controlador.signal)
      .then(setRecomendaciones)
      .catch((err) => {
        if (axios.isCancel(err)) return;
        if (axios.isAxiosError(err) && err.response?.status === 400) {
          // El backend nos dice que falta el perfil — en vez de dejar al
          // usuario varado leyendo un error, lo mandamos directo al
          // formulario para que lo complete ahora mismo.
          navigate("/perfil-adoptante", { replace: true });
          return;
        }
        setError("No pudimos cargar tus recomendaciones. Intenta de nuevo más tarde.");
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false);
      });

    return () => controlador.abort();
  }, [navigate]);

  const grupos = agrupar(recomendaciones);

  return (
    <PantallaAdoptante>
      <header className="mb-5">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-black text-slate-900 leading-tight">
          Tus recomendaciones
        </h1>
        <p className="text-xs font-medium text-slate-500 mt-1">
          Priorizadas especialmente para <span className="font-bold text-slate-700">{usuario?.nombre}</span>
        </p>
      </header>

      {cargando && <CargandoVista mensaje="Buscando tus coincidencias…" />}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium mb-4">
          {error}
        </div>
      )}

      {!cargando && !error && recomendaciones.length === 0 && (
        <div className="rounded-3xl bg-white border border-slate-200 p-8 text-center shadow-xs">
          <p className="font-extrabold text-slate-800 text-base">
            Por ahora no encontramos mascotas compatibles
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Los refugios publican mascotas nuevas seguido. Mientras tanto, en Explorar puedes verlas todas y por qué algunas no calzan con tu hogar.
          </p>
          <button
            onClick={() => navigate("/explorar")}
            className="mt-4 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs"
          >
            Ir a Explorar
          </button>
        </div>
      )}

      {/* El backend ya las ordena: primero las que cumplen las preferencias
          (tamaño, edad, sexo) y después por %. Se separan en dos grupos para
          que se entienda por qué una de 85% puede quedar bajo una de 73%. */}
      {grupos.map((grupo) => (
        <section key={grupo.titulo ?? "todas"} className="mb-5">
          {grupo.titulo && (
            <div className="mb-2.5 px-0.5">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{grupo.titulo}</h2>
              {grupo.detalle && <p className="text-[11px] font-medium text-slate-500 mt-0.5">{grupo.detalle}</p>}
            </div>
          )}
          <div className="space-y-3">
            {grupo.mascotas.map((rec) => (
              <TarjetaMascota
                key={rec.mascota_id}
                mascotaId={rec.mascota_id}
                nombre={rec.nombre}
                especie={rec.especie}
                raza={rec.raza}
                edad={rec.edad}
                urlFoto={rec.url_foto}
                score={rec.score_compatibilidad}
                descripcion={descripcionCorta(rec)}
                guardado={guardados.includes(rec.mascota_id)}
                onAlternarGuardado={alternar}
              />
            ))}
          </div>
        </section>
      ))}
    </PantallaAdoptante>
  );
}

function agrupar(recomendaciones: Recomendacion[]) {
  const coinciden = recomendaciones.filter((r) => r.discrepancias_preferencias.length === 0);
  const otras = recomendaciones.filter((r) => r.discrepancias_preferencias.length > 0);
  if (coinciden.length === 0 || otras.length === 0) {
    return [{ titulo: null, detalle: null, mascotas: recomendaciones }];
  }
  return [
    { titulo: "Coinciden con lo que buscas", detalle: null, mascotas: coinciden },
    {
      titulo: "También compatibles contigo",
      detalle: "No calzan con alguna de tus preferencias de tamaño, edad o sexo, pero se llevarían bien con tu hogar.",
      mascotas: otras,
    },
  ];
}
