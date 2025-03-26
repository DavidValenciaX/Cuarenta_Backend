const express = require('express');
const router = express.Router();
const { createUser,confirmEmail,loginUser,logoutUser,forgotPassword,resetPassword,getUserProfile } = require('../controllers/users_controller');
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

/**
 * @swagger
 * /users/confirm-email:
 *   post:
 *     summary: Confirm user email
 *     description: Confirms the user's email address by providing a token
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: 'H6s93'
 *     responses:
 *       200:
 *         description: Email successfully confirmed or token resent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: 'success'
 *                 message:
 *                   type: string
 *                   example: 'Correo confirmado exitosamente'
 *                 data:
 *                   type: object
 *                   example: { \"newToken\": \"abcd123...\", \"newExpiration\": \"2025-03-21T12:00:00-05:00\" }
 *       400:
 *         description: Missing token
 *       404:
 *         description: Invalid token or user not found
 *       500:
 *         description: Server error
 */
router.post('/confirm-email', confirmEmail);

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Log in a user
 *     description: Logs in a user with email and password, returning a JWT token
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'juan@correo.com'
 *               password:
 *                 type: string
 *                 example: 'MyNewPassword123'
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: 'success'
 *                 message:
 *                   type: string
 *                   example: 'Inicio de sesión exitoso'
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: 'eyJhbGciOiJIU...'
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/login', loginUser);

/**
 * @swagger
 * /users/logout:
 *   post:
 *     summary: Log out a user
 *     description: Invalidates the JWT token so it can no longer be used
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []  # Si usas bearerAuth en swagger
 *     responses:
 *       200:
 *         description: User successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: 'success'
 *                 message:
 *                   type: string
 *                   example: 'Logged out successfully'
 *       401:
 *         description: Invalid or expired token
 *       500:
 *         description: Server error
 */
router.post('/logout', logoutUser);

/**
 * @swagger
 * /users/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Generates a password reset token and expiration, storing them in the user record
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'juan@correo.com'
 *     responses:
 *       200:
 *         description: Password reset token generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: 'success'
 *                 message:
 *                   type: string
 *                   example: 'Password reset token generated'
 *                 data:
 *                   type: object
 *                   properties:
 *                     resetTokenHash:
 *                       type: string
 *                       example: 'abcdef123456...'
 *                     resetTokenExpiration:
 *                       type: string
 *                       example: '2025-03-21T12:00:00-05:00'
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/forgot-password', forgotPassword);

/**
 * @swagger
 * /users/reset-password:
 *   post:
 *     summary: Reset password
 *     description: Verifies token and updates the user password
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *               - confirmNewPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: 'abcdef123456...'
 *               newPassword:
 *                 type: string
 *                 example: 'MyNewPassword123'
 *               confirmNewPassword:
 *                 type: string
 *                 example: 'MyNewPassword123'
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Missing or invalid body fields, or token expired
 *       404:
 *         description: Invalid token
 *       500:
 *         description: Server error
 */
router.post('/reset-password', resetPassword);

router.get('/perfil', verificarToken, (req, res) => {
    res.json({ mensaje: 'Bienvenido, usuario autenticado', usuario: req.usuario });
  });
  
/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Obtener información del perfil de usuario
 *     description: Obtiene la información del perfil del usuario autenticado
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil de usuario obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: 'success'
 *                 message:
 *                   type: string
 *                   example: 'Perfil de usuario obtenido con éxito'
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     full_name:
 *                       type: string
 *                       example: 'Juan Pérez'
 *                     company_name:
 *                       type: string
 *                       example: 'Empresa XYZ'
 *                     email:
 *                       type: string
 *                       example: 'juan@correo.com'
 *                     phone:
 *                       type: string
 *                       example: '3156789123'
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: '2025-03-21T10:30:00-05:00'
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                       example: '2025-03-21T10:30:00-05:00'
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/profile', verificarToken, getUserProfile);

module.exports = router;
