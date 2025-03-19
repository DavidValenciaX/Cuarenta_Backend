const express = require('express');

const usersRoutes = require('./users_routes'); // Importar las rutas de usuarios
const categoriesRoutes = require('./categories_routes');


const router = express.Router();

// Agregar todas las rutas aquí
router.use('/users', usersRoutes); 
router.use('/categories',categoriesRoutes);

module.exports = router;
