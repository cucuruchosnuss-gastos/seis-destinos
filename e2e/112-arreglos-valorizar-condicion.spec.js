// ARREGLOS DE LA AUDITORÍA DEL 30/10/2026 — VALORIZAR Y LA CONDICIÓN DE VENTA
// (31/10/2026, puntos 1 y 6), en la maqueta, sin credenciales, a 390 y 1280 px:
//  - Corregir la valorización de una orden con la condición "Promo vieja"
//    (hoy desactivada): sale tildada con "(desactivada)" y el aviso; la bolsa
//    de 30 kg de harina con precio_lista 583,33 se propone en 17.500,00 (no
//    17.499,90); guardar manda la condición y el de lista.
//  - Si no se pudieron leer las condiciones: el aviso "No se pudieron leer las
//    condiciones especiales; reintentá", Guardar apagado y sin llamar a la
//    base; "Volver a leer las condiciones" las trae y recién ahí se guarda.
//  - La pantalla de facturar: "sin condición" sale del cliente leído de la
//    base (la lista del celular decía 40); si la lectura falla, ni el aviso
//    ni el tilde.
//  - La ficha: si no se puede guardar la condición al salir, se queda en la
//    ficha con el error.
// La base responde con 'maqueta.cambios' (no se tocan los datos de otras pruebas).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || `http://localhost:${process.env.E2E_PUERTO_MAQUETA || 4180}`;
const sinCostado = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const AVISO = 'No se pudieron leer las condiciones especiales; reintentá';

function anotarRpc(page) {
  const rpc = [];
  page.on('console', async (m) => {
    if (!m.text().startsWith('[maqueta] rpc')) return;
    const args = m.args();
    try { rpc.push({ nombre: await args[1].jsonValue(), params: await args[2].jsonValue() }); } catch { /* nada */ }
  });
  return rpc;
}

const K1 = { id: 'k1', nombre: 'Venta a Ostera', descuento_pct: 3, activa: true, marcas: [], productos: [], alcance: 'toda la orden' };
const K4 = { id: 'k4', nombre: 'Promo vieja', descuento_pct: 5, activa: false, marcas: [], productos: [], alcance: 'toda la orden' };
const CONDICIONES = { __segun: [{ si: { p_solo_activas: false }, r: [K4, K1] }], __defecto: [K1] };

// `condiciones`: lo que responde condiciones_especiales_cliente; `listaPct`: el
// % de Anatolia en la lista de clientes (la que se lee al entrar).
async function abrirAdministracion(page, { condiciones = CONDICIONES, listaPct = null, guardarCondicion = null } = {}) {
  page.setDefaultTimeout(15000);
  await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=administracion`);
  await page.evaluate(async ({ condiciones, listaPct, guardarCondicion }) => {
    localStorage.setItem('barraUnidad.elegida', 'u-n');
    const base = await fetch('/maqueta/datos/administracion.json').then(r => r.json());
    const clientes = base.tablas.clientes.map(c => c.id === 'c1' ? { ...c, pct_parte_a: listaPct } : c);
    // La N-0112 de Anatolia, valorizada con "Promo vieja" (5 % a toda la orden).
    const orden = { id: 'o112', numero: 112, codigo: 'N-0112', unidad_negocio_id: 'u-n', fecha: '2026-10-30', estado: 'confirmada', estado_valorizacion: 'valorizada',
      total: 64124.4, moneda: 'ARS', cliente_id: 'c1', cargada_por: 'emp-9', cargada_en: '2026-10-30T12:00:00Z', valorizada_en: '2026-10-30T12:30:00Z',
      transporte: null, observaciones: null, division_pct_a: null, condiciones_especiales: ['k4'] };
    const items = [
      { id: 'z1', orden_id: 'o112', orden: 1, presentacion_id: 'pr1', marca_id: null, cajas: 5, unidades: 500, insumo_id: null, cantidad: null,
        precio_caja: 2850, subtotal: 14250, precio_lista: 3000, descuento_pct: 5, condicion_id: 'k4', lote: null },
      { id: 'z2', orden_id: 'o112', orden: 2, presentacion_id: null, marca_id: null, cajas: null, unidades: null, insumo_id: 'ins-30', cantidad: 90,
        precio_caja: 554.16, subtotal: 49874.4, precio_lista: 583.33, descuento_pct: 5, condicion_id: 'k4', lote: null },
    ];
    const harina30 = { id: 'ins-30', nombre: 'Harina 0000', marca: 'Wali', unidad_medida: 'kg', categoria: 'Harinas', activo: true, vista_preferida: 'bulto', contenido_bulto: 30 };
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({
      tablas: {
        clientes,
        insumos: [...base.tablas.insumos, harina30],
        ordenes_retiro: [orden, ...base.tablas.ordenes_retiro],
        orden_retiro_items: [...items, ...base.tablas.orden_retiro_items],
        orden_facturas: [], vendedores_comision: [], cliente_comisiones: [],
      },
      rpc: {
        condiciones_especiales_cliente: condiciones,
        valorizar_con_condiciones: { total: 64124.4, moneda: 'ARS', saldo_cliente: 0, limite_credito: null, supera_limite: false },
        datos_division_orden: 'ERROR:Este cliente no tiene condición de venta: poné el % de la parte A.',
        guardar_condicion_venta_cliente: guardarCondicion,
      },
    }));
  }, { condiciones, listaPct, guardarCondicion });
  await page.reload();
}

async function abrirOrden(page) {
  await page.locator('[data-pestana="ordenes"]').first().click();
  await page.locator('#ad-ordenes-lista [data-orden="o112"]').click();
  await expect(page.locator('#ad-orden-cuerpo')).toContainText('3 bultos de 30');
}

for (const [nombre, ancho, alto] of [['390', 390, 844], ['1280', 1280, 900]]) {
  test(`${nombre}: corregir la valorización: la condición desactivada tildada y la bolsa en 17.500`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page);
    await abrirOrden(page);
    await page.locator('#ad-btn-corregir-valor').click();
    // 1b: la bolsa de 30 kg con condición, en 17.500 justos (antes 17.499,9).
    await expect(page.locator('#ad-precio-z2')).toHaveValue('17.500');
    // 1c: "Promo vieja" tildada con "(desactivada)" y el aviso.
    const esp = page.locator('#ad-esp-valorizar');
    await expect(esp).toContainText('Promo vieja (−5 %) (desactivada)');
    await expect(esp.locator('[data-condicion-valorizar="k4"]')).toBeChecked();
    await expect(esp.locator('[data-condicion-valorizar="k1"]')).not.toBeChecked();
    await expect(esp.locator('[data-condicion-desactivada]')).toHaveText('La orden tenía la condición «Promo vieja», que hoy está desactivada: sigue tildada y se descuenta. Destildala si ya no va.');
    expect(rpc.some(r => r.nombre === 'condiciones_especiales_cliente' && r.params.p_solo_activas === false)).toBe(true);
    expect(await sinCostado(page), 'sin scroll de costado').toBe(true);
    await esp.scrollIntoViewIfNeeded();
    await captura(page, `arreglos-valorizar-desactivada-${nombre}`, info);
    await page.locator('#ad-valorizar-guardar').click();
    await expect.poll(() => rpc.filter(r => r.nombre === 'valorizar_con_condiciones').length).toBe(1);
    const v = rpc.find(r => r.nombre === 'valorizar_con_condiciones').params;
    expect(v.p_condiciones).toEqual(['k4']);
    expect(v.p_precios.z1).toBe(3000);
    expect(v.p_precios.z2).toBeCloseTo(17500 / 30, 4);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: sin poder leer las condiciones no se guarda hasta volver a leerlas`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page, { condiciones: 'ERROR:sin conexión' });
    await abrirOrden(page);
    await page.locator('#ad-btn-corregir-valor').click();
    const aviso = page.locator('#ad-esp-valorizar [data-condiciones-sin-leer]');
    await expect(aviso).toHaveText(AVISO);
    await expect(page.locator('#ad-valorizar-guardar')).toBeDisabled();
    expect(await sinCostado(page), 'sin scroll de costado').toBe(true);
    await aviso.scrollIntoViewIfNeeded();
    await captura(page, `arreglos-valorizar-sin-leer-${nombre}`, info);
    await page.waitForTimeout(300);
    expect(rpc.filter(r => r.nombre === 'valorizar_con_condiciones'), 'no manda p_condiciones vacío').toEqual([]);
    // Vuelve la conexión: "Volver a leer las condiciones".
    await page.evaluate(({ K1, K4 }) => { globalThis.__maqueta = { rpc: { condiciones_especiales_cliente: (p) => p.p_solo_activas === false ? [K4, K1] : [K1] } } }, { K1, K4 });
    await page.locator('#ad-valorizar-releer-condiciones').click();
    await expect(page.locator('#ad-esp-valorizar [data-condicion-valorizar="k4"]')).toBeChecked();
    await expect(page.locator('#ad-esp-valorizar [data-condiciones-sin-leer]')).toHaveCount(0);
    await expect(page.locator('#ad-valorizar-guardar')).toBeEnabled();
    await page.locator('#ad-valorizar-guardar').click();
    await expect.poll(() => rpc.filter(r => r.nombre === 'valorizar_con_condiciones').length).toBe(1);
    expect(rpc.find(r => r.nombre === 'valorizar_con_condiciones').params.p_condiciones).toEqual(['k4']);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: "sin condición" sale del cliente leído de la base`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    // La lista del celular dice 40; en la base ya no tiene condición.
    await abrirAdministracion(page, { listaPct: 40 });
    await page.locator('[data-pestana="ordenes"]').first().click();
    await expect(page.locator('#ad-ordenes-lista [data-orden="o112"]')).toBeVisible();
    await page.evaluate(() => { globalThis.__maquetaTablas.clientes = globalThis.__maquetaTablas.clientes.map(c => c.id === 'c1' ? { ...c, pct_parte_a: null } : c) });
    await page.locator('#ad-ordenes-lista [data-orden="o112"]').click();
    await expect(page.locator('#ad-fc-sin-condicion [data-fc-sin-condicion]')).toBeVisible();
    await expect(page.locator('#ad-fc-guardar-cliente')).toBeVisible();
    await expect(page.locator('#ad-fc-otro')).toHaveValue('');
    expect(await sinCostado(page), 'sin scroll de costado').toBe(true);
    await page.locator('#ad-orden-facturar').scrollIntoViewIfNeeded();
    await captura(page, `arreglos-condicion-de-la-base-${nombre}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: si no se pudo leer el cliente, ni "sin condición" ni el tilde`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page);
    await page.locator('[data-pestana="ordenes"]').first().click();
    await expect(page.locator('#ad-ordenes-lista [data-orden="o112"]')).toBeVisible();
    await page.evaluate(() => { globalThis.__maquetaTablas.clientes = 'ERROR:sin conexión' });
    await page.locator('#ad-ordenes-lista [data-orden="o112"]').click();
    await expect(page.locator('#ad-fc-sin-condicion [data-fc-cliente-sin-leer]')).toContainText('No se pudo leer la condición de venta del cliente');
    await expect(page.locator('#ad-fc-sin-condicion [data-fc-sin-condicion]')).toHaveCount(0);
    await expect(page.locator('#ad-fc-cliente')).toBeHidden();
    expect(await sinCostado(page), 'sin scroll de costado').toBe(true);
    await page.locator('#ad-orden-facturar').scrollIntoViewIfNeeded();
    await captura(page, `arreglos-condicion-sin-leer-${nombre}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: la ficha no se cierra si no se pudo guardar la condición al salir`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page, { listaPct: 30, guardarCondicion: 'ERROR:No tenés permiso sobre este cliente.' });
    await page.locator('[data-pestana="clientes"]').first().click();
    await page.locator('#ad-clientes-lista [data-cliente="c1"]').first().click();
    await page.locator('#ad-btn-ficha').click();
    await expect(page.locator('#ad-vista-ficha')).toBeVisible();
    await page.locator('#ad-f-pct-a').fill('45');
    await page.locator('#ad-ficha-volver').click();
    await expect.poll(() => rpc.filter(r => r.nombre === 'guardar_condicion_venta_cliente').length).toBe(1);
    await expect(page.locator('#ad-f-condicion-error')).toHaveText('No tenés permiso sobre este cliente.');
    await expect(page.locator('#ad-vista-ficha')).toBeVisible();
    await expect(page.locator('#ad-f-pct-a')).toHaveValue('45');
    await expect(page.locator('#toast-global')).toContainText('No se guardó la condición de venta de Distribuidora Anatolia: No tenés permiso sobre este cliente.');
    expect(await sinCostado(page), 'sin scroll de costado').toBe(true);
    await captura(page, `arreglos-ficha-no-sale-${nombre}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
