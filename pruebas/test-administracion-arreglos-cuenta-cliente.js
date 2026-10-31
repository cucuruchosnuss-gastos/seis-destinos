// ADMINISTRACIÓN → LA CUENTA DEL CLIENTE (31/10/2026, arreglos de la
// auditoría del 30/10, puntos 2 y 5b). Cuentas corrientes → Clientes es esta
// misma pantalla embebida (administracion.html?seccion=clientes&embebido=cc),
// así que lo de acá se ve en los dos lados.
//
// PUNTO 2 — N1 / N2 en la cuenta de cliente y proveedor (cuenta_unificada,
// dibujada por js/cuenta-unica.js, que no se toca). Tocar la fila "Venta"
// despliega debajo, con datos_division_orden(p_orden_id, null, null):
//   N1-0042: $ 1.725.430,48 (incluye comisión de vendedores $ 299.454,88)
//   N2-0042: $ 2.286.939,17
//   Total: $ 4.012.369,65
// Las mismas reglas que Cuentas corrientes (decorarVentasCC, copiada como
// …Ad): sin división guardada o sin retiros:precios, solo el total; una
// parte en 0 no se muestra; se lee al tocar y una vez por orden; un corte de
// conexión se reintenta. En Administración la fila de una orden YA era un
// link ("Ver la orden ›"): ahora la fila despliega y "Ver la orden ›" va
// adentro del desplegable (solo con permiso para ver la orden).
//
// PUNTO 5b — "Aplicar" en un crédito que ya tiene algo aplicado (el saldo a
// favor del corte, un ajuste, una cobranza): se lee lo que ya tenía con
// aplicaciones_credito_cliente (leída con pg_get_functiondef el 31/10/2026:
// [{doc_tipo, doc_id, parte, medio, monto, efectivo}]; va "efectivo", lo que
// la cuenta da como aplicado) y se manda a aplicar_credito_cliente lo de
// antes MÁS lo nuevo, sumado por doc, parte y medio (la base reemplaza todo
// lo del crédito). Si la lectura falla o no coincide con la cuenta, no se
// aplica (se borraría lo anterior) y se dice.
//
// Se EJECUTA el código real (construirCon con un DOM mínimo para el punto 2;
// sandbox-administracion.js para el 5b).
//
//   node pruebas/test-administracion-arreglos-cuenta-cliente.js
'use strict'
process.env.TZ = 'UTC'

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/administracion.html')
const FUENTE = leer(ARCHIVO)
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)
const { chk, esperas, fin } = arnes()
const esperar = async (n = 25) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)) }
const copia = (x) => JSON.parse(JSON.stringify(x))
const N = (s) => String(s ?? '').replace(/[  ]/g, ' ')
const texto = (h) => N(String(h ?? '').replace(/<\/(div|p)>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim())

// ═══════════════════════════════════════════════════════════════════════════
// PUNTO 2 — N1 / N2
// ═══════════════════════════════════════════════════════════════════════════

// Un DOM mínimo: lo que usan decorarVentasAd / alTocarVentaAd (clases,
// atributos, hermanos, hidden, tagName, createElement) y nada más.
const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { log(){}, warn(){}, error(){} }
  function __partes(sel) {
    return { clases: [...sel.matchAll(/\\.([\\w-]+)/g)].map(m => m[1]), datos: [...sel.matchAll(/\\[([\\w-]+)\\]/g)].map(m => m[1]) }
  }
  const __aCamel = (d) => d.replace(/^data-/, '').replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
  class Nodo {
    constructor(tag) { this.tag = String(tag).toUpperCase(); this.hijos = []; this.padre = null; this.attrs = {}; this.dataset = {}; this._clases = new Set(); this.innerHTML = ''; this.textContent = ''; this.id = ''; this.hidden = false }
    get tagName() { return this.tag }
    get className() { return [...this._clases].join(' ') }
    set className(v) { this._clases = new Set(String(v).split(/\\s+/).filter(Boolean)) }
    get classList() { const s = this._clases; return { add: (c) => s.add(c), remove: (c) => s.delete(c), contains: (c) => s.has(c), toggle() {} } }
    setAttribute(k, v) { this.attrs[k] = String(v) }
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null }
    appendChild(n) { n.padre = this; this.hijos.push(n); return n }
    after(n) { const i = this.padre.hijos.indexOf(this); n.padre = this.padre; this.padre.hijos.splice(i + 1, 0, n) }
    remove() { if (this.padre) { this.padre.hijos.splice(this.padre.hijos.indexOf(this), 1); this.padre = null } }
    get nextElementSibling() { if (!this.padre) return null; return this.padre.hijos[this.padre.hijos.indexOf(this) + 1] ?? null }
    matches(sel) { const p = __partes(sel); return p.clases.every(c => this._clases.has(c)) && p.datos.every(d => this.dataset[__aCamel(d)] !== undefined) }
    querySelectorAll(sel) { const out = []; const ir = (n) => { for (const h of n.hijos) { if (h.matches(sel)) out.push(h); ir(h) } }; ir(this); return out }
    querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null }
    closest(sel) { let n = this; while (n) { if (n.matches(sel)) return n; n = n.padre } return null }
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) { const n = new Nodo('div'); n.id = id; __els.set(id, n) } return __els.get(id) },
    createElement(tag) { return new Nodo(tag) },
  }
  var __rpc = [], __respuesta = null, __ordenesAbiertas = []
  var supabase = {
    rpc(nombre, params) { __rpc.push({ nombre, params }); return __respuesta(nombre, params) },
  }
  function abrirOrdenDesde(id) { __ordenesAbiertas.push(id) }
  var estado = { miRolApp: 'usuario', misTareas: new Map(), empresaId: 'u-n', cliente: null }
`

const FUNCIONES_N1N2_AD = [
  'puedeVerDivisionAd', 'filaVentaAd', 'divisionesOrdenAd', 'centavosN1n2Ad', 'divisionDeRespuestaAd', 'infoDivisionAd',
  'htmlDivisionVentaAd', 'leerDivisionAd', 'cargarDivisionAd', 'decorarVentasAd', 'alternarVentaAd', 'alTocarVentaAd',
]
const FUNCIONES_CU_FILA = ['escCu', 'centavosCu', 'plataCu', 'claseEtiquetaCu', 'fechaCu', 'columnaCu', 'linkFilaCu', 'htmlFilaCu']
const FUNCIONES = ['tieneTarea', 'puedeEn', 'esc', 'importeHoja', 'codigoPunto', 'puedeVerLaOrden', ...FUNCIONES_N1N2_AD, ...FUNCIONES_CU_FILA]
const CONSTANTES = ['NUMERO_PUNTO', 'PARTE_UNICA', 'TEXTO_SIN_DIVISION_AD', 'ETIQUETAS_CU']

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __rpc, __ordenesAbiertas, Nodo, __setRespuesta(f){ __respuesta = f }`,
  })
}

const TODAS = ['retiros:ver', 'retiros:precios', 'cobranzas:procesar']
const tareas = (lista) => new Map(lista.map(t => [t, { todas: true }]))

// La cuenta de Distribuidora Anatolia (c1, vinculada con su proveedor pv1):
// la venta N-0042 con división y comisión, su corrección aparte, una sin
// división (N-0043), una 100/0 (N-0044), una cobranza y una compra.
const fila = (etiqueta, orden, te, detalle, extra = {}) => ({
  fecha: '2026-10-20', etiqueta, detalle, moneda: 'ARS', te_debe: te, le_debes: 0, neto_acum: te,
  orden_retiro_id: orden, cobranza_id: null, ...extra,
})
const CUENTA = [
  fila('Compra', null, 0, 'Factura A 0003-00001201', { le_debes: 250000 }),
  fila('Venta', 'o42', 4012369.65, 'Orden N-0042 · incluye comisión de vendedores $ 299.454,88'),
  fila('Comisión', 'o42', 1500, 'Corrección de la comisión de la orden N-0042'),
  fila('Venta', 'o43', 500000, 'Orden N-0043'),
  fila('Venta', 'o44', 120000, 'Orden N-0044'),
  fila('Cobranza', null, -30000, 'Cobranza de la ruta', { cobranza_id: 'cob-1' }),
]
const DIVISION_42 = { orden_id: 'o42', codigo: 'N-0042', pct_a: 40, pct_b: 60, subtotal_a: 1425975.6, comision_total: 299454.88, total_a: 1725430.48, subtotal_b: 2286939.17, total_b: 2286939.17, guardada: true }
const RESPUESTAS = {
  o42: () => ({ data: DIVISION_42, error: null }),
  o43: () => ({ data: null, error: { message: 'Este cliente no tiene condición de venta: poné el % de la parte A.', code: 'P0001' } }),
  o44: () => ({ data: { codigo: 'N-0044', total_a: 120000, comision_total: 6000, total_b: 0, guardada: true }, error: null }),
}
const responder = (id) => Promise.resolve((RESPUESTAS[id] ?? (() => ({ data: null, error: { message: 'La orden no existe.', code: 'P0001' } })))())

// Dibuja las filas como htmlFilaCu en Administración: con abrirOrden (quien
// ve las órdenes) la fila de una orden es un <button class="cu-fila
// cu-fila--link"> con "Ver la orden ›"; sin, un <div class="cu-fila">.
function pintar(S, { link = true } = {}) {
  const raiz = S.__els.has('ad-cuenta-unica') ? S.__els.get('ad-cuenta-unica') : (() => { const n = new S.Nodo('div'); n.id = 'ad-cuenta-unica'; S.__els.set('ad-cuenta-unica', n); return n })()
  raiz.hijos = []
  const lista = raiz.appendChild(new S.Nodo('div'))
  lista.className = 'cu-lista'
  for (const f of [...S.estado.cliente.unica.filas].reverse()) {
    const esLink = link && !!f.orden_retiro_id
    const row = lista.appendChild(new S.Nodo(esLink ? 'button' : 'div'))
    row.className = esLink ? 'cu-fila cu-fila--link' : 'cu-fila'
    if (f.orden_retiro_id) row.dataset.ordenRetiro = f.orden_retiro_id
    const que = row.appendChild(new S.Nodo('div'))
    que.className = 'cu-fila__que'
    const chip = que.appendChild(new S.Nodo('span'))
    chip.className = S.claseEtiquetaCu(f.etiqueta)
    if (esLink) { const v = que.appendChild(new S.Nodo('span')); v.className = 'cu-fila__ver'; v.textContent = 'Ver la orden ›' }
    row.__etiqueta = f.etiqueta
  }
}
function abrir(S, { filas = CUENTA, lista = TODAS, link = true } = {}) {
  S.estado.misTareas = tareas(lista)
  S.estado.cliente = { id: 'c1', unica: { clienteId: 'c1', proveedorId: 'pv1', unidadId: 'u-n', filas: copia(filas) } }
  S.__setRespuesta((nombre, p) => responder(p.p_orden_id))
  pintar(S, { link })
}
const listaDom = (S) => S.__els.get('ad-cuenta-unica').hijos[0]
const filaDom = (S, orden, etiqueta = 'Venta') => listaDom(S).hijos.find(n => n.dataset?.ordenRetiro === orden && n.__etiqueta === etiqueta)
const panelDe = (S, orden) => listaDom(S).hijos.find(n => n.id === 'ad-n1n2-' + orden) ?? null
const lineas = (S, orden) => texto((panelDe(S, orden)?.innerHTML ?? '').replace(/<button[\s\S]*?<\/button>/g, ''))
const tocar = (S, nodo) => S.alTocarVentaAd({ target: nodo })

esperas.push((async () => {
  // ── Tocar una Venta despliega N1 (con la comisión), N2 y el total ────────
  {
    const S = sandbox()
    abrir(S)
    S.decorarVentasAd()
    chk('N1/N2: nada se lee hasta tocar la fila', S.__rpc.length === 0, JSON.stringify(S.__rpc))
    const v42 = filaDom(S, 'o42')
    chk('N1/N2: la fila Venta (un botón, porque abre la orden) queda marcada y apunta al panel', v42.classList.contains('ad-fila-venta') && v42.getAttribute('aria-controls') === 'ad-n1n2-o42' && v42.getAttribute('aria-expanded') === 'false')
    chk('N1/N2: a un botón no se le pone role ni tabindex (ya los tiene)', v42.getAttribute('role') === null && v42.getAttribute('tabindex') === null)
    const vers = v42.querySelectorAll('.cu-fila__ver')
    const nuevo = v42.querySelector('.ad-fila-venta__ver')
    chk('N1/N2: dice "Ver N1 / N2 ▾" y el "Ver la orden ›" de la fila se esconde', nuevo?.textContent === 'Ver N1 / N2 ▾' && vers.length === 2 && vers.filter(v => v !== nuevo).every(v => v.hidden === true && v.textContent === 'Ver la orden ›'))
    const com = filaDom(S, 'o42', 'Comisión')
    chk('N1/N2: la corrección "Comisión" de la misma orden NO se decora (sigue abriendo la orden)', !com.classList.contains('ad-fila-venta') && !com.querySelector('.ad-fila-venta__ver') && com.querySelector('.cu-fila__ver').hidden === false)
    S.decorarVentasAd()
    chk('N1/N2: decorar dos veces no duplica', v42.querySelectorAll('.ad-fila-venta__ver').length === 1)

    chk('N1/N2: tocar la Venta la atiende Administración (no abre la orden)', tocar(S, v42.querySelector('.cu-chip--venta')) === true && S.__ordenesAbiertas.length === 0)
    chk('N1/N2: mientras lee, el total y "Leyendo N1 / N2…"', /Leyendo N1 \/ N2…/.test(panelDe(S, 'o42')?.innerHTML ?? '') && lineas(S, 'o42').startsWith('Total: $ 4.012.369,65'))
    await esperar()
    chk('N1/N2: UNA llamada a datos_division_orden(orden, null, null)', S.__rpc.length === 1 && S.__rpc[0].nombre === 'datos_division_orden' && JSON.stringify(S.__rpc[0].params) === JSON.stringify({ p_orden_id: 'o42', p_pct_a: null, p_comisiones: null }), JSON.stringify(S.__rpc))
    const p = panelDe(S, 'o42')
    chk('N1/N2: el panel va justo debajo de la fila', p && v42.nextElementSibling === p && p.classList.contains('ad-n1n2') && p.getAttribute('role') === 'region')
    chk('N1/N2: N1 con la comisión y cuánto es, N2 y el total',
      lineas(S, 'o42') === 'N1-0042: $ 1.725.430,48 (incluye comisión de vendedores $ 299.454,88) N2-0042: $ 2.286.939,17 Total: $ 4.012.369,65', lineas(S, 'o42'))
    chk('N1/N2: el total en su renglón marcado', /class="ad-n1n2__linea ad-n1n2__linea--total"><span class="ad-n1n2__rotulo">Total:<\/span> <strong>\$ 4\.012\.369,65<\/strong>/.test(N(p?.innerHTML)))
    chk('N1/N2: abierta, aria-expanded="true" y "Ocultar N1 / N2 ▴"', v42.getAttribute('aria-expanded') === 'true' && nuevo.textContent === 'Ocultar N1 / N2 ▴')
    chk('N1/N2: "Ver la orden ›" va adentro del desplegable', /<button type="button" class="ad-link ad-n1n2__orden" data-ad-n1n2-orden="o42">Ver la orden ›<\/button>/.test(p?.innerHTML ?? ''), p?.innerHTML)
    // Tocar "Ver la orden ›" del desplegable abre la orden.
    const boton = p.appendChild(new S.Nodo('button'))
    boton.dataset.adN1n2Orden = 'o42'
    chk('N1/N2: "Ver la orden ›" del desplegable abre la orden', tocar(S, boton) === true && S.__ordenesAbiertas.join() === 'o42' && panelDe(S, 'o42') !== null)
    // Cerrar y abrir: sin leer de nuevo.
    tocar(S, v42)
    await esperar()
    chk('N1/N2: tocar de nuevo la cierra', panelDe(S, 'o42') === null && v42.getAttribute('aria-expanded') === 'false')
    tocar(S, v42)
    await esperar()
    chk('N1/N2: volver a abrirla NO vuelve a leer (una vez por orden)', S.__rpc.length === 1 && /N1-0042/.test(panelDe(S, 'o42')?.innerHTML ?? ''))
    // js/cuenta-unica.js repinta (el filtro, Compensar): sigue abierta.
    pintar(S)
    S.decorarVentasAd()
    chk('N1/N2: después de repintar sigue abierta, con un solo panel y sin otra lectura', /N2-0042/.test(panelDe(S, 'o42')?.innerHTML ?? '') && listaDom(S).hijos.filter(n => n.id === 'ad-n1n2-o42').length === 1 && S.__rpc.length === 1)
    chk('N1/N2: tocar la corrección "Comisión" no la atiende (la abre cuenta-unica.js)', tocar(S, filaDom(S, 'o42', 'Comisión').querySelector('.cu-chip--comision')) === false)
    chk('N1/N2: tocar adentro del panel (no en el link) no lo cierra', tocar(S, panelDe(S, 'o42')) === false && panelDe(S, 'o42') !== null)
  }

  // ── Sin división guardada y una parte en 0 ───────────────────────────────
  {
    const S = sandbox()
    abrir(S)
    S.decorarVentasAd()
    await S.alternarVentaAd('o43')
    chk('sin división guardada: solo el total y "Sin división N1/N2"', lineas(S, 'o43') === 'Total: $ 500.000,00 Sin división N1/N2', lineas(S, 'o43'))
    chk('sin división guardada: sin N1 ni N2', !/N1-|N2-/.test(panelDe(S, 'o43')?.innerHTML ?? ''))
    await S.alternarVentaAd('o44')
    chk('100/0: solo N1 (con su comisión) y el total', lineas(S, 'o44') === 'N1-0044: $ 120.000,00 (incluye comisión de vendedores $ 6.000,00) Total: $ 120.000,00', lineas(S, 'o44'))
    const S2 = sandbox()
    abrir(S2)
    S2.__setRespuesta(() => Promise.resolve({ data: { ...DIVISION_42, guardada: false }, error: null }))
    S2.decorarVentasAd()
    await S2.alternarVentaAd('o42')
    chk('guardada = false (la orden no tiene división): solo el total', lineas(S2, 'o42') === 'Total: $ 4.012.369,65 Sin división N1/N2', lineas(S2, 'o42'))
  }

  // ── Sin retiros:precios: solo el total, sin llamar ───────────────────────
  {
    const S = sandbox()
    abrir(S, { lista: ['retiros:ver', 'cobranzas:procesar'] })
    S.decorarVentasAd()
    await S.alternarVentaAd('o42')
    chk('sin retiros:precios: NO llama a la base', S.__rpc.length === 0, JSON.stringify(S.__rpc))
    chk('sin retiros:precios: solo el total, sin "Sin división" ni "Leyendo"', lineas(S, 'o42') === 'Total: $ 4.012.369,65', lineas(S, 'o42'))
    const S2 = sandbox()
    abrir(S2)
    S2.__setRespuesta(() => Promise.resolve({ data: null, error: { message: 'No tenés permiso sobre esta orden.', code: 'P0001' } }))
    S2.decorarVentasAd()
    await S2.alternarVentaAd('o42')
    chk('la base lo rechaza por permiso (otra fábrica): solo el total, sin rojo', lineas(S2, 'o42') === 'Total: $ 4.012.369,65', lineas(S2, 'o42'))
    const S3 = sandbox()
    abrir(S3, { lista: [] })
    S3.estado.miRolApp = 'super_admin'
    S3.decorarVentasAd()
    await S3.alternarVentaAd('o42')
    chk('super_admin (bypass, como la base): lee', S3.__rpc.length === 1 && /N1-0042/.test(panelDe(S3, 'o42')?.innerHTML ?? ''))
  }

  // ── Sin permiso para ver la orden: la fila es un div ─────────────────────
  {
    const S = sandbox()
    abrir(S, { lista: ['retiros:precios', 'cobranzas:procesar'], link: false })
    S.decorarVentasAd()
    const v42 = filaDom(S, 'o42')
    chk('sin retiros:ver la fila es un div: role="button" y tabindex', v42.tagName === 'DIV' && v42.getAttribute('role') === 'button' && v42.getAttribute('tabindex') === '0')
    await S.alternarVentaAd('o42')
    chk('sin retiros:ver: el desplegable sin "Ver la orden ›"', /N1-0042/.test(panelDe(S, 'o42')?.innerHTML ?? '') && !/data-ad-n1n2-orden/.test(panelDe(S, 'o42')?.innerHTML ?? ''))
  }

  // ── Un corte de conexión se reintenta; otro cliente no hereda ────────────
  {
    const S = sandbox()
    abrir(S)
    S.__setRespuesta(() => Promise.reject(new Error('Failed to fetch')))
    S.decorarVentasAd()
    await S.alternarVentaAd('o42')
    chk('sin conexión: el total y "No se pudo leer N1 / N2 (Failed to fetch)"', /No se pudo leer N1 \/ N2 \(Failed to fetch\)\. Cerrá y volvé a tocar la fila para reintentar\./.test(lineas(S, 'o42')) && lineas(S, 'o42').startsWith('Total: $ 4.012.369,65'))
    S.__setRespuesta((n, p) => responder(p.p_orden_id))
    await S.alternarVentaAd('o42')
    await S.alternarVentaAd('o42')
    chk('cerrar y volver a tocar reintenta', S.__rpc.length === 2 && /N1-0042/.test(panelDe(S, 'o42')?.innerHTML ?? ''))
    let soltar
    S.__setRespuesta(() => new Promise(r => { soltar = () => r({ data: DIVISION_42, error: null }) }))
    abrir(S)
    S.estado.divisionesOrdenAd = new Map()
    S.__setRespuesta(() => new Promise(r => { soltar = () => r({ data: DIVISION_42, error: null }) }))
    S.decorarVentasAd()
    const va = S.alternarVentaAd('o42')
    await esperar()
    abrir(S)
    soltar()
    await va
    chk('otro cliente abierto mientras lee: no hereda la venta abierta', panelDe(S, 'o42') === null && filaDom(S, 'o42').getAttribute('aria-expanded') !== 'true')
  }

  // ── Escape ───────────────────────────────────────────────────────────────
  {
    const S = sandbox()
    abrir(S)
    S.__setRespuesta(() => Promise.reject(new Error(marca('mensaje'))))
    S.decorarVentasAd()
    await S.alternarVentaAd('o42')
    chequearMarcas(chk, 'el desplegable con el error de la base', panelDe(S, 'o42')?.innerHTML ?? '', ['mensaje'])
    const S2 = sandbox()
    const filas = copia(CUENTA)
    filas[1].orden_retiro_id = marca('orden')
    abrir(S2, { filas })
    S2.__setRespuesta(() => Promise.resolve({ data: { ...DIVISION_42, codigo: marca('codigo') }, error: null }))
    S2.decorarVentasAd()
    await S2.alternarVentaAd(marca('orden'))
    const h = panelDe(S2, marca('orden'))?.innerHTML ?? ''
    // codigoPunto pega el 1 / 2 al primer guion (también al de la marca).
    chk('escape: el id de la orden (en "Ver la orden ›") y el código de los puntos, sin etiquetas crudas', h.length > 0 && !/<b data[12]?-xss/.test(h) &&
      /data-ad-n1n2-orden="&quot;&gt;&lt;b data-xss=&quot;orden&quot;&gt;"/.test(h) && /&lt;b data1-xss=&quot;codigo&quot;&gt;/.test(h) && /&lt;b data2-xss=&quot;codigo&quot;&gt;/.test(h), h)
  }

  // La fila "Venta" de una orden, nunca su corrección "Comisión".
  {
    const S = sandbox()
    chk('filaVentaAd: con solo la corrección "Comisión" de la orden, no hay venta', S.filaVentaAd({ filas: [CUENTA[2]] }, 'o42') === null)
    chk('filaVentaAd: con las dos (la corrección primero), la Venta', S.filaVentaAd({ filas: [CUENTA[2], CUENTA[1]] }, 'o42')?.etiqueta === 'Venta')
    chk('filaVentaAd: sin orden, nada', S.filaVentaAd({ filas: CUENTA }, null) === null)
  }

  // ── El contrato con js/cuenta-unica.js (cómo dibuja la fila acá) ─────────
  {
    const S = sandbox()
    const venta = S.htmlFilaCu(CUENTA[1], { abreOrden: true })
    chk('contrato: con abrirOrden, la Venta es un <button class="cu-fila cu-fila--link"> con data-orden-retiro', /^<button type="button" class="cu-fila cu-fila--link" data-orden-retiro="o42">/.test(venta), venta.slice(0, 90))
    chk('contrato: el chip cu-chip--venta y "Ver la orden" (.cu-fila__ver) adentro de .cu-fila__que', /<div class="cu-fila__que"><span class="cu-chip cu-chip--venta">Venta<\/span>[\s\S]*<span class="cu-fila__ver">Ver la orden/.test(venta))
    chk('contrato: sin abrirOrden, un <div class="cu-fila">', /^<div class="cu-fila" data-orden-retiro="o42">/.test(S.htmlFilaCu(CUENTA[1])))
  }
})())

// ── El enlace en la pantalla (la fila se arma en js/cuenta-unica.js) ─────────
chk('pintarCuentaUnicaCliente decora las ventas después de pintar', /el\.hidden = false\s*pintarCuentaUnica\(ctx\)\s*decorarVentasAd\(\)\s*\}/.test(FUENTE))
chk('el click de la cuenta pasa primero por alTocarVentaAd', /unica\.addEventListener\('click', \(e\) => \{ if \(alTocarVentaAd\(e\)\) return; const ctx = ctxCuentaUnica\(\); if \(ctx\) alTocarCuentaUnica\(e, ctx\) \}\)/.test(FUENTE))
chk('Enter y espacio abren una fila que no es botón', /unica\.addEventListener\('keydown', \(e\) => \{\s*if \(e\.key !== 'Enter' && e\.key !== ' '\) return\s*if \(!e\.target\?\.matches\?\.\('\.cu-fila\.ad-fila-venta'\) \|\| e\.target\.tagName === 'BUTTON'\) return\s*e\.preventDefault\(\)\s*alternarVentaAd\(e\.target\.dataset\.ordenRetiro\)/.test(FUENTE))
chk('cuando js/cuenta-unica.js repinta, se vuelve a decorar (MutationObserver)', /new MutationObserver\(\(\) => decorarVentasAd\(\)\)\.observe\(unica, \{ childList: true \}\)/.test(FUENTE))
chk('la fila y el desplegable tienen su estilo', /\.cu-fila\.ad-fila-venta \{ cursor: pointer; \}/.test(FUENTE) && /\.cu-fila\.ad-fila-venta:focus-visible \{ outline: 2px solid/.test(FUENTE) && /\.ad-n1n2 \{/.test(FUENTE))
chk('js/cuenta-unica.js no se tocó para esto', !/n1n2|N1 \/ N2|datos_division_orden/i.test(fs.readFileSync(path.join(RAIZ, 'js/cuenta-unica.js'), 'utf8')))
chk('Cuentas corrientes → Clientes es esta pantalla embebida (lo de acá se ve allá)', fs.readFileSync(path.join(RAIZ, 'modulos/cuentas-corrientes.html'), 'utf8').includes("const URL_CLIENTES = 'administracion.html?seccion=clientes&embebido=cc'"))

// ═══════════════════════════════════════════════════════════════════════════
// PUNTO 5b — lo que ya tenía MÁS lo nuevo, con aplicaciones_credito_cliente
// ═══════════════════════════════════════════════════════════════════════════

const CUENTA_CLI = [
  { fecha: '2026-11-01', tipo: 'saldo_inicial', detalle: 'Saldo al corte', importe: -50000, saldo: -50000, orden_retiro_id: null },
  { fecha: '2026-11-03', tipo: 'retiro', detalle: 'Orden de retiro N-0042', importe: 180000, saldo: 130000, orden_retiro_id: 'o-42' },
]
const D = (doc_tipo, doc_id, parte, etiqueta, monto, aplicado = 0) => ({ doc_tipo, doc_id, parte, etiqueta, fecha: '2026-11-03', orden_id: null, monto, aplicado, pendiente: monto - aplicado })
// La N1 ya tiene 20.000 aplicados (del corte); la N2 nada; una nota de débito.
const DOCS = [
  D('orden', 'o-42', 'N1', 'N1-0042', 100000, 20000),
  D('orden', 'o-42', 'N2', 'N2-0042', 80000),
  D('nota_debito', 'nd-1', 'total', 'Nota de débito N-ND-0001', 30000, 5000),
]
const K = (credito_tipo, credito_id, etiqueta, monto, aplicado, medios = null, apm = null) => ({ credito_tipo, credito_id, etiqueta, fecha: '2026-11-01', monto, aplicado, libre: monto - aplicado, medios, aplicado_por_medio: apm })
const CREDITOS = [
  // El saldo a favor del corte: 50.000, con 25.000 ya aplicados (20.000 a la N1 y 5.000 a la nota).
  K('corte', 'cli-1', 'Saldo a favor al corte', 50000, 25000),
  // Una cobranza con 10.000 aplicados en efectivo a la N2.
  K('cobranza', 'cb-2', 'Cobranza del 06/11/2026', 40000, 10000, { cheque: 0, transferencia: 0, efectivo: 40000 }, { efectivo: 10000 }),
]
// Lo que devuelve aplicaciones_credito_cliente: una fila por imputación
// guardada. La del corte trae DOS a la N1 (se suman) y una con "monto" más
// grande que "efectivo" (la nota bajó: cuenta 5.000, no 8.000).
const APLICACIONES = {
  'corte|cli-1': [
    { doc_tipo: 'orden', doc_id: 'o-42', parte: 'N1', medio: null, monto: 12000, efectivo: 12000 },
    { doc_tipo: 'orden', doc_id: 'o-42', parte: 'N1', medio: null, monto: 8000, efectivo: 8000 },
    { doc_tipo: 'nota_debito', doc_id: 'nd-1', parte: 'total', medio: null, monto: 8000, efectivo: 5000 },
  ],
  'cobranza|cb-2': [{ doc_tipo: 'orden', doc_id: 'o-42', parte: 'N2', medio: 'efectivo', monto: 10000, efectivo: 10000 }],
}

function sugerir(docs, p) {
  let resta = Math.round(p.p_monto * 100)
  const items = []
  for (const d of docs) {
    if (resta <= 0) break
    const pend = Math.round(d.pendiente * 100)
    if (!(pend > 0) || (p.p_parte && d.parte !== p.p_parte)) continue
    const toma = Math.min(resta, pend)
    items.push({ doc_tipo: d.doc_tipo, doc_id: d.doc_id, parte: d.parte, etiqueta: d.etiqueta, monto: toma / 100 })
    resta -= toma
  }
  return { items, sobra: Math.max(resta, 0) / 100 }
}

function nuevo({ rpc = {} } = {}) {
  const S = construirAdministracion(ARCHIVO)
  S.estado.misTareas = tareas(TODAS)
  S.estado.unidadBarra = 'u-n'
  S.__tablas.clientes = [{ id: 'cli-1', nombre: 'J&M', activo: true, unidad_negocio_id: 'u-n' }]
  S.__tablas.cliente_movimientos = []
  S.__tablas.ordenes_retiro = [{ id: 'o-42', codigo: 'N-0042' }]
  S.__setRpc(async (n, p) => {
    if (Object.prototype.hasOwnProperty.call(rpc, n)) return typeof rpc[n] === 'function' ? rpc[n](p) : rpc[n]
    if (n === 'cuenta_cliente') return { data: copia(CUENTA_CLI), error: null }
    if (n === 'cliente_pendientes') return { data: { activo: true, imputa_desde: '2026-11-01T03:00:00+00:00', saldo_cuenta: 130000, docs: copia(DOCS), creditos: copia(CREDITOS) }, error: null }
    if (n === 'sugerir_aplicacion') return { data: sugerir(DOCS, p), error: null }
    if (n === 'aplicaciones_credito_cliente') return { data: copia(APLICACIONES[p.p_credito_tipo + '|' + p.p_credito_id] ?? []), error: null }
    if (n === 'aplicar_credito_cliente') {
      const k = CREDITOS.find(x => x.credito_tipo === p.p_credito_tipo && x.credito_id === p.p_credito_id)
      const aplicado = p.p_items.reduce((s, x) => s + Math.round(x.monto * 100), 0) / 100
      return { data: { aplicado, a_cuenta: (k?.monto ?? 0) - aplicado }, error: null }
    }
    if (n === 'cuenta_cliente_consolidada') return { data: [], error: null }
    return { data: null, error: null }
  })
  return S
}
const cuerpo = (S) => S.__els.get('ad-cliente-cuerpo')?.innerHTML ?? ''
const rpcs = (S, nombre) => S.__llamadas.rpc.filter(r => r[0] === nombre)
const toque = (dataset) => ({ target: { closest: () => ({ dataset }) } })

esperas.push((async () => {
  // ── El saldo a favor del corte con algo aplicado ─────────────────────────
  {
    const S = nuevo()
    await S.abrirCliente('cli-1')
    await esperar()
    const h = cuerpo(S)
    chk('5b: el corte con algo aplicado ofrece "Aplicar" (se terminó el hueco)', /data-ad-aplicar="corte\|cli-1"/.test(h) && !h.includes('falta una función de la base'))
    S.alTocarPendientesAd(toque({ adAplicar: 'corte|cli-1' }))
    await esperar()
    const lect = rpcs(S, 'aplicaciones_credito_cliente')
    chk('5b: al abrir lee lo que ya tenía con aplicaciones_credito_cliente(cliente, tipo, id)', lect.length === 1 && JSON.stringify(lect[0][1]) === JSON.stringify({ p_cliente_id: 'cli-1', p_credito_tipo: 'corte', p_credito_id: 'cli-1' }), JSON.stringify(lect))
    chk('5b: no usa recibo_cobranza', !rpcs(S, 'recibo_cobranza').length)
    const c = S.estado.cliente
    chk('5b: lo previo va con "efectivo" (lo que cuenta), no con "monto"', JSON.stringify(c.aplicar?.previas) === JSON.stringify([
      { doc_tipo: 'orden', doc_id: 'o-42', parte: 'N1', monto: 12000, medio: null },
      { doc_tipo: 'orden', doc_id: 'o-42', parte: 'N1', monto: 8000, medio: null },
      { doc_tipo: 'nota_debito', doc_id: 'nd-1', parte: 'total', monto: 5000, medio: null }]), JSON.stringify(c.aplicar?.previas))
    chk('5b: dice "Ya tenía aplicado $ 25.000,00"', texto(cuerpo(S)).includes('Ya tenía aplicado $ 25.000,00: se mantiene y se le suma lo de abajo.'))
    chk('5b: se sugiere con lo libre (25.000)', rpcs(S, 'sugerir_aplicacion')[0]?.[1].p_monto === 25000)
    chk('5b: el botón Aplicar habilitado', S.__els.get('ad-apl-confirmar').disabled === false)
    await S.confirmarAplicarAd()
    const ap = rpcs(S, 'aplicar_credito_cliente')
    chk('5b: aplicar_credito_cliente UNA vez con el corte', ap.length === 1 && ap[0][1].p_credito_tipo === 'corte' && ap[0][1].p_credito_id === 'cli-1' && ap[0][1].p_cliente_id === 'cli-1')
    // Lo nuevo: 25.000 a la N1 (pendiente 80.000). Con lo anterior: N1 20.000 + 25.000, nota 5.000.
    chk('5b: manda lo anterior MÁS lo nuevo, sumado por doc, parte y medio', JSON.stringify(ap[0]?.[1].p_items) === JSON.stringify([
      { doc_tipo: 'orden', doc_id: 'o-42', parte: 'N1', monto: 45000, medio: null },
      { doc_tipo: 'nota_debito', doc_id: 'nd-1', parte: 'total', monto: 5000, medio: null }]), JSON.stringify(ap[0]?.[1].p_items))
    chk('5b: el aviso con todo lo aplicado del crédito', N(S.__llamadas.exitos.pop()) === 'Aplicado $ 50.000,00 · Queda a cuenta $ 0,00')
  }

  // Lo nuevo a otro renglón: va aparte (no se suma con otro doc).
  {
    const S = nuevo()
    await S.abrirCliente('cli-1')
    await esperar()
    await S.abrirAplicarAd('corte|cli-1')
    S.actualizarMontoAd('orden|o-42|N1', null, '')
    S.actualizarMontoAd('orden|o-42|N2', null, '15.000')
    S.actualizarMontoAd('nota_debito|nd-1|total', null, '10.000')
    await S.confirmarAplicarAd()
    chk('5b: lo nuevo en la N2 y en la nota: la N2 aparte y la nota sumada (5.000 + 10.000)', JSON.stringify(rpcs(S, 'aplicar_credito_cliente')[0]?.[1].p_items) === JSON.stringify([
      { doc_tipo: 'orden', doc_id: 'o-42', parte: 'N1', monto: 20000, medio: null },
      { doc_tipo: 'nota_debito', doc_id: 'nd-1', parte: 'total', monto: 15000, medio: null },
      { doc_tipo: 'orden', doc_id: 'o-42', parte: 'N2', monto: 15000, medio: null }]), JSON.stringify(rpcs(S, 'aplicar_credito_cliente')[0]?.[1].p_items))
  }

  // Una cobranza: la misma lectura; el mismo doc con OTRO medio va aparte.
  {
    const S = nuevo()
    await S.abrirCliente('cli-1')
    await esperar()
    await S.abrirAplicarAd('cobranza|cb-2')
    chk('5b: la cobranza también lee con aplicaciones_credito_cliente (no recibo_cobranza)', rpcs(S, 'aplicaciones_credito_cliente').length === 1 && rpcs(S, 'aplicaciones_credito_cliente')[0][1].p_credito_tipo === 'cobranza' && !rpcs(S, 'recibo_cobranza').length)
    chk('5b: lo previo de la cobranza conserva su medio', JSON.stringify(S.estado.cliente.aplicar?.previas) === JSON.stringify([{ doc_tipo: 'orden', doc_id: 'o-42', parte: 'N2', monto: 10000, medio: 'efectivo' }]))
    S.actualizarMontoAd('orden|o-42|N1', null, '')
    S.actualizarMontoAd('orden|o-42|N2', null, '30.000')
    await S.confirmarAplicarAd()
    chk('5b: "Aplicar todo" (sin medio) a la N2 no se suma con lo de efectivo', JSON.stringify(rpcs(S, 'aplicar_credito_cliente')[0]?.[1].p_items) === JSON.stringify([
      { doc_tipo: 'orden', doc_id: 'o-42', parte: 'N2', monto: 10000, medio: 'efectivo' },
      { doc_tipo: 'orden', doc_id: 'o-42', parte: 'N2', monto: 30000, medio: null }]), JSON.stringify(rpcs(S, 'aplicar_credito_cliente')[0]?.[1].p_items))
    // Por medio: el mismo doc y el mismo medio, sumados en uno.
    const S2 = nuevo()
    await S2.abrirCliente('cli-1')
    await esperar()
    await S2.abrirAplicarAd('cobranza|cb-2')
    S2.cambiarModoAd('medio')
    S2.actualizarMontoAd('orden|o-42|N2', 'efectivo', '20.000')
    await S2.confirmarAplicarAd()
    chk('5b: por medio, la N2 en efectivo: 10.000 + 20.000 en un renglón', JSON.stringify(rpcs(S2, 'aplicar_credito_cliente')[0]?.[1].p_items) === JSON.stringify([
      { doc_tipo: 'orden', doc_id: 'o-42', parte: 'N2', monto: 30000, medio: 'efectivo' }]), JSON.stringify(rpcs(S2, 'aplicar_credito_cliente')[0]?.[1].p_items))
  }

  // ── Si la lectura falla, no se aplica ────────────────────────────────────
  for (const [caso, resp] of [
    ['la base devuelve un error', { data: null, error: { message: 'sin red' } }],
    ['no viene una lista', { data: null, error: null }],
  ]) {
    const S = nuevo({ rpc: { aplicaciones_credito_cliente: resp } })
    await S.abrirCliente('cli-1')
    await esperar()
    await S.abrirAplicarAd('corte|cli-1')
    const h = cuerpo(S)
    chk(`5b (${caso}): lo dice`, texto(h).includes('No se pudo leer lo que este crédito ya tenía aplicado (' + (resp.error ? 'sin red' : 'no vino nada') + '). Sin eso no se puede aplicar: se borraría.'), texto(h).slice(0, 400))
    chk(`5b (${caso}): sin botón Aplicar ni sugerencia`, !/data-ad-apl-confirmar/.test(h) && !rpcs(S, 'sugerir_aplicacion').length)
    S.actualizarMontoAd('orden|o-42|N2', null, '1.000')
    await S.sugerirTodoAd(null)
    await S.confirmarAplicarAd()
    chk(`5b (${caso}): no se llama a aplicar_credito_cliente`, !rpcs(S, 'aplicar_credito_cliente').length)
  }
  {
    const S = nuevo({ rpc: { aplicaciones_credito_cliente: () => { throw new Error('Failed to fetch') } } })
    await S.abrirCliente('cli-1')
    await esperar()
    await S.abrirAplicarAd('corte|cli-1')
    await S.confirmarAplicarAd()
    chk('5b (corte de conexión): lo dice y no aplica', texto(cuerpo(S)).includes('No se pudo leer lo que este crédito ya tenía aplicado (Failed to fetch).') && !rpcs(S, 'aplicar_credito_cliente').length)
  }
  // Lo leído no coincide con lo que dice la cuenta: tampoco.
  {
    const S = nuevo({ rpc: { aplicaciones_credito_cliente: { data: [APLICACIONES['corte|cli-1'][0]], error: null } } })
    await S.abrirCliente('cli-1')
    await esperar()
    await S.abrirAplicarAd('corte|cli-1')
    await S.confirmarAplicarAd()
    chk('5b: lo leído (12.000) no coincide con la cuenta (25.000): lo dice y no aplica', texto(cuerpo(S)).includes('Lo que este crédito ya tenía aplicado ($ 12.000,00) no coincide con la cuenta ($ 25.000,00).') && !rpcs(S, 'aplicar_credito_cliente').length)
  }
  // Un crédito sin nada aplicado no necesita leer.
  {
    const S = nuevo({ rpc: { cliente_pendientes: { data: { activo: true, docs: copia(DOCS), creditos: [K('movimiento', 'mv-1', 'Ajuste a favor', 3000, 0)] }, error: null } } })
    await S.abrirCliente('cli-1')
    await esperar()
    await S.abrirAplicarAd('movimiento|mv-1')
    chk('5b: sin nada aplicado no se lee lo anterior', !rpcs(S, 'aplicaciones_credito_cliente').length && S.estado.cliente.aplicar?.previas?.length === 0)
  }
  // El mensaje de la base al leer va escapado.
  {
    const S = nuevo({ rpc: { aplicaciones_credito_cliente: { data: null, error: { message: marca('err-leer') } } } })
    await S.abrirCliente('cli-1')
    await esperar()
    await S.abrirAplicarAd('corte|cli-1')
    chequearMarcas(chk, '5b: el error al leer lo aplicado', cuerpo(S), ['err-leer'])
  }
})())

fin()
