const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../utils/database');
const { auth } = require('../middleware/auth');

// Listar usuarios con paginación y búsqueda
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, q = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const like = `%${q.toLowerCase()}%`;

    const where = q
      ? `WHERE LOWER(nombres) LIKE $1 OR LOWER(apellidos) LIKE $1 OR dni LIKE $1 OR LOWER(email) LIKE $1`
      : '';
    const paramsList = q ? [like, parseInt(limit), offset] : [parseInt(limit), offset];

    const list = await query(
      `SELECT id, dni, nombres, apellidos, email, telefono, rol, activo, created_at
       FROM usuarios
       ${where}
       ORDER BY created_at DESC
       LIMIT $${q ? 2 : 1} OFFSET $${q ? 3 : 2}`,
      paramsList
    );

    const count = await query(
      `SELECT COUNT(*) AS total FROM usuarios ${where}`,
      q ? [like] : []
    );

    res.json({
      success: true,
      data: list.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(count.rows[0].total),
      },
    });
  } catch (err) {
    console.error('Error listando usuarios:', err);
    res.status(500).json({ success: false, message: 'Error listando usuarios' });
  }
});

// Crear usuario
router.post('/', async (req, res) => {
  try {
    const { dni, nombres, apellidos, email, telefono, rol = 'Usuario', clave } = req.body;
    if (!dni || !nombres || !apellidos || !clave) {
      return res.status(400).json({ success: false, message: 'Campos requeridos faltantes' });
    }
    const hash = await bcrypt.hash(clave, 10);
    const result = await query(
      `INSERT INTO usuarios (dni, nombres, apellidos, email, telefono, rol, clave, activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true)
       RETURNING id, dni, nombres, apellidos, email, telefono, rol, activo, created_at`,
      [dni, nombres, apellidos, email || null, telefono || null, rol, hash]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error creando usuario:', err);
    res.status(500).json({ success: false, message: 'Error creando usuario' });
  }
});

/**
 * @route   PUT /api/usuarios/mi-perfil
 * @desc    Actualizar datos del perfil del usuario autenticado
 * @access  Privado (usuario autenticado)
 */
router.put('/mi-perfil', auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const { nombres, apellidos, email, telefono } = req.body;
    
    const result = await query(
      `UPDATE usuarios 
       SET nombres=$1, apellidos=$2, email=$3, telefono=$4, updated_at=NOW()
       WHERE id=$5 
       RETURNING id, dni, nombres, apellidos, email, telefono, rol, activo, created_at`,
      [nombres, apellidos, email || null, telefono || null, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Perfil actualizado correctamente' });
  } catch (err) {
    console.error('Error actualizando perfil:', err);
    res.status(500).json({ success: false, message: 'Error actualizando perfil' });
  }
});

/**
 * @route   PUT /api/usuarios/mi-password
 * @desc    Cambiar contraseña del usuario autenticado
 * @access  Privado (usuario autenticado)
 */
router.put('/mi-password', auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const { claveActual, claveNueva } = req.body;

    if (!claveActual || !claveNueva) {
      return res.status(400).json({ success: false, message: 'Contraseña actual y nueva son requeridas' });
    }

    if (claveNueva.length < 6) {
      return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    // Verificar contraseña actual
    const userResult = await query(
      `SELECT id, clave FROM usuarios WHERE id=$1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const isMatch = await bcrypt.compare(claveActual, userResult.rows[0].clave);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'La contraseña actual es incorrecta' });
    }

    // Actualizar con nueva contraseña
    const hashNueva = await bcrypt.hash(claveNueva, 10);
    await query(
      `UPDATE usuarios SET clave=$1, updated_at=NOW() WHERE id=$2`,
      [hashNueva, userId]
    );

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('Error cambiando contraseña:', err);
    res.status(500).json({ success: false, message: 'Error cambiando contraseña' });
  }
});

// Actualizar usuario (admin)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombres, apellidos, email, telefono, rol, activo } = req.body;
    const result = await query(
      `UPDATE usuarios SET nombres=$1, apellidos=$2, email=$3, telefono=$4, rol=$5, activo=$6, updated_at=NOW()
       WHERE id=$7 RETURNING id, dni, nombres, apellidos, email, telefono, rol, activo, created_at`,
      [nombres, apellidos, email || null, telefono || null, rol, activo, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'No encontrado' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error actualizando usuario:', err);
    res.status(500).json({ success: false, message: 'Error actualizando usuario' });
  }
});

// Resetear contraseña (admin)
router.patch('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevaClave } = req.body;
    const nueva = nuevaClave || 'password';
    const hash = await bcrypt.hash(nueva, 10);
    const result = await query(
      `UPDATE usuarios SET clave=$1, updated_at=NOW() WHERE id=$2 RETURNING id`,
      [hash, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'No encontrado' });
    res.json({ success: true, message: 'Contraseña restablecida' });
  } catch (err) {
    console.error('Error reseteando clave:', err);
    res.status(500).json({ success: false, message: 'Error reseteando contraseña' });
  }
});

// Activar/Desactivar (admin)
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE usuarios SET activo = NOT activo, updated_at=NOW() WHERE id=$1 RETURNING id, activo`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'No encontrado' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error alternando estado:', err);
    res.status(500).json({ success: false, message: 'Error alternando estado' });
  }
});

// Eliminar usuario (admin)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM usuarios WHERE id=$1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error eliminando usuario:', err);
    res.status(500).json({ success: false, message: 'Error eliminando usuario' });
  }
});

module.exports = router;
