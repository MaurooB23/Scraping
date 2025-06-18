const { chromium } = require('playwright');
const fs = require('fs');
const { insertDescripcionIfNotExists, insertProducto, insertImagen } = require('./dbOperation');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://pency.app/disglutenfree');

  const data = [];

  try {
    await page.waitForSelector('button[data-test-id="product-onboarding-close"]', { timeout: 300 });
    await page.click('button[data-test-id="product-onboarding-close"]');
    console.log('Modal cerrado correctamente.');
  } catch (e) {
    console.log('No apareció el modal, continuando...');
  }

  await page.waitForTimeout(1000);
  await page.mouse.wheel(0, 10000);
  await page.waitForTimeout(1000);

  const marcaContainers = await page.$$('.css-a6fk9l, .css-xyh1ff');
  console.log(`Se encontraron ${marcaContainers.length} contenedores de marca.`);

  for (let i = 0; i < marcaContainers.length; i++) {
    try {
      const container = marcaContainers[i];
      const svgIcon = await container.$('svg.feather-chevron-down');

      if (svgIcon) {
        const tituloMarca = await container.$('p.css-18v1jhz');
        const nombreMarca = tituloMarca ? await tituloMarca.innerText() : `Marca ${i + 1}`;

        await svgIcon.scrollIntoViewIfNeeded();
        await page.waitForTimeout(50);
        await svgIcon.click();
        console.log(`Marca "${nombreMarca}" expandida.`);
        await page.waitForTimeout(50);

        const productos = await page.$$('.css-xxs8cq');
        console.log(`Se encontraron ${productos.length} productos en "${nombreMarca}"`);
        const productosMarca = [];

        for (let j = 0; j < productos.length; j++) {
          try {
            const producto = productos[j];
            const contenedorInfo = await producto.$('.css-1nqnvtt');
            if (!contenedorInfo) continue;

            const ps = await contenedorInfo.$$('p');
            const nombre = ps[0] ? await ps[0].innerText() : 'Sin nombre';
            const descripcion = ps[1] ? await ps[1].innerText() : 'Sin descripción';

            const precioElement = await producto.$('p.css-lb7l61');
            const precio = precioElement ? await precioElement.innerText() : 'Sin precio';

            let stock = 'No especificado';
            const stockDisponible = await producto.$('p.css-11cvmn9');
            const sinStock = await producto.$('.css-a8b72n');

            if (stockDisponible) {
              stock = await stockDisponible.innerText();
            } else if (sinStock) {
              stock = 'Sin stock';
            } else {
              stock = 'Stock disponible';
            }

            await producto.scrollIntoViewIfNeeded();
            await page.waitForTimeout(1000);
            await producto.click();
            console.log(`Producto ${j + 1} abierto.`);

            await page.waitForSelector('#cart-item.css-1bg54gv', { timeout: 3000 });
            const contenedorProducto = await page.$('#cart-item.css-1bg54gv');
            const imageUrls = [];

            if (contenedorProducto) {
              await page.waitForSelector('.css-1dth1x7', { timeout: 3000 });

              const carrusel = await page.$('.css-1dth1x7');
              const contenedores = await page.$$('.css-zkfkwx, .css-439enl');

              console.log(`Se encontraron ${contenedores.length} contenedores de imágenes.`);

              for (let k = 0; k < contenedores.length; k++) {
                try {
                  const contenedor = contenedores[k];
                  const primerHijo = await contenedor.$('div');

                  if (!primerHijo) {
                    console.warn(`No se encontró div hijo en contenedor de imagen ${k + 1}`);
                    continue;
                  }

                  await carrusel.evaluate((el, index) => {
                    el.scrollLeft = el.clientWidth * index;
                  }, k);

                  await page.waitForTimeout(1000);
                  await primerHijo.scrollIntoViewIfNeeded();
                  await page.waitForTimeout(1500);

                  let backgroundImage = '';
                  for (let intento = 0; intento < 5; intento++) {
                    backgroundImage = await primerHijo.evaluate(el =>
                      window.getComputedStyle(el).backgroundImage
                    );
                    if (backgroundImage && backgroundImage !== 'none') break;
                    await page.waitForTimeout(500);
                  }

                  const match = backgroundImage.match(/url\("(.*?)"\)/);

                  if (match && match[1]) {
                    console.log(`Imagen ${k + 1} extraída: ${match[1]}`);
                    imageUrls.push(match[1]);
                  } else {
                    console.warn(`No se encontró background-image en imagen ${k + 1}`);
                  }

                } catch (error) {
                  console.error(`Error procesando imagen ${k + 1}: ${error.message}`);
                }
              }

            } else {
              console.warn(`Contenedor de detalle no encontrado para producto ${j + 1}.`);
            }

            const botonVolver = await page.$('.css-6lhw58');
            if (botonVolver) {
              await botonVolver.click();
              console.log(`Producto ${j + 1} cerrado y volviendo.`);
            } else {
              console.warn(`Botón de volver no encontrado para producto ${j + 1}.`);
            }

            await page.waitForTimeout(1000);

            productosMarca.push({
              nombre,
              descripcion,
              precio,
              stock,
              marca: nombreMarca,
              imageUrls
            });

          } catch (err) {
            console.warn(`Error procesando producto ${j + 1}: ${err.message}`);
            continue;
          }
        }

        data.push({
          marca: nombreMarca,
          productos: productosMarca
        });

        for (const producto of productosMarca) {
          const descripcionId = await insertDescripcionIfNotExists(producto.descripcion);
          const productoId = await insertProducto(producto, descripcionId);

          if (producto.imageUrls && producto.imageUrls.length > 0) {
            for (const url of producto.imageUrls) {
              await insertImagen(url, productoId);
            }
          }
        }

      } else {
        console.log(`No se encontró el ícono en la marca ${i + 1}.`);
      }

    } catch (err) {
      console.error(`Error al expandir la marca ${i + 1}:`, err.message);
    }

    console.log(JSON.stringify(data, null, 2));
  }

  await browser.close();

  const baseName = 'productos';
  const extension = '.json';
  const date = new Date();
  const day = `pency-${date.getDay()}-${date.getMonth() + 1}-${date.getFullYear()}-${Date.now()}`;
  const filename = `${baseName}-${day}${extension}`;

  if (fs.existsSync(filename)) {
    console.log(`Archivo "${filename}" eliminado.`);
    fs.unlinkSync(filename);
  }

  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`Archivo "${filename}" guardado correctamente.`);
})();
