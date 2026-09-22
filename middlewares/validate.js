const { z } = require('zod');

/**
 * Middleware para validar el body de la petición HTTP con un esquema de Zod.
 * En caso de error, responde con 400 y un mensaje legible y array de detalles.
 * @param {z.ZodSchema} schema - Esquema de validación Zod
 * @param {'body'|'query'|'params'} source - Origen de los datos (por defecto 'body')
 */
const validate = (schema, source = 'body') => (req, res, next) => {
    try {
        const parsed = schema.parse(req[source]);
        req[source] = parsed;
        next();
    } catch (err) {
        if (err instanceof z.ZodError) {
            const issues = err.issues || err.errors || [];
            const formattedErrors = issues.map(e => ({
                field: e.path ? e.path.join('.') : '',
                message: e.message
            }));
            return res.status(400).json({
                error: formattedErrors[0]?.message || 'Datos de solicitud inválidos',
                details: formattedErrors
            });
        }
        return res.status(500).json({ error: 'Error interno en la validación de datos' });
    }
};

module.exports = { validate };
