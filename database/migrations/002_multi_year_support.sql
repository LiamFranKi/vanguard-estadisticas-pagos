-- =====================================================
-- MIGRACIÓN 002: SOPORTE MULTI-AÑO Y MEJORAS
-- Sistema de Estadísticas de Pagos - Vanguard Schools
-- =====================================================

-- Tabla de años académicos disponibles
CREATE TABLE IF NOT EXISTS años_academicos (
    id SERIAL PRIMARY KEY,
    año INTEGER NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    activo BOOLEAN DEFAULT true,
    fecha_inicio DATE,
    fecha_fin DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Modificar índices para optimizar consultas por año
CREATE INDEX IF NOT EXISTS idx_pagos_año_academico ON pagos(año_academico);
CREATE INDEX IF NOT EXISTS idx_deudas_año_academico ON deudas(año_academico);
CREATE INDEX IF NOT EXISTS idx_alumnos_año_academico ON alumnos(año_academico);

-- Insertar años académicos disponibles (2022-2026)
INSERT INTO años_academicos (año, descripcion, activo, fecha_inicio, fecha_fin)
VALUES
    (2022, 'Año Académico 2022', true, '2022-03-01', '2022-12-31'),
    (2023, 'Año Académico 2023', true, '2023-03-01', '2023-12-31'),
    (2024, 'Año Académico 2024', true, '2024-03-01', '2024-12-31'),
    (2025, 'Año Académico 2025', true, '2025-03-01', '2025-12-31'),
    (2026, 'Año Académico 2026', true, '2026-03-01', '2026-12-31')
ON CONFLICT (año) DO NOTHING;

-- Modificar tabla alumnos para permitir múltiples años (eliminar unique en dni)
ALTER TABLE alumnos DROP CONSTRAINT IF EXISTS alumnos_dni_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_alumnos_dni_año ON alumnos(dni, año_academico);

-- Vista para obtener años disponibles
CREATE OR REPLACE VIEW vista_años_disponibles AS
SELECT DISTINCT año_academico as año
FROM (
    SELECT año_academico FROM alumnos UNION
    SELECT año_academico FROM pagos UNION
    SELECT año_academico FROM deudas
) años
ORDER BY año DESC;

-- Trigger para actualizar updated_at en años_academicos
CREATE TRIGGER update_años_academicos_updated_at 
    BEFORE UPDATE ON años_academicos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE años_academicos IS 'Años académicos disponibles en el sistema';
COMMENT ON VIEW vista_años_disponibles IS 'Años académicos que tienen datos en el sistema';

-- Función para obtener el año actual
CREATE OR REPLACE FUNCTION get_año_actual() 
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

