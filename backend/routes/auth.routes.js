const express = require('express');
const router = express.Router();
const { query } = require('../utils/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * @route   POST /api/auth/login
 * @desc    Iniciar sesión de usuario
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { dni, clave } = req.body;

    if (!dni || !clave) {
      return res.status(400).json({
        success: false,
        message: 'DNI y contraseña son requeridos'
      });
    }

    // Buscar usuario
    const result = await query(
      'SELECT * FROM usuarios WHERE dni = $1 AND activo = true',
      [dni]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'DNI o contraseña incorrectos'
      });
    }

    const usuario = result.rows[0];

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(clave, usuario.clave);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'DNI o contraseña incorrectos'
      });
    }

    // Actualizar último acceso
    await query(
      'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1',
      [usuario.id]
    );

    // Generar token JWT
    const token = jwt.sign(
      { 
        id: usuario.id, 
        dni: usuario.dni, 
        rol: usuario.rol 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Retornar datos de usuario (sin contraseña)
    const { clave: _, ...usuarioSinClave } = usuario;

    res.json({
      success: true,
      message: 'Sesión iniciada correctamente',
      token,
      usuario: usuarioSinClave
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

/**
 * @route   POST /api/auth/verify
 * @desc    Verificar token JWT
 * @access  Public
 */
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token es requerido'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar usuario
    const result = await query(
      'SELECT id, dni, nombres, apellidos, email, telefono, rol, avatar, activo FROM usuarios WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      usuario: result.rows[0]
    });

  } catch (error) {
    console.error('Error verificando token:', error);
    res.status(401).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }
});

module.exports = router;

