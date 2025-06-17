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
        stockNum = 100;
      } else {
        stockNum = 10;
      }
    }

    const result = await pool.query(
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
      ) VALUES ($1, $2, $3, $4, true, NOW(), NOW(), $5, $6, $7, $8)
      RETURNING id`,
      [
        nombre,
        precioNumerico,
        "Sin Marca",         // marca
        stockNum,
        null,                // tipoProductoId
        descripcionId,
        null,                // tiposUsoId
        null                 // proveedorId
      ]
    );

    const productoId = result.rows[0].id;
    console.log(`Producto insertado: ${nombre.slice(0, 40)}... (ID: ${productoId})`);

    return productoId;

  } catch (error) {
    console.error('Error al insertar producto:', error);
    return null;
  }
}


async function insertImagen(url, productoId) {
  try {
    const tipoImagen = "principal"; // o "extra", "vista", lo que prefieras
    const descripcion = "Imagen generada automáticamente";

    await pool.query(
      `INSERT INTO "Imagen" (
        available,
        "tipoImagen",
        descripcion,
        "urlImagen",
        "productoId"
      ) VALUES (true, $1, $2, $3, $4)`,
      [tipoImagen, descripcion, url, productoId]
    );

    console.log(`Imagen insertada para producto ID: ${productoId}`);

  } catch (error) {
    console.error('Error al insertar imagen:', error);
  }
}




console.log('dbOperation.js cargado correctamente');

module.exports = { insertCategoriaIfNotExists, insertDescripcionIfNotExists, insertProducto, insertImagen };
