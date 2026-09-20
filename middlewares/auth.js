const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || process.env.SECRET_KEY || 'mi_secreto_super_seguro';

const verificarToken = (req, res, next) => {
    let token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'Acceso denegado: Se requiere Token' });

    if (token.startsWith('Bearer ')) {
        token = token.slice(7).trim();
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

const puedeEscribir = (modulo) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    if (req.user.rol === 'admin') return next();
    const permisos = req.user.permisos || {};
    const p = permisos[modulo];
    if (p === 'escritura' || p === 'admin') return next();
    return res.status(403).json({ error: `Acceso denegado: No tienes permisos de edición en ${modulo}.` });
};

module.exports = { verificarToken, puedeEscribir };

