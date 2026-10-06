// Los pasos para recorrer la planta en la maqueta (28/09/2026): los usan
// e2e/8-planta-tamanos.spec.js (la prueba) y e2e/recorrer-planta.js (para
// mirar). Cada paso es [nombre, fn(page), ¿se mide?]. La maqueta tiene los
// datos de pruebas/datos-maqueta/produccion.js.
//
// Planta v2 (28/09/2026): el PIN se manda solo con el último número (no hay
// tecla "Entrar"); Agregar producto va Producto → Cono → Presentación → (Caja)
// → Cajas; la ventana de lotes marca un renglón y "Usar …" lo pone.
const { expect } = require('@playwright/test')

async function marcarPin(page, pin, dentro = '#pr-pin-teclado') {
  const teclado = page.locator(dentro)
  await expect(teclado).toBeVisible()
  for (const d of pin) await teclado.locator(`[data-tecla="${d}"]`).click()
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
    const maquina = page.locator('#pr-abrir [data-abrir-maquina]:not([disabled])').first()
    if (await maquina.count()) await maquina.click()
    await page.waitForTimeout(100)
  }],
  ['planilla', async (page) => {
    await page.locator('#pr-barra [data-seccion="inicio"]').click()
    await page.locator('[data-producido]').first().click()
    await expect(page.locator('#pr-planilla')).toBeVisible()
    await expect(page.locator('#pr-planilla-producido')).toContainText('7033-6')
  }],
  ['lo-producido-producto', async (page) => {
    await page.locator('#pr-btn-agregar-producto').click()
    await expect(page.locator('#pr-agregar-prod')).toBeVisible()
    await expect(page.locator('[data-ag-producto]').first()).toBeVisible()
  }],
  ['lo-producido-cono', async (page) => {
    await page.locator('[data-ag-producto]').first().click()
    await expect(page.locator('#pr-agregar-cono')).toBeVisible()
    await expect(page.locator('#pr-agregar-marcas [data-marca]').nth(3)).toBeVisible()
  }],
  ['lo-producido-presentacion', async (page) => {
    await page.locator('#pr-agregar-marcas [data-marca]').nth(2).click()
    await expect(page.locator('[data-ag-presentacion]').first()).toBeVisible()
  }],
  ['lo-producido-cajas', async (page) => {
    await page.locator('[data-ag-presentacion]').first().click()
    const caja = page.locator('[data-ag-caja]').first()
    if (await caja.isVisible().catch(() => false)) await caja.click()
    await expect(page.locator('#pr-agregar-cajas-panel')).toBeVisible()
  }],
  ['paradas', async (page) => {
    await page.locator('#pr-barra [data-seccion="paradas"]').click()
    await expect(page.locator('#pr-paradas')).toBeVisible()
  }],
  // Paró (05/10/2026): un motivo, DESDE y HASTA con la ventana de la hora
  // (lo más alto que se pone la pantalla: con HASTA aparece "Volvió con lote
  // nuevo"). Todo tiene que entrar sin scroll a 1000 × 540.
  ['paradas-anotar', async (page) => {
    await page.locator('#pr-parada-sugerencias .pr-motivo').first().click()
    await page.locator('#pr-parada-hora [data-parada-hora="inicio"]').click()
    await expect(page.locator('#pr-hora-ventana')).toBeVisible()
  }],
  // La ventana de la hora, con el teclado de la planta.
  ['paradas-hora', async (page) => {
    for (const d of '1500') await page.locator(`#pr-hora-ventana [data-hv-tecla="${d}"]`).click()
    await expect(page.locator('#pr-hora-ventana-hora')).toContainText('15:00')
  }],
  ['paradas-hasta', async (page) => {
    await page.locator('#pr-hora-ventana-guardar').click()
    await page.locator('#pr-parada-hora [data-parada-hora="fin"]').click()
    for (const d of '1600') await page.locator(`#pr-hora-ventana [data-hv-tecla="${d}"]`).click()
    await page.locator('#pr-hora-ventana-guardar').click()
    await expect(page.locator('#pr-parada-hora [data-parada-lote-nuevo]')).toBeVisible()
    await expect(page.locator('#pr-parada-resumen')).toBeVisible()
  }],
  ['cerrar-planilla', async (page) => {
    await page.locator('#pr-barra [data-seccion="cierre"]').click()
    await expect(page.locator('#pr-cierre')).toBeVisible()
  }],
  // Terminó de producir antes: "¿Por qué paró antes?" con los motivos.
  ['cerrar-antes', async (page) => {
    await page.locator('#pr-cierre-hora').click()
    for (const d of '1310') await page.locator(`#pr-hora-ventana [data-hv-tecla="${d}"]`).click()
    await page.locator('#pr-hora-ventana-guardar').click()
    await expect(page.locator('#pr-cierre-campo-motivo')).toBeVisible()
  }],
  // El botón de volver (30/09/2026): "‹ Inicio" lleva al Inicio del modo.
  ['volver-inicio', async (page) => {
    await page.locator('#pr-cab-volver').click()
    await expect(page.locator('#pr-produccion')).toBeVisible()
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
  ['volver-sala', async (page) => {
    await page.locator('#pr-cab-volver').click()
    await expect(page.locator('#pr-sala')).toBeVisible()
  }],
]

module.exports = { PASOS_PLANTA, marcarPin }
