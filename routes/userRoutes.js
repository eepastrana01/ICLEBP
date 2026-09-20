const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verificarToken } = require('../middlewares/auth');

router.use(verificarToken); // Proteger todas las rutas de usuario

router.get('/perfil', userController.getProfile);
router.put('/perfil', userController.updateProfile);

router.get('/', userController.getAll);
router.post('/', userController.create);
router.put('/:id', userController.updatePassword);
router.put('/:id/editar', userController.updateUser);
router.put('/:id/estado', userController.updateStatus);
router.delete('/:id', userController.delete);

module.exports = router;
