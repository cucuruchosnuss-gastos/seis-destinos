// Recuento de modulos/stock.html, preparado para la carga inicial del 1/10:
//  1. El resumen previo al cierre arma la clave del saldo con la PRESENTACIÓN
//     (antes el .select() no traía contenido_por_bulto y la clave salía mal).
//  2. El botón "0" por renglón: solo en un recuento abierto, va por el mismo
//     camino que tipear un 0 (ponerNumero + anotarCantidad → sucio →
//     autoguardado) y el payload conserva la observación.
//  3. El aviso al agregar una presentación a un insumo que ya estaba sin
//     presentación.
//
// Se EJECUTA el código real: las funciones se extraen del <script> y corren
// contra un DOM falso y un supabase mockeado que RESPETA las columnas pedidas
// en el .select() (así, pedir de menos se nota en el resultado).
//
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/stock.html.

const path = require('path')
const { construirCon, scriptModulo } = require('./sandbox')
const { fuenteNumeros, inputFalso } = require('./numeros-comun')
const { extraerFn } = require('./extraer')
const { leer } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/stock.html')
leer(ARCHIVO)
const SCRIPT = scriptModulo(ARCHIVO)

let ok = 0
const fallas = []
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}` : ''))
}

const PRELUDIO = `
  ${fuenteNumeros()}
  var __inputFalso = ${inputFalso.toString()}
  var console = { log(){}, warn(){}, error(){} }
  var CSS = { escape: (s) => s }

  function elemento(id, extra = {}) {
    const el = __inputFalso('')
    Object.assign(el, {
      id, dataset: {}, hidden: false, disabled: false, innerHTML: '', textContent: '', style: {},
      classList: { add(){}, remove(){}, toggle(){}, contains(){ return false } },
      querySelectorAll: () => [], querySelector: () => null,
      focus() { document.activeElement = el },
      click() { el.dispatchEvent({ type: 'click' }) },
    }, extra)
    return el
  }
  var __els = new Map()
  // La lista del recuento: su innerHTML crea inputs, botones "0" y filas,
  // como el navegador.
  var __lista = elemento('rec-lista')
  __lista.inputs = []; __lista.ceros = []; __lista.filas = []
  Object.defineProperty(__lista, 'innerHTML', {
    get() { return this._html || '' },
    set(h) {
      this._html = h
      const s = String(h)
      this.inputs = [...s.matchAll(/class="rec-input"[\\s\\S]*?data-cantidad="([^"]+)"/g)].map(m => {
        const e = elemento('rec-input-' + m[1]); e.dataset = { cantidad: m[1] }; return e
      })
      this.ceros = [...s.matchAll(/<button type="button" class="rec-cero" data-cero="([^"]+)"([^>]*)>/g)].map(m => {
        const e = elemento('rec-cero-' + m[1]); e.dataset = { cero: m[1] }; e.disabled = /\\bdisabled\\b/.test(m[2]); return e
      })
      this.filas = [...s.matchAll(/data-item="([^"]+)"/g)].map(m => {
        const id = m[1]
        const partes = { '.rec-delta': elemento('d'), '.rec-error': elemento('e'), '.rec-fila__bultos': elemento('b') }
        return { id, classList: { toggle(){} }, querySelector: (sel) =>
          sel === '.rec-cero' ? (__lista.ceros.find(c => c.dataset.cero === id) ?? null) : (partes[sel] ?? null) }
      })
    },
  })
  __lista.querySelectorAll = (sel) =>
    sel === '[data-cantidad]' ? __lista.inputs : sel === '[data-cero]' ? __lista.ceros : []
  __els.set('rec-lista', __lista)
  var document = {
    activeElement: null,
    getElementById(id) { if (!__els.has(id)) __els.set(id, elemento(id)); return __els.get(id) },
    querySelectorAll: () => [],
    querySelector(sel) {
      let m = sel.match(/^#rec-lista \\[data-cantidad="([^"]+)"\\]$/)
      if (m) return __lista.inputs.find(i => i.dataset.cantidad === m[1]) ?? null
      m = sel.match(/^\\[data-item="([^"]+)"\\]$/)
      if (m) return __lista.filas.find(f => f.id === m[1]) ?? null
      return null
    },
  }

  var __llamadas = { rpc: [], selects: [], programados: 0, errores: [] }
  var __datos = {}
  // La tabla cuya consulta falla (para probar qué muestra la pantalla cuando
  // no se pudo leer). null = todo anda.
  var __errorTabla = null
  function __consulta(tabla) {
    let cols = null
    const q = {
      select: (c) => { cols = c; __llamadas.selects.push([tabla, c]); return q },
      eq: () => q, order: () => q,
      then: (r) => {
        if (__errorTabla === tabla) return r({ data: null, error: { message: 'sin señal' } })
        // Como PostgREST: devuelve SOLO las columnas pedidas.
        const lista = (__datos[tabla] ?? []).map(f => {
          if (!cols || cols === '*') return f
          const o = {}
          for (const k of cols.split(',').map(x => x.trim()).filter(x => !x.includes('('))) if (k in f) o[k] = f[k]
          for (const k of Object.keys(f)) if (typeof f[k] === 'object' && f[k] !== null && cols.includes(k + '(')) o[k] = f[k]
          return o
        })
        return r({ data: lista, error: null })
      },
    }
    return q
  }
  var supabase = { rpc: (n, p) => { __llamadas.rpc.push([n, p]); return Promise.resolve({ data: null, error: null }) }, from: (t) => __consulta(t) }
  function mostrarError(m) { __llamadas.errores.push(m) }
  function marcarError(id, m) { __llamadas.errores.push(id + ': ' + m) }
  function marcarGuardado(e) { estado.guardado = e }
  function programarGuardado() { __llamadas.programados++ }
  function actualizarContadorRec() {}
  function renderizarChipsFiltroRec() {}
  function renderizarClaseRecuento() {}
  function renderizarSugerenciasCatalogo() {}
  function limpiarErroresAgregar() {}
  function htmlAclaracion() { return '' }
  function presentacionesDelInsumoRec() { return [] }

  var estado = {
    itemsRec: [], saldos: new Map(), sucios: new Set(), guardando: false,
    recuento: { id: 'rec-1', estado: 'abierto', unidad_negocio_id: 'u-1' },
    filtroRec: 'todos', busquedaRec: '', insumoAgregar: null, presentacionAgregar: undefined, agregados: 0,
  }
`

const FUNCIONES = [
  'esc', 'normalizar', 'formatearCantidadStock', 'esUnidadEntera', 'decimalesCantidad', 'parsearCantidad',
  'ponerCantidadEnCampo', 'mensajeCantidadInvalida', 'equivalenteEnBultos', 'cabezaBultos', 'textoBultos',
  'textoPresentacion', 'claveSaldo', 'saldoDe', 'textoDelta', 'coincideItemRec', 'itemsRecVisibles',
  'renderizarItemsRecuento', 'refrescarFilaRec', 'anotarCantidad', 'ponerCeroRec', 'huellaItem',
  'guardarConteoAhora', 'abrirModalCerrar', 'cargarItemsRecuento', 'ordenarItemsRec',
  'contenidoAgregar', 'avisoRenglonSinPresentacion', 'confirmarAgregarItem',
]
const CONSTANTES = ['DECIMALES_CANTIDAD', 'UNIDADES_ENTERAS', 'FRACCIONES', 'TOPE_DIFS_RESUMEN']

const S = construirCon(ARCHIVO, {
  preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
  retorno: '__setDatos(d){ __datos = d }, __setErrorEn(t){ __errorTabla = t }, estado, __llamadas, document, __lista',
})
const el = (id) => S.document.getElementById(id)
const ultimaRpc = (n) => [...S.__llamadas.rpc].reverse().find(r => r[0] === n)?.[1]

function item(id, extra = {}) {
  return { id, insumo_id: 'ins-' + id, lote: null, contenido_por_bulto: null, cantidad_contada: null,
    observacion: '', errorCantidad: null, nombre: 'Insumo ' + id, marca: '', unidad_medida: 'kg',
    tipo: 'insumo', aclaracion: null, textoCantidad: null, ...extra }
}
const cero = (id) => S.__lista.ceros.find(c => c.dataset.cero === id)
const input = (id) => S.__lista.inputs.find(i => i.dataset.cantidad === id)

const pendientes = []

// ══════════════════════════════════════════════════════════════════════════
// 1. LA CLAVE DEL SALDO LLEVA LA PRESENTACIÓN
// ══════════════════════════════════════════════════════════════════════════
{
  // Todas las llamadas a claveSaldo del archivo pasan los TRES componentes.
  const llamadas = [...SCRIPT.matchAll(/claveSaldo\(([^)]*)\)/g)].map(m => m[1])
  const malas = llamadas.filter(a => a.split(',').length !== 3)
  chk('claveSaldo: todas sus llamadas pasan 3 componentes', llamadas.length >= 4 && malas.length === 0, malas)
  // Todo .select() de v_stock_por_lote que alimente claveSaldo trae contenido_por_bulto.
  const selects = [...SCRIPT.matchAll(/from\('v_stock_por_lote'\)\s*\.select\('([^']*)'\)/g)].map(m => m[1])
  chk('v_stock_por_lote: todo .select() trae contenido_por_bulto', selects.length >= 5 && selects.every(s => s.includes('contenido_por_bulto')), selects)
}

pendientes.push(async () => {
  // Dos presentaciones del MISMO lote: tacho de 25 y bidón de 5.
  S.estado.itemsRec = [
    item('a', { insumo_id: 'lec', lote: 'L1', contenido_por_bulto: 25, cantidad_contada: 250, nombre: 'Lecitina' }),
    item('b', { insumo_id: 'lec', lote: 'L1', contenido_por_bulto: 5, cantidad_contada: 10, nombre: 'Lecitina' }),
  ]
  S.estado.sucios = new Set()
  S.estado.saldos = new Map()
  S.__setDatos({ v_stock_por_lote: [
    { insumo_id: 'lec', lote: 'L1', contenido_por_bulto: 25, saldo: 250 },
    { insumo_id: 'lec', lote: 'L1', contenido_por_bulto: 5, saldo: 15 },
  ] })
  S.__llamadas.selects = []
  await S.abrirModalCerrar()
  const sel = S.__llamadas.selects.find(s => s[0] === 'v_stock_por_lote')?.[1] ?? ''
  chk('resumen: el .select() pide contenido_por_bulto', /contenido_por_bulto/.test(sel), sel)
  chk('resumen: dos presentaciones del mismo lote dan DOS saldos (no uno pisado)', S.estado.saldos.size === 2, [...S.estado.saldos])
  chk('resumen: el tacho de 25 encuentra su saldo (250)', S.saldoDe(S.estado.itemsRec[0]) === 250, S.saldoDe(S.estado.itemsRec[0]))
  chk('resumen: el bidón de 5 encuentra su saldo (15)', S.saldoDe(S.estado.itemsRec[1]) === 15, S.saldoDe(S.estado.itemsRec[1]))
  chk('resumen: una sola diferencia (el bidón, −5)', el('cierre-difs').textContent === 1, el('cierre-difs').textContent)
  chk('resumen: la diferencia listada es la del bidón', /−5 kg/.test(el('cierre-lista-difs').innerHTML) && !/250/.test(el('cierre-lista-difs').innerHTML), el('cierre-lista-difs').innerHTML)

  // La carga inicial de los ítems (cargarItemsRecuento) también, con el mismo criterio.
  S.__setDatos({
    stock_recuento_items: [
      { id: 'a', insumo_id: 'lec', lote: 'L1', contenido_por_bulto: 25, cantidad_contada: null, observacion: null, insumos: { nombre: 'Lecitina', marca: '', unidad_medida: 'kg', tipo: 'materia_prima', aclaracion: null } },
      { id: 'b', insumo_id: 'lec', lote: 'L1', contenido_por_bulto: 5, cantidad_contada: null, observacion: null, insumos: { nombre: 'Lecitina', marca: '', unidad_medida: 'kg', tipo: 'materia_prima', aclaracion: null } },
    ],
    v_stock_por_lote: [
      { insumo_id: 'lec', lote: 'L1', contenido_por_bulto: 25, saldo: 250 },
      { insumo_id: 'lec', lote: 'L1', contenido_por_bulto: 5, saldo: 15 },
    ],
  })
  await S.cargarItemsRecuento()
  chk('carga: los dos saldos distintos', S.estado.saldos.size === 2 &&
    S.saldoDe(S.estado.itemsRec.find(i => i.id === 'a')) === 250 && S.saldoDe(S.estado.itemsRec.find(i => i.id === 'b')) === 15, [...S.estado.saldos])
})

// ── 1b. Si la relectura del saldo FALLA, el resumen lo dice ───────────────
// El cierre real no corre riesgo (el servidor congela el saldo del momento):
// lo que estaría mal es lo que ve la persona justo cuando decide si cierra.
pendientes.push(async () => {
  S.estado.recuento = { id: 'rec-1', estado: 'abierto', unidad_negocio_id: 'u-1' }
  S.estado.sucios = new Set()
  S.estado.itemsRec = [item('a', { insumo_id: 'lec', lote: 'L1', contenido_por_bulto: 25, cantidad_contada: 250, nombre: 'Lecitina' })]
  S.estado.saldos = new Map([[S.claveSaldo('lec', 'L1', 25), 250]])

  // Primero el camino bueno: el aviso NO se muestra.
  S.__setErrorEn(null)
  S.__setDatos({ v_stock_por_lote: [{ insumo_id: 'lec', lote: 'L1', contenido_por_bulto: 25, saldo: 250 }] })
  await S.abrirModalCerrar()
  chk('relectura OK: el aviso de saldos viejos queda oculto', el('cierre-aviso-saldos').hidden === true)
  chk('relectura OK: sin diferencias', el('cierre-difs').textContent === 0, el('cierre-difs').textContent)

  // Ahora falla: el aviso aparece Y los saldos anteriores NO se pisan con un
  // Map vacío (que haría aparecer una diferencia de 250 kg que no existe).
  S.__setErrorEn('v_stock_por_lote')
  await S.abrirModalCerrar()
  chk('relectura fallida: el resumen avisa que el saldo puede estar viejo', el('cierre-aviso-saldos').hidden === false)
  chk('relectura fallida: no se pisan los saldos que ya había', S.estado.saldos.size === 1 && S.saldoDe(S.estado.itemsRec[0]) === 250, [...S.estado.saldos])
  chk('relectura fallida: no inventa una diferencia', el('cierre-difs').textContent === 0, el('cierre-difs').textContent)
  S.__setErrorEn(null)
})

// ══════════════════════════════════════════════════════════════════════════
// 2. EL BOTÓN "0"
// ══════════════════════════════════════════════════════════════════════════
pendientes.push(async () => {
  S.estado.saldos = new Map()
  S.estado.recuento = { id: 'rec-1', estado: 'abierto', unidad_negocio_id: 'u-1' }
  S.estado.itemsRec = [
    item('a', { nombre: 'Caja <b>N°1</b>', unidad_medida: 'un', observacion: 'rota' }),
    item('b', { nombre: 'Bolsa', unidad_medida: 'un' }),
    item('c', { nombre: 'Cinta', unidad_medida: 'un', cantidad_contada: 0 }),
    item('d', { nombre: 'Film', unidad_medida: 'kg', cantidad_contada: 3.5 }),
  ]
  S.estado.sucios = new Set()
  S.renderizarItemsRecuento()
  const html = S.__lista.innerHTML
  chk('abierto: un botón "0" por renglón', S.__lista.ceros.length === 4, S.__lista.ceros.length)
  chk('abierto: el aria-label nombra el insumo, escapado',
    /aria-label="No hay: poner 0 en Caja &lt;b&gt;N°1&lt;\/b&gt;"/.test(html) && !/<b>N°1/.test(html))
  chk('abierto: el renglón ya en 0 tiene el botón deshabilitado', cero('c').disabled === true && cero('b').disabled === false)
  chk('abierto: nada se precarga en 0 (sin contar sigue en el guion)', input('b').value === '' && S.estado.itemsRec[1].cantidad_contada === null)

  const orden = S.estado.itemsRec.map(i => i.id).join()
  S.__llamadas.programados = 0
  cero('a').click()
  const a = S.estado.itemsRec.find(i => i.id === 'a')
  chk('tocar "0": el campo queda "0"', input('a').value === '0', input('a').value)
  chk('tocar "0": el ítem queda contado en 0', a.cantidad_contada === 0, a.cantidad_contada)
  chk('tocar "0": el ítem queda sucio', S.estado.sucios.has('a'))
  chk('tocar "0": entra al autoguardado', S.__llamadas.programados === 1, S.__llamadas.programados)
  chk('tocar "0": marca "sin guardar"', S.estado.guardado === 'pendiente', S.estado.guardado)
  chk('tocar "0": el botón queda deshabilitado', cero('a').disabled === true)
  chk('tocar "0": la lista no se reordena', S.estado.itemsRec.map(i => i.id).join() === orden)
  chk('tocar "0": no toca los otros renglones', S.estado.itemsRec[1].cantidad_contada === null && !S.estado.sucios.has('b'))

  // Un renglón ya contado con otro número también se puede llevar a 0.
  cero('d').click()
  chk('tocar "0" sobre 3,5 kg lo deja en 0', S.estado.itemsRec.find(i => i.id === 'd').cantidad_contada === 0 && input('d').value === '0', input('d').value)

  S.__llamadas.rpc = []
  await S.guardarConteoAhora()
  const p = ultimaRpc('guardar_conteo')?.p_items ?? []
  const pa = p.find(x => x.item_id === 'a')
  chk('guardar_conteo: el 0 viaja como "0" (no como vacío)', pa?.cantidad_contada === '0', pa)
  chk('guardar_conteo: lleva la observación que ya tenía', pa?.observacion === 'rota', pa)
  chk('guardar_conteo: queda todo guardado', S.estado.sucios.size === 0 && S.estado.guardado === 'guardado', [...S.estado.sucios])

  // Cerrado y anulado: no hay botón.
  for (const est of ['cerrado', 'anulado']) {
    S.estado.recuento = { id: 'rec-1', estado: est, unidad_negocio_id: 'u-1' }
    S.renderizarItemsRecuento()
    chk(`${est}: no se dibuja el botón "0"`, S.__lista.ceros.length === 0 && !/data-cero/.test(S.__lista.innerHTML))
  }
  S.estado.recuento = { id: 'rec-1', estado: 'abierto', unidad_negocio_id: 'u-1' }
})

{
  // El historial tiene su propio render: el botón vive SOLO en el del recuento abierto.
  let resto = SCRIPT
  for (const f of ['renderizarItemsRecuento', 'refrescarFilaRec']) resto = resto.replace(extraerFn(SCRIPT, f), '')
  const sinComentarios = resto.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
  chk('historial: ningún otro render dibuja el botón "0"', !/data-cero|rec-cero/.test(sinComentarios))
}
{
  // 44px de alto táctil.
  const html = require('fs').readFileSync(ARCHIVO, 'utf8')
  const regla = html.match(/\.rec-cero \{[^}]*\}/)?.[0] ?? ''
  chk('CSS: .rec-cero mide al menos 44px de alto', /min-height:\s*2\.75rem/.test(regla), regla)
}

// ══════════════════════════════════════════════════════════════════════════
// 3. AVISO AL AGREGAR UNA PRESENTACIÓN A UN PRECARGADO
// ══════════════════════════════════════════════════════════════════════════
function filaServidor(id, contenido, cantidad) {
  return { id, insumo_id: 'caja', lote: null, contenido_por_bulto: contenido, cantidad_contada: cantidad, observacion: null,
    insumos: { nombre: 'Caja capelina', marca: '', unidad_medida: 'un', tipo: 'insumo', aclaracion: null } }
}
async function agregar(presentacion, filasDespues, antes) {
  S.estado.itemsRec = antes
  S.estado.agregados = 0
  S.estado.insumoAgregar = { id: 'caja', tipo: 'insumo', unidad_medida: 'un' }
  S.estado.presentacionAgregar = presentacion
  S.__setDatos({ stock_recuento_items: filasDespues, v_stock_por_lote: [] })
  await S.confirmarAgregarItem()
  return el('rec-agregados').textContent
}
pendientes.push(async () => {
  let t = await agregar(50, [filaServidor('pre', null, null), filaServidor('nuevo', 50, null)],
    [item('pre', { insumo_id: 'caja', nombre: 'Caja capelina', unidad_medida: 'un' })])
  chk('aviso: presentación nueva sobre un precargado sin contar avisa', /sin presentación/.test(t) && /en 0/.test(t), t)
  t = await agregar(50, [filaServidor('pre', null, 0), filaServidor('nuevo', 50, null)],
    [item('pre', { insumo_id: 'caja', nombre: 'Caja capelina', unidad_medida: 'un', cantidad_contada: 0 })])
  chk('aviso: si el renglón sin presentación ya está en 0, no avisa', !/sin presentación/.test(t), t)
  t = await agregar(50, [filaServidor('nuevo', 50, null)], [])
  chk('aviso: sin renglón sin presentación, no avisa', !/sin presentación/.test(t), t)
  t = await agregar(null, [filaServidor('otro', 25, null), filaServidor('nuevo', null, null)],
    [item('otro', { insumo_id: 'caja', contenido_por_bulto: 25, nombre: 'Caja capelina', unidad_medida: 'un' })])
  chk('aviso: agregar SIN presentación no avisa', !/sin presentación/.test(t), t)
})

;(async () => {
  for (const f of pendientes) await f()
  console.log(`${ok}/${ok + fallas.length}`)
  if (fallas.length) { console.log('FALLAS:\n  ' + fallas.join('\n  ')); process.exit(1) }
})()
