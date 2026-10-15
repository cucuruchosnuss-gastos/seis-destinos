// LA HOJA DE LA ORDEN ES PARA EL CLIENTE (pedido del 15/10/2026, caso N-0013),
// en la maqueta, sin credenciales, a 1280, 390 y 360 px y en la tablet
// (1000 × 540):
//  - N-0013: 35 cajas, 30 del lote 6242-2 y 5 que la base todavía tiene en
//    "SIN STOCK" (se están produciendo en Máquina 1). En PANTALLA (Mis
//    retiros) se sigue viendo "Esperando la planilla de Máquina 1 (lote 6244)";
//    en la HOJA impresa: CAJAS 35, TOTAL DE CAJAS 35, LOTE "6242-2 ×30", y
//    nunca "faltan", "Faltante", "pendiente de revisión" ni "SIN STOCK".
//    Lo mismo en el texto para compartir (WhatsApp).
//  - Conciliada (los dos lotes reales): LOTE "6242-2 ×30 · 6244-1 ×5".
//  - Administración (con precios): la misma hoja, leída de
//    stock_terminado_movimientos, sin estados internos.
// Los datos se suman con 'maqueta.cambios' (no se tocan los de otras pruebas).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const TAMANOS = [[1280, 900], [390, 844], [360, 780], [1000, 540]];
const INTERNOS = /faltan|Faltante|pendiente de revisi|SIN STOCK/i;
const sinScrollHorizontal = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

function n0013(lotes) {
  return {
    orden_id: 'o-13', codigo: 'N-0013', fecha: '2026-10-15', estado: 'confirmada', cliente: 'DUOLATE S.A.S.',
    transporte: '', observaciones: '', cargada_en: '2026-10-15T11:47:00Z',
    renglones: [{
      orden: 1, tipo: 'producto', producto: 'Cucuruchón Mini', presentacion: 'Caja con cono', marca: 'ASPEN',
      cajas: 35, unidades: 3500, lotes,
      item_id: 'it-13', presentacion_id: 'pr-mini', marca_id: 'm-aspen', faltante: 5, revision: 'en_produccion',
      revision_motivo: null, turno_produccion_id: 't-6244', planilla_maquina: 'Máquina 1', planilla_lote: 6244,
    }],
  };
}

// Abre la Carga con N-0013 en "Mis retiros" y window.print / navigator.share
// anotados (la hoja se arma igual: lo que se mide es lo que se iba a imprimir).
async function abrirMia(page, lotes) {
  page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(new Date('2026-10-15T09:00:00-03:00'));
  await page.goto(`${MAQUETA}/modulos/retiros.html?maqueta=retiros`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((mias) => {
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({ rpc: { mis_ordenes_retiro: mias } }));
  }, [n0013(lotes)]);
  await page.addInitScript(() => {
    window.__impresiones = 0;
    window.print = () => { window.__impresiones++; };
    window.__compartido = null;
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (d) => { window.__compartido = d; } });
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-empresa="u-n"]').click();
  await page.locator('#rt-btn-mis').click();
  await expect(page.locator('#rt-mis-lista')).toContainText('N-0013');
  await page.locator('[data-mia="o-13"]').click();
  await expect(page.locator('#rt-mio-cuerpo')).toContainText('35 cajas');
}

const lotesHoja = (page, sel) => page.locator(`${sel} .rh-copia`).first().locator('td.rh-lote').allTextContents();

for (const [ancho, alto] of TAMANOS) {
  test(`${ancho} px: N-0013 con 5 cajas sin lote todavía — la hoja dice 35 y solo el lote real`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirMia(page, [{ lote: '6242-2', cajas: 30 }, { lote: 'SIN STOCK', cajas: 5 }]);

    // En PANTALLA el estado interno se sigue viendo.
    await expect(page.locator('#rt-mio-cuerpo')).toContainText('Esperando la planilla de Máquina 1 (lote 6244)');
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `orden-impresa-pantalla-${ancho}`, info);

    await page.locator('#rt-mio-imprimir').click();
    await expect.poll(() => page.evaluate(() => window.__impresiones)).toBe(1);
    const hoja = page.locator('#rt-impresion');
    await expect(hoja.locator('.rh-copia')).toHaveCount(2);
    const texto = await hoja.innerText();
    expect(texto, 'la hoja no lleva estados internos').not.toMatch(INTERNOS);
    expect(await lotesHoja(page, '#rt-impresion')).toEqual(['6242-2 ×30']);
    await expect(hoja.locator('.rh-copia').first().locator('tbody td.rh-cajas')).toHaveText('35');
    await expect(hoja.locator('.rh-copia').first().locator('tfoot td.rh-cajas')).toHaveText('35');
    await expect(hoja.locator('.rh-notas')).toHaveCount(0);

    // Compartir como texto (WhatsApp): lo mismo.
    await page.locator('#rt-mio-compartir').click();
    await expect.poll(() => page.evaluate(() => window.__compartido?.text ?? null)).not.toBeNull();
    const compartido = await page.evaluate(() => window.__compartido.text);
    expect(compartido).toContain('- 35 cajas · Cucuruchón Mini · Caja con cono · ASPEN (lotes 6242-2 (30))');
    expect(compartido).toContain('Total: 35 cajas');
    expect(compartido, 'el texto no lleva estados internos').not.toMatch(INTERNOS);
    expect(errores, 'sin errores de JavaScript').toEqual([]);
  });
}

test('1280 px: N-0013 conciliada — LOTE "6242-2 ×30 · 6244-1 ×5"', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await abrirMia(page, [{ lote: '6242-2', cajas: 30 }, { lote: '6244-1', cajas: 5 }]);
  await page.locator('#rt-mio-imprimir').click();
  await expect.poll(() => page.evaluate(() => window.__impresiones)).toBe(1);
  expect(await lotesHoja(page, '#rt-impresion')).toEqual(['6242-2 ×30 · 6244-1 ×5']);
  expect(await page.locator('#rt-impresion').innerText()).not.toMatch(INTERNOS);
  expect(errores, 'sin errores de JavaScript').toEqual([]);
});

// Administración: la orden o1 con un renglón que tiene una parte en "SIN
// STOCK" (los movimientos de stock_terminado_movimientos de la orden).
async function abrirOrdenAdmin(page) {
  page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(new Date('2026-10-15T09:00:00-03:00'));
  await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=administracion`);
  await page.evaluate(async () => {
    localStorage.setItem('barraUnidad.elegida', 'u-n');
    const datos = await fetch('/maqueta/datos/administracion.json').then(r => r.json());
    const movs = datos.tablas.stock_terminado_movimientos
      .map(m => m.orden_retiro_id === 'o1' && m.lote === '7030-1' ? { ...m, lote: 'SIN STOCK' } : m);
    const items = datos.tablas.orden_retiro_items.map(it => it.id === 'i1' ? { ...it, faltante: 2, revision: 'en_produccion', turno_produccion_id: 't-2' } : it);
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({ tablas: { stock_terminado_movimientos: movs, orden_retiro_items: items } }));
  });
  await page.addInitScript(() => { window.__impresiones = 0; window.print = () => { window.__impresiones++; }; });
  await page.reload();
  await page.locator('[data-pestana="ordenes"]').first().click();
  await page.locator('#ad-ordenes-lista [data-orden="o1"]').click();
  await expect(page.locator('#ad-orden-cuerpo')).toContainText('Distribuidora Anatolia');
}

for (const [ancho, alto] of TAMANOS) {
  test(`${ancho} px: Administración imprime la orden sin "faltan" ni "pendiente de revisión"`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirOrdenAdmin(page);
    // En pantalla el lote interno se sigue viendo (es para la oficina).
    await expect(page.locator('#ad-orden-cuerpo')).toContainText('SIN STOCK');
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `orden-impresa-admin-${ancho}`, info);
    await page.locator('#ad-btn-imprimir').click();
    await expect.poll(() => page.evaluate(() => window.__impresiones)).toBe(1);
    const hoja = page.locator('#ad-impresion');
    await expect(hoja.locator('.rh-copia')).toHaveCount(2);
    expect(await hoja.innerText(), 'la hoja no lleva estados internos').not.toMatch(INTERNOS);
    expect(await lotesHoja(page, '#ad-impresion')).toEqual(['7010-2 ×8', '7032-1']);
    await expect(hoja.locator('.rh-copia').first().locator('tbody td.rh-cajas').first()).toHaveText('10');
    await expect(hoja.locator('.rh-copia').first().locator('tfoot td.rh-cajas')).toHaveText('14');
    expect(errores, 'sin errores de JavaScript').toEqual([]);
  });
}
