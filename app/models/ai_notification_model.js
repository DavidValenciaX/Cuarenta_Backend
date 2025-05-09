const pool = require('../config/data_base');

/**
 * Class representing AI inventory notifications
 */
class AINotification {
  /**
   * Create a new notification
   * @param {Object} notification Notification data
   * @param {number} notification.product_id Product ID
   * @param {number} notification.user_id User ID
   * @param {string} notification.message Message content
   * @param {Object} notification.prediction_details Details of the AI prediction
   * @returns {Promise<Object>} Created notification
   */
  static async create({ product_id, user_id, message, prediction_details }) {
    try {
      // Get the "new" status ID from the status_types table
      const statusQuery = await pool.query(
        `SELECT id FROM status_types WHERE name = 'new' AND 
         category_id = (SELECT id FROM status_categories WHERE name = 'ai_notification')`
      );
      
      const status_id = statusQuery.rows[0].id;
      
      const result = await pool.query(
        `INSERT INTO ai_inventory_notifications 
         (product_id, user_id, message, status_id, prediction_details) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [product_id, user_id, message, status_id, prediction_details]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating AI notification:', error);
      throw error;
    }
  }

  /**
   * Get all notifications for a specific user
   * @param {number} userId User ID
   * @returns {Promise<Array>} List of notifications
   */
  static async getByUserId(userId) {
    try {
      const result = await pool.query(
        `SELECT n.*, p.name as product_name, s.name as status 
         FROM ai_inventory_notifications n
         JOIN products p ON n.product_id = p.id
         JOIN status_types s ON n.status_id = s.id
         WHERE n.user_id = $1
         ORDER BY n.created_at DESC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching AI notifications:', error);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   * @param {number} id Notification ID
   * @param {number} userId User ID (for security)
   * @returns {Promise<Object>} Updated notification
   */
  static async markAsRead(id, userId) {
    try {
      const statusQuery = await pool.query(
        `SELECT id FROM status_types WHERE name = 'read' AND 
         category_id = (SELECT id FROM status_categories WHERE name = 'ai_notification')`
      );
      
      const status_id = statusQuery.rows[0].id;

      const result = await pool.query(
        `UPDATE ai_inventory_notifications 
         SET status_id = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 AND user_id = $3 
         RETURNING *`,
        [status_id, id, userId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Notification not found or unauthorized');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Dismiss a notification
   * @param {number} id Notification ID
   * @param {number} userId User ID (for security)
   * @returns {Promise<Object>} Updated notification
   */
  static async dismiss(id, userId) {
    try {
      const statusQuery = await pool.query(
        `SELECT id FROM status_types WHERE name = 'dismissed' AND 
         category_id = (SELECT id FROM status_categories WHERE name = 'ai_notification')`
      );
      
      const status_id = statusQuery.rows[0].id;

      const result = await pool.query(
        `UPDATE ai_inventory_notifications 
         SET status_id = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 AND user_id = $3 
         RETURNING *`,
        [status_id, id, userId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Notification not found or unauthorized');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error dismissing notification:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   * @param {number} id Notification ID
   * @param {number} userId User ID (for security)
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id, userId) {
    try {
      const result = await pool.query(
        `DELETE FROM ai_inventory_notifications 
         WHERE id = $1 AND user_id = $2 
         RETURNING id`,
        [id, userId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Notification not found or unauthorized');
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
}

module.exports = AINotification;
