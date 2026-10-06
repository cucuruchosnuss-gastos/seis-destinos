// LA PLANTA SIN INTERNET (06/10/2026), en un navegador de verdad.
//
// Una mañana se cortó internet y la planta no se pudo usar. Esta prueba corre
// la planta REAL (con su service worker, sw-planta.js, y el supabase-js real)
// contra un Supabase simulado en la red (e2e/backend-simulado.js), y corta la
// red con context.setOffline(true):
//  1. con red: abre, el service worker guarda la app y la planta guarda la
//     copia de los datos;
//  2. sin red: carga 3 cajas, una parada y "empezó a producir";
//  3. RECARGA sin red: abre desde la copia y muestra la cola;
//  4. vuelve la red: se mandan solas, en orden, una vez cada una; reenviar
//     una misma clave da reintento: true y no duplica.
// A 1000 × 540 (la tablet real apaisada) y a 390 px.
const { test, expect } = require('@playwright/test');
const { backendSimulado, sembrarSesion, DATOS_PLANTA, URL_SUPABASE } = require('./backend-simulado');

const URL_PLANTA = '/modulos/produccion.html';

function hoyAr(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function datos(ejecuciones) {
  const hoy = hoyAr();
  const turno = { id: 't-1', lote: 7023, maquina_id: 'm-1', unidad_negocio_id: 'u-1', fecha: hoy, turno: 'Mañana', encargado_id: 'p-1',
    abierto_en: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), estado: 'abierto', forzado_por: null, forzado_en: null, forzado_motivo: null,
    hora_inicio: null, hora_fin: null, hora_largada: null };
  const claves = new Map();
  return {
    tablas: {
      ...DATOS_PLANTA.tablas,
      unidades_negocio: [{ id: 'u-1', nombre: 'Cucuruchos Nuss', activo: true, es_prueba: false, caja_predeterminada_id: null }],
      turnos_produccion: [turno],
      turno_operarios: [], masas: [], paradas_produccion: [], produccion_items: [],
      productos_terminados: [{ id: 'p-mini', unidad_negocio_id: 'u-1', nombre: 'Cucuruchón Mini', tipo_masa: 'Común', activo: true, orden: 1, color: null, origen_producto_id: null }],
      producto_presentaciones: [{ id: 'pr-caja', producto_id: 'p-mini', nombre: 'Caja', con_cono: false, media_caja: false, empaque: null, unidades_por_caja: 600, orden: 1, activa: true }],
      marcas_personalizadas: [], presentacion_cajas: [], presentacion_empaque: [], insumos: [],
      motivos_parada: [{ id: 'mo-luz', nombre: 'Corte de luz', categoria: 'falla', pide_detalle: false, orden: 1, activo: true }],
      horarios_turno: [], recetas: [], ingredientes: [],
    },
    rpc: {
      ...DATOS_PLANTA.rpc,
      que_falta_para_cerrar: [], scrap_de_referencia: null, stock_para_masa: [], datos_para_masa: null,
      // La puerta de la cola: la misma clave devuelve lo mismo con reintento.
      ejecutar_tablet: (body) => {
        const id = body?.p_client_uuid;
        if (claves.has(id)) return { ...claves.get(id), reintento: true };
        ejecuciones.push({ id, op: body?.p_operacion, params: body?.p_params });
        const n = ejecuciones.length;
        const res = body?.p_operacion === 'registrar_parada' ? { parada_id: 'par-' + n }
          : body?.p_operacion === 'registrar_produccion_item' ? { produccion_item_id: 'pi-' + n, sublote: '7023-' + n, unidades: (body.p_params?.p_cajas ?? 0) * 600, embolsado: 'ninguno' }
            : {};
        claves.set(id, res);
        return { ...res, reintento: false };
      },
    },
  };
}

async function contarCopias(page) {
  return page.evaluate(() => new Promise((res) => {
    const p = indexedDB.open('sd-planta');
    p.onsuccess = () => {
      try {
        const tx = p.result.transaction('copias', 'readonly').objectStore('copias').getAllKeys();
        tx.onsuccess = () => res(tx.result.map(String));
        tx.onerror = () => res([]);
      } catch { res([]) }
    };
    p.onerror = () => res([]);
  }));
}

for (const tam of [{ ancho: 1000, alto: 540 }, { ancho: 390, alto: 844 }]) {
  test(`sin internet: carga, recarga desde la copia y manda sola al volver (${tam.ancho} px)`, async ({ browser }) => {
    test.setTimeout(180000);
    const context = await browser.newContext({ serviceWorkers: 'allow', viewport: { width: tam.ancho, height: tam.alto }, locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires', baseURL: 'http://localhost:4173' });
    const page = await context.newPage();
    const errores = [];
    page.on('pageerror', e => errores.push(e.message));
    const ejecuciones = [];
    const b = await backendSimulado(page, datos(ejecuciones));
    await sembrarSesion(page, { venceEn: 3600 });
    // La tablet ya estaba en Producción con el encargado adentro.
    await page.addInitScript(() => {
      try {
        localStorage.setItem('produccion.modo', 'produccion');
        sessionStorage.setItem('produccion.persona.produccion', JSON.stringify({ id: 'p-1', nombre: 'Federico Silva', puesto: 'encargado' }));
      } catch { /* nada */ }
    });

    // 1 · Con red: abre, se instala el service worker y se guarda la copia.
    await page.goto(URL_PLANTA);
    await expect(page.locator('#pr-tablero')).toContainText('Máquina 1');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect(page.locator('#pr-tablero')).toContainText('Máquina 1');
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 20000 }).toBe(true);
    await expect.poll(() => page.evaluate(async () => (await caches.keys()).some(k => k.startsWith('planta-app-'))), { timeout: 60000 }).toBe(true);
    // La copia de los datos: la precarga terminó (la planilla abierta, el
    // personal, los productos, los motivos de parada).
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.copiaLista ?? ''), { timeout: 60000 }).not.toBe('');
    const k = await contarCopias(page);
    expect(k.some(x => x.includes('/rest/v1/producto_presentaciones'))).toBe(true);
    expect(k.some(x => x.includes('/rpc/personal_produccion'))).toBe(true);
    expect(k.some(x => x.includes('/rest/v1/motivos_parada'))).toBe(true);
    expect(k.some(x => x.includes('ejecutar_tablet'))).toBe(false);

    // 2 · Se corta internet.
    await context.setOffline(true);
    b.sinRed(true);
    await page.locator('[data-producido="t-1"]').click();
    // Lo producido: 3 cajas con la calculadora (+3).
    await page.locator('#pr-btn-agregar-producto').click();
    await page.locator('[data-ag-producto="p-mini"]').click();
    const presentacion = page.locator('[data-ag-presentacion]').first();
    if (await presentacion.isVisible().catch(() => false)) await presentacion.click();
    await page.locator('[data-cajas-sumar="3"]').click();
    await page.locator('#pr-agregar-confirmar').click();
    await expect(page.locator('#pr-cola-cartel')).toContainText('Sin internet · 1 carga esperando · se mandan solas');
    await expect(page.locator('#pr-planilla-producido')).toContainText('pendiente de enviar');
    // Una parada (que sigue).
    await page.locator('#pr-planilla-paradas-resumen').click();
    await page.locator('[data-motivo="mo-luz"]').click();
    await page.locator('[data-parada-hora]').first().click();
    await page.locator('#pr-hora-ventana-guardar').click();
    await page.locator('[data-parada-sigue]').click();
    await page.locator('#pr-btn-guardar-parada').click();
    await expect(page.locator('#pr-cola-cartel')).toContainText('2 cargas esperando');
    // "Empezó a producir".
    await page.locator('[data-seccion="planilla"]').first().click();
    await page.locator('#pr-btn-largada').click();
    await page.locator('#pr-hora-ventana-guardar').click();
    await expect(page.locator('#pr-cola-cartel')).toContainText('Sin internet · 3 cargas esperando · se mandan solas');

    // 3 · RECARGAR sin internet: abre desde la copia y muestra la cola.
    await page.reload();
    await expect(page.locator('#pr-tablero')).toContainText('Máquina 1', { timeout: 20000 });
    await expect(page.locator('#pr-cola-cartel')).toContainText('Sin internet · 3 cargas esperando · se mandan solas');
    await expect(page.locator('#pr-cola-cartel')).toContainText('Datos de las');
    await page.locator('[data-producido="t-1"]').click();
    await expect(page.locator('#pr-planilla-producido')).toContainText('pendiente de enviar');
    // La sesión NO se cerró por estar sin red.
    await expect(page.locator('#pr-entrar')).toBeHidden();
    expect(ejecuciones.length).toBe(0);

    // 4 · Vuelve la red: se mandan solas, en orden, una vez cada una.
    b.sinRed(false);
    await context.setOffline(false);
    await expect.poll(() => ejecuciones.length, { timeout: 45000 }).toBe(3);
    expect(ejecuciones.map(e => e.op)).toEqual(['registrar_produccion_item', 'registrar_parada', 'registrar_hora_largada']);
    expect(new Set(ejecuciones.map(e => e.id)).size).toBe(3);
    expect(ejecuciones[0].params.p_cajas).toBe(3);
    await expect(page.locator('#pr-cola-cartel')).toContainText('Todo enviado ✓');
    // Reenviar una misma clave: reintento y no duplica.
    const clave = ejecuciones[0].id;
    const re = await page.evaluate(async ([url, k, clave]) => {
      const r = await fetch(url + '/rest/v1/rpc/ejecutar_tablet', { method: 'POST', headers: { apikey: k, 'content-type': 'application/json' },
        body: JSON.stringify({ p_client_uuid: clave, p_operacion: 'registrar_produccion_item', p_params: { p_cajas: 3 } }) });
      return r.json();
    }, [URL_SUPABASE, 'sb_publishable_G8GZe2uAvb6VdJ1S4DD8nA_CC7iugYw', clave]);
    expect(re.reintento).toBe(true);
    expect(ejecuciones.length).toBe(3);
    // Sin scroll horizontal.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    expect(errores, errores.join('\n')).toEqual([]);
    await context.close();
  });
}

test('abrir una planilla nueva sin internet: el mensaje claro', async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1000, height: 540 }, locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires', baseURL: 'http://localhost:4173' });
  const page = await context.newPage();
  const ejecuciones = [];
  const d = datos(ejecuciones);
  d.tablas.turnos_produccion = [];
  const b = await backendSimulado(page, d);
  await sembrarSesion(page, { venceEn: 3600 });
  await page.addInitScript(() => {
    localStorage.setItem('produccion.modo', 'produccion');
    sessionStorage.setItem('produccion.persona.produccion', JSON.stringify({ id: 'p-1', nombre: 'Federico Silva', puesto: 'encargado' }));
  });
  await page.goto(URL_PLANTA);
  await expect(page.locator('#pr-tablero')).toContainText('Máquina 1');
  await context.setOffline(true);
  b.sinRed(true);
  await page.locator('[data-abrir-libre="m-1"]').click();
  await expect(page.locator('#toast-global')).toContainText('Sin internet no se puede abrir una planilla nueva');
  expect(ejecuciones.length).toBe(0);
  await context.close();
});
