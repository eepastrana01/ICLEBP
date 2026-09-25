const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { baptismSchema } = require('../schemas/baptismSchemas');
const baptismController = require('../controllers/baptismController');

// Todas las rutas de bautismos requieren token de autenticación
router.use(verificarToken);

router.get('/', baptismController.getAll);
router.get('/next-registro', baptismController.getNextRegistro);
router.get('/:id', baptismController.getById);
router.post('/', validate(baptismSchema), baptismController.create);
router.put('/:id', validate(baptismSchema), baptismController.update);
router.delete('/:id', baptismController.delete);

module.exports = router;
