// LA PLANTA IGUAL AL DISEÑO (28/09/2026, Parte 4 de la tanda del sistema visual).
//
// Abre el diseño de Claude Design (e2e/disenos/planta-v2) y la planta real en la
// maqueta con LOS MISMOS DATOS de ejemplo (pruebas/datos-maqueta/planta-v2.js) y
// el reloj en el 28/09/2026 15:58, lleva la app a cada pantalla del diseño
// (e2e/pasos-comparar-planta.js), les saca una foto al MISMO tamaño —1000 × 540
// y 600 × 940— y las pone lado a lado con un tercer cuadro que marca dónde
// difieren (e2e/comparar.js).
//
// Deja las imágenes en e2e/resultados/comparar/ (artefacto "capturas" en
// GitHub) y, con COMPARAR_SALIDA=<carpeta>, también ahí (para el traspaso).
// AVISA con una anotación cuando una pantalla difiere más de AVISO, y FALLA
// cuando difiere más de FALLA: el número mide bloques de color de 8 × 8 px, no
// píxeles, así que un texto distinto casi no cuenta y un bloque fuera de lugar
// sí (ver comparar.js).
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { abrirDiseno, fotoDelDiseno } = require('./diseno');
const { comparar } = require('./comparar');
const { vigilarErrores } = require('./ayuda');
const { PASOS_COMPARAR_PLANTA, prepararPlanta } = require('./pasos-comparar-planta');

const MAQUETA = 'http://localhost:4180';
const AVISO = 0.12;
const FALLA = 0.30;
const SALIDA = path.join(__dirname, 'resultados', 'comparar');
// Pantallas donde la diferencia la explica un DESVÍO DECLARADO del diseño (con
// su motivo y su propio tope, así siguen vigiladas). Como RETIRADOS en los
// controles: una diferencia sin explicación es indistinguible de una rotura.
const DESVIOS = {
  '5c': { tope: 0.45, motivo: 'el color de cada cono sale de su NOMBRE (así un cono no cambia de color cuando cambia el orden de "los más usados"); el diseño los pinta por posición. Además la app suma el chip "Común" (cono sin marca), que el diseño no dibuja.' },
};

for (const [ancho, alto] of [[1000, 540], [600, 940]]) {
  test(`la planta se ve como el diseño a ${ancho}×${alto}`, async ({ browser }, info) => {
    test.setTimeout(6 * 60 * 1000);
    // El diseño en su propia pestaña, la app en otra.
    const pagDiseno = await browser.newPage();
    const recuadros = await abrirDiseno(pagDiseno, MAQUETA, 'planta-v2');
    const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires' });
    const page = await ctx.newPage();
    const errores = vigilarErrores(page);
    await prepararPlanta(page, MAQUETA);
    const cmp = await browser.newPage();
    const tabla = [];
    for (const [id, fn] of PASOS_COMPARAR_PLANTA) {
      await test.step(id, async () => {
        await fn(page, { ancho, alto });
        await page.waitForTimeout(250);
        const clave = `${id}-${ancho}x${alto}`;
        const r = recuadros.find(x => x.clave === clave);
        expect(r, `el diseño no tiene la pantalla ${clave}`).toBeTruthy();
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
    fs.writeFileSync(path.join(SALIDA, `resumen-${ancho}x${alto}.json`), JSON.stringify(tabla, null, 1));
    console.log(tabla.map(t => `${(t.diferencia * 100).toFixed(1).padStart(5)} %  ${t.clave}  ${t.titulo}`).join('\n'));
    expect(errores, errores.join('\n')).toEqual([]);
    const lejos = tabla.filter(t => t.diferencia > (DESVIOS[t.clave.split('-')[0]]?.tope ?? FALLA));
    expect(lejos.map(t => `${t.clave} difiere ${(t.diferencia * 100).toFixed(1)} %`), 'pantallas que no se parecen al diseño').toEqual([]);
    await ctx.close();
  });
}

// El comparador compara de verdad: dos fotos iguales dan 0 y una con un bloque
// distinto da más que el umbral de aviso (así un 0 % no es "no miré").
test('el comparador detecta un bloque fuera de lugar', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 300 });
  await page.setContent('<body style="margin:0;background:#F5F3EF"><div style="margin:20px;width:200px;height:120px;background:#C2410C"></div></body>');
  const a = await page.screenshot();
  await page.setContent('<body style="margin:0;background:#F5F3EF"><div style="margin:150px 0 0 180px;width:200px;height:120px;background:#C2410C"></div></body>');
  const b = await page.screenshot();
  const igual = await comparar(page, a, a);
  const distinto = await comparar(page, a, b);
  expect(igual.diferencia).toBe(0);
  expect(distinto.diferencia).toBeGreaterThan(AVISO);
});
