import axios from "axios";

// El frontend SOLO habla con el api-gateway (puerto 8080 en desarrollo),
// nunca directo con cada microservicio — es la razón de ser del gateway.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export const apiClient = axios.create({
  baseURL: API_URL,
});

// Agrega el token guardado a TODAS las peticiones automáticamente,
// para no repetir "Authorization: Bearer ..." en cada llamada.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("housefound_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el token expiró o es inválido, el backend responde 401 — limpiamos
// la sesión guardada para que el usuario tenga que volver a iniciar sesión,
// en vez de quedar atrapado viendo errores repetidos.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("housefound_token");
      localStorage.removeItem("housefound_usuario");
    }
    return Promise.reject(error);
  }
);
