// BUSCAR (28/10/2026, rama ci-prueba/modulo-buscar), en la maqueta "buscar"
// (pruebas/datos-maqueta/buscar.js): el lote 6262-1 con 2 masas, 1 parada y 2
// salidas, y los precios de compra de Nuss y Dolce Pasta.
//  - Lote: se escribe 6262-1 → turno (con el inicio tarde), lo producido, las
//    masas (sin el agua de 0 kg, la sal "sin ingreso encontrado"), la parada y
//    hacia adelante; "Imprimir / PDF" llama a print en el toque y la hoja
//    impresa deja solo el resultado; sin resultados y el error de la base.
//  - Precios: filtra mientras se escribe, tocando la harina su historial; con
//    "Todas" pide la fábrica con chips.
//  - La barra lateral (1280) tiene "Buscar".
// A 390 y 1280 px, sin scroll horizontal ni errores. Corre SIEMPRE, sin
// credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || `http://localhost:${process.env.E2E_PUERTO_MAQUETA || 4180}`;

async function sinScrollHorizontal(page) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
}

async function abrir(page, ancho, fabrica) {
  await page.addInitScript(f => { try { localStorage.setItem('barraUnidad.elegida', f) } catch { /* sin storage */ } }, fabrica);
  await page.setViewportSize({ width: ancho, height: 860 });
  await page.goto(`${MAQUETA}/modulos/buscar.html?maqueta=buscar`);
  await expect(page.locator('#bu-tabs [data-vista="lote"]')).toBeVisible();
}

for (const ancho of [390, 1280]) {
  test(`buscar: el lote 6262-1 con toda su fabricación, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await abrir(page, ancho, 'u-n');
    await page.locator('#bu-lote-campo').fill('6262-1');
    await page.locator('#bu-lote-buscar').click();

    const res = page.locator('#bu-lote-resultado');
    await expect(res.locator('[data-seccion="turno"] h2')).toHaveText('Lote 6262-1');
    await expect(res.locator('[data-seccion="turno"]')).toContainText('del turno 6262 · Cucuruchos Nuss');
    await expect(res.locator('[data-inicio-tarde]')).toHaveText('Inicio tarde: Faltaba gas en la línea');
    await expect(res.locator('[data-operarios] li')).toHaveCount(2);
    await expect(res.locator('[data-seccion="producido"]')).toContainText('40 cajas · 4.000 unidades');
    await expect(res.locator('[data-masa]')).toHaveCount(2);
    await expect(res.locator('[data-masa="1"]')).not.toContainText('Agua');
    await expect(res.locator('[data-masa="2"]')).toContainText('Chocolate · Doble');
    await expect(res.locator('[data-sin-ingreso]')).toHaveCount(1);
    await expect(res.locator('[data-seccion="paradas"] li')).toHaveCount(1);
    await expect(res.locator('[data-salidas] li')).toHaveCount(2);
    await expect(res.locator('[data-seccion="adelante"]')).toContainText('28 cajas');
    // El orden de las tarjetas.
    const orden = await res.locator('[data-seccion]').evaluateAll(els => els.map(e => e.dataset.seccion));
    expect(orden).toEqual(['turno', 'producido', 'masas', 'paradas', 'adelante']);
    await sinScrollHorizontal(page);
    await captura(page, `buscar-lote-${ancho}`, info);

    // Imprimir / PDF: print en el toque, y la hoja deja solo el resultado.
    await page.evaluate(() => { window.__impresiones = 0; window.print = () => { window.__impresiones++ } });
    await page.locator('#bu-imprimir').click();
    expect(await page.evaluate(() => window.__impresiones)).toBe(1);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('#bu-lote-form')).toBeHidden();
    await expect(page.locator('#bu-imprimir')).toBeHidden();
    await expect(page.locator('#version-banner')).toBeHidden();
    await expect(page.locator('.bu-hoja-titulo h1')).toHaveText('Trazabilidad del lote 6262-1');
    await expect(res.locator('[data-seccion="masas"]')).toBeVisible();
    await page.emulateMedia({ media: 'screen' });

    // Sin resultados y lote mal escrito.
    await page.locator('#bu-lote-campo').fill('9999');
    await page.locator('#bu-lote-buscar').click();
    await expect(page.locator('#bu-lote-aviso')).toHaveText('No se encontró ese lote en Cucuruchos Nuss.');
    await expect(res.locator('[data-seccion]')).toHaveCount(0);
    await page.locator('#bu-lote-campo').fill('ABC');
    await page.locator('#bu-lote-campo').press('Enter');
    await expect(page.locator('#bu-lote-aviso .bu-error')).toHaveText('Escribí el lote como está en la caja, por ejemplo 6262-1.');
    await sinScrollHorizontal(page);
    expect(errores).toEqual([]);
  });

  test(`buscar: precios de compra con el buscador y el historial, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await abrir(page, ancho, 'u-n');
    await page.locator('#bu-tabs [data-vista="precios"]').click();
    const lista = page.locator('#bu-precios-lista');
    await expect(lista.locator('[data-precio]')).toHaveCount(3);
    await expect(page.locator('#bu-precios-unidades')).toBeHidden();
    await page.locator('#bu-precios-campo').pressSequentially('azucar');
    await expect(lista.locator('[data-precio]')).toHaveCount(1);
    await expect(lista).toContainText('Ledesma');
    await page.locator('#bu-precios-campo').fill('harina');
    await expect(lista.locator('[data-precio]')).toHaveCount(1);
    const harina = lista.locator('[data-precio-fila="i-harina"]');
    await expect(harina.locator('[data-col="unitario"]')).toHaveText('$ 1.100,00 por kg');
    await expect(harina.locator('[data-col="iva"]')).toHaveText('21 %');
    await expect(harina.locator('[data-col="final"]')).toHaveText('$ 1.331,00 por kg');
    await expect(harina.locator('[data-col="bulto"]')).toHaveText('Por bolsa de 25 kg con IVA: $ 33.275,00');
    await expect(harina).toContainText('Compra · Molino del Sur · Factura A 0001-00004321 · 20/10/2026');
    await harina.locator('[data-precio]').click();
    await expect(harina.locator('[data-hist="compra"]')).toHaveCount(2);
    await expect(harina.locator('[data-hist="manual"]')).toHaveCount(1);
    await sinScrollHorizontal(page);
    await captura(page, `buscar-precios-${ancho}`, info);
    await harina.locator('[data-precio]').click();
    await expect(harina.locator('[data-historial]')).toHaveCount(0);
    expect(errores).toEqual([]);
  });
}

test('buscar: con "Todas", Precios pide la fábrica con chips, a 390 px', async ({ page }) => {
  const errores = vigilarErrores(page);
  await abrir(page, 390, 'todas');
  await page.locator('#bu-tabs [data-vista="precios"]').click();
  await expect(page.locator('#bu-precios-aviso')).toHaveText('Elegí de qué fábrica ver los precios: cada fábrica tiene los suyos.');
  await page.locator('[data-unidad-precios="u-d"]').click();
  await expect(page.locator('#bu-precios-lista [data-precio]')).toHaveCount(1);
  await expect(page.locator('#bu-precios-lista')).toContainText('Sémola');
  await sinScrollHorizontal(page);
  expect(errores).toEqual([]);
});

test('buscar: la barra lateral tiene "Buscar", a 1280 px', async ({ page }) => {
  await abrir(page, 1280, 'u-n');
  await expect(page.locator('a[href$="modulos/buscar.html"]').first()).toBeVisible();
});
