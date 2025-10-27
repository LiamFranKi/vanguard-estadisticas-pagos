const express = require('express');
const router = express.Router();
const { query } = require('../utils/database');

/**
 * @route   GET /api/pagos
 * @desc    Obtener todos los pagos
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { 
      alumno_id, 
      tipo_pago, 
      mes, 
      año = 2024,
      page = 1, 
      limit = 50 
    } = req.query;

    let whereClause = 'WHERE p.año_academico = $1';
    const params = [año];
    let paramIndex = 2;

    if (alumno_id) {
      whereClause += ` AND p.alumno_id = $${paramIndex}`;
      params.push(parseInt(alumno_id));
      paramIndex++;
    }

    if (tipo_pago) {
      whereClause += ` AND tp.codigo = $${paramIndex}`;
      params.push(tipo_pago);
      paramIndex++;
    }

    if (mes) {
      whereClause += ` AND tp.mes_pension = $${paramIndex}`;
      params.push(mes.toLowerCase());
      paramIndex++;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await query(`
      SELECT 
        p.id, p.monto, p.fecha_pago, p.observaciones,
        tp.nombre as tipo_pago, tp.codigo as codigo_pago, tp.es_matricula, tp.es_pension,
        a.id as alumno_id, a.dni as alumno_dni, 
        CONCAT(a.nombres, ' ', a.apellidos) as alumno_nombre,
        g.nombre as grado
      FROM pagos p
      LEFT JOIN tipos_pago tp ON p.tipo_pago_id = tp.id
      LEFT JOIN alumnos a ON p.alumno_id = a.id
      LEFT JOIN grados g ON a.grado_id = g.id
      ${whereClause}
      ORDER BY p.fecha_pago DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, parseInt(limit), offset]);

    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM pagos p
      LEFT JOIN tipos_pago tp ON p.tipo_pago_id = tp.id
      ${whereClause}
    `, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error obteniendo pagos:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo pagos',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

module.exports = router;

