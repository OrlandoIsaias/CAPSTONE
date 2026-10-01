-- ============================================================
-- Migración 006 — Cuestionarios v2 (adoptante y mascota) y matching en 3 capas
-- Reemplaza las preguntas que no medían lo que importa (horas en casa, ritmo
-- de vida, "otras mascotas" sin distinguir perro de gato, niños sin edad) por
-- el set nuevo, y agrega la ficha de salud de la mascota y el desglose del
-- score en matches.
--
-- ROMPE COMPATIBILIDAD: elimina columnas que usa el código anterior; aplicar
-- junto con el backend actualizado. Las respuestas que cambian de significado
-- no se traducen: los adoptantes vuelven a responder su cuestionario.
-- Requiere la tabla mascotas vacía (sus preguntas nuevas son NOT NULL).
-- Idempotente: se puede ejecutar más de una vez sin error.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'mascotas' AND column_name = 'nivel_socializacion')
     AND EXISTS (SELECT 1 FROM mascotas) THEN
    RAISE EXCEPTION 'La migración 006 requiere la tabla mascotas vacía: sus preguntas nuevas son obligatorias.';
  END IF;
END $$;

-- ---------- perfiles_adoptante ----------
-- Se mantienen espacio_disponible, experiencia_previa y especie_preferida.

ALTER TABLE "perfiles_adoptante"
  DROP COLUMN IF EXISTS "tiempo_disponible_horas_dia",
  DROP COLUMN IF EXISTS "nivel_actividad_fisica",
  DROP COLUMN IF EXISTS "tiene_ninos",
  DROP COLUMN IF EXISTS "otras_mascotas";

ALTER TABLE "perfiles_adoptante"
  ADD COLUMN IF NOT EXISTS "restriccion_vivienda" varchar,
  ADD COLUMN IF NOT EXISTS "horas_sola" varchar,
  ADD COLUMN IF NOT EXISTS "tiempo_actividad" varchar,
  ADD COLUMN IF NOT EXISTS "ambiente_hogar" varchar,
  ADD COLUMN IF NOT EXISTS "ninos_hogar" varchar,
  ADD COLUMN IF NOT EXISTS "tiene_perros" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "tiene_gatos" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "alergias" varchar,
  ADD COLUMN IF NOT EXISTS "acepta_cuidados" varchar,
  ADD COLUMN IF NOT EXISTS "tamanos_preferidos" varchar[],
  ADD COLUMN IF NOT EXISTS "etapas_preferidas" varchar[],
  ADD COLUMN IF NOT EXISTS "sexo_preferido" varchar;

ALTER TABLE "perfiles_adoptante"
  DROP CONSTRAINT IF EXISTS chk_perfil_restriccion_vivienda,
  DROP CONSTRAINT IF EXISTS chk_perfil_horas_sola,
  DROP CONSTRAINT IF EXISTS chk_perfil_tiempo_actividad,
  DROP CONSTRAINT IF EXISTS chk_perfil_ambiente,
  DROP CONSTRAINT IF EXISTS chk_perfil_ninos,
  DROP CONSTRAINT IF EXISTS chk_perfil_alergias,
  DROP CONSTRAINT IF EXISTS chk_perfil_acepta_cuidados,
  DROP CONSTRAINT IF EXISTS chk_perfil_tamanos_preferidos,
  DROP CONSTRAINT IF EXISTS chk_perfil_etapas_preferidas,
  DROP CONSTRAINT IF EXISTS chk_perfil_sexo_preferido;

ALTER TABLE "perfiles_adoptante"
  ADD CONSTRAINT chk_perfil_restriccion_vivienda
    CHECK ("restriccion_vivienda" IN ('ninguna', 'solo_pequenas', 'solo_gatos', 'no_se')),
  ADD CONSTRAINT chk_perfil_horas_sola CHECK ("horas_sola" IN ('menos_2h', '2_4h', '4_8h', 'mas_8h')),
  ADD CONSTRAINT chk_perfil_tiempo_actividad CHECK ("tiempo_actividad" IN ('menos_30m', '30_60m', 'mas_60m')),
  ADD CONSTRAINT chk_perfil_ambiente CHECK ("ambiente_hogar" IN ('tranquilo', 'moderado', 'movido')),
  ADD CONSTRAINT chk_perfil_ninos CHECK ("ninos_hogar" IN ('no', 'mayores', 'pequenos')),
  ADD CONSTRAINT chk_perfil_alergias CHECK ("alergias" IN ('ninguna', 'perros', 'gatos', 'ambos')),
  ADD CONSTRAINT chk_perfil_acepta_cuidados CHECK ("acepta_cuidados" IN ('no', 'leves', 'complejos')),
  ADD CONSTRAINT chk_perfil_tamanos_preferidos
    CHECK ("tamanos_preferidos" IS NULL OR "tamanos_preferidos" <@ ARRAY['pequeno', 'mediano', 'grande']::varchar[]),
  ADD CONSTRAINT chk_perfil_etapas_preferidas
    CHECK ("etapas_preferidas" IS NULL OR "etapas_preferidas" <@ ARRAY['cachorro', 'joven', 'adulto', 'senior']::varchar[]),
  ADD CONSTRAINT chk_perfil_sexo_preferido CHECK ("sexo_preferido" IS NULL OR "sexo_preferido" IN ('macho', 'hembra'));

COMMENT ON COLUMN "perfiles_adoptante"."restriccion_vivienda" IS 'Condiciones del arriendo o edificio: ninguna | solo_pequenas | solo_gatos | no_se. Excluye mascotas no permitidas';
COMMENT ON COLUMN "perfiles_adoptante"."horas_sola" IS 'Horas seguidas que la mascota quedaría sola en un día normal. Se compara con mascotas.tolerancia_soledad';
COMMENT ON COLUMN "perfiles_adoptante"."tiempo_actividad" IS 'Tiempo diario para pasear o jugar. Se compara con mascotas.nivel_energia';
COMMENT ON COLUMN "perfiles_adoptante"."ambiente_hogar" IS 'Calma del hogar (personas, visitas, ruido). Se compara con mascotas.temperamento';
COMMENT ON COLUMN "perfiles_adoptante"."ninos_hogar" IS 'Niños que viven o visitan seguido: no | mayores (6+) | pequenos (menores de 6). Excluye según mascotas.convivencia_ninos';
COMMENT ON COLUMN "perfiles_adoptante"."alergias" IS 'Alergia en el hogar: ninguna | perros | gatos | ambos. Excluye esa especie';
COMMENT ON COLUMN "perfiles_adoptante"."acepta_cuidados" IS 'Cuidados especiales que puede asumir: no | leves | complejos. Excluye mascotas con mayor mascotas.nivel_cuidados';
COMMENT ON COLUMN "perfiles_adoptante"."tamanos_preferidos" IS 'Preferencia (solo perros); NULL = me da igual. Ordena, no excluye';
COMMENT ON COLUMN "perfiles_adoptante"."etapas_preferidas" IS 'Preferencia de etapa de vida; NULL = me da igual. Ordena, no excluye';
COMMENT ON COLUMN "perfiles_adoptante"."sexo_preferido" IS 'Preferencia; NULL = me da igual. Ordena, no excluye';

-- ---------- mascotas ----------
-- Se mantienen nivel_energia (actividad que necesita), nivel_experiencia_requerida,
-- espacio_minimo_requerido y cuidados_especiales (descripción de los cuidados).

ALTER TABLE "mascotas"
  DROP COLUMN IF EXISTS "nivel_socializacion",
  DROP COLUMN IF EXISTS "compatible_ninos",
  DROP COLUMN IF EXISTS "compatible_otras_mascotas";

ALTER TABLE "mascotas"
  ADD COLUMN IF NOT EXISTS "sexo" varchar NOT NULL,
  ADD COLUMN IF NOT EXISTS "tamano" varchar,
  ADD COLUMN IF NOT EXISTS "tolerancia_soledad" varchar NOT NULL,
  ADD COLUMN IF NOT EXISTS "temperamento" varchar NOT NULL,
  ADD COLUMN IF NOT EXISTS "convivencia_ninos" varchar,
  ADD COLUMN IF NOT EXISTS "convive_perros" boolean,
  ADD COLUMN IF NOT EXISTS "convive_gatos" boolean,
  ADD COLUMN IF NOT EXISTS "nivel_cuidados" varchar NOT NULL,
  ADD COLUMN IF NOT EXISTS "esterilizado" boolean,
  ADD COLUMN IF NOT EXISTS "vacunas_al_dia" boolean,
  ADD COLUMN IF NOT EXISTS "desparasitado" boolean,
  ADD COLUMN IF NOT EXISTS "microchip" boolean,
  ADD COLUMN IF NOT EXISTS "notas_salud" text;

ALTER TABLE "mascotas"
  ALTER COLUMN "edad" SET NOT NULL,
  ALTER COLUMN "nivel_energia" SET NOT NULL,
  ALTER COLUMN "nivel_experiencia_requerida" SET NOT NULL,
  ALTER COLUMN "espacio_minimo_requerido" SET NOT NULL;

ALTER TABLE "mascotas"
  DROP CONSTRAINT IF EXISTS chk_mascota_sexo,
  DROP CONSTRAINT IF EXISTS chk_mascota_tamano,
  DROP CONSTRAINT IF EXISTS chk_mascota_tamano_perro,
  DROP CONSTRAINT IF EXISTS chk_mascota_tolerancia_soledad,
  DROP CONSTRAINT IF EXISTS chk_mascota_temperamento,
  DROP CONSTRAINT IF EXISTS chk_mascota_convivencia_ninos,
  DROP CONSTRAINT IF EXISTS chk_mascota_nivel_cuidados,
  DROP CONSTRAINT IF EXISTS chk_mascota_cuidados_descritos;

ALTER TABLE "mascotas"
  ADD CONSTRAINT chk_mascota_sexo CHECK ("sexo" IN ('macho', 'hembra')),
  ADD CONSTRAINT chk_mascota_tamano CHECK ("tamano" IN ('pequeno', 'mediano', 'grande')),
  -- Tamaño adulto estimado: obligatorio en perros, no aplica a gatos.
  ADD CONSTRAINT chk_mascota_tamano_perro CHECK (("especie" = 'Perro') = ("tamano" IS NOT NULL)),
  ADD CONSTRAINT chk_mascota_tolerancia_soledad
    CHECK ("tolerancia_soledad" IN ('menos_2h', '2_4h', '4_8h', 'mas_8h')),
  ADD CONSTRAINT chk_mascota_temperamento CHECK ("temperamento" IN ('sociable', 'reservado', 'timido')),
  ADD CONSTRAINT chk_mascota_convivencia_ninos CHECK ("convivencia_ninos" IN ('todos', 'mayores', 'no')),
  ADD CONSTRAINT chk_mascota_nivel_cuidados CHECK ("nivel_cuidados" IN ('ninguno', 'leves', 'complejos')),
  -- Si necesita cuidados, el refugio debe describirlos.
  ADD CONSTRAINT chk_mascota_cuidados_descritos
    CHECK ("nivel_cuidados" = 'ninguno' OR coalesce(length(trim("cuidados_especiales")), 0) > 0);

COMMENT ON COLUMN "mascotas"."nivel_energia" IS 'Actividad diaria que necesita: bajo | medio | alto. Se compara con perfiles_adoptante.tiempo_actividad';
COMMENT ON COLUMN "mascotas"."tamano" IS 'Tamaño adulto estimado (solo perros): pequeno (hasta 10 kg) | mediano (10-25 kg) | grande (más de 25 kg)';
COMMENT ON COLUMN "mascotas"."tolerancia_soledad" IS 'Horas seguidas que puede quedarse sola tranquila. Se compara con perfiles_adoptante.horas_sola';
COMMENT ON COLUMN "mascotas"."temperamento" IS 'Relación con personas: sociable | reservado | timido (necesita un hogar tranquilo)';
COMMENT ON COLUMN "mascotas"."convivencia_ninos" IS 'todos (incluso menores de 6) | mayores (6+) | no; NULL = no evaluado (alerta, nunca excluye)';
COMMENT ON COLUMN "mascotas"."convive_perros" IS 'NULL = no evaluado (alerta, nunca excluye)';
COMMENT ON COLUMN "mascotas"."convive_gatos" IS 'NULL = no evaluado (alerta, nunca excluye)';
COMMENT ON COLUMN "mascotas"."nivel_cuidados" IS 'ninguno | leves (medicación, dieta) | complejos (enfermedad crónica, discapacidad); se describen en cuidados_especiales';
COMMENT ON COLUMN "mascotas"."notas_salud" IS 'Ficha de salud informativa (no puntúa), junto con esterilizado, vacunas_al_dia, desparasitado y microchip; NULL = sin información';

-- ---------- matches ----------
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "desglose" jsonb;
COMMENT ON COLUMN "matches"."desglose" IS 'Detalle del cálculo: puntaje por criterio, exclusiones, alertas y preferencias no cumplidas';
