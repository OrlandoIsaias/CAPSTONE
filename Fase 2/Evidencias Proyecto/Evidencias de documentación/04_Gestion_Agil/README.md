# Gestión ágil de HouseFound

El proyecto partió con **Kanban** mientras construíamos el incremento base y pasó a **Scrum** el 30-09-2026. Desde el 05-10 trabajamos en 4 sprints de dos semanas.

| Etapa | Fechas | Marco | Foco | Evidencias |
|---|---|---|---|---|
| Incremento base | 28-08 al 04-10 | Kanban (tablero hasta el 30-09) | Primera versión de los 6 servicios, el frontend y la base de datos | [00_Kanban_IncrementoBase](00_Kanban_IncrementoBase/) |
| Sprint 1 | 05-10 al 16-10 | Scrum | Seguimiento post-adopción, entrega de teléfonos y pruebas | [01_Sprint_1](01_Sprint_1/) |
| Sprint 2 | 19-10 al 30-10 | Scrum | Chat de seguimiento y encuestas a 30 y 90 días | [02_Sprint_2](02_Sprint_2/) |
| Sprint 3 | 02-11 al 13-11 | Scrum | Panel de métricas del refugio y pruebas automatizadas | [03_Sprint_3](03_Sprint_3/) |
| Sprint 4 | 16-11 al 27-11 | Scrum | App instalable (PWA), informe final y defensa | [04_Sprint_4](04_Sprint_4/) |

## Del Kanban a Scrum

El incremento base se construyó con un tablero Kanban porque los servicios dependen unos de otros y había que levantarlos todos a la vez. El 30-09 el equipo pasó a Scrum. Las razones del cambio, qué cambió y qué costó están en [K_03_Transicion_Kanban_a_Scrum.docx](00_Kanban_IncrementoBase/K_03_Transicion_Kanban_a_Scrum.docx).

## Los 11 documentos de cada sprint

Cada carpeta de sprint lleva estos documentos, en este orden. El nombre de cada archivo parte con el número del sprint, por ejemplo `S1_01_Product_Backlog.xlsx`.

| # | Documento | Qué debe contener | Formato |
|---|---|---|---|
| 01 | **Product Backlog** | Todos los ítems del producto al inicio del sprint, ordenados por prioridad, con su talla, su estado y el sprint asignado | `.xlsx` |
| 02 | **Criterios de aceptación** | Por cada ítem del sprint, sus criterios en formato Dado / Cuando / Entonces, y la columna «¿Cumple?», que se llena en la Review | `.docx` |
| 03 | **Sprint Planning** | Fecha y participantes, objetivo del sprint, capacidad del equipo e ítems seleccionados con su talla y su responsable | `.docx` |
| 04 | **Sprint Backlog** | Los ítems del sprint divididos en tareas, cada una con responsable, estado y fecha de cierre | `.xlsx` |
| 05 | **Scrumboard** | El tablero con sus columnas (Por hacer, En progreso, En revisión, Hecho) y la fecha visible | Capturas `.png` al inicio, a mitad y al cierre |
| 06 | **Burndown Chart** | Los puntos que quedan pendientes en cada día hábil del sprint, con la línea ideal y la real | `.xlsx` con el gráfico, más un `.png` |
| 07 | **Daily Meeting** | Una fila por día hábil: modalidad (WhatsApp o Discord), si se realizó, el avance del día y los impedimentos; y, por integrante, qué hizo y cuál es su siguiente tarea | `.xlsx` (más el chat exportado, si se conservó) |
| 08 | **Registro de impedimentos** | N°, fecha, impedimento, quién lo reportó, impacto, acción, responsable, fecha de cierre y estado. Si no hubo impedimentos, el archivo lo dice | `.xlsx` |
| 09 | **Release** | Versión, fecha, URL publicada, ítems terminados (#issue y PR), correcciones y problemas conocidos | `.md` o `.docx` |
| 10 | **Sprint Review** | Si se cumplió el objetivo, qué se demostró y qué ítems aceptó o rechazó el PO según sus criterios de aceptación (documento 02) | Acta `.docx` |
| 11 | **Sprint Retrospective** | Start / Stop / Continue, acciones de mejora con su responsable, y revisión de las acciones de la retro anterior | Acta `.docx` |

## Estimación: tallas de camiseta (T-shirt sizing)

El equipo estima con tallas en vez de números. Así se usa a lo largo del sprint:

1. **Al estimar** (en el refinamiento y al inicio de la Sprint Planning), el equipo le pone una talla a cada ítem pendiente del **Product Backlog (01)**, en la columna «Talla».
2. **Al planificar**, el equipo elige ítems según su capacidad, y las tallas pasan a la tabla de ítems seleccionados del **Sprint Planning (03)** y al **Sprint Backlog (04)**.
3. **Al medir**, cada talla se convierte a puntos para dibujar el **Burndown (06)**.

| Talla | Puntos | Qué significa |
|---|---|---|
| XS | 1 | Cambio mínimo y conocido |
| S | 2 | Pequeño: un servicio o una pantalla |
| M | 3 | Mediano: backend y frontend, o configurar algo nuevo |
| L | 5 | Grande: varias pantallas o servicios, con algo de incertidumbre |
| XL | 8 | Muy grande: se divide antes de entrar a un sprint |

Los story points de cada historia de usuario, la capacidad y la velocidad de los 4 sprints están en [05_Estimacion_Capacidad_Velocidad](05_Estimacion_Capacidad_Velocidad/).

Versiones sugeridas para el Release: Sprint 1 = `v0.1.0`, Sprint 2 = `v0.2.0`, Sprint 3 = `v0.3.0` y Sprint 4 = `v1.0.0` (entrega final).

> Si un documento se escribe después del sprint, se arma con datos reales (issues, commits y el chat) y lo dice al inicio: "Reconstruido el dd-mm a partir de …".
