// CUENTAS CORRIENTES — LA VENTA Y SUS PUNTOS N1 / N2 (30/10/2026, rama
// ci-prueba/cc-orden-n1-n2).
//
// En la ficha del proveedor que también es cliente, la cuenta de las dos
// cosas juntas (cuenta_unificada, dibujada por js/cuenta-unica.js) trae UNA
// fila "Venta" por orden con te_debe = el retiro + la comisión de vendedores
// (lo junta la base). Tocar esa fila despliega debajo:
//   N1-0042: $ 1.725.430,48 (incluye comisión de vendedores $ 299.454,88)
//   N2-0042: $ 2.286.939,17
//   Total: $ 4.012.369,65
// con datos_division_orden(p_orden_id, null, null) (verificada con
// pg_get_functiondef el 30/10/2026: SECURITY DEFINER, pide retiros:precios en
// la fábrica de la orden; devuelve codigo, total_a, comision_total, total_b y
// guardada). Exige, EJECUTANDO el código real con un document falso:
//  - nada se lee hasta tocar la fila, y una vez por orden (cache);
//  - con división y comisión: N1 con la comisión y cuánto, N2 y el total;
//  - una parte en 0 no se muestra;
//  - sin división (guardada = false o "Este cliente no tiene condición de
//    venta…"): solo el total y "Sin división N1/N2";
//  - sin retiros:precios: solo el total, sin llamar a la base y sin error;
//    si la base lo rechaza por permiso: solo el total, sin error;
//  - un corte de conexión no queda guardado (tocar de nuevo reintenta);
//  - la corrección "Comisión" de la misma orden NO despliega;
//  - todo dato de la base escapado; el contrato con js/cuenta-unica.js
//    (data-orden-retiro y el chip de la etiqueta) y el enlace de los eventos;
//  - nada de lo que había se perdió (baseline FIJO e6e0c74, nunca HEAD).
//
//   node pruebas/test-cuentas-corrientes-orden-n1-n2.js
'use strict'

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')
const { FUNCIONES_N1N2_CC } = require('./cuenta-unica-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cuentas-corrientes.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

// Un DOM mínimo: lo que usan decorarVentasCC / alTocarVentaCC (clases,
// atributos, hermanos, createElement) y nada más.
const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { log(){}, warn(){}, error(){} }
  function __partes(sel) {
    return { clases: [...sel.matchAll(/\\.([\\w-]+)/g)].map(m => m[1]), datos: [...sel.matchAll(/\\[([\\w-]+)\\]/g)].map(m => m[1]) }
  }
  const __aCamel = (d) => d.replace(/^data-/, '').replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
  class Nodo {
    constructor(tag) { this.tag = tag; this.hijos = []; this.padre = null; this.attrs = {}; this.dataset = {}; this._clases = new Set(); this.innerHTML = ''; this.textContent = ''; this.id = '' }
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
  var __rpc = [], __respuesta = null
  var supabase = {
    rpc(nombre, params) { __rpc.push({ nombre, params }); return __respuesta(nombre, params) },
  }
  var estado = { miRolApp: 'usuario', misTareas: new Set(['cuentas_corrientes:ver_todo', 'retiros:ver', 'retiros:precios']), ficha: null }
`

// Lo de js/cuenta-unica.js para el CONTRATO (cómo dibuja la fila).
const FUNCIONES_CU_FILA = ['escCu', 'centavosCu', 'plataCu', 'claseEtiquetaCu', 'fechaCu', 'columnaCu', 'linkFilaCu', 'htmlFilaCu']
const FUNCIONES = ['tieneTarea', 'esc', 'formatearImporte', ...FUNCIONES_N1N2_CC, ...FUNCIONES_CU_FILA]
const CONSTANTES = ['NUMERO_PUNTO_CC', 'TEXTO_SIN_DIVISION_CC', 'ETIQUETAS_CU']

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __rpc, Nodo, __setRespuesta(f){ __respuesta = f }`,
  })
}

// La cuenta de Anatolia en Nuss: la venta N-0042 con división y comisión, su
// corrección de comisión aparte, una venta sin división (N-0043), una 100/0
// (N-0044), una cobranza y una compra del lado del proveedor.
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
  fila('Venta', 'o45', 90000, 'Orden N-0045'),
  fila('Cobranza', null, -30000, 'Cobranza de la ruta', { cobranza_id: 'cob-1' }),
]
const DIVISION_42 = { orden_id: 'o42', codigo: 'N-0042', pct_a: 40, pct_b: 60, subtotal_a: 1425975.6, comision_total: 299454.88, total_a: 1725430.48, subtotal_b: 2286939.17, total_b: 2286939.17, guardada: true }
const RESPUESTAS = {
  o42: () => ({ data: DIVISION_42, error: null }),
  o43: () => ({ data: null, error: { message: 'Este cliente no tiene condición de venta: poné el % de la parte A.', code: 'P0001' } }),
  o44: () => ({ data: { codigo: 'N-0044', total_a: 120000, comision_total: 6000, total_b: 0, guardada: true }, error: null }),
  o45: () => ({ data: { codigo: 'N-0045', total_a: 36000, comision_total: 0, total_b: 54000, guardada: false }, error: null }),
}
const responder = (id) => Promise.resolve((RESPUESTAS[id] ?? (() => ({ data: null, error: { message: 'La orden no existe.', code: 'P0001' } })))())

// Dibuja las filas como htmlFilaCu (div.cu-fila con data-orden-retiro y el
// chip de su etiqueta adentro de .cu-fila__que), en el orden de la pantalla.
function pintar(S, filas = S.estado.ficha.unica.filas) {
  const el = S.__els.has('ficha-cuenta-unica') ? S.__els.get('ficha-cuenta-unica') : null
  const raiz = el ?? (() => { const n = new S.Nodo('div'); n.id = 'ficha-cuenta-unica'; S.__els.set('ficha-cuenta-unica', n); return n })()
  raiz.hijos = []
  const lista = raiz.appendChild(new S.Nodo('div'))
  lista.className = 'cu-lista'
  for (const f of [...filas].reverse()) {
    const row = lista.appendChild(new S.Nodo('div'))
    row.className = 'cu-fila'
    if (f.orden_retiro_id) row.dataset.ordenRetiro = f.orden_retiro_id
    const que = row.appendChild(new S.Nodo('div'))
    que.className = 'cu-fila__que'
    const chip = que.appendChild(new S.Nodo('span'))
    chip.className = S.claseEtiquetaCu(f.etiqueta)
    row.__etiqueta = f.etiqueta
  }
  return lista
}
function abrir(S, { filas = CUENTA, tareas } = {}) {
  if (tareas) S.estado.misTareas = new Set(tareas)
  S.estado.ficha = { proveedorId: 'pv1', unidadId: 'u-n', unica: { clienteId: 'c1', filas: JSON.parse(JSON.stringify(filas)) } }
  S.__setRespuesta((nombre, p) => responder(p.p_orden_id))
  pintar(S)
}
const lista = (S) => S.__els.get('ficha-cuenta-unica').hijos[0]
const filaDom = (S, orden, etiqueta = 'Venta') => lista(S).hijos.find(n => n.dataset?.ordenRetiro === orden && n.__etiqueta === etiqueta)
const panelDe = (S, orden) => lista(S).hijos.find(n => n.id === 'cc-n1n2-' + orden) ?? null
const texto = (html) => String(html ?? '').replace(/<\/(div|p)>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const tocar = (S, nodo) => S.alTocarVentaCC({ target: nodo })
const esperar = () => new Promise(r => setImmediate(r))

esperas.push((async () => {
  // ── El código del punto ──────────────────────────────────────────────────
  {
    const S = sandbox()
    chk('codigoPuntoCC: N-0042 → N1-0042', S.codigoPuntoCC('N-0042', 'A') === 'N1-0042')
    chk('codigoPuntoCC: N-0042 → N2-0042', S.codigoPuntoCC('N-0042', 'B') === 'N2-0042')
    chk('codigoPuntoCC: D-0045 → D2-0045', S.codigoPuntoCC('D-0045', 'B') === 'D2-0045')
    chk('codigoPuntoCC: sin guion, se pega al final', S.codigoPuntoCC('0042', 'A') === '0042-1')
    chk('codigoPuntoCC: sin código, "Punto 2"', S.codigoPuntoCC('', 'B') === 'Punto 2')
  }

  // ── Qué se sabe con lo que respondió la base ─────────────────────────────
  {
    const S = sandbox()
    const d = S.divisionDeRespuestaCC(DIVISION_42, null)
    chk('con división guardada: los tres importes y el código', d.tipo === 'division' && d.codigo === 'N-0042' && d.totalA === 1725430.48 && d.comision === 299454.88 && d.totalB === 2286939.17, JSON.stringify(d))
    chk('guardada = false (la orden no tiene division_pct_a): sin división', S.divisionDeRespuestaCC({ ...DIVISION_42, guardada: false }, null).tipo === 'sin_division')
    chk('"Este cliente no tiene condición de venta…": sin división', S.divisionDeRespuestaCC(null, { message: 'Este cliente no tiene condición de venta: poné el % de la parte A.', code: 'P0001' }).tipo === 'sin_division')
    chk('… también sin código de error', S.divisionDeRespuestaCC(null, { message: 'Este cliente no tiene condición de venta: poné el % de la parte A.' }).tipo === 'sin_division')
    chk('una orden entre empresas: sin división', S.divisionDeRespuestaCC(null, { message: 'Es una orden entre empresas del grupo: no se divide para facturar.', code: 'P0001' }).tipo === 'sin_division')
    chk('"No tenés permiso sobre esta orden.": sin permiso', S.divisionDeRespuestaCC(null, { message: 'No tenés permiso sobre esta orden.', code: 'P0001' }).tipo === 'sin_permiso')
    chk('permission denied (42501): sin permiso', S.divisionDeRespuestaCC(null, { message: 'permission denied for function datos_division_orden', code: '42501' }).tipo === 'sin_permiso')
    const red = S.divisionDeRespuestaCC(null, { message: 'TypeError: Failed to fetch' })
    chk('un corte de conexión es un error (no "sin división")', red.tipo === 'error' && red.mensaje === 'TypeError: Failed to fetch', JSON.stringify(red))
  }

  // ── Orden con división y comisión ────────────────────────────────────────
  {
    const S = sandbox()
    abrir(S)
    S.decorarVentasCC()
    chk('nada se lee hasta tocar la fila', S.__rpc.length === 0, JSON.stringify(S.__rpc))
    const v42 = filaDom(S, 'o42')
    chk('la fila de la Venta se puede tocar (clase, role="button", tabindex)', v42.classList.contains('cc-fila-venta') && v42.getAttribute('role') === 'button' && v42.getAttribute('tabindex') === '0')
    chk('… cerrada: aria-expanded="false" y aria-controls al panel', v42.getAttribute('aria-expanded') === 'false' && v42.getAttribute('aria-controls') === 'cc-n1n2-o42')
    const ver = v42.querySelector('.cc-fila-venta__ver')
    chk('… dice "Ver N1 / N2 ▾" adentro de lo que dice la fila', ver?.textContent === 'Ver N1 / N2 ▾' && ver.padre === v42.querySelector('.cu-fila__que'), ver?.textContent)
    const com = filaDom(S, 'o42', 'Comisión')
    chk('la corrección "Comisión" de la misma orden NO se decora', !com.classList.contains('cc-fila-venta') && com.getAttribute('role') === null && !com.querySelector('.cc-fila-venta__ver'))
    chk('una cobranza o una compra tampoco', lista(S).hijos.filter(n => !n.dataset.ordenRetiro).every(n => !n.classList.contains('cc-fila-venta')))
    S.decorarVentasCC()
    chk('decorar dos veces no duplica el "Ver N1 / N2"', v42.querySelectorAll('.cc-fila-venta__ver').length === 1)

    // Tocar (el toque cae en el chip, adentro de la fila).
    chk('tocar la fila de la Venta la atiende este módulo', tocar(S, v42.querySelector('.cu-chip--venta')) === true)
    chk('… y ya muestra "Leyendo N1 / N2…" con el total de la cuenta', /Leyendo N1 \/ N2…/.test(panelDe(S, 'o42')?.innerHTML ?? '') && texto(panelDe(S, 'o42')?.innerHTML).startsWith('Total: $ 4.012.369,65'), panelDe(S, 'o42')?.innerHTML)
    await esperar()
    chk('UNA llamada a datos_division_orden con la orden y lo demás en null', S.__rpc.length === 1 && S.__rpc[0].nombre === 'datos_division_orden' && JSON.stringify(S.__rpc[0].params) === JSON.stringify({ p_orden_id: 'o42', p_pct_a: null, p_comisiones: null }), JSON.stringify(S.__rpc))
    const p = panelDe(S, 'o42')
    chk('el panel va justo debajo de la fila', p && v42.nextElementSibling === p && p.classList.contains('cc-n1n2') && p.getAttribute('role') === 'region')
    chk('N1 con la comisión y cuánto, N2 y el total',
      texto(p?.innerHTML) === 'N1-0042: $ 1.725.430,48 (incluye comisión de vendedores $ 299.454,88) N2-0042: $ 2.286.939,17 Total: $ 4.012.369,65', texto(p?.innerHTML))
    chk('el total va en su renglón marcado', /class="cc-n1n2__linea cc-n1n2__linea--total"><span class="cc-n1n2__rotulo">Total:<\/span> <strong>\$ 4\.012\.369,65<\/strong>/.test(p?.innerHTML ?? ''))
    chk('sin "Sin división" ni aviso de diferencia (la cuenta dice lo mismo)', !/Sin división|figuran/.test(p?.innerHTML ?? ''))
    chk('abierta: aria-expanded="true" y "Ocultar N1 / N2 ▴"', v42.getAttribute('aria-expanded') === 'true' && v42.querySelector('.cc-fila-venta__ver').textContent === 'Ocultar N1 / N2 ▴')

    // Cerrar y volver a abrir: sin leer de nuevo.
    tocar(S, v42)
    await esperar()
    chk('tocar de nuevo la cierra (el panel se va)', panelDe(S, 'o42') === null && v42.getAttribute('aria-expanded') === 'false')
    tocar(S, v42)
    await esperar()
    chk('volver a abrirla NO vuelve a leer la base (una vez por orden)', S.__rpc.length === 1 && /N1-0042/.test(panelDe(S, 'o42')?.innerHTML ?? ''))

    // js/cuenta-unica.js repinta (el filtro, Compensar): sigue abierta.
    pintar(S)
    S.decorarVentasCC()
    chk('después de repintar, la venta abierta sigue abierta y sin otra lectura', /N2-0042/.test(panelDe(S, 'o42')?.innerHTML ?? '') && filaDom(S, 'o42').getAttribute('aria-expanded') === 'true' && S.__rpc.length === 1)
    chk('… con un solo panel', lista(S).hijos.filter(n => n.id === 'cc-n1n2-o42').length === 1)

    // La corrección "Comisión" no despliega; el panel no se toca a sí mismo.
    const antes = S.__rpc.length
    chk('tocar la corrección "Comisión" no la atiende este módulo', tocar(S, filaDom(S, 'o42', 'Comisión').querySelector('.cu-chip--comision')) === false)
    chk('tocar adentro del panel no lo cierra', tocar(S, panelDe(S, 'o42')) === false && panelDe(S, 'o42') !== null)
    await S.alternarVentaCC('o99')
    chk('una orden que no es una Venta de la cuenta no hace nada', S.__rpc.length === antes && !panelDe(S, 'o99'))
  }

  // ── Sin división, una parte en 0 y la condición del cliente sin guardar ──
  {
    const S = sandbox()
    abrir(S)
    S.decorarVentasCC()
    await S.alternarVentaCC('o43')
    chk('sin condición de venta: solo el total y "Sin división N1/N2"', texto(panelDe(S, 'o43')?.innerHTML) === 'Total: $ 500.000,00 Sin división N1/N2', texto(panelDe(S, 'o43')?.innerHTML))
    chk('… sin N1 ni N2 y sin rojo', !/N1-|N2-|error|alert/i.test(panelDe(S, 'o43')?.innerHTML ?? ''))
    await S.alternarVentaCC('o44')
    chk('100/0: solo N1 (con su comisión) y el total, sin N2',
      texto(panelDe(S, 'o44')?.innerHTML) === 'N1-0044: $ 120.000,00 (incluye comisión de vendedores $ 6.000,00) Total: $ 120.000,00', texto(panelDe(S, 'o44')?.innerHTML))
    await S.alternarVentaCC('o45')
    chk('guardada = false (sale de la condición del cliente, la orden no la tiene): sin división', texto(panelDe(S, 'o45')?.innerHTML) === 'Total: $ 90.000,00 Sin división N1/N2', texto(panelDe(S, 'o45')?.innerHTML))
    chk('cada orden se leyó una vez', S.__rpc.map(r => r.params.p_orden_id).join(',') === 'o43,o44,o45')
    chk('las tres abiertas a la vez, cada una con su panel', ['o43', 'o44', 'o45'].every(o => filaDom(S, o).nextElementSibling === panelDe(S, o)))
  }

  // 0/100: solo N2 (la comisión va sobre el N1, que es 0).
  {
    const S = sandbox()
    abrir(S)
    S.__setRespuesta(() => Promise.resolve({ data: { codigo: 'N-0042', total_a: 0, comision_total: 0, total_b: 4012369.65, guardada: true }, error: null }))
    S.decorarVentasCC()
    await S.alternarVentaCC('o42')
    chk('0/100: solo N2 y el total', texto(panelDe(S, 'o42')?.innerHTML) === 'N2-0042: $ 4.012.369,65 Total: $ 4.012.369,65', texto(panelDe(S, 'o42')?.innerHTML))
  }
  // Con división y SIN vendedores: el N1 no dice "incluye comisión".
  {
    const S = sandbox()
    abrir(S)
    S.__setRespuesta(() => Promise.resolve({ data: { codigo: 'N-0045', total_a: 36000, comision_total: 0, total_b: 54000, guardada: true }, error: null }))
    S.decorarVentasCC()
    await S.alternarVentaCC('o45')
    chk('sin comisión: N1 y N2 sin "(incluye comisión…)"', texto(panelDe(S, 'o45')?.innerHTML) === 'N1-0045: $ 36.000,00 N2-0045: $ 54.000,00 Total: $ 90.000,00', texto(panelDe(S, 'o45')?.innerHTML))
  }
  // La fila "Venta" de una orden, nunca su corrección "Comisión".
  {
    const S = sandbox()
    chk('filaVentaCC: con solo la corrección "Comisión" de la orden, no hay venta', S.filaVentaCC({ filas: [CUENTA[2]] }, 'o42') === null)
    chk('filaVentaCC: con las dos, la Venta', S.filaVentaCC({ filas: [CUENTA[2], CUENTA[1]] }, 'o42')?.etiqueta === 'Venta')
    chk('filaVentaCC: sin orden, nada', S.filaVentaCC({ filas: CUENTA }, null) === null && S.filaVentaCC({ filas: [{ ...CUENTA[1], orden_retiro_id: null }] }, undefined) === null)
  }

  // La cuenta dice otra cosa (una corrección posterior): se avisa, sin rojo.
  {
    const S = sandbox()
    const filas = JSON.parse(JSON.stringify(CUENTA))
    filas[1].te_debe = 4010869.65
    abrir(S, { filas })
    S.decorarVentasCC()
    await S.alternarVentaCC('o42')
    chk('si la línea de la cuenta no coincide con N1 + N2, lo dice', /En esta línea de la cuenta figuran \$ 4\.010\.869,65\. Las correcciones posteriores van en su propia línea\./.test(texto(panelDe(S, 'o42')?.innerHTML)), texto(panelDe(S, 'o42')?.innerHTML))
    chk('… y el total sigue siendo N1 + N2', /Total: \$ 4\.012\.369,65/.test(texto(panelDe(S, 'o42')?.innerHTML)))
  }

  // ── Sin retiros:precios: solo el total, sin llamar ────────────────────────
  {
    const S = sandbox()
    abrir(S, { tareas: ['cuentas_corrientes:ver_todo', 'retiros:ver'] })
    S.decorarVentasCC()
    chk('sin retiros:precios la fila igual se puede tocar', filaDom(S, 'o42').classList.contains('cc-fila-venta'))
    await S.alternarVentaCC('o42')
    chk('sin retiros:precios NO llama a la base', S.__rpc.length === 0, JSON.stringify(S.__rpc))
    chk('… y muestra solo el total, sin "Sin división" ni error', texto(panelDe(S, 'o42')?.innerHTML) === 'Total: $ 4.012.369,65', texto(panelDe(S, 'o42')?.innerHTML))
    chk('… tampoco "Leyendo"', !/Leyendo/.test(panelDe(S, 'o42')?.innerHTML ?? ''))
  }
  // super_admin pasa (tieneTarea con bypass, como la base).
  {
    const S = sandbox()
    abrir(S, { tareas: [] })
    S.estado.miRolApp = 'super_admin'
    S.decorarVentasCC()
    await S.alternarVentaCC('o42')
    chk('super_admin sin la fila de la tarea: lee (la base también lo deja)', S.__rpc.length === 1 && /N1-0042/.test(panelDe(S, 'o42')?.innerHTML ?? ''))
  }
  // La base lo rechaza por permiso (el alcance es de otra fábrica).
  {
    const S = sandbox()
    abrir(S)
    S.__setRespuesta(() => Promise.resolve({ data: null, error: { message: 'No tenés permiso sobre esta orden.', code: 'P0001' } }))
    S.decorarVentasCC()
    await S.alternarVentaCC('o42')
    chk('rechazo por permiso: solo el total, sin el mensaje ni rojo', texto(panelDe(S, 'o42')?.innerHTML) === 'Total: $ 4.012.369,65', texto(panelDe(S, 'o42')?.innerHTML))
    S.__setRespuesta(() => { throw new Error('no debería volver a preguntar') })
    await S.alternarVentaCC('o42'); await S.alternarVentaCC('o42')
    chk('… y queda guardado (no vuelve a preguntar)', S.__rpc.length === 1 && texto(panelDe(S, 'o42')?.innerHTML) === 'Total: $ 4.012.369,65')
  }

  // ── Un corte de conexión: se dice suave y se reintenta ───────────────────
  {
    const S = sandbox()
    abrir(S)
    S.__setRespuesta(() => Promise.reject(new Error('Failed to fetch')))
    S.decorarVentasCC()
    await S.alternarVentaCC('o42')
    const p = panelDe(S, 'o42')?.innerHTML ?? ''
    chk('sin conexión: el total y "No se pudo leer N1 / N2 (Failed to fetch)", en gris', /No se pudo leer N1 \/ N2 \(Failed to fetch\)\. Cerrá y volvé a tocar la fila para reintentar\./.test(texto(p)) && /class="cc-n1n2__suave"/.test(p) && texto(p).startsWith('Total: $ 4.012.369,65'), texto(p))
    S.__setRespuesta((n, prm) => responder(prm.p_orden_id))
    await S.alternarVentaCC('o42')
    await S.alternarVentaCC('o42')
    chk('cerrar y volver a tocar reintenta (el error no quedó guardado)', S.__rpc.length === 2 && /N1-0042/.test(panelDe(S, 'o42')?.innerHTML ?? ''), String(S.__rpc.length))
  }

  // ── Dos toques mientras lee: una sola lectura ────────────────────────────
  {
    const S = sandbox()
    abrir(S)
    let soltar
    S.__setRespuesta(() => new Promise(r => { soltar = () => r({ data: DIVISION_42, error: null }) }))
    S.decorarVentasCC()
    const a = S.alternarVentaCC('o42')
    await esperar()
    await S.alternarVentaCC('o42')        // la cierra
    const b = S.alternarVentaCC('o42')    // la abre otra vez, todavía leyendo
    await esperar()
    chk('abrir, cerrar y abrir mientras lee: UNA sola lectura', S.__rpc.length === 1)
    soltar()
    await b
    chk('… el segundo toque espera la MISMA lectura y, al llegar, se ve', /N2-0042/.test(panelDe(S, 'o42')?.innerHTML ?? ''), panelDe(S, 'o42')?.innerHTML)
    await a
  }

  // ── Otra ficha abierta mientras lee: no se pega en la nueva ──────────────
  {
    const S = sandbox()
    abrir(S)
    let soltar
    S.__setRespuesta(() => new Promise(r => { soltar = () => r({ data: DIVISION_42, error: null }) }))
    S.decorarVentasCC()
    const va = S.alternarVentaCC('o42')
    await esperar()
    abrir(S)
    soltar()
    await va
    chk('la ficha nueva no hereda la venta abierta de la vieja', panelDe(S, 'o42') === null && filaDom(S, 'o42').getAttribute('aria-expanded') !== 'true')
  }

  // ── Escape: el código de la orden y el mensaje de la base ────────────────
  {
    const S = sandbox()
    abrir(S)
    S.__setRespuesta(() => Promise.resolve({ data: { ...DIVISION_42, codigo: marca('codigo') + '-0042' }, error: null }))
    S.decorarVentasCC()
    await S.alternarVentaCC('o42')
    // codigoPuntoCC pega el 1 al primer guion (también al de la marca): se
    // mira que no quede ninguna etiqueta cruda y que el < llegue escapado.
    const conCodigo = panelDe(S, 'o42')?.innerHTML ?? ''
    chk('el desplegable con división: el código de la orden va escapado', !/<b data1?-xss/.test(conCodigo) && /&lt;b data1-xss=&quot;codigo&quot;&gt;/.test(conCodigo), conCodigo)
    const S2 = sandbox()
    abrir(S2)
    S2.__setRespuesta(() => Promise.reject(new Error(marca('mensaje'))))
    S2.decorarVentasCC()
    await S2.alternarVentaCC('o42')
    chequearMarcas(chk, 'el desplegable con el error', panelDe(S2, 'o42')?.innerHTML ?? '', ['mensaje'])
    // La moneda (texto de la base) también.
    const S3 = sandbox()
    const filas = JSON.parse(JSON.stringify(CUENTA))
    filas[1].moneda = marca('moneda')
    abrir(S3, { filas })
    S3.decorarVentasCC()
    await S3.alternarVentaCC('o42')
    chequearMarcas(chk, 'el desplegable con otra moneda', panelDe(S3, 'o42')?.innerHTML ?? '', ['moneda'])
  }

  // ── El contrato con js/cuenta-unica.js (cómo dibuja la fila) ─────────────
  {
    const S = sandbox()
    const venta = S.htmlFilaCu(CUENTA[1])
    const correccion = S.htmlFilaCu(CUENTA[2])
    chk('htmlFilaCu: la Venta es un div.cu-fila con data-orden-retiro', /^<div class="cu-fila" data-orden-retiro="o42">/.test(venta), venta.slice(0, 80))
    chk('… con el chip cu-chip--venta adentro de .cu-fila__que', /<div class="cu-fila__que"><span class="cu-chip cu-chip--venta">Venta<\/span>/.test(venta))
    chk('… la corrección lleva la misma orden pero el chip cu-chip--comision', /data-orden-retiro="o42"/.test(correccion) && /cu-chip cu-chip--comision/.test(correccion) && !/cu-chip--venta/.test(correccion))
    chk('… y en Cuentas corrientes (sin abrirOrden) la fila NO es un link', !/cu-fila--link|Ver la orden/.test(venta))
  }
})())

// ── El enlace de los eventos (la fila se arma en js/cuenta-unica.js) ───────
chk('pintarCuentaUnicaFicha decora las ventas después de pintar', /if \(ctx\) \{ el\.hidden = false; pintarCuentaUnica\(ctx\); decorarVentasCC\(\); return \}/.test(FUENTE))
chk('el click de la cuenta pasa primero por alTocarVentaCC', /unicaCC\.addEventListener\('click', \(ev\) => \{ if \(alTocarVentaCC\(ev\)\) return; const ctx = ctxCuentaUnicaCC\(\); if \(ctx\) alTocarCuentaUnica\(ev, ctx\) \}\)/.test(FUENTE))
chk('Enter y espacio abren la fila', /unicaCC\.addEventListener\('keydown', \(ev\) => \{\s*if \(ev\.key !== 'Enter' && ev\.key !== ' '\) return\s*if \(!ev\.target\?\.matches\?\.\('\.cu-fila\.cc-fila-venta'\)\) return\s*ev\.preventDefault\(\)\s*alternarVentaCC\(ev\.target\.dataset\.ordenRetiro\)/.test(FUENTE))
chk('cuando js/cuenta-unica.js repinta, se vuelve a decorar (MutationObserver)', /new MutationObserver\(\(\) => decorarVentasCC\(\)\)\.observe\(unicaCC, \{ childList: true \}\)/.test(FUENTE))
chk('la fila de la venta tiene su estilo (cursor y foco)', /\.cu-fila\.cc-fila-venta \{ cursor: pointer; \}/.test(FUENTE) && /\.cu-fila\.cc-fila-venta:focus-visible \{ outline: 2px solid/.test(FUENTE))
chk('js/cuenta-unica.js no se tocó para esto (lo decide Cuentas corrientes)', !/n1n2|N1 \/ N2|datos_division_orden/i.test(fs.readFileSync(path.join(RAIZ, 'js/cuenta-unica.js'), 'utf8')))

// ── Nada de lo que había se perdió (baseline FIJO e6e0c74, nunca HEAD) ────
{
  const BASE_COMMIT = 'e6e0c74'
  let antes = null
  if (process.env.ARCHIVO_BASE) antes = fs.readFileSync(process.env.ARCHIVO_BASE, 'utf8')
  else {
    try {
      antes = require('child_process').execFileSync('git', ['show', `${BASE_COMMIT}:modulos/cuentas-corrientes.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
    } catch { antes = null }
  }
  chk(`se pudo leer el baseline ${BASE_COMMIT}`, !!antes)
  if (antes) {
    const marcas = t => new Set([...t.matchAll(/\b(id="[a-z][\w-]*"|data-[a-z][\w-]*)/g)].map(m => m[1]))
    const ahora = marcas(FUENTE)
    const faltan = [...marcas(antes)].filter(m => !ahora.has(m))
    chk(`ningún id ni data-* de ${BASE_COMMIT} se perdió`, faltan.length === 0, faltan.join(', '))
    chk(`en ${BASE_COMMIT} la venta no desplegaba N1 / N2 (lo que este cambio agrega)`, !/decorarVentasCC|datos_division_orden/.test(antes))
  }
}

fin()
