# Sprint 4 · 16-11 al 27-11-2026

> Reconstruido el 27-11-2026 a partir del [README de gestión ágil](../README.md) y el historial de Git. No es un acta escrita durante el sprint.

## Foco previsto

App instalable (PWA), informe final y defensa, según el README de gestión ágil (subido el 22-11, `c8afd3f`). No hay registro de Sprint Planning, capacidad, puntos comprometidos ni Sprint Backlog.

La instalación como app (PWA) sigue pendiente en el [README del proyecto](../../../../../README.md).

## Trabajo registrado en Git

La columna «Autor» es el autor del commit; no indica por sí sola quiénes participaron en el trabajo.

### Base de datos

| Fecha | Commit | Cambio | Autor |
|---|---|---|---|
| 16-11 | `0260782` | Preferencias de tamaño y etapa en tablas puente (1FN) | Orlando Espinoza |
| 16-11 | `fb1f03a` | Normalización 3FN: regiones, comunas, especies y razas; se quita `autor_rol` (migraciones 008 y 009) | Orlando Espinoza |
| 16-11 | `cb683c4` | Catálogos, puntaje guardado al postular y se quita `mascotas.origen` (migraciones 010 y 011) | Orlando Espinoza |
| 16-11 | `f5b92fc` | Cambios al modelo normalizado (migración 012 y diagramas) | Orlando Espinoza |
| 22-11 | `c9e2b10` | Script SQL, SPEC y guías actualizados con la base normalizada | Martín Guzmán |

El [README de la base de datos](<../../../Evidencias de sistema/Base de datos/README_BaseDeDatos.md>) indica que el script actual todavía no se ha ejecutado desde cero en una base vacía.

### Documentación

| Fecha | Commit | Cambio | Autor |
|---|---|---|---|
| 22-11 | `9ab413e` | Se quita la Definition of Done de los documentos | Martín Guzmán |
| 22-11 | `0ace60e` | Documentos del Sprint 1 | Orlando Espinoza |
| 22-11 | `c8afd3f` | Documentos de Kanban y README de gestión ágil | Orlando Espinoza |
| 23-11 | `ee0e6f1` | Documentos del Sprint 2 | Martín Guzmán |

### Pruebas

| Fecha | Commit | Cambio | Autor |
|---|---|---|---|
| 27-11 | `da6ac36` | «Pruebas a los 5 microservicios»: 31 pruebas nuevas y actualización del README, la guía y el SPEC | Martín Guzmán |

Los cinco componentes con pruebas nuevas son matching, seguimiento, postulaciones, mascotas y API Gateway. auth-service no tiene pruebas automatizadas.

| Servicio | Pruebas nuevas | Total acumulado |
|---|---|---|
| matching-service | 3 | 27 |
| seguimiento-service | 4 | 23 |
| postulaciones-service | 11 | 11 |
| mascotas-service | 6 | 6 |
| api-gateway | 7 | 7 |
| **Total** | **31** | **74** |

El total son 51 unitarias y 23 de integración; incluye 43 pruebas que ya existían.

**Resultado:** las 74 tuvieron una ejecución exitosa el 27-11, en entornos temporales. La ejecución fue por grupos, antes de revisar el commit, no en una sola corrida sobre `da6ac36`. Las de integración usan SQLite en memoria o servicios simulados: no prueban PostgreSQL, la concurrencia ni la comunicación entre microservicios reales. El detalle está en la [Guía del proyecto, sección 9](../../../../../GUIA_DEL_PROYECTO.md#9-calidad-y-pruebas).

## Revisión final del repositorio

Es una revisión de las evidencias, **no el acta de una Sprint Review**.

| Área | Estado | Pendiente |
|---|---|---|
| Base de datos | Modelo documentado hasta 3FN | Ejecutar el script actual en una base vacía de pruebas |
| Pruebas | 74 pruebas automatizadas del backend | auth-service, frontend, PostgreSQL, concurrencia, aceptación y rendimiento |
| PWA | Pendiente | Implementar la instalación como app |
| Métricas del refugio | El backend las calcula | Pantalla |
| Informe final y defensa | Sin cierre verificado en esta revisión | Confirmar con el equipo |

## Documentos del sprint

| # | Documento | Archivo | Estado |
|---|---|---|---|
| 01 | Product Backlog | [S4_01_Product_Backlog.xlsx](S4_01_Product_Backlog.xlsx) | Pendientes tomados del Sprint 2 |
| 02 | Criterios de aceptación | [S4_02_Criterios_de_Aceptacion.docx](S4_02_Criterios_de_Aceptacion.docx) | Sin registro |
| 03 | Sprint Planning | [S4_03_Sprint_Planning.docx](S4_03_Sprint_Planning.docx) | Foco previsto; sin acta |
| 04 | Sprint Backlog | [S4_04_Sprint_Backlog.xlsx](S4_04_Sprint_Backlog.xlsx) | Trabajo registrado en Git |
| 05 | Scrumboard | — | Sin registro; no hay capturas |
| 06 | Burndown Chart | [S4_06_Burndown.xlsx](S4_06_Burndown.xlsx) | Sin datos; no hay gráfico |
| 07 | Daily Meeting | [S4_07_Daily.xlsx](S4_07_Daily.xlsx) | Sin registro; se muestran los commits por día |
| 08 | Registro de impedimentos | [S4_08_Registro_Impedimentos.xlsx](S4_08_Registro_Impedimentos.xlsx) | Sin registro |
| 09 | Release | [S4_09_Release_v1.0.0.md](S4_09_Release_v1.0.0.md) | Cambios registrados en Git |
| 10 | Sprint Review | [S4_10_Sprint_Review.docx](S4_10_Sprint_Review.docx) | Sin reunión registrada; incluye revisión del repositorio |
| 11 | Sprint Retrospective | [S4_11_Retrospective.docx](S4_11_Retrospective.docx) | Sin registro |

Velocidad: sin registro.
