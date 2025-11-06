# 🚀 DEPLOYMENT - Hostinger VPS

## Sistema: Vanguard Estadísticas Pagos
## URL: https://estadisticas.vanguardschools.com

---

## 📋 INFORMACIÓN DEL SERVIDOR

```
VPS Hostname: srv1063042.hstgr.cloud
IP Address: 72.60.172.101
Puerto SSH: 22
Usuario: root
Contraseña: Vanguard2025@&
```

---

## 🎯 ESTRUCTURA EN EL SERVIDOR

```
/var/www/estadisticas/
├── backend/          # API Node.js (Puerto 5001)
└── frontend/         # React App (build estático)
```

---

## 📦 PASO 1: CONECTAR VÍA PUTTY

1. Abre **PuTTY**
2. **Host Name**: `72.60.172.101`
3. **Port**: `22`
4. **Connection Type**: SSH
5. Click **"Open"**
6. Login as: `root`
7. Password: `Vanguard2025@&`

---

## 🔧 PASO 2: INSTALAR DEPENDENCIAS EN EL VPS

```bash
# Actualizar sistema
apt update
apt upgrade -y

# Instalar Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar instalación
node -v
npm -v

# Instalar PostgreSQL (si no está instalado)
apt install -y postgresql postgresql-contrib

# Instalar PM2 (para mantener Node.js corriendo)
npm install -g pm2

# Instalar Nginx (para proxy reverso)
apt install -y nginx

# Crear estructura de carpetas
mkdir -p /var/www/estadisticas/backend
mkdir -p /var/www/estadisticas/frontend
```

---

## 📁 PASO 3: SUBIR ARCHIVOS CON WINSCP

### Configuración WinSCP:
1. **File Protocol**: SFTP
2. **Host name**: `72.60.172.101`
3. **Port**: `22`
4. **User name**: `root`
5. **Password**: `Vanguard2025@&`
6. Click **"Login"**

### Subir Archivos:

**Backend:**
- Navega en el panel derecho a: `/var/www/estadisticas/backend/`
- Desde el panel izquierdo (tu PC), selecciona TODO el contenido de la carpeta `backend/`:
  - `routes/`
  - `services/`
  - `utils/`
  - `middleware/`
  - `scripts/`
  - `package.json`
  - `server.js`
  - `env.example`
- **IMPORTANTE**: NO subas `env.local` ni `node_modules/`
- Arrastra y suelta todo al panel derecho

**Frontend:**
- Navega en el panel derecho a: `/var/www/estadisticas/frontend/`
- Desde tu PC, selecciona TODO el contenido de la carpeta `frontend/`:
  - `src/`
  - `public/`
  - `package.json`
  - `vite.config.js`
  - `index.html`
- **IMPORTANTE**: NO subas `node_modules/` ni `dist/`
- Arrastra y suelta todo al panel derecho

---

## 🗄️ PASO 4: CONFIGURAR POSTGRESQL

Vuelve a **PuTTY** y ejecuta:

```bash
# Cambiar a usuario postgres
su - postgres

# Crear base de datos
createdb estadisticas_pagos

# Crear usuario (opcional, puedes usar postgres directamente)
psql
CREATE USER estadisticas_user WITH PASSWORD 'TuPasswordSegura123!';
GRANT ALL PRIVILEGES ON DATABASE estadisticas_pagos TO estadisticas_user;
\q
exit

# Importar el schema
cd /var/www/estadisticas
psql -U postgres -d estadisticas_pagos -f /ruta/al/schema_completo.sql
```

**OPCIÓN 2**: Subir `schema_completo.sql` con WinSCP a `/var/www/estadisticas/` y luego:

```bash
cd /var/www/estadisticas
psql -U postgres -d estadisticas_pagos < schema_completo.sql
```

---

## ⚙️ PASO 5: CONFIGURAR BACKEND

En **PuTTY**:

```bash
cd /var/www/estadisticas/backend

# Crear archivo de variables de entorno
nano .env
```

Pega esto (ajusta los valores):

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=estadisticas_pagos
DB_USER=postgres
DB_PASSWORD=Vanguard2025@&

# JWT
JWT_SECRET=vanguard_estadisticas_jwt_secret_2025_super_seguro
JWT_EXPIRES_IN=24h

# Puerto del backend
PORT=5001

# Frontend URL
FRONTEND_URL=https://estadisticas.vanguardschools.com

# Entorno
NODE_ENV=production

# Límites de subida
UPLOAD_MAX_SIZE=10485760
```

Guarda con `Ctrl+X`, luego `Y`, luego `Enter`.

```bash
# Instalar dependencias
npm install --production

# Probar que funciona
node server.js
```

Si funciona correctamente, presiona `Ctrl+C` para detener.

```bash
# Iniciar con PM2
pm2 start server.js --name estadisticas-backend
pm2 save
pm2 startup
```

Copia el comando que PM2 te muestra y ejecútalo.

---

## 🎨 PASO 6: BUILD DEL FRONTEND

En **PuTTY**:

```bash
cd /var/www/estadisticas/frontend

# Crear archivo de variables de entorno
nano .env
```

Pega esto:

```env
VITE_API_URL=https://estadisticas.vanguardschools.com/api
```

Guarda con `Ctrl+X`, `Y`, `Enter`.

```bash
# Instalar dependencias
npm install

# Crear build de producción
npm run build

# Esto creará la carpeta dist/ con los archivos estáticos
```

---

## 🌐 PASO 7: CONFIGURAR NGINX

```bash
# Crear configuración de Nginx
nano /etc/nginx/sites-available/estadisticas.vanguardschools.com
```

Pega esta configuración:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name estadisticas.vanguardschools.com;

    # Redirigir HTTP a HTTPS (después de configurar SSL)
    # return 301 https://$server_name$request_uri;

    # Frontend (archivos estáticos)
    root /var/www/estadisticas/frontend/dist;
    index index.html;

    # Tamaño máximo de subida
    client_max_body_size 10M;

    # API Backend (proxy reverso)
    location /api/ {
        proxy_pass http://localhost:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Archivos subidos
    location /uploads/ {
        alias /var/www/estadisticas/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback (todas las rutas van a index.html)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;
}
```

Guarda con `Ctrl+X`, `Y`, `Enter`.

```bash
# Crear enlace simbólico
ln -s /etc/nginx/sites-available/estadisticas.vanguardschools.com /etc/nginx/sites-enabled/

# Verificar configuración de Nginx
nginx -t

# Si está OK, recargar Nginx
systemctl reload nginx
```

---

## 🔒 PASO 8: CONFIGURAR SSL (HTTPS) CON CERTBOT

```bash
# Instalar Certbot
apt install -y certbot python3-certbot-nginx

# Obtener certificado SSL
certbot --nginx -d estadisticas.vanguardschools.com

# Seguir las instrucciones de Certbot
# Email: tu-email@ejemplo.com
# Aceptar términos: Y
# Compartir email: N
# Redirigir HTTP a HTTPS: 2 (Sí)

# Certbot configurará automáticamente HTTPS
```

---

## 🔑 PASO 9: CONFIGURAR DNS EN HOSTINGER

1. Ve al **Panel de Hostinger** → **Dominios**
2. Selecciona **vanguardschools.com**
3. Click en **"DNS / Name Servers"**
4. Agregar registro **A**:
   - **Type**: A
   - **Name**: `estadisticas`
   - **Points to**: `72.60.172.101`
   - **TTL**: 14400 (o el valor por defecto)
5. Guardar

**Espera 5-30 minutos** para que se propague el DNS.

---

## 🔐 PASO 10: CREAR USUARIO ADMINISTRADOR EN LA BD

Desde **PuTTY**:

```bash
# Conectar a PostgreSQL
psql -U postgres -d estadisticas_pagos

# Generar hash de contraseña (ejemplo: admin123)
SELECT crypt('admin123', gen_salt('bf', 10));
```

Copia el hash generado (algo como `$2a$10$...`).

```sql
-- Insertar usuario admin
INSERT INTO usuarios (dni, nombres, apellidos, email, rol, clave, activo)
VALUES (
    '11111111',
    'Walter',
    'Lozano',
    'admin@vanguardschools.com',
    'Administrador',
    'HASH_COPIADO_AQUI',  -- Pega el hash aquí
    true
);

-- Salir
\q
```

**OPCIÓN 2**: Una vez que el sistema esté corriendo, usa el frontend para crear el primer usuario desde el login (si implementas registro).

---

## ✅ PASO 11: VERIFICAR QUE TODO FUNCIONA

```bash
# Ver estado de PM2
pm2 status

# Ver logs del backend
pm2 logs estadisticas-backend

# Ver logs de Nginx
tail -f /var/log/nginx/error.log

# Reiniciar servicios si es necesario
pm2 restart estadisticas-backend
systemctl restart nginx
```

---

## 🌐 PASO 12: PROBAR EL SISTEMA

1. Abre tu navegador
2. Ve a: **https://estadisticas.vanguardschools.com**
3. Deberías ver el Landing page
4. Click en **"Iniciar Sesión"**
5. Ingresa las credenciales del admin
6. ¡Listo! 🎉

---

## 🔄 ACTUALIZAR EL SISTEMA (FUTUROS DEPLOYMENTS)

Cuando hagas cambios y quieras actualizar:

### Desde tu PC:
```bash
git add .
git commit -m "Descripción de cambios"
git push
```

### En el VPS (vía PuTTY):

**Backend:**
```bash
cd /var/www/estadisticas/backend
git pull origin master
npm install --production
pm2 restart estadisticas-backend
```

**Frontend:**
```bash
cd /var/www/estadisticas/frontend
git pull origin master
npm install
npm run build
systemctl reload nginx
```

---

## 🛠️ COMANDOS ÚTILES

```bash
# Ver logs en tiempo real
pm2 logs estadisticas-backend --lines 100

# Reiniciar backend
pm2 restart estadisticas-backend

# Estado de servicios
pm2 status
systemctl status nginx
systemctl status postgresql

# Ver procesos de Node
ps aux | grep node

# Liberar puerto si está ocupado
lsof -i :5001
kill -9 PID_DEL_PROCESO
```

---

## 📝 NOTAS IMPORTANTES

### Seguridad:
- ✅ Firewall: Permitir solo puertos 22 (SSH), 80 (HTTP), 443 (HTTPS)
- ✅ Cambiar contraseña de PostgreSQL
- ✅ Usuario de BD con permisos limitados
- ✅ JWT_SECRET único y seguro
- ✅ HTTPS obligatorio en producción

### Backups:
```bash
# Backup de la base de datos
pg_dump -U postgres estadisticas_pagos > backup_$(date +%Y%m%d).sql

# Restaurar desde backup
psql -U postgres -d estadisticas_pagos < backup_20251105.sql
```

### Logs:
- Backend: `pm2 logs estadisticas-backend`
- Nginx: `/var/log/nginx/error.log`
- PostgreSQL: `/var/log/postgresql/`

---

## 🆘 TROUBLESHOOTING

### Backend no inicia:
```bash
cd /var/www/estadisticas/backend
node server.js  # Ver error específico
```

### Frontend muestra página en blanco:
```bash
# Verificar que dist/ existe
ls -la /var/www/estadisticas/frontend/dist/

# Rebuild si es necesario
cd /var/www/estadisticas/frontend
npm run build
```

### Error 502 Bad Gateway:
```bash
# Verificar que backend está corriendo
pm2 status
pm2 restart estadisticas-backend

# Verificar logs de Nginx
tail -f /var/log/nginx/error.log
```

### No se puede conectar a la BD:
```bash
# Verificar que PostgreSQL está corriendo
systemctl status postgresql

# Reiniciar PostgreSQL
systemctl restart postgresql

# Probar conexión
psql -U postgres -d estadisticas_pagos
```

---

## 🎯 CHECKLIST DE DEPLOYMENT

- [ ] Conectar vía SSH (PuTTY)
- [ ] Instalar Node.js, PostgreSQL, PM2, Nginx
- [ ] Crear carpetas en `/var/www/estadisticas/`
- [ ] Subir archivos backend con WinSCP
- [ ] Subir archivos frontend con WinSCP
- [ ] Configurar PostgreSQL
- [ ] Importar schema_completo.sql
- [ ] Crear .env en backend
- [ ] Instalar dependencias backend
- [ ] Iniciar backend con PM2
- [ ] Crear .env en frontend
- [ ] Build del frontend (npm run build)
- [ ] Configurar Nginx
- [ ] Configurar DNS (subdominio estadisticas)
- [ ] Instalar SSL con Certbot
- [ ] Crear usuario administrador en BD
- [ ] Probar https://estadisticas.vanguardschools.com
- [ ] Verificar login
- [ ] Subir archivos de prueba
- [ ] Verificar estadísticas

---

## 📞 CONTACTO

Para soporte durante el deployment, consultar documentación o logs del servidor.

---

**¡Listo para deployment!** 🚀

