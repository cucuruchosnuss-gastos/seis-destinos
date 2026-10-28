// LA TABLET SIN INTERNET CON EL WIFI CONECTADO (27/10/2026), en un navegador
// de verdad.
//
// El caso real: se cortó internet con el wifi conectado (navigator.onLine
// seguía en true), la tablet volvió por inactividad a "¿Quién sos?" y el
// masero no pudo poner el PIN, así que no pudo cargar la masa.
//
// Corre la planta REAL (el supabase-js real) contra el Supabase simulado
// (e2e/backend-simulado.js) con los datos de la maqueta de la planta, y corta
// la red de las DOS formas:
//  a) SOLO Supabase bloqueado (el wifi "conectado": navigator.onLine sigue
//     en true): el chequeo de cada 30 s lo descubre y el cartel dice Sin
//     internet;
//  b) context.setOffline(true).
// En los dos: el masero entró una vez CON red; sin red cambia de persona y
// vuelve a entrar con su PIN (el hash guardado), en "modo sin internet";
// registra una masa con lotes ya cargados y otra con un lote escrito a mano;
// las dos quedan en la cola y, al volver la red, salen solas, una vez cada
// una (p_client_uuid), y la tablet le pide el PIN de nuevo.
// A 1000 × 540 (la tablet real apaisada).
const { test, expect } = require('@playwright/test');
const { backendSimulado, sembrarSesion, USUARIO } = require('./backend-simulado');
const { marcarPin } = require('./pasos-planta');
const PRODUCCION = require('./maqueta/datos/produccion.json');

const URL_PLANTA = '/modulos/produccion.html';
const persona = (page, nombre) => page.locator('#pr-quien-lista [data-persona]', { hasText: nombre });

function datos(base) {
  const d = JSON.parse(JSON.stringify(PRODUCCION));
  d.tablas.empleados = d.tablas.empleados.map(e => ({ ...e, auth_user_id: USUARIO.id }));
  d.rpc.registrar_error_app = null;
  d.rpc.que_falta_para_cerrar = [];
  d.rpc.scrap_de_referencia = null;
  // El PIN de Agustín es 7391.
  d.rpc.verificar_pin_produccion = (b) => {
    base.verifica++;
    return b?.p_empleado_id === 'emp-agus' && b?.p_pin === '7391'
      ? { ok: true, debe_cambiar: false }
      : { ok: false, motivo: 'pin_incorrecto', intentos_restantes: 4 };
  };
  // registrar_masa: a prueba de duplicados con su p_client_uuid.
  d.rpc.registrar_masa = (b) => {
    const ya = base.masas.find(m => m.p_client_uuid === b?.p_client_uuid);
    if (ya) { base.reintentos++; return { masa_id: ya.masa_id, nro: ya.nro, reintento: true }; }
    const m = { ...b, masa_id: 'ma-nueva-' + (base.masas.length + 1), nro: 10 + base.masas.length };
    base.masas.push(m);
    return { masa_id: m.masa_id, nro: m.nro };
  };
  return d;
}

// Elige Simple y, para cada lote que falta, el primero de la lista (o lo
// escribe a mano, si se pide).
async function prepararMasa(page, { escribir = null } = {}) {
  await page.locator('[data-doble="no"]').first().click();
  for (let vuelta = 0; vuelta < 12; vuelta++) {
    const falta = page.locator('[data-lote]', { hasText: 'Elegí el lote' }).first();
    if (!(await falta.count())) break;
    await falta.click();
    const panel = page.locator('#pr-lote-panel');
    await expect(panel).toBeVisible();
    if (escribir) {
      await panel.locator('[data-lote-escribir]').click();
      await page.locator('#pr-lote-panel-escribir').fill(escribir);
      await page.locator('#pr-lote-panel-usar').click();
      escribir = null;
    } else {
      await panel.locator('[data-lote-op]').first().click();
      await page.locator('#pr-lote-panel-usar-lista').click();
    }
    await expect(panel).toBeHidden();
  }
}

for (const corte of ['solo-supabase', 'sin-red']) {
  test(`tablet sin internet (${corte}): el PIN guardado y las masas en la cola`, async ({ browser }) => {
    test.setTimeout(4 * 60 * 1000);
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1000, height: 540 }, locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires', baseURL: process.env.E2E_BASE || 'http://localhost:4173' });
    const page = await context.newPage();
    const errores = [];
    page.on('pageerror', e => errores.push(e.message));
    const base = { verifica: 0, masas: [], reintentos: 0 };
    const b = await backendSimulado(page, datos(base));
    await sembrarSesion(page, { venceEn: 3600 });
    await page.addInitScript(() => { try { localStorage.setItem('produccion.modo', 'masa'); } catch { /* nada */ } });

    // 1 · Con red: el masero entra (la tablet guarda el hash de su PIN).
    await page.goto(URL_PLANTA);
    await persona(page, 'Agustín Barrera').click();
    await marcarPin(page, '7391');
    await expect(page.locator('#pr-sala')).toBeVisible();
    expect(base.verifica).toBe(1);
    await expect(page.locator('#pr-lat-sin-red')).toHaveCount(0);
    // La receta abierta con red (su copia queda en la tablet).
    await page.locator('[data-sala-turno="t1"]').first().click();
    await expect(page.locator('#pr-receta')).toContainText('Esencia de vainilla');
    await page.locator('#pr-cab-volver').click();
    await expect(page.locator('#pr-sala')).toBeVisible();
    // El hash ya está (nunca el PIN).
    await expect.poll(() => page.evaluate(() => new Promise((res) => {
      const p = indexedDB.open('sd-planta-pines');
      p.onsuccess = () => { try { const r = p.result.transaction('pines').objectStore('pines').getAll(); r.onsuccess = () => res(JSON.stringify(r.result)); } catch { res('') } };
      p.onerror = () => res('');
    })), { timeout: 15000 }).toContain('"hash"');
    const pines = await page.evaluate(() => new Promise((res) => {
      const p = indexedDB.open('sd-planta-pines');
      p.onsuccess = () => { const r = p.result.transaction('pines').objectStore('pines').getAll(); r.onsuccess = () => res(JSON.stringify(r.result)); };
    }));
    expect(pines).not.toContain('7391');
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }))).not.toContain('7391');

    // 2 · Se corta internet.
    b.sinRed(true);
    if (corte === 'sin-red') await context.setOffline(true);
    else expect(await page.evaluate(() => navigator.onLine)).toBe(true);
    // El chequeo de cada 30 s (o el navegador) lo descubre: el cartel lo dice.
    await expect(page.locator('#pr-cola-cartel')).toContainText('Sin internet', { timeout: 45000 });

    // 3 · Cambia de persona y vuelve a entrar SIN red, con su PIN.
    await page.locator('#pr-lat-cambiar').click();
    await persona(page, 'Agustín Barrera').click();
    await marcarPin(page, '1111');
    await expect(page.locator('#pr-pin-mensaje')).toContainText('PIN incorrecto · te quedan 4 intentos');
    await marcarPin(page, '7391');
    await expect(page.locator('#pr-sala')).toBeVisible();
    await expect(page.locator('#pr-lat-sin-red')).toContainText('Modo sin internet');
    const verificadasConRed = base.verifica;

    // 4 · Una masa con lotes ya cargados, sin red.
    await page.locator('[data-sala-turno="t1"]').first().click();
    await expect(page.locator('#pr-receta')).toContainText('Esencia de vainilla');
    await prepararMasa(page);
    await page.locator('#pr-receta-registrar').click();
    await expect(page.locator('#pr-cola-cartel')).toContainText('1 carga esperando', { timeout: 20000 });
    // La masa quedó en la tablet, "esperando conexión", y la receta sigue
    // abierta para la próxima.
    await expect(page.locator('#pr-receta')).toContainText('esperando conexión');
    // 5 · Otra, con un lote escrito a mano (un lote nuevo): tampoco necesita red.
    await expect(page.locator('#pr-receta')).toBeVisible();
    await page.locator('[data-lote]').first().click();
    const panel = page.locator('#pr-lote-panel');
    await expect(panel).toBeVisible();
    await panel.locator('[data-lote-escribir]').click();
    await page.locator('#pr-lote-panel-escribir').fill('LOTE-SIN-RED-1');
    await page.locator('#pr-lote-panel-usar').click();
    await expect(panel).toBeHidden();
    await prepararMasa(page);
    await page.locator('#pr-receta-registrar').click();
    await expect(page.locator('#pr-cola-cartel')).toContainText('2 cargas esperando', { timeout: 20000 });
    expect(base.masas.length).toBe(0);
    expect(base.verifica).toBe(verificadasConRed);

    // 6 · Vuelve la red: salen solas, una vez cada una.
    b.sinRed(false);
    if (corte === 'sin-red') await context.setOffline(false);
    await expect.poll(() => base.masas.length, { timeout: 60000 }).toBe(2);
    expect(new Set(base.masas.map(m => m.p_client_uuid)).size).toBe(2);
    expect(base.masas.some(m => (m.p_items ?? []).some(it => it.lote === 'LOTE-SIN-RED-1'))).toBe(true);
    await expect(page.locator('#pr-cola-cartel')).toContainText('Todo enviado ✓', { timeout: 20000 });
    // Reenviar una misma clave: la base contesta reintento y no duplica.
    const clave = base.masas[0].p_client_uuid;
    const re = await page.evaluate(async ([url, k, cuerpo]) => {
      const r = await fetch(url + '/rest/v1/rpc/registrar_masa', { method: 'POST', headers: { apikey: k, 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });
      return r.json();
    }, ['https://xtorxouhzuizdvawqakb.supabase.co', 'sb_publishable_G8GZe2uAvb6VdJ1S4DD8nA_CC7iugYw', base.masas[0]]);
    expect(re.reintento).toBe(true);
    expect(base.masas.length).toBe(2);
    expect(clave).toBeTruthy();

    // 7 · Con la red de vuelta, el PIN otra vez (lo verifica la base).
    await expect(page.locator('#pr-pin-mensaje')).toContainText('Volvió internet', { timeout: 20000 });
    await marcarPin(page, '7391');
    await expect(page.locator('#pr-sala')).toBeVisible();
    await expect(page.locator('#pr-lat-sin-red')).toHaveCount(0);
    expect(base.verifica).toBe(verificadasConRed + 1);

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    expect(errores, errores.join('\n')).toEqual([]);
    await context.close();
  });
}

// Quien nunca entró con red en esta tablet: sin red, el mensaje claro.
test('tablet sin internet: quien no entró con red en los últimos 7 días', async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1000, height: 540 }, locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires', baseURL: process.env.E2E_BASE || 'http://localhost:4173' });
  const page = await context.newPage();
  const base = { verifica: 0, masas: [], reintentos: 0 };
  const b = await backendSimulado(page, datos(base));
  await sembrarSesion(page, { venceEn: 3600 });
  await page.addInitScript(() => { try { localStorage.setItem('produccion.modo', 'masa'); } catch { /* nada */ } });
  await page.goto(URL_PLANTA);
  await expect(persona(page, 'Agustín Barrera')).toBeVisible();
  b.sinRed(true);
  await context.setOffline(true);
  await persona(page, 'Agustín Barrera').click();
  await marcarPin(page, '7391');
  await expect(page.locator('#pr-pin-mensaje')).toContainText('Sin internet. Esta persona tiene que haber entrado con internet en los últimos 7 días.');
  await expect(page.locator('#pr-sala')).toBeHidden();
  expect(base.verifica).toBe(0);
  await context.close();
});
