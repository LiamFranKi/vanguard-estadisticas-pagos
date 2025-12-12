# 📊 Configuración de Base de Datos - Sistema Multi-Año

## ✅ Modificaciones Implementadas

### 1. **Soporte Multi-Año Completo**
- ✅ Tabla `años_academicos` para gestionar años disponibles
- ✅ Selector de año en Dashboard
- ✅ APIs actualizadas para filtrar por año
- ✅ Historial completo de años (2022-2026)
- ✅ Validación de año al subir archivos

### 2. **Mejoras en Backend**
- ✅ Nueva API: `/api/años` - Gestión de años académicos
- ✅ Todas las consultas filtran por año académico
- ✅ Validación de año en carga de archivos
- ✅ Índices optimizados por año

### 3. **Mejoras en Frontend**
- ✅ Context `AñoContext` para manejar año seleccionado
- ✅ Selector de año en Dashboard
- ✅ Cambio automático de estadísticas al cambiar año
- ✅ Estilos responsive para selector

## 🚀 Pasos para Crear la Base de Datos

### 1. Instalar PostgreSQL (si no está instalado)

#### En Windows:
```powershell
# Descargar e instalar desde: https://www.postgresql.org/download/windows/
# O usar chocolatey:
choco install postgresql
```

#### En Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### 2. Iniciar PostgreSQL

#### En Windows:
```powershell
# Buscar "Services" en el menú de inicio
# Buscar "postgresql" y cambiar estado a "Running"
```

#### En Linux:
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3. Crear Base de Datos y Usuario

Abrir PowerShell y ejecutar:

```powershell
# Conectar a PostgreSQL como superusuario
psql -U postgres

# Dentro de psql, ejecutar:
CREATE DATABASE estadisticas_pagos;
CREATE USER estadisticas_user WITH PASSWORD 'vanguard_stats_2024';
GRANT ALL PRIVILEGES ON DATABASE estadisticas_pagos TO estadisticas_user;

# Salir
\q
```

### 4. Ejecutar Migraciones

```powershell
# Desde la raíz del proyecto
cd backend

# Configurar archivo .env
copy env.local .env

# Ejecutar migración principal
node scripts/migrate.js migrate

# Ejecutar migración de soporte multi-año
psql -U estadisticas_user -d estadisticas_pagos -f ../database/migrations/002_multi_year_support.sql
```

### 5. Verificar Creación

```powershell
# Verificar estado
node scripts/migrate.js check
```

Debe mostrar:
- ✅ Tablas creadas (configuracion_sistema, usuarios, grados, alumnos, tipos_pago, pagos, deudas, archivos_subidos, estadisticas_cache, años_academicos)
- ✅ Datos iniciales insertados
- ✅ Usuario administrador creado

### 6. Credenciales por Defecto

**Usuario Administrador:**
- **DNI:** `12345678`
- **Contraseña:** `password`

**Base de Datos:**
- **Host:** `localhost`
- **Puerto:** `5432`
- **Nombre:** `estadisticas_pagos`
- **Usuario:** `estadisticas_user`
- **Contraseña:** `vanguard_stats_2024`

## 📋 Características Multi-Año

### Selector de Año en Dashboard
- El Dashboard muestra el año actual por defecto
- Dropdown para seleccionar otros años (2022-2026)
- Cambio automático de estadísticas al seleccionar año

### Carga de Archivos por Año
- Al subir Excel de pagos: **Seleccionar año**
- Al subir PDF de deudores: **Seleccionar año**
- Validación: Solo años 2020-2030

### Historial Completo
- Ver estadísticas de cualquier año
- Datos no se mezclan entre años
- Búsqueda y filtros por año

### APIs Actualizadas
```javascript
// Obtener años disponibles
GET /api/años/disponibles

// Obtener estadísticas por año
GET /api/estadisticas/dashboard?año=2024

// Obtener alumnos por año
GET /api/alumnos?año=2024

// Cargar archivo con año
POST /api/archivos/upload
Body: { año: 2024, tipo: 'excel', archivo: File }
```

## 🎯 Próximos Pasos

1. **Instalar dependencias:**
```powershell
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

2. **Iniciar sistema:**
```powershell
# Desde la raíz
npm run dev
```

3. **Acceder al sistema:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Login con: DNI `12345678`, Password `password`

## 📊 Estructura de Datos por Año

### Tabla `años_academicos`
- `id`: ID único
- `año`: Año académico (2022-2026)
- `descripcion`: Descripción del año
- `activo`: Si está disponible
- `fecha_inicio`: Inicio del año
- `fecha_fin`: Fin del año

### Reglas:
- ✅ Cada año tiene sus propios alumnos, pagos y deudas
- ✅ Los alumnos pueden tener datos de múltiples años
- ✅ Las estadísticas son independientes por año
- ✅ Los archivos se procesan por año específico

## 🔒 Seguridad

- Todas las consultas filtran por año académico
- Validación de año en carga de archivos
- No se pueden ver años futuros (solo 2020-2030)
- Usuario debe seleccionar año explícitamente

---

**✅ Sistema listo para manejar múltiples años académicos con historial completo!**














