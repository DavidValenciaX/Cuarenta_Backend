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
 * components:
 *   schemas:
 *     SalesOrder:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID de la orden de venta
 *         customerId:
 *           type: integer
 *           description: ID del cliente
 *         statusId:
 *           type: integer
 *           description: Estado de la orden
 *         subtotal:
 *           type: number
 *           format: decimal
 *           description: Subtotal de la orden
 *         totalAmount:
 *           type: number
 *           format: decimal
 *           description: Monto total de la orden
 *         notes:
 *           type: string
 *           description: Notas adicionales
 *         order_date:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de la orden
 *         products:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               productId:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *               unitPrice:
 *                 type: number
 *                 format: decimal
 */

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
 *               notes:
 *                 type: string
 *                 example: "Entrega en horario de la tarde"
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
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SalesOrder'
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SalesOrder'
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
