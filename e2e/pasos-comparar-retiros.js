// Cómo llevar la CARGA DE ÓRDENES DE RETIRO (en la maqueta, con los datos
// `retiros`) a cada pantalla del diseño "Órdenes de retiro" de Claude Design,
// para compararlas (e2e/15-comparar-retiros.spec.js). Cada paso es
// [id del diseño, tamaño, qué hacer] y corre en una pestaña recién abierta.
//
// No se comparan (y lo dice el traspaso de la parte 4): 1j "Sin datos",
// 1k "Cargando" y 1l "Error al confirmar" (piden otro juego de datos de la
// maqueta), y 3a / 3b "Hoja impresa" (la hoja la mide medirHoja() en
// e2e/5-maqueta.spec.js: dos copias y el corte dentro de una A4).
'use strict';
const { expect } = require('@playwright/test');

async function prepararRetiros(page, base) {
  page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(new Date('2026-09-28T13:30:00-03:00'));
  await page.goto(`${base}/modulos/retiros.html?maqueta=retiros`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts?.ready);
  await expect(page.locator('[data-empresa]').first()).toBeVisible();
}

const COMPU = [1366, 768];
const CELULAR = [390, 844];

async function empresa(page) {
  await page.locator('[data-empresa="u-n"]').click()
}
async function cliente(page) {
  await empresa(page)
  await page.locator('#rt-cliente-buscar').fill('turco')
  await page.locator('[data-cliente]').first().click()
}
async function producto(page, cajas) {
  await cliente(page)
  await page.locator('[data-r-producto]').first().click()
  await page.locator('[data-r-cajas="0"]').fill(String(cajas))
  await page.locator('[data-r-completar="0"]').click()
}
async function volverSiHaceFalta(page) {
  if (await page.locator('#rt-editor-volver').isVisible()) await page.locator('#rt-editor-volver').click()
}

const PASOS_COMPARAR_RETIROS = [
  ['1a', CELULAR, async (page) => { await expect(page.locator('#rt-vista-empresa')).toBeVisible() }],
  ['1b', CELULAR, async (page) => {
    await empresa(page)
    await page.locator('#rt-cliente-buscar').fill('tur')
    await expect(page.locator('[data-cliente]').first()).toBeVisible()
  }],
  ['1c', CELULAR, async (page) => {
    await cliente(page)
    await expect(page.locator('.rt-grupo--con-cono')).toBeVisible()
  }],
  ['1d', CELULAR, async (page) => {
    await producto(page, 20)
    await expect(page.locator('[data-r-lotes-resumen="0"]')).toContainText('Falta asignar 0')
  }],
  ['1e', CELULAR, async (page) => {
    await producto(page, 30)
    await expect(page.locator('[data-r-faltante-caja="0"] [data-r-faltante]')).toBeVisible()
  }],
  ['1f', CELULAR, async (page) => {
    await producto(page, 20)
    await volverSiHaceFalta(page)
    await expect(page.locator('#rt-revisar')).toBeVisible()
  }],
  ['1g', CELULAR, async (page) => {
    await producto(page, 20)
    await volverSiHaceFalta(page)
    await page.locator('#rt-revisar').click()
    await expect(page.locator('#rt-resumen')).toBeVisible()
  }],
  ['1h', CELULAR, async (page) => {
    await producto(page, 20)
    await volverSiHaceFalta(page)
    await page.locator('#rt-revisar').click()
    await page.locator('#rt-confirmar').click()
    await expect(page.locator('.rt-codigo-grande')).toBeVisible()
  }],
  ['1i', CELULAR, async (page) => {
    await empresa(page)
    await page.locator('#rt-btn-mis').click()
    await expect(page.locator('#rt-mis-lista > *').first()).toBeVisible()
  }],
  ['2a', COMPU, async (page) => {
    await producto(page, 20)
    await expect(page.locator('#rt-revisar')).toBeVisible()
  }],
  ['2b', COMPU, async (page) => {
    await empresa(page)
    await page.locator('#rt-btn-mis').click()
    await expect(page.locator('#rt-mis-lista > *').first()).toBeVisible()
  }],
];

module.exports = { PASOS_COMPARAR_RETIROS, prepararRetiros };
