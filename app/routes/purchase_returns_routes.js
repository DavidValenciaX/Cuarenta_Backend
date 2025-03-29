const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth_middleware');
const {
  createPurchaseReturn,
  listPurchaseReturns,
  getPurchaseReturn,
  updatePurchaseReturn,
  deletePurchaseReturn
} = require('../controllers/purchase_returns_controller');

router.use(verificarToken);

/**
 * @swagger
 * tags:
 *   name: Purchase Returns
 *   description: Gestión de devoluciones de compras
 */

/**
 * @swagger
 * /purchase-returns:
 *   post:
 *     summary: Crear una nueva devolución de compra
 *     tags: [Purchase Returns]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - purchaseOrderId
 *               - items
 *             properties:
 *               purchaseOrderId:
 *                 type: integer
 *                 example: 1
 *                 description: ID de la orden de compra original
 *               returnDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2023-06-15T10:00:00Z"
 *                 description: Fecha de la devolución (opcional)
 *               notes:
 *                 type: string
 *                 example: "Productos defectuosos"
 *                 description: Notas generales de la devolución
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
 *                       description: ID del producto devuelto
 *                     quantity:
 *                       type: integer
 *                       example: 2
 *                       description: Cantidad devuelta
 *     responses:
 *       201:
 *         description: Devolución de compra creada exitosamente
 *       400:
 *         description: Error de validación en los datos
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Orden de compra o producto no encontrado
 *       500:
 *         description: Error en el servidor
 */
router.post('/', createPurchaseReturn);

/**
 * @swagger
 * /purchase-returns:
 *   get:
 *     summary: Listar todas las devoluciones de compras
 *     tags: [Purchase Returns]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de devoluciones de compras
 *       401:
 *         description: Token inválido o expirado
 */
router.get('/', listPurchaseReturns);

/**
 * @swagger
 * /purchase-returns/{id}:
 *   get:
 *     summary: Obtener una devolución de compra por ID
 *     tags: [Purchase Returns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la devolución de compra
 *     responses:
 *       200:
 *         description: Devolución de compra encontrada con sus productos
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Devolución de compra no encontrada
 */
router.get('/:id', getPurchaseReturn);

/**
 * @swagger
 * /purchase-returns/{id}:
 *   put:
 *     summary: Actualizar una devolución de compra
 *     tags: [Purchase Returns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la devolución de compra
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - purchaseOrderId
 *               - items
 *             properties:
 *               purchaseOrderId:
 *                 type: integer
 *                 example: 1
 *               notes:
 *                 type: string
 *                 example: "Productos en mal estado"
 *               returnDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2023-06-15T14:30:00Z"
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
 *                       example: 3
 *     responses:
 *       200:
 *         description: Devolución de compra actualizada
 *       400:
 *         description: Error de validación en los datos
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Devolución de compra no encontrada
 */
router.put('/:id', updatePurchaseReturn);

/**
 * @swagger
 * /purchase-returns/{id}:
 *   delete:
 *     summary: Eliminar una devolución de compra
 *     tags: [Purchase Returns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la devolución de compra
 *     responses:
 *       200:
 *         description: Devolución de compra eliminada
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Devolución de compra no encontrada
 */
router.delete('/:id', deletePurchaseReturn);

module.exports = router;
