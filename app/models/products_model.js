const pool = require('../config/data_base');

class Product {
  static async create({ name, description, unit_price, unit_cost, supplier_id, image_url, category_id, unit_of_measure_id, userId }) {
    const { rows } = await pool.query(
      `INSERT INTO public.products(name, description, unit_price, unit_cost, supplier_id, image_url, category_id, unit_of_measure_id, user_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, description, unit_price, unit_cost, supplier_id, image_url, category_id, unit_of_measure_id, userId]
    );
    return rows[0];
  }

  static async findAllByUser(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM public.products WHERE user_id = $1 ORDER BY name`,
      [userId]
    );
    return rows;
  }

  static async findById(id, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM public.products WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return rows[0];
  }

  static async findByNameAndUser(name, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM public.products WHERE name = $1 AND user_id = $2`,
      [name, userId]
    );
    return rows[0];
  }

  static async update(id, { name, description, unit_price, unit_cost, supplier_id, image_url, category_id, unit_of_measure_id }, userId) {
    const { rows } = await pool.query(
      `UPDATE public.products 
       SET name = $1, description = $2, unit_price = $3, unit_cost = $4, supplier_id = $5, image_url = $6, category_id = $7, unit_of_measure_id = $8
       WHERE id = $9 AND user_id = $10 RETURNING *`,
      [name, description, unit_price, unit_cost, supplier_id, image_url, category_id, unit_of_measure_id, id, userId]
    );
    return rows[0];
  }

  static async delete(id, userId) {
    const { rows } = await pool.query(
      `DELETE FROM public.products WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );
    return rows[0];
  }
}

module.exports = Product;
