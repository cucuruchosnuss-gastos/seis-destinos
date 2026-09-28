// Los pasos para recorrer la planta en la maqueta (28/09/2026): los usan
// e2e/8-planta-tamanos.spec.js (la prueba) y e2e/recorrer-planta.js (para
// mirar). Cada paso es [nombre, fn(page), ¿se mide?]. La maqueta tiene los
// datos de pruebas/datos-maqueta/produccion.js.
const { expect } = require('@playwright/test')

async function marcarPin(page, pin, dentro = '#pr-pin-teclado') {
  const teclado = page.locator(dentro)
  await expect(teclado).toBeVisible()
  for (const d of pin) await teclado.locator(`[data-tecla="${d}"]`).click()
  await teclado.locator('[data-tecla="entrar"]').click()
}
const persona = (page, nombre) => page.locator('#pr-quien-lista [data-persona]', { hasText: nombre })

const PASOS_PLANTA = [
  ['quien-sos', async (page) => { await expect(persona(page, 'Federico Silva')).toBeVisible() }],
  ['pin', async (page) => {
    await persona(page, 'Federico Silva').click()
    await expect(page.locator('#pr-pin-teclado [data-tecla="0"]')).toBeVisible()
  }],
  ['pin-maestro', async (page) => {
    await page.locator('#pr-pin-otra').click()
    await page.locator('#pr-btn-maestro').click()
    await expect(page.locator('#pr-pin-teclado [data-tecla="0"]')).toBeVisible()
  }],
  ['entrar', async (page) => {
    await page.locator('#pr-pin-otra').click()
    await persona(page, 'Federico Silva').click()
    await marcarPin(page, '4826')
    await expect(page.locator('#pr-barra')).toContainText('Federico Silva')
  }, false],
  ['tablero', async (page) => { await expect(page.locator('[data-producido]').first()).toBeVisible() }],
  ['abrir-turno', async (page) => {
    await page.locator('#pr-barra [data-seccion="abrir"]').click()
    await expect(page.locator('#pr-abrir')).toBeVisible()
  }],
  ['abrir-turno-operarios', async (page) => {
    const casilla = page.locator('#pr-abrir [data-elegir-maquina], #pr-abrir .pr-casilla').first()
    await casilla.click()
    await page.waitForTimeout(100)
  }],
  ['lo-producido-producto', async (page) => {
    await page.locator('#pr-barra [data-seccion="inicio"]').click()
    await page.locator('[data-producido]').first().click()
    await expect(page.locator('#pr-agregar-prod')).toBeVisible()
    await expect(page.locator('[data-ag-producto]').first()).toBeVisible()
  }],
  ['lo-producido-cono-si-no', async (page) => {
    await page.locator('[data-ag-producto]').first().click()
    await expect(page.locator('[data-ag-cono="1"]')).toBeVisible()
  }],
  ['lo-producido-presentacion', async (page) => {
    await page.locator('[data-ag-cono="1"]').click()
    await expect(page.locator('[data-ag-presentacion]').first()).toBeVisible()
  }],
  ['lo-producido-cono', async (page) => {
    await page.locator('[data-ag-presentacion]').first().click()
    await expect(page.locator('#pr-agregar-marcas [data-marca]').nth(3)).toBeVisible()
  }],
  ['lo-producido-caja', async (page) => {
    await page.locator('#pr-agregar-marcas [data-marca]').nth(2).click()
    await expect(page.locator('[data-ag-caja]').first()).toBeVisible()
  }],
  ['lo-producido-cajas', async (page) => {
    await page.locator('[data-ag-caja]').first().click()
    await expect(page.locator('#pr-agregar-cajas')).toBeVisible()
  }],
  ['planilla', async (page) => {
    await page.locator('#pr-barra [data-seccion="paradas"]').click()
    await expect(page.locator('#pr-planilla')).toBeVisible()
    await expect(page.locator('#pr-planilla-producido')).toContainText('7033-6')
  }],
  ['cerrar-planilla', async (page) => {
    await page.locator('#pr-barra [data-seccion="cierre"]').click()
    await expect(page.locator('#pr-cierre')).toBeVisible()
  }],
  ['ir-a-sala', async (page) => {
    await page.locator('#pr-barra [data-modo="masa"]').click()
    await persona(page, 'Agustín Barrera').click()
    await marcarPin(page, '7391')
  }, false],
  ['sala', async (page) => { await expect(page.locator('#pr-sala')).toBeVisible() }],
  ['receta', async (page) => {
    await page.locator('[data-sala-turno="t1"]').first().click()
    await expect(page.locator('#pr-receta')).toContainText('Esencia de vainilla')
  }],
  ['receta-modificar', async (page) => {
    await page.locator('#pr-receta-opciones [data-base="modificar"]').click()
  }],
  ['lotes', async (page) => {
    await page.locator('[data-lote="i-harina"]').first().click()
    await expect(page.locator('#pr-lote-panel')).toBeVisible()
  }],
  // Parte 0 (28/09/2026): escribir un lote que no está en la lista, desde la
  // ventana, y que el campo entre sin scroll.
  ['lote-escribir', async (page) => {
    await page.locator('#pr-lote-panel-otros [data-lote-escribir]').click()
    await expect(page.locator('#pr-lote-panel-escribir')).toBeVisible()
    await expect(page.locator('#pr-lote-panel-usar')).toBeVisible()
  }],
  ['historial-maquina', async (page) => {
    await page.locator('#pr-lote-panel-cerrar').click()
    await page.locator('[data-lateral-turno]').first().click()
    await expect(page.locator('#pr-hist-maq')).toBeVisible()
  }],
]

module.exports = { PASOS_PLANTA, marcarPin }
