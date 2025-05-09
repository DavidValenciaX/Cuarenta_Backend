const pool = require('../config/data_base');

class User {
    static async createUser({ fullName, companyName, passwordHash, email, phone, confirmationTokenHash, confirmationTokenExpiration }) {
      const query = `
        INSERT INTO public.users (
          full_name, company_name, password_hash, email, phone, 
          confirmation_token_hash, confirmation_token_expiration, status_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, (
          SELECT st.id 
          FROM status_types st
          JOIN status_categories sc 
            ON st.category_id = sc.id
          WHERE st.name = 'pending'
            AND sc.name = 'user'
          LIMIT 1
        )
    )
        RETURNING id;
      `;
      const values = [fullName, companyName, passwordHash, email, phone, confirmationTokenHash, confirmationTokenExpiration];
      const { rows } = await pool.query(query, values);
      return rows[0];
    }

    //Método para comprobar si el correo ya existe
    static async findByEmail(email) {
      const query = 'SELECT id, full_name FROM public.users WHERE email = $1 LIMIT 1';
      const { rows } = await pool.query(query, [email]);
      return rows[0]; // Retorna undefined si no encuentra nada
    }
  
   //Buscar si el token de confirmacion existe
  static async findByConfirmationToken(token) {
    const query = `
      SELECT id, confirmation_token_hash, confirmation_token_expiration
      FROM public.users
      WHERE confirmation_token_hash = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [token]);
    return rows[0];
  }

   //Metodo para confirmar correo
   static async confirmUser(userId) {
    const query = `
      UPDATE public.users
      SET
        confirmation_token_hash = null,
        confirmation_token_expiration = null,
        -- status_id es igual al id de status_types donde name='active' y 
        -- categoría sea 'user'
        status_id = (
          SELECT st.id
          FROM status_types st
          JOIN status_categories sc ON st.category_id = sc.id
          WHERE sc.name = 'user'
            AND st.name = 'active'
        )
      WHERE id = $1
      RETURNING id;
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows[0]; 
  }

    // Actualizar token y vencimiento (reenviar)
    static async updateConfirmationToken(userId, newToken, newExpiration) {
        const query = `
          UPDATE public.users
          SET 
            confirmation_token_hash = $1,
            confirmation_token_expiration = $2
          WHERE id = $3
          RETURNING id;
        `;
        const values = [newToken, newExpiration, userId];
        const { rows } = await pool.query(query, values);
        return rows[0];
      }

      //Busca contrasena del usuario por el email
      static async findUserWithPasswordByEmail(email) {
        const query = `
          SELECT 
            u.id, 
            u.password_hash,
            st.name AS status,
            sc.name AS category
          FROM public.users u
          JOIN status_types st ON u.status_id = st.id
          JOIN status_categories sc ON st.category_id = sc.id
          WHERE u.email = $1
          LIMIT 1
        `;
        const { rows } = await pool.query(query, [email]);
        return rows[0];
      }
      
      // Actualizar token y expiración para el reseteo de contraseña
  static async updateResetToken(userId, resetTokenHash, resetTokenExpiration) {
    const query = `
      UPDATE public.users
      SET
        password_reset_token_hash = $1,
        password_reset_token_expiration = $2
      WHERE id = $3
      RETURNING id;
    `;
    const values = [resetTokenHash, resetTokenExpiration, userId];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  // Buscar usuario por token de reseteo
  static async findByResetToken(token) {
    const query = `
      SELECT id, email, password_reset_token_expiration
      FROM public.users
      WHERE password_reset_token_hash = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [token]);
    return rows[0];
  }

  // Actualizar contraseña y limpiar token de reseteo
  static async updatePassword(userId, newPasswordHash) {
    const query = `
      UPDATE public.users
      SET
        password_hash = $1,
        password_reset_token_hash = null,
        password_reset_token_expiration = null
      WHERE id = $2
      RETURNING id;
    `;
    const values = [newPasswordHash, userId];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async findById(userId) {
    const query = `
      SELECT 
        id, full_name, company_name, email, phone, 
        created_at, updated_at
      FROM public.users
      WHERE id = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows[0];
  }

  // Buscar usuario por product_id
  static async findUserByProductId(productId) {
    const query = `
      SELECT u.id
      FROM public.users u
      JOIN public.products p ON p.user_id = u.id
      WHERE p.id = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [productId]);
    return rows[0];
  }
}
  
module.exports = User;