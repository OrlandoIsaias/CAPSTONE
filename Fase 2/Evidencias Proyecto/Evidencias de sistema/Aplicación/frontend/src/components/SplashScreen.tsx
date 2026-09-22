import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [animationStarted, setAnimationStarted] = useState(false);
  const [ocultar, setOcultar] = useState(false);

  useEffect(() => {
    // 1. Inicia la animación tras 500ms
    const timerAnimacion = setTimeout(() => {
      setAnimationStarted(true);
    }, 500);

    // 2. Oculta el componente al terminar la animación (1.5s)
    const timerOcultar = setTimeout(() => {
      setOcultar(true);
      if (onFinish) onFinish();
    }, 1500);

    return () => {
      clearTimeout(timerAnimacion);
      clearTimeout(timerOcultar);
    };
  }, [onFinish]);

  if (ocultar) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-transparent">
      {/* Contenido (Logo y eslogan): se desvanece suavemente al abrir las puertas */}
      <div
        className={`z-30 text-center transform pointer-events-none transition-all duration-300 ease-out ${
          animationStarted ? 'opacity-0 scale-95' : 'opacity-100 scale-90'
        }`}
      >
        <h1 className="mb-2 text-4xl sm:text-5xl font-extrabold tracking-wide">
          <span className="text-[#E06228]">HOUSE</span>
          <span className="text-black">FOUND</span>
        </h1>
        <p className="text-sm sm:text-base font-medium text-gray-600">
          Un hogar para cada mascota
        </p>
      </div>

      {/* Panel Superior: mismo fondo crema que el Login (#FAF8F5) */}
      <div
        className={`fixed inset-x-0 top-0 h-1/2 bg-[#FAF8F5] z-20 ${
          animationStarted ? 'animate-abrir-arriba' : ''
        }`}
      />

      {/* Panel Inferior: mismo fondo crema que el Login (#FAF8F5) */}
      <div
        className={`fixed inset-x-0 bottom-0 h-1/2 bg-[#FAF8F5] z-20 ${
          animationStarted ? 'animate-abrir-abajo' : ''
        }`}
      />
    </div>
  );
};

export default SplashScreen;