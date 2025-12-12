# 🔄 SINCRONIZAR SERVIDOR VPS CON GITHUB

Guía paso a paso para sincronizar los archivos del servidor en producción con el repositorio de GitHub.

---

## 🎯 **OBJETIVO**

Los archivos en el servidor VPS (`/var/www/estadisticas/`) son la **versión real y funcional**. Necesitamos sincronizarlos con GitHub para tener backup y control de versiones.

---

## 📋 **OPCIÓN 1: SINCRONIZAR DIRECTAMENTE DESDE EL SERVIDOR (Recomendado)**

### **PASO 1: Configurar Git en el Servidor**

Desde **PuTTY**, conectado al servidor:

```bash
# Ir al directorio del proyecto
cd /var/www/estadisticas
```

### **PASO 2: Verificar estado de Git**

```bash
# Ver si ya es un repositorio Git
git status
```

**Si dice "fatal: not a git repository"**, entonces fue clonado sin `.git`. Continúa al PASO 3.

**Si muestra el estado**, salta al PASO 4.

### **PASO 3: Reinicializar Git (solo si es necesario)**

```bash
# Inicializar Git
git init

# Agregar el remote de GitHub
git remote add origin https://github.com/LiamFranKi/vanguard-estadisticas-pagos.git

# Verificar
git remote -v
```

### **PASO 4: Agregar todos los archivos**

```bash
# Ver qué archivos están modificados o sin seguimiento
git status

# Agregar TODOS los archivos
git add .

# Ver el estado después de agregar
git status
```

### **PASO 5: Hacer commit**

```bash
# Commit con mensaje descriptivo
git commit -m "feat: Sistema desplegado en producción con responsive completo y corrección de Setiembre"
```

### **PASO 6: Configurar autenticación de GitHub**

GitHub ya no permite usar contraseñas para push. Necesitas un **Personal Access Token (PAT)**.

#### **Crear PAT en GitHub:**

1. Ve a: https://github.com/settings/tokens
2. Click en **"Generate new token"** → **"Generate new token (classic)"**
3. **Note**: `vanguard-estadisticas-deploy`
4. **Expiration**: 90 days (o sin expiración)
5. **Scopes**: Marca ✅ **repo** (acceso completo al repositorio)
6. Click en **"Generate token"**
7. **COPIA EL TOKEN** (solo se muestra una vez): `ghp_xxxxxxxxxxxxxxxxxx`

### **PASO 7: Push al repositorio**

```bash
# Primera vez (te pedirá credenciales)
git push -u origin master

# Username: LiamFranKi
# Password: [PEGA AQUÍ EL TOKEN QUE COPIASTE]
```

**⚠️ IMPORTANTE:** Cuando pegues el password (token), **no se verá nada** en pantalla. Es normal. Solo pega y presiona Enter.

### **PASO 8: Guardar credenciales (opcional)**

```bash
# Para no tener que escribir el token cada vez
git config credential.helper store

# La próxima vez que hagas push, se guardará automáticamente
```

---

## 📋 **OPCIÓN 2: DESCARGAR DEL SERVIDOR Y SUBIR DESDE TU PC**

### **PASO 1: Descargar archivos con WinSCP**

1. **Conecta con WinSCP** al servidor
2. **Navega a**: `/var/www/estadisticas/`
3. **Descarga estas carpetas** a tu PC:
   - `backend/` (completa)
   - `frontend/` (completa)
   - `database/` (completa)
4. **Descarga estos archivos**:
   - `CHANGELOG.md`
   - `DEPLOYMENT_HOSTINGER_VPS.md`
   - `README.md`
   - Todos los `.md` de la raíz

### **PASO 2: Sobrescribir archivos locales**

1. En tu PC, abre: `C:\vanguard-estadisticas-pagos`
2. **Sobrescribe** las carpetas descargadas
3. **Reemplaza** los archivos `.md`

### **PASO 3: Commit y Push desde tu PC**

Desde **Cursor** o terminal local:

```bash
# Ver archivos modificados
git status

# Agregar todos los cambios
git add .

# Commit
git commit -m "feat: Sistema desplegado en producción con responsive completo"

# Push a GitHub
git push origin master
```

---

## 📋 **OPCIÓN 3: HYBRID (Archivos Específicos)**

Si solo quieres sincronizar **archivos específicos** que cambiaron:

### **Archivos que cambiaron en el servidor:**

**Backend:**
- `server.js` (trust proxy)
- `routes/estadisticas.routes.js` (setiembre)

**Frontend:**
- `src/pages/Dashboard.jsx` (setiembre + responsive)
- `src/pages/Dashboard.css` (responsive móvil)
- `src/components/Navbar.jsx` (portal + mi perfil)
- `src/components/Navbar.css` (menú móvil)
- `src/pages/Admin.css` (NUEVO - responsive)
- `src/pages/Archivos.jsx` (responsive)
- `src/pages/Usuarios.jsx` (responsive)
- `src/pages/Configuracion.jsx` (responsive)

**Documentación:**
- `CHANGELOG.md` (actualizado)
- `DEPLOYMENT_HOSTINGER_VPS.md` (NUEVO)

### **Pasos:**

1. **Descarga solo esos archivos** con WinSCP
2. **Sobrescribe en tu PC**
3. **Commit y Push** desde tu PC

---

## ✅ **VERIFICACIÓN FINAL**

Después de hacer push, verifica en GitHub:

1. Ve a: https://github.com/LiamFranKi/vanguard-estadisticas-pagos
2. Verifica que los archivos estén actualizados
3. Revisa el último commit

---

## 🔐 **SEGURIDAD**

### **Archivos que NO debes subir a GitHub:**

- ✅ `backend/.env` (YA ESTÁ en `.gitignore`)
- ✅ `frontend/.env` (YA ESTÁ en `.gitignore`)
- ✅ `backend/node_modules/` (YA ESTÁ en `.gitignore`)
- ✅ `frontend/node_modules/` (YA ESTÁ en `.gitignore`)
- ✅ `backend/uploads/` (archivos subidos por usuarios)

Estos archivos ya están excluidos automáticamente.

---

## 💡 **RECOMENDACIÓN**

**Usa OPCIÓN 1** (sincronizar desde el servidor) porque:
- ✅ Más directo
- ✅ Menos pasos
- ✅ Asegura que la versión del servidor sea la que se sube
- ✅ No hay riesgo de sobrescribir archivos incorrectos

**Solo necesitas crear el Personal Access Token una vez.**

---

## 🚀 **RESUMEN RÁPIDO**

```bash
# Desde PuTTY (en el servidor)
cd /var/www/estadisticas
git status
git add .
git commit -m "feat: Deployment en producción + responsive móvil completo"
git push -u origin master
# Username: LiamFranKi
# Password: [TU_GITHUB_TOKEN]
```

---

**¿Con cuál opción quieres empezar? ¿OPCIÓN 1 (desde servidor) u OPCIÓN 2 (desde tu PC)?** 🚀


