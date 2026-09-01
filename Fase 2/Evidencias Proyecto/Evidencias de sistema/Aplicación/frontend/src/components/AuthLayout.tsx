import type { ReactNode } from "react";

export function AuthLayout({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Panel de marca — visible siempre, ocupa toda la pantalla en mobile
          (arriba, compacto) y la mitad izquierda en escritorio. */}
      <div className="bg-[var(--color-primario)] text-white px-8 py-12 md:w-2/5 md:px-14 md:py-16 flex flex-col justify-between">
        <div>
          <p className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
            HouseFound
          </p>
        </div>
        <div className="mt-10 md:mt-0">
          <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl leading-tight">
            {titulo}
          </h1>
          <p className="mt-4 text-white/80 max-w-xs">{subtitulo}</p>
        </div>
        <p className="hidden md:block text-white/50 text-sm mt-16">
          Cada adopción bien pensada es un regreso menos.
        </p>
      </div>

      {/* Panel del formulario */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 md:px-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
