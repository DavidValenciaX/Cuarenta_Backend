const pool = require('../config/data_base');

class Product {
  
  static async create(data) {
    const { userId, name, description, unit_price, unit_cost, supplier_id, image_url, category_id, unit_of_measure_id, quantity, barcode } = data;
    const { rows } = await pool.query(
      `INSERT INTO public.products(
         user_id, name, description, unit_price, unit_cost,
         supplier_id, image_url, category_id, unit_of_measure_id,
         quantity, barcode
       ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [userId, name, description, unit_price, unit_cost, supplier_id, image_url, category_id, unit_of_measure_id, quantity, barcode]
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

  static async findByBarcodeAndUser(barcode, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM public.products WHERE barcode = $1 AND user_id = $2`,
      [barcode, userId]
    );
    return rows[0];
  }

  static async update(id, data, userId) {
    const values = [
      data.name, data.description, data.unit_price, data.unit_cost,
      data.supplier_id, data.image_url, data.category_id,
      data.unit_of_measure_id, data.quantity, data.barcode,
      id, userId
    ];
    const { rows } = await pool.query(
      `UPDATE public.products
       SET name=$1, description=$2, unit_price=$3, unit_cost=$4,
           supplier_id=$5, image_url=$6, category_id=$7,
           unit_of_measure_id=$8, quantity=$9, barcode=$10
       WHERE id=$11 AND user_id=$12 RETURNING *`,
      values
    );
    return rows[0];
  }

  static async delete(id, userId) {
    const { rows } = await pool.query(
      `DELETE FROM public.products WHERE id=$1 AND user_id=$2 RETURNING *`,
      [id, userId]
    );
    return rows[0];
  }
}

module.exports = Product;
