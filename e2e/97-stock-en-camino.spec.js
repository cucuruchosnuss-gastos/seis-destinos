// "EN CAMINO DESDE OTRA EMPRESA" EN STOCK (29/10/2026, rama
// ci-prueba/recibir-stock), en la maqueta "stock-en-camino" (la persona con
// stock:ver en Nuss y Dolce y stock:recibir_transferencia en Dolce; Dolce en
// la barra; en camino una orden de Nuss —40 cajas y 1.250,5 kg de harina— y
// una de Mengui; una ya recibida con una diferencia). A 390 y 1280 px, sin
// scroll horizontal ni errores:
//  - la sección arriba de todo, con una tarjeta por envío;
//  - Recibir: lo recibido precargado, una diferencia pide el motivo (sin
//    motivo lo dice sin llamar a la base), el error de la base TAL CUAL pegado
//    al botón, y al final "Orden N-0031 recibida: entró al stock." con lo que
//    viajó a recibir_orden_grupo;
//  - "Recibidos" plegado, con quién, cuándo y la diferencia;
//  - en el catálogo no se ve.
// Corre SIEMPRE, sin credenciales. El reloj, fijo el 29/10/2026 (los
// recibidos son de los últimos 30 días).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || `http://localhost:${process.env.E2E_PUERTO_MAQUETA || 4180}`;
const TAMANOS = [[390, 844], [1280, 900]];
const ERROR_BASE = 'No se puede recibir más de lo que se mandó (40). Si llegó de más, es un ajuste aparte.';

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
async function abrir(page, extra = '') {
  page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(new Date('2026-10-29T15:00:00-03:00'));
  await page.addInitScript(() => {
    try { localStorage.setItem('barraUnidad.elegida', 'u-d'); } catch { /* nada */ }
  });
  await page.goto(`${MAQUETA}/modulos/stock.html?maqueta=stock-en-camino${extra}`);
}

for (const [ancho, alto] of TAMANOS) {
  test(`stock: en camino desde otra empresa, recibir con una diferencia, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page);

    const seccion = page.locator('#st-en-camino');
    await expect(seccion).toBeVisible();
    await expect(seccion.locator('.st-camino__titulo')).toHaveText('En camino desde otra empresa 2');
    // Arriba de todo: antes de los botones de la entrada.
    await expect(page.locator('#stock-eleccion')).toBeVisible();
    const s = await seccion.boundingBox();
    const e = await page.locator('#stock-eleccion').boundingBox();
    expect(s.y + s.height, 'la sección va arriba de la entrada').toBeLessThanOrEqual(e.y + 1);
    expect(rpc.find(r => r.nombre === 'recepciones_grupo')?.params, 'se lee con la fábrica de la barra')
      .toEqual({ p_unidad_negocio_id: 'u-d', p_estado: 'en_transito' });

    const tarjeta = seccion.locator('[data-camino-envio="rec-1"]');
    await expect(tarjeta.locator('.st-camino__orden')).toHaveText('Orden N-0031');
    await expect(tarjeta.locator('.st-camino__remito')).toHaveText('Remito 0001-00001234');
    await expect(tarjeta.locator('.st-camino__fecha')).toHaveText('29/10/2026');
    await expect(tarjeta.locator('.st-camino__desde')).toHaveText('Desde Cucuruchos Nuss · Camión de Ramón (AB 123 CD)');
    await expect(tarjeta.locator('.st-camino__renglon').nth(0)).toContainText('Lote L-2910');
    await expect(tarjeta.locator('.st-camino__cant').nth(0)).toHaveText('40 cajas');
    await expect(tarjeta.locator('.st-camino__cant').nth(1)).toHaveText('1.250,5 kg');
    await expect(seccion.locator('[data-camino-envio="rec-2"] .st-camino__obs')).toHaveText('Va con la camioneta de reparto');
    await sinScrollHorizontal(page);
    await captura(page, `en-camino-tarjetas-${ancho}`, info);

    // Recibir: lo recibido precargado con lo enviado.
    await tarjeta.locator('[data-camino-recibir="rec-1"]').click();
    const cajas = tarjeta.locator('[data-camino-recibido="it-1"]');
    const harina = tarjeta.locator('[data-camino-recibido="it-2"]');
    await expect(cajas).toHaveValue('40');
    await expect(harina).toHaveValue('1.250,50');
    await expect(tarjeta.locator('[data-camino-motivo-caja="it-1"]')).toBeHidden();

    // Una diferencia: aparece el motivo en ESE renglón.
    await cajas.fill('38');
    await expect(tarjeta.locator('[data-camino-motivo-caja="it-1"]')).toBeVisible();
    await expect(tarjeta.locator('[data-camino-motivo-caja="it-2"]')).toBeHidden();
    await sinScrollHorizontal(page);

    // Sin motivo: lo dice, pegado al botón, sin llamar a la base.
    const confirmar = tarjeta.locator('[data-camino-confirmar]');
    const error = tarjeta.locator('[data-camino-error]');
    await confirmar.click();
    await expect(error).toBeVisible();
    await expect(error).toHaveText('Hay una diferencia sin explicar: poné el motivo.');
    expect(rpc.some(r => r.nombre === 'recibir_orden_grupo'), 'sin motivo no se llama a la base').toBe(false);
    await expect(confirmar).toBeEnabled();

    // Con motivo, la base contesta un error: TAL CUAL, pegado al botón.
    await tarjeta.locator('[data-camino-motivo="it-1"]').fill('Dos cajas rotas');
    await expect(error).toBeHidden();
    await page.evaluate((msg) => { globalThis.__maqueta = { rpc: { recibir_orden_grupo: 'ERROR:' + msg } }; }, ERROR_BASE);
    await confirmar.click();
    await expect(error).toHaveText(ERROR_BASE);
    await expect(error).toBeVisible();
    await expect(confirmar).toBeEnabled();
    const be = await error.boundingBox();
    const bb = await confirmar.boundingBox();
    expect(bb.y - (be.y + be.height), 'el error va pegado al botón').toBeLessThan(40);
    expect(bb.y, 'el error va arriba del botón').toBeGreaterThan(be.y);
    await sinScrollHorizontal(page);
    await captura(page, `en-camino-error-${ancho}`, info);

    // Ahora sí: se recibe. La base ya no la tiene en camino.
    await page.evaluate(() => {
      globalThis.__maqueta = { rpc: {
        recibir_orden_grupo: { estado: 'recibida', entradas: 2, codigo: 'N-0031' },
        recepciones_grupo: { __segun: [
          { si: { p_estado: 'en_transito' }, r: [{ id: 'rec-2', estado: 'en_transito', codigo: 'O-0012', fecha: '2026-10-28', numero_remito: null, transporte: null,
            observaciones: null, origen_id: 'u-m', origen: 'Mengui', destino_id: 'u-d', destino: 'Dolce Pasta',
            items: [{ item_id: 'it-3', tipo: 'insumo', descripcion: 'Azúcar impalpable · Ledesma', unidad: 'kg', lote: null, cantidad_enviada: 75 }] }] },
          { si: { p_estado: 'recibida' }, r: [{ id: 'rec-0', estado: 'recibida', codigo: 'N-0028', numero_remito: '0001-00001220', recibida_en: '2026-10-28T14:05:00Z',
            recibida_por: 'Lucía Fernández', origen_id: 'u-n', origen: 'Cucuruchos Nuss', destino_id: 'u-d', destino: 'Dolce Pasta',
            items: [{ item_id: 'it-0', tipo: 'producto', descripcion: 'Cucurucho N°1 · Caja x 100 · Dolce Pasta', unidad: 'cajas', lote: 'L-2710', cantidad_enviada: 30, cantidad_recibida: 28, motivo_diferencia: 'Dos cajas aplastadas en el viaje' }] }] },
        ], __defecto: [] },
      } };
    });
    await confirmar.click();
    await expect(page.locator('#toast-global')).toHaveText('Orden N-0031 recibida: entró al stock.');
    const llamadas = rpc.filter(r => r.nombre === 'recibir_orden_grupo');
    expect(llamadas.length, 'una llamada por intento (la del error y esta)').toBe(2);
    expect(llamadas[1].params).toEqual({
      p_recepcion_id: 'rec-1',
      p_items: [{ item_id: 'it-1', cantidad_recibida: 38, motivo_diferencia: 'Dos cajas rotas' }, { item_id: 'it-2', cantidad_recibida: 1250.5, motivo_diferencia: null }],
      p_observaciones: null,
    });
    await expect(seccion.locator('[data-camino-envio="rec-1"]')).toHaveCount(0);
    await expect(seccion.locator('.st-camino__titulo')).toHaveText('En camino desde otra empresa 1');

    // Recibidos: plegado; al tocar, quién, cuándo y la diferencia.
    const plegar = seccion.locator('[data-camino-plegar]');
    await expect(plegar).toContainText('Recibidos en los últimos 30 días (1)');
    await expect(seccion.locator('.st-camino__hechos')).toHaveCount(0);
    await plegar.click();
    await expect(seccion.locator('.st-camino__quien')).toHaveText('Recibió Lucía Fernández el 28/10/2026 11:05');
    await expect(seccion.locator('.st-camino__difs li')).toHaveText('Cucurucho N°1 · Caja x 100 · Dolce Pasta · Lote L-2710: enviado 30 cajas, recibido 28 cajas — Dos cajas aplastadas en el viaje');
    await sinScrollHorizontal(page);
    await seccion.locator('.st-camino__recibidos').scrollIntoViewIfNeeded();
    await captura(page, `en-camino-recibidos-${ancho}`, info);

    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`stock: en camino se ve en Insumos y no en el catálogo; #st-en-camino, a ${ancho} px`, async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page, '&vista=insumos#st-en-camino');
    const seccion = page.locator('#st-en-camino');
    await expect(seccion).toBeVisible();
    await expect(seccion).toBeInViewport();
    await expect(page.locator('#vista-stock')).toBeVisible();
    await page.locator('.pestana-stock[data-vista="catalogo"]').click();
    await expect(page.locator('#vista-catalogo')).toBeVisible();
    await expect(seccion).toBeHidden();
    await page.locator('.pestana-stock[data-vista="stock"]').click();
    await expect(seccion).toBeVisible();
    await sinScrollHorizontal(page);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
