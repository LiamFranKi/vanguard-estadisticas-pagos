# 🔧 SOLUCIÓN DE PROBLEMAS VPS - PASO A PASO
## Vanguard Estadísticas Pagos - Hostinger VPS

**Fecha:** $(date)
**Repositorio:** https://github.com/LiamFranKi/vanguard-estadisticas-pagos

---

## 📋 **ESTADO ACTUAL DEL REPOSITORIO**

### **Local vs GitHub:**
- ✅ Repositorio local conectado a GitHub
- ⚠️ **1 commit adelante** de GitHub (sin push)
- ⚠️ **11 archivos modificados** sin commitear
- ⚠️ **4 archivos nuevos** sin rastrear

### **Archivos Modificados:**
1. `CHANGELOG.md`
2. `SETUP_DATABASE.md`
3. `backend/routes/estadisticas.routes.js`
4. `conta.html`
5. `frontend/src/components/Navbar.css`
6. `frontend/src/components/Navbar.jsx`
7. `frontend/src/pages/Archivos.jsx`
8. `frontend/src/pages/Configuracion.jsx`
9. `frontend/src/pages/Dashboard.css`
10. `frontend/src/pages/Dashboard.jsx`
11. `frontend/src/pages/Usuarios.jsx`

### **Archivos Nuevos (Sin Rastrear):**
1. `PROYECTO_ENCUESTAS_ESPECIFICACIONES.md`
2. `SYNC_SERVER_TO_GITHUB.md`
3. `database/estadisticas_pagos_completo.sql`
4. `frontend/src/pages/Admin.css`

---

## 🎯 **PASO 1: SINCRONIZAR CÓDIGO LOCAL CON GITHUB**

### **1.1. Hacer Commit de Cambios Locales**

Desde tu PC (Cursor/Terminal):

```bash
# Ver estado actual
git status

# Agregar todos los cambios
git add .

# Hacer commit con mensaje descriptivo
git commit -m "feat: Actualizaciones de UI responsive, correcciones y documentación completa"

# Push a GitHub
git push origin master
```

**Si te pide credenciales:**
- Username: `LiamFranKi`
- Password: Tu **Personal Access Token** de GitHub (no tu contraseña)

**Si no tienes token:**
1. Ve a: https://github.com/settings/tokens
2. Click en **"Generate new token (classic)"**
3. Nombre: `vanguard-deploy`
4. Expiración: 90 días
5. Scopes: ✅ **repo** (acceso completo)
6. Generar y copiar el token

---

## 🔍 **PASO 2: DIAGNÓSTICO EN EL VPS**

### **2.1. Conectar al VPS con PuTTY**

**Configuración PuTTY:**
```
Host Name: 72.60.172.101
Port: 22
Connection Type: SSH
```

**Login:**
- Usuario: `root`
- Password: `Vanguard2025@&`

### **2.2. Verificar Estado de Servicios**

Ejecuta estos comandos uno por uno y **guarda los resultados**:

```bash
# 1. Verificar que el backend esté corriendo
pm2 status

# 2. Ver logs del backend (últimas 50 líneas)
pm2 logs estadisticas-backend --lines 50

# 3. Verificar que Nginx esté corriendo
systemctl status nginx

# 4. Ver logs de errores de Nginx
tail -n 50 /var/log/nginx/estadisticas-error.log

# 5. Verificar que PostgreSQL esté corriendo
systemctl status postgresql

# 6. Verificar que el puerto 5001 esté en uso
netstat -tulpn | grep 5001

# 7. Verificar estructura de directorios
ls -la /var/www/estadisticas/
ls -la /var/www/estadisticas/backend/
ls -la /var/www/estadisticas/frontend/dist/

# 8. Verificar archivo .env del backend
cat /var/www/estadisticas/backend/.env | grep -v PASSWORD

# 9. Verificar configuración de Nginx
cat /etc/nginx/sites-available/estadisticas

# 10. Probar conexión a la API localmente
curl http://localhost:5001/api/health
```

**📝 IMPORTANTE:** Copia y pega los resultados de estos comandos para identificar el problema.

---

## 🐛 **PASO 3: PROBLEMAS COMUNES Y SOLUCIONES**

### **PROBLEMA 1: Backend no está corriendo**

**Síntomas:**
- `pm2 status` muestra `estadisticas-backend` como `stopped` o no existe
- Error 502 Bad Gateway en el navegador

**Solución:**

```bash
# Ir al directorio del backend
cd /var/www/estadisticas/backend

# Verificar que existe el archivo .env
ls -la .env

# Si no existe, crearlo desde env.local
cp env.local .env
nano .env  # Verificar configuración

# Verificar que las dependencias estén instaladas
ls -la node_modules/ | head -5

# Si no están instaladas:
npm install

# Intentar iniciar manualmente para ver errores
node server.js

# Si funciona, detener con Ctrl+C y iniciar con PM2
pm2 start ecosystem.config.js
# O si ya existe:
pm2 restart estadisticas-backend

# Ver logs en tiempo real
pm2 logs estadisticas-backend
```

---

### **PROBLEMA 2: Error de conexión a base de datos**

**Síntomas:**
- Logs muestran: `Error: connect ECONNREFUSED` o `password authentication failed`
- Backend inicia pero no puede conectar a PostgreSQL

**Solución:**

```bash
# 1. Verificar que PostgreSQL esté corriendo
systemctl status postgresql

# Si no está corriendo:
systemctl start postgresql
systemctl enable postgresql

# 2. Verificar usuario y base de datos
sudo -u postgres psql -c "\l" | grep estadisticas
sudo -u postgres psql -c "\du" | grep estadisticas

# 3. Probar conexión manualmente
sudo -u postgres psql -d estadisticas_pagos -U estadisticas_user

# Si falla, verificar contraseña en .env
cd /var/www/estadisticas/backend
cat .env | grep DB_

# 4. Si la contraseña es incorrecta, cambiarla:
sudo -u postgres psql
ALTER USER estadisticas_user WITH PASSWORD 'nueva_contraseña_segura';
\q

# 5. Actualizar .env con la nueva contraseña
nano .env
# Cambiar DB_PASSWORD=nueva_contraseña_segura

# 6. Reiniciar backend
pm2 restart estadisticas-backend
```

---

### **PROBLEMA 3: Frontend muestra página en blanco**

**Síntomas:**
- La página carga pero está en blanco
- Error 404 en la consola del navegador
- No se cargan los archivos CSS/JS

**Solución:**

```bash
# 1. Verificar que existe la carpeta dist
ls -la /var/www/estadisticas/frontend/dist/

# Si no existe o está vacía:
cd /var/www/estadisticas/frontend

# 2. Verificar que existe .env
ls -la .env

# Si no existe, crearlo:
nano .env
# Contenido:
# VITE_API_URL=https://estadisticas.vanguardschools.com/api
# VITE_BACKEND_URL=https://estadisticas.vanguardschools.com

# 3. Verificar dependencias
ls -la node_modules/ | head -5

# Si no están instaladas:
npm install

# 4. Reconstruir frontend
rm -rf dist
npm run build

# 5. Verificar que se creó dist
ls -la dist/

# 6. Verificar permisos
chown -R www-data:www-data /var/www/estadisticas/frontend/dist
chmod -R 755 /var/www/estadisticas/frontend/dist

# 7. Reiniciar Nginx
systemctl reload nginx
```

---

### **PROBLEMA 4: Error 502 Bad Gateway**

**Síntomas:**
- Nginx responde pero no puede conectar al backend
- Error 502 en todas las rutas `/api/*`

**Solución:**

```bash
# 1. Verificar que el backend esté corriendo
pm2 status

# 2. Verificar que el puerto 5001 esté escuchando
netstat -tulpn | grep 5001

# 3. Verificar configuración de Nginx
cat /etc/nginx/sites-available/estadisticas | grep proxy_pass

# Debe mostrar: proxy_pass http://localhost:5001;

# 4. Verificar logs de Nginx
tail -f /var/log/nginx/estadisticas-error.log

# 5. Probar conexión local al backend
curl http://localhost:5001/api/health

# 6. Si el backend no responde, reiniciarlo
cd /var/www/estadisticas/backend
pm2 restart estadisticas-backend

# 7. Verificar logs del backend
pm2 logs estadisticas-backend --lines 50

# 8. Reiniciar Nginx
systemctl restart nginx
```

---

### **PROBLEMA 5: Archivos no se pueden subir**

**Síntomas:**
- Error al intentar subir Excel o PDF
- Error 413 Request Entity Too Large
- Error de permisos

**Solución:**

```bash
# 1. Verificar permisos del directorio uploads
ls -la /var/www/estadisticas/backend/uploads/

# Si no existe, crearlo:
mkdir -p /var/www/estadisticas/backend/uploads
chown -R www-data:www-data /var/www/estadisticas/backend/uploads
chmod -R 755 /var/www/estadisticas/backend/uploads

# 2. Verificar tamaño máximo en Nginx
grep client_max_body_size /etc/nginx/sites-available/estadisticas

# Debe ser al menos 50M, si no:
nano /etc/nginx/sites-available/estadisticas
# Buscar y cambiar: client_max_body_size 50M;

# 3. Verificar sintaxis de Nginx
nginx -t

# 4. Reiniciar Nginx
systemctl reload nginx
```

---

### **PROBLEMA 6: SSL/HTTPS no funciona**

**Síntomas:**
- Certificado SSL expirado o inválido
- Error de conexión insegura

**Solución:**

```bash
# 1. Verificar certificado actual
certbot certificates

# 2. Renovar certificado manualmente
certbot renew --force-renewal

# 3. Verificar configuración de Nginx para SSL
grep -A 5 "listen 443" /etc/nginx/sites-available/estadisticas

# 4. Reiniciar Nginx
systemctl reload nginx

# 5. Verificar renovación automática
certbot renew --dry-run
```

---

## 🔄 **PASO 4: ACTUALIZAR CÓDIGO EN EL VPS**

### **Opción A: Desde GitHub (Recomendado)**

```bash
# 1. Ir al directorio del proyecto
cd /var/www/estadisticas

# 2. Verificar que es un repositorio Git
git status

# Si no es repositorio Git:
git init
git remote add origin https://github.com/LiamFranKi/vanguard-estadisticas-pagos.git

# 3. Hacer backup antes de actualizar
sudo -u postgres pg_dump estadisticas_pagos > backup_$(date +%Y%m%d_%H%M%S).sql

# 4. Descargar cambios desde GitHub
git fetch origin
git pull origin master

# 5. Actualizar dependencias del backend
cd /var/www/estadisticas/backend
npm install

# 6. Actualizar dependencias del frontend
cd /var/www/estadisticas/frontend
npm install

# 7. Reconstruir frontend
npm run build

# 8. Reiniciar backend
pm2 restart estadisticas-backend

# 9. Reiniciar Nginx
systemctl reload nginx
```

### **Opción B: Desde WinSCP (Manual)**

1. **Descargar archivos modificados** desde GitHub a tu PC
2. **Conectar con WinSCP** al servidor
3. **Subir archivos** específicos que cambiaron
4. **Ejecutar comandos** en PuTTY para actualizar:

```bash
# Backend
cd /var/www/estadisticas/backend
npm install
pm2 restart estadisticas-backend

# Frontend
cd /var/www/estadisticas/frontend
npm install
npm run build
systemctl reload nginx
```

---

## ✅ **PASO 5: VERIFICACIÓN FINAL**

Ejecuta estos comandos para verificar que todo funciona:

```bash
# 1. Verificar servicios
pm2 status
systemctl status nginx
systemctl status postgresql

# 2. Verificar backend
curl http://localhost:5001/api/health

# 3. Verificar frontend
ls -la /var/www/estadisticas/frontend/dist/

# 4. Verificar logs sin errores
pm2 logs estadisticas-backend --lines 20 | grep -i error
tail -n 20 /var/log/nginx/estadisticas-error.log | grep -i error

# 5. Verificar SSL
curl -I https://estadisticas.vanguardschools.com
```

**En el navegador:**
1. Abre: https://estadisticas.vanguardschools.com
2. Verifica que carga la página de inicio
3. Intenta hacer login
4. Verifica que el dashboard carga
5. Intenta subir un archivo de prueba

---

## 📞 **SI SIGUES TENIENDO PROBLEMAS**

### **Información a Recopilar:**

1. **Resultados de los comandos de diagnóstico** (Paso 2)
2. **Logs del backend:** `pm2 logs estadisticas-backend --lines 100`
3. **Logs de Nginx:** `tail -n 100 /var/log/nginx/estadisticas-error.log`
4. **Mensaje de error exacto** que ves en el navegador
5. **Screenshot** de la consola del navegador (F12)

### **Comandos de Emergencia:**

```bash
# Reiniciar todo
pm2 restart estadisticas-backend
systemctl restart nginx
systemctl restart postgresql

# Ver todos los logs juntos
pm2 logs estadisticas-backend --lines 50 && tail -n 50 /var/log/nginx/estadisticas-error.log

# Verificar espacio en disco
df -h

# Verificar memoria
free -h

# Ver procesos de Node.js
ps aux | grep node
```

---

## 📝 **CHECKLIST DE VERIFICACIÓN**

Marca cada punto cuando lo verifiques:

- [ ] Código local sincronizado con GitHub
- [ ] Backend corriendo con PM2
- [ ] Frontend construido (carpeta dist existe)
- [ ] Nginx configurado y corriendo
- [ ] PostgreSQL corriendo
- [ ] SSL/HTTPS funcionando
- [ ] API responde en `/api/health`
- [ ] Página de inicio carga correctamente
- [ ] Login funciona
- [ ] Dashboard carga
- [ ] Subida de archivos funciona
- [ ] Estadísticas se muestran correctamente

---

**Última actualización:** $(date)
**Versión:** 1.0

