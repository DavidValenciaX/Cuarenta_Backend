const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth_middleware');
const {
  createSalesOrder,
  listSalesOrders,
  getSalesOrder,
  updateSalesOrder,
  deleteSalesOrder
} = require('../controllers/sales_orders_controller');
const {
  validateCreateSalesOrder,
  validateUpdateSalesOrder,
  validateSalesOrderId
} = require('../validators/sales_orders_validators');

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
 *               - items
 *             properties:
 *               customerId:
 *                 type: integer
 *                 example: 1
 *               statusId:
 *                 type: integer
 *                 description: Estado de la orden de venta
 *                 example: 1
 *               salesOrderDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2023-06-15T10:00:00Z"
 *               notes:
 *                 type: string
 *                 example: "Entrega en horario de la tarde"
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       example: 1
 *                     quantity:
 *                       type: integer
 *                       example: 5
 *     responses:
 *       201:
 *         description: Orden de venta creada exitosamente
 *       400:
 *         description: Error de validación en los datos
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Cliente o producto no encontrado
 *       500:
 *         description: Error en el servidor
 */
router.post('/', validateCreateSalesOrder, createSalesOrder);

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
router.get('/:id', validateSalesOrderId, getSalesOrder);

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
 *               - items
 *             properties:
 *               customerId:
 *                 type: integer
 *                 example: 2
 *               statusId:
 *                 type: integer
 *                 example: 2
 *               notes:
 *                 type: string
 *                 example: "Cliente solicita cambio de horario de entrega"
 *               salesOrderDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2023-06-15T10:00:00Z"
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       example: 1
 *                     quantity:
 *                       type: integer
 *                       example: 5
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
router.put('/:id', validateUpdateSalesOrder, updateSalesOrder);

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
 *       409:
 *         description: No se puede eliminar la orden de venta porque tiene devoluciones asociadas
 */
router.delete('/:id', validateSalesOrderId, deleteSalesOrder);

module.exports = router;
