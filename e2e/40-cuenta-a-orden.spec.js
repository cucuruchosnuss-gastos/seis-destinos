// DESDE LA CUENTA DEL CLIENTE, ABRIR LA ORDEN DE RETIRO (14/10/2026, rama
// ci-prueba/cuenta-a-orden). En la maqueta (cuenta-a-orden), sin
// credenciales, a 1280, 390 y 360 px y en la tablet (1000 × 540):
//  - Administración → la cuenta de Distribuidora Anatolia: los renglones con
//    orden (en la cuenta de cliente y proveedor y en la cuenta de cliente) se
//    ven como link (cursor de mano, "Ver la orden ›") y abren la orden ahí
//    mismo, sin recargar.
//  - "← Volver" (arriba a la izquierda) deja la cuenta del mismo cliente con
//    el MISMO filtro ("Venta") y el MISMO scroll; el atrás del navegador hace
//    lo mismo. Sin nada en la pila, la flecha no está.
//  - Lista de órdenes → una orden → "← Volver" = la lista.
//  - La cobranza de la cuenta abre su detalle y vuelve igual.
//  - Sin scroll horizontal y sin errores de JS.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

const sinScrollHorizontal = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const scrollY = (page) => page.evaluate(() => Math.round(window.scrollY));

async function abrir(page, url) {
  await page.goto(`${MAQUETA}${url}${url.includes('?') ? '&' : '?'}maqueta=cuenta-a-orden`);
  await page.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n'));
  await page.goto(`${MAQUETA}${url}`);
}

async function abrirCuenta(page) {
  await abrir(page, '/modulos/administracion.html?seccion=clientes');
  await expect(page.locator('#ad-vista-clientes')).toBeVisible();
  await page.locator('.ad-fila[data-cliente="c1"]').click();
  await expect(page.locator('#ad-cuenta-unica .cu-fila').first()).toBeVisible();
  await expect(page.locator('#ad-cliente-cuerpo [data-orden-retiro]').first()).toBeVisible();
}

for (const [nombre, ancho, alto] of [['1280', 1280, 900], ['390', 390, 844], ['360', 360, 780], ['tablet', 1000, 540]]) {
  test(`${nombre}: de la cuenta a la orden y "← Volver" con el filtro y el scroll`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirCuenta(page);
    const volver = page.locator('#ad-volver');
    const unica = page.locator('#ad-cuenta-unica');
    await expect(volver, 'sin nada en la pila, la flecha no está').toBeHidden();

    // Los renglones con orden se ven como link.
    const venta = unica.locator('.cu-fila--link[data-orden-retiro="o1"]');
    await expect(venta).toHaveCount(1);
    await expect(venta).toContainText('Ver la orden');
    expect(await venta.evaluate(b => getComputedStyle(b).cursor)).toBe('pointer');
    await expect(unica.locator('.cu-fila--link[data-cobranza-id]')).toContainText('Ver la cobranza');
    await expect(unica.locator('.cu-fila:not(.cu-fila--link)').first()).toBeVisible(); // las compras, no
    const deCuenta = page.locator('#ad-cliente-cuerpo button[data-orden-retiro]');
    expect(await deCuenta.count()).toBe(10);
    await expect(deCuenta.first()).toContainText('Ver la orden ›');
    expect(await deCuenta.first().evaluate(b => getComputedStyle(b).cursor)).toBe('pointer');
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal en la cuenta').toBe(true);
    await captura(page, `cuenta-a-orden-cuenta-${nombre}`, info);

    // El filtro "Venta" (dos ventas) y bajar hasta un retiro de la cuenta de cliente.
    await unica.locator('[data-cu-filtro]').selectOption('Venta');
    await expect(unica.locator('.cu-fila')).toHaveCount(2);
    const fila = deCuenta.nth(6);
    await fila.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 37));
    const y = await scrollY(page);
    expect(y, 'la página bajó (si no, el scroll no prueba nada)').toBeGreaterThan(150);
    await fila.click();
    await expect(page.locator('#ad-vista-orden')).toBeVisible();
    await expect(page.locator('#ad-orden-titulo')).toHaveText(/^Orden N-001[23]$/);
    await expect(page.locator('#ad-vista-cliente')).toBeHidden();
    await expect(volver).toBeVisible();
    await expect(volver).toHaveText('← Volver');
    await expect(page.locator('#ad-orden-volver'), '"‹ Órdenes" deja lugar a la flecha').toBeHidden();
    // Arriba a la izquierda del contenido (después de la barra lateral en la compu).
    const caja = await volver.boundingBox();
    const contenido = await page.locator('#ad-vista-orden').boundingBox();
    expect(caja.x, 'la flecha a la izquierda, alineada con el contenido').toBeLessThanOrEqual(contenido.x + 4);
    expect(caja.y, 'la flecha arriba del contenido').toBeLessThan(contenido.y);
    expect(caja.height).toBeGreaterThanOrEqual(44);
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal en la orden').toBe(true);
    await captura(page, `cuenta-a-orden-orden-${nombre}`, info);

    // ← Volver: la cuenta, el mismo filtro y el mismo scroll.
    await volver.click();
    await expect(page.locator('#ad-vista-cliente')).toBeVisible();
    await expect(page.locator('#ad-cliente-titulo')).toHaveText('Distribuidora Anatolia');
    await expect(unica.locator('[data-cu-filtro]')).toHaveValue('Venta');
    await expect(unica.locator('.cu-fila')).toHaveCount(2);
    await expect.poll(() => scrollY(page), { message: 'el mismo scroll' }).toBe(y);
    await expect(volver).toBeHidden();
    await page.waitForTimeout(300); // la relectura en silencio no mueve nada
    expect(await scrollY(page)).toBe(y);
    await expect(unica.locator('[data-cu-filtro]')).toHaveValue('Venta');
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal al volver').toBe(true);
    await captura(page, `cuenta-a-orden-volvio-${nombre}`, info);

    // El atrás del navegador hace lo mismo (ahora desde la cuenta de cliente y proveedor).
    await venta.scrollIntoViewIfNeeded();
    const y2 = await scrollY(page);
    await venta.click();
    await expect(page.locator('#ad-vista-orden')).toBeVisible();
    await expect(page.locator('#ad-orden-titulo')).toHaveText('Orden N-0012');
    await page.goBack();
    await expect(page.locator('#ad-vista-cliente')).toBeVisible();
    await expect(unica.locator('[data-cu-filtro]')).toHaveValue('Venta');
    await expect.poll(() => scrollY(page), { message: 'el mismo scroll con el atrás del navegador' }).toBe(y2);
    await expect(volver).toBeHidden();
    expect(page.url(), 'sigue en Administración').toContain('/modulos/administracion.html');

    // La cobranza: abre su detalle y vuelve igual.
    await unica.locator('[data-cu-filtro]').selectOption('');
    const cob = unica.locator('.cu-fila--link[data-cobranza-id]');
    await cob.click();
    await expect(page.locator('#ad-vista-cobranza')).toBeVisible();
    await expect(volver).toBeVisible();
    await expect(page.locator('#ad-cobranza-volver')).toBeHidden();
    await volver.click();
    await expect(page.locator('#ad-vista-cliente')).toBeVisible();
    await expect(unica.locator('.cu-fila')).toHaveCount(6);

    // Ir a otro lado vacía la pila: de la orden a la pestaña Clientes, sin flecha.
    await deCuenta.first().click();
    await expect(volver).toBeVisible();
    await page.locator('#ad-pestanas [data-pestana="clientes"]').click();
    await expect(page.locator('#ad-vista-clientes')).toBeVisible();
    await expect(volver).toBeHidden();
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`${nombre}: lista de órdenes → orden → "← Volver" = la lista`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrir(page, '/modulos/administracion.html?seccion=ordenes');
    await expect(page.locator('#ad-vista-ordenes')).toBeVisible();
    const volver = page.locator('#ad-volver');
    await expect(page.locator('#ad-ordenes-lista [data-orden="o1"]')).toBeVisible();
    await expect(volver).toBeHidden();
    await page.locator('#ad-filtro-estado').selectOption('confirmada');
    await expect(page.locator('#ad-ordenes-lista [data-orden="o1"]')).toBeVisible();
    await page.locator('#ad-ordenes-lista [data-orden="o1"]').click();
    await expect(page.locator('#ad-vista-orden')).toBeVisible();
    await expect(volver).toBeVisible();
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal en la orden').toBe(true);
    if (ancho >= 1100) {
      // En la compu, con la lista al costado: otra orden de la lista no apila de nuevo.
      await page.locator('#ad-ordenes-lista [data-orden="o12"]').click();
      await expect(page.locator('#ad-orden-titulo')).toHaveText('Orden N-0013');
    }
    await captura(page, `lista-a-orden-${nombre}`, info);
    await volver.click();
    await expect(page.locator('#ad-vista-ordenes')).toBeVisible();
    await expect(page.locator('#ad-vista-orden')).toBeHidden();
    await expect(page.locator('#ad-filtro-estado')).toHaveValue('confirmada');
    await expect(volver).toBeHidden();
    // Y con el atrás del navegador.
    await page.locator('#ad-ordenes-lista [data-orden="o1"]').click();
    await expect(page.locator('#ad-vista-orden')).toBeVisible();
    await page.goBack();
    await expect(page.locator('#ad-vista-ordenes')).toBeVisible();
    await expect(page.locator('#ad-vista-orden')).toBeHidden();
    await expect(volver).toBeHidden();
    expect(await sinScrollHorizontal(page), 'sin scroll horizontal en la lista').toBe(true);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
