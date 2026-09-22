const { z } = require('zod');

const memberSchema = z.object({
    nombre: z.string({ required_error: 'El nombre es obligatorio.' })
        .min(1, 'El nombre no puede estar vacío.')
        .trim(),
    fecha_nacimiento: z.string({ required_error: 'La fecha de nacimiento es obligatoria.' })
        .min(1, 'La fecha de nacimiento no puede estar vacía.'),
    congregacion: z.string().optional().default(''),
    bautizado: z.boolean().optional().default(false),
    confirmado: z.boolean().optional().default(false)
});

const activitySchema = z.object({
    fecha: z.string({ required_error: 'La fecha es obligatoria.' })
        .min(1, 'La fecha no puede estar vacía.'),
    actividad: z.string({ required_error: 'El nombre de la actividad es obligatorio.' })
        .min(1, 'El nombre de la actividad no puede estar vacío.')
        .trim(),
    detalles: z.string().nullable().optional()
});

const activityStatusSchema = z.object({
    completado: z.boolean({ required_error: 'El estado completado es obligatorio.' })
});

module.exports = {
    memberSchema,
    activitySchema,
    activityStatusSchema
};
