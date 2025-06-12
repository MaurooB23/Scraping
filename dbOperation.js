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
    const descripcionFinal = (!descripcionTexto || descripcionTexto.trim() === '')
      ? 'Sin descripción'
      : descripcionTexto.trim();

    const insertResult = await pool.query(
      `INSERT INTO "Descripcion" (
        "descripcion", 
        "caracteristicas", 
        "available", 
        "createdAt", 
        "updatedAt"
      )
      VALUES ($1, $2, true, NOW(), NOW())
      RETURNING id`,
      [descripcionFinal, null]
    );

    console.log('Descripción insertada:', descripcionFinal.slice(0, 40) + '...');
    return insertResult.rows[0].id;

  } catch (error) {
    console.error('Error al insertar la descripción:', error.message);
    return null;
  }
}

async function insertProducto(producto, descripcionId) {
  try {
    const { nombre, precio, stock } = producto;

    const precioNumerico = parseFloat(precio.replace('$', '').replace(',', '.').trim()) || 0;

    let stockNum = null;

    if (typeof stock === 'string') {
      if (stock.includes('Últimas')) {
        const match = stock.match(/\d+/);
        stockNum = match ? parseInt(match[0]) : null;
      } else if (stock === 'Sin stock' || stock === 'No hay Stock') {
        stockNum = 0;
      } else if (stock === 'Stock disponible') {
        stockNum = null;
      } else {
        stockNum = null;
      }
    } else {
      stockNum = null;
    }

    await pool.query(
      `INSERT INTO "Product" (
        nombre,
        precio,
        marca,
        stock,
        available,
        "createdAt",
        "updatedAt",
        "tipoProductoId",
        "descripcionId",
        "tiposUsoId",
        "proveedorId"
      ) VALUES ($1, $2, $3, $4, true, NOW(), NOW(), $5, $6, $7, $8)`,
      [
        nombre,
        precioNumerico,
        null,              // marca
        stockNum,
        null,              // tipoProductoId
        descripcionId,
        null,              // tiposUsoId
        null               // proveedorId
      ]
    );

    console.log(`Producto insertado: ${nombre.slice(0, 40)}...`);

  } catch (error) {
    console.error('Error al insertar producto:', error.message);
  }
}




console.log('dbOperation.js cargado correctamente');

module.exports = { insertCategoriaIfNotExists, insertDescripcionIfNotExists, insertProducto };
