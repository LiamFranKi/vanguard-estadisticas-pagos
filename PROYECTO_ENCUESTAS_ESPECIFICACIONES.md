# 📋 PROYECTO: SISTEMA DE ENCUESTAS VANGUARD
## Especificaciones Completas y Contexto de Deployment

---

## 🎯 DESCRIPCIÓN GENERAL DEL PROYECTO

Sistema web de encuestas para padres de familia de Vanguard Schools. Permite a los administradores crear y gestionar encuestas, y a los padres responderlas de forma anónima sin necesidad de login.

---

## 🏗️ ARQUITECTURA TÉCNICA

### **Stack Tecnológico (IGUAL que Estadísticas Pagos)**
- **Frontend**: React 18 + Vite 5
- **Backend**: Node.js 20.x + Express 4
- **Base de Datos**: PostgreSQL 14+
- **Gestión de Paquetes**: npm
- **Servidor Web**: Nginx (proxy reverso)
- **Gestión de Procesos**: PM2
- **Control de Versiones**: Git + GitHub
- **Hosting**: Hostinger VPS (mismo servidor que Calendar y Estadísticas)

### **Servidor VPS**
- **IP**: 72.60.172.101
- **Hostname**: srv1063042.hstgr.cloud
- **Usuario SSH**: root
- **Password**: Vanguard2025@&
- **Directorio**: `/var/www/encuestas/` (NUEVA CARPETA)
- **Subdominio**: `encuestas.vanguardschools.com`
- **Puerto Backend**: 5002 (5000=Calendar, 5001=Estadísticas, 5002=Encuestas)

---

## 🎨 DISEÑO Y UI/UX

### **Paleta de Colores (Vanguard Calendar)**
Usar los mismos colores que en Estadísticas Pagos para consistencia visual:

```css
--primary-color: #1976d2 (azul)
--secondary-color: #7c3aed (púrpura)
--success-color: #10b981 (verde)
--danger-color: #ef4444 (rojo)
--warning-color: #f59e0b (naranja)
```

### **Landing Page (Público - Sin Login)**
- **Hero Section**: 
  - Título: "Encuestas Vanguard Schools"
  - Subtítulo: "Tu opinión nos ayuda a mejorar"
  - Gradiente de fondo (dos colores como Calendar)
  - Icono/ilustración SVG relacionado con encuestas
  
- **Sección de Encuestas Activas**:
  - Cards con las encuestas disponibles
  - Título de la encuesta
  - Descripción breve
  - Botón "Responder Encuesta"
  - Solo mostrar encuestas con `estado = 'activa'`
  
- **Footer**:
  - Copyright Vanguard Schools
  - Enlaces a redes sociales
  - Link "Administrar" (va a /admin/login)

### **Diseño Responsive**
- ✅ Desktop: Cards en grid 2-3 columnas
- ✅ Tablet: Cards en grid 2 columnas
- ✅ Móvil: Cards en 1 columna, full-width
- ✅ Botones full-width en móvil
- ✅ Textos adaptables
- ✅ Menú hamburguesa en móvil

---

## 📊 ESTRUCTURA DE LA BASE DE DATOS

### **Tablas Principales**

#### **1. usuarios**
```sql
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  dni VARCHAR(9) UNIQUE NOT NULL,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  clave VARCHAR(255) NOT NULL, -- Hash bcrypt
  rol VARCHAR(50) DEFAULT 'Administrador',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **2. encuestas**
```sql
CREATE TABLE encuestas (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(20) DEFAULT 'borrador', -- 'borrador', 'activa', 'cerrada'
  fecha_inicio DATE,
  fecha_fin DATE,
  solicitar_grado BOOLEAN DEFAULT true, -- ¿Pedir grado al padre?
  mensaje_agradecimiento TEXT,
  created_by INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **3. grados** (Lista de grados para filtrar)
```sql
CREATE TABLE grados (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  nivel VARCHAR(50), -- 'Inicial', 'Primaria', 'Secundaria'
  orden INTEGER,
  activo BOOLEAN DEFAULT true
);
```

#### **4. preguntas**
```sql
CREATE TABLE preguntas (
  id SERIAL PRIMARY KEY,
  encuesta_id INTEGER REFERENCES encuestas(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL,
  texto_pregunta TEXT NOT NULL,
  subtitulo TEXT, -- Opcional
  tipo_respuesta VARCHAR(50) NOT NULL, -- 'marcar', 'lista', 'texto_corto', 'texto_largo', 'escala'
  obligatoria BOOLEAN DEFAULT true,
  opciones JSONB, -- Para tipo 'marcar' o 'lista': ["Opción 1", "Opción 2", ...]
  created_at TIMESTAMP DEFAULT NOW()
);
```

Ejemplo de `opciones` para tipo 'marcar':
```json
{
  "opciones": ["Muy satisfecho", "Satisfecho", "Neutral", "Insatisfecho", "Muy insatisfecho"],
  "multiple": false
}
```

Ejemplo de `opciones` para tipo 'escala':
```json
{
  "min": 1,
  "max": 5,
  "etiqueta_min": "Muy malo",
  "etiqueta_max": "Excelente"
}
```

#### **5. respuestas**
```sql
CREATE TABLE respuestas (
  id SERIAL PRIMARY KEY,
  encuesta_id INTEGER REFERENCES encuestas(id) ON DELETE CASCADE,
  grado_seleccionado VARCHAR(100), -- Grado que seleccionó el padre
  fecha_respuesta TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45), -- Para prevenir duplicados (opcional)
  user_agent TEXT
);
```

#### **6. respuestas_detalle**
```sql
CREATE TABLE respuestas_detalle (
  id SERIAL PRIMARY KEY,
  respuesta_id INTEGER REFERENCES respuestas(id) ON DELETE CASCADE,
  pregunta_id INTEGER REFERENCES preguntas(id) ON DELETE CASCADE,
  texto_respuesta TEXT, -- Para respuestas de texto
  valor_numerico INTEGER, -- Para escalas
  opciones_seleccionadas JSONB -- Para marcar múltiple: ["Opción 1", "Opción 3"]
);
```

#### **7. configuracion_sistema** (igual que Estadísticas)
```sql
CREATE TABLE configuracion_sistema (
  id SERIAL PRIMARY KEY,
  nombre_sistema VARCHAR(100) DEFAULT 'Vanguard Encuestas',
  descripcion_sistema TEXT,
  logo TEXT,
  color_primario VARCHAR(7) DEFAULT '#1976d2',
  color_secundario VARCHAR(7) DEFAULT '#7c3aed',
  email_sistema VARCHAR(100),
  telefono_sistema VARCHAR(20),
  direccion_sistema TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎯 FUNCIONALIDADES DEL SISTEMA

### **PARTE PÚBLICA (SIN LOGIN)**

#### **1. Landing Page**
- ✅ Muestra encuestas con `estado = 'activa'`
- ✅ Cards atractivos con título y descripción
- ✅ Botón "Responder Encuesta" por cada una
- ✅ Responsive (móvil, tablet, desktop)
- ✅ Link "Administrar" en footer (va a /admin/login)

#### **2. Página de Encuesta**
**Flujo:**
1. **Selección de Grado** (si `solicitar_grado = true`):
   - Dropdown con lista de grados activos
   - Agrupados por nivel (Inicial, Primaria, Secundaria)
   - Botón "Continuar"

2. **Formulario de Preguntas**:
   - Mostrar preguntas en orden
   - Renderizar según tipo:
     - **Marcar (radio/checkbox)**: Botones de opción
     - **Lista (select)**: Dropdown
     - **Texto corto**: Input text
     - **Texto largo**: Textarea
     - **Escala (1-5)**: Estrellas o números clickeables
   - Validar preguntas obligatorias
   - Botón "Enviar Encuesta"

3. **Página de Agradecimiento**:
   - Mensaje personalizado de la encuesta
   - Opción de volver al inicio
   - Animación de éxito

---

### **PARTE ADMINISTRATIVA (CON LOGIN)**

#### **1. Login Admin**
- Diseño similar a Estadísticas Pagos
- Solo DNI y Contraseña
- Link "Volver al inicio"
- Gradient de fondo

#### **2. Dashboard Admin**
- **Cards de resumen**:
  - Total de encuestas (borrador, activas, cerradas)
  - Total de respuestas recibidas
  - Encuesta más respondida
  
- **Lista de Encuestas**:
  - Tabla: Título, Estado, Respuestas, Fecha Inicio/Fin, Acciones
  - Estados con colores: 
    - Borrador: gris
    - Activa: verde
    - Cerrada: rojo
  - Acciones: Ver, Editar, Activar/Cerrar, Eliminar, Resultados

#### **3. Crear/Editar Encuesta**
**Formulario:**
- Información General:
  - Título de la encuesta
  - Descripción
  - Fecha inicio / Fecha fin
  - Mensaje de agradecimiento
  - ¿Solicitar grado? (checkbox)

- Constructor de Preguntas:
  - Botón "+ Agregar Pregunta"
  - Cada pregunta tiene:
    - Texto de la pregunta
    - Subtítulo (opcional)
    - Tipo de respuesta (select)
    - ¿Obligatoria? (checkbox)
    - Configuración según tipo:
      - **Marcar**: Agregar opciones + ¿Permitir múltiple?
      - **Lista**: Agregar opciones
      - **Texto**: Placeholder (opcional)
      - **Escala**: Min, Max, Etiquetas
  - Ordenar preguntas (drag & drop o botones ↑↓)
  - Eliminar pregunta

- Botones:
  - Guardar como Borrador
  - Activar Encuesta
  - Cancelar

#### **4. Ver Resultados**
- **Resumen General**:
  - Total de respuestas
  - Fecha de la encuesta
  - Estado
  - Exportar a Excel/PDF

- **Resultados por Pregunta**:
  - Para tipo Marcar/Lista: Gráfico de barras/donut con conteo
  - Para tipo Texto: Lista de respuestas
  - Para tipo Escala: Promedio + Gráfico de distribución

- **Filtros**:
  - Por grado (si se solicitó)
  - Por rango de fechas

- **Exportación**:
  - Excel: Todas las respuestas en formato tabla
  - PDF: Informe con gráficos

#### **5. Configuración del Sistema**
- Igual que Estadísticas Pagos:
  - Nombre del sistema
  - Descripción
  - Colores (primario, secundario)
  - Logo
  - Datos de contacto

#### **6. Usuarios** (Opcional - puede ser 1 solo admin)
- CRUD de usuarios administradores
- Solo rol "Administrador"
- Similar a Estadísticas Pagos

---

## 🔐 AUTENTICACIÓN

### **Admin**
- Login con DNI + Contraseña
- JWT Token (igual que Estadísticas)
- Rutas protegidas con middleware

### **Público**
- Sin login
- Sin registro
- Respuestas anónimas (solo registrar IP para evitar duplicados)

---

## 🌐 DEPLOYMENT EN HOSTINGER VPS

### **Contexto del Servidor Actual**

El servidor VPS ya tiene:
- ✅ Node.js v20.19.5
- ✅ PostgreSQL v14.19
- ✅ Nginx v1.18.0
- ✅ PM2 v6.0.13
- ✅ Certbot (SSL)
- ✅ 2 sistemas corriendo:
  - `backend-calendario` (puerto 5000)
  - `estadisticas-backend` (puerto 5001)

### **Nuevo Sistema: Encuestas**

#### **Estructura de Directorios**
```
/var/www/encuestas/
├── backend/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── middleware/
│   ├── server.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── contexts/
│   │   ├── services/
│   │   └── App.jsx
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── database/
    └── schema.sql
```

#### **Configuración de Puertos**
- Backend: **5002** (puerto interno)
- Frontend: Nginx sirve archivos estáticos (puerto 80/443)
- No hay servidor frontend corriendo (igual que Estadísticas)

#### **Variables de Entorno**

**`backend/.env`:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=encuestas_vanguard
DB_USER=encuestas_user
DB_PASSWORD=Encuestas2025@Secure

PORT=5002
NODE_ENV=production
FRONTEND_URL=https://encuestas.vanguardschools.com

JWT_SECRET=vanguard_encuestas_jwt_secret_2025_change_this
JWT_EXPIRES_IN=24h

CORS_ORIGIN=https://encuestas.vanguardschools.com
```

**`frontend/.env`:**
```env
VITE_API_URL=https://encuestas.vanguardschools.com/api
VITE_BACKEND_URL=https://encuestas.vanguardschools.com
```

#### **Configuración de Nginx**

**Archivo**: `/etc/nginx/sites-available/encuestas`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name encuestas.vanguardschools.com;

    root /var/www/encuestas/frontend/dist;
    index index.html;

    client_max_body_size 10M;

    # Frontend estático
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=3600";
    }

    # API Backend
    location /api/ {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads (si hay logos o archivos)
    location /uploads/ {
        alias /var/www/encuestas/backend/uploads/;
        add_header Cache-Control "public, max-age=31536000";
    }
}
```

#### **PM2 Configuration**

**Archivo**: `backend/ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'encuestas-backend',
    script: 'server.js',
    cwd: '/var/www/encuestas/backend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5002
    },
    error_file: '/var/log/pm2/encuestas-backend-error.log',
    out_file: '/var/log/pm2/encuestas-backend-out.log',
    time: true,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false,
    max_memory_restart: '300M'
  }]
};
```

#### **Comandos de Deployment**

```bash
# 1. Crear directorio
sudo mkdir -p /var/www/encuestas

# 2. Clonar desde GitHub
cd /var/www/encuestas
git clone https://github.com/LiamFranKi/vanguard-encuestas.git .

# 3. Crear base de datos
sudo -u postgres psql
CREATE DATABASE encuestas_vanguard;
CREATE USER encuestas_user WITH PASSWORD 'Encuestas2025@Secure';
GRANT ALL PRIVILEGES ON DATABASE encuestas_vanguard TO encuestas_user;
\c encuestas_vanguard
GRANT ALL ON SCHEMA public TO encuestas_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO encuestas_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO encuestas_user;
\q

# 4. Importar schema
sudo -u postgres psql -d encuestas_vanguard -f /var/www/encuestas/database/schema.sql

# 5. Configurar backend
cd /var/www/encuestas/backend
nano .env  # Copiar la config de arriba
npm install

# 6. Configurar frontend
cd /var/www/encuestas/frontend
nano .env  # Copiar la config de arriba
npm install
npm run build

# 7. Configurar Nginx
sudo nano /etc/nginx/sites-available/encuestas  # Copiar config de arriba
sudo ln -s /etc/nginx/sites-available/encuestas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 8. Iniciar backend con PM2
cd /var/www/encuestas/backend
pm2 start ecosystem.config.js
pm2 save

# 9. Configurar DNS en Hostinger
# Panel Hostinger → DNS → Agregar registro A:
# Nombre: encuestas
# Apunta a: 72.60.172.101
# TTL: 14400

# 10. Configurar SSL
sudo certbot --nginx -d encuestas.vanguardschools.com
```

---

## 📱 FLUJO DE USUARIO (PADRE DE FAMILIA)

### **1. Acceso a la Encuesta**
```
https://encuestas.vanguardschools.com
```

1. Landing page muestra encuestas activas
2. Padre hace click en "Responder Encuesta"
3. Si `solicitar_grado = true`:
   - Pantalla de selección de grado
   - Dropdown con lista de grados
   - Botón "Continuar"
4. Formulario con todas las preguntas
5. Botón "Enviar Respuestas"
6. Validación de campos obligatorios
7. Mensaje de agradecimiento
8. Opción de volver al inicio

### **2. Tipos de Preguntas**

#### **Tipo: MARCAR (Radio/Checkbox)**
```javascript
{
  tipo_respuesta: 'marcar',
  opciones: {
    opciones: ["Muy satisfecho", "Satisfecho", "Neutral"],
    multiple: false  // false = radio, true = checkbox
  }
}
```

**Renderizado:**
- Radio buttons (selección única) o
- Checkboxes (selección múltiple)

#### **Tipo: LISTA (Select/Dropdown)**
```javascript
{
  tipo_respuesta: 'lista',
  opciones: {
    opciones: ["Matemáticas", "Comunicación", "Ciencias", "Arte"]
  }
}
```

**Renderizado:**
- Dropdown (`<select>`)

#### **Tipo: TEXTO CORTO**
```javascript
{
  tipo_respuesta: 'texto_corto',
  opciones: {
    placeholder: "Tu respuesta aquí...",
    max_length: 200
  }
}
```

**Renderizado:**
- Input text

#### **Tipo: TEXTO LARGO**
```javascript
{
  tipo_respuesta: 'texto_largo',
  opciones: {
    placeholder: "Escribe tu comentario detallado...",
    max_length: 1000
  }
}
```

**Renderizado:**
- Textarea (4-6 líneas)

#### **Tipo: ESCALA (1-5, 1-10)**
```javascript
{
  tipo_respuesta: 'escala',
  opciones: {
    min: 1,
    max: 5,
    etiqueta_min: "Muy malo",
    etiqueta_max: "Excelente"
  }
}
```

**Renderizado:**
- Botones numerados (1, 2, 3, 4, 5)
- O estrellas (⭐⭐⭐⭐⭐)

---

## 🛠️ FUNCIONALIDADES ADMIN

### **1. Dashboard Admin**
- Total de encuestas (por estado)
- Total de respuestas
- Últimas respuestas recibidas
- Botón "+ Nueva Encuesta"

### **2. Gestión de Encuestas**

#### **Crear Encuesta**
1. Formulario de información general
2. Constructor de preguntas:
   - Botón "+ Agregar Pregunta"
   - Modal para configurar pregunta:
     - Texto de la pregunta
     - Subtítulo (opcional)
     - Tipo de respuesta (select)
     - ¿Obligatoria? (toggle)
     - Configuración según tipo (opciones, escalas, etc.)
   - Lista de preguntas con:
     - Número de orden
     - Texto de la pregunta
     - Tipo
     - Botones: Editar, Eliminar, ↑ Subir, ↓ Bajar
3. Botones: Guardar Borrador, Activar, Cancelar

#### **Activar/Cerrar Encuesta**
- Cambiar estado de 'borrador' a 'activa'
- Cambiar estado de 'activa' a 'cerrada'
- Solo encuestas activas se muestran en el landing

#### **Ver Resultados**
- **Por Pregunta**:
  - Pregunta 1: [Gráfico según tipo] + Tabla de respuestas
  - Pregunta 2: [Gráfico según tipo] + Tabla de respuestas
  - ...

- **Filtros**:
  - Por grado
  - Por rango de fechas

- **Exportación**:
  - Excel: Todas las respuestas (1 fila por respuesta)
  - PDF: Informe con gráficos y resumen

#### **Eliminar Encuesta**
- Confirmación doble
- Elimina encuesta + preguntas + respuestas (CASCADE)

---

## 📊 GRÁFICOS Y ESTADÍSTICAS

### **Librerías a usar:**
- **Chart.js** (igual que Estadísticas Pagos)
- **react-chartjs-2**

### **Tipos de Gráficos:**
- **Barras**: Para preguntas de marcar/lista (conteo de opciones)
- **Donut**: Para preguntas de marcar (distribución %)
- **Escalas**: Promedio + distribución por valor

---

## 🎨 COMPONENTES CLAVE

### **Frontend**

#### **Páginas Públicas:**
1. `Landing.jsx` - Página de inicio con encuestas activas
2. `EncuestaForm.jsx` - Formulario de respuesta
3. `Agradecimiento.jsx` - Mensaje de confirmación

#### **Páginas Admin:**
1. `AdminLogin.jsx` - Login de administradores
2. `AdminDashboard.jsx` - Panel de control
3. `EncuestasList.jsx` - Lista de encuestas
4. `EncuestaEditor.jsx` - Crear/Editar encuesta
5. `EncuestaResultados.jsx` - Ver resultados y gráficos
6. `Configuracion.jsx` - Configuración del sistema
7. `Usuarios.jsx` - Gestión de admins (opcional)

#### **Componentes Reutilizables:**
1. `Navbar.jsx` - Barra de navegación (admin)
2. `PreguntaRenderer.jsx` - Renderiza pregunta según tipo
3. `PreguntaBuilder.jsx` - Constructor de preguntas
4. `ResultadoChart.jsx` - Gráficos de resultados

### **Backend**

#### **Rutas:**
1. `auth.routes.js` - Login admin
2. `encuestas.routes.js` - CRUD de encuestas
3. `preguntas.routes.js` - CRUD de preguntas
4. `respuestas.routes.js` - Guardar y obtener respuestas
5. `resultados.routes.js` - Estadísticas y gráficos
6. `config.routes.js` - Configuración del sistema
7. `grados.routes.js` - Gestión de grados
8. `usuarios.routes.js` - CRUD de usuarios admin (opcional)

#### **Servicios:**
1. `excel.service.js` - Exportar resultados a Excel
2. `pdf.service.js` - Exportar resultados a PDF
3. `estadisticas.service.js` - Procesar datos para gráficos

---

## 🔒 SEGURIDAD Y VALIDACIONES

### **Frontend**
- ✅ Validación de campos obligatorios
- ✅ Límites de caracteres en textos
- ✅ Validación de formato de respuestas
- ✅ Prevención de envíos duplicados (deshabilitar botón después de enviar)

### **Backend**
- ✅ Validación de datos de entrada
- ✅ Sanitización de respuestas de texto
- ✅ Rate limiting (prevenir spam)
- ✅ Prevención de duplicados por IP (opcional)
- ✅ CORS configurado correctamente
- ✅ JWT para rutas de admin
- ✅ Middleware de autenticación

---

## 📦 DEPENDENCIAS

### **Backend (package.json)**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "pg": "^8.11.3",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "compression": "^1.7.4",
    "morgan": "^1.10.0",
    "xlsx": "^0.18.5",
    "pdfkit": "^0.13.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### **Frontend (package.json)**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.1",
    "axios": "^1.6.5",
    "chart.js": "^4.4.1",
    "react-chartjs-2": "^5.2.0",
    "sweetalert2": "^11.10.3",
    "moment": "^2.30.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.11"
  }
}
```

---

## 🚀 PROCESO DE DEPLOYMENT (RESUMEN EJECUTIVO)

### **Basado en el deployment exitoso de Estadísticas Pagos:**

1. ✅ **Preparación Local:**
   - Crear proyecto en PC con estructura completa
   - Desarrollar frontend y backend
   - Probar localmente
   - Commit a GitHub

2. ✅ **Crear Base de Datos:**
   - Crear BD y usuario en PostgreSQL
   - Importar schema
   - Otorgar permisos completos

3. ✅ **Clonar Repositorio:**
   - `git clone` en `/var/www/encuestas/`

4. ✅ **Configurar Backend:**
   - Crear `.env` con credenciales de producción
   - `npm install`
   - Crear directorio `uploads/`
   - Probar con `node server.js`
   - Configurar PM2
   - `pm2 start ecosystem.config.js`

5. ✅ **Configurar Frontend:**
   - Crear `.env` con URLs de producción
   - `npm install`
   - `npm run build` (genera carpeta `dist/`)

6. ✅ **Configurar Nginx:**
   - Crear config en `/etc/nginx/sites-available/encuestas`
   - Habilitar sitio
   - Probar config: `sudo nginx -t`
   - Recargar: `sudo systemctl reload nginx`

7. ✅ **Configurar DNS:**
   - Panel Hostinger → DNS
   - Agregar registro A: `encuestas` → `72.60.172.101`

8. ✅ **Configurar SSL:**
   - `sudo certbot --nginx -d encuestas.vanguardschools.com`

9. ✅ **Probar Sistema:**
   - Acceder a `https://encuestas.vanguardschools.com`
   - Verificar login, crear encuesta, responder, ver resultados

---

## ⚠️ LECCIONES APRENDIDAS DEL DEPLOYMENT DE ESTADÍSTICAS

### **Errores Comunes a Evitar:**

1. **Permisos de PostgreSQL:**
   - SIEMPRE otorgar permisos después de importar schema
   - Usar `GRANT ALL` en tablas Y secuencias

2. **Rate Limiter:**
   - Configurar con límite alto en producción (1000+)
   - Configurar `trust proxy` en Express

3. **Contraseñas:**
   - Usar bcrypt con 10 rounds
   - Generar hash correctamente (60 caracteres)

4. **Variables de Entorno:**
   - Backend: `require('dotenv').config();` al inicio
   - Frontend: Variables deben empezar con `VITE_`

5. **Uploads:**
   - Permisos `www-data:www-data`
   - Crear carpetas antes de usar

6. **Responsive:**
   - Probar en móviles REALES, no solo DevTools
   - Z-index para menús móviles: muy alto (99999)
   - Modales: usar Portal si es necesario
   - Tablas: siempre con scroll horizontal en móvil

7. **Dark Mode:**
   - Forzar estilos con `!important` si hay conflictos
   - Probar en Chrome Y Safari

---

## 📋 CHECKLIST DE DEPLOYMENT

Antes de considerar completo:

- [ ] PostgreSQL: BD creada, usuario con permisos
- [ ] Backend: .env configurado, dependencias instaladas
- [ ] Backend: Probado con `node server.js`
- [ ] Backend: PM2 iniciado y guardado
- [ ] Frontend: .env configurado, dependencias instaladas
- [ ] Frontend: Build generado (`npm run build`)
- [ ] Nginx: Config creada y habilitada
- [ ] Nginx: Probado con `nginx -t`
- [ ] DNS: Registro A configurado
- [ ] DNS: Propagado (probar con `ping`)
- [ ] SSL: Certificado obtenido con Certbot
- [ ] Sistema: Accesible en HTTPS
- [ ] Login: Funciona correctamente
- [ ] Funcionalidades: Todas probadas
- [ ] Responsive: Probado en móvil

---

## 🎨 DISEÑO ESPECÍFICO DEL SISTEMA DE ENCUESTAS

### **Landing Page**

**Hero Section:**
```
📊 Encuestas Vanguard Schools
Tu opinión nos ayuda a mejorar la educación

[Gradient de fondo: azul → púrpura]
[Ilustración SVG de encuesta/formulario]
```

**Encuestas Activas:**
```
┌─────────────────────────────────┐
│ 📋 Encuesta de Satisfacción    │
│ Ayúdanos a mejorar nuestros... │
│                                 │
│ [Responder Encuesta →]         │
└─────────────────────────────────┘
```

### **Formulario de Encuesta**

**Paso 1: Grado (si se solicita)**
```
Selecciona el grado de tu hijo(a)

[Dropdown con grados]
├─ Inicial
│  ├─ Inicial - 3 Años
│  ├─ Inicial - 4 Años
│  └─ Inicial - 5 Años
├─ Primaria
│  ├─ 1º Grado
│  └─ ...
└─ Secundaria
   └─ ...

[Continuar →]
```

**Paso 2: Preguntas**
```
Encuesta de Satisfacción

Pregunta 1 de 5
¿Qué tan satisfecho estás con la calidad educativa?
[Subtítulo opcional en gris]

○ Muy satisfecho
○ Satisfecho
○ Neutral
○ Insatisfecho
○ Muy insatisfecho

────────────────────────

Pregunta 2 de 5
¿Qué materia te gustaría que se refuerce?
[Dropdown]

[Continuar →]
```

**Paso 3: Agradecimiento**
```
✅ ¡Gracias por tu participación!

Tu opinión es muy importante para nosotros
y nos ayuda a mejorar continuamente.

[Volver al Inicio]
```

### **Admin - Constructor de Preguntas**

```
Nueva Encuesta

┌─ Información General ────────────┐
│ Título: _____________________    │
│ Descripción: ________________    │
│ Fecha inicio: [____] Fin: [___]  │
│ ☑ Solicitar grado                │
└──────────────────────────────────┘

┌─ Preguntas ──────────────────────┐
│ [+ Agregar Pregunta]             │
│                                  │
│ 1. ¿Qué tan satisfecho...?       │
│    Tipo: Marcar (única) [↑][↓][✏️][🗑️] │
│                                  │
│ 2. ¿Qué materia...?              │
│    Tipo: Lista [↑][↓][✏️][🗑️]        │
└──────────────────────────────────┘

[Guardar Borrador] [Activar Encuesta]
```

---

## 📊 EJEMPLO DE RESULTADOS

```
Encuesta de Satisfacción
250 respuestas • 15 Nov - 30 Nov 2025

[Exportar Excel] [Exportar PDF]

┌─ Por Grado ──────────────────────┐
│ Inicial: 45 respuestas (18%)     │
│ Primaria: 120 respuestas (48%)   │
│ Secundaria: 85 respuestas (34%)  │
└──────────────────────────────────┘

Pregunta 1: ¿Qué tan satisfecho estás...?
[Gráfico de Donut]
• Muy satisfecho: 120 (48%)
• Satisfecho: 80 (32%)
• Neutral: 30 (12%)
• Insatisfecho: 15 (6%)
• Muy insatisfecho: 5 (2%)

Pregunta 2: ¿Qué materia...? (Lista)
[Gráfico de Barras]
Matemáticas: ████████░░ 85
Comunicación: ███████░░░ 70
Ciencias: ██████░░░░ 60
Arte: █████░░░░░ 35

Pregunta 3: Comentarios (Texto largo)
[Lista de respuestas textuales]
1. "Me gustaría que..."
2. "Excelente labor pero..."
...
```

---

## 🔄 FLUJO DE DATOS

### **Responder Encuesta:**
```
Usuario → Landing → Click "Responder"
  ↓
Seleccionar Grado (si aplica)
  ↓
Responder Preguntas
  ↓
POST /api/respuestas/guardar
  {
    encuesta_id: 1,
    grado_seleccionado: "Primaria - 3º A",
    respuestas: [
      { pregunta_id: 1, opciones_seleccionadas: ["Satisfecho"] },
      { pregunta_id: 2, texto_respuesta: "Matemáticas" },
      { pregunta_id: 3, valor_numerico: 4 }
    ]
  }
  ↓
Guardar en BD (1 registro en respuestas + N en respuestas_detalle)
  ↓
Mostrar mensaje de agradecimiento
```

### **Ver Resultados (Admin):**
```
Admin → Resultados → Encuesta ID
  ↓
GET /api/resultados/encuesta/:id
  ↓
Backend procesa:
  - Cuenta respuestas por opción
  - Calcula promedios
  - Agrupa por grado
  ↓
Retorna JSON con datos procesados
  ↓
Frontend renderiza gráficos con Chart.js
```

---

## 🌐 SUBDOMINIOS VANGUARD (RESUMEN)

Después de este proyecto, tendrás **3 sistemas** en el mismo VPS:

| Subdominio | Sistema | Puerto | PM2 Process | Descripción |
|------------|---------|--------|-------------|-------------|
| `calendar.vanguardschools.com` | Vanguard Calendar | 5000 | backend-calendario | Sistema de calendario y asistencia |
| `estadisticas.vanguardschools.com` | Estadísticas Pagos | 5001 | estadisticas-backend | Estadísticas de pagos y deudas |
| `encuestas.vanguardschools.com` | Encuestas | 5002 | encuestas-backend | Sistema de encuestas para padres |

---

## 📝 NOTAS IMPORTANTES

### **GitHub Repository**
- Crear nuevo repo: `vanguard-encuestas`
- URL: `https://github.com/LiamFranKi/vanguard-encuestas.git`

### **Base de Datos**
- Nombre: `encuestas_vanguard`
- Usuario: `encuestas_user`
- NO compartir BD con otros sistemas

### **Usuario Admin Inicial**
```sql
INSERT INTO usuarios (dni, nombres, apellidos, email, clave, rol)
VALUES (
  '11111111',
  'Administrador',
  'Sistema',
  'admin@vanguard.edu.pe',
  '$2b$10$[HASH_BCRYPT_AQUI]', -- Contraseña: waltito10
  'Administrador'
);
```

### **Grados Iniciales**
```sql
INSERT INTO grados (nombre, nivel, orden) VALUES
('Inicial - 3 Años UNICA', 'Inicial', 1),
('Inicial - 4 Años UNICA', 'Inicial', 2),
('Inicial - 5 Años UNICA', 'Inicial', 3),
('Primaria - 1º A', 'Primaria', 4),
('Primaria - 1º B', 'Primaria', 5),
-- ... más grados
('Secundaria - 5º UNICA', 'Secundaria', 40);
```

---

## 🎯 CARACTERÍSTICAS ESPECIALES

### **1. Constructor Visual de Preguntas**
Similar a Google Forms:
- Agregar pregunta con botón
- Modal para configurar
- Arrastrar para reordenar (opcional)
- Vista previa en tiempo real

### **2. Resultados en Tiempo Real**
- Los resultados se actualizan mientras los padres responden
- Gráficos interactivos (hover para ver detalles)
- Filtros dinámicos

### **3. Exportación Completa**
- **Excel**: 
  - Hoja 1: Resumen general
  - Hoja 2: Respuestas por pregunta
  - Hoja 3: Todas las respuestas (1 fila por respuesta)
- **PDF**:
  - Portada con logo
  - Resumen ejecutivo
  - Gráficos por pregunta
  - Lista de comentarios (si hay preguntas de texto)

### **4. Validación de Duplicados (Opcional)**
- Guardar IP + User Agent
- Permitir solo 1 respuesta por IP por encuesta
- O permitir múltiples (configurable por encuesta)

---

## 📱 RESPONSIVE DESIGN

### **Breakpoints (igual que Estadísticas)**
```css
/* Móviles pequeños */
@media (max-width: 480px) { }

/* Móviles grandes */
@media (min-width: 481px) and (max-width: 768px) { }

/* Tablets */
@media (min-width: 769px) and (max-width: 1024px) { }

/* Desktop */
@media (min-width: 1025px) { }
```

### **Componentes Responsive:**
- ✅ Navbar con menú hamburguesa
- ✅ Cards de encuestas adaptables
- ✅ Formularios en columna única en móvil
- ✅ Botones full-width en móvil
- ✅ Gráficos ajustados a tamaño de pantalla
- ✅ Modales optimizados (95vw en móvil)
- ✅ Tablas con scroll horizontal

---

## 🎨 EJEMPLOS DE COMPONENTES

### **Card de Encuesta (Landing)**
```jsx
<div className="encuesta-card">
  <div className="encuesta-icon">📋</div>
  <h3 className="encuesta-titulo">Encuesta de Satisfacción 2025</h3>
  <p className="encuesta-descripcion">
    Ayúdanos a conocer tu opinión sobre nuestros servicios educativos
  </p>
  <div className="encuesta-meta">
    <span>5 preguntas</span> • <span>2 min aprox.</span>
  </div>
  <button className="btn btn-primary btn-block">
    Responder Encuesta →
  </button>
</div>
```

### **Pregunta de Tipo Marcar**
```jsx
<div className="pregunta-container">
  <div className="pregunta-header">
    <span className="pregunta-numero">Pregunta 1 de 5</span>
    {obligatoria && <span className="pregunta-obligatoria">*</span>}
  </div>
  <h3 className="pregunta-texto">
    ¿Qué tan satisfecho estás con la calidad educativa?
  </h3>
  {subtitulo && (
    <p className="pregunta-subtitulo">{subtitulo}</p>
  )}
  <div className="opciones-container">
    {opciones.map(opcion => (
      <label className="opcion-item">
        <input type="radio" name="pregunta_1" value={opcion} />
        <span>{opcion}</span>
      </label>
    ))}
  </div>
</div>
```

---

## 🔄 SINCRONIZACIÓN CON GITHUB

### **Workflow Recomendado:**

1. **Desarrollo en PC:**
   - Codificar en local
   - Commit frecuentes
   - Push a GitHub

2. **Deploy al Servidor:**
   ```bash
   cd /var/www/encuestas
   git pull origin master
   cd backend && npm install && pm2 restart encuestas-backend
   cd ../frontend && npm install && npm run build
   ```

3. **Cambios Directos en Servidor** (emergencias):
   ```bash
   cd /var/www/encuestas
   # Hacer cambios...
   git add .
   git commit -m "fix: Corrección urgente"
   git push origin master
   ```

---

## 💡 CARACTERÍSTICAS ADICIONALES (FUTURAS)

### **Fase 2:**
- [ ] Encuestas con múltiples páginas (wizard)
- [ ] Lógica condicional (mostrar pregunta si respuesta = X)
- [ ] Plantillas de encuestas predefinidas
- [ ] Notificaciones por email al cerrar encuesta
- [ ] Dashboard con tendencias históricas
- [ ] Comparación entre encuestas
- [ ] Exportación a Google Sheets

### **Fase 3:**
- [ ] Encuestas con imágenes en preguntas
- [ ] Preguntas con matriz (tabla de opciones)
- [ ] Encuestas programadas (auto-activar en fecha)
- [ ] Reportes automáticos por email
- [ ] API pública para integración

---

## 📞 DATOS DE CONTACTO Y ACCESOS

### **Hostinger VPS**
- IP: 72.60.172.101
- Usuario: root
- Password: Vanguard2025@&
- Puerto SSH: 22

### **WinSCP / PuTTY**
- Host: 72.60.172.101
- Port: 22
- User: root
- Password: Vanguard2025@&

### **GitHub**
- Usuario: LiamFranKi
- Repos:
  - vanguard-calendar
  - vanguard-estadisticas-pagos
  - vanguard-encuestas (NUEVO)

### **PostgreSQL (en servidor)**
- Host: localhost
- Port: 5432
- Superuser: postgres
- Password: waltito10

---

## 🚀 INICIO RÁPIDO (CUANDO VUELVAS)

```bash
# 1. Crear proyecto local
npx create-vite@latest vanguard-encuestas --template react
cd vanguard-encuestas

# 2. Estructura de carpetas
mkdir -p backend/{routes,services,utils,middleware}
mkdir -p frontend/src/{pages,components,contexts,services}
mkdir -p database

# 3. Inicializar Git
git init
git add .
git commit -m "Initial commit"

# 4. Crear repo en GitHub
# https://github.com/new

# 5. Push a GitHub
git remote add origin https://github.com/LiamFranKi/vanguard-encuestas.git
git push -u origin master

# 6. Desarrollar localmente...

# 7. Cuando esté listo, deploy siguiendo los pasos de arriba
```

---

## ✅ ESTE ARCHIVO ES TU GUÍA COMPLETA

**Lee este archivo cuando vuelvas** y tendrás TODO el contexto:
- ✅ Cómo deployamos Estadísticas Pagos
- ✅ Qué errores evitar
- ✅ Especificaciones completas del sistema de Encuestas
- ✅ Comandos exactos para deployment
- ✅ Estructura de base de datos
- ✅ Diseño y UI/UX
- ✅ Stack tecnológico

---

**Desarrollado para Vanguard Schools** ❤️

**Última actualización**: 6 de Noviembre, 2025  
**Versión**: v1.0 - Especificaciones Iniciales


