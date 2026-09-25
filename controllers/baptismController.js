const prisma = require('../config/prisma');

// Listar todos los registros de bautismo
exports.getAll = async (req, res) => {
  try {
    const bautismos = await prisma.bautismo.findMany({
      orderBy: { fecha_bautismo: 'desc' }
    });
    res.json(bautismos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener registros de bautismo', details: error.message });
  }
};

// Obtener un registro por ID
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const bautismo = await prisma.bautismo.findUnique({
      where: { id }
    });
    if (!bautismo) {
      return res.status(404).json({ error: 'Registro de bautismo no encontrado' });
    }
    res.json(bautismo);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el bautismo', details: error.message });
  }
};

// Obtener sugerencia del próximo correlativo de registro
exports.getNextRegistro = async (req, res) => {
  try {
    const registros = await prisma.bautismo.findMany({
      select: { numero_registro: true }
    });

    let maxNum = 0;
    registros.forEach(r => {
      const match = r.numero_registro.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const next = maxNum > 0 ? (maxNum + 1).toString() : '1';
    res.json({ next_registro: next });
  } catch (error) {
    res.status(500).json({ error: 'Error al calcular correlativo', details: error.message });
  }
};

// Crear nuevo registro de bautismo
exports.create = async (req, res) => {
  try {
    const data = req.body;

    // Verificar si el número de registro ya existe
    const existente = await prisma.bautismo.findUnique({
      where: { numero_registro: data.numero_registro.trim() }
    });

    if (existente) {
      return res.status(400).json({
        error: `El número de registro "${data.numero_registro}" ya fue utilizado. Por favor elige otro.`
      });
    }

    const nuevoBautismo = await prisma.bautismo.create({
      data: {
        numero_registro: data.numero_registro.trim(),
        nombre_persona: data.nombre_persona.trim(),
        genero: data.genero || 'M',
        fecha_nacimiento: new Date(data.fecha_nacimiento),
        lugar_nacimiento: data.lugar_nacimiento.trim(),
        padre: data.padre?.trim() || null,
        madre: data.madre?.trim() || null,
        padrinos: data.padrinos?.trim() || null,
        fecha_bautismo: new Date(data.fecha_bautismo),
        pastor_oficiante: data.pastor_oficiante.trim(),
        lugar_bautismo: data.lugar_bautismo?.trim() || 'Iglesia Cristiana Luterana El Buen Pastor, SPS',
        es_reposicion: Boolean(data.es_reposicion),
        nota_reposicion: data.nota_reposicion?.trim() || null,
        miembro_id: data.miembro_id ? parseInt(data.miembro_id, 10) : null
      }
    });

    // Si se vinculó con un miembro existente, marcarlo como bautizado en la tabla de miembros
    if (data.miembro_id) {
      try {
        await prisma.miembro.update({
          where: { id: parseInt(data.miembro_id, 10) },
          data: { bautizado: true }
        });
      } catch (err) {
        console.warn('No se pudo actualizar estado de miembro:', err.message);
      }
    }

    res.status(201).json(nuevoBautismo);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar el bautismo', details: error.message });
  }
};

// Actualizar registro existente
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;

    // Verificar si el nuevo número de registro choca con otro
    if (data.numero_registro) {
      const otro = await prisma.bautismo.findFirst({
        where: {
          numero_registro: data.numero_registro.trim(),
          NOT: { id }
        }
      });
      if (otro) {
        return res.status(400).json({
          error: `El número de registro "${data.numero_registro}" ya está en uso por otro registro.`
        });
      }
    }

    const actualizado = await prisma.bautismo.update({
      where: { id },
      data: {
        numero_registro: data.numero_registro?.trim(),
        nombre_persona: data.nombre_persona?.trim(),
        genero: data.genero || 'M',
        fecha_nacimiento: data.fecha_nacimiento ? new Date(data.fecha_nacimiento) : undefined,
        lugar_nacimiento: data.lugar_nacimiento?.trim(),
        padre: data.padre?.trim() || null,
        madre: data.madre?.trim() || null,
        padrinos: data.padrinos?.trim() || null,
        fecha_bautismo: data.fecha_bautismo ? new Date(data.fecha_bautismo) : undefined,
        pastor_oficiante: data.pastor_oficiante?.trim(),
        lugar_bautismo: data.lugar_bautismo?.trim(),
        es_reposicion: Boolean(data.es_reposicion),
        nota_reposicion: data.nota_reposicion?.trim() || null,
        miembro_id: data.miembro_id ? parseInt(data.miembro_id, 10) : null
      }
    });

    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el bautismo', details: error.message });
  }
};

// Eliminar registro
exports.delete = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.bautismo.delete({
      where: { id }
    });
    res.json({ message: 'Registro de bautismo eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el bautismo', details: error.message });
  }
};
