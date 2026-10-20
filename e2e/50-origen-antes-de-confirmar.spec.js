// "¿DE DÓNDE SALEN?" ANTES DE CONFIRMAR (20/10/2026), en la maqueta, sin
// credenciales, a 390, 360, la tablet (1000 × 540) y 1280 px. Un renglón de
// Cucurucho grande pide 30 cajas y hay 10: la Carga pregunta de dónde salen
// las 20 que faltan, y no deja agregar el renglón ni confirmar sin contestar.
//  - Se hace en la fábrica: las planillas abiertas → faltante_en_produccion.
//  - Viene de Mengui (su origen habitual), con permiso de ingreso →
//    ingresar_producto_terminado (lote MENGUI-1310) y faltante_a_lote.
//  - "Otro origen": un proveedor, SIN permiso de ingreso → queda pendiente con
//    la nota, en las observaciones, sin ningún error.
//  - Se hace en la fábrica sin planillas: "Se produjo antes y no está
//    cargado" con la nota obligatoria.
// Los datos se suman con 'maqueta.cambios' (no se tocan los de otras pruebas).
const { test, expect } = require('@playwright/test');
const { vigilarErrores, captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

function anotarRpc(page) {
  const rpc = [];
  page.on('console', async (m) => {
    if (!m.text().startsWith('[maqueta] rpc')) return;
    const args = m.args();
    try { rpc.push({ nombre: await args[1].jsonValue(), params: await args[2].jsonValue() }); } catch { /* nada */ }
  });
  return rpc;
}
const sinScrollHorizontal = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

const PLANILLAS = [{ turno_id: 't-2', fecha: '2026-10-13', turno: 'Mañana', maquina: 'Máquina 2', lote: 6237, estado: 'abierto' }];
const FALTANTE = { renglon: 1, item_id: 'it-1', presentacion_id: 'pr1', marca_id: null, producto: 'Cucurucho grande', presentacion: 'Caja x 100', pedidas: 30, faltaron: 20 };

async function abrirCarga(page, { origen, tareasExtra = [], rpc = {} }) {
  page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(new Date('2026-10-13T10:30:00-03:00'));
  await page.goto(`${MAQUETA}/modulos/retiros.html?maqueta=retiros`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async ({ origen, tareasExtra, rpc, PLANILLAS, FALTANTE }) => {
    const datos = await fetch('/maqueta/datos/retiros.json').then(r => r.json());
    const productos = datos.tablas.productos_terminados.map(p => p.id === 'p1' ? { ...p, ...origen } : p);
    sessionStorage.setItem('maqueta.cambios', JSON.stringify({
      tablas: {
        productos_terminados: productos,
        unidades_negocio: [
          { id: 'u-n', nombre: 'Cucuruchos Nuss', activo: true, es_prueba: false },
          { id: 'u-d', nombre: 'Dolce Pasta', activo: true, es_prueba: false },
          { id: 'u-m', nombre: 'Mengui', activo: true, es_prueba: false },
        ],
        proveedores: [
          { id: 'pv-1', razon_social: 'RODRIGO ARRASCAETA', activo: true },
          { id: 'pv-2', razon_social: 'Molino Fénix', activo: true },
        ],
        empleado_tareas: [...datos.tablas.empleado_tareas, ...tareasExtra],
      },
      rpc: {
        lotes_para_retiro: [{ lote: '7010-2', cajas: 10, desde: '2026-09-10' }],
        registrar_orden_retiro: { orden_id: 'o-1', numero: 12, codigo: 'N-0012', stock_insuficiente: [FALTANTE] },
        planillas_en_curso: PLANILLAS,
        faltante_en_produccion: 'en_produccion',
        ingresar_producto_terminado: { ok: true },
        faltante_a_lote: null,
        ...rpc,
      },
    }));
  }, { origen, tareasExtra, rpc, PLANILLAS, FALTANTE });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-empresa]').first()).toBeVisible();
  await page.locator('[data-empresa="u-n"]').click();
  await page.locator('#rt-cliente-buscar').fill('turco');
  await page.locator('[data-cliente]').first().click();
  await page.locator('[data-r-producto][data-presentacion="pr1"]').first().click();
  await page.locator('[data-r-cajas="0"]').fill('30');
}

// La pregunta entra en la pantalla y sus botones se pueden tocar.
async function preguntaEntera(page, selBoton) {
  const caja = page.locator('[data-r-origen-caja]');
  await expect(caja).toBeVisible();
  await caja.scrollIntoViewIfNeeded();
  const r = await caja.boundingBox();
  const vp = page.viewportSize();
  expect(r.x, 'la pregunta no se sale por la izquierda').toBeGreaterThanOrEqual(0);
  expect(r.x + r.width, 'ni por la derecha').toBeLessThanOrEqual(vp.width + 0.5);
  expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
  if (selBoton) {
    const b = page.locator(selBoton).first();
    // Al medio de la pantalla: en el celular la acción del renglón va fija
    // abajo (y el renglón deja lugar para que nada quede debajo).
    await b.evaluate(el => el.scrollIntoView({ block: 'center' }));
    const rb = await b.boundingBox();
    expect(rb.height, 'botón de 44 px o más').toBeGreaterThanOrEqual(44);
    const encima = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y)?.closest('[data-r-origen]');
      return el ? el.dataset.rOrigen : null;
    }, [rb.x + rb.width / 2, rb.y + rb.height / 2]);
    expect(encima, 'nada tapa el botón').not.toBeNull();
  }
}

// "Agregar" no cierra el renglón sin contestar.
async function noSeAgregaSinContestar(page) {
  await page.locator('[data-r-listo="0"]').click();
  await expect(page.locator('[data-r-listo-error="0"]')).toHaveText('Falta: decir de dónde salen las cajas.');
  await expect(page.locator('[data-r-origen-caja]')).toContainText('Falta decir de dónde salen las cajas.');
}

async function confirmar(page) {
  await page.locator('[data-r-listo="0"]').click();
  await page.locator('#rt-revisar').click();
  await expect(page.locator('#rt-vista-resumen')).toBeVisible();
  await page.locator('#rt-confirmar').click();
  await expect(page.locator('#rt-hecho')).toContainText('N-0012');
}

const TAMANOS = [[390, 844], [360, 780], [1000, 540], [1280, 900]];

for (const [ancho, alto] of TAMANOS) {
  test(`${ancho} px: se hace en la fábrica → la planilla abierta`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirCarga(page, { origen: { origen_tipo: 'fabrica' } });
    const caja = page.locator('[data-r-origen-caja]');
    await expect(caja).toContainText('Hay 10 cajas, faltan 20 cajas. ¿De dónde salen?');
    const planilla = caja.locator('[data-r-origen="planilla"][data-turno="t-2"]');
    await expect(planilla).toHaveText('Máquina 2 · Mañana · lote 6237');
    await expect(caja.locator('[data-r-origen="otro"]')).toHaveCount(0);
    await preguntaEntera(page, '[data-r-origen="planilla"]');
    await noSeAgregaSinContestar(page);
    await captura(page, `origen-fabrica-${ancho}`, info);
    await planilla.click();
    await expect(planilla).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-r-origen-caja]')).not.toContainText('Falta decir');
    await confirmar(page);
    expect(rpc.find(r => r.nombre === 'faltante_en_produccion')?.params).toEqual({ p_item_id: 'it-1', p_turno_id: 't-2' });
    await expect(page.locator('#rt-hecho')).toContainText('Esperando la planilla de Máquina 2 (lote 6237)');
    await expect(page.locator('#rt-falt'), 'el cartel no se abre: ya se contestó').toBeHidden();
    expect(await sinScrollHorizontal(page)).toBe(true);
    expect(errores, 'sin errores de JavaScript').toEqual([]);
  });

  test(`${ancho} px: viene de Mengui → el ingreso y el lote`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirCarga(page, {
      origen: { origen_tipo: 'unidad', origen_unidad_id: 'u-m' },
      tareasExtra: [{ empleado_id: 'emp-1', modulo: 'materia_prima', tarea: 'cargar', alcance: { todas: true }, habilitado: true }],
    });
    const caja = page.locator('[data-r-origen-caja]');
    const habitual = caja.locator('[data-r-origen="habitual"]');
    await expect(habitual).toHaveText('Vienen de Mengui');
    await expect(caja.locator('[data-r-origen="otro"]')).toHaveText('Otro origen');
    await expect(caja.locator('[data-r-origen="planilla"]')).toHaveCount(0);
    await preguntaEntera(page, '[data-r-origen="habitual"]');
    await habitual.click();
    await expect(page.locator('[data-r-origen-caja]')).toContainText('Al confirmar se carga el ingreso de las 20 cajas en el lote MENGUI-1310.');
    await captura(page, `origen-mengui-${ancho}`, info);
    await confirmar(page);
    const nombres = rpc.map(r => r.nombre).filter(n => ['registrar_orden_retiro', 'ingresar_producto_terminado', 'faltante_a_lote'].includes(n));
    expect(nombres).toEqual(['registrar_orden_retiro', 'ingresar_producto_terminado', 'faltante_a_lote']);
    const ing = rpc.find(r => r.nombre === 'ingresar_producto_terminado').params;
    expect(ing.p_unidad_negocio_id).toBe('u-n');
    expect(ing.p_unidad_origen_id).toBe('u-m');
    expect(ing.p_proveedor_id).toBeNull();
    expect(ing.p_items).toEqual([{ presentacion_id: 'pr1', marca_id: null, cajas: 20, lote: 'MENGUI-1310' }]);
    expect(ing.p_observaciones).toBe('Faltante de la orden N-0012');
    expect(ing.p_client_uuid).toMatch(/^[0-9a-f-]{36}$/);
    expect(rpc.find(r => r.nombre === 'faltante_a_lote').params).toEqual({ p_item_id: 'it-1', p_lote: 'MENGUI-1310', p_motivo: 'Viene de Mengui' });
    await expect(page.locator('#rt-hecho')).toContainText('Salieron del lote MENGUI-1310');
    await expect(page.locator('#rt-falt')).toBeHidden();
    expect(errores, 'sin errores de JavaScript').toEqual([]);
  });

  test(`${ancho} px: otro origen (un proveedor), sin permiso de ingreso`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirCarga(page, { origen: { origen_tipo: 'unidad', origen_unidad_id: 'u-m' } });
    const caja = page.locator('[data-r-origen-caja]');
    await caja.locator('[data-r-origen="otro"]').click();
    const buscar = page.locator('[data-r-origen-buscar="0"]');
    await expect(buscar).toBeFocused();
    await expect(page.locator('[data-r-origen-resultados="0"]')).toContainText('Dolce Pasta');
    await expect(page.locator('[data-r-origen-resultados="0"]')).not.toContainText('Cucuruchos Nuss');
    await buscar.fill('rodr');
    await preguntaEntera(page, '[data-r-origen="elegir"][data-id="pv-1"]');
    await captura(page, `origen-otro-${ancho}`, info);
    await page.locator('[data-r-origen="elegir"][data-id="pv-1"]').click();
    await expect(page.locator('[data-r-origen-caja]')).toContainText('Vienen de RODRIGO ARRASCAETA');
    await expect(page.locator('[data-r-origen-caja]')).toContainText('Con tu usuario no se puede cargar el ingreso: el renglón queda pendiente con la nota «Viene de RODRIGO ARRASCAETA, falta cargar el ingreso».');
    await confirmar(page);
    expect(rpc.some(r => r.nombre === 'ingresar_producto_terminado' || r.nombre === 'faltante_a_lote'), 'sin permiso no se intenta el ingreso').toBe(false);
    const orden = rpc.find(r => r.nombre === 'registrar_orden_retiro').params;
    expect(orden.p_observaciones).toBe('Renglón 1 (Cucurucho grande · Caja x 100): Viene de RODRIGO ARRASCAETA, falta cargar el ingreso');
    await expect(page.locator('#rt-hecho')).toContainText('Pendiente para Administración: Viene de RODRIGO ARRASCAETA, falta cargar el ingreso');
    await expect(page.locator('#rt-falt')).toBeHidden();
    expect(errores, 'sin errores de JavaScript').toEqual([]);
  });

  test(`${ancho} px: fábrica sin planillas → "se produjo antes" con nota`, async ({ page }, info) => {
    const errores = vigilarErrores(page);
    const rpc = anotarRpc(page);
    await page.setViewportSize({ width: ancho, height: alto });
    await abrirCarga(page, { origen: { origen_tipo: 'fabrica' }, rpc: { planillas_en_curso: [] } });
    const caja = page.locator('[data-r-origen-caja]');
    await expect(caja).toContainText('No hay ninguna planilla abierta.');
    await caja.locator('[data-r-origen="antes"]').click();
    const nota = page.locator('[data-r-origen-nota="0"]');
    await expect(nota).toBeFocused();
    await nota.fill('ab');
    await noSeAgregaSinContestar(page);
    await nota.fill('Se hizo el lunes y no se cargó');
    await preguntaEntera(page, '[data-r-origen="antes"]');
    await captura(page, `origen-antes-${ancho}`, info);
    await confirmar(page);
    const orden = rpc.find(r => r.nombre === 'registrar_orden_retiro').params;
    expect(orden.p_observaciones).toBe('Renglón 1 (Cucurucho grande · Caja x 100): se produjo antes y no está cargado — Se hizo el lunes y no se cargó');
    await expect(page.locator('#rt-hecho')).toContainText('Pendiente para Administración: Se produjo antes y no está cargado: Se hizo el lunes y no se cargó');
    expect(rpc.some(r => /^faltante_|ingresar_/.test(r.nombre))).toBe(false);
    expect(errores, 'sin errores de JavaScript').toEqual([]);
  });
}
