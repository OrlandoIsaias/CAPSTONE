-- ============================================================
-- Migración 004 — Trazabilidad de mascotas de ejemplo (seed)
-- origen = 'seed' marca las mascotas creadas por seed/cargar_mascotas.py;
-- clave_seed permite re-ejecutar la carga sin duplicar y borrarlas en bloque.
-- Idempotente: se puede ejecutar más de una vez sin error.
-- ============================================================

ALTER TABLE "mascotas" ADD COLUMN IF NOT EXISTS "origen" varchar NOT NULL DEFAULT 'manual';
ALTER TABLE "mascotas" ADD COLUMN IF NOT EXISTS "clave_seed" varchar;

ALTER TABLE "mascotas" DROP CONSTRAINT IF EXISTS chk_mascota_origen;
ALTER TABLE "mascotas" ADD CONSTRAINT chk_mascota_origen CHECK ("origen" IN ('manual', 'seed'));

ALTER TABLE "mascotas" DROP CONSTRAINT IF EXISTS uq_mascota_clave_seed;
ALTER TABLE "mascotas" ADD CONSTRAINT uq_mascota_clave_seed UNIQUE ("clave_seed");

ALTER TABLE "mascotas" DROP CONSTRAINT IF EXISTS chk_mascota_seed_con_clave;
ALTER TABLE "mascotas" ADD CONSTRAINT chk_mascota_seed_con_clave
  CHECK (("origen" = 'seed') = ("clave_seed" IS NOT NULL));

COMMENT ON COLUMN "mascotas"."origen" IS 'manual = publicada por un refugio; seed = dato de ejemplo generado por script';
COMMENT ON COLUMN "mascotas"."clave_seed" IS 'Identificador estable del generador (seed-<rut>-<n>); NULL en mascotas manuales';
