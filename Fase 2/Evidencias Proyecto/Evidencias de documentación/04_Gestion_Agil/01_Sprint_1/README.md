# Sprint 1 · 05-10 al 16-10-2026 · v0.1.0

**Objetivo:** publicar HouseFound en la nube con los datos de contacto protegidos y habilitar el seguimiento post-adopción desde la app, para que el refugio sepa cómo resultó cada adopción.
**Compromiso:** 5 ítems, 18 puntos (N1 M, N2 S, #17 L, #18 M, #24 parte 1 L).

| # | Documento | Archivo | Estado |
|---|---|---|---|
| 01 | Product Backlog | `S1_01_Product_Backlog.xlsx` | ☑ Borrador: el equipo debe confirmar las tallas |
| 02 | Criterios de aceptación | `S1_02_Criterios_de_Aceptacion.docx` | ☑ Borrador: el equipo debe revisarlos |
| 03 | Sprint Planning | `S1_03_Sprint_Planning.docx` | ☑ Borrador: el equipo debe confirmar la capacidad |
| 04 | Sprint Backlog | `S1_04_Sprint_Backlog.xlsx` | ☑ Estados confirmados: todo el trabajo quedó en commits |
| 05 | Scrumboard | `S1_05_Scrumboard_inicio.png`, `S1_05_Scrumboard_mitad.png`, `S1_05_Scrumboard_cierre.png` | ☑ Reconstruido desde el Sprint Backlog (04); se regenera si cambian los estados |
| 06 | Burndown Chart | `S1_06_Burndown.xlsx`, `S1_06_Burndown.png` | ☑ 5 de 18 puntos terminados; se actualiza si cambian las fechas de término |
| 07 | Daily Meeting | `S1_07_Daily.xlsx` | ☑ Reconstruido desde los commits: 4 de 9 dailies realizadas |
| 08 | Registro de impedimentos | `S1_08_Registro_Impedimentos.xlsx` | ☑ 6 impedimentos: 1 resuelto, 1 mitigado y 4 abiertos que pasan al Sprint 2 |
| 09 | Release | `S1_09_Release_v0.1.0.md` | ☑ v0.1.0 sobre el commit 69035fa; falta crear el tag en Git |
| 10 | Sprint Review | `S1_10_Sprint_Review.docx` | ☑ La reunión no se realizó; revisión del incremento hecha el 22-11 contra el código |
| 11 | Sprint Retrospective | `S1_11_Retrospective.docx` | ☑ Start / Stop / Continue y 6 acciones de mejora para el Sprint 2 |

Lo que debe contener cada documento está en el [README de 04_Gestion_Agil](../README.md).

Impedimentos del sprint (detalle en el documento 08):
- Render: respuestas en brotli ilegibles (resuelto) y servicios dormidos en el plan gratis (mitigado con 60 s de espera).
- La entrega de la Fase 2 cayó dentro del sprint (08 y 09-10).
- Del 13 al 16-10 no hubo dailies ni avance registrado.
- Los 9 commits del sprint entraron directo a `main`, sin Pull Request.
- La Sprint Review del 16-10 no se realizó.

Commits del sprint, para armar el Release:

```bash
git log origin/main --no-merges --since="2026-10-05 00:00" --until="2026-10-16 23:59" --format="%ad %an %s" --date=short
```
