-- =====================================================
-- VANGUARD ESTADÍSTICAS PAGOS - SCHEMA COMPLETO
-- Sistema de Gestión de Estadísticas de Pagos
-- Versión: 1.0.0
-- Fecha: Noviembre 2025
-- =====================================================

-- =====================================================
-- TABLAS DEL SISTEMA
-- =====================================================

-- Configuración del sistema
CREATE TABLE IF NOT EXISTS configuracion_sistema (
    id SERIAL PRIMARY KEY,
    nombre_sistema VARCHAR(255) DEFAULT 'Vanguard Estadísticas Pagos',
    descripcion_sistema TEXT,
    logo VARCHAR(500),
    color_primario VARCHAR(7) DEFAULT '#2563eb',
    color_secundario VARCHAR(7) DEFAULT '#1e40af',
    email_sistema VARCHAR(255),
    telefono_sistema VARCHAR(20),
    direccion_sistema TEXT,
    año_academico INTEGER DEFAULT 2024,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Usuarios del sistema
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    dni VARCHAR(9) NOT NULL UNIQUE,
    nombres VARCHAR(255) NOT NULL,
    apellidos VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefono VARCHAR(20),
    rol VARCHAR(50) DEFAULT 'Usuario',
    clave VARCHAR(255) NOT NULL,
    avatar VARCHAR(500),
    activo BOOLEAN DEFAULT true,
    ultimo_acceso TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Años académicos
CREATE TABLE IF NOT EXISTS años_academicos (
    id SERIAL PRIMARY KEY,
    año INTEGER NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    activo BOOLEAN DEFAULT true,
    fecha_inicio DATE,
    fecha_fin DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Grados académicos
CREATE TABLE IF NOT EXISTS grados (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    nivel VARCHAR(50),
    orden INTEGER,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tipos de pago (matrícula y pensiones)
CREATE TABLE IF NOT EXISTS tipos_pago (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    mes_pension VARCHAR(20),
    es_pension BOOLEAN DEFAULT false,
    orden INTEGER,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Alumnos
CREATE TABLE IF NOT EXISTS alumnos (
    id SERIAL PRIMARY KEY,
    dni VARCHAR(9) NOT NULL,
    nombres VARCHAR(255) NOT NULL,
    apellidos VARCHAR(255) NOT NULL,
    grado_id INTEGER REFERENCES grados(id),
    seccion VARCHAR(50),
    año_academico INTEGER NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(dni, año_academico)
);

-- Pagos realizados
CREATE TABLE IF NOT EXISTS pagos (
    id SERIAL PRIMARY KEY,
    alumno_id INTEGER REFERENCES alumnos(id) ON DELETE CASCADE,
    tipo_pago_id INTEGER REFERENCES tipos_pago(id),
    monto DECIMAL(10,2) NOT NULL,
    fecha_pago DATE DEFAULT CURRENT_DATE,
    año_academico INTEGER NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Deudas pendientes
CREATE TABLE IF NOT EXISTS deudas (
    id SERIAL PRIMARY KEY,
    alumno_id INTEGER REFERENCES alumnos(id) ON DELETE CASCADE,
    tipo_pago_id INTEGER REFERENCES tipos_pago(id),
    monto_deuda DECIMAL(10,2) NOT NULL,
    fecha_vencimiento DATE,
    año_academico INTEGER NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Archivos subidos
CREATE TABLE IF NOT EXISTS archivos_subidos (
    id SERIAL PRIMARY KEY,
    nombre_archivo VARCHAR(255) NOT NULL,
    tipo_archivo VARCHAR(50) NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    tamaño_archivo INTEGER NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id),
    descripcion TEXT,
    registros_procesados INTEGER DEFAULT 0,
    errores_procesamiento TEXT,
    año_academico INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Cache de estadísticas
CREATE TABLE IF NOT EXISTS estadisticas_cache (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(255) NOT NULL,
    datos JSONB,
    año_academico INTEGER,
    fecha_calculo TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notificaciones (para implementación futura)
CREATE TABLE IF NOT EXISTS notificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT,
    tipo VARCHAR(50),
    relacionado_tipo VARCHAR(50),
    relacionado_id INTEGER,
    leida BOOLEAN DEFAULT false,
    enviada_push BOOLEAN DEFAULT false,
    enviada_email BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_alumnos_grado ON alumnos(grado_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_año ON alumnos(año_academico);
CREATE INDEX IF NOT EXISTS idx_alumnos_dni ON alumnos(dni);
CREATE INDEX IF NOT EXISTS idx_pagos_alumno ON pagos(alumno_id);
CREATE INDEX IF NOT EXISTS idx_pagos_año ON pagos(año_academico);
CREATE INDEX IF NOT EXISTS idx_pagos_tipo ON pagos(tipo_pago_id);
CREATE INDEX IF NOT EXISTS idx_deudas_alumno ON deudas(alumno_id);
CREATE INDEX IF NOT EXISTS idx_deudas_año ON deudas(año_academico);
CREATE INDEX IF NOT EXISTS idx_deudas_tipo ON deudas(tipo_pago_id);
CREATE INDEX IF NOT EXISTS idx_archivos_año_tipo ON archivos_subidos(año_academico, tipo_archivo);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_configuracion_sistema_updated_at ON configuracion_sistema;
CREATE TRIGGER update_configuracion_sistema_updated_at 
    BEFORE UPDATE ON configuracion_sistema 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at 
    BEFORE UPDATE ON usuarios 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_alumnos_updated_at ON alumnos;
CREATE TRIGGER update_alumnos_updated_at 
    BEFORE UPDATE ON alumnos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pagos_updated_at ON pagos;
CREATE TRIGGER update_pagos_updated_at 
    BEFORE UPDATE ON pagos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF NOT EXISTS update_deudas_updated_at ON deudas;
CREATE TRIGGER update_deudas_updated_at 
    BEFORE UPDATE ON deudas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_grados_updated_at ON grados;
CREATE TRIGGER update_grados_updated_at 
    BEFORE UPDATE ON grados 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista: Resumen de pagos por alumno
CREATE OR REPLACE VIEW vista_resumen_pagos AS
SELECT 
    a.id as alumno_id,
    a.dni,
    a.nombres,
    a.apellidos,
    g.nombre as grado,
    g.nivel,
    a.año_academico,
    COUNT(p.id) as total_pagos,
    COALESCE(SUM(p.monto), 0) as total_pagado
FROM alumnos a
LEFT JOIN grados g ON a.grado_id = g.id
LEFT JOIN pagos p ON a.id = p.alumno_id AND p.año_academico = a.año_academico
WHERE a.activo = true
GROUP BY a.id, g.nombre, g.nivel;

-- Vista: Resumen de deudas por alumno
CREATE OR REPLACE VIEW vista_resumen_deudas AS
SELECT 
    a.id as alumno_id,
    a.dni,
    a.nombres,
    a.apellidos,
    g.nombre as grado,
    g.nivel,
    a.año_academico,
    COUNT(d.id) as total_deudas,
    COALESCE(SUM(d.monto_deuda), 0) as total_adeudado
FROM alumnos a
LEFT JOIN grados g ON a.grado_id = g.id
LEFT JOIN deudas d ON a.id = d.alumno_id AND d.año_academico = a.año_academico
WHERE a.activo = true
GROUP BY a.id, g.nombre, g.nivel;

-- Vista: Estadísticas por grado
CREATE OR REPLACE VIEW vista_estadisticas_grado AS
SELECT 
    g.id as grado_id,
    g.nombre as grado,
    g.nivel,
    COUNT(DISTINCT a.id) as total_alumnos,
    COALESCE(SUM(p.monto), 0) as total_ingresos,
    COALESCE(SUM(d.monto_deuda), 0) as total_deudas,
    GREATEST(COALESCE(SUM(d.monto_deuda), 0) - COALESCE(SUM(p.monto), 0), 0) as deuda_pendiente
FROM grados g
LEFT JOIN alumnos a ON g.id = a.grado_id AND a.activo = true
LEFT JOIN pagos p ON a.id = p.alumno_id
LEFT JOIN deudas d ON a.id = d.alumno_id
GROUP BY g.id, g.nombre, g.nivel, g.orden
ORDER BY g.orden;

-- Vista: Años académicos con datos
CREATE OR REPLACE VIEW vista_años_disponibles AS
SELECT DISTINCT año_academico as año
FROM (
    SELECT año_academico FROM alumnos WHERE activo = true
    UNION
    SELECT año_academico FROM pagos 
    UNION
    SELECT año_academico FROM deudas
) años
WHERE año_academico IS NOT NULL
ORDER BY año DESC;

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Insertar configuración por defecto
INSERT INTO configuracion_sistema (
    nombre_sistema, 
    descripcion_sistema, 
    color_primario,
    color_secundario,
    año_academico
)
VALUES (
    'Vanguard Estadísticas Pagos',
    'Sistema de gestión y análisis de pagos de pensiones escolares',
    '#2563eb',
    '#1e40af',
    2025
) ON CONFLICT DO NOTHING;

-- Insertar usuario administrador por defecto
-- DNI: 11111111, Contraseña: admin123
INSERT INTO usuarios (dni, nombres, apellidos, email, rol, clave, activo)
VALUES (
    '11111111',
    'Administrador',
    'Sistema',
    'admin@vanguard.edu.pe',
    'Administrador',
    '$2a$10$YourHashedPasswordHere',  -- Cambiar por hash real
    true
) ON CONFLICT (dni) DO NOTHING;

-- Insertar años académicos
INSERT INTO años_academicos (año, descripcion, activo, fecha_inicio, fecha_fin)
VALUES
    (2023, 'Año Académico 2023', true, '2023-03-01', '2023-12-31'),
    (2024, 'Año Académico 2024', true, '2024-03-01', '2024-12-31'),
    (2025, 'Año Académico 2025', true, '2025-03-01', '2025-12-31')
ON CONFLICT (año) DO NOTHING;

-- Insertar grados académicos
INSERT INTO grados (codigo, nombre, nivel, orden) VALUES
    -- Inicial
    ('I3', 'INICIAL - 3 AÑOS UNICA', 'Inicial', 1),
    ('I4', 'INICIAL - 4 AÑOS UNICA', 'Inicial', 2),
    ('I5', 'INICIAL - 5 AÑOS UNICA', 'Inicial', 3),
    -- Primaria
    ('P1A', 'PRIMARIA - 1º A', 'Primaria', 4),
    ('P1B', 'PRIMARIA - 1º B', 'Primaria', 5),
    ('P2A', 'PRIMARIA - 2º A', 'Primaria', 6),
    ('P2B', 'PRIMARIA - 2º B', 'Primaria', 7),
    ('P3A', 'PRIMARIA - 3º A', 'Primaria', 8),
    ('P3B', 'PRIMARIA - 3º B', 'Primaria', 9),
    ('P4A', 'PRIMARIA - 4º A', 'Primaria', 10),
    ('P4B', 'PRIMARIA - 4º B', 'Primaria', 11),
    ('P5U', 'PRIMARIA - 5º UNICA', 'Primaria', 12),
    ('P6U', 'PRIMARIA - 6° UNICA', 'Primaria', 13),
    -- Secundaria
    ('S1A', 'SECUNDARIA - 1º A', 'Secundaria', 14),
    ('S1B', 'SECUNDARIA - 1º B', 'Secundaria', 15),
    ('S2U', 'SECUNDARIA - 2° UNICA', 'Secundaria', 16),
    ('S3U', 'SECUNDARIA - 3º UNICA', 'Secundaria', 17),
    ('S4B', 'SECUNDARIA - 4º B', 'Secundaria', 18),
    ('S5U', 'SECUNDARIA - 5° UNICA', 'Secundaria', 19)
ON CONFLICT (codigo) DO NOTHING;

-- Insertar tipos de pago
INSERT INTO tipos_pago (codigo, nombre, descripcion, mes_pension, es_pension, orden) VALUES
    ('MAT', 'Matrícula', 'Matrícula anual', NULL, false, 0),
    ('MAR', 'Pensión Marzo', 'Pensión del mes de Marzo', 'marzo', true, 3),
    ('ABR', 'Pensión Abril', 'Pensión del mes de Abril', 'abril', true, 4),
    ('MAY', 'Pensión Mayo', 'Pensión del mes de Mayo', 'mayo', true, 5),
    ('JUN', 'Pensión Junio', 'Pensión del mes de Junio', 'junio', true, 6),
    ('JUL', 'Pensión Julio', 'Pensión del mes de Julio', 'julio', true, 7),
    ('AGO', 'Pensión Agosto', 'Pensión del mes de Agosto', 'agosto', true, 8),
    ('SEP', 'Pensión Septiembre', 'Pensión del mes de Septiembre', 'septiembre', true, 9),
    ('OCT', 'Pensión Octubre', 'Pensión del mes de Octubre', 'octubre', true, 10),
    ('NOV', 'Pensión Noviembre', 'Pensión del mes de Noviembre', 'noviembre', true, 11),
    ('DIC', 'Pensión Diciembre', 'Pensión del mes de Diciembre', 'diciembre', true, 12)
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- COMENTARIOS DE TABLAS
-- =====================================================

COMMENT ON TABLE configuracion_sistema IS 'Configuración general del sistema (colores, logo, contacto)';
COMMENT ON TABLE usuarios IS 'Usuarios del sistema (administradores, usuarios)';
COMMENT ON TABLE años_academicos IS 'Años académicos disponibles en el sistema';
COMMENT ON TABLE grados IS 'Grados académicos del colegio (Inicial, Primaria, Secundaria)';
COMMENT ON TABLE tipos_pago IS 'Tipos de pagos (matrícula y pensiones mensuales)';
COMMENT ON TABLE alumnos IS 'Alumnos matriculados en el colegio por año académico';
COMMENT ON TABLE pagos IS 'Registro de pagos realizados por los alumnos';
COMMENT ON TABLE deudas IS 'Registro de deudas pendientes de los alumnos';
COMMENT ON TABLE archivos_subidos IS 'Historial de archivos Excel y PDF subidos al sistema';
COMMENT ON TABLE estadisticas_cache IS 'Cache de estadísticas calculadas para optimizar consultas';
COMMENT ON TABLE notificaciones IS 'Sistema de notificaciones (implementación futura)';

COMMENT ON VIEW vista_resumen_pagos IS 'Resumen de pagos realizados por cada alumno activo';
COMMENT ON VIEW vista_resumen_deudas IS 'Resumen de deudas pendientes por cada alumno activo';
COMMENT ON VIEW vista_estadisticas_grado IS 'Estadísticas consolidadas por grado académico';
COMMENT ON VIEW vista_años_disponibles IS 'Años académicos que tienen datos en el sistema';

-- =====================================================
-- FIN DEL SCHEMA
-- =====================================================

-- NOTA: Para insertar el usuario administrador con contraseña hasheada:
-- 1. Genera el hash de la contraseña deseada usando bcrypt
-- 2. Reemplaza '$2a$10$YourHashedPasswordHere' con el hash generado
-- 3. O usa el sistema de "Crear Usuario" desde el módulo de Usuarios

