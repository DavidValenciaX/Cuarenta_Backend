const express = require('express');
const router = express.Router();
const { listTransactionTypes } = require('../controllers/transaction_types_controller');

/**
 * @swagger
 * tags:
 *   name: Transaction Types
 *   description: API para gestionar los tipos de transacciones de inventario
 */

/**
 * @swagger
 * /transaction-types:
 *   get:
 *     summary: Listar todos los tipos de transacciones de inventario
 *     tags: [Transaction Types]
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
router.get('/', listTransactionTypes);

module.exports = router;
