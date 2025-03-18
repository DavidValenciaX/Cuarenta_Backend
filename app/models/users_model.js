const pool = require('../config/data_base');

class User {
    static async createUser({ fullName, companyName, passwordHash, email, phone, confirmationTokenHash, confirmationTokenExpiration }) {
      const query = `
        INSERT INTO public.users (
          full_name, company_name, password_hash, email, phone, 
          confirmation_token_hash, confirmation_token_expiration, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id;
      `;
      const values = [fullName, companyName, passwordHash, email, phone, confirmationTokenHash, confirmationTokenExpiration];
      const { rows } = await pool.query(query, values);
      return rows[0];
    }

      //Método para comprobar si el correo ya existe
    static async buscarPorEmail(email) {
    const query = 'SELECT id FROM public.users WHERE email = $1 LIMIT 1';
    const { rows } = await pool.query(query, [email]);
    return rows[0]; // Retorna undefined si no encuentra nada
  }
  }
  
  module.exports = User;