const prisma = require('../config/prisma');

const DEFAULT_CARGOS = {
  1: 'Pastor Presidente',
  2: 'Pastor Vicepresidente',
  3: 'Presidencia Congregacional',
  4: 'Secretaria',
  5: 'Tesorera',
  6: 'Fiscal',
  7: 'Coord. de Jóvenes',
  8: 'Coord. de Damas',
  9: 'Coord. Escuela Dominical',
  10: 'Primer Vocal',
  11: 'Segundo Vocal',
  12: 'Tercer Vocal',
  13: 'Soporte y Logística'
};

exports.getAll = async (req, res) => {
    try {
        const equipo = await prisma.equipoPastoral.findMany({ orderBy: [{ nivel: 'asc' }, { id: 'asc' }] });
        const enriched = equipo.map(item => ({
            ...item,
            cargo: item.cargo || DEFAULT_CARGOS[item.id] || 'Líder / Servidor'
        }));
        res.json(enriched);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const canWrite = (user) => {
    if (!user) return false;
    if (user.rol === 'admin') return true;
    const p = user.permisos?.equipo;
    return p === 'escritura' || p === 'admin';
};

exports.update = async (req, res) => {
    if(!canWrite(req.user)) return res.status(403).json({ error: 'Acceso denegado: No tienes permiso de edición en Equipo Pastoral.' });
    const { nombre, cargo } = req.body;
    try {
        const updateData = {};
        if (nombre !== undefined) updateData.nombre = nombre;
        if (cargo !== undefined) updateData.cargo = cargo;

        const updated = await prisma.equipoPastoral.update({
            where: { id: parseInt(req.params.id) },
            data: updateData
        });
        res.json({ message: 'Actualizado exitosamente', item: updated });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
