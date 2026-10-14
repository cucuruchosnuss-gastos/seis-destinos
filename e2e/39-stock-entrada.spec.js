// Stock con dos entradas (14/10/2026, pedido del 13/10, paso 4), en la
// maqueta "stock" (stock:ver y el catálogo, sin Producción): al entrar, los
// dos botones (en la compu lado a lado, en el celular uno arriba del otro);
// "Insumos y materias primas" abre la pantalla de siempre y "‹ Volver" vuelve
// a los dos botones sin recargar; ?vista=insumos los saltea; "Producto
// terminado" abre la gestión de Producción en "solo stock" con "‹ Stock".
// A 1280, 390 y 360 px, sin scroll horizontal ni errores. Corre SIEMPRE, sin
// credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

async function sinScrollHorizontal(page) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
}

for (const ancho of [1280, 390, 360]) {
  test(`stock: las dos entradas, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 860 });
    await page.goto(`${MAQUETA}/modulos/stock.html?maqueta=stock`);

    const eleccion = page.locator('#stock-eleccion');
    const terminado = page.locator('#btn-entrada-terminado');
    const insumos = page.locator('#btn-entrada-insumos');
    await expect(eleccion).toBeVisible();
    await expect(terminado).toBeVisible();
    await expect(insumos).toBeVisible();
    await expect(page.locator('#vista-stock')).toBeHidden();
    await expect(page.locator('#stock-subtitulo')).toHaveText('Elegí qué mirar');
    await expect(terminado).toHaveAttribute('href', 'produccion-gestion.html?vista=stock&desde=stock');

    const a = await terminado.boundingBox();
    const b = await insumos.boundingBox();
    if (ancho >= 640) {
      expect(Math.abs(a.y - b.y), 'en la compu, lado a lado').toBeLessThan(2);
      expect(b.x).toBeGreaterThan(a.x + a.width - 1);
    } else {
      expect(b.y, 'en el celular, uno arriba del otro').toBeGreaterThanOrEqual(a.y + a.height - 1);
      expect(a.width, 'ocupan el ancho').toBeGreaterThan(ancho - 80);
    }
    expect(a.height, 'botones grandes').toBeGreaterThanOrEqual(100);
    await sinScrollHorizontal(page);
    await captura(page, `stock-entrada-${ancho}`, info);

    // Insumos → la pantalla de siempre.
    await insumos.click();
    await expect(eleccion).toBeHidden();
    await expect(page.locator('#vista-stock')).toBeVisible();
    await expect(page.locator('#lista-stock')).not.toBeEmpty();

    // ‹ Volver → los dos botones otra vez, sin recargar.
    await page.evaluate(() => { window.__sinRecargar = true });
    await page.locator('.stock-header__volver').click();
    await expect(eleccion).toBeVisible();
    await expect(page.locator('#vista-stock')).toBeHidden();
    expect(await page.evaluate(() => window.__sinRecargar)).toBe(true);
    await sinScrollHorizontal(page);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`stock: ?vista=insumos saltea la elección, a ${ancho} px`, async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 860 });
    await page.goto(`${MAQUETA}/modulos/stock.html?vista=insumos&maqueta=stock`);
    await expect(page.locator('#vista-stock')).toBeVisible();
    await expect(page.locator('#stock-eleccion')).toBeHidden();
    // Recargar sigue en los insumos (?vista=insumos queda en la dirección).
    await page.reload();
    await expect(page.locator('#vista-stock')).toBeVisible();
    await expect(page.locator('#stock-eleccion')).toBeHidden();
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`producto terminado con solo stock:ver: la gestión en "solo stock", a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 860 });
    await page.goto(`${MAQUETA}/modulos/stock.html?maqueta=stock`);
    await page.locator('#btn-entrada-terminado').click();
    await expect(page).toHaveURL(/produccion-gestion\.html\?vista=stock&desde=stock/);
    await expect(page.locator('#pr-stock')).toBeVisible();
    await expect(page.locator('#pr-sin-acceso')).toBeHidden();
    const volver = page.locator('#pr-stock-volver');
    await expect(volver).toBeVisible();
    await expect(volver).toHaveText('‹ Stock');
    await expect(page.locator('#pr-menu')).toBeHidden();
    await sinScrollHorizontal(page);
    await captura(page, `stock-entrada-terminado-${ancho}`, info);
    await volver.click();
    await expect(page).toHaveURL(/modulos\/stock\.html/);
    await expect(page.locator('#stock-eleccion')).toBeVisible();
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
