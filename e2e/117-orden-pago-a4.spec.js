// LA ORDEN DE PAGO A4 (31/10/2026, rama ci-prueba/orden-pago-a4).
// En la maqueta (cc-cheques), sin credenciales, a 390 y 1280 px: la orden se
// reimprime desde el renglón de su pago y
//  - es UNA hoja: arriba la empresa y el proveedor; "Con qué se pagó" (los
//    cheques sin librador ni cliente, "Transferencias" con la cuenta y
//    "Efectivo", cada uno con su subtotal) y "Facturas que cancela" (con el
//    subrenglón de lo que ya tenía), lado a lado en la hoja ancha (y al
//    imprimir) y una abajo de la otra en el celular;
//  - las dos cajas de totales a la MISMA altura (mismo arriba, mismo alto, y
//    las dos líneas de TOTAL a la misma altura);
//  - la franja ("Queda saldo pendiente", "Queda a favor de PAZ MIRTA",
//    "Facturas canceladas") y UNA línea "Saldo de la cuenta: $ X le debemos";
//  - el PDF de Chromium (lo mismo que "Guardar PDF") es UNA página, también
//    con 40 cheques y 40 facturas (la versión compacta);
//  - anulada: tachada con el sello "ANULADA", sin "Imprimir" ni "Enviar";
//  - "Enviar": con navigator.share comparte el PDF; sin share, lo descarga
//    (html2canvas y jsPDF son dobles: en este contenedor cdnjs no carga).
//  - Sin scroll horizontal y sin errores de JS.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
test.describe.configure({ timeout: 120000 });

const sinScrollHorizontal = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

const ORDEN = {
  id: 'op-1', numero: 1, numero_texto: 'N-OP-00001', fecha: '2026-10-31', total: 1350000.5, total_original: 1400000, anulada: false,
  observaciones: 'Retira Juan', creada_por: 'Usuario Maqueta',
  emisor: { empresa: 'Cucuruchos Nuss', razon_social: 'PAZ MIRTA', cuit: '20924106795', domicilio: 'Unión 843, Córdoba', logo_url: 'logo-cucuruchos-nuss.png' },
  proveedor: { razon_social: 'ANATOLIA SRL', cuit: '30712345678', direccion: 'Ruta 9 km 5' },
  facturas: [
    { tipo: 'Factura A', numero: '0003-00001201', fecha: '2026-08-20', importe: 900000, aplicado: 700000, saldo_actual: 0 },
    { tipo: 'factura', numero: '0003-00001245', fecha: '2026-09-05', importe: 800000, aplicado: 650000.5, saldo_actual: 149999.5 },
  ],
  cheques: [
    { banco: 'BANCO DE GALICIA Y BUENOS AIRES', numero: '62921151', fecha_pago: '2026-11-15', librador: [{ nombre: 'HELADERIA LOPEZ SA', cuit: '30700000001' }], es_echeq: true, importe: 500000, de_empresa: 'Dolce Pasta', otra_empresa: true },
    { banco: 'BANCO MACRO', numero: '00012345', fecha_pago: '2026-11-30', librador: [{ nombre: 'KIOSCO EL SOL', cuit: '20300000002' }], es_echeq: false, importe: 350000, de_empresa: 'Cucuruchos Nuss', otra_empresa: false },
  ],
  otros_medios: [
    { medio: 'transferencia', cuenta: 'Banco Macro CC 123', importe: 400000.5 },
    { medio: 'efectivo', cuenta: 'Caja chica Nuss', importe: 100000 },
  ],
  a_favor: 0,
};
const cheque = (i) => ({ banco: i % 2 ? 'BANCO MACRO' : 'BANCO DE GALICIA Y BUENOS AIRES', numero: String(60000000 + i), fecha_pago: '2026-11-15', es_echeq: i % 3 === 0, importe: 10000 + i });
const factura = (i) => ({ tipo: 'factura', numero: `0003-${String(1300 + i).padStart(8, '0')}`, fecha: '2026-09-01', importe: 30000, aplicado: 10000, saldo_actual: 20000 });

// Lo anterior de la primera factura (lo lee la hoja de la base): un pago
// de otra orden y un crédito, antes de esta.
const LO_ANTERIOR = {
  ordenes_pago: [{ id: 'op-1', unidad_negocio_id: 'u-n', proveedor_id: 'pv1', numero: 1, fecha: '2026-10-31', total: 1400000, creada_en: '2026-10-31T14:00:00Z' }],
  gastos: [{ id: 'g-op-1', orden_pago_id: 'op-1', medio_pago: 'transferencia', descripcion: 'Pago a proveedor', estado: 'registrado' }],
  aplicaciones_pago: [
    { gasto_id: 'g-op-1', factura_pendiente_id: 'f-op-1', monto_aplicado: 700000, created_at: '2026-10-31T14:00:00Z' },
    { gasto_id: 'g-viejo', factura_pendiente_id: 'f-op-1', monto_aplicado: 150000, created_at: '2026-10-01T10:00:00Z' },
  ],
  aplicaciones_credito: [{ factura_pendiente_id: 'f-op-1', monto_aplicado: 50000, created_at: '2026-10-20T10:00:00Z' }],
  facturas_extra: [{ id: 'f-op-1', proveedor_id: 'pv-otro', unidad_negocio_id: 'u-n', tipo_documento: 'Factura A', numero_comprobante: '0003-00001201', fecha_factura: '2026-08-20', importe: 900000, saldo_pendiente: 0, estado: 'pagada', moneda: 'ARS' }],
};

async function abrirOrden(page, orden = ORDEN) {
  await page.clock.setFixedTime(new Date('2026-10-31T10:30:00-03:00'));
  await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?maqueta=cc-cheques`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async ({ orden, ant }) => {
    const datos = await fetch('/maqueta/datos/cc-cheques.json').then(r => r.json());
    const movimientos = [...datos.tablas.v_cuenta_corriente_movimientos, { proveedor_id: 'pv1', unidad_negocio_id: 'u-n', moneda: 'ARS', fecha: '2026-10-31', tipo: 'pago', monto: -orden.total,
      factura_pendiente_id: null, gasto_id: 'g-op-1', credito_id: null, referencia: 'Pago a proveedor', saldo_acumulado: 0, orden_desempate: 9 }];
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({
      tablas: {
        ordenes_pago: ant.ordenes_pago, gastos: ant.gastos, aplicaciones_pago: ant.aplicaciones_pago, aplicaciones_credito: ant.aplicaciones_credito,
        facturas_pendientes: [...datos.tablas.facturas_pendientes, ...ant.facturas_extra], v_cuenta_corriente_movimientos: movimientos,
      },
      rpc: { datos_orden_pago: orden },
    }));
    localStorage.setItem('barraUnidad.elegida', 'u-n');
  }, { orden, ant: LO_ANTERIOR });
  await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?proveedor=pv1&unidad=u-n`);
  await page.locator('#lista-movimientos-ficha [data-reimprimir-orden="op-1"]').click();
  await expect(page.locator('#modal-orden-pago')).toBeVisible();
  await expect(page.locator('#orden-pago-hoja .op-cab')).toHaveCount(1);
}

// Lo mismo que "Guardar PDF": el PDF de Chromium con la hoja A4 de la página.
async function paginasDelPdf(page) {
  await page.evaluate(() => document.documentElement.classList.add('op-imprimiendo'));
  await page.emulateMedia({ media: 'print' });
  const pdf = (await page.pdf({ preferCSSPageSize: true, printBackground: true })).toString('latin1');
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => document.documentElement.classList.remove('op-imprimiendo'));
  return (pdf.match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
}
const caja = (loc) => loc.evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } });

for (const [ancho, alto] of [[390, 844], [1280, 900]]) {
  test(`${ancho} px: la orden de pago A4 en una hoja`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirOrden(page);
    const hoja = page.locator('#orden-pago-hoja');
    const texto = await hoja.textContent();
    expect(texto, 'sin ORIGINAL ni DUPLICADO').not.toMatch(/ORIGINAL|DUPLICADO/);
    await expect(hoja.locator('.op-cab__emisor')).toHaveText(/PAZ MIRTA\s*CUIT 20-92410679-5\s*Unión 843, Córdoba/);
    await expect(hoja.locator('.op-cab__titulo')).toHaveText(/^\s*ORDEN DE PAGO\s*N-OP-00001\s*Fecha 31\/10\/2026\s*$/);
    await expect(hoja.locator('.op-proveedor')).toHaveText(/ANATOLIA SRL\s*CUIT 30-71234567-8\s*Ruta 9 km 5/);

    // Los cheques: banco, número, fecha de pago, importe. Sin librador ni cliente.
    const cheques = hoja.locator('.op-bloque--cheques table');
    expect(await cheques.locator('thead th').allTextContents()).toEqual(['Banco', 'Número', 'Fecha de pago', 'Importe']);
    expect(await cheques.locator('tbody tr').nth(0).locator('td').allTextContents()).toEqual(['BANCO DE GALICIA Y BUENOS AIRES eCheq', '62921151', '15/11/2026', '$ 500.000,00']);
    await expect(cheques.locator('tfoot')).toHaveText(/Subtotal cheques\s*\$ 850\.000,00/);
    expect(texto).not.toMatch(/HELADERIA LOPEZ|KIOSCO EL SOL|Librador|Dolce Pasta|entregado/i);
    // Transferencias (cuenta e importe) y Efectivo, cada uno con su subtotal.
    await expect(hoja.locator('.op-bloque--transferencia tbody')).toHaveText(/Banco Macro CC 123\s*\$ 400\.000,50/);
    await expect(hoja.locator('.op-bloque--transferencia tfoot')).toHaveText(/Subtotal transferencias\s*\$ 400\.000,50/);
    await expect(hoja.locator('.op-bloque--efectivo tfoot')).toHaveText(/Subtotal efectivo\s*\$ 100\.000,00/);
    expect(texto, 'sin la caja del efectivo').not.toContain('Caja chica Nuss');

    // Facturas que cancela, con el subrenglón de lo que ya tenía.
    const facturas = hoja.locator('.op-tabla--facturas');
    expect(await facturas.locator('thead th').allTextContents()).toEqual(['Comprobante', 'Fecha', 'Importe', 'Aplicado', 'Le queda']);
    expect(await facturas.locator('tbody tr').nth(0).locator('td').allTextContents()).toEqual(['Factura A 0003-00001201', '20/08/2026', '$ 900.000,00', '$ 700.000,00', '$ 0,00']);
    await expect(facturas.locator('tr.op-sub')).toHaveText('Ya tenía pagos anteriores por $ 150.000,00 y créditos por $ 50.000,00');
    const fsSub = await facturas.locator('tr.op-sub td').evaluate(e => parseFloat(getComputedStyle(e).fontSize));
    const fsFila = await facturas.locator('tbody tr').nth(0).locator('td').first().evaluate(e => parseFloat(getComputedStyle(e).fontSize));
    expect(fsSub, 'el subrenglón, más chico').toBeLessThan(fsFila);

    // Las columnas: lado a lado en la hoja ancha, una abajo de la otra en el celular.
    const cPago = await caja(hoja.locator('.op-columna--pago')), cFact = await caja(hoja.locator('.op-columna--facturas'));
    if (ancho >= 1280) expect(cPago.x < cFact.x && Math.abs(cPago.y - cFact.y) < 1, JSON.stringify([cPago, cFact])).toBe(true);
    else expect(cFact.y >= cPago.y + cPago.h - 1, JSON.stringify([cPago, cFact])).toBe(true);

    // Nada se sale de su lugar: ni las tablas de su columna ni lo de las cajas de su caja.
    const desbordes = await hoja.evaluate(h => [...h.querySelectorAll('.op-columna table, .op-caja')].map(e => {
      const r = e.getBoundingClientRect(), padre = (e.closest('.op-columna') ?? e).getBoundingClientRect()
      return { clase: e.className, sale: Math.round(r.right - padre.right), interno: e.scrollWidth - e.clientWidth }
    }).filter(x => x.sale > 0 || x.interno > 0));
    expect(desbordes, 'nada se sale de su columna ni de su caja').toEqual([]);
    expect(await page.locator('.op-hoja-marco').evaluate(e => e.scrollWidth <= e.clientWidth), 'la hoja no se corre de costado').toBe(true);

    // Las dos cajas de totales, A LA MISMA ALTURA.
    const izq = await caja(hoja.locator('.op-caja--pagado')), der = await caja(hoja.locator('.op-caja--facturas'));
    expect(Math.abs(izq.y - der.y) < 0.5 && Math.abs(izq.h - der.h) < 0.5 && izq.x < der.x, `cajas: ${JSON.stringify([izq, der])}`).toBe(true);
    const tIzq = await caja(hoja.locator('.op-caja--pagado .op-caja__total')), tDer = await caja(hoja.locator('.op-caja--facturas .op-caja__total'));
    expect(Math.abs((tIzq.y + tIzq.h) - (tDer.y + tDer.h)) < 0.5, `los totales a la misma altura: ${JSON.stringify([tIzq, tDer])}`).toBe(true);
    await expect(hoja.locator('.op-caja--pagado')).toHaveText(/Cheques\s*\$ 850\.000,00\s*Transferencias\s*\$ 400\.000,50\s*Efectivo\s*\$ 100\.000,00\s*TOTAL PAGADO\s*\$ 1\.350\.000,50/);
    await expect(hoja.locator('.op-caja--facturas')).toHaveText(/TOTAL FACTURAS\s*\$ 1\.500\.000,00/);
    await expect(hoja.locator('.op-letras')).toHaveText('Son UN MILLÓN TRESCIENTOS CINCUENTA MIL PESOS CON CINCUENTA CENTAVOS');
    // La franja y UNA línea del saldo (v_saldo_proveedor de la maqueta: ANATOLIA en Nuss debe $ 650.000).
    await expect(hoja.locator('.op-franja')).toHaveText(/^\s*Queda saldo pendiente\s*\$ 149\.999,50\s*$/);
    await expect(hoja.locator('.op-saldo-cuenta')).toHaveCount(1);
    await expect(hoja.locator('.op-saldo-cuenta')).toHaveText(/^\s*Saldo de la cuenta:\s*\$ 650\.000,00\s*le debemos\s*$/);
    await expect(hoja.locator('.op-observaciones')).toHaveText(/Observaciones\s*Retira Juan/);
    await expect(hoja.locator('.op-firma')).toHaveText(['Recibí conforme (proveedor) — firma y aclaración', 'Autorizó']);
    await expect(page.locator('#btn-imprimir-orden')).toBeVisible();
    await expect(page.locator('#btn-enviar-orden')).toBeVisible();
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `orden-pago-a4-${ancho}`, info);

    // Al imprimir, la hoja toma el ancho del papel (A4 menos los márgenes:
    // 194 mm = 733 px), también desde el celular: las columnas, lado a lado.
    await page.evaluate(() => document.documentElement.classList.add('op-imprimiendo'));
    await page.emulateMedia({ media: 'print' });
    await page.setViewportSize({ width: 733, height: 1100 });
    const pPago = await caja(hoja.locator('.op-columna--pago')), pFact = await caja(hoja.locator('.op-columna--facturas'));
    expect(pPago.x < pFact.x && Math.abs(pPago.y - pFact.y) < 1, `impresa, lado a lado: ${JSON.stringify([pPago, pFact])}`).toBe(true);
    await page.emulateMedia({ media: 'screen' });
    await page.setViewportSize({ width: ancho, height: alto });
    await page.evaluate(() => document.documentElement.classList.remove('op-imprimiendo'));
    expect(await paginasDelPdf(page), 'UNA hoja').toBe(1);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

test('la franja en los tres casos', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  const una = { tipo: 'factura', numero: '9', fecha: '2026-10-01', importe: 1000000, aplicado: 1000000, saldo_actual: 0 };
  await abrirOrden(page, { ...ORDEN, total: 1500000, facturas: [una] });
  await expect(page.locator('#orden-pago-hoja .op-franja')).toHaveText(/^\s*Queda a favor de PAZ MIRTA\s*\$ 500\.000,00\s*$/);
  await abrirOrden(page, { ...ORDEN, total: 1000000, facturas: [una] });
  await expect(page.locator('#orden-pago-hoja .op-franja')).toHaveText(/^\s*Facturas canceladas\s*$/);
  await abrirOrden(page);
  await expect(page.locator('#orden-pago-hoja .op-franja')).toHaveText(/^\s*Queda saldo pendiente\s*\$ 149\.999,50\s*$/);
  expect(errores, errores.join('\n')).toEqual([]);
});

test('muchos cheques y facturas: la versión compacta, en UNA hoja', async ({ page }, info) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  const cheques = Array.from({ length: 40 }, (_, i) => cheque(i));
  const facturas = Array.from({ length: 40 }, (_, i) => factura(i));
  await abrirOrden(page, { ...ORDEN, cheques, facturas, total: cheques.reduce((s, c) => s + c.importe, 0) + 500000.5 });
  await expect(page.locator('#orden-pago-hoja .op-a4')).toHaveClass(/op-a4--compacta/);
  await expect(page.locator('#orden-pago-hoja .op-bloque--cheques tbody tr')).toHaveCount(40);
  await expect(page.locator('#orden-pago-hoja .op-tabla--facturas tbody tr')).toHaveCount(40);
  // El banco largo, en UN renglón: la fila del Galicia mide lo mismo que la del Macro.
  const altos = await page.locator('#orden-pago-hoja .op-bloque--cheques tbody tr').evaluateAll(fs => fs.slice(0, 2).map(f => Math.round(f.getBoundingClientRect().height)));
  expect(altos[0], `el banco largo no agrega renglones: ${altos}`).toBe(altos[1]);
  expect(await paginasDelPdf(page), '40 cheques y 40 facturas: UNA hoja').toBe(1);
  // Las cajas siguen a la misma altura.
  const izq = await caja(page.locator('#orden-pago-hoja .op-caja--pagado')), der = await caja(page.locator('#orden-pago-hoja .op-caja--facturas'));
  expect(Math.abs(izq.y - der.y) < 0.5 && Math.abs(izq.h - der.h) < 0.5, JSON.stringify([izq, der])).toBe(true);
  // La hoja impresa, para mirarla: lo que sale en papel, a lo alto.
  await page.evaluate(() => document.documentElement.classList.add('op-imprimiendo'));
  await page.emulateMedia({ media: 'print' });
  await page.setViewportSize({ width: 794, height: 1123 });
  await captura(page, 'orden-pago-a4-impresa-40', info);
  await page.emulateMedia({ media: 'screen' });
  expect(errores, errores.join('\n')).toEqual([]);
});

test('anulada: tachada, con el sello, sin "Imprimir" ni "Enviar"', async ({ page }, info) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirOrden(page, { ...ORDEN, anulada: true, facturas: [] });
  const hoja = page.locator('#orden-pago-hoja');
  await expect(hoja.locator('.op-anulada')).toHaveText('ANULADA: el pago de esta orden se anuló. No se reimprime.');
  await expect(hoja.locator('.op-sello-anulada')).toBeVisible();
  await expect(hoja.locator('.op-sello-anulada')).toHaveText('ANULADA');
  expect(await hoja.locator('.op-cab__titulo-texto').evaluate(e => getComputedStyle(e).textDecorationLine)).toBe('line-through');
  await expect(page.locator('#btn-imprimir-orden')).toBeHidden();
  await expect(page.locator('#btn-enviar-orden')).toBeHidden();
  expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
  await captura(page, 'orden-pago-a4-anulada-390', info);
  expect(errores, errores.join('\n')).toEqual([]);
});

// Los dobles de html2canvas y jsPDF (cdnjs no carga en este contenedor).
async function dobleDelPdf(page) {
  await page.evaluate(() => {
    window.__pdf = [];
    window.html2canvas = async (el) => { window.__pdf.push(el.className); const c = document.createElement('canvas'); c.width = 733 * 2; c.height = 1000 * 2; return c };
    window.jspdf = { jsPDF: function () { this.addImage = () => {}; this.output = () => new Blob(['%PDF-1.4 doble'], { type: 'application/pdf' }) } };
  });
}

test('"Enviar" con navigator.share: comparte el PDF', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirOrden(page);
  await dobleDelPdf(page);
  await page.evaluate(() => {
    window.__compartidos = [];
    navigator.canShare = (x) => !!x?.files?.length;
    navigator.share = async (x) => { window.__compartidos.push({ nombre: x.files[0].name, tipo: x.files[0].type, tam: x.files[0].size, titulo: x.title }) };
  });
  await page.locator('#btn-enviar-orden').click();
  await expect.poll(() => page.evaluate(() => window.__compartidos.length)).toBe(1);
  const [c] = await page.evaluate(() => window.__compartidos);
  expect(c).toEqual({ nombre: 'Orden de pago N-OP-00001 ANATOLIA SRL.pdf', tipo: 'application/pdf', tam: 14, titulo: 'Orden de pago N-OP-00001 ANATOLIA SRL' });
  expect(await page.evaluate(() => window.__pdf), 'el PDF sale de la hoja').toEqual(['op-hoja op-hoja--pdf']);
  expect(errores, errores.join('\n')).toEqual([]);
});

test('"Enviar" sin share: descarga el PDF', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await abrirOrden(page);
  await dobleDelPdf(page);
  await page.evaluate(() => { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }) });
  const [descarga] = await Promise.all([page.waitForEvent('download'), page.locator('#btn-enviar-orden').click()]);
  expect(descarga.suggestedFilename()).toBe('Orden de pago N-OP-00001 ANATOLIA SRL.pdf');
  await expect(page.getByText('Se descargó la orden de pago: Orden de pago N-OP-00001 ANATOLIA SRL.pdf')).toBeVisible();
  expect(errores, errores.join('\n')).toEqual([]);
});
