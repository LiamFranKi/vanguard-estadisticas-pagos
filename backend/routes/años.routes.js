const express = require('express');
const router = express.Router();
const { query } = require('../utils/database');

/**
 * @route   GET /api/años
 * @desc    Obtener todos los años académicos disponibles
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        aa.id, aa.año, aa.descripcion, aa.activo, 
        aa.fecha_inicio, aa.fecha_fin,
        (
          SELECT COUNT(*) 
          FROM alumnos a 
          WHERE a.año_academico = aa.año
        ) as total_alumnos,
        (
          SELECT COUNT(*) 
          FROM pagos p 
          WHERE p.año_academico = aa.año
        ) as total_pagos
      FROM años_academicos aa
      WHERE aa.activo = true
      ORDER BY aa.año DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error obteniendo años:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo años académicos',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

/**
 * @route   GET /api/años/disponibles
 * @desc    Obtener años que tienen datos
 * @access  Public
 */
router.get('/disponibles', async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT año_academico as año
      FROM (
        SELECT año_academico FROM alumnos 
        UNION
        SELECT año_academico FROM pagos 
        UNION
        SELECT año_academico FROM deudas
      ) años
      ORDER BY año DESC
    `);

    res.json({
      success: true,
      data: result.rows.map(row => row.año)
    });

  } catch (error) {
    console.error('Error obteniendo años disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo años disponibles',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

/**
 * @route   GET /api/años/actual
 * @desc    Obtener el año actual
 * @access  Public
 */
router.get('/actual', async (req, res) => {
  try {
    const añoActual = new Date().getFullYear();
    
    const result = await query(`
      SELECT * FROM años_academicos 
      WHERE año = $1 AND activo = true
    `, [añoActual]);

    res.json({
      success: true,
      data: result.rows.length > 0 ? result.rows[0] : { año: añoActual }
    });

  } catch (error) {
    console.error('Error obteniendo año actual:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo año actual',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

module.exports = router;

