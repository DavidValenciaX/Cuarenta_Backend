const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth_middleware');
const {
  createPurchaseOrder,
  listPurchaseOrders,
  getPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder
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
 *               - supplierId
 *               - statusId
 *               - items
 *             properties:
 *               supplierId:
 *                 type: integer
 *                 example: 3
 *               statusId:
 *                 type: integer
 *                 description: Estado de la orden de compra
 *                 example: 1
 *               purchaseOrderDate:
 *                 type: string
 *                 format: date-time
 *                 example: '2025-03-21T10:00:00Z'
 *               notes:
 *                 type: string
 *                 example: 'Pedido urgente para stock'
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                     - unitCost
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       example: 5
 *                     quantity:
 *                       type: integer
 *                       example: 10
 *                     unitCost:
 *                       type: number
 *                       format: decimal
 *                       example: 25.50
 *     responses:
 *       201:
 *         description: Orden de compra creada exitosamente
 *       400:
 *         description: Campos inválidos o faltantes
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Producto o proveedor no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', createPurchaseOrder);

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
 *       401:
 *         description: Token inválido o expirado
 */
router.get('/', listPurchaseOrders);

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
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la orden
 *     responses:
 *       200:
 *         description: Orden encontrada
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Orden no encontrada
 */
router.get('/:id', getPurchaseOrder);

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
 *               - supplierId
 *               - statusId
 *               - items
 *             properties:
 *               supplierId:
 *                 type: integer
 *                 example: 3
 *               statusId:
 *                 type: integer
 *                 example: 2
 *               notes:
 *                 type: string
 *                 example: 'Modificación de pedido por cambio de precios'
 *               purchaseOrderDate:
 *                 type: string
 *                 format: date-time
 *                 example: '2025-03-22T15:30:00Z'
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                     - unitCost
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       example: 5
 *                     quantity:
 *                       type: integer
 *                       example: 8
 *                     unitCost:
 *                       type: number
 *                       format: decimal
 *                       example: 27.00
 *     responses:
 *       200:
 *         description: Orden actualizada exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Orden no encontrada
 */
router.put('/:id', updatePurchaseOrder);

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
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la orden a eliminar
 *     responses:
 *       200:
 *         description: Orden eliminada exitosamente
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Orden no encontrada
 */
router.delete('/:id', deletePurchaseOrder);

module.exports = router;
