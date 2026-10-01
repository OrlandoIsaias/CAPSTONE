# Base de Datos — HouseFound

Esta carpeta contiene el esquema completo de la base de datos del proyecto, su historial de cambios (migraciones) y la evidencia visual del modelo relacional. Los datos de ejemplo (mascotas sintéticas de los refugios de la nómina) se generan con los scripts de `Aplicación/seed/` (ver su README).

## Contenido de esta carpeta

| Archivo | Descripción |
|---|---|
| `BD_HouseFound_v2.sql` | Script SQL completo: crea las 10 tablas, sus relaciones, restricciones de negocio (`CHECK`), índices, y políticas de borrado. Ya incluye todos los cambios de las migraciones 001 a 006: para una BD nueva basta con este archivo. |
| `migraciones/` | Historial de cambios de esquema numerados (`001_...sql`), todos **ya aplicados en Neon**. Documentan cómo y por qué evolucionó el esquema; no se vuelven a ejecutar (la 005 fallaría después de la 006, que elimina columnas que ella comenta). Ver [Historial de migraciones](#historial-de-migraciones). |
| `datos/organizacion_prueba.sql` | Organización ficticia del equipo (RUT 11.111.111-1) para pruebas y demo del login de refugios. |
| `NOMINA_FINAL_FILTRADA_CON_REGION.xlsx` | Nómina SII de organizaciones de rescate animal. Es la fuente de la carga inicial de `organizaciones_validadas`; después de importada, la tabla es la fuente de verdad. |
| `BD_HouseFoundimg.png` | Diagrama entidad-relación (ER), generado con dbdiagram.io. **Desactualizado**: es anterior a las migraciones (muestra 8 tablas y las columnas del cuestionario antiguo); hay que regenerarlo desde `BD_HouseFound_v2.sql`. |

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

## Historial de migraciones

| Migración | Qué cambió |
|---|---|
| `001_organizaciones_validadas` | Crea la tabla con la nómina SII de organizaciones de rescate animal: solo una organización real puede operar como refugio. |
| `002_refugios_nomina_y_verificacion` | Login de refugios con RUT + código enviado al correo de la nómina (sin contraseña): liga cada refugio a una organización y crea `codigos_verificacion`. |
| `003_refugio_requiere_organizacion` | Hace obligatorio el vínculo refugio → organización, una vez ligados los refugios antiguos. |
| `004_mascotas_origen_seed` | Marca las mascotas de ejemplo (`origen = 'seed'`, `clave_seed`) para recargarlas sin duplicar y borrarlas en bloque. |
| `005_cuestionarios_matching` | Paso intermedio: especie preferida del adoptante y especie de la mascota de catálogo cerrado. |
| `006_cuestionarios_v2` | Cuestionarios nuevos del adoptante y la mascota para el matching en 3 capas, ficha de salud y desglose del score en `matches`. |

## Carga de la nómina SII y creación de refugios

Estos son los pasos con que se migró la BD de Neon (ya ejecutados; se conservan como registro). En una BD nueva creada con `BD_HouseFound_v2.sql` solo hacen falta `importar_nomina.py` y, si se quiere la organización de prueba, `datos/organizacion_prueba.sql`.

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

## Cuestionarios v2 (migración 006)

Reemplaza las preguntas del cuestionario del adoptante y de la ficha de la mascota por las del matching en 3 capas (exclusión, compatibilidad y preferencias; ver `Aplicación/backend/matching-service/scoring.py`), agrega la ficha de salud de la mascota y el desglose del score en `matches`. **Rompe compatibilidad**: elimina columnas que usa el código anterior, así que se aplica junto con el backend actualizado. Requiere la tabla `mascotas` vacía y se detiene sin cambiar nada si no lo está.

Ya aplicada en Neon el 2026-10-01, con respaldo previo de las filas eliminadas. Los adoptantes registrados antes deben volver a responder su cuestionario.

```
python scripts/aplicar_migracion.py "../../../Base de datos/migraciones/006_cuestionarios_v2.sql"
```

## Reglas de negocio reforzadas a nivel de base de datos

No solo se validan en el backend — están reforzadas directamente en el esquema, como última línea de defensa:

- **Valores permitidos por `CHECK`**: campos como `rol`, `estado`, `espacio_disponible`, `nivel_energia`, etc. solo aceptan los valores exactos definidos (ej. `rol` solo puede ser `'adoptante'` o `'refugio'`), nunca texto libre.
- **Rangos y coherencia**: `edad` de mascota nunca negativa, `score_compatibilidad` entre 0 y 1, el tamaño adulto se exige solo en perros y una mascota con cuidados especiales debe tenerlos descritos.
- **Sin duplicados donde no deben existir**: una mascota no puede tener dos fotos marcadas como principal a la vez; un match no se calcula dos veces para el mismo par adoptante-mascota (se actualiza); un adoptante no puede tener dos postulaciones *pendientes* a la misma mascota al mismo tiempo (pero sí puede volver a postular después de un rechazo).
- **Políticas de borrado explícitas (`ON DELETE`)**: los datos que representan historial de negocio (`matches`, `postulaciones`, `seguimientos_post_adopcion`) están protegidos con `RESTRICT`, para que nunca desaparezcan como efecto secundario de borrar otra fila. Los datos que son extensión directa de una cuenta (perfil de refugio, perfil de adoptante, fotos) sí se eliminan en cascada (`CASCADE`) si se borra su dueño.

## Cómo cargar este esquema en una base de datos nueva

1. Crea un proyecto nuevo en [Neon](https://neon.tech) (o cualquier PostgreSQL 14+).
2. Copia el connection string de tu base de datos.
3. Abre el **SQL Editor** de Neon (o conéctate con `psql`).
4. Pega el contenido completo de `BD_HouseFound_v2.sql` y ejecútalo.
5. Verifica que se crearon las 10 tablas: `SELECT table_name FROM information_schema.tables WHERE table_schema='public';`
6. Carga la nómina SII con `importar_nomina.py` (ver arriba) y, si quieres datos de ejemplo, las mascotas con `Aplicación/seed/` (ver su README).

No hace falta aplicar las migraciones: el esquema ya las incluye.

Este script fue probado ejecutándolo contra una instancia real de PostgreSQL, incluyendo pruebas deliberadas de violación de cada regla de negocio (valores inválidos, duplicados, borrados restringidos), confirmando que la base de datos las rechaza correctamente.

## Variables de entorno relacionadas

Cada uno de los 5 microservicios del backend necesita, en su propio archivo `.env` (nunca subido al repositorio):

```
DATABASE_URL=postgresql://usuario:password@host/basededatos?sslmode=require
```

El mismo `DATABASE_URL` se comparte entre todos los servicios, ya que todos apuntan a la misma base de datos física.
