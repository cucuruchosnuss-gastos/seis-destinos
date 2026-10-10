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
//    tocarlo).
// Corre en cada push, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');
const { medirPantalla } = require('./medir-pantalla');
const { PASOS_PLANTA } = require('./pasos-planta');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

// Lo que tiene que entrar en el ancho de la pantalla: la página y el marco.
function medirCostado() {
  const ancho = document.documentElement.clientWidth
  const marcos = [
    document.documentElement, document.body,
    document.querySelector('.pr-app'), document.getElementById('pr-vista'),
    document.getElementById('pr-barra'),
    ...document.querySelectorAll('#pr-vista > section'),
  ].filter(el => el && !el.hidden && getComputedStyle(el).display !== 'none')
  const nombre = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : '')
  const mal = []
  for (const el of marcos) {
    if (el.scrollWidth > el.clientWidth + 1) mal.push(`${nombre(el)} mide ${el.scrollWidth} px de ancho en ${el.clientWidth}`)
    if (el.scrollLeft > 0) mal.push(`${nombre(el)} quedó corrido ${el.scrollLeft} px de costado`)
    const r = el.getBoundingClientRect()
    if (r.right > ancho + 1 || r.left < -1) mal.push(`${nombre(el)} va de ${Math.round(r.left)} a ${Math.round(r.right)} (pantalla de ${ancho})`)
  }
  // Los campos donde se escribe, con letra de 16 px o más.
  const chicos = [...document.querySelectorAll('input, select, textarea')].filter(c => {
    if (c.type === 'hidden' || c.type === 'checkbox' || c.type === 'radio') return false
    const cs = getComputedStyle(c), r = c.getBoundingClientRect()
    if (cs.display === 'none' || cs.visibility === 'hidden' || r.width === 0) return false
    return parseFloat(cs.fontSize) < 16
  }).map(c => `${nombre(c)} con letra de ${getComputedStyle(c).fontSize}`)
  return { mal, chicos }
}

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
