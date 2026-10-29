// REMITOS DOLCE: UN SOLO RECORRIDO (29/10/2026, rama ci-prueba/remitos-mas-simple).
// Pedido de Facu: "que Manuel suba la foto y cargue los lotes en el mismo
// lugar". A 390 y 1280 px, sin scroll horizontal ni errores de JS:
//  - maqueta "remitos-dolce-mas-simple" (Manuel, solo retiros:cargar): en
//    Subir el remito leído está en NARANJA "Listo para cargar lotes" (N°,
//    cliente, renglones); tocarlo abre el editor ahí mismo; "‹ Remitos"
//    vuelve a Subir; el renglón dice "× 252 u." en negrita; el cono leído
//    está elegido con la lista cerrada; sin cono, la pista y NINGÚN cono hasta
//    escribir 2 letras; con 2, primero los que empiezan así, en una lista con
//    altura máxima y scroll propio; al elegir, se cierra; "180" encuentra la
//    Caja N°2; el pie "falta repartir X"; al confirmar, VERDE "Orden cargada ·
//    D-0042";
//  - maqueta "remitos-dolce-revisar" (con retiros:ver): la pestaña "Órdenes
//    cargadas" (?pestana=revisar), sin "Revisar" a la vista, y el buscador
//    por N° de remito.
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

const FOTO = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#fffdf5"/>' +
  '<text x="380" y="50" font-size="22" fill="#222">0001-00003100</text><text x="30" y="200" font-size="20">31 Barquillo 40x4 Glace</text></svg>');

// El color de una variable de main.css, como lo devuelve getComputedStyle.
async function colorDe(page, variable) {
  return page.evaluate((v) => {
    const el = document.createElement('div');
    el.style.color = `var(${v})`;
    document.body.appendChild(el);
    const c = getComputedStyle(el).color;
    el.remove();
    return c;
  }, variable);
}

async function abrirSubir(page) {
  page.setDefaultTimeout(15000);
  await page.goto(`${MAQUETA}/modulos/remitos-dolce.html?maqueta=remitos-dolce-mas-simple`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Array.isArray(globalThis.__maquetaTablas?.remitos_precarga));
  await page.evaluate((foto) => {
    localStorage.removeItem('retiros.remitos.cola');
    // Las fechas de la maqueta, a "recién": la lista es de los últimos 7 días.
    const base = Date.parse('2026-10-27T18:00:00Z');
    for (const f of globalThis.__maquetaTablas.remitos_precarga) f.subido_en = new Date(Date.now() - (base - Date.parse(f.subido_en))).toISOString();
    globalThis.__maqueta = { rpc: {}, funciones: {}, firmar: (bucket, ruta) => ({ data: { signedUrl: bucket === 'comprobantes' && /remitos/.test(ruta) ? foto : null }, error: null }) };
  }, FOTO);
  await expect(page.locator('#rt-vista-remitos')).toBeVisible();
}

const renglon = (page, i) => page.locator(`#ad-remito-cuerpo [data-rm-renglon="${i}"]`);

for (const [ancho, alto] of TAMANOS) {
  test(`Subir: la tarjeta naranja abre el remito, conos, "× N u." y confirmar en verde, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirSubir(page);
    await expect(page.locator('#rt-remitos-ayuda')).toHaveText('Sacale una foto a cada remito, de a uno y que se lea entero. Cuando la IA lo lea, tocalo para cargar los lotes y confirmar la orden.');
    await expect(page.locator('#rd-tabs')).toBeHidden();

    // La lista: leyendo (gris), listo (naranja), orden cargada (verde), no se pudo leer (rojo).
    const lista = page.locator('#rt-remitos-lista');
    const tarjeta = (id) => lista.locator(`[data-remito="${id}"]`);
    // Puede aparecer primero el que dice "Leyendo…" y después el resto.
    await expect(tarjeta('rp-listo')).toBeVisible();
    await expect(tarjeta('rp-listo')).toHaveClass(/rt-remito--precargada/);
    await expect(tarjeta('rp-listo').locator('.rt-remito__estado')).toHaveText('Listo para cargar lotes');
    await expect(tarjeta('rp-listo')).toContainText('Remito N° 0001-00003100 · Almacén Rosario · 3 renglones');
    await expect(tarjeta('rp-conf').locator('.rt-remito__estado')).toHaveText('Orden cargada · D-0005');
    await expect(tarjeta('rp-err').locator('.rt-remito__estado')).toHaveText('No se pudo leer');
    await expect(tarjeta('rp-leyendo').locator('.rt-remito__estado')).toHaveText('Leyendo…');
    const naranja = await colorDe(page, '--naranja');
    const verde = await colorDe(page, '--verde');
    const gris = await colorDe(page, '--rt-texto-2');
    expect(await tarjeta('rp-listo').evaluate(e => getComputedStyle(e).borderTopColor)).toBe(naranja);
    expect(await tarjeta('rp-conf').evaluate(e => getComputedStyle(e).borderTopColor)).toBe(verde);
    expect(await tarjeta('rp-leyendo').locator('.rt-remito__estado').evaluate(e => getComputedStyle(e).color)).toBe(gris);
    await expect(page.locator('body')).not.toContainText('Precargado');
    await sinScrollHorizontal(page);
    await captura(page, `mas-simple-lista-${ancho}`, info);

    // Tocar la tarjeta naranja: el editor, ahí mismo. "‹ Remitos" vuelve a Subir.
    await tarjeta('rp-listo').click();
    await expect(page.locator('#ad-vista-remito')).toBeVisible();
    await expect(page.locator('#ad-remito-volver')).toHaveText('‹ Remitos');
    await expect(page.locator('#rd-sub')).toHaveText('Cargar lotes');
    await page.locator('#ad-remito-volver').click();
    await expect(page.locator('#rt-vista-remitos')).toBeVisible();
    await tarjeta('rp-listo').click();
    await expect(page.locator('#ad-vista-remito')).toBeVisible();
    await expect(page.locator('#ad-remito-titulo')).toHaveText('Remito N° 0001-00003100');

    // Renglón 1: "× 252 u." en negrita; el cono que leyó la IA, elegido y cerrado.
    const unidades = renglon(page, 0).locator('.ad-rm-elegido__nombre .ad-rm-unidades');
    await expect(unidades).toHaveText('× 252 u.');
    expect(Number(await unidades.evaluate(e => getComputedStyle(e).fontWeight))).toBeGreaterThanOrEqual(800);
    await expect(renglon(page, 0).locator('.ad-rm-elegido__nombre')).toHaveText('Barquillo 40 x4 · Caja con cono × 252 u. · GLACE');
    await expect(renglon(page, 0).locator('[data-rm-cono-elegido="0"]')).toContainText('GLACE');
    await expect(renglon(page, 0).locator('[data-rm-cono-cambiar="0"]')).toBeVisible();
    await expect(renglon(page, 0).locator('[data-rm-marca]')).toHaveCount(0);
    await expect(page.locator('[data-rm-lotes-pie="0"]')).toHaveText('Lotes: 25 de 31 cajas · falta repartir 6 cajas');
    await expect(page.locator('[data-rm-lotes-pie="2"]')).toHaveText('Lotes: 1 de 2 cajas · falta repartir 1 caja');

    // Renglón 2: amarillo "Controlar" (en amarillo de verdad), sin cono: la pista y ningún cono.
    await expect(renglon(page, 1).locator('.ad-sello--amarillo')).toHaveText('Controlar');
    expect(await renglon(page, 1).locator('.ad-sello--amarillo').evaluate(e => getComputedStyle(e).backgroundColor)).toBe(
      await page.evaluate(() => { const d = document.createElement('div'); d.style.backgroundColor = 'var(--amarillo-suave)'; document.body.appendChild(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c; }));
    const buscarCono = renglon(page, 1).locator('[data-rm-cono-buscar="1"]');
    const conos = renglon(page, 1).locator('[data-rm-marca="1"]');
    await expect(buscarCono).toBeVisible();
    await expect(renglon(page, 1).locator('.ad-rm-pista')).toHaveText('Escribí 2 o 3 letras del cono');
    await expect(conos).toHaveCount(0);
    await buscarCono.fill('g');
    await expect(conos).toHaveCount(0);
    await expect(renglon(page, 1).locator('.ad-rm-pista')).toHaveText('Escribí 2 o 3 letras del cono');
    await buscarCono.fill('gl');
    await expect(conos).toHaveCount(4);
    expect(await conos.evaluateAll(bs => bs.map(b => b.textContent))).toEqual(['GLACE', 'Glória', 'LA GLORIOSA', 'IGLÚ']);
    // Muchos: hasta 20, en una lista con altura máxima y scroll propio, de a uno por renglón.
    await buscarCono.fill('co');
    await expect(conos).toHaveCount(20);
    const caja = renglon(page, 1).locator('[data-rm-marcas="1"]');
    const medidas = await caja.evaluate(e => {
      const s = getComputedStyle(e);
      const a = e.querySelectorAll('[data-rm-marca]');
      return { alto: e.getBoundingClientRect().height, scroll: e.scrollHeight > e.clientHeight + 1, overflow: s.overflowY, max: s.maxHeight,
        rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
        vertical: a[1].getBoundingClientRect().top >= a[0].getBoundingClientRect().bottom - 1, ancho: a[0].getBoundingClientRect().width / e.clientWidth };
    });
    expect(medidas.overflow).toBe('auto');
    expect(parseFloat(medidas.max)).toBeCloseTo(16 * medidas.rem, 0);
    expect(medidas.alto).toBeLessThanOrEqual(16 * medidas.rem + 1);
    expect(medidas.scroll).toBe(true);
    expect(medidas.vertical).toBe(true);
    expect(medidas.ancho).toBeGreaterThan(0.95);
    // La lista se desplaza sola (la página no).
    await caja.evaluate(e => { e.scrollTop = e.scrollHeight; });
    expect(await caja.evaluate(e => e.scrollTop)).toBeGreaterThan(0);
    await sinScrollHorizontal(page);
    await caja.evaluate(e => e.scrollIntoView({ block: 'center' }));
    await captura(page, `mas-simple-conos-${ancho}`, info);
    // Elegir: se cierra y queda el cono con "Cambiar".
    await buscarCono.fill('glo');
    await conos.filter({ hasText: 'LA GLORIOSA' }).click();
    await expect(renglon(page, 1).locator('[data-rm-cono-elegido="1"]')).toContainText('LA GLORIOSA');
    await expect(renglon(page, 1).locator('[data-rm-cono-buscar="1"]')).toHaveCount(0);
    await expect(conos).toHaveCount(0);
    await expect.poll(() => rpc.filter(r => r.nombre === 'actualizar_remito_precarga').pop()?.params?.p_items?.[1]?.marca_id).toBe('m-d-lag');
    await expect(renglon(page, 1).locator('.ad-rm-elegido__nombre')).toHaveText('Barquillo 40 x4 · Caja N°2 con cono × 180 u. · LA GLORIOSA');

    // El selector de producto: "180" encuentra la Caja N°2; se deja como estaba.
    await renglon(page, 2).locator('[data-rm-cambiar="2"]').click();
    await renglon(page, 2).locator('[data-rm-buscar="2"]').fill('180');
    await expect(renglon(page, 2).locator('[data-rm-producto="2"]')).toHaveCount(1);
    await expect(renglon(page, 2).locator('[data-rm-producto="2"][data-presentacion="pr-d-b40-n2"]')).toContainText('Barquillo 40 x4 · Caja N°2 con cono × 180 u.');
    const opciones = await renglon(page, 2).locator('[data-rm-opciones="2"]').evaluate(e => ({ overflow: getComputedStyle(e).overflowY, max: getComputedStyle(e).maxHeight }));
    expect(opciones.overflow).toBe('auto');
    expect(opciones.max).not.toBe('none');
    await renglon(page, 2).locator('[data-rm-cambiar-no="2"]').click();
    await expect(renglon(page, 2).locator('.ad-rm-elegido__nombre')).toHaveText('Cucuruchón Chico · Media caja × 128 u.');

    // Los lotes completos: 10430 25 + 10432 6; renglón 2: C 4; renglón 3: 10431 2.
    await page.locator('[data-rm-lote-agregar="0"]').click();
    await page.locator('[data-rm-lote="0"][data-k="1"]').fill('10432');
    await page.locator('[data-rm-lote-cajas="0"][data-k="1"]').fill('6');
    await expect(page.locator('[data-rm-lotes-pie="0"]')).toContainText('✓ Asignado completo');
    await page.locator('[data-rm-lote="1"][data-k="0"]').fill('C');
    await page.locator('[data-rm-lote-cajas="1"][data-k="0"]').fill('4');
    await page.locator('[data-rm-lote-cajas="2"][data-k="0"]').fill('2');
    await expect(page.locator('[data-rm-lotes-pie="2"]')).toContainText('✓ Asignado completo');
    await sinScrollHorizontal(page);
    await captura(page, `mas-simple-editor-${ancho}`, info);

    // Confirmar: vuelve a Subir y la tarjeta pasa a VERDE con el código.
    await page.evaluate(() => { globalThis.__maqueta.rpc.confirmar_remito_precarga = { orden_id: 'o-d-42', codigo: 'D-0042', numero_remito: '0001-00003100', talonario: 'oficial' }; });
    await page.locator('[data-rm-accion="confirmar"]').click();
    await expect(page.locator('#rt-vista-remitos')).toBeVisible();
    await expect(tarjeta('rp-listo')).toHaveClass(/rt-remito--confirmada/);
    await expect(tarjeta('rp-listo').locator('.rt-remito__estado')).toHaveText('Orden cargada · D-0042');
    expect(await tarjeta('rp-listo').evaluate(e => e.tagName)).toBe('DIV');
    expect(rpc.filter(r => r.nombre === 'confirmar_remito_precarga').map(r => r.params)).toEqual([{ p_id: 'rp-listo' }]);
    await sinScrollHorizontal(page);
    await captura(page, `mas-simple-verde-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`"Órdenes cargadas" (?pestana=revisar), sin "Revisar" y con buscador por N°, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    page.setDefaultTimeout(15000);
    await page.goto(`${MAQUETA}/modulos/remitos-dolce.html?maqueta=remitos-dolce-revisar&pestana=revisar`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#rd-vista-revisar')).toBeVisible();
    await expect(page.locator('#rd-tab-revisar')).toHaveText('Órdenes cargadas');
    await expect(page.locator('#rd-tab-revisar')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#rd-sub')).toHaveText('Órdenes cargadas');
    await expect(page.locator('#ad-remitos')).toContainText('Sin terminar · para cargar lotes');
    await expect(page.locator('#ad-remitos [data-remito="rm-1"]')).toContainText('Listo para cargar lotes');
    // El sello en naranja (la regla base .ad-sello ya no lo pisa).
    expect(await page.locator('#ad-remitos [data-remito="rm-1"] .ad-sello--rm-precargada').evaluate(e => getComputedStyle(e).borderTopColor)).toBe(await colorDe(page, '--naranja'));
    const lista = page.locator('#rd-ordenes-lista');
    await expect(lista.locator('[data-orden]').first()).toBeVisible();
    const texto = await page.locator('body').innerText();
    expect(texto).not.toMatch(/Revisar|Precargado|por revisar/i);
    // El buscador por N° de remito.
    await expect(page.locator('#rd-buscar-orden')).toBeVisible();
    await page.locator('#rd-buscar-orden').fill('3099');
    expect(await lista.locator('[data-orden]').evaluateAll(bs => bs.map(b => b.dataset.orden))).toEqual(['od3']);
    await page.locator('#rd-buscar-orden').fill('99999');
    await expect(lista).toContainText('Ningún remito de este talonario tiene «99999» en el número.');
    await page.locator('#rd-buscar-orden').fill('');
    expect(await lista.locator('[data-orden]').evaluateAll(bs => bs.map(b => b.dataset.orden))).toEqual(['od3', 'od1', 'od2', 'od5']);
    await sinScrollHorizontal(page);
    await captura(page, `mas-simple-ordenes-${ancho}`, info);
    // Desde acá, el remito también se abre y "‹ Remitos" vuelve acá.
    await page.locator('#ad-remitos [data-remito="rm-1"]').click();
    await expect(page.locator('#ad-vista-remito')).toBeVisible();
    await page.locator('#ad-remito-volver').click();
    await expect(page.locator('#rd-vista-revisar')).toBeVisible();
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
