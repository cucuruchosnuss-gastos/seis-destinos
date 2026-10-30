// SIN CONDICIÓN NO SE INVENTA EL 100/0 y LA FICHA NO PIERDE LA CONDICIÓN
// (30/10/2026, pedido de Facu), en la maqueta, sin credenciales, a 390 y 1280 px:
//  - La orden valorizada de un cliente sin condición de venta (pct_parte_a null)
//    y sin división guardada: N1 y N2 vacíos, el aviso en naranja, sin puntos
//    que imprimir y sin llamar a la base. Escribir el N2 completa el N1; con el
//    tilde "Guardar también como condición del cliente" va
//    guardar_condicion_venta_cliente con ese %.
//  - La ficha: cambiar el % y salir con "‹ Cuenta" sin tocar "Guardar la
//    condición de venta" la guarda sola ("Condición guardada: N1 45% / N2 55%").
// La base responde con 'maqueta.cambios' (no se tocan los datos de otras pruebas).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || `http://localhost:${process.env.E2E_PUERTO_MAQUETA || 4180}`;
const sinCostado = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

function anotarRpc(page) {
  const rpc = [];
  page.on('console', async (m) => {
    if (!m.text().startsWith('[maqueta] rpc')) return;
    const args = m.args();
    try { rpc.push({ nombre: await args[1].jsonValue(), params: await args[2].jsonValue() }); } catch { /* nada */ }
  });
  return rpc;
}

const VENDEDORES = [
  { id: 'v1', nombre: 'Vendedor 1', orden: 1, pct_defecto: 2 },
  { id: 'v2', nombre: 'Vendedor 2', orden: 2, pct_defecto: 3 },
  { id: 'v3', nombre: 'Vendedor 3', orden: 3, pct_defecto: 4 },
];
const RENGLONES = [
  { id: 'i40a', presentacion_id: 'pr1', descripcion: 'Cucurucho grande · Caja x 100', cajas: 10, precio: 6500 },
];
const r2 = (n) => Math.round(n * 100) / 100;
function datos(pctA) {
  const items = RENGLONES.map((it, i) => {
    const a = Math.floor(it.cajas * pctA / 100);
    return { orden: i + 1, tipo: 'retiro', descripcion: it.descripcion, unidad: 'cajas', precio: it.precio, cantidad: it.cajas,
      cant_a: a, cant_b: it.cajas - a, subtotal_a: r2(a * it.precio), subtotal_b: r2((it.cajas - a) * it.precio) };
  });
  const sa = r2(items.reduce((s, it) => s + it.subtotal_a, 0));
  const sb = r2(items.reduce((s, it) => s + it.subtotal_b, 0));
  const comisiones = VENDEDORES.map(v => ({ vendedor_id: v.id, nombre: v.nombre, orden: v.orden, pct: v.pct_defecto, monto: r2(sa * v.pct_defecto / 100) }));
  const tc = r2(comisiones.reduce((s, c) => s + c.monto, 0));
  return { orden_id: 'o40', codigo: 'N-0040', fecha: '2026-10-30', cliente: 'KIOSCO SIN CONDICION', cliente_cuit: null,
    pct_a: pctA, pct_b: 100 - pctA, items, subtotal_a: sa, comisiones, comision_pct_total: 9, comision_total: tc,
    total_a: r2(sa + tc), subtotal_b: sb, total_b: sb, total_orden: 65000, guardada: true, facturas: [] };
}

async function abrirAdministracion(page) {
  page.setDefaultTimeout(15000);
  await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=administracion`);
  const porPct = { __segun: [30, 40].map(p => ({ si: { p_pct_a: p }, r: datos(p) })), __defecto: datos(30) };
  await page.evaluate(async ({ porPct, VENDEDORES, RENGLONES }) => {
    localStorage.setItem('barraUnidad.elegida', 'u-n');
    const base = await fetch('/maqueta/datos/administracion.json').then(r => r.json());
    const sin = { ...base.tablas.clientes.find(c => c.id === 'c1'), id: 'c-sin', codigo_anterior: 400, nombre: 'KIOSCO SIN CONDICION', razon_social: null,
      apodos: [], cuit: null, email: null, proveedor_id: null, limite_credito: null, pct_parte_a: null };
    const clientes = [sin, ...base.tablas.clientes.map(c => ({ ...c, pct_parte_a: c.id === 'c1' ? 30 : (c.pct_parte_a ?? null) }))];
    const orden = { id: 'o40', numero: 40, codigo: 'N-0040', unidad_negocio_id: 'u-n', fecha: '2026-10-30', estado: 'confirmada', estado_valorizacion: 'valorizada',
      total: 65000, moneda: 'ARS', cliente_id: 'c-sin', cargada_por: 'emp-9', cargada_en: '2026-10-30T12:00:00Z', valorizada_en: '2026-10-30T12:30:00Z',
      transporte: null, observaciones: null, division_pct_a: null };
    const items = RENGLONES.map((it, i) => ({ id: it.id, orden_id: 'o40', orden: i + 1, presentacion_id: it.presentacion_id, marca_id: null, cajas: it.cajas,
      unidades: it.cajas * 100, precio_caja: it.precio, subtotal: it.cajas * it.precio }));
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({
      tablas: {
        clientes,
        ordenes_retiro: [orden, ...base.tablas.ordenes_retiro],
        orden_retiro_items: [...items, ...base.tablas.orden_retiro_items],
        orden_facturas: [], vendedores_comision: VENDEDORES, cliente_comisiones: [],
      },
      rpc: {
        // Sin % la base lo rechaza: la pantalla no la tiene que llamar.
        datos_division_orden: { __segun: [{ si: { p_pct_a: null }, r: 'ERROR:Este cliente no tiene condición de venta: poné el % de la parte A.' }], __defecto: porPct.__defecto },
        guardar_division_orden: porPct,
        guardar_condicion_venta_cliente: null,
        guardar_factura_orden: null,
      },
    }));
  }, { porPct, VENDEDORES, RENGLONES });
  await page.reload();
  await page.evaluate(() => { window.__impresiones = 0; window.print = () => { window.__impresiones++; }; });
}

for (const [nombre, ancho, alto] of [['390', 390, 844], ['1280', 1280, 900]]) {
  test(`${nombre}: la orden de un cliente sin condición arranca vacía, con el aviso y el tilde`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page);
    await page.locator('[data-pestana="ordenes"]').first().click();
    await page.locator('#ad-ordenes-lista [data-orden="o40"]').click();

    const fc = page.locator('#ad-orden-facturar');
    await expect(fc).toBeVisible();
    const a = page.locator('#ad-fc-otro');
    const b = page.locator('#ad-fc-otro-b');
    await expect(a).toHaveValue('');
    await expect(b).toHaveValue('');
    const aviso = page.locator('#ad-fc-sin-condicion .ad-aviso--naranja');
    await expect(aviso).toHaveText('Este cliente no tiene condición de venta. Poné el % de N1 y N2 (y si querés, guardala en la ficha del cliente)');
    // En naranja (--naranja-suave de fondo, --naranja-oscuro la letra).
    expect(await aviso.evaluate(e => getComputedStyle(e).backgroundColor)).toBe('rgb(253, 238, 228)');
    expect(await aviso.evaluate(e => getComputedStyle(e).color)).toBe('rgb(143, 47, 8)');
    await expect(page.locator('#ad-fc-punto-a')).toBeHidden();
    await expect(page.locator('#ad-fc-punto-b')).toBeHidden();
    await expect(page.locator('#ad-fc-estado')).toHaveText('Sin el % de N1 y N2 no se puede guardar la división ni armar las órdenes de pedido.');
    await expect(page.locator('#ad-fc [data-fc-pct][aria-pressed="true"]')).toHaveCount(0);
    const tilde = page.locator('#ad-fc-guardar-cliente');
    await expect(tilde).toBeVisible();
    await expect(tilde).not.toBeChecked();
    await expect(page.locator('#ad-fc-cliente')).toContainText('Guardar también como condición del cliente');
    expect(await sinCostado(page), 'sin scroll de costado').toBe(true);
    await fc.scrollIntoViewIfNeeded();
    await captura(page, `condicion-sin-defecto-orden-${nombre}`, info);
    await page.waitForTimeout(400);
    expect(rpc.filter(r => r.nombre === 'datos_division_orden' || r.nombre === 'guardar_division_orden'), 'sin % no se llama a la base').toEqual([]);

    // El tilde, y escribir el N2: completa el N1 y guarda en la orden y en el cliente.
    await tilde.check();
    await expect(page.locator('#ad-fc-cliente-estado')).toHaveText('Se guarda en el cliente cuando pongas el %.');
    await b.fill('70');
    await expect(a).toHaveValue('30');
    await expect(page.locator('#ad-fc-sin-condicion')).toBeEmpty();
    await expect.poll(() => rpc.filter(r => r.nombre === 'guardar_division_orden').length).toBe(1);
    expect(rpc.find(r => r.nombre === 'guardar_division_orden').params.p_pct_a).toBe(30);
    await expect.poll(() => rpc.filter(r => r.nombre === 'guardar_condicion_venta_cliente').length).toBe(1);
    expect(rpc.find(r => r.nombre === 'guardar_condicion_venta_cliente').params).toEqual({ p_cliente_id: 'c-sin', p_pct_a: 30, p_comisiones: null });
    await expect(page.locator('#ad-fc-cliente-estado')).toHaveText('Condición guardada: N1 30% / N2 70% (en el cliente).');
    await expect(page.locator('#ad-fc-condicion')).toHaveText('N1-0040: 30 % · N2-0040: 70 %');
    await expect(page.locator('#ad-fc-punto-a')).toBeVisible();
    await expect(page.locator('#ad-fc-punto-b')).toBeVisible();
    await expect(page.locator('#ad-fc-imprimir-a')).toBeEnabled();
    await expect(page.locator('#ad-fc-estado')).toHaveText('Guardado.');
    expect(await sinCostado(page), 'sin scroll de costado').toBe(true);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: la ficha guarda sola la condición al salir`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page);
    await page.locator('[data-pestana="clientes"]').first().click();
    await page.locator('#ad-clientes-lista [data-cliente="c1"]').first().click();
    await page.locator('#ad-btn-ficha').click();
    await expect(page.locator('#ad-vista-ficha')).toBeVisible();
    await expect(page.locator('#ad-f-pct-a')).toHaveValue('30');
    await expect(page.locator('#ad-vista-ficha')).toContainText('Vacío: sin condición (se pone el % en cada orden, al facturar).');
    await page.locator('#ad-f-pct-a').fill('45');
    await expect(page.locator('#ad-f-pct-b')).toHaveValue('55');
    // Sale sin tocar "Guardar la condición de venta".
    await page.locator('#ad-ficha-volver').click();
    await expect.poll(() => rpc.filter(r => r.nombre === 'guardar_condicion_venta_cliente').length).toBe(1);
    expect(rpc.find(r => r.nombre === 'guardar_condicion_venta_cliente').params.p_pct_a).toBe(45);
    expect(rpc.find(r => r.nombre === 'guardar_condicion_venta_cliente').params.p_cliente_id).toBe('c1');
    await expect(page.locator('#toast-global')).toContainText('Condición guardada: N1 45% / N2 55%');
    await captura(page, `condicion-sin-defecto-ficha-${nombre}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
