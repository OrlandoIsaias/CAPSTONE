# Release v0.1.0 · Sprint 1

| | |
|---|---|
| **Versión** | v0.1.0 |
| **Sprint** | Sprint 1 (05-10-2026 al 16-10-2026) |
| **Fecha del release** | 16-10-2026, al cierre del sprint |
| **Commit de la versión** | `69035fa`: último commit del sprint en `main` (09-10-2026) |
| **App publicada** | https://frontend-zavd.onrender.com |
| **API Gateway** | https://housefound-gateway.onrender.com |
| **Infraestructura** | Render (6 Web Services con Docker y un Static Site, región Virginia) y PostgreSQL en Neon (São Paulo) |

> Notas de versión reconstruidas el 22-11-2026 a partir del historial de commits del repositorio y del Sprint Backlog (S1_04).

## Resumen

Es la primera versión publicada de HouseFound: la app queda accesible desde cualquier navegador con un enlace público y se actualiza sola con cada cambio en `main`. Además, la API deja de exponer los teléfonos de las postulaciones que no están aprobadas.

De los 5 ítems comprometidos se terminaron 2, que suman 5 de 18 puntos. El resto pasa a los próximos sprints (ver más abajo).

## Novedades

### N1 · App publicada en Render con despliegue automático (M · 3 pts)
- Una GitHub Action copia la carpeta `Aplicación/` a la rama `deploy` en cada push a `main`, y Render publica desde esa rama (`d212524`). Esto es necesario porque Render no acepta la "ó" de `Aplicación` en las rutas.
- El frontend y los 6 servicios del backend quedan publicados en Render, cada uno con sus variables de entorno.
- Nueva guía de despliegue en `GUIA_DE_DESPLIEGUE.md` y enlace a la app publicada desde el README (`9e160b8`, `a15e781`).

### N2 · Datos de contacto protegidos y validaciones de seguridad (S · 2 pts)
- La API de postulaciones entrega los teléfonos del adoptante y del refugio **solo cuando la postulación está aprobada** (RN06) (`66b80c5`).
- El registro valida en el backend que la contraseña tenga al menos 6 caracteres, igual que el formulario (`66b80c5`).
- El gateway y los 5 servicios no arrancan si falta `JWT_SECRET` o si tiene el valor por defecto (`66b80c5`).

## Correcciones
- El gateway deja de reenviar el encabezado `accept-encoding`. Antes, los servicios respondían en brotli y el cuerpo llegaba comprimido al navegador (`4d2916b`).
- El tiempo de espera del gateway sube a 60 s, para dar tiempo a que despierten los servicios del plan gratis de Render (`4d2916b`).

## Otros cambios incluidos (no planificados)
- Botón «¿Cómo funciona HouseFound?» en la pantalla Explorar, que abre el tutorial del adoptante (`66b80c5`).

## No incluido en esta versión

| Ítem | Talla | Qué pasa con él |
|---|---|---|
| #17 · Seguimiento de la adopción para el refugio | L · 5 pts | Pasa al Sprint 2 |
| #18 · Encuesta de seguimiento para el adoptante | M · 3 pts | Pasa al Sprint 2 |
| #24 (parte 1) · Pruebas de auth-service y postulaciones-service | L · 5 pts | Vuelve al Product Backlog |

## Problemas conocidos
- **Primera carga lenta:** en el plan gratis de Render los servicios se duermen sin uso. La primera petición después de un rato puede tardar cerca de un minuto (impedimento 2, mitigado).
- **Sin seguimiento post-adopción en la app:** el backend de las encuestas a 30 y 90 días existe, pero todavía no tiene pantallas.
- **Pocas pruebas automatizadas:** solo el motor de compatibilidad tiene pruebas (24).

## Commits del sprint

| Commit | Fecha | Autor | Cambio | Ítem |
|---|---|---|---|---|
| `d212524` | 05-10 | Orlando Espinoza | Action que publica `Aplicación/` en la rama `deploy` | N1 |
| `4d2916b` | 05-10 | Orlando Espinoza | Compresión y tiempo de espera del gateway para Render | N1 |
| `9e160b8` | 07-10 | Orlando Espinoza | Guía de despliegue y enlace a la app publicada | N1 |
| `66b80c5` | 07-10 | Martín Guzmán | Teléfonos protegidos, validación de contraseña y `JWT_SECRET` obligatorio | N2 |
| `a15e781` | 07-10 | Orlando Espinoza | Actualización del README | N1 |
| `1ba947d` | 08-10 | Patricio Cárcamo | Evidencias de la Fase 2 (Carta Gantt, Guía 2.4, Informe 2.6, diario 2.1) | Fuera del backlog |
| `136c9a9` | 08-10 | Martín Guzmán | Diario de reflexión 2.1 | Fuera del backlog |
| `3c20745` | 08-10 | Benjamín Ormazábal | Planillas grupales y diario de reflexión 2.1 | Fuera del backlog |
| `69035fa` | 09-10 | Benjamín Ormazábal | Presentación de avance de la Fase 2 | Fuera del backlog |

Los 9 commits entraron directo a `main`, sin Pull Request (impedimento 5).

## Cómo verificar esta versión
1. Abrir https://frontend-zavd.onrender.com (la primera carga puede tardar cerca de un minuto).
2. Abrir https://housefound-gateway.onrender.com: el health check debe mostrar los 5 microservicios como `"ok"`.
3. Como adoptante, postular a una mascota: mientras la postulación no esté aprobada, ni el adoptante ni el refugio ven el teléfono del otro.

## Etiqueta en Git

Para marcar esta versión en el repositorio:

```bash
git tag -a v0.1.0 69035fa -m "Release v0.1.0 · Sprint 1"
git push origin v0.1.0
```
