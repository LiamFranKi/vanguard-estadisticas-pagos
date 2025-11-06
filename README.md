# 📊 VANGUARD ESTADÍSTICAS PAGOS

Sistema completo de estadísticas de pagos de pensiones para Vanguard Schools con diseño responsive para móviles, tablets y escritorio.

## 🎯 **Descripción del Sistema**

Sistema moderno para gestionar y analizar los pagos de pensiones del colegio, incluyendo:

- **📈 Dashboard Responsive** - Estadísticas en tiempo real
- **📋 Carga de Archivos** - Excel (pagos) y PDF (deudores)
- **📊 Gráficos Interactivos** - Chart.js con diseño responsive
- **👥 Gestión de Alumnos** - CRUD completo
- **📋 Reportes Avanzados** - Por grado, mes, año

## 🏗️ **Arquitectura**

### **Stack Tecnológico:**
- **Backend:** Node.js + Express + PostgreSQL
- **Frontend:** React + Vite + PWA
- **Infraestructura:** Hostinger VPS + Nginx
- **Subdominio:** `estadisticas.vanguardschools.com`

### **Diseño Responsive:**
- **📱 Móviles (< 768px):** Menú hamburguesa, cards apiladas
- **📱 Tablets (768px - 1024px):** Menú híbrido con iconos
- **💻 Escritorio (> 1024px):** Menú completo horizontal

## 🚀 **Instalación Rápida**

### **Opción 1: Instalación Automática**
```bash
# Dar permisos de ejecución
chmod +x scripts/install.sh

# Ejecutar instalación completa
./scripts/install.sh
```

### **Opción 2: Instalación Manual**

#### **1. Instalar Dependencias**
```bash
# Instalar dependencias raíz
npm install

# Instalar dependencias del backend
cd backend
npm install

# Instalar dependencias del frontend
cd ../frontend
npm install
cd ..
```

#### **2. Configurar Base de Datos**
```bash
# Crear base de datos PostgreSQL
sudo -u postgres psql -c "CREATE DATABASE estadisticas_pagos;"
sudo -u postgres psql -c "CREATE USER estadisticas_user WITH PASSWORD 'vanguard_stats_2024';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE estadisticas_pagos TO estadisticas_user;"

# Ejecutar migraciones
cd backend
node scripts/migrate.js migrate
cd ..
```

#### **3. Configurar Variables de Entorno**
```bash
# Copiar archivo de configuración
cp backend/env.local backend/.env
```

#### **4. Iniciar Sistema**
```bash
# Iniciar desarrollo
npm run dev
```

## 📋 **Estructura de Datos**

### **Excel de Pagos Totales:**
- **Matrícula** (pago único al inicio del año)
- **Pensiones Marzo-Diciembre** (10 meses de pensiones)
- **Frecuencia:** Una vez al año (base completa)

### **PDF de Alumnos Deudores:**
- **Contenido:** Lista diaria de alumnos que deben pensiones
- **Estructura:** Nombre, DNI, Grado, Meses adeudados
- **Frecuencia:** Diaria (actualización constante)

## 🔑 **Credenciales de Acceso**

### **Usuario Administrador:**
- **DNI:** `12345678`
- **Contraseña:** `password`
- **Rol:** Administrador

## 🌐 **URLs del Sistema**

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000/api/health

## 📱 **Características Responsive**

### **Móviles (< 768px):**
- ✅ Menú hamburguesa deslizable
- ✅ Cards apiladas verticalmente
- ✅ Gráficos adaptados
- ✅ Formularios optimizados para táctil

### **Tablets (768px - 1024px):**
- ✅ Menú horizontal con iconos
- ✅ Grid de 2-3 columnas
- ✅ Navegación híbrida
- ✅ Botones de administración accesibles

### **Escritorio (> 1024px):**
- ✅ Menú horizontal completo
- ✅ Grid de 4 columnas
- ✅ Dashboard expandido
- ✅ Todas las funcionalidades visibles

## 🎨 **Características de Diseño**

### **Glassmorphism:**
- ✅ Efectos de vidrio modernos
- ✅ Backdrop blur en todos los componentes
- ✅ Transparencias elegantes
- ✅ Bordes sutiles

### **Animaciones:**
- ✅ Transiciones suaves
- ✅ Efectos hover profesionales
- ✅ Animaciones de carga
- ✅ Feedback visual inmediato

### **Colores Dinámicos:**
- ✅ Configurables desde base de datos
- ✅ Gradientes automáticos
- ✅ Tema consistente
- ✅ Accesibilidad mejorada

## 📊 **Funcionalidades Principales**

### **1. Dashboard de Estadísticas**
- **Ingresos por Mes:** Gráficos de barras interactivos
- **Ingresos por Grado:** Comparativas detalladas
- **Deudas Pendientes:** Seguimiento diario
- **Resumen Ejecutivo:** KPIs principales

### **2. Carga de Archivos**
- **Excel:** Pagos totales del año (una vez al año)
- **PDF:** Alumnos deudores (diario)
- **Validación:** Tipos de archivo y estructura
- **Procesamiento:** Extracción automática de datos

### **3. Gestión de Alumnos**
- **CRUD Completo:** Crear, leer, actualizar, eliminar
- **Búsqueda Avanzada:** Por DNI, nombre, grado
- **Filtros:** Por grado, estado de pago
- **Exportación:** PDF, Excel, CSV

### **4. Reportes Avanzados**
- **Estado de Pagos:** Por alumno, grado, mes
- **Análisis de Deudas:** Tendencias y patrones
- **Comparativas:** Años anteriores
- **Gráficos:** Chart.js responsive

## 🔧 **Comandos Útiles**

### **Desarrollo:**
```bash
npm run dev          # Iniciar desarrollo completo
npm run backend      # Solo backend
npm run frontend     # Solo frontend
npm run build        # Construir para producción
```

### **Base de Datos:**
```bash
cd backend
node scripts/migrate.js migrate  # Ejecutar migraciones
node scripts/migrate.js check    # Verificar estado
```

### **Verificación:**
```bash
# Verificar estado de la base de datos
cd backend
node scripts/migrate.js check

# Verificar conexión
curl http://localhost:5000/api/health
```

## 📁 **Estructura del Proyecto**

```
vanguard-estadisticas-pagos/
├── backend/
│   ├── controllers/          # Controladores de API
│   ├── routes/              # Rutas de API
│   ├── middleware/          # Middleware de autenticación
│   ├── services/            # Procesadores de archivos
│   ├── utils/               # Utilidades y helpers
│   ├── uploads/             # Archivos subidos
│   ├── scripts/             # Scripts de migración
│   └── server.js            # Servidor principal
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   ├── pages/          # Páginas principales
│   │   ├── contexts/       # Contextos de React
│   │   ├── services/       # Servicios de API
│   │   └── utils/         # Utilidades frontend
│   ├── public/             # Archivos estáticos
│   └── index.html          # HTML principal
├── database/
│   └── migrations/         # Scripts SQL
├── scripts/               # Scripts de instalación
└── docs/                  # Documentación
```

## 🚀 **Deployment en Hostinger**

### **1. Preparar Archivos:**
```bash
# Construir frontend
cd frontend
npm run build
cd ..

# Comprimir proyecto
tar -czf vanguard-estadisticas.tar.gz .
```

### **2. Subir a Hostinger:**
```bash
# Usar WinSCP para subir archivos
# Descomprimir en /var/www/estadisticas/
```

### **3. Configurar Servidor:**
```bash
# Instalar dependencias
cd /var/www/estadisticas/backend
npm install --production

# Configurar base de datos
# Ejecutar migraciones
node scripts/migrate.js migrate

# Configurar Nginx
sudo nano /etc/nginx/sites-available/estadisticas
```

### **4. Configuración Nginx:**
```nginx
server {
    listen 80;
    server_name estadisticas.vanguardschools.com;

    # Frontend
    location / {
        root /var/www/estadisticas/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### **5. SSL con Let's Encrypt:**
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d estadisticas.vanguardschools.com
```

## 🔐 **Seguridad**

- **Autenticación JWT:** Tokens seguros con expiración
- **Validación de Archivos:** Tipos y tamaños permitidos
- **Sanitización:** Datos de entrada limpiados
- **HTTPS:** Certificados SSL obligatorios
- **CORS:** Configuración segura de origen

## 📱 **PWA Features**

- **Instalación Nativa:** Como app móvil
- **Funcionamiento Offline:** Caché inteligente
- **Notificaciones Push:** Alertas importantes
- **Responsive Design:** Todos los dispositivos

## 🐛 **Solución de Problemas**

### **Error de Conexión a BD:**
```bash
# Verificar PostgreSQL
sudo systemctl status postgresql

# Verificar usuario y permisos
sudo -u postgres psql -c "\du"
```

### **Error de Dependencias:**
```bash
# Limpiar caché
npm cache clean --force

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### **Error de Puerto:**
```bash
# Verificar puertos en uso
netstat -tulpn | grep :5000
netstat -tulpn | grep :3000

# Matar procesos si es necesario
sudo kill -9 PID
```

## 📞 **Soporte**

Para soporte técnico o consultas:
- **Email:** soporte@vanguardschools.com
- **Sitio Web:** https://vanguardschools.com

## 📄 **Licencia**

MIT License - Ver [LICENSE](LICENSE) para más detalles.

---

**Desarrollado con ❤️ para Vanguard Schools**

**Versión:** 1.0.0  
**Última actualización:** Diciembre 2024  
**Estado:** 🚧 En Desarrollo

---

## 📝 Historial de Cambios (2025-10-27)

### UI/UX Landing y Login
- Hero del Landing con gradiente `--primary-color → --secondary-color` y círculos difuminados.
- Botones primarios con gradiente y sombras consistentes.
- Cards de "Números que Hablan" con variantes de color y hover.
- Login con fondo gradiente + círculos, card blanco claro, título azul, inputs azul claro, botón en gradiente y enlace "← Volver al inicio".
- Ajustes de espaciado para un card más compacto.

### Paleta y Configuración desde BD
- `ConfigContext` lee `GET /api/config` (forma `{ success, data }`).
- Se propagan `color_primario` y `color_secundario` a variables CSS globales `--primary-color` y `--secondary-color` al cargar.
- Login y Landing usan `config.nombre_sistema`, `config.descripcion_sistema` y `config.logo` (si existe).

### Footer dinámico
- Footer del Landing muestra logo/nombre/descripcion/contacto desde BD.
- Año mostrado siempre es el actual (`new Date().getFullYear()`).

### Autenticación
- `checkAuth` ahora usa `POST /api/auth/verify` con `{ token }`.
- `logout` es client-side (se eliminó llamada a `/api/auth/logout`).

### Notas de estilo y compatibilidad
- El Login permanece claro aun en `prefers-color-scheme: dark`.
- Se añadió soporte para logo desde BD en Login; en Landing se mantiene sin logo por decisión de diseño.

---

## 🎉 **¡Sistema Listo!**

El sistema está completamente configurado y listo para usar. Incluye:

✅ **Backend completo** con APIs funcionales  
✅ **Frontend responsive** para todos los dispositivos  
✅ **Base de datos** con estructura completa  
✅ **Procesadores** de Excel y PDF  
✅ **Diseño moderno** con glassmorphism  
✅ **PWA ready** para instalación móvil  

**¡Disfruta tu nuevo sistema de estadísticas! 🚀**