// "MANDAR A OTRA EMPRESA DEL GRUPO" (26/10/2026, rama
// ci-prueba/mandar-a-otra-empresa), en la maqueta "stock-mandar-grupo" (la
// persona con retiros:cargar y stock:ver; en Nuss el cliente "DOLCE PASTA SRL"
// que es Dolce Pasta, en Dolce "PAZ, MIRTA" que es Cucuruchos Nuss). A 390 y
// 1280 px, sin scroll horizontal ni errores:
//  - en la entrada de Stock, el tercer botón grande "Mandar a otra empresa del
//    grupo"; con Nuss en la barra va derecho a la Carga con DOLCE PASTA SRL ya
//    elegido y el aviso "Va al stock de Dolce Pasta con los mismos lotes";
//  - la orden lleva producto terminado E insumos, y a registrar_orden_retiro
//    va ese cliente;
//  - con "Todas" en la barra, se elige la empresa;
//  - en Insumos, "Enviar a otra unidad" ya no está: en su lugar, "Mandar a
//    otra empresa del grupo"; "En tránsito" sigue.
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
async function abrirStock(page, barra, extra = '') {
  page.setDefaultTimeout(15000);
  await page.addInitScript((b) => {
    try {
      if (b) localStorage.setItem('barraUnidad.elegida', b); else localStorage.removeItem('barraUnidad.elegida');
      localStorage.removeItem('retiros.borrador');
    } catch { /* nada */ }
  }, barra);
  await page.goto(`${MAQUETA}/modulos/stock.html?maqueta=stock-mandar-grupo${extra}`);
}

for (const [ancho, alto] of TAMANOS) {
  test(`stock → la Carga a Dolce Pasta, con producto terminado e insumos, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirStock(page, 'u-n');

    const grupo = page.locator('#btn-entrada-grupo');
    await expect(page.locator('#stock-eleccion')).toBeVisible();
    await expect(grupo).toBeVisible();
    await expect(grupo).toContainText('Mandar a otra empresa del grupo');
    const a = await page.locator('#btn-entrada-terminado').boundingBox();
    const g = await grupo.boundingBox();
    expect(g.height, 'botón grande').toBeGreaterThanOrEqual(90);
    expect(g.y, 'abajo de los otros dos').toBeGreaterThanOrEqual(a.y + a.height - 1);
    expect(g.width, 'a lo ancho').toBeGreaterThan(ancho >= 640 ? a.width * 1.5 : ancho - 80);
    await sinScrollHorizontal(page);
    await captura(page, `mandar-grupo-entrada-${ancho}`, info);

    // Una sola empresa desde Nuss: derecho a la Carga, con el cliente elegido.
    await grupo.click();
    await page.waitForURL(/retiros\.html/);
    await expect(page.locator('#rt-vista-form')).toBeVisible();
    expect(page.url(), 'el parámetro sale de la dirección').not.toContain('cliente=');
    await expect(page.locator('#rt-cliente-elegido')).toContainText('DOLCE PASTA SRL');
    const TEXTO = 'Es una orden interna: la mercadería va en tránsito hasta que Dolce Pasta la reciba (con los mismos lotes)';
    const aviso = page.locator(ancho < 1024 ? '#rt-aviso-entre-catalogo' : '#rt-aviso-entre');
    await expect(aviso).toBeVisible();
    await expect(aviso).toHaveText(TEXTO);
    await sinScrollHorizontal(page);
    await captura(page, `mandar-grupo-carga-${ancho}`, info);

    // Producto terminado: 5 cajas.
    await page.locator('#rt-renglones [data-r-producto][data-presentacion="pr1"]').first().click();
    await page.locator('[data-r-cajas="0"]').fill('5');
    await page.locator('[data-r-listo="0"]').click();
    // Y un insumo: 25,5 kg de harina, del lote H-0910.
    if (await page.locator('#rt-editor-volver').isVisible()) await page.locator('#rt-editor-volver').click();
    await page.locator('#rt-agregar').click();
    await page.locator('[data-r-buscar="1"]').fill('harina');
    await page.locator('[data-r-insumo="1"]').first().click();
    await page.locator('[data-r-cantidad="1"]').fill('25,5');
    await page.locator('[data-r-lote-cant="1"][data-lote="H-0910"]').fill('25,5');
    await expect(page.locator('[data-r-lotes-resumen="1"]')).toContainText('Falta asignar 0');
    if (await page.locator('#rt-editor-volver').isVisible()) await page.locator('#rt-editor-volver').click();
    await expect(page.locator('#rt-aviso-entre')).toHaveText(TEXTO);
    await sinScrollHorizontal(page);
    await page.locator('#rt-revisar').click();
    await expect(page.locator('#rt-resumen .rt-aviso-entre')).toHaveText(TEXTO);
    await expect(page.locator('#rt-resumen')).toContainText('25,5 kg');
    await page.locator('#rt-confirmar').click();
    // 27/10/2026: la orden a otra empresa es una orden interna (N-I-…).
    await expect(page.locator('#rt-hecho')).toContainText('N-I-0042');
    const reg = rpc.find(r => r.nombre === 'registrar_orden_retiro');
    expect(reg?.params?.p_cliente_id).toBe('c-dp');
    expect(reg.params.p_items.some(i => i.presentacion_id === 'pr1'), 'con producto terminado').toBe(true);
    expect(reg.params.p_items.some(i => i.insumo_id === 'ins-1'), 'con insumos').toBe(true);
    await sinScrollHorizontal(page);
    expect(errores).toEqual([]);
  });

  test(`stock con "Todas": se elige a qué empresa, y en Insumos el botón nuevo, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirStock(page, null, '&vista=insumos');

    // En Insumos: sin "Enviar a otra unidad", con "Mandar a otra empresa del grupo".
    await expect(page.locator('#vista-stock')).toBeVisible();
    await expect(page.locator('#btn-enviar-transferencia')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Enviar a otra unidad' })).toHaveCount(0);
    await expect(page.locator('#btn-ver-transito')).toBeVisible();
    const boton = page.locator('#btn-mandar-grupo');
    await expect(boton).toBeVisible();
    await sinScrollHorizontal(page);

    await boton.click();
    const panel = page.locator('#stock-grupo');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('¿A qué empresa?');
    await expect(panel.locator('[data-grupo-cliente]')).toHaveCount(2);
    await expect(panel.locator('[data-grupo-cliente="c-dp"]')).toContainText('Dolce Pasta');
    await expect(panel.locator('[data-grupo-cliente="c-paz"]')).toContainText('Cucuruchos Nuss');
    await sinScrollHorizontal(page);
    await captura(page, `mandar-grupo-panel-${ancho}`, info);

    // Cancelar lo cierra; volver a tocar y elegir Dolce Pasta abre la Carga.
    await panel.locator('[data-grupo-cerrar]').click();
    await expect(panel).toBeHidden();
    await boton.click();
    await panel.locator('[data-grupo-cliente="c-dp"]').click();
    await page.waitForURL(/retiros\.html/);
    await expect(page.locator('#rt-cliente-elegido')).toContainText('DOLCE PASTA SRL');
    expect(errores).toEqual([]);
  });
}
