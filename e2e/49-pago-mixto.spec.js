// PAGO A PROVEEDORES EN LOS DOS SENTIDOS Y ORDEN DE PAGO (20/10/2026, rama
// ci-prueba/pago-mixto; antes, 15/10/2026: cheques de cualquier empresa).
// En la maqueta (cc-cheques), sin credenciales, a 1280, 390 y 360 px y en la
// tablet (1000 × 540):
//  - De las FACTURAS a los valores: se tildan las facturas, faltan valores
//    (no deja confirmar), "Completar con efectivo/transferencia" pone la
//    diferencia y se confirma.
//  - De los VALORES a las facturas: cheques + transferencia, "Aplicar a las
//    facturas más viejas" tilda de la más vieja a la más nueva con la última
//    parcial.
//  - UNA sola llamada a pagar_proveedor_mixto con los parámetros exactos, y
//    después la ORDEN DE PAGO (datos_orden_pago) sin la empresa del cheque ni
//    la cuenta, con el total en letras con centavos.
//  - Saldo a favor, el error de la base tal cual (sin orden) y reimprimir
//    desde la ficha.
//  - Sin scroll horizontal y sin errores de JS.
// Los datos se suman con 'maqueta.cambios' (no se tocan los de otras pruebas).
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
const pagos = (rpc) => rpc.filter(r => ['pagar_proveedor_mixto', 'pagar_proveedor_con_cheques_cartera', 'registrar_pago_proveedor'].includes(r.nombre));

// Lo que devolvería datos_orden_pago (con la empresa del cheque y la cuenta,
// que la hoja NO tiene que mostrar).
const ORDEN = {
  id: 'op-1', numero: 1, numero_texto: 'N-OP-00001', fecha: '2026-10-15', total: 650000.5,
  observaciones: 'Entregado en mano', creada_por: 'Usuario Maqueta',
  emisor: { empresa: 'Cucuruchos Nuss', razon_social: 'PAZ MIRTA', cuit: '20924106795', domicilio: 'Unión 843, Córdoba', logo_url: 'logo-cucuruchos-nuss.png' },
  proveedor: { razon_social: 'ANATOLIA SRL', cuit: '30712345678', direccion: 'Ruta 9 km 5' },
  facturas: [
    { tipo: 'Factura A', numero: '0003-00001201', fecha: '2026-08-20', importe: 250000, aplicado: 250000, saldo_actual: 0 },
    { tipo: 'Factura A', numero: '0003-00001245', fecha: '2026-09-05', importe: 400000, aplicado: 400000, saldo_actual: 0 },
  ],
  cheques: [{ banco: 'BANCO MACRO', numero: '55443322', fecha_pago: '2026-10-10', librador: [{ nombre: 'Heladería Sol', cuit: '30699999999' }], es_echeq: true, importe: 120000, de_empresa: 'Dolce Pasta', otra_empresa: true }],
  otros_medios: [{ medio: 'transferencia', cuenta: 'Banco Galicia · mía', importe: 530000.5 }],
  a_favor: 0.5,
};

async function abrir(page, { fallaPago = false, ordenes = [] } = {}) {
  await page.clock.setFixedTime(new Date('2026-10-15T10:30:00-03:00'));
  await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?maqueta=cc-cheques`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async ({ fallaPago, ordenes, ORDEN }) => {
    const datos = await fetch('/maqueta/datos/cc-cheques.json').then(r => r.json());
    const cheques = [...datos.tablas.cobranza_cheques, {
      id: 'chq-dolce', cobranza_id: 'cob-dolce', banco_codigo: '285', numero: '55443322', estado: 'en_cartera',
      importe: 120000, tipo: 'diferido', fecha_emision: '2026-09-20', fecha_pago: '2026-10-10',
      sucursal_codigo: '123', codigo_postal: '5000', dv_ruta: 0, dv_numero: 0, cuenta: '00012345678', dv_cuenta: 0,
    }];
    const cobranzas = [...datos.tablas.v_cobranzas, {
      id: 'cob-dolce', cliente: 'Heladería Sol', estado: 'procesada', fecha: '2026-09-21', moneda: 'ARS',
      unidad_negocio_id: 'u-d', unidad_negocio_nombre: 'Dolce Pasta',
    }];
    const rpc = {
      pagar_proveedor_mixto: fallaPago
        ? 'ERROR:La cuenta no existe, está inactiva o no es en pesos.'
        : { orden_pago_id: 'op-1', numero: 1, numero_texto: 'N-OP-00001', total: 650000, aplicado: 650000, a_favor: 0, gasto_cheques_id: 'g-1', gasto_resto_id: 'g-2' },
      datos_orden_pago: ORDEN,
    };
    // Dos cuentas de banco propias (la de la maqueta es de la Empresa).
    const cuentas = [...datos.tablas.cuentas_caja,
      { id: 'cta-banco-yo', nombre: 'Banco Galicia · mía', unidad_negocio_id: null, medio: 'banco', moneda: 'ARS', activa: true, empleado_id: 'emp-1' },
      { id: 'cta-banco-yo2', nombre: 'Banco Nación · mía', unidad_negocio_id: null, medio: 'banco', moneda: 'ARS', activa: true, empleado_id: 'emp-1' }];
    // 30/10/2026: cada orden es la de un pago de la cuenta (gastos.orden_pago_id).
    const gastos = ordenes.map(o => ({ id: 'g-' + o.id, orden_pago_id: o.id, medio_pago: 'transferencia', descripcion: 'Pago a proveedor' }));
    const movimientos = [...datos.tablas.v_cuenta_corriente_movimientos, ...ordenes.map((o, i) => ({
      proveedor_id: 'pv1', unidad_negocio_id: o.unidad_negocio_id, moneda: 'ARS', fecha: o.fecha, tipo: 'pago', monto: -o.total,
      factura_pendiente_id: null, gasto_id: 'g-' + o.id, credito_id: null, referencia: 'Pago a proveedor', saldo_acumulado: 0, orden_desempate: o.creada_en ?? String(i) }))];
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({ tablas: { cobranza_cheques: cheques, v_cobranzas: cobranzas, ordenes_pago: ordenes, cuentas_caja: cuentas, gastos, v_cuenta_corriente_movimientos: movimientos }, rpc }));
    localStorage.setItem('barraUnidad.elegida', 'u-n');
  }, { fallaPago, ordenes, ORDEN });
  await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?proveedor=pv1&unidad=u-n`);
}

async function abrirPago(page) {
  await page.locator('#btn-registrar-pago').click();
  await expect(page.locator('#modal-pago')).toBeVisible();
  await expect(page.locator('#lista-fifo .check-fifo')).toHaveCount(2);
}

const fila = (page, numero) => page.locator('#lista-fifo .fila-fifo', { hasText: numero });

async function tildarCheque(page, numero) {
  const lista = page.locator('#lista-cartera-pago');
  if (await page.locator('#grupo-cartera-pago').isHidden()) await page.locator('#btn-medio-cartera').click();
  await expect(lista.locator('[data-cheque-cartera]')).toHaveCount(3);
  await lista.locator('.cartera-pago__fila', { hasText: numero }).locator('input').check();
}

async function confirmar(page) {
  const b = page.locator('#btn-confirmar-pago');
  await expect(b).toBeInViewport();
  await b.click();
}

for (const [nombre, ancho, alto] of [['1280', 1280, 900], ['390', 390, 844], ['360', 360, 780], ['tablet', 1000, 540]]) {
  test(`${nombre}: de las facturas a los valores — faltan, "Completar", una sola llamada y la orden`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page);
    await abrirPago(page);

    // Las dos facturas, la más vieja arriba; tildar pone su saldo.
    expect(await page.locator('#lista-fifo .fila-fifo__numero').allTextContents()).toEqual(['0003-00001201 · 20/08/2026', '0003-00001245 · 05/09/2026']);
    await fila(page, '0003-00001201').locator('.check-fifo').check();
    await expect(fila(page, '0003-00001201').locator('.monto-fifo')).toHaveValue('250.000');
    await fila(page, '0003-00001245').locator('.check-fifo').check();
    await expect(page.locator('#resumen-aplicacion')).toHaveText(/^Facturas \$\s650\.000,00 · Valores \$\s0,00 · Diferencia \$\s650\.000,00$/);

    // Un cheque de Dolce: faltan valores y no deja confirmar.
    await tildarCheque(page, '55443322');
    await expect(page.locator('#aviso-cartera-otra-empresa')).toHaveText(/Este cheque es de Dolce Pasta/);
    await expect(page.locator('#aviso-diferencia-pago')).toHaveText(/^Faltan \$\s530\.000,00 para cubrir las facturas elegidas$/);
    await confirmar(page);
    await expect(page.locator('#error-confirmar-pago')).toHaveText(/^Faltan \$\s530\.000,00 para cubrir las facturas elegidas\.$/);
    expect(pagos(rpc), 'faltando valores no se manda nada').toEqual([]);

    // "Completar con efectivo/transferencia" pone la diferencia en el monto.
    await page.locator('#btn-completar-diferencia').click();
    await expect(page.locator('#campo-monto-pago')).toHaveValue('530.000');
    await page.locator('#grilla-medio-pago-cc [data-valor="transferencia"]').click();
    await page.locator('#campo-cuenta-pago-cc').selectOption('cta-banco-yo');
    await expect(page.locator('#resumen-aplicacion')).toHaveText(/Diferencia \$\s0,00$/);
    await expect(page.locator('#aviso-diferencia-pago')).toBeHidden();
    await expect(page.locator('#resumen-pago-mixto')).toHaveText(
      /^Cheques \$\s120\.000,00 \(1 cheque, 1 de Dolce Pasta\) \+ Transferencia \$\s530\.000,00 = \$\s650\.000,00, aplicado a facturas 0003-00001201, 0003-00001245\.$/);
    await page.locator('#campo-observaciones-orden').fill('Entregado en mano');
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `pago-facturas-a-valores-${nombre}`, info);

    await confirmar(page);
    await expect.poll(() => pagos(rpc).length).toBe(1);
    expect(pagos(rpc)[0]).toEqual({ nombre: 'pagar_proveedor_mixto', params: {
      p_proveedor_id: 'pv1', p_unidad_negocio_id: 'u-n', p_fecha: '2026-10-15', p_cheque_ids: ['chq-dolce'],
      p_monto_resto: 530000, p_medio_resto: 'transferencia', p_cuenta_resto: 'cta-banco-yo',
      p_aplicaciones: [{ factura_pendiente_id: 'fp-1', monto_aplicado: 250000 }, { factura_pendiente_id: 'fp-2', monto_aplicado: 400000 }],
      p_observaciones: 'Entregado en mano',
    } });
    await expect(page.locator('#modal-pago')).toBeHidden();

    // La orden de pago.
    const hoja = page.locator('#orden-pago-hoja');
    await expect(page.locator('#modal-orden-pago')).toBeVisible();
    await expect(hoja).toContainText('ORDEN DE PAGO');
    await expect(hoja).toContainText('N-OP-00001');
    await expect(hoja).toContainText('PAZ MIRTA');
    await expect(hoja).toContainText('CUIT 20-92410679-5');
    await expect(hoja).toContainText('Se cancelan los siguientes comprobantes');
    await expect(hoja).toContainText('eCheq');
    await expect(hoja).toContainText('SEISCIENTOS CINCUENTA MIL PESOS CON CINCUENTA CENTAVOS');
    await expect(hoja).toContainText('Saldo a favor del proveedor');
    await expect(hoja).toContainText('Recibí conforme (proveedor)');
    await expect(hoja).toContainText('Generada por Usuario Maqueta');
    const texto = await hoja.textContent();
    expect(texto, 'la orden NO dice de qué empresa venía el cheque').not.toContain('Dolce Pasta');
    expect(texto, 'la orden NO imprime la cuenta').not.toContain('Banco Galicia · mía');
    expect(rpc.filter(r => r.nombre === 'datos_orden_pago').map(r => r.params)).toEqual([{ p_orden_id: 'op-1' }]);
    await expect(page.locator('#btn-imprimir-orden')).toBeVisible();
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal con la orden abierta').toBe(true);
    await captura(page, `orden-pago-${nombre}`, info);
    // Al imprimir se ve SOLO la hoja.
    await page.evaluate(() => document.documentElement.classList.add('op-imprimiendo'));
    await page.emulateMedia({ media: 'print' });
    expect(await page.locator('#vista-ficha').isVisible(), 'la ficha no se imprime').toBe(false);
    await expect(hoja).toBeVisible();
    await expect(page.locator('#btn-imprimir-orden')).toBeHidden();
    await page.emulateMedia({ media: 'screen' });
    await page.locator('#btn-cerrar-orden').click();
    await expect(page.locator('#modal-orden-pago')).toBeHidden();
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: de los valores a las facturas — "Aplicar a las más viejas" con la última parcial`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page);
    await abrirPago(page);

    await tildarCheque(page, '12345678');
    await page.locator('#grilla-medio-pago-cc [data-valor="efectivo"]').click();
    await page.locator('#campo-monto-pago').fill('200000');
    await page.locator('#campo-cuenta-pago-cc').selectOption('cta-efectivo-yo');
    await expect(page.locator('#aviso-diferencia-pago')).toHaveText('Pago a cuenta: queda todo a favor');
    await page.locator('#btn-aplicar-viejas').click();
    await expect(fila(page, '0003-00001201').locator('.check-fifo')).toBeChecked();
    await expect(fila(page, '0003-00001201').locator('.monto-fifo')).toHaveValue('250.000');
    await expect(fila(page, '0003-00001245').locator('.check-fifo')).toBeChecked();
    await expect(fila(page, '0003-00001245').locator('.monto-fifo'), 'la última, parcial').toHaveValue('100.000');
    await expect(page.locator('#resumen-aplicacion')).toHaveText(/Valores \$\s350\.000,00 · Diferencia \$\s0,00$/);
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `pago-valores-a-facturas-${nombre}`, info);

    await confirmar(page);
    await expect.poll(() => pagos(rpc).length).toBe(1);
    expect(pagos(rpc)[0].params).toEqual({
      p_proveedor_id: 'pv1', p_unidad_negocio_id: 'u-n', p_fecha: '2026-10-15', p_cheque_ids: ['chq-2'],
      p_monto_resto: 200000, p_medio_resto: 'efectivo', p_cuenta_resto: 'cta-efectivo-yo',
      p_aplicaciones: [{ factura_pendiente_id: 'fp-1', monto_aplicado: 250000 }, { factura_pendiente_id: 'fp-2', monto_aplicado: 100000 }],
      p_observaciones: null,
    });
    await expect(page.locator('#modal-orden-pago')).toBeVisible();
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

for (const [nombre, ancho, alto] of [['1280', 1280, 900], ['390', 390, 844]]) {
  test(`${nombre}: solo transferencia, lo que sobra queda a favor, y el error de la base tal cual sin orden`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page, { fallaPago: true });
    await abrirPago(page);
    await fila(page, '0003-00001201').locator('.check-fifo').check();
    await page.locator('#grilla-medio-pago-cc [data-valor="qr"]').click();
    await page.locator('#campo-monto-pago').fill('300000');
    await page.locator('#campo-cuenta-pago-cc').selectOption('cta-banco-yo2');
    await expect(page.locator('#aviso-diferencia-pago')).toHaveText(/^Quedan \$\s50\.000,00 a favor del proveedor$/);
    await confirmar(page);
    await expect.poll(() => pagos(rpc).length).toBe(1);
    expect(pagos(rpc)[0].params).toMatchObject({ p_cheque_ids: [], p_monto_resto: 300000, p_medio_resto: 'qr', p_cuenta_resto: 'cta-banco-yo2',
      p_aplicaciones: [{ factura_pendiente_id: 'fp-1', monto_aplicado: 250000 }] });
    await expect(page.locator('#error-confirmar-pago')).toHaveText('La cuenta no existe, está inactiva o no es en pesos.');
    await expect(page.locator('#modal-pago')).toBeVisible();
    await expect(page.locator('#modal-orden-pago')).toBeHidden();
    expect(rpc.some(r => r.nombre === 'datos_orden_pago'), 'sin orden').toBe(false);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: cada pago dice su orden de pago y se reimprime desde su renglón`, async ({ page }) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page, { ordenes: [
      { id: 'op-1', unidad_negocio_id: 'u-n', proveedor_id: 'pv1', numero: 1, fecha: '2026-10-14', total: 650000.5, creada_en: '2026-10-14T12:00:00Z' },
      { id: 'op-2', unidad_negocio_id: 'u-n', proveedor_id: 'pv1', numero: 2, fecha: '2026-10-15', total: 1000, creada_en: '2026-10-15T12:00:00Z' },
    ] });
    // Se fue el recuadro "Órdenes de pago (N)" de abajo (30/10/2026).
    await expect(page.locator('#ficha-ordenes-pago')).toHaveCount(0);
    const lista = page.locator('#lista-movimientos-ficha');
    // (La maqueta no ordena: el orden lo da la vista en la base.)
    await expect(lista.locator('.fila-movimiento__orden')).toHaveCount(2);
    expect((await lista.locator('.fila-movimiento__orden').allTextContents()).sort()).toEqual(['Orden de pago N-OP-00001', 'Orden de pago N-OP-00002']);
    await lista.locator('[data-reimprimir-orden="op-1"]').click();
    await expect(page.locator('#orden-pago-hoja')).toContainText('N-OP-00001');
    expect(rpc.filter(r => r.nombre === 'datos_orden_pago').map(r => r.params)).toEqual([{ p_orden_id: 'op-1' }]);
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
