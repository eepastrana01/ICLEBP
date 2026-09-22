const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const {
    memberSchema,
    activitySchema,
    activityStatusSchema
} = require('../schemas/otherSchemas');

const memberController = require('../controllers/memberController');
const activityController = require('../controllers/activityController');
const teamController = require('../controllers/teamController');

// Miembros
const memberRouter = express.Router();
memberRouter.use(verificarToken);
memberRouter.get('/', memberController.getAll);
memberRouter.post('/', validate(memberSchema), memberController.create);
memberRouter.put('/:id', validate(memberSchema), memberController.update);
memberRouter.delete('/:id', memberController.delete);

// Actividades
const activityRouter = express.Router();
activityRouter.use(verificarToken);
activityRouter.get('/', activityController.getAll);
activityRouter.post('/', validate(activitySchema), activityController.create);
activityRouter.put('/:id', validate(activityStatusSchema), activityController.updateStatus);
activityRouter.put('/editar/:id', validate(activitySchema), activityController.update);
activityRouter.delete('/:id', activityController.delete);

// Equipo Pastoral
const teamRouter = express.Router();
teamRouter.get('/', teamController.getAll); // Ruta pública o genérica original
teamRouter.put('/:id', verificarToken, teamController.update);

module.exports = { memberRouter, activityRouter, teamRouter };
