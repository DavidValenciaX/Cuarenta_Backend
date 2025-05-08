const pool = require('../config/data_base');

class TransactionType {
  static async getAll() {
    const query = `
      SELECT id, name, description 
      FROM public.transaction_types
      ORDER BY id;
    `;
    const { rows } = await pool.query(query);
    return rows;
  }
}

module.exports = TransactionType;
