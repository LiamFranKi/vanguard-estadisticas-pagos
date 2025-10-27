const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de la base de datos
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'estadisticas_pagos',
  user: process.env.DB_USER || 'estadisticas_user',
  password: process.env.DB_PASSWORD || 'vanguard_stats_2024',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando migraciones de base de datos...');
    
    // Leer archivo de migración
    const migrationPath = path.join(__dirname, '../database/migrations/001_create_main_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Ejecutar migración
    await client.query(migrationSQL);
    
    console.log('✅ Migración ejecutada exitosamente!');
    
    // Verificar tablas creadas
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📊 Tablas creadas:');
    tablesResult.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
    // Verificar datos iniciales
    const configResult = await client.query('SELECT * FROM configuracion_sistema');
    const gradosResult = await client.query('SELECT COUNT(*) as count FROM grados');
    const tiposPagoResult = await client.query('SELECT COUNT(*) as count FROM tipos_pago');
    const usuariosResult = await client.query('SELECT COUNT(*) as count FROM usuarios');
    
    console.log('📋 Datos iniciales:');
    console.log(`   ⚙️ Configuración: ${configResult.rows.length > 0 ? '✅ Creada' : '❌ No encontrada'}`);
    console.log(`   📚 Grados: ${gradosResult.rows[0].count} grados`);
    console.log(`   💰 Tipos de pago: ${tiposPagoResult.rows[0].count} tipos`);
    console.log(`   👥 Usuarios: ${usuariosResult.rows[0].count} usuarios`);
    
    console.log('');
    console.log('🎉 Base de datos configurada correctamente!');
    console.log('');
    console.log('🔑 Usuario administrador por defecto:');
    console.log('   DNI: 12345678');
    console.log('   Contraseña: password');
    console.log('');
    console.log('🚀 Para iniciar el sistema:');
    console.log('   npm run dev');
    
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function checkDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando estado de la base de datos...');
    
    // Verificar conexión
    const result = await client.query('SELECT NOW() as current_time');
    console.log(`✅ Conectado a PostgreSQL: ${result.rows[0].current_time}`);
    
    // Verificar tablas
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`📊 Tablas encontradas: ${tablesResult.rows.length}`);
    tablesResult.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
    // Verificar datos
    const configResult = await client.query('SELECT nombre_sistema FROM configuracion_sistema LIMIT 1');
    if (configResult.rows.length > 0) {
      console.log(`⚙️ Sistema: ${configResult.rows[0].nombre_sistema}`);
    }
    
    const gradosResult = await client.query('SELECT COUNT(*) as count FROM grados');
    console.log(`📚 Grados: ${gradosResult.rows[0].count}`);
    
    const tiposPagoResult = await client.query('SELECT COUNT(*) as count FROM tipos_pago');
    console.log(`💰 Tipos de pago: ${tiposPagoResult.rows[0].count}`);
    
    const usuariosResult = await client.query('SELECT COUNT(*) as count FROM usuarios');
    console.log(`👥 Usuarios: ${usuariosResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error verificando base de datos:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar según el comando
const command = process.argv[2];

if (command === 'migrate') {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
} else if (command === 'check') {
  checkDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
} else {
  console.log('📋 Comandos disponibles:');
  console.log('   node scripts/migrate.js migrate  - Ejecutar migraciones');
  console.log('   node scripts/migrate.js check    - Verificar estado');
}
