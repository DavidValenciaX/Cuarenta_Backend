const express = require('express');
const router = express.Router();
const { listMeasurements } = require('../controllers/measurements_controller');

/**
 * @swagger
 * tags:
 *   name: Measurements
 *   description: Gestión de tipos de medidas y unidades de medida
 */

/**
 * @swagger
 * /measurements:
 *   get:
 *     summary: Listar todos los tipos de medidas y sus unidades
 *     tags: [Measurements]
 *     responses:
 *       200:
 *         description: Lista de tipos de medidas con sus unidades asociadas
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
 *                   example: Datos de medidas obtenidos exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     measurement_types:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: Length
 *                           description:
 *                             type: string
 *                             example: Units for measuring distances and dimensions
 *                           units_of_measure:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: integer
 *                                   example: 1
 *                                 name:
 *                                   type: string
 *                                   example: Meter
 *                                 symbol:
 *                                   type: string
 *                                   example: m
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', listMeasurements);

module.exports = router;
