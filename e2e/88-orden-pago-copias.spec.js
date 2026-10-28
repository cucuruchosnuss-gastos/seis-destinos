// LA ORDEN DE PAGO: ORIGINAL Y DUPLICADO, SIN LIBRADOR Y MÁS COMPACTA
// (23/10/2026, rama ci-prueba/orden-pago-duplicado).
// En la maqueta (cc-cheques), sin credenciales, a 1280, 390, 360 y tablet
// (768 × 1024): la orden se reimprime desde la ficha y
//  - en la pantalla se ve UNA hoja (el ORIGINAL) y el aviso "Se imprimen dos
//    hojas iguales…"; los cheques sin "Librador"; los comprobantes pagados
//    listados con número, fecha y aplicado;
//  - al imprimir se ven las DOS copias (ORIGINAL arriba, DUPLICADO después),
//    sin el aviso, cada una con las firmas;
//  - el PDF de Chromium (lo mismo que "Guardar PDF") tiene DOS páginas, aun
//    con 25 comprobantes: cada copia entra en su hoja. Medido el 23/10/2026
//    en la maqueta: una copia entra en una hoja A4 con ~30 comprobantes;
//    antes del cambio, con ~15 (la fila bajó de 27 a 18 px).
//  - Sin scroll horizontal y sin errores de JS.
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
  await page.evaluate(({ orden }) => {
    const ordenes = [{ id: 'op-1', unidad_negocio_id: 'u-n', proveedor_id: 'pv1', numero: 1, fecha: '2026-10-15', total: orden.total, creada_en: '2026-10-15T12:00:00Z' }];
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({ tablas: { ordenes_pago: ordenes }, rpc: { datos_orden_pago: orden } }));
    localStorage.setItem('barraUnidad.elegida', 'u-n');
  }, { orden });
  await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?proveedor=pv1&unidad=u-n`);
  await page.locator('#ficha-ordenes-pago [data-reimprimir-orden="op-1"]').click();
  await expect(page.locator('#modal-orden-pago')).toBeVisible();
  await expect(page.locator('#orden-pago-hoja .op-copia')).toHaveCount(2);
}

for (const [nombre, ancho, alto] of [['1280', 1280, 900], ['390', 390, 844], ['360', 360, 780], ['tablet', 768, 1024]]) {
  test(`${nombre}: en la pantalla una hoja; al imprimir, ORIGINAL y DUPLICADO`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirOrden(page);
    const original = page.locator('#orden-pago-hoja .op-copia--original');
    const duplicado = page.locator('#orden-pago-hoja .op-copia--duplicado');

    // La pantalla: solo el ORIGINAL, con el aviso de las dos hojas.
    await expect(original).toBeVisible();
    await expect(duplicado).toBeHidden();
    await expect(page.locator('#nota-copias-orden')).toBeVisible();
    await expect(page.locator('#nota-copias-orden')).toHaveText('Se imprimen dos hojas iguales: ORIGINAL y DUPLICADO, las dos con las firmas.');
    await expect(original.locator('.op-cab__titulo')).toHaveText(/ORDEN DE PAGO\s*N-OP-00001\s*Fecha 15\/10\/2026\s*ORIGINAL/);

    // Los cheques sin librador.
    const cheques = original.locator('.op-seccion', { hasText: 'Valores entregados' }).locator('table').first();
    expect(await cheques.locator('th').allTextContents()).toEqual(['Banco', 'N°', 'Fecha de pago', 'Importe']);
    expect(await cheques.locator('tbody td').allTextContents()).toEqual(['BANCO MACRO eCheq', '55443322', '10/10/2026', '$ 120.000,00']);
    const texto = await page.locator('#orden-pago-hoja').textContent();
    expect(texto, 'sin el librador').not.toContain('Heladería Sol');
    expect(texto, 'sin la palabra Librador').not.toContain('Librador');

    // Los comprobantes pagados, listados (no "Pago a cuenta").
    const comprobantes = original.locator('.op-seccion', { hasText: 'Se cancelan los siguientes comprobantes' });
    await expect(comprobantes).not.toContainText('Pago a cuenta');
    const filas = comprobantes.locator('tbody tr');
    await expect(filas).toHaveCount(2);
    expect(await filas.nth(0).locator('td').allTextContents()).toEqual(['Factura A', '0003-00001201', '20/08/2026', '$ 250.000,00', '$ 250.000,00', '$ 0,00']);
    expect(await filas.nth(1).locator('td').allTextContents()).toEqual(['Factura A', '0003-00001245', '05/09/2026', '$ 400.000,00', '$ 150.000,00', '$ 250.000,00']);

    // Más compacta: la letra de la tabla, 7.5pt = 10px.
    expect(await comprobantes.locator('table').evaluate(t => getComputedStyle(t).fontSize)).toBe('10px');
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `orden-pago-copias-pantalla-${nombre}`, info);

    // Al imprimir: las dos, en orden, sin el aviso, las dos con las firmas.
    await page.evaluate(() => document.documentElement.classList.add('op-imprimiendo'));
    await page.emulateMedia({ media: 'print' });
    await expect(original).toBeVisible();
    await expect(duplicado).toBeVisible();
    await expect(page.locator('#nota-copias-orden')).toBeHidden();
    await expect(page.locator('#btn-imprimir-orden')).toBeHidden();
    await expect(duplicado.locator('.op-cab__titulo')).toHaveText(/ORDEN DE PAGO\s*N-OP-00001\s*Fecha 15\/10\/2026\s*DUPLICADO/);
    const [yO, yD] = await Promise.all([original.boundingBox(), duplicado.boundingBox()]);
    expect(yD.y, 'el DUPLICADO va después del ORIGINAL').toBeGreaterThan(yO.y + yO.height - 1);
    for (const c of [original, duplicado]) {
      await expect(c.locator('.op-firma')).toHaveText(['Recibí conforme (proveedor) — firma y aclaración', 'Autorizó']);
      await expect(c.locator('.op-firma').first()).toBeVisible();
    }
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

test('el PDF: dos páginas (ORIGINAL y DUPLICADO), también con 25 comprobantes', async ({ page }, info) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await abrirOrden(page);
  expect(await paginasDelPdf(page), 'la orden de siempre: dos hojas').toBe(2);

  const muchas = Array.from({ length: 25 }, (_, i) => factura(i, 10000));
  await abrirOrden(page, { ...ORDEN, facturas: muchas });
  await expect(page.locator('#orden-pago-hoja .op-copia--original tbody tr')).toHaveCount(25 + 1 + 1);
  expect(await paginasDelPdf(page), '25 comprobantes: cada copia entra en UNA hoja').toBe(2);
  // La hoja impresa, para mirarla: lo que sale en papel, a lo alto.
  await page.evaluate(() => document.documentElement.classList.add('op-imprimiendo'));
  await page.emulateMedia({ media: 'print' });
  await page.setViewportSize({ width: 794, height: 1123 });
  await captura(page, 'orden-pago-copias-impresa-25', info);
  await page.emulateMedia({ media: 'screen' });
  expect(errores, errores.join('\n')).toEqual([]);
});
