const { chromium } = require('playwright');
const fs = require('fs');
const { insertCategoriaIfNotExists, insertDescripcionIfNotExists, insertProducto  } = require('./dbOperation');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://pency.app/disglutenfree');

  const data = [];
  // const categoriasIgnoradas = ['Argendiet', 'Bad Monkey', 'Bastiano', 'Biofarv'];

  try {
    await page.waitForSelector('button[data-test-id="product-onboarding-close"]', { timeout: 300 });
    await page.click('button[data-test-id="product-onboarding-close"]');
    console.log('Modal cerrado correctamente.');
  } catch (e) {
    console.log('No apareció el modal, continuando...');
  }

  //Para tiempos de espera mas cortos:
  // await page.waitForTimeout(100);
  // await page.mouse.wheel(0, 10000);
  // await page.waitForTimeout(100);

  await page.waitForTimeout(1000);
  await page.mouse.wheel(0, 10000);
  await page.waitForTimeout(1000);

  const categoryContainers = await page.$$('.css-a6fk9l, .css-xyh1ff');
  console.log(`Se encontraron ${categoryContainers.length} contenedores de categoría.`);

  for (let i = 0; i < categoryContainers.length; i++) {
    try {
      const container = categoryContainers[i];
      const svgIcon = await container.$('svg.feather-chevron-down');

      if (svgIcon) {
        const tituloCategoria = await container.$('p.css-18v1jhz');
        const nombreCategoria = tituloCategoria ? await tituloCategoria.innerText() : `Categoría ${i + 1}`;
       

        //saltear categorias para probar varias imagenes
        // if (categoriasIgnoradas.includes(nombreCategoria.trim())) {
        //   console.log(`Saltando categoría ignorada: ${nombreCategoria}`);
        //   continue;
        // }

        await svgIcon.scrollIntoViewIfNeeded();
        await page.waitForTimeout(50);
        await svgIcon.click();
        console.log(`Categoría "${nombreCategoria}" expandida.`);
        await page.waitForTimeout(50);

        const productos = await page.$$('.css-xxs8cq');
        console.log(` Se encontraron ${productos.length} productos en "${nombreCategoria}"`);
        const productosCategoria = [];

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
            //await page.waitForTimeout(300);
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

                // Forzar que el div con la imagen entre en pantalla
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

            productosCategoria.push({
              nombre,
              descripcion,
              precio,
              stock,
              imageUrls
            });

          } catch (err) {
            console.warn(`Error procesando producto ${j + 1}: ${err.message}`);
            continue;
          }
        }

        data.push({
          categoria: nombreCategoria,
          productos: productosCategoria
        });

        await insertCategoriaIfNotExists(nombreCategoria);
        for (const producto of productosCategoria) {
        const descripcionId = await insertDescripcionIfNotExists(producto.descripcion);
        await insertProducto(producto, descripcionId);
      }

      } else {
        console.log(`No se encontró el ícono en la categoría ${i + 1}.`);
      }

    } catch (err) {
      console.error(`Error al expandir la categoría ${i + 1}:`, err.message);
    }

    console.log(JSON.stringify(data, null, 2));
  }

  await browser.close();
  

  // 2. Backup en JSON (código existente que se mantiene igual)
  const baseName = 'productos';
  const extension = '.json';
  const date = new Date()
  const day = `pency-${date.getDay()}-${date.getMonth() + 1}-${date.getFullYear()}-${Date.now()}`;
  const filename = `${baseName}-${day}${extension}`;

  if (fs.existsSync(filename)) {
    console.log(`Archivo "${filename}" eliminado.`);
    fs.unlinkSync(filename);
  }

  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`Archivo "${filename}" guardado correctamente.`);
  // --- FIN DE NUEVAS LINEAS ---
})();