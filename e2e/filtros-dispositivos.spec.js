// LOS FILTROS EN TODOS LOS DISPOSITIVOS (04/10/2026, pedido del fin de semana).
//
// En el celular de Tomás (Android) tocar "Desde" o "Hasta" en Gastos no abría
// el calendario y los botones se pisaban. Esta prueba abre cada pantalla con
// barra de filtros en la maqueta (Supabase falso, sin sesión ni base) en cuatro
// dispositivos —Android en Chromium a 360 y 412 px, iPhone en WebKit a 390 y la
// compu a 1280— y por cada control de filtro mira:
//   - que se vea entero y no lo corte su contenedor ni el borde de la pantalla;
//   - que document.elementFromPoint en su centro devuelva ESE control (que no
//     haya otro encima) y que no se pise con otro control;
//   - que tocarlo haga lo suyo: el control de período (js/periodo.js) abre su
//     panel adentro de la pantalla (desde abajo en el celular), una fecha toma
//     el foco y acepta una fecha, un menú se abre entero adentro de la
//     pantalla, y el filtro de verdad filtra (la lista cambia).
//
// Una pantalla nueva con filtros es una entrada de PANTALLAS. Un dispositivo
// cuyo navegador no está instalado (WebKit en una compu sin él) se saltea con
// un aviso; en GitHub se instalan los dos (navegador.yml).
const { test, expect, chromium, webkit, devices } = require('@playwright/test');
const { captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';

// Una fecha lejana: con ella ninguna lista de la maqueta tiene nada.
const FUTURO = '2099-01-01';
// Un rango que abarca todo, para las pantallas que no ofrecen "Todo".
const DESDE_SIEMPRE = '2000-01-01';
const HASTA_SIEMPRE = '2098-12-31';

const DISPOSITIVOS = [
  { nombre: 'android-360', motor: chromium, ctx: { ...devices['Pixel 5'], viewport: { width: 360, height: 780 } } },
  { nombre: 'android-412', motor: chromium, ctx: { ...devices['Pixel 5'], viewport: { width: 412, height: 860 } } },
  { nombre: 'iphone-390', motor: webkit, ctx: { ...devices['iPhone 13'] } },
  { nombre: 'compu-1280', motor: chromium, ctx: { viewport: { width: 1280, height: 900 } } },
];

// cont: donde están los controles de la barra (si el selector ES un control,
// cuenta él). periodo: el id del "Desde" que envuelve el control de período.
// lista: lo que tiene que cambiar al filtrar. menus: botones que abren panel.
// obligatorias: la pantalla necesita las dos fechas (no se ofrece "Todo").
const PANTALLAS = [
  { nombre: 'Gastos', url: '/modulos/gastos.html?maqueta=gastos', cont: '.lista-filtros',
    periodo: 'filtro-fecha-desde', hasta: 'filtro-fecha-hasta', lista: '#lista-gastos',
    menus: ['#ms-periodo-boton', '#ms-categoria-boton', '#ms-orden-boton'] },
  { nombre: 'Caja · Retiros socios', url: '/modulos/caja.html?maqueta=caja', tocarAntes: '#tab-btn-retiros',
    cont: '.filtros-retiros', periodo: 'filtro-retiros-desde', hasta: 'filtro-retiros-hasta', lista: '#lista-retiros-personales' },
  { nombre: 'Caja · Todos los movimientos', url: '/modulos/caja.html?maqueta=caja', tocarAntes: '#tab-btn-todos-movimientos',
    cont: '#filtros-todos-movimientos', menus: ['#ms-tm-periodo-boton', '#ms-tm-tipo-boton'] },
  { nombre: 'Cobranzas', url: '/modulos/cobranzas.html?maqueta=cobranzas', cont: '.cob-filtros',
    periodo: 'cob-filtro-desde', hasta: 'cob-filtro-hasta', lista: '#cob-lista' },
  { nombre: 'Cuentas corrientes · Proveedores', url: '/modulos/cuentas-corrientes.html?maqueta=cuentas-corrientes',
    cont: '#tab-proveedores .filtros-cc' },
  { nombre: 'Cuentas corrientes · Historial', url: '/modulos/cuentas-corrientes.html?maqueta=cuentas-corrientes', tocarAntes: '[data-tab="historial"]',
    cont: '#tab-historial .filtros-cc', periodo: 'filtro-fecha-desde-historial', hasta: 'filtro-fecha-hasta-historial', lista: '#lista-historial' },
  { nombre: 'Pedidos', url: '/modulos/pedidos.html?maqueta=pedidos', cont: '#pe-filtros',
    periodo: 'pe-filtro-desde', hasta: 'pe-filtro-hasta', lista: '#pe-lista' },
  { nombre: 'Administración · Órdenes', url: '/modulos/administracion.html?maqueta=administracion', tocarAntes: '[data-seccion="ordenes"]',
    cont: '.ad-filtros', periodo: 'ad-filtro-desde', hasta: 'ad-filtro-hasta', lista: '#ad-ordenes-lista' },
  { nombre: 'Administración · Cheques', url: '/modulos/administracion.html?maqueta=administracion', tocarAntes: '[data-seccion="cheques"]',
    cont: '.chq-filtros' },
  { nombre: 'Producción · Historial', url: '/modulos/produccion-gestion.html?maqueta=produccion-gestion', tocarAntes: '#pr-menu-historial', menuCelular: '#pr-btn-menu',
    cont: '#pr-historial-listado .pr-campos',
    periodo: 'pr-historial-desde', hasta: 'pr-historial-hasta', lista: '#pr-historial-lista', obligatorias: true },
  { nombre: 'Stock', url: '/modulos/stock.html?maqueta=stock', cont: '#buscador-stock-actual' },
  { nombre: 'Proyectos Taller', url: '/modulos/taller.html?maqueta=taller-diseno', cont: '.tl-tool' },
  { nombre: 'Ingreso', url: '/modulos/materia-prima.html?maqueta=materia-prima', cont: '#filtro-busqueda-ingresos' },
  { nombre: 'Empleados', url: '/modulos/empleados.html?maqueta=empleados', cont: '#filtro-busqueda-empleados' },
];

const CONTROLES = 'input:not([type=hidden]), select, button, a[href], [role=button], [role=switch]';

// Mide cada control visible de la barra: entero, sin nada encima, sin pisarse.
function medirBarra(cont, controles) {
  const visibles = [];
  document.querySelectorAll(cont).forEach((r) => {
    const candidatos = r.matches(controles) ? [r] : [...r.querySelectorAll(controles)];
    for (const e of candidatos) {
      const q = e.getBoundingClientRect();
      if (q.width < 1 || q.height < 1 || getComputedStyle(e).visibility === 'hidden') continue;
      visibles.push(e);
    }
  });
  const nombre = (e) => '#' + (e.id || (e.getAttribute('data-filtro') || e.className || e.tagName).toString().slice(0, 40));
  const problemas = [];
  for (const e of visibles) {
    e.scrollIntoView({ block: 'center', inline: 'nearest' });
    const q = e.getBoundingClientRect();
    const prob = [];
    if (q.left < -1 || q.right > innerWidth + 1) prob.push('se sale de la pantalla');
    for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        const r = a.getBoundingClientRect();
        if (q.left < r.left - 1 || q.right > r.right + 1 || q.top < r.top - 1 || q.bottom > r.bottom + 1) {
          prob.push('cortado por ' + (a.id || a.className || a.tagName).toString().slice(0, 40)); break;
        }
      }
    }
    const cx = Math.min(Math.max(q.left + q.width / 2, 1), innerWidth - 1);
    const cy = q.top + q.height / 2;
    const arriba = document.elementFromPoint(cx, cy);
    const etiqueta = arriba && arriba.closest('label');
    const esEl = arriba === e || e.contains(arriba) || (etiqueta && etiqueta.contains(e));
    if (!esEl) prob.push('tapado por ' + (arriba ? (arriba.id || arriba.className || arriba.tagName).toString().slice(0, 40) : 'nada'));
    for (const o of visibles) {
      if (o === e || o.contains(e) || e.contains(o)) continue;
      const p = o.getBoundingClientRect();
      const ix = Math.min(q.right, p.right) - Math.max(q.left, p.left);
      const iy = Math.min(q.bottom, p.bottom) - Math.max(q.top, p.top);
      if (ix > 2 && iy > 2) { prob.push('se pisa con ' + nombre(o)); break; }
    }
    if (prob.length) problemas.push(nombre(e) + ' → ' + prob.join('; '));
  }
  return { total: visibles.length, problemas };
}

// Dónde quedó un panel abierto, contra la pantalla.
function dondeQuedo(sel) {
  const e = document.querySelector(sel);
  if (!e || e.hidden || getComputedStyle(e).display === 'none') return null;
  const q = e.getBoundingClientRect();
  return { izq: q.left, der: q.right, arriba: q.top, abajo: q.bottom, ancho: innerWidth, alto: innerHeight };
}

// Muestra las fechas del panel ya abierto (si una pantalla arranca con un
// rango a mano, ya vienen a la vista: tocar "Elegir fechas" las escondería).
async function mostrarFechas(page, panelSel, conTouch) {
  const elegir = page.locator(`${panelSel} [data-periodo-elegir]`);
  if ((await elegir.getAttribute('aria-expanded')) !== 'true') await tocar(page, elegir, conTouch);
}

// Abre "Elegir fechas" en el panel, pone las dos fechas y aplica.
async function elegirFechas(page, base, panelSel, d, h, conTouch) {
  await tocar(page, page.locator(`#${base}-periodo`), conTouch);
  await mostrarFechas(page, panelSel, conTouch);
  const campoD = page.locator(`#${base}-periodo-desde`);
  await tocar(page, campoD, conTouch);
  expect(await page.evaluate(() => document.activeElement && document.activeElement.id), 'tocar "Desde" le da el foco').toBe(`${base}-periodo-desde`);
  await campoD.fill(d);
  await page.locator(`#${base}-periodo-hasta`).fill(h);
  await expect(campoD).toHaveValue(d);
  await tocar(page, page.locator(`${panelSel} [data-periodo-aplicar]`), conTouch);
}

// Cierra el panel del período como lo haría la persona: en el celular, con el
// panel desde abajo, el fondo oscuro tapa el botón y se toca el fondo (arriba);
// en la compu, el mismo botón.
async function cerrarPeriodo(page, boton, conTouch) {
  const hoja = await page.evaluate(() => innerWidth < 640);
  if (hoja) { if (conTouch) await page.touchscreen.tap(20, 20); else await page.mouse.click(20, 20); }
  else await tocar(page, boton, conTouch);
}

async function tocar(page, loc, conTouch) {
  await loc.scrollIntoViewIfNeeded();
  if (conTouch) await loc.tap(); else await loc.click();
}

for (const d of DISPOSITIVOS) {
  test.describe(`filtros · ${d.nombre}`, () => {
    let navegador = null;
    let motivo = '';
    test.beforeAll(async () => {
      try { navegador = await d.motor.launch(); } catch (e) { motivo = e.message.split('\n')[0]; }
    });
    test.afterAll(async () => { if (navegador) await navegador.close(); });

    for (const s of PANTALLAS) {
      test(`${s.nombre}`, async ({}, info) => {
        test.setTimeout(120000);
        test.skip(!navegador, `No está el navegador de ${d.nombre}: ${motivo}`);
        const ctx = await navegador.newContext({ ...d.ctx, locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires', serviceWorkers: 'block' });
        const page = await ctx.newPage();
        const errores = [];
        page.on('pageerror', (e) => { if (!/^\[Cloudflare Turnstile\]/.test(e.message)) errores.push(e.message); });
        const conTouch = !!d.ctx.hasTouch;
        try {
          await page.goto(MAQUETA + s.url);
          await page.waitForLoadState('networkidle').catch(() => {});
          if (s.tocarAntes) {
            const ir = page.locator(s.tocarAntes).first();
            if (!(await ir.isVisible()) && s.menuCelular && await page.locator(s.menuCelular).isVisible()) await tocar(page, page.locator(s.menuCelular), conTouch);
            await tocar(page, ir, conTouch);
            await page.waitForTimeout(600);
          }

          // 1) Cada control: entero, sin nada encima, sin pisarse.
          const m = await page.evaluate(([c, ctl]) => (new Function('cont', 'controles', 'return (' + c + ')(cont, controles)'))(...ctl), [medirBarra.toString(), [s.cont, CONTROLES]]);
          expect(m.total, `${s.nombre}: no se encontró ningún control en "${s.cont}" (¿cambió la pantalla?)`).toBeGreaterThan(0);
          expect(m.problemas, `${s.nombre} en ${d.nombre}`).toEqual([]);

          // 2) Los menús se abren enteros adentro de la pantalla.
          for (const b of s.menus || []) {
            const boton = page.locator(b);
            if (!(await boton.isVisible())) continue;
            await tocar(page, boton, conTouch);
            await page.waitForTimeout(250);
            const panel = b.replace(/-boton$/, '-panel');
            const r = await page.evaluate(dondeQuedo, panel);
            expect(r, `${b}: tocarlo no abrió ${panel}`).not.toBeNull();
            expect(r.izq, `${panel} se sale por la izquierda`).toBeGreaterThanOrEqual(-1);
            expect(r.der, `${panel} se sale por la derecha (${Math.round(r.der)} de ${r.ancho})`).toBeLessThanOrEqual(r.ancho + 1);
            expect(r.arriba, `${panel} se sale por arriba`).toBeGreaterThanOrEqual(-1);
            expect(r.abajo, `${panel} se sale por abajo (${Math.round(r.abajo)} de ${r.alto})`).toBeLessThanOrEqual(r.alto + 1);
            await tocar(page, boton, conTouch); // lo cierra
            await page.waitForTimeout(150);
          }

          // 3) El período: abre, se ve entero, los atajos y las fechas filtran.
          if (s.periodo) {
            const boton = page.locator(`#${s.periodo}-periodo`);
            await expect(boton, `${s.nombre}: falta el botón "Período"`).toBeVisible();
            await expect(boton).toContainText('Período');
            expect(await page.locator(`#${s.periodo}`).isVisible(), 'el "Desde" suelto ya no se ve').toBe(false);

            // "Todo" primero: la lista con todo lo que hay.
            await tocar(page, boton, conTouch);
            const panelSel = `#${s.periodo}-periodo-panel`;
            await expect(page.locator(panelSel)).toBeVisible();
            const r = await page.evaluate(dondeQuedo, panelSel);
            expect(r.izq).toBeGreaterThanOrEqual(-1);
            expect(r.der, `el panel se sale por la derecha (${Math.round(r.der)} de ${r.ancho})`).toBeLessThanOrEqual(r.ancho + 1);
            expect(r.arriba).toBeGreaterThanOrEqual(-1);
            expect(r.abajo, `el panel se sale por abajo (${Math.round(r.abajo)} de ${r.alto})`).toBeLessThanOrEqual(r.alto + 1);
            if (r.ancho < 640) expect(Math.round(r.abajo), 'en el celular el panel sale desde abajo').toBeGreaterThanOrEqual(r.alto - 2);
            await captura(page, `filtros-${d.nombre}-${s.periodo}-panel`, info);
            if (s.obligatorias) {
              // Sin "Todo": la pantalla no sabe buscar sin fechas. Aplicar con
              // una sola fecha avisa y no cierra.
              expect(await page.locator(`${panelSel} [data-periodo-atajo="todo"]`).count(), 'no se ofrece "Todo"').toBe(0);
              await mostrarFechas(page, panelSel, conTouch);
              await page.locator(`#${s.periodo}-periodo-desde`).fill('');
              await tocar(page, page.locator(`${panelSel} [data-periodo-aplicar]`), conTouch);
              await expect(page.locator(`${panelSel} [data-periodo-error]`)).toBeVisible();
              await cerrarPeriodo(page, boton, conTouch);
              await expect(page.locator(panelSel)).toBeHidden();
              await elegirFechas(page, s.periodo, panelSel, DESDE_SIEMPRE, HASTA_SIEMPRE, conTouch);
            } else {
              await tocar(page, page.locator(`${panelSel} [data-periodo-atajo="todo"]`), conTouch);
              await expect(boton).toContainText('Todo');
            }
            await expect(page.locator(panelSel)).toBeHidden();
            await page.waitForTimeout(500);
            const conTodo = (await page.locator(s.lista).innerText()).trim();

            // "Elegir fechas": la fecha toma el foco y acepta la fecha.
            await elegirFechas(page, s.periodo, panelSel, FUTURO, FUTURO, conTouch);
            await expect(page.locator(panelSel)).toBeHidden();
            await expect(page.locator(`#${s.periodo}`)).toHaveValue(FUTURO);
            await expect(page.locator(`#${s.hasta}`)).toHaveValue(FUTURO);
            await expect(boton).toContainText('01/01/2099');
            await page.waitForTimeout(500);
            const conFuturo = (await page.locator(s.lista).innerText()).trim();
            expect(conTodo.length, `${s.nombre}: con "Todo" la lista no muestra nada (la maqueta no tiene datos)`).toBeGreaterThan(0);
            expect(conFuturo, `${s.nombre}: con un período sin datos la lista no cambió: el filtro no filtra`).not.toBe(conTodo);

            // Con teclado (en la compu): Escape cierra y el foco vuelve al botón.
            if (!conTouch) {
              await boton.click();
              await page.keyboard.press('Escape');
              await expect(page.locator(panelSel)).toBeHidden();
              expect(await page.evaluate(() => document.activeElement && document.activeElement.id)).toBe(`${s.periodo}-periodo`);
            }
          }
          expect(errores, 'errores de JavaScript').toEqual([]);
        } finally {
          await ctx.close();
        }
      });
    }
  });
}
