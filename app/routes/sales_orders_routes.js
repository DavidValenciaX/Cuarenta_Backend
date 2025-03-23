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
 *               - customer_id
 *               - status_id
 *               - items
 *             properties:
 *               customer_id:
 *                 type: integer
 *                 example: 1
 *               status_id:
 *                 type: integer
 *                 description: Estado de la orden de venta
 *                 example: 1
 *               order_date:
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
 *                     - product_id
 *                     - quantity
 *                     - unit_price
 *                   properties:
 *                     product_id:
 *                       type: integer
 *                       example: 1
 *                     quantity:
 *                       type: integer
 *                       example: 5
 *                     unit_price:
 *                       type: number
 *                       format: decimal
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
 *       500:
 *         description: Error en el servidor
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
 *               - customer_id
 *               - status_id
 *               - items
 *             properties:
 *               customer_id:
 *                 type: integer
 *                 example: 2
 *               status_id:
 *                 type: integer
 *                 example: 2
 *               notes:
 *                 type: string
 *                 example: "Cliente solicita cambio de horario de entrega"
 *               order_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2023-06-15T10:00:00Z"
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - product_id
 *                     - quantity
 *                     - unit_price
 *                   properties:
 *                     product_id:
 *                       type: integer
 *                       example: 1
 *                     quantity:
 *                       type: integer
 *                       example: 5
 *                     unit_price:
 *                       type: number
 *                       format: decimal
 *                       example: 200.00
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

module.exports = router;
