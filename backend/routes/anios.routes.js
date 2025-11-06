const express = require('express');
const router = express.Router();
const { query } = require('../utils/database');
const { auth, requireAdmin } = require('../middleware/auth');

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
 * @route   DELETE /api/anios/:año
 * @desc    Eliminar completamente un año académico y sus datos asociados (política B)
 * @access  Admin
 */
router.delete('/:anio', auth, requireAdmin, async (req, res) => {
  const año = parseInt(req.params.anio);
  if (!año || año < 2010 || año > 2100) {
    return res.status(400).json({ success: false, message: 'Año inválido' });
  }
  const detalles = [];
  try {
    try { await query('DELETE FROM deudas_top_diario WHERE año = $1', [año]); detalles.push('deudas_top_diario'); } catch (e) { /* tabla puede no existir */ }
    try { await query('DELETE FROM deudas_resumen_diario WHERE año = $1', [año]); detalles.push('deudas_resumen_diario'); } catch (e) { /* tabla puede no existir */ }
    try { await query('DELETE FROM deudas WHERE año_academico = $1', [año]); detalles.push('deudas'); } catch (e) { /* puede no existir */ }
    try { await query('DELETE FROM pagos WHERE año_academico = $1', [año]); detalles.push('pagos'); } catch (e) { /* puede no existir */ }
    try { await query('DELETE FROM archivos_subidos WHERE año_academico = $1', [año]); detalles.push('archivos_subidos'); } catch (e) { /* puede no existir */ }
    try { await query('DELETE FROM alumnos WHERE año_academico = $1', [año]); detalles.push('alumnos'); } catch (e) { /* puede no existir */ }
    try { await query('DELETE FROM años_academicos WHERE año = $1', [año]); detalles.push('años_academicos'); } catch (e) { /* puede no existir */ }
    return res.json({ success: true, message: `Año ${año} eliminado`, detalles });
  } catch (error) {
    console.error('Error eliminando año:', error);
    return res.status(500).json({ success: false, message: 'Error eliminando año académico', error: process.env.NODE_ENV==='development'? error.message : undefined });
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

/**
 * @route   POST /api/anios
 * @desc    Crear un año académico
 * @access  Admin
 */
router.post('/', auth, requireAdmin, async (req, res) => {
  try {
    const { año, descripcion, fecha_inicio, fecha_fin } = req.body;
    const añoInt = parseInt(año);
    if (!añoInt || añoInt < 2015 || añoInt > 2035) {
      return res.status(400).json({ success: false, message: 'Año inválido. Debe estar entre 2015 y 2035' });
    }

    // Verificar existencia
    const exists = await query('SELECT 1 FROM años_academicos WHERE año=$1', [añoInt]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'El año ya existe' });
    }

    const result = await query(
      `INSERT INTO años_academicos (año, descripcion, activo, fecha_inicio, fecha_fin)
       VALUES ($1, $2, true, $3, $4)
       RETURNING id, año, descripcion, activo, fecha_inicio, fecha_fin`,
      [añoInt, descripcion || null, fecha_inicio || null, fecha_fin || null]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creando año:', error);
    res.status(500).json({ success: false, message: 'Error creando año académico' });
  }
});

module.exports = router;
