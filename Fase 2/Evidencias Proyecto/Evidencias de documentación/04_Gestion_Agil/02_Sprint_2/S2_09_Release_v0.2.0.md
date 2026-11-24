# Release v0.2.0 · Sprint 2

| | |
|---|---|
| **Versión** | v0.2.0 |
| **Sprint** | Sprint 2 (19-10-2026 al 30-10-2026) |
| **Fecha del release** | 30-10-2026, al cierre del sprint |
| **Commit de la versión** | `9afcf54`: último commit del sprint en `main` (29-10-2026) |
| **App publicada** | https://frontend-zavd.onrender.com |
| **API Gateway** | https://housefound-gateway.onrender.com |
| **Infraestructura** | Render (6 Web Services con Docker y un Static Site, región Virginia), PostgreSQL en Neon (São Paulo) y Cloudinary para los archivos del chat |

> Notas de versión reconstruidas el 23-11-2026 a partir del historial de commits del repositorio y del Sprint Backlog (S2_04).

## Resumen

Segunda versión publicada de HouseFound: tras aprobar una postulación, el adoptante y el refugio tienen un chat para seguir cómo está la mascota, con texto, fotos, audios y videos. Dentro del chat el adoptante responde las encuestas de 30 y 90 días, y el refugio ve el resultado.

De los 3 ítems comprometidos se terminaron los 3, que suman 13 de 13 puntos. Todo el desarrollo entró a `main` el 28-10, en un solo bloque.

## Novedades

### N3 · Chat de seguimiento post-adopción (L · 5 pts)
- Cada postulación aprobada abre un chat entre el adoptante y el refugio dueño de la mascota; nadie más puede entrar (`e3e95ea`).
- Se envían mensajes de texto, fotos, videos y audios grabados desde el navegador. Los archivos suben directo a Cloudinary con una firma del servicio, así un video grande no pasa por el gateway.
- La barra de navegación muestra cuántos mensajes hay sin leer; al abrir el chat quedan leídos.
- Nueva migración `007_chat_seguimiento.sql`: tabla `mensajes_seguimiento` y fecha de confirmación de la adopción.

### #17 · Seguimiento de la adopción para el refugio (L · 5 pts)
- El refugio ve en Seguimiento los chats de sus propias mascotas y, dentro de cada uno, el estado de las encuestas de 30 y 90 días: pendiente, disponible o respondida (`e3e95ea`).
- La respuesta del adoptante queda como aviso en el mismo chat, con el resultado y, si hubo devolución, el motivo.
- Una devolución deja la mascota disponible otra vez, sin que el refugio haga nada.

### #18 · Encuesta de seguimiento para el adoptante (M · 3 pts)
- La encuesta aparece dentro del chat a los 30 y a los 90 días de la fecha de adopción; antes muestra desde cuándo se habilita (`e3e95ea`).
- El adoptante elige entre «Va todo bien», «Seguimos adaptándonos» y «Tuve que devolverla»; esta última exige el motivo.
- Tras una devolución no se abren más encuestas, y cada encuesta se responde una sola vez.

## Correcciones
- El cuestionario del adoptante se enviaba al llegar al paso 5: el botón «Siguiente» pasaba a ser el de guardar y el clic enviaba el formulario antes de terminar (`9afcf54`).

## Otros cambios incluidos (no planificados)
- Diario de reflexión 2.1 de Orlando Espinoza (`d8e47e9`), que no cambia la app.

## No incluido en esta versión

| Ítem | Talla | Qué pasa con él |
|---|---|---|
| #24 (parte 1) · Pruebas de auth-service y postulaciones-service | L · 5 pts | Sigue en el Product Backlog |
| #19 · Resumen de resultados de adopción para el refugio | L · 5 pts | Candidato del Sprint 3: el backend de métricas existe, pero no tiene pantalla |
| #24 (parte 2) · Pruebas de seguimiento-service y del API Gateway | M · 3 pts | Candidato del Sprint 3 (el chat ya trae 19 pruebas en `test_chat.py`) |

## Problemas conocidos
- **Primera carga lenta:** en el plan gratis de Render los servicios se duermen sin uso; la primera petición puede tardar cerca de un minuto.
- **Chat sin tiempo real:** la pantalla consulta los mensajes nuevos cada cierto intervalo; no hay conexión continua.
- **Encuestas difíciles de mostrar:** se abren a los 30 y 90 días de la adopción. Para probarlas se usa la variable `SEGUIMIENTO_SIN_ESPERA=true`, que nunca debe activarse en producción.
- **Requisitos del despliegue:** hace falta la migración 007 aplicada en Neon y las variables de Cloudinary en el servicio `seguimiento-service` de Render; sin ellas el chat no puede subir archivos.
- **Pocas pruebas automatizadas:** el motor de compatibilidad (24) y las reglas de las encuestas y del chat (19 en `test_chat.py`). Las pruebas no se ejecutaron al preparar estas notas.
- **Código sin revisión:** el chat entró en un solo commit de 29 archivos, sin Pull Request.

## Commits del sprint

| Commit | Fecha | Autor | Cambio | Ítem |
|---|---|---|---|---|
| `e3e95ea` | 27-10 | Benjamín Ormazábal | Chat de seguimiento con texto, fotos, audios y videos, y encuestas de 30 y 90 días | #17, #18 y N3 |
| `d8e47e9` | 28-10 | Orlando Espinoza | Diario de reflexión 2.1 | Fuera del backlog |
| `e77e9cb` | 28-10 | Benjamín Ormazábal | Merge de la rama `feature/seguimiento-post-adopcion` en `main` | #17, #18 y N3 |
| `9afcf54` | 29-10 | Patricio Cárcamo | Corrección del cuestionario del adoptante en el paso 5 | Fuera del backlog |

El chat se desarrolló en la rama `feature/seguimiento-post-adopcion` y se integró con un merge local, sin Pull Request (impedimento 2).

## Cómo verificar esta versión
1. Abrir https://frontend-zavd.onrender.com (la primera carga puede tardar cerca de un minuto).
2. Como refugio, aprobar la postulación de un adoptante de prueba: debe aparecer un chat en **Seguimiento**.
3. Como adoptante, entrar al mismo chat y enviar un texto, una foto y un audio; el refugio debe verlos y la barra debe mostrar los mensajes sin leer.
4. Con `SEGUIMIENTO_SIN_ESPERA=true` en un entorno de pruebas, responder la encuesta de 30 días como adoptante: el refugio debe ver el aviso en el chat. Si el resultado es «Tuve que devolverla», la mascota vuelve a estar disponible.

## Etiqueta en Git

Para marcar esta versión en el repositorio:

```bash
git tag -a v0.2.0 9afcf54 -m "Release v0.2.0 · Sprint 2"
git push origin v0.2.0
```
