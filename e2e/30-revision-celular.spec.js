// REVISIÓN EN EL CELULAR (10/10/2026): lo que se cortaba, se encimaba o se
// salía de la pantalla a 360 y 390 px, y se arregló con CSS (sin cambiar qué
// hace ninguna pantalla ni la compu). La lista completa, con lo que quedó sin
// arreglar y por qué, en .claude/traspasos/2026-10-10-revision-celular.md.
//
// Cada caso abre una pantalla de la maqueta (Supabase falso, sin sesión ni
// base) y mide. Contra el CSS de antes da ROJO (verificado al escribirla).
// Corre SIEMPRE, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

async function abrir(page, ancho, ruta, pasos = []) {
  await page.setViewportSize({ width: ancho, height: ancho < 380 ? 780 : 844 });
  await page.goto(`${MAQUETA}/${ruta}`);
  for (const p of pasos) {
    if (typeof p === 'function') await p(page);
    else await page.locator(p).first().click();
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(400);
}

// Los elementos (visibles) de `sel` cuyo texto no entra en su caja.
function cortados(page, sel) {
  return page.$$eval(sel, (els) => els
    .filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden')
    .filter(e => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)
    .map(e => `${e.className} «${e.textContent.trim().slice(0, 40)}» ${e.scrollWidth}>${e.clientWidth}`));
}
// La caja de un elemento (o null si no está a la vista).
function caja(page, sel) {
  return page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e || !e.getClientRects().length) return null;
    const r = e.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
  }, sel);
}
const seCruzan = (a, b) => !!a && !!b && a.right > b.left + 0.5 && a.left < b.right - 0.5 && a.bottom > b.top + 0.5 && a.top < b.bottom - 0.5;
// ¿Lo que se ve en el centro de `sel` es ese mismo control (no algo encima)?
function seToca(page, sel) {
  return page.evaluate((s) => {
    const e = document.querySelector(s);
    const r = e.getBoundingClientRect();
    const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!t && (t === e || e.contains(t));
  }, sel);
}
async function sinScroll(page) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, 'sin scroll de costado').toBeLessThanOrEqual(vista);
}

for (const ancho of [360, 390]) {
  test.describe(`revisión en el celular a ${ancho} px`, () => {
    test('la barra de abajo: los nombres entran y la burbuja no se sale', async ({ page }, info) => {
      const errores = vigilarErrores(page);
      await abrir(page, ancho, 'dashboard.html?maqueta=tablero');
      await expect(page.locator('.barra-abajo__burbuja').first()).toBeVisible();
      // Producción y Cobranzas (12,5 px) se cortaban con "…" a 360 y 390.
      expect(await cortados(page, '.barra-abajo [data-clave="produccion"] .barra-abajo__nombre, .barra-abajo [data-clave="cobranzas"] .barra-abajo__nombre')).toEqual([]);
      const letra = await page.$eval('.barra-abajo__nombre', e => parseFloat(getComputedStyle(e).fontSize));
      expect(letra, 'el nombre sigue en 12,5 px').toBeGreaterThanOrEqual(12.5);
      // La burbuja de "Más" (22) quedaba afuera de la pantalla.
      const burbujas = await page.$$eval('.barra-abajo__burbuja', bs => bs.map(b => {
        const r = b.getBoundingClientRect(), t = b.closest('.barra-abajo__tab').getBoundingClientRect();
        return { texto: b.textContent, r: r.right, tab: t.right };
      }));
      for (const b of burbujas) {
        expect(b.r, `la burbuja ${b.texto} adentro de la pantalla`).toBeLessThanOrEqual(ancho + 0.5);
        expect(b.r, `la burbuja ${b.texto} adentro de su pestaña`).toBeLessThanOrEqual(b.tab + 0.5);
      }
      await sinScroll(page);
      await captura(page, `revision-barra-${ancho}`, info);
      expect(errores).toEqual([]);
    });

    test('un nombre de dos palabras baja de renglón en la barra (Proyectos Taller)', async ({ page }) => {
      await abrir(page, ancho, 'modulos/taller.html?maqueta=taller-diseno');
      expect(await cortados(page, '.barra-abajo__nombre')).toEqual([]);
    });

    test('el punto de la versión no tapa ningún botón', async ({ page }) => {
      for (const [ruta, pasos] of [
        ['dashboard.html?maqueta=tablero', []],
        ['modulos/gastos.html?maqueta=gastos', ['#btn-nuevo-gasto', '#btn-sin-foto']],
        ['modulos/cobranzas.html?maqueta=cobranzas', ['#cob-btn-nueva']],
        ['modulos/stock.html?maqueta=stock', ['#btn-registrar-movimiento']],
      ]) {
        await abrir(page, ancho, ruta, pasos);
        const v = await caja(page, '#version-banner');
        expect(v, `${ruta}: el punto está`).not.toBeNull();
        const tapa = await page.evaluate((rv) => [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea')]
          .filter(c => c.id !== 'version-banner' && c.getClientRects().length && !c.closest('[hidden]'))
          .filter(c => { const r = c.getBoundingClientRect(); return r.right > rv.left && r.left < rv.right && r.bottom > rv.top && r.top < rv.bottom; })
          .map(c => c.id || c.className || c.tagName), v);
        expect(tapa, `${ruta}: el punto de la versión encima de`).toEqual([]);
      }
    });

    test('Gastos: el "+" no se encima con la barra de abajo', async ({ page }) => {
      await abrir(page, ancho, 'modulos/gastos.html?maqueta=gastos');
      const fab = await caja(page, '#btn-nuevo-gasto'), barra = await caja(page, '.barra-abajo');
      expect(seCruzan(fab, barra), `el + ${JSON.stringify(fab)} y la barra ${JSON.stringify(barra)}`).toBe(false);
      expect(await seToca(page, '#barra-abajo-mas'), '"Más" se puede tocar').toBe(true);
      expect(await seToca(page, '#btn-nuevo-gasto'), 'el + se puede tocar').toBe(true);
    });

    test('Cobranzas: la barra de la pantalla no tapa la barra de abajo de la app', async ({ page }) => {
      await abrir(page, ancho, 'modulos/cobranzas.html?maqueta=cobranzas');
      for (const id of ['#cob-barra-listado']) {
        expect(seCruzan(await caja(page, id), await caja(page, '.barra-abajo')), `${id} encima de la barra de abajo`).toBe(false);
      }
      expect(await seToca(page, '.barra-abajo [data-clave="inicio"]'), '"Inicio" se puede tocar').toBe(true);
      expect(await seToca(page, '#cob-btn-nueva'), '"+ Nueva cobranza" se puede tocar').toBe(true);
      await page.locator('#cob-btn-nueva').click();
      await page.waitForTimeout(300);
      expect(seCruzan(await caja(page, '#cob-barra-form'), await caja(page, '.barra-abajo')), 'la barra del formulario encima de la barra de abajo').toBe(false);
      expect(await seToca(page, '#cob-btn-guardar'), '"Guardar" se puede tocar').toBe(true);
      await sinScroll(page);
    });

    test('Producción · Personal y PINes: "Guardar los cambios" no queda debajo de la barra', async ({ page }) => {
      await abrir(page, ancho, 'modulos/produccion-gestion.html?maqueta=produccion-gestion', [
        async (p) => { if (await p.locator('#pr-btn-menu').isVisible()) await p.locator('#pr-btn-menu').click() },
        '[data-ir-config="personal"]',
      ]);
      await expect(page.locator('#pr-cfg-personal-guardar')).toBeVisible();
      expect(await seToca(page, '#pr-cfg-personal-guardar'), '"Guardar los cambios" se puede tocar').toBe(true);
      const pie = await caja(page, '.pg-per__pie');
      expect(pie.left, 'el pie no se sale por la izquierda').toBeGreaterThanOrEqual(-0.5);
      expect(pie.right, 'ni por la derecha').toBeLessThanOrEqual(ancho + 0.5);
      expect(await cortados(page, '#pr-config-titulo, .pc-cab__titulo')).toEqual([]);
      await sinScroll(page);
    });

    test('Producción · Conos: los filtros, "ACTIVO" y el texto de doble bolsa entran', async ({ page }) => {
      await abrir(page, ancho, 'modulos/produccion-gestion.html?maqueta=produccion-gestion', [
        async (p) => { if (await p.locator('#pr-btn-menu').isVisible()) await p.locator('#pr-btn-menu').click() },
        '[data-ir-config="marcas"]',
      ]);
      await expect(page.locator('.pc-seg')).toBeVisible();
      const seg = await caja(page, '.pc-seg'), panel = await caja(page, '.pc-conos');
      expect(seg.right, `los filtros (${seg.right}) adentro de la tarjeta (${panel.right})`).toBeLessThanOrEqual(panel.right + 0.5);
      expect(await cortados(page, '.pc-cono__cab > div, .pc-conos__pie > .pc-esp')).toEqual([]);
      await sinScroll(page);
    });

    test('Cuentas corrientes: el nombre de cada proveedor no se corta', async ({ page }) => {
      await abrir(page, ancho, 'modulos/cuentas-corrientes.html?maqueta=cuentas-corrientes');
      await expect(page.locator('.tarjeta-lista__titulo').first()).toBeVisible();
      expect(await cortados(page, '.tarjeta-lista__titulo, .tarjeta-lista__subtitulo')).toEqual([]);
      await page.locator('#btn-ver-padron').click();
      await page.waitForTimeout(300);
      expect(await cortados(page, '.tarjeta-lista__titulo, .tarjeta-lista__subtitulo')).toEqual([]);
      await sinScroll(page);
    });

    test('Ingreso: proveedor, fecha y fábrica de cada ingreso, y los pasos del wizard', async ({ page }) => {
      await abrir(page, ancho, 'modulos/materia-prima.html?maqueta=materia-prima');
      await expect(page.locator('.tarjeta-lista__titulo').first()).toBeVisible();
      expect(await cortados(page, '.tarjeta-lista__titulo, .ingreso__fecha')).toEqual([]);
      await page.locator('#btn-abrir-wizard').click();
      await page.waitForTimeout(300);
      expect(await cortados(page, '.wz-progreso__label')).toEqual([]);
      await sinScroll(page);
    });

    test('Empleados: nombre y subtítulo de cada persona', async ({ page }) => {
      await abrir(page, ancho, 'modulos/empleados.html?maqueta=empleados');
      await expect(page.locator('.tarjeta-lista__titulo').first()).toBeVisible();
      expect(await cortados(page, '.tarjeta-lista__titulo, .tarjeta-lista__subtitulo')).toEqual([]);
      await sinScroll(page);
    });

    test('Órdenes de retiro: la fábrica en el título, sin cortarse', async ({ page }) => {
      await abrir(page, ancho, 'modulos/retiros.html?maqueta=retiros', [
        '[data-empresa]',
        async (p) => { await p.locator('#rt-cliente-buscar').fill('turco'); await p.locator('[data-cliente]').first().click() },
      ]);
      await expect(page.locator('#rt-subtitulo')).toHaveText(/Cucuruchos Nuss/);
      expect(await cortados(page, '#rt-subtitulo')).toEqual([]);
      await expect(page.locator('#rt-btn-cambiar-empresa')).toHaveAttribute('aria-label', /Cucuruchos Nuss/);
      await sinScroll(page);
    });
  });
}
