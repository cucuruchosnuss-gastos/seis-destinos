// LAS VISTAS QUE FALTABAN EN LA REVISIÓN DEL CELULAR (10/10/2026). La revisión
// de 30-revision-celular.spec.js no pudo abrir en la maqueta ocho vistas; con
// datos nuevos (pruebas/datos-maqueta/celular-*.js, más config-produccion y
// stock-costos, que ya estaban) se abren y se miden a 360 y 390 px:
//  - el detalle de un gasto (celular-gastos, ?gasto=),
//  - los puntos de venta de una orden (celular-administracion, la orden
//    N-0012; hasta el 28/10/2026 era su comisión común, que salió),
//  - "Dar salida" de un cheque (celular-administracion → Cheques),
//  - el panel de un costo en Stock (stock-costos),
//  - "Mis retiros" y una orden abierta (celular-retiros),
//  - el detalle de una planilla de la gestión de Producción (celular-planilla,
//    con el reloj en septiembre para que "Planillas" la muestre),
//  - Ingredientes de la gestión (config-produccion),
//  - "Pagado sin ingresar" de Ingreso (celular-ingreso, con "No lleva ingreso").
// Un recorrido de humo (se abren, sin errores y sin scroll de costado) y una
// prueba por cada arreglo de CSS (solo en el celular: la compu no cambia).
// Contra el CSS de antes, cada prueba de arreglo da ROJO (verificado al
// escribirla). Corre SIEMPRE, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

const menuGestion = async (p) => { if (await p.locator('#pr-btn-menu').isVisible()) await p.locator('#pr-btn-menu').click() };

// Las ocho vistas: cómo se llega y qué tiene que verse.
const VISTAS = {
  gasto: { url: 'modulos/gastos.html?maqueta=celular-gastos&gasto=g-anu', ver: '.resumen-fila__valor:has-text("Combustible")' },
  comision: {
    url: 'modulos/administracion.html?maqueta=celular-administracion',
    pasos: [async (p) => { await p.evaluate(() => localStorage.setItem('barraUnidad.elegida', 'u-n')); await p.reload() },
      '[data-pestana="ordenes"]', '#ad-ordenes-lista [data-orden="o12"]'],
    ver: '#ad-fc-punto-b',
  },
  salida: { url: 'modulos/administracion.html?maqueta=celular-administracion', pasos: ['[data-pestana="cheques"]', '[data-dar-salida]:visible'], ver: '#chq-salida-confirmar' },
  costo: { url: 'modulos/stock.html?vista=insumos&maqueta=stock-costos', pasos: ['.barra-unidad__chip[data-unidad="u-n"]', '#btn-ver-costos', '[data-costo="i-harina"]'], ver: '#modal-costo #costo-precio' },
  misRetiros: { url: 'modulos/retiros.html?maqueta=celular-retiros', pasos: ['[data-empresa]', '#rt-btn-mis'], ver: '[data-mia="o-2"]' },
  ordenMia: { url: 'modulos/retiros.html?maqueta=celular-retiros', pasos: ['[data-empresa]', '#rt-btn-mis', '[data-mia="o-2"]'], ver: '#rt-mio-volver' },
  planilla: {
    reloj: '2026-09-26T15:00:00Z', url: 'modulos/produccion-gestion.html?maqueta=celular-planilla',
    pasos: [menuGestion, '#pr-menu-historial', '[data-historial-turno]:visible'], ver: '.pg-producido',
  },
  ingredientes: { url: 'modulos/produccion-gestion.html?maqueta=config-produccion', pasos: [menuGestion, '[data-ir-config="ingredientes"]', '[data-cfg-sel]:visible'], ver: '.pc-ing' },
  pagado: { url: 'modulos/materia-prima.html?maqueta=celular-ingreso', ver: '#seccion-pagado-sin-ingresar .btn-pendiente-descartar' },
};

async function abrir(page, ancho, v) {
  await page.setViewportSize({ width: ancho, height: ancho < 380 ? 780 : 844 });
  if (v.reloj) await page.clock.setFixedTime(new Date(v.reloj));
  await page.goto(`${MAQUETA}/${v.url}`);
  for (const p of v.pasos || []) {
    if (typeof p === 'function') await p(page);
    else await page.locator(p).first().click();
    await page.waitForTimeout(250);
  }
  await expect(page.locator(v.ver).first()).toBeVisible();
  await page.waitForTimeout(300);
}

async function sinScroll(page) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, 'sin scroll de costado').toBeLessThanOrEqual(vista);
}
// La caja de un elemento.
const caja = (loc) => loc.evaluate(e => { const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom } });
const seCruzan = (a, b) => a.right > b.left + 0.5 && a.left < b.right - 0.5 && a.bottom > b.top + 0.5 && a.top < b.bottom - 0.5;
// Los campos (visibles) de `sel` con letra de menos de 16 px.
function camposChicos(page, sel) {
  return page.$$eval(sel, (els) => els
    .filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden')
    .filter(e => parseFloat(getComputedStyle(e).fontSize) < 16)
    .map(e => `${e.id || e.className} (${getComputedStyle(e).fontSize})`));
}

for (const ancho of [360, 390]) {
  test.describe(`las vistas que faltaban, a ${ancho} px`, () => {
    for (const [nombre, v] of Object.entries(VISTAS)) {
      test(`humo: ${nombre} se abre, sin errores ni scroll de costado`, async ({ page }, info) => {
        const errores = vigilarErrores(page);
        await abrir(page, ancho, v);
        await sinScroll(page);
        await captura(page, `faltantes-${nombre}-${ancho}`, info);
        expect(errores).toEqual([]);
      });
    }

    test('los puntos de venta: 100/0 … 40/60 se ven enteros, sin scroll adentro del segmento', async ({ page }) => {
      await abrir(page, ancho, VISTAS.comision);
      const seg = page.locator('#ad-fc .ad-segmento');
      const s = await caja(seg);
      expect(await seg.evaluate(e => e.scrollWidth <= e.clientWidth + 1), 'el segmento no scrollea de costado').toBe(true);
      expect(await seg.locator('[data-fc-pct]').count()).toBe(4);
      for (const b of await seg.locator('[data-fc-pct]').all()) {
        const r = await caja(b);
        expect(r.left, `${await b.textContent()} adentro del segmento`).toBeGreaterThanOrEqual(s.left - 0.5);
        expect(r.right, `${await b.textContent()} adentro del segmento`).toBeLessThanOrEqual(s.right + 0.5);
        expect(await b.evaluate(e => e.scrollWidth <= e.clientWidth + 1), `${await b.textContent()} sin cortarse`).toBe(true);
      }
    });

    test('la planilla: "N cajas = N unidades" no queda debajo de Corregir / Anular ni se sale', async ({ page }) => {
      await abrir(page, ancho, VISTAS.planilla);
      const filas = page.locator('.pg-producido .pg-sub');
      expect(await filas.count()).toBeGreaterThan(3);
      for (const f of await filas.all()) {
        const c = f.locator('.pg-sub__cajas');
        const rc = await caja(c), rf = await caja(f);
        const texto = (await c.textContent()).trim();
        expect(await c.evaluate(e => e.scrollWidth <= e.clientWidth + 1), `«${texto}» entra en su lugar`).toBe(true);
        expect(rc.right, `«${texto}» adentro de su renglón`).toBeLessThanOrEqual(rf.right + 0.5);
        expect(rc.right, `«${texto}» adentro de la pantalla`).toBeLessThanOrEqual(ancho);
        for (const b of await f.locator('.pg-sub-acc button').all()) {
          expect(seCruzan(rc, await caja(b)), `«${texto}» debajo de ${await b.textContent()}`).toBe(false);
        }
      }
    });

    test('la barra de abajo: el módulo donde se está (en negrita) no se corta', async ({ page }) => {
      // Con config-produccion la barra tiene seis pestañas (60 px a 360 px).
      await abrir(page, ancho, VISTAS.ingredientes);
      const sobra = await page.$eval('.barra-abajo__tab--actual .barra-abajo__nombre', (n) => {
        const r = document.createRange(); r.selectNodeContents(n);
        return r.getBoundingClientRect().width - n.getBoundingClientRect().width;
      });
      expect(sobra, '"Producción" entra en su pestaña').toBeLessThanOrEqual(0.01);
    });

    test('el detalle de un gasto: el ícono de la categoría va al lado del nombre', async ({ page }) => {
      await abrir(page, ancho, VISTAS.gasto);
      const { icono, texto } = await page.$eval('.resumen-fila__valor:has(svg)', (v) => {
        const svg = v.querySelector('svg').getBoundingClientRect();
        const nodo = [...v.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
        const r = document.createRange(); r.selectNodeContents(nodo);
        const t = r.getClientRects()[r.getClientRects().length - 1];
        return { icono: { top: svg.top, bottom: svg.bottom, right: svg.right }, texto: { top: t.top, bottom: t.bottom, left: t.left } };
      });
      expect(icono.bottom, 'el ícono en el mismo renglón que el nombre').toBeGreaterThan(texto.top);
      expect(icono.top, 'el ícono en el mismo renglón que el nombre').toBeLessThan(texto.bottom);
      expect(icono.right, 'el ícono a la izquierda del nombre').toBeLessThanOrEqual(texto.left + 0.5);
    });

    // Los números (11/10/2026, ci-prueba/numeros): el kilometraje con punto de
    // miles y la plata de "Pagado sin ingresar" con sus dos decimales.
    test('el detalle de un gasto: el kilometraje con punto de miles', async ({ page }) => {
      await abrir(page, ancho, VISTAS.gasto);
      await expect(page.locator('.resumen-fila__valor', { hasText: ' km' })).toHaveText('184.350 km');
    });

    test('"Pagado sin ingresar": la plata con sus dos decimales', async ({ page }) => {
      await abrir(page, ancho, VISTAS.pagado);
      const meta = (await page.locator('#seccion-pagado-sin-ingresar .pendiente-mp__meta').allTextContents()).join(' | ');
      expect(meta).toContain('$1.234.567,89');
      expect(meta, 'ningún importe con un solo decimal').not.toMatch(/\$[\d.]+,\d(?!\d)/);
    });

    test('los campos donde se escribe, con letra de 16 px (el celular no agranda la pantalla)', async ({ page }) => {
      // Primero la gestión de Producción: los selectores de unidad se ven con
      // "Todas" en la barra de arriba (Stock elige Nuss, y queda recordado).
      // La lista de Ingredientes (antes de elegir uno): el buscador; con uno
      // elegido, el selector de unidad de arriba.
      await abrir(page, ancho, { ...VISTAS.ingredientes, pasos: VISTAS.ingredientes.pasos.slice(0, -1), ver: '#pr-cfg-lista-buscar' });
      expect.soft(await camposChicos(page, '.pc-buscar__input')).toEqual([]);
      await abrir(page, ancho, VISTAS.ingredientes);
      await expect(page.locator('#pr-config-unidad')).toBeVisible();
      expect.soft(await camposChicos(page, '.pc-unidad__select')).toEqual([]);
      await abrir(page, ancho, VISTAS.planilla);
      await expect(page.locator('#pr-gestion-unidad')).toBeVisible();
      expect.soft(await camposChicos(page, '#pr-gestion-unidad')).toEqual([]);
      await abrir(page, ancho, VISTAS.pagado);
      await page.locator('.btn-pendiente-descartar').first().click();
      await expect(page.locator('.campo-descarte')).toBeVisible();
      expect.soft(await camposChicos(page, '#filtro-busqueda-ingresos, .campo-descarte')).toEqual([]);
      await abrir(page, ancho, VISTAS.costo);
      expect.soft(await camposChicos(page, '#modal-costo input, #modal-costo select, #modal-costo textarea, .buscador-stock')).toEqual([]);
    });
  });
}
