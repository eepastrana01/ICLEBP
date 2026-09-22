const { z } = require('zod');

const userCreateSchema = z.object({
    username: z.string({ required_error: 'El nombre de usuario es obligatorio.' })
        .min(3, 'El nombre de usuario debe tener al menos 3 caracteres.')
        .trim(),
    password: z.string({ required_error: 'La contraseña es obligatoria.' })
        .min(4, 'La contraseña debe tener al menos 4 caracteres.'),
    rol: z.enum(['admin', 'usuario']).optional().default('usuario'),
    nombre_completo: z.string().nullable().optional(),
    permisos: z.record(z.any()).optional().default({})
});

const userUpdateSchema = z.object({
    username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres.').trim().optional(),
    nombre_completo: z.string().nullable().optional(),
    rol: z.enum(['admin', 'usuario']).optional(),
    permisos: z.record(z.any()).optional(),
    password: z.string().optional(),
    activo: z.boolean().optional()
});

const userProfileSchema = z.object({
    password: z.string().optional(),
    correo: z.string().nullable().optional(),
    telefono: z.string().nullable().optional(),
    direccion: z.string().nullable().optional()
});

module.exports = {
    userCreateSchema,
    userUpdateSchema,
    userProfileSchema
};
