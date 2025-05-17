const pool = require('../config/data_base');

class Customer {
  static async create({ name, email, phone, address, userId }) {
    const result = await pool.query(
      `INSERT INTO public.customers(name, email, phone, address, user_id)
       VALUES($1, $2, $3, $4, $5) RETURNING *`,
      [name, email, phone, address, userId]
    );
    return result.rows[0];
  }

  static async findAllByUser(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM public.customers WHERE user_id = $1 ORDER BY name`,
      [userId]
    );
    return rows;
  }

  static async findById(id, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM public.customers WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return rows[0];
  }

  static async findByEmailAndUser(email, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM public.customers WHERE email = $1 AND user_id = $2`,
      [email, userId]
    );
    return rows[0];
  }

  static async findByNameAndUser(name, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM public.customers WHERE name ILIKE $1 AND user_id = $2`,
      [name, userId]
    );
    return rows[0];
  }

  static async update(id, { name, email, phone, address }, userId) {
    const { rows } = await pool.query(
      `UPDATE public.customers SET name=$1, email=$2, phone=$3, address=$4
       WHERE id=$5 AND user_id=$6 RETURNING *`,
      [name, email, phone, address, id, userId]
    );
    return rows[0];
  }

  static async delete(id, userId) {
    // Check for dependencies first
    const { rows: dependencies } = await pool.query(
      `SELECT COUNT(*) as sales_orders FROM sales_orders WHERE customer_id = $1`,
      [id]
    );

    if (dependencies[0].sales_orders > 0) {
      const error = new Error('No se puede eliminar el cliente porque tiene órdenes de venta asociadas');
      error.statusCode = 409;
      error.dependencies = {
        salesOrders: dependencies[0].sales_orders
      };
      throw error;
    }

    const { rows } = await pool.query(
      `DELETE FROM public.customers WHERE id=$1 AND user_id=$2 RETURNING *`,
      [id, userId]
    );
    return rows[0];
  }
}

module.exports = Customer;
