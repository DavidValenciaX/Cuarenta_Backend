const express = require('express');

const usersRoutes = require('./users_routes'); // Importar las rutas de usuarios

const router = express.Router();

// Agregar todas las rutas aquí
router.use('/users', usersRoutes); 

module.exports = router;
