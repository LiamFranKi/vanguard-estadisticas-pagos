const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  try {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.substring(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Token requerido' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, message: 'No autenticado' });
  if (req.user.rol !== 'Administrador') {
    return res.status(403).json({ success: false, message: 'Requiere rol Administrador' });
  }
  next();
}

module.exports = { auth, requireAdmin };
