const pool = require('../config/data_base');

class Category {
  static async create({ name, userId }) {
    const result = await pool.query(
      `INSERT INTO public.categories(name, user_id) VALUES($1, $2) RETURNING *`,
      [name, userId]
    );
    return result.rows[0];
  }

  static async findAllByUser(userId) {
    const result = await pool.query(
      `SELECT * FROM public.categories WHERE user_id = $1 ORDER BY name`,
      [userId]
    );
    return result.rows;
  }

  static async findById(id, userId) {
    const result = await pool.query(
      `SELECT * FROM public.categories WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return result.rows[0];
  }

  static async update(id, { name }, userId) {
    const result = await pool.query(
      `UPDATE public.categories SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
      [name, id, userId]
    );
    return result.rows[0];
  }

  static async delete(id, userId) {
    const result = await pool.query(
      `DELETE FROM public.categories WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );
    return result.rows[0];
  }

  static async findByNameAndUser(name, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM public.categories WHERE name = $1 AND user_id = $2`,
      [name, userId]
    );
    return rows[0];
  }
  
}

module.exports = Category;
