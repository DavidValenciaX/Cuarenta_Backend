const pool = require('../config/data_base');

class Category {
  static async create({ name, user_id }) {
    const result = await pool.query(
      `INSERT INTO public.categories(name, user_id) VALUES($1, $2) RETURNING *`,
      [name, user_id]
    );
    return result.rows[0];
  }

  static async findAllByUser(user_id) {
    const result = await pool.query(
      `SELECT * FROM public.categories WHERE user_id = $1 ORDER BY name`,
      [user_id]
    );
    return result.rows;
  }

  static async findById(id, user_id) {
    const result = await pool.query(
      `SELECT * FROM public.categories WHERE id = $1 AND user_id = $2`,
      [id, user_id]
    );
    return result.rows[0];
  }

  static async update(id, { name }, user_id) {
    const result = await pool.query(
      `UPDATE public.categories SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
      [name, id, user_id]
    );
    return result.rows[0];
  }

  static async delete(id, user_id) {
    const result = await pool.query(
      `DELETE FROM public.categories WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, user_id]
    );
    return result.rows[0];
  }

  static async findByNameAndUser(name, user_id) {
    const { rows } = await pool.query(
      `SELECT * FROM public.categories WHERE name ILIKE $1 AND user_id = $2`,
      [name, user_id]
    );
    return rows[0];
  }
  
}

module.exports = Category;
