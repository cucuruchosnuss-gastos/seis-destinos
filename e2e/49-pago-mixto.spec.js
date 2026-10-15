// PAGAR A UN PROVEEDOR CON CHEQUES DE CUALQUIER EMPRESA Y CON MEDIOS
// COMBINADOS (15/10/2026, rama ci-prueba/pago-mixto). En la maqueta
// (cc-cheques), sin credenciales, a 1280, 390 y 360 px y en la tablet
// (1000 × 540):
//  - "Cheques de la cartera" lista los en cartera de TODAS las empresas,
//    agrupados (Cucuruchos Nuss, la del proveedor, primero; después Dolce
//    Pasta). El de Dolce dice "de Dolce Pasta" y al tildarlo avisa la deuda
//    entre empresas.
//  - "Completar con" Efectivo: el resto, la cuenta, el monto total y el
//    resumen ("Cheques $ X (2 cheques, 1 de Dolce Pasta) + Efectivo $ Y = …").
//  - Confirmar: primero pagar_proveedor_con_cheques_cartera (los cheques
//    cubren la factura más vieja) y después registrar_pago_proveedor por el
//    resto, en ese orden y con esos parámetros.
//  - Si el segundo pago falla: el aviso de que los cheques ya quedaron pagados
//    y el error de la base; "Registrar el resto" reintenta SOLO el resto.
//  - Sin scroll horizontal y sin errores de JS.
// Los datos se suman con 'maqueta.cambios' (no se tocan los de otras pruebas).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

// Lo que la maqueta anota de cada rpc ('[maqueta] rpc', nombre, params).
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
const pagos = (rpc) => rpc.filter(r => r.nombre === 'pagar_proveedor_con_cheques_cartera' || r.nombre === 'registrar_pago_proveedor');

const ERROR_RESTO = 'El monto aplicado a la factura fp-2 supera su saldo pendiente';

// Un cheque de Dolce Pasta en cartera (de una cobranza asentada) y la
// sugerencia de facturas para el total ($ 570.000): fp-1 entera y 320.000 de fp-2.
async function abrir(page, { fallaResto = false } = {}) {
  await page.clock.setFixedTime(new Date('2026-10-15T10:30:00-03:00'));
  await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?maqueta=cc-cheques`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async (fallaResto) => {
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
      sugerir_facturas_fifo: {
        __segun: [{ si: { p_monto: 570000 }, r: [
          { factura_pendiente_id: 'fp-1', fecha_factura: '2026-08-20', numero_comprobante: '0003-00001201', saldo_pendiente: 250000, monto_a_aplicar: 250000 },
          { factura_pendiente_id: 'fp-2', fecha_factura: '2026-09-05', numero_comprobante: '0003-00001245', saldo_pendiente: 400000, monto_a_aplicar: 320000 },
        ] }],
        __defecto: [],
      },
    };
    if (fallaResto) rpc.registrar_pago_proveedor = 'ERROR:El monto aplicado a la factura fp-2 supera su saldo pendiente';
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({ tablas: { cobranza_cheques: cheques, v_cobranzas: cobranzas }, rpc }));
    localStorage.setItem('barraUnidad.elegida', 'u-n');
  }, fallaResto);
  await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?proveedor=pv1&unidad=u-n`);
  await page.locator('#btn-registrar-pago').click();
  await expect(page.locator('#modal-pago')).toBeVisible();
}

// Tilda el cheque de Nuss ($ 150.000) y el de Dolce ($ 120.000) y completa
// con $ 300.000 en efectivo.
async function armarPagoMixto(page, nombre, info) {
  await page.locator('#grilla-medio-pago-cc [data-valor="cartera"]').click();
  const lista = page.locator('#lista-cartera-pago');
  await expect(lista.locator('[data-cheque-cartera]')).toHaveCount(3);
  // Agrupados: la empresa del proveedor primero.
  expect(await lista.locator('.cartera-pago__grupo').allTextContents()).toEqual(['Cucuruchos Nuss', 'Dolce Pasta']);
  const filaDolce = lista.locator('.cartera-pago__fila', { hasText: '55443322' });
  await expect(filaDolce.locator('.cartera-pago__empresa')).toHaveText('de Dolce Pasta');
  await expect(lista.locator('.cartera-pago__empresa')).toHaveCount(1);
  // El de Dolce va DESPUÉS del título de Dolce (y los de Nuss antes).
  const orden = await lista.evaluate(l => [...l.children].map(c => c.classList.contains('cartera-pago__grupo') ? 'T:' + c.textContent : c.textContent.match(/N° (\d+)/)?.[1]));
  expect(orden).toEqual(['T:Cucuruchos Nuss', '12345678', '66259862', 'T:Dolce Pasta', '55443322']);

  // Nada se monta sobre el importe y "de Dolce Pasta" se ve entero.
  for (const fila of await lista.locator('.cartera-pago__fila').all()) {
    const imp = await fila.locator('.cartera-pago__importe').boundingBox();
    for (const sel of ['.cartera-pago__linea1', '.cartera-pago__linea2']) {
      const b = await fila.locator(sel).boundingBox();
      expect(b.x + b.width, `${sel} no se monta sobre el importe`).toBeLessThanOrEqual(imp.x + 1);
    }
  }
  const chip = filaDolce.locator('.cartera-pago__empresa');
  expect(await chip.evaluate(e => e.scrollWidth <= e.clientWidth + 1), '"de Dolce Pasta" entero').toBe(true);

  await lista.locator('.cartera-pago__fila', { hasText: '12345678' }).locator('input').check();
  await expect(page.locator('#aviso-cartera-otra-empresa')).toBeHidden();
  await filaDolce.locator('input').check();
  await expect(page.locator('#aviso-cartera-otra-empresa')).toHaveText('Este cheque es de Dolce Pasta: queda como deuda de Cucuruchos Nuss con Dolce Pasta (Entre empresas)');
  await expect(page.locator('#total-cartera-pago')).toHaveText(/2 cheques tildados · total \$\s270\.000,00/);
  await expect(page.locator('#campo-monto-pago')).toHaveValue('270.000');
  await captura(page, `pago-mixto-cheques-${nombre}`, info);

  // Completar con efectivo.
  await expect(page.locator('#grupo-completar-pago')).toBeVisible();
  await expect(page.locator('#grupo-resto-pago')).toBeHidden();
  const efectivo = page.locator('#grilla-completar-pago [data-completar="efectivo"]');
  await efectivo.click();
  await expect(page.locator('#grupo-resto-pago')).toBeVisible();
  // Elegido y con el mouse encima: naranja lleno (antes quedaba claro con la letra blanca).
  await efectivo.hover();
  await expect(efectivo).toHaveCSS('background-color', 'rgb(194, 65, 12)');
  await page.locator('#campo-resto-pago').fill('300000');
  await expect(page.locator('#campo-resto-pago')).toHaveValue('300.000');
  await expect(page.locator('#campo-monto-pago')).toHaveValue('570.000');
  await expect(page.locator('#grupo-cuenta-pago-cc')).toBeVisible();
  await page.locator('#campo-cuenta-pago-cc').selectOption('cta-efectivo-yo');
  // Las facturas para el total: las dos tildadas.
  await expect(page.locator('#lista-fifo .check-fifo:checked')).toHaveCount(2);
  await expect(page.locator('#resumen-pago-mixto')).toHaveText(
    /^Cheques \$\s270\.000,00 \(2 cheques, 1 de Dolce Pasta\) \+ Efectivo \$\s300\.000,00 = \$\s570\.000,00 aplicado a facturas 0003-00001201, 0003-00001245$/);
  expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
  await captura(page, `pago-mixto-resumen-${nombre}`, info);
}

for (const [nombre, ancho, alto] of [['1280', 1280, 900], ['390', 390, 844], ['360', 360, 780], ['tablet', 1000, 540]]) {
  test(`${nombre}: cheques de dos empresas + efectivo, en dos pagos y en orden`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page);
    await armarPagoMixto(page, nombre, info);

    const confirmar = page.locator('#btn-confirmar-pago');
    await confirmar.scrollIntoViewIfNeeded();
    await expect(confirmar).toBeInViewport();
    await confirmar.click();
    await expect.poll(() => pagos(rpc).length).toBe(2);
    const [p1, p2] = pagos(rpc);
    expect(p1.nombre, 'primero los cheques').toBe('pagar_proveedor_con_cheques_cartera');
    expect(p2.nombre, 'después el resto').toBe('registrar_pago_proveedor');
    expect(p1.params.p_cheque_ids.sort()).toEqual(['chq-2', 'chq-dolce']);
    expect(p1.params).toMatchObject({ p_proveedor_id: 'pv1', p_unidad_negocio_id: 'u-n', p_fecha: '2026-10-15' });
    expect(p1.params, 'los cheques no mueven caja').not.toHaveProperty('p_cuenta_id');
    expect(p1.params.p_aplicaciones, 'los cheques cubren la factura más vieja').toEqual([
      { factura_pendiente_id: 'fp-1', monto_aplicado: 250000 },
      { factura_pendiente_id: 'fp-2', monto_aplicado: 20000 },
    ]);
    expect(p2.params).toMatchObject({
      p_proveedor_id: 'pv1', p_unidad_negocio_id: 'u-n', p_moneda: 'ARS', p_monto: 300000,
      p_medio_pago: 'efectivo', p_cuenta_id: 'cta-efectivo-yo', p_fecha_pago: '2026-10-15',
    });
    expect(p2.params.p_aplicaciones, 'el resto, a lo que quedó').toEqual([{ factura_pendiente_id: 'fp-2', monto_aplicado: 300000 }]);
    await expect(page.locator('#modal-pago')).toBeHidden();
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: si el resto falla, los cheques ya quedaron pagados y se reintenta solo el resto`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page, { fallaResto: true });
    await armarPagoMixto(page, `${nombre}-falla`, info);

    const confirmar = page.locator('#btn-confirmar-pago');
    await confirmar.scrollIntoViewIfNeeded();
    await confirmar.click();
    const aviso = page.locator('#aviso-resto-pendiente');
    await expect(aviso).toBeVisible();
    await expect(aviso).toHaveText(new RegExp(`^Los cheques ya quedaron pagados \\(gasto g-nuevo\\)\\. Falta registrar el resto de \\$\\s300\\.000,00: ${ERROR_RESTO}$`));
    expect(pagos(rpc).map(r => r.nombre)).toEqual(['pagar_proveedor_con_cheques_cartera', 'registrar_pago_proveedor']);
    // El formulario queda para el resto: sin los cheques ni las facturas.
    await expect(page.locator('#modal-pago')).toBeVisible();
    await expect(page.locator('#grupo-cartera-pago')).toBeHidden();
    await expect(page.locator('#grupo-facturas-pago')).toBeHidden();
    await expect(page.locator('#resumen-pago-mixto')).toBeHidden();
    await expect(page.locator('#grilla-medio-pago-cc [data-valor="cartera"]')).toBeDisabled();
    await expect(page.locator('#grilla-completar-pago [data-completar="transferencia"]')).toBeDisabled();
    await expect(confirmar).toHaveText('Registrar el resto');
    await aviso.scrollIntoViewIfNeeded();
    await expect(aviso).toBeInViewport();
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `pago-mixto-falla-${nombre}`, info);

    // Reintentar: SOLO el resto (la maqueta sigue fallando: el aviso se queda).
    await confirmar.scrollIntoViewIfNeeded();
    await confirmar.click();
    await expect.poll(() => pagos(rpc).length).toBe(3);
    expect(pagos(rpc).map(r => r.nombre), 'los cheques se mandaron UNA sola vez').toEqual(['pagar_proveedor_con_cheques_cartera', 'registrar_pago_proveedor', 'registrar_pago_proveedor']);
    expect(pagos(rpc)[2].params).toMatchObject({ p_monto: 300000, p_medio_pago: 'efectivo', p_cuenta_id: 'cta-efectivo-yo' });
    await expect(aviso).toHaveText(new RegExp(`${ERROR_RESTO}$`));
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
