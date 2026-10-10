// Costos de insumos (09/10/2026), en la maqueta: en Stock el total valorizado
// y el valor de cada insumo, la pantalla "Costos" (los sin costo arriba, la
// variación ↑ / ↓) y el modal de un insumo (escribir por bulto de 25 kg →
// por kg; el historial con Anular y su confirmación propia), ENTERO a la
// vista; en Administración → una lista, los renglones de insumos a precio fijo
// o a costo + %. A 390 y 1280 px, sin scroll horizontal ni errores. Corre
// SIEMPRE, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

async function sinScrollHorizontal(page) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
}

// El panel del modal entero adentro de la pantalla (con su propio scroll si
// hace falta: lo que importa es que no se salga ni a los costados ni abajo).
async function modalEnteroALaVista(page, sel) {
  const caja = await page.locator(sel).boundingBox();
  const vista = page.viewportSize();
  expect(caja, 'el modal tiene caja').not.toBeNull();
  expect(caja.x).toBeGreaterThanOrEqual(0);
  expect(caja.y).toBeGreaterThanOrEqual(0);
  expect(caja.x + caja.width).toBeLessThanOrEqual(vista.width + 0.5);
  expect(caja.y + caja.height).toBeLessThanOrEqual(vista.height + 0.5);
}

for (const ancho of [390, 1280]) {
  test(`stock: costos y stock valorizado, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 860 });
    await page.goto(`${MAQUETA}/modulos/stock.html?maqueta=stock-costos`);
    await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
    await page.reload();

    const total = page.locator('#stock-valorizado');
    await expect(total).toHaveText('Stock valorizado: $ 6.942.901,54 · 1 insumo sin costo');
    const lista = page.locator('#lista-stock');
    await expect(lista.locator('.valor-stock').first()).toBeVisible();
    await expect(lista).toContainText('sin costo');
    await expect(lista).toContainText('Valor $ 6.875.000,00');
    await sinScrollHorizontal(page);
    await captura(page, `costos-stock-${ancho}`, info);

    // Con "Todas" y dos fábricas con costos: se pide la fábrica.
    await page.locator('.barra-unidad__chip[data-unidad="todas"]').first().click();
    await expect(total).toContainText('Elegí una fábrica arriba para ver el stock valorizado.');
    await page.locator('.barra-unidad__chip[data-unidad="u-n"]').first().click();
    await expect(total).toContainText('Stock valorizado: $');

    // La pantalla de costos.
    await page.locator('#btn-ver-costos').click();
    const costos = page.locator('#lista-costos');
    await expect(costos.locator('[data-costo]').first()).toHaveAttribute('data-costo', 'i-caja');
    await expect(costos).toContainText('Sin costo');
    await expect(costos.locator('.variacion-costo--sube')).toHaveText('↑ 12,2 %');
    await expect(costos.locator('.variacion-costo--baja')).toHaveText('↓ 9,5 %');
    await sinScrollHorizontal(page);
    await captura(page, `costos-lista-${ancho}`, info);

    // El modal de la harina: por bulto de 25 kg.
    await costos.locator('[data-costo="i-harina"]').click();
    const modal = page.locator('#modal-costo');
    await expect(modal).toBeVisible();
    await expect(page.locator('#costo-precio-rotulo')).toHaveText('Precio por bulto de 25 kg');
    await page.locator('#costo-precio').fill('27500');
    await expect(page.locator('#costo-equivale')).toHaveText('→ $ 1.100,00 por kg');
    await expect(page.locator('#costo-historial')).toContainText('Factura de octubre del molino');
    await expect(page.locator('#costo-historial .costo-hist--anulado')).toHaveCount(1);
    await expect(page.locator('#costo-historial .costo-hist__anulado')).toHaveText('Anulado por Facu Maqueta el 01/09/2026');
    await modalEnteroALaVista(page, '#modal-costo .modal-stock__panel');
    await sinScrollHorizontal(page);
    await captura(page, `costos-modal-${ancho}`, info);

    // Anular pide la confirmación propia (nunca confirm()).
    page.on('dialog', d => { throw new Error('apareció un diálogo del navegador: ' + d.message()) });
    await page.locator('#costo-historial [data-costo-anular="ic-2"]').click();
    await expect(page.locator('#costo-historial .costo-hist__confirmar')).toContainText('¿Anular el costo de $ 980,00 por kg');
    await page.locator('#costo-historial [data-costo-anular-no]').click();
    await expect(page.locator('#costo-historial .costo-hist__confirmar')).toHaveCount(0);

    // Guardar.
    await page.locator('#btn-guardar-costo').click();
    await expect(page.locator('#costo-error')).toBeHidden();
    await page.locator('#modal-costo .modal-stock__cerrar').click();
    await expect(modal).toBeHidden();
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`administración: insumos de una lista a precio fijo o costo + %, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: 860 });
    await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=administracion-costos`);
    await page.locator('[data-seccion="listas"]').click();
    await page.locator('[data-lista="l1"]').click();
    const card = page.locator('#ad-lista-insumos');
    await expect(card).toContainText('Precio fijo $ 1.500,00 por kg');
    await expect(card).toContainText('Costo + 15 %');
    await expect(card.locator('.ad-insumo-precio--sin-costo')).toContainText('falta cargar el costo');
    // La base ya usa estos precios al valorizar (09/10/2026): el aviso viejo no está.
    await expect(card).not.toContainText('todavía');
    await expect(card).toContainText('Es el precio que se propone al valorizar una orden');
    await sinScrollHorizontal(page);
    await captura(page, `costos-lista-precios-${ancho}`, info);

    // Costo + 15 % sobre $ 1.000: la vista previa dice $ 1.150.
    await page.locator('#ad-lista-insumos [data-insumo-precio-editar="ins-1"]').click();
    await page.locator('#ad-ins-modo [data-ins-modo="costo"]').click();
    await page.locator('#ad-ins-pct').fill('15');
    await expect(page.locator('#ad-ins-previa')).toContainText('$ 1.150,00');
    await sinScrollHorizontal(page);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
