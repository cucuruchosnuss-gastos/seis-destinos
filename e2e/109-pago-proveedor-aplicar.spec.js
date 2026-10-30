// LA FACTURA ELEGIDA VIAJA, "APLICAR A FACTURAS" Y ANULAR UN PAGO A PROVEEDOR
// (30/10/2026, rama ci-prueba/pago-proveedor-aplicar). En la maqueta
// (cc-cheques), sin credenciales, a 390 y 1280 px:
//  - Caso BADIC: cheques de la cartera (uno de Dolce Pasta) y la factura
//    elegida TOCANDO SU RENGLÓN (como se tildan los cheques): la factura viaja
//    en p_aplicaciones. Sin ninguna factura, no se manda: pregunta "No
//    elegiste ninguna factura: el pago va a quedar a cuenta. ¿Seguro?" y "Sí,
//    dejarlo a cuenta" manda sin aplicaciones.
//  - "A cuenta $ X · Aplicar a facturas" en el renglón del pago: propone de la
//    más vieja a la más nueva, UNA llamada a aplicar_pago_a_facturas, y
//    después (la base de la maqueta cambia como la de verdad) el renglón ya no
//    tiene nada a cuenta.
//  - Anular un pago con cheques desde su detalle: la vista previa, el motivo
//    obligatorio, anular_gasto, "Pago anulado" con "Hacer el pago de nuevo",
//    la orden de pago tachada con "ANULADA" y los cheques otra vez en la
//    cartera del formulario de pago.
//  - Sin scroll horizontal y sin errores de JS.
// Las rpc que cambian datos se simulan con un getter en __maqueta.rpc que
// cambia __maquetaTablas en el momento de la llamada (lo que haría la base).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
test.describe.configure({ timeout: 90000 });

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
const de = (rpc, n) => rpc.filter(r => r.nombre === n);

// Los cheques y cobranzas de la maqueta, más un cheque de Dolce Pasta y lo que
// cada prueba agregue (pagos ya hechos, sus créditos y su orden de pago).
async function abrir(page, { extra = 'nada' } = {}) {
  await page.clock.setFixedTime(new Date('2026-10-30T12:30:00-03:00'));
  await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?maqueta=cc-cheques`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async ({ extra }) => {
    const datos = await fetch('/maqueta/datos/cc-cheques.json').then(r => r.json());
    const t = datos.tablas;
    const cheque = (id, cob, numero, importe, estado = 'en_cartera', pago = null) => ({
      id, cobranza_id: cob, banco_codigo: '285', numero, estado, importe, tipo: 'diferido', fecha_emision: '2026-10-01', fecha_pago: '2026-11-20',
      titulares: [], pago_gasto_id: pago, salida_gasto_id: null,
    });
    const tablas = {
      cobranza_cheques: [...t.cobranza_cheques, cheque('chq-dolce', 'cob-dolce', '62294736', 120000)],
      v_cobranzas: [...t.v_cobranzas, { id: 'cob-dolce', cliente: 'Heladería Sol', estado: 'procesada', fecha: '2026-09-21', moneda: 'ARS', unidad_negocio_id: 'u-d', unidad_negocio_nombre: 'Dolce Pasta' }],
      facturas_pendientes: t.facturas_pendientes.map(f => ({ ...f })),
      v_cuenta_corriente_movimientos: [...t.v_cuenta_corriente_movimientos],
      gastos: [], aplicaciones_pago: [], creditos_proveedor: [], ordenes_pago: [],
    };
    const pago = (id, importe, desc) => ({ id, proveedor_id: 'pv1', unidad_negocio_id: 'u-n', moneda: 'ARS', importe, medio_pago: 'cheque', cuenta_id: null,
      estado: 'registrado', empleado_id: 'emp-1', orden_pago_id: 'op-9', motivo_anulacion: null, fecha_pago: '2026-10-30', descripcion: desc });
    const mov = (id, monto) => ({ proveedor_id: 'pv1', unidad_negocio_id: 'u-n', moneda: 'ARS', fecha: '2026-10-30', tipo: 'pago', monto: -monto, factura_pendiente_id: null,
      gasto_id: id, credito_id: null, referencia: 'Pago a proveedor', saldo_acumulado: 0, orden_desempate: 2 });
    if (extra === 'a-cuenta') {
      // Un pago de $ 420.000 en cheques que quedó TODO a cuenta (el caso BADIC).
      tablas.gastos.push(pago('g-1', 420000, 'Pago con cheques de terceros (N° 11112222, N° 33334444) — ANATOLIA SRL'));
      tablas.creditos_proveedor.push({ id: 'cr-1', proveedor_id: 'pv1', unidad_negocio_id: 'u-n', moneda: 'ARS', origen_gasto_id: 'g-1', monto_original: 420000, monto_disponible: 420000, estado: 'disponible', aplicaciones_credito: [] });
      tablas.v_cuenta_corriente_movimientos.push(mov('g-1', 420000));
    }
    if (extra === 'anular') {
      // Un pago de $ 500.000 con dos cheques (uno de Dolce), que pagó la
      // factura 0003-00001201 ($ 250.000) y dejó $ 250.000 a cuenta.
      tablas.gastos.push(pago('g-2', 500000, 'Pago con cheques de terceros (N° 62921151, N° 62294736) — ANATOLIA SRL'));
      tablas.cobranza_cheques = [...t.cobranza_cheques, cheque('chq-n2', 'cob-1', '62921151', 200000, 'endosado', 'g-2'), cheque('chq-d2', 'cob-dolce', '62294736', 300000, 'endosado', 'g-2')];
      tablas.aplicaciones_pago.push({ gasto_id: 'g-2', factura_pendiente_id: 'fp-1', monto_aplicado: 250000,
        facturas_pendientes: { numero_comprobante: '0003-00001201', razon_social: 'ANATOLIA SRL', fecha_factura: '2026-08-20', origen_gasto_id: null, categorias: { nombre: 'Materia prima' } } });
      const fp1 = tablas.facturas_pendientes.find(f => f.id === 'fp-1'); fp1.saldo_pendiente = 0; fp1.estado = 'pagada';
      tablas.creditos_proveedor.push({ id: 'cr-2', proveedor_id: 'pv1', unidad_negocio_id: 'u-n', moneda: 'ARS', origen_gasto_id: 'g-2', monto_original: 250000, monto_disponible: 250000, estado: 'disponible', aplicaciones_credito: [] });
      tablas.ordenes_pago.push({ id: 'op-9', unidad_negocio_id: 'u-n', proveedor_id: 'pv1', numero: 9, fecha: '2026-10-30', total: 500000, creada_en: '2026-10-30T15:00:00Z' });
      tablas.v_cuenta_corriente_movimientos.push(mov('g-2', 500000));
    }
    const rpc = { pagar_proveedor_mixto: { orden_pago_id: 'op-1', numero: 1, numero_texto: 'N-OP-00001', total: 1, aplicado: 0, a_favor: 0 }, datos_orden_pago: 'ERROR:sin orden en la maqueta' };
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({ tablas, rpc }));
    localStorage.setItem('barraUnidad.elegida', 'u-n');
  }, { extra });
  await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?proveedor=pv1&unidad=u-n`);
  await expect(page.locator('#lista-movimientos-ficha .fila-movimiento').first()).toBeVisible();
}

// Lo que hace la base al llamar a la rpc: un getter que cambia las tablas.
async function simular(page, nombre) {
  await page.evaluate((nombre) => {
    globalThis.__maqueta = globalThis.__maqueta || {};
    globalThis.__maqueta.rpc = globalThis.__maqueta.rpc || {};
    const T = globalThis.__maquetaTablas;
    const hacer = {
      // aplicar_pago_a_facturas: fp-1 entera y $ 170.000 a fp-2; el crédito
      // se consume entero (la base lo borra).
      aplicar_pago_a_facturas() {
        const f1 = T.facturas_pendientes.find(f => f.id === 'fp-1'); f1.saldo_pendiente = 0; f1.estado = 'pagada';
        const f2 = T.facturas_pendientes.find(f => f.id === 'fp-2'); f2.saldo_pendiente = 230000; f2.estado = 'parcial';
        T.creditos_proveedor = T.creditos_proveedor.filter(c => c.origen_gasto_id !== 'g-1');
        return { aplicado: 420000, queda_a_cuenta: 0 };
      },
      // anular_gasto: el pago anulado, los cheques a la cartera, la factura
      // vuelve a deber, el crédito anulado y el pago fuera de la cuenta.
      anular_gasto() {
        const g = T.gastos.find(x => x.id === 'g-2'); g.estado = 'anulado'; g.motivo_anulacion = 'Faltó elegir la factura';
        for (const q of T.cobranza_cheques) if (q.pago_gasto_id === 'g-2') Object.assign(q, { estado: 'en_cartera', pago_gasto_id: null });
        const f1 = T.facturas_pendientes.find(f => f.id === 'fp-1'); f1.saldo_pendiente = 250000; f1.estado = 'pendiente';
        T.aplicaciones_pago = T.aplicaciones_pago.filter(a => a.gasto_id !== 'g-2');
        for (const c of T.creditos_proveedor) if (c.origen_gasto_id === 'g-2') Object.assign(c, { estado: 'anulado', monto_disponible: 0 });
        T.v_cuenta_corriente_movimientos = T.v_cuenta_corriente_movimientos.filter(m => m.gasto_id !== 'g-2');
        return null;
      },
    };
    Object.defineProperty(globalThis.__maqueta.rpc, nombre, { configurable: true, enumerable: true, get: hacer[nombre] });
  }, nombre);
}

for (const [nombre, ancho, alto] of [['1280', 1280, 900], ['390', 390, 844]]) {
  test(`${nombre}: caso BADIC — la factura elegida tocando su renglón viaja; sin factura, pregunta`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page);
    await page.locator('#btn-registrar-pago').click();
    await expect(page.locator('#lista-fifo .check-fifo')).toHaveCount(2);
    await page.locator('#btn-medio-cartera').click();
    const cartera = page.locator('#lista-cartera-pago');
    await cartera.locator('.cartera-pago__fila', { hasText: '62294736' }).click();
    await cartera.locator('.cartera-pago__fila', { hasText: '12345678' }).click();
    await expect(page.locator('#aviso-cartera-otra-empresa')).toHaveText(/Este cheque es de Dolce Pasta/);

    // Sin factura: no se manda, pregunta.
    await page.locator('#btn-confirmar-pago').click();
    const pregunta = page.locator('#confirmar-a-cuenta-pago');
    await expect(pregunta).toBeVisible();
    await expect(page.locator('#texto-confirmar-a-cuenta')).toHaveText('No elegiste ninguna factura: el pago va a quedar a cuenta. ¿Seguro?');
    expect(de(rpc, 'pagar_proveedor_mixto'), 'sin factura no se manda sin preguntar').toEqual([]);
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal con la pregunta').toBe(true);
    await captura(page, `pago-pregunta-a-cuenta-${nombre}`, info);
    await page.locator('#btn-elegir-factura-pago').click();
    await expect(pregunta).toBeHidden();

    // La factura, tocando el TEXTO de su renglón (como un cheque).
    // ($ 270.000 en cheques: alcanza para la de $ 250.000.)
    const fila = page.locator('#lista-fifo .fila-fifo', { hasText: '0003-00001201' });
    await fila.locator('.fila-fifo__numero').click();
    await expect(fila.locator('.check-fifo')).toBeChecked();
    await expect(fila).toHaveClass(/fila-fifo--tildada/);
    await expect(fila.locator('.monto-fifo')).toHaveValue('250.000');
    // Tocar la casilla la da vuelta UNA vez (no dos).
    await fila.locator('.check-fifo').click();
    await expect(fila.locator('.check-fifo')).not.toBeChecked();
    await fila.locator('.fila-fifo__meta').click();
    await expect(fila.locator('.check-fifo')).toBeChecked();
    await page.locator('#btn-confirmar-pago').click();
    await expect.poll(() => de(rpc, 'pagar_proveedor_mixto').length).toBe(1);
    expect(de(rpc, 'pagar_proveedor_mixto')[0].params.p_aplicaciones, 'la factura elegida viaja').toEqual([{ factura_pendiente_id: 'fp-1', monto_aplicado: 250000 }]);
    expect(de(rpc, 'pagar_proveedor_mixto')[0].params.p_cheque_ids.sort()).toEqual(['chq-2', 'chq-dolce']);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: "Sí, dejarlo a cuenta" manda sin aplicaciones`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page);
    await page.locator('#btn-registrar-pago').click();
    await expect(page.locator('#lista-fifo .check-fifo')).toHaveCount(2);
    await page.locator('#btn-medio-cartera').click();
    await page.locator('#lista-cartera-pago .cartera-pago__fila', { hasText: '62294736' }).click();
    await page.locator('#btn-confirmar-pago').click();
    await page.locator('#btn-si-a-cuenta-pago').click();
    await expect.poll(() => de(rpc, 'pagar_proveedor_mixto').length).toBe(1);
    expect(de(rpc, 'pagar_proveedor_mixto')[0].params.p_aplicaciones).toEqual([]);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: "A cuenta $ X · Aplicar a facturas" — propone, aplica y el crédito baja`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page, { extra: 'a-cuenta' });
    const boton = page.locator('#lista-movimientos-ficha [data-aplicar-pago="g-1"]');
    await expect(boton).toHaveText('A cuenta $ 420.000,00 · Aplicar a facturas');
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal en la cuenta').toBe(true);
    await boton.click();
    const modal = page.locator('#modal-aplicar-pago');
    await expect(modal).toBeVisible();
    await expect(page.locator('#aplicar-pago-resumen')).toHaveText('Pago del 30/10/2026 por $ 420.000,00 · A cuenta $ 420.000,00');
    const filas = page.locator('#aplicar-pago-lista .fila-fifo');
    await expect(filas).toHaveCount(2);
    await expect(filas.nth(0).locator('[data-aplicar-check]')).toBeChecked();
    await expect(filas.nth(0).locator('[data-aplicar-monto]')).toHaveValue('250.000');
    await expect(filas.nth(1).locator('[data-aplicar-monto]'), 'la última, por lo que alcanza').toHaveValue('170.000');
    await expect(page.locator('#aplicar-pago-totales')).toHaveText(/A cuenta \$\s420\.000,00 · Aplicás \$\s420\.000,00 · Queda a cuenta \$\s0,00/);
    // Editable: tocar el renglón destilda; volver a tocar tilda.
    await filas.nth(1).locator('.fila-fifo__numero').click();
    await expect(filas.nth(1).locator('[data-aplicar-check]')).not.toBeChecked();
    await expect(page.locator('#aplicar-pago-totales')).toHaveText(/Queda a cuenta \$\s170\.000,00/);
    await filas.nth(1).locator('.fila-fifo__numero').click();
    await expect(page.locator('#aplicar-pago-totales')).toHaveText(/Queda a cuenta \$\s0,00/);
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal con el modal').toBe(true);
    await captura(page, `aplicar-a-facturas-${nombre}`, info);

    await simular(page, 'aplicar_pago_a_facturas');
    await page.locator('#btn-confirmar-aplicar-pago').click();
    await expect.poll(() => de(rpc, 'aplicar_pago_a_facturas').length).toBe(1);
    expect(de(rpc, 'aplicar_pago_a_facturas')[0].params).toEqual({ p_gasto_id: 'g-1', p_aplicaciones: [
      { factura_pendiente_id: 'fp-1', monto_aplicado: 250000 }, { factura_pendiente_id: 'fp-2', monto_aplicado: 170000 }] });
    await expect(modal).toBeHidden();
    // Releído: el pago ya no tiene nada a cuenta.
    await expect(page.locator('#lista-movimientos-ficha [data-aplicar-pago="g-1"]')).toHaveCount(0);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: anular un pago con cheques — vista previa, motivo, la orden ANULADA y los cheques en la cartera`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page, { extra: 'anular' });
    const ordenes = page.locator('#ficha-ordenes-pago');
    await expect(ordenes.locator('[data-reimprimir-orden="op-9"]')).toBeVisible();
    await expect(page.locator('#lista-movimientos-ficha [data-aplicar-pago="g-2"]')).toHaveText('A cuenta $ 250.000,00 · Aplicar a facturas');
    await page.locator('#lista-movimientos-ficha .btn-detalle-pago[data-gasto-id="g-2"]').click();
    const acciones = page.locator('#detalle-pago-acciones');
    await expect(acciones.locator('[data-aplicar-pago="g-2"]')).toHaveText('A cuenta $ 250.000,00 · Aplicar a facturas');
    await acciones.locator('[data-anular-pago]').click();
    const previa = acciones.locator('.panel-anular-pago__previa li');
    await expect(previa.nth(0)).toHaveText('Vuelven a la cartera: N° 62921151 ($ 200.000,00), N° 62294736 ($ 300.000,00)');
    await expect(previa.nth(1)).toHaveText('La factura 0003-00001201 vuelve a deber $ 250.000,00');
    await expect(acciones).toContainText('Se anula lo que quedó a cuenta: $ 250.000,00');
    await expect(acciones).toContainText('Se da vuelta la deuda con Dolce Pasta por $ 300.000,00 (Entre empresas)');
    await expect(acciones).toContainText('La orden de pago N-OP-00009 queda anulada (tachada y sin reimprimir)');
    // Motivo obligatorio.
    await acciones.locator('[data-confirmar-anular-pago]').click();
    await expect(acciones.locator('.pago-error')).toHaveText('Poné el motivo de la anulación.');
    expect(de(rpc, 'anular_gasto')).toEqual([]);
    await page.locator('#motivo-anular-pago').fill('Faltó elegir la factura');
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal con el panel de anular').toBe(true);
    await captura(page, `anular-pago-${nombre}`, info);
    await simular(page, 'anular_gasto');
    await acciones.locator('[data-confirmar-anular-pago]').click();
    await expect.poll(() => de(rpc, 'anular_gasto').length).toBe(1);
    expect(de(rpc, 'anular_gasto')[0].params).toEqual({ p_gasto_id: 'g-2', p_motivo: 'Faltó elegir la factura' });
    await expect(acciones).toContainText('Pago anulado · Faltó elegir la factura');
    await expect(acciones.locator('[data-anular-pago]')).toHaveCount(0);
    // La orden de pago: tachada, ANULADA, sin reimprimir.
    await expect(ordenes.locator('[data-orden-anulada="op-9"] s')).toHaveText(/N-OP-00009/);
    await expect(ordenes.locator('.orden-pago-cc__anulada')).toHaveText('ANULADA');
    await expect(ordenes.locator('[data-reimprimir-orden="op-9"]')).toHaveCount(0);
    // El pago salió de la cuenta.
    await expect(page.locator('#lista-movimientos-ficha .btn-detalle-pago[data-gasto-id="g-2"]')).toHaveCount(0);
    // "Hacer el pago de nuevo": el formulario, con los cheques otra vez en la cartera y la factura pendiente.
    await acciones.locator('[data-pagar-de-nuevo]').click();
    await expect(page.locator('#modal-detalle-pago')).toBeHidden();
    await expect(page.locator('#modal-pago')).toBeVisible();
    await expect(page.locator('#lista-fifo .fila-fifo', { hasText: '0003-00001201' })).toContainText('250.000');
    await page.locator('#btn-medio-cartera').click();
    await expect(page.locator('#lista-cartera-pago .cartera-pago__fila', { hasText: '62921151' })).toBeVisible();
    await expect(page.locator('#lista-cartera-pago .cartera-pago__fila', { hasText: '62294736' })).toBeVisible();
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
