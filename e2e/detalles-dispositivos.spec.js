// LOS DETALLES VIEJOS EN TODOS LOS DISPOSITIVOS (05/10/2026).
//
// Mismo molde que e2e/filtros-dispositivos.spec.js: la maqueta (Supabase
// falso, sin sesión ni base) en cuatro dispositivos —Android en Chromium a 360
// y 412 px, iPhone en WebKit a 390 y la compu a 1280—. Por cada panel o modal
// principal de cada pantalla:
//   - el botón de abajo (el de confirmar) se ve ENTERO, adentro de la pantalla
//     y de su caja, y document.elementFromPoint en su centro es ESE botón (no
//     lo tapa la barra de abajo, otro panel ni el borde). En el celular se mide
//     dos veces: con la pantalla entera y con el teclado abierto (la pantalla
//     más baja), porque un modal alto tiene que scrollear ADENTRO;
//   - ninguna fecha se sale de su recuadro ni se pisa con otro control;
//   - escribir 1234567 en cada campo de plata muestra 1.234.567.
// Y en Administración, el armado lista | detalle: lado a lado en la compu y de
// a uno en el celular (con "‹" para volver).
//
// Un panel nuevo es una entrada de ENTRADAS. Un dispositivo cuyo navegador no
// está instalado se saltea con un aviso; en GitHub se instalan los dos.
const { test, expect, chromium, webkit, devices } = require('@playwright/test');
const { captura } = require('./ayuda');

const MAQUETA = process.env.MAQUETA_URL || 'http://localhost:4180';
// El alto de la pantalla con el teclado del celular abierto.
const ALTO_CON_TECLADO = 480;

const DISPOSITIVOS = [
  { nombre: 'android-360', motor: chromium, ctx: { ...devices['Pixel 5'], viewport: { width: 360, height: 780 } } },
  { nombre: 'android-412', motor: chromium, ctx: { ...devices['Pixel 5'], viewport: { width: 412, height: 860 } } },
  { nombre: 'iphone-390', motor: webkit, ctx: { ...devices['iPhone 13'] } },
  { nombre: 'compu-1280', motor: chromium, ctx: { viewport: { width: 1280, height: 800 } } },
];

// pasos: lo que se toca para llegar (un selector, o { js } / { esperar }).
// boton: el botón de abajo que tiene que poder tocarse. plata: los campos de
// plata. soloCompu / soloCelular: la entrada vale solo ahí.
const ADM = '/modulos/administracion.html?maqueta=administracion';
const ENTRADAS = [
  { pantalla: 'Caja', nombre: 'egreso', url: '/modulos/caja.html?maqueta=caja',
    pasos: ['#btn-mi-caja', '#btn-detalle-egreso'], boton: '#btn-guardar-movimiento', plata: ['#movimiento-monto'] },
  { pantalla: 'Caja', nombre: 'traspaso', url: '/modulos/caja.html?maqueta=caja',
    pasos: ['#btn-mi-caja', '#btn-detalle-traspaso'], boton: '#btn-guardar-traspaso', plata: ['#traspaso-monto'] },
  { pantalla: 'Caja', nombre: 'cuenta nueva', url: '/modulos/caja.html?maqueta=caja',
    pasos: ['#btn-mi-caja', '#btn-saldo-nueva-cuenta'], boton: '#btn-guardar-cuenta-nueva' },
  { pantalla: 'Gastos', nombre: 'cargar sin comprobante', url: '/modulos/gastos.html?maqueta=gastos',
    pasos: ['#btn-nuevo-gasto', '#btn-sin-foto'], boton: '#sp-datos .wizard-nav .btn--primario', plata: ['#campo-importe'] },
  { pantalla: 'Cuentas corrientes', nombre: 'agregar proveedor', url: '/modulos/cuentas-corrientes.html?maqueta=cuentas-corrientes',
    pasos: ['#btn-agregar-proveedor'], boton: '#btn-confirmar-agregar-proveedor' },
  { pantalla: 'Stock', nombre: 'corregir stock', url: '/modulos/stock.html?maqueta=stock',
    pasos: ['#btn-registrar-movimiento'], boton: '#btn-confirmar-mov' },
  { pantalla: 'Cobranzas', nombre: 'nueva cobranza', url: '/modulos/cobranzas.html?maqueta=cobranzas',
    pasos: ['#cob-btn-nueva', '[data-abrir-forma="efectivo"]'], boton: '#cob-btn-guardar', plata: ['#cob-efectivo'] },
  { pantalla: 'Pedidos', nombre: 'pedido nuevo', url: '/modulos/pedidos.html?maqueta=pedidos',
    pasos: ['#pe-btn-nuevo'], boton: '#pe-form-guardar' },
  { pantalla: 'Proyectos Taller', nombre: 'valor de la hora', url: '/modulos/taller.html?maqueta=taller-diseno',
    pasos: ['#tl-btn-valor-hora'], boton: '#tl-hora-guardar', plata: ['#tl-hora-valor'], soloCompu: true },
  { pantalla: 'Administración', nombre: 'valorizar una orden', url: ADM,
    pasos: ['[data-pestana="ordenes"]', '#ad-ordenes-lista [data-orden="o1"]', '#ad-btn-valorizar'], boton: '#ad-valorizar-guardar', plata: ['[data-precio]'] },
  { pantalla: 'Administración', nombre: 'saldo inicial', url: ADM,
    pasos: ['[data-pestana="clientes"]', '#ad-clientes-lista [data-cliente="c2"]', '#ad-btn-saldo-inicial'], boton: '#ad-saldo-guardar', plata: ['#ad-saldo-importe'] },
  { pantalla: 'Administración', nombre: 'ajuste', url: ADM,
    pasos: ['[data-pestana="clientes"]', '#ad-clientes-lista [data-cliente]', '#ad-btn-ajuste'], boton: '#ad-ajuste-guardar', plata: ['#ad-ajuste-importe'] },
  { pantalla: 'Administración', nombre: 'ficha (límite de crédito)', url: ADM,
    pasos: ['[data-pestana="clientes"]', '#ad-clientes-lista [data-cliente]', '#ad-btn-ficha'], boton: '#ad-ficha-guardar', plata: ['#ad-f-limite_credito'] },
  { pantalla: 'Administración', nombre: 'lista de precios', url: ADM,
    pasos: ['[data-pestana="listas"]', '[data-lista]'], plata: ['[data-precio-lista]'] },
  { pantalla: 'Administración', nombre: 'órdenes (filtros con fechas)', url: ADM,
    pasos: ['[data-pestana="ordenes"]', '#ad-ordenes-lista [data-orden="o1"]'] },
  { pantalla: 'Administración', nombre: 'cheques: dar salida', url: ADM,
    pasos: ['[data-pestana="cheques"]', { esperar: 600 }, '[data-dar-salida]'], boton: '#chq-salida-confirmar' },
  // Las pantallas con su barra de filtros: solo las fechas.
  { pantalla: 'Gastos', nombre: 'la lista', url: '/modulos/gastos.html?maqueta=gastos', pasos: [] },
  { pantalla: 'Cobranzas', nombre: 'la lista', url: '/modulos/cobranzas.html?maqueta=cobranzas', pasos: [] },
  { pantalla: 'Pedidos', nombre: 'la lista', url: '/modulos/pedidos.html?maqueta=pedidos', pasos: [] },
  { pantalla: 'Caja', nombre: 'retiros socios', url: '/modulos/caja.html?maqueta=caja', pasos: ['#tab-btn-retiros'] },
  { pantalla: 'Cuentas corrientes', nombre: 'historial', url: '/modulos/cuentas-corrientes.html?maqueta=cuentas-corrientes', pasos: ['[data-tab="historial"]'] },
  // Más paneles.
  { pantalla: 'Cuentas corrientes', nombre: 'registrar pago', url: '/modulos/cuentas-corrientes.html?maqueta=cuentas-corrientes',
    pasos: ['#tab-proveedores .btn-ver-cuenta[data-unidad="u-n"]', '#btn-registrar-pago'], boton: '#btn-confirmar-pago', plata: ['#campo-monto-pago'] },
  { pantalla: 'Cuentas corrientes', nombre: 'saldo inicial', url: '/modulos/cuentas-corrientes.html?maqueta=cuentas-corrientes',
    pasos: ['#tab-proveedores .btn-ver-cuenta[data-unidad="u-n"]', '#btn-saldo-inicial-ficha'], boton: '#btn-confirmar-saldo-inicial', plata: ['#campo-saldo-inicial-importe'] },
  { pantalla: 'Empleados', nombre: 'ficha', url: '/modulos/empleados.html?maqueta=empleados',
    pasos: ['.tarjeta-lista[data-id]'], boton: '#btn-cerrar-ficha' },
  { pantalla: 'Stock', nombre: 'insumo nuevo', url: '/modulos/stock.html?maqueta=stock',
    pasos: ['[data-vista="catalogo"]', '#btn-nuevo-insumo'], boton: '#btn-guardar-insumo' },
  { pantalla: 'Stock', nombre: 'traspaso a otra fábrica', url: '/modulos/stock.html?maqueta=stock',
    pasos: ['#btn-ver-traspaso'] },
  { pantalla: 'Ingreso', nombre: 'detalle de un ingreso', url: '/modulos/materia-prima.html?maqueta=materia-prima',
    pasos: ['.tarjeta-lista[data-ingreso]'] },
  { pantalla: 'Ingreso', nombre: 'cargar sin comprobante', url: '/modulos/materia-prima.html?maqueta=materia-prima',
    pasos: ['#btn-abrir-wizard', '#btn-sin-comprobante'], boton: '#btn-datos-continuar' },
  { pantalla: 'Pedidos', nombre: 'anular un pedido', url: '/modulos/pedidos.html?maqueta=pedidos',
    pasos: ['[data-pedido="pe1"]', '#pe-btn-anular'], boton: '#pe-anular-si' },
  { pantalla: 'Proyectos Taller', nombre: 'facturar al cliente', url: '/modulos/taller.html?maqueta=taller-diseno',
    pasos: ['[data-proyecto]', '[data-accion="facturar"]:not([disabled])'], boton: '#tl-venta-confirmar', plata: ['#tl-venta-importe'] },
  { pantalla: 'Inicio', nombre: 'mi cuenta', url: '/dashboard.html?maqueta=tablero&cuenta=mi-cuenta',
    pasos: [{ esperar: 600 }], boton: '#btn-logout' },
];

const CONTROLES = 'input:not([type=hidden]), select, button, a[href], textarea, [role=button], [role=switch]';

// ¿Se puede tocar el botón? Lo trae a la vista (como la persona, scrolleando
// lo que haga falta) y mira que esté entero, sin cortar y sin nada encima.
function medirBoton(sel) {
  const b = [...document.querySelectorAll(sel)].find(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 })
  if (!b) return { falta: true }
  b.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  const q = b.getBoundingClientRect()
  const vv = window.visualViewport
  const alto = vv ? vv.height : innerHeight
  const prob = []
  if (q.left < -1 || q.right > innerWidth + 1 || q.top < -1 || q.bottom > alto + 1) prob.push(`se sale de la pantalla (${Math.round(q.top)}–${Math.round(q.bottom)} de ${Math.round(alto)} de alto)`)
  // Lo cortan sus cajas con overflow, hasta la primera position: fixed (más
  // arriba de un fixed nada lo corta; body y html tampoco: scrollea la página).
  for (let a = b.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
    const cs = getComputedStyle(a)
    if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
      const r = a.getBoundingClientRect()
      if (q.left < r.left - 1 || q.right > r.right + 1 || q.top < r.top - 1 || q.bottom > r.bottom + 1) { prob.push('cortado por ' + (a.id || String(a.className)).slice(0, 50)); break }
    }
    if (cs.position === 'fixed') break
  }
  const e = document.elementFromPoint(Math.min(Math.max(q.left + q.width / 2, 1), innerWidth - 1), Math.min(Math.max(q.top + q.height / 2, 1), alto - 1))
  if (!(e === b || b.contains(e))) prob.push('tapado por ' + (e ? (e.id || String(e.className) || e.tagName).slice(0, 50) : 'nada'))
  return { prob }
}

// Cada fecha visible: adentro de la pantalla, de su caja y sin pisarse.
function medirFechas(controles) {
  // checkVisibility: lo de adentro de un <details> cerrado tiene caja pero no se ve.
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && (!e.checkVisibility || e.checkVisibility()) }
  const todos = [...document.querySelectorAll(controles)].filter(vis)
  const fechas = todos.filter(e => e.matches('input[type=date], input[type=time], input[type=datetime-local]'))
  const nombre = e => '#' + (e.id || String(e.className) || e.tagName).slice(0, 40)
  // ¿Está arriba de todo en su centro? (lo de atrás de un modal no cuenta).
  const arriba = e => {
    const r = e.getBoundingClientRect()
    const x = r.left + r.width / 2, y = r.top + r.height / 2
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false
    const h = document.elementFromPoint(x, y)
    return !!h && (h === e || e.contains(h) || (h.closest('label') && h.closest('label').contains(e)))
  }
  const problemas = []
  for (const f of fechas) {
    f.scrollIntoView({ block: 'center', inline: 'nearest' })
    const q = f.getBoundingClientRect()
    const prob = []
    if (q.left < -1 || q.right > innerWidth + 1) prob.push('se sale de la pantalla')
    const p = f.parentElement.getBoundingClientRect()
    if (q.left < p.left - 1 || q.right > p.right + 1) prob.push(`se sale de su recuadro (${Math.round(q.right - p.right)} px)`)
    for (let a = f.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a)
      if (cs.overflowX !== 'visible') {
        const r = a.getBoundingClientRect()
        if (q.left < r.left - 1 || q.right > r.right + 1) { prob.push('cortada por ' + (a.id || String(a.className)).slice(0, 40)); break }
      }
      if (cs.position === 'fixed') break
    }
    // Lo que tapa la fecha, o lo que se pisa con ella, solo si está a la vista
    // (arriba de todo): un control de la página de atrás de un modal no cuenta.
    // Una fecha tapada por un modal o una barra fija (fixed / sticky) es de la
    // pantalla de atrás: lo que se pisa con ella no se compara.
    let atras = false
    if (!arriba(f)) {
      const h = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2)
      const fijo = h && (() => { for (let a = h; a; a = a.parentElement) if (getComputedStyle(a).position === 'fixed' || getComputedStyle(a).position === 'sticky') return true; return false })()
      if (fijo) atras = true
      else if (!prob.length) prob.push('la tapa ' + (h ? nombre(h) : 'nada'))
    }
    for (const o of atras ? [] : todos) {
      if (o === f || o.contains(f) || f.contains(o) || o.contains(f.parentElement) && o.tagName === 'LABEL') continue
      if (!arriba(o)) continue
      const r = o.getBoundingClientRect()
      const ix = Math.min(q.right, r.right) - Math.max(q.left, r.left)
      const iy = Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top)
      if (ix > 2 && iy > 2) { prob.push('se pisa con ' + nombre(o)); break }
    }
    if (prob.length) problemas.push(nombre(f) + ' → ' + prob.join('; '))
  }
  return { total: fechas.length, problemas }
}

async function tocar(page, sel, conTouch) {
  const loc = page.locator(sel).filter({ visible: true }).first()
  await loc.waitFor({ state: 'visible', timeout: 15000 })
  await loc.scrollIntoViewIfNeeded()
  if (conTouch) await loc.tap(); else await loc.click()
}

async function abrir(page, url) {
  await page.goto(MAQUETA + url)
  await page.waitForLoadState('networkidle').catch(() => {})
}

async function seguirPasos(page, pasos, conTouch) {
  for (const p of pasos) {
    if (typeof p === 'string') await tocar(page, p, conTouch)
    else if (p.js) await page.evaluate(p.js)
    else if (p.esperar) await page.waitForTimeout(p.esperar)
    await page.waitForTimeout(350)
  }
}

for (const d of DISPOSITIVOS) {
  test.describe(`detalles · ${d.nombre}`, () => {
    let navegador = null
    let motivo = ''
    const esCompu = d.nombre.startsWith('compu')
    test.beforeAll(async () => {
      try { navegador = await d.motor.launch() } catch (e) { motivo = e.message.split('\n')[0] }
    })
    test.afterAll(async () => { if (navegador) await navegador.close() })

    for (const s of ENTRADAS) {
      if (s.soloCompu && !esCompu) continue
      if (s.soloCelular && esCompu) continue
      test(`${s.pantalla} · ${s.nombre}`, async ({}, info) => {
        test.setTimeout(120000)
        test.skip(!navegador, `No está el navegador de ${d.nombre}: ${motivo}`)
        const ctx = await navegador.newContext({ ...d.ctx, locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires', serviceWorkers: 'block' })
        const page = await ctx.newPage()
        const errores = []
        page.on('pageerror', (e) => { if (!/^\[Cloudflare Turnstile\]/.test(e.message)) errores.push(e.message) })
        const conTouch = !!d.ctx.hasTouch
        try {
          await abrir(page, s.url)
          await seguirPasos(page, s.pasos, conTouch)
          await captura(page, `detalles-${d.nombre}-${s.pantalla}-${s.nombre}`.replace(/[^a-z0-9-]+/gi, '_'), info)

          // 1) El botón de abajo se puede tocar (y con el teclado abierto).
          if (s.boton) {
            const r = await page.evaluate(medirBoton, s.boton)
            expect(r.falta, `${s.pantalla} · ${s.nombre}: no aparece ${s.boton}`).toBeFalsy()
            expect(r.prob, `${s.boton} en ${d.nombre}`).toEqual([])
            if (!esCompu) {
              const vp = page.viewportSize()
              await page.setViewportSize({ width: vp.width, height: ALTO_CON_TECLADO })
              await page.waitForTimeout(250)
              const t = await page.evaluate(medirBoton, s.boton)
              expect(t.prob, `${s.boton} en ${d.nombre} con el teclado abierto (${ALTO_CON_TECLADO} px de alto)`).toEqual([])
              await page.setViewportSize(vp)
              await page.waitForTimeout(250)
            }
          }

          // 2) Ninguna fecha se sale de su recuadro.
          const f = await page.evaluate(medirFechas, CONTROLES)
          expect(f.problemas, `fechas de ${s.pantalla} · ${s.nombre} en ${d.nombre}`).toEqual([])

          // 3) La plata con punto de miles mientras se escribe.
          for (const sel of s.plata || []) {
            const campo = page.locator(sel).filter({ visible: true }).first()
            await campo.waitFor({ state: 'visible', timeout: 15000 })
            await campo.scrollIntoViewIfNeeded()
            await campo.click()
            await campo.fill('')
            await campo.pressSequentially('1234567')
            await expect(campo, `${sel}: tipear 1234567`).toHaveValue('1.234.567')
          }
          expect(errores, 'errores de JavaScript').toEqual([])
        } finally {
          await ctx.close()
        }
      })
    }

    // La cartera de cheques en el celular (debajo de 900 px, una tarjeta por
    // cheque): ningún dato se corta del todo ni se sale de su tarjeta.
    if (!esCompu) test('Cheques · las tarjetas del celular', async ({}, info) => {
      test.setTimeout(120000)
      test.skip(!navegador, `No está el navegador de ${d.nombre}: ${motivo}`)
      const ctx = await navegador.newContext({ ...d.ctx, locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires', serviceWorkers: 'block' })
      const page = await ctx.newPage()
      const conTouch = !!d.ctx.hasTouch
      try {
        await abrir(page, ADM)
        await seguirPasos(page, ['[data-pestana="cheques"]', { esperar: 600 }], conTouch)
        await page.locator('.chq-tarjeta').first().waitFor({ state: 'visible' })
        await page.locator('.chq-lista').scrollIntoViewIfNeeded()
        await captura(page, `detalles-${d.nombre}-cheques-tarjetas`, info)
        const problemas = await page.evaluate(() => {
          const out = []
          for (const t of document.querySelectorAll('.chq-tarjeta')) {
            const cuerpo = t.querySelector('.chq-tarjeta__cuerpo').getBoundingClientRect()
            const lado = t.querySelector('.chq-tarjeta__lado')?.getBoundingClientRect()
            const id = t.dataset.chequeFila
            for (const sel of ['.chq-tarjeta__importe', '.chq-tarjeta__pago', '.chq-tarjeta__num', '.chq-tarjeta__banco', '.chq-tarjeta__cliente', '.chq-tarjeta__salida', '.chq-tarjeta__estado', '.forma-pago']) {
              const e = t.querySelector(sel)
              if (!e) continue
              const r = e.getBoundingClientRect()
              if (r.width < 24) out.push(`${id} ${sel}: quedó en ${Math.round(r.width)} px`)
              if (r.right > cuerpo.right + 1 || r.left < cuerpo.left - 1) out.push(`${id} ${sel}: se sale de la tarjeta`)
              if (lado && lado.width && r.right > lado.left + 1 && r.bottom > lado.top && r.top < lado.bottom) out.push(`${id} ${sel}: se pisa con el botón del costado`)
              // Lo que nunca se achica no puede quedar cortado.
              if (/importe|pago|num|estado|forma-pago/.test(sel) && e.scrollWidth > e.clientWidth + 1) out.push(`${id} ${sel}: cortado (${e.scrollWidth} de ${e.clientWidth} px)`)
            }
          }
          return out
        })
        expect(problemas, `tarjetas de cheques en ${d.nombre}`).toEqual([])
      } finally {
        await ctx.close()
      }
    })

    // Administración: lista | detalle.
    test('Administración · lista | detalle', async ({}, info) => {
      test.setTimeout(120000)
      test.skip(!navegador, `No está el navegador de ${d.nombre}: ${motivo}`)
      const ctx = await navegador.newContext({ ...d.ctx, locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires', serviceWorkers: 'block' })
      const page = await ctx.newPage()
      const errores = []
      page.on('pageerror', (e) => { if (!/^\[Cloudflare Turnstile\]/.test(e.message)) errores.push(e.message) })
      const conTouch = !!d.ctx.hasTouch
      try {
        await abrir(page, ADM)
        for (const [pestana, fila, lista, detalle, volver] of [
          ['ordenes', '#ad-ordenes-lista [data-orden]', '#ad-vista-ordenes', '#ad-vista-orden', '#ad-orden-volver'],
          ['listas', '#ad-listas-lista [data-lista]', '#ad-vista-listas', '#ad-vista-lista', '#ad-lista-volver'],
        ]) {
          await seguirPasos(page, [`[data-pestana="${pestana}"]`, fila], conTouch)
          await expect(page.locator(detalle)).toBeVisible()
          const [l, dd] = await Promise.all([lista, detalle].map(sel => page.evaluate(s => {
            const e = document.querySelector(s)
            if (!e || e.hidden || !e.getBoundingClientRect().width) return null
            const r = e.getBoundingClientRect()
            return { izq: r.left, der: r.right, arriba: r.top }
          }, sel)))
          if (esCompu) {
            expect(l, `${lista}: en la compu la lista sigue a la vista al lado del detalle`).not.toBeNull()
            expect(l.der, 'la lista va a la izquierda del detalle').toBeLessThanOrEqual(dd.izq + 1)
            expect(Math.abs(l.arriba - dd.arriba), 'lista y detalle van a la misma altura').toBeLessThan(40)
            const elegida = await page.locator(`${fila}[aria-current="true"]`).count()
            expect(elegida, 'la fila abierta queda marcada en la lista').toBe(1)
          } else {
            expect(l, `${lista}: en el celular se ve de a uno`).toBeNull()
            await tocar(page, volver, conTouch)
            await expect(page.locator(lista)).toBeVisible()
            await expect(page.locator(detalle)).toBeHidden()
          }
          await captura(page, `detalles-${d.nombre}-lista-detalle-${pestana}`, info)
          const ancho = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
          expect(ancho, 'sin scroll de costado').toBeLessThanOrEqual(0)
        }
        expect(errores, 'errores de JavaScript').toEqual([])
      } finally {
        await ctx.close()
      }
    })
  })
}
