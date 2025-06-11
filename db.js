const { Pool } = require('pg');
require('dotenv').config();


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on('connect', () => {
  console.log('conexion a la base de datos establecida');
});

pool.on('error', (err) => {
  console.log('Error en la conexion a la base de datos', err.message);
});

(async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('Conexion exitosa a la base de datos');
  } catch (err) {
    console.log('Error con la conexion a la base de datos', err.message);
    process.exit(1);
  }
})();

console.log('db.js cargado correctamente');

module.exports = pool;
