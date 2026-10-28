// La venta por unidad (27/10/2026, rama ci-prueba/venta-por-unidad), en la
// maqueta "retiros-venta-por-unidad": una orden a TURI de 3 cajas de
// Cucuruchón Grande + 720 conos GIOVANI ("Conos de papel sueltos · Por cono",
// sin_stock). Los conos están en el catálogo sin buscar y sin "sin stock", no
// piden lote ni "¿De dónde salen?", la pregunta es "¿Cuántos conos se
// lleva?" y a la base van 720 "cajas" sin lotes. Después, la N-0035 en "Mis
// retiros": "3 cajas + 720 conos", y la hoja: CANT. 720 | Conos de papel
// sueltos | con cono GIOVANI | 720 un. y "TOTAL · 3 cajas de producto + 720
// un." (no "723 cajas"). A 390 y 1280 px, sin scroll de costado ni errores.
// Corre SIEMPRE, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const TAMANOS = [[390, 844], [1280, 900]];

async function sinCostado(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

function anotarRpc(page) {
  const rpc = [];
  page.on('console', async m => {
    if (!m.text().startsWith('[maqueta] rpc')) return;
    const [, nombre, params] = m.args();
    try { rpc.push({ nombre: await nombre.jsonValue(), params: await params.jsonValue() }); } catch {}
  });
  return rpc;
}

for (const [ancho, alto] of TAMANOS) {
  test(`Turi: 3 cajas de Cucuruchón Grande + 720 conos GIOVANI, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    page.setDefaultTimeout(15000);
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/retiros.html?maqueta=retiros-venta-por-unidad`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { localStorage.removeItem('retiros.borrador'); window.print = () => {}; });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-empresa="u-n"]').click();
    await page.locator('#rt-cliente-buscar').fill('turi');
    await page.locator('[data-cliente="c-turi"]').first().click();

    // 3 cajas de Cucuruchón Grande, como siempre.
    await page.locator('#rt-renglones [data-r-producto][data-presentacion="pr1"]').first().click();
    await page.locator('[data-r-cajas="0"]').fill('3');
    await page.locator('[data-r-listo="0"]').click();

    // Los conos sueltos: en el catálogo sin buscar, sin "sin stock".
    await page.locator('#rt-agregar').click();
    const opcion = page.locator('#rt-renglones [data-r-producto][data-presentacion="pr-conos"]').first();
    await expect(opcion).toBeVisible();
    await expect(opcion).not.toContainText('sin stock');
    await opcion.click();
    await page.locator('[data-r-marca="1"][data-id="m-giovani"]').click();
    const editor = page.locator('[data-renglon="1"]');
    await expect(editor.locator('label[for="rt-r-cajas-1"]')).toHaveText('¿Cuántos conos se lleva?');
    await expect(editor).not.toContainText('¿Cuántas cajas');
    await expect(editor).not.toContainText('Buscando los lotes');
    await expect(editor).not.toContainText('Completar con los más viejos');
    await expect(editor).not.toContainText('¿De dónde salen?');
    await expect(editor.locator('[data-r-lm-lote]')).toHaveCount(0);
    await expect(editor.locator('.rt-lotes')).toHaveCount(0);
    await page.locator('[data-r-cajas="1"]').fill('720');
    await expect(page.locator('[data-r-listo="1"]')).toHaveText('Agregar · 720 conos');
    expect(await sinCostado(page), 'sin scroll de costado en el renglón').toBe(true);
    await captura(page, `venta-unidad-renglon-${ancho}`, info);
    await page.locator('[data-r-listo="1"]').click();

    // La orden armada y el resumen: "3 cajas + 720 conos".
    const tarjeta = page.locator('.rt-item', { hasText: 'Conos de papel sueltos' });
    await expect(tarjeta.locator('.rt-item__cant')).toHaveText(/720\s*conos/);
    await expect(tarjeta).toContainText('va sin lote');
    await page.locator('#rt-revisar').click();
    await expect(page.locator('#rt-vista-resumen')).toBeVisible();
    await expect(page.locator('#rt-resumen')).toContainText('Va sin lote');
    await expect(page.locator('#rt-resumen')).not.toContainText('720 cajas');
    expect(await sinCostado(page), 'sin scroll de costado en el resumen').toBe(true);
    await captura(page, `venta-unidad-resumen-${ancho}`, info);
    await page.locator('#rt-confirmar').click();
    await expect(page.locator('#rt-hecho')).toContainText('N-0035');
    const reg = rpc.find(r => r.nombre === 'registrar_orden_retiro');
    const conos = reg?.params?.p_items?.find(i => i.presentacion_id === 'pr-conos');
    expect(conos, 'los conos van a la base').toEqual({ presentacion_id: 'pr-conos', marca_id: 'm-giovani', cajas: 720 });

    // Mis retiros y la ficha: "3 cajas + 720 conos" (se entra de nuevo, como
    // quien vuelve a la Carga).
    await page.goto(`${MAQUETA}/modulos/retiros.html?maqueta=retiros-venta-por-unidad`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { localStorage.removeItem('retiros.borrador'); window.print = () => {}; });
    await page.locator('[data-empresa="u-n"]').click();
    await page.locator('#rt-btn-mis').click();
    const fila = page.locator('[data-mia="o-35"]');
    await expect(fila).toContainText('3 cajas + 720 conos');
    await fila.click();
    await expect(page.locator('#rt-vista-mio')).toBeVisible();
    await expect(page.locator('#rt-vista-mio')).toContainText('720 conos · Conos de papel sueltos');
    await expect(page.locator('#rt-vista-mio')).not.toContainText('720 cajas');
    await expect(page.locator('#rt-vista-mio .rt-total__valor')).toHaveText('3 cajas + 720 conos');

    // La hoja.
    await expect.poll(() => page.locator('#rt-impresion .rh-copia').count()).toBe(2);
    const filas = await page.locator('#rt-impresion .rh-copia').first().locator('tr').evaluateAll(trs =>
      trs.map(tr => [...tr.children].map(td => td.innerText.replace(/\s+/g, ' ').trim())));
    const fConos = filas.find(f => f[1] === 'Conos de papel sueltos');
    expect(fConos?.slice(0, 4), 'el renglón de los conos').toEqual(['720', 'Conos de papel sueltos', 'con cono GIOVANI', '720 un.']);
    const total = filas.find(f => /^TOTAL/.test(f[0] ?? ''));
    expect(total?.[0]).toBe('TOTAL · 3 cajas de producto + 720 un.');
    expect(filas.flat().join(' ')).not.toContain('723');
    expect(await sinCostado(page), 'sin scroll de costado en la ficha').toBe(true);
    await captura(page, `venta-unidad-ficha-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
