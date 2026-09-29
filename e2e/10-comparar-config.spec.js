// LA CONFIGURACIÓN DE PRODUCCIÓN IGUAL AL DISEÑO (29/09/2026, Parte 3 de la
// tanda del sistema visual). Mismo molde que 9-comparar-planta.spec.js.
//
// Abre el diseño de Claude Design (e2e/disenos/config-produccion) y la gestión
// real en la maqueta con LOS MISMOS DATOS de ejemplo
// (pruebas/datos-maqueta/config-produccion.js) y el reloj en el 28/09/2026
// 12:42, lleva la app a cada pantalla del diseño (e2e/pasos-comparar-config.js),
// les saca una foto al MISMO tamaño —1366 × 768 en la compu, 390 × 844 en el
// celular— y las pone lado a lado con un tercer cuadro que marca dónde difieren
// (e2e/comparar.js).
//
// Deja las imágenes en e2e/resultados/comparar/ (y, con
// COMPARAR_SALIDA=<carpeta>, también ahí). AVISA cuando una pantalla difiere
// más de AVISO y FALLA cuando difiere más de FALLA (o del tope de su desvío).
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { abrirDiseno, fotoDelDiseno } = require('./diseno');
const { comparar } = require('./comparar');
const { vigilarErrores } = require('./ayuda');
const { PASOS_COMPARAR_CONFIG, prepararConfig } = require('./pasos-comparar-config');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const AVISO = 0.12;
const FALLA = 0.30;
const SALIDA = path.join(__dirname, 'resultados', 'comparar');
// Pantallas donde la diferencia la explica un DESVÍO DECLARADO del diseño (con
// su motivo y su propio tope, así siguen vigiladas).
const DESVIOS = {
  '7a': { tope: 0.18, motivo: 'en el celular la app tiene arriba la barra de la app y la de unidad de negocio (compartidas, Parte 1): la unidad se elige ahí y no en un chip de la cabecera, así que todo baja ~100 px.' },
  '7b': { tope: 0.25, motivo: 'lo mismo que 7a (la barra de la app y la de unidad corren todo ~100 px hacia abajo); además la cabecera del producto suma "Editar nombre" (el diseño no dibuja cómo se renombra un producto).' },
};

test('la configuración de Producción se ve como el diseño', async ({ browser }, info) => {
  test.setTimeout(6 * 60 * 1000);
  const pagDiseno = await browser.newPage();
  const recuadros = await abrirDiseno(pagDiseno, MAQUETA, 'config-produccion');
  const cmp = await browser.newPage();
  const tabla = [];
  const errores = [];
  for (const [id, [ancho, alto], prep, fn] of PASOS_COMPARAR_CONFIG) {
    await test.step(id, async () => {
      const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires' });
      const page = await ctx.newPage();
      const suyos = vigilarErrores(page);
      await prepararConfig(page, MAQUETA, prep);
      await fn(page);
      await page.waitForTimeout(300);
      const clave = `${id}-${ancho}x${alto}`;
      const r = recuadros.find(x => x.clave === clave);
      expect(r, `el diseño no tiene la pantalla ${clave}`).toBeTruthy();
      // Sin scroll de costado, en ningún ancho.
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
  fs.writeFileSync(path.join(SALIDA, 'resumen-config.json'), JSON.stringify(tabla, null, 1));
  console.log(tabla.map(t => `${(t.diferencia * 100).toFixed(1).padStart(5)} %  ${t.clave}  ${t.titulo}`).join('\n'));
  expect(errores, errores.join('\n')).toEqual([]);
  const lejos = tabla.filter(t => t.diferencia > (DESVIOS[t.clave.split('-')[0]]?.tope ?? FALLA));
  expect(lejos.map(t => `${t.clave} difiere ${(t.diferencia * 100).toFixed(1)} %`), 'pantallas que no se parecen al diseño').toEqual([]);
});
