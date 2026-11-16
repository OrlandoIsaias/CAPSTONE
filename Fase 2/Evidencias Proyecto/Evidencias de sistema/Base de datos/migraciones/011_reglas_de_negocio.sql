-- =====================================================================
-- 011 - Ajustes del modelo a las reglas del negocio
--
-- P1. La postulación guarda la compatibilidad con la que se postuló.
--     matches tiene un solo puntaje por adoptante-mascota y se recalcula
--     cada vez que el adoptante abre Recomendaciones o edita su
--     cuestionario. Sin una copia, se pierde el puntaje con el que el
--     refugio decidió, y el indicador de éxito "puntaje promedio de las
--     adopciones exitosas frente a las devueltas" (Análisis del Caso,
--     sección 7) mediría otra cosa. No es redundancia: es un hecho
--     histórico (el valor en un momento), con otro significado que el
--     cálculo vigente de matches.
-- P2. Un seguimiento solo existe cuando el adoptante responde la
--     encuesta: resultado y fecha de respuesta son obligatorios, y una
--     devolución exige su motivo (la tasa de devolución depende de esto).
-- P3. La fecha de adopción solo existe en una postulación aprobada (RN02).
-- P4. mascotas.origen se elimina: era redundante con clave_seed
--     (origen = 'seed' si y solo si clave_seed tiene valor).
--
-- Fase A: compatible con el backend anterior y con el nuevo.
-- Fase B: elimina mascotas.origen. Ejecutar SOLO con el backend nuevo
--         desplegado (el anterior todavía escribe esa columna).
-- =====================================================================

-- ---------- Fase A ----------
BEGIN;

-- P1
ALTER TABLE postulaciones
    ADD COLUMN score_al_postular   numeric(4,3),
    ADD COLUMN desglose_al_postular jsonb,
    ADD CONSTRAINT chk_postulacion_score
        CHECK (score_al_postular IS NULL OR (score_al_postular >= 0 AND score_al_postular <= 1));

COMMENT ON COLUMN postulaciones.score_al_postular IS
    'Compatibilidad (0 a 1) al momento de postular, copiada de matches. No cambia aunque el adoptante edite su cuestionario.';
COMMENT ON COLUMN postulaciones.desglose_al_postular IS
    'Desglose del puntaje al momento de postular (mismo formato que matches.desglose).';

-- Postulaciones existentes: se copia el cálculo vigente, que es el mejor dato disponible.
UPDATE postulaciones p
SET score_al_postular = m.score_compatibilidad,
    desglose_al_postular = m.desglose
FROM matches m
WHERE m.adoptante_id = p.adoptante_id AND m.mascota_id = p.mascota_id;

-- P2
ALTER TABLE seguimientos_post_adopcion
    ALTER COLUMN resultado SET NOT NULL,
    ALTER COLUMN fecha_respuesta SET NOT NULL,
    ADD CONSTRAINT chk_seguimiento_motivo_devolucion
        CHECK (resultado <> 'devuelta' OR length(trim(coalesce(motivo_devolucion, ''))) > 0);

-- P3
ALTER TABLE postulaciones
    ADD CONSTRAINT chk_postulacion_fecha_adopcion
        CHECK (fecha_adopcion IS NULL OR estado = 'aprobada');

COMMIT;

-- ---------- Fase B (con el backend nuevo ya desplegado) ----------
BEGIN;
-- P4: elimina también chk_mascota_origen y chk_mascota_seed_con_clave
ALTER TABLE mascotas DROP COLUMN origen;
COMMIT;
