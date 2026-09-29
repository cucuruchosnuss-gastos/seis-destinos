// EL TABLERO IGUAL AL DISEÑO (29/09/2026, Parte 2 de la tanda del sistema
// visual). Abre el diseño "Esqueleto" (e2e/disenos/esqueleto) y el dashboard
// real en la maqueta con LOS MISMOS DATOS de ejemplo
// (pruebas/datos-maqueta/tablero*.js) y el reloj en el lunes 28/09/2026 10:30,
// lleva la app a cada pantalla del diseño (e2e/pasos-comparar-esqueleto.js),
// les saca una foto al MISMO tamaño —1366 × 768, 1920 × 1080 y 390 × 844— y
// las pone lado a lado con un tercer cuadro que marca dónde difieren
// (e2e/comparar.js). Mismo molde que 9-comparar-planta.spec.js.
//
// Deja las imágenes en e2e/resultados/comparar/ y, con COMPARAR_SALIDA, también
// ahí. AVISA sobre AVISO y FALLA sobre FALLA (el número mide bloques de color
// de 8 × 8 px: un texto distinto casi no cuenta, un bloque fuera de lugar sí).
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { abrirDiseno, fotoDelDiseno } = require('./diseno');
const { comparar } = require('./comparar');
const { vigilarErrores } = require('./ayuda');
const { PASOS_1366, PASOS_1920, PASOS_390 } = require('./pasos-comparar-esqueleto');

const MAQUETA = 'http://localhost:4180';
const AVISO = 0.12;
const FALLA = 0.30;
const SALIDA = path.join(__dirname, 'resultados', 'comparar');
// Diferencias que explica un DESVÍO DECLARADO del diseño (con su tope).
const DESVIOS = {
  '7a': { tope: 0.40, motivo: 'el diseño dibuja la barra de estado del teléfono (44 px con "12:42") arriba de todo: la app no la tiene (es del sistema), así que todo queda 44 px más arriba.' },
  '7b': { tope: 0.65, motivo: 'el lienzo del diseño dibuja la hoja "Más" SIN la grilla de módulos (support.js no pinta su lista), aunque el README la pide ("todos los módulos en grilla de 3, con burbujas"): la app la tiene, así que la hoja es más alta. Más la barra de estado del teléfono de 7a. La hoja es de la Parte 1 (js/barra-lateral.js).' },
};

for (const [ancho, alto, pasos] of [[1366, 768, PASOS_1366], [1920, 1080, PASOS_1920], [390, 844, PASOS_390]]) {
  test(`el tablero se ve como el diseño a ${ancho}×${alto}`, async ({ browser }, info) => {
    test.setTimeout(6 * 60 * 1000);
    const pagDiseno = await browser.newPage();
    const recuadros = await abrirDiseno(pagDiseno, MAQUETA, 'esqueleto');
    const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires' });
    const page = await ctx.newPage();
    const errores = vigilarErrores(page);
    const cmp = await browser.newPage();
    const tabla = [];
    for (const [id, fn] of pasos) {
      await test.step(id, async () => {
        await fn(page, MAQUETA);
        await page.waitForTimeout(300);
        const clave = `${id}-${ancho}x${alto}`;
        const r = recuadros.find(x => x.clave === clave);
        expect(r, `el diseño no tiene la pantalla ${clave}`).toBeTruthy();
        const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
        expect(doc, `scroll horizontal en ${clave}`).toBeLessThanOrEqual(vista);
        const real = await page.screenshot();
        const diseno = await fotoDelDiseno(pagDiseno, clave);
        const res = await comparar(cmp, diseno, real, { titulo: `${id} · ${r.titulo}`, salida: path.join(SALIDA, `${clave}.png`) });
        if (process.env.COMPARAR_SALIDA) {
          fs.mkdirSync(process.env.COMPARAR_SALIDA, { recursive: true });
          fs.copyFileSync(path.join(SALIDA, `${clave}.png`), path.join(process.env.COMPARAR_SALIDA, `${clave}.png`));
        }
        await info.attach(`comparar-${clave}`, { path: path.join(SALIDA, `${clave}.png`), contentType: 'image/png' });
        tabla.push({ clave, titulo: r.titulo, diferencia: res.diferencia });
        if (res.diferencia > AVISO) info.annotations.push({ type: 'aviso', description: `${clave} (${r.titulo}) difiere ${(res.diferencia * 100).toFixed(1)} % del diseño` });
      });
    }
    fs.writeFileSync(path.join(SALIDA, `resumen-esqueleto-${ancho}x${alto}.json`), JSON.stringify(tabla, null, 1));
    console.log(tabla.map(t => `${(t.diferencia * 100).toFixed(1).padStart(5)} %  ${t.clave}  ${t.titulo}`).join('\n'));
    expect(errores, errores.join('\n')).toEqual([]);
    const lejos = tabla.filter(t => t.diferencia > (DESVIOS[t.clave.split('-')[0]]?.tope ?? FALLA));
    expect(lejos.map(t => `${t.clave} difiere ${(t.diferencia * 100).toFixed(1)} %`), 'pantallas que no se parecen al diseño').toEqual([]);
    await ctx.close();
  });
}
