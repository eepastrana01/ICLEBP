const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const financeRoutes = require('./financeRoutes');
const { memberRouter, activityRouter, teamRouter } = require('./otherRoutes');
const eventRoutes = require('./eventRoutes');
const baptismRoutes = require('./baptismRoutes');

router.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'API funcionando correctamente' });
});

router.use('/login', authRoutes);
router.use('/usuarios', userRoutes);
router.use('/finanzas', financeRoutes);
router.use('/miembros', memberRouter);
router.use('/actividades', activityRouter);
router.use('/equipo', teamRouter);
router.use('/eventos', eventRoutes);
router.use('/bautismos', baptismRoutes);

module.exports = router;
