// LA CUENTA DEL PROVEEDOR EN UNA SOLA LISTA (30/10/2026, rama
// ci-prueba/cc-proveedor-una-lista). En la maqueta (cc-proveedor-una-lista),
// sin credenciales, a 390 y 1280 px, la ficha de ANATOLIA SRL en Nuss:
//  - una sola lista por fecha: facturas y la nota de débito suman (en tinta),
//    los pagos (también el SIN aplicar) y el saldo a favor del corte restan
//    (en verde), con el saldo corrido en cada renglón;
//  - el filtro "Pagos" muestra también el pago sin aplicar;
//  - no está el recuadro "Órdenes de pago (N)": el pago con orden dice
//    "Orden de pago N-OP-00005" y "Reimprimir" abre la orden;
//  - la orden de pago sale en UNA hoja (también el PDF) con una sola línea
//    de saldo: "Saldo de la cuenta con ANATOLIA SRL (a pagar) $ 360.000,00".
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
test.describe.configure({ timeout: 90000 });

const sinScrollHorizontal = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

async function abrir(page) {
  await page.clock.setFixedTime(new Date('2026-10-30T10:30:00-03:00'));
  await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?maqueta=cc-proveedor-una-lista`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.setItem('barraUnidad.elegida', 'u-n'); sessionStorage.removeItem('maqueta.cambios'); });
  await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?proveedor=pv1&unidad=u-n`);
}
const filas = (page) => page.locator('#lista-movimientos-ficha .fila-movimiento');

async function paginasDelPdf(page) {
  await page.evaluate(() => document.documentElement.classList.add('op-imprimiendo'));
  await page.emulateMedia({ media: 'print' });
  const pdf = (await page.pdf({ preferCSSPageSize: true, printBackground: true })).toString('latin1');
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => document.documentElement.classList.remove('op-imprimiendo'));
  return (pdf.match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
}

for (const [ancho, alto] of [[390, 844], [1280, 900]]) {
  test(`${ancho} px: una sola lista, la orden en el renglón del pago y la orden en una hoja`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page);
    await expect(filas(page)).toHaveCount(6);
    // Mezclados por fecha, el más nuevo arriba.
    await expect(filas(page).locator('.fila-movimiento__tipo')).toHaveText(['Pago', 'Pago', 'Nota de débito', 'Factura', 'Factura', 'Saldo a favor']);
    await expect(filas(page).locator('.fila-movimiento__monto')).toHaveText(['−$ 50.000,00', '−$ 250.000,00', '+$ 30.000,00', '+$ 400.000,00', '+$ 250.000,00', '−$ 20.000,00']);
    // El saldo corrido en cada renglón.
    await expect(filas(page).locator('.fila-movimiento__saldo')).toHaveText(['Saldo debe $ 360.000,00', 'Saldo debe $ 410.000,00', 'Saldo debe $ 660.000,00', 'Saldo debe $ 630.000,00', 'Saldo debe $ 230.000,00', 'Saldo a favor $ 20.000,00']);
    // Lo que resta en un color y lo que suma en otro.
    const color = (i) => filas(page).nth(i).locator('.fila-movimiento__monto').evaluate(e => getComputedStyle(e).color);
    const [cPago, cSinAplicar, cNd, cFactura, cCorte] = [await color(1), await color(0), await color(2), await color(3), await color(5)];
    expect(cPago, 'el pago sin aplicar resta como cualquier pago').toBe(cSinAplicar);
    expect(cCorte, 'el saldo a favor también').toBe(cPago);
    expect(cNd, 'la nota de débito suma como una factura').toBe(cFactura);
    expect(cPago, 'lo que resta en otro color que lo que suma').not.toBe(cFactura);
    // No está el recuadro de abajo; la orden va en su pago.
    await expect(page.locator('#ficha-ordenes-pago')).toHaveCount(0);
    await expect(page.getByText(/Órdenes de pago \(/)).toHaveCount(0);
    await expect(filas(page).nth(1).locator('.fila-movimiento__orden')).toHaveText('Orden de pago N-OP-00005');
    await expect(filas(page).nth(0).locator('.fila-movimiento__orden')).toHaveCount(0);
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `cc-una-lista-${ancho}`, info);

    // El filtro "Pagos": también el sin aplicar.
    await page.locator('#grilla-tipo-mov-ficha [data-tipo="pago"]').click();
    await expect(filas(page)).toHaveCount(3);
    await expect(filas(page).locator('.fila-movimiento__monto')).toHaveText(['−$ 50.000,00', '−$ 250.000,00', '−$ 20.000,00']);
    await page.locator('#grilla-tipo-mov-ficha [data-tipo="todos"]').click();
    await expect(filas(page)).toHaveCount(6);

    // Reimprimir desde el renglón: una hoja con la línea del saldo.
    await filas(page).nth(1).locator('[data-reimprimir-orden="op-5"]').click();
    const hoja = page.locator('#orden-pago-hoja');
    await expect(page.locator('#modal-orden-pago')).toBeVisible();
    await expect(hoja.locator('.op-cab')).toHaveCount(1);
    await expect(hoja).toContainText('N-OP-00005');
    expect(await hoja.textContent(), 'sin ORIGINAL ni DUPLICADO').not.toMatch(/ORIGINAL|DUPLICADO/);
    await expect(page.locator('#nota-copias-orden')).toHaveCount(0);
    await expect(hoja.locator('.op-saldo-cuenta')).toHaveCount(1);
    await expect(hoja.locator('.op-saldo-cuenta')).toHaveText(/^\s*Saldo de la cuenta con ANATOLIA SRL \(a pagar\)\s*\$ 360\.000,00\s*$/);
    expect(await hoja.textContent(), 'nada de aplicado / no aplicado').not.toMatch(/no aplicado|Resumen de cuenta/i);
    await expect(hoja.locator('.op-saldo-cuenta')).toBeVisible();
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal con la orden').toBe(true);
    await captura(page, `cc-una-lista-orden-${ancho}`, info);
    expect(await paginasDelPdf(page), 'la orden de pago: UNA hoja').toBe(1);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
