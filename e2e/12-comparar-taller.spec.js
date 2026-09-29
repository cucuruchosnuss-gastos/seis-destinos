// PROYECTOS TALLER IGUAL AL DISEÑO (29/09/2026, Parte 6). Mismo molde que
// 10-comparar-config.spec.js.
//
// Abre el diseño de Claude Design (e2e/disenos/taller) y el módulo real en la
// maqueta con LOS MISMOS DATOS de ejemplo (pruebas/datos-maqueta/taller-*.js)
// y el reloj en el 28/09/2026 16:10, lleva la app a cada pantalla del diseño
// (e2e/pasos-comparar-taller.js), les saca una foto al MISMO tamaño —1366 × 768
// en la compu, 390 × 844 en el celular— y las pone lado a lado con un tercer
// cuadro que marca dónde difieren (e2e/comparar.js).
//
// Además: la cuenta SIN taller:precios (Edgar) ve los costos y NO tiene
// ninguna palabra de venta en el DOM (ni texto ni atributos).
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
const { PASOS_COMPARAR_TALLER, prepararTaller } = require('./pasos-comparar-taller');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const AVISO = 0.12;
const FALLA = 0.30;
const SALIDA = path.join(__dirname, 'resultados', 'comparar');
const CAR = 'aaaaaaaa-0000-4000-8000-000000000000';
// Pantallas donde la diferencia la explica un DESVÍO DECLARADO del diseño (con
// su motivo y su propio tope, así siguen vigiladas).
const DESVIOS = {
  '1b': { tope: 0.35, motivo: 'decisión de Facu (29/09/2026): sin permiso de precios igual se ven los COSTOS ("Costo $ … de $ …", "se pasó $ …") y el botón del valor de la hora; el diseño 1b los escondía. Edgar tiene gestionar, así que también ve "+ Nuevo proyecto".' },
  '2b': { tope: 0.35, motivo: 'decisión de Facu: sin precios se ven el presupuesto, los gastos, el costo de las horas, el costo total y la columna COSTO de las horas (el diseño 2b los escondía).' },
  '6a': { tope: 0.45, motivo: 'en el celular arriba van la barra de la app y la de unidad (compartidas), y las pestañas Proyectos / Diagrama (el diseño no dibuja cómo se llega al diagrama desde el celular): las tarjetas son las mismas pero corridas ~95 px hacia abajo, y en una lista de tarjetas eso mueve casi cada píxel (medido 39,9 % el 29/09/2026).' },
  '6b': { tope: 0.35, motivo: 'lo mismo que 6a; además el celular conserva el buscador y los filtros de archivos del diseño de la compu.' },
  '7d': { tope: 0.35, motivo: 'lo mismo que 6a: las barras compartidas y las pestañas arriba corren todo hacia abajo.' },
};
const VENTA = /precio de venta|\bventa\b|facturad|cobrad|margen|precio a la f[aá]brica|cargado a/i;

test('Proyectos Taller se ve como el diseño', async ({ browser }, info) => {
  test.setTimeout(8 * 60 * 1000);
  const pagDiseno = await browser.newPage();
  const recuadros = await abrirDiseno(pagDiseno, MAQUETA, 'taller');
  const cmp = await browser.newPage();
  const tabla = [];
  const errores = [];
  for (const [id, [ancho, alto], prep, fn] of PASOS_COMPARAR_TALLER) {
    await test.step(id, async () => {
      const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires' });
      const page = await ctx.newPage();
      const suyos = vigilarErrores(page);
      await prepararTaller(page, MAQUETA, prep);
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
  fs.writeFileSync(path.join(SALIDA, 'resumen-taller.json'), JSON.stringify(tabla, null, 1));
  console.log(tabla.map(t => `${(t.diferencia * 100).toFixed(1).padStart(5)} %  ${t.clave}  ${t.titulo}`).join('\n'));
  expect(errores, errores.join('\n')).toEqual([]);
  const lejos = tabla.filter(t => t.diferencia > (DESVIOS[t.clave.split('-')[0]]?.tope ?? FALLA));
  expect(lejos.map(t => `${t.clave} difiere ${(t.diferencia * 100).toFixed(1)} %`), 'pantallas que no se parecen al diseño').toEqual([]);
});

// Todo el texto y todos los atributos del DOM vivo (sin <script> ni <style>).
async function textoDelDom(page) {
  return page.evaluate(() => {
    const partes = [];
    const recorrer = (n) => {
      if (n.nodeType === 3) { partes.push(n.nodeValue); return }
      if (n.nodeType !== 1) return
      if (n.tagName === 'SCRIPT' || n.tagName === 'STYLE') return
      for (const a of n.attributes) partes.push(a.value)
      for (const h of n.childNodes) recorrer(h)
    };
    recorrer(document.body);
    return partes.join(' \n ');
  });
}

test('sin permiso de precios: los costos sí, la venta no (ni en el DOM)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires' });
  const page = await ctx.newPage();
  const errores = vigilarErrores(page);
  // La lista.
  await prepararTaller(page, MAQUETA, { maqueta: 'taller-edgar' });
  let dom = await textoDelDom(page);
  expect(dom.match(VENTA)?.[0] ?? null, 'palabra de venta en la lista').toBeNull();
  expect(dom).toMatch(/Costo \$ 4\.820\.000 de \$ 5\.200\.000/);
  expect(dom).toMatch(/se pasó \$ 100\.000/);
  expect(dom).toMatch(/Valor de la hora · \$ 18\.500/);
  // La ficha, en sus cuatro pestañas.
  for (const tab of ['gastos', 'horas', 'notas', 'archivos']) {
    await prepararTaller(page, MAQUETA, { maqueta: 'taller-edgar', proyecto: CAR, tab });
    await page.waitForTimeout(200);
    dom = await textoDelDom(page);
    expect(dom.match(VENTA)?.[0] ?? null, `palabra de venta en la ficha (${tab})`).toBeNull();
    expect(dom).toMatch(/PRESUPUESTO DE COSTO/);
    expect(dom).toMatch(/\$ 5\.200\.000/);
    expect(dom).toMatch(/\$ 2\.748\.000/);
    expect(dom).toMatch(/× \$ 18\.500 la hora/);
  }
  // El valor de la hora: lo ve, no lo cambia.
  await prepararTaller(page, MAQUETA, { maqueta: 'taller-edgar' });
  await page.locator('#tl-btn-valor-hora').click();
  await expect(page.locator('#tl-hora')).toContainText('$ 18.500');
  await expect(page.locator('#tl-hora-valor')).toHaveCount(0);
  // El diagrama tampoco dice plata.
  await prepararTaller(page, MAQUETA, { maqueta: 'taller-edgar', diagrama: true });
  dom = await textoDelDom(page);
  expect(dom.match(VENTA)?.[0] ?? null, 'palabra de venta en el diagrama').toBeNull();
  expect(errores).toEqual([]);
  await ctx.close();
});
