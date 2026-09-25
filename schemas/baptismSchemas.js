const { z } = require('zod');

const baptismSchema = z.object({
  numero_registro: z.string().trim().min(1, 'El número de registro es requerido'),
  nombre_persona: z.string().trim().min(2, 'El nombre de la persona debe tener al menos 2 caracteres'),
  genero: z.enum(['M', 'F']).default('M'),
  fecha_nacimiento: z.string().min(1, 'La fecha de nacimiento es requerida'),
  lugar_nacimiento: z.string().trim().min(2, 'El lugar de nacimiento es requerido'),
  padre: z.string().trim().nullable().optional(),
  madre: z.string().trim().nullable().optional(),
  padrinos: z.string().trim().nullable().optional(),
  fecha_bautismo: z.string().min(1, 'La fecha del bautismo es requerida'),
  pastor_oficiante: z.string().trim().min(2, 'El nombre del pastor oficiante es requerido'),
  lugar_bautismo: z.string().trim().nullable().optional(),
  es_reposicion: z.boolean().default(false),
  nota_reposicion: z.string().trim().nullable().optional(),
  miembro_id: z.number().int().positive().nullable().optional()
});

module.exports = { baptismSchema };
