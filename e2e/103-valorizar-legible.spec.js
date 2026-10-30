// VALORIZAR MÁS LEGIBLE (30/10/2026, pedido de Facu), en la maqueta, sin
// credenciales, a 390 y 1280 px:
//  - Al valorizar y en el detalle: "Barquillo 40 x4 · Caja con cono × 252 u. ·
//    CASERATO" y "Soft · Caja sin cono × 224 u." (las unidades en negrita, sin
//    el "· Sin cono" final).
//  - Si precio_venta trae descuento_pct: su precio va tal cual y al lado
//    "(−5 % CASERATO · antes $ 35.830,80)", chico y en el color normal.
//  - La orden valorizada: "(−5 %)" al lado del precio por caja.
// La base responde con 'maqueta.cambios' (no se tocan los datos de otras pruebas).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || `http://localhost:${process.env.E2E_PUERTO_MAQUETA || 4180}`;
const sinCostado = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const nb = (t) => String(t ?? '').replace(/ /g, ' ');

async function abrirAdministracion(page, { valorizada = false } = {}) {
  page.setDefaultTimeout(15000);
  await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=administracion`);
  await page.evaluate(async ({ valorizada }) => {
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
      cargada_por: 'emp-9', cargada_en: '2026-10-30T12:00:00Z', transporte: null, observaciones: null, division_pct_a: null };
    const items = [
      { id: 'i90a', orden_id: 'o90', orden: 1, presentacion_id: 'pr-bar-con', marca_id: 'm-cas', cajas: 3, unidades: 756,
        precio_caja: valorizada ? 34039.26 : null, subtotal: valorizada ? 102117.78 : null, descuento_pct: valorizada ? 5 : null },
      { id: 'i90b', orden_id: 'o90', orden: 2, presentacion_id: 'pr-soft-sin', marca_id: null, cajas: 2, unidades: 448,
        precio_caja: valorizada ? 5380.37 : null, subtotal: valorizada ? 10760.74 : null, descuento_pct: null },
    ];
    const pvBar = { precio_unitario: 135.0748, precio_caja: 34039.26, precio_caja_sin_descuento: 35830.8, descuento_pct: 5, unidades_por_caja: 252,
      producto_unitario: 130.1, conito_unitario: 4.97, papel_conito: 'comun', lista: 'Mayoristas', recargo_pct: 0, sin_precio: false };
    const pvSoft = { precio_unitario: 24.02, precio_caja: 5380.37, unidades_por_caja: 224, producto_unitario: 24.02, conito_unitario: 0, papel_conito: null,
      lista: 'Mayoristas', recargo_pct: 0, sin_precio: false };
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({
      tablas: {
        clientes: [cli, ...base.tablas.clientes],
        productos_terminados: [...productos, ...(base.tablas.productos_terminados ?? [])],
        producto_presentaciones: [...presentaciones, ...(base.tablas.producto_presentaciones ?? [])],
        marcas_personalizadas: [{ id: 'm-cas', nombre: 'CASERATO' }, ...(base.tablas.marcas_personalizadas ?? [])],
        ordenes_retiro: [orden, ...base.tablas.ordenes_retiro],
        orden_retiro_items: [...items, ...base.tablas.orden_retiro_items],
        orden_facturas: [],
      },
      rpc: {
        precio_venta: { __segun: [{ si: { p_presentacion_id: 'pr-bar-con' }, r: pvBar }, { si: { p_presentacion_id: 'pr-soft-sin' }, r: pvSoft }] },
        datos_division_orden: 'ERROR:Este cliente no tiene condición de venta: poné el % de la parte A.',
      },
    }));
  }, { valorizada });
  await page.reload();
}

for (const [nombre, ancho, alto] of [['390', 390, 844], ['1280', 1280, 900]]) {
  test(`${nombre}: al valorizar, el nombre con sus unidades y el descuento del cono`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page);
    await page.locator('[data-pestana="ordenes"]').first().click();
    await page.locator('#ad-ordenes-lista [data-orden="o90"]').click();
    const cuerpo = page.locator('#ad-orden-cuerpo');
    // En el detalle (sin valorizar todavía), ya con el nombre nuevo.
    await expect(cuerpo).toContainText('3 cajas · Barquillo 40 x4 · Caja con cono × 252 u. · CASERATO');
    await expect(cuerpo).toContainText('2 cajas · Soft · Caja sin cono × 224 u.');
    await expect(cuerpo).not.toContainText('Sin cono');
    await page.locator('#ad-btn-valorizar').click();
    await expect(page.locator('#ad-precio-i90a')).toHaveValue('34.039,26');
    const u = cuerpo.locator('.ad-renglon__u');
    await expect(u).toHaveText(['× 252 u.', '× 224 u.']);
    expect(Number(await u.first().evaluate(e => getComputedStyle(e).fontWeight))).toBeGreaterThanOrEqual(600);
    const desc = cuerpo.locator('[data-descuento]');
    await expect(desc).toHaveCount(1);
    expect(nb(await desc.textContent())).toBe('(−5 % CASERATO · antes $ 35.830,80)');
    // Chico y en el color normal (no el bordó de los errores).
    const estilo = await desc.evaluate(e => ({ tam: parseFloat(getComputedStyle(e).fontSize), color: getComputedStyle(e).color, peso: getComputedStyle(e).fontWeight }));
    expect(estilo.tam).toBeLessThanOrEqual(13.5);
    expect(estilo.peso).toBe('400');
    const grave = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bordo-oscuro').trim());
    expect(estilo.color).not.toBe(grave);
    expect(await sinCostado(page), 'sin scroll de costado').toBe(true);
    await captura(page, `valorizar-legible-${nombre}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: la orden valorizada dice el descuento al lado del precio`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page, { valorizada: true });
    await page.locator('[data-pestana="ordenes"]').first().click();
    await page.locator('#ad-ordenes-lista [data-orden="o90"]').click();
    const cuerpo = page.locator('#ad-orden-cuerpo');
    await expect(cuerpo).toContainText('Barquillo 40 x4 · Caja con cono × 252 u. · CASERATO');
    const d = cuerpo.locator('[data-descuento-guardado]');
    await expect(d).toHaveCount(1);
    await expect(d).toHaveText('(−5 %)');
    expect(nb(await d.locator('xpath=..').textContent())).toContain('$ 34.039,26 x caja (−5 %)');
    expect(await sinCostado(page), 'sin scroll de costado').toBe(true);
    await captura(page, `valorizar-legible-valorizada-${nombre}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
