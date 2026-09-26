// LA REVISIÓN VISUAL, SOLA (26/09/2026): cada pantalla que tiene datos en
// e2e/maqueta/datos, abierta en la maqueta (Supabase falso, sin sesión ni
// base) a 390 y a 1280 px. Falla si hay scroll horizontal o un error de
// JavaScript, y guarda una captura de cada una como artefacto. Corre SIEMPRE,
// sin credenciales.
//
// Una pantalla nueva es una entrada de PANTALLAS (y su archivo de datos).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = 'http://localhost:4180';

// [archivo, datos, pasos opcionales para llegar a una vista]
const PANTALLAS = [
  ['modulos/retiros.html', 'retiros', [
    ['empresa', async (page) => { await page.locator('[data-empresa]').first().click() }],
    ['cargar', async (page) => {
      await page.locator('#rt-cliente-buscar').fill('turco')
      await page.locator('[data-cliente]').first().click()
      await page.locator('[data-r-producto]').first().click()
      await page.locator('[data-r-cajas="0"]').fill('3')
      await page.locator('[data-r-lote-abrir="0"]').click()
    }],
    ['resumen', async (page) => { await page.locator('#rt-revisar').click() }],
    ['hecho', async (page) => { await page.locator('#rt-confirmar').click(); await expect(page.locator('.rt-codigo-grande')).toBeVisible() }],
  ]],
  ['modulos/administracion.html', 'administracion', [
    ['portada', async () => {}],
    ['ordenes', async (page) => { await page.locator('[data-seccion="ordenes"]').click(); await expect(page.locator('[data-orden]').first()).toBeVisible() }],
    ['valorizar', async (page) => { await page.locator('[data-orden="o1"]').click(); await page.locator('#ad-btn-valorizar').click(); await expect(page.locator('[data-precio]').first()).toBeVisible() }],
    ['clientes', async (page) => { await page.locator('#ad-orden-volver').click(); await page.locator('#ad-ordenes-volver').click(); await page.locator('[data-seccion="clientes"]').click(); await expect(page.locator('[data-cliente]').first()).toBeVisible() }],
    ['ficha', async (page) => { await page.locator('[data-cliente="c1"]').click(); await page.locator('#ad-btn-ficha').click(); await expect(page.locator('#ad-f-nombre')).toHaveValue(/Anatolia/) }],
    ['listas', async (page) => { await page.locator('#ad-ficha-volver').click(); await page.locator('#ad-cliente-volver').click(); await page.locator('#ad-clientes-volver').click(); await page.locator('[data-seccion="listas"]').click(); await page.locator('[data-lista="l1"]').click(); await expect(page.locator('[data-precio-lista]').first()).toBeVisible() }],
  ]],
];

for (const [archivo, datos, pasos] of PANTALLAS) {
  for (const ancho of [390, 1280]) {
    test(`maqueta: ${archivo} a ${ancho} px, sin scroll horizontal ni errores`, async ({ page }, info) => {
      await page.setViewportSize({ width: ancho, height: ancho < 800 ? 844 : 900 });
      const errores = vigilarErrores(page);
      await page.goto(`${MAQUETA}/${archivo}?maqueta=${datos}`);
      for (const [nombre, paso] of pasos) {
        await test.step(nombre, async () => {
          await paso(page);
          await page.waitForTimeout(150);
          const { ancho: doc, vista } = await page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, vista: window.innerWidth }));
          expect(doc, `scroll horizontal en ${nombre}: el documento mide ${doc} px y la pantalla ${vista}`).toBeLessThanOrEqual(vista);
          await captura(page, `maqueta-${datos}-${nombre}-${ancho}`, info);
        });
      }
      expect(errores, errores.join('\n')).toEqual([]);
    });
  }
}
