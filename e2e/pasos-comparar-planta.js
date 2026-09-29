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
  // Un paso que no encuentra su control falla en 15 s, no en los 6 minutos de la prueba.
  page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(new Date(datos.ahora));
  await page.goto(`${base}/modulos/produccion.html?maqueta=planta-v2`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts?.ready);
}

// Sin tecla "Entrar": con el último número el PIN se manda solo.
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
    await page.waitForTimeout(200);
  }],
  ['1d', async (page) => {
    const hasta = new Date(new Date(datos.ahora).getTime() + (4 * 60 + 32) * 1000).toISOString();
    await rpcVivo(page, 'verificar_pin_produccion', { ok: false, motivo: 'bloqueado', bloqueado_hasta: hasta });
    await teclear(page, '1234');
    await page.waitForTimeout(200);
  }],
  ['10a', async (page) => {
    await sinRpcVivo(page, 'verificar_pin_produccion');
    await cerrarPin(page);
    await page.locator('#pr-btn-maestro').click();
    await teclear(page, '123');
  }],
  ['10b', async (page) => {
    await teclear(page, '45678');
    await expect(page.locator('#pr-acceso')).toBeVisible();
    await page.locator('#pr-acceso-personas [data-acceso-persona]').first().click();
    await page.locator('[data-acceso-puesto="masero"]').click();
  }],
  ['10c', async (page) => {
    await page.locator('#pr-acceso-confirmar').click();
    await expect(page.locator('#pr-acceso-pin')).toBeVisible();
  }],
  ['2a', async (page) => {
    await page.locator('#pr-acceso-pin-listo').click().catch(() => {});
    await page.locator('#pr-maestro-salir').click().catch(() => {});
    await cerrarPin(page);
    await PERSONA(page, 'Hinga Luciano').click();
    await teclear(page, '4826');
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
  ['5a', async (page) => {
    await page.locator('#pr-btn-agregar-producto').click();
    await expect(page.locator('#pr-agregar-prod')).toBeVisible();
  }],
  ['5b', async (page) => {
    // La Máquina 2 no tiene masa de chocolate.
    await abrirMaquina(page, 't2');
    await expect(page.locator('#pr-planilla')).toBeVisible();
    await page.locator('#pr-btn-agregar-producto').click();
    await page.locator('[data-ag-producto="p-Mini-ch"]').click();
    await expect(page.locator('.pr-ag__aviso-choco')).toBeVisible();
  }],
  ['5c', async (page) => {
    await abrirMaquina(page, 't1');
    await expect(page.locator('#pr-planilla')).toBeVisible();
    await page.locator('#pr-btn-agregar-producto').click();
    await page.locator('[data-ag-producto="p-Mini"]').click();
    await expect(page.locator('#pr-agregar-cono')).toBeVisible();
  }],
  ['5d', async (page) => {
    await page.locator('#pr-agregar-marcas [data-marca="c-1"]').click();
    await expect(page.locator('[data-ag-presentacion]').first()).toBeVisible();
  }],
  ['5e', async (page) => {
    await page.locator('[data-ag-presentacion]').first().click();
    await expect(page.locator('#pr-agregar-cajas-panel')).toBeVisible();
    await page.locator('[data-cajas-poner="3"]').click();
    await page.locator('[data-cajas-paso="1"]').click();
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
  ['9b', async (page) => {
    await page.locator('[data-sala-turno="t1"]').click();
    await expect(page.locator('#pr-receta')).toBeVisible();
    await page.locator('#pr-receta [data-base="anterior"]').click().catch(() => {});
  }],
  ['9c', async (page) => {
    await page.locator('#pr-receta [data-base="modificar"], #pr-receta [data-base="modificada"]').first().click();
  }],
  ['9e', async (page) => {
    await page.locator('#pr-receta [data-base="anterior"]').click().catch(() => {});
    await page.locator('#pr-receta-filas [data-lote]').first().click();
    await expect(page.locator('#pr-lote-panel')).toBeVisible();
  }],
  ['9g', async (page) => {
    await page.keyboard.press('Escape');
    await page.locator('#pr-barra [data-lateral-turno="t1"]').click();
    await expect(page.locator('#pr-hist-maq')).toBeVisible();
  }],
];

module.exports = { PASOS_COMPARAR_PLANTA, prepararPlanta, teclear, rpcVivo, sinRpcVivo, irASeccion, abrirMaquina };
