# Base de Datos — HouseFound

Esta carpeta contiene el esquema completo de la base de datos del proyecto, la evidencia visual del modelo relacional, y (cuando esté disponible) el script de datos de prueba.

## Contenido de esta carpeta

| Archivo | Descripción |
|---|---|
| `BD_HouseFound_v2.sql` | Script SQL completo: crea las 10 tablas, sus relaciones, restricciones de negocio (`CHECK`), índices, y políticas de borrado. Es el script real usado para crear la base de datos en Neon. |
| `migraciones/` | Cambios de esquema numerados (`001_...sql`) para aplicar sobre una BD que ya existe. Son idempotentes. |
| `NOMINA_FINAL_FILTRADA_CON_REGION.xlsx` | Nómina SII de organizaciones de rescate animal. Es la fuente de la carga inicial de `organizaciones_validadas`; después de importada, la tabla es la fuente de verdad. |
| `BD_HouseFoundimg.png` | Diagrama entidad-relación (ER), generado con dbdiagram.io, mostrando visualmente las 8 tablas y sus relaciones. |
| `seed_data.sql` *(pendiente)* | Script de datos de prueba (refugios, mascotas y adoptantes ficticios pero realistas), para poblar la base de datos y poder probar el frontend con datos de ejemplo. |

## Motor de base de datos

**PostgreSQL**, alojado en **Neon** (plan gratuito). Se eligió una única base de datos **compartida** entre los 5 microservicios del backend (no una por servicio), porque el algoritmo de matching y el futuro modelo de Machine Learning necesitan cruzar datos de varias tablas (perfil del adoptante, mascota, seguimiento) sin requerir procesos de integración adicionales.

## Las 10 tablas y su propósito

| Tabla | Qué guarda |
|---|---|
| `usuarios` | La cuenta base de cada persona (nombre, rol `adoptante` o `refugio`, estado `pendiente`/`activo`). Los adoptantes tienen email y contraseña hasheada; los refugios no, porque entran con RUT + código. |
| `refugios` | Datos del refugio (extensión 1-a-1 de un usuario con rol `refugio`), ligado obligatoriamente a una organización de la nómina SII. |
| `perfiles_adoptante` | El cuestionario de estilo de vida del adoptante (extensión 1-a-1 de un usuario con rol `adoptante`). |
| `mascotas` | Cada mascota publicada por un refugio, con su temperamento y necesidades estructuradas. |
| `fotos_mascota` | Las fotos de cada mascota (URLs de Cloudinary), con una marcada como principal. |
| `matches` | El score de compatibilidad calculado entre un adoptante y una mascota. |
| `postulaciones` | Las solicitudes de adopción y su estado (`pendiente`, `aprobada`, `rechazada`). |
| `seguimientos_post_adopcion` | Las encuestas de seguimiento a 30 y 90 días después de una adopción aprobada. |
| `organizaciones_validadas` | Nómina SII de organizaciones habilitadas como refugio (RUT, razón social, dirección, región y el correo al que se envía el código de verificación del login institucional). |
| `codigos_verificacion` | Códigos de 6 dígitos del login institucional, guardados hasheados, con vencimiento, contador de intentos y marca de uso único. |

## Carga de la nómina SII y creación de refugios

Desde `Aplicación/backend/auth-service`, con su venv activo:

```
pip install -r scripts/requirements.txt
python scripts/aplicar_migracion.py "../../../Base de datos/migraciones/001_organizaciones_validadas.sql"
python scripts/importar_nomina.py "../../../Base de datos/NOMINA_FINAL_FILTRADA_CON_REGION.xlsx" --dry-run
python scripts/importar_nomina.py "../../../Base de datos/NOMINA_FINAL_FILTRADA_CON_REGION.xlsx"
python scripts/aplicar_migracion.py "../../../Base de datos/datos/organizacion_prueba.sql"
python scripts/aplicar_migracion.py "../../../Base de datos/migraciones/002_refugios_nomina_y_verificacion.sql"
python scripts/crear_refugios.py --vincular 10:11111111 --dry-run
python scripts/crear_refugios.py --vincular 10:11111111
python scripts/aplicar_migracion.py "../../../Base de datos/migraciones/003_refugio_requiere_organizacion.sql"
```

`crear_refugios.py` crea una cuenta de refugio **pendiente** (sin contraseña) por cada organización que aún no tenga refugio, y `--vincular` liga un refugio que ya existía a una organización (el refugio 10, creado antes de la nómina, quedó ligado a la organización de prueba RUT 11.111.111-1, conservando sus mascotas y postulaciones). Se puede volver a ejecutar sin duplicar.

El importador valida el dígito verificador de cada RUT (módulo 11) y es todo o nada: si una fila es inválida, no escribe ninguna. Se puede volver a ejecutar sin duplicar (actualiza por RUT) y nunca borra un correo ya cargado en la BD.

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
5. Verifica que se crearon las 10 tablas: `SELECT table_name FROM information_schema.tables WHERE table_schema='public';`

Este script fue probado ejecutándolo contra una instancia real de PostgreSQL, incluyendo pruebas deliberadas de violación de cada regla de negocio (valores inválidos, duplicados, borrados restringidos), confirmando que la base de datos las rechaza correctamente.

## Variables de entorno relacionadas

Cada uno de los 5 microservicios del backend necesita, en su propio archivo `.env` (nunca subido al repositorio):

```
DATABASE_URL=postgresql://usuario:password@host/basededatos?sslmode=require
```

El mismo `DATABASE_URL` se comparte entre todos los servicios, ya que todos apuntan a la misma base de datos física.
