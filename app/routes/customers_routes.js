const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth_middleware');
const {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer
} = require('../controllers/customers_controller');

router.use(verificarToken);

/**
 * @swagger
 * tags:
 *   name: Customers
 *   description: CRUD de clientes asociados al usuario autenticado
 */

/**
 * @swagger
 * /customers:
 *   post:
 *     summary: Crear un nuevo cliente
 *     tags: [Customers]
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
 *                 example: "Cliente ABC"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "cliente@abc.com"
 *               phone:
 *                 type: string
 *                 example: "3001234567"
 *               address:
 *                 type: string
 *                 example: "Calle 123 #45-67"
 *     responses:
 *       201:
 *         description: Cliente creado exitosamente
 *       400:
 *         description: Campos obligatorios faltantes
 *       409:
 *         description: Nombre o email ya registrado
 *       401:
 *         description: Token inválido o expirado
 */
router.post('/', createCustomer);

/**
 * @swagger
 * /customers:
 *   get:
 *     summary: Listar todos los clientes del usuario autenticado
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de clientes
 *       401:
 *         description: Token inválido o expirado
 */
router.get('/', listCustomers);

/**
 * @swagger
 * /customers/{id}:
 *   get:
 *     summary: Obtener un cliente por ID
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del cliente
 *     responses:
 *       200:
 *         description: Cliente encontrado
 *       404:
 *         description: Cliente no encontrado
 *       401:
 *         description: Token inválido o expirado
 */
router.get('/:id', getCustomer);

/**
 * @swagger
 * /customers/{id}:
 *   put:
 *     summary: Actualizar un cliente existente
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del cliente a actualizar
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
 *                 example: "Cliente ABC"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "nuevo@abc.com"
 *               phone:
 *                 type: string
 *                 example: "3009876543"
 *               address:
 *                 type: string
 *                 example: "Avenida 456 #78-90"
 *     responses:
 *       200:
 *         description: Cliente actualizado exitosamente
 *       404:
 *         description: Cliente no encontrado
 *       409:
 *         description: Nombre o email ya registrado
 *       401:
 *         description: Token inválido o expirado
 */
router.put('/:id', updateCustomer);

/**
 * @swagger
 * /customers/{id}:
 *   delete:
 *     summary: Eliminar un cliente
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del cliente a eliminar
 *     responses:
 *       200:
 *         description: Cliente eliminado exitosamente
 *       404:
 *         description: Cliente no encontrado
 *       401:
 *         description: Token inválido o expirado
 */
router.delete('/:id', deleteCustomer);

module.exports = router;
