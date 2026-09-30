// LA PLANTA NO SE QUEDA CON ZOOM (30/09/2026, urgente).
//
// En la tablet real, deslizar hacia abajo para recargar a veces dejaba la
// pantalla agrandada y scrolleable, sin forma de volver. El arreglo, solo en
// la planta:
//  - el viewport sin zoom (maximum-scale=1, user-scalable=no);
//  - html y body con touch-action: manipulation (sin zoom por doble toque) y
//    overscroll-behavior-y: none (sin "deslizar para recargar");
//  - todo campo de texto con letra de 16 px o más (Chrome hace zoom al tocar
//    uno más chico);
//  - un botón "Recargar" en la barra lateral, que pregunta antes si hay algo
//    a medio cargar.
// Recorre los pasos de e2e/pasos-planta.js en la maqueta (sin credenciales).
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./ayuda');
const { PASOS_PLANTA } = require('./pasos-planta');

const MAQUETA = 'http://localhost:4180';

test('la planta no deja hacer zoom ni deslizar para recargar', async ({ page }) => {
  test.setTimeout(3 * 60 * 1000);
  await page.setViewportSize({ width: 1000, height: 540 });
  const errores = vigilarErrores(page);
  await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=produccion`);

  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).toMatch(/user-scalable=no/);
  expect(viewport).toMatch(/maximum-scale=1(?![.\d])/);
  expect(viewport).toMatch(/width=device-width/);
  expect(viewport).toMatch(/viewport-fit=cover/);

  const estilos = await page.evaluate(() => {
    const h = getComputedStyle(document.documentElement), b = getComputedStyle(document.body)
    return { hOver: h.overscrollBehaviorY, bOver: b.overscrollBehaviorY, hTouch: h.touchAction, bTouch: b.touchAction }
  });
  expect(estilos.bOver).toBe('none');
  expect(estilos.hOver).toBe('none');
  expect(estilos.bTouch).toBe('manipulation');
  expect(estilos.hTouch).toBe('manipulation');

  // Ningún campo visible con letra de menos de 16 px, en ningún paso.
  const chicos = [];
  let vioRecargar = false;
  for (const [nombre, fn] of PASOS_PLANTA) {
    await test.step(nombre, async () => {
      await fn(page);
      const r = await page.evaluate(() => {
        const visibles = [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]), textarea, select')]
          .filter(el => el.offsetParent !== null || el.getClientRects().length)
        return {
          chicos: visibles.filter(el => parseFloat(getComputedStyle(el).fontSize) < 16)
            .map(el => `${el.id || el.className || el.tagName} (${getComputedStyle(el).fontSize})`),
          recargar: !!document.querySelector('#pr-btn-recargar'),
        }
      });
      for (const c of r.chicos) chicos.push(`${nombre}: ${c}`);
      vioRecargar = vioRecargar || r.recargar;
    });
  }
  expect(chicos, `\n${chicos.join('\n')}`).toEqual([]);
  expect(vioRecargar, 'la barra lateral tiene "Recargar"').toBe(true);
  expect(errores, errores.join('\n')).toEqual([]);
});

test('"Recargar" pregunta si hay algo a medio cargar', async ({ page }) => {
  test.setTimeout(2 * 60 * 1000);
  await page.setViewportSize({ width: 1000, height: 540 });
  await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=produccion`);
  // Hasta "abrir-turno": una pantalla de carga con la barra lateral.
  for (const [nombre, fn] of PASOS_PLANTA) {
    await fn(page);
    if (nombre === 'abrir-turno') break;
  }
  await page.locator('#pr-btn-recargar').click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await expect(page.getByRole('alertdialog')).toContainText('Se pierde lo que estás cargando');
  await page.locator('#pr-recargar-no').click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  // "Sí, recargar" recarga la página.
  await page.locator('#pr-btn-recargar').click();
  await Promise.all([page.waitForEvent('load'), page.locator('#pr-recargar-si').click()]);
});
