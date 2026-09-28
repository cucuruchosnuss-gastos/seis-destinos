// LA PLANTA ENTRA EN LA TABLET REAL, SIN SCROLL (28/09/2026).
//
// La planta se diseñó para 1280 × 800, pero la tablet de Nuss (Samsung Galaxy
// Tab A11) mide 1007 × 604 CSS px, y instalada quedan unos 1000 × 540 útiles
// apaisada y 600 × 940 parada. Esta prueba abre CADA pantalla de los dos modos
// en la maqueta (Supabase falso, con datos de volumen real: 10 ingredientes,
// muchos lotes y conos, 6 sublotes) a esos dos tamaños y a 1280 × 800, y
// falla si:
//  - la página scrollea (document.scrollingElement.scrollHeight > innerHeight);
//  - algo se sale de su recuadro;
//  - una palabra se corta a la mitad ("Cucuruch / ón");
//  - el número de lote va en dos renglones.
// Las listas largas de verdad (conos, personas, lotes, lo producido) llevan
// data-scroll-propio y scrollean adentro de su recuadro.
//
// Los pasos son los de e2e/pasos-planta.js, los mismos que usa
// e2e/recorrer-planta.js para MIRAR las capturas mientras se ajusta el CSS.
// Corre en cada push, sin credenciales (la maqueta).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');
const { medirPantalla } = require('./medir-pantalla');
const { PASOS_PLANTA } = require('./pasos-planta');

const MAQUETA = 'http://localhost:4180';
const TAMANOS = [[1000, 540], [600, 940], [1280, 800]];

for (const [ancho, alto] of TAMANOS) {
  test(`la planta entra sin scroll a ${ancho}×${alto}`, async ({ page }, info) => {
    test.setTimeout(3 * 60 * 1000);
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    const problemas = [];
    await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=produccion`);
    for (const [nombre, fn, medir = true] of PASOS_PLANTA) {
      await test.step(nombre, async () => {
        await fn(page);
        if (!medir) return;
        await page.waitForTimeout(150);
        const m = await page.evaluate(`(${medirPantalla.toString()})()`);
        await captura(page, `tamano-${nombre}-${ancho}x${alto}`, info);
        if (m.scroll) problemas.push(`${nombre}: la página mide ${m.altoDoc} px de alto y la pantalla ${m.alto}`);
        if (m.scrollX) problemas.push(`${nombre}: scroll de costado (${m.anchoDoc} en ${m.ancho})`);
        for (const a of m.afuera) problemas.push(`${nombre}: se sale de su recuadro ${a}`);
        for (const c of m.cortadas) problemas.push(`${nombre}: palabra cortada ${c}`);
        for (const l of m.lote) problemas.push(`${nombre}: el lote en dos renglones ${l}`);
      });
    }
    expect(errores, errores.join('\n')).toEqual([]);
    expect(problemas, `\n${problemas.join('\n')}`).toEqual([]);
  });
}

// El medidor mide de verdad: una página que scrollea y una palabra partida
// ponen la prueba en rojo (así un cero no es "no miré").
test('el medidor detecta el scroll, lo que se sale y la palabra cortada', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 300 });
  await page.setContent(`<body style="margin:0;font:16px sans-serif">
    <div style="height:600px">alto</div>
    <div style="width:100px;white-space:nowrap">un texto demasiado largo para su caja</div>
    <div style="width:60px;word-break:break-all">Cucuruchón</div>
    <div class="pr-maquina__lote" style="width:20px;font-size:30px;line-height:1">Lote 7033</div>
  </body>`);
  const m = await page.evaluate(`(${medirPantalla.toString()})()`);
  expect(m.scroll).toBe(true);
  expect(m.afuera.length).toBeGreaterThan(0);
  expect(m.cortadas.some(c => /Cucuruchón/.test(c))).toBe(true);
  expect(m.lote.length).toBe(1);
});
