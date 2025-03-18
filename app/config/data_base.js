require('dotenv').config(); // Carga las variables de entorno desde .env
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function testDBConnection() {
    try {
      const client = await pool.connect();
      console.log(`Conexión exitosa a la base de datos ${process.env.DB_NAME} `);
      client.release(); // Libera el cliente
    } catch (error) {
      console.error('Error al conectar con la base de datos:', error.message);
    }
  }

testDBConnection();


module.exports = pool;
