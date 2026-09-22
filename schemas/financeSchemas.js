const { z } = require('zod');

const crearTransaccionSchema = z.object({
    fecha: z.string({ required_error: 'La fecha es obligatoria.' })
        .min(1, 'La fecha no puede estar vacía.'),
    tipo: z.enum(['ingreso', 'egreso'], {
        errorMap: () => ({ message: 'El tipo debe ser "ingreso" o "egreso".' })
    }),
    categoria: z.string({ required_error: 'La categoría es obligatoria.' })
        .min(1, 'La categoría no puede estar vacía.')
        .trim(),
    descripcion: z.string().nullable().optional(),
    monto: z.coerce.number({ required_error: 'El monto es obligatorio.' })
        .positive('El monto debe ser un valor numérico positivo mayor a 0.'),
    recibo_no: z.string().nullable().optional(),
    asistentes: z.coerce.number().int().min(0).optional().default(0),
    comulgantes: z.coerce.number().int().min(0).optional().default(0),
    recibido_por: z.string().nullable().optional()
});

const actualizarTransaccionSchema = z.object({
    fecha: z.string().min(1).optional(),
    categoria: z.string().min(1).trim().optional(),
    descripcion: z.string().nullable().optional(),
    monto: z.coerce.number().positive('El monto debe ser mayor a 0.').optional(),
    recibo_no: z.string().nullable().optional(),
    asistentes: z.coerce.number().int().min(0).optional(),
    comulgantes: z.coerce.number().int().min(0).optional(),
    recibido_por: z.string().nullable().optional()
});

const crearTalonarioSchema = z.object({
    nombre: z.string({ required_error: 'El nombre del talonario es obligatorio.' })
        .min(1, 'El nombre no puede estar vacío.')
        .trim(),
    inicio: z.coerce.number({ required_error: 'El número inicial es obligatorio.' })
        .int('El número inicial debe ser entero')
        .min(1, 'El número inicial debe ser mayor a 0'),
    fin: z.coerce.number({ required_error: 'El número final es obligatorio.' })
        .int('El número final debe ser entero')
        .min(1, 'El número final debe ser mayor a 0'),
    actual: z.coerce.number().int().min(1).optional(),
    tipo: z.enum(['ingreso', 'egreso']).optional().default('ingreso')
});

const actualizarTalonarioSchema = z.object({
    nombre: z.string().min(1).trim().optional(),
    inicio: z.coerce.number().int().min(1).optional(),
    fin: z.coerce.number().int().min(1).optional(),
    actual: z.coerce.number().int().min(1).optional(),
    activo: z.boolean().optional(),
    tipo: z.enum(['ingreso', 'egreso']).optional()
});

const categoriaSchema = z.object({
    nombre: z.string({ required_error: 'El nombre de la categoría es obligatorio.' })
        .min(1, 'El nombre de la categoría no puede estar vacío.')
        .trim()
});

module.exports = {
    crearTransaccionSchema,
    actualizarTransaccionSchema,
    crearTalonarioSchema,
    actualizarTalonarioSchema,
    categoriaSchema
};
