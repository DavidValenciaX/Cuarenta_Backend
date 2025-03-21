const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth_middleware');
const {
  createSupplier,
  listSuppliers,
  getSupplier,
  updateSupplier,
  deleteSupplier
} = require('../controllers/suppliers_controller');

router.use(verificarToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     Supplier:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID del proveedor
 *         name:
 *           type: string
 *           description: Nombre del proveedor
 *         email:
 *           type: string
 *           format: email
 *           description: Correo electrónico del proveedor
 *         phone:
 *           type: string
 *           description: Número telefónico del proveedor
 *         address:
 *           type: string
 *           description: Dirección del proveedor
 *         notes:
 *           type: string
 *           description: Notas adicionales
 *         user_id:
 *           type: integer
 *           description: ID del usuario propietario
 */

/**
 * @swagger
 * tags:
 *   name: Suppliers
 *   description: CRUD de proveedores asociados al usuario autenticado
 */

/**
 * @swagger
 * /suppliers:
 *   post:
 *     summary: Crear un nuevo proveedor
 *     tags: [Suppliers]
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
 *               - email
 *               - phone
 *               - address
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Proveedor ABC"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "contacto@abc.com"
 *               phone:
 *                 type: string
 *                 example: "3001234567"
 *               address:
 *                 type: string
 *                 example: "Calle 123 #45-67"
 *               notes:
 *                 type: string
 *                 example: "Notas adicionales"
 *     responses:
 *       201:
 *         description: Proveedor creado exitosamente
 *       400:
 *         description: Campos obligatorios faltantes
 *       409:
 *         description: Nombre o email ya registrado
 *       401:
 *         description: Token inválido o expirado
 */
router.post('/', createSupplier);

/**
 * @swagger
 * /suppliers:
 *   get:
 *     summary: Listar todos los proveedores del usuario autenticado
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de proveedores
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Supplier'
 *       401:
 *         description: Token inválido o expirado
 */
router.get('/', listSuppliers);

/**
 * @swagger
 * /suppliers/{id}:
 *   get:
 *     summary: Obtener un proveedor por ID
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del proveedor
 *     responses:
 *       200:
 *         description: Proveedor encontrado
 *       404:
 *         description: Proveedor no encontrado
 *       401:
 *         description: Token inválido o expirado
 */
router.get('/:id', getSupplier);

/**
 * @swagger
 * /suppliers/{id}:
 *   put:
 *     summary: Actualizar un proveedor existente
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del proveedor a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Proveedor actualizado exitosamente
 *       404:
 *         description: Proveedor no encontrado
 *       409:
 *         description: Nombre o email ya registrado
 *       401:
 *         description: Token inválido o expirado
 */
router.put('/:id', updateSupplier);

/**
 * @swagger
 * /suppliers/{id}:
 *   delete:
 *     summary: Eliminar un proveedor
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del proveedor a eliminar
 *     responses:
 *       200:
 *         description: Proveedor eliminado exitosamente
 *       404:
 *         description: Proveedor no encontrado
 *       401:
 *         description: Token inválido o expirado
 */
router.delete('/:id', deleteSupplier);

module.exports = router;
