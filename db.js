const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('Conexión a la base de datos establecida');
});

pool.on('error', (err) => {
  console.log('Error en la conexión a la base de datos', err.message);
});

(async () => {
  try {
    const result = await pool.query('SELECT current_database(), current_schema()');
    console.log('Base y esquema conectados:', result.rows[0]);
  } catch (err) {
    console.log('Error al probar la conexión:', err.message);
    process.exit(1);
  }
})();

console.log('db.js cargado correctamente');

module.exports = pool;
