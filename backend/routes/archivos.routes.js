const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../utils/database');
const { auth, requireAdmin } = require('../middleware/auth');
const ExcelProcessor = require('../services/excel.service');
const PDFProcessor = require('../services/pdf.service');

// Configurar multer para almacenar archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    const name = (file.originalname || '').toLowerCase();
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/vnd.ms-excel.sheet.macroenabled.12', // .xlsm
      'application/pdf'
    ];
    const allowedExt = ['.xlsx', '.xls', '.xlsm', '.pdf'];
    const hasAllowedMime = allowedMimes.includes(mime);
    const hasAllowedExt = allowedExt.some(ext => name.endsWith(ext));
    if (hasAllowedMime || hasAllowedExt) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Aceptados: Excel (.xlsx, .xls, .xlsm) y PDF (.pdf)'));
    }
  }
});

/**
 * @route   POST /api/archivos/upload
 * @desc    Subir y procesar archivo
 * @access  Public
 */
router.post('/upload', auth, requireAdmin, upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha subido ningún archivo'
      });
    }

    const { tipo } = req.body;
    const año = (req.body['año'] ?? req.body['anio'] ?? req.body['year']);
    
    // Validar que el año sea proporcionado
    if (!año) {
      return res.status(400).json({
        success: false,
        message: 'El año académico es requerido'
      });
    }
    
    const añoInt = parseInt(año);
    if (isNaN(añoInt) || añoInt < 2015 || añoInt > 2035) {
      return res.status(400).json({
        success: false,
        message: 'Año académico inválido'
      });
    }
    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.filename).toLowerCase();

    let resultado;
    const tipoInferido = (fileExtension === '.pdf') ? 'pdf' : 'excel';

    // Procesar según el tipo de archivo
    if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      const excelProcessor = new ExcelProcessor();
      const modo = (tipo || '').toLowerCase();
      if (modo === 'excel_pagadores') {
        resultado = await excelProcessor.procesarExcelPagadoresFilas(
          filePath,
          1,
          añoInt
        );
      } else {
        resultado = await excelProcessor.procesarExcelPagos(
          filePath,
          1,
          añoInt
        );
      }
    } else if (fileExtension === '.pdf') {
      // Procesar PDF
      const pdfProcessor = new PDFProcessor();
      resultado = await pdfProcessor.procesarPDFDeudores(
        filePath,
        1, // usuarioId (temporal)
        añoInt
      );
    } else {
      // Eliminar archivo
      fs.unlinkSync(filePath);
      
      return res.status(400).json({
        success: false,
        message: 'Tipo de archivo no soportado'
      });
    }

    // Eliminar archivo temporal para no ocupar almacenamiento
    try { fs.unlinkSync(filePath); } catch (e) { /* noop */ }

    res.json({
      success: true,
      message: 'Archivo procesado exitosamente',
      resultado,
      tipo: tipoInferido,
      año: añoInt
    });

  } catch (error) {
    console.error('Error procesando archivo:', error);
    
    // Eliminar archivo si hubo error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error eliminando archivo:', err);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error procesando archivo',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

/**
 * @route   GET /api/archivos
 * @desc    Obtener lista de archivos procesados
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, tipo, año } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const clauses = [];
    const args = [];
    if (tipo) { args.push(tipo); clauses.push(`tipo_archivo = $${args.length}`); }
    if (año) { args.push(parseInt(año)); clauses.push(`año_academico = $${args.length}`); }
    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    // list query
    const listArgs = [...args, parseInt(limit), offset];
    const result = await query(`
      SELECT *
      FROM archivos_subidos
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${args.length + 1} OFFSET $${args.length + 2}
    `, listArgs);

    // count query
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM archivos_subidos
      ${whereClause}
    `, args);

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
    console.error('Error obteniendo archivos:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo archivos',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

// Eliminar un archivo procesado por ID (admin)
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // Obtener registro
    const sel = await query('SELECT id, ruta_archivo FROM archivos_subidos WHERE id = $1', [id]);
    if (sel.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
    }
    const ruta = sel.rows[0].ruta_archivo;
    // Borrar registro
    await query('DELETE FROM archivos_subidos WHERE id = $1', [id]);
    // Intentar borrar archivo físico si existe
    if (ruta) {
      try {
        if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
      } catch (e) {
        // no bloquear por error de fs
        console.warn('No se pudo borrar archivo físico:', e.message);
      }
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Error eliminando archivo:', error);
    res.status(500).json({ success: false, message: 'Error eliminando archivo' });
  }
});

module.exports = router;
