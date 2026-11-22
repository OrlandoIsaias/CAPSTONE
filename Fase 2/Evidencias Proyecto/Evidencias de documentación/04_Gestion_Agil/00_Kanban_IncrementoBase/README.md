# Incremento base con Kanban · 28-08 al 04-10-2026

El plan de la Fase 1 era Scrum, con 6 sprints y un servicio por sprint. En la práctica, como los servicios dependen unos de otros, construimos primero una versión base de todos a la vez con un tablero **Kanban** (flujo continuo, sin sprints). El 30-09 pasamos el tablero a **Scrum** y el 05-10 partió el Sprint 1. Por qué hicimos el cambio está en el documento K_03.

| Fecha | Hito |
|---|---|
| 28-08 | Se crea el repositorio en GitHub |
| 30-08 | Se registran en GitHub Projects las historias de usuario (#1 a #19) y las tareas técnicas (#20 a #25) |
| 31-08 y 01-09 | Primeros módulos integrados con ramas `feature/*` y Pull Requests #26 a #30 |
| 08-09 al 20-09 | Receso de Fiestas Patrias, sin avance en el repositorio |
| 21-09 | Se retoma el trabajo y se instaura la Daily |
| 30-09 | El tablero pasa de Kanban a Scrum y se definen roles, sprints y eventos |
| 05-10 | Parte el Sprint 1 (ver [01_Sprint_1](../01_Sprint_1/)) |

## Evidencias de esta carpeta

En Kanban no hay sprints, así que no hay Sprint Planning, Review, Retrospective ni Burndown. La evidencia muestra el tablero, el flujo de trabajo, el cambio de metodología y los problemas del período.

| # | Documento | Qué demuestra | Archivo | Listo |
|---|---|---|---|---|
| K_01 | Tablero de GitHub Projects | Captura del 22-11-2026: las 19 historias y tareas en «Listo» son las del incremento base; columnas Backlog, Por hacer, En progreso y Listo | `K_01_Tablero_GitHub_Projects.png` | ☑ |
| K_02 | Flujo de trabajo | Commits por semana e integrante, y los Pull Requests #26 a #30 | `K_02_Flujo_de_Trabajo.xlsx` | ☑ |
| K_03 | Transición de Kanban a Scrum | Cómo trabajábamos, por qué cambiamos, qué cambió y qué costó el cambio | `K_03_Transicion_Kanban_a_Scrum.docx` | ☑ |
| K_04 | Registro de impedimentos | Receso de Fiestas Patrias, claves expuestas, integración directa a `main`, participación desigual, tablero sin actualizar y documentos rehechos | `K_04_Registro_Impedimentos.xlsx` | ☑ |

Commits del período:

```bash
git log origin/main --no-merges --since="2026-08-28 00:00" --until="2026-10-04 23:59" --format="%ad %an %s" --date=short
```
