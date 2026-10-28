// LA PLANTA A 360 PX: NADA CORTADO POR DENTRO (10/10/2026).
//
// En los celulares más angostos (360 px) la planta no se salía de costado,
// pero cuatro cosas se cortaban POR DENTRO, tapadas por su caja o pisadas por
// lo de al lado, sin ningún scroll que lo delatara: el lote del tablero
// ("Lote 7033" no entraba en la tarjeta), el encargado de Abrir turno ("Fe…"
// al lado de la fecha), "Andando" de Paradas (pisado por "1 parada en el
// turno · Ver") y la tarjeta de la Sala de masa ("Máquina / 2" partido y
// "Turno mañana" saliéndose de su chip). Y las pestañas de las máquinas
// ("M1 · 7033" cortado por los costados, ya a 390). El arreglo es CSS: el
// bloque "LA PLANTA EN UN CELULAR" (debajo de 520 px) y "LA PLANTA A 360 PX"
// (debajo de 380 px) de modulos/produccion.html; la tablet no cambia (lo mide
// e2e/8-planta-tamanos).
//
// Recorre TODOS los pasos de e2e/pasos-planta.js en la maqueta a 360 × 780
// (una ventana común y un celular emulado) y falla si en algún paso:
//  - la página o el marco de la planta se sale de costado (medirCostado);
//  - algo se sale de su recuadro con overflow visible (medirPantalla);
//  - una pieza de la planta se corta por dentro (medirCortesPlanta);
//  - un campo de texto tiene letra de menos de 16 px.
// Corre en cada push, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');
const { medirPantalla, medirCostado, medirCortesPlanta, PIEZAS_CELULAR } = require('./medir-pantalla');
const { PASOS_PLANTA } = require('./pasos-planta');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

const MODOS = [
  ['una ventana de 360 px', {}],
  ['un celular de 360 px', { isMobile: true, hasTouch: true, deviceScaleFactor: 3 }],
];

for (const [cual, opciones] of MODOS) {
  test(`la planta no se corta en ${cual}`, async ({ browser }, info) => {
    test.setTimeout(3 * 60 * 1000);
    const contexto = await browser.newContext({
      viewport: { width: 360, height: 780 }, locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires',
      serviceWorkers: 'block', ...opciones,
    });
    const page = await contexto.newPage();
    const errores = vigilarErrores(page);
    const problemas = [];
    // Que cada pieza se haya visto al menos una vez: un verde no es "no estaba".
    const vistas = new Set();
    await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=produccion`);
    for (const [nombre, fn, medir = true] of PASOS_PLANTA) {
      await test.step(nombre, async () => {
        await fn(page);
        if (!medir) return;
        await page.waitForTimeout(150);
        const c = await page.evaluate(medirCostado);
        const m = await page.evaluate(`(${medirPantalla.toString()})()`);
        const cortes = await page.evaluate(medirCortesPlanta, PIEZAS_CELULAR);
        const aLaVista = await page.evaluate((piezas) => piezas.filter(([, sel]) =>
          [...document.querySelectorAll(sel)].some(el => !el.closest('[hidden]') && el.getBoundingClientRect().width > 0)).map(([cual]) => cual), PIEZAS_CELULAR);
        for (const x of aLaVista) vistas.add(x);
        await captura(page, `planta-360-${opciones.isMobile ? 'celular' : 'ventana'}-${nombre}`, info);
        if (m.scrollX) problemas.push(`${nombre}: scroll de costado (${m.anchoDoc} en ${m.ancho})`);
        for (const x of c.mal) problemas.push(`${nombre}: ${x}`);
        for (const a of m.afuera) problemas.push(`${nombre}: se sale de su recuadro ${a}`);
        for (const x of cortes) problemas.push(`${nombre}: ${x}`);
        for (const x of c.chicos) problemas.push(`${nombre}: campo ${x}`);
      });
    }
    await contexto.close();
    expect(errores, errores.join('\n')).toEqual([]);
    expect([...vistas].sort(), 'cada pieza se miró al menos una vez').toEqual(PIEZAS_CELULAR.map(([cual]) => cual).sort());
    expect(problemas, `\n${problemas.join('\n')}`).toEqual([]);
  });
}

// El medidor de cortes ve lo que una caja tapa o pisa: así un verde no es
// "no miré".
test('el medidor de cortes ve un lote tapado, un nombre con "…", un número tapado por arriba y dos que se pisan', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 400 });
  await page.setContent(`<body style="margin:0">
    <div style="width:80px;overflow:hidden"><div class="pr-maquina__lote" style="display:flex;white-space:nowrap"><span>Lote</span><span style="font-size:40px">7033</span></div></div>
    <span id="pr-abrir-encargado" style="display:block;width:40px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">Federico Silva · vos</span>
    <div class="pr-sala-card" style="height:80px;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end"><span style="font-size:88px;line-height:1">6</span><span>masas</span></div>
    <div class="pr-maquina__chip" style="width:200px">Andando</div>
    <div style="height:60px"><div class="pr-pest" style="height:100px">M1</div></div><div class="pr-pest" style="height:40px">M2</div>
  </body>`);
  const mal = await page.evaluate(medirCortesPlanta, [
    ['lote', '.pr-maquina__lote'], ['encargado', '#pr-abrir-encargado'], ['sala', '.pr-sala-card'], ['chip', '.pr-maquina__chip'],
    ['pestaña', '.pr-pest'],
  ]);
  // Una pieza encima de otra de su misma clase (como las tarjetas de la Sala).
  expect(mal.some(x => /^pestaña «M1» se pisa con «M2»/.test(x)), JSON.stringify(mal)).toBe(true);
  expect(mal.some(x => /^lote/.test(x)), JSON.stringify(mal)).toBe(true);
  expect(mal.some(x => /^encargado.*ancho/.test(x)), JSON.stringify(mal)).toBe(true);
  expect(mal.some(x => /^sala/.test(x)), JSON.stringify(mal)).toBe(true);
  expect(mal.some(x => /^chip/.test(x)), JSON.stringify(mal)).toBe(false);
});
