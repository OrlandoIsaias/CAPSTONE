# Frontend — HouseFound

Aplicación web de HouseFound (React + TypeScript + Vite + Tailwind CSS). Habla
solo con el `api-gateway`, que reparte las peticiones a los 5 microservicios.

## Cómo levantarlo

Requiere Node.js 22 o superior y el `api-gateway` corriendo (por defecto en
`http://localhost:8080`).

```
cp .env.example .env     # VITE_API_URL = URL del api-gateway
npm install
npm run dev              # http://localhost:5173
```

Con Docker se levanta junto con el backend desde `Aplicación/`:
`docker compose up --build`.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Revisa los tipos (`tsc -b`) y genera la versión de producción en `dist/` |
| `npm run lint` | Revisa el código con ESLint |
| `npm run preview` | Sirve localmente el resultado de `build` |

## Estructura de `src/`

| Carpeta | Contenido |
|---|---|
| `api/` | Llamadas HTTP al api-gateway (`client.ts` agrega el JWT a cada petición) |
| `context/` | Estado global: sesión, avisos (toasts) y diálogos de confirmación |
| `components/` | Piezas reutilizables: barras de navegación, tarjetas, preguntas de los cuestionarios, desglose de compatibilidad |
| `pages/` | Pantallas del adoptante y del refugio |
| `hooks/` | Hooks propios (ajuste de fotos) |
| `types/` | Tipos de las respuestas de la API |
| `utils/` | Opciones de los cuestionarios, validaciones (RUT, teléfono) y utilidades |

Las opciones de los cuestionarios (`utils/opcionesAdoptante.ts` y
`utils/opcionesMascota.ts`) deben coincidir con los valores que aceptan la base
de datos (`CHECK`), los `schemas.py` del backend y
`backend/matching-service/scoring.py`. Si agregas o cambias una opción,
actualízala en todos esos lugares.
