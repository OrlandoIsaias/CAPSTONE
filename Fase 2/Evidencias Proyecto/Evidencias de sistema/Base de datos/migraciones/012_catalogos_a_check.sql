-- =====================================================================
-- 012 - Las listas de valores vuelven a CHECK (revierte la 010)
--
-- Decisión de diseño: solo son tablas los catálogos que la normalización
-- o el negocio hacen necesarios:
--   * tamanos y etapas_vida: las preferencias del adoptante (1FN, tablas
--     puente) necesitan una tabla a la cual apuntar. mascotas.tamano
--     conserva su FK a tamanos, porque comparte ese mismo dominio.
--   * especies y razas: la raza depende de la especie (FK compuesta).
--   * regiones y comunas: corrigen la dependencia comuna -> region (3FN).
-- El resto de las listas cerradas (estados, roles, sexo, niveles, etc.)
-- no tiene datos propios ni relaciones: su dominio se declara con CHECK.
-- La 3FN se cumple igual: un CHECK no crea dependencias entre atributos.
--
-- Una sola fase: no cambia ningún valor ni tipo, compatible con el backend.
-- =====================================================================

BEGIN;

-- ---------- usuarios ----------
ALTER TABLE usuarios
    DROP CONSTRAINT fk_usuarios_rol,
    DROP CONSTRAINT fk_usuarios_estado,
    ADD CONSTRAINT chk_usuarios_rol    CHECK (rol IN ('adoptante', 'refugio')),
    ADD CONSTRAINT chk_usuarios_estado CHECK (estado IN ('pendiente', 'activo'));

-- ---------- mascotas (tamano mantiene su FK a tamanos) ----------
ALTER TABLE mascotas
    DROP CONSTRAINT fk_mascotas_estado,
    DROP CONSTRAINT fk_mascotas_sexo,
    DROP CONSTRAINT fk_mascotas_nivel_energia,
    DROP CONSTRAINT fk_mascotas_experiencia_req,
    DROP CONSTRAINT fk_mascotas_espacio_min,
    DROP CONSTRAINT fk_mascotas_tolerancia,
    DROP CONSTRAINT fk_mascotas_temperamento,
    DROP CONSTRAINT fk_mascotas_convivencia,
    DROP CONSTRAINT fk_mascotas_nivel_cuidados,
    ADD CONSTRAINT chk_mascota_estado             CHECK (estado IN ('disponible', 'en_proceso', 'adoptada')),
    ADD CONSTRAINT chk_mascota_sexo               CHECK (sexo IN ('macho', 'hembra')),
    ADD CONSTRAINT chk_mascota_energia            CHECK (nivel_energia IN ('bajo', 'medio', 'alto')),
    ADD CONSTRAINT chk_mascota_experiencia_req    CHECK (nivel_experiencia_requerida IN ('bajo', 'medio', 'alto')),
    ADD CONSTRAINT chk_mascota_espacio_min        CHECK (espacio_minimo_requerido IN ('departamento', 'casa_patio', 'casa_grande')),
    ADD CONSTRAINT chk_mascota_tolerancia_soledad CHECK (tolerancia_soledad IN ('menos_2h', '2_4h', '4_8h', 'mas_8h')),
    ADD CONSTRAINT chk_mascota_temperamento       CHECK (temperamento IN ('sociable', 'reservado', 'timido')),
    ADD CONSTRAINT chk_mascota_convivencia_ninos  CHECK (convivencia_ninos IN ('todos', 'mayores', 'no')),
    ADD CONSTRAINT chk_mascota_nivel_cuidados     CHECK (nivel_cuidados IN ('ninguno', 'leves', 'complejos'));

-- ---------- perfiles_adoptante ----------
ALTER TABLE perfiles_adoptante
    DROP CONSTRAINT fk_perfil_espacio,
    DROP CONSTRAINT fk_perfil_restriccion,
    DROP CONSTRAINT fk_perfil_horas_sola,
    DROP CONSTRAINT fk_perfil_tiempo_actividad,
    DROP CONSTRAINT fk_perfil_experiencia,
    DROP CONSTRAINT fk_perfil_ambiente,
    DROP CONSTRAINT fk_perfil_ninos,
    DROP CONSTRAINT fk_perfil_alergias,
    DROP CONSTRAINT fk_perfil_acepta_cuidados,
    DROP CONSTRAINT fk_perfil_sexo_preferido,
    ADD CONSTRAINT chk_perfil_espacio              CHECK (espacio_disponible IN ('departamento', 'casa_patio', 'casa_grande')),
    ADD CONSTRAINT chk_perfil_restriccion_vivienda CHECK (restriccion_vivienda IN ('ninguna', 'solo_pequenas', 'solo_gatos', 'no_se')),
    ADD CONSTRAINT chk_perfil_horas_sola           CHECK (horas_sola IN ('menos_2h', '2_4h', '4_8h', 'mas_8h')),
    ADD CONSTRAINT chk_perfil_tiempo_actividad     CHECK (tiempo_actividad IN ('menos_30m', '30_60m', 'mas_60m')),
    ADD CONSTRAINT chk_perfil_experiencia          CHECK (experiencia_previa IN ('ninguna', 'basica', 'alta')),
    ADD CONSTRAINT chk_perfil_ambiente             CHECK (ambiente_hogar IN ('tranquilo', 'moderado', 'movido')),
    ADD CONSTRAINT chk_perfil_ninos                CHECK (ninos_hogar IN ('no', 'mayores', 'pequenos')),
    ADD CONSTRAINT chk_perfil_alergias             CHECK (alergias IN ('ninguna', 'perros', 'gatos', 'ambos')),
    ADD CONSTRAINT chk_perfil_acepta_cuidados      CHECK (acepta_cuidados IN ('no', 'leves', 'complejos')),
    ADD CONSTRAINT chk_perfil_sexo_preferido       CHECK (sexo_preferido IN ('macho', 'hembra'));

-- ---------- postulaciones, seguimiento y mensajes ----------
ALTER TABLE postulaciones
    DROP CONSTRAINT fk_postulaciones_estado,
    ADD CONSTRAINT chk_postulacion_estado CHECK (estado IN ('pendiente', 'aprobada', 'rechazada'));

ALTER TABLE seguimientos_post_adopcion
    DROP CONSTRAINT fk_seguimientos_resultado,
    DROP CONSTRAINT fk_seguimientos_hito,
    ADD CONSTRAINT chk_seguimiento_resultado CHECK (resultado IN ('exitosa', 'en_proceso', 'devuelta')),
    ADD CONSTRAINT chk_seguimiento_dias      CHECK (dias_transcurridos IN (30, 90));

ALTER TABLE mensajes_seguimiento
    DROP CONSTRAINT fk_mensajes_tipo,
    ADD CONSTRAINT chk_mensaje_tipo CHECK (tipo IN ('texto', 'imagen', 'audio', 'video', 'encuesta'));

-- ---------- catálogos que dejan de ser necesarios ----------
DROP TABLE roles, estados_usuario, sexos, tipos_espacio, rangos_horas_sola,
           estados_mascota, niveles, temperamentos, convivencias_ninos, niveles_cuidado,
           restricciones_vivienda, tiempos_actividad, experiencias_previas, ambientes_hogar,
           situaciones_ninos, tipos_alergia, aceptaciones_cuidado,
           estados_postulacion, resultados_seguimiento, hitos_seguimiento, tipos_mensaje;

COMMIT;
