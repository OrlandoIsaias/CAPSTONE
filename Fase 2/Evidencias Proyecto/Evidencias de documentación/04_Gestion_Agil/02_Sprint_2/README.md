# Sprint 2 · 19-10 al 30-10-2026 · v0.2.0

**Objetivo:** habilitar el seguimiento post-adopción desde la app: un chat entre adoptante y refugio, con fotos, audios y videos, y las encuestas de 30 y 90 días, para que el refugio sepa cómo resultó cada adopción.
**Compromiso:** 3 ítems, 13 puntos (#17 L, #18 M, N3 L). Los tres se terminaron.

| # | Documento | Archivo | Estado |
|---|---|---|---|
| 01 | Product Backlog | `S2_01_Product_Backlog.xlsx` | ☑ Borrador: el equipo debe confirmar las tallas, en especial la de N3 |
| 02 | Criterios de aceptación | `S2_02_Criterios_de_Aceptacion.docx` | ☑ Revisados contra el código el 23-11; el equipo debe confirmarlos |
| 03 | Sprint Planning | `S2_03_Sprint_Planning.docx` | ☑ Borrador: el equipo debe confirmar la capacidad y los responsables |
| 04 | Sprint Backlog | `S2_04_Sprint_Backlog.xlsx` | ☑ Reconstruido desde los commits: 17 de 17 tareas en Hecho |
| 05 | Scrumboard | `S2_05_Scrumboard_inicio.png`, `S2_05_Scrumboard_mitad.png`, `S2_05_Scrumboard_cierre.png` | ☑ Reconstruido desde el Sprint Backlog (04); inicio y mitad son iguales porque no hubo commits hasta el 27-10 |
| 06 | Burndown Chart | `S2_06_Burndown.xlsx`, `S2_06_Burndown.png` | ☑ 13 de 13 puntos terminados, todos el 28-10 |
| 07 | Daily Meeting | `S2_07_Daily.xlsx` | ☑ Reconstruido desde los commits: 3 de 10 dailies realizadas |
| 08 | Registro de impedimentos | `S2_08_Registro_Impedimentos.xlsx` | ☑ 6 impedimentos: 1 resuelto, 1 mitigado y 4 abiertos que pasan al Sprint 3 |
| 09 | Release | `S2_09_Release_v0.2.0.md` | ☑ v0.2.0 sobre el commit 9afcf54; falta crear el tag en Git |
| 10 | Sprint Review | `S2_10_Sprint_Review.docx` | ☑ Sin registro de la reunión; revisión del incremento hecha el 23-11 contra el código |
| 11 | Sprint Retrospective | `S2_11_Retrospective.docx` | ☑ Start / Stop / Continue, estado de las acciones del Sprint 1 y 6 acciones para el Sprint 3 |

Lo que debe contener cada documento está en el [README de 04_Gestion_Agil](../README.md).

**Qué hay que confirmar con el equipo** (se reconstruyó desde los commits, igual que el Sprint 1):
- Que la Planning del 19-10, las dailies y la Review del 30-10 sigan el patrón del Sprint 1: sin dailies los días sin commits y sin registro de la Review. Si hay mensajes o actas, reemplazar los documentos 03, 07, 10 y 11.
- Capacidad, responsables y tallas de la Planning (documentos 01, 03 y 04). En particular N3, que es un ítem nuevo.
- Que no hubo trabajo del sprint fuera de los commits (por ejemplo, pruebas manuales o reuniones).

Impedimentos del sprint (detalle en el documento 08):
- Las encuestas solo se abren a los 30 y 90 días: para probarlas se creó `SEGUIMIENTO_SIN_ESPERA` (mitigado, solo para pruebas).
- El chat entró a main en un solo commit de 29 archivos, con un merge local y sin Pull Request.
- Un error del cuestionario del adoptante, que se enviaba al llegar al paso 5 (resuelto).
- Del 19 al 26-10 no hubo dailies ni avance registrado.
- Los tres ítems los entregó una sola persona.
- No hay registro de la Review ni de la Retrospective del 30-10.

Commits del sprint, para armar el Release:

```bash
git log origin/main --no-merges --since="2026-10-19 00:00" --until="2026-10-30 23:59" --format="%ad %an %s" --date=short
```
