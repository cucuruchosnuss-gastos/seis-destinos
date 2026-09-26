// El recorrido de la GESTIÓN, con la cuenta personal del robot, en un celular
// (390 px) y en una pantalla grande (1440 px). Corre DESPUÉS de la planta: el
// historial tiene que mostrar el turno que la planta acaba de cerrar.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { avisoSinCredenciales, entrarComo, sesionDelRobot, limpiarFabrica, vigilarErrores, captura } = require('./ayuda');

const loteDeLaPlanta = () => {
  try { return fs.readFileSync(path.join(__dirname, 'resultados', 'ultimo-lote.txt'), 'utf8').trim(); } catch { return ''; }
};

test.describe('gestión', () => {
  test.skip(!!avisoSinCredenciales('gestion'), avisoSinCredenciales('gestion'));

  test.afterAll(async () => {
    console.log('limpieza después:', JSON.stringify(await limpiarFabrica(await sesionDelRobot('gestion'))));
  });

  for (const ancho of [390, 1440]) {
    test(`indicadores, personal e historial a ${ancho} px`, async ({ page, context }, info) => {
      await page.setViewportSize({ width: ancho, height: ancho < 800 ? 844 : 900 });
      const errores = vigilarErrores(page);
      await entrarComo(context, 'gestion');

      await test.step('entra a la gestión sin PIN', async () => {
        await page.goto('/modulos/produccion-gestion.html');
        await expect(page.locator('#pr-indicadores')).toBeVisible();
        await expect(page.locator('#pr-pin-teclado')).toHaveCount(0);
      });

      await test.step('los indicadores cargan con la unidad de pruebas', async () => {
        const ind = page.locator('#pr-indicadores');
        await expect(ind).toContainText('Ahora');
        await expect(ind.locator('.pr-ind__vacio', { hasText: 'Cargando…' })).toHaveCount(0, { timeout: 30000 });
        await expect(ind.locator('.pr-ind__error')).toHaveCount(0);
        await expect(page.locator('body')).toContainText('Pruebas (robot)');
        await captura(page, `gestion-indicadores-${ancho}`, info);
      });

      // Desde el diseño de la gestión (26/09/2026) cada sección es un renglón
      // del menú: en la compu una barra lateral siempre a la vista; en el
      // celular se abre con "Menú" y cada sección tiene "‹ Menú".
      const abrirMenuSiCelular = async () => { if (ancho < 900) await page.locator('#pr-btn-menu').click(); };

      await test.step('Personal y PINes', async () => {
        await abrirMenuSiCelular();
        await page.locator('[data-ir-config="personal"]').click();
        await expect(page.locator('#pr-config')).toBeVisible();
        await expect(page.locator('#pr-config-cuerpo')).toContainText('Robot Encargado');
        await expect(page.locator('#pr-config-cuerpo')).toContainText('Robot Masero');
        await captura(page, `gestion-personal-${ancho}`, info);
      });

      await test.step('el historial muestra el turno recién cerrado', async () => {
        if (ancho < 900) await page.locator('#pr-config-volver').click();
        await page.locator('#pr-menu-historial').click();
        await expect(page.locator('#pr-historial')).toBeVisible();
        const lote = loteDeLaPlanta();
        if (lote) {
          const fila = page.locator('#pr-historial-lista [data-historial-turno]', { hasText: lote });
          await expect(fila).toBeVisible({ timeout: 30000 });
          await captura(page, `gestion-historial-${ancho}`, info);
          await fila.click();
          await expect(page.locator('#pr-historial-detalle-cuerpo')).toContainText(`${lote}-1`);
          await expect(page.locator('#pr-historial-detalle-cuerpo')).toContainText('Parada del robot de pruebas');
          await captura(page, `gestion-detalle-${ancho}`, info);
        } else {
          info.annotations.push({ type: 'aviso', description: 'La planta no dejó un lote: solo se verifica que el historial abra.' });
          await captura(page, `gestion-historial-${ancho}`, info);
        }
      });

      expect(errores, errores.join('\n')).toEqual([]);
    });
  }
});
