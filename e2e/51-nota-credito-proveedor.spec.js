// LA NOTA DE CRÉDITO DE UN PROVEEDOR (20/10/2026), en la maqueta (cc-cheques),
// sin credenciales, a 390 y 1280 px. La base TODAVÍA NO TIENE
// registrar_nota_credito_proveedor: acá se simula con 'maqueta.cambios'.
//  - "Cargar nota de crédito" en la ficha abre el modal con las facturas
//    pendientes en pesos de esa fábrica.
//  - "Aplicar a las más viejas" reparte el importe (la más vieja entera, la
//    siguiente en parte) y el pie dice lo que queda a favor.
//  - Un ajuste de stock (devolvió mercadería): el insumo, la cantidad y el lote.
//  - Confirmar manda UNA llamada con los siete parámetros.
//  - Sin la función en la base, lo dice en castellano y no cierra.
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

async function abrirFicha(page, rpcNota) {
  page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(new Date('2026-10-20T10:30:00-03:00'));
  await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?maqueta=cc-cheques`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((rpcNota) => {
    localStorage.setItem('barraUnidad.elegida', 'u-n');
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({
      tablas: { insumos: [
        { id: 'i-har', nombre: 'Harina 000', marca: 'Molino', unidad_medida: 'kg', tipo: 'materia_prima', activo: true },
        { id: 'i-caja', nombre: 'Caja N°1', marca: 'Nuss', unidad_medida: 'un', tipo: 'insumo', activo: true },
      ] },
      rpc: { registrar_nota_credito_proveedor: rpcNota },
    }));
  }, rpcNota);
  await page.goto(`${MAQUETA}/modulos/cuentas-corrientes.html?proveedor=pv1&unidad=u-n`, { waitUntil: 'domcontentloaded' });
  await page.locator('#btn-nota-credito-ficha').click();
  await expect(page.locator('#modal-nota-credito')).toBeVisible();
  await expect(page.locator('#nota-credito-facturas [data-nc-tilde]')).toHaveCount(2);
}

for (const [ancho, alto] of [[390, 844], [1280, 900]]) {
  test(`${ancho} px: cargar una nota de crédito aplicada a las facturas más viejas, con un ajuste de stock`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirFicha(page, { credito_id: 'cr-1', aplicado: 300000, a_favor: 20000 });
    await expect(page.locator('#nota-credito-proveedor')).toContainText('Cucuruchos Nuss');
    await expect(page.locator('#nota-credito-facturas')).toContainText('0003-00001201');
    await expect(page.locator('#nota-credito-facturas')).toContainText('0003-00001245');

    await page.locator('#campo-nota-tipo').selectOption('Nota de crédito A');
    await page.locator('#campo-nota-numero').fill('0001-00004321');
    await page.locator('#campo-nota-importe').fill('320000');
    await expect(page.locator('#campo-nota-importe')).toHaveValue('320.000');
    await page.locator('#btn-nota-viejas').click();
    await expect(page.locator('#nota-credito-totales')).toHaveText('Nota $ 320.000,00 · Aplicado $ 320.000,00 · Queda a favor $ 0,00');
    await expect(page.locator('[data-nc-monto="fp-1"]')).toHaveValue('250.000');
    await expect(page.locator('[data-nc-monto="fp-2"]')).toHaveValue('70.000');
    // Destildar la segunda: queda a favor.
    await page.locator('[data-nc-tilde="fp-2"]').uncheck();
    await expect(page.locator('#nota-credito-totales')).toHaveText('Nota $ 320.000,00 · Aplicado $ 250.000,00 · Queda a favor $ 70.000,00');

    // Devolvió mercadería.
    await page.locator('#btn-nota-ajuste').click();
    await expect(page.locator('#btn-nota-ajuste')).toHaveAttribute('aria-expanded', 'true');
    await page.locator('[data-nc-buscar="0"]').fill('har');
    await page.locator('[data-nc-insumo="0"][data-id="i-har"]').click();
    await page.locator('[data-nc-cantidad="0"]').fill('25');
    await page.locator('[data-nc-lote="0"]').fill('L-77');
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
    const panel = await page.locator('#modal-nota-credito .modal-cc__panel').boundingBox();
    expect(panel.x + panel.width, 'el modal no se sale por la derecha').toBeLessThanOrEqual(ancho + 0.5);
    await captura(page, `nota-credito-${ancho}`, info);

    await page.locator('#btn-confirmar-nota-credito').scrollIntoViewIfNeeded();
    await page.locator('#btn-confirmar-nota-credito').click();
    await expect(page.locator('#modal-nota-credito')).toBeHidden();
    const llamadas = rpc.filter(r => r.nombre === 'registrar_nota_credito_proveedor');
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].params).toEqual({
      p_proveedor_id: 'pv1', p_unidad_negocio_id: 'u-n', p_comprobante: 'Nota de crédito A 0001-00004321', p_fecha: '2026-10-20', p_importe: 320000,
      p_aplicaciones: [{ factura_pendiente_id: 'fp-1', monto_aplicado: 250000 }],
      p_ajustes_stock: [{ insumo_id: 'i-har', lote: 'L-77', cantidad: -25 }],
    });
    expect(errores, 'sin errores de JavaScript').toEqual([]);
  });
}

test('390 px: sin la función en la base, lo dice en castellano y no cierra', async ({ page }, info) => {
  const errores = vigilarErrores(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirFicha(page, 'ERROR:Could not find the function public.registrar_nota_credito_proveedor(p_ajustes_stock, ...) in the schema cache');
  await page.locator('#campo-nota-numero').fill('0001-00004321');
  await page.locator('#campo-nota-importe').fill('1000');
  await page.locator('#btn-confirmar-nota-credito').click();
  await expect(page.locator('#nota-credito-error')).toHaveText('Todavía no se puede cargar: la base no tiene la función registrar_nota_credito_proveedor. Avisale al chat de la base.');
  await expect(page.locator('#modal-nota-credito')).toBeVisible();
  // Lo que falta se dice al tocar, sin llamar a la base.
  await page.locator('#campo-nota-numero').fill('');
  await page.locator('#btn-confirmar-nota-credito').click();
  await expect(page.locator('#nota-credito-error')).toHaveText('Escribí el número de la nota de crédito.');
  await captura(page, 'nota-credito-error-390', info);
  expect(errores.filter(e => !/registrar_nota_credito_proveedor/.test(e)), 'sin errores de JavaScript').toEqual([]);
});
