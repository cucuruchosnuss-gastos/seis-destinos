// CORREGIR TODO UN SUBLOTE EN LA PLANTA (08/10/2026). En la maqueta (Supabase
// falso, sin credenciales), a 1000×540 (la tablet acostada) y 390×844: se
// entra con el PIN, se abre la planilla, se toca "Corregir" en un renglón de
// lo producido, se cambia el CONO y las CAJAS, se escribe el motivo y se
// guarda. La maqueta responde corregir_produccion_item_completo y anota los
// parámetros en la consola: tienen que ir SOLO el cono y las cajas.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./ayuda');
const { marcarPin } = require('./pasos-planta');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const persona = (page, nombre) => page.locator('#pr-quien-lista [data-persona]', { hasText: nombre });

for (const [ancho, alto] of [[1000, 540], [390, 844]]) {
  test(`corregir el cono y las cajas de un sublote a ${ancho}×${alto}`, async ({ page }) => {
    test.setTimeout(2 * 60 * 1000);
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    const llamadas = [];
    page.on('console', async (msg) => {
      const args = msg.args();
      if (args.length < 3) return;
      const [a, b] = [await args[0].jsonValue().catch(() => null), await args[1].jsonValue().catch(() => null)];
      if (a === '[maqueta] rpc' && b === 'corregir_produccion_item_completo') llamadas.push(await args[2].jsonValue());
    });
    await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=produccion`);

    await persona(page, 'Federico Silva').click();
    await marcarPin(page, '4826');
    await expect(page.locator('#pr-barra')).toContainText('Federico Silva');
    await page.locator('[data-producido]').first().click();
    await expect(page.locator('#pr-planilla-producido')).toContainText('7033-3');

    // Corregir el renglón 7033-3 (con cono FABRI, 25 cajas).
    await page.locator('#pr-planilla-producido [data-corregir="pi-3"]').click();
    await expect(page.locator('#pr-agregar-prod')).toBeVisible();
    await expect(page.locator('#pr-agregar-confirmar')).toHaveText('Guardar la corrección');

    // Sin cambiar nada y con motivo: no se manda y se dice.
    await page.locator('#pr-agregar-motivo').fill('Se cargó otro cono');
    await page.locator('#pr-agregar-confirmar').click();
    await expect(page.locator('#pr-agregar-error')).toContainText('No cambiaste nada');
    expect(llamadas).toHaveLength(0);

    // El cono: volver a ese paso y elegir CASERATO.
    await page.locator('[data-paso-ag="cono"]').click();
    await page.locator('#pr-agregar-marcas [data-marca="mc-1"]').click();
    await expect(page.locator('#pr-agregar-cajas-panel')).toBeVisible();
    // Las cajas: 30.
    const cajas = page.locator('#pr-agregar-cajas');
    await cajas.fill('30');
    await cajas.blur();
    await page.locator('#pr-agregar-motivo').fill('Se cargó otro cono');
    await expect(page.locator('#pr-agregar-confirmar')).toBeInViewport();
    await page.locator('#pr-agregar-confirmar').click();

    await expect(page.locator('#pr-planilla')).toBeVisible();
    await expect(page.locator('.toast').last()).toContainText('Sublote 7033-3 corregido.');
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0]).toEqual({ p_item_id: 'pi-3', p_datos: { marca_id: 'mc-1', cajas: 30 }, p_motivo: 'Se cargó otro cono' });

    // Sin scroll de costado.
    const anchoDoc = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(anchoDoc).toBeLessThanOrEqual(ancho);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
