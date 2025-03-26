const express = require('express');
const router = express.Router();
const { listStatusWithCategories } = require('../controllers/status_controller');

/**
 * @swagger
 * tags:
 *   name: Status
 *   description: Gestión de estados y categorías de estados
 */

/**
 * @swagger
 * /status:
 *   get:
 *     summary: Listar todas las categorías de estado con sus tipos
 *     tags: [Status]
 *     responses:
 *       200:
 *         description: Lista de categorías de estado y sus tipos asociados
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
 *                   example: Estados obtenidos exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     status_categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: sales_order
 *                           description:
 *                             type: string
 *                             example: Estados de órdenes de venta
 *                           status_types:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: integer
 *                                   example: 1
 *                                 name:
 *                                   type: string
 *                                   example: pending
 *                                 description:
 *                                   type: string
 *                                   example: Orden pendiente de confirmación
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', listStatusWithCategories);

module.exports = router;
