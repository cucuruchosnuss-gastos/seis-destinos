// UN SOLO "SIN CONO" (10/10/2026). En la maqueta (Supabase falso, sin
// credenciales), a 1000×540 (la tablet acostada) y 390×844 (un celular):
//  - la lista de conos de "Agregar producto" no tiene "Común" ni "con cono,
//    sin marca"; lo común es el botón "Sin cono";
//  - un sublote viejo con cono y sin marca (pi-1 de la maqueta) dice "Falta
//    el cono" en la planilla, nunca "Común";
//  - corregirlo abre en el paso del cono y NO se guarda sin elegir uno: se
//    dice pegado al botón; eligiendo el cono, se guarda con su marca.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./ayuda');
const { marcarPin } = require('./pasos-planta');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const persona = (page, nombre) => page.locator('#pr-quien-lista [data-persona]', { hasText: nombre });

for (const [ancho, alto] of [[1000, 540], [390, 844]]) {
  test(`con cono hay que elegir un cono con nombre, a ${ancho}×${alto}`, async ({ page }) => {
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
    const producido = page.locator('#pr-planilla-producido');
    await expect(producido).toContainText('7033-1');

    // El sublote viejo (con cono, sin marca): "Falta el cono", nunca "Común".
    await expect(producido.locator('.pr-fp__falta-cono').first()).toHaveText('Falta el cono');
    expect(await producido.innerText()).not.toMatch(/Común/);

    // Agregar producto: la lista de conos sin "Común"; "Sin cono" está.
    await page.locator('#pr-btn-agregar-producto').click();
    await page.locator('[data-ag-producto]').first().click();
    await expect(page.locator('#pr-agregar-cono')).toBeVisible();
    await expect(page.locator('#pr-agregar-marcas [data-marca]').first()).toBeVisible();
    await expect(page.locator('#pr-agregar-marcas [data-marca=""]')).toHaveCount(0);
    expect(await page.locator('#pr-agregar-marcas').innerText()).not.toMatch(/Común|sin marca/);
    await page.locator('#pr-agregar-marca-buscar').fill('com');
    await expect(page.locator('#pr-agregar-marcas [data-marca=""]')).toHaveCount(0);
    await expect(page.locator('#pr-agregar-sin-cono')).toBeEnabled();
    await page.locator('#pr-barra [data-seccion="planilla"]').click();
    await expect(page.locator('#pr-planilla')).toBeVisible();

    // Corregir el viejo: abre en el paso del cono, sin darlo por elegido.
    await producido.locator('[data-corregir="pi-1"]').click();
    await expect(page.locator('#pr-agregar-cono')).toBeVisible();
    // Ir a las cajas sin elegir el cono y querer guardar: no se manda.
    await page.locator('[data-paso-ag="cajas"]').click();
    await expect(page.locator('#pr-agregar-cajas-panel')).toBeVisible();
    await page.locator('#pr-agregar-motivo').fill('Era de CASERATO');
    await page.locator('#pr-agregar-confirmar').click();
    await expect(page.locator('#pr-agregar-error')).toContainText('Elegí el cono');
    await expect(page.locator('#pr-agregar-error')).toContainText('Sin cono');
    expect(llamadas).toHaveLength(0);

    // Eligiendo el cono, se guarda con su marca.
    await page.locator('[data-paso-ag="cono"]').click();
    await page.locator('#pr-agregar-marcas [data-marca="mc-1"]').click();
    await expect(page.locator('#pr-agregar-cajas-panel')).toBeVisible();
    await page.locator('#pr-agregar-motivo').fill('Era de CASERATO');
    await expect(page.locator('#pr-agregar-confirmar')).toBeInViewport();
    await page.locator('#pr-agregar-confirmar').click();
    await expect(page.locator('#pr-planilla')).toBeVisible();
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].p_item_id).toBe('pi-1');
    expect(llamadas[0].p_datos).toEqual({ marca_id: 'mc-1' });

    const anchoDoc = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(anchoDoc).toBeLessThanOrEqual(ancho);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
