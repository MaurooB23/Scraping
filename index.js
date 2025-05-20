const { chromium } = require('playwright'); 
const fs = require('fs'); 

(async () => { 

  const browser = await chromium.launch({ headless: true }); 
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


  await page.waitForTimeout(100);
  await page.mouse.wheel(0, 10000);
  await page.waitForTimeout(100); 


  const categoryContainers = await page.$$('.css-a6fk9l, .css-xyh1ff'); 
  console.log(`Se encontraron ${categoryContainers.length} contenedores de categoría.`); 

  for (let i = 0; i < categoryContainers.length; i++) { 
    try {
      const container = categoryContainers[i]; 
      const svgIcon = await container.$('svg.feather-chevron-down'); 

      if (svgIcon) { 
        const tituloCategoria = await container.$('p.css-18v1jhz'); 
        const nombreCategoria = tituloCategoria ? await tituloCategoria.innerText() : `Categoría ${i + 1}`; 
        await svgIcon.scrollIntoViewIfNeeded(); 
        await page.waitForTimeout(50); 
        await svgIcon.click(); 
        console.log(`Categoría "${nombreCategoria}" expandida.`);
        await page.waitForTimeout(50); 

        const productos = await page.$$('.css-xxs8cq'); 
        console.log(`→ Se encontraron ${productos.length} productos en "${nombreCategoria}"`); 
        const productosCategoria = []; 

        for (let i = 0; i < productos.length; i++){
          const producto = productos[i]; 
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

                /*
              const divImagen = await producto.$('.css-1y5iw82');
              let imagen = 'Sin imagen';

              if (divImagen) {
                const estilo = await divImagen.evaluate(el => getComputedStyle(el).getPropertyValue('background-image'));
                const match = estilo.match(/url\("(.*)"\)/);

                if (match && match[1]) {
                  imagen = match[1];
                }
              }
                */
       

          productosCategoria.push({ 
            nombre,
            descripcion,
            precio,
            stock
            //imagen
          });
        }

        data.push({ 
          categoria: nombreCategoria,
          productos: productosCategoria
        });

        

      } else {
        console.log(`No se encontró el ícono en la categoría ${i + 1}.`);
      }
    } catch (err) {
      console.error(`Error al expandir la categoría ${i + 1}:`, err.message);
    }
     console.log(JSON.stringify(data, null, 2)); 
  }

 
  await browser.close(); 



  const baseName = 'productos'; 
  const extension = '.json';
  let filename = `${baseName}${extension}`;

 if (fs.existsSync(filename)) { 
  console.log(`Archivo "${filename}" eliminado.`); 
}


fs.writeFileSync(filename, JSON.stringify(data, null, 2));
console.log(`Archivo "${filename}" guardado correctamente.`);
 
})();
