const AINotification = require('../models/aiNotification');

class AINotificationController {
  /**
   * Create a new notification (typically called by AI systems)
   */
  static async create(req, res) {
    try {
      const { product_id, user_id, message, prediction_details } = req.body;
      
      // Basic validation
      if (!product_id || !user_id || !message) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: product_id, user_id, and message are required'
        });
      }
      
      const notification = await AINotification.create({
        product_id,
        user_id, 
        message,
        prediction_details: prediction_details || null
      });
      
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
