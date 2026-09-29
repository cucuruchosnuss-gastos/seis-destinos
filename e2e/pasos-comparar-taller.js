// Cómo llevar Proyectos Taller (en la maqueta, con los datos taller-diseno,
// taller-edgar y taller-estados) a cada pantalla del diseño de Claude Design
// "Proyectos Taller", para compararlas (e2e/12-comparar-taller.spec.js). Cada
// paso es [id del diseño, tamaño, cómo prepararla, qué hacer adentro] y corre
// sobre una pestaña recién abierta (prepararTaller), así un paso no depende
// del anterior.
'use strict';
const { expect } = require('@playwright/test');

// El reloj del diseño: lunes 28/09/2026, 16:10 en Argentina.
const AHORA = '2026-09-28T19:10:00Z';
const ID = n => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, '0')}`;
const P = { car: ID(0), dos: ID(1), dp: ID(2), per: ID(3), duo: ID(4) };

// Abre la pantalla con el Taller elegido en la barra de arriba (el diseño lo
// dibuja así) y, si se pide, derecho en un proyecto y una pestaña.
async function prepararTaller(page, base, { maqueta = 'taller-diseno', proyecto = null, tab = null, diagrama = false } = {}) {
  page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(new Date(AHORA));
  await page.addInitScript(() => {
    try { localStorage.setItem('barraUnidad.elegida', 'u-t'); } catch { /* sin almacenamiento: la prueba igual corre */ }
  });
  const q = [`maqueta=${maqueta}`];
  if (proyecto) q.push(`proyecto=${proyecto}`);
  if (diagrama) q.push('vista=diagrama');
  await page.goto(`${base}/modulos/taller.html?${q.join('&')}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts?.ready);
  // Las pestañas aparecen recién con el proyecto leído (en el celular la
  // cabecera de la ficha se esconde: el nombre va arriba).
  if (proyecto) await expect(page.locator('#tl-ficha .tl-tabs')).toBeVisible();
  else if (diagrama) await expect(page.locator('#tl-diagrama')).toBeVisible();
  else await expect(page.locator('#tl-lista')).toBeVisible();
  if (tab) await page.locator(`[data-tab="${tab}"]`).click();
}

const COMPU = [1366, 768];
const CELULAR = [390, 844];

const PASOS_COMPARAR_TALLER = [
  ['1a', COMPU, {}, async (page) => {
    await expect(page.locator(`[data-proyecto="${P.car}"]`)).toBeVisible();
  }],
  ['1b', COMPU, { maqueta: 'taller-edgar' }, async (page) => {
    await expect(page.locator(`[data-proyecto="${P.car}"]`)).toBeVisible();
  }],
  ['2a', COMPU, { proyecto: P.car }, async () => {}],
  ['2b', COMPU, { maqueta: 'taller-edgar', proyecto: P.car, tab: 'horas' }, async () => {}],
  ['2c', COMPU, { proyecto: P.car, tab: 'notas' }, async () => {}],
  ['2d', COMPU, { proyecto: P.car, tab: 'archivos' }, async () => {}],
  ['3a', COMPU, { proyecto: P.car }, async (page) => {
    await page.locator('[data-accion="facturar"]:visible').click();
    await page.locator('#tl-venta-importe').fill('1960000');
    await page.locator('#tl-venta-concepto').fill('Avance: bastidor y transmisión armados');
    await page.locator('#tl-venta-importe').dispatchEvent('input');
  }],
  ['3b', COMPU, { proyecto: P.dos }, async (page) => {
    await page.locator('[data-accion="fabrica"]:visible').click();
    await expect(page.locator('#tl-venta-importe')).toBeVisible();
  }],
  ['4a', COMPU, {}, async (page) => {
    await page.locator('#tl-btn-valor-hora').click();
    await page.locator('#tl-hora-valor').fill('20000');
    await page.locator('#tl-hora-desde').fill('2026-10-01');
  }],
  ['5a', COMPU, { maqueta: 'taller-estados', proyecto: P.per, tab: 'horas' }, async () => {}],
  ['5b', COMPU, {}, async (page) => {
    await page.locator('#tl-filtro-estado [data-filtro-estado="cancelado"]').click();
    await page.locator('#tl-filtro-destino').selectOption('interno');
    await expect(page.locator('[data-accion="sacar-filtros"]')).toBeVisible();
  }],
  ['5c', COMPU, { maqueta: 'taller-estados' }, async (page) => {
    await expect(page.locator('[data-accion="reintentar-lista"]')).toBeVisible();
  }],
  ['6a', CELULAR, {}, async (page) => {
    await expect(page.locator(`[data-proyecto="${P.car}"]`)).toBeVisible();
  }],
  ['6b', CELULAR, { proyecto: P.car, tab: 'archivos' }, async () => {}],
  ['7a', COMPU, { diagrama: true }, async (page) => {
    await expect(page.locator('[data-tarea="t01"]').first()).toBeVisible();
  }],
  ['7b', COMPU, { diagrama: true }, async (page) => {
    await page.locator('[data-agrupar="proyecto"]').click();
    await expect(page.locator('[data-agrupar="proyecto"][aria-pressed="true"]')).toBeVisible();
  }],
  ['7c', COMPU, { diagrama: true }, async (page) => {
    await page.locator('[data-tarea="t07"]').first().click();
    await expect(page.locator('.tl-panel-act')).toBeVisible();
  }],
  ['7d', CELULAR, { maqueta: 'taller-edgar', diagrama: true }, async (page) => {
    await expect(page.locator('.tl-mis')).toBeVisible();
  }],
];

module.exports = { PASOS_COMPARAR_TALLER, prepararTaller, AHORA };
