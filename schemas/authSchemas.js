const { z } = require('zod');

const loginSchema = z.object({
    username: z.string({ required_error: 'El nombre de usuario es obligatorio.' })
        .min(1, 'El nombre de usuario no puede estar vacío.')
        .trim(),
    password: z.string({ required_error: 'La contraseña es obligatoria.' })
        .min(1, 'La contraseña no puede estar vacía.')
});

module.exports = {
    loginSchema
};
