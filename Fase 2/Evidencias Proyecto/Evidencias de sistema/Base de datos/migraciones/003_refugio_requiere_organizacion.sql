-- ============================================================
-- Migración 003 — Todo refugio debe pertenecer a una organización de la nómina
-- Aplicar DESPUÉS de scripts/crear_refugios.py (que liga los refugios
-- existentes); falla si todavía queda algún refugio sin organización.
-- ============================================================

ALTER TABLE "refugios" ALTER COLUMN "organizacion_id" SET NOT NULL;
