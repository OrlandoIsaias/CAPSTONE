# Estimación, capacidad y velocidad

> Preparado el 27-11-2026 a partir de los documentos de los Sprints 1 a 4, el Product Backlog y el historial de Git. **Borrador para revisión del equipo:** las celdas amarillas de la planilla son propuestas o datos sin registro.

| # | Archivo | Qué contiene |
|---|---|---|
| E_01 | `E_01_Story_Points_Capacidad_Velocidad.xlsx` | Escala Fibonacci, las 20 historias de usuario y los 11 ítems técnicos con su talla, story points y justificación; capacidad por sprint e integrante; velocidad por sprint con gráfico. Los totales son fórmulas: si cambian una talla o un estado, todo se recalcula |
| E_02 | `E_02_Estimacion_Capacidad_y_Velocidad.docx` | Respuestas a las 7 preguntas de la defensa con los números del proyecto, preguntas probables y lo que falta confirmar |
| E_03 | `E_03_Grafico_Velocidad.png` | Puntos comprometidos y terminados por sprint, con la velocidad promedio |

## Los números

| Sprint | Capacidad (días-persona) | Comprometidos | Velocidad | Puntos por día-persona |
|---|---|---|---|---|
| Sprint 1 | 36 | 18 | 5 | 0,14 |
| Sprint 2 | 39 | 13 | 13 | 0,33 |
| Sprint 3 | 40 (a confirmar) | Sin registro | 0 | 0,00 |
| Sprint 4 | 40 (a confirmar) | Sin registro | 13 | 0,33 |
| **Promedio** | | | **7,75** | **0,20** |

- **Escala:** XS = 1, S = 2, M = 3, L = 5, XL = 8 (Fibonacci). Historia ancla: #14 «postular a una mascota» = 3 puntos.
- **Velocidad:** suma de los puntos de los ítems terminados en el sprint; un ítem a medias suma 0.
- **Capacidad:** días hábiles × 4 integrantes − días que cada uno no pudo trabajar.
- **Sprint 4:** #24 parte 1 (5), #24 parte 2 (3) y la normalización de la BD (N4, 5, no planificada).

## Qué tiene que revisar el equipo

1. Las tallas retroactivas del incremento base (#1 a #16 y #20 a #23), estimadas el 27-11 contra la historia ancla. Conviene validarlas en una sesión corta de Planning Poker.
2. Los días descontados de los Sprints 3 y 4 (hoja «Capacidad»).
3. Si hubo trabajo terminado en el Sprint 3 que no quedó en Git.
4. Si #8 y #22 se cierran: el código ya los cubre, pero el backlog los tiene pendientes.
5. Cargar los story points en GitHub Projects: en el proyecto, **Settings → New field → Number**, con el nombre «Story Points». Después, llenarlo en cada issue con la columna «Story points» de E_01.
