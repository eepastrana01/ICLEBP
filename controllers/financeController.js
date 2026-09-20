const prisma = require('../config/prisma');

// 1. Obtener Datos
exports.getDatos = async (req, res) => {
    try {
        const transacciones = await prisma.finanzaTransaccion.findMany({ orderBy: [{ fecha: 'desc' }, { id: 'desc' }] });
        const talonarios = await prisma.finanzaTalonario.findMany({ orderBy: { id: 'asc' } });
        const categorias = await prisma.finanzaCategoria.findMany({ orderBy: { nombre: 'asc' } });

        res.json({ transacciones, talonarios, categorias });
    } catch (err) {
        res.status(500).json({ error: 'Error cargando datos financieros' });
    }
};

const canWriteFinance = (user) => {
    if (!user) return false;
    if (user.rol === 'admin') return true;
    const p = user.permisos?.finanzas;
    return p === 'escritura' || p === 'admin';
};

// 2. Transacciones
exports.crearTransaccion = async (req, res) => {
    if (!canWriteFinance(req.user)) return res.status(403).json({ error: 'Acceso denegado: No tienes permiso de edición en Finanzas.' });
    const { fecha, tipo, categoria, descripcion, monto, recibo_no, asistentes, comulgantes, recibido_por } = req.body;
    
    try {
        // VALIDACIÓN CRÍTICA: Debe existir un talonario activo para este tipo de transacción
        const talonarioActivo = await prisma.finanzaTalonario.findFirst({
            where: { tipo, activo: true }
        });

        if (!talonarioActivo) {
            return res.status(400).json({ 
                error: `No se puede registrar el ${tipo}: no hay un talonario activo para "${tipo}". Ve a Configuración > Talonarios y activa o crea uno antes de continuar.` 
            });
        }

        if (recibo_no) {
            // Verificar si el recibo ya existe para este tipo
            const existe = await prisma.finanzaTransaccion.findFirst({
                where: { recibo_no, tipo }
            });
            if (existe) {
                return res.status(400).json({ error: `El número de recibo/documento ${recibo_no} ya fue registrado para un ${tipo}.` });
            }

            // Si coincide o supera el número actual del talonario numérico, avanzar el correlativo
            const numRecibo = parseInt(recibo_no, 10);
            if (!isNaN(numRecibo)) {
                // Validar que el recibo esté dentro del rango del talonario activo
                if (numRecibo < talonarioActivo.rango_inicio || numRecibo > talonarioActivo.rango_fin) {
                    return res.status(400).json({ 
                        error: `El número de recibo ${recibo_no} está fuera del rango del talonario activo "${talonarioActivo.nombre}" (${talonarioActivo.rango_inicio} - ${talonarioActivo.rango_fin}).` 
                    });
                }

                await prisma.finanzaTalonario.update({
                    where: { id: talonarioActivo.id },
                    data: { actual: Math.max(talonarioActivo.actual, numRecibo + 1) }
                });
            }
        }

        const transaccion = await prisma.finanzaTransaccion.create({
            data: { 
                fecha: new Date(fecha), 
                tipo, 
                categoria, 
                descripcion, 
                monto: parseFloat(monto), 
                recibo_no, 
                asistentes: parseInt(asistentes) || 0,
                comulgantes: parseInt(comulgantes) || 0,
                recibido_por: recibido_por || null
            }
        });
        res.json(transaccion);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.actualizarTransaccion = async (req, res) => {
    if (!canWriteFinance(req.user)) return res.status(403).json({ error: 'Acceso denegado: No tienes permiso de edición en Finanzas.' });
    const { id } = req.params;
    const { fecha, categoria, descripcion, monto, recibo_no, asistentes, comulgantes, recibido_por } = req.body;
    try {
        const transaccion = await prisma.finanzaTransaccion.update({
            where: { id: parseInt(id) },
            data: { 
                fecha: new Date(fecha), 
                categoria, 
                descripcion, 
                monto: parseFloat(monto), 
                recibo_no, 
                asistentes: parseInt(asistentes) || 0,
                comulgantes: parseInt(comulgantes) || 0,
                recibido_por: recibido_por || null
            }
        });
        res.json({ message: 'Actualizada', transaccion });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.eliminarTransaccion = async (req, res) => {
    if (!canWriteFinance(req.user)) return res.status(403).json({ error: 'Acceso denegado: No tienes permiso de edición en Finanzas.' });
    try {
        const eliminado = await prisma.finanzaTransaccion.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Eliminado', eliminado });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 3. Talonarios
exports.crearTalonario = async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Denegado' });
    const { nombre, inicio, fin, actual, tipo } = req.body; 
    try {
        const talonario = await prisma.finanzaTalonario.create({
            data: { 
                nombre, 
                rango_inicio: parseInt(inicio), 
                rango_fin: parseInt(fin), 
                actual: parseInt(actual), 
                activo: true, 
                tipo: tipo || 'ingreso' 
            }
        });
        res.json(talonario);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.actualizarTalonario = async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Denegado' });
    const { id } = req.params;
    const { nombre, inicio, fin, actual, activo, tipo } = req.body; 

    try {
        if (activo === true && tipo) {
            await prisma.finanzaTalonario.updateMany({
                where: { tipo },
                data: { activo: false }
            });
        }

        const data = {};
        if (nombre !== undefined) data.nombre = nombre;
        if (inicio !== undefined) data.rango_inicio = parseInt(inicio);
        if (fin !== undefined) data.rango_fin = parseInt(fin);
        if (actual !== undefined) data.actual = parseInt(actual);
        if (activo !== undefined) data.activo = activo;

        const talonario = await prisma.finanzaTalonario.update({
            where: { id: parseInt(id) },
            data
        });
        res.json(talonario);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.eliminarTalonario = async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Denegado' });
    try {
        await prisma.finanzaTalonario.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Eliminado' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 4. Categorías
exports.crearCategoria = async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Denegado' });
    try {
        const categoria = await prisma.finanzaCategoria.create({ data: { nombre: req.body.nombre } });
        res.json(categoria);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.actualizarCategoria = async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Denegado' });
    try {
        const categoria = await prisma.finanzaCategoria.update({
            where: { id: parseInt(req.params.id) },
            data: { nombre: req.body.nombre }
        });
        res.json(categoria);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.eliminarCategoria = async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Denegado' });
    try {
        await prisma.finanzaCategoria.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Eliminado' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

