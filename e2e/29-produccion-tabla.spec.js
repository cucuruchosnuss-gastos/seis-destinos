// LA TABLA DE PRODUCCIÓN (09/10/2026): la primera entrada de "Control" en la
// gestión de Producción, en la maqueta, a 390 y a 1280 px. Mira:
//  - el menú la ofrece primera en Control y abre la sección;
//  - las cuatro tarjetas (Ayer, Esta semana, Este mes, Mes pasado), y que
//    tocar una la deja elegida;
//  - con un período elegido con el control de período, la tabla en
//    UNIDADES con su fila y columna de Total y los promedios debajo;
//  - la página NO scrollea de costado: la tabla scrollea ADENTRO de su caja,
//    con la primera columna fija (sticky);
//  - Filas y Columnas se recuerdan al recargar;
//  - un período sin producción lo dice con palabras;
//  - sin errores de JavaScript.
// Corre sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

async function elegirPeriodo(page, desde, hasta) {
  await page.locator('#pr-tabla-desde-periodo').click();
  const panel = page.locator('#pr-tabla-desde-periodo-panel');
  await expect(panel).toBeVisible();
  const elegir = panel.locator('[data-periodo-elegir]');
  if ((await elegir.getAttribute('aria-expanded')) !== 'true') await elegir.click();
  await page.locator('#pr-tabla-desde-periodo-desde').fill(desde);
  await page.locator('#pr-tabla-desde-periodo-hasta').fill(hasta);
  await panel.locator('[data-periodo-aplicar]').click();
  await expect(panel).toBeHidden();
}

// La gestión ABRE en la tabla (09/10/2026): sin tocar nada, la tabla está a
// la vista y los indicadores no.
async function abreEnLaTabla(page) {
  await expect(page.locator('#pr-tabla')).toBeVisible();
  await expect(page.locator('#pr-inicio')).toBeHidden();
}

// En el menú, la tabla es la primera de Control y los indicadores van a
// continuación.
async function revisarMenu(page, angosta) {
  if (angosta) await page.locator('#pr-btn-menu').click();
  await expect(page.locator('#pr-menu-tabla')).toBeVisible();
  const ids = await page.locator('#pr-menu-bloque-control .pg-menu__item').evaluateAll(b => b.map(x => x.id));
  expect(ids.slice(0, 2)).toEqual(['pr-menu-tabla', 'pr-menu-inicio']);
  await expect(page.locator('#pr-menu-tabla')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#pr-menu-inicio')).toContainText('Indicadores');
  // Los indicadores, desde el menú.
  await page.locator('#pr-menu-inicio').click();
  await expect(page.locator('#pr-inicio')).toBeVisible();
  await expect(page.locator('#pr-tabla')).toBeHidden();
  // Y de vuelta a la tabla.
  if (angosta) await page.locator('#pr-btn-menu').click();
  await page.locator('#pr-menu-tabla').click();
  await abreEnLaTabla(page);
}

for (const [nombre, viewport] of [['390', { width: 390, height: 844 }], ['1280', { width: 1280, height: 900 }]]) {
  test(`tabla de producción a ${nombre} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize(viewport);
    await page.goto(MAQUETA + '/modulos/produccion-gestion.html?maqueta=produccion-gestion');
    await page.evaluate(() => { try { localStorage.removeItem('produccion.gestion.tabla') } catch {} });
    await page.reload();
    await abreEnLaTabla(page);
    await revisarMenu(page, nombre === '390');

    const seccion = page.locator('#pr-tabla');
    const tarjetas = seccion.locator('[data-tabla-periodo]');
    await expect(tarjetas).toHaveCount(4);
    await expect(tarjetas.nth(0)).toContainText('Ayer');
    await expect(tarjetas.nth(3)).toContainText('Mes pasado');
    await tarjetas.nth(3).click();
    await expect(tarjetas.nth(3)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#pr-tabla-desde-periodo')).toContainText('Mes pasado');

    // Un período fijo con datos de la maqueta (07/09 al 02/10/2026).
    await elegirPeriodo(page, '2026-09-07', '2026-10-02');
    const tabla = seccion.locator('.pt-tabla');
    await expect(tabla).toBeVisible();
    await expect(tabla.locator('thead')).toContainText('Máquina 1');
    await expect(tabla.locator('thead')).toContainText('Total');
    await expect(tabla.locator('tfoot')).toContainText('Total');
    await expect(seccion.locator('.pt-promedios')).toContainText('Promedio por día con producción');
    await expect(seccion.locator('.pt-promedios')).toContainText('por planilla');
    // Nada de cajas en la tabla.
    await expect(tabla).not.toContainText('caja');

    // Columnas = Día: la tabla se hace ancha (20 días) y Filas pasa a Máquina.
    await page.locator('#pr-tabla-columnas').selectOption('dia');
    await expect(page.locator('#pr-tabla-filas')).toHaveValue('maquina');
    await expect(tabla.locator('tbody th[scope="row"]').first()).toContainText('Máquina 1');
    await captura(page, `produccion-tabla-${nombre}`, info);

    const m = await page.evaluate(() => {
      const caja = document.querySelector('#pr-tabla .pt-scroll');
      const th = document.querySelector('#pr-tabla .pt-tabla tbody th[scope="row"]');
      return {
        scroll: document.documentElement.scrollWidth, ancho: innerWidth,
        cajaAncha: caja.scrollWidth, cajaVisible: caja.clientWidth, cajaDerecha: caja.getBoundingClientRect().right,
        sticky: getComputedStyle(th).position,
      };
    });
    expect(m.scroll, 'la página no scrollea de costado').toBeLessThanOrEqual(m.ancho);
    expect(m.cajaDerecha, 'la caja de la tabla entra en la pantalla').toBeLessThanOrEqual(m.ancho + 1);
    expect(m.cajaAncha, 'la tabla scrollea adentro de su caja').toBeGreaterThan(m.cajaVisible);
    expect(m.sticky, 'la primera columna es fija').toBe('sticky');

    // Corrida la caja hasta el final, la primera columna sigue pegada a la izquierda.
    const pegada = await page.evaluate(() => {
      const caja = document.querySelector('#pr-tabla .pt-scroll');
      caja.scrollLeft = caja.scrollWidth;
      const th = document.querySelector('#pr-tabla .pt-tabla tbody th[scope="row"]');
      return Math.abs(th.getBoundingClientRect().left - caja.getBoundingClientRect().left);
    });
    expect(pegada, 'la primera columna queda pegada al borde de la caja').toBeLessThanOrEqual(2);

    // Filas y Columnas se recuerdan.
    await page.reload();
    await abreEnLaTabla(page);
    await expect(page.locator('#pr-tabla-filas')).toHaveValue('maquina');
    await expect(page.locator('#pr-tabla-columnas')).toHaveValue('dia');

    // Sin producción: con palabras.
    await elegirPeriodo(page, '2099-01-01', '2099-01-31');
    await expect(seccion.locator('#pr-tabla-cuerpo')).toContainText('No hubo producción del 01/01/2099 al 31/01/2099.');
    await expect(seccion.locator('.pt-tabla')).toHaveCount(0);

    expect(errores, 'errores de JavaScript').toEqual([]);
  });

  // Los links del tablero del dashboard: ?vista= abre derecho en esa sección,
  // y se saca de la dirección (recargar vuelve a la tabla).
  test(`?vista= abre otra sección a ${nombre} px`, async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize(viewport);
    await page.goto(MAQUETA + '/modulos/produccion-gestion.html?maqueta=produccion-gestion&vista=indicadores');
    await expect(page.locator('#pr-inicio')).toBeVisible();
    await expect(page.locator('#pr-tabla')).toBeHidden();
    await expect(page.locator('#pr-indicadores')).toContainText('Ahora');
    expect(new URL(page.url()).searchParams.get('vista')).toBeNull();
    expect(new URL(page.url()).searchParams.get('maqueta')).toBe('produccion-gestion');
    await page.reload();
    await abreEnLaTabla(page);
    await page.goto(MAQUETA + '/modulos/produccion-gestion.html?maqueta=produccion-gestion&vista=pendientes');
    await expect(page.locator('#pr-historial')).toBeVisible();
    // El filtro de estado del historial es un segmentado desde planillas-cerradas (08/10/2026).
    await expect(page.locator('#pr-historial-estados [data-historial-estado="pendiente_completar"]')).toHaveAttribute('aria-pressed', 'true');
    expect(errores, 'errores de JavaScript').toEqual([]);
  });
}
