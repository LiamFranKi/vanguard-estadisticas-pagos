-- =====================================================
-- SCRIPT COMPLETO DE CREACIÓN DE BASE DE DATOS
-- Sistema de Estadísticas de Pagos - Vanguard Schools
-- =====================================================
-- 
-- INSTRUCCIONES:
-- 1. Abrir pgAdmin4
-- 2. Crear una base de datos nueva llamada: estadisticas_pagos
-- 3. Clic derecho en la base de datos > Query Tool
-- 4. Copiar y pegar TODO este archivo
-- 5. Ejecutar (F5)
-- =====================================================

-- =====================================================
-- PARTE 1: CREAR TABLAS PRINCIPALES
-- =====================================================

-- Tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS configuracion_sistema (
    id SERIAL PRIMARY KEY,
    nombre_sistema VARCHAR(255) DEFAULT 'Vanguard Estadísticas Pagos',
    descripcion_sistema TEXT,
    logo VARCHAR(500),
    color_primario VARCHAR(7) DEFAULT '#1976d2',
    color_secundario VARCHAR(7) DEFAULT '#7c4dff',
    email_sistema VARCHAR(255),
    telefono_sistema VARCHAR(20),
    direccion_sistema TEXT,
    año_academico INTEGER DEFAULT 2024,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de usuarios del sistema
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    dni VARCHAR(8) NOT NULL UNIQUE,
    nombres VARCHAR(255) NOT NULL,
    apellidos VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    clave VARCHAR(255) NOT NULL,
    rol VARCHAR(50) DEFAULT 'Usuario',
    avatar VARCHAR(500),
    activo BOOLEAN DEFAULT true,
    ultimo_acceso TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de grados académicos
CREATE TABLE IF NOT EXISTS grados (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    nivel VARCHAR(50) NOT NULL,
    orden INTEGER NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de alumnos
CREATE TABLE IF NOT EXISTS alumnos (
    id SERIAL PRIMARY KEY,
    dni VARCHAR(8) NOT NULL,
    nombres VARCHAR(255) NOT NULL,
    apellidos VARCHAR(255) NOT NULL,
    grado_id INTEGER REFERENCES grados(id),
    seccion VARCHAR(10),
    año_academico INTEGER DEFAULT 2024,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_alumnos_dni_año UNIQUE(dni, año_academico)
);

-- Tabla de tipos de pago
CREATE TABLE IF NOT EXISTS tipos_pago (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    es_matricula BOOLEAN DEFAULT false,
    es_pension BOOLEAN DEFAULT false,
    mes_pension VARCHAR(20),
    orden INTEGER NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de pagos realizados
CREATE TABLE IF NOT EXISTS pagos (
    id SERIAL PRIMARY KEY,
    alumno_id INTEGER REFERENCES alumnos(id) ON DELETE CASCADE,
    tipo_pago_id INTEGER REFERENCES tipos_pago(id),
    monto DECIMAL(10,2) NOT NULL,
    fecha_pago DATE NOT NULL,
    año_academico INTEGER DEFAULT 2024,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de deudas pendientes
CREATE TABLE IF NOT EXISTS deudas (
    id SERIAL PRIMARY KEY,
    alumno_id INTEGER REFERENCES alumnos(id) ON DELETE CASCADE,
    tipo_pago_id INTEGER REFERENCES tipos_pago(id),
    monto_deuda DECIMAL(10,2) NOT NULL,
    fecha_reporte DATE NOT NULL,
    año_academico INTEGER DEFAULT 2024,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de archivos subidos
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
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de estadísticas calculadas
CREATE TABLE IF NOT EXISTS estadisticas_cache (
    id SERIAL PRIMARY KEY,
    tipo_estadistica VARCHAR(100) NOT NULL,
    periodo VARCHAR(50) NOT NULL,
    datos JSONB NOT NULL,
    fecha_calculo TIMESTAMP DEFAULT NOW(),
    expira_en TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de años académicos
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

-- =====================================================
-- PARTE 2: CREAR ÍNDICES
-- =====================================================

-- Índices para alumnos
CREATE INDEX IF NOT EXISTS idx_alumnos_dni ON alumnos(dni);
CREATE INDEX IF NOT EXISTS idx_alumnos_grado ON alumnos(grado_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_año ON alumnos(año_academico);
CREATE INDEX IF NOT EXISTS idx_alumnos_activo ON alumnos(activo);
CREATE INDEX IF NOT EXISTS idx_alumnos_año_academico ON alumnos(año_academico);

-- Índices para pagos
CREATE INDEX IF NOT EXISTS idx_pagos_alumno ON pagos(alumno_id);
CREATE INDEX IF NOT EXISTS idx_pagos_tipo ON pagos(tipo_pago_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos(fecha_pago);
CREATE INDEX IF NOT EXISTS idx_pagos_año ON pagos(año_academico);
CREATE INDEX IF NOT EXISTS idx_pagos_año_academico ON pagos(año_academico);

-- Índices para deudas
CREATE INDEX IF NOT EXISTS idx_deudas_alumno ON deudas(alumno_id);
CREATE INDEX IF NOT EXISTS idx_deudas_tipo ON deudas(tipo_pago_id);
CREATE INDEX IF NOT EXISTS idx_deudas_fecha ON deudas(fecha_reporte);
CREATE INDEX IF NOT EXISTS idx_deudas_año ON deudas(año_academico);
CREATE INDEX IF NOT EXISTS idx_deudas_año_academico ON deudas(año_academico);

-- Índices para archivos
CREATE INDEX IF NOT EXISTS idx_archivos_tipo ON archivos_subidos(tipo_archivo);
CREATE INDEX IF NOT EXISTS idx_archivos_usuario ON archivos_subidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_archivos_fecha ON archivos_subidos(created_at);

-- Índices para estadísticas
CREATE INDEX IF NOT EXISTS idx_estadisticas_tipo ON estadisticas_cache(tipo_estadistica);
CREATE INDEX IF NOT EXISTS idx_estadisticas_periodo ON estadisticas_cache(periodo);
CREATE INDEX IF NOT EXISTS idx_estadisticas_expira ON estadisticas_cache(expira_en);

-- =====================================================
-- PARTE 3: FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
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

DROP TRIGGER IF EXISTS update_deudas_updated_at ON deudas;
CREATE TRIGGER update_deudas_updated_at 
    BEFORE UPDATE ON deudas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_años_academicos_updated_at ON años_academicos;
CREATE TRIGGER update_años_academicos_updated_at 
    BEFORE UPDATE ON años_academicos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Función para obtener el año actual
CREATE OR REPLACE FUNCTION get_año_actual() 
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 4: VISTAS ÚTILES
-- =====================================================

-- Vista de resumen de pagos por alumno
CREATE OR REPLACE VIEW vista_resumen_pagos AS
SELECT 
    a.id as alumno_id,
    a.dni,
    a.nombres,
    a.apellidos,
    g.nombre as grado,
    g.nivel,
    COUNT(p.id) as total_pagos,
    COALESCE(SUM(p.monto), 0) as total_pagado,
    COUNT(CASE WHEN tp.es_matricula THEN 1 END) as matricula_pagada,
    COUNT(CASE WHEN tp.es_pension THEN 1 END) as pensiones_pagadas
FROM alumnos a
LEFT JOIN grados g ON a.grado_id = g.id
LEFT JOIN pagos p ON a.id = p.alumno_id AND p.año_academico = a.año_academico
LEFT JOIN tipos_pago tp ON p.tipo_pago_id = tp.id
WHERE a.activo = true
GROUP BY a.id, a.dni, a.nombres, a.apellidos, g.nombre, g.nivel;

-- Vista de resumen de deudas por alumno
CREATE OR REPLACE VIEW vista_resumen_deudas AS
SELECT 
    a.id as alumno_id,
    a.dni,
    a.nombres,
    a.apellidos,
    g.nombre as grado,
    g.nivel,
    COUNT(d.id) as total_deudas,
    COALESCE(SUM(d.monto_deuda), 0) as total_deuda,
    COUNT(CASE WHEN tp.es_matricula THEN 1 END) as matricula_deuda,
    COUNT(CASE WHEN tp.es_pension THEN 1 END) as pensiones_deuda
FROM alumnos a
LEFT JOIN grados g ON a.grado_id = g.id
LEFT JOIN deudas d ON a.id = d.alumno_id AND d.año_academico = a.año_academico
LEFT JOIN tipos_pago tp ON d.tipo_pago_id = tp.id
WHERE a.activo = true
GROUP BY a.id, a.dni, a.nombres, a.apellidos, g.nombre, g.nivel;

-- Vista de estadísticas por grado
CREATE OR REPLACE VIEW vista_estadisticas_grado AS
SELECT 
    g.id as grado_id,
    g.codigo,
    g.nombre as grado,
    g.nivel,
    COUNT(DISTINCT a.id) as total_alumnos,
    COUNT(DISTINCT p.alumno_id) as alumnos_con_pagos,
    COALESCE(SUM(p.monto), 0) as total_ingresos,
    COUNT(DISTINCT d.alumno_id) as alumnos_con_deudas,
    COALESCE(SUM(d.monto_deuda), 0) as total_deudas
FROM grados g
LEFT JOIN alumnos a ON g.id = a.grado_id AND a.activo = true
LEFT JOIN pagos p ON a.id = p.alumno_id AND p.año_academico = a.año_academico
LEFT JOIN deudas d ON a.id = d.alumno_id AND d.año_academico = a.año_academico
GROUP BY g.id, g.codigo, g.nombre, g.nivel
ORDER BY g.orden;

-- Vista para obtener años disponibles
CREATE OR REPLACE VIEW vista_años_disponibles AS
SELECT DISTINCT año_academico as año
FROM (
    SELECT año_academico FROM alumnos 
    UNION
    SELECT año_academico FROM pagos 
    UNION
    SELECT año_academico FROM deudas
) años
ORDER BY año DESC;

-- =====================================================
-- PARTE 5: DATOS INICIALES
-- =====================================================

-- Insertar configuración por defecto
INSERT INTO configuracion_sistema (nombre_sistema, descripcion_sistema, año_academico)
VALUES (
    'Vanguard Estadísticas Pagos',
    'Sistema de gestión y análisis de pagos de pensiones escolares',
    2024
) ON CONFLICT DO NOTHING;

-- Insertar años académicos
INSERT INTO años_academicos (año, descripcion, activo, fecha_inicio, fecha_fin)
VALUES
    (2022, 'Año Académico 2022', true, '2022-03-01', '2022-12-31'),
    (2023, 'Año Académico 2023', true, '2023-03-01', '2023-12-31'),
    (2024, 'Año Académico 2024', true, '2024-03-01', '2024-12-31'),
    (2025, 'Año Académico 2025', true, '2025-03-01', '2025-12-31'),
    (2026, 'Año Académico 2026', true, '2026-03-01', '2026-12-31')
ON CONFLICT (año) DO NOTHING;

-- Insertar grados académicos
INSERT INTO grados (codigo, nombre, nivel, orden) VALUES
('I3', 'Inicial 3 años', 'Inicial', 1),
('I4', 'Inicial 4 años', 'Inicial', 2),
('I5', 'Inicial 5 años', 'Inicial', 3),
('P1', 'Primer Grado', 'Primaria', 4),
('P2', 'Segundo Grado', 'Primaria', 5),
('P3', 'Tercer Grado', 'Primaria', 6),
('P4', 'Cuarto Grado', 'Primaria', 7),
('P5', 'Quinto Grado', 'Primaria', 8),
('P6', 'Sexto Grado', 'Primaria', 9),
('S1', 'Primer Año', 'Secundaria', 10),
('S2', 'Segundo Año', 'Secundaria', 11),
('S3', 'Tercer Año', 'Secundaria', 12),
('S4', 'Cuarto Año', 'Secundaria', 13),
('S5', 'Quinto Año', 'Secundaria', 14)
ON CONFLICT (codigo) DO NOTHING;

-- Insertar tipos de pago
INSERT INTO tipos_pago (codigo, nombre, descripcion, es_matricula, es_pension, mes_pension, orden) VALUES
('MAT', 'Matrícula', 'Pago único de matrícula al inicio del año académico', true, false, null, 1),
('PEN_MAR', 'Pensión Marzo', 'Pensión correspondiente al mes de marzo', false, true, 'marzo', 2),
('PEN_ABR', 'Pensión Abril', 'Pensión correspondiente al mes de abril', false, true, 'abril', 3),
('PEN_MAY', 'Pensión Mayo', 'Pensión correspondiente al mes de mayo', false, true, 'mayo', 4),
('PEN_JUN', 'Pensión Junio', 'Pensión correspondiente al mes de junio', false, true, 'junio', 5),
('PEN_JUL', 'Pensión Julio', 'Pensión correspondiente al mes de julio', false, true, 'julio', 6),
('PEN_AGO', 'Pensión Agosto', 'Pensión correspondiente al mes de agosto', false, true, 'agosto', 7),
('PEN_SET', 'Pensión Setiembre', 'Pensión correspondiente al mes de setiembre', false, true, 'setiembre', 8),
('PEN_OCT', 'Pensión Octubre', 'Pensión correspondiente al mes de octubre', false, true, 'octubre', 9),
('PEN_NOV', 'Pensión Noviembre', 'Pensión correspondiente al mes de noviembre', false, true, 'noviembre', 10),
('PEN_DIC', 'Pensión Diciembre', 'Pensión correspondiente al mes de diciembre', false, true, 'diciembre', 11)
ON CONFLICT (codigo) DO NOTHING;

-- Insertar usuario administrador por defecto
-- Password: admin123 (hash bcrypt)
INSERT INTO usuarios (dni, nombres, apellidos, email, clave, rol)
VALUES (
    '12345678',
    'Administrador',
    'Sistema',
    'admin@vanguardschools.com',
    '$2a$10$rQ7cqJM5Z5xU8xz8.DzQDOJqWWgxLIaTgHKbKqY5wGxTVE3BpWxFK',
    'Administrador'
) ON CONFLICT (dni) DO NOTHING;

-- =====================================================
-- PARTE 6: COMENTARIOS
-- =====================================================

COMMENT ON TABLE configuracion_sistema IS 'Configuración general del sistema';
COMMENT ON TABLE usuarios IS 'Usuarios del sistema (administradores, contadores, etc.)';
COMMENT ON TABLE grados IS 'Grados académicos del colegio';
COMMENT ON TABLE alumnos IS 'Alumnos matriculados en el colegio';
COMMENT ON TABLE tipos_pago IS 'Tipos de pagos (matrícula y pensiones mensuales)';
COMMENT ON TABLE pagos IS 'Registro de pagos realizados por los alumnos';
COMMENT ON TABLE deudas IS 'Registro de deudas pendientes de los alumnos';
COMMENT ON TABLE archivos_subidos IS 'Historial de archivos Excel y PDF subidos';
COMMENT ON TABLE estadisticas_cache IS 'Cache de estadísticas calculadas para optimizar consultas';
COMMENT ON TABLE años_academicos IS 'Años académicos disponibles en el sistema';

COMMENT ON VIEW vista_resumen_pagos IS 'Resumen de pagos realizados por cada alumno';
COMMENT ON VIEW vista_resumen_deudas IS 'Resumen de deudas pendientes por cada alumno';
COMMENT ON VIEW vista_estadisticas_grado IS 'Estadísticas consolidadas por grado académico';
COMMENT ON VIEW vista_años_disponibles IS 'Años académicos que tienen datos en el sistema';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
