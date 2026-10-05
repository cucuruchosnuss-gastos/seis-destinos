// Cuentas corrientes con dos pestañas y los cheques en un pago (05/10/2026,
// rama ci-prueba/cc-proveedores-clientes-cheques). En la maqueta
// (cc-cheques), sin credenciales, a 390 y 1280 px:
//  - "Clientes" abre Administración → Clientes ADENTRO, sin su encabezado ni
//    sus barras, y sigue a la barra de fábricas de afuera.
//  - "Registrar pago" con cheques de la cartera: la suma de los tildados es
//    el monto y se llama a pagar_proveedor_con_cheques_cartera (sin cuenta de
//    caja).
//  - Con un cheque propio: "El banco se debita el DD/MM" con la FECHA DE PAGO,
//    y se llama a pagar_proveedor_con_cheque_propio.
//  - Cheques → Emitidos: lo pendiente por cuenta y la lista; en la cartera, el
//    cheque usado en un pago tiene "Ver el pago".
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

  test(`${ancho} px: pagar con cheques de la cartera y con un cheque propio`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?maqueta=cc-cheques`);
    await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
    await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?proveedor=pv1&unidad=u-n`);
    await page.locator('#btn-registrar-pago').click();
    await expect(page.locator('#modal-pago')).toBeVisible();

    // Cheques de la cartera: la suma de los tildados es el monto.
    await page.locator('#grilla-medio-pago-cc [data-valor="cartera"]').click();
    const casillas = page.locator('[data-cheque-cartera]');
    await expect(casillas).toHaveCount(2);
    await casillas.nth(0).check();
    await casillas.nth(1).check();
    await expect(page.locator('#total-cartera-pago')).toHaveText(/2 cheques tildados · total \$\s537\.300,50/);
    await expect(page.locator('#campo-monto-pago')).toHaveValue('537.300,50');
    await captura(page, `cc-pago-cartera-${ancho}`, info);
    const confirmar = page.locator('#btn-confirmar-pago');
    await confirmar.scrollIntoViewIfNeeded();
    await expect(confirmar).toBeInViewport();
    await confirmar.click();
    await expect.poll(() => rpc.find(r => r.nombre === 'pagar_proveedor_con_cheques_cartera')).toBeTruthy();
    const pc = rpc.find(r => r.nombre === 'pagar_proveedor_con_cheques_cartera').params;
    expect(pc.p_cheque_ids.sort()).toEqual(['chq-1', 'chq-2']);
    expect(pc, 'no mueve caja: sin cuenta').not.toHaveProperty('p_cuenta_id');
    expect(rpc.some(r => r.nombre === 'registrar_pago_proveedor')).toBe(false);

    // Cheque propio: el banco se debita el día de pago.
    await page.locator('#btn-registrar-pago').click();
    await page.locator('#grilla-medio-pago-cc [data-valor="propio"]').click();
    await expect(page.locator('#grupo-propio-pago')).toBeVisible();
    await expect(page.locator('#grupo-fecha-pago-cc')).toBeHidden();
    await expect(page.locator('#campo-cuenta-propio option')).toHaveText(['— Seleccioná —', 'Banco Macro · Nuss', 'Banco Nación · Nuss']);
    await page.locator('#campo-cuenta-propio').selectOption('cta-nacion-nuss');
    await page.locator('[data-tipo-propio="echeque"]').click();
    await page.locator('#campo-numero-propio').fill('987');
    await page.locator('#campo-monto-pago').fill('120000');
    const hoy = await page.evaluate(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
    const pago = await page.evaluate((h) => { const d = new Date(h + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 40); return d.toISOString().slice(0, 10); }, hoy);
    await page.locator('#campo-fechapago-propio').fill(pago);
    const [, mm, dd] = pago.split('-');
    await expect(page.locator('#aviso-debito-propio')).toHaveText(`El banco se debita el ${dd}/${mm}.`);
    const fechas = page.locator('.cc-fechas-propio');
    const caja = await fechas.boundingBox();
    for (const id of ['#campo-emision-propio', '#campo-fechapago-propio']) {
      const b = await page.locator(id).boundingBox();
      expect(b.x + b.width, `${id} no se sale de su recuadro`).toBeLessThanOrEqual(caja.x + caja.width + 1);
    }
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `cc-pago-propio-${ancho}`, info);
    await confirmar.scrollIntoViewIfNeeded();
    await confirmar.click();
    await expect.poll(() => rpc.find(r => r.nombre === 'pagar_proveedor_con_cheque_propio')).toBeTruthy();
    const pp = rpc.find(r => r.nombre === 'pagar_proveedor_con_cheque_propio').params;
    expect(pp).toMatchObject({ p_cuenta_id: 'cta-nacion-nuss', p_tipo: 'echeque', p_numero: '987', p_fecha_emision: hoy, p_fecha_pago: pago, p_importe: 120000 });
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${ancho} px: Cheques → Emitidos y el link al pago en la cartera`, async ({ page }, info) => {
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
    // Emitidos.
    await page.locator('[data-chq-vista="emitidos"]').click();
    await expect(page.locator('#chq-panel-emitidos')).toBeVisible();
    await expect(page.locator('#chq-panel-cartera')).toBeHidden();
    const totales = page.locator('#chq-emi-totales');
    await expect(totales).toContainText('Banco Macro · Nuss');
    await expect(totales).toContainText('Banco Nación · Nuss');
    await expect(totales).not.toContainText('Macro · Dolce');
    await expect(page.locator('#chq-emi-lista .chq-emi')).toHaveCount(2);
    await expect(page.locator('#chq-emi-lista')).toContainText('E-cheque N° 987654 · FERPLAST S.R.L.');
    await page.locator('[data-emi-estado="debitado"]').click();
    await expect(page.locator('#chq-emi-lista .chq-emi')).toHaveCount(1);
    await expect(page.locator('#chq-emi-lista')).toContainText('Debitado el 20/09/2026');
    await page.locator('[data-emi-estado="todos"]').click();
    await page.locator('#chq-emi-cuenta').selectOption('cta-nacion-nuss');
    await expect(page.locator('#chq-emi-lista .chq-emi')).toHaveCount(1);
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `cheques-emitidos-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
