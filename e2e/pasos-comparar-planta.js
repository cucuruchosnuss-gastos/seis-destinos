// Cómo llevar la planta (en la maqueta, con los datos planta-v2) a cada pantalla
// del diseño de Claude Design, para compararlas (e2e/9-comparar-planta.spec.js).
// Cada paso es [id del diseño, fn(page, { ancho, alto })] y corren en orden, en
// la misma pestaña: cada uno parte de donde dejó el anterior.
//
// Los estados que los datos fijos no tienen (un PIN incorrecto, una fábrica sin
// máquinas abiertas) se arman con los cambios puntuales de la maqueta
// (globalThis.__maqueta.rpc, o sessionStorage 'maqueta.cambios' + recargar).
'use strict';
const { expect } = require('@playwright/test');
const datos = require('../pruebas/datos-maqueta/planta-v2');

const PERSONA = (page, nombre) => page.locator('#pr-quien-lista [data-persona]', { hasText: nombre });

async function prepararPlanta(page, base) {
  await page.clock.setFixedTime(new Date(datos.ahora));
  await page.goto(`${base}/modulos/produccion.html?maqueta=planta-v2`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts?.ready);
}

async function teclear(page, digitos, dentro = '#pr-pin-teclado') {
  const teclado = page.locator(dentro);
  await expect(teclado).toBeVisible();
  for (const d of digitos) await teclado.locator(`[data-tecla="${d}"]`).click();
}
async function rpcVivo(page, nombre, valor) {
  await page.evaluate(([n, v]) => { globalThis.__maqueta ??= { rpc: {} }; globalThis.__maqueta.rpc[n] = v; }, [nombre, valor]);
}
async function sinRpcVivo(page, nombre) {
  await page.evaluate(n => { if (globalThis.__maqueta?.rpc) delete globalThis.__maqueta.rpc[n]; }, nombre);
}
async function cerrarPin(page) {
  const cerrar = page.locator('#pr-pin-cerrar');
  if (await cerrar.count() && await cerrar.isVisible()) await cerrar.click();
  else await page.keyboard.press('Escape');
}
async function irASeccion(page, seccion) {
  await page.locator(`[data-seccion="${seccion}"]`).first().click();
}
async function abrirMaquina(page, turnoId) {
  await irASeccion(page, 'inicio');
  await page.locator(`[data-producido="${turnoId}"], [data-planilla="${turnoId}"]`).first().click();
}

const PASOS_COMPARAR_PLANTA = [
  ['1a', async (page) => { await expect(PERSONA(page, 'Hinga Luciano')).toBeVisible(); }],
  ['1b', async (page) => {
    await PERSONA(page, 'Hinga Luciano').click();
    await teclear(page, '48');
  }],
  ['1c', async (page) => {
    await rpcVivo(page, 'verificar_pin_produccion', { ok: false, motivo: 'pin_incorrecto', intentos_restantes: 2 });
    await teclear(page, '26');
    await page.locator('#pr-pin-teclado [data-tecla="entrar"]').click().catch(() => {});
    await page.waitForTimeout(200);
  }],
  ['1d', async (page) => {
    const hasta = new Date(new Date(datos.ahora).getTime() + (4 * 60 + 32) * 1000).toISOString();
    await rpcVivo(page, 'verificar_pin_produccion', { ok: false, motivo: 'bloqueado', bloqueado_hasta: hasta });
    await teclear(page, '1234');
    await page.locator('#pr-pin-teclado [data-tecla="entrar"]').click().catch(() => {});
    await page.waitForTimeout(200);
  }],
  ['10a', async (page) => {
    await sinRpcVivo(page, 'verificar_pin_produccion');
    await cerrarPin(page);
    await page.locator('#pr-btn-maestro').click();
    await teclear(page, '123');
  }],
  ['2a', async (page) => {
    await cerrarPin(page);
    await PERSONA(page, 'Hinga Luciano').click();
    await teclear(page, '4826');
    await page.locator('#pr-pin-teclado [data-tecla="entrar"]').click().catch(() => {});
    await expect(page.locator('#pr-barra')).toBeVisible();
    await irASeccion(page, 'inicio');
  }],
  ['3', async (page) => {
    await page.locator('[data-abrir-libre="maq-4"]').click();
    await expect(page.locator('#pr-abrir')).toBeVisible();
    // Tres operarios elegidos, como en el diseño.
    const libres = page.locator('#pr-abrir [data-toggle-op]:not([disabled])');
    for (let i = 0; i < 3; i++) await libres.nth(i).click();
  }],
  ['4a', async (page) => {
    await abrirMaquina(page, 't1');
    await expect(page.locator('#pr-planilla')).toBeVisible();
    await expect(page.locator('#pr-planilla-producido .pr-fila-prod').first()).toBeVisible();
  }],
  ['6', async (page) => {
    // La Máquina 3 está parada: sus paradas.
    await abrirMaquina(page, 't3');
    await expect(page.locator('#pr-planilla')).toBeVisible();
    await irASeccion(page, 'paradas');
    await expect(page.locator('#pr-paradas')).toBeVisible();
  }],
  ['7', async (page) => {
    await abrirMaquina(page, 't1');
    await expect(page.locator('#pr-planilla')).toBeVisible();
    await irASeccion(page, 'cierre');
    await expect(page.locator('#pr-cierre')).toBeVisible();
    await expect(page.locator('#pr-cierre-falta .pr-falta__bloquea')).toBeVisible();
  }],
  // ── Sala de masa (los pasos de Producción van antes) ──
  ['9a', async (page) => {
    await page.locator('#pr-barra [data-modo="masa"]').first().click();
    await PERSONA(page, 'Villagra Vladimir').click();
    await teclear(page, '4826');
    await expect(page.locator('#pr-sala')).toBeVisible();
  }],
];

module.exports = { PASOS_COMPARAR_PLANTA, prepararPlanta, teclear, rpcVivo, sinRpcVivo, irASeccion, abrirMaquina };
