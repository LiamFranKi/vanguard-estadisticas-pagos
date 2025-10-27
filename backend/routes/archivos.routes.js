const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../utils/database');
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
    const allowedTypes = (process.env.UPLOAD_ALLOWED_TYPES || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf').split(',');
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten archivos Excel (.xlsx) y PDF (.pdf)'));
    }
  }
});

/**
 * @route   POST /api/archivos/upload
 * @desc    Subir y procesar archivo
 * @access  Public
 */
router.post('/upload', upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha subido ningún archivo'
      });
    }

    const { tipo, año = 2024 } = req.body;
    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.filename).toLowerCase();

    let resultado;

    // Procesar según el tipo de archivo
    if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      // Procesar Excel
      const excelProcessor = new ExcelProcessor();
      resultado = await excelProcessor.procesarExcelPagos(
        filePath,
        1, // usuarioId (temporal)
        parseInt(año)
      );
    } else if (fileExtension === '.pdf') {
      // Procesar PDF
      const pdfProcessor = new PDFProcessor();
      resultado = await pdfProcessor.procesarPDFDeudores(
        filePath,
        1, // usuarioId (temporal)
        parseInt(año)
      );
    } else {
      // Eliminar archivo
      fs.unlinkSync(filePath);
      
      return res.status(400).json({
        success: false,
        message: 'Tipo de archivo no soportado'
      });
    }

    res.json({
      success: true,
      message: 'Archivo procesado exitosamente',
      resultado
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
    const { page = 1, limit = 20, tipo } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = tipo ? 'WHERE tipo_archivo = $1' : '';
    const params = tipo ? [tipo] : [];

    const result = await query(`
      SELECT *
      FROM archivos_subidos
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${tipo ? 2 : 1} OFFSET $${tipo ? 3 : 2}
    `, tipo ? [tipo, parseInt(limit), offset] : [parseInt(limit), offset]);

    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM archivos_subidos
      ${whereClause}
    `, tipo ? [tipo] : []);

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

module.exports = router;

