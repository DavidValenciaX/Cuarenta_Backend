const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth_middleware');
const {
  createSalesOrder,
  listSalesOrders,
  getSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  addProductToOrder,
  updateOrderProduct,
  removeProductFromOrder,
  processProductReturn,
  getOrderStats
} = require('../controllers/sales_orders_controller');

router.use(verificarToken);

/**
 * @swagger
 * tags:
 *   name: Sales Orders
 *   description: Gestión de órdenes de venta y sus productos
 */

/**
 * @swagger
 * /sales-orders:
 *   post:
 *     summary: Crear una nueva orden de venta
 *     tags: [Sales Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - statusId
 *               - subtotal
 *               - totalAmount
 *               - products
 *             properties:
 *               customerId:
 *                 type: integer
 *                 example: 1
 *               statusId:
 *                 type: integer
 *                 example: 1
 *               subtotal:
 *                 type: number
 *                 example: 1000.00
 *               totalAmount:
 *                 type: number
 *                 example: 1190.00
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                     - unitPrice
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       example: 1
 *                     quantity:
 *                       type: integer
 *                       example: 5
 *                     unitPrice:
 *                       type: number
 *                       example: 200.00
 *     responses:
 *       201:
 *         description: Orden de venta creada exitosamente
 *       400:
 *         description: Error de validación en los datos
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Cliente o producto no encontrado
 */
router.post('/', createSalesOrder);

/**
 * @swagger
 * /sales-orders:
 *   get:
 *     summary: Listar todas las órdenes de venta
 *     tags: [Sales Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de órdenes de venta
 *       401:
 *         description: Token inválido o expirado
 */
router.get('/', listSalesOrders);

/**
 * @swagger
 * /sales-orders/stats:
 *   get:
 *     summary: Obtener estadísticas de órdenes por estado
 *     tags: [Sales Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas de órdenes por estado
 *       401:
 *         description: Token inválido o expirado
 */
router.get('/stats', getOrderStats);

/**
 * @swagger
 * /sales-orders/{id}:
 *   get:
 *     summary: Obtener una orden de venta por ID
 *     tags: [Sales Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la orden de venta
 *     responses:
 *       200:
 *         description: Orden de venta encontrada con sus productos
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Orden de venta no encontrada
 */
router.get('/:id', getSalesOrder);

/**
 * @swagger
 * /sales-orders/{id}:
 *   put:
 *     summary: Actualizar una orden de venta
 *     tags: [Sales Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la orden de venta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - statusId
 *               - subtotal
 *               - totalAmount
 *             properties:
 *               customerId:
 *                 type: integer
 *                 example: 2
 *               statusId:
 *                 type: integer
 *                 example: 2
 *               subtotal:
 *                 type: number
 *                 example: 1200.00
 *               totalAmount:
 *                 type: number
 *                 example: 1428.00
 *     responses:
 *       200:
 *         description: Orden de venta actualizada
 *       400:
 *         description: Error de validación en los datos
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Orden de venta no encontrada
 */
router.put('/:id', updateSalesOrder);

/**
 * @swagger
 * /sales-orders/{id}:
 *   delete:
 *     summary: Eliminar una orden de venta
 *     tags: [Sales Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la orden de venta
 *     responses:
 *       200:
 *         description: Orden de venta eliminada
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Orden de venta no encontrada
 */
router.delete('/:id', deleteSalesOrder);

/**
 * @swagger
 * /sales-orders/{id}/products:
 *   post:
 *     summary: Añadir un producto a una orden de venta
 *     tags: [Sales Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la orden de venta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *               - unitPrice
 *             properties:
 *               productId:
 *                 type: integer
 *                 example: 3
 *               quantity:
 *                 type: integer
 *                 example: 2
 *               unitPrice:
 *                 type: number
 *                 example: 150.00
 *     responses:
 *       200:
 *         description: Producto añadido a la orden
 *       400:
 *         description: Error de validación en los datos
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Orden de venta o producto no encontrado
 */
router.post('/:id/products', addProductToOrder);

/**
 * @swagger
 * /sales-orders/{id}/products/{productId}:
 *   put:
 *     summary: Actualizar un producto en una orden de venta
 *     tags: [Sales Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la orden de venta
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto en la orden
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *               - unitPrice
 *             properties:
 *               quantity:
 *                 type: integer
 *                 example: 3
 *               unitPrice:
 *                 type: number
 *                 example: 160.00
 *     responses:
 *       200:
 *         description: Producto de la orden actualizado
 *       400:
 *         description: Error de validación en los datos
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Orden de venta o producto no encontrado
 */
router.put('/:id/products/:productId', updateOrderProduct);

/**
 * @swagger
 * /sales-orders/{id}/products/{productId}:
 *   delete:
 *     summary: Eliminar un producto de una orden de venta
 *     tags: [Sales Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la orden de venta
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto a eliminar
 *     responses:
 *       200:
 *         description: Producto eliminado de la orden
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Orden de venta o producto no encontrado
 */
router.delete('/:id/products/:productId', removeProductFromOrder);

/**
 * @swagger
 * /sales-orders/{id}/products/{productId}/returns:
 *   post:
 *     summary: Procesar la devolución de un producto
 *     tags: [Sales Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la orden de venta
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto a devolver
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - returnedQuantity
 *               - returnReason
 *             properties:
 *               returnedQuantity:
 *                 type: integer
 *                 example: 1
 *               returnReason:
 *                 type: string
 *                 example: "Producto defectuoso"
 *     responses:
 *       200:
 *         description: Devolución procesada correctamente
 *       400:
 *         description: Error de validación en los datos
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Orden de venta o producto no encontrado
 */
router.post('/:id/products/:productId/returns', processProductReturn);

module.exports = router;
