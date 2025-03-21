// app/routes/purchase_orders_routes.js

const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth_middleware');
const {
  createOrder,
  listOrders,
  getOrder,
  deleteOrder,
  updateOrder
} = require('../controllers/purchase_orders_controller');

router.use(verificarToken);

/**
 * @swagger
 * tags:
 *   name: Purchase Orders
 *   description: Gestión de órdenes de compra
 */

/**
 * @swagger
 * /purchase-orders:
 *   post:
 *     summary: Crear una nueva orden de compra
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplier_id
 *               - items
 *             properties:
 *               supplier_id:
 *                 type: integer
 *                 example: 3
 *               purchase_order_date:
 *                 type: string
 *                 format: date-time
 *                 example: '2025-03-21T10:00:00Z'
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
 *                       example: 5
 *                     quantity:
 *                       type: integer
 *                       example: 10
 *                     unit_price:
 *                       type: number
 *                       format: decimal
 *                       example: 25.50
 *     responses:
 *       201:
 *         description: Orden de compra creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseOrder'
 *       400:
 *         description: Campos inválidos o faltantes
 *       404:
 *         description: Producto o proveedor no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', createOrder);

/**
 * @swagger
 * /purchase-orders:
 *   get:
 *     summary: Listar todas las órdenes de compra del usuario autenticado
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de órdenes de compra
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PurchaseOrder'
 *       401:
 *         description: Token inválido o expirado
 */
router.get('/', listOrders);

/**
 * @swagger
 * /purchase-orders/{id}:
 *   get:
 *     summary: Obtener una orden de compra por ID
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la orden
 *     responses:
 *       200:
 *         description: Orden encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseOrder'
 *       404:
 *         description: Orden no encontrada
 *       401:
 *         description: Token inválido o expirado
 */
router.get('/:id', getOrder);

/**
 * @swagger
 * /purchase-orders/{id}:
 *   put:
 *     summary: Actualizar orden de compra existente
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la orden a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplier_id
 *               - status_id
 *               - items
 *             properties:
 *               supplier_id:
 *                 type: integer
 *                 example: 3
 *               status_id:
 *                 type: integer
 *                 example: 2
 *               purchase_order_date:
 *                 type: string
 *                 format: date-time
 *                 example: '2025-03-22T15:30:00Z'
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
 *                       example: 5
 *                     quantity:
 *                       type: integer
 *                       example: 8
 *                     unit_price:
 *                       type: number
 *                       format: decimal
 *                       example: 27.00
 *     responses:
 *       200:
 *         description: Orden actualizada exitosamente
 *       400:
 *         description: Error de validación
 *       404:
 *         description: Orden no encontrada
 *       401:
 *         description: Token inválido o expirado
 */
router.put('/:id', updateOrder);

/**
 * @swagger
 * /purchase-orders/{id}:
 *   delete:
 *     summary: Eliminar una orden de compra
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la orden a eliminar
 *     responses:
 *       200:
 *         description: Orden eliminada exitosamente
 *       404:
 *         description: Orden no encontrada
 *       401:
 *         description: Token inválido o expirado
 */
router.delete('/:id', deleteOrder);

module.exports = router;
