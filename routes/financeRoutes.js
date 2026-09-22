const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { verificarToken } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const {
    crearTransaccionSchema,
    actualizarTransaccionSchema,
    crearTalonarioSchema,
    actualizarTalonarioSchema,
    categoriaSchema
} = require('../schemas/financeSchemas');

router.use(verificarToken); // Proteger todas las rutas de finanzas

router.get('/datos', financeController.getDatos);

// Transacciones
router.post('/transacciones', validate(crearTransaccionSchema), financeController.crearTransaccion);
router.put('/transacciones/:id', validate(actualizarTransaccionSchema), financeController.actualizarTransaccion);
router.delete('/transacciones/:id', financeController.eliminarTransaccion);

// Talonarios
router.post('/talonarios', validate(crearTalonarioSchema), financeController.crearTalonario);
router.put('/talonarios/:id', validate(actualizarTalonarioSchema), financeController.actualizarTalonario);
router.delete('/talonarios/:id', financeController.eliminarTalonario);

// Categorías
router.post('/categorias', validate(categoriaSchema), financeController.crearCategoria);
router.put('/categorias/:id', validate(categoriaSchema), financeController.actualizarCategoria);
router.delete('/categorias/:id', financeController.eliminarCategoria);

module.exports = router;
