-- Organización ficticia del equipo para pruebas y demo (es_prueba = true).
-- Idempotente: si ya existe, no hace nada.
INSERT INTO organizaciones_validadas
  (rut, dv, razon_social, actividad, unidad_sii, direccion, comuna, region, fecha_inscripcion, correo, es_prueba)
VALUES
  (11111111, '1', 'FUNDACION PRUEBA HOUSEFOUND', 'Organización ficticia para pruebas y demostración',
   'SANTIAGO CENTRO', 'AV. PRUEBA 123', 'SANTIAGO', 'METROPOLITANA', '2026-09-30',
   'pa.carcamos@duocuc.cl', true)
ON CONFLICT (rut) DO NOTHING;

UPDATE organizaciones_validadas
SET correo = 'pa.carcamos@duocuc.cl', fecha_actualizacion = now()
WHERE rut = 11111111 AND correo IS DISTINCT FROM 'pa.carcamos@duocuc.cl';
