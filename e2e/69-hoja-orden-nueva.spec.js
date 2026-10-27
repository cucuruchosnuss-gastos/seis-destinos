// LA HOJA NUEVA DE LA ORDEN (26/10/2026, rama ci-prueba/hoja-orden-nueva), en
// la maqueta "retiros-hoja-nueva", a 390 y 1280 px: se abre cada orden de
// "Mis retiros" (la hoja se arma al abrirla) y se mira la hoja de impresión:
//  - las columnas CANT. | PRODUCTO | DESCRIPCIÓN | TOTAL | LOTE;
//  - N-0099 (todos los casos del pedido): ×240 en dos lotes "6262-1 (30) ·
//    6263-2 (12)", ×224 con cono DUOMO (en negrita), ×160, ×128, "Wali ·
//    bolsa de 25 kg", "Nico · bidón de 25 kg", "Sin impresión · por unidad";
//    nunca "sin cono", "doble bolsa", "media caja" ni el nombre de la
//    presentación; la fila TOTAL;
//  - N-0031 (solo insumos): "TOTAL · 20 bultos + 160 un." y 565 kg;
//  - N-0032: "TOTAL · 42 cajas de producto";
//  - en media hoja, original y duplicado, nada cortado ni afuera de su copia.
// Corre SIEMPRE, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || `http://localhost:${process.env.E2E_PUERTO_MAQUETA || 4180}`;
const TAMANOS = [[390, 844], [1280, 900]];

async function abrirOrden(page, id) {
  page.setDefaultTimeout(15000);
  await page.goto(`${MAQUETA}/modulos/retiros.html?maqueta=retiros-hoja-nueva`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.removeItem('retiros.borrador'); window.print = () => {}; });
  await page.locator('[data-empresa="u-n"]').click();
  await page.locator('#rt-btn-mis').click();
  await page.locator(`[data-mia="${id}"]`).click();
  await expect(page.locator('#rt-vista-mio')).toBeVisible();
  await expect.poll(() => page.locator('#rt-impresion .rh-copia').count()).toBe(2);
}

// Las filas de la primera copia, como texto por celda.
const filas = (page) => page.locator('#rt-impresion .rh-copia').first().locator('tr').evaluateAll(trs =>
  trs.map(tr => [...tr.children].map(td => td.innerText.replace(/\s+/g, ' ').trim())));

// En modo impresión: cada copia en su media hoja, nada se sale, nada cortado.
async function revisarImpresa(page) {
  await page.emulateMedia({ media: 'print' });
  const r = await page.evaluate(() => {
    const mm = (px) => px / (96 / 25.4);
    const copias = [...document.querySelectorAll('#rt-impresion .rh-copia')];
    const problemas = [];
    for (const c of copias) {
      const rc = c.getBoundingClientRect();
      if (c.scrollHeight > c.clientHeight + 1) problemas.push('la copia se pasa de su alto');
      for (const el of c.querySelectorAll('tbody tr, tfoot tr, .rh-pie, .rh-legal')) if (el.getBoundingClientRect().bottom > rc.bottom + 0.5) problemas.push('afuera: ' + (el.className || el.tagName));
      for (const el of c.querySelectorAll('.rh-producto, .rh-desc, .rh-tot, .rh-lote')) if (el.scrollWidth > el.clientWidth + 1) problemas.push('cortado: ' + el.className + ' ' + el.textContent.slice(0, 30));
    }
    return { copias: copias.length, media: !!document.querySelector('#rt-impresion .rh-hoja--media'), altos: copias.map(c => mm(c.getBoundingClientRect().height)), problemas };
  });
  await page.emulateMedia({ media: 'screen' });
  return r;
}

for (const [ancho, alto] of TAMANOS) {
  test(`la hoja nueva con todos los casos (N-0099), a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirOrden(page, 'o-n99');
    const f = await filas(page);
    expect(f[0]).toEqual(['CANT.', 'PRODUCTO', 'DESCRIPCIÓN', 'TOTAL', 'LOTE']);
    expect(f[1]).toEqual(['42', 'Cucuruchón Grande', '×240', '10.080 un.', '6262-1 (30) · 6263-2 (12)']);
    expect(f[2]).toEqual(['5', 'Cucuruchón Grande', '×224 · con cono DUOMO', '1.120 un.', '6270']);
    expect(f[3]).toEqual(['3', 'Cucuruchón Mini', '×160', '480 un.', '6271']);
    expect(f[4]).toEqual(['10', 'Cucuruchón Chico', '×128', '1.280 un.', '6250']);
    expect(f[5]).toEqual(['5', 'Harina 000', 'Wali · bolsa de 25 kg', '125 kg', 'W-0910 (75 kg) · W-0915 (50 kg)']);
    expect(f[6]).toEqual(['1', 'Colorante', 'Nico · bidón de 25 kg', '25 kg', 'C-77']);
    expect(f[7]).toEqual(['80', 'Caja media altura', 'Sin impresión · por unidad', '80 un.', '—']);
    expect(f[8].slice(0, 2)).toEqual(['TOTAL · 60 cajas de producto + 6 bultos + 80 un.', '150 kg']);
    // El cono en negrita y la cantidad del lote más chica.
    const hoja = page.locator('#rt-impresion .rh-copia').first();
    await expect(hoja.locator('.rh-cono')).toHaveText('DUOMO');
    expect(await hoja.locator('.rh-cono').evaluate(el => Number(getComputedStyle(el).fontWeight))).toBeGreaterThanOrEqual(700);
    expect(await hoja.locator('.rh-producto').first().evaluate(el => Number(getComputedStyle(el).fontWeight))).toBeGreaterThanOrEqual(700);
    const [tamLote, tamCant] = await hoja.locator('.rh-lote').first().evaluate(el => [parseFloat(getComputedStyle(el).fontSize), parseFloat(getComputedStyle(el.querySelector('.rh-lote__cant')).fontSize)]);
    expect(tamCant, 'la cantidad del lote, más chica').toBeLessThan(tamLote);
    const texto = (await page.locator('#rt-impresion').innerText()).toLowerCase();
    for (const nunca of ['sin cono', 'doble bolsa', 'media caja', 'media altura doble', 'caja con cono', 'caja sin cono']) expect(texto, `nunca "${nunca}"`).not.toContain(nunca);
    const imp = await revisarImpresa(page);
    expect(imp.copias).toBe(2);
    expect(imp.media, 'en media hoja').toBe(true);
    expect(imp.problemas, imp.problemas.join('\n')).toEqual([]);
    await page.emulateMedia({ media: 'print' });
    await captura(page, `hoja-nueva-n0099-${ancho}`, info);
    await page.emulateMedia({ media: 'screen' });
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`la hoja nueva de las órdenes reales N-0031 y N-0032, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirOrden(page, 'o-n31');
    let f = await filas(page);
    expect(f.slice(1, 7)).toEqual([
      ['3', 'Azúcar', 'Bolsa de 50 kg', '150 kg', '—'],
      ['10', 'Harina 000', 'Júpiter · bolsa de 25 kg', '250 kg', '—'],
      ['5', 'Harina 000', 'Wali · bolsa de 25 kg', '125 kg', '—'],
      ['2', 'Óleo margarina', 'Cordobesa · caja de 20 kg', '40 kg', '—'],
      ['80', 'Caja capelina', 'Sin impresión · por unidad', '80 un.', '—'],
      ['80', 'Bolsa 100x80', 'Por unidad', '80 un.', '—'],
    ]);
    expect(f[7].slice(0, 2)).toEqual(['TOTAL · 20 bultos + 160 un.', '565 kg']);
    let imp = await revisarImpresa(page);
    expect(imp.problemas, imp.problemas.join('\n')).toEqual([]);
    await page.emulateMedia({ media: 'print' });
    await captura(page, `hoja-nueva-n0031-${ancho}`, info);
    await page.emulateMedia({ media: 'screen' });

    await abrirOrden(page, 'o-n32');
    f = await filas(page);
    expect(f[1]).toEqual(['42', 'Cucuruchón Grande', '×240', '10.080 un.', '6262-1 (30) · 6263-2 (12)']);
    expect(f[2][0]).toBe('TOTAL · 42 cajas de producto');
    imp = await revisarImpresa(page);
    expect(imp.problemas, imp.problemas.join('\n')).toEqual([]);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
