require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importar rutas base
const apiRoutes = require('./routes');

const app = express();
const port = process.env.PORT || 3000;

// Middleware Global
app.use(cors());
app.use(express.json());

// Montaje de rutas de la API REST (admite tanto /api como raíz para Vercel)
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error no capturado:', err);
    res.status(500).json({ error: 'Error interno del servidor', details: err.message });
});

// Arrancar el servidor solo si se ejecuta directamente
if (require.main === module || !process.env.VERCEL) {
    app.listen(port, () => { 
        console.log(`🚀 API REST iniciada en http://localhost:${port}`); 
    });
}

module.exports = app;