const express = require('express');
const router = express.Router();
const { query } = require('../utils/database');

/**
 * @route   GET /api/alumnos
 * @desc    Obtener todos los alumnos
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { 
      search = '', 
      grado = '', 
      grado_id = '',
      page = 1, 
      limit = 50,
      año 
    } = req.query;
    
    // Si no se especifica el año, usar el año actual
    const añoFiltro = año || new Date().getFullYear();

    let whereClause = 'WHERE a.año_academico = $1';
    const params = [añoFiltro];
    let paramIndex = 2;

    // Búsqueda por nombre o DNI
    if (search) {
      whereClause += ` AND (a.nombres ILIKE $${paramIndex} OR a.apellidos ILIKE $${paramIndex} OR a.dni ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Filtro por grado (acepta grado_id o grado)
    const gradoParam = grado_id || grado;
    if (gradoParam) {
      whereClause += ` AND g.id = $${paramIndex}`;
      params.push(parseInt(gradoParam));
      paramIndex++;
    }

    // Consulta con paginación
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const alumnosResult = await query(`
      WITH pagos_agg AS (
        SELECT alumno_id, COUNT(*) AS total_pagos, SUM(monto) AS total_pagado
        FROM pagos WHERE año_academico = $1 GROUP BY alumno_id
      ), deudas_agg AS (
        SELECT alumno_id, SUM(monto_deuda) AS deuda_total
        FROM deudas WHERE año_academico = $1 GROUP BY alumno_id
      )
      SELECT 
        a.id, a.dni, a.nombres, a.apellidos, a.grado_id, a.seccion, 
        a.activo, a.created_at, a.updated_at, a.año_academico,
        g.nombre as grado_nombre, g.nivel,
        COALESCE(p.total_pagos, 0) as total_pagos,
        COALESCE(p.total_pagado, 0) as total_pagado,
        COALESCE(d.deuda_total, 0) as deuda_total
      FROM alumnos a
      LEFT JOIN grados g ON a.grado_id = g.id
      LEFT JOIN pagos_agg p ON a.id = p.alumno_id
      LEFT JOIN deudas_agg d ON a.id = d.alumno_id
      ${whereClause}
      ORDER BY a.apellidos, a.nombres
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, parseInt(limit), offset]);

    // Total de registros
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM alumnos a
      LEFT JOIN grados g ON a.grado_id = g.id
      ${whereClause}
    `, params);

    res.json({
      success: true,
      data: alumnosResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error obteniendo alumnos:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo alumnos',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

/**
 * @route   GET /api/alumnos/:id
 * @desc    Obtener un alumno específico
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        a.*, g.nombre as grado_nombre, g.nivel,
        COUNT(p.id) as total_pagos,
        COALESCE(SUM(p.monto), 0) as total_pagado
      FROM alumnos a
      LEFT JOIN grados g ON a.grado_id = g.id
      LEFT JOIN pagos p ON a.id = p.alumno_id
      WHERE a.id = $1
      GROUP BY a.id, g.nombre, g.nivel
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Alumno no encontrado'
      });
    }

    // Obtener pagos del alumno
    const pagosResult = await query(`
      SELECT p.*, tp.nombre as tipo_pago, tp.codigo as codigo_pago
      FROM pagos p
      LEFT JOIN tipos_pago tp ON p.tipo_pago_id = tp.id
      WHERE p.alumno_id = $1
      ORDER BY p.fecha_pago DESC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        pagos: pagosResult.rows
      }
    });

  } catch (error) {
    console.error('Error obteniendo alumno:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo alumno',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

module.exports = router;

