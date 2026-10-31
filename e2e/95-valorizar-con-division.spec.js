// VALORIZAR CON LA DIVISIÓN EN UNA SOLA PANTALLA (28/10/2026), el caso real:
// la N-0036 de ICARDI (condición 40 / 60, Vendedor 1 al 21 %), en la maqueta,
// sin credenciales, a 390 y 1280 px:
//  - Valorizar: la condición del cliente se guarda sola (guardar_division_orden
//    con 40) y en la MISMA pantalla quedan "N1-0036: 40 % · N2-0036: 60 %",
//    los botones 100/0 … 40/60, "Otro %", los 3 vendedores y los dos puntos
//    con sus importes, su Imprimir, su Compartir PDF y su factura de ARCA.
//  - El listado de la izquierda (en la compu) queda "Valorizada" SIN recargar.
//  - Cambiar la condición o un vendedor guarda solo y recalcula.
//  - Imprimir el N2 saca solo el N2 (sin nada del N1), con "ORDEN DE PEDIDO"
//    y "N2-0036" grandes y centrados; el N1 con el vendedor sin %.
//  - "Parte A/B", "Dividir para facturar" y "Comisión sin cargar" en ningún lado.
//  - Volver a la pestaña relee el listado.
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
  { id: 'i36a', presentacion_id: 'pr1', descripcion: 'Cucurucho grande · Caja x 100', cajas: 60, precio: 6500 },
  { id: 'i36b', presentacion_id: 'pr3', descripcion: 'Cucurucho choco · Caja x 50', cajas: 36, precio: 5819.44 },
];
const r2 = (n) => Math.round(n * 100) / 100;
// Lo que respondería datos_division_orden / guardar_division_orden (la cuenta
// de la base: cant_a = floor(cant * pct / 100)).
function datos(pctA, pcts = [21, 0, 0]) {
  const items = RENGLONES.map((it, i) => {
    const a = Math.floor(it.cajas * pctA / 100);
    return { orden: i + 1, tipo: 'retiro', descripcion: it.descripcion, unidad: 'cajas', precio: it.precio, cantidad: it.cajas,
      cant_a: a, cant_b: it.cajas - a, subtotal_a: r2(a * it.precio), subtotal_b: r2((it.cajas - a) * it.precio) };
  });
  const sa = r2(items.reduce((s, it) => s + it.subtotal_a, 0));
  const sb = r2(items.reduce((s, it) => s + it.subtotal_b, 0));
  const comisiones = VENDEDORES.map((v, i) => ({ vendedor_id: v.id, nombre: v.nombre, orden: v.orden, pct: pcts[i], monto: r2(sa * pcts[i] / 100) }));
  const tc = r2(comisiones.reduce((s, c) => s + c.monto, 0));
  return { orden_id: 'o36', codigo: 'N-0036', fecha: '2026-10-28', cliente: 'ICARDI REPRESENTACIONES S.A.', cliente_cuit: '30711222333',
    pct_a: pctA, pct_b: 100 - pctA, items, subtotal_a: sa, comisiones, comision_pct_total: pcts.reduce((s, p) => s + p, 0), comision_total: tc,
    total_a: r2(sa + tc), subtotal_b: sb, total_b: sb, total_orden: 599499.84, guardada: true, facturas: [] };
}

async function abrirAdministracion(page) {
  page.setDefaultTimeout(15000);
  await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=administracion`);
  const porPct = { __segun: [40, 50, 80, 100].map(p => ({ si: { p_pct_a: p }, r: datos(p) })), __defecto: datos(40) };
  await page.evaluate(async ({ porPct, VENDEDORES, RENGLONES }) => {
    localStorage.setItem('barraUnidad.elegida', 'u-n');
    const base = await fetch('/maqueta/datos/administracion.json').then(r => r.json());
    const icardi = { ...base.tablas.clientes.find(c => c.id === 'c1'), id: 'c-icardi', codigo_anterior: 336, nombre: 'ICARDI REPRESENTACIONES S.A.', razon_social: null,
      apodos: [], cuit: '30711222333', email: null, proveedor_id: null, limite_credito: null, pct_parte_a: 40 };
    const orden = { id: 'o36', numero: 36, codigo: 'N-0036', unidad_negocio_id: 'u-n', fecha: '2026-10-28', estado: 'confirmada', estado_valorizacion: 'pendiente',
      total: 0, moneda: 'ARS', cliente_id: 'c-icardi', cargada_por: 'emp-9', cargada_en: '2026-10-28T12:00:00Z', transporte: null, observaciones: null, division_pct_a: null };
    const items = RENGLONES.map((it, i) => ({ id: it.id, orden_id: 'o36', orden: i + 1, presentacion_id: it.presentacion_id, marca_id: null, cajas: it.cajas,
      unidades: it.cajas * 50, precio_caja: null, subtotal: null }));
    const pv = (precio) => ({ precio_unitario: precio / 100, precio_caja: precio, unidades_por_caja: 100, producto_unitario: precio / 100, conito_unitario: 0, papel_conito: null, lista: 'Mayoristas', recargo_pct: 0, sin_precio: false });
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({
      tablas: {
        clientes: [icardi, ...base.tablas.clientes],
        ordenes_retiro: [orden, ...base.tablas.ordenes_retiro],
        orden_retiro_items: [...items, ...base.tablas.orden_retiro_items],
        orden_facturas: [], vendedores_comision: VENDEDORES, cliente_comisiones: [], cliente_movimientos: [],
      },
      rpc: {
        precio_venta: { __segun: [{ si: { p_presentacion_id: 'pr1', p_marca_id: null }, r: pv(6500) }, { si: { p_presentacion_id: 'pr3', p_marca_id: null }, r: pv(5819.44) }] },
        datos_division_orden: porPct,
        guardar_division_orden: porPct,
        guardar_factura_orden: null,
      },
    }));
  }, { porPct, VENDEDORES, RENGLONES });
  await page.reload();
  await page.evaluate(() => { window.__impresiones = 0; window.print = () => { window.__impresiones++; }; });
}

for (const [nombre, ancho, alto] of [['390', 390, 844], ['1280', 1280, 900]]) {
  test(`${nombre}: la N-0036 de Icardi, valorizada y dividida en la misma pantalla`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page);
    await page.locator('[data-pestana="ordenes"]').first().click();
    const fila = page.locator('#ad-ordenes-lista [data-orden="o36"]');
    await expect(fila).toContainText('sin valorizar');
    await expect(page.locator('#ad-vista-ordenes')).not.toContainText('Comisión sin cargar');
    await fila.click();

    // Valorizar: los precios de la lista.
    await page.locator('#ad-btn-valorizar').click();
    await expect(page.locator('#ad-orden-cuerpo [data-precio="i36a"]')).toHaveValue('6.500');
    await expect(page.locator('#ad-orden-facturar')).toBeHidden();
    // La base valoriza: la orden queda valorizada (las tablas de la maqueta, en vivo).
    await page.evaluate(() => {
      globalThis.__maqueta = { rpc: { get valorizar_con_condiciones() {
        const o = globalThis.__maquetaTablas.ordenes_retiro.find(x => x.id === 'o36');
        Object.assign(o, { estado_valorizacion: 'valorizada', total: 599499.84, valorizada_en: '2026-10-28T12:30:00Z' });
        for (const it of globalThis.__maquetaTablas.orden_retiro_items.filter(x => x.orden_id === 'o36')) {
          it.precio_caja = it.presentacion_id === 'pr1' ? 6500 : 5819.44;
          it.subtotal = Math.round(it.cajas * it.precio_caja * 100) / 100;
        }
        // guardar_division_orden deja la condición en la orden.
        o.division_pct_a = 40;
        return { total: 599499.84, moneda: 'ARS', saldo_cliente: 599499.84, limite_credito: null, supera_limite: false };
      } } };
    });
    await page.locator('#ad-valorizar-guardar').click();

    // En la misma pantalla: la condición guardada sola y los dos puntos.
    const fc = page.locator('#ad-orden-facturar');
    await expect(fc).toBeVisible();
    await expect.poll(() => rpc.filter(r => r.nombre === 'guardar_division_orden').length).toBe(1);
    expect(rpc.find(r => r.nombre === 'guardar_division_orden').params).toEqual({ p_orden_id: 'o36', p_pct_a: 40, p_comisiones: null });
    await expect(page.locator('#ad-fc-condicion')).toHaveText('N1-0036: 40 % · N2-0036: 60 %');
    await expect(page.locator('#ad-fc-rapida-40')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#ad-fc [data-fc-pct]')).toHaveText(['100/0', '80/20', '50/50', '40/60']);
    await expect(page.locator('#ad-fc-otro')).toHaveValue('40');
    await expect(page.locator('#ad-fc-v1')).toHaveValue('21');
    await expect(page.locator('#ad-fc-punto-a h3')).toHaveText('N1-0036');
    await expect(page.locator('#ad-fc-punto-b h3')).toHaveText('N2-0036');
    await expect(page.locator('#ad-fc-totales-a')).toContainText('Total productos: $ 237.472,16');
    await expect(page.locator('#ad-fc-totales-a [data-comision-vendedor]')).toHaveText(['Vendedor 1: $ 49.869,15']);
    await expect(page.locator('#ad-fc-totales-a')).toContainText('TOTAL: $ 287.341,31');
    await expect(page.locator('#ad-fc-totales-b')).toHaveText('TOTAL: $ 362.027,68');
    await expect(page.locator('#ad-fc-estado')).toHaveText('Guardado.');
    await expect(page.locator('#ad-btn-dividir')).toHaveCount(0);
    await expect(page.locator('#ad-dv')).toHaveCount(0);
    const todo = await page.locator('body').innerText();
    expect(todo).not.toMatch(/Parte [AB]\b|PARTE [AB]\b|Dividir para facturar|Comisión sin cargar|N-0036-[AB]/);
    expect(await sinCostado(page), 'sin scroll de costado con los dos puntos').toBe(true);
    await page.locator('#ad-fc').scrollIntoViewIfNeeded();
    await captura(page, `valorizar-division-puntos-${nombre}`, info);

    // El listado, al día sin recargar (en la compu se ve al lado; en el celular, al volver).
    if (ancho >= 1100) {
      await expect(fila).toContainText('Valorizada');
      await expect(fila).toContainText('$ 599.499,84');
      await expect(fila).not.toContainText('sin valorizar');
    }

    // 50/50: guarda solo (con un retardo) y recalcula.
    await page.locator('#ad-fc-rapida-50').click();
    await expect(page.locator('#ad-fc-condicion')).toHaveText('N1-0036: 50 % · N2-0036: 50 %');
    await expect.poll(() => rpc.filter(r => r.nombre === 'guardar_division_orden').length).toBe(2);
    expect(rpc.filter(r => r.nombre === 'guardar_division_orden')[1].params)
      .toEqual({ p_orden_id: 'o36', p_pct_a: 50, p_comisiones: [{ vendedor_id: 'v1', pct: 21 }, { vendedor_id: 'v2', pct: 0 }, { vendedor_id: 'v3', pct: 0 }] });
    await expect(page.locator('#ad-fc-totales-a')).toContainText('Total productos: $ 299.749,92');
    await expect(page.locator('#ad-fc-estado')).toHaveText('Guardado.');

    // Otro %: 100 → un solo punto.
    await page.locator('#ad-fc-otro').fill('100');
    await expect.poll(() => rpc.filter(r => r.nombre === 'guardar_division_orden').pop().params.p_pct_a).toBe(100);
    await expect(page.locator('#ad-fc-punto-b')).toBeHidden();
    await expect(page.locator('#ad-fc-punto-a')).toBeVisible();
    await page.locator('#ad-fc-rapida-40').click();
    await expect.poll(() => rpc.filter(r => r.nombre === 'guardar_division_orden').pop().params.p_pct_a).toBe(40);
    await expect(page.locator('#ad-fc-punto-b')).toBeVisible();

    // Un vendedor: el 2 al 5 % recalcula el N1.
    await page.evaluate((d) => { globalThis.__maqueta = { rpc: { guardar_division_orden: d } }; }, datos(40, [21, 5, 0]));
    const antes = rpc.filter(r => r.nombre === 'guardar_division_orden').length;
    await page.locator('#ad-fc-v2').fill('5');
    await expect.poll(() => rpc.filter(r => r.nombre === 'guardar_division_orden').length).toBe(antes + 1);
    expect(rpc.filter(r => r.nombre === 'guardar_division_orden').pop().params.p_comisiones)
      .toEqual([{ vendedor_id: 'v1', pct: 21 }, { vendedor_id: 'v2', pct: 5 }, { vendedor_id: 'v3', pct: 0 }]);
    await expect(page.locator('#ad-fc-totales-a [data-comision-vendedor]')).toHaveText(['Vendedor 1: $ 49.869,15', 'Vendedor 2: $ 11.873,61']);
    await expect(page.locator('#ad-fc-estado')).toHaveText('Guardado.');

    // La factura del N1.
    await page.evaluate(() => { globalThis.__maqueta = null; });
    await page.locator('#ad-fc-numero-a').fill('0001-00000123');
    await page.locator('#ad-fc-factura-a').click();
    await expect.poll(() => rpc.filter(r => r.nombre === 'guardar_factura_orden').length).toBe(1);
    expect(rpc.find(r => r.nombre === 'guardar_factura_orden').params).toEqual({ p_orden_id: 'o36', p_parte: 'A', p_numero: '0001-00000123', p_archivo_url: null });
    await expect(page.locator('#ad-fc-guardada-a')).toHaveText('Factura 0001-00000123');
    await expect(page.locator('#toast-global')).toContainText('N1-0036: se guardó la factura 0001-00000123.');

    // Imprimir el N2: SOLO el N2, sin nada del N1 (ni la factura, ni el %, ni el pie).
    await page.locator('#ad-fc-imprimir-b').click();
    await expect.poll(() => page.evaluate(() => window.__impresiones)).toBe(1);
    await page.emulateMedia({ media: 'print' });
    const hoja = page.locator('#ad-impresion');
    await expect(hoja).toBeVisible();
    await expect(hoja.locator('.opv')).toHaveCount(1);
    await expect(hoja.locator('.opv__titulo')).toHaveText('ORDEN DE PEDIDO');
    await expect(hoja.locator('.opv__codigo')).toHaveText('N2-0036');
    await expect(hoja.locator('.opv__fecha')).toHaveText('Fecha 28/10/2026');
    await expect(hoja.locator('.opv__totales')).toHaveText('TOTAL: $ 362.027,68');
    const textoN2 = await hoja.innerText();
    expect(textoN2).not.toMatch(/N1-0036|Vendedor|comisi|Total productos|Factura|%|total de la orden|599\.499/);
    // Grande y centrado: 22 pt y 28 pt (29,3 y 37,3 px).
    const estilos = await hoja.evaluate((h) => {
      const t = getComputedStyle(h.querySelector('.opv__titulo'));
      const c = getComputedStyle(h.querySelector('.opv__codigo'));
      return { t: parseFloat(t.fontSize), c: parseFloat(c.fontSize), alin: getComputedStyle(h.querySelector('.opv__cab')).textAlign, peso: c.fontWeight };
    });
    expect(Math.abs(estilos.t - 29.33) < 0.5 && Math.abs(estilos.c - 37.33) < 0.5, JSON.stringify(estilos)).toBe(true);
    expect(estilos.alin).toBe('center');
    await captura(page, `valorizar-division-papel-n2-${nombre}`, info);
    await page.emulateMedia({ media: 'screen' });

    // Imprimir el N1: el vendedor con su monto y sin %.
    await page.locator('#ad-fc-imprimir-a').click();
    await page.emulateMedia({ media: 'print' });
    await expect(hoja.locator('.opv__codigo')).toHaveText('N1-0036');
    await expect(hoja.locator('[data-comision-vendedor]')).toHaveText(['Vendedor 1: $ 49.869,15', 'Vendedor 2: $ 11.873,61']);
    await expect(hoja.locator('.opv__comisiones')).toHaveText('Total comisiones: $ 61.742,76');
    await expect(hoja.locator('.opv__total')).toHaveText('TOTAL: $ 299.214,92');
    expect(await hoja.innerText()).not.toMatch(/N2-0036|%|Factura|Parte/);
    await captura(page, `valorizar-division-papel-n1-${nombre}`, info);
    await page.emulateMedia({ media: 'screen' });

    // El listado: en el celular, al volver ya dice "Valorizada"; en la compu,
    // volver a la pestaña lo relee (otra persona cambió algo).
    if (ancho < 1100) {
      await page.locator('#ad-orden-volver').click();
      await expect(fila).toContainText('Valorizada');
    } else {
      await page.evaluate(() => { globalThis.__maquetaTablas.ordenes_retiro.find(x => x.id === 'o36').total = 600000; });
      await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      await expect(fila).toContainText('$ 600.000,00');
      await expect(page.locator('#ad-fc-condicion')).toHaveText('N1-0036: 40 % · N2-0036: 60 %');
      await expect(page.locator('#ad-fc-numero-a')).toHaveValue('0001-00000123');
    }
    expect(await sinCostado(page), 'sin scroll de costado al final').toBe(true);
    await page.evaluate(() => sessionStorage.removeItem('maqueta.cambios'));
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
