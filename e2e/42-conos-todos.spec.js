// CONOS DE PAPEL → "TODOS LOS CONOS" (14/10/2026). En la maqueta (Supabase
// falso, sin credenciales), a 1280, 390 y 360 px y en la tablet (1000 × 540):
//  - los filtros En producción / Apagados / Doble bolsa / Ilustración / Todos,
//    con su cuenta, y el buscador sin acentos ni mayúsculas;
//  - el nuevo con "nuevo, a revisar" y el aviso de dónde se acepta;
//  - cada interruptor manda a configurar_cono SOLO su campo (los otros null);
//  - deshabilitados según el permiso: Pablo (conos:pedir) solo Ilustración,
//    Mauricio (ver + recibir) ninguno, quien configura producción los tres;
//  - si la base rechaza, el interruptor vuelve y el error se ve tal cual;
//  - el stock solo con conos:ver;
//  - con 357 marcas el buscador responde enseguida;
//  - sin scroll de costado ni errores de JavaScript.
const { test, expect } = require('@playwright/test');
const { vigilarErrores } = require('./ayuda');
const DATOS = require('../pruebas/datos-maqueta/conos');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const URL = (datos) => `${MAQUETA}/modulos/conos.html?maqueta=${datos}&vista=todos`;
const ID = Object.fromEntries(DATOS.rpc.conos_catalogo.map(f => [f.cono, f.marca_id]));

function anotarRpc(page) {
  const llamadas = [];
  page.on('console', async (msg) => {
    const args = msg.args();
    if (args.length < 3) return;
    const a = await args[0].jsonValue().catch(() => null);
    if (a !== '[maqueta] rpc') return;
    llamadas.push({ nombre: await args[1].jsonValue().catch(() => null), params: await args[2].jsonValue().catch(() => null) });
  });
  return llamadas;
}
const llamadas = (ll, nombre) => ll.filter(x => x.nombre === nombre);

async function sinCostado(page, ancho) {
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(w, 'scroll de costado').toBeLessThanOrEqual(ancho);
}
const sw = (page, nombre, campo) => page.locator(`input[data-configurar="${ID[nombre]}"][data-campo="${campo}"]`);
const filas = (page) => page.locator('#cn-todos-lista .cn-cat-fila .cn-cat-nombre');
const filtro = (page, v) => page.locator(`[data-filtro-todos="${v}"]`);

const TAMANOS = [[1280, 900, 'compu'], [390, 844, 'celular'], [360, 740, 'celular angosto'], [1000, 540, 'tablet']];

for (const [ancho, alto, que] of TAMANOS) {
  test(`Todos los conos (Pablo): filtros, buscador e Ilustración, a ${ancho} (${que})`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    const ll = anotarRpc(page);
    await page.goto(URL('conos'));
    await expect(page.locator('[data-vista="todos"]')).toHaveText('Todos los conos');
    await expect(page.locator('[data-vista="todos"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(filas(page)).toHaveCount(26);
    // Los filtros con su cuenta.
    await expect(filtro(page, 'produccion')).toHaveText('En producción23');
    await expect(filtro(page, 'apagados')).toHaveText('Apagados3');
    await expect(filtro(page, 'doble')).toHaveText('Doble bolsa3');
    await expect(filtro(page, 'ilus')).toHaveText('Ilustración4');
    await expect(filtro(page, 'todos')).toHaveText('Todos26');
    await filtro(page, 'doble').click();
    await expect(filas(page)).toHaveText(['QUINTANA', 'RIO', 'ÁRBOL VIEJO']);
    await filtro(page, 'apagados').click();
    await expect(filas(page)).toHaveCount(3);
    await expect(page.locator('#cn-todos-lista')).toContainText('Rechazado');
    await filtro(page, 'todos').click();
    // El nuevo: su etiqueta y el aviso de dónde se acepta (sin enlace: Pablo no configura).
    await expect(page.locator('#cn-todos-aviso')).toContainText('Hay 1 cono nuevo, a revisar. Se aceptan o se rechazan en Producción → Configuración → Marcas / Conos');
    await expect(page.locator('#cn-todos-aviso a')).toHaveCount(0);
    await expect(page.locator('#cn-vista-todos')).not.toContainText('Aceptar');
    // El buscador: sin acentos ni mayúsculas.
    await page.fill('#cn-todos-buscar', 'nandu');
    await expect(filas(page)).toHaveCount(1);
    await expect(filas(page).first()).toHaveText('HELADERÍA ÑANDÚ nuevo, a revisar');
    await expect(page.locator('#cn-todos-cuenta')).toHaveText('1 cono con «nandu»');
    await page.fill('#cn-todos-buscar', 'RÍO');
    await filtro(page, 'ilus').click();
    await expect(filas(page)).toHaveText(['RIO', 'RIO OLIMPICOS']);
    await page.fill('#cn-todos-buscar', '');
    await filtro(page, 'todos').click();
    // Permisos de Pablo (conos:pedir, sin produccion:configurar).
    await expect(sw(page, 'ASPEN', 'activa')).toBeDisabled();
    await expect(sw(page, 'ASPEN', 'doble_bolsa')).toBeDisabled();
    await expect(sw(page, 'ASPEN', 'papel_ilustracion')).toBeEnabled();
    await expect(sw(page, 'ASPEN', 'activa')).toBeChecked();
    // El stock (Pablo tiene conos:ver).
    await expect(page.locator(`[data-cat-cono="${ID.ASPEN}"] .cn-cat-stock`)).toHaveText('Stock42.000');
    // Ilustración: SOLO ese campo.
    await sw(page, 'ASPEN', 'papel_ilustracion').click();
    await expect.poll(() => llamadas(ll, 'configurar_cono').length).toBe(1);
    expect(llamadas(ll, 'configurar_cono')[0].params).toEqual({ p_marca_id: ID.ASPEN, p_activa: null, p_doble_bolsa: null, p_papel_ilustracion: true });
    await expect(sw(page, 'ASPEN', 'papel_ilustracion')).toBeChecked();
    await expect(sw(page, 'ASPEN', 'papel_ilustracion')).toBeEnabled();
    await expect(filtro(page, 'ilus')).toHaveText('Ilustración5');
    await sinCostado(page, ancho);
    expect(errores).toEqual([]);
  });
}

for (const [ancho, alto] of [[1280, 900], [390, 844]]) {
  test(`Todos los conos (quien configura): los tres interruptores, lo que devuelve la base y el error, a ${ancho}`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: alto });
    const errores = vigilarErrores(page);
    const ll = anotarRpc(page);
    await page.goto(URL('conos-configura'));
    await expect(filtro(page, 'todos')).toHaveText('Todos357');
    await expect(page.locator('#cn-todos-aviso a')).toHaveText('Producción → Configuración → Marcas / Conos');
    await expect(page.locator('#cn-todos-aviso a')).toHaveAttribute('href', 'produccion-gestion.html?vista=conos');
    // Con 357 marcas, el buscador responde enseguida.
    const t0 = Date.now();
    await page.locator('#cn-todos-buscar').pressSequentially('cafe', { delay: 20 });
    await expect(filas(page).first()).toContainText('CAFÉ');
    expect(Date.now() - t0, 'buscar en 357 marcas').toBeLessThan(3000);
    expect(await filas(page).count()).toBeGreaterThan(40);
    await page.fill('#cn-todos-buscar', 'aspen');
    await expect(filas(page)).toHaveCount(1);
    for (const c of ['activa', 'doble_bolsa', 'papel_ilustracion']) await expect(sw(page, 'ASPEN', c)).toBeEnabled();
    // En producción: solo p_activa, y queda lo que devolvió la base.
    await page.evaluate((id) => { globalThis.__maqueta = { rpc: { configurar_cono: { marca_id: id, cono: 'ASPEN', activa: false, doble_bolsa: false, papel_ilustracion: true } } }; }, ID.ASPEN);
    await sw(page, 'ASPEN', 'activa').click();
    await expect.poll(() => llamadas(ll, 'configurar_cono').length).toBe(1);
    expect(llamadas(ll, 'configurar_cono')[0].params).toEqual({ p_marca_id: ID.ASPEN, p_activa: false, p_doble_bolsa: null, p_papel_ilustracion: null });
    await expect(sw(page, 'ASPEN', 'activa')).not.toBeChecked();
    await expect(sw(page, 'ASPEN', 'papel_ilustracion')).toBeChecked();
    // Apagado con el filtro puesto: no desaparece bajo el dedo.
    await expect(filas(page)).toHaveCount(1);
    // Doble bolsa: la base lo rechaza → vuelve y el error se ve tal cual.
    await page.evaluate(() => { globalThis.__maqueta = { rpc: { configurar_cono: 'ERROR:Para prender o apagar un cono o marcar doble bolsa hace falta el permiso de configurar producción.' } }; });
    await sw(page, 'ASPEN', 'doble_bolsa').click();
    await expect.poll(() => llamadas(ll, 'configurar_cono').length).toBe(2);
    expect(llamadas(ll, 'configurar_cono')[1].params).toEqual({ p_marca_id: ID.ASPEN, p_activa: null, p_doble_bolsa: true, p_papel_ilustracion: null });
    await expect(page.locator(`[data-cat-cono="${ID.ASPEN}"] [role="alert"]`)).toHaveText('Para prender o apagar un cono o marcar doble bolsa hace falta el permiso de configurar producción.');
    await expect(sw(page, 'ASPEN', 'doble_bolsa')).not.toBeChecked();
    await expect(sw(page, 'ASPEN', 'doble_bolsa')).toBeEnabled();
    await sinCostado(page, ancho);
    expect(errores).toEqual([]);
  });
}

test('Todos los conos (Mauricio, ver + recibir): ve el stock y ningún interruptor se puede tocar, a 390', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errores = vigilarErrores(page);
  const ll = anotarRpc(page);
  await page.goto(URL('conos-mauricio'));
  await expect(page.locator('#cn-tabs [data-vista]')).toHaveText(['Stock', 'Pendientes de entrega', 'Todos los conos']);
  await expect(filas(page)).toHaveCount(26);
  await expect(page.locator(`[data-cat-cono="${ID.FIBRO}"] .cn-cat-stock`)).toHaveText('Stock-2.000');
  for (const c of ['activa', 'doble_bolsa', 'papel_ilustracion']) await expect(sw(page, 'ASPEN', c)).toBeDisabled();
  await expect(page.locator('#cn-todos-lista input[data-configurar]:not([disabled])')).toHaveCount(0);
  await expect(page.locator(`[data-cat-cono="${ID.ASPEN}"] label`).first()).toHaveAttribute('title', 'Hace falta el permiso de configurar producción.');
  await sw(page, 'ASPEN', 'activa').click({ force: true });
  await page.waitForTimeout(200);
  expect(llamadas(ll, 'configurar_cono')).toEqual([]);
  await sinCostado(page, 390);
  expect(errores).toEqual([]);
});

test('Todos los conos sin conos:ver: no se ve el stock (la base manda 0), a 390', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errores = vigilarErrores(page);
  // Pablo con solo conos:pedir (la maqueta deja pisar una tabla al cargar).
  await page.addInitScript(() => {
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({ tablas: { empleado_tareas: [{ empleado_id: 'emp-pablo', modulo: 'conos', tarea: 'pedir', alcance: null, habilitado: true }] } }));
  });
  await page.goto(URL('conos'));
  await expect(filas(page)).toHaveCount(26);
  await expect(page.locator('#cn-todos-lista .cn-cat-stock')).toHaveCount(0);
  await expect(page.locator('#cn-todos-lista')).not.toContainText('Stock');
  await expect(sw(page, 'ASPEN', 'papel_ilustracion')).toBeEnabled();
  await sinCostado(page, 390);
  expect(errores).toEqual([]);
});
