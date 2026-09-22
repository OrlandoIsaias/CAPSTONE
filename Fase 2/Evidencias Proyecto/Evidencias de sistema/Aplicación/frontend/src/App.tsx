import { Navigate, Route, Routes } from "react-router-dom";
import { ConfirmProvider } from "./components/ConfirmDialog";
import { RutaProtegida } from "./components/RutaProtegida";
import { ToastProvider } from "./components/Toast";
import Cuestionarios from "./pages/Cuestionarios";
import DetalleSolicitud from "./pages/DetalleSolicitud";
import ExplorarMascotas from "./pages/ExplorarMascotas";
import FichaMascota from "./pages/FichaMascota";
import Guardados from "./pages/Guardados";
import InicioRefugio from "./pages/InicioRefugio";
import Login from "./pages/Login";
import MascotaRefugio from "./pages/MascotaRefugio";
import MisMascotas from "./pages/MisMascotas";
import MisSolicitudes from "./pages/MisSolicitudes";
import PerfilAdoptante from "./pages/PerfilAdoptante";
import PerfilRefugio from "./pages/PerfilRefugio";
import PublicarMascota from "./pages/PublicarMascota";
import Recomendaciones from "./pages/Recomendaciones";
import Registro from "./pages/Registro";
import Solicitudes from "./pages/Solicitudes";

function App() {
  return (
    <ToastProvider>
    <ConfirmProvider>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/login" element={<Login />} />

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
      <Route
        path="/cuestionarios"
        element={
          <RutaProtegida rolRequerido="refugio">
            <Cuestionarios />
          </RutaProtegida>
        }
      />
      {/* La pantalla de postulaciones se reemplazó por /solicitudes */}
      <Route path="/postulaciones" element={<Navigate to="/solicitudes" replace />} />
    </Routes>
    </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;
