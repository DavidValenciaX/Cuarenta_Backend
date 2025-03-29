const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth_middleware');
const {
  createSalesReturn,
  listSalesReturns,
  getSalesReturn,
  updateSalesReturn,
  deleteSalesReturn
} = require('../controllers/sales_returns_controller');
const { 
  createSalesReturnValidators,
  updateSalesReturnValidators,
  getSalesReturnValidator,
  deleteSalesReturnValidator
} = require('../validators/sales_return_validators');
const { validateResult } = require('../utils/validate_util');

router.use(verificarToken);

/**
 * @swagger
 * tags:
 *   name: Sales Returns
 *   description: Gestión de devoluciones de ventas
 */

/**
 * @swagger
 * /sales-returns:
 *   post:
 *     summary: Crear una nueva devolución de venta
 *     tags: [Sales Returns]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - salesOrderId
 *               - items
 *             properties:
 *               salesOrderId:
 *                 type: integer
 *                 example: 1
 *                 description: ID de la orden de venta original
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
 *                     - statusId
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       example: 1
 *                       description: ID del producto devuelto
 *                     quantity:
 *                       type: integer
 *                       example: 2
 *                       description: Cantidad devuelta
 *                     statusId:
 *                       type: integer
 *                       example: 1
 *                       description: Estado específico para este producto
 *     responses:
 *       201:
 *         description: Devolución de venta creada exitosamente
 *       400:
 *         description: Error de validación en los datos
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Orden de venta o producto no encontrado
 *       500:
 *         description: Error en el servidor
 */
router.post('/', createSalesReturnValidators, validateResult, createSalesReturn);

/**
 * @swagger
 * /sales-returns:
 *   get:
 *     summary: Listar todas las devoluciones de ventas
 *     tags: [Sales Returns]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de devoluciones de ventas
 *       401:
 *         description: Token inválido o expirado
 */
router.get('/', listSalesReturns);

/**
 * @swagger
 * /sales-returns/{id}:
 *   get:
 *     summary: Obtener una devolución de venta por ID
 *     tags: [Sales Returns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la devolución de venta
 *     responses:
 *       200:
 *         description: Devolución de venta encontrada con sus productos
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Devolución de venta no encontrada
 */
router.get('/:id', getSalesReturnValidator, validateResult, getSalesReturn);

/**
 * @swagger
 * /sales-returns/{id}:
 *   put:
 *     summary: Actualizar una devolución de venta
 *     tags: [Sales Returns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la devolución de venta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - salesOrderId
 *               - items
 *             properties:
 *               salesOrderId:
 *                 type: integer
 *                 example: 1
 *               notes:
 *                 type: string
 *                 example: "Cliente insatisfecho"
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
 *                     - statusId
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       example: 1
 *                     quantity:
 *                       type: integer
 *                       example: 3
 *                     statusId:
 *                       type: integer
 *                       example: 2
 *                       description: Estado específico para este producto
 *     responses:
 *       200:
 *         description: Devolución de venta actualizada
 *       400:
 *         description: Error de validación en los datos
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Devolución de venta no encontrada
 */
router.put('/:id', updateSalesReturnValidators, validateResult, updateSalesReturn);

/**
 * @swagger
 * /sales-returns/{id}:
 *   delete:
 *     summary: Eliminar una devolución de venta
 *     tags: [Sales Returns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la devolución de venta
 *     responses:
 *       200:
 *         description: Devolución de venta eliminada
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Devolución de venta no encontrada
 */
router.delete('/:id', deleteSalesReturnValidator, validateResult, deleteSalesReturn);

module.exports = router;
