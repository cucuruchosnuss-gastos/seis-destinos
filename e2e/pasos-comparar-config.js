// Cómo llevar la CONFIGURACIÓN de la gestión de Producción (en la maqueta, con
// los datos config-produccion) a cada pantalla del diseño de Claude Design, para
// compararlas (e2e/10-comparar-config.spec.js). Cada paso es
// [id del diseño, fn(page)] y corre sobre una pestaña recién abierta en la
// sección que dice su id (prepararConfig), así un paso no depende del anterior.
'use strict';
const { expect } = require('@playwright/test');
const datos = require('../pruebas/datos-maqueta/config-produccion');

// Abre la gestión con la unidad elegida en la barra y el aviso del prototipo ya
// leído (el diseño no lo dibuja), y entra a Configuración → la sección pedida.
async function prepararConfig(page, base, { unidad = 'u-n', seccion = 'productos' } = {}) {
  page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(new Date(datos.ahora));
  await page.addInitScript((u) => {
    try {
      localStorage.setItem('barraUnidad.elegida', u);
      localStorage.setItem('produccion.aviso-productos-revisado', '1');
    } catch { /* sin almacenamiento: la prueba igual corre */ }
  }, unidad);
  await page.goto(`${base}/modulos/produccion-gestion.html?maqueta=config-produccion`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts?.ready);
  const enMenu = page.locator(`[data-ir-config="${seccion}"]`).first();
  if (!(await enMenu.isVisible())) await page.locator('#pr-btn-menu').click();
  await enMenu.click();
  await expect(page.locator('#pr-config')).toBeVisible();
}

const COMPU = [1366, 768];
const CELULAR = [390, 844];

// [id, tamaño, cómo prepararla, qué hacer adentro]
const PASOS_COMPARAR_CONFIG = [
  ['1a', COMPU, { seccion: 'productos' }, async (page) => {
    await expect(page.locator('[data-cfg-sel="p-mini"]')).toBeVisible();
  }],
  ['2a', COMPU, { seccion: 'maquinas' }, async (page) => {
    await expect(page.locator('[data-cfg-sel="maq-1"]')).toBeVisible();
  }],
  ['3a', COMPU, { seccion: 'recetas' }, async (page) => {
    await expect(page.locator('[data-cfg-sel="maq-1"]')).toBeVisible();
  }],
  ['4a', COMPU, { seccion: 'ingredientes' }, async (page) => {
    await page.locator('[data-cfg-sel="g-grasa"]').click();
    await expect(page.locator('[data-cfg-sel="g-grasa"][aria-pressed="true"]')).toBeVisible();
  }],
  ['5a', COMPU, { seccion: 'marcas' }, async (page) => {
    await page.locator('#pr-config-marca-buscar').fill('cas');
    await page.waitForTimeout(250);
  }],
  ['6a', COMPU, { seccion: 'personal' }, async (page) => {
    await page.locator('[data-puesto="masero"][data-persona-puesto="emp-diego"]').check({ force: true });
  }],
  ['7a', CELULAR, { unidad: 'u-d', seccion: 'productos' }, async (page) => {
    await expect(page.locator('[data-cfg-sel="d-b40-4"]')).toBeVisible();
  }],
  ['7b', CELULAR, { unidad: 'u-d', seccion: 'productos' }, async (page) => {
    await page.locator('[data-cfg-sel="d-b40-4"]').click();
    await expect(page.locator('[data-prod-activo="d-b40-4"]')).toBeAttached();
  }],
];

module.exports = { PASOS_COMPARAR_CONFIG, prepararConfig };
