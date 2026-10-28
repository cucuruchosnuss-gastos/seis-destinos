// CONOS DE PAPEL (10/10/2026). En la maqueta (Supabase falso, sin
// credenciales), a 1280 y 390 px:
//  - Por pedir: los botones ×1 ×½ ×4 SUMAN y lo que se anota viaja con esa
//    cantidad a anotar_cono_pendiente; la lista dice "Obra blanco: 190.000 anotados";
//  - el pliego en armado: no deja asignar más que el total (lo dice pegado);
//    "Confirmar pedido" muestra precio, subtotal, IVA y total;
//  - un pliego confirmado (pedido) abre el detalle, sin campos para editar, y
//    solo con "Modificar pedido" se puede volver a armar;
//  - recibir parcial viaja con la cantidad de cada cono;
//  - corregir lo recibido viaja con +/- y motivo;
//  - la O.C. del 321: $ 2.160.000 + 21 % = $ 2.613.600, los logos nuevos en rojo;
//  - Mauricio (ver + recibir): solo Stock y Pendientes de entrega, sin ningún precio;
//  - ninguna pantalla con scroll de costado ni errores de JavaScript.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const URL = (datos, extra = '') => `${MAQUETA}/modulos/conos.html?maqueta=${datos}${extra}`;

function anotarRpc(page) {
  const llamadas = [];
  page.on('console', async (msg) => {
    const args = msg.args();
    if (args.length < 3) return;
    const a = await args[0].jsonValue().catch(() => null);
    if (a !== '[maqueta] rpc') return;
    llamadas.push({ nombre: await args[1].jsonValue().catch(() => null), params: await args[2].jsonValue().catch(() => null) });
  });
  return llamadas;
}
const llamada = (ll, nombre) => ll.filter(x => x.nombre === nombre).at(-1)?.params;

async function sinCostado(page, ancho) {
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(w, 'scroll de costado').toBeLessThanOrEqual(ancho);
}

for (const ancho of [1280, 390]) {
  const alto = ancho === 390 ? 844 : 900;

  test(`Por pedir: los botones suman y se anota, a ${ancho}`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    const ll = anotarRpc(page);
    await page.goto(URL('conos'));
    await expect(page.locator('#cn-tabs [data-vista]').first()).toHaveText('Por pedir');
    await expect(page.locator('#cn-pendientes')).toContainText('Obra blanco: 190.000 anotados');
    await page.fill('#cn-anotar-buscar', 'case');
    await page.locator('[data-anotar-cono]', { hasText: 'CASERATO' }).click();
    await expect(page.locator('#cn-anotar-elegido')).toContainText('CASERATO');
    await page.locator('[data-sumar-anotar="10000"]').click();
    await page.locator('[data-sumar-anotar="5000"]').click();
    await page.locator('[data-sumar-anotar="40000"]').click();
    await expect(page.locator('#cn-anotar-cantidad')).toHaveValue('55.000');
    await page.locator('#cn-btn-anotar').click();
    await expect.poll(() => llamada(ll, 'anotar_cono_pendiente')?.p_cantidad).toBe(55000);
    expect(llamada(ll, 'anotar_cono_pendiente').p_papel).toBe('obra');
    await sinCostado(page, ancho);
    expect(errores).toEqual([]);
  });

  test(`Iniciar pedido con lo anotado abre el pliego, a ${ancho}`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: alto });
    const ll = anotarRpc(page);
    await page.goto(URL('conos'));
    await page.locator('[data-iniciar="obra"]').click();
    await page.locator('#cn-modal [data-tam="240000"]').click();
    await page.locator('#cn-modal-ok').click();
    await expect.poll(() => llamada(ll, 'crear_pliego_desde_pendientes')?.p_cantidad_total).toBe(240000);
    await expect(page.locator('#cn-vista-armado')).toBeVisible();
    await expect(page.locator('#cn-asignado')).toHaveText('Asignado 30.000 de 240.000 · faltan 210.000');
  });

  test(`Pliego en armado: no se asigna más del total y confirmar muestra las cuentas, a ${ancho}`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    const ll = anotarRpc(page);
    await page.goto(URL('conos', '&pliego=pl-322'));
    await expect(page.locator('#cn-asignado')).toHaveText('Asignado 30.000 de 240.000 · faltan 210.000');
    await expect(page.locator('.cn-item--logo')).toContainText('DIPALE');
    await page.locator('#cn-arm-agregar-abrir').click();
    await page.fill('#cn-agr-buscar', 'aspen');
    await page.locator('[data-agregar-cono]', { hasText: 'ASPEN' }).click();
    await page.fill('#cn-agr-cantidad', '215000');
    await page.locator('#cn-agr-confirmar').click();
    await expect(page.locator('#cn-agr-error')).toHaveText('No entra: quedan 210.000 por asignar en este pliego.');
    expect(llamada(ll, 'poner_cono_pliego')).toBeUndefined();
    await page.fill('#cn-agr-cantidad', '');
    await page.locator('[data-sumar-agregar="10000"]').click();
    await page.locator('[data-sumar-agregar="5000"]').click();
    await expect(page.locator('#cn-agr-cantidad')).toHaveValue('15.000');
    await page.locator('#cn-agr-confirmar').click();
    await expect.poll(() => llamada(ll, 'poner_cono_pliego')?.p_cantidad).toBe(15000);
    await page.locator('#cn-arm-confirmar').click();
    const cuentas = page.locator('#cn-cuentas');
    await expect(cuentas).toContainText('$ 9,000');
    await expect(cuentas).toContainText('$ 270.000,00');
    await expect(cuentas).toContainText('$ 56.700,00');
    await expect(cuentas).toContainText('$ 326.700,00');
    await expect(page.locator('#cn-modal')).toContainText('Faltan asignar 210.000');
    await sinCostado(page, ancho);
    expect(errores).toEqual([]);
  });

  test(`"Asignado X de Y" queda fijo arriba al bajar por una lista larga, a ${ancho}`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto(URL('conos', '&pliego=pl-322'));
    await expect(page.locator('#cn-asignado')).toBeVisible();
    // Un pliego con muchos conos: se alarga la lista debajo del contador.
    await page.evaluate(() => { const d = document.createElement('div'); d.style.height = '2000px'; document.getElementById('cn-asignado').after(d); });
    await page.mouse.wheel(0, 1500);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
    const top = await page.evaluate(() => document.getElementById('cn-asignado').getBoundingClientRect().top);
    expect(top, 'el contador se fue de la pantalla').toBeGreaterThanOrEqual(0);
    expect(top).toBeLessThan(120);
  });

  test(`Pedido: no se edita; Modificar, Recibir parcial y Corregir, a ${ancho}`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: alto });
    const ll = anotarRpc(page);
    await page.goto(URL('conos', '&pliego=pl-323'));
    await expect(page.locator('#cn-vista-detalle')).toBeVisible();
    await expect(page.locator('#cn-detalle')).toContainText('N° 323 · v2');
    expect(await page.locator('#cn-detalle input, #cn-detalle select, [data-quitar-item], #cn-arm-agregar-abrir').count()).toBe(0);
    await expect(page.locator('[data-modificar]')).toBeVisible();
    await expect(page.locator('#cn-historial')).toContainText('Faltaba el RIO');

    await page.locator('[data-recibir]').click();
    await page.locator('#cn-modal [data-rec-modo="parte"]').click();
    const quintana = page.locator('#cn-modal label', { hasText: 'QUINTANA' });
    await page.fill(`#${await quintana.getAttribute('for')}`, '30000');
    await page.locator('#cn-modal-ok').click();
    await expect.poll(() => JSON.stringify(llamada(ll, 'recibir_pliego')?.p_items)).toContain('"cantidad":30000');
    expect(llamada(ll, 'recibir_pliego').p_items.length).toBe(1);

    await page.goto(URL('conos', '&pliego=pl-321'));
    await page.locator('[data-corregir]').click();
    const aspen = page.locator('#cn-modal label', { hasText: 'ASPEN' });
    await page.fill(`#${await aspen.getAttribute('for')}`, '-2000');
    await page.locator('#cn-modal-ok').click();
    await expect(page.locator('#cn-modal-error')).toHaveText('El motivo es obligatorio.');
    await page.fill('#cn-cor-motivo', 'Vinieron menos');
    await page.locator('#cn-modal-ok').click();
    await expect.poll(() => llamada(ll, 'corregir_recepcion_pliego')?.p_motivo).toBe('Vinieron menos');
    expect(llamada(ll, 'corregir_recepcion_pliego').p_cambios[0].cantidad).toBe(-2000);
  });

  test(`La orden de compra del 321, a ${ancho}`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    await page.goto(URL('conos', '&pliego=pl-321'));
    await page.locator('[data-ver-oc]').click();
    const hoja = page.locator('#cn-oc-hoja');
    await expect(hoja).toContainText('ORDEN DE COMPRA');
    await expect(hoja).toContainText('$2.613.600,00');
    await expect(hoja).toContainText('2.160.000,00');
    await expect(hoja).toContainText('453.600,00');
    await expect(hoja.locator('tr.oc-logo')).toHaveCount(2);
    const rojo = await hoja.locator('tr.oc-logo td').nth(1).evaluate(el => getComputedStyle(el).color);
    expect(rojo).toBe('rgb(208, 0, 0)');
    await expect(page.locator('#cn-oc-whatsapp')).toBeVisible();
    await expect(page.locator('#cn-oc-pdf')).toBeVisible();
    await expect(page.locator('#cn-oc-imprimir')).toBeVisible();
    expect(errores).toEqual([]);
  });

  test(`Mauricio (ver + recibir): Stock y Pendientes de entrega, sin precios, a ${ancho}`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    await page.goto(URL('conos-mauricio'));
    await expect(page.locator('#cn-tabs [data-vista]')).toHaveText(['Stock', 'Pendientes de entrega', 'Todos los conos']);
    // Por ahora (21/10/2026) los negativos no se muestran: FIBRO no se avisa.
    await expect(page.locator('#cn-stock-alertas')).toContainText('CASERATO');
    await expect(page.locator('#cn-stock-alertas')).not.toContainText('Stock negativo');
    await expect(page.locator('#cn-stock-alertas')).not.toContainText('FIBRO');
    expect(await page.locator('[data-conteo], [data-ajuste]').count()).toBe(0);
    await page.locator('[data-vista="entregas"]').click();
    await expect(page.locator('#cn-pliegos-lista')).toContainText('N° 323');
    await expect(page.locator('#cn-pliegos-lista [data-recibir]')).toBeVisible();
    await page.locator('#cn-pliegos-lista [data-pliego]').first().click();
    const detalle = await page.locator('#cn-detalle').innerText();
    expect(detalle).not.toMatch(/\$|Precio|Modificar|Anular|ORDEN DE COMPRA/);
    await expect(page.locator('#cn-detalle [data-recibir]')).toBeVisible();
    await sinCostado(page, ancho);
    expect(errores).toEqual([]);
  });

  test(`Precios del papel, a ${ancho}`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: alto });
    const ll = anotarRpc(page);
    await page.goto(URL('conos', '&vista=precios'));
    await expect(page.locator('[data-precio-celda="obra-240000"]')).toContainText('$ 9,000');
    await expect(page.locator('[data-precio-celda="obra-120000"]')).toContainText('sin cargar');
    await page.locator('[data-cargar-precio="obra"][data-precio-cant="120000"]').click();
    await page.fill('#cn-pr-precio', '9,5');
    await page.locator('#cn-modal-ok').click();
    await expect.poll(() => llamada(ll, 'guardar_precio_cono_papel')?.p_precio_unitario).toBe(9.5);
    expect(llamada(ll, 'guardar_precio_cono_papel').p_cantidad).toBe(120000);
    await sinCostado(page, ancho);
  });
}
