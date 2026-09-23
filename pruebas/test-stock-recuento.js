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
  __lista.inputs = []; __lista.ceros = []; __lista.filas = []; __lista.bultos = []; __lista.quitar = []
  Object.defineProperty(__lista, 'innerHTML', {
    get() { return this._html || '' },
    set(h) {
      this._html = h
      const s = String(h)
      this.inputs = [...s.matchAll(/class="rec-input"[\\s\\S]*?data-cantidad="([^"]+)"/g)].map(m => {
        const e = elemento('rec-input-' + m[1]); e.dataset = { cantidad: m[1] }; return e
      })
      this.bultos = [...s.matchAll(/class="rec-input rec-input--bultos"[\\s\\S]*?data-bultos="([^"]+)"/g)].map(m => {
        const e = elemento('rec-bultos-' + m[1]); e.dataset = { bultos: m[1] }; return e
      })
      this.quitar = [...s.matchAll(/class="rec-quitar" data-quitar="([^"]+)"/g)].map(m => {
        const e = elemento('rec-quitar-' + m[1]); e.dataset = { quitar: m[1] }; return e
      })
      this.ceros = [...s.matchAll(/<button type="button" class="rec-cero" data-cero="([^"]+)"([^>]*)>/g)].map(m => {
        const e = elemento('rec-cero-' + m[1]); e.dataset = { cero: m[1] }; e.disabled = /\\bdisabled\\b/.test(m[2]); return e
      })
      this.filas = [...s.matchAll(/data-item="([^"]+)"/g)].map(m => {
        const id = m[1]
        const partes = { '.rec-delta': elemento('d'), '.rec-error': elemento('e') }
        return { id, classList: { toggle(){} }, querySelector: (sel) =>
          sel === '.rec-cero' ? (__lista.ceros.find(c => c.dataset.cero === id) ?? null)
          : sel === '.rec-input--bultos' ? (__lista.bultos.find(b => b.dataset.bultos === id) ?? null)
          : (partes[sel] ?? null) }
      })
    },
  })
  __lista.querySelectorAll = (sel) =>
    sel === '[data-cantidad]' ? __lista.inputs : sel === '[data-cero]' ? __lista.ceros
    : sel === '[data-bultos]' ? __lista.bultos : sel === '[data-quitar]' ? __lista.quitar : []
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

  var __llamadas = { rpc: [], selects: [], programados: 0, errores: [], exitos: [] }
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
  // La RPC que falla (null = todas andan).
  var __errorRpc = null
  var supabase = {
    rpc: (n, p) => {
      __llamadas.rpc.push([n, p])
      return Promise.resolve({ data: null, error: __errorRpc === n ? { message: 'sin señal' } : null })
    },
    from: (t) => __consulta(t),
  }
  function mostrarError(m) { __llamadas.errores.push(m) }
  function mostrarExito(m) { __llamadas.exitos.push(m) }
  function marcarError(id, m) { __llamadas.errores.push(id + ': ' + m) }
  function marcarGuardado(e) { estado.guardado = e }
  function programarGuardado() { __llamadas.programados++ }
  function renderizarClaseRecuento() {}
  function renderizarSugerenciasCatalogo() {}
  function limpiarErroresAgregar() {}
  function htmlAclaracion() { return '' }
  function presentacionesDelInsumoRec() { return [] }

  var estado = {
    itemsRec: [], saldos: new Map(), sucios: new Set(), guardando: false,
    recuento: { id: 'rec-1', estado: 'abierto', unidad_negocio_id: 'u-1', abierto_en: '2026-10-01T12:00:00+00:00' },
    filtroRec: 'todos', busquedaRec: '', insumoAgregar: null, presentacionAgregar: undefined, agregados: 0,
    itemQuitar: null,
  }
`

const FUNCIONES = [
  'esc', 'normalizar', 'formatearCantidadStock', 'esUnidadEntera', 'decimalesCantidad', 'parsearCantidad',
  'ponerCantidadEnCampo', 'mensajeCantidadInvalida', 'equivalenteEnBultos', 'cabezaBultos', 'textoBultos',
  'textoPresentacion', 'claveSaldo', 'saldoDe', 'textoDelta', 'coincideItemRec', 'itemsRecVisibles',
  'renderizarItemsRecuento', 'refrescarFilaRec', 'anotarCantidad', 'ponerCeroRec', 'huellaItem',
  'guardarConteoAhora', 'abrirModalCerrar', 'cargarItemsRecuento', 'ordenarItemsRec',
  'contenidoAgregar', 'avisoRenglonSinPresentacion', 'confirmarAgregarItem',
  // Parte 2: contador, filtro, agrupado, "Actualizar" y contar en bultos.
  'actualizarContadorRec', 'renderizarChipsFiltroRec', 'agruparPorTipoYCategoria', 'htmlAgrupado',
  'baseDesdeBultosRec', 'bultosDeItem', 'anotarBultos', 'refrescarRecuento',
  // Parte 3: quitar un renglón agregado a mano.
  'esAgregadoAMano', 'abrirModalQuitar', 'cerrarModalQuitar', 'confirmarQuitarItem',
]
const CONSTANTES = ['DECIMALES_CANTIDAD', 'UNIDADES_ENTERAS', 'FRACCIONES', 'TOPE_DIFS_RESUMEN',
  'FILTROS_REC', 'DECIMALES_BULTOS', 'CATEGORIAS', 'SIN_CATEGORIA', 'ORDEN_TIPO', 'TIPOS', 'ordenDe', 'redondear6', 'parsearBultos']

const S = construirCon(ARCHIVO, {
  preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
  retorno: '__setDatos(d){ __datos = d }, __setErrorEn(t){ __errorTabla = t }, __setErrorRpc(n){ __errorRpc = n }, estado, __llamadas, document, __lista, FILTROS_REC, DECIMALES_BULTOS',
})
const el = (id) => S.document.getElementById(id)
const ultimaRpc = (n) => [...S.__llamadas.rpc].reverse().find(r => r[0] === n)?.[1]

function item(id, extra = {}) {
  return { id, insumo_id: 'ins-' + id, lote: null, contenido_por_bulto: null, cantidad_contada: null,
    observacion: '', errorCantidad: null, nombre: 'Insumo ' + id, marca: '', unidad_medida: 'kg',
    tipo: 'insumo', categoria: null, aclaracion: null, textoCantidad: null, textoEnBultos: null,
    agregadoAMano: false, ...extra }
}
const cero = (id) => S.__lista.ceros.find(c => c.dataset.cero === id)
const input = (id) => S.__lista.inputs.find(i => i.dataset.cantidad === id)
const bultos = (id) => S.__lista.bultos.find(b => b.dataset.bultos === id)

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

// ══════════════════════════════════════════════════════════════════════════
// 4. CONTADOR, FILTRO Y AGRUPADO POR CATEGORÍA  (Parte 2 b y c)
// ══════════════════════════════════════════════════════════════════════════
pendientes.push(async () => {
  S.estado.recuento = { id: 'rec-1', estado: 'abierto', unidad_negocio_id: 'u-1' }
  S.estado.saldos = new Map()
  S.estado.sucios = new Set()
  S.estado.filtroRec = 'todos'
  S.estado.busquedaRec = ''
  S.estado.itemsRec = [
    item('h1', { nombre: 'Harina 000', categoria: 'Harinas', tipo: 'materia_prima', cantidad_contada: 10 }),
    item('c1', { nombre: 'Caja N°1', categoria: 'Cajas', unidad_medida: 'un' }),
    item('c2', { nombre: 'Caja capelina', categoria: 'Cajas', unidad_medida: 'un', cantidad_contada: 5 }),
    item('x1', { nombre: 'Trapo <b>raro</b>', categoria: null, unidad_medida: 'un' }),
  ]
  S.renderizarItemsRecuento()
  const html = S.__lista.innerHTML

  chk('contador: dice cuántos se contaron, no cuántos faltan',
    el('rec-contador').textContent === 'Contados 2 de 4', el('rec-contador').textContent)
  S.estado.itemsRec.forEach(i => { if (i.cantidad_contada === null) i.cantidad_contada = 0 })
  S.actualizarContadorRec()
  chk('contador: con todo contado lo dice', /Todo contado/.test(el('rec-contador').textContent), el('rec-contador').textContent)
  S.estado.itemsRec[1].cantidad_contada = null
  S.estado.itemsRec[3].cantidad_contada = null
  S.actualizarContadorRec()
  chk('contador: vuelve a contar los que faltan', el('rec-contador').textContent === 'Contados 2 de 4', el('rec-contador').textContent)

  chk('filtro: el chip dice "Ver solo los que faltan"',
    S.FILTROS_REC.some(f => f.id === 'sin-contar' && f.label === 'Ver solo los que faltan'), S.FILTROS_REC)
  S.renderizarChipsFiltroRec()
  const chips = el('rec-chips-filtro').innerHTML
  chk('filtro: el chip se dibuja con su contador de los que faltan',
    /Ver solo los que faltan/.test(chips) && /chip-stock__contador">2</.test(chips), chips)

  chk('agrupado: encabezado de cada categoría', /grupo-cat__nombre">Harinas</.test(html) && /grupo-cat__nombre">Cajas</.test(html), html.slice(0, 400))
  chk('agrupado: "Sin categoría" para el que no tiene', /grupo-cat__nombre">Sin categoría</.test(html))
  chk('agrupado: Harinas antes que Cajas (orden del negocio, no alfabético)',
    html.indexOf('>Harinas<') !== -1 && html.indexOf('>Cajas<') !== -1 && html.indexOf('>Harinas<') < html.indexOf('>Cajas<'))
  chk('agrupado: "Sin categoría" siempre última',
    html.indexOf('>Sin categoría<') > html.indexOf('>Cajas<'))
  chk('agrupado: el contador de la categoría dice cuántas filas tiene', /grupo-cat__contador">2</.test(html), html)
  chk('agrupado: los 4 renglones siguen dibujándose con su campo y su botón',
    S.__lista.inputs.length === 4 && S.__lista.ceros.length === 4)
  chk('agrupado: el nombre de la categoría no puede inyectar (el del insumo tampoco)',
    !/<b>raro<\/b>/.test(html) && /Trapo &lt;b&gt;raro&lt;\/b&gt;/.test(html))

  // Con el filtro puesto, una categoría sin filas visibles no se dibuja.
  S.estado.filtroRec = 'sin-contar'
  S.renderizarItemsRecuento()
  const filtrado = S.__lista.innerHTML
  chk('agrupado: con el filtro puesto, la categoría sin filas visibles desaparece',
    !/>Harinas</.test(filtrado) && /Cajas/.test(filtrado), filtrado.slice(0, 300))
  chk('agrupado: y quedan solo los que faltan', S.__lista.inputs.length === 2, S.__lista.inputs.length)
  S.estado.filtroRec = 'todos'

  // LA CATEGORÍA TIENE QUE LLEGAR DESDE EL SERVIDOR, y el recuento es la única
  // pantalla que remapea la fila a un objeto propio: se puede caer en el
  // .select() o en el remapeo, y en los dos casos la lista se dibuja entera
  // bajo "Sin categoría" sin ningún error.
  S.estado.sucios = new Set()
  S.estado.itemsRec = []
  S.__setDatos({
    stock_recuento_items: [
      { id: 'h', insumo_id: 'ih', lote: null, contenido_por_bulto: null, cantidad_contada: null, observacion: null,
        insumos: { nombre: 'Harina 000', marca: '', unidad_medida: 'kg', tipo: 'materia_prima', categoria: 'Harinas', aclaracion: null } },
    ],
    v_stock_por_lote: [],
  })
  S.__llamadas.selects = []
  await S.cargarItemsRecuento()
  const sel = S.__llamadas.selects.find(s => s[0] === 'stock_recuento_items')?.[1] ?? ''
  chk('agrupado: el embed pide categoria', /insumos\([^)]*categoria/.test(sel), sel)
  chk('agrupado: la categoría sobrevive al remapeo', S.estado.itemsRec[0].categoria === 'Harinas', S.estado.itemsRec[0].categoria)
  S.renderizarItemsRecuento()
  chk('agrupado: y llega al encabezado', /grupo-cat__nombre">Harinas</.test(S.__lista.innerHTML))
})

// ══════════════════════════════════════════════════════════════════════════
// 5. "ACTUALIZAR"  (Parte 2 d)
// ══════════════════════════════════════════════════════════════════════════
function filaRec(id, extra = {}, insumo = {}) {
  return { id, insumo_id: 'ins-' + id, lote: null, contenido_por_bulto: null,
    cantidad_contada: null, observacion: null,
    insumos: { nombre: 'Insumo ' + id, marca: '', unidad_medida: 'kg', tipo: 'insumo', categoria: 'Cajas', aclaracion: null, ...insumo },
    ...extra }
}
pendientes.push(async () => {
  S.estado.recuento = { id: 'rec-1', estado: 'abierto', unidad_negocio_id: 'u-1' }
  S.estado.filtroRec = 'todos'
  S.estado.busquedaRec = ''
  S.estado.saldos = new Map()
  S.estado.sucios = new Set()
  S.__setErrorEn(null)

  // El otro contó el ítem "b" mientras yo tenía el mío a medio guardar.
  S.estado.itemsRec = [item('a', { cantidad_contada: 7, textoCantidad: '7' }), item('b')]
  S.estado.sucios.add('a')
  S.__setDatos({ stock_recuento_items: [filaRec('a'), filaRec('b', { cantidad_contada: 3 })], v_stock_por_lote: [] })
  S.__llamadas.rpc = []
  await S.refrescarRecuento()

  chk('actualizar: guarda lo propio ANTES de releer', (S.__llamadas.rpc[0] ?? [])[0] === 'guardar_conteo', S.__llamadas.rpc.map(r => r[0]))
  chk('actualizar: trae lo que cargó el otro', S.estado.itemsRec.find(i => i.id === 'b').cantidad_contada === 3)
  chk('actualizar: se guardó, así que "a" queda con lo que dice la base', S.estado.sucios.size === 0, [...S.estado.sucios])
  chk('actualizar: el botón queda usable', el('btn-refrescar-recuento').disabled === false)
  chk('actualizar: no avisa nada si entró todo', !S.__llamadas.errores.length, S.__llamadas.errores)

  // Ahora el guardado NO entra: lo tipeado NO se pierde y se avisa.
  S.__llamadas.errores = []
  S.estado.itemsRec = [item('a', { cantidad_contada: 99, observacion: 'contado a mano' }), item('b')]
  S.estado.sucios = new Set(['a'])
  S.estado.guardando = false
  S.__setErrorRpc('guardar_conteo')
  // La base dice que "a" está sin contar: es lo VIEJO, porque el guardado no entró.
  S.__setDatos({ stock_recuento_items: [filaRec('a'), filaRec('b', { cantidad_contada: 3 })], v_stock_por_lote: [] })
  await S.refrescarRecuento()
  const a = S.estado.itemsRec.find(i => i.id === 'a')
  chk('actualizar con el guardado caído: la fila sucia conserva lo contado acá',
    a.cantidad_contada === 99 && a.observacion === 'contado a mano', a)
  chk('actualizar con el guardado caído: la fila sigue sucia, así que se reintenta', S.estado.sucios.has('a'))
  chk('actualizar con el guardado caído: las filas limpias sí se releen',
    S.estado.itemsRec.find(i => i.id === 'b').cantidad_contada === 3)
  chk('actualizar con el guardado caído: se avisa que quedó algo sin guardar',
    S.__llamadas.errores.some(m => /sin guardar/.test(m)), S.__llamadas.errores)
  chk('actualizar con el guardado caído: el botón vuelve a quedar usable', el('btn-refrescar-recuento').disabled === false)
  S.__setErrorRpc(null)
})

// ══════════════════════════════════════════════════════════════════════════
// 6. CONTAR EN BULTOS  (Parte 2 e)
// ══════════════════════════════════════════════════════════════════════════
pendientes.push(async () => {
  S.estado.recuento = { id: 'rec-1', estado: 'abierto', unidad_negocio_id: 'u-1' }
  S.estado.filtroRec = 'todos'
  S.estado.busquedaRec = ''
  S.estado.saldos = new Map()
  S.estado.sucios = new Set()
  S.estado.itemsRec = [
    item('p', { nombre: 'Harina <b>000</b>', contenido_por_bulto: 25, unidad_medida: 'kg', categoria: 'Harinas' }),
    item('s', { nombre: 'Film', contenido_por_bulto: null, unidad_medida: 'kg', categoria: 'Paletizado' }),
  ]
  S.renderizarItemsRecuento()

  chk('bultos: solo el renglón con presentación tiene campo de bultos', S.__lista.bultos.length === 1 && bultos('p') && !bultos('s'))
  chk('bultos: la etiqueta dice de cuánto es el bulto', /bultos de 25 kg/.test(S.__lista.innerHTML))
  chk('bultos: el aria-label nombra el insumo, escapado',
    /aria-label="Bultos contados de Harina &lt;b&gt;000&lt;\/b&gt;"/.test(S.__lista.innerHTML) && !/<b>000/.test(S.__lista.innerHTML))
  chk('bultos: sin contar arranca en el guion, nunca en 0', bultos('p').value === '' && input('p').value === '')

  // Escribir en bultos escribe la cantidad base, y ESA es la que se guarda.
  S.__llamadas.programados = 0
  bultos('p').value = '3'
  S.anotarBultos('p', '3')
  const p = S.estado.itemsRec.find(i => i.id === 'p')
  chk('bultos: 3 bultos de 25 kg son 75 kg', p.cantidad_contada === 75, p.cantidad_contada)
  chk('bultos: la cantidad base queda escrita en su campo', input('p').value === '75', input('p').value)
  chk('bultos: marca sucio y entra al autoguardado', S.estado.sucios.has('p') && S.__llamadas.programados === 1)

  // Medio bulto: un bidón a medio usar es un caso real.
  bultos('p').value = '3,5'
  S.anotarBultos('p', '3,5')
  chk('bultos: medio bulto se puede contar', S.estado.itemsRec.find(i => i.id === 'p').cantidad_contada === 87.5, S.estado.itemsRec.find(i => i.id === 'p').cantidad_contada)

  // Y al revés: escribir la cantidad base actualiza el campo de bultos.
  S.anotarCantidad('p', '50')
  chk('bultos: escribir 50 kg deja el campo de bultos en 2', bultos('p').value === '2', bultos('p').value)
  S.anotarCantidad('p', '')
  chk('bultos: vaciar la cantidad vacía los bultos', bultos('p').value === '' && S.estado.itemsRec.find(i => i.id === 'p').cantidad_contada === null)

  // Vaciar los bultos des-cuenta el renglón (la misma regla que la cantidad).
  S.anotarBultos('p', '4')
  S.anotarBultos('p', '')
  chk('bultos: vaciarlos vuelve al guion', S.estado.itemsRec.find(i => i.id === 'p').cantidad_contada === null && input('p').value === '')

  // Un dedazo en bultos NO borra un conteo que ya estaba bien.
  S.anotarCantidad('p', '100')
  S.anotarBultos('p', '3 4')
  const p2 = S.estado.itemsRec.find(i => i.id === 'p')
  chk('bultos: lo ilegible se dice y no toca la cantidad', p2.cantidad_contada === 100 && /bultos/.test(p2.errorCantidad || ''), [p2.cantidad_contada, p2.errorCantidad])

  // El botón "0" también actualiza los bultos.
  S.anotarCantidad('p', '100')
  cero('p').click()
  chk('bultos: el botón "0" deja los bultos en 0', bultos('p').value === '0' && S.estado.itemsRec.find(i => i.id === 'p').cantidad_contada === 0, bultos('p').value)

  // Lo que se guarda sigue siendo la unidad base.
  S.estado.sucios = new Set(['p'])
  S.estado.guardando = false
  S.__llamadas.rpc = []
  S.anotarBultos('p', '2')
  await S.guardarConteoAhora()
  const pl = (ultimaRpc('guardar_conteo')?.p_items ?? []).find(x => x.item_id === 'p')
  chk('bultos: a la base viaja la unidad base (50), no los bultos (2)', pl?.cantidad_contada === '50', pl)

  // EL CAMPO QUE TIENE EL FOCO NO SE PISA: quien está tipeando "1," vería su
  // coma desaparecer en cuanto el otro campo se sincroniza.
  bultos('p').focus()
  bultos('p').value = '1,'
  S.anotarBultos('p', '1,')
  chk('bultos: el campo que se está tipeando conserva lo escrito', bultos('p').value === '1,', bultos('p').value)
  chk('bultos: y el de la cantidad sí se actualiza', input('p').value === '25', input('p').value)
  S.document.activeElement = null

  // El insumo que se cuenta por unidades enteras igual admite medio bulto: la
  // regla de "sin decimales" es de la CANTIDAD, no de los bultos.
  S.estado.itemsRec = [item('u', { nombre: 'Caja', contenido_por_bulto: 10, unidad_medida: 'un', categoria: 'Cajas' })]
  S.estado.sucios = new Set()
  S.renderizarItemsRecuento()
  S.anotarBultos('u', '2,5')
  const u = S.estado.itemsRec[0]
  chk('bultos: en un insumo por unidades, medio bulto se lee igual', u.cantidad_contada === 25, [u.cantidad_contada, u.errorCantidad])
})

// ══════════════════════════════════════════════════════════════════════════
// 7. AGREGAR UN ÍTEM NO PIERDE LO TIPEADO  (recarga la lista entera)
// ══════════════════════════════════════════════════════════════════════════
pendientes.push(async () => {
  S.estado.recuento = { id: 'rec-1', estado: 'abierto', unidad_negocio_id: 'u-1' }
  S.estado.filtroRec = 'todos'
  S.estado.busquedaRec = ''
  S.estado.saldos = new Map()
  S.estado.guardando = false
  S.__setErrorRpc(null)
  S.estado.itemsRec = [item('a', { insumo_id: 'caja', cantidad_contada: 12 })]
  S.estado.sucios = new Set(['a'])
  S.estado.insumoAgregar = { id: 'caja2', tipo: 'insumo', unidad_medida: 'un' }
  S.estado.presentacionAgregar = null
  S.estado.agregados = 0
  S.__setDatos({
    stock_recuento_items: [
      { id: 'a', insumo_id: 'caja', lote: null, contenido_por_bulto: null, cantidad_contada: 12, observacion: null,
        insumos: { nombre: 'Insumo a', marca: '', unidad_medida: 'kg', tipo: 'insumo', categoria: 'Cajas', aclaracion: null } },
      { id: 'n', insumo_id: 'caja2', lote: null, contenido_por_bulto: null, cantidad_contada: null, observacion: null,
        insumos: { nombre: 'Insumo n', marca: '', unidad_medida: 'un', tipo: 'insumo', categoria: 'Cajas', aclaracion: null } },
    ],
    v_stock_por_lote: [],
  })
  S.__llamadas.rpc = []
  await S.confirmarAgregarItem()
  const orden = S.__llamadas.rpc.map(r => r[0])
  chk('agregar: guarda lo tipeado ANTES de recargar la lista',
    orden.indexOf('guardar_conteo') > orden.indexOf('agregar_item_recuento') && orden.includes('guardar_conteo'), orden)
  chk('agregar: el ítem nuevo aparece', S.estado.itemsRec.some(i => i.id === 'n'))
  chk('agregar: lo que ya estaba contado no se pierde', S.estado.itemsRec.find(i => i.id === 'a').cantidad_contada === 12)
})

// ══════════════════════════════════════════════════════════════════════════
// 8. QUITAR UN RENGLÓN AGREGADO A MANO  (Parte 3)
// ══════════════════════════════════════════════════════════════════════════
const ABIERTO_EN = '2026-10-01T12:00:00+00:00'
const quitar = (id) => S.__lista.quitar.find(b => b.dataset.quitar === id)

pendientes.push(async () => {
  S.estado.recuento = { id: 'rec-1', estado: 'abierto', unidad_negocio_id: 'u-1', abierto_en: ABIERTO_EN }

  // Quién es "agregado a mano": created_at POSTERIOR a abierto_en. Los
  // precargados entran en la misma transacción que el recuento, así que su
  // created_at es exactamente igual.
  chk('agregado a mano: created_at igual a abierto_en es un precargado', S.esAgregadoAMano(ABIERTO_EN) === false)
  chk('agregado a mano: created_at posterior sí lo es', S.esAgregadoAMano('2026-10-01T12:00:01+00:00') === true)
  chk('agregado a mano: created_at anterior no lo es', S.esAgregadoAMano('2026-10-01T11:59:59+00:00') === false)
  chk('agregado a mano: sin created_at se responde que NO (un precargado no se quita)', S.esAgregadoAMano(null) === false)
  chk('agregado a mano: una fecha ilegible tampoco', S.esAgregadoAMano('cualquier cosa') === false)
  S.estado.recuento = { id: 'rec-1', estado: 'abierto', unidad_negocio_id: 'u-1' }
  chk('agregado a mano: sin abierto_en tampoco', S.esAgregadoAMano('2026-10-01T12:00:01+00:00') === false)

  // Y llega desde la base: el .select() lo pide y el remapeo lo calcula.
  S.estado.recuento = { id: 'rec-1', estado: 'abierto', unidad_negocio_id: 'u-1', abierto_en: ABIERTO_EN }
  S.estado.sucios = new Set()
  S.estado.itemsRec = []
  S.__setDatos({
    stock_recuento_items: [
      { id: 'pre', insumo_id: 'caja', lote: null, contenido_por_bulto: null, cantidad_contada: null, observacion: null,
        created_at: ABIERTO_EN,
        insumos: { nombre: 'Caja N°1', marca: '', unidad_medida: 'un', tipo: 'insumo', categoria: 'Cajas', aclaracion: null } },
      { id: 'man', insumo_id: 'har', lote: 'L-MAL', contenido_por_bulto: 25, cantidad_contada: 100, observacion: null,
        created_at: '2026-10-01T14:30:00+00:00',
        insumos: { nombre: 'Harina <b>000</b>', marca: 'Júpiter', unidad_medida: 'kg', tipo: 'materia_prima', categoria: 'Harinas', aclaracion: null } },
    ],
    v_stock_por_lote: [],
  })
  S.__llamadas.selects = []
  await S.cargarItemsRecuento()
  const selItems = S.__llamadas.selects.find(s => s[0] === 'stock_recuento_items')?.[1] ?? ''
  chk('quitar: el .select() pide created_at', /\bcreated_at\b/.test(selItems), selItems)
  chk('quitar: el precargado no queda marcado', S.estado.itemsRec.find(i => i.id === 'pre').agregadoAMano === false)
  chk('quitar: el agregado a mano sí', S.estado.itemsRec.find(i => i.id === 'man').agregadoAMano === true)

  S.renderizarItemsRecuento()
  chk('quitar: el botón está SOLO en el agregado a mano', S.__lista.quitar.length === 1 && !!quitar('man') && !quitar('pre'))
  chk('quitar: el aria-label nombra el insumo, escapado',
    /aria-label="Quitar del recuento Harina &lt;b&gt;000&lt;\/b&gt;"/.test(S.__lista.innerHTML) && !/<b>000/.test(S.__lista.innerHTML))

  // Con el recuento cerrado no hay botón, aunque el renglón sea agregado.
  S.estado.recuento = { id: 'rec-1', estado: 'cerrado', unidad_negocio_id: 'u-1', abierto_en: ABIERTO_EN }
  S.renderizarItemsRecuento()
  chk('quitar: en un recuento cerrado no se dibuja', S.__lista.quitar.length === 0)
  S.estado.recuento = { id: 'rec-1', estado: 'abierto', unidad_negocio_id: 'u-1', abierto_en: ABIERTO_EN }
  S.renderizarItemsRecuento()

  // El diálogo: propio, no confirm(), y nombra el renglón.
  quitar('man').click()
  chk('quitar: se abre el diálogo propio', el('modal-quitar-item').hidden === false)
  chk('quitar: el diálogo nombra el insumo (como TEXTO, no como HTML)',
    el('quitar-nombre').textContent === 'Harina <b>000</b>', el('quitar-nombre').textContent)
  chk('quitar: y dice marca, lote y presentación, que es lo que lo distingue',
    /Júpiter/.test(el('quitar-detalle').textContent) && /Lote L-MAL/.test(el('quitar-detalle').textContent) &&
    /bultos de 25 kg/.test(el('quitar-detalle').textContent), el('quitar-detalle').textContent)
  chk('quitar: avisa que lo contado se va con el renglón',
    el('quitar-contado').hidden === false && /100 kg/.test(el('quitar-contado').textContent), el('quitar-contado').textContent)

  // Confirmar: la RPC con su parámetro, y la lista se relee.
  S.__llamadas.rpc = []
  S.__llamadas.exitos = []
  S.estado.sucios = new Set(['man'])
  S.__setDatos({ stock_recuento_items: [
    { id: 'pre', insumo_id: 'caja', lote: null, contenido_por_bulto: null, cantidad_contada: null, observacion: null,
      created_at: ABIERTO_EN,
      insumos: { nombre: 'Caja N°1', marca: '', unidad_medida: 'un', tipo: 'insumo', categoria: 'Cajas', aclaracion: null } },
  ], v_stock_por_lote: [] })
  await S.confirmarQuitarItem()
  chk('quitar: llama a quitar_item_recuento con p_item_id', JSON.stringify(ultimaRpc('quitar_item_recuento')) === '{"p_item_id":"man"}', ultimaRpc('quitar_item_recuento'))
  chk('quitar: el renglón desaparece de la lista', !S.estado.itemsRec.some(i => i.id === 'man'))
  chk('quitar: sale del set de sucios (si no, el autoguardado mandaría un id que ya no existe)', !S.estado.sucios.has('man'))
  chk('quitar: se cierra el diálogo', el('modal-quitar-item').hidden === true && S.estado.itemQuitar === null)
  chk('quitar: lo dice', S.__llamadas.exitos.length === 1, S.__llamadas.exitos)

  // El recuento ya no está abierto: la RPC rechaza y su mensaje se muestra TAL
  // CUAL, que es lo que dice qué pasó.
  S.estado.itemQuitar = 'man'
  el('modal-quitar-item').hidden = false   // el diálogo está abierto
  S.__llamadas.errores = []
  S.__setErrorRpc('quitar_item_recuento')
  await S.confirmarQuitarItem()
  chk('quitar: si la RPC rechaza, se muestra su mensaje', S.__llamadas.errores.some(m => /sin señal/.test(m)), S.__llamadas.errores)
  chk('quitar: y el diálogo NO se cierra (el renglón sigue estando)', el('modal-quitar-item').hidden === false)
  chk('quitar: el botón de confirmar vuelve a quedar usable', el('btn-confirmar-quitar').disabled === false)
  S.__setErrorRpc(null)
  S.cerrarModalQuitar()
})

;(async () => {
  for (const f of pendientes) await f()
  console.log(`${ok}/${ok + fallas.length}`)
  if (fallas.length) { console.log('FALLAS:\n  ' + fallas.join('\n  ')); process.exit(1) }
})()
