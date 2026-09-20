const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const SECRET_KEY = process.env.SECRET_KEY || 'mi_secreto_super_seguro';

exports.login = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Por favor ingresa tu usuario y contraseña.' });
    }

    try {
        const user = await prisma.usuario.findFirst({
            where: {
                username: {
                    equals: username.trim(),
                    mode: 'insensitive'
                }
            }
        });

        if (!user) return res.status(400).json({ error: 'Usuario no encontrado' });
        
        if (user.activo === false) {
            return res.status(403).json({ error: 'Tu cuenta ha sido desactivada. Contacta al administrador.' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Contraseña incorrecta' });

        const token = jwt.sign(
            { id: user.id, username: user.username, rol: user.rol, permisos: user.permisos },
            SECRET_KEY,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            username: user.username,
            nombre_completo: user.nombre_completo || user.username,
            rol: user.rol,
            permisos: user.permisos || {}
        });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};
