// LA CARGA EN UNA FÁBRICA SIN CONTROL DE STOCK (26/10/2026, rama
// ci-prueba/orden-sin-stock-rosario), en la maqueta "retiros-sin-control"
// (Dolce Pasta con controla_stock_terminado = false; la Capelina Grande y el
// Cono dulce con stock 0). A 390 y 1280 px, sin scroll horizontal ni errores:
//  - el catálogo muestra los productos sin buscar, sin "sin stock" ni al 55 %;
//  - 84 cajas → lote 10430: 30, "+ Agregar lote" → 10433: 39 → "Asignado 69
//    de 84 · faltan 15"; no deja confirmar hasta que la suma da el total; sin
//    "¿De dónde salen?", "Completar con los más viejos" ni "Que salga sola";
//  - a registrar_orden_retiro van los lotes escritos; la hoja los muestra;
//  - sin ningún lote: "Va sin lote", y viaja sin "lotes";
//  - en Cucuruchos Nuss (con control), todo como siempre.
// Corre SIEMPRE, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || `http://localhost:${process.env.E2E_PUERTO_MAQUETA || 4180}`;
const TAMANOS = [[390, 844], [1280, 900]];

function anotarRpc(page) {
  const rpc = [];
  page.on('console', async (m) => {
    if (!m.text().startsWith('[maqueta] rpc')) return;
    const args = m.args();
    try { rpc.push({ nombre: await args[1].jsonValue(), params: await args[2].jsonValue() }); } catch { /* nada */ }
  });
  return rpc;
}
async function sinScrollHorizontal(page) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
}

async function abrirEn(page, empresa, cliente) {
  page.setDefaultTimeout(15000);
  await page.goto(`${MAQUETA}/modulos/retiros.html?maqueta=retiros-sin-control`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.removeItem('retiros.borrador'); window.__impresiones = 0; window.print = () => { window.__impresiones++; }; });
  await page.locator(`[data-empresa="${empresa}"]`).click();
  await page.locator('#rt-cliente-buscar').fill(cliente);
  await page.locator('[data-cliente]').first().click();
}

for (const [ancho, alto] of TAMANOS) {
  test(`Dolce Pasta sin control: los lotes escritos a mano, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirEn(page, 'u-d', 'almac');

    // El catálogo: los productos sin buscar, sin "sin stock".
    const capelina = page.locator('#rt-renglones [data-r-producto][data-presentacion="pr-d-cap"]').first();
    await expect(capelina).toBeVisible();
    await expect(page.locator('#rt-renglones [data-r-producto][data-presentacion="pr-d-cono"]').first()).toBeVisible();
    await expect(page.locator('#rt-renglones .rt-opcion--sin-stock')).toHaveCount(0);
    await expect(page.locator('#rt-renglones .rt-opcion__sin-stock')).toHaveCount(0);
    await expect(page.locator('#rt-renglones .rt-pista')).toHaveText('Escribí para buscar también los insumos sin stock.');
    await capelina.click();

    // 84 cajas → 10430: 30, + Agregar lote → 10433: 39.
    await page.locator('[data-r-cajas="0"]').fill('84');
    await expect(page.locator('[data-r-lotes-resumen="0"]')).toContainText('Va sin lote');
    await expect(page.locator('#rt-renglones')).not.toContainText('Completar con los más viejos');
    await expect(page.locator('#rt-renglones')).not.toContainText('Que salga sola');
    await expect(page.locator('#rt-renglones')).not.toContainText('¿De dónde salen?');
    await page.locator('[data-r-lm-lote="0"][data-k="0"]').pressSequentially('10430');
    await page.locator('[data-r-lm-cajas="0"][data-k="0"]').fill('30');
    await page.locator('[data-r-lm-agregar="0"]').click();
    await expect(page.locator('[data-r-lm-lote="0"][data-k="1"]')).toBeFocused();
    await page.locator('[data-r-lm-lote="0"][data-k="1"]').pressSequentially('10433');
    await page.locator('[data-r-lm-cajas="0"][data-k="1"]').fill('39');
    const pie = page.locator('[data-r-lotes-resumen="0"]');
    await expect(pie).toContainText('69 de 84');
    await expect(pie).toContainText('faltan 15 cajas');
    await sinScrollHorizontal(page);
    await captura(page, `sin-control-lotes-${ancho}`, info);
    // No deja agregar el renglón hasta que la suma da el total.
    await page.locator('[data-r-listo="0"]').click();
    await expect(page.locator('#rt-renglones')).toContainText('faltan asignar 15 cajas a los lotes');
    await page.locator('[data-r-lm-agregar="0"]').click();
    await page.locator('[data-r-lm-lote="0"][data-k="2"]').pressSequentially('l-10440');
    await expect(page.locator('[data-r-lm-lote="0"][data-k="2"]')).toHaveValue('L-10440');
    await page.locator('[data-r-lm-lote="0"][data-k="2"]').fill('10440');
    await page.locator('[data-r-lm-cajas="0"][data-k="2"]').fill('15');
    await expect(pie).toContainText('✓ Asignado completo');
    await page.locator('[data-r-listo="0"]').click();
    await expect(page.locator('#rt-orden-lista')).toContainText('10430 ×30');

    // El resumen y la confirmación: los lotes escritos, sin faltante.
    await page.locator('#rt-revisar').click();
    await expect(page.locator('#rt-resumen')).toContainText('Lote 10430: 30 cajas · Lote 10433: 39 cajas · Lote 10440: 15 cajas');
    await sinScrollHorizontal(page);
    await page.locator('#rt-confirmar').click();
    await expect(page.locator('#rt-hecho')).toContainText('D-0007');
    await expect(page.locator('#rt-hecho')).not.toContainText('De dónde salen');
    const items = rpc.find(r => r.nombre === 'registrar_orden_retiro').params.p_items;
    expect(items).toEqual([{ presentacion_id: 'pr-d-cap', marca_id: null, cajas: 84,
      lotes: [{ lote: '10430', cajas: 30 }, { lote: '10433', cajas: 39 }, { lote: '10440', cajas: 15 }] }]);
    expect(rpc.some(r => r.nombre === 'lotes_para_retiro'), 'no se leen lotes con stock del producto').toBe(false);

    // La hoja muestra los lotes escritos.
    await expect(page.locator('#rt-hecho-imprimir')).toBeEnabled();
    await page.locator('#rt-hecho-imprimir').click();
    await expect.poll(() => page.locator('#rt-impresion').innerHTML()).toContain('10430 ×30');
    await expect(page.locator('#rt-impresion')).toContainText('10433 ×39');
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`Dolce Pasta sin control: sin ningún lote "Va sin lote", a ${ancho} px`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirEn(page, 'u-d', 'almac');
    await page.locator('#rt-renglones [data-r-producto][data-presentacion="pr-d-cap"]').first().click();
    await page.locator('[data-r-cajas="0"]').fill('12');
    await expect(page.locator('[data-r-lotes-resumen="0"]')).toContainText('Va sin lote');
    await page.locator('[data-r-listo="0"]').click();
    await expect(page.locator('#rt-orden-lista')).toContainText('va sin lote');
    await page.locator('#rt-revisar').click();
    await expect(page.locator('#rt-resumen')).toContainText('Va sin lote');
    await page.locator('#rt-confirmar').click();
    await expect(page.locator('#rt-hecho')).toContainText('D-0007');
    expect(rpc.find(r => r.nombre === 'registrar_orden_retiro').params.p_items).toEqual([{ presentacion_id: 'pr-d-cap', marca_id: null, cajas: 12 }]);
    await sinScrollHorizontal(page);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`Cucuruchos Nuss (con control): como siempre, a ${ancho} px`, async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirEn(page, 'u-n', 'turco');
    await expect(page.locator('#rt-renglones .rt-pista')).toHaveText('Escribí para buscar también lo que no tiene stock.');
    await page.locator('#rt-renglones [data-r-producto][data-presentacion="pr1"]').first().click();
    await page.locator('[data-r-cajas="0"]').fill('5');
    await expect(page.locator('.rt-completar')).toBeVisible();
    await expect(page.locator('[data-r-lm-agregar]')).toHaveCount(0);
    await expect(page.locator('#rt-renglones')).toContainText('Que salga sola de los más viejos');
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
