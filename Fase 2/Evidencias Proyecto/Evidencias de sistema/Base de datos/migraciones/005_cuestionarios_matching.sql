-- ============================================================
-- Migración 005 — Cuestionarios de adoptante y mascota alineados con el matching
-- Solo agrega restricciones, columnas opcionales y documentación: el código
-- anterior sigue funcionando contra este esquema.
-- Idempotente: se puede ejecutar más de una vez sin error.
-- ============================================================

-- Especie que busca el adoptante; NULL = le da igual. Filtra sus recomendaciones.
ALTER TABLE "perfiles_adoptante" ADD COLUMN IF NOT EXISTS "especie_preferida" varchar;

ALTER TABLE "perfiles_adoptante" DROP CONSTRAINT IF EXISTS chk_perfil_especie_preferida;
ALTER TABLE "perfiles_adoptante" ADD CONSTRAINT chk_perfil_especie_preferida
  CHECK ("especie_preferida" IS NULL OR "especie_preferida" IN ('Perro', 'Gato'));

-- La especie de la mascota es obligatoria y de catálogo cerrado (la usa el filtro anterior).
ALTER TABLE "mascotas" DROP CONSTRAINT IF EXISTS chk_mascota_especie;
ALTER TABLE "mascotas" ADD CONSTRAINT chk_mascota_especie CHECK ("especie" IN ('Perro', 'Gato'));
ALTER TABLE "mascotas" ALTER COLUMN "especie" SET NOT NULL;

COMMENT ON COLUMN "perfiles_adoptante"."especie_preferida" IS 'Perro | Gato | NULL (sin preferencia); filtra las recomendaciones';
COMMENT ON COLUMN "perfiles_adoptante"."tiempo_disponible_horas_dia" IS 'Horas al día que alguien pasa en casa con la mascota (0-24). NULL = cuestionario sin responder';
COMMENT ON COLUMN "mascotas"."nivel_socializacion" IS 'Necesidad de compañía (nombre histórico de la columna): bajo = tolera estar sola varias horas; medio = puede quedarse sola algunas horas; alto = necesita compañía casi todo el día. Se compara con tiempo_disponible_horas_dia del adoptante';
