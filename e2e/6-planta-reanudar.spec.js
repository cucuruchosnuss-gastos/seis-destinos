// LA PLANTA VUELVE SOLA DE ESTAR BLOQUEADA (27/09/2026).
//
// El caso real: una Samsung Galaxy Tab A11 con la planta instalada y anclada;
// al bloquear y desbloquear, quedó en blanco. Bloquearse es normal en la
// fábrica: la app TIENE que volver como estaba.
//
// Se corre la planta REAL —con el supabase-js real y su manejo de la sesión—
// contra un Supabase simulado en la red (e2e/backend-simulado.js), así no
// hacen falta credenciales y corre en cada push. La página se congela como la
// congela Android (CDP Page.setWebLifecycleState 'frozen') y el reloj avanza
// minutos (page.clock).
//
// Lo que se reprodujo ANTES del arreglo (escenario "recarga sin red"): con la
// página descartada y recargada con el token vencido y la red que todavía no
// volvió, la planta se quedaba muda en "Cargando…" hasta que volviera la red.
const { test, expect } = require('@playwright/test');
const { backendSimulado, sembrarSesion, DATOS_PLANTA } = require('./backend-simulado');

const URL_PLANTA = '/modulos/produccion.html';

async function abrirPlanta(page, { venceEn = 3600, ancho = 1280, alto = 800 } = {}) {
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.setViewportSize({ width: ancho, height: alto });
  const b = await backendSimulado(page, DATOS_PLANTA);
  await page.clock.install();
  await sembrarSesion(page, { venceEn });
  await page.goto(URL_PLANTA);
  await expect(page.locator('#pr-quien-lista')).toContainText('Federico Silva');
  // Una marca en la memoria de la página: si al volver sigue, NO se recargó.
  await page.evaluate(() => {
    window.__marca = 'misma página';
    window.__reanudadas = 0;
    window.addEventListener('app:reanudada', () => { window.__reanudadas++ });
  });
  return { b, errores };
}

async function congelar(page, context, minutos) {
  const cdp = await context.newCDPSession(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await cdp.send('Page.setWebLifecycleState', { state: 'frozen' });
  await page.clock.fastForward(minutos * 60 * 1000);
  return async () => {
    await cdp.send('Page.setWebLifecycleState', { state: 'active' });
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
      document.dispatchEvent(new Event('resume'));
    });
  };
}

async function avanzar(page, segundos) {
  await page.clock.fastForward(segundos * 1000);
  await page.waitForTimeout(400);
}

const aviso = (page) => page.locator('#sd-aviso-conexion');

test('la planta sigue siendo instalable (sin errores de instalación) y su alcance es solo su página', async ({ page, context }) => {
  await abrirPlanta(page);
  const cdp = await context.newCDPSession(page);
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  expect(installabilityErrors, JSON.stringify(installabilityErrors)).toEqual([]);
  const m = await cdp.send('Page.getAppManifest');
  expect(m.errors ?? [], JSON.stringify(m.errors)).toEqual([]);
  const manifiesto = JSON.parse(m.data);
  expect(manifiesto.scope).toBe('modulos/produccion.html');
  expect(manifiesto.start_url).toBe('modulos/produccion.html');
  // La app general NO puede reclamar ese mismo alcance siendo igual de
  // específica: la de la planta es más específica.
  const general = await (await page.request.get('/manifest.json')).json();
  expect(general.scope).toBe('.');
});

test('congelada 5 minutos: vuelve a la MISMA pantalla, con los mismos datos, sin navegar', async ({ page, context }) => {
  const { errores } = await abrirPlanta(page);
  const volver = await congelar(page, context, 5);
  await volver();
  await avanzar(page, 2);
  await expect(page.locator('#pr-quien-lista')).toContainText('Federico Silva');
  expect(await page.evaluate(() => window.__marca)).toBe('misma página');
  expect(new URL(page.url()).pathname).toBe(URL_PLANTA);
  await expect.poll(() => page.evaluate(() => window.__reanudadas)).toBeGreaterThan(0);
  await expect(aviso(page)).toBeHidden();
  expect(errores).toEqual([]);
});

test('el token vence mientras está congelada: al volver se renueva solo, sin ir al login', async ({ page, context }) => {
  const { b } = await abrirPlanta(page, { venceEn: 120 });
  const volver = await congelar(page, context, 90);
  const antes = b.refrescos;
  await volver();
  await avanzar(page, 2);
  expect(b.refrescos).toBeGreaterThan(antes);
  await expect(page.locator('#pr-quien-lista')).toContainText('Federico Silva');
  expect(await page.evaluate(() => window.__marca)).toBe('misma página');
  await expect(page.locator('#pr-entrar')).toBeHidden();
  expect(new URL(page.url()).pathname).toBe(URL_PLANTA);
});

test('sin red al volver: "Sin conexión, reintentando…" y, cuando vuelve la red, sigue sola', async ({ page, context }) => {
  const { b } = await abrirPlanta(page, { venceEn: 120 });
  const volver = await congelar(page, context, 90);
  b.sinRed(true);
  await volver();
  await avanzar(page, 1);
  await expect(aviso(page)).toBeVisible();
  await expect(aviso(page)).toHaveText('Sin conexión, reintentando…');
  // Nunca se va al login por un corte de red.
  await expect(page.locator('#pr-entrar')).toBeHidden();
  expect(new URL(page.url()).pathname).toBe(URL_PLANTA);
  b.sinRed(false);
  await avanzar(page, 35);
  await expect(aviso(page)).toBeHidden();
  await expect(page.locator('#pr-quien-lista')).toContainText('Federico Silva');
  expect(await page.evaluate(() => window.__marca)).toBe('misma página');
  // Lo registró (la vuelta costó): un 'reanudar', sin datos sensibles.
  const registros = b.pedidos.filter(p => p.ruta.startsWith('/rest/v1/rpc/registrar_error_app'));
  expect(registros.length).toBeGreaterThan(0);
});

test('la página descartada y recargada sin red (lo que se reprodujo): avisa y se recupera sola', async ({ page, context }) => {
  const { b } = await abrirPlanta(page, { venceEn: 120 });
  const volver = await congelar(page, context, 90);
  b.sinRed(true);
  await volver();
  await page.reload();
  await avanzar(page, 6);
  // ANTES del arreglo: "Cargando…" mudo. Ahora dice qué pasa.
  await expect(aviso(page)).toBeVisible();
  b.sinRed(false);
  await avanzar(page, 35);
  await expect(page.locator('#pr-quien-lista')).toContainText('Federico Silva');
  await expect(aviso(page)).toBeHidden();
  expect(new URL(page.url()).pathname).toBe(URL_PLANTA);
});

test('girar la tablet mientras está bloqueada: vuelve en la otra orientación, sin scroll de costado', async ({ page, context }) => {
  await abrirPlanta(page);
  for (const [ancho, alto] of [[800, 1280], [1280, 800], [800, 1280]]) {
    const volver = await congelar(page, context, 3);
    await page.setViewportSize({ width: ancho, height: alto });
    await volver();
    await avanzar(page, 2);
    await expect(page.locator('#pr-quien-lista')).toContainText('Federico Silva');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  expect(await page.evaluate(() => window.__marca)).toBe('misma página');
});

test('la sesión cortada de verdad (el refresh ya no sirve): el login de la tablet, ADENTRO de la planta', async ({ page, context }) => {
  const { b } = await abrirPlanta(page, { venceEn: 120 });
  const volver = await congelar(page, context, 90);
  b.refrescoFalla(true);
  await volver();
  await avanzar(page, 3);
  await expect(page.locator('#pr-entrar')).toBeVisible();
  await expect(page.locator('#pr-entrar-aviso')).toHaveText('Tu sesión fue cerrada. Volvé a iniciar sesión.');
  // Nunca sale del alcance de la app de la planta (su propia página).
  expect(new URL(page.url()).pathname).toBe(URL_PLANTA);
});

test('sin sesión guardada, la planta pide entrar ahí mismo (no va a login.html)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await backendSimulado(page, DATOS_PLANTA);
  await page.goto(URL_PLANTA);
  await expect(page.locator('#pr-entrar')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(URL_PLANTA);
  await page.locator('#pr-entrar-btn').click();
  await expect(page.locator('#pr-entrar-error')).toHaveText('Completá el mail y la contraseña de la tablet.');
});

// La tablet real (28/09/2026): el registro de errores estaba vacío después de
// una mañana de pruebas. Esto prueba que js/salud.js carga en la planta y que
// llega a registrar_error_app: al abrir, UN evento 'pantalla' con el tamaño.
test('al abrir, registra UNA vez el tamaño de la pantalla (evento "pantalla")', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 540 });
  const registros = [];
  const datos = { ...DATOS_PLANTA, rpc: { ...DATOS_PLANTA.rpc, registrar_error_app: (cuerpo) => { registros.push(cuerpo); return null } } };
  await backendSimulado(page, datos);
  await sembrarSesion(page, { venceEn: 3600 });
  await page.goto(URL_PLANTA);
  await expect(page.locator('#pr-quien-lista')).toContainText('Federico Silva');
  await expect.poll(() => registros.filter(r => r?.p_evento === 'pantalla').length).toBe(1);
  const r = registros.find(x => x.p_evento === 'pantalla');
  expect(r.p_mensaje).toMatch(/^1000px × 540px · DPR 1 · landscape/);
  expect(r.p_pantalla).toBe('produccion');
  await page.reload();
  await expect(page.locator('#pr-quien-lista')).toContainText('Federico Silva');
  await page.waitForTimeout(800);
  expect(registros.filter(x => x.p_evento === 'pantalla').length, 'una sola vez por sesión').toBe(1);
});
