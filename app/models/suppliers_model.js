const pool = require('../config/data_base');

class Supplier {
  static async create({ name, email, phone, address, user_id }) {
    const result = await pool.query(
      `INSERT INTO public.suppliers(name, email, phone, address, user_id)
       VALUES($1,$2,$3,$4,$5) RETURNING *`,
      [name,email,phone,address,user_id]
    );
    return result.rows[0];
  }

  static async findAllByUser(user_id) {
    const { rows } = await pool.query(
      `SELECT * FROM public.suppliers WHERE user_id = $1 ORDER BY name`,
      [user_id]
    );
    return rows;
  }

  static async findById(id,user_id) {
    const { rows } = await pool.query(
      `SELECT * FROM public.suppliers WHERE id = $1 AND user_id = $2`,
      [id,user_id]
    );
    return rows[0];
  }

  static async findByEmailAndUser(email,user_id) {
    const { rows } = await pool.query(
      `SELECT * FROM public.suppliers WHERE email = $1 AND user_id = $2`,
      [email,user_id]
    );
    return rows[0];
  }

  static async findByNameAndUser(name, user_id) {
    const { rows } = await pool.query(
      `SELECT * FROM public.suppliers WHERE name ILIKE $1 AND user_id = $2`,
      [name, user_id]
    );
    return rows[0];
  }
  

  static async update(id,{ name,email,phone,address },user_id) {
    const { rows } = await pool.query(
      `UPDATE public.suppliers SET name=$1,email=$2,phone=$3,address=$4
       WHERE id=$5 AND user_id=$6 RETURNING *`,
      [name,email,phone,address,id,user_id]
    );
    return rows[0];
  }

  static async delete(id,user_id) {
    const { rows } = await pool.query(
      `DELETE FROM public.suppliers WHERE id=$1 AND user_id=$2 RETURNING *`,
      [id,user_id]
    );
    return rows[0];
  }
}

module.exports = Supplier;
