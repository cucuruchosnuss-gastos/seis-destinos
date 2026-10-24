// DEVOLUCIONES Y REPOSICIONES EN LA ORDEN DE RETIRO (22/10/2026), en la
// maqueta, sin credenciales, a 390, 360, tablet (768) y 1280 px:
//  - La CARGA (retiros.html): un retiro, una devolución "Se descuenta de la
//    orden" (Rotura, lote, vuelven al stock) y una reposición "Se reponen"
//    (Otro + texto) de un lote; la sección "Devoluciones" de la orden, el
//    resumen, lo que viaja en registrar_orden_retiro y la hoja impresa.
//  - ADMINISTRACIÓN: el detalle con cada tipo, la valorización (la devolución
//    con su precio editable y el subtotal negativo, la reposición en $ 0 sin
//    campo, el total "a favor del cliente"), la hoja con precios y la hoja
//    "Dividir para facturar" con la devolución en negativo.
//  - RETIROS POR REVISAR (24/10/2026): la reposición que salió sin stock
//    lleva el sello "Reposición" (retiros_por_revisar devuelve 'tipo').
// Las dos hojas (Carga y Administración) siguen en MEDIA HOJA con la letra y
// las medidas nuevas de la "hoja sin cortes". Antes era el 54 (renumerado el
// 24/10/2026: el 54 ya lo usaban conos-parecidos y hoja-sin-cortes).
// Los datos se suman con 'maqueta.cambios' (no se tocan los de otras pruebas).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || `http://localhost:${process.env.E2E_PUERTO_MAQUETA || 4180}`;

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

// La orden ya confirmada, como la devolvería mis_ordenes_retiro.
const MIA = {
  orden_id: 'o-dev', codigo: 'N-0040', fecha: '2026-10-22', estado: 'confirmada', cliente: 'Distribuidora Anatolia', transporte: 'Expreso Norte', observaciones: null,
  cargada_en: '2026-10-22T13:00:00Z',
  renglones: [
    { orden: 1, tipo: 'producto', producto: 'Cucurucho grande', presentacion: 'Caja x 100', marca: null, cajas: 5, unidades: 500, movimiento: 'retiro', item_id: 'it-1', lotes: [{ lote: '7010-2', cajas: 5 }] },
    { orden: 2, tipo: 'producto', producto: 'Cucurucho grande', presentacion: 'Caja x 100', marca: null, cajas: 2, unidades: 200, movimiento: 'devolucion', item_id: 'it-2',
      motivo_devolucion: 'Rotura', lote_devuelto: '6249-1', destino_devuelto: 'stock', lotes: null },
    { orden: 3, tipo: 'producto', producto: 'Cucurucho chico', presentacion: 'Caja x 320', marca: null, cajas: 1, unidades: 320, movimiento: 'reposicion', item_id: 'it-3',
      motivo_devolucion: 'llegó mojada', lote_devuelto: null, destino_devuelto: 'descarte', lotes: [{ lote: '7010-2', cajas: 1 }] },
  ],
};

async function abrirCarga(page) {
  page.setDefaultTimeout(15000);
  await page.goto(`${MAQUETA}/modulos/retiros.html?maqueta=retiros`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async ({ MIA }) => {
    const datos = await fetch('/maqueta/datos/retiros.json').then(r => r.json());
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({
      rpc: {
        lotes_para_retiro: [{ lote: '7010-2', cajas: 30, desde: '2026-09-10' }],
        registrar_orden_retiro: { orden_id: 'o-dev', numero: 40, codigo: 'N-0040', stock_insuficiente: [] },
        mis_ordenes_retiro: [MIA, ...datos.rpc.mis_ordenes_retiro],
      },
    }));
    localStorage.removeItem('retiros.borrador');
  }, { MIA });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { window.__impresiones = 0; window.print = () => { window.__impresiones++; }; });
  await expect(page.locator('[data-empresa]').first()).toBeVisible();
  await page.locator('[data-empresa="u-n"]').click();
  await page.locator('#rt-cliente-buscar').fill('turco');
  await page.locator('[data-cliente]').first().click();
}

// Lo que se ve del renglón entra a lo ancho y los botones se pueden tocar.
async function entra(page, sel, nombre) {
  const caja = await page.locator(sel).first().boundingBox();
  const vp = page.viewportSize();
  expect(caja.x >= -0.5 && caja.x + caja.width <= vp.width + 0.5, `${nombre}: entra a lo ancho`).toBe(true);
  expect(await sinScrollHorizontal(page), `${nombre}: sin scroll horizontal`).toBe(true);
}

const TAMANOS = [['390', 390, 844], ['360', 360, 740], ['tablet', 768, 1024], ['1280', 1280, 900]];

for (const [nombre, ancho, alto] of TAMANOS) {
  test(`${nombre}: la carga con una devolución y una reposición, el resumen y la hoja`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirCarga(page);

    // Un retiro de 5 cajas.
    await page.locator('#rt-renglones [data-r-producto][data-presentacion="pr1"]').first().click();
    await page.locator('[data-r-cajas="0"]').fill('5');
    await page.locator('[data-r-listo="0"]').click();

    // La devolución: se descuenta, Rotura, lote, vuelven al stock.
    await page.locator('#rt-agregar-devolucion').click();
    await expect(page.locator('#rt-renglones .rt-sello--dev')).toBeVisible();
    await expect(page.locator('#rt-renglones [data-r-insumo]')).toHaveCount(0);
    await page.locator('#rt-renglones [data-r-producto][data-presentacion="pr1"]').first().click();
    await expect(page.locator('#rt-renglones label[for="rt-r-cajas-1"]')).toHaveText('¿Cuántas cajas devuelve?');
    await page.locator('[data-r-cajas="1"]').fill('2');
    await page.locator('[data-r-dev-motivo="1"][data-valor="Rotura"]').click();
    await page.locator('[data-r-dev-lote="1"]').fill('6249-1');
    await page.locator('[data-r-dev-trato="1"][data-valor="descuenta"]').click();
    await page.locator('[data-r-dev-destino="1"][data-valor="stock"]').click();
    await expect(page.locator('[data-r-dev-trato="1"][data-valor="descuenta"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#rt-renglones .rt-lote__titulo')).toHaveCount(0);
    await entra(page, '.rt-dev', 'la devolución');
    const tratos = await page.locator('.rt-dev-trato').evaluateAll(els => els.map(e => e.getBoundingClientRect().height));
    expect(Math.min(...tratos), 'los dos botones grandes').toBeGreaterThanOrEqual(56);
    await captura(page, `devolucion-renglon-${nombre}`, info);
    await page.locator('[data-r-listo="1"]').click();

    // La reposición: Otro + texto, se reponen de un lote.
    await page.locator('#rt-agregar-devolucion').click();
    await page.locator('#rt-renglones [data-r-producto][data-presentacion="pr2"]').first().click();
    await page.locator('[data-r-cajas="2"]').fill('1');
    await page.locator('[data-r-dev-motivo="2"][data-valor="Otro"]').click();
    await page.locator('[data-r-listo="2"]').click();
    await expect(page.locator('[data-r-listo-error="2"]')).toContainText('al menos 3 letras');
    await page.locator('[data-r-dev-texto="2"]').fill('llegó mojada');
    await page.locator('[data-r-dev-trato="2"][data-valor="repone"]').click();
    await expect(page.locator('#rt-renglones .rt-lote__titulo')).toContainText('¿De qué lote salen las que se reponen?');
    await page.locator('[data-r-completar="2"]').click();
    await entra(page, '.rt-editor', 'la reposición');
    await page.locator('[data-r-listo="2"]').click();

    // La orden armada: las devoluciones en su sección, sin plata.
    const lista = page.locator('#rt-orden-lista');
    await expect(lista.locator('.rt-dev-subtitulo')).toHaveText('Devoluciones · 2');
    await expect(lista).toContainText('Rotura · lote 6249-1 · vuelven al stock');
    await expect(lista).toContainText('Se repone · sin cargo · llegó mojada · se descartan');
    await expect(lista.locator('.rt-item__q')).toHaveText(['5', '−2', '1']);
    expect(await lista.innerText()).not.toMatch(/\$/);
    await entra(page, '#rt-orden-lista', 'la orden armada');
    await captura(page, `devolucion-orden-${nombre}`, info);

    // El resumen y la confirmación.
    await page.locator('#rt-revisar').click();
    await expect(page.locator('#rt-vista-resumen')).toBeVisible();
    const resumen = page.locator('#rt-resumen');
    await expect(resumen).toContainText('Devoluciones · 2');
    await expect(resumen).toContainText('Se descuenta de la orden · Rotura · lote 6249-1 · vuelven al stock');
    await expect(resumen.locator('.rt-total__valor')).toContainText('6 cajas · devueltas 3');
    await entra(page, '#rt-resumen', 'el resumen');
    await page.locator('#rt-confirmar').click();
    await expect(page.locator('#rt-hecho')).toContainText('N-0040');
    const items = rpc.find(r => r.nombre === 'registrar_orden_retiro').params.p_items;
    expect(items.map(i => i.tipo ?? 'retiro')).toEqual(['retiro', 'devolucion', 'reposicion']);
    expect(items[1]).toMatchObject({ presentacion_id: 'pr1', cajas: 2, motivo: 'Rotura', lote_devuelto: '6249-1', destino: 'stock' });
    expect(items[1].lotes).toBeUndefined();
    expect(items[2]).toMatchObject({ presentacion_id: 'pr2', motivo: 'llegó mojada', lote_devuelto: null, destino: 'descarte', lotes: [{ lote: '7010-2', cajas: 1 }] });

    // La hoja impresa: la sección DEVOLUCIONES, en media hoja, sin plata.
    await expect(page.locator('#rt-hecho-imprimir')).toBeEnabled();
    await page.locator('#rt-hecho-imprimir').click();
    await expect.poll(() => page.evaluate(() => window.__impresiones)).toBe(1);
    await page.emulateMedia({ media: 'print' });
    const hoja = page.locator('#rt-impresion');
    await expect(hoja.locator('.rh-devuelto__titulo')).toHaveCount(2);
    // Con la letra y las medidas nuevas de la "hoja sin cortes" (24/10/2026):
    // original + duplicado con su sección DEVOLUCIONES siguen en UNA A4.
    await expect(hoja.locator('.rh-hoja--media'), 'la hoja con devoluciones va en media hoja').toHaveCount(1);
    await expect(hoja.locator('.rh-hoja--media .rh-copia')).toHaveCount(2);
    await expect(hoja.locator('.rh-hoja--media .rh-copia').nth(1).locator('.rh-devuelto__titulo')).toHaveCount(1);
    await expect(hoja.locator('.rh-copia').first().locator('.rh-cajas')).toHaveText(['5', '−2', '1', '6']);
    await expect(hoja.locator('.rh-copia').first()).toContainText('Devolución · Rotura · lote 6249-1 · vuelven al stock');
    await expect(hoja.locator('.rh-copia').first()).toContainText('TOTAL DE CAJAS · devueltas 3');
    expect(await hoja.innerText()).not.toMatch(/\$/);
    const afuera = await page.evaluate(() => {
      const out = [];
      for (const c of document.querySelectorAll('#rt-impresion .rh-copia')) {
        const rc = c.getBoundingClientRect();
        for (const tr of c.querySelectorAll('tr')) { const r = tr.getBoundingClientRect(); if (r.bottom > rc.bottom + 0.5) out.push(tr.textContent.slice(0, 40)) }
      }
      return out;
    });
    expect(afuera, 'ningún renglón se sale de su copia').toEqual([]);
    await captura(page, `devolucion-hoja-carga-${nombre}`, info);
    await page.emulateMedia({ media: 'screen' });

    // Mis retiros: el detalle con el tipo de cada renglón.
    await page.locator('#rt-otra').click();
    // Con varias empresas, la orden nueva vuelve a preguntar cuál.
    await page.locator('[data-empresa="u-n"]').click();
    await page.locator('#rt-btn-mis').click();
    await page.locator('[data-mia="o-dev"]').click();
    await expect(page.locator('#rt-vista-mio')).toContainText('Devoluciones · 2');
    await expect(page.locator('#rt-vista-mio')).toContainText('−2 cajas · Cucurucho grande');
    await entra(page, '#rt-vista-mio .rt-lista', 'mis retiros');

    await page.evaluate(() => sessionStorage.removeItem('maqueta.cambios'));
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

// ── Administración ──────────────────────────────────────────────────────────
const VENDEDORES = [
  { id: 'v1', nombre: 'Vendedor 1', orden: 1, pct_defecto: 2 },
  { id: 'v2', nombre: 'Vendedor 2', orden: 2, pct_defecto: 3 },
  { id: 'v3', nombre: 'Vendedor 3', orden: 3, pct_defecto: 4 },
];
const ORDEN = (id, numero, valorizada) => ({ id, numero, codigo: `N-00${numero}`, unidad_negocio_id: 'u-n', fecha: '2026-10-22', estado: 'confirmada',
  estado_valorizacion: valorizada ? 'valorizada' : 'pendiente', total: valorizada ? -1500 : 0, moneda: 'ARS', cliente_id: 'c1', cargada_por: 'emp-9',
  cargada_en: '2026-10-22T15:00:00Z', transporte: null, observaciones: null });
const ITEMS = (orden, valorizada) => [
  { id: `${orden}-1`, orden_id: orden, orden: 1, presentacion_id: 'pr1', marca_id: null, cajas: 1, unidades: 100, insumo_id: null, cantidad: null,
    precio_caja: valorizada ? 3000 : null, subtotal: valorizada ? 3000 : null, tipo: 'retiro' },
  { id: `${orden}-2`, orden_id: orden, orden: 2, presentacion_id: 'pr1', marca_id: null, cajas: 2, unidades: 200, insumo_id: null, cantidad: null,
    precio_caja: valorizada ? 3000 : null, subtotal: valorizada ? -6000 : null, tipo: 'devolucion', motivo_devolucion: 'Rotura', lote_devuelto: '6249-1', destino_devuelto: 'stock' },
  { id: `${orden}-3`, orden_id: orden, orden: 3, presentacion_id: 'pr2', marca_id: null, cajas: 1, unidades: 320, insumo_id: null, cantidad: null,
    precio_caja: valorizada ? 0 : null, subtotal: valorizada ? 0 : null, tipo: 'reposicion', motivo_devolucion: 'Humedad', lote_devuelto: null, destino_devuelto: 'descarte' },
];
const DIVISION = {
  orden_id: 'o40', codigo: 'N-0040', fecha: '2026-10-22', cliente: 'Distribuidora Anatolia', cliente_cuit: '30712345678', pct_a: 50, pct_b: 50,
  items: [
    { orden: 1, tipo: 'retiro', descripcion: 'Cucurucho grande · Caja x 100', unidad: 'cajas', precio: 3000, cantidad: 1, cant_a: 0, cant_b: 1, subtotal_a: 0, subtotal_b: 3000 },
    { orden: 2, tipo: 'devolucion', descripcion: 'Devolución: Cucurucho grande · Caja x 100', unidad: 'cajas', precio: 3000, cantidad: -2, cant_a: -1, cant_b: -1, subtotal_a: -3000, subtotal_b: -3000 },
    { orden: 3, tipo: 'reposicion', descripcion: 'Reposición: Cucurucho chico · Caja x 320', unidad: 'cajas', precio: 0, cantidad: 1, cant_a: 0, cant_b: 1, subtotal_a: 0, subtotal_b: 0 },
  ],
  subtotal_a: -3000, comisiones: VENDEDORES.map(v => ({ vendedor_id: v.id, nombre: v.nombre, orden: v.orden, pct: v.pct_defecto, monto: -3000 * v.pct_defecto / 100 })),
  comision_pct_total: 9, comision_total: -270, total_a: -3270, subtotal_b: 0, total_b: 0, total_orden: -1500, guardada: false, facturas: [],
};

async function abrirAdministracion(page) {
  page.setDefaultTimeout(15000);
  await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=administracion`);
  await page.evaluate(async ({ o40, o41, i40, i41, DIVISION, VENDEDORES }) => {
    localStorage.setItem('barraUnidad.elegida', 'u-n');
    const datos = await fetch('/maqueta/datos/administracion.json').then(r => r.json());
    const t = datos.tablas;
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({
      tablas: {
        clientes: t.clientes.map(c => ({ ...c, pct_parte_a: c.id === 'c1' ? 50 : null })),
        ordenes_retiro: [o40, o41, ...t.ordenes_retiro],
        orden_retiro_items: [...i40, ...i41, ...t.orden_retiro_items],
        stock_terminado_movimientos: [...t.stock_terminado_movimientos,
          { unidad_negocio_id: 'u-n', presentacion_id: 'pr1', marca_id: null, lote: '7010-2', cajas: -1, tipo: 'despacho', orden_retiro_id: 'o40', orden_retiro_item_id: 'o40-1' },
          { unidad_negocio_id: 'u-n', presentacion_id: 'pr2', marca_id: null, lote: '7011-2', cajas: -1, tipo: 'despacho', orden_retiro_id: 'o40', orden_retiro_item_id: 'o40-3' }],
        orden_facturas: [], vendedores_comision: VENDEDORES, cliente_comisiones: [],
      },
      rpc: { datos_division_orden: DIVISION, guardar_division_orden: { ...DIVISION, guardada: true }, valorizar_orden_retiro: { total: -3000, moneda: 'ARS', saldo_cliente: 0, limite_credito: null, supera_limite: false } },
    }));
  }, { o40: ORDEN('o40', 40, true), o41: ORDEN('o41', 41, false), i40: ITEMS('o40', true), i41: ITEMS('o41', false), DIVISION, VENDEDORES });
  await page.reload();
  await page.evaluate(() => { window.__impresiones = 0; window.print = () => { window.__impresiones++; }; });
  await page.locator('[data-pestana="ordenes"]').first().click();
  await expect(page.locator('#ad-vista-ordenes')).toBeVisible();
}

for (const [nombre, ancho, alto] of TAMANOS) {
  test(`${nombre}: Administración — el detalle, valorizar, la hoja y dividir para facturar`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page);
    // La lista: lo que salió (retiro + reposición) y lo que devolvió.
    await expect(page.locator('#ad-ordenes-lista [data-orden="o40"]')).toContainText('2 cajas · devolvió 3');
    await expect(page.locator('#ad-ordenes-lista [data-orden="o40"]')).toContainText('a favor del cliente');

    // El detalle de la valorizada.
    await page.locator('#ad-ordenes-lista [data-orden="o40"]').click();
    const cuerpo = page.locator('#ad-orden-cuerpo');
    await expect(cuerpo.locator('.ad-subtitulo--dev')).toHaveText('Devoluciones · 2');
    await expect(cuerpo.locator('.ad-sello--dev')).toHaveText(['Devolución', 'Reposición']);
    await expect(cuerpo).toContainText('−2 cajas · Cucurucho grande · Caja x 100');
    await expect(cuerpo).toContainText('Devolución · Rotura · lote 6249-1 · vuelven al stock');
    await expect(cuerpo).toContainText('Se repone · Humedad · se descartan · sale de lotes 7011-2 (1)');
    await expect(cuerpo).toContainText('$ -6.000,00');
    await expect(cuerpo).toContainText('a favor del cliente');
    await entra(page, '#ad-orden-cuerpo', 'el detalle');
    await captura(page, `devolucion-admin-detalle-${nombre}`, info);

    // La hoja con precios.
    await page.locator('#ad-btn-imprimir').click();
    await expect.poll(() => page.evaluate(() => window.__impresiones)).toBe(1);
    await page.emulateMedia({ media: 'print' });
    const hoja = page.locator('#ad-impresion .rh-copia').first();
    await expect(hoja.locator('.rh-devuelto__titulo')).toHaveText('DEVOLUCIONES');
    await expect(page.locator('#ad-impresion .rh-hoja--media'), 'la hoja con precios y devoluciones va en media hoja').toHaveCount(1);
    await expect(hoja).toContainText('$ -6.000,00');
    await expect(hoja).toContainText('Se repone');
    await expect(hoja).toContainText('a favor del cliente');
    await captura(page, `devolucion-admin-hoja-${nombre}`, info);
    await page.emulateMedia({ media: 'screen' });

    // Dividir para facturar: la devolución en negativo, la reposición en $ 0.
    await page.locator('#ad-btn-dividir').click();
    await expect(page.locator('#ad-dv')).toBeVisible();
    const b = page.locator('#ad-dv-vista [data-parte="B"]');
    await expect(b).toContainText('Devolución: Cucurucho grande · Caja x 100');
    await expect(b).toContainText('-1 caja');
    await expect(b).toContainText('Reposición: Cucurucho chico · Caja x 320');
    await expect(page.locator('#ad-dv-vista [data-parte="A"] tbody tr')).toHaveCount(1);
    await expect(page.locator('#ad-dv-vista .ad-dvh__pie')).toContainText('a favor del cliente');
    expect(await sinScrollHorizontal(page), 'la ventana sin scroll horizontal').toBe(true);
    await captura(page, `devolucion-admin-division-${nombre}`, info);
    await page.locator('#ad-dv-guardar').click();
    await expect.poll(() => page.evaluate(() => window.__impresiones)).toBe(2);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('#ad-impresion [data-parte="B"]')).toContainText('$ -3.000,00');
    await page.emulateMedia({ media: 'screen' });

    // Valorizar la pendiente: la reposición sin campo de precio.
    await page.keyboard.press('Escape');
    await expect(page.locator('#ad-dv')).toBeHidden();
    await page.locator('[data-pestana="ordenes"]').first().click();
    await page.locator('#ad-ordenes-lista [data-orden="o41"]').click();
    await page.locator('#ad-btn-valorizar').click();
    await expect(page.locator('[data-precio="o41-2"]')).toBeVisible();
    await expect(page.locator('[data-precio="o41-3"]')).toHaveCount(0);
    await expect(page.locator('#ad-valorizar-total')).toHaveText('Total $ -3.000,00 · a favor del cliente');
    await page.locator('[data-precio="o41-2"]').fill('2500');
    await expect(page.locator('#ad-valorizar-total')).toHaveText('Total $ -2.000,00 · a favor del cliente');
    await entra(page, '#ad-orden-cuerpo', 'valorizar');
    await captura(page, `devolucion-admin-valorizar-${nombre}`, info);
    await page.locator('#ad-valorizar-guardar').click();
    await expect.poll(() => rpc.filter(r => r.nombre === 'valorizar_orden_retiro').length).toBe(1);
    expect(rpc.find(r => r.nombre === 'valorizar_orden_retiro').params).toEqual({ p_orden_id: 'o41', p_precios: { 'o41-1': 3000, 'o41-2': 2500, 'o41-3': 0 } });

    await page.evaluate(() => sessionStorage.removeItem('maqueta.cambios'));
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

// ── Retiros por revisar: la reposición (24/10/2026) ─────────────────────────
// retiros_por_revisar() devuelve 'tipo': la tarjeta de una reposición que
// salió sin stock dice "Reposición"; la de un retiro, no.
for (const [nombre, ancho, alto] of TAMANOS) {
  test(`${nombre}: Retiros por revisar — la reposición se marca`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    page.setDefaultTimeout(15000);
    await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=administracion`);
    await page.evaluate(async () => {
      localStorage.setItem('barraUnidad.elegida', 'u-n');
      const datos = await fetch('/maqueta/datos/administracion.json').then(r => r.json());
      const filas = datos.rpc.retiros_por_revisar.map(f => ({ ...f, tipo: 'retiro', presentacion_id: f.unidad === 'cajas' ? 'pr1' : null, marca_id: null }));
      filas.push({ item_id: 'it-rep', orden_id: 'o1', codigo: 'N-0042', fecha: '2026-09-27', cliente: 'Distribuidora Anatolia',
        que: 'Cucurucho chico · Caja x 320 · con un nombre de marca bastante largo para el celular', pedidas: 2, faltante: 2, unidad: 'cajas',
        cargada_por: 'Emanuel Romero', presentacion_id: 'pr2', marca_id: null, tipo: 'reposicion' });
      sessionStorage.setItem('maqueta.cambios', JSON.stringify({ rpc: { retiros_por_revisar: filas } }));
    });
    await page.reload();
    await page.locator('[data-pestana="revisar"]').first().click();
    const rep = page.locator('[data-revisar="it-rep"]');
    await expect(rep.locator('.ad-sello--dev')).toHaveText('Reposición');
    await expect(rep).toContainText('Se llevó 2 cajas · faltaban 2 cajas en stock');
    await expect(rep.locator('[data-revisar-produccion="it-rep"]')).toBeVisible();
    await expect(page.locator('[data-revisar="it-1"] .ad-sello--dev')).toHaveCount(0);
    await expect(page.locator('#ad-revisar-lista .ad-sello--dev')).toHaveCount(1);
    await expect(page.locator('#ad-revisar-cuenta')).toHaveText('3 renglones por revisar');
    // El sello entra a lo ancho de la tarjeta y la tarjeta en la pantalla.
    await rep.scrollIntoViewIfNeeded();
    const caja = await rep.boundingBox();
    const sello = await rep.locator('.ad-sello--dev').boundingBox();
    expect(sello.x >= caja.x - 0.5 && sello.x + sello.width <= caja.x + caja.width + 0.5, 'el sello entra en la tarjeta').toBe(true);
    await entra(page, '[data-revisar="it-rep"]', 'la tarjeta de la reposición');
    await captura(page, `revisar-reposicion-${nombre}`, info);
    await page.evaluate(() => sessionStorage.removeItem('maqueta.cambios'));
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
