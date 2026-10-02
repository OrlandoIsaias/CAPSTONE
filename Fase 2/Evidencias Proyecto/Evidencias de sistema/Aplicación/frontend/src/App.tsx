import { lazy, Suspense, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ConfirmProvider } from "./components/ConfirmDialog";
import { RutaProtegida } from "./components/RutaProtegida";
import SplashScreen from "./components/SplashScreen";
import { CargandoVista } from "./components/Spinner";
import { ToastProvider } from "./components/Toast";
import Login from "./pages/Login";

// El login es la primera pantalla, así que va incluido desde el inicio. El
// resto se descarga recién cuando se visita (code splitting): quien entra a
// iniciar sesión no baja el código de las otras pantallas.
const DetalleSolicitud = lazy(() => import("./pages/DetalleSolicitud"));
const EditarPerfilAdoptante = lazy(() => import("./pages/EditarPerfilAdoptante"));
const EditarPerfilRefugio = lazy(() => import("./pages/EditarPerfilRefugio"));
const ExplorarMascotas = lazy(() => import("./pages/ExplorarMascotas"));
const FichaMascota = lazy(() => import("./pages/FichaMascota"));
const Guardados = lazy(() => import("./pages/Guardados"));
const InicioRefugio = lazy(() => import("./pages/InicioRefugio"));
const MascotaRefugio = lazy(() => import("./pages/MascotaRefugio"));
const MisMascotas = lazy(() => import("./pages/MisMascotas"));
const MisSolicitudes = lazy(() => import("./pages/MisSolicitudes"));
const PerfilAdoptante = lazy(() => import("./pages/PerfilAdoptante"));
const PerfilRefugio = lazy(() => import("./pages/PerfilRefugio"));
const PublicarMascota = lazy(() => import("./pages/PublicarMascota"));
const Recomendaciones = lazy(() => import("./pages/Recomendaciones"));
const Registro = lazy(() => import("./pages/Registro"));
const Solicitudes = lazy(() => import("./pages/Solicitudes"));

const CLAVE_SPLASH_VISTO = "housefound_splash_visto";

function App() {
  // sessionStorage (no localStorage): la animación de bienvenida se ve una
  // vez por sesión del navegador, no en cada recarga de la página — pero
  // sigue apareciendo si cierras la pestaña/el navegador y vuelves después,
  // que es cuando sí tiene sentido mostrarla de nuevo.
  const [mostrarSplash, setMostrarSplash] = useState(
    () => sessionStorage.getItem(CLAVE_SPLASH_VISTO) !== "1"
  );

  function ocultarSplash() {
    sessionStorage.setItem(CLAVE_SPLASH_VISTO, "1");
    setMostrarSplash(false);
  }

  return (
    <ToastProvider>
      <ConfirmProvider>
        {mostrarSplash && <SplashScreen onFinish={ocultarSplash} />}

        <Suspense fallback={<CargandoVista />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/login" element={<Navigate to="/login/adoptante" replace />} />
          <Route path="/login/:portal" element={<Login />} />

          {/* Flujo adoptante */}
          <Route
            path="/explorar"
            element={
              <RutaProtegida rolRequerido="adoptante">
                <ExplorarMascotas />
              </RutaProtegida>
            }
          />
          <Route
            path="/perfil-adoptante"
            element={
              <RutaProtegida rolRequerido="adoptante">
                <PerfilAdoptante />
              </RutaProtegida>
            }
          />
          <Route
            path="/perfil-adoptante/editar"
            element={
              <RutaProtegida rolRequerido="adoptante" permitirSinCuestionario>
                <EditarPerfilAdoptante />
              </RutaProtegida>
            }
          />
          <Route
            path="/recomendaciones"
            element={
              <RutaProtegida rolRequerido="adoptante">
                <Recomendaciones />
              </RutaProtegida>
            }
          />
          <Route
            path="/guardados"
            element={
              <RutaProtegida rolRequerido="adoptante">
                <Guardados />
              </RutaProtegida>
            }
          />
          <Route
            path="/mis-solicitudes"
            element={
              <RutaProtegida rolRequerido="adoptante">
                <MisSolicitudes />
              </RutaProtegida>
            }
          />
          <Route
            path="/mascota/:id"
            element={
              <RutaProtegida rolRequerido="adoptante">
                <FichaMascota />
              </RutaProtegida>
            }
          />

          {/* Flujo refugio */}
          <Route
            path="/inicio"
            element={
              <RutaProtegida rolRequerido="refugio">
                <InicioRefugio />
              </RutaProtegida>
            }
          />
          <Route
            path="/perfil-refugio"
            element={
              <RutaProtegida rolRequerido="refugio">
                <PerfilRefugio />
              </RutaProtegida>
            }
          />
          <Route
            path="/perfil-refugio/editar"
            element={
              <RutaProtegida rolRequerido="refugio">
                <EditarPerfilRefugio />
              </RutaProtegida>
            }
          />
          <Route
            path="/mis-mascotas"
            element={
              <RutaProtegida rolRequerido="refugio">
                <MisMascotas />
              </RutaProtegida>
            }
          />
          <Route
            path="/mascota/nueva"
            element={
              <RutaProtegida rolRequerido="refugio">
                <PublicarMascota />
              </RutaProtegida>
            }
          />
          <Route
            path="/mis-mascotas/:id"
            element={
              <RutaProtegida rolRequerido="refugio">
                <MascotaRefugio />
              </RutaProtegida>
            }
          />
          <Route
            path="/mis-mascotas/:id/editar"
            element={
              <RutaProtegida rolRequerido="refugio">
                <PublicarMascota />
              </RutaProtegida>
            }
          />
          <Route
            path="/solicitudes"
            element={
              <RutaProtegida rolRequerido="refugio">
                <Solicitudes />
              </RutaProtegida>
            }
          />
          <Route
            path="/solicitudes/:id"
            element={
              <RutaProtegida rolRequerido="refugio">
                <DetalleSolicitud />
              </RutaProtegida>
            }
          />
          <Route path="/cuestionarios" element={<Navigate to="/solicitudes" replace />} />
          <Route path="/postulaciones" element={<Navigate to="/solicitudes" replace />} />
        </Routes>
        </Suspense>
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;