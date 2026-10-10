// LA PLANTA NO SE SALE DE COSTADO A 390 PX (09/10/2026).
//
// En un celular (390 px) la planta se salía de costado: la banda de "¿Quién
// sos?" medía 520 px (el reloj y "Ir a Sala de masa"), la cabecera con
// "Máquina 3 · turno nuevo" o "Lote 7033 · Máquina 1" unos 500 px, y Simple /
// Doble + Original / Anterior / Modificar 405 px. Como .pr-app recorta
// (overflow hidden), la barra de scroll no aparecía en document, pero lo de la
// derecha quedaba cortado y al tocar "Modificar" toda la pantalla se corría
// 15 px de costado. El arreglo es CSS debajo de 520 px (bloque "LA PLANTA EN
// UN CELULAR" de modulos/produccion.html); la tablet no cambia (lo mide
// e2e/8-planta-tamanos).
//
// Recorre TODOS los pasos de e2e/pasos-planta.js en la maqueta a 390 × 844
// (una ventana común y un celular emulado) y falla si en algún paso:
//  - la página o el marco de la planta (html, body, .pr-app, #pr-vista, la
//    sección a la vista, la barra) es más ancho que la pantalla, o quedó
//    corrido de costado (scrollLeft > 0);
//  - algo se sale de su recuadro (medirPantalla: el contenido más ancho que
//    su caja);
//  - un campo de texto tiene letra de menos de 16 px (Chrome hace zoom al
//    tocarlo);
//  - (10/10/2026) una pieza de la planta se corta por dentro
//    (medirCortesPlanta: el encargado, el lote, el chip de estado, "Andando",
//    la tarjeta de la Sala de masa, las pestañas). A 360 px lo mide
//    e2e/30-planta-360.spec.js.
// Corre en cada push, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');
const { medirPantalla, medirCostado, medirCortesPlanta, PIEZAS_CELULAR } = require('./medir-pantalla');
const { PASOS_PLANTA } = require('./pasos-planta');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

const MODOS = [
  ['una ventana de 390 px', {}],
  ['un celular de 390 px', { isMobile: true, hasTouch: true, deviceScaleFactor: 3 }],
];

for (const [cual, opciones] of MODOS) {
  test(`la planta no se sale de costado en ${cual}`, async ({ browser }, info) => {
    test.setTimeout(3 * 60 * 1000);
    const contexto = await browser.newContext({
      viewport: { width: 390, height: 844 }, locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires',
      serviceWorkers: 'block', ...opciones,
    });
    const page = await contexto.newPage();
    const errores = vigilarErrores(page);
    const problemas = [];
    await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=produccion`);
    for (const [nombre, fn, medir = true] of PASOS_PLANTA) {
      await test.step(nombre, async () => {
        await fn(page);
        if (!medir) return;
        await page.waitForTimeout(150);
        const c = await page.evaluate(medirCostado);
        const m = await page.evaluate(`(${medirPantalla.toString()})()`);
        await captura(page, `planta-390-${opciones.isMobile ? 'celular' : 'ventana'}-${nombre}`, info);
        if (m.scrollX) problemas.push(`${nombre}: scroll de costado (${m.anchoDoc} en ${m.ancho})`);
        for (const x of c.mal) problemas.push(`${nombre}: ${x}`);
        for (const a of m.afuera) problemas.push(`${nombre}: se sale de su recuadro ${a}`);
        for (const x of c.chicos) problemas.push(`${nombre}: campo ${x}`);
        // (10/10/2026) Lo que se corta por dentro (el encargado de Abrir
        // turno y las pestañas de las máquinas también se cortaban a 390).
        for (const x of await page.evaluate(medirCortesPlanta, PIEZAS_CELULAR)) problemas.push(`${nombre}: ${x}`);
      });
    }
    await contexto.close();
    expect(errores, errores.join('\n')).toEqual([]);
    expect(problemas, `\n${problemas.join('\n')}`).toEqual([]);
  });
}

// El medidor ve lo que se sale aunque el marco lo recorte (overflow hidden):
// así un verde no es "no miré".
test('el medidor de costado ve un marco que recorta algo más ancho', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 300 });
  await page.setContent(`<body style="margin:0;overflow:hidden">
    <div class="pr-app" style="overflow:hidden"><main id="pr-vista"><section><div style="width:520px;white-space:nowrap">una banda de 520 px</div></section></main></div>
    <input style="font-size:14px">
  </body>`);
  const c = await page.evaluate(medirCostado);
  expect(c.mal.some(x => /pr-app mide 520/.test(x)), JSON.stringify(c)).toBe(true);
  expect(c.chicos.length).toBe(1);
  await page.evaluate(() => { document.querySelector('.pr-app').scrollLeft = 15 });
  const c2 = await page.evaluate(medirCostado);
  expect(c2.mal.some(x => /corrido 15 px/.test(x)), JSON.stringify(c2)).toBe(true);
});
