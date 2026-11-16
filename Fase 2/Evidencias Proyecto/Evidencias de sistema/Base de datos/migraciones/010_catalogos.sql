-- =====================================================================
-- 010 - Catálogos: cada lista cerrada de valores pasa a su propia tabla
--
-- Antes, los valores permitidos de cada atributo (sexo, estado, nivel de
-- energía, etc.) estaban escritos en un CHECK dentro de la tabla. Ahora
-- viven en una tabla catálogo y la columna es una llave foránea hacia ella.
--
-- Criterios:
--   * Llave natural (el mismo código de texto de siempre, ej. 'macho'):
--     los datos y el código del backend/frontend no cambian.
--   * Un catálogo por dominio. Si dos columnas aceptan exactamente los
--     mismos valores, comparten catálogo (ej. sexo y sexo_preferido).
--     Si los valores difieren, son preguntas distintas y cada una tiene
--     el suyo (ej. experiencia_previa: ninguna/basica/alta frente a
--     nivel_experiencia_requerida: bajo/medio/alto).
--   * Se mantienen como CHECK solo las reglas que NO son una lista de
--     valores: reglas entre columnas (tamaño solo en perros, cuidados
--     descritos, contenido según tipo de mensaje, credenciales según rol),
--     rangos (edad, score, intentos, orden, duración, largo del texto) y
--     validaciones de formato (RUT, DV, correo en minúsculas).
--   * mascotas.origen queda con su CHECK: es redundante con clave_seed y
--     está pendiente decidir si se elimina.
--
-- Una sola fase: no cambia ningún valor ni tipo, así que es compatible
-- con el backend desplegado. Todo en una transacción.
-- =====================================================================

BEGIN;

-- ---------- 1. Tablas catálogo ----------

-- Cuentas
CREATE TABLE roles (codigo varchar(20) PRIMARY KEY, nombre varchar(60) NOT NULL);
INSERT INTO roles VALUES ('adoptante', 'Adoptante'), ('refugio', 'Refugio');

CREATE TABLE estados_usuario (codigo varchar(20) PRIMARY KEY, nombre varchar(60) NOT NULL);
INSERT INTO estados_usuario VALUES ('pendiente', 'Pendiente de activación'), ('activo', 'Activo');

-- Compartidos entre mascotas y perfiles_adoptante
CREATE TABLE sexos (codigo varchar(20) PRIMARY KEY, nombre varchar(60) NOT NULL);
INSERT INTO sexos VALUES ('macho', 'Macho'), ('hembra', 'Hembra');

CREATE TABLE tipos_espacio (codigo varchar(20) PRIMARY KEY, nombre varchar(60) NOT NULL);
INSERT INTO tipos_espacio VALUES
    ('departamento', 'Departamento'), ('casa_patio', 'Casa con patio'), ('casa_grande', 'Casa grande');

CREATE TABLE rangos_horas_sola (codigo varchar(20) PRIMARY KEY, nombre varchar(60) NOT NULL);
INSERT INTO rangos_horas_sola VALUES
    ('menos_2h', 'Menos de 2 horas'), ('2_4h', 'De 2 a 4 horas'),
    ('4_8h', 'De 4 a 8 horas'), ('mas_8h', 'Más de 8 horas');

-- Mascotas
CREATE TABLE estados_mascota (codigo varchar(20) PRIMARY KEY, nombre varchar(60) NOT NULL);
INSERT INTO estados_mascota VALUES
    ('disponible', 'Disponible'), ('en_proceso', 'En proceso de adopción'), ('adoptada', 'Adoptada');

CREATE TABLE niveles (codigo varchar(20) PRIMARY KEY, nombre varchar(60) NOT NULL);
INSERT INTO niveles VALUES ('bajo', 'Bajo'), ('medio', 'Medio'), ('alto', 'Alto');

CREATE TABLE temperamentos (codigo varchar(20) PRIMARY KEY, nombre varchar(60) NOT NULL);
INSERT INTO temperamentos VALUES ('sociable', 'Sociable'), ('reservado', 'Reservado'), ('timido', 'Tímido');

CREATE TABLE convivencias_ninos (codigo varchar(20) PRIMARY KEY, nombre varchar(60) NOT NULL);
INSERT INTO convivencias_ninos VALUES
    ('todos', 'Con niños de cualquier edad'), ('mayores', 'Solo con niños mayores'), ('no', 'Sin niños');

CREATE TABLE niveles_cuidado (codigo varchar(20) PRIMARY KEY, nombre varchar(60) NOT NULL);
INSERT INTO niveles_cuidado VALUES ('ninguno', 'Ninguno'), ('leves', 'Leves'), ('complejos', 'Complejos');

-- Cuestionario del adoptante
CREATE TABLE restricciones_vivienda (codigo varchar(20) PRIMARY KEY, nombre varchar(60) NOT NULL);
INSERT INTO restricciones_vivienda VALUES
    ('ninguna', 'Sin restricción'), ('solo_pequenas', 'Solo mascotas pequeñas'),
    ('solo_gatos', 'Solo gatos'), ('no_se', 'No lo sé');

CREATE TABLE tiempos_actividad (codigo varchar(20) PRIMARY KEY, nombre varchar(60) NOT NULL);
INSERT INTO tiempos_actividad VALUES
    ('menos_30m', 'Menos de 30 minutos'), ('30_60m', 'De 30 a 60 minutos'), ('mas_60m', 'Más de 60 minutos');

CREATE TABLE experiencias_previas (codigo varchar(20) PRIMARY KEY, nombre varchar(60) NOT NULL);
INSERT INTO experiencias_previas VALUES ('ninguna', 'Ninguna'), ('basica', 'Básica'), ('alta', 'Alta');

CREATE TABLE ambientes_hogar (codigo varchar(20) PRIMARY KEY, nombre varchar(60) NOT NULL);
INSERT INTO ambientes_hogar VALUES ('tranquilo', 'Tranquilo'), ('moderado', 'Moderado'), ('movido', 'Movido');

CREATE TABLE situaciones_ninos (codigo varchar(20) PRIMARY KEY, nombre varchar(60) NOT NULL);
INSERT INTO situaciones_ninos VALUES
    ('no', 'Sin niños'), ('mayores', 'Niños de 6 años o más'), ('pequenos', 'Niños menores de 6 años');

CREATE TABLE tipos_alergia (codigo varchar(20) PRIMARY KEY, nombre varchar(60) NOT NULL);
INSERT INTO tipos_alergia VALUES
    ('ninguna', 'Sin alergias'), ('perros', 'Alergia a perros'),
    ('gatos', 'Alergia a gatos'), ('ambos', 'Alergia a perros y gatos');

CREATE TABLE aceptaciones_cuidado (codigo varchar(20) PRIMARY KEY, nombre varchar(60) NOT NULL);
INSERT INTO aceptaciones_cuidado VALUES
    ('no', 'No acepta cuidados especiales'), ('leves', 'Acepta cuidados leves'),
    ('complejos', 'Acepta cuidados complejos');

-- Postulaciones, seguimiento y mensajería
CREATE TABLE estados_postulacion (codigo varchar(20) PRIMARY KEY, nombre varchar(60) NOT NULL);
INSERT INTO estados_postulacion VALUES
    ('pendiente', 'Pendiente'), ('aprobada', 'Aprobada'), ('rechazada', 'Rechazada');

CREATE TABLE resultados_seguimiento (codigo varchar(20) PRIMARY KEY, nombre varchar(60) NOT NULL);
INSERT INTO resultados_seguimiento VALUES
    ('exitosa', 'Adopción exitosa'), ('en_proceso', 'En proceso de adaptación'), ('devuelta', 'Mascota devuelta');

CREATE TABLE hitos_seguimiento (dias integer PRIMARY KEY, nombre varchar(60) NOT NULL);
INSERT INTO hitos_seguimiento VALUES (30, 'Encuesta a los 30 días'), (90, 'Encuesta a los 90 días');

CREATE TABLE tipos_mensaje (codigo varchar(20) PRIMARY KEY, nombre varchar(60) NOT NULL);
INSERT INTO tipos_mensaje VALUES
    ('texto', 'Texto'), ('imagen', 'Imagen'), ('audio', 'Audio'),
    ('video', 'Video'), ('encuesta', 'Respuesta de encuesta');

-- ---------- 2. Las columnas pasan de CHECK a llave foránea ----------

ALTER TABLE usuarios
    DROP CONSTRAINT chk_usuarios_rol,
    DROP CONSTRAINT chk_usuarios_estado,
    ADD CONSTRAINT fk_usuarios_rol    FOREIGN KEY (rol)    REFERENCES roles(codigo),
    ADD CONSTRAINT fk_usuarios_estado FOREIGN KEY (estado) REFERENCES estados_usuario(codigo);

ALTER TABLE mascotas
    DROP CONSTRAINT chk_mascota_estado,
    DROP CONSTRAINT chk_mascota_sexo,
    DROP CONSTRAINT chk_mascota_tamano,
    DROP CONSTRAINT chk_mascota_energia,
    DROP CONSTRAINT chk_mascota_experiencia_req,
    DROP CONSTRAINT chk_mascota_espacio_min,
    DROP CONSTRAINT chk_mascota_tolerancia_soledad,
    DROP CONSTRAINT chk_mascota_temperamento,
    DROP CONSTRAINT chk_mascota_convivencia_ninos,
    DROP CONSTRAINT chk_mascota_nivel_cuidados,
    ADD CONSTRAINT fk_mascotas_estado          FOREIGN KEY (estado)                      REFERENCES estados_mascota(codigo),
    ADD CONSTRAINT fk_mascotas_sexo            FOREIGN KEY (sexo)                        REFERENCES sexos(codigo),
    ADD CONSTRAINT fk_mascotas_tamano          FOREIGN KEY (tamano)                      REFERENCES tamanos(codigo),
    ADD CONSTRAINT fk_mascotas_nivel_energia   FOREIGN KEY (nivel_energia)               REFERENCES niveles(codigo),
    ADD CONSTRAINT fk_mascotas_experiencia_req FOREIGN KEY (nivel_experiencia_requerida) REFERENCES niveles(codigo),
    ADD CONSTRAINT fk_mascotas_espacio_min     FOREIGN KEY (espacio_minimo_requerido)    REFERENCES tipos_espacio(codigo),
    ADD CONSTRAINT fk_mascotas_tolerancia      FOREIGN KEY (tolerancia_soledad)          REFERENCES rangos_horas_sola(codigo),
    ADD CONSTRAINT fk_mascotas_temperamento    FOREIGN KEY (temperamento)                REFERENCES temperamentos(codigo),
    ADD CONSTRAINT fk_mascotas_convivencia     FOREIGN KEY (convivencia_ninos)           REFERENCES convivencias_ninos(codigo),
    ADD CONSTRAINT fk_mascotas_nivel_cuidados  FOREIGN KEY (nivel_cuidados)              REFERENCES niveles_cuidado(codigo);

ALTER TABLE perfiles_adoptante
    DROP CONSTRAINT chk_perfil_espacio,
    DROP CONSTRAINT chk_perfil_restriccion_vivienda,
    DROP CONSTRAINT chk_perfil_horas_sola,
    DROP CONSTRAINT chk_perfil_tiempo_actividad,
    DROP CONSTRAINT chk_perfil_experiencia,
    DROP CONSTRAINT chk_perfil_ambiente,
    DROP CONSTRAINT chk_perfil_ninos,
    DROP CONSTRAINT chk_perfil_alergias,
    DROP CONSTRAINT chk_perfil_acepta_cuidados,
    DROP CONSTRAINT chk_perfil_sexo_preferido,
    ADD CONSTRAINT fk_perfil_espacio          FOREIGN KEY (espacio_disponible)   REFERENCES tipos_espacio(codigo),
    ADD CONSTRAINT fk_perfil_restriccion      FOREIGN KEY (restriccion_vivienda) REFERENCES restricciones_vivienda(codigo),
    ADD CONSTRAINT fk_perfil_horas_sola       FOREIGN KEY (horas_sola)           REFERENCES rangos_horas_sola(codigo),
    ADD CONSTRAINT fk_perfil_tiempo_actividad FOREIGN KEY (tiempo_actividad)     REFERENCES tiempos_actividad(codigo),
    ADD CONSTRAINT fk_perfil_experiencia      FOREIGN KEY (experiencia_previa)   REFERENCES experiencias_previas(codigo),
    ADD CONSTRAINT fk_perfil_ambiente         FOREIGN KEY (ambiente_hogar)       REFERENCES ambientes_hogar(codigo),
    ADD CONSTRAINT fk_perfil_ninos            FOREIGN KEY (ninos_hogar)          REFERENCES situaciones_ninos(codigo),
    ADD CONSTRAINT fk_perfil_alergias         FOREIGN KEY (alergias)             REFERENCES tipos_alergia(codigo),
    ADD CONSTRAINT fk_perfil_acepta_cuidados  FOREIGN KEY (acepta_cuidados)      REFERENCES aceptaciones_cuidado(codigo),
    ADD CONSTRAINT fk_perfil_sexo_preferido   FOREIGN KEY (sexo_preferido)       REFERENCES sexos(codigo);

ALTER TABLE postulaciones
    DROP CONSTRAINT chk_postulacion_estado,
    ADD CONSTRAINT fk_postulaciones_estado FOREIGN KEY (estado) REFERENCES estados_postulacion(codigo);

ALTER TABLE seguimientos_post_adopcion
    DROP CONSTRAINT chk_seguimiento_resultado,
    DROP CONSTRAINT chk_seguimiento_dias,
    ADD CONSTRAINT fk_seguimientos_resultado FOREIGN KEY (resultado)          REFERENCES resultados_seguimiento(codigo),
    ADD CONSTRAINT fk_seguimientos_hito      FOREIGN KEY (dias_transcurridos) REFERENCES hitos_seguimiento(dias);

ALTER TABLE mensajes_seguimiento
    DROP CONSTRAINT chk_mensaje_tipo,
    ADD CONSTRAINT fk_mensajes_tipo FOREIGN KEY (tipo) REFERENCES tipos_mensaje(codigo);

-- Índices en las FK más consultadas por estado (los otros ya existían)
CREATE INDEX IF NOT EXISTS idx_seguimientos_resultado ON seguimientos_post_adopcion(resultado);

COMMIT;
