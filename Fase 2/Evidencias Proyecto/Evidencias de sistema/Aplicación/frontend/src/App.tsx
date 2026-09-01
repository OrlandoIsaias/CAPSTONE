import { Navigate, Route, Routes } from "react-router-dom";
import { RutaProtegida } from "./components/RutaProtegida";
import Login from "./pages/Login";
import MisMascotas from "./pages/MisMascotas";
import PerfilAdoptante from "./pages/PerfilAdoptante";
import PerfilRefugio from "./pages/PerfilRefugio";
import Recomendaciones from "./pages/Recomendaciones";
import Registro from "./pages/Registro";

function App() {
  return (
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
    </Routes>
  );
}

export default App;
