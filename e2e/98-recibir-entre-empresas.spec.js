// MERCADERÍA EN TRÁNSITO ENTRE EMPRESAS Y VARIOS LOTES POR RENGLÓN
// (29/10/2026, rama ci-prueba/recibir-entre-empresas), en la maqueta, a 390 y
// 1280 px, sin scroll horizontal ni errores de JS:
//  - Administración (maqueta "orden-entre-empresas"): el detalle de la orden
//    interna N-0042 dice "En tránsito a Dolce Pasta" (recepciones_grupo en
//    tránsito) y, recibida, "Recibida por <nombre> el dd/mm" con la
//    diferencia y su motivo.
//  - Remitos Dolce → Revisar (maqueta "remitos-dolce-revisar"): con un cliente
//    del grupo (Paz Mirta = Cucuruchos Nuss), antes de confirmar: "Es una
//    orden interna: la mercadería va en tránsito hasta que Cucuruchos Nuss la
//    reciba."; los lotes de un renglón: "Lotes: X de Y cajas" en amarillo
//    mientras no suman, agregar y quitar lote, y lo que se guarda.
// (La sección de Stock que los recibe: e2e/97-stock-en-camino.spec.js.)
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

const EN_TRANSITO = { id: 'rec-42', estado: 'en_transito', creada_en: '2026-10-29T13:00:00Z', recibida_en: null, recibida_por: null, orden_id: 'o42', codigo: 'N-0042',
  origen: 'Cucuruchos Nuss', destino: 'Dolce Pasta', destino_id: 'u-d',
  items: [{ item_id: 'ri1', tipo: 'producto', descripcion: 'Cucurucho grande · Caja x 100', unidad: 'cajas', lote: 'L-7', cantidad_enviada: 10, cantidad_recibida: null, motivo_diferencia: null }] };
const RECIBIDA = { ...EN_TRANSITO, estado: 'recibida', recibida_en: '2026-10-30T12:15:00Z', recibida_por: 'Manuel Ortiz',
  items: [{ ...EN_TRANSITO.items[0], cantidad_recibida: 8, motivo_diferencia: 'Dos cajas rotas en el viaje' }] };

async function abrirOrdenInterna(page, recepcion) {
  page.setDefaultTimeout(15000);
  await page.addInitScript(() => { try { localStorage.setItem('barraUnidad.elegida', 'u-n') } catch { /* nada */ } });
  await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=orden-entre-empresas`);
  await page.evaluate((r) => { globalThis.__maqueta = { rpc: { recepciones_grupo: [r] }, funciones: {} }; }, recepcion);
  await page.locator('[data-pestana="ordenes"]').first().click();
  await page.locator('#ad-ordenes-lista [data-orden="o42"]').click();
  await expect(page.locator('#ad-recepcion-orden')).toBeVisible();
}

async function abrirRemito(page) {
  page.setDefaultTimeout(15000);
  await page.goto(`${MAQUETA}/modulos/remitos-dolce.html?maqueta=remitos-dolce-revisar&pestana=revisar`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { globalThis.__maqueta = { rpc: {}, funciones: {}, firmar: () => ({ data: { signedUrl: null }, error: null }) }; });
  await page.locator('#ad-remitos [data-remito="rm-1"]').click();
  await expect(page.locator('#ad-vista-remito')).toBeVisible();
}
const renglon = (page, i) => page.locator(`#ad-remito-cuerpo [data-rm-renglon="${i}"]`);

for (const [ancho, alto] of TAMANOS) {
  test(`Administración: la orden interna en tránsito y recibida, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirOrdenInterna(page, EN_TRANSITO);
    const rec = page.locator('#ad-recepcion-orden');
    await expect(rec).toContainText('En tránsito a Dolce Pasta: entra a su stock cuando la reciban.');
    await expect(rec).toHaveClass(/ad-recepcion--transito/);
    await expect(page.locator('#ad-orden-cuerpo')).not.toContainText('entró a su stock');
    expect(rpc.find(r => r.nombre === 'recepciones_grupo')?.params).toEqual({ p_unidad_negocio_id: 'u-d', p_estado: null });
    await sinScrollHorizontal(page);
    await rec.scrollIntoViewIfNeeded();
    await captura(page, `orden-interna-transito-${ancho}`, info);

    await abrirOrdenInterna(page, RECIBIDA);
    await expect(rec).toContainText('Recibida por Manuel Ortiz el 30/10.');
    await expect(rec).toHaveClass(/ad-recepcion--recibida/);
    await expect(rec.locator('.ad-recepcion__difs li')).toHaveText('Cucurucho grande · Caja x 100 · Lote L-7: se mandaron 10 cajas, llegaron 8 cajas (Dos cajas rotas en el viaje)');
    await sinScrollHorizontal(page);
    await rec.scrollIntoViewIfNeeded();
    await captura(page, `orden-interna-recibida-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`Remitos Dolce: el aviso de orden interna y los lotes de un renglón, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirRemito(page);
    await expect(page.locator('#ad-rm-interna')).toHaveCount(0);
    // El cliente: Paz Mirta, que ES Cucuruchos Nuss.
    await page.locator('#ad-rm-cliente-buscar').fill('paz');
    await page.locator('[data-rm-cliente="c-d-paz"]').click();
    await expect(page.locator('#ad-rm-interna')).toHaveText('Es una orden interna: la mercadería va en tránsito hasta que Cucuruchos Nuss la reciba.');
    await sinScrollHorizontal(page);
    await page.locator('#ad-rm-interna').scrollIntoViewIfNeeded();
    await captura(page, `remito-orden-interna-${ancho}`, info);

    // Los lotes del renglón 3 (Tallarines x10, 20 cajas, un lote 10430 leído).
    const pie = page.locator('[data-rm-lotes-pie="2"]');
    await expect(pie).toHaveText('Lotes: 20 de 20 cajas · ✓ Asignado completo');
    await page.locator('[data-rm-lote-cajas="2"][data-k="0"]').fill('12');
    await expect(pie).toHaveText('Lotes: 12 de 20 cajas · falta repartir 8 cajas');
    await expect(pie.locator('.ad-rm-lotes__asignado')).toHaveClass(/ad-rm-lotes__asignado--falta/);
    await page.locator('[data-rm-lote-agregar="2"]').click();
    await page.locator('[data-rm-lote="2"][data-k="1"]').pressSequentially('l-10433');
    await page.locator('[data-rm-lote-cajas="2"][data-k="1"]').fill('5');
    await page.locator('[data-rm-lote-agregar="2"]').click();
    await page.locator('[data-rm-lote="2"][data-k="2"]').fill('10440');
    await page.locator('[data-rm-lote-cajas="2"][data-k="2"]').fill('3');
    await expect(pie).toHaveText('Lotes: 20 de 20 cajas · ✓ Asignado completo');
    await expect(pie.locator('.ad-rm-lotes__asignado')).not.toHaveClass(/--falta/);
    await sinScrollHorizontal(page);
    await renglon(page, 2).scrollIntoViewIfNeeded();
    await captura(page, `remito-tres-lotes-${ancho}`, info);
    await expect.poll(() => JSON.stringify(rpc.filter(r => r.nombre === 'actualizar_remito_precarga').pop()?.params?.p_items?.[2]?.lotes))
      .toBe(JSON.stringify([{ lote: '10430', cajas: 12 }, { lote: 'L-10433', cajas: 5 }, { lote: '10440', cajas: 3 }]));
    // Quitar el del medio: vuelve a faltar.
    await renglon(page, 2).locator('[data-rm-lote-quitar="2"][data-k="1"]').click();
    await expect(pie).toHaveText('Lotes: 15 de 20 cajas · falta repartir 5 cajas');
    await expect.poll(() => JSON.stringify(rpc.filter(r => r.nombre === 'actualizar_remito_precarga').pop()?.params?.p_items?.[2]?.lotes))
      .toBe(JSON.stringify([{ lote: '10430', cajas: 12 }, { lote: '10440', cajas: 3 }]));
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
