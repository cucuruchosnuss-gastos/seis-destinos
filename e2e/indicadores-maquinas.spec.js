// LOS INDICADORES DE LAS MÁQUINAS (04/10/2026): la sección "Máquinas" de la
// gestión de Producción, en la maqueta, a 390 y a 1280 px. Mira:
//  - con un período elegido con el control de período: una tarjeta por
//    máquina con su u/h y la flecha, y los cuatro gráficos dibujados;
//  - todo adentro de la pantalla (sin scroll de costado) y los números de los
//    gráficos a un tamaño que se lee;
//  - tocar una barra muestra la cifra exacta;
//  - Día / Semana / Mes cambia la tendencia;
//  - "¿Cómo se calcula?" se abre y dice lo del calentamiento;
//  - un período sin planillas: un mensaje, y ningún gráfico;
//  - el rendimiento por kilo de harina, en barras contra el promedio.
// Corre sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

async function elegirPeriodo(page, desde, hasta) {
  await page.locator('#pr-mq-desde-periodo').click();
  const panel = page.locator('#pr-mq-desde-periodo-panel');
  await expect(panel).toBeVisible();
  const elegir = panel.locator('[data-periodo-elegir]');
  if ((await elegir.getAttribute('aria-expanded')) !== 'true') await elegir.click();
  await page.locator('#pr-mq-desde-periodo-desde').fill(desde);
  await page.locator('#pr-mq-desde-periodo-hasta').fill(hasta);
  await panel.locator('[data-periodo-aplicar]').click();
  await expect(panel).toBeHidden();
}

for (const [nombre, viewport] of [['390', { width: 390, height: 844 }], ['1280', { width: 1280, height: 900 }]]) {
  test(`indicadores de las máquinas a ${nombre} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    await page.setViewportSize(viewport);
    await page.goto(MAQUETA + '/modulos/produccion-gestion.html?maqueta=produccion-gestion');
    const seccion = page.locator('#pr-maquinas');
    await expect(seccion).toBeVisible();
    await expect(page.locator('#pr-mq-desde-periodo')).toContainText('Período');

    await elegirPeriodo(page, '2026-09-21', '2026-10-02');
    await expect(page.locator('#pr-mq-desde-periodo')).toContainText('Del 21/09 al 02/10/2026');
    await expect(seccion.locator('.mq-tarjeta')).toHaveCount(2);
    await expect(seccion.locator('.mq-tarjeta').first()).toContainText('u/h productiva');
    await expect(seccion.locator('.mq-tarjeta .mq-var').first()).toHaveText(/[▲▼=]/);
    for (const g of ['barras', 'turno', 'dona', 'tendencia']) await expect(seccion.locator(`[data-mq-graf="${g}"] svg.graf`)).toHaveCount(1);
    // El arranque (hasta que empezó a producir) va aparte del cierre, y la
    // parada organizativa tiene su lugar en la dona (05/10/2026).
    await expect(seccion.locator('[data-mq-graf="turno"]')).toContainText('Arranque (hasta que empezó a producir)');
    await expect(seccion.locator('[data-mq-graf="turno"]')).toContainText('Cierre y resto del horario');
    await expect(seccion.locator('[data-mq-graf="dona"]')).toContainText('Parada organizativa');
    await captura(page, `maquinas-${nombre}`, info);

    // Todo adentro de la pantalla, y los números se leen.
    const m = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth, ancho: innerWidth,
      graficosAfuera: [...document.querySelectorAll('#pr-maquinas svg.graf')].filter(s => s.getBoundingClientRect().right > innerWidth + 1).length,
      letraMin: Math.min(...[...document.querySelectorAll('#pr-maquinas .graf-num')].map(t => parseFloat(getComputedStyle(t).fontSize))),
    }));
    expect(m.scroll, 'sin scroll de costado').toBeLessThanOrEqual(m.ancho);
    expect(m.graficosAfuera, 'ningún gráfico se sale de la pantalla').toBe(0);
    expect(m.letraMin, 'los números de los gráficos se leen (11 px o más)').toBeGreaterThanOrEqual(11);

    // Tocar una barra: la cifra exacta.
    const barras = seccion.locator('[data-mq-graf="barras"]');
    await barras.locator('.graf-dato').first().click();
    await expect(barras.locator('.mq-graf__detalle')).toBeVisible();
    await expect(barras.locator('.mq-graf__detalle')).toContainText(/u\/h productiva: [\d.,]+ \([\d.]+ unidades en/);

    // Día / Semana / Mes.
    await seccion.locator('[data-mq-gran="semana"]').click();
    await expect(seccion.locator('[data-mq-graf="tendencia"] .mq-graf__titulo')).toContainText('últimas 12 semanas');
    await expect(seccion.locator('[data-mq-gran="semana"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(seccion.locator('[data-mq-graf="tendencia"] svg.graf')).toHaveCount(1);

    // ¿Cómo se calcula?
    await seccion.locator('.mq-como summary').click();
    await expect(seccion.locator('.mq-como')).toContainText('con el calentamiento incluido');

    // El rendimiento por kilo: barras contra el promedio.
    const rend = page.locator('[data-rend-grupo] svg.graf');
    await expect(rend.first()).toBeVisible();
    await expect(page.locator('[data-rend-grupo] .graf-ref').first()).toHaveCount(1);

    // Sin planillas en el período: un mensaje y ningún gráfico.
    await elegirPeriodo(page, '2099-01-01', '2099-01-31');
    await expect(seccion).toContainText('No hay planillas cerradas entre el 01/01/2099 y el 31/01/2099.');
    await expect(seccion.locator('.mq-tarjeta')).toHaveCount(0);
    await expect(seccion.locator('[data-mq-graf="barras"]')).toHaveCount(0);
    await expect(seccion.locator('[data-mq-graf="dona"]')).toHaveCount(0);

    expect(errores, 'errores de JavaScript').toEqual([]);
  });
}
