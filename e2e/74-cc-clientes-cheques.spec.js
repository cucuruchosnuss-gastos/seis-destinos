// Cuentas corrientes con dos pestañas y los cheques en un pago (05/10/2026,
// rama ci-prueba/cc-proveedores-clientes-cheques). En la maqueta
// (cc-cheques), sin credenciales, a 390 y 1280 px:
//  - "Clientes" abre Administración → Clientes ADENTRO, sin su encabezado ni
//    sus barras, y sigue a la barra de fábricas de afuera.
//  - "Registrar pago" con cheques de la cartera: la suma de los tildados es
//    el monto y se llama a pagar_proveedor_con_cheques_cartera (sin cuenta de
//    caja).
//  - Tres medios (Efectivo, Transferencia / QR y Cheques de la cartera), sin
//    huecos en la grilla. El "Cheque / e-cheque propio" y la pestaña
//    "Emitidos" de Cheques se SACARON el 11/10/2026: la empresa no emite
//    cheques propios.
//  - En la cartera, el cheque usado en un pago tiene "Ver el pago".
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

for (const [ancho, alto] of [[390, 844], [1280, 900]]) {
  test(`${ancho} px: la pestaña Clientes es Administración → Clientes adentro`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?maqueta=cc-cheques`);
    await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
    await page.reload();
    await expect(page.locator('#cc-primer')).toBeVisible();
    await page.locator('[data-cc-seccion="clientes"]').click();
    await expect(page).toHaveURL(/\?pestana=clientes$/);
    const marco = page.frameLocator('#cc-clientes-marco');
    await expect(marco.locator('#ad-vista-clientes')).toBeVisible();
    await expect(marco.locator('#ad-clientes-lista, #ad-vista-clientes').first()).toContainText('Distribuidora Anatolia');
    await expect(marco.locator('.ad-header')).toBeHidden();
    await expect(marco.locator('.barra-arriba')).toHaveCount(0);
    await expect(marco.locator('.barra-lateral')).toHaveCount(0);
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    // La barra de fábricas de AFUERA manda adentro.
    const chipDolce = page.locator('.barra-arriba [data-unidad="u-d"]');
    if (await chipDolce.isVisible()) {
      await chipDolce.click();
      await expect(marco.locator('#ad-vista-clientes')).toContainText('DIST. ANAT. SRL');
    }
    await captura(page, `cc-clientes-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${ancho} px: tres medios y pagar con cheques de la cartera`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?maqueta=cc-cheques`);
    await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
    await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?proveedor=pv1&unidad=u-n`);
    await page.locator('#btn-registrar-pago').click();
    await expect(page.locator('#modal-pago')).toBeVisible();

    // Desde el 20/10/2026: Efectivo, Transferencia y QR en una fila (sin el
    // cheque propio, 11/10/2026) y "Cheques de la cartera" como botón propio a
    // todo el ancho, que abre la lista.
    const medios = page.locator('#grilla-medio-pago-cc [data-valor]');
    await expect(medios).toHaveCount(3);
    expect(await medios.evaluateAll(bs => bs.map(b => b.dataset.valor))).toEqual(['efectivo', 'transferencia', 'qr']);
    await expect(page.locator('[data-valor="propio"]')).toHaveCount(0);
    await expect(page.locator('#grupo-propio-pago')).toHaveCount(0);
    const [bEf, bTr, bQr] = await Promise.all(['efectivo', 'transferencia', 'qr'].map(v => page.locator(`#grilla-medio-pago-cc [data-valor="${v}"]`).boundingBox()))
    expect(Math.abs(bEf.y - bTr.y) < 2 && Math.abs(bTr.y - bQr.y) < 2, 'Efectivo, Transferencia y QR en la misma fila').toBe(true);
    const cartera = page.locator('#btn-medio-cartera');
    await expect(cartera).toBeVisible();
    const [bCa, valores] = await Promise.all([cartera.boundingBox(), page.locator('#grupo-valores-pago').boundingBox()]);
    expect(bCa.width, 'la cartera a todo el ancho del bloque').toBeGreaterThan(valores.width * 0.8);
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `cc-pago-medios-${ancho}`, info);

    // Cheques de la cartera: la suma de los tildados son los valores.
    await cartera.click();
    await expect(cartera).toHaveAttribute('aria-pressed', 'true');
    const casillas = page.locator('[data-cheque-cartera]');
    await expect(casillas).toHaveCount(2);
    await casillas.nth(0).check();
    await casillas.nth(1).check();
    await expect(page.locator('#total-cartera-pago')).toHaveText(/2 cheques tildados · total \$\s537\.300,50/);
    await expect(page.locator('#resumen-aplicacion')).toHaveText(/Valores \$\s537\.300,50/);
    await expect(page.locator('#campo-monto-pago'), 'los cheques no escriben el monto de efectivo / transferencia').toHaveValue('');
    await captura(page, `cc-pago-cartera-${ancho}`, info);
    const confirmar = page.locator('#btn-confirmar-pago');
    await expect(confirmar).toBeInViewport();
    await confirmar.click();
    await expect.poll(() => rpc.find(r => r.nombre === 'pagar_proveedor_mixto')).toBeTruthy();
    const pc = rpc.find(r => r.nombre === 'pagar_proveedor_mixto').params;
    expect(pc.p_cheque_ids.sort()).toEqual(['chq-1', 'chq-2']);
    expect(pc, 'no mueve caja: sin resto ni cuenta').toMatchObject({ p_monto_resto: 0, p_medio_resto: null, p_cuenta_resto: null });
    expect(rpc.some(r => r.nombre === 'registrar_pago_proveedor' || r.nombre === 'pagar_proveedor_con_cheques_cartera'), 'una sola llamada').toBe(false);

    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${ancho} px: Cheques es solo la cartera, con el link al pago`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/administracion.html?seccion=cheques&maqueta=cc-cheques`);
    await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
    await page.goto(`${MAQUETA}/modulos/administracion.html?seccion=cheques`);
    await expect(page.locator('#chq-vista')).toBeVisible();
    // La cartera: el cheque usado en un pago.
    await page.locator('[data-estado-cheque="todos"]').click();
    const link = page.locator('a.chq-link-pago[href="cuentas-corrientes.html?pago=g-pago-0"]').first();
    await expect(link).toBeAttached();
    // Sin la pestaña "Emitidos" (11/10/2026): la cartera es la única vista.
    await expect(page.locator('#chq-vistas')).toHaveCount(0);
    await expect(page.locator('[data-chq-vista]')).toHaveCount(0);
    await expect(page.locator('#chq-panel-emitidos')).toHaveCount(0);
    await expect(page.locator(ancho < 900 ? '#chq-lista' : '#chq-tabla')).toBeVisible();
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `cheques-cartera-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
