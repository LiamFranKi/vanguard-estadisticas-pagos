const express = require('express');
const router = express.Router();
const { query } = require('../utils/database');

/**
 * @route   GET /api/estadisticas/dashboard
 * @desc    Obtener estadísticas del dashboard
 * @access  Public
 */
router.get('/dashboard', async (req, res) => {
  try {
    const año = req.query.año || 2024;

    // Resumen general
    const resumenResult = await query(`
      SELECT 
        COUNT(DISTINCT a.id) as totalAlumnos,
        COUNT(p.id) as totalPagos,
        COALESCE(SUM(p.monto), 0) as totalIngresos,
        COUNT(DISTINCT d.id) as totalDeudas,
        COALESCE(SUM(d.monto_deuda), 0) as totalDeudasMonto
      FROM alumnos a
      LEFT JOIN pagos p ON a.id = p.alumno_id AND p.año_academico = $1
      LEFT JOIN deudas d ON a.id = d.alumno_id AND d.año_academico = $1
      WHERE a.activo = true AND a.año_academico = $1
    `, [año]);

    // Ingresos por mes
    const ingresosResult = await query(`
      SELECT 
        tp.mes_pension,
        COUNT(p.id) as cantidad,
        COALESCE(SUM(p.monto), 0) as monto
      FROM tipos_pago tp
      LEFT JOIN pagos p ON tp.id = p.tipo_pago_id AND p.año_academico = $1
      WHERE tp.es_pension = true
      GROUP BY tp.mes_pension, tp.orden
      ORDER BY tp.orden
    `, [año]);

    // Estadísticas por grado
    const gradosResult = await query(`
      SELECT 
        g.id, g.nombre, g.nivel,
        COUNT(DISTINCT a.id) as totalAlumnos,
        COUNT(p.id) as pagos,
        COALESCE(SUM(p.monto), 0) as totalIngresos,
        COUNT(DISTINCT d.id) as deudas,
        COALESCE(SUM(d.monto_deuda), 0) as totalDeudas
      FROM grados g
      LEFT JOIN alumnos a ON g.id = a.grado_id AND a.activo = true AND a.año_academico = $1
      LEFT JOIN pagos p ON a.id = p.alumno_id AND p.año_academico = $1
      LEFT JOIN deudas d ON a.id = d.alumno_id AND d.año_academico = $1
      GROUP BY g.id, g.nombre, g.nivel
      ORDER BY g.orden
    `, [año]);

    // Últimos archivos procesados
    const archivosResult = await query(`
      SELECT 
        id, nombre_archivo, tipo_archivo, created_at,
        registros_procesados, errores_procesamiento
      FROM archivos_subidos
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Preparar datos para el frontend
    const ingresosPorMes = ingresosResult.rows.map(row => 
      parseFloat(row.monto || 0)
    );

    res.json({
      success: true,
      resumen: {
        totalAlumnos: parseInt(resumenResult.rows[0].totalalumnos),
        totalPagos: parseInt(resumenResult.rows[0].totalpagos),
        totalIngresos: parseFloat(resumenResult.rows[0].totalingresos),
        totalDeudas: parseFloat(resumenResult.rows[0].totaldeudasmonto)
      },
      ingresosPorMes: ingresosPorMes,
      estadisticasPorGrado: gradosResult.rows.map(row => ({
        id: row.id,
        nombre: row.nombre,
        nivel: row.nivel,
        totalAlumnos: parseInt(row.totalalumnos || 0),
        totalIngresos: parseFloat(row.totalingresos || 0),
        alumnosConDeudas: parseInt(row.deudas || 0),
        totalDeudas: parseFloat(row.totaldeudas || 0)
      })),
      ultimosArchivos: archivosResult.rows
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

/**
 * @route   GET /api/estadisticas/grados
 * @desc    Obtener estadísticas por grado
 * @access  Public
 */
router.get('/grados', async (req, res) => {
  try {
    const año = req.query.año || 2024;

    const result = await query(`
      SELECT 
        g.id, g.nombre, g.nivel,
        COUNT(DISTINCT a.id) as totalAlumnos,
        COALESCE(SUM(p.monto), 0) as totalIngresos,
        COALESCE(SUM(d.monto_deuda), 0) as totalDeudas
      FROM grados g
      LEFT JOIN alumnos a ON g.id = a.grado_id AND a.activo = true AND a.año_academico = $1
      LEFT JOIN pagos p ON a.id = p.alumno_id AND p.año_academico = $1
      LEFT JOIN deudas d ON a.id = d.alumno_id AND d.año_academico = $1
      GROUP BY g.id, g.nombre, g.nivel, g.orden
      ORDER BY g.orden
    `, [año]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas por grado:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas por grado',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

module.exports = router;

