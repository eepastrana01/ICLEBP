const prisma = require('../config/prisma');

const canWrite = (user) => {
    if (!user) return false;
    if (user.rol === 'admin') return true;
    const p = user.permisos?.agenda;
    return p === 'escritura' || p === 'admin';
};

exports.getAll = async (req, res) => {
    try {
        const actividades = await prisma.actividad.findMany({ orderBy: { fecha: 'asc' } });
        res.json(actividades);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.create = async (req, res) => {
    if (!canWrite(req.user)) return res.status(403).json({ error: 'Acceso denegado: No tienes permiso de edición en Agenda Pastoral.' });
    const { fecha, actividad, detalles } = req.body;
    try {
        const act = await prisma.actividad.create({
            data: { fecha: new Date(fecha), actividad, detalles }
        });
        res.json(act);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateStatus = async (req, res) => {
    if (!canWrite(req.user)) return res.status(403).json({ error: 'Acceso denegado: No tienes permiso de edición en Agenda Pastoral.' });
    const { completado } = req.body;
    try {
        await prisma.actividad.update({
            where: { id: parseInt(req.params.id) },
            data: { completado }
        });
        res.json({ message: 'Estado actualizado' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.update = async (req, res) => {
    if (!canWrite(req.user)) return res.status(403).json({ error: 'Acceso denegado: No tienes permiso de edición en Agenda Pastoral.' });
    const { fecha, actividad, detalles } = req.body;
    try {
        await prisma.actividad.update({
            where: { id: parseInt(req.params.id) },
            data: { fecha: new Date(fecha), actividad, detalles }
        });
        res.json({ message: 'Editado' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.delete = async (req, res) => {
    if (!canWrite(req.user)) return res.status(403).json({ error: 'Acceso denegado: No tienes permiso de edición en Agenda Pastoral.' });
    try {
        await prisma.actividad.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Eliminado' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
