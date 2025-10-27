#!/bin/bash
# =====================================================
# SCRIPT DE CONFIGURACIÓN DE BASE DE DATOS
# Vanguard Estadísticas Pagos
# =====================================================

echo "🚀 Configurando base de datos para Vanguard Estadísticas Pagos..."

# Variables de configuración
DB_NAME="estadisticas_pagos"
DB_USER="estadisticas_user"
DB_PASSWORD="vanguard_stats_2024"

echo "📊 Creando base de datos: $DB_NAME"
echo "👤 Usuario: $DB_USER"

# Crear base de datos
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"

# Crear usuario
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"

# Otorgar permisos
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Conectar a la base de datos y otorgar permisos adicionales
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;"

echo "✅ Base de datos creada exitosamente!"
echo ""
echo "📋 Información de conexión:"
echo "   Host: localhost"
echo "   Puerto: 5432"
echo "   Base de datos: $DB_NAME"
echo "   Usuario: $DB_USER"
echo "   Contraseña: $DB_PASSWORD"
echo ""
echo "🔧 Ahora ejecuta las migraciones:"
echo "   cd backend"
echo "   npm run migrate"
echo ""
echo "🚀 Para iniciar el sistema:"
echo "   npm run dev"
