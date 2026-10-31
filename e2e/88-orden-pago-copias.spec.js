// LA ORDEN DE PAGO: SIN LIBRADOR Y MÁS COMPACTA (23/10/2026, rama
// ci-prueba/orden-pago-duplicado) y, desde el 30/10/2026 (rama
// ci-prueba/cc-proveedor-una-lista), en UNA SOLA HOJA, sin ORIGINAL ni
// DUPLICADO (si hacen falta dos, se imprime dos veces), con la línea del
// saldo de la cuenta abajo de todo.
// En la maqueta (cc-cheques), sin credenciales, a 1280, 390, 360 y tablet
// (768 × 1024): la orden se reimprime desde el renglón de su pago y
//  - en la pantalla y al imprimir se ve UNA hoja, sin rótulo de copia ni
//    aviso de dos hojas; los cheques sin "Librador"; los comprobantes
//    pagados listados con número, fecha y aplicado; las firmas;
//  - el PDF de Chromium (lo mismo que "Guardar PDF") tiene UNA página, aun
//    con 25 comprobantes (medido el 23/10/2026: una hoja A4 entra ~30).
//  - Sin scroll horizontal y sin errores de JS.
// 31/10/2026 (rama ci-prueba/orden-pago-a4): la hoja A4 de dos columnas
// ("Con qué se pagó" / "Facturas que cancela"); lo nuevo lo mide
// e2e/117-orden-pago-a4.spec.js.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
test.describe.configure({ timeout: 90000 });

const sinScrollHorizontal = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

const factura = (i, aplicado) => ({ tipo: 'Factura A', numero: `0003-${String(1200 + i).padStart(8, '0')}`, fecha: `2026-09-${String(1 + (i % 28)).padStart(2, '0')}`, importe: 400000, aplicado, saldo_actual: 400000 - aplicado });
const ORDEN = {
  id: 'op-1', numero: 1, numero_texto: 'N-OP-00001', fecha: '2026-10-15', total: 650000.5,
  observaciones: 'Entregado en mano', creada_por: 'Usuario Maqueta',
  emisor: { empresa: 'Cucuruchos Nuss', razon_social: 'PAZ MIRTA', cuit: '20924106795', domicilio: 'Unión 843, Córdoba', logo_url: 'logo-cucuruchos-nuss.png' },
  proveedor: { razon_social: 'ANATOLIA SRL', cuit: '30712345678', direccion: 'Ruta 9 km 5' },
  facturas: [
    { tipo: 'Factura A', numero: '0003-00001201', fecha: '2026-08-20', importe: 250000, aplicado: 250000, saldo_actual: 0 },
    { tipo: 'Factura A', numero: '0003-00001245', fecha: '2026-09-05', importe: 400000, aplicado: 150000, saldo_actual: 250000 },
  ],
  cheques: [{ banco: 'BANCO MACRO', numero: '55443322', fecha_pago: '2026-10-10', librador: [{ nombre: 'Heladería Sol', cuit: '30699999999' }], es_echeq: true, importe: 120000, de_empresa: 'Dolce Pasta', otra_empresa: true }],
  otros_medios: [{ medio: 'transferencia', cuenta: 'Banco Galicia · mía', importe: 530000.5 }],
  a_favor: 250000.5,
};

async function abrirOrden(page, orden = ORDEN) {
  await page.clock.setFixedTime(new Date('2026-10-15T10:30:00-03:00'));
  await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?maqueta=cc-cheques`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async ({ orden }) => {
    const datos = await fetch('/maqueta/datos/cc-cheques.json').then(r => r.json());
    const ordenes = [{ id: 'op-1', unidad_negocio_id: 'u-n', proveedor_id: 'pv1', numero: 1, fecha: '2026-10-15', total: orden.total, creada_en: '2026-10-15T12:00:00Z' }];
    // El pago de esa orden, en la cuenta (30/10/2026: la orden va en su renglón).
    const gastos = [{ id: 'g-op-1', orden_pago_id: 'op-1', medio_pago: 'transferencia', descripcion: 'Pago a proveedor' }];
    const movimientos = [...datos.tablas.v_cuenta_corriente_movimientos, { proveedor_id: 'pv1', unidad_negocio_id: 'u-n', moneda: 'ARS', fecha: '2026-10-15', tipo: 'pago', monto: -orden.total,
      factura_pendiente_id: null, gasto_id: 'g-op-1', credito_id: null, referencia: 'Pago a proveedor', saldo_acumulado: 0, orden_desempate: 9 }];
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({ tablas: { ordenes_pago: ordenes, gastos, v_cuenta_corriente_movimientos: movimientos }, rpc: { datos_orden_pago: orden } }));
    localStorage.setItem('barraUnidad.elegida', 'u-n');
  }, { orden });
  await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?proveedor=pv1&unidad=u-n`);
  await page.locator('#lista-movimientos-ficha [data-reimprimir-orden="op-1"]').click();
  await expect(page.locator('#modal-orden-pago')).toBeVisible();
  await expect(page.locator('#orden-pago-hoja .op-cab')).toHaveCount(1);
}

for (const [nombre, ancho, alto] of [['1280', 1280, 900], ['390', 390, 844], ['360', 360, 780], ['tablet', 768, 1024]]) {
  test(`${nombre}: una sola hoja, en la pantalla y al imprimir`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirOrden(page);
    const hoja = page.locator('#orden-pago-hoja');

    // Una sola hoja: sin rótulo de copia ni aviso de dos hojas.
    await expect(hoja).toBeVisible();
    await expect(hoja.locator('.op-copia')).toHaveCount(0);
    await expect(page.locator('#nota-copias-orden')).toHaveCount(0);
    await expect(hoja.locator('.op-cab__titulo')).toHaveText(/^\s*ORDEN DE PAGO\s*N-OP-00001\s*Fecha 15\/10\/2026\s*$/);
    expect(await hoja.textContent(), 'sin ORIGINAL ni DUPLICADO').not.toMatch(/ORIGINAL|DUPLICADO/);

    // Los cheques sin librador.
    const cheques = hoja.locator('.op-bloque--cheques table');
    expect(await cheques.locator('th').allTextContents()).toEqual(['Banco', 'Número', 'Fecha de pago', 'Importe']);
    expect(await cheques.locator('tbody td').allTextContents()).toEqual(['BANCO MACRO eCheq', '55443322', '10/10/2026', '$ 120.000,00']);
    const texto = await hoja.textContent();
    expect(texto, 'sin el librador').not.toContain('Heladería Sol');
    expect(texto, 'sin la palabra Librador').not.toContain('Librador');

    // Los comprobantes pagados, listados (no "Pago a cuenta").
    const comprobantes = hoja.locator('.op-columna--facturas');
    await expect(comprobantes).not.toContainText('Pago a cuenta');
    const filas = comprobantes.locator('tbody tr');
    await expect(filas).toHaveCount(2);
    expect(await filas.nth(0).locator('td').allTextContents()).toEqual(['Factura A 0003-00001201', '20/08/2026', '$ 250.000,00', '$ 250.000,00', '$ 0,00']);
    expect(await filas.nth(1).locator('td').allTextContents()).toEqual(['Factura A 0003-00001245', '05/09/2026', '$ 400.000,00', '$ 150.000,00', '$ 250.000,00']);

    // Abajo de todo, UNA línea con el saldo de la cuenta (v_saldo_proveedor de
    // la maqueta: ANATOLIA en Nuss debe $ 650.000).
    await expect(hoja.locator('.op-saldo-cuenta')).toHaveCount(1);
    await expect(hoja.locator('.op-saldo-cuenta')).toHaveText(/Saldo de la cuenta:\s*\$ 650\.000,00\s*le debemos/);

    // Más compacta: la letra de la tabla, 7.5pt = 10px (la de facturas, desde
    // el 31/10/2026, un punto menos: lleva tres importes).
    expect(await cheques.evaluate(t => getComputedStyle(t).fontSize)).toBe('10px');
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `orden-pago-hoja-pantalla-${nombre}`, info);

    // Al imprimir: la misma hoja, una sola, con las firmas.
    await page.evaluate(() => document.documentElement.classList.add('op-imprimiendo'));
    await page.emulateMedia({ media: 'print' });
    await expect(hoja).toBeVisible();
    await expect(hoja.locator('.op-cab')).toHaveCount(1);
    await expect(page.locator('#btn-imprimir-orden')).toBeHidden();
    await expect(hoja.locator('.op-firma')).toHaveText(['Recibí conforme (proveedor) — firma y aclaración', 'Autorizó']);
    await expect(hoja.locator('.op-firma').first()).toBeVisible();
    expect(await page.locator('#vista-ficha').isVisible(), 'la ficha no se imprime').toBe(false);
    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(() => document.documentElement.classList.remove('op-imprimiendo'));
    await page.locator('#btn-cerrar-orden').click();
    await expect(page.locator('#modal-orden-pago')).toBeHidden();
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

// Lo mismo que "Guardar PDF": el PDF de Chromium con la hoja A4 de la página.
async function paginasDelPdf(page) {
  await page.evaluate(() => document.documentElement.classList.add('op-imprimiendo'));
  await page.emulateMedia({ media: 'print' });
  const pdf = (await page.pdf({ preferCSSPageSize: true, printBackground: true })).toString('latin1');
  await page.emulateMedia({ media: 'screen' });
  return (pdf.match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
}

test('el PDF: UNA página, también con 25 comprobantes', async ({ page }, info) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await abrirOrden(page);
  expect(await paginasDelPdf(page), 'la orden de siempre: una hoja').toBe(1);

  const muchas = Array.from({ length: 25 }, (_, i) => factura(i, 10000));
  await abrirOrden(page, { ...ORDEN, facturas: muchas });
  await expect(page.locator('#orden-pago-hoja tbody tr')).toHaveCount(25 + 1 + 1);
  expect(await paginasDelPdf(page), '25 comprobantes: entran en UNA hoja').toBe(1);
  // La hoja impresa, para mirarla: lo que sale en papel, a lo alto.
  await page.evaluate(() => document.documentElement.classList.add('op-imprimiendo'));
  await page.emulateMedia({ media: 'print' });
  await page.setViewportSize({ width: 794, height: 1123 });
  await captura(page, 'orden-pago-hoja-impresa-25', info);
  await page.emulateMedia({ media: 'screen' });
  expect(errores, errores.join('\n')).toEqual([]);
});
