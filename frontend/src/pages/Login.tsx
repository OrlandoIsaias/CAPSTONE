import { Navigate, NavLink, useParams } from "react-router-dom";
import FormularioLoginAdoptante from "../components/login/FormularioLoginAdoptante";
import FormularioLoginRefugio from "../components/login/FormularioLoginRefugio";
import { useAuth } from "../context/AuthContext";

const PORTALES = [
  { id: "refugio", etiqueta: "Refugio", Formulario: FormularioLoginRefugio },
  { id: "adoptante", etiqueta: "Adoptante", Formulario: FormularioLoginAdoptante },
] as const;

export default function Login() {
  const { portal } = useParams();
  const { usuario, cargando } = useAuth();

  if (!cargando && usuario) {
    return <Navigate to={usuario.rol === "refugio" ? "/inicio" : "/explorar"} replace />;
  }
  if (!PORTALES.some((p) => p.id === portal)) {
    return <Navigate to="/login/refugio" replace />;
  }

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] flex flex-col items-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-[480px] mb-8 flex flex-col items-center justify-center text-center">
        <img
          src="/img/logo.png"
          alt="HouseFound"
          className="w-28 h-28 sm:w-32 sm:h-32 object-contain mb-3 drop-shadow-md transition-transform hover:scale-105 duration-200"
        />
        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-black text-[var(--color-texto)] tracking-tight">
          HouseFound
        </h1>
      </div>

      <div className="w-full max-w-[480px] bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-3xl p-8 sm:p-10 shadow-sm">
        <nav className="grid grid-cols-2 gap-1 p-1 mb-8 rounded-2xl bg-[var(--color-superficie-apagada)]">
          {PORTALES.map((p) => (
            <NavLink
              key={p.id}
              to={`/login/${p.id}`}
              replace
              className={({ isActive }) =>
                `text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-[var(--color-superficie)] text-[var(--color-texto)] shadow-sm"
                    : "text-[var(--color-texto-suave)] hover:text-[var(--color-texto)]"
                }`
              }
            >
              {p.etiqueta}
            </NavLink>
          ))}
        </nav>

        {/* Ambos formularios ocupan la misma celda: la tarjeta toma la altura del
            más alto y no cambia de tamaño al alternar pestañas. */}
        <div className="grid">
          {PORTALES.map(({ id, Formulario }) => {
            const activo = id === portal;
            return (
              <div
                key={id}
                className={`[grid-area:1/1] ${activo ? "" : "invisible"}`}
                inert={!activo}
                aria-hidden={!activo}
              >
                <Formulario />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
