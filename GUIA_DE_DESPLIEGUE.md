# Guía de despliegue de HouseFound

**Publicada el 5 de octubre de 2026** · Render, plan gratuito · Cuenta de Render: Orlando Espinoza (ingreso con GitHub)

Esta guía explica cómo está publicada HouseFound en internet, cómo se actualiza, cómo recrear el despliegue desde cero y qué revisar antes de una demo. Para correr la app en local, ver la sección 10 de la [Guía del proyecto](GUIA_DEL_PROYECTO.md).

## Índice

1. [La app publicada](#1-la-app-publicada)
2. [Cómo está armado](#2-cómo-está-armado)
3. [Cómo se actualiza](#3-cómo-se-actualiza)
4. [Variables de entorno](#4-variables-de-entorno)
5. [Recrear el despliegue desde cero](#5-recrear-el-despliegue-desde-cero)
6. [Usarla en el teléfono](#6-usarla-en-el-teléfono)
7. [Antes de una demo](#7-antes-de-una-demo)
8. [Problemas que encontramos y cómo se resolvieron](#8-problemas-que-encontramos-y-cómo-se-resolvieron)
9. [Pendientes](#9-pendientes)

---

## 1. La app publicada

| Pieza | URL |
|---|---|
| **App (frontend)** | https://frontend-zavd.onrender.com |
| API Gateway (estado de los 5 servicios) | https://housefound-gateway.onrender.com |
| auth-service | https://capstone-l619.onrender.com |
| mascotas-service | https://housefound-mascotas.onrender.com |
| matching-service | https://housefound-matching.onrender.com |
| postulaciones-service | https://housefound-postulaciones.onrender.com |
| seguimiento-service | https://housefound-seguimiento.onrender.com |

- La URL de auth lleva una **`l` minúscula** antes de `619`, no un número uno. En Render ese servicio aparece con el nombre "CAPSTONE".
- La versión publicada usa **la misma base de datos de Neon** que se usa en local: lo que se crea en una aparece en la otra.

---

## 2. Cómo está armado

```
Teléfono / navegador
        │ https
        ▼
frontend (Static Site) ──▶ api-gateway (Web Service)
                                │
     ┌──────────┬───────────┬───┴──────────┬───────────────┐
     ▼          ▼           ▼              ▼               ▼
   auth     mascotas     matching    postulaciones    seguimiento   (Web Services)
     └──────────┴───────────┴──────────────┴───────────────┘
                                │
                  Neon (PostgreSQL) · Cloudinary (fotos)
```

| Pieza | Tipo en Render | Cómo corre | ¿Se duerme? |
|---|---|---|---|
| Frontend | Static Site | Render compila React (`npm run build`) y sirve los archivos de `dist/` | No |
| Gateway y 5 servicios | Web Service, plan Free (0,1 CPU, 512 MB) | El mismo `Dockerfile` que usa `docker compose` en local | Sí, tras 15 minutos sin uso |

- **Región Virginia (US East):** Render no tiene región en Sudamérica, y Virginia es la más cercana a la base de datos de Neon, que está en São Paulo (`sa-east-1`).
- **Servicios dormidos:** la primera petición los despierta, lo que tarda entre 10 segundos y un minuto. Por eso el gateway espera hasta 60 segundos a cada servicio.

---

## 3. Cómo se actualiza

```
push a main ──▶ GitHub Action "Actualizar rama deploy" ──▶ rama deploy ──▶ Render publica solo
```

- **No hay que hacer nada extra:** se trabaja en `main` como siempre. Cada push que cambie algo dentro de `Aplicación/` se publica en 2 a 5 minutos.
- Render vuelve a publicar **solo los servicios cuya carpeta cambió**. Si solo se tocó el frontend, solo se publica el frontend.
- **Nunca editar ni hacer push a la rama `deploy`:** se regenera sola y cualquier cambio manual se pierde o rompe la Action.

**Por qué existe la rama `deploy`:** Render no acepta tildes en las rutas de carpetas, y la app vive en `Aplicación/`, carpeta que viene de la plantilla del Capstone y no se quiso renombrar. La Action [`.github/workflows/rama-deploy.yml`](.github/workflows/rama-deploy.yml) copia el contenido de `Aplicación/` a la raíz de la rama `deploy` (con `git subtree split`), y Render publica desde ahí con rutas sin tilde, como `backend/auth-service`.

**Revisar si un cambio llegó:**

1. GitHub → pestaña **Actions** → "Actualizar rama deploy" debe estar en verde. Si falló, se puede volver a correr con **Run workflow**.
2. Render → el servicio → **Events**: debe aparecer un deploy nuevo terminado en "Live".

---

## 4. Variables de entorno

Las claves viven **solo en el panel de Render** (pestaña **Environment** de cada servicio). Nunca se suben a git ni se comparten por chat o en capturas.

| Servicio | Variables |
|---|---|
| auth | `PORT=8000`, `DATABASE_URL`, `JWT_SECRET`, `MODO_DEV`, `CODIGO_PRUEBA` |
| mascotas | `PORT=8001`, `DATABASE_URL`, `JWT_SECRET`, `AUTH_SERVICE_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| matching | `PORT=8002`, `DATABASE_URL`, `JWT_SECRET` |
| postulaciones | `PORT=8003`, `DATABASE_URL`, `JWT_SECRET` |
| seguimiento | `PORT=8004`, `DATABASE_URL`, `JWT_SECRET` |
| api-gateway | `PORT=8080`, `JWT_SECRET`, `AUTH_SERVICE_URL`, `MASCOTAS_SERVICE_URL`, `MATCHING_SERVICE_URL`, `POSTULACIONES_SERVICE_URL`, `SEGUIMIENTO_SERVICE_URL`, `FRONTEND_URL` |
| frontend | `VITE_API_URL`, `NODE_VERSION=22` |

**Reglas:**

- **`JWT_SECRET` de Render es distinta a la de los `.env` locales** y es la misma en los 6 servicios. Es una clave larga y al azar, porque con una frase fácil cualquiera que se registre podría adivinarla y fabricar un inicio de sesión falso. Se genera con:
  ```powershell
  python -c "import secrets; print(secrets.token_urlsafe(48))"
  ```
  Si se cambia, hay que cambiarla en los 6 servicios. Las sesiones abiertas se cierran.
- **Las URLs van con `https://` y sin `/` al final.** Con `/` final, el gateway arma rutas con doble barra y ese servicio responde con error.
- **`PORT`** existe porque cada `Dockerfile` arranca en un puerto fijo y Render necesita saber cuál es.
- **`FRONTEND_URL`** es la lista de páginas que pueden llamar al gateway (CORS), separadas por coma. Hoy vale `https://frontend-zavd.onrender.com,http://localhost:5173`.
- **`VITE_API_URL`** queda incluida en el código al compilar. Si cambia, hay que volver a publicar el frontend.
- **Para cambiar una variable:** Environment → editar → **Save, rebuild, and deploy**.

---

## 5. Recrear el despliegue desde cero

Sirve si hay que crear todo de nuevo en otra cuenta. Hay que tener a mano el `.env` de cada servicio.

### 5.1 Cuenta

1. Entrar a [render.com](https://render.com) con **GitHub**.
2. Darle a Render acceso al repositorio `CAPSTONE`.

### 5.2 Los 6 Web Services

Crearlos **en este orden**, porque unos necesitan la URL de otros: auth → mascotas → matching, postulaciones y seguimiento (en cualquier orden) → gateway.

**+ New → Web Service** → repo `CAPSTONE`. Campos iguales para todos:

| Campo | Valor |
|---|---|
| Language | `Docker`. Si Render elige "Python 3" al ver el `requirements.txt`, cambiarlo. |
| Branch | `deploy` |
| Region | `Virginia (US East)` |
| Root Directory | `backend/<servicio>` (ver tabla) |
| Instance Type | **Free ($0 / month)**. Revisarlo justo antes de crear, porque a veces cambia solo. |
| Advanced → Health Check Path | `/` |

Dockerfile Path y Docker Build Context Directory se llenan solos a partir del Root Directory.

| Name | Root Directory | `PORT` |
|---|---|---|
| `housefound-auth` | `backend/auth-service` | `8000` |
| `housefound-mascotas` | `backend/mascotas-service` | `8001` |
| `housefound-matching` | `backend/matching-service` | `8002` |
| `housefound-postulaciones` | `backend/postulaciones-service` | `8003` |
| `housefound-seguimiento` | `backend/seguimiento-service` | `8004` |
| `housefound-gateway` | `backend/api-gateway` | `8080` |

**Variables de cada servicio:**

1. **Add from .env** y pegar el `.env` local de ese servicio.
2. Reemplazar `JWT_SECRET` por la clave de Render (sección 4).
3. Reemplazar cada `http://localhost:…` por la URL del servicio en Render. Esto aplica a `AUTH_SERVICE_URL` en mascotas y a las 5 URLs del gateway.
4. Agregar `PORT`.
5. Crear el servicio y esperar a ver **"Your service is live"** en el log. Copiar la URL desde la línea `Available at your primary URL`; no escribirla a mano.

### 5.3 El frontend (Static Site)

**+ New → Static Site** → repo `CAPSTONE`:

| Campo | Valor |
|---|---|
| Branch | `deploy` |
| Root Directory | `frontend` |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |
| Variables | `VITE_API_URL` = URL del gateway · `NODE_VERSION` = `22` |

Cuando esté creado: **Redirects/Rewrites → Add Rule** con Source `/*`, Destination `/index.html` y Action **Rewrite**. Sin esta regla, recargar una pantalla interna (por ejemplo `/mascota/5`) da "Not Found".

### 5.4 Conectar el gateway con el frontend

En el gateway: `FRONTEND_URL` = `<URL del frontend>,http://localhost:5173` → **Save, rebuild, and deploy**.

### 5.5 Comprobar

| Prueba | Si falla, revisar |
|---|---|
| La URL del gateway muestra los 5 servicios en "ok" | La `*_SERVICE_URL` del servicio que no responde |
| La app carga mascotas | `FRONTEND_URL` del gateway (error de CORS en la consola del navegador) |
| Iniciar sesión y navegar | Que `JWT_SECRET` sea igual en los 6 servicios |
| Un refugio publica una mascota con foto | `AUTH_SERVICE_URL` y variables de Cloudinary en mascotas |
| Recargar una pantalla interna | La regla Rewrite del frontend |

---

## 6. Usarla en el teléfono

1. Abrir https://frontend-zavd.onrender.com. Funciona con datos móviles o con cualquier Wi-Fi.
2. Agregarla a la pantalla de inicio:
   - **iPhone (Safari):** Compartir → **Agregar a inicio**.
   - **Android (Chrome):** menú ⋮ → **Agregar a la pantalla principal**.

Hoy queda como acceso directo con el ícono de HouseFound. Para que se abra como app, sin la barra del navegador, falta convertirla en PWA (ver Pendientes).

---

## 7. Antes de una demo

1. **3 a 5 minutos antes**, abrir https://housefound-gateway.onrender.com y recargar hasta que los 5 servicios digan `"ok"`. El frontend no se duerme; los servicios sí.
2. Abrir la app en el teléfono e iniciar sesión una vez para confirmar que todo responde.
3. **Refugio de prueba:** usa el código fijo `CODIGO_PRUEBA`. Para cualquier otra organización, el código de verificación aparece en Render → auth → **Logs**, porque `MODO_DEV=true`.
4. **Plan B:** llevar el notebook con la app lista para correr en local (`docker compose up`, sección 10 de la Guía del proyecto).

El plan gratis da 750 horas de servicio al mes para toda la cuenta. No usar herramientas que mantengan los servicios siempre despiertos: con 6 servicios encendidos todo el día, esas horas se acaban en menos de una semana.

---

## 8. Problemas que encontramos y cómo se resolvieron

| Síntoma | Causa | Solución |
|---|---|---|
| Render rechaza la ruta: `must match re "/^[A-Za-z0-9-_./ ]*$/"` | La tilde de `Aplicación` | Rama `deploy` generada por una Action (sección 3) |
| Desaparece el campo Dockerfile Path | Render cambió Language a "Python 3" al ver `requirements.txt` | Volver a elegir `Docker` |
| El deploy espera un health check en el puerto 10000 | Render no sabía en qué puerto escucha el servicio | Variable `PORT` con el puerto del `Dockerfile` |
| El gateway muestra `"auth-service": "responde con error"` | URL mal copiada (`1619` en vez de `l619`) o con `/` al final | Copiar la URL desde el log de Render |
| La app recibe datos ilegibles | Render comprime con brotli y el gateway reenviaba el `accept-encoding` del navegador sin saber descomprimir ese formato | El gateway ya no reenvía ese encabezado (commit `4d2916b`) |
| La primera petición después de un rato falla con "no disponible" | Servicios dormidos y gateway con espera de 10 segundos | Espera de 60 segundos (mismo commit) y despertarlos antes de la demo |
| La app abre pero no carga datos | `FRONTEND_URL` del gateway no incluía la URL del frontend (CORS) | Agregarla a `FRONTEND_URL` |
| Recargar `/mascota/5` da "Not Found" | Faltaba la regla Rewrite | `/*` → `/index.html` (Rewrite) |
| El formulario pasó solo al plan de $7 | Render cambió el plan al editar otros campos | Revisar que diga $0 antes de crear |

---

## 9. Pendientes

| Pendiente | Para qué |
|---|---|
| Convertir la app en **PWA** (`vite-plugin-pwa`, manifest, íconos de 192 y 512 px) | Que se instale y se abra como app, y que Android ofrezca "Instalar" |
| Configurar **SMTP** y poner `MODO_DEV=false` | Que los refugios reales reciban su código por correo |
| Quitar `CODIGO_PRUEBA` cuando haya usuarios reales | Que nadie entre como el refugio de prueba |
| Opcional: una rama de Neon solo para la versión publicada | Que las pruebas en local no mezclen datos con la demo |
| Acceso del equipo al panel de Render | Hoy solo Orlando ve el panel. El resto publica cambios haciendo push a `main`. |
