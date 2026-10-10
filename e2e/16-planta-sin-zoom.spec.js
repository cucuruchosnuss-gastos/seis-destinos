// LA PLANTA NO SE QUEDA CON ZOOM (30/09/2026, urgente) Y SE RECARGA
// DESLIZANDO (01/10/2026).
//
// En la tablet real, deslizar hacia abajo para recargar a veces dejaba la
// pantalla agrandada y scrolleable, sin forma de volver. Lo que la dejaba
// así era el ZOOM. El arreglo, solo en la planta:
//  - el viewport sin zoom (maximum-scale=1, user-scalable=no);
//  - html y body con touch-action: manipulation (sin zoom por doble toque);
//  - todo campo de texto con letra de 16 px o más (Chrome hace zoom al tocar
//    uno más chico).
// El 01/10/2026 volvió el "deslizar para recargar" (html y body SIN
// overscroll-behavior none) y se fue el botón "Recargar". Un producto a
// medio cargar se guarda al recargar y se recupera al volver a Lo producido
// de esa máquina.
// Recorre los pasos de e2e/pasos-planta.js en la maqueta (sin credenciales).
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./ayuda');
const { PASOS_PLANTA } = require('./pasos-planta');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const paso = (nombre) => PASOS_PLANTA.find(([n]) => n === nombre)[1];

test('la planta no deja hacer zoom y deja deslizar para recargar', async ({ page }) => {
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
  expect(estilos.bOver, 'deslizar para recargar anda (body)').not.toBe('none');
  expect(estilos.hOver, 'deslizar para recargar anda (html)').not.toBe('none');
  expect(estilos.bTouch).toBe('manipulation');
  expect(estilos.hTouch).toBe('manipulation');

  // Ningún campo visible con letra de menos de 16 px, en ningún paso; y
  // ningún "Recargar" en la barra.
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
  expect(vioRecargar, 'la barra lateral ya no tiene "Recargar"').toBe(false);
  expect(errores, errores.join('\n')).toEqual([]);
});

test('un producto a medio cargar no se pierde al recargar', async ({ page }) => {
  test.setTimeout(2 * 60 * 1000);
  await page.setViewportSize({ width: 1000, height: 540 });
  const errores = vigilarErrores(page);
  await page.goto(`${MAQUETA}/modulos/produccion.html?maqueta=produccion`);
  for (const n of ['quien-sos', 'pin', 'pin-maestro', 'entrar', 'tablero', 'planilla', 'lo-producido-producto', 'lo-producido-cono']) await paso(n)(page);
  // Recargar, como al deslizar la pantalla hacia abajo.
  await page.reload();
  await expect(page.locator('[data-producido]').first()).toBeVisible();
  // Volver a Lo producido de la misma máquina: sigue donde quedó (el cono).
  await page.locator('[data-producido]').first().click();
  await expect(page.locator('#pr-planilla, #pr-agregar-prod').first()).toBeVisible();
  if (await page.locator('#pr-planilla').isVisible()) await page.locator('#pr-btn-agregar-producto').click();
  await expect(page.locator('#pr-agregar-prod')).toBeVisible();
  await expect(page.locator('#pr-agregar-cono')).toBeVisible();
  expect(errores, errores.join('\n')).toEqual([]);
});
