// LA CARGA DE ÓRDENES DE RETIRO IGUAL AL DISEÑO (30/09/2026, Parte 4 de la
// tanda). Mismo molde que 13-comparar-administracion.spec.js.
//
// Abre el diseño de Claude Design (e2e/disenos/retiros) y la Carga en la
// maqueta (datos `retiros`, el reloj en el 28/09/2026 13:30), lleva la app a
// cada pantalla (e2e/pasos-comparar-retiros.js), les saca una foto al MISMO
// tamaño —390 × 844 en el celular, 1366 × 768 en la compu— y las pone lado a
// lado con un tercer cuadro que marca dónde difieren (e2e/comparar.js).
//
// Los datos de la maqueta NO son los del diseño: la comparación vigila el
// ARMADO de cada pantalla. Deja las imágenes en e2e/resultados/comparar/ (y en
// COMPARAR_SALIDA=<carpeta>, si se pasa).
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { abrirDiseno, fotoDelDiseno } = require('./diseno');
const { comparar } = require('./comparar');
const { vigilarErrores } = require('./ayuda');
const { PASOS_COMPARAR_RETIROS, prepararRetiros } = require('./pasos-comparar-retiros');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const AVISO = 0.12;
const FALLA = 0.30;
const SALIDA = path.join(__dirname, 'resultados', 'comparar');
// Un desvío declarado: { id: { tope, motivo } }. Mirado a ojo el 30/09/2026:
// el armado es el del diseño; lo que sube la diferencia es el contenido.
const MOTIVO_DATOS = 'los datos de la maqueta no son los del diseño (otro producto, dos lotes, un solo renglón) y la app suma su barra de arriba y la barra de abajo del celular, que el diseño no dibuja';
const DESVIOS = {
  '1d': { tope: 0.40, motivo: MOTIVO_DATOS },
  '1e': { tope: 0.40, motivo: MOTIVO_DATOS },
  '1f': { tope: 0.40, motivo: MOTIVO_DATOS },
  '1g': { tope: 0.40, motivo: MOTIVO_DATOS },
};

test('La carga de órdenes de retiro se ve como el diseño', async ({ browser }, info) => {
  test.setTimeout(6 * 60 * 1000);
  const pagDiseno = await browser.newPage();
  const recuadros = await abrirDiseno(pagDiseno, MAQUETA, 'retiros');
  const cmp = await browser.newPage();
  const tabla = [];
  const errores = [];
  for (const [id, [ancho, alto], fn] of PASOS_COMPARAR_RETIROS) {
    await test.step(id, async () => {
      const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires' });
      const page = await ctx.newPage();
      const suyos = vigilarErrores(page);
      await prepararRetiros(page, MAQUETA);
      await fn(page);
      await page.waitForTimeout(300);
      const clave = `${id}-${ancho}x${alto}`;
      const r = recuadros.find(x => x.clave === clave);
      expect(r, `el diseño no tiene la pantalla ${clave}`).toBeTruthy();
      const ancho2 = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(ancho2, `${clave}: scroll de costado`).toBeLessThanOrEqual(0);
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
      errores.push(...suyos.map(e => `${clave}: ${e}`));
      await ctx.close();
    });
  }
  fs.mkdirSync(SALIDA, { recursive: true });
  fs.writeFileSync(path.join(SALIDA, 'resumen-retiros.json'), JSON.stringify(tabla, null, 1));
  console.log(tabla.map(t => `${(t.diferencia * 100).toFixed(1).padStart(5)} %  ${t.clave}  ${t.titulo}`).join('\n'));
  expect(errores, errores.join('\n')).toEqual([]);
  const lejos = tabla.filter(t => t.diferencia > (DESVIOS[t.clave.split('-')[0]]?.tope ?? FALLA));
  expect(lejos.map(t => `${t.clave} difiere ${(t.diferencia * 100).toFixed(1)} %`), 'pantallas que no se parecen al diseño').toEqual([]);
});
