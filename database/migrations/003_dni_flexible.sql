-- =====================================================
-- MIGRACIÓN 003: DNI FLEXIBLE PARA ALUMNOS EXTRANJEROS
-- Permite DNIs de 7, 8 o 9 dígitos
-- =====================================================

-- Modificar tabla usuarios: DNI hasta 9 dígitos
ALTER TABLE usuarios ALTER COLUMN dni TYPE VARCHAR(9);

-- Modificar tabla alumnos: DNI hasta 9 dígitos
ALTER TABLE alumnos ALTER COLUMN dni TYPE VARCHAR(9);

-- Comentarios
COMMENT ON COLUMN usuarios.dni IS 'DNI del usuario (7-9 dígitos, incluye alumnos extranjeros)';
COMMENT ON COLUMN alumnos.dni IS 'DNI del alumno (7-9 dígitos, incluye alumnos extranjeros)';

