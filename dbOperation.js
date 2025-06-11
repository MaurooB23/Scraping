// dbOperation.js
const pool = require('./db');

/**
 * Inserta una categoría si no existe aún en la base de datos.
 * @param {string} nombreCategoria
 */
async function insertCategoriaIfNotExists(nombreCategoria) {
  try {
    const result = await pool.query(
      'SELECT * FROM "Categoria" WHERE LOWER("nombreCategoria") = LOWER($1)',
      [nombreCategoria]
    );

    if (result.rows.length > 0) {
      console.log(`La categoría "${nombreCategoria}" ya existe.`);
      return;
    }

    await pool.query(
      `INSERT INTO "Categoria" ("nombreCategoria", "available", "createdAt", "updatedAt")
       VALUES ($1, true, NOW(), NOW())`,
      [nombreCategoria]
    );

    console.log(`Categoría insertada: "${nombreCategoria}"`);
  } catch (error) {
    console.error(`Error al insertar la categoría "${nombreCategoria}":`, error.message);
  }
}

async function insertDescripcionIfNotExists(descripcionTexto) {
  try {
    if (!descripcionTexto || descripcionTexto.trim() === '') {
      console.log('Descripción vacía o nula, se omite.');
      return;
    }

    const result = await pool.query(
      'SELECT * FROM "Descripcion" WHERE "descripcion" = $1',
      [descripcionTexto]
    );

    if (result.rows.length > 0) {
      console.log('Descripción ya existe:', descripcionTexto.slice(0, 40) + '...');
      return;
    }

    await pool.query(
      `INSERT INTO "Descripcion" ("descripcion", "caracteristicas", "available", "createdAt", "updatedAt")
       VALUES ($1, $2, true, NOW(), NOW())`,
      [descripcionTexto, null]
    );

    console.log('Descripción insertada:', descripcionTexto.slice(0, 40) + '...');
  } catch (error) {
    console.error('Error al insertar la descripción:', error.message);
  }
}

console.log('dbOperation.js cargado correctamente');

module.exports = { insertCategoriaIfNotExists, insertDescripcionIfNotExists };
