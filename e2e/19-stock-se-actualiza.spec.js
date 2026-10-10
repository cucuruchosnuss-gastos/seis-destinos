// Stock se actualiza solo (02/10/2026), en la maqueta: "Actualizado recién"
// arriba con "Actualizar"; con un formulario abierto NO refresca y dice "Hay
// datos nuevos"; cerrado el formulario, a los 2 minutos se relee solo; el botón
// relee ya. A 390 y 1280 px, sin scroll horizontal ni errores. Corre SIEMPRE,
// sin credenciales. El reloj lo maneja Playwright (page.clock).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

// Cambia la cantidad de la lecitina (Nuss) en la "base" de la maqueta. Con una
// fila NUEVA: la maqueta devuelve los mismos objetos, y tocar el de adentro
// cambiaría también lo que la pantalla ya tiene dibujado.
async function lecitina(page, cantidad) {
  await page.evaluate(c => {
    const t = globalThis.__maquetaTablas.v_stock_insumos;
    const i = t.findIndex(f => f.insumo_id === 'i-lecitina');
    t[i] = { ...t[i], cantidad_total: c };
  }, cantidad);
}

for (const ancho of [390, 1280]) {
  test(`stock se actualiza solo y no pisa un formulario abierto, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.clock.install();
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto(`${MAQUETA}/modulos/stock.html?maqueta=stock`);
    const texto = page.locator('#stock-actualizado-texto');
    await expect(texto).toHaveText('Actualizado recién');
    await expect(page.locator('#btn-actualizar-stock')).toBeVisible();
    const lista = page.locator('#lista-stock');
    await expect(lista).toContainText('12,5 kg');

    // Con "Corregir stock" abierto, un cambio en la base NO se dibuja.
    await page.locator('#btn-registrar-movimiento').click();
    await expect(page.locator('#modal-movimiento')).toBeVisible();
    await lecitina(page, 99);
    await page.clock.fastForward(20_000);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(texto).toHaveText('Hay datos nuevos');
    await expect(lista).toContainText('12,5 kg');
    await expect(lista).not.toContainText('99 kg');
    await captura(page, `stock-datos-nuevos-${ancho}`, info);

    // Cerrado el formulario, a los 2 minutos se relee solo.
    await page.locator('#modal-movimiento .modal-stock__cerrar').click();
    await expect(page.locator('#modal-movimiento')).toBeHidden();
    await page.clock.fastForward(2 * 60_000 + 1_000);
    await expect(lista).toContainText('99 kg');
    await expect(texto).toHaveText('Actualizado recién');

    // El botón relee ya.
    await lecitina(page, 77);
    await page.locator('#btn-actualizar-stock').click();
    await expect(lista).toContainText('77 kg');

    // Pasado más de un minuto sin refresco, dice hace cuánto (el texto se
    // reescribe cada 30 s, y el próximo refresco solo llega a los 2 min).
    await page.clock.fastForward(91_000);
    await expect(texto).toHaveText('Actualizado hace 1 min');

    const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
    expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
    await captura(page, `stock-actualizado-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
