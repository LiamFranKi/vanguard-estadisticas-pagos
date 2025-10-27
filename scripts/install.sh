#!/bin/bash
# =====================================================
# SCRIPT DE INSTALACIÓN COMPLETA
# Vanguard Estadísticas Pagos
# =====================================================

echo "🚀 Instalando Vanguard Estadísticas Pagos..."
echo "=============================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar si estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "No se encontró package.json. Asegúrate de estar en el directorio raíz del proyecto."
    exit 1
fi

print_status "Verificando dependencias del sistema..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado. Por favor instala Node.js 18+ primero."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js versión 18+ requerida. Versión actual: $(node -v)"
    exit 1
fi

print_success "Node.js $(node -v) encontrado"

# Verificar PostgreSQL
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL no está instalado. Por favor instala PostgreSQL 12+ primero."
    exit 1
fi

print_success "PostgreSQL encontrado"

# Verificar npm
if ! command -v npm &> /dev/null; then
    print_error "npm no está instalado."
    exit 1
fi

print_success "npm $(npm -v) encontrado"

echo ""
print_status "Instalando dependencias del proyecto..."

# Instalar dependencias raíz
print_status "Instalando dependencias raíz..."
npm install

if [ $? -ne 0 ]; then
    print_error "Error instalando dependencias raíz"
    exit 1
fi

# Instalar dependencias del backend
print_status "Instalando dependencias del backend..."
cd backend
npm install

if [ $? -ne 0 ]; then
    print_error "Error instalando dependencias del backend"
    exit 1
fi

# Instalar dependencias del frontend
print_status "Instalando dependencias del frontend..."
cd ../frontend
npm install

if [ $? -ne 0 ]; then
    print_error "Error instalando dependencias del frontend"
    exit 1
fi

cd ..

print_success "Dependencias instaladas correctamente"

echo ""
print_status "Configurando base de datos..."

# Crear base de datos
print_status "Creando base de datos PostgreSQL..."

# Variables de configuración
DB_NAME="estadisticas_pagos"
DB_USER="estadisticas_user"
DB_PASSWORD="vanguard_stats_2024"

# Crear base de datos
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || print_warning "Base de datos ya existe"

# Crear usuario
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || print_warning "Usuario ya existe"

# Otorgar permisos
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null

# Conectar a la base de datos y otorgar permisos adicionales
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;" 2>/dev/null
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;" 2>/dev/null
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;" 2>/dev/null
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;" 2>/dev/null
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;" 2>/dev/null

print_success "Base de datos configurada"

echo ""
print_status "Ejecutando migraciones..."

# Ejecutar migraciones
cd backend
node scripts/migrate.js migrate

if [ $? -ne 0 ]; then
    print_error "Error ejecutando migraciones"
    exit 1
fi

cd ..

print_success "Migraciones ejecutadas correctamente"

echo ""
print_status "Configurando archivos de entorno..."

# Crear archivo .env del backend si no existe
if [ ! -f "backend/.env" ]; then
    print_status "Creando archivo .env del backend..."
    cp backend/env.local backend/.env
    print_success "Archivo .env creado"
else
    print_warning "Archivo .env ya existe, manteniendo configuración actual"
fi

echo ""
print_success "🎉 Instalación completada exitosamente!"
echo ""
echo "📋 Información del sistema:"
echo "   🌐 Frontend: http://localhost:3000"
echo "   🔧 Backend: http://localhost:5000"
echo "   📊 Base de datos: $DB_NAME"
echo "   👤 Usuario BD: $DB_USER"
echo ""
echo "🔑 Credenciales de acceso:"
echo "   DNI: 12345678"
echo "   Contraseña: password"
echo "   Rol: Administrador"
echo ""
echo "🚀 Para iniciar el sistema:"
echo "   npm run dev"
echo ""
echo "📚 Comandos útiles:"
echo "   npm run dev          - Iniciar desarrollo"
echo "   npm run build        - Construir para producción"
echo "   npm run backend      - Solo backend"
echo "   npm run frontend     - Solo frontend"
echo ""
echo "🔍 Verificar estado de la BD:"
echo "   cd backend && node scripts/migrate.js check"
echo ""
print_success "¡Sistema listo para usar! 🚀"
