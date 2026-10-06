// CLIENTE Y PROVEEDOR (06/10/2026, rama ci-prueba/cuenta-unica). En la maqueta
// (cuenta-unica), sin credenciales, a 390 y 1280 px:
//  - Administración → la cuenta de Distribuidora Anatolia (cliente y
//    proveedor): arriba "Le debés $ 524.000,00", la lista con chips, el filtro
//    por etiqueta y "Compensar", que sugiere el MENOR de los dos saldos, no
//    deja poner más (lo dice y no llama a la base) y manda compensar_cuentas.
//  - La ficha de Kiosco Pepe: Clasificación → "Cliente y proveedor" llama a
//    vincular_cliente_proveedor y avisa que se creó el proveedor; volver a
//    "Cliente" pide confirmar y llama a desvincular_cliente_proveedor.
//  - Cuentas corrientes → la ficha de ANATOLIA SRL en Nuss: la clasificación y
//    la misma cuenta juntas; en las listas, el chip "Cliente y proveedor".
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

async function abrir(page, url) {
  await page.goto(`${MAQUETA}${url}${url.includes('?') ? '&' : '?'}maqueta=cuenta-unica`);
  await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
  await page.goto(`${MAQUETA}${url}`);
}

for (const [ancho, alto] of [[390, 844], [1280, 900]]) {
  test(`${ancho} px: la cuenta de cliente y proveedor, y compensar`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page, '/modulos/administracion.html?seccion=clientes');
    await expect(page.locator('#ad-vista-clientes')).toBeVisible();
    await expect(page.locator('.ad-fila[data-cliente="c1"]')).toContainText('Cliente y proveedor');
    await page.locator('.ad-fila[data-cliente="c1"]').click();
    const unica = page.locator('#ad-cuenta-unica');
    await expect(unica).toBeVisible();
    await expect(unica.locator('.cu-neto__monto').first()).toHaveText('Le debés $ 524.000,00');
    await expect(unica).toContainText('Como cliente te debe $ 126.000,00 · como proveedor le debés $ 650.000,00');
    await expect(unica.locator('.cu-fila')).toHaveCount(5);
    await expect(unica.locator('.cu-chip--compra')).toHaveCount(2);
    await expect(unica.locator('.cu-chip--cobranza')).toHaveText('Cobranza');
    // Su cuenta de cliente sigue abajo.
    await expect(page.locator('#ad-cliente-cuerpo')).toContainText('Deuda de agosto');
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `cuenta-unica-${ancho}`, info);

    // El filtro por etiqueta.
    await unica.locator('[data-cu-filtro]').selectOption('Compra');
    await expect(unica.locator('.cu-fila')).toHaveCount(2);
    await unica.locator('[data-cu-filtro]').selectOption('');
    await expect(unica.locator('.cu-fila')).toHaveCount(5);

    // Compensar: sugiere el menor (126.000).
    await unica.locator('[data-cu-compensar]').click();
    const monto = unica.locator('[data-cu-monto]');
    await expect(monto).toHaveValue('126.000');
    await expect(unica.locator('[data-cu-resumen]')).toContainText('El cliente queda debiendo $ 0,00 · Le debés $ 524.000,00');
    // Más que el menor: lo dice y no llama a la base.
    await monto.fill('200000');
    await expect(unica.locator('[data-cu-resumen]')).toContainText('No se puede compensar más de $ 126.000,00.');
    await unica.locator('[data-cu-confirmar]').click();
    await expect(unica.locator('[data-cu-error]')).toHaveText('No se puede compensar más de $ 126.000,00: es lo menor entre lo que te debe y lo que le debés.');
    expect(rpc.some(r => r.nombre === 'compensar_cuentas'), 'no llamó a la base').toBe(false);
    // Un monto válido: se reparte de la factura más vieja a la más nueva.
    await monto.fill('100000');
    await expect(unica.locator('[data-cu-resumen]')).toContainText('El cliente queda debiendo $ 26.000,00 · Le debés $ 550.000,00');
    await unica.locator('[data-cu-obs]').fill('Acuerdo de octubre');
    await captura(page, `cuenta-unica-compensar-${ancho}`, info);
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal con el panel').toBe(true);
    const confirmar = unica.locator('[data-cu-confirmar]');
    await confirmar.scrollIntoViewIfNeeded();
    await expect(confirmar).toHaveText('Compensar $ 100.000,00');
    await confirmar.click();
    await expect.poll(() => rpc.find(r => r.nombre === 'compensar_cuentas')).toBeTruthy();
    const p = rpc.find(r => r.nombre === 'compensar_cuentas').params;
    expect(p).toMatchObject({ p_cliente_id: 'c1', p_monto: 100000, p_observacion: 'Acuerdo de octubre' });
    expect(p.p_aplicaciones).toEqual([{ factura_pendiente_id: 'fp-1', monto_aplicado: 100000 }]);
    await expect(page.getByText('Compensación registrada')).toBeVisible();
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${ancho} px: la clasificación de la ficha del cliente`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page, '/modulos/administracion.html?seccion=clientes');
    await page.locator('.ad-fila[data-cliente="c2"]').click();
    await page.locator('#ad-btn-ficha').click();
    const clasif = page.locator('#ad-f-clasificacion');
    await expect(clasif.locator('[data-clasificacion="cliente"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(clasif.locator('[data-clasificacion="proveedor"]')).toBeDisabled();
    await clasif.locator('[data-clasificacion="ambos"]').click();
    await expect(page.locator('#ad-f-vincular')).toBeVisible();
    await expect(page.locator('#ad-f-vincular-texto')).toContainText('si no hay, se crea en Cuentas corrientes');
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `clasificacion-cliente-${ancho}`, info);
    // La base "crea" el proveedor: después de vincular, el padrón lo trae.
    await page.evaluate(() => { globalThis.__maquetaTablas.proveedores.push({ id: 'pv-nuevo', razon_social: 'KIOSCO PEPE', estado_alta: 'activo', activo: true }) });
    await page.locator('#ad-f-vincular-confirmar').click();
    await expect.poll(() => rpc.find(r => r.nombre === 'vincular_cliente_proveedor')).toBeTruthy();
    expect(rpc.find(r => r.nombre === 'vincular_cliente_proveedor').params).toEqual({ p_cliente_id: 'c2', p_proveedor_id: null });
    await expect(page.getByText('Se creó el proveedor KIOSCO PEPE en Cuentas corrientes.')).toBeVisible();
    await expect(clasif.locator('[data-clasificacion="ambos"]')).toHaveAttribute('aria-pressed', 'true');
    // Volver a "Cliente": pide confirmar (un panel propio).
    await clasif.locator('[data-clasificacion="cliente"]').click();
    await expect(page.locator('#ad-f-desvincular')).toBeVisible();
    expect(rpc.some(r => r.nombre === 'desvincular_cliente_proveedor')).toBe(false);
    await page.locator('#ad-f-desvincular-confirmar').click();
    await expect.poll(() => rpc.find(r => r.nombre === 'desvincular_cliente_proveedor')).toBeTruthy();
    expect(rpc.find(r => r.nombre === 'desvincular_cliente_proveedor').params).toEqual({ p_cliente_id: 'c2' });
    await expect(clasif.locator('[data-clasificacion="cliente"]')).toHaveAttribute('aria-pressed', 'true');
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${ancho} px: Cuentas corrientes, la ficha del proveedor y el chip`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page, '/modulos/cuentas-corrientes.html');
    // El chip en la lista de trabajo (ANATOLIA en Nuss).
    await expect(page.locator('#lista-proveedores .tarjeta-lista[data-proveedor="pv1"][data-unidad="u-n"]')).toContainText('Cliente y proveedor');
    await expect(page.locator('#lista-proveedores .chip-cliente-proveedor')).toHaveCount(1);
    await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?proveedor=pv1&unidad=u-n`);
    const clasif = page.locator('#ficha-clasificacion');
    await expect(clasif.locator('[data-clasificacion="ambos"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(clasif.locator('[data-clasificacion="cliente"]')).toBeDisabled();
    await expect(clasif).toContainText('También es cliente en Cucuruchos Nuss (Distribuidora Anatolia).');
    const unica = page.locator('#ficha-cuenta-unica');
    await expect(unica.locator('.cu-neto__monto').first()).toHaveText('Le debés $ 524.000,00');
    await expect(unica.locator('[data-cu-compensar]')).toBeVisible();
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    await captura(page, `cc-cuenta-unica-${ancho}`, info);
    // Separar desde el proveedor: pide confirmar.
    await clasif.locator('[data-clasificacion="proveedor"]').click();
    await expect(clasif).toContainText('¿Separar las dos cuentas en Cucuruchos Nuss?');
    await expect(clasif.locator('#btn-desvincular-cliente')).toBeVisible();
    await clasif.locator('#btn-cancelar-vinculo').click();
    await expect(clasif.locator('#btn-desvincular-cliente')).toHaveCount(0);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
