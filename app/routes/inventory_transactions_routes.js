const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth_middleware');
const {
  getProductTransactions,
  getUserTransactions,
  getConfirmedSalesByProduct,
  listTransactionTypes
} = require('../controllers/inventory_transactions_controller');

/**
 * @swagger
 * tags:
 *   name: Inventory Transactions
 *   description: Gestión del historial de movimientos de inventario
 */

/**
 * @swagger
 * /inventory-transactions/confirmed-sales:
 *   get:
 *     summary: Obtener ventas confirmadas agrupadas por producto
 *     tags: [Inventory Transactions]
 *     responses:
 *       200:
 *         description: Lista de ventas confirmadas agrupadas por producto
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       product_id:
 *                         type: integer
 *                       sales:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             date:
 *                               type: string
 *                               format: date
 *                             quantity:
 *                               type: integer
 *                       stock:
 *                         type: integer
 *       500:
 *         description: Error en el servidor
 */
router.get('/confirmed-sales', getConfirmedSalesByProduct);

/**
 * @swagger
 * /inventory-transactions/types:
 *   get:
 *     summary: Listar todos los tipos de transacciones de inventario
 *     tags: [Inventory Transactions]
 *     responses:
 *       200:
 *         description: Lista de tipos de transacciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Tipos de transacción obtenidos exitosamente
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: confirmed_purchase_order
 *                       description:
 *                         type: string
 *                         example: "Orden de compra confirmada, aumenta stock"
 *       500:
 *         description: Error interno del servidor
 */
router.get('/types', listTransactionTypes);

// Aplica el middleware solo a las rutas que requieren autenticación
router.use(verificarToken);

/**
 * @swagger
 * /inventory-transactions/product/{id}:
 *   get:
 *     summary: Obtener historial de transacciones para un producto específico
 *     tags: [Inventory Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto
 *     responses:
 *       200:
 *         description: Historial de transacciones obtenido exitosamente
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Producto no encontrado
 *       500:
 *         description: Error en el servidor
 */
router.get('/product/:id', getProductTransactions);

/**
 * @swagger
 * /inventory-transactions:
 *   get:
 *     summary: Obtener historial de todas las transacciones de inventario
 *     tags: [Inventory Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Número máximo de registros a retornar
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Número de registros a omitir para paginación
 *     responses:
 *       200:
 *         description: Historial de transacciones obtenido exitosamente
 *       401:
 *         description: Token inválido o expirado
 *       500:
 *         description: Error en el servidor
 */
router.get('/', getUserTransactions);

module.exports = router;
