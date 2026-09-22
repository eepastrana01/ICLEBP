const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verificarToken } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const {
    userCreateSchema,
    userUpdateSchema,
    userProfileSchema
} = require('../schemas/userSchemas');

router.use(verificarToken); // Proteger todas las rutas de usuario

router.get('/perfil', userController.getProfile);
router.put('/perfil', validate(userProfileSchema), userController.updateProfile);

router.get('/', userController.getAll);
router.post('/', validate(userCreateSchema), userController.create);
router.put('/:id', userController.updatePassword);
router.put('/:id/editar', validate(userUpdateSchema), userController.updateUser);
router.put('/:id/estado', userController.updateStatus);
router.delete('/:id', userController.delete);

module.exports = router;
