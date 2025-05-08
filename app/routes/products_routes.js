const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth_middleware');
const { createProduct, listProducts, getProduct, updateProduct, deleteProduct, updateProductStock, findProduct } = require('../controllers/products_controller');
const { validateCreate, validateUpdate, validateId, validateStockUpdate, validateFindQuery } = require('../validators/product_validators');
const { validateResult } = require('../utils/validate_util');
const upload = require('../middlewares/upload_middleware');

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
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - unitPrice
 *               - unitCost
 *               - categoryId
 *               - unitOfMeasureId
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Producto X"
 *               description:
 *                 type: string
 *                 example: "Descripción del producto X"
 *               unitPrice:
 *                 type: number
 *                 example: 100.50
 *               unitCost:
 *                 type: number
 *                 example: 80.00
 *               image:
 *                 type: string
 *                 format: binary
 *               categoryId:
 *                 type: integer
 *                 example: 2
 *               unitOfMeasureId:
 *                 type: integer
 *                 example: 1
 *               quantity:
 *                 type: number
 *                 example: 50
 *               barcode:
 *                 type: string
 *                 example: "1234567890123"
 *     responses:
 *       201:
 *         description: Producto creado exitosamente
 *       400:
 *         description: Error de validación (campos requeridos o numéricos)
 *       409:
 *         description: "Conflicto: nombre o código de barras duplicado"
 *       401:
 *         description: Token inválido o expirado
 */
router.post('/', upload.single('image'), validateCreate, validateResult, createProduct);

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
 *       401:
 *         description: Token inválido o expirado
 */
router.get('/', listProducts);

/**
 * @swagger
 * /products/find:
 *   get:
 *     summary: Buscar un producto por nombre o código de barras
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: "Nombre o código de barras del producto a buscar"
 *         example: "Producto X"
 *     responses:
 *       200:
 *         description: Resultado de la búsqueda
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     found:
 *                       type: boolean
 *                       example: true
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "Producto X"
 *                     quantity:
 *                       type: number
 *                       example: 50
 *                 - type: object
 *                   properties:
 *                     found:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: Error de validación (término de búsqueda requerido)
 *       401:
 *         description: Token inválido o expirado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/find', validateFindQuery, validateResult, findProduct);

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
 *       404:
 *         description: Producto no encontrado
 *       401:
 *         description: Token inválido o expirado
 */
router.get('/:id', validateId, validateResult, getProduct);

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
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Producto X Actualizado"
 *               description:
 *                 type: string
 *                 example: "Nueva descripción"
 *               unitPrice:
 *                 type: number
 *                 example: 110.00
 *               unitCost:
 *                 type: number
 *                 example: 90.00
 *               image:
 *                 type: string
 *                 example: "C:/path/to/new_image.jpg"
 *                 format: binary
 *               categoryId:
 *                 type: integer
 *                 example: 2
 *               unitOfMeasureId:
 *                 type: integer
 *                 example: 1
 *               quantity:
 *                 type: number
 *                 example: 60
 *               barcode:
 *                 type: string
 *                 example: "1234567890123"
 *     responses:
 *       200:
 *         description: Producto actualizado exitosamente
 *       400:
 *         description: Error de validación
 *       404:
 *         description: Producto no encontrado
 *       409:
 *         description: "Conflicto: nombre o código de barras duplicado"
 *       401:
 *         description: Token inválido o expirado
 */
router.put('/:id', upload.single('image'), validateUpdate, validateResult, updateProduct);

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
router.delete('/:id', validateId, validateResult, deleteProduct);

/**
 * @swagger
 * /products/{id}/stock:
 *   patch:
 *     summary: Actualizar el stock de un producto
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: number
 *                 example: 100
 *     responses:
 *       200:
 *         description: Stock actualizado exitosamente
 *       400:
 *         description: Error de validación
 *       404:
 *         description: Producto no encontrado
 *       401:
 *         description: Token inválido o expirado
 */
router.patch('/:id/stock', validateId, validateStockUpdate, validateResult, updateProductStock);

module.exports = router;
