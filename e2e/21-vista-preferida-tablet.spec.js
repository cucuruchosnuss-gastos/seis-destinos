// Bultos o kilos, como en Stock (02/10/2026), en la maqueta: la harina que
// Facu eligió ver en bultos se dice en bultos en Stock y en la ventana de lotes
// de la sala de masa (la misma regla, js/cantidades.js); la que está en kilos
// sigue en kilos. A 390 y 1280 px (Stock) y en la tablet (1000×540 y 1280×800),
// sin scroll de costado ni errores. Corre SIEMPRE, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');
const { marcarPin } = require('./pasos-planta');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

for (const ancho of [390, 1280]) {
  test(`stock: la harina en bultos, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto(`${MAQUETA}/modulos/stock.html?maqueta=stock`);
    await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
    await page.reload();
    const harina = page.locator('#lista-stock [data-stock="i-harina"]');
    await expect(harina.locator('.fila-stock__total')).toHaveText('250 bultos');
    await expect(harina).toContainText('de 25 kg · 6.250 kg');
    await captura(page, `vista-preferida-stock-${ancho}`, info);
    const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
    expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

for (const [ancho, alto] of [[1000, 540], [1280, 800]]) {
  test(`sala de masa: los lotes de la harina en bultos, a ${ancho}×${alto}`, async ({ page }, info) => {
    test.setTimeout(2 * 60 * 1000);
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=produccion`);
    await page.locator('#pr-quien-ir-masa').click();
    await page.locator('#pr-quien-lista [data-persona]', { hasText: 'Agustín Barrera' }).click();
    await marcarPin(page, '7391');
    await expect(page.locator('#pr-sala')).toBeVisible();
    await page.locator('[data-sala-turno="t1"]').first().click();
    await expect(page.locator('#pr-receta')).toBeVisible();
    await page.locator('[data-lote="i-harina"]').first().click();
    const panel = page.locator('#pr-lote-panel');
    await expect(panel).toBeVisible();
    // La Clásica (bultos de 25 kg): 2.425 kg = 97 bultos; 900 = 36; 1.500 = 60.
    await expect(panel).toContainText('97 bultos');
    await expect(panel).toContainText('36 bultos');
    await expect(panel).toContainText('60 bultos');
    await expect(panel).not.toContainText('2.425 kg');
    // Júpiter y Pureza no tienen la preferencia: siguen en kilos.
    await expect(panel).toContainText('875 kg');
    await captura(page, `vista-preferida-sala-${ancho}x${alto}`, info);
    const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
    expect(doc, `scroll de costado: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
