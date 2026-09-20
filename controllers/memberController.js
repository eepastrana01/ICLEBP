const prisma = require('../config/prisma');

const canWrite = (user) => {
    if (!user) return false;
    if (user.rol === 'admin') return true;
    const p = user.permisos?.miembros;
    return p === 'escritura' || p === 'admin';
};

exports.getAll = async (req, res) => {
    try {
        const miembros = await prisma.miembro.findMany({ orderBy: { nombre: 'asc' } });
        res.json(miembros);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.create = async (req, res) => {
    if (!canWrite(req.user)) return res.status(403).json({ error: 'Acceso denegado: No tienes permiso de edición en Miembros.' });
    const { nombre, fecha_nacimiento, congregacion, bautizado, confirmado } = req.body;
    try {
        await prisma.miembro.create({
            data: { nombre, fecha_nacimiento: new Date(fecha_nacimiento), congregacion, bautizado, confirmado }
        });
        res.json({ message: 'Agregado' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.update = async (req, res) => {
    if (!canWrite(req.user)) return res.status(403).json({ error: 'Acceso denegado: No tienes permiso de edición en Miembros.' });
    const { nombre, fecha_nacimiento, congregacion, bautizado, confirmado } = req.body;
    try {
        await prisma.miembro.update({
            where: { id: parseInt(req.params.id) },
            data: { nombre, fecha_nacimiento: new Date(fecha_nacimiento), congregacion, bautizado, confirmado }
        });
        res.json({ message: 'Actualizado' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.delete = async (req, res) => {
    if (!canWrite(req.user)) return res.status(403).json({ error: 'Acceso denegado: No tienes permiso de edición en Miembros.' });
    try {
        await prisma.miembro.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Eliminado' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

