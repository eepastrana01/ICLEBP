const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { verificarToken } = require('../middlewares/auth');

router.use(verificarToken); // Proteger todas las rutas de finanzas

router.get('/datos', financeController.getDatos);

// Transacciones
router.post('/transacciones', financeController.crearTransaccion);
router.put('/transacciones/:id', financeController.actualizarTransaccion);
router.delete('/transacciones/:id', financeController.eliminarTransaccion);

// Talonarios
router.post('/talonarios', financeController.crearTalonario);
router.put('/talonarios/:id', financeController.actualizarTalonario);
router.delete('/talonarios/:id', financeController.eliminarTalonario);

// Categorías
router.post('/categorias', financeController.crearCategoria);
router.put('/categorias/:id', financeController.actualizarCategoria);
router.delete('/categorias/:id', financeController.eliminarCategoria);

module.exports = router;
