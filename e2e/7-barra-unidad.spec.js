// La barra de unidad de negocio (js/barra-unidad.js, 28/09/2026), en la
// maqueta: arriba de la pantalla, en compu y celular, sin scroll horizontal,
// con "Todas" y las unidades de la persona; elegir una la recuerda al
// recargar; la planta no la carga. Corre SIEMPRE, sin credenciales.
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const PANTALLAS = [
  ['modulos/administracion.html', 'administracion'],
  ['modulos/pedidos.html', 'pedidos'],
  ['modulos/produccion-gestion.html', 'produccion-gestion'],
  ['modulos/taller.html', 'taller'],
  // Los módulos que filtran por la barra (28/09/2026), con sus datos de maqueta.
  ['modulos/cuentas-corrientes.html', 'cuentas-corrientes'],
  ['modulos/materia-prima.html', 'materia-prima'],
  ['modulos/cobranzas.html', 'cobranzas'],
  ['modulos/caja.html', 'caja'],
  ['modulos/gastos.html', 'gastos'],
  ['modulos/stock.html', 'stock'],
];

for (const [archivo, datos] of PANTALLAS) {
  for (const ancho of [390, 1280]) {
    test(`barra de unidad en ${archivo} a ${ancho} px`, async ({ page }, info) => {
      const errores = vigilarErrores(page);
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto(`${MAQUETA}/${archivo}?maqueta=${datos}`);
      const barra = page.locator('nav.barra-unidad');
      await expect(barra).toBeVisible();
      const chips = barra.locator('.barra-unidad__chip');
      expect(await chips.count(), 'Todas y por lo menos dos unidades').toBeGreaterThanOrEqual(3);
      await expect(chips.first()).toHaveText('Todas');
      await expect(chips.first()).toHaveAttribute('aria-pressed', 'true');
      const { doc, vista, arriba } = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth, vista: window.innerWidth,
        arriba: document.querySelector('nav.barra-unidad').getBoundingClientRect().top,
      }));
      expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
      expect(arriba, 'la barra va arriba de todo').toBeLessThanOrEqual(1);
      // Elegir la segunda unidad y recargar: sigue elegida.
      await chips.nth(1).click();
      await expect(chips.nth(1)).toHaveAttribute('aria-pressed', 'true');
      await page.reload();
      await expect(page.locator('nav.barra-unidad .barra-unidad__chip').nth(1)).toHaveAttribute('aria-pressed', 'true');
      await captura(page, `barra-unidad-${datos}-${ancho}`, info);
      expect(errores, errores.join('\n')).toEqual([]);
    });
  }
}

test('la planta no carga la barra de unidad', async ({ page }) => {
  const html = await (await page.request.get(`${MAQUETA}/modulos/produccion.html`)).text();
  expect(html).not.toContain('barra-unidad.js');
});
