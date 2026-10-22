// DIVIDIR UNA ORDEN PARA FACTURAR, LA CONDICIÓN DE VENTA y LAS COMISIONES DE
// LOS 3 VENDEDORES (21/10/2026), en la maqueta, sin credenciales, a 390, 360,
// tablet (768) y 1280 px:
//  - "Configuración de comisiones": los 3 vendedores en orden con su %, el
//    total, guardar_comision_vendedor y el error de la base tal cual.
//  - La ficha del cliente: "Parte A %" completa sola la "Parte B %"; cada
//    vendedor con el % de la configuración (marcado) o propio; cambiar uno lo
//    deja propio; "volver al de la configuración" manda null; se guarda con
//    guardar_condicion_venta_cliente; el error de la base tal cual.
//  - Una orden valorizada: "Dividir para facturar" abre la ventana prellenada
//    con datos_division_orden (A, B y los 3 vendedores); cambiar los % pide la
//    vista previa SIN guardar con p_comisiones; un cambio puntual de un
//    vendedor; "Guardar e imprimir" llama a guardar_division_orden y después
//    imprime la hoja (A4, una línea por vendedor y los totales debajo de la
//    tabla, los renglones en 0 afuera).
//  - Los números de factura de ARCA: A con número solo, B con PDF, el error
//    de la base tal cual; sin condición de venta, la factura única.
// La base responde con 'maqueta.cambios' (no se tocan los datos de otras pruebas).
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

const VENDEDORES = [
  { id: 'v1', nombre: 'Vendedor 1', orden: 1, pct_defecto: 2 },
  { id: 'v2', nombre: 'Vendedor 2', orden: 2, pct_defecto: 3 },
  { id: 'v3', nombre: 'Vendedor 3', orden: 3, pct_defecto: 4 },
];

// Lo que respondería datos_division_orden para la N-0013 (o12) de Anatolia.
function datosDivision(pctA, pcts = [2, 3, 4]) {
  const items = [
    { orden: 1, descripcion: 'Cucurucho grande · Caja x 100', unidad: 'cajas', precio: 3000, cantidad: 5 },
    { orden: 2, descripcion: 'Cucurucho grande · Caja x 100 · con cono', unidad: 'cajas', precio: 3250, cantidad: 6 },
    { orden: 3, descripcion: 'Harina 000', unidad: 'kg', precio: 820, cantidad: 2 },
  ].map(it => {
    const a = Math.floor(it.cantidad * pctA / 100);
    return { ...it, cant_a: a, cant_b: it.cantidad - a, subtotal_a: a * it.precio, subtotal_b: (it.cantidad - a) * it.precio };
  });
  const sa = items.reduce((s, it) => s + it.subtotal_a, 0);
  const sb = items.reduce((s, it) => s + it.subtotal_b, 0);
  const comisiones = VENDEDORES.map((v, i) => ({ vendedor_id: v.id, nombre: v.nombre, orden: v.orden, pct: pcts[i], monto: Math.round(sa * pcts[i]) / 100 }));
  const total = comisiones.reduce((s, c) => s + c.monto, 0);
  return { orden_id: 'o12', codigo: 'N-0013', fecha: '2026-09-26', cliente: 'Distribuidora Anatolia', cliente_cuit: '30712345678',
    pct_a: pctA, pct_b: 100 - pctA, items, subtotal_a: sa, comisiones, comision_pct_total: pcts.reduce((s, p) => s + p, 0), comision_total: total,
    total_a: sa + total, subtotal_b: sb, total_b: sb, total_orden: 642410, guardada: false, facturas: [] };
}

// Administración con la condición de venta de Anatolia (c1) en 30 %, o sin
// condición (pct null: la base dice que falta el %); los % propios del
// cliente, si se pasan.
async function abrirAdministracion(page, { conCondicion = true, propias = [] } = {}) {
  await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=administracion`);
  const d30 = datosDivision(30);
  const d40 = datosDivision(40);
  await page.evaluate(async ({ conCondicion, propias, d30, d40, VENDEDORES }) => {
    localStorage.setItem('barraUnidad.elegida', 'u-n');
    const datos = await fetch('/maqueta/datos/administracion.json').then(r => r.json());
    const clientes = datos.tablas.clientes.map(c => ({ ...c, pct_parte_a: c.id === 'c1' && conCondicion ? 30 : null }));
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({
      tablas: { clientes, orden_facturas: [], vendedores_comision: VENDEDORES, cliente_comisiones: propias },
      rpc: {
        datos_division_orden: conCondicion
          ? { __segun: [{ si: { p_pct_a: null }, r: d30 }, { si: { p_pct_a: 40 }, r: d40 }], __defecto: d30 }
          : { __segun: [{ si: { p_pct_a: 40 }, r: d40 }], __defecto: 'ERROR:Este cliente no tiene condición de venta: poné el % de la parte A.' },
        // Como la base: devuelve también las facturas ya cargadas.
        guardar_division_orden: { ...d40, guardada: true, facturas: [
          { parte: 'A', numero: '0003-00001234', archivo_url: null },
          { parte: 'B', numero: '0003-00001235', archivo_url: 'uid-maqueta/facturas-venta/u-n/2026/N-0013-B.pdf' },
        ] },
        guardar_factura_orden: null,
        guardar_condicion_venta_cliente: null,
        guardar_comision_vendedor: null,
      },
    }));
  }, { conCondicion, propias, d30, d40, VENDEDORES });
  await page.reload();
  // Imprimir no abre el diálogo del navegador: se cuenta.
  await page.evaluate(() => { window.__impresiones = 0; window.print = () => { window.__impresiones++; }; });
}

async function abrirOrden(page) {
  await page.locator('[data-pestana="ordenes"]').first().click();
  await expect(page.locator('#ad-vista-ordenes')).toBeVisible();
  await page.locator('#ad-ordenes-lista [data-orden="o12"]').click();
  await expect(page.locator('#ad-facturas-orden')).toBeVisible();
}

// La ventana entra en la pantalla y no hay scroll de costado.
async function ventanaEntra(page, nombre) {
  const caja = await page.locator('.ad-dv__caja').boundingBox();
  const vp = page.viewportSize();
  expect(caja.x >= 0 && caja.x + caja.width <= vp.width + 1, `${nombre}: la ventana entra a lo ancho`).toBe(true);
  expect(await sinScrollHorizontal(page), `${nombre}: sin scroll horizontal`).toBe(true);
  const desborde = await page.locator('.ad-dv__caja').evaluate(el => el.scrollWidth > el.clientWidth + 1);
  expect(desborde, `${nombre}: nada se sale de la ventana`).toBe(false);
}

const TAMANOS = [['390', 390, 844], ['360', 360, 740], ['tablet', 768, 1024], ['1280', 1280, 900]];

for (const [nombre, ancho, alto] of TAMANOS) {
  test(`${nombre}: dividir una orden para facturar, imprimir y cargar las facturas`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page);
    await abrirOrden(page);
    await expect(page.locator('#ad-facturas-orden')).toContainText('Su condición de venta: parte A 30 % · parte B 70 %');
    await expect(page.locator('#ad-facturas-orden [data-factura-parte="A"]')).toContainText('sin factura cargada');

    // La ventana, prellenada con lo de la base: A, B y los 3 vendedores.
    await page.locator('#ad-btn-dividir').click();
    await expect(page.locator('#ad-dv')).toBeVisible();
    await expect(page.locator('#ad-dv-pct-a')).toHaveValue('30');
    await expect(page.locator('#ad-dv-pct-b')).toHaveValue('70');
    await expect(page.locator('#ad-dv-v1')).toHaveValue('2');
    await expect(page.locator('#ad-dv-v2')).toHaveValue('3');
    await expect(page.locator('#ad-dv-v3')).toHaveValue('4');
    await expect(page.locator('label[for="ad-dv-v1"]')).toHaveText('Vendedor 1 %');
    await expect(page.locator('#ad-dv-vista [data-parte="A"]')).toContainText('N-0013-A');
    expect(rpc.find(r => r.nombre === 'datos_division_orden').params).toEqual({ p_orden_id: 'o12', p_pct_a: null, p_comisiones: null });
    await ventanaEntra(page, 'al abrir');
    await captura(page, `division-ventana-${nombre}`, info);

    // B se completa sola; la vista previa con 40 % SIN guardar, con los 3 vendedores.
    await page.locator('#ad-dv-pct-a').fill('40');
    await expect(page.locator('#ad-dv-pct-b')).toHaveValue('60');
    await expect(page.locator('#ad-dv-vista [data-parte="A"]')).toContainText('Parte A: 40 %');
    const config = [{ vendedor_id: 'v1', pct: 2 }, { vendedor_id: 'v2', pct: 3 }, { vendedor_id: 'v3', pct: 4 }];
    expect(rpc.filter(r => r.nombre === 'datos_division_orden').pop().params).toEqual({ p_orden_id: 'o12', p_pct_a: 40, p_comisiones: config });
    expect(rpc.some(r => r.nombre === 'guardar_division_orden')).toBe(false);
    await page.locator('#ad-dv-pct-b').fill('70');
    await expect(page.locator('#ad-dv-pct-a')).toHaveValue('30');
    await page.locator('#ad-dv-pct-a').fill('40');
    await expect(page.locator('#ad-dv-pct-b')).toHaveValue('60');

    // Un cambio puntual: el Vendedor 2 al 5 % solo en esta orden.
    const d40con5 = datosDivision(40, [2, 5, 4]);
    await page.evaluate((d) => { globalThis.__maqueta = { rpc: { datos_division_orden: d } }; }, d40con5);
    const antes = rpc.filter(r => r.nombre === 'datos_division_orden').length;
    await page.locator('#ad-dv-v2').fill('5');
    await expect.poll(() => rpc.filter(r => r.nombre === 'datos_division_orden').length).toBe(antes + 1);
    expect(rpc.filter(r => r.nombre === 'datos_division_orden').pop().params)
      .toEqual({ p_orden_id: 'o12', p_pct_a: 40, p_comisiones: [{ vendedor_id: 'v1', pct: 2 }, { vendedor_id: 'v2', pct: 5 }, { vendedor_id: 'v3', pct: 4 }] });
    await expect(page.locator('#ad-dv-vista [data-parte="A"] .ad-dvh__totales')).toContainText('Vendedor 2 (5%): $ 625,00');
    await page.evaluate(() => { globalThis.__maqueta = null; });
    await page.locator('#ad-dv-v2').fill('3');
    await expect.poll(() => rpc.filter(r => r.nombre === 'datos_division_orden').pop().params.p_comisiones[1].pct).toBe(3);

    // La factura A, solo el número.
    await page.locator('#ad-dv-numero-a').fill('0003-00001234');
    await page.locator('[data-dv-factura="A"]').click();
    await expect.poll(() => rpc.filter(r => r.nombre === 'guardar_factura_orden').length).toBe(1);
    expect(rpc.find(r => r.nombre === 'guardar_factura_orden').params).toEqual({ p_orden_id: 'o12', p_parte: 'A', p_numero: '0003-00001234', p_archivo_url: null });
    await expect(page.locator('#ad-dv-facturas [data-dv-guardada="A"]')).toHaveText('Factura 0003-00001234');
    await expect(page.locator('#ad-facturas-orden [data-factura-parte="A"]')).toContainText('Factura 0003-00001234');

    // La B, con su PDF.
    await page.locator('#ad-dv-numero-b').fill('0003-00001235');
    await page.locator('#ad-dv-pdf-b').setInputFiles({ name: 'factura-b.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 prueba') });
    await page.locator('[data-dv-factura="B"]').click();
    await expect.poll(() => rpc.filter(r => r.nombre === 'guardar_factura_orden').length).toBe(2);
    expect(rpc.filter(r => r.nombre === 'guardar_factura_orden')[1].params)
      .toEqual({ p_orden_id: 'o12', p_parte: 'B', p_numero: '0003-00001235', p_archivo_url: 'uid-maqueta/facturas-venta/u-n/2026/N-0013-B.pdf' });
    await expect(page.locator('#ad-dv-facturas [data-dv-ver-pdf="B"]')).toBeVisible();

    // La base frena: el mensaje TAL CUAL, pegado a la parte.
    await page.evaluate(() => { globalThis.__maqueta = { rpc: { guardar_factura_orden: 'ERROR:No tenés permiso sobre esta orden.' } }; });
    await page.locator('#ad-dv-numero-a').fill('0003-00009999');
    await page.locator('[data-dv-factura="A"]').click();
    await expect(page.locator('[data-dv-factura-error="A"]')).toHaveText('No tenés permiso sobre esta orden.');
    await expect(page.locator('[data-dv-factura="A"]')).toBeEnabled();
    await page.evaluate(() => { globalThis.__maqueta = null; });
    await ventanaEntra(page, 'con las facturas');
    await captura(page, `division-facturas-${nombre}`, info);

    // Guardar e imprimir: primero guarda, después la hoja.
    await page.locator('#ad-dv-guardar').scrollIntoViewIfNeeded();
    await page.locator('#ad-dv-guardar').click();
    await expect.poll(() => page.evaluate(() => window.__impresiones)).toBe(1);
    expect(rpc.filter(r => r.nombre === 'guardar_division_orden').map(r => r.params)).toEqual([{ p_orden_id: 'o12', p_pct_a: 40, p_comisiones: config }]);
    await expect(page.locator('#ad-facturas-orden')).toContainText('Dividida para facturar: parte A 40 % · parte B 60 %');

    // La hoja, como sale en el papel.
    await page.emulateMedia({ media: 'print' });
    const hoja = page.locator('#ad-impresion');
    await expect(hoja).toBeVisible();
    await expect(page.locator('#ad-dv')).toBeHidden();
    const a = hoja.locator('[data-parte="A"]');
    const b = hoja.locator('[data-parte="B"]');
    await expect(a.locator('h2')).toContainText('N-0013-A');
    await expect(a.locator('h2')).toContainText('Factura 0003-00001234');
    await expect(b.locator('h2')).toContainText('N-0013-B');
    await expect(a.locator('table')).not.toContainText('Vendedor');
    await expect(a.locator('table')).not.toContainText('comisiones');
    // 40 %: 2 de 5 cajas a $ 3.000 y 2 de 6 a $ 3.250 = $ 12.500.
    const tot = a.locator('.ad-dvh__totales');
    await expect(tot).toContainText('Total productos: $ 12.500,00');
    await expect(tot.locator('[data-comision-vendedor]')).toHaveText(['Vendedor 1 (2%): $ 250,00', 'Vendedor 2 (3%): $ 375,00', 'Vendedor 3 (4%): $ 500,00']);
    await expect(tot).toContainText('Total comisiones (9%): $ 1.125,00');
    await expect(tot).toContainText('TOTAL PARTE A: $ 13.625,00');
    // 40 % de 2 kg de harina es 0: no sale en la A, sí en la B.
    await expect(a.locator('tbody tr')).toHaveCount(2);
    await expect(a).not.toContainText('Harina');
    await expect(b).toContainText('Harina 000');
    await expect(b.locator('.ad-dvh__totales')).toHaveText('TOTAL PARTE B: $ 23.640,00');
    await expect(hoja.locator('.ad-dvh__pie')).toContainText('Orden N-0013 · total de la orden $ 642.410,00');
    await captura(page, `division-hoja-${nombre}`, info);
    await page.emulateMedia({ media: 'screen' });

    await page.evaluate(() => sessionStorage.removeItem('maqueta.cambios'));
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: sin condición de venta, la factura única`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page, { conCondicion: false, propias: [{ cliente_id: 'c1', vendedor_id: 'v2', pct: 6 }] });
    await abrirOrden(page);
    await expect(page.locator('#ad-facturas-orden')).toContainText('No se divide: va en una factura única.');
    await page.locator('#ad-btn-dividir').click();
    await expect(page.locator('#ad-dv-aviso')).toHaveText('Este cliente no tiene condición de venta: poné el % de la parte A.');
    await expect(page.locator('#ad-dv-pct-a')).toHaveValue('');
    await expect(page.locator('#ad-dv-pct-b')).toHaveValue('');
    // Los vendedores: el propio del cliente (6) o la configuración.
    await expect(page.locator('#ad-dv-v1')).toHaveValue('2');
    await expect(page.locator('#ad-dv-v2')).toHaveValue('6');
    await expect(page.locator('#ad-dv-v3')).toHaveValue('4');
    await expect(page.locator('#ad-dv-facturas [data-dv-parte="UNICA"]')).toContainText('Factura única');
    await expect(page.locator('#ad-dv-facturas [data-dv-parte="A"]')).toHaveCount(0);
    await page.locator('#ad-dv-numero-unica').fill('0003-00000077');
    await page.locator('[data-dv-factura="UNICA"]').click();
    await expect.poll(() => rpc.filter(r => r.nombre === 'guardar_factura_orden').length).toBe(1);
    expect(rpc.find(r => r.nombre === 'guardar_factura_orden').params).toEqual({ p_orden_id: 'o12', p_parte: 'UNICA', p_numero: '0003-00000077', p_archivo_url: null });
    await expect(page.locator('#ad-facturas-orden [data-factura-parte="UNICA"]')).toContainText('Factura 0003-00000077');
    // Completar el % acá también sirve: la vista previa aparece.
    await page.locator('#ad-dv-pct-a').fill('40');
    await expect(page.locator('#ad-dv-pct-b')).toHaveValue('60');
    await expect(page.locator('#ad-dv-vista [data-parte="B"]')).toContainText('Parte B: 60 %');
    await expect(page.locator('#ad-dv-aviso')).toHaveText('');
    expect(rpc.filter(r => r.nombre === 'datos_division_orden').pop().params.p_comisiones)
      .toEqual([{ vendedor_id: 'v1', pct: 2 }, { vendedor_id: 'v2', pct: 6 }, { vendedor_id: 'v3', pct: 4 }]);
    await ventanaEntra(page, 'sin condición');
    await captura(page, `division-unica-${nombre}`, info);
    await page.keyboard.press('Escape');
    await expect(page.locator('#ad-dv')).toBeHidden();
    await page.evaluate(() => sessionStorage.removeItem('maqueta.cambios'));
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: la condición de venta en la ficha del cliente`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page, { propias: [{ cliente_id: 'c1', vendedor_id: 'v3', pct: 7 }] });
    await page.locator('[data-pestana="clientes"]').first().click();
    await page.locator('#ad-clientes-lista [data-cliente="c1"]').first().click();
    await page.locator('#ad-btn-ficha').click();
    await expect(page.locator('#ad-vista-ficha')).toBeVisible();
    const a = page.locator('#ad-f-pct-a');
    const b = page.locator('#ad-f-pct-b');
    await expect(a).toHaveValue('30');
    await expect(b).toHaveValue('70');
    await expect(a).toHaveAttribute('type', 'text');
    await expect(page.locator('#ad-f-comision-a')).toHaveCount(0);
    await a.fill('45,5');
    await expect(b).toHaveValue('54,50');
    await b.fill('60');
    await expect(a).toHaveValue('40');

    // Los vendedores: 1 y 2 de la configuración, el 3 propio (7).
    const fila = (id) => page.locator(`#ad-f-vendedores [data-vendedor="${id}"]`);
    await expect(page.locator('#ad-f-v1')).toHaveValue('2');
    await expect(page.locator('#ad-f-v3')).toHaveValue('7');
    await expect(fila('v1').locator('[data-origen-config]')).toBeVisible();
    await expect(fila('v1').locator('[data-origen-propio]')).toBeHidden();
    await expect(fila('v3').locator('[data-origen-propio]')).toContainText('Propio de este cliente');
    // Cambiar el 1 lo deja propio; el 3 vuelve a la configuración.
    await page.locator('#ad-f-v1').fill('2,5');
    await expect(fila('v1').locator('[data-origen-propio]')).toBeVisible();
    await expect(fila('v1').locator('[data-origen-config]')).toBeHidden();
    await fila('v3').locator('[data-volver-config]').click();
    await expect(page.locator('#ad-f-v3')).toHaveValue('4');
    await expect(fila('v3').locator('[data-origen-config]')).toBeVisible();
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal en la ficha').toBe(true);
    await page.locator('#ad-f-condicion-guardar').scrollIntoViewIfNeeded();
    await captura(page, `division-ficha-${nombre}`, info);
    await page.locator('#ad-f-condicion-guardar').click();
    await expect.poll(() => rpc.find(r => r.nombre === 'guardar_condicion_venta_cliente')).toBeTruthy();
    expect(rpc.find(r => r.nombre === 'guardar_condicion_venta_cliente').params).toEqual({ p_cliente_id: 'c1', p_pct_a: 40,
      p_comisiones: [{ vendedor_id: 'v1', pct: 2.5 }, { vendedor_id: 'v2', pct: null }, { vendedor_id: 'v3', pct: null }] });
    expect(rpc.some(r => r.nombre === 'guardar_ficha_cliente')).toBe(false);
    await expect(page.locator('#toast-global')).toContainText('Condición de venta guardada: parte A 40 % · parte B 60 %');

    // Vacío = no se divide; y el error de la base tal cual.
    await a.fill('');
    await expect(b).toHaveValue('');
    await page.evaluate(() => { globalThis.__maqueta = { rpc: { guardar_condicion_venta_cliente: 'ERROR:No tenés permiso sobre este cliente.' } }; });
    await page.locator('#ad-f-condicion-guardar').click();
    await expect(page.locator('#ad-f-condicion-error')).toHaveText('No tenés permiso sobre este cliente.');
    expect(rpc.filter(r => r.nombre === 'guardar_condicion_venta_cliente').pop().params.p_pct_a).toBe(null);
    await page.evaluate(() => { globalThis.__maqueta = null; sessionStorage.removeItem('maqueta.cambios'); });
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: la configuración de comisiones`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirAdministracion(page);
    await expect(page.locator('[data-seccion="comisiones"]')).toContainText('9 %');
    await page.locator('[data-pestana="comisiones"]').first().click();
    await expect(page.locator('#ad-vista-comisiones')).toBeVisible();
    await expect(page.locator('#ad-comisiones-cuerpo label')).toHaveText(['Vendedor 1 %', 'Vendedor 2 %', 'Vendedor 3 %']);
    await expect(page.locator('#ad-cv-v1')).toHaveValue('2');
    await expect(page.locator('#ad-cv-v2')).toHaveValue('3');
    await expect(page.locator('#ad-cv-v3')).toHaveValue('4');
    await expect(page.locator('#ad-comisiones-total')).toHaveText('Total: 9 %');
    await page.locator('#ad-cv-v2').fill('3,5');
    await expect(page.locator('#ad-comisiones-total')).toHaveText('Total: 9,5 %');
    await page.locator('[data-cv-guardar="v2"]').click();
    await expect.poll(() => rpc.filter(r => r.nombre === 'guardar_comision_vendedor').length).toBe(1);
    expect(rpc.find(r => r.nombre === 'guardar_comision_vendedor').params).toEqual({ p_vendedor_id: 'v2', p_pct: 3.5 });
    await expect(page.locator('#toast-global')).toContainText('Vendedor 2: 3,5 % guardado.');
    await expect(page.locator('#ad-cv-v2')).toHaveValue(/^3,50?$/);
    // La base frena: el mensaje TAL CUAL, pegado a ese vendedor.
    await page.evaluate(() => { globalThis.__maqueta = { rpc: { guardar_comision_vendedor: 'ERROR:No tenés permiso para cambiar las comisiones.' } }; });
    await page.locator('[data-cv-guardar="v1"]').click();
    await expect(page.locator('[data-cv-error="v1"]')).toHaveText('No tenés permiso para cambiar las comisiones.');
    await expect(page.locator('[data-cv-guardar="v1"]')).toBeEnabled();
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal en la configuración').toBe(true);
    await captura(page, `division-configuracion-${nombre}`, info);
    await page.evaluate(() => { globalThis.__maqueta = null; sessionStorage.removeItem('maqueta.cambios'); });
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
