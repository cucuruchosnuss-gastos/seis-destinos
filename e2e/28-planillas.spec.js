// PLANILLAS (08/10/2026): en la gestión de Producción, la lista de planillas
// (antes "Historial") se llama "Planillas", arranca en las CERRADAS y las
// abiertas están a un toque. En la maqueta, a tamaño tablet (1000 × 540) y a
// 390 px. Corre en cada push, sin credenciales.
//
// La maqueta tiene una sola planilla, la 7021, cerrada el 25/09/2026: el reloj
// va al 26/09/2026 para que entre en los últimos 7 días.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = 'http://localhost:4180';
const TAMANOS = [[1000, 540], [390, 844]];

for (const [ancho, alto] of TAMANOS) {
  test(`Planillas arranca en Cerradas y Abiertas a un toque, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await page.clock.setFixedTime(new Date('2026-09-26T15:00:00Z'));
    await page.goto(`${MAQUETA}/modulos/produccion-gestion.html?maqueta=produccion-gestion`);
    const menu = page.locator('#pr-btn-menu');
    if (await menu.isVisible()) await menu.click();
    const item = page.locator('#pr-menu-historial');
    await expect(item).toHaveText('Planillas');
    await item.click();
    await expect(page.locator('#pr-historial')).toBeVisible();
    await expect(page.locator('#pr-historial .pr-titulo').first()).toHaveText('Planillas');

    const seg = page.locator('#pr-historial-estados');
    await expect(seg.locator('[data-historial-estado="cerrado"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(seg.locator('[data-historial-estado="abierto"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#pr-historial-lista')).toContainText('7021');

    // El segmentado entra en la pantalla y no hay scroll de costado.
    const caja = await seg.boundingBox();
    expect(caja.x).toBeGreaterThanOrEqual(0);
    expect(caja.x + caja.width).toBeLessThanOrEqual(ancho + 0.5);
    const deCostado = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(deCostado).toBe(false);
    for (const b of await seg.locator('[data-historial-estado]').all()) {
      const bb = await b.boundingBox();
      expect(bb.height).toBeGreaterThanOrEqual(43.5);
    }
    await captura(page, `planillas-cerradas-${ancho}`, info);

    // A un toque: las abiertas (en la maqueta no hay ninguna).
    await seg.locator('[data-historial-estado="abierto"]').click();
    await expect(seg.locator('[data-historial-estado="abierto"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(seg.locator('[data-historial-estado="cerrado"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#pr-historial-lista')).toContainText('No hay turnos con esos filtros');
    await expect(page.locator('#pr-historial-lista')).not.toContainText('7021');

    // Todas: vuelve a aparecer la cerrada.
    await seg.locator('[data-historial-estado=""]').click();
    await expect(page.locator('#pr-historial-lista')).toContainText('7021');
    await captura(page, `planillas-todas-${ancho}`, info);
    expect(errores).toEqual([]);
  });
}
