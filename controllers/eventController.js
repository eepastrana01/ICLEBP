const prisma = require('../config/prisma');

const canWrite = (user) => {
    if (!user) return false;
    if (user.rol === 'admin') return true;
    const p = user.permisos?.eventos;
    return p === 'escritura' || p === 'admin';
};

// ==================== EVENTOS / ACTIVIDADES ====================

exports.getEventos = async (req, res) => {
    try {
        const eventos = await prisma.eventoEspecial.findMany({
            include: {
                participantes: true
            },
            orderBy: { created_at: 'desc' }
        });

        // Calcular totales acumulados para cada evento
        const eventosConResumen = eventos.map(ev => {
            const participantes = ev.participantes || [];
            const totalParticipantes = participantes.length;
            const totalBoletos = participantes.reduce((sum, p) => sum + (p.cantidad_boletos || 0), 0);
            const totalRecaudado = participantes
                .filter(p => p.pagado)
                .reduce((sum, p) => sum + (p.monto_total || 0), 0);
            const totalPendiente = participantes
                .filter(p => !p.pagado)
                .reduce((sum, p) => sum + (p.monto_total || 0), 0);
            const totalProyectado = totalRecaudado + totalPendiente;
            const boletosEntregados = participantes
                .filter(p => p.entregado)
                .reduce((sum, p) => sum + (p.cantidad_boletos || 0), 0);
            const boletosNoEntregados = totalBoletos - boletosEntregados;

            return {
                id: ev.id,
                nombre: ev.nombre,
                descripcion: ev.descripcion,
                tipo: ev.tipo,
                precio_boleto: ev.precio_boleto,
                fecha_evento: ev.fecha_evento,
                meta_recaudacion: ev.meta_recaudacion,
                activo: ev.activo,
                created_at: ev.created_at,
                resumen: {
                    total_participantes: totalParticipantes,
                    total_boletos: totalBoletos,
                    total_recaudado: totalRecaudado,
                    total_pendiente: totalPendiente,
                    total_proyectado: totalProyectado,
                    boletos_entregados: boletosEntregados,
                    boletos_no_entregados: boletosNoEntregados,
                    porcentaje_recaudado: totalProyectado > 0 ? Math.round((totalRecaudado / totalProyectado) * 100) : 0,
                    porcentaje_entregado: totalBoletos > 0 ? Math.round((boletosEntregados / totalBoletos) * 100) : 0
                }
            };
        });

        res.json(eventosConResumen);
    } catch (err) {
        console.error('Error al listar eventos:', err);
        res.status(500).json({ error: 'Error al obtener los eventos', details: err.message });
    }
};

exports.getEventoById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const ev = await prisma.eventoEspecial.findUnique({
            where: { id },
            include: {
                participantes: {
                    orderBy: { created_at: 'desc' }
                }
            }
        });

        if (!ev) return res.status(404).json({ error: 'Evento no encontrado' });

        const participantes = ev.participantes || [];
        const totalParticipantes = participantes.length;
        const totalBoletos = participantes.reduce((sum, p) => sum + (p.cantidad_boletos || 0), 0);
        const totalRecaudado = participantes
            .filter(p => p.pagado)
            .reduce((sum, p) => sum + (p.monto_total || 0), 0);
        const totalPendiente = participantes
            .filter(p => !p.pagado)
            .reduce((sum, p) => sum + (p.monto_total || 0), 0);
        const totalProyectado = totalRecaudado + totalPendiente;
        const boletosEntregados = participantes
            .filter(p => p.entregado)
            .reduce((sum, p) => sum + (p.cantidad_boletos || 0), 0);
        const boletosNoEntregados = totalBoletos - boletosEntregados;

        res.json({
            ...ev,
            resumen: {
                total_participantes: totalParticipantes,
                total_boletos: totalBoletos,
                total_recaudado: totalRecaudado,
                total_pendiente: totalPendiente,
                total_proyectado: totalProyectado,
                boletos_entregados: boletosEntregados,
                boletos_no_entregados: boletosNoEntregados,
                porcentaje_recaudado: totalProyectado > 0 ? Math.round((totalRecaudado / totalProyectado) * 100) : 0,
                porcentaje_entregado: totalBoletos > 0 ? Math.round((boletosEntregados / totalBoletos) * 100) : 0
            }
        });
    } catch (err) {
        console.error('Error al obtener evento:', err);
        res.status(500).json({ error: 'Error al obtener el evento', details: err.message });
    }
};

exports.createEvento = async (req, res) => {
    if (!canWrite(req.user)) return res.status(403).json({ error: 'Acceso denegado: No tienes permiso de edición en Rifas y Eventos.' });
    
    const { nombre, descripcion, tipo, precio_boleto, fecha_evento, meta_recaudacion } = req.body;
    if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: 'El nombre de la actividad o rifa es obligatorio.' });
    }

    try {
        const evento = await prisma.eventoEspecial.create({
            data: {
                nombre: nombre.trim(),
                descripcion: descripcion ? descripcion.trim() : null,
                tipo: tipo || 'rifa',
                precio_boleto: precio_boleto !== undefined ? parseFloat(precio_boleto) : 0,
                fecha_evento: fecha_evento ? new Date(fecha_evento) : null,
                meta_recaudacion: meta_recaudacion ? parseFloat(meta_recaudacion) : null,
                activo: true
            }
        });
        res.status(201).json(evento);
    } catch (err) {
        console.error('Error al crear evento:', err);
        res.status(500).json({ error: 'Error al registrar el evento', details: err.message });
    }
};

exports.updateEvento = async (req, res) => {
    if (!canWrite(req.user)) return res.status(403).json({ error: 'Acceso denegado: No tienes permiso de edición en Rifas y Eventos.' });
    
    const id = parseInt(req.params.id);
    const { nombre, descripcion, tipo, precio_boleto, fecha_evento, meta_recaudacion, activo } = req.body;

    try {
        const evento = await prisma.eventoEspecial.update({
            where: { id },
            data: {
                ...(nombre && { nombre: nombre.trim() }),
                ...(descripcion !== undefined && { descripcion: descripcion ? descripcion.trim() : null }),
                ...(tipo && { tipo }),
                ...(precio_boleto !== undefined && { precio_boleto: parseFloat(precio_boleto) }),
                ...(fecha_evento !== undefined && { fecha_evento: fecha_evento ? new Date(fecha_evento) : null }),
                ...(meta_recaudacion !== undefined && { meta_recaudacion: meta_recaudacion ? parseFloat(meta_recaudacion) : null }),
                ...(activo !== undefined && { activo: Boolean(activo) })
            }
        });
        res.json(evento);
    } catch (err) {
        console.error('Error al actualizar evento:', err);
        res.status(500).json({ error: 'Error al actualizar el evento', details: err.message });
    }
};

exports.deleteEvento = async (req, res) => {
    if (!canWrite(req.user)) return res.status(403).json({ error: 'Acceso denegado: No tienes permiso de edición en Rifas y Eventos.' });
    
    const id = parseInt(req.params.id);
    try {
        await prisma.eventoEspecial.delete({ where: { id } });
        res.json({ message: 'Evento eliminado correctamente' });
    } catch (err) {
        console.error('Error al eliminar evento:', err);
        res.status(500).json({ error: 'Error al eliminar el evento', details: err.message });
    }
};

// ==================== PARTICIPANTES / BOLETOS ====================

exports.getParticipantes = async (req, res) => {
    try {
        const eventoId = parseInt(req.params.eventoId);
        const participantes = await prisma.eventoParticipante.findMany({
            where: { evento_id: eventoId },
            orderBy: { created_at: 'desc' }
        });
        res.json(participantes);
    } catch (err) {
        console.error('Error al obtener participantes:', err);
        res.status(500).json({ error: 'Error al obtener participantes', details: err.message });
    }
};

exports.createParticipante = async (req, res) => {
    if (!canWrite(req.user)) return res.status(403).json({ error: 'Acceso denegado: No tienes permiso de edición en Rifas y Eventos.' });
    
    const {
        evento_id,
        nombre_persona,
        telefono,
        cantidad_boletos,
        numeros_boletos,
        monto_total,
        pagado,
        entregado,
        notas
    } = req.body;

    if (!evento_id) return res.status(400).json({ error: 'El ID del evento es obligatorio.' });
    if (!nombre_persona || !nombre_persona.trim()) {
        return res.status(400).json({ error: 'El nombre de la persona es obligatorio.' });
    }

    try {
        const evento = await prisma.eventoEspecial.findUnique({
            where: { id: parseInt(evento_id) }
        });
        if (!evento) return res.status(404).json({ error: 'El evento especificado no existe.' });

        const boletos = parseInt(cantidad_boletos) || 1;
        const total = monto_total !== undefined && monto_total !== null && monto_total !== ''
            ? parseFloat(monto_total)
            : boletos * (evento.precio_boleto || 0);

        const participante = await prisma.eventoParticipante.create({
            data: {
                evento_id: evento.id,
                nombre_persona: nombre_persona.trim(),
                telefono: telefono ? telefono.trim() : null,
                cantidad_boletos: boletos,
                numeros_boletos: numeros_boletos ? numeros_boletos.trim() : null,
                monto_total: total,
                pagado: Boolean(pagado),
                entregado: Boolean(entregado),
                notas: notas ? notas.trim() : null
            }
        });

        res.status(201).json(participante);
    } catch (err) {
        console.error('Error al registrar participante:', err);
        res.status(500).json({ error: 'Error al registrar participante', details: err.message });
    }
};

exports.updateParticipante = async (req, res) => {
    if (!canWrite(req.user)) return res.status(403).json({ error: 'Acceso denegado: No tienes permiso de edición en Rifas y Eventos.' });
    
    const id = parseInt(req.params.id);
    const {
        nombre_persona,
        telefono,
        cantidad_boletos,
        numeros_boletos,
        monto_total,
        pagado,
        entregado,
        notas
    } = req.body;

    try {
        const updateData = {};
        if (nombre_persona !== undefined) updateData.nombre_persona = nombre_persona.trim();
        if (telefono !== undefined) updateData.telefono = telefono ? telefono.trim() : null;
        if (cantidad_boletos !== undefined) updateData.cantidad_boletos = parseInt(cantidad_boletos);
        if (numeros_boletos !== undefined) updateData.numeros_boletos = numeros_boletos ? numeros_boletos.trim() : null;
        if (monto_total !== undefined) updateData.monto_total = parseFloat(monto_total);
        if (pagado !== undefined) updateData.pagado = Boolean(pagado);
        if (entregado !== undefined) updateData.entregado = Boolean(entregado);
        if (notas !== undefined) updateData.notas = notas ? notas.trim() : null;

        const participante = await prisma.eventoParticipante.update({
            where: { id },
            data: updateData
        });

        res.json(participante);
    } catch (err) {
        console.error('Error al actualizar participante:', err);
        res.status(500).json({ error: 'Error al actualizar participante', details: err.message });
    }
};

exports.togglePago = async (req, res) => {
    if (!canWrite(req.user)) return res.status(403).json({ error: 'Acceso denegado: No tienes permiso de edición en Rifas y Eventos.' });
    
    const id = parseInt(req.params.id);
    try {
        const current = await prisma.eventoParticipante.findUnique({ where: { id } });
        if (!current) return res.status(404).json({ error: 'Registro no encontrado' });

        const updated = await prisma.eventoParticipante.update({
            where: { id },
            data: { pagado: !current.pagado }
        });

        res.json({ id: updated.id, pagado: updated.pagado, message: updated.pagado ? 'Marcado como pagado' : 'Marcado como pendiente' });
    } catch (err) {
        console.error('Error al cambiar estado de pago:', err);
        res.status(500).json({ error: 'Error al cambiar estado de pago', details: err.message });
    }
};

exports.toggleEntrega = async (req, res) => {
    if (!canWrite(req.user)) return res.status(403).json({ error: 'Acceso denegado: No tienes permiso de edición en Rifas y Eventos.' });
    
    const id = parseInt(req.params.id);
    try {
        const current = await prisma.eventoParticipante.findUnique({ where: { id } });
        if (!current) return res.status(404).json({ error: 'Registro no encontrado' });

        const updated = await prisma.eventoParticipante.update({
            where: { id },
            data: { entregado: !current.entregado }
        });

        res.json({ id: updated.id, entregado: updated.entregado, message: updated.entregado ? 'Marcado como entregado' : 'Marcado como no entregado' });
    } catch (err) {
        console.error('Error al cambiar estado de entrega:', err);
        res.status(500).json({ error: 'Error al cambiar estado de entrega', details: err.message });
    }
};

exports.deleteParticipante = async (req, res) => {
    if (!canWrite(req.user)) return res.status(403).json({ error: 'Acceso denegado: No tienes permiso de edición en Rifas y Eventos.' });
    
    const id = parseInt(req.params.id);
    try {
        await prisma.eventoParticipante.delete({ where: { id } });
        res.json({ message: 'Registro de participante eliminado' });
    } catch (err) {
        console.error('Error al eliminar participante:', err);
        res.status(500).json({ error: 'Error al eliminar participante', details: err.message });
    }
};
