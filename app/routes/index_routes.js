const express = require('express');

const usersRoutes = require('./users_routes'); // Importar las rutas de usuarios
const categoriesRoutes = require('./categories_routes');
const suppliersRoutes = require('./suppliers_routes');
const productsRoutes = require('./products_routes');
const customersRoutes = require('./customers_routes');
const salesOrdersRoutes = require('./sales_orders_routes');
const salesReturnsRoutes = require('./sales_returns_routes'); // Nueva importación
const purchaseOrdersRoutes = require('./purchase_orders_routes');
const purchaseReturnsRoutes = require('./purchase_returns_routes'); // Nueva importación
const statusRoutes = require('./status_routes');
const measurementsRoutes = require('./measurements_routes');

const router = express.Router();

// Agregar todas las rutas aquí
router.use('/users', usersRoutes); 
router.use('/categories',categoriesRoutes);
router.use('/suppliers', suppliersRoutes);
router.use('/products', productsRoutes);
router.use('/customers', customersRoutes);
router.use('/sales-orders', salesOrdersRoutes);
router.use('/sales-returns', salesReturnsRoutes); // Nueva ruta
router.use('/purchase-orders', purchaseOrdersRoutes);
router.use('/purchase-returns', purchaseReturnsRoutes); // Nueva ruta
router.use('/status', statusRoutes);
router.use('/measurements', measurementsRoutes);

module.exports = router;
