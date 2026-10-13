// EL FALTANTE DE UN RETIRO: "¿DE DÓNDE SALEN?" (13/10/2026), en la maqueta,
// sin credenciales, a 1280, 390 y 360 px y en la tablet (1000 × 540):
//  - la Carga: confirmar una orden con faltante abre el cartel ("Faltan N cajas
//    de … ¿De dónde salen?") con los dos botones grandes, entra entero en la
//    pantalla; "Se están produciendo" → la planilla → el mensaje, y la orden
//    dice "Esperando la planilla de Máquina 2 (lote 6237)"; la leyenda vieja
//    en bordó ya no está; "Dejarlo pendiente" lo deja para Administración;
//    "Entró de otro lado" explica y ofrece el traspaso; Escape cierra.
//  - Administración → Retiros por revisar: los dos botones y "Otro /
//    ajustar"; "Entró de otro lado" → el lote → faltante_a_lote; la orden
//    con un renglón que espera dice "Esperando la planilla de …".
// Los datos se suman con 'maqueta.cambios' (no se tocan los de otras pruebas).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

function anotarRpc(page) {
  const rpc = [];
  page.on('console', async (m) => {
    if (!m.text().startsWith('[maqueta] rpc')) return;
    const args = m.args();
    try { rpc.push({ nombre: await args[1].jsonValue(), params: await args[2].jsonValue() }); } catch { /* nada */ }
  });
  return rpc;
}
const sinScrollHorizontal = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

const PLANILLAS = [
  { turno_id: 't-2', fecha: '2026-10-13', turno: 'Mañana', maquina: 'Máquina 2', lote: 6237, estado: 'abierto' },
  { turno_id: 't-1', fecha: '2026-10-12', turno: 'Noche', maquina: 'Máquina 1', lote: 6230, estado: 'pendiente_completar' },
];

async function abrirCarga(page, rpcExtra = {}) {
  page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(new Date('2026-10-13T10:30:00-03:00'));
  await page.goto(`${MAQUETA}/modulos/retiros.html?maqueta=retiros`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((rpc) => {
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({ rpc }));
  }, {
    registrar_orden_retiro: {
      orden_id: 'o-1', numero: 12, codigo: 'N-0012',
      stock_insuficiente: [{ renglon: 1, item_id: 'it-1', producto: 'Cucurucho grande', presentacion: 'Caja x 100', pedidas: 30, faltaron: 5 }],
    },
    planillas_en_curso: PLANILLAS,
    faltante_en_produccion: 'en_produccion',
    lotes_para_retiro: [{ lote: 'D-0099', cajas: 40, desde: '2026-10-13' }],
    faltante_a_lote: null,
    ...rpcExtra,
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-empresa]').first()).toBeVisible();
}

async function confirmarConFaltante(page) {
  await page.locator('[data-empresa="u-n"]').click();
  await page.locator('#rt-cliente-buscar').fill('turco');
  await page.locator('[data-cliente]').first().click();
  await page.locator('[data-r-producto]').first().click();
  await page.locator('[data-r-cajas="0"]').fill('30');
  await page.locator('[data-r-completar="0"]').click();
  if (await page.locator('#rt-editor-volver').isVisible()) await page.locator('#rt-editor-volver').click();
  await page.locator('#rt-revisar').click();
  await page.locator('#rt-confirmar').click();
  await expect(page.locator('#rt-falt')).toBeVisible();
}

// El cartel entra en la pantalla y sus botones también.
async function cartelEntero(page) {
  const caja = await page.locator('.rt-falt').boundingBox();
  const vp = page.viewportSize();
  expect(caja.x, 'el cartel no se sale por la izquierda').toBeGreaterThanOrEqual(0);
  expect(caja.x + caja.width, 'ni por la derecha').toBeLessThanOrEqual(vp.width + 0.5);
  expect(caja.y + caja.height, 'ni por abajo').toBeLessThanOrEqual(vp.height + 0.5);
}

const TAMANOS = [[1280, 900], [390, 844], [360, 780], [1000, 540]];

for (const [ancho, alto] of TAMANOS) {
  test(`${ancho} px: la Carga pregunta de dónde salen y "se están produciendo"`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirCarga(page);
    await confirmarConFaltante(page);

    const cartel = page.locator('#rt-falt-cuerpo');
    await expect(cartel).toContainText('Faltan 5 cajas de Cucurucho grande · Caja x 100 en stock.');
    await expect(cartel).toContainText('¿De dónde salen?');
    await expect(cartel.locator('[data-fr="produccion"]')).toBeVisible();
    await expect(cartel.locator('[data-fr="otro"]')).toBeVisible();
    await expect(cartel.locator('[data-fr="ajuste"]')).toHaveCount(0);
    await cartelEntero(page);
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal con el cartel').toBe(true);
    // Los dos botones grandes se pueden tocar (no los tapa nada).
    for (const sel of ['[data-fr="produccion"]', '[data-fr="otro"]']) {
      const b = cartel.locator(sel);
      const r = await b.boundingBox();
      expect(r.height, 'botón grande').toBeGreaterThanOrEqual(44);
      const encima = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('[data-fr]')?.dataset.fr ?? null, [r.x + r.width / 2, r.y + r.height / 2]);
      expect(encima).toBe(sel.match(/"(.*)"/)[1]);
    }
    // La leyenda vieja en bordó ya no está.
    await expect(page.locator('#rt-hecho')).not.toContainText('No había stock de todo');
    await expect(page.locator('#rt-hecho .rt-aviso--grave')).toHaveCount(0);
    await captura(page, `faltante-pregunta-${ancho}`, info);

    await cartel.locator('[data-fr="produccion"]').click();
    const planilla = cartel.locator('[data-fr="planilla"][data-fr-valor="t-2"]');
    await expect(planilla).toHaveText('Máquina 2 · turno Mañana · lote 6237');
    await expect(cartel.locator('[data-fr-valor="t-1"]')).toContainText('pendiente de completar');
    await cartelEntero(page);
    await captura(page, `faltante-planillas-${ancho}`, info);
    await planilla.click();
    await expect(cartel).toContainText('Listo: cuando se cierre la planilla de la Máquina 2 se descuentan de su lote.');
    const llamada = rpc.find(r => r.nombre === 'faltante_en_produccion');
    expect(llamada?.params).toEqual({ p_item_id: 'it-1', p_turno_id: 't-2' });
    await page.locator('#rt-falt-pie [data-falt-pie="cerrar"]').click();
    await expect(page.locator('#rt-falt')).toBeHidden();
    await expect(page.locator('#rt-hecho')).toContainText('Esperando la planilla de Máquina 2 (lote 6237)');
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal en la orden').toBe(true);
    await captura(page, `faltante-esperando-${ancho}`, info);
    expect(errores, 'sin errores de JavaScript').toEqual([]);
  });

  test(`${ancho} px: la Carga, "entró de otro lado" y "dejarlo pendiente"`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirCarga(page);
    await confirmarConFaltante(page);
    const cartel = page.locator('#rt-falt-cuerpo');
    await cartel.locator('[data-fr="otro"]').click();
    await expect(cartel).toContainText('Primero hay que cargar lo que entró');
    const link = cartel.locator('a', { hasText: 'Ir al traspaso de producto terminado' });
    await expect(link).toHaveAttribute('href', 'stock.html?vista=traspaso');
    await expect(link).toHaveAttribute('target', '_blank');
    await cartelEntero(page);
    await captura(page, `faltante-otro-${ancho}`, info);
    await cartel.locator('[data-fr="lote"]').click();
    await expect(cartel.locator('[data-fr-valor="D-0099"]')).toHaveAttribute('aria-pressed', 'true');
    await cartel.locator('[data-fr-motivo]').fill('Traspaso desde Dolce Pasta');
    const boton = cartel.locator('[data-fr="confirmar-lote"]');
    await boton.scrollIntoViewIfNeeded();
    await expect(boton).toBeInViewport();
    await captura(page, `faltante-lote-${ancho}`, info);
    await boton.click();
    await expect(cartel).toContainText('Listo: las 5 cajas salieron del lote D-0099.');
    expect(rpc.find(r => r.nombre === 'faltante_a_lote')?.params).toEqual({ p_item_id: 'it-1', p_lote: 'D-0099', p_motivo: 'Traspaso desde Dolce Pasta' });
    await page.keyboard.press('Escape');
    await expect(page.locator('#rt-falt')).toBeHidden();
    await expect(page.locator('#rt-hecho')).toContainText('Salieron del lote D-0099');
    expect(errores, 'sin errores de JavaScript').toEqual([]);
  });
}

test('390 px: cerrar el cartel sin elegir lo deja pendiente y se puede volver a abrir', async ({ page }) => {
  const errores = vigilarErrores(page);
  const rpc = anotarRpc(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirCarga(page);
  await confirmarConFaltante(page);
  await page.locator('#rt-falt-pie [data-falt-pie="cerrar"]').click();
  await expect(page.locator('#rt-falt')).toBeHidden();
  await expect(page.locator('#rt-hecho')).toContainText('Pendiente: queda para revisar en Administración');
  expect(rpc.some(r => /^faltante_/.test(r.nombre)), 'cerrar no manda nada').toBe(false);
  await page.locator('[data-falt-abrir="it-1"]').click();
  await expect(page.locator('#rt-falt')).toBeVisible();
  expect(errores, 'sin errores de JavaScript').toEqual([]);
});

async function abrirAdministracion(page, cambios) {
  page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(new Date('2026-10-13T10:30:00-03:00'));
  await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=administracion`);
  await page.evaluate(async (c) => {
    localStorage.setItem('barraUnidad.elegida', 'u-n');
    const datos = await fetch('/maqueta/datos/administracion.json').then(r => r.json());
    const filas = datos.rpc.retiros_por_revisar.map(f => f.item_id === 'it-1' ? { ...f, presentacion_id: 'pr1', marca_id: null } : f);
    const items = datos.tablas.orden_retiro_items.map(it => it.id === 'i1' ? { ...it, faltante: 5, revision: 'en_produccion', turno_produccion_id: 't-2' } : it);
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({
      tablas: { orden_retiro_items: items },
      rpc: { retiros_por_revisar: filas, ...c },
    }));
  }, cambios);
  await page.reload();
}

for (const [ancho, alto] of TAMANOS) {
  test(`${ancho} px: Administración → Retiros por revisar con los dos botones`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page, {
      planillas_en_curso: PLANILLAS,
      lotes_para_retiro: [{ lote: 'D-0099', cajas: 40, desde: '2026-10-13' }],
      faltante_a_lote: null,
    });
    await page.locator('[data-pestana="revisar"]').first().click();
    const tarjeta = page.locator('[data-revisar="it-1"]');
    await expect(tarjeta.locator('[data-revisar-produccion="it-1"]')).toBeVisible();
    await expect(tarjeta.locator('[data-revisar-otro="it-1"]')).toBeEnabled();
    await expect(tarjeta.locator('[data-revisar-aceptar="it-1"]')).toHaveText('Otro / ajustar');
    await expect(page.locator('[data-revisar="it-2"] [data-revisar-produccion]')).toHaveCount(0);
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `revisar-botones-${ancho}`, info);

    await tarjeta.locator('[data-revisar-otro="it-1"]').click();
    await expect(tarjeta).toContainText('Primero hay que cargar lo que entró');
    await tarjeta.locator('[data-fr="lote"]').click();
    await tarjeta.locator('[data-fr-motivo]').fill('Traspaso desde Dolce Pasta');
    await tarjeta.locator('[data-fr="confirmar-lote"]').click();
    await expect(page.locator('#ad-revisar-lista')).toContainText('Listo: las 5 cajas salieron del lote D-0099.');
    await expect(page.locator('[data-revisar="it-1"]')).toHaveCount(0);
    expect(rpc.find(r => r.nombre === 'faltante_a_lote')?.params).toEqual({ p_item_id: 'it-1', p_lote: 'D-0099', p_motivo: 'Traspaso desde Dolce Pasta' });
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal después').toBe(true);
    expect(errores, 'sin errores de JavaScript').toEqual([]);
  });
}

test('1280 px: la orden dice "Esperando la planilla de …" en el renglón que espera', async ({ page }, info) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await abrirAdministracion(page, { planillas_en_curso: PLANILLAS });
  await page.locator('[data-pestana="ordenes"]').first().click();
  await page.locator('#ad-ordenes-lista [data-orden="o1"]').click();
  await expect(page.locator('#ad-orden-cuerpo')).toContainText('Esperando la planilla de Máquina 2 (lote 6237)');
  await captura(page, 'orden-esperando-1280', info);
  expect(errores, 'sin errores de JavaScript').toEqual([]);
});
