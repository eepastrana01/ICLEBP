const { z } = require('zod');

const createEventoSchema = z.object({
    nombre: z.string({ required_error: 'El nombre de la actividad o rifa es obligatorio.' })
        .min(1, 'El nombre de la actividad o rifa no puede estar vacío.')
        .trim(),
    descripcion: z.string().nullable().optional(),
    tipo: z.string().optional().default('rifa'),
    precio_boleto: z.coerce.number().min(0, 'El precio del boleto no puede ser negativo').optional().default(0),
    fecha_evento: z.string().nullable().optional(),
    meta_recaudacion: z.coerce.number().min(0, 'La meta de recaudación no puede ser negativa').nullable().optional()
});

const updateEventoSchema = z.object({
    nombre: z.string().min(1, 'El nombre no puede estar vacío.').trim().optional(),
    descripcion: z.string().nullable().optional(),
    tipo: z.string().optional(),
    precio_boleto: z.coerce.number().min(0, 'El precio del boleto no puede ser negativo').optional(),
    fecha_evento: z.string().nullable().optional(),
    meta_recaudacion: z.coerce.number().min(0, 'La meta de recaudación no puede ser negativa').nullable().optional(),
    activo: z.boolean().optional()
});

const createParticipanteSchema = z.object({
    evento_id: z.coerce.number({ required_error: 'El ID del evento es obligatorio.' })
        .int('El ID del evento debe ser un número entero')
        .positive('El ID del evento debe ser válido'),
    nombre_persona: z.string({ required_error: 'El nombre de la persona es obligatorio.' })
        .min(1, 'El nombre de la persona no puede estar vacío.')
        .trim(),
    telefono: z.string().nullable().optional(),
    cantidad_boletos: z.coerce.number().int().min(1, 'Debe asignar al menos 1 boleto').optional().default(1),
    numeros_boletos: z.string().nullable().optional(),
    monto_total: z.coerce.number().min(0).nullable().optional(),
    pagado: z.boolean().optional().default(false),
    entregado: z.boolean().optional().default(false),
    notas: z.string().nullable().optional()
});

const updateParticipanteSchema = z.object({
    nombre_persona: z.string().min(1, 'El nombre no puede estar vacío.').trim().optional(),
    telefono: z.string().nullable().optional(),
    cantidad_boletos: z.coerce.number().int().min(1, 'Debe asignar al menos 1 boleto').optional(),
    numeros_boletos: z.string().nullable().optional(),
    monto_total: z.coerce.number().min(0).nullable().optional(),
    pagado: z.boolean().optional(),
    entregado: z.boolean().optional(),
    notas: z.string().nullable().optional()
});

module.exports = {
    createEventoSchema,
    updateEventoSchema,
    createParticipanteSchema,
    updateParticipanteSchema
};
