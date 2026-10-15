// LA BARRA DE ABAJO Y EL TECLADO DEL IPHONE (pedido del 15/10/2026; captura de
// Facu del 14/10, 18:57: en Inicio, al scrollear, la barra quedó a mitad de
// pantalla ~380 pt arriba del borde: el alto del teclado). En la maqueta, sin
// credenciales, en Inicio (dashboard.html?maqueta=tablero):
//  - iPhone en WebKit (corre en GitHub; acá no está WebKit y se saltea),
//    Android en Chromium a 360 y 412, Chromium a 390 y 360, la tablet
//    (1000 × 540, con la barra de abajo) y la compu a 1280;
//  - EL RECORRIDO: escribir en un campo, cerrar el teclado (blur), scrollear
//    abajo y arriba: el borde de abajo de la barra coincide con innerHeight;
//  - EL CASO DEL IPHONE: como WebKit de escritorio no tiene teclado de
//    verdad, se reemplaza window.visualViewport por uno que se comporta como
//    el de iOS con el error (al cerrar el teclado lo que se ve sigue corrido
//    380 px). Antes del arreglo nadie recolocaba nada (falla); ahora, al
//    cerrarse el teclado, se fuerza la recolocación con un scroll de ida y
//    vuelta de 1 px que deja la página donde estaba (pasa). También "desde el
//    ícono" (modo standalone) y el rebote de arriba de todo, que no se toca;
//  - con el teclado ABIERTO no se mueve nada (el formulario no salta), la
//    hoja "Más" abre y cierra pegada abajo, y en la compu (barra lateral) no
//    se toca nada aunque lo que se ve no coincida.
// El campo de prueba se agrega en la página (Inicio casi no tiene campos a la
// vista); el visualViewport falso solo cambia lo que se lee, no lo que se ve.
const { test, expect, webkit, devices } = require('@playwright/test');
const { captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
const TECLADO = 380;
const CTX = { locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires', serviceWorkers: 'block' };

// Chromium sale de la configuración (el `browser` de la prueba); WebKit se
// lanza aparte, como en detalles-dispositivos.
const CELULARES = [
  { nombre: 'iphone-390', motor: 'webkit', ctx: { ...devices['iPhone 13'] } },
  { nombre: 'android-360', motor: 'chromium', ctx: { ...devices['Pixel 5'], viewport: { width: 360, height: 780 } } },
  { nombre: 'android-412', motor: 'chromium', ctx: { ...devices['Pixel 5'], viewport: { width: 412, height: 860 } } },
  { nombre: 'chromium-390', motor: 'chromium', ctx: { viewport: { width: 390, height: 844 } } },
  { nombre: 'chromium-360', motor: 'chromium', ctx: { viewport: { width: 360, height: 780 } } },
  { nombre: 'tablet-1000', motor: 'chromium', ctx: { viewport: { width: 1000, height: 540 }, hasTouch: true } },
];

// El visualViewport "de iOS": mientras `__vv.falso` está prendido, height y
// offsetTop son los de `__vv`; si no, los de verdad. `__iosArregla`: un
// scroll lo vuelve a la normalidad (lo que hace iOS cuando se lo fuerza).
// También anota cada window.scrollTo.
function visorDeIos({ standalone = false } = {}) {
  const real = window.visualViewport;
  const ev = new EventTarget();
  const estado = { falso: false, height: 0, offsetTop: 0 };
  const vv = {
    get height() { return estado.falso ? estado.height : (real ? real.height : window.innerHeight); },
    get offsetTop() { return estado.falso ? estado.offsetTop : (real ? real.offsetTop : 0); },
    get width() { return real ? real.width : window.innerWidth; },
    get offsetLeft() { return real ? real.offsetLeft : 0; },
    get pageTop() { return window.scrollY + this.offsetTop; },
    get pageLeft() { return window.scrollX; },
    get scale() { return real ? real.scale : 1; },
    addEventListener(t, f, o) { ev.addEventListener(t, f, o); if (real) real.addEventListener(t, f, o); },
    removeEventListener(t, f, o) { ev.removeEventListener(t, f, o); if (real) real.removeEventListener(t, f, o); },
    dispatchEvent(e) { return ev.dispatchEvent(e); },
  };
  Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => vv });
  window.__vv = estado;
  window.__vvDisparar = (t) => ev.dispatchEvent(new Event(t));
  window.__iosArregla = false;
  window.__scrolls = [];
  const scrollToReal = window.scrollTo.bind(window);
  window.scrollTo = function (x, y) {
    if (typeof x === 'number') window.__scrolls.push([x, y]);
    if (window.__iosArregla) estado.falso = false;
    return scrollToReal.apply(window, arguments);
  };
  if (standalone) {
    // "Desde el ícono": navigator.standalone y (display-mode: standalone).
    Object.defineProperty(navigator, 'standalone', { configurable: true, get: () => true });
    const mm = window.matchMedia.bind(window);
    window.matchMedia = (q) => /display-mode:\s*standalone/.test(q)
      ? { matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; } }
      : mm(q);
  }
}

async function abrirInicio(page, { standalone = false, barra = '.barra-abajo' } = {}) {
  page.setDefaultTimeout(15000);
  await page.addInitScript(visorDeIos, { standalone });
  await page.goto(`${MAQUETA}/dashboard.html?maqueta=tablero`);
  await expect(page.locator(barra)).toBeVisible();
  // El campo de prueba arriba, y alto de sobra para scrollear.
  await page.evaluate(() => {
    const caja = document.createElement('div');
    caja.id = 'e2e-caja';
    caja.innerHTML = '<label for="e2e-campo">Probar el teclado</label><input id="e2e-campo" type="text" style="font-size:16px;width:200px">' +
      '<div style="height:1600px"></div>';
    (document.querySelector('main') || document.body).prepend(caja);
  });
  // Lo que haya pasado al cargar (el vigilante mira al abrir) no cuenta.
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__scrolls = []; });
}

const borde = (page) => page.evaluate(() => {
  const b = document.querySelector('.barra-abajo');
  const r = b ? b.getBoundingClientRect() : null;
  return { visible: !!r && r.height > 0, abajo: r ? r.bottom : null, alto: window.innerHeight, y: window.scrollY };
});
const scrollear = (page, y) => page.evaluate((y) => { document.scrollingElement.scrollTop = y; }, y);
const sinScrollHorizontal = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

async function nuevaPagina(d, browser) {
  if (d.motor === 'webkit') {
    let nav = null;
    try { nav = await webkit.launch(); } catch (e) { return { motivo: e.message.split('\n')[0] }; }
    const ctx = await nav.newContext({ ...d.ctx, ...CTX });
    return { page: await ctx.newPage(), cerrar: () => nav.close() };
  }
  const ctx = await browser.newContext({ ...d.ctx, ...CTX });
  return { page: await ctx.newPage(), cerrar: () => ctx.close() };
}

for (const d of CELULARES) {
  test.describe(`barra de abajo · ${d.nombre}`, () => {
    test('escribir, cerrar el teclado y scrollear: la barra queda pegada abajo', async ({ browser }, info) => {
      const p = await nuevaPagina(d, browser);
      test.skip(!p.page, `No está el navegador de ${d.nombre}: ${p.motivo}`);
      const { page } = p;
      try {
        const errores = [];
        page.on('pageerror', (e) => errores.push(e.message));
        await abrirInicio(page);
        let b = await borde(page);
        expect(b.visible, 'la barra de abajo se ve').toBe(true);
        expect(Math.abs(b.abajo - b.alto), 'al abrir: pegada abajo').toBeLessThanOrEqual(1);
        await page.locator('#e2e-campo').click();
        await page.keyboard.type('123');
        await page.evaluate(() => document.getElementById('e2e-campo').blur());
        for (const y of [600, 1200, 300, 0, 800]) {
          await scrollear(page, y);
          await page.waitForTimeout(120);
          b = await borde(page);
          expect(Math.abs(b.abajo - b.alto), `scrolleado a ${y}: pegada abajo`).toBeLessThanOrEqual(1);
        }
        await page.waitForTimeout(700);
        b = await borde(page);
        expect(Math.abs(b.abajo - b.alto), 'quieta: pegada abajo').toBeLessThanOrEqual(1);
        expect(await page.evaluate(() => window.__scrolls), 'sin el error, nadie mueve la página').toEqual([]);
        expect(await sinScrollHorizontal(page), 'sin scroll horizontal').toBe(true);
        await captura(page, `barra-ios-recorrido-${d.nombre}`, info);
        expect(errores, 'sin errores de JavaScript').toEqual([]);
      } finally { await p.cerrar(); }
    });

    for (const standalone of d.motor === 'webkit' ? [false, true] : [false]) {
      test(`el caso del iPhone${standalone ? ' (desde el ícono)' : ''}: al cerrar el teclado se recoloca sin mover la página`, async ({ browser }, info) => {
        const p = await nuevaPagina(d, browser);
        test.skip(!p.page, `No está el navegador de ${d.nombre}: ${p.motivo}`);
        const { page } = p;
        try {
          await abrirInicio(page, { standalone });
          if (standalone) expect(await page.evaluate(() => window.matchMedia('(display-mode: standalone)').matches)).toBe(true);
          await scrollear(page, 400);
          await page.waitForTimeout(400);
          await page.evaluate(() => { window.__scrolls = []; });
          // Se abre el teclado: lo que se ve se achica.
          await page.locator('#e2e-campo').click();
          await page.evaluate((t) => { window.__vv.falso = true; window.__vv.height = window.innerHeight - t; window.__vv.offsetTop = 0; window.__vvDisparar('resize'); }, TECLADO);
          await page.waitForTimeout(700);
          expect(await page.evaluate(() => window.__scrolls), 'con el teclado abierto no se mueve nada').toEqual([]);
          // Se cierra el teclado y iOS NO recoloca: lo que se ve sigue corrido.
          const y = await page.evaluate(() => window.scrollY);
          await page.evaluate(() => { window.__iosArregla = true; document.getElementById('e2e-campo').blur(); window.__vvDisparar('resize'); });
          await page.waitForTimeout(900);
          const scrolls = await page.evaluate(() => window.__scrolls);
          expect(scrolls.length, 'al cerrar el teclado se fuerza la recolocación').toBeGreaterThanOrEqual(2);
          expect(scrolls.at(-1), 'la ida y vuelta termina donde estaba').toEqual([0, y]);
          expect(Math.abs(scrolls[0][1] - y), 'la ida es de 1 px').toBe(1);
          const despues = await page.evaluate(() => ({ y: window.scrollY, desfase: window.innerHeight - (window.visualViewport.height + window.visualViewport.offsetTop) }));
          expect(despues.y, 'la página quedó donde estaba').toBe(y);
          expect(Math.abs(despues.desfase), 'lo que se ve vuelve a coincidir').toBeLessThanOrEqual(1);
          const b = await borde(page);
          expect(Math.abs(b.abajo - b.alto), 'la barra pegada abajo').toBeLessThanOrEqual(1);
          // Arreglado: no vuelve a tocar nada.
          const n = scrolls.length;
          await scrollear(page, 900);
          await page.waitForTimeout(800);
          expect((await page.evaluate(() => window.__scrolls)).length, 'arreglado, no vuelve a mover nada').toBe(n);
          await captura(page, `barra-ios-caso-${d.nombre}${standalone ? '-icono' : ''}`, info);
        } finally { await p.cerrar(); }
      });
    }

    test('el rebote de arriba de todo y la hoja "Más" no se tocan', async ({ browser }) => {
      const p = await nuevaPagina(d, browser);
      test.skip(!p.page, `No está el navegador de ${d.nombre}: ${p.motivo}`);
      const { page } = p;
      try {
        await abrirInicio(page);
        await scrollear(page, 0);
        await page.waitForTimeout(400);
        await page.evaluate(() => { window.__scrolls = []; });
        // El rebote: lo que se ve se estira y vuelve, con avisos seguidos.
        for (const off of [-20, -45, -60, -45, -25, -8, 0]) {
          await page.evaluate((o) => { window.__vv.falso = o !== 0; window.__vv.height = window.innerHeight; window.__vv.offsetTop = o; window.__vvDisparar('scroll'); }, off);
          await page.waitForTimeout(60);
        }
        await page.waitForTimeout(700);
        expect(await page.evaluate(() => window.__scrolls), 'el rebote no se toca').toEqual([]);
        // La hoja "Más" abre pegada abajo y cierra.
        await page.locator('#barra-abajo-mas').click();
        const hoja = page.locator('.hoja-mas');
        await expect(hoja).toBeVisible();
        const caja = await page.locator('.hoja-mas__caja').boundingBox();
        const alto = await page.evaluate(() => window.innerHeight);
        expect(Math.abs(caja.y + caja.height - alto), 'la hoja "Más" pegada abajo').toBeLessThanOrEqual(1);
        await page.keyboard.press('Escape');
        await expect(hoja).toBeHidden();
        expect(await page.evaluate(() => window.__scrolls), 'la hoja no mueve la página').toEqual([]);
      } finally { await p.cerrar(); }
    });
  });
}

test('la compu (1280): barra lateral, sin barra de abajo, y no se toca nada', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...CTX });
  const page = await ctx.newPage();
  try {
    await abrirInicio(page, { barra: '.barra-lateral' });
    await expect(page.locator('.barra-abajo')).toBeHidden();
    await page.locator('#e2e-campo').click();
    await page.evaluate(() => { window.__vv.falso = true; window.__vv.height = window.innerHeight - 300; window.__iosArregla = false; });
    await page.evaluate(() => { document.getElementById('e2e-campo').blur(); window.__vvDisparar('resize'); });
    await scrollear(page, 500);
    await page.waitForTimeout(900);
    expect(await page.evaluate(() => window.__scrolls), 'en la compu no se mueve nada').toEqual([]);
  } finally { await ctx.close(); }
});
