-- =====================================================================
-- 008 - Normalización: primera forma normal (1FN)
-- Aplicada en Neon el 2026-11-16.
--
-- 1FN exige que cada celda tenga un solo valor y que toda tabla tenga PK.
--   * respaldo_mascotas_refugio no tenía PK: se elimina (era un respaldo
--     temporal sin relación con el resto del modelo).
--   * perfiles_adoptante.tamanos_preferidos y etapas_preferidas eran
--     arreglos (varios valores en una celda): pasan a tablas puente,
--     un valor por fila. Sin filas = "me da igual".
--
-- Se aplicó en dos pasos para no romper la app desplegada:
--   Paso 1: crear catálogos y tablas puente y copiar los datos.
--   Paso 2 (después de desplegar el backend que usa las tablas puente):
--           eliminar las columnas de arreglo.
-- =====================================================================

-- ---------- Paso 1 ----------
BEGIN;

DROP TABLE IF EXISTS respaldo_mascotas_refugio;

CREATE TABLE tamanos (
    codigo varchar(20) PRIMARY KEY,
    nombre varchar(50) NOT NULL
);
INSERT INTO tamanos (codigo, nombre) VALUES
    ('pequeno', 'Pequeño'),
    ('mediano', 'Mediano'),
    ('grande',  'Grande');

CREATE TABLE etapas_vida (
    codigo varchar(20) PRIMARY KEY,
    nombre varchar(50) NOT NULL
);
INSERT INTO etapas_vida (codigo, nombre) VALUES
    ('cachorro', 'Cachorro'),
    ('joven',    'Joven'),
    ('adulto',   'Adulto'),
    ('senior',   'Senior');

CREATE TABLE perfil_tamano_preferido (
    perfil_id integer     NOT NULL REFERENCES perfiles_adoptante(id) ON DELETE CASCADE,
    tamano    varchar(20) NOT NULL REFERENCES tamanos(codigo),
    PRIMARY KEY (perfil_id, tamano)
);

CREATE TABLE perfil_etapa_preferida (
    perfil_id integer     NOT NULL REFERENCES perfiles_adoptante(id) ON DELETE CASCADE,
    etapa     varchar(20) NOT NULL REFERENCES etapas_vida(codigo),
    PRIMARY KEY (perfil_id, etapa)
);

INSERT INTO perfil_tamano_preferido (perfil_id, tamano)
SELECT DISTINCT p.id, t.valor
FROM perfiles_adoptante p
CROSS JOIN LATERAL unnest(p.tamanos_preferidos) AS t(valor);

INSERT INTO perfil_etapa_preferida (perfil_id, etapa)
SELECT DISTINCT p.id, e.valor
FROM perfiles_adoptante p
CROSS JOIN LATERAL unnest(p.etapas_preferidas) AS e(valor);

COMMIT;

-- ---------- Paso 2 (con el backend nuevo ya desplegado) ----------
BEGIN;
ALTER TABLE perfiles_adoptante
    DROP COLUMN tamanos_preferidos,
    DROP COLUMN etapas_preferidas;
COMMIT;
