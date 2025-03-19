const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth_middleware');
const { createProduct, listProducts, getProduct, updateProduct, deleteProduct } = require('../controllers/products_controller');

router.use(verificarToken);

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: CRUD de productos del usuario autenticado
 */

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Crear un nuevo producto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - unit_price
 *               - unit_cost
 *               - supplier_id
 *               - category_id
 *               - unit_of_measure_id
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Producto X"
 *               description:
 *                 type: string
 *                 example: "Descripción del producto X"
 *               unit_price:
 *                 type: number
 *                 example: 100.50
 *               unit_cost:
 *                 type: number
 *                 example: 80.00
 *               supplier_id:
 *                 type: integer
 *                 example: 1
 *               image_url:
 *                 type: string
 *                 example: "http://ejemplo.com/imagen.jpg"
 *               category_id:
 *                 type: integer
 *                 example: 2
 *               unit_of_measure_id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Producto creado exitosamente
 *       400:
 *         description: Error de validación (campos requeridos o numéricos)
 *       409:
 *         description: "Conflicto: nombre duplicado"
 *       401:
 *         description: Token inválido o expirado
 */
router.post('/', createProduct);

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Obtener la lista de productos del usuario autenticado
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de productos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       401:
 *         description: Token inválido o expirado
 */
router.get('/', listProducts);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Obtener un producto por su ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto
 *     responses:
 *       200:
 *         description: Producto encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Producto no encontrado
 *       401:
 *         description: Token inválido o expirado
 */
router.get('/:id', getProduct);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Actualizar un producto existente
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Producto X Actualizado"
 *               description:
 *                 type: string
 *                 example: "Nueva descripción"
 *               unit_price:
 *                 type: number
 *                 example: 110.00
 *               unit_cost:
 *                 type: number
 *                 example: 90.00
 *               supplier_id:
 *                 type: integer
 *                 example: 1
 *               image_url:
 *                 type: string
 *                 example: "http://ejemplo.com/nueva_imagen.jpg"
 *               category_id:
 *                 type: integer
 *                 example: 2
 *               unit_of_measure_id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Producto actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Error de validación
 *       404:
 *         description: Producto no encontrado
 *       409:
 *         description: "Conflicto: nombre duplicado"
 *       401:
 *         description: Token inválido o expirado
 */
router.put('/:id', updateProduct);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Eliminar un producto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto a eliminar
 *     responses:
 *       200:
 *         description: Producto eliminado exitosamente
 *       404:
 *         description: Producto no encontrado
 *       401:
 *         description: Token inválido o expirado
 */
router.delete('/:id', deleteProduct);

module.exports = router;
