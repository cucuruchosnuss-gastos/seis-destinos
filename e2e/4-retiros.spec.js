// El recorrido de las ÓRDENES DE RETIRO en la fábrica de pruebas (26/09/2026):
// la CARGA en el depósito (sin plata) y la VALORIZACIÓN en Administración.
//
// Necesita una cuenta del robot con retiros:cargar, ver, precios y anular en la
// unidad "Pruebas (robot)" (E2E_RETIROS_EMAIL), al menos un cliente activo de
// esa unidad y un producto con presentación. Esa cuenta y esos datos todavía no
// existen: el recorrido se saltea con un aviso hasta que se creen (ver el
// traspaso del 26/09/2026). Al terminar, ANULA la orden: devuelve las cajas a su
// lote y cancela la deuda, así la fábrica de pruebas queda como estaba.
const { test, expect } = require('@playwright/test');
const { avisoSinCredenciales, entrarComo, vigilarErrores, captura } = require('./ayuda');

test.describe('órdenes de retiro', () => {
  test.skip(!!avisoSinCredenciales('retiros'), avisoSinCredenciales('retiros'));

  for (const ancho of [390, 1280]) {
    test(`cargar un retiro sin plata y valorizarlo en Administración a ${ancho} px`, async ({ page, context }, info) => {
      await page.setViewportSize({ width: ancho, height: ancho < 800 ? 844 : 900 })
      const errores = vigilarErrores(page)
      await entrarComo(context, 'retiros')
      let codigo = ''

      await test.step('la carga: una sola empresa, no pregunta', async () => {
        await page.goto('/modulos/retiros.html')
        await expect(page.locator('#rt-vista-form')).toBeVisible({ timeout: 30000 })
        await expect(page.locator('#rt-empresa-actual')).toContainText('Pruebas (robot)')
      })

      await test.step('cliente, producto, cajas y confirmar', async () => {
        await page.locator('#rt-cliente-buscar').fill('')
        const cliente = page.locator('#rt-clientes-resultados [data-cliente]').first()
        await expect(cliente).toBeVisible({ timeout: 30000 })
        await cliente.click()
        await page.locator('[data-r-producto]').first().click()
        const presentacion = page.locator('[data-r-presentacion]').first()
        if (await presentacion.getAttribute('aria-pressed') !== 'true') await presentacion.click()
        await page.locator('[data-r-cajas="0"]').fill('1')
        await captura(page, `retiros-carga-${ancho}`, info)
        await page.locator('#rt-revisar').click()
        await expect(page.locator('#rt-vista-resumen')).toBeVisible()
        // NADA DE PLATA en la carga.
        await expect(page.locator('body')).not.toContainText('$')
        await page.locator('#rt-confirmar').click()
        await expect(page.locator('#rt-vista-hecho')).toBeVisible({ timeout: 30000 })
        codigo = (await page.locator('.rt-codigo-grande').textContent()).trim()
        expect(codigo).toMatch(/^[A-Z]-\d{4}$/)
        await captura(page, `retiros-hecho-${ancho}`, info)
      })

      await test.step('"Mis retiros" la muestra', async () => {
        await page.locator('#rt-otra').click()
        await page.locator('#rt-btn-mis').click()
        await expect(page.locator('#rt-mis-lista')).toContainText(codigo, { timeout: 30000 })
      })

      await test.step('Administración la valoriza', async () => {
        await page.goto('/modulos/administracion.html')
        await page.locator('[data-seccion="ordenes"]').click()
        const fila = page.locator('#ad-ordenes-lista [data-orden]', { hasText: codigo })
        await expect(fila).toBeVisible({ timeout: 30000 })
        await expect(fila).toContainText('Sin valorizar')
        await fila.click()
        await page.locator('#ad-btn-valorizar').click()
        const precios = page.locator('[data-precio]')
        await expect(precios.first()).toBeVisible({ timeout: 30000 })
        for (let i = 0; i < await precios.count(); i++) {
          if (!(await precios.nth(i).inputValue())) await precios.nth(i).fill('1')
        }
        await captura(page, `retiros-valorizar-${ancho}`, info)
        await page.locator('#ad-valorizar-guardar').click()
        await expect(page.locator('#ad-orden-cuerpo')).toContainText('Valorizada', { timeout: 30000 })
      })

      await test.step('y la anula, para dejar la fábrica de pruebas como estaba', async () => {
        await page.locator('#ad-btn-anular').click()
        await page.locator('#ad-anular-motivo').fill('Recorrido del robot de pruebas')
        await page.locator('#ad-anular-si').click()
        await expect(page.locator('#ad-orden-cuerpo')).toContainText('Anulada', { timeout: 30000 })
      })

      expect(errores, errores.join('\n')).toEqual([])
    })
  }
})
