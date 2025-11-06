const express = require('express');
const router = express.Router();
const { query } = require('../utils/database');
const { auth, requireAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/config
 * @desc    Obtener configuración del sistema
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, nombre_sistema, descripcion_sistema, 
        logo, color_primario, color_secundario,
        email_sistema, telefono_sistema, direccion_sistema,
        año_academico, created_at, updated_at
      FROM configuracion_sistema
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          nombre_sistema: 'Vanguard Estadísticas Pagos',
          descripcion_sistema: 'Sistema de gestión y análisis de pagos de pensiones escolares',
          color_primario: '#1976d2',
          color_secundario: '#7c4dff',
          año_academico: new Date().getFullYear()
        }
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    // Retornar configuración por defecto si hay error
    res.json({
      success: true,
      data: {
        nombre_sistema: 'Vanguard Estadísticas Pagos',
        descripcion_sistema: 'Sistema de gestión y análisis de pagos de pensiones escolares',
        color_primario: '#1976d2',
        color_secundario: '#7c4dff',
        año_academico: new Date().getFullYear()
      }
    });
  }
});

/**
 * @route   PUT /api/config
 * @desc    Actualizar configuración del sistema
 * @access  Privado (solo admin)
 */
router.put('/', auth, requireAdmin, async (req, res) => {
  try {
    const { 
      nombre_sistema, 
      descripcion_sistema, 
      logo,
      color_primario, 
      color_secundario,
      email_sistema,
      telefono_sistema,
      direccion_sistema
    } = req.body;

    // Verificar si existe un registro de configuración
    const existing = await query('SELECT id FROM configuracion_sistema LIMIT 1');

    let result;
    if (existing.rows.length === 0) {
      // Crear nuevo registro
      result = await query(
        `INSERT INTO configuracion_sistema 
         (nombre_sistema, descripcion_sistema, logo, color_primario, color_secundario, 
          email_sistema, telefono_sistema, direccion_sistema, año_academico)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          nombre_sistema, 
          descripcion_sistema, 
          logo || null,
          color_primario || '#2563eb', 
          color_secundario || '#1e40af',
          email_sistema || null,
          telefono_sistema || null,
          direccion_sistema || null,
          new Date().getFullYear()
        ]
      );
    } else {
      // Actualizar registro existente
      result = await query(
        `UPDATE configuracion_sistema 
         SET nombre_sistema=$1, descripcion_sistema=$2, logo=$3, 
             color_primario=$4, color_secundario=$5,
             email_sistema=$6, telefono_sistema=$7, direccion_sistema=$8,
             updated_at=NOW()
         WHERE id=$9
         RETURNING *`,
        [
          nombre_sistema, 
          descripcion_sistema, 
          logo || null,
          color_primario || '#2563eb', 
          color_secundario || '#1e40af',
          email_sistema || null,
          telefono_sistema || null,
          direccion_sistema || null,
          existing.rows[0].id
        ]
      );
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Configuración actualizada correctamente'
    });

  } catch (error) {
    console.error('Error actualizando configuración:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando configuración',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

module.exports = router;

