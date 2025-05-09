const AINotification = require('../models/ai_notification_model');
const User = require('../models/users_model'); // Importar el modelo de usuario
const Product = require('../models/products_model'); // Importar el modelo de producto
const { sendEmail } = require('../utils/email_util'); // Importar utilidad de email

class AINotificationController {
  /**
   * Create a new notification (typically called by AI systems)
   */
  static async create(req, res) {
    try {
      const { product_id, shortage_date, message, forecast, replenishment_plan } = req.body;

      // Validación básica
      if (!product_id || !message || !forecast) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: product_id, message, and forecast are required'
        });
      }

      // Validar que forecast sea un array
      if (!Array.isArray(forecast)) {
        return res.status(400).json({
          success: false,
          message: 'Forecast must be an array'
        });
      }

      // Buscar user_id a partir del product_id
      const user = await User.findUserByProductId(product_id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found for the given product_id'
        });
      }

      // prediction_details contendrá shortage_date, forecast (array) y replenishment_plan (string o null)
      const prediction_details = {
        shortage_date: shortage_date || null,
        forecast,
        replenishment_plan: replenishment_plan || null
      };

      const notification = await AINotification.create({
        product_id,
        user_id: user.id,
        message,
        prediction_details
      });

      // Enviar correo al usuario solo si hay plan de reabastecimiento
      try {
        if (
          replenishment_plan && typeof replenishment_plan === 'string' && replenishment_plan.trim() !== '' &&
          user.email && typeof user.email === 'string' && user.email.trim() !== ''
        ) {
          // Buscar el nombre del producto
          const product = await Product.findById(product_id, user.id);
          const productName = product ? product.name : 'desconocido';

          await sendEmail(
            user.email,
            'Alerta de escasez de inventario IA',
            `<p>Hola ${user.full_name || ''},</p>
            <p>El producto <strong>${productName}</strong> escaseará pronto:</p>
            <p><strong>${message}</strong></p>
            <p><strong>Plan de reabastecimiento:</strong> ${replenishment_plan}</p>
            <p>Por favor revisa tu panel para más detalles.</p>`
          );
        } else if (!replenishment_plan || replenishment_plan.trim() === '') {
          // No enviar correo si no hay plan de reabastecimiento
        } else {
          console.error('No se puede enviar email: user.email es inválido:', user.email);
        }
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
        // No interrumpe el flujo principal
      }

      return res.status(201).json({
        success: true,
        data: notification,
        message: 'Notification created successfully'
      });
    } catch (error) {
      console.error('Error in create notification controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create notification',
        error: error.message
      });
    }
  }

  /**
   * Get all notifications for the authenticated user
   */
  static async getAll(req, res) {
    try {
      const userId = req.user.id; // Assuming auth middleware adds user to request
      
      const notifications = await AINotification.getByUserId(userId);
      
      return res.status(200).json({
        success: true,
        data: notifications,
        message: 'Notifications retrieved successfully'
      });
    } catch (error) {
      console.error('Error in get notifications controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve notifications',
        error: error.message
      });
    }
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id; // From auth middleware
      
      const notification = await AINotification.markAsRead(id, userId);
      
      return res.status(200).json({
        success: true,
        data: notification,
        message: 'Notification marked as read'
      });
    } catch (error) {
      console.error('Error in mark notification as read controller:', error);
      
      if (error.message === 'Notification not found or unauthorized') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to update notification',
        error: error.message
      });
    }
  }

  /**
   * Dismiss a notification
   */
  static async dismiss(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id; // From auth middleware
      
      const notification = await AINotification.dismiss(id, userId);
      
      return res.status(200).json({
        success: true,
        data: notification,
        message: 'Notification dismissed'
      });
    } catch (error) {
      console.error('Error in dismiss notification controller:', error);
      
      if (error.message === 'Notification not found or unauthorized') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to dismiss notification',
        error: error.message
      });
    }
  }

  /**
   * Delete a notification
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id; // From auth middleware
      
      await AINotification.delete(id, userId);
      
      return res.status(200).json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      console.error('Error in delete notification controller:', error);
      
      if (error.message === 'Notification not found or unauthorized') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to delete notification',
        error: error.message
      });
    }
  }
}

module.exports = AINotificationController;
