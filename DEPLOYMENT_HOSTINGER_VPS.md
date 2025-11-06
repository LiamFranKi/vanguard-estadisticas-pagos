# 🚀 GUÍA DE DEPLOYMENT - VANGUARD ESTADÍSTICAS PAGOS
## Hostinger VPS - Ubuntu

Sistema de estadísticas y pagos para instituciones educativas desplegado en VPS de Hostinger.

---

## 📋 **INFORMACIÓN DEL SERVIDOR**

### **Credenciales VPS Hostinger**
```
VPS Hostname: srv1063042.hstgr.cloud
IP Address (IPv4): 72.60.172.101
IP Address (IPv6): 2a02:4780:2d:f1e::1
Port SSH: 22
User: root
Password: Vanguard2025@&
```

### **Dominio y Subdominio**
```
Subdominio: estadisticas.vanguardschools.com
Directorio: /var/www/estadisticas/
```

### **Puertos de Aplicación**
```
Backend API: 5001 (interno)
Frontend: Servido por Nginx (puerto 80/443)
PostgreSQL: 5432
```

---

## 🛠️ **REQUISITOS DEL SISTEMA**

### **Software Necesario**
- ✅ Ubuntu 20.04+ o CentOS 7+
- ✅ Node.js 18.x o superior
- ✅ PostgreSQL 12+
- ✅ Nginx 1.18+
- ✅ PM2 (gestión de procesos)
- ✅ Git
- ✅ Certbot (SSL/HTTPS)

### **Especificaciones Mínimas**
- RAM: 2GB (Recomendado 4GB+)
- Almacenamiento: 20GB+ SSD
- CPU: 2 cores+
- Conexión: Ancho de banda estable

---

## 🔧 **PASO 1: PREPARACIÓN DEL SERVIDOR**

### **1.1. Conectarse al VPS**

#### **Opción A: Usar PuTTY (Windows)**
```
Host Name: 72.60.172.101
Port: 22
Connection Type: SSH
Login as: root
Password: Vanguard2025@&
```

#### **Opción B: Usar Terminal/CMD**
```bash
ssh root@72.60.172.101
# Ingresar password cuando se solicite: Vanguard2025@&
```

### **1.2. Actualizar el Sistema**
```bash
# Actualizar lista de paquetes
sudo apt update

# Actualizar paquetes instalados
sudo apt upgrade -y

# Instalar herramientas básicas
sudo apt install -y curl wget git build-essential unzip
```

### **1.3. Instalar Node.js 18.x**
```bash
# Agregar repositorio de Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Instalar Node.js y npm
sudo apt-get install -y nodejs

# Verificar instalación
node -v  # Debería mostrar v18.x.x
npm -v   # Debería mostrar 9.x.x o superior
```

### **1.4. Instalar PostgreSQL**
```bash
# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Verificar que esté corriendo
sudo systemctl status postgresql

# Habilitar inicio automático
sudo systemctl enable postgresql
```

### **1.5. Instalar Nginx**
```bash
# Instalar Nginx
sudo apt install -y nginx

# Verificar instalación
nginx -v

# Iniciar Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verificar estado
sudo systemctl status nginx
```

### **1.6. Instalar PM2**
```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Verificar instalación
pm2 -v

# Configurar PM2 para inicio automático
pm2 startup systemd
# Ejecutar el comando que PM2 te muestra
```

---

## 🗄️ **PASO 2: CONFIGURAR BASE DE DATOS**

### **2.1. Crear Base de Datos y Usuario**
```bash
# Acceder a PostgreSQL como superusuario
sudo -u postgres psql

# Ejecutar estos comandos en el prompt de PostgreSQL:
```

```sql
-- Crear base de datos
CREATE DATABASE estadisticas_pagos;

-- Crear usuario con contraseña
CREATE USER estadisticas_user WITH PASSWORD 'tu_password_super_seguro_aqui';

-- Otorgar todos los privilegios
GRANT ALL PRIVILEGES ON DATABASE estadisticas_pagos TO estadisticas_user;

-- Otorgar privilegios en el schema public
\c estadisticas_pagos
GRANT ALL ON SCHEMA public TO estadisticas_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO estadisticas_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO estadisticas_user;

-- Verificar que se creó correctamente
\l

-- Salir de PostgreSQL
\q
```

### **2.2. Configurar Zona Horaria (Perú GMT-5)**
```bash
# Acceder a PostgreSQL
sudo -u postgres psql

# Configurar zona horaria
ALTER DATABASE estadisticas_pagos SET timezone TO 'America/Lima';

# Salir
\q
```

### **2.3. Permitir Conexiones Locales (si es necesario)**
```bash
# Editar archivo de configuración
sudo nano /etc/postgresql/12/main/pg_hba.conf

# Agregar al final del archivo:
# local   estadisticas_pagos   estadisticas_user   md5

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

---

## 📁 **PASO 3: PREPARAR ESTRUCTURA DE DIRECTORIOS**

### **3.1. Crear Directorios del Proyecto**
```bash
# Crear directorio principal
sudo mkdir -p /var/www/estadisticas

# Cambiar al directorio
cd /var/www/estadisticas

# Crear subdirectorios
sudo mkdir -p backend
sudo mkdir -p frontend

# Establecer permisos
sudo chown -R $USER:$USER /var/www/estadisticas
sudo chmod -R 755 /var/www/estadisticas
```

---

## 📦 **PASO 4: SUBIR ARCHIVOS AL SERVIDOR**

### **4.1. Opción A: Usar WinSCP (Recomendado para Windows)**

**Configuración de WinSCP:**
```
File Protocol: SFTP
Host Name: 72.60.172.101
Port Number: 22
User name: root
Password: Vanguard2025@&
```

**Subir archivos:**
1. Conectar con WinSCP usando las credenciales anteriores
2. Navegar a `/var/www/estadisticas/`
3. Arrastrar y soltar las carpetas:
   - `backend/` completa → `/var/www/estadisticas/backend/`
   - `frontend/` completa → `/var/www/estadisticas/frontend/`
   - `database/` completa → `/var/www/estadisticas/database/`

**IMPORTANTE:** Asegúrate de subir estos archivos:
- `backend/package.json`
- `backend/server.js`
- `backend/env.local` (renombrar a `.env`)
- `backend/routes/` (todos los archivos)
- `backend/services/` (todos los archivos)
- `backend/utils/` (todos los archivos)
- `frontend/package.json`
- `frontend/src/` (todos los archivos)
- `frontend/public/` (todos los archivos)
- `frontend/index.html`
- `frontend/vite.config.js`
- `database/schema_completo.sql`

### **4.2. Opción B: Usar Git (Alternativa)**
```bash
# En el servidor, clonar el repositorio
cd /var/www/estadisticas
git clone https://github.com/LiamFranKi/vanguard-estadisticas-pagos.git temp
mv temp/* .
mv temp/.* . 2>/dev/null
rm -rf temp

# O si ya tienes los archivos localmente, usar rsync desde tu PC:
# rsync -avz -e "ssh" ./backend/ root@72.60.172.101:/var/www/estadisticas/backend/
# rsync -avz -e "ssh" ./frontend/ root@72.60.172.101:/var/www/estadisticas/frontend/
```

---

## ⚙️ **PASO 5: CONFIGURAR BACKEND**

### **5.1. Instalar Dependencias del Backend**
```bash
# Ir al directorio del backend
cd /var/www/estadisticas/backend

# Instalar dependencias
npm install

# Verificar que no haya errores
```

### **5.2. Configurar Variables de Entorno**
```bash
# Crear archivo .env desde env.local
cd /var/www/estadisticas/backend

# Si subiste env.local, renombrarlo
mv env.local .env

# O crear nuevo archivo .env
nano .env
```

**Contenido del archivo `.env`:**
```env
# ===================================
# CONFIGURACIÓN DE BASE DE DATOS
# ===================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=estadisticas_pagos
DB_USER=estadisticas_user
DB_PASSWORD=tu_password_super_seguro_aqui

# ===================================
# CONFIGURACIÓN DEL SERVIDOR
# ===================================
PORT=5001
NODE_ENV=production
FRONTEND_URL=https://estadisticas.vanguardschools.com

# ===================================
# CONFIGURACIÓN JWT
# ===================================
JWT_SECRET=tu_jwt_secret_muy_seguro_cambiar_esto_1234567890
JWT_EXPIRES_IN=24h

# ===================================
# CORS (Opcional)
# ===================================
CORS_ORIGIN=https://estadisticas.vanguardschools.com
```

**Guardar y salir:**
- Presionar `Ctrl + O` (guardar)
- Presionar `Enter` (confirmar)
- Presionar `Ctrl + X` (salir)

### **5.3. Ejecutar Migraciones SQL**
```bash
# Importar el schema completo de la base de datos
cd /var/www/estadisticas/database

# Ejecutar el script SQL
sudo -u postgres psql -d estadisticas_pagos -f schema_completo.sql

# Verificar que las tablas se crearon
sudo -u postgres psql -d estadisticas_pagos -c "\dt"

# Deberías ver todas las tablas creadas
```

### **5.4. Crear Directorios de Uploads**
```bash
# Crear directorios para archivos subidos
cd /var/www/estadisticas/backend
mkdir -p uploads/excel
mkdir -p uploads/pdf
mkdir -p uploads/avatars
mkdir -p uploads/logos

# Establecer permisos
chmod -R 755 uploads
```

### **5.5. Verificar que el Backend Funciona**
```bash
# Iniciar backend manualmente para probar
cd /var/www/estadisticas/backend
node server.js

# Deberías ver:
# ✅ Servidor corriendo en puerto 5001
# ✅ Conexión a BD exitosa

# Si funciona correctamente, detener con Ctrl+C
```

---

## 🎨 **PASO 6: CONFIGURAR FRONTEND**

### **6.1. Instalar Dependencias del Frontend**
```bash
# Ir al directorio del frontend
cd /var/www/estadisticas/frontend

# Instalar dependencias
npm install

# Esto puede tardar varios minutos
```

### **6.2. Configurar Variables de Entorno del Frontend**
```bash
# Crear archivo .env en frontend
cd /var/www/estadisticas/frontend
nano .env
```

**Contenido del archivo `.env` del frontend:**
```env
VITE_API_URL=https://estadisticas.vanguardschools.com/api
VITE_BACKEND_URL=https://estadisticas.vanguardschools.com
```

**Guardar y salir** (Ctrl+O, Enter, Ctrl+X)

### **6.3. Construir Frontend para Producción**
```bash
# Construir el frontend
cd /var/www/estadisticas/frontend
npm run build

# Esto creará la carpeta 'dist' con los archivos optimizados
# Verifica que se haya creado:
ls -la dist/

# Deberías ver archivos como index.html, assets/, etc.
```

---

## 🔧 **PASO 7: CONFIGURAR NGINX**

### **7.1. Crear Configuración de Nginx**
```bash
# Crear archivo de configuración
sudo nano /etc/nginx/sites-available/estadisticas
```

**Contenido del archivo de configuración:**
```nginx
# Configuración para estadisticas.vanguardschools.com
server {
    listen 80;
    listen [::]:80;
    server_name estadisticas.vanguardschools.com;

    # Logs
    access_log /var/log/nginx/estadisticas-access.log;
    error_log /var/log/nginx/estadisticas-error.log;

    # Root para archivos estáticos del frontend
    root /var/www/estadisticas/frontend/dist;
    index index.html;

    # Tamaño máximo de body (para uploads)
    client_max_body_size 50M;

    # Archivos estáticos del frontend (React)
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=3600";
    }

    # API Backend (Proxy pass a Node.js)
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Uploads (archivos subidos)
    location /uploads/ {
        alias /var/www/estadisticas/backend/uploads/;
        add_header Cache-Control "public, max-age=31536000";
        access_log off;
    }

    # Assets del frontend (CSS, JS, imágenes)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Manifest y Service Worker (PWA - si se implementa)
    location /manifest.json {
        add_header Cache-Control "public, max-age=3600";
    }

    location /service-worker.js {
        add_header Cache-Control "no-cache";
    }
}
```

**Guardar y salir** (Ctrl+O, Enter, Ctrl+X)

### **7.2. Habilitar Sitio en Nginx**
```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/estadisticas /etc/nginx/sites-enabled/

# Verificar que no haya errores de sintaxis
sudo nginx -t

# Deberías ver:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Reiniciar Nginx
sudo systemctl restart nginx

# Verificar estado
sudo systemctl status nginx
```

---

## 🚀 **PASO 8: CONFIGURAR PM2 PARA EL BACKEND**

### **8.1. Crear Archivo de Configuración PM2**
```bash
# Crear ecosystem.config.js en el directorio backend
cd /var/www/estadisticas/backend
nano ecosystem.config.js
```

**Contenido del archivo `ecosystem.config.js`:**
```javascript
module.exports = {
  apps: [
    {
      name: 'estadisticas-backend',
      script: 'server.js',
      cwd: '/var/www/estadisticas/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      error_file: '/var/log/pm2/estadisticas-backend-error.log',
      out_file: '/var/log/pm2/estadisticas-backend-out.log',
      log_file: '/var/log/pm2/estadisticas-backend-combined.log',
      time: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'uploads', 'logs'],
      max_memory_restart: '500M'
    }
  ]
};
```

**Guardar y salir** (Ctrl+O, Enter, Ctrl+X)

### **8.2. Crear Directorio de Logs**
```bash
# Crear directorio para logs de PM2
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2
```

### **8.3. Iniciar Backend con PM2**
```bash
# Ir al directorio backend
cd /var/www/estadisticas/backend

# Iniciar aplicación con PM2
pm2 start ecosystem.config.js

# Ver estado
pm2 status

# Ver logs en tiempo real
pm2 logs estadisticas-backend

# Si todo está bien, deberías ver:
# ✅ Servidor corriendo en puerto 5001
# ✅ Conexión a BD exitosa

# Guardar configuración de PM2
pm2 save

# Configurar inicio automático en boot
pm2 startup systemd
# Ejecutar el comando que PM2 te muestra
```

---

## 🔒 **PASO 9: CONFIGURAR SSL/HTTPS CON LET'S ENCRYPT**

### **9.1. Instalar Certbot**
```bash
# Instalar Certbot para Nginx
sudo apt install -y certbot python3-certbot-nginx
```

### **9.2. Obtener Certificado SSL**
```bash
# Obtener certificado SSL para el subdominio
sudo certbot --nginx -d estadisticas.vanguardschools.com

# Certbot te hará algunas preguntas:
# 1. Email para notificaciones: ingresa tu email
# 2. Términos de servicio: A (Aceptar)
# 3. Compartir email con EFF: Y o N (tu elección)
# 4. Redirect HTTP a HTTPS: 2 (Sí, redirigir todo a HTTPS)

# Certbot configurará automáticamente Nginx para usar HTTPS
```

### **9.3. Verificar Renovación Automática**
```bash
# Probar renovación en modo dry-run
sudo certbot renew --dry-run

# Si todo está bien, Certbot renovará automáticamente
# el certificado cada 60 días
```

### **9.4. Configurar Firewall (Opcional pero Recomendado)**
```bash
# Habilitar UFW
sudo ufw enable

# Permitir SSH
sudo ufw allow 22/tcp

# Permitir HTTP y HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verificar reglas
sudo ufw status

# Reiniciar firewall
sudo ufw reload
```

---

## 🎯 **PASO 10: CONFIGURAR DNS**

### **10.1. Configurar Subdominio en Hostinger**

**En el Panel de Hostinger:**
1. Ir a **Dominios** → Seleccionar `vanguardschools.com`
2. Ir a **DNS / Name Servers**
3. Agregar un registro **A**:
   ```
   Tipo: A
   Nombre: estadisticas
   Apunta a: 72.60.172.101
   TTL: 14400 (4 horas)
   ```
4. Guardar cambios

**Esperar propagación DNS:** 
- Puede tardar de 5 minutos a 48 horas
- Verificar en: https://dnschecker.org/

### **10.2. Verificar Acceso**
```bash
# Desde tu PC, verificar que el DNS esté funcionando
ping estadisticas.vanguardschools.com

# Deberías ver respuestas desde 72.60.172.101
```

---

## ✅ **PASO 11: VERIFICACIÓN FINAL**

### **11.1. Verificar Servicios**
```bash
# Verificar PostgreSQL
sudo systemctl status postgresql

# Verificar Nginx
sudo systemctl status nginx

# Verificar backend con PM2
pm2 status

# Ver logs del backend
pm2 logs estadisticas-backend --lines 50
```

### **11.2. Verificar Backend API**
```bash
# Desde el servidor, probar el backend
curl http://localhost:5001/api/config

# Deberías recibir un JSON con la configuración del sistema
```

### **11.3. Verificar Frontend**
```bash
# Verificar que los archivos estén en su lugar
ls -la /var/www/estadisticas/frontend/dist/

# Deberías ver index.html y carpeta assets/
```

### **11.4. Acceder desde el Navegador**
```
URL: https://estadisticas.vanguardschools.com

Credenciales de prueba:
DNI: 11111111
Contraseña: waltito10
```

**Deberías poder:**
- ✅ Ver la página de inicio (landing)
- ✅ Iniciar sesión
- ✅ Ver el dashboard
- ✅ Acceder a todos los módulos
- ✅ Subir archivos Excel/PDF
- ✅ Ver estadísticas

---

## 📊 **MONITOREO Y MANTENIMIENTO**

### **Comandos Útiles de PM2**
```bash
# Ver estado de aplicaciones
pm2 status

# Ver logs en tiempo real
pm2 logs estadisticas-backend

# Ver logs con filtro
pm2 logs estadisticas-backend --lines 100

# Reiniciar aplicación
pm2 restart estadisticas-backend

# Recargar aplicación (zero-downtime)
pm2 reload estadisticas-backend

# Detener aplicación
pm2 stop estadisticas-backend

# Eliminar aplicación
pm2 delete estadisticas-backend

# Guardar configuración actual
pm2 save

# Monitoreo en tiempo real
pm2 monit
```

### **Comandos Útiles de Nginx**
```bash
# Verificar sintaxis de configuración
sudo nginx -t

# Recargar configuración sin downtime
sudo nginx -s reload

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver logs de acceso
sudo tail -f /var/log/nginx/estadisticas-access.log

# Ver logs de errores
sudo tail -f /var/log/nginx/estadisticas-error.log
```

### **Comandos Útiles de PostgreSQL**
```bash
# Acceder a PostgreSQL
sudo -u postgres psql

# Conectar a la base de datos
\c estadisticas_pagos

# Listar tablas
\dt

# Ver tamaño de base de datos
\l+

# Salir
\q

# Backup de base de datos
sudo -u postgres pg_dump estadisticas_pagos > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
sudo -u postgres psql estadisticas_pagos < backup_20241106_150000.sql
```

---

## 🔄 **ACTUALIZAR LA APLICACIÓN**

### **Proceso de Actualización**
```bash
# 1. Ir al directorio del proyecto
cd /var/www/estadisticas

# 2. Hacer backup de la base de datos
sudo -u postgres pg_dump estadisticas_pagos > backup_pre_update_$(date +%Y%m%d_%H%M%S).sql

# 3. Descargar nuevos archivos (usando WinSCP o Git)
# Si usas Git:
git pull origin master

# 4. Actualizar backend
cd /var/www/estadisticas/backend
npm install
pm2 restart estadisticas-backend

# 5. Actualizar frontend
cd /var/www/estadisticas/frontend
npm install
npm run build

# 6. Reiniciar Nginx
sudo systemctl reload nginx

# 7. Verificar que todo funcione
pm2 logs estadisticas-backend --lines 50
```

---

## 🛡️ **SEGURIDAD Y BACKUPS**

### **Script de Backup Automático**
```bash
# Crear script de backup
sudo nano /var/www/estadisticas/backup.sh
```

**Contenido del script:**
```bash
#!/bin/bash

# Configuración
BACKUP_DIR="/var/backups/estadisticas"
DATE=$(date +%Y%m%d_%H%M%S)
DAYS_TO_KEEP=7

# Crear directorio de backup
mkdir -p $BACKUP_DIR

# Backup de base de datos
sudo -u postgres pg_dump estadisticas_pagos > $BACKUP_DIR/db_backup_$DATE.sql

# Backup de archivos subidos
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz /var/www/estadisticas/backend/uploads

# Backup de configuración
tar -czf $BACKUP_DIR/config_backup_$DATE.tar.gz /var/www/estadisticas/backend/.env

# Eliminar backups antiguos
find $BACKUP_DIR -name "*.sql" -mtime +$DAYS_TO_KEEP -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +$DAYS_TO_KEEP -delete

echo "✅ Backup completado: $DATE"
```

**Hacer ejecutable y programar:**
```bash
# Hacer ejecutable
sudo chmod +x /var/www/estadisticas/backup.sh

# Agregar a cron para ejecutar diariamente a las 2 AM
sudo crontab -e

# Agregar esta línea al final:
0 2 * * * /var/www/estadisticas/backup.sh >> /var/log/backup-estadisticas.log 2>&1
```

---

## 🐛 **SOLUCIÓN DE PROBLEMAS**

### **Problema: Backend no inicia**
```bash
# Verificar logs
pm2 logs estadisticas-backend

# Verificar que el puerto no esté ocupado
sudo lsof -i :5001

# Reiniciar con logs
cd /var/www/estadisticas/backend
node server.js
```

### **Problema: Frontend muestra página en blanco**
```bash
# Verificar que los archivos estén construidos
ls -la /var/www/estadisticas/frontend/dist/

# Reconstruir frontend
cd /var/www/estadisticas/frontend
rm -rf dist
npm run build
sudo systemctl reload nginx
```

### **Problema: Error 502 Bad Gateway**
```bash
# Verificar que el backend esté corriendo
pm2 status

# Verificar logs de Nginx
sudo tail -f /var/log/nginx/estadisticas-error.log

# Reiniciar todo
pm2 restart estadisticas-backend
sudo systemctl restart nginx
```

### **Problema: No se pueden subir archivos**
```bash
# Verificar permisos de directorio uploads
sudo chown -R www-data:www-data /var/www/estadisticas/backend/uploads
sudo chmod -R 755 /var/www/estadisticas/backend/uploads

# Verificar tamaño máximo en Nginx
sudo nano /etc/nginx/sites-available/estadisticas
# Buscar: client_max_body_size y aumentar si es necesario

# Reiniciar Nginx
sudo systemctl reload nginx
```

---

## 📝 **CHECKLIST FINAL**

Antes de considerar el deployment completo, verificar:

- [ ] PostgreSQL instalado y corriendo
- [ ] Base de datos `estadisticas_pagos` creada
- [ ] Usuario `estadisticas_user` creado con permisos
- [ ] Schema SQL ejecutado correctamente
- [ ] Node.js 18+ instalado
- [ ] Dependencias del backend instaladas
- [ ] Archivo `.env` configurado en backend
- [ ] PM2 instalado globalmente
- [ ] Backend iniciado con PM2
- [ ] PM2 configurado para inicio automático
- [ ] Nginx instalado y corriendo
- [ ] Configuración de Nginx creada
- [ ] Frontend construido (carpeta `dist`)
- [ ] SSL/HTTPS configurado con Certbot
- [ ] DNS del subdominio configurado
- [ ] Firewall configurado (opcional)
- [ ] Backup automático configurado
- [ ] Sistema accesible desde navegador
- [ ] Login funcionando correctamente
- [ ] Subida de archivos funcionando
- [ ] Estadísticas mostrándose correctamente

---

## 🎉 **¡DEPLOYMENT COMPLETADO!**

Si todos los pasos se completaron exitosamente, tu sistema debería estar:

✅ **Accesible en:** https://estadisticas.vanguardschools.com  
✅ **Backend corriendo:** PM2 gestiona el proceso  
✅ **Frontend servido:** Nginx entrega archivos estáticos  
✅ **HTTPS habilitado:** Certificado SSL válido  
✅ **Base de datos:** PostgreSQL con todos los datos  
✅ **Backups automáticos:** Programados diariamente  

---

## 📞 **SOPORTE**

Para problemas o consultas:
- **Logs del backend:** `pm2 logs estadisticas-backend`
- **Logs de Nginx:** `/var/log/nginx/estadisticas-error.log`
- **Logs de PostgreSQL:** `/var/log/postgresql/`

---

**Desarrollado con ❤️ para Vanguard Schools**

**Última actualización:** Noviembre 2024  
**Versión:** v1.0  
**Estado:** ✅ Producción

