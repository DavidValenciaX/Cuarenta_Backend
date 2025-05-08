const express = require('express');

const usersRoutes = require('./users_routes');
const categoriesRoutes = require('./categories_routes');
const suppliersRoutes = require('./suppliers_routes');
const productsRoutes = require('./products_routes');
const customersRoutes = require('./customers_routes');
const salesOrdersRoutes = require('./sales_orders_routes');
const salesReturnsRoutes = require('./sales_returns_routes');
const purchaseOrdersRoutes = require('./purchase_orders_routes');
const purchaseReturnsRoutes = require('./purchase_returns_routes');
const statusRoutes = require('./status_routes');
const measurementsRoutes = require('./measurements_routes');
const inventoryTransactionsRoutes = require('./inventory_transactions_routes');
const aiNotificationRoutes = require('./aiNotification_routes');
const transactionTypesRoutes = require('./transaction_types_routes');

const router = express.Router();

// Agregar todas las rutas aquí
router.use('/users', usersRoutes); 
router.use('/categories',categoriesRoutes);
router.use('/suppliers', suppliersRoutes);
router.use('/products', productsRoutes);
router.use('/customers', customersRoutes);
router.use('/sales-orders', salesOrdersRoutes);
router.use('/sales-returns', salesReturnsRoutes);
router.use('/purchase-orders', purchaseOrdersRoutes);
router.use('/purchase-returns', purchaseReturnsRoutes);
router.use('/status', statusRoutes);
router.use('/measurements', measurementsRoutes);
router.use('/inventory-transactions', inventoryTransactionsRoutes);
router.use('/api', aiNotificationRoutes);
router.use('/transaction-types', transactionTypesRoutes); // Nuevo uso de ruta

module.exports = router;
