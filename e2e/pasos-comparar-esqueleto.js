// Cómo llevar el dashboard (en la maqueta) a cada pantalla del diseño
// "Esqueleto" (e2e/disenos/esqueleto), para compararlas
// (e2e/11-comparar-esqueleto.spec.js). Cada paso es [id del diseño,
// fn(page, base)] y abre su propia página: las pantallas usan juegos de datos
// distintos (el dueño, Lucía con solo Gastos y Caja, Facundo con los estados).
//
// Las preferencias (fijados, orden, escondidas) y la fábrica elegida se ponen
// en el navegador ANTES de abrir, como las dejaría la persona: así la barra y
// el tablero arrancan como los dibujó el diseño.
'use strict';
const { expect } = require('@playwright/test');
const datos = require('../pruebas/datos-maqueta/tablero');

const AHORA = new Date(datos.ahora);
// Los fijados del dueño en el diseño (la barra de 1a: Producción, Cobranzas y
// Caja arriba, con su divisor) y Seguridad escondida en el tablero (5a y 6a).
const PREFS_DUENO = { barra: { orden: 'mano', manual: [], fijados: ['produccion', 'cobranzas', 'caja'] }, tablero: { orden: [], tamanos: {}, ocultas: [] } };

async function abrir(page, base, { datos: nombre, prefs = null, empleado = 'emp-pablo', elegida = 'todas', colapsada = '0', vista = '' }) {
  page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(AHORA);
  // Una página sin JavaScript (del mismo origen) para dejar las preferencias:
  // login.html redirigiría al dashboard sin los datos de la maqueta.
  await page.goto(`${base}/manifest.json`);
  await page.evaluate(([p, e, u, c]) => {
    localStorage.clear();
    if (p) localStorage.setItem(`sd.prefs.${e}`, p);
    localStorage.setItem('barraUnidad.elegida', u);
    localStorage.setItem('barraLateral.colapsada', c);
  }, [prefs ? JSON.stringify(prefs) : null, empleado, elegida, colapsada]);
  await page.goto(`${base}/dashboard.html?maqueta=${nombre}${vista ? `&vista=${vista}` : ''}`);
  await page.evaluate(() => document.fonts?.ready);
}

async function tableroListo(page, n) {
  await expect(page.locator('#grilla-modulos [data-tarjeta]')).toHaveCount(n);
  await expect(page.locator('.tb-tarjeta--cargando')).toHaveCount(0);
}

const PASOS_1366 = [
  ['1a', async (page, base) => {
    await abrir(page, base, { datos: 'tablero', prefs: PREFS_DUENO });
    await tableroListo(page, 14);
    await expect(page.locator('#dashboard-titulo')).toContainText('Buen día, Pablo');
    await expect(page.locator('#tb-franja')).toContainText('máquina parada');
  }],
  ['2a', async (page, base) => {
    await abrir(page, base, { datos: 'tablero-lucia', empleado: 'emp-lucia', elegida: 'u-n', prefs: { tablero: { orden: ['gastos', 'caja'] } } });
    await tableroListo(page, 2);
    await expect(page.locator('#tb-franja')).toBeHidden();
    await expect(page.locator('[data-tarjeta="caja"]')).toContainText('Nada pendiente');
  }],
  ['3a', async (page, base) => {
    await abrir(page, base, { datos: 'tablero-estados', empleado: 'emp-facundo', elegida: 'u-d',
      prefs: { tablero: { orden: ['cobranzas', 'caja', 'cheques', 'pedidos', 'gastos', 'stock', 'empleados'] } } });
    await expect(page.locator('#grilla-modulos [data-tarjeta]')).toHaveCount(7);
    await expect(page.locator('[data-tarjeta="caja"]')).toContainText('No se pudo cargar');
    await expect(page.locator('[data-tarjeta="cobranzas"]')).toContainText('Hoy no hubo cobranzas');
    await expect(page.locator('[data-tarjeta="cheques"]')).toContainText('Cargando…');
    await expect(page.locator('[data-tarjeta="pedidos"]')).toContainText('14');
  }],
  ['4a', async (page, base) => {
    await abrir(page, base, { datos: 'tablero', prefs: PREFS_DUENO, colapsada: '1' });
    await tableroListo(page, 14);
    await expect(page.locator('body')).toHaveClass(/barra-lateral-colapsada/);
    await page.locator('nav.barra-lateral [data-clave="cobranzas"]').hover();
  }],
  ['4b', async (page, base) => {
    await abrir(page, base, { datos: 'tablero', prefs: PREFS_DUENO });
    await tableroListo(page, 14);
    await page.locator('#barra-arriba-usuario').click();
    await expect(page.locator('#barra-arriba-menu')).toBeVisible();
  }],
  ['5a', async (page, base) => {
    await abrir(page, base, { datos: 'tablero', vista: 'personalizar', prefs: { ...PREFS_DUENO, tablero: { orden: [], tamanos: {}, ocultas: ['seguridad'] } } });
    await page.locator('#pz-acomodar').click();
    await expect(page.locator('#tb-acomodar-barra')).toBeVisible();
    await tableroListo(page, 13);
    await expect(page.locator('#tb-escondidas')).toContainText('Seguridad');
    await page.evaluate(() => window.scrollTo(0, 0));
  }],
  ['6a', async (page, base) => {
    await abrir(page, base, { datos: 'tablero', vista: 'personalizar', prefs: { ...PREFS_DUENO, tablero: { orden: [], tamanos: {}, ocultas: ['seguridad'] } } });
    await expect(page.locator('#tb-personalizar')).toContainText('Barra lateral');
    await expect(page.locator('#tb-franja')).toContainText('Para resolver ya');
  }],
];

const PASOS_1920 = [
  ['1b', async (page, base) => {
    await abrir(page, base, { datos: 'tablero', prefs: PREFS_DUENO });
    await tableroListo(page, 14);
  }],
];

const PASOS_390 = [
  ['7a', async (page, base) => {
    await abrir(page, base, { datos: 'tablero', prefs: { barra: { orden: 'mano', manual: [], fijados: [] } } });
    await tableroListo(page, 14);
  }],
  ['7b', async (page) => {
    await page.locator('#barra-abajo-mas').click();
    await expect(page.locator('.hoja-mas')).toBeVisible();
  }],
];

module.exports = { PASOS_1366, PASOS_1920, PASOS_390, abrir, tableroListo, PREFS_DUENO };
