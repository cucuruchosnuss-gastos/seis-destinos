// VALORIZAR MÁS LEGIBLE (30/10/2026, pedido de Facu), en la maqueta, sin
// credenciales, a 390 y 1280 px:
//  - Al valorizar y en el detalle: "Barquillo 40 x4 · Caja con cono × 252 u. ·
//    CASERATO" y "Soft · Caja sin cono × 224 u." (las unidades en negrita, sin
//    el "· Sin cono" final).
//  - Las condiciones especiales del cliente: el tilde "Caserato · Verasens ·
//    Dipale (−5 %)" baja en vivo SOLO el renglón con CASERATO ("(−5 % · antes
//    $ 35.830,80)", chico y en el color normal) y el total; guardar va a
//    valorizar_con_condiciones con los precios de LISTA.
//  - La orden valorizada: "(−5 % · Caserato · Verasens · Dipale)".
//  - La ficha: "Condiciones especiales", agregar una (conos con buscador) y
//    desactivarla con el interruptor.
// La base responde con 'maqueta.cambios' (no se tocan los datos de otras pruebas).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || `http://localhost:${process.env.E2E_PUERTO_MAQUETA || 4180}`;
const sinCostado = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const nb = (t) => String(t ?? '').replace(/ /g, ' ');

function anotarRpc(page) {
  const rpc = [];
  page.on('console', async (m) => {
    if (!m.text().startsWith('[maqueta] rpc')) return;
    const args = m.args();
    try { rpc.push({ nombre: await args[1].jsonValue(), params: await args[2].jsonValue() }); } catch { /* nada */ }
  });
  return rpc;
}

const CONDS = [
  { id: 'k1', nombre: 'Caserato · Verasens · Dipale', descuento_pct: 5, activa: true, marcas: [{ id: 'm-cas', nombre: 'CASERATO' }], productos: [], alcance: 'conos: CASERATO' },
  { id: 'k2', nombre: 'Venta a Ostera', descuento_pct: 3, activa: true, marcas: [], productos: [], alcance: 'toda la orden' },
];

async function abrirAdministracion(page, { valorizada = false } = {}) {
  page.setDefaultTimeout(15000);
  await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=administracion`);
  await page.evaluate(async ({ valorizada, CONDS }) => {
    localStorage.setItem('barraUnidad.elegida', 'u-n');
    const base = await fetch('/maqueta/datos/administracion.json').then(r => r.json());
    const cli = { ...base.tablas.clientes.find(c => c.id === 'c1'), id: 'c-sur', nombre: 'HELADERIA SUR', apodos: [], proveedor_id: null, limite_credito: null, pct_parte_a: null };
    const productos = [
      { id: 'p-bar', unidad_negocio_id: 'u-n', nombre: 'Barquillo 40 x4', tipo_masa: null, categoria: 'barquillos', orden: 1, activo: true },
      { id: 'p-soft', unidad_negocio_id: 'u-n', nombre: 'Soft', tipo_masa: null, categoria: 'soft', orden: 2, activo: true },
    ];
    const presentaciones = [
      { id: 'pr-bar-con', producto_id: 'p-bar', nombre: 'Caja con cono', con_cono: true, media_caja: false, unidades_por_caja: 252, activa: true, orden: 1, sin_stock: false },
      { id: 'pr-soft-sin', producto_id: 'p-soft', nombre: 'Caja sin cono', con_cono: false, media_caja: false, unidades_por_caja: 224, activa: true, orden: 1, sin_stock: false },
    ];
    const orden = { id: 'o90', numero: 90, codigo: 'N-0090', unidad_negocio_id: 'u-n', fecha: '2026-10-30', estado: 'confirmada',
      estado_valorizacion: valorizada ? 'valorizada' : 'pendiente', total: valorizada ? 112878.52 : 0, moneda: 'ARS', cliente_id: 'c-sur',
      cargada_por: 'emp-9', cargada_en: '2026-10-30T12:00:00Z', transporte: null, observaciones: null, division_pct_a: null,
      condiciones_especiales: valorizada ? ['k1'] : null };
    const items = [
      { id: 'i90a', orden_id: 'o90', orden: 1, presentacion_id: 'pr-bar-con', marca_id: 'm-cas', cajas: 3, unidades: 756,
        precio_caja: valorizada ? 34039.26 : null, subtotal: valorizada ? 102117.78 : null, precio_lista: valorizada ? 35830.8 : null, descuento_pct: valorizada ? 5 : null, condicion_id: valorizada ? 'k1' : null },
      { id: 'i90b', orden_id: 'o90', orden: 2, presentacion_id: 'pr-soft-sin', marca_id: null, cajas: 2, unidades: 448,
        precio_caja: valorizada ? 5380.37 : null, subtotal: valorizada ? 10760.74 : null, precio_lista: null, descuento_pct: null, condicion_id: null },
    ];
    const pvBar = { precio_unitario: 142.1857, precio_caja: 35830.8, unidades_por_caja: 252, producto_unitario: 137.2157, conito_unitario: 4.97, papel_conito: 'comun', lista: 'Mayoristas', recargo_pct: 0, sin_precio: false };
    const pvSoft = { precio_unitario: 24.02, precio_caja: 5380.37, unidades_por_caja: 224, producto_unitario: 24.02, conito_unitario: 0, papel_conito: null, lista: 'Mayoristas', recargo_pct: 0, sin_precio: false };
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({
      tablas: {
        clientes: [cli, ...base.tablas.clientes],
        productos_terminados: [...productos, ...(base.tablas.productos_terminados ?? [])],
        producto_presentaciones: [...presentaciones, ...(base.tablas.producto_presentaciones ?? [])],
        marcas_personalizadas: [{ id: 'm-cas', nombre: 'CASERATO' }, { id: 'm-dip', nombre: 'DIPALE' }, ...(base.tablas.marcas_personalizadas ?? [])],
        ordenes_retiro: [orden, ...base.tablas.ordenes_retiro],
        orden_retiro_items: [...items, ...base.tablas.orden_retiro_items],
        orden_facturas: [],
      },
      rpc: {
        precio_venta: { __segun: [{ si: { p_presentacion_id: 'pr-bar-con' }, r: pvBar }, { si: { p_presentacion_id: 'pr-soft-sin' }, r: pvSoft }] },
        condiciones_especiales_cliente: CONDS,
        guardar_condicion_especial: { id: 'k-nueva' },
        valorizar_con_condiciones: { total: 112878.52, moneda: 'ARS', saldo_cliente: 0, limite_credito: null, supera_limite: false },
        datos_division_orden: 'ERROR:Este cliente no tiene condición de venta: poné el % de la parte A.',
      },
    }));
  }, { valorizada, CONDS });
  await page.reload();
}

for (const [nombre, ancho, alto] of [['390', 390, 844], ['1280', 1280, 900]]) {
  test(`${nombre}: al valorizar, el nombre con sus unidades y el tilde de la condición especial`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page);
    await page.locator('[data-pestana="ordenes"]').first().click();
    await page.locator('#ad-ordenes-lista [data-orden="o90"]').click();
    const cuerpo = page.locator('#ad-orden-cuerpo');
    await expect(cuerpo).toContainText('3 cajas · Barquillo 40 x4 · Caja con cono × 252 u. · CASERATO');
    await expect(cuerpo).toContainText('2 cajas · Soft · Caja sin cono × 224 u.');
    await expect(cuerpo).not.toContainText('Sin cono');
    await page.locator('#ad-btn-valorizar').click();
    await expect(page.locator('#ad-precio-i90a')).toHaveValue('35.830,80');
    const u = cuerpo.locator('.ad-renglon__u');
    await expect(u).toHaveText(['× 252 u.', '× 224 u.']);
    expect(Number(await u.first().evaluate(e => getComputedStyle(e).fontWeight))).toBeGreaterThanOrEqual(600);
    // Las condiciones del cliente, debajo de los renglones.
    const esp = page.locator('#ad-esp-valorizar');
    await expect(esp).toContainText('Condiciones especiales de este cliente');
    await expect(esp).toContainText('Caserato · Verasens · Dipale (−5 %)');
    await expect(esp).toContainText('conos: CASERATO');
    expect(nb(await page.locator('#ad-valorizar-total').textContent())).toBe('Total $ 118.253,14');
    await esp.locator('[data-condicion-valorizar="k1"]').check();
    const desc = cuerpo.locator('[data-descuento-precio="i90a"] .ad-renglon__descuento');
    await expect(desc).toBeVisible();
    expect(nb(await desc.textContent())).toBe('(−5 % · antes $ 35.830,80)');
    expect(nb(await cuerpo.locator('[data-descuento-precio="i90a"] .ad-renglon__con-descuento').textContent())).toBe('$ 34.039,26');
    await expect(cuerpo.locator('[data-descuento-precio="i90b"]')).toBeEmpty();
    expect(nb(await page.locator('#ad-valorizar-total').textContent())).toBe('Total $ 112.878,52');
    // Chico y en el color normal (no el bordó de los errores).
    const estilo = await desc.evaluate(e => ({ tam: parseFloat(getComputedStyle(e).fontSize), color: getComputedStyle(e).color, peso: getComputedStyle(e).fontWeight }));
    expect(estilo.tam).toBeLessThanOrEqual(13.5);
    expect(estilo.peso).toBe('400');
    expect(estilo.color).not.toBe('rgb(122, 28, 28)');
    expect(await sinCostado(page), 'sin scroll de costado').toBe(true);
    await esp.scrollIntoViewIfNeeded();
    await captura(page, `valorizar-legible-${nombre}`, info);
    await page.locator('#ad-valorizar-guardar').click();
    await expect.poll(() => rpc.filter(r => r.nombre === 'valorizar_con_condiciones').length).toBe(1);
    const v = rpc.find(r => r.nombre === 'valorizar_con_condiciones').params;
    expect(v.p_condiciones).toEqual(['k1']);
    expect(v.p_precios.i90a).toBe(35830.8);
    expect(rpc.some(r => r.nombre === 'valorizar_orden_retiro')).toBe(false);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: la orden valorizada dice la condición al lado del precio`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page, { valorizada: true });
    await page.locator('[data-pestana="ordenes"]').first().click();
    await page.locator('#ad-ordenes-lista [data-orden="o90"]').click();
    const cuerpo = page.locator('#ad-orden-cuerpo');
    await expect(cuerpo).toContainText('Barquillo 40 x4 · Caja con cono × 252 u. · CASERATO');
    const d = cuerpo.locator('[data-descuento-guardado]');
    await expect(d).toHaveCount(1);
    await expect(d).toHaveText('(−5 % · Caserato · Verasens · Dipale)');
    expect(nb(await d.locator('xpath=..').textContent())).toContain('$ 34.039,26 x caja (−5 % · Caserato · Verasens · Dipale)');
    expect(await sinCostado(page), 'sin scroll de costado').toBe(true);
    await captura(page, `valorizar-legible-valorizada-${nombre}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: la ficha arma las condiciones especiales`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page);
    await page.locator('[data-pestana="clientes"]').first().click();
    await page.locator('#ad-clientes-lista [data-cliente="c1"]').first().click();
    await page.locator('#ad-btn-ficha').click();
    const caja = page.locator('#ad-f-especiales');
    await expect(caja.locator('[data-esp-fila]')).toHaveCount(2);
    await expect(caja.locator('[data-esp-fila="k1"]')).toContainText('Caserato · Verasens · Dipale');
    await expect(caja.locator('[data-esp-fila="k1"]')).toContainText('−5 %');
    await caja.locator('#ad-esp-agregar').click();
    await page.locator('#ad-esp-nombre').fill('Venta a Ostera');
    await page.locator('#ad-esp-pct').fill('5');
    await expect(page.locator('#ad-esp-conos-opciones')).toContainText('Escribí 2 o 3 letras del cono');
    await page.locator('#ad-esp-cono-buscar').fill('ca');
    await page.locator('#ad-esp-conos-opciones [data-esp-cono="m-cas"]').click();
    await expect(page.locator('#ad-esp-conos-elegidos')).toContainText('CASERATO');
    await page.locator('#ad-esp-productos [data-esp-producto="p-soft"]').click();
    await expect(page.locator('#ad-esp-productos [data-esp-producto="p-soft"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(caja).toContainText('Sin conos ni productos = se descuenta de toda la orden.');
    expect(await sinCostado(page), 'sin scroll de costado').toBe(true);
    await page.locator('#ad-esp-form').scrollIntoViewIfNeeded();
    await captura(page, `valorizar-legible-ficha-${nombre}`, info);
    await page.locator('#ad-esp-guardar').click();
    await expect.poll(() => rpc.filter(r => r.nombre === 'guardar_condicion_especial').length).toBe(1);
    expect(rpc.find(r => r.nombre === 'guardar_condicion_especial').params).toEqual({ p_id: null, p_cliente_id: 'c1', p_nombre: 'Venta a Ostera', p_descuento_pct: 5,
      p_marcas: ['m-cas'], p_productos: ['p-soft'], p_activa: true });
    await expect(page.locator('#ad-esp-form')).toHaveCount(0);
    // Desactivar con el interruptor.
    await caja.locator('[data-esp-activa="k2"]').click();
    await expect.poll(() => rpc.filter(r => r.nombre === 'guardar_condicion_especial').length).toBe(2);
    const g = rpc.filter(r => r.nombre === 'guardar_condicion_especial')[1].params;
    expect(g.p_id).toBe('k2');
    expect(g.p_activa).toBe(false);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
