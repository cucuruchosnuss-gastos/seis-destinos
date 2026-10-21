// La tanda del 21/10/2026, en la maqueta (sin credenciales), a 390, 360, la
// tablet (1000×540) y 1280:
//  - Conos de papel: POR AHORA no se muestran los negativos
//    (MOSTRAR_NEGATIVOS_CONOS = false): FIBRO (-2.000 en la base) se ve 0 y
//    sin bordó, sin aviso de "Stock negativo", su "Alcanza" dice "—"; el aviso
//    de los que alcanzan para poco sigue (CASERATO).
//  - Salidas entre fábricas (gestión de Producción, desde el stock
//    terminado): Mengui y el mes actual de entrada, la tabla con sus 7
//    columnas, los totales por producto, el filtro de producto, el de fechas
//    y el de fábrica, y "Exportar a Excel" (con un SheetJS falso: no depende
//    de la red). Sin scroll de costado y sin nada que se salga de su recuadro.
// (El lote vigente del ingreso está en 44-ingreso-terminado.spec.js.)
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const TAMANOS = [[390, 844], [360, 780], [1000, 540], [1280, 860]];

async function sinCostado(page) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `scroll de costado: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
}

// Ningún dato de las filas se sale de la fila.
async function nadaSeSale(page, selector) {
  const fuera = await page.evaluate((sel) => {
    const malos = [];
    for (const fila of document.querySelectorAll(sel)) {
      const r = fila.getBoundingClientRect();
      for (const c of fila.children) {
        const rc = c.getBoundingClientRect();
        if (rc.width && (rc.left < r.left - 1 || rc.right > r.right + 1)) malos.push(`${c.textContent.trim().slice(0, 40)} (${Math.round(rc.left)}–${Math.round(rc.right)} en ${Math.round(r.left)}–${Math.round(r.right)})`);
      }
    }
    return malos;
  }, selector);
  expect(fuera, fuera.join('\n')).toEqual([]);
}

for (const [ancho, alto] of TAMANOS) {
  test(`conos: los negativos no se muestran, a ${ancho}×${alto}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/conos.html?maqueta=conos`);
    await page.locator('#cn-tabs [data-vista="stock"]').click();
    const fibro = page.locator('.cn-stock-fila', { hasText: 'FIBRO' });
    await expect(fibro).toHaveCount(1);
    const stock = fibro.locator('.cn-num').first();
    await expect(stock).toHaveText('Stock0');
    await expect(stock).not.toHaveClass(/cn-negativo/);
    const alcanza = fibro.locator('.cn-num').nth(4);
    await expect(alcanza).toHaveText('Alcanza—');
    await expect(alcanza).not.toHaveClass(/cn-negativo/);
    await expect(fibro.locator('.cn-negativo')).toHaveCount(0);
    await expect(page.locator('#cn-stock-lista')).not.toContainText('-2.000');
    const alertas = page.locator('#cn-stock-alertas');
    await expect(alertas).not.toContainText('Stock negativo');
    await expect(alertas).not.toContainText('FIBRO');
    await expect(alertas).toContainText('CASERATO');
    // El aviso de "pocos" sigue en rojo en su fila.
    await expect(page.locator('.cn-stock-fila', { hasText: 'CASERATO' }).locator('.cn-num').nth(4)).toHaveClass(/cn-negativo/);
    // El conteo: "Stock según el sistema: 0".
    await fibro.locator('[data-conteo]').click();
    await expect(page.getByText('Stock según el sistema:')).toContainText('Stock según el sistema: 0');
    await sinCostado(page);
    await captura(page, `conos-sin-negativos-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`salidas entre fábricas, a ${ancho}×${alto}`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.clock.setFixedTime(new Date('2026-10-21T15:00:00-03:00'));
    // SheetJS falso: anota el libro en vez de bajar un archivo.
    await page.route('https://cdnjs.cloudflare.com/ajax/libs/xlsx/**', r => r.fulfill({
      contentType: 'application/javascript',
      body: `window.XLSX = { utils: { book_new: () => ({ hojas: [] }), aoa_to_sheet: a => a, book_append_sheet: (l, h, n) => l.hojas.push({ n, h }) },
        writeFile: (l, nombre) => { window.__excel = { nombre, hojas: l.hojas } } }`,
    }));
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/produccion-gestion.html?vista=stock&maqueta=salidas-fabricas`);
    await expect(page.locator('#pr-stock')).toBeVisible();
    await page.locator('#pr-stock-salidas').click();
    await expect(page.locator('#pr-salidas')).toBeVisible();
    await expect(page.locator('#pr-stock')).toBeHidden();

    // De entrada: Mengui y el mes actual.
    await expect(page.locator('#pr-sal-origen')).toHaveValue('u-m');
    await expect(page.locator('#pr-sal-desde')).toHaveValue('2026-10-01');
    await expect(page.locator('#pr-sal-hasta')).toHaveValue('2026-10-21');
    const filas = page.locator('#pr-sal-lista [data-salida]');
    await expect(filas).toHaveCount(3);
    const s1 = page.locator('[data-salida="s1"]');
    await expect(s1).toContainText('20/10/2026');
    await expect(s1).toContainText('Cucurucho Mini');
    await expect(s1).toContainText('Caja x 600 con cono · HELADERÍA LA AMERICANA DEL CENTRO');
    await expect(s1).toContainText('M-2026-10-20-A');
    await expect(s1).toContainText('6.000');
    await expect(s1).toContainText('Dolce Pasta');
    await expect(s1).toContainText('R-0001-00001234');
    await expect(page.locator('[data-salida="s2"]')).toContainText('—');
    await expect(page.locator('#pr-sal-totales')).toContainText('17 cajas · 8.700 unidades');
    await expect(page.locator('[data-sal-total="Cucurucho Mini"]')).toContainText('14');
    await expect(page.locator('[data-sal-total="Cucurucho Mini"]')).toContainText('8.400');
    await expect(page.locator('[data-sal-total="Barquillo"]')).toContainText('300');
    // Los campos a 16 px (sin zoom en el celular).
    expect(await page.locator('#pr-sal-producto').evaluate(el => getComputedStyle(el).fontSize)).toBe('16px');
    await sinCostado(page);
    await nadaSeSale(page, '.pr-of-salida');
    await nadaSeSale(page, '.pr-of-sal-total');
    await captura(page, `salidas-${ancho}`, info);

    // El filtro de producto.
    await page.locator('#pr-sal-producto').selectOption('Barquillo');
    await expect(filas).toHaveCount(1);
    await expect(page.locator('#pr-sal-totales')).toContainText('3 cajas · 300 unidades');

    // Exportar lo que se ve.
    await page.locator('#pr-sal-exportar').click();
    await expect.poll(() => page.evaluate(() => window.__excel?.nombre ?? null)).toBe('Salidas entre fábricas - Mengui 01-10-2026 a 21-10-2026.xlsx');
    const excel = await page.evaluate(() => window.__excel);
    expect(excel.hojas.map(h => h.n)).toEqual(['Salidas', 'Totales por producto']);
    expect(excel.hojas[0].h).toEqual([
      ['Fecha', 'Origen', 'Destino', 'Producto', 'Presentación', 'Cono', 'Lote', 'Cajas', 'Unidades', 'Remito', 'Motivo'],
      ['05/10/2026', 'Mengui', 'Dolce Pasta', 'Barquillo', 'Caja x 100', '', 'B-1', 3, 300, 'R-0001-00001190', 'Pedido de Dolce'],
    ]);
    expect(excel.hojas[1].h).toEqual([['Producto', 'Cajas', 'Unidades'], ['Barquillo', 3, 300]]);
    await expect(page.locator('#pr-sal-exportar-error')).toBeHidden();

    // Las fechas: desde septiembre entra la del 28/09 (con "Todos los productos").
    await page.locator('#pr-sal-producto').selectOption('');
    await page.locator('#pr-sal-desde').evaluate(el => { el.value = '2026-09-01'; el.dispatchEvent(new Event('change', { bubbles: true })) });
    await expect(filas).toHaveCount(4);
    await expect(page.locator('#pr-sal-totales')).toContainText('26 cajas · 9.600 unidades');

    // Otra fábrica de origen.
    await page.locator('#pr-sal-origen').selectOption('u-d');
    await expect(filas).toHaveCount(1);
    await expect(page.locator('[data-salida="s5"]')).toContainText('Cucuruchos Nuss');

    // Una fábrica sin salidas lo dice.
    await page.locator('#pr-sal-origen').selectOption('u-n');
    await expect(page.locator('#pr-sal-lista')).toHaveText('No hay salidas en este período.');
    await page.locator('#pr-sal-exportar').click();
    await expect(page.locator('#pr-sal-exportar-error')).toHaveText('No hay salidas en este período para exportar.');

    await page.locator('#pr-sal-volver').click();
    await expect(page.locator('#pr-stock')).toBeVisible();
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
