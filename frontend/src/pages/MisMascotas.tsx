import { useAuth } from "../context/AuthContext";

export default function MisMascotas() {
  const { usuario, cerrarSesion } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-sm text-[var(--color-primario)] font-medium mb-1">
              Hola, {usuario?.nombre}
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl">Tus mascotas</h1>
          </div>
          <button onClick={cerrarSesion} className="text-sm text-black/50 hover:text-black">
            Cerrar sesión
          </button>
        </div>
        <p className="text-black/60">
          Esta pantalla se conecta a <code>GET /mascotas</code> y{" "}
          <code>POST /mascotas</code> — la construimos en el siguiente paso.
        </p>
      </div>
    </div>
  );
}
