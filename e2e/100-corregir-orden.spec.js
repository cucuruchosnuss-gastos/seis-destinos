// CORREGIR UNA ORDEN (29/10/2026, rama ci-prueba/corregir-orden), en la
// maqueta "administracion", a 390 y 1280 px, sin scroll horizontal ni errores
// de JS. La orden valorizada N-0013 (o12):
//  - con retiros:cargar: "Corregir orden" al lado de Valorizar / Anular,
//    "Corregida 1 vez" con su historial; el editor (orden_para_corregir) con
//    la fecha bloqueada; los lotes de un renglón ("faltan repartir", agregar
//    lote, "✓ repartido completo"); el precio y el total; un renglón nuevo
//    del catálogo; el resumen con la diferencia a la cuenta corriente; y lo
//    que viaja a corregir_orden_retiro, con lo que faltó en stock después.
//  - sin retiros:cargar: el editor se abre con la explicación y Guardar
//    queda apagado; con no_se_puede, el aviso y sin editor.
// Las rpc se responden con globalThis.__maqueta.rpc.<nombre>. Corre SIEMPRE,
// sin credenciales.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || `http://localhost:${process.env.E2E_PUERTO_MAQUETA || 4180}`;
const TAMANOS = [[390, 844], [1280, 900]];
const BASE = JSON.parse(fs.readFileSync(path.join(__dirname, 'maqueta', 'datos', 'administracion.json'), 'utf8'));

const ITEMS = [
  { item_id: 'x0', orden: 1, tipo: 'retiro', presentacion_id: 'pr1', marca_id: null, insumo_id: null, producto: 'Cucurucho grande', presentacion: 'Caja x 100', cono: null,
    cajas: 5, cantidad: null, precio: 3000, subtotal: 15000, lotes: [{ lote: '6240', cajas: 3 }] },
  { item_id: 'x1', orden: 2, tipo: 'retiro', presentacion_id: 'pr1c', marca_id: 'm1', insumo_id: null, producto: 'Cucurucho grande', presentacion: 'Caja x 100 con cono', cono: 'LOLO',
    cajas: 6, cantidad: null, precio: 3250, subtotal: 19500, lotes: [] },
  { item_id: 'x2', orden: 3, tipo: 'retiro', presentacion_id: 'pr2', marca_id: null, insumo_id: null, producto: 'Cucurucho chico', presentacion: 'Caja x 320', cono: null,
    cajas: 7, cantidad: null, precio: 3500, subtotal: 24500, lotes: [{ lote: '6301', cajas: 7 }] },
];
const DATOS = { orden_id: 'o12', codigo: 'N-0013', unidad_negocio_id: 'u-n', cliente_id: 'c1', cliente: 'Distribuidora Anatolia', entre_empresas: false,
  fecha: '2026-09-26', transporte: 'Expreso Norte', observaciones: 'Frágil', numero_remito: null, talonario: null, estado_valorizacion: 'valorizada',
  total: 59000, moneda: 'ARS', no_se_puede: null, items: ITEMS, correcciones: [] };
const RESPUESTA = { codigo: 'N-0013', total_antes: 59000, total_despues: 70000, valorizada: true,
  stock_insuficiente: [{ renglon: 4, producto: 'Cucurucho chico', presentacion: 'Caja x 320', faltaron: 2 }] };
const CORRECCIONES = [{ orden_retiro_id: 'o12', corregida_en: '2026-10-29T15:05:00Z', corregida_por: 'emp-7', motivo: 'Faltaban dos cajas en el remito', total_antes: '56000', total_despues: '59000' }];

function anotarRpc(page) {
  const rpc = [];
  page.on('console', async (m) => {
    if (!m.text().startsWith('[maqueta] rpc')) return;
    const args = m.args();
    try { rpc.push({ nombre: await args[1].jsonValue(), params: await args[2].jsonValue() }); } catch { /* nada */ }
  });
  return rpc;
}
async function sinScrollHorizontal(page) {
  const { doc, vista } = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(doc, `scroll horizontal: ${doc} px contra ${vista}`).toBeLessThanOrEqual(vista);
}

async function abrirOrden(page, { cargar }) {
  page.setDefaultTimeout(15000);
  const tareas = [...BASE.tablas.empleado_tareas, ...(cargar ? [{ empleado_id: 'emp-1', modulo: 'retiros', tarea: 'cargar', alcance: { todas: true }, habilitado: true }] : [])];
  const cambios = { tablas: { empleado_tareas: tareas, orden_correcciones: CORRECCIONES,
    v_empleados_publico: [...BASE.tablas.v_empleados_publico, { id: 'emp-7', nombre: 'Lucía Pérez' }] } };
  await page.addInitScript((c) => {
    try { localStorage.setItem('barraUnidad.elegida', 'u-n'); sessionStorage.setItem('maqueta.cambios', c) } catch { /* nada */ }
  }, JSON.stringify(cambios));
  await page.goto(`${MAQUETA}/modulos/administracion.html?maqueta=administracion`);
  await page.evaluate(({ datos, respuesta }) => {
    globalThis.__maqueta = { rpc: { orden_para_corregir: datos, corregir_orden_retiro: respuesta }, funciones: {} };
  }, { datos: DATOS, respuesta: RESPUESTA });
  await page.locator('[data-pestana="ordenes"]').first().click();
  await page.locator('#ad-ordenes-lista [data-orden="o12"]').click();
  await expect(page.locator('#ad-btn-corregir-orden')).toBeVisible();
}
const renglon = (page, i) => page.locator('#ad-co [data-co-renglon]').nth(i);

for (const [ancho, alto] of TAMANOS) {
  test(`Corregir orden: el editor, los lotes, el resumen y guardar, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirOrden(page, { cargar: true });
    // El botón al lado de los otros, y el historial.
    await expect(page.locator('#ad-orden-acciones')).toContainText('Corregir orden');
    const hist = page.locator('#ad-correcciones-orden');
    await expect(hist.locator('summary')).toHaveText('Corregida 1 vez');
    await hist.locator('summary').click();
    await expect(hist).toContainText('29/10/2026 12:05 · Lucía Pérez');
    await expect(hist).toContainText('Faltaban dos cajas en el remito');
    await expect(hist).toContainText(/Total \$\s56\.000,00 → \$\s59\.000,00/);
    await sinScrollHorizontal(page);
    await hist.scrollIntoViewIfNeeded();
    await captura(page, `corregir-historial-${ancho}`, info);

    // El editor.
    await page.locator('#ad-btn-corregir-orden').click();
    await expect(page.locator('#ad-co')).toBeVisible();
    await expect(page.locator('#ad-btn-corregir-orden')).toBeHidden();
    await expect(page.locator('#ad-btn-anular')).toBeHidden();
    expect(rpc.find(r => r.nombre === 'orden_para_corregir')?.params).toEqual({ p_orden_id: 'o12' });
    await expect(page.locator('#ad-co [data-co-renglon]')).toHaveCount(3);
    await expect(page.locator('#ad-co-fecha')).toBeDisabled();
    await expect(page.locator('#ad-co-fecha-ayuda')).toHaveText('La orden ya está valorizada: no se le puede cambiar la fecha.');
    await expect(renglon(page, 0).locator('[data-co-cantidad]')).toHaveValue('5');
    await expect(renglon(page, 0).locator('[data-co-precio]')).toHaveValue('3.000');
    await sinScrollHorizontal(page);
    await captura(page, `corregir-editor-${ancho}`, info);

    // Los lotes del renglón 1: 3 en 6240 y 2 sin lote (lo que salió sin stock).
    const r1 = renglon(page, 0);
    const estado = r1.locator('.ad-co-lotes__estado');
    await expect(estado).toHaveText('Lotes: 5 de 5 cajas · ✓ repartido completo');
    await r1.locator('[data-co-cantidad]').fill('6');
    await expect(estado).toHaveText('Lotes: 5 de 6 cajas · faltan repartir 1 caja');
    await expect(estado).toHaveClass(/ad-co-lotes__estado--falta/);
    await r1.locator('[data-co-lote-agregar]').click();
    const r1b = renglon(page, 0);
    await expect(r1b.locator('.ad-co-lote')).toHaveCount(3);
    await expect(r1b.locator('[data-co-lote-n]').nth(2)).toHaveValue('1');
    await r1b.locator('[data-co-lote]').nth(2).fill('6245');
    await expect(r1b.locator('.ad-co-lotes__estado')).toHaveText('Lotes: 6 de 6 cajas · ✓ repartido completo');
    await expect(r1b.locator('.ad-co-lotes__estado')).not.toHaveClass(/--falta/);
    await sinScrollHorizontal(page);
    await r1b.scrollIntoViewIfNeeded();
    await captura(page, `corregir-lotes-${ancho}`, info);

    // El precio del renglón 2 y el total.
    await renglon(page, 1).locator('[data-co-precio]').fill('3500');
    await expect(renglon(page, 1).locator('[data-co-precio]')).toHaveValue('3.500');
    await expect(page.locator('#ad-co-total')).toHaveText(/Total: \$\s59\.000,00 → \$\s63\.500,00/);

    // Un renglón nuevo del catálogo.
    await page.locator('#ad-co [data-co-accion="agregar"]').click();
    const nuevo = renglon(page, 3);
    await nuevo.locator('[data-co-buscar]').fill('chico');
    await nuevo.locator('[data-co-elegir][data-pres="pr2"]').click();
    await renglon(page, 3).locator('[data-co-cantidad]').fill('2');
    await expect(renglon(page, 3)).toContainText(/Sin precio: toma el que tenía \(\$\s3\.500,00\)\./);
    await page.locator('#ad-co-transporte').fill('Expreso Sur');
    await page.locator('#ad-co-motivo').fill('Faltó una caja y un renglón');
    await page.locator('#ad-co-revisar').click();

    // El resumen.
    const res = page.locator('#ad-co-resumen');
    await expect(res).toContainText('Cucurucho grande · Caja x 100: 5 cajas → 6 cajas');
    await expect(res).toContainText('Cucurucho grande · Caja x 100: lotes 6240 (3 cajas), sin lote (2 cajas), 6245 (1 caja)');
    await expect(res).toContainText('Se agrega: 2 cajas · Cucurucho chico · Caja x 320');
    await expect(res).toContainText('Transporte: Expreso Norte → Expreso Sur');
    await expect(page.locator('#ad-co-resumen-total')).toHaveText(/Total \$\s59\.000,00 → \$\s70\.500,00 \(estimado con los precios de la pantalla\)/);
    await expect(page.locator('#ad-co-diferencia')).toHaveText(/Diferencia \+ \$\s11\.500,00: va a la cuenta corriente de Distribuidora Anatolia\./);
    await sinScrollHorizontal(page);
    await page.locator('#ad-co').scrollIntoViewIfNeeded();
    await captura(page, `corregir-resumen-${ancho}`, info);

    // Guardar: lo que viaja.
    await page.locator('#ad-co-guardar').click();
    await expect(page.locator('#ad-co-faltantes')).toBeVisible();
    await expect(page.locator('#ad-co-faltantes')).toContainText('Cucurucho chico · Caja x 320 · faltaban 2 cajas');
    const llamadas = rpc.filter(r => r.nombre === 'corregir_orden_retiro');
    expect(llamadas).toHaveLength(1);
    const p = llamadas[0].params;
    expect(p.p_orden_id).toBe('o12');
    expect(p.p_motivo).toBe('Faltó una caja y un renglón');
    expect(p.p_fecha).toBeNull();
    expect(p.p_transporte).toBe('Expreso Sur');
    expect(p.p_observaciones).toBeNull();
    expect(p.p_items).toEqual([
      { presentacion_id: 'pr1', marca_id: null, cajas: 6, lotes: [{ lote: '6240', cajas: 3 }, { lote: '', cajas: 2 }, { lote: '6245', cajas: 1 }], precio: 3000 },
      { presentacion_id: 'pr1c', marca_id: 'm1', cajas: 6, precio: 3500 },
      { presentacion_id: 'pr2', marca_id: null, cajas: 7, lotes: [{ lote: '6301', cajas: 7 }], precio: 3500 },
      { presentacion_id: 'pr2', marca_id: null, cajas: 2 },
    ]);
    await expect(page.locator('#ad-co')).toHaveCount(0);
    await expect(page.locator('#ad-btn-corregir-orden')).toBeVisible();
    await sinScrollHorizontal(page);
    await page.locator('#ad-co-faltantes').scrollIntoViewIfNeeded();
    await captura(page, `corregir-guardada-${ancho}`, info);
    expect(errores, errores.join('\n')).toEqual([]);
  });

  test(`Corregir orden: sin permiso para cargar y con no_se_puede, a ${ancho} px`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirOrden(page, { cargar: false });
    // no_se_puede: el aviso, sin editor.
    await page.evaluate(() => { globalThis.__maqueta.rpc.orden_para_corregir = { ...globalThis.__maqueta.rpc.orden_para_corregir, no_se_puede: 'La orden ya tiene una factura emitida: hacé una nota de crédito o débito.' }; });
    await page.locator('#ad-btn-corregir-orden').click();
    await expect(page.locator('#ad-co-no-se-puede')).toHaveText('No se puede corregir: La orden ya tiene una factura emitida: hacé una nota de crédito o débito.');
    await expect(page.locator('#ad-co [data-co-cantidad]')).toHaveCount(0);
    await sinScrollHorizontal(page);
    await captura(page, `corregir-no-se-puede-${ancho}`, info);
    await page.locator('#ad-co [data-co-accion="cancelar"]').click();
    await expect(page.locator('#ad-co')).toHaveCount(0);

    // Sin retiros:cargar: se mira, no se guarda.
    await page.evaluate(() => { globalThis.__maqueta.rpc.orden_para_corregir = { ...globalThis.__maqueta.rpc.orden_para_corregir, no_se_puede: null }; });
    await page.locator('#ad-btn-corregir-orden').click();
    await expect(page.locator('#ad-co-sin-cargar')).toContainText('también hace falta el permiso para cargar retiros');
    await page.locator('#ad-co-transporte').fill('Otro transporte');
    await page.locator('#ad-co-motivo').fill('Cambia el transporte');
    await page.locator('#ad-co-revisar').click();
    await expect(page.locator('#ad-co-guardar')).toBeDisabled();
    await expect(page.locator('#ad-co #ad-co-sin-cargar')).toBeVisible();
    await sinScrollHorizontal(page);
    await page.locator('#ad-co').scrollIntoViewIfNeeded();
    await captura(page, `corregir-sin-cargar-${ancho}`, info);
    expect(rpc.filter(r => r.nombre === 'corregir_orden_retiro')).toHaveLength(0);
    expect(errores, errores.join('\n')).toEqual([]);
  });
}
