// El producto terminado de Stock (23/10/2026), en la maqueta
// "stock-terminado" (stock:ver y stock:ajustar_inventario en Nuss y Dolce
// Pasta, con lotes en negativo y ajustes con motivo). A 360, 390, tablet
// (768x1024) y 1280 px: la lista compacta agrupada por producto, sin lotes a
// la vista; al tocar una línea, sus lotes (lo negativo en rojo) y sus
// movimientos; "Corregir stock" restando cajas manda UNA llamada a
// ajustar_stock_terminado con las cajas en negativo; el error de la base se
// ve tal cual. Sin scroll horizontal ni errores de JavaScript. Corre SIEMPRE,
// sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

async function sinScrollHorizontal(page) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
}

for (const [ancho, alto] of [[360, 800], [390, 844], [768, 1024], [1280, 900]]) {
  test(`stock: producto terminado, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpcs = [];
    page.on('console', m => { if (m.text().startsWith('[maqueta] rpc')) rpcs.push(m.text()); });
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/stock.html?maqueta=stock-terminado`);
    await page.locator('#btn-entrada-terminado').click();

    const lista = page.locator('#ptm-lista');
    await expect(lista.locator('.ptm-producto').first()).toBeVisible();
    await expect(page.locator('#pestanas-stock')).toBeHidden();
    // Agrupado por producto, una línea por presentación + cono, sin lotes.
    await expect(lista.locator('.ptm-producto__nombre').first()).toHaveText('Cucuruchón Mini');
    const aspen = lista.locator('.ptm-linea__fila', { hasText: 'Caja con cono · ASPEN ×320' });
    await expect(aspen).toBeVisible();
    await expect(aspen.locator('.ptm-linea__cajas')).toHaveText('45 cajas');
    await expect(lista.locator('.ptm-lote')).toHaveCount(0);
    // Lo negativo en rojo.
    const lolo = lista.locator('.ptm-linea__fila', { hasText: 'LOLO' });
    const color = await lolo.locator('.ptm-linea__cajas').evaluate(el => getComputedStyle(el).color);
    expect(color, 'el total negativo en rojo').toBe('rgb(155, 46, 46)');
    // Letra chica: las líneas en 13 px.
    const tam = await aspen.locator('.ptm-linea__nombre').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(tam).toBeLessThanOrEqual(13.5);
    await sinScrollHorizontal(page);
    await captura(page, `stock-terminado-lista-${ancho}`, info);

    // Buscar.
    await page.locator('#buscador-terminado').fill('aspen');
    await expect(lista.locator('.ptm-linea')).toHaveCount(1);
    await page.locator('#buscador-terminado').fill('');

    // Al tocar la línea: sus lotes, con el negativo en rojo, y los movimientos.
    const mini = lista.locator('.ptm-linea__fila', { hasText: 'Caja sin cono ×320' }).first();
    await mini.click();
    await expect(mini).toHaveAttribute('aria-expanded', 'true');
    const lotes = lista.locator('.ptm-lote');
    await expect(lotes).toHaveCount(4);
    const neg = lista.locator('.ptm-lote--neg');
    await expect(neg).toHaveCount(1);
    await expect(neg.locator('.ptm-lote__cajas')).toHaveText('-4 cajas');
    await lista.locator('[data-ptm-historial]').first().click();
    await expect(lista.locator('.ptm-hist__motivo').first()).toContainText('Corrección de carga');
    await sinScrollHorizontal(page);
    await captura(page, `stock-terminado-lotes-${ancho}`, info);

    // Corregir stock: restar 3 del 6201-1.
    await lista.locator('[data-ptm-corregir][data-lote="6201-1"]').click();
    const form = lista.locator('.ptm-form');
    await expect(form).toBeVisible();
    await form.locator('#ptm-f-guardar').click();
    await expect(form.locator('#ptm-f-error')).toBeVisible();
    await expect(form.locator('#ptm-f-error')).toContainText('Falta: elegir Sumar o Restar');
    await form.locator('[data-ptm-signo="-"]').click();
    await form.locator('#ptm-f-cajas').fill('3');
    await form.locator('#ptm-f-tipo').selectOption('faltante_recuento');
    await form.locator('#ptm-f-motivo').fill('Contamos 25 en el depósito');
    await expect(form.locator('#ptm-f-queda')).toHaveText('Queda: 28 → 25 cajas');
    await sinScrollHorizontal(page);
    await captura(page, `stock-terminado-corregir-${ancho}`, info);
    await form.locator('#ptm-f-guardar').click();
    await expect(lista.locator('.ptm-exito')).toHaveText('Listo: se restaron 3 cajas del lote 6201-1.');
    expect(rpcs.filter(r => r.includes('ajustar_stock_terminado')).length, 'una sola llamada').toBe(1);

    // El error de la base, tal cual.
    await page.evaluate(() => { globalThis.__maqueta = { rpc: { ajustar_stock_terminado: 'ERROR:No tenés permiso para ajustar stock en esa unidad.' } } });
    await lista.locator('[data-ptm-otro]').first().click();
    const otro = lista.locator('.ptm-form');
    await otro.locator('#ptm-f-lote').fill('nuevo-1');
    await otro.locator('[data-ptm-signo="+"]').click();
    await otro.locator('#ptm-f-cajas').fill('10');
    await otro.locator('#ptm-f-tipo').selectOption('carga_inicial');
    await otro.locator('#ptm-f-motivo').fill('Cajas viejas');
    await otro.locator('#ptm-f-guardar').click();
    await expect(otro.locator('#ptm-f-error')).toHaveText('No tenés permiso para ajustar stock en esa unidad.');
    await expect(otro.locator('#ptm-f-guardar')).toBeEnabled();
    await sinScrollHorizontal(page);

    // "‹ Volver" vuelve a la elección y "Insumos" abre los insumos.
    await page.locator('.stock-header__volver').click();
    await expect(page.locator('#stock-eleccion')).toBeVisible();
    await page.locator('#btn-entrada-insumos').click();
    await expect(page.locator('#vista-stock')).toBeVisible();
    await expect(page.locator('#vista-terminado')).toBeHidden();
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

test('stock: ?vista=terminado abre el producto terminado y queda al recargar', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${MAQUETA}/modulos/stock.html?vista=terminado&maqueta=stock-terminado`);
  await expect(page.locator('#vista-terminado')).toBeVisible();
  await expect(page.locator('#stock-eleccion')).toBeHidden();
  await page.reload();
  await expect(page.locator('#vista-terminado')).toBeVisible();
  await expect(page.locator('#ptm-lista .ptm-producto').first()).toBeVisible();
  expect(errores, errores.join('\n')).toEqual([]);
});
