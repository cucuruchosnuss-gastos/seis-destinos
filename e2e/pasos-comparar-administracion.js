// Cómo llevar ADMINISTRACIÓN (en la maqueta, con los datos administracion-super)
// a cada pantalla del diseño "Administración" de Claude Design, para
// compararlas (e2e/13-comparar-administracion.spec.js). Cada paso es
// [id del diseño, tamaño, sección (?seccion=), qué hacer adentro] y corre en una
// pestaña recién abierta, con Nuss elegida en la barra de arriba (como el diseño).
'use strict';
const { expect } = require('@playwright/test');

async function prepararAdministracion(page, base, { seccion = null, unidad = 'u-n' } = {}) {
  page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(new Date('2026-09-28T13:30:00-03:00'));
  await page.addInitScript((u) => {
    try { localStorage.setItem('barraUnidad.elegida', u) } catch { /* sin almacenamiento: la prueba igual corre */ }
  }, unidad);
  const q = seccion ? `&seccion=${encodeURIComponent(seccion)}` : '';
  await page.goto(`${base}/modulos/administracion.html?maqueta=administracion-super${q}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts?.ready);
  await expect(page.locator('#ad-pestanas [aria-current="page"]')).toBeVisible();
}

const COMPU = [1366, 768];
const CELULAR = [390, 844];

const PASOS_COMPARAR_ADMINISTRACION = [
  ['1a', COMPU, null, async (page) => {
    await expect(page.locator('[data-seccion="cobranzas"] .ad-seccion__numero')).toBeVisible();
  }],
  ['2a', COMPU, 'cobranzas', async (page) => {
    await expect(page.locator('#ad-vista-cobranzas')).toBeVisible();
  }],
  ['3a', COMPU, 'ordenes', async (page) => {
    await expect(page.locator('#ad-vista-ordenes')).toBeVisible();
  }],
  ['4a', COMPU, 'revisar', async (page) => {
    await expect(page.locator('#ad-vista-revisar')).toBeVisible();
  }],
  ['5a', COMPU, 'clientes', async (page) => {
    await expect(page.locator('#ad-vista-clientes')).toBeVisible();
  }],
  ['6a', COMPU, 'listas', async (page) => {
    await expect(page.locator('#ad-vista-listas')).toBeVisible();
  }],
  ['7a', COMPU, 'importar', async (page) => {
    await expect(page.locator('#ad-vista-importar')).toBeVisible();
  }],
  ['8a', COMPU, 'seguridad', async (page) => {
    await expect(page.locator('#ad-vista-seguridad')).toBeVisible();
  }],
  ['10a', CELULAR, null, async (page) => {
    await expect(page.locator('[data-seccion="cobranzas"] .ad-seccion__numero')).toBeVisible();
  }],
];

module.exports = { PASOS_COMPARAR_ADMINISTRACION, prepararAdministracion };
