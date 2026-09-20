const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { verificarToken } = require('../middlewares/auth');

// Todas las rutas requieren estar autenticado
router.use(verificarToken);

// Rutas de eventos / actividades
router.get('/', eventController.getEventos);
router.post('/', eventController.createEvento);
router.get('/:id', eventController.getEventoById);
router.put('/:id', eventController.updateEvento);
router.delete('/:id', eventController.deleteEvento);

// Rutas de participantes / boletos
router.get('/:eventoId/participantes', eventController.getParticipantes);
router.post('/participantes', eventController.createParticipante);
router.put('/participantes/:id', eventController.updateParticipante);
router.patch('/participantes/:id/toggle-pago', eventController.togglePago);
router.patch('/participantes/:id/toggle-entrega', eventController.toggleEntrega);
router.delete('/participantes/:id', eventController.deleteParticipante);

module.exports = router;
