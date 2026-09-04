# Base de Datos — HouseFound

Esta carpeta contiene el esquema completo de la base de datos del proyecto, la evidencia visual del modelo relacional, y (cuando esté disponible) el script de datos de prueba.

## Contenido de esta carpeta

| Archivo | Descripción |
|---|---|
| `BD_HouseFound_v2.sql` | Script SQL completo: crea las 8 tablas, sus relaciones, restricciones de negocio (`CHECK`), índices, y políticas de borrado. Es el script real usado para crear la base de datos en Neon. |
| `BD_HouseFoundimg.png` | Diagrama entidad-relación (ER), generado con dbdiagram.io, mostrando visualmente las 8 tablas y sus relaciones. |
| `seed_data.sql` *(pendiente)* | Script de datos de prueba (refugios, mascotas y adoptantes ficticios pero realistas), para poblar la base de datos y poder probar el frontend con datos de ejemplo. |

## Motor de base de datos

**PostgreSQL**, alojado en **Neon** (plan gratuito). Se eligió una única base de datos **compartida** entre los 5 microservicios del backend (no una por servicio), porque el algoritmo de matching y el futuro modelo de Machine Learning necesitan cruzar datos de varias tablas (perfil del adoptante, mascota, seguimiento) sin requerir procesos de integración adicionales.

## Las 8 tablas y su propósito

| Tabla | Qué guarda |
|---|---|
| `usuarios` | La cuenta base de cada persona (nombre, email, contraseña hasheada, rol: `adoptante` o `refugio`). |
| `refugios` | Datos del refugio (extensión 1-a-1 de un usuario con rol `refugio`). |
| `perfiles_adoptante` | El cuestionario de estilo de vida del adoptante (extensión 1-a-1 de un usuario con rol `adoptante`). |
| `mascotas` | Cada mascota publicada por un refugio, con su temperamento y necesidades estructuradas. |
| `fotos_mascota` | Las fotos de cada mascota (URLs de Cloudinary), con una marcada como principal. |
| `matches` | El score de compatibilidad calculado entre un adoptante y una mascota. |
| `postulaciones` | Las solicitudes de adopción y su estado (`pendiente`, `aprobada`, `rechazada`). |
| `seguimientos_post_adopcion` | Las encuestas de seguimiento a 30 y 90 días después de una adopción aprobada. |

## Reglas de negocio reforzadas a nivel de base de datos

No solo se validan en el backend — están reforzadas directamente en el esquema, como última línea de defensa:

- **Valores permitidos por `CHECK`**: campos como `rol`, `estado`, `espacio_disponible`, `nivel_energia`, etc. solo aceptan los valores exactos definidos (ej. `rol` solo puede ser `'adoptante'` o `'refugio'`), nunca texto libre.
- **Rangos válidos**: `tiempo_disponible_horas_dia` entre 0 y 24, `edad` de mascota nunca negativa, `score_compatibilidad` entre 0 y 1.
- **Sin duplicados donde no deben existir**: una mascota no puede tener dos fotos marcadas como principal a la vez; un match no se calcula dos veces para el mismo par adoptante-mascota (se actualiza); un adoptante no puede tener dos postulaciones *pendientes* a la misma mascota al mismo tiempo (pero sí puede volver a postular después de un rechazo).
- **Políticas de borrado explícitas (`ON DELETE`)**: los datos que representan historial de negocio (`matches`, `postulaciones`, `seguimientos_post_adopcion`) están protegidos con `RESTRICT`, para que nunca desaparezcan como efecto secundario de borrar otra fila. Los datos que son extensión directa de una cuenta (perfil de refugio, perfil de adoptante, fotos) sí se eliminan en cascada (`CASCADE`) si se borra su dueño.

## Cómo cargar este esquema en una base de datos nueva

1. Crea un proyecto nuevo en [Neon](https://neon.tech) (o cualquier PostgreSQL 14+).
2. Copia el connection string de tu base de datos.
3. Abre el **SQL Editor** de Neon (o conéctate con `psql`).
4. Pega el contenido completo de `BD_HouseFound_v2.sql` y ejecútalo.
5. Verifica que se crearon las 8 tablas: `SELECT table_name FROM information_schema.tables WHERE table_schema='public';`

Este script fue probado ejecutándolo contra una instancia real de PostgreSQL, incluyendo pruebas deliberadas de violación de cada regla de negocio (valores inválidos, duplicados, borrados restringidos), confirmando que la base de datos las rechaza correctamente.

## Variables de entorno relacionadas

Cada uno de los 5 microservicios del backend necesita, en su propio archivo `.env` (nunca subido al repositorio):

```
DATABASE_URL=postgresql://usuario:password@host/basededatos?sslmode=require
```

El mismo `DATABASE_URL` se comparte entre todos los servicios, ya que todos apuntan a la misma base de datos física.
