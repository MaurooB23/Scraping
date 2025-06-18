const pool = require('./db');

async function insertDescripcionIfNotExists(descripcionTexto) {
  try {
    const descripcionFinal = (!descripcionTexto || descripcionTexto.trim() === '')
      ? 'Sin descripción'
      : descripcionTexto.trim();

    
    const checkResult = await pool.query(
      `SELECT id FROM "Descripcion" WHERE descripcion = $1`,
      [descripcionFinal]
    );
    if (checkResult.rows.length > 0) {
      console.log('Descripción ya existente:', descripcionFinal.slice(0, 40) + '...');
      return checkResult.rows[0].id;
    }

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
    const { nombre, precio, stock, marca } = producto;

   
    const nombreValido = (typeof nombre === 'string' && nombre.trim() !== '');
    const marcaValida = (typeof marca === 'string' && marca.trim() !== '');
    if (!nombreValido || !marcaValida) {
      console.warn(`Nombre o marca inválidos. Nombre: "${nombre}", Marca: "${marca}"`);
      return null;
    }

    const precioNumerico = parseFloat(precio.replace('$', '').replace(',', '.').trim());
    if (isNaN(precioNumerico)) {
      console.warn(`Precio inválido para producto: ${nombre}`);
      return null;
    }

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

   
    const checkProducto = await pool.query(
      `SELECT id FROM "Product" WHERE nombre = $1 AND marca = $2`,
      [nombre.trim(), marca.trim()]
    );
    if (checkProducto.rows.length > 0) {
      console.log(`Producto ya existente: "${nombre}" (${marca})`);
      return checkProducto.rows[0].id;
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
        nombre.trim(),
        precioNumerico,
        marca.trim(),
        stockNum,
        null,                   // tipoProductoId
        descripcionId,
        null,                   // tiposUsoId
        null                    // proveedorId
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
    if (!url || typeof url !== 'string' || url.trim() === '') {
      console.warn('URL de imagen inválida, omitiendo.');
      return;
    }

    
    const existe = await pool.query(
      `SELECT id FROM "Imagen" WHERE "urlImagen" = $1 AND "productoId" = $2`,
      [url.trim(), productoId]
    );

    if (existe.rows.length > 0) {
      console.log(`Imagen ya existente para producto ID ${productoId}: ${url}`);
      return;
    }

    const tipoImagen = "principal";
    const descripcion = "Imagen generada automáticamente";

    await pool.query(
      `INSERT INTO "Imagen" (
        available,
        "tipoImagen",
        descripcion,
        "urlImagen",
        "productoId"
      ) VALUES (true, $1, $2, $3, $4)`,
      [tipoImagen, descripcion, url.trim(), productoId]
    );

    console.log(`Imagen insertada para producto ID: ${productoId}`);

  } catch (error) {
    console.error('Error al insertar imagen:', error);
  }
}

console.log('dbOperation.js cargado correctamente');

module.exports = {
  insertDescripcionIfNotExists,
  insertProducto,
  insertImagen
};
