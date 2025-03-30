const express = require('express');
const router = express.Router();
const AINotificationController = require('../controllers/aiNotificationController');
const { verificarToken } = require('../middlewares/auth_middleware');

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     summary: Create a new AI notification (typically called by AI systems)
 *     tags: [AI Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product_id
 *               - user_id
 *               - message
 *             properties:
 *               product_id:
 *                 type: integer
 *               user_id:
 *                 type: integer
 *               message:
 *                 type: string
 *               prediction_details:
 *                 type: object
 *     responses:
 *       201:
 *         description: Notification created
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post('/notifications', AINotificationController.create);

// Apply authentication middleware to all remaining routes
// This only affects routes defined AFTER this line
router.use(verificarToken);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get all notifications for the authenticated user
 *     tags: [AI Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/notifications', AINotificationController.getAll);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [AI Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
router.patch('/notifications/:id/read', AINotificationController.markAsRead);

/**
 * @swagger
 * /api/notifications/{id}/dismiss:
 *   patch:
 *     summary: Dismiss a notification
 *     tags: [AI Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification dismissed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
router.patch('/notifications/:id/dismiss', AINotificationController.dismiss);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [AI Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
router.delete('/notifications/:id', AINotificationController.delete);

module.exports = router;