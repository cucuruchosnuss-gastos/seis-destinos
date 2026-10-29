// REMITOS DOLCE: LOTES EN UN RENGLÓN DE INSUMO (29/10/2026, rama
// ci-prueba/corregir-orden), en la maqueta "remitos-dolce-revisar", a 390 y
// 1280 px, sin scroll horizontal ni errores de JS: el renglón 2 (Capelinas,
// sin producto) se cambia por el insumo Harina 000 (kg); 25 kg repartidos en
// dos lotes con decimales ("falta repartir", amarillo, completo) y lo que se
// guarda: {lote, cantidad}.
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
const renglon = (page, i) => page.locator(`#ad-remito-cuerpo [data-rm-renglon="${i}"]`);

for (const [ancho, alto] of TAMANOS) {
  test(`Remitos Dolce: un insumo con dos lotes en kg, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    page.setDefaultTimeout(15000);
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/remitos-dolce.html?maqueta=remitos-dolce-revisar&pestana=revisar`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { globalThis.__maqueta = { rpc: {}, funciones: {}, firmar: () => ({ data: { signedUrl: null }, error: null }) }; });
    await page.locator('#ad-remitos [data-remito="rm-1"]').click();
    await expect(page.locator('#ad-vista-remito')).toBeVisible();

    // El renglón 2 no tiene producto: se busca y elige el insumo.
    await renglon(page, 1).locator('[data-rm-buscar="1"]').fill('harina');
    await renglon(page, 1).locator('[data-rm-insumo="1"][data-id="ins-1"]').click();
    await expect(renglon(page, 1).locator('.ad-rm-lotes')).toBeVisible();
    await expect(renglon(page, 1).locator('.ad-rm-lote__campo--cajas span').first()).toHaveText('Cantidad (kg)');
    await page.locator('#ad-rm-cantidad-1').fill('25');
    const pie = page.locator('[data-rm-lotes-pie="1"]');
    await expect(pie).toContainText('Va sin lote');
    await expect(pie).toContainText('Sin lotes escritos sale de los lotes más viejos con stock.');

    await page.locator('[data-rm-lote="1"][data-k="0"]').pressSequentially('h-1');
    await page.locator('[data-rm-lote-cajas="1"][data-k="0"]').fill('10,5');
    await expect(pie).toContainText('Lotes: 10,5 de 25 kg');
    await expect(pie).toContainText('falta repartir 14,5 kg');
    await expect(pie.locator('.ad-rm-lotes__asignado')).toHaveClass(/ad-rm-lotes__asignado--falta/);
    await page.locator('[data-rm-lote-agregar="1"]').click();
    await page.locator('[data-rm-lote="1"][data-k="1"]').fill('H-2');
    await page.locator('[data-rm-lote-cajas="1"][data-k="1"]').fill('14,5');
    await expect(pie).toHaveText('Lotes: 25 de 25 kg · ✓ Asignado completo');
    await expect(pie.locator('.ad-rm-lotes__asignado')).not.toHaveClass(/--falta/);
    await sinScrollHorizontal(page);
    await renglon(page, 1).scrollIntoViewIfNeeded();
    await captura(page, `remito-lotes-insumo-${ancho}`, info);

    await expect.poll(() => JSON.stringify(rpc.filter(r => r.nombre === 'actualizar_remito_precarga').pop()?.params?.p_items?.[1]))
      .toContain('"lotes":[{"lote":"H-1","cantidad":10.5},{"lote":"H-2","cantidad":14.5}]');
    const it = rpc.filter(r => r.nombre === 'actualizar_remito_precarga').pop().params.p_items[1];
    expect({ insumo_id: it.insumo_id, presentacion_id: it.presentacion_id, cantidad: it.cantidad }).toEqual({ insumo_id: 'ins-1', presentacion_id: null, cantidad: 25 });
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
