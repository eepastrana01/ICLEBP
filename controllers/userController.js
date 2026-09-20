const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const SECRET_KEY = process.env.JWT_SECRET || process.env.SECRET_KEY || 'mi_secreto_super_seguro';

exports.getProfile = async (req, res) => {
    try {
        const user = await prisma.usuario.findUnique({
            where: { id: req.user.id },
            select: { id: true, username: true, rol: true, activo: true, correo: true, telefono: true, direccion: true }
        });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(user);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

exports.updateProfile = async (req, res) => {
    const { password, correo, telefono, direccion } = req.body;
    const userId = parseInt(req.user.id, 10);

    if (isNaN(userId)) {
        return res.status(401).json({ error: 'Token inválido: ID de usuario no encontrado.' });
    }

    try {
        const existingUser = await prisma.usuario.findUnique({ where: { id: userId } });
        if (!existingUser) return res.status(404).json({ error: 'Usuario no encontrado' });

        const updateData = {};
        if (correo !== undefined) updateData.correo = correo ? correo.trim() : null;
        if (telefono !== undefined) updateData.telefono = telefono ? telefono.trim() : null;
        if (direccion !== undefined) updateData.direccion = direccion ? direccion.trim() : null;

        if (password && password.trim()) {
            if (password.trim().length < 4) {
                return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres.' });
            }
            updateData.password = await bcrypt.hash(password.trim(), 10);
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No se enviaron datos para actualizar.' });
        }

        const updatedUser = await prisma.usuario.update({
            where: { id: userId },
            data: updateData,
            select: { id: true, username: true, rol: true, activo: true, correo: true, telefono: true, direccion: true }
        });

        // Regenerar token para mantener sesión activa
        const newToken = jwt.sign(
            { id: updatedUser.id, username: updatedUser.username, rol: updatedUser.rol },
            SECRET_KEY,
            { expiresIn: '8h' }
        );

        res.json({
            message: 'Perfil actualizado correctamente',
            user: updatedUser,
            token: newToken
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAll = async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    try {
        const users = await prisma.usuario.findMany({
            select: {
                id: true,
                username: true,
                nombre_completo: true,
                rol: true,
                permisos: true,
                password_plain: true,
                activo: true,
                correo: true,
                telefono: true,
                direccion: true
            },
            orderBy: { id: 'asc' }
        });
        res.json(users);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.create = async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    const { username, password, rol, nombre_completo, permisos } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'El usuario y la contraseña son requeridos.' });
    }

    try {
        // Verificar si existe el usuario (insensible a mayúsculas/minúsculas)
        const existing = await prisma.usuario.findFirst({
            where: {
                username: {
                    equals: username.trim(),
                    mode: 'insensitive'
                }
            }
        });
        if (existing) {
            return res.status(400).json({ error: `El nombre de usuario "${username}" ya está registrado.` });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.usuario.create({
            data: {
                username: username.trim(),
                nombre_completo: nombre_completo ? nombre_completo.trim() : null,
                password: hashedPassword,
                password_plain: password,
                rol: rol || 'usuario',
                permisos: permisos || {}
            }
        });
        res.json({ message: 'Usuario creado exitosamente', user: newUser });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateUser = async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    const { id } = req.params;
    const { username, nombre_completo, rol, permisos, password, activo } = req.body;
    const userId = parseInt(id, 10);

    try {
        const existing = await prisma.usuario.findUnique({ where: { id: userId } });
        if (!existing) return res.status(404).json({ error: 'Usuario no encontrado.' });

        const updateData = {};
        if (username !== undefined && username.trim() !== existing.username) {
            const duplicate = await prisma.usuario.findFirst({
                where: {
                    username: { equals: username.trim(), mode: 'insensitive' },
                    NOT: { id: userId }
                }
            });
            if (duplicate) {
                return res.status(400).json({ error: `El usuario "${username}" ya está en uso.` });
            }
            updateData.username = username.trim();
        }

        if (nombre_completo !== undefined) updateData.nombre_completo = nombre_completo ? nombre_completo.trim() : null;
        if (rol !== undefined) updateData.rol = rol;
        if (permisos !== undefined) updateData.permisos = permisos;
        if (activo !== undefined) updateData.activo = activo;

        if (password && password.trim()) {
            if (password.trim().length < 4) {
                return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres.' });
            }
            updateData.password = await bcrypt.hash(password.trim(), 10);
            updateData.password_plain = password.trim();
        }

        const updated = await prisma.usuario.update({
            where: { id: userId },
            data: updateData
        });
        res.json({ message: 'Usuario actualizado exitosamente', user: updated });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updatePassword = async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    const { id } = req.params; const { password } = req.body;
    if (!password || password.length < 4) return res.status(400).json({ error: 'Mínimo 4 caracteres' });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.usuario.update({
            where: { id: parseInt(id) },
            data: {
                password: hashedPassword,
                password_plain: password
            }
        });
        res.json({ message: 'Contraseña actualizada' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateStatus = async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    const { id } = req.params; const { activo } = req.body;
    try {
        await prisma.usuario.update({
            where: { id: parseInt(id) },
            data: { activo }
        });
        res.json({ message: 'Estado actualizado' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.delete = async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    try {
        await prisma.usuario.delete({
            where: { id: parseInt(req.params.id) }
        });
        res.json({ message: 'Usuario eliminado' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
