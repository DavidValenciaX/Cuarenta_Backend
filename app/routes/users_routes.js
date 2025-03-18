const express = require('express');
const router = express.Router();
const { createUser } = require('../controllers/users_controller');
const { verificarToken } = require('../middlewares/auth_middleware'); // Importar middleware

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Crear usuario
 *     description: Registra un usuario en el sistema
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - companyName
 *               - password
 *               - confirmPassword
 *               - email
 *               - phone
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: 'Juan Pérez'
 *               companyName:
 *                 type: string
 *                 example: 'Empresa XYZ'
 *               password:
 *                 type: string
 *                 example: 'SuperSecreto123'
 *               confirmPassword:
 *                 type: string
 *                 example: 'SuperSecreto123'
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'juan@correo.com'
 *               phone:
 *                 type: string
 *                 example: '3156789123'
 *     responses:
 *       201:
 *         description: Usuario creado con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Usuario creado exitosamente'
 *                 userId:
 *                   type: number
 *                   example: 1
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 'Las contraseñas no coinciden'
 */
router.post('/register', createUser);

router.get('/perfil', verificarToken, (req, res) => {
    res.json({ mensaje: 'Bienvenido, usuario autenticado', usuario: req.usuario });
  });
  

module.exports = router;
