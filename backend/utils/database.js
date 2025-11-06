const { Pool } = require('pg');

let pool;

const connectDB = async () => {
  try {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'estadisticas_pagos',
      user: process.env.DB_USER || 'estadisticas_user',
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Probar conexión
    const client = await pool.connect();
    console.log('📊 Conectado a PostgreSQL - Estadísticas Pagos');
    client.release();
    
    return pool;
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    throw error;
  }
};

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // Log solo queries lentas (> 100ms) para reducir ruido
    if (duration > 100) {
      console.log('📊 Query lenta:', { text: text.substring(0, 80), duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('❌ Error en query:', error);
    throw error;
  }
};

const getClient = async () => {
  return await pool.connect();
};

const closePool = async () => {
  if (pool) {
    await pool.end();
    console.log('📊 Pool de conexiones cerrado');
  }
};

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  console.log('🛑 Cerrando conexiones...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Cerrando conexiones...');
  await closePool();
  process.exit(0);
});

module.exports = {
  connectDB,
  query,
  getClient,
  closePool
};
