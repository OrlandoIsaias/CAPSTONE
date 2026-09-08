import { Navigate, Route, Routes } from "react-router-dom";
import { BotonTema } from "./components/BotonTema";
import { RutaProtegida } from "./components/RutaProtegida";
import FichaMascota from "./pages/FichaMascota";
import Login from "./pages/Login";
import MisMascotas from "./pages/MisMascotas";
import PerfilAdoptante from "./pages/PerfilAdoptante";
import PerfilRefugio from "./pages/PerfilRefugio";
import PublicarMascota from "./pages/PublicarMascota";
import Recomendaciones from "./pages/Recomendaciones";
import Registro from "./pages/Registro";

function App() {
  return (
    <>
      <BotonTema />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/login" element={<Login />} />

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
          path="/mascota/:id"
          element={
            <RutaProtegida rolRequerido="adoptante">
              <FichaMascota />
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
      </Routes>
    </>
  );
}

export default App;
