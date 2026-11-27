# Release · Sprint 4 (v1.0.0 sugerida)

16-11-2026 al 27-11-2026

> Reconstruido el 27-11-2026 a partir del README de gestión ágil, los documentos del Sprint 2 y el historial de Git. No es un documento escrito durante el sprint.

**Estado:** sin notas de versión escritas durante el sprint ni tag de Git; la versión es la sugerida en el README de gestión ágil.

## Cambios registrados en Git

| Fecha | Commit | Cambio | Autor del commit |
|---|---|---|---|
| 16-11 | `0260782` | Preferencias de tamaño y etapa en tablas puente (1FN) | Orlando Espinoza |
| 16-11 | `fb1f03a` | Normalización 3FN (migraciones 008 y 009) | Orlando Espinoza |
| 16-11 | `cb683c4` | Catálogos y puntaje guardado al postular (migraciones 010 y 011) | Orlando Espinoza |
| 16-11 | `f5b92fc` | Ajustes al modelo normalizado (migración 012) | Orlando Espinoza |
| 22-11 | `c9e2b10` | SQL, SPEC y guías con la base normalizada | Martín Guzmán |
| 22-11 | `9ab413e` | Se quita la Definition of Done de los documentos | Martín Guzmán |
| 22-11 | `0ace60e` | Documentos del Sprint 1 | Orlando Espinoza |
| 22-11 | `c8afd3f` | Documentos de Kanban y README de gestión ágil | Orlando Espinoza |
| 23-11 | `ee0e6f1` | Documentos del Sprint 2 | Martín Guzmán |
| 27-11 | `da6ac36` | Pruebas a 5 componentes: 31 nuevas, 74 en total | Martín Guzmán |

## Pruebas

74 pruebas automatizadas del backend (51 unitarias y 23 de integración): 43 anteriores y 31 nuevas. Tuvieron una ejecución exitosa el 27-11, por grupos y en entornos temporales, antes de revisar el commit. Las de integración usan SQLite en memoria o servicios simulados.

## Pendientes

- PWA y pantalla de métricas.
- Pruebas de auth-service, del frontend, con PostgreSQL y de concurrencia.
- Ejecutar el script SQL actual en una base vacía de pruebas.
