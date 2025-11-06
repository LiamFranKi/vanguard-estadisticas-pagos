const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: './env.local' });

const { connectDB } = require('./utils/database');

// Importar rutas
const alumnosRoutes = require('./routes/alumnos.routes');
const pagosRoutes = require('./routes/pagos.routes');
const deudasRoutes = require('./routes/deudas.routes');
const estadisticasRoutes = require('./routes/estadisticas.routes');
const archivosRoutes = require('./routes/archivos.routes');
const authRoutes = require('./routes/auth.routes');
const añosRoutes = require('./routes/anios.routes');
const configRoutes = require('./routes/config.routes');
const usuariosRoutes = require('./routes/usuarios.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware de seguridad
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo en 15 minutos.'
});
app.use(limiter);

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Servir archivos estáticos
app.use('/uploads', express.static('uploads'));

// Rutas de API
app.use('/api/auth', authRoutes);
app.use('/api/alumnos', alumnosRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/deudas', deudasRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/archivos', archivosRoutes);
app.use('/api/anios', añosRoutes);
app.use('/api/config', configRoutes);
app.use('/api/usuarios', usuariosRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Vanguard Estadísticas Pagos API',
    version: process.env.VERSION_SISTEMA || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'Vanguard Estadísticas Pagos API',
    version: process.env.VERSION_SISTEMA || '1.0.0',
    endpoints: {
      auth: '/api/auth',
      alumnos: '/api/alumnos',
      pagos: '/api/pagos',
      deudas: '/api/deudas',
      estadisticas: '/api/estadisticas',
      archivos: '/api/archivos',
      health: '/api/health'
    }
  });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'El archivo es demasiado grande. Máximo 10MB.'
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Tipo de archivo no permitido.'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Conectar a la base de datos y iniciar servidor
const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ Base de datos conectada');
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
      console.log(`📊 Vanguard Estadísticas Pagos API`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`📋 Health Check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
