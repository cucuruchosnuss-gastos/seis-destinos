// CUENTAS CORRIENTES: CLIENTE Y PROVEEDOR (06/10/2026).
//
// Pedido de Facu, del lado del proveedor (modulos/cuentas-corrientes.html):
//  - En la ficha del proveedor, "Clasificación": Proveedor / Cliente y
//    proveedor. Pasar a "Cliente y proveedor" llama a vincular_proveedor_cliente
//    (con la empresa: la cuenta del cliente es por empresa) y avisa si se creó
//    el cliente; volver atrás llama a desvincular_cliente_proveedor con una
//    confirmación propia.
//  - En las listas (Proveedores y el padrón), el chip "Cliente y proveedor".
//  - Con una unidad elegida, la cuenta de las dos cosas juntas
//    (cuenta_unificada, la MISMA de Administración: js/cuenta-unica.js).
//  - Saberlo depende de poder leer los clientes (su policy): sin eso se dice.
// Se EJECUTAN las funciones reales con un document y una base falsos.
//
//   node pruebas/test-cuentas-corrientes-cuenta-unica.js
'use strict'

const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')
const { FUNCIONES_CP_CC, CONSTANTES_CP_CC } = require('./cuenta-unica-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cuentas-corrientes.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { log(){}, warn(){}, error(){} }
  function nuevoEl(id) {
    return { id, value: '', innerHTML: '', textContent: '', hidden: false, disabled: false, style: {}, dataset: {},
      setAttribute() {}, getAttribute: () => null, querySelector: () => null, querySelectorAll: () => [],
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {} }
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: () => null,
  }
  var location = { pathname: '/modulos/cuentas-corrientes.html', search: '', href: 'https://x.test/modulos/cuentas-corrientes.html' }
  var history = { replaceState() {}, pushState() {} }
  var window = {}
  // La base falsa: las tablas en __datos, las rpc en __rpc (función), y todo
  // lo que se pide queda en __consultas / __llamadas.
  var __datos = {}, __consultas = [], __llamadas = [], __espera = null
  var __rpc = async () => ({ data: null, error: null })
  function __consulta(tabla) {
    const filtros = [], registro = { tabla, select: null, eq: [], not: [] }
    __consultas.push(registro)
    let uno = false
    const q = {
      select(c) { registro.select = c; return q }, order: () => q, limit: () => q,
      maybeSingle() { uno = true; return q },
      eq(c, v) { registro.eq.push([c, v]); filtros.push(r => r[c] === v); return q },
      not(c, op, v) { registro.not.push([c, op, v]); return q },
      in(c, vs) { filtros.push(r => vs.includes(r[c])); return q },
      then(res, rej) {
        const t = __datos[tabla]
        if (typeof t === 'string') return Promise.resolve({ data: null, error: { message: t } }).then(res, rej)
        const filas = (t ?? []).filter(r => filtros.every(f => f(r)))
        return Promise.resolve({ data: uno ? (filas[0] ?? null) : filas, error: null }).then(res, rej)
      },
    }
    return q
  }
  var supabase = {
    from: (t) => __consulta(t),
    rpc: async (n, p) => { __llamadas.push([n, JSON.parse(JSON.stringify(p))]); if (__espera) await __espera; return __rpc(n, p) },
  }
  var __errores = [], __exitos = []
  function mostrarError(m) { __errores.push(m) } function mostrarExito(m) { __exitos.push(m) }
  function formatearFecha(f) { if (!f) return '—'; const [a, m, d] = String(f).split('-'); return d + '/' + m + '/' + a }
  function hoyCC() { return '2026-10-06' }
  async function cargarFichaSaldos() {} async function cargarFichaMovimientos() {} async function cargarFichaCreditos() {}
  function renderizarFichaBanner() {} function cargarSaldos() {}
  function abrirModalEditarProveedor() {} function abrirFichaDesdePadron() {} function abrirModalSaldoInicial() {} function abrirFicha() {}
  var estado = {
    miRolApp: 'usuario', miEmpleadoId: 'yo',
    misTareas: new Set(['cuentas_corrientes:ver_todo', 'cuentas_corrientes:registrar_pago', 'cuentas_corrientes:alta_proveedor', 'retiros:ver', 'cobranzas:procesar']),
    unidadElegida: null, fabrica: FABRICA_SIN_DATOS,
    maestros: {
      unidades: [{ id: 'u-n', nombre: 'Cucuruchos Nuss' }, { id: 'u-d', nombre: 'Dolce Pasta' }, { id: 'u-p', nombre: 'Pruebas (robot)' }],
      proveedores: [{ id: 'pv1', razon_social: 'ANATOLIA SRL', cuit: '30712345678', direccion: null }, { id: 'pv2', razon_social: 'FERPLAST S.R.L.', cuit: null, direccion: null }],
    },
    filtros: { proveedores: { busqueda: '' }, padron: { busqueda: '' } },
    padronSaldos: new Map(), padronSaldosCrudos: [], saldosCrudos: [], sinImporte: [], listaSaldos: [],
    clientesProveedor: new Map(), ficha: null,
  }
`
const FUNCIONES = [
  'esc', 'formatearImporte', 'importeHtml', 'tieneTarea', 'nombreUnidad', 'etiquetaUnidad', 'veUnidad', 'pasaFiltroUnidad', 'unidadesParaElegir',
  'inicialesEmpresa', 'colorAvatar', 'contarSinImporte', 'contarSinImporteVisible', 'htmlSinImporte', 'puedeCargarSaldoInicial',
  'agruparSaldosPorProveedorUnidad', 'armarListaSaldos', 'renderizarListaSaldos', 'renderizarResumenCC', 'htmlDesgloseResumen',
  'armarPadronSaldos', 'filtrarPadron', 'renderizarPadron', 'formatearImporteCentavosSuaves', 'etiquetaPagoDeGasto',
  ...FUNCIONES_CP_CC,
]
const CONSTANTES = ['PALETA_AVATAR', ...CONSTANTES_CP_CC]

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __consultas, __llamadas, __errores, __exitos, __datos,
      __setRpc(f){ __rpc = f }, __esperar(p){ __espera = p }, __el(id){ return document.getElementById(id) }`,
  })
}
const tieneFlags = (S, tareas) => { S.estado.misTareas = new Set(tareas) }
const VINCULADO = [{ id: 'c1', nombre: 'Distribuidora Anatolia', unidad_negocio_id: 'u-n', proveedor_id: 'pv1' }]

// ═══ Permisos ══════════════════════════════════════════════════════════════
{
  const S = sandbox()
  chk('leer clientes: con retiros:ver', S.puedeLeerClientesCC() === true)
  for (const t of ['retiros:cargar', 'pedidos:ver', 'pedidos:cargar']) { tieneFlags(S, [t]); chk(`leer clientes: con ${t}`, S.puedeLeerClientesCC() === true) }
  tieneFlags(S, ['cuentas_corrientes:ver_todo'])
  chk('leer clientes: sin ninguna, no', S.puedeLeerClientesCC() === false)
  for (const t of ['cuentas_corrientes:alta_proveedor', 'retiros:precios', 'pedidos:configurar']) { tieneFlags(S, [t]); chk(`clasificar: con ${t} (la regla de _puede_gestionar_cliente)`, S.puedeClasificarCC() === true) }
  tieneFlags(S, ['cuentas_corrientes:registrar_pago'])
  chk('clasificar: con registrar_pago solo, no', S.puedeClasificarCC() === false)
  chk('compensar: con registrar_pago solo, no', S.puedeCompensarCC() === false)
  tieneFlags(S, ['cobranzas:procesar'])
  chk('compensar: con procesar solo, no', S.puedeCompensarCC() === false)
  tieneFlags(S, ['cobranzas:procesar', 'cuentas_corrientes:registrar_pago'])
  chk('compensar: con las dos, sí', S.puedeCompensarCC() === true)
  chk('las tareas que se leen suman pedidos', /'retiros', 'cobranzas', 'pedidos'\]\)/.test(FUENTE))
}

// ═══ El chip de las listas ═════════════════════════════════════════════════
esperas.push((async () => {
  const S = sandbox()
  S.__datos.clientes = [
    { proveedor_id: 'pv1', unidad_negocio_id: 'u-n' }, { proveedor_id: null, unidad_negocio_id: 'u-n' },
  ]
  await S.cargarClientesProveedores()
  const c = S.__consultas.find(x => x.tabla === 'clientes')
  chk('chip: lee los clientes con proveedor', c && c.select === 'proveedor_id, unidad_negocio_id' && JSON.stringify(c.not) === JSON.stringify([['proveedor_id', 'is', null]]))
  chk('chip: un cliente sin proveedor no cuenta (aunque la consulta lo trajera)', S.estado.clientesProveedor.size === 1 && S.esClienteYProveedor('pv1') && !S.esClienteYProveedor('pv2'))
  chk('chip: por empresa', S.esClienteYProveedor('pv1', 'u-n') === true && S.esClienteYProveedor('pv1', 'u-d') === false)
  S.estado.saldosCrudos = [
    { proveedor_id: 'pv1', unidad_negocio_id: 'u-n', moneda: 'ARS', deuda_pendiente: 100, credito_disponible: 0 },
    { proveedor_id: 'pv1', unidad_negocio_id: 'u-d', moneda: 'ARS', deuda_pendiente: 50, credito_disponible: 0 },
    { proveedor_id: 'pv2', unidad_negocio_id: 'u-n', moneda: 'ARS', deuda_pendiente: 70, credito_disponible: 0 },
  ]
  S.armarListaSaldos()
  const lista = S.__el('lista-proveedores').innerHTML
  const tarjetas = lista.split('class="tarjeta-lista"').slice(1)
  const de = (prov, u) => tarjetas.find(t => t.includes(`data-proveedor="${prov}" data-unidad="${u}"`)) ?? ''
  chk('lista: el chip en el proveedor que es cliente en ESA empresa', /chip-cliente-proveedor">Cliente y proveedor</.test(de('pv1', 'u-n')))
  chk('lista: no en la otra empresa ni en otro proveedor', !/chip-cliente-proveedor/.test(de('pv1', 'u-d')) && !/chip-cliente-proveedor/.test(de('pv2', 'u-n')))
  S.estado.padronSaldosCrudos = []
  S.armarPadronSaldos()
  S.renderizarPadron()
  const padron = S.__el('lista-padron').innerHTML
  chk('padrón: el chip una vez, en ANATOLIA', (padron.match(/chip-cliente-proveedor/g) || []).length === 1 && padron.indexOf('chip-cliente-proveedor') < padron.indexOf('FERPLAST'))
  S.estado.unidadElegida = 'u-d'
  S.renderizarPadron()
  chk('padrón: con otra empresa en la barra, sin chip', !/chip-cliente-proveedor/.test(S.__el('lista-padron').innerHTML))
})())
esperas.push((async () => {
  const S = sandbox()
  tieneFlags(S, ['cuentas_corrientes:ver_todo'])
  await S.cargarClientesProveedores()
  chk('chip: sin permiso para leer clientes no se consulta (y no hay chips)', !S.__consultas.some(x => x.tabla === 'clientes') && S.estado.clientesProveedor.size === 0)
  const S2 = sandbox()
  S2.__datos.clientes = 'permiso denegado'
  await S2.cargarClientesProveedores()
  chk('chip: si la lectura falla, ningún chip (no se rompe)', S2.estado.clientesProveedor.size === 0)
})())

// ═══ La clasificación en la ficha ══════════════════════════════════════════
function ficha(S, { unidadId = 'u-n', vinculos = [] } = {}) {
  S.estado.ficha = { proveedorId: 'pv1', unidadId, nombre: 'ANATOLIA SRL', vinculos, panelVinculo: null, unica: null }
  return S.estado.ficha
}
esperas.push((async () => {
  const S = sandbox()
  const f = ficha(S, { vinculos: null })
  S.__datos.clientes = [...VINCULADO, { id: 'c9', nombre: 'Otro', unidad_negocio_id: 'u-n', proveedor_id: 'pv2' }]
  await S.cargarVinculosFicha()
  const c = S.__consultas.find(x => x.tabla === 'clientes')
  chk('vínculos: lee los clientes de ESTE proveedor', c && JSON.stringify(c.eq) === JSON.stringify([['proveedor_id', 'pv1']]))
  chk('vínculos: la lista', Array.isArray(f.vinculos) && f.vinculos.map(v => v.id).join() === 'c1')
  const S2 = sandbox()
  tieneFlags(S2, ['cuentas_corrientes:ver_todo'])
  const f2 = ficha(S2, { vinculos: null })
  await S2.cargarVinculosFicha()
  chk('vínculos: sin permiso, "no se sabe" (false) y no consulta', f2.vinculos === false && !S2.__consultas.length)
  S2.renderizarClasificacionProveedor()
  chk('vínculos: sin permiso lo DICE (nunca "no es cliente")', /no se puede ver si también es cliente/.test(S2.__el('ficha-clasificacion').innerHTML) && !/data-clasificacion/.test(S2.__el('ficha-clasificacion').innerHTML))
  const S3 = sandbox()
  S3.__datos.clientes = 'error'
  const f3 = ficha(S3, { vinculos: null })
  await S3.cargarVinculosFicha()
  chk('vínculos: si falla, "no se sabe"', f3.vinculos === false)
})())

{
  const S = sandbox()
  ficha(S, { vinculos: [] })
  S.renderizarClasificacionProveedor()
  let h = S.__el('ficha-clasificacion').innerHTML
  chk('clasificación: solo proveedor → "Proveedor" elegido', /data-clasificacion="proveedor" aria-pressed="true"/.test(h))
  chk('clasificación: "Cliente" solo, apagado', /data-clasificacion="cliente" aria-pressed="false" disabled/.test(h))
  ficha(S, { vinculos: VINCULADO })
  S.renderizarClasificacionProveedor()
  h = S.__el('ficha-clasificacion').innerHTML
  chk('clasificación: vinculado en esta empresa → "Cliente y proveedor"', /data-clasificacion="ambos" aria-pressed="true"/.test(h))
  chk('clasificación: dice dónde es cliente', /También es cliente en Cucuruchos Nuss \(Distribuidora Anatolia\)\./.test(h))
  ficha(S, { unidadId: 'u-d', vinculos: VINCULADO })
  S.renderizarClasificacionProveedor()
  chk('clasificación: mirando OTRA empresa, es solo proveedor ahí', /data-clasificacion="proveedor" aria-pressed="true"/.test(S.__el('ficha-clasificacion').innerHTML))
  ficha(S, { unidadId: null, vinculos: VINCULADO })
  S.renderizarClasificacionProveedor()
  chk('clasificación: en todas las unidades, "Cliente y proveedor" si lo es en alguna', /data-clasificacion="ambos" aria-pressed="true"/.test(S.__el('ficha-clasificacion').innerHTML))
  tieneFlags(S, ['cuentas_corrientes:ver_todo', 'retiros:ver'])
  ficha(S, { vinculos: [] })
  S.renderizarClasificacionProveedor()
  h = S.__el('ficha-clasificacion').innerHTML
  chk('clasificación: sin permiso para cambiarla, apagada y dice por qué', (h.match(/disabled/g) || []).length === 3 && /Para cambiarla hace falta permiso/.test(h))
  S.elegirClasificacionCC('ambos')
  chk('clasificación: sin permiso no abre nada', S.estado.ficha.panelVinculo === null)
  // XSS
  tieneFlags(S, ['cuentas_corrientes:alta_proveedor', 'retiros:ver'])
  S.estado.maestros.unidades = [{ id: 'u-x', nombre: marca('unidad') }, { id: 'u-y', nombre: marca('otra-unidad') }]
  const fx = ficha(S, { unidadId: 'u-x', vinculos: [{ id: 'cx', nombre: marca('cliente'), unidad_negocio_id: 'u-x', proveedor_id: 'pv1' }] })
  S.renderizarClasificacionProveedor()
  chequearMarcas(chk, 'htmlClasificacionCC (vinculado)', S.__el('ficha-clasificacion').innerHTML, ['unidad', 'cliente'])
  fx.panelVinculo = { tipo: 'desvincular', clienteId: 'cx', error: marca('error'), enviando: false }
  chequearMarcas(chk, 'htmlClasificacionCC (separar)', S.htmlClasificacionCC(fx), ['unidad', 'cliente', 'error'])
  fx.vinculos = []
  fx.unidadId = null
  fx.panelVinculo = { tipo: 'vincular', unidadId: null, error: null, enviando: false }
  chequearMarcas(chk, 'htmlClasificacionCC (elegir empresa)', S.htmlClasificacionCC(fx), ['unidad', 'otra-unidad'])
  S.estado.maestros.unidades.push({ id: marca('id-unidad'), nombre: 'Rara' })
  chequearMarcas(chk, 'htmlClasificacionCC (el id de una empresa)', S.htmlClasificacionCC(fx), ['id-unidad'])
  fx.vinculos = [{ id: marca('id-cliente'), nombre: 'A', unidad_negocio_id: 'u-x', proveedor_id: 'pv1' }, { id: 'cz', nombre: 'B', unidad_negocio_id: 'u-y', proveedor_id: 'pv1' }]
  fx.panelVinculo = { tipo: 'desvincular', clienteId: null, error: null, enviando: false }
  chequearMarcas(chk, 'htmlClasificacionCC (elegir cuál separar)', S.htmlClasificacionCC(fx), ['id-cliente', 'unidad', 'otra-unidad'])
  fx.panelVinculo = { tipo: 'vincular', unidadId: 'u-x', error: marca('error2'), enviando: false }
  chequearMarcas(chk, 'htmlClasificacionCC (vincular)', S.htmlClasificacionCC(fx), ['unidad', 'error2'])
  fx.panelVinculo = null
  fx.vinculos = [{ id: 'cx', nombre: marca('cliente-nota'), unidad_negocio_id: 'u-x', proveedor_id: 'pv1' }]
  S.pintarCuentaUnicaFicha()
  chequearMarcas(chk, 'pintarCuentaUnicaFicha (la nota de todas las unidades)', S.__el('ficha-cuenta-unica').innerHTML, ['unidad', 'cliente-nota'])
}

// Vincular con una empresa elegida.
esperas.push((async () => {
  const S = sandbox()
  const f = ficha(S, { vinculos: [] })
  S.__datos.clientes = [{ id: 'c-viejo', nombre: 'Viejo', unidad_negocio_id: 'u-n', proveedor_id: null }]
  S.elegirClasificacionCC('ambos')
  chk('vincular: abre el panel con la empresa de la ficha', f.panelVinculo?.tipo === 'vincular' && f.panelVinculo.unidadId === 'u-n')
  S.renderizarClasificacionProveedor()
  chk('vincular: explica que busca o crea en esa empresa', /Se busca en Cucuruchos Nuss el cliente con su mismo CUIT o nombre; si no hay, se crea/.test(S.__el('ficha-clasificacion').innerHTML) && /id="btn-vincular-cliente"/.test(S.__el('ficha-clasificacion').innerHTML))
  let soltar
  S.__esperar(new Promise(r => { soltar = r }))
  S.__setRpc(async (n) => {
    if (n === 'vincular_proveedor_cliente') { S.__datos.clientes = [...S.__datos.clientes, { id: 'c-nuevo', nombre: 'ANATOLIA', unidad_negocio_id: 'u-n', proveedor_id: 'pv1' }]; return { data: 'c-nuevo', error: null } }
    return { data: [], error: null }
  })
  const uno = S.confirmarVincularCC()
  const dos = S.confirmarVincularCC()
  chk('vincular: mientras manda, apagado', /id="btn-vincular-cliente" disabled/.test(S.__el('ficha-clasificacion').innerHTML))
  await new Promise(r => setImmediate(r))
  soltar()
  await Promise.all([uno, dos])
  const v = S.__llamadas.filter(x => x[0] === 'vincular_proveedor_cliente')
  chk('vincular: un doble toque, UNA llamada', v.length === 1, v.length)
  chk('vincular: vincular_proveedor_cliente con el proveedor y la empresa', v[0][1].p_proveedor_id === 'pv1' && v[0][1].p_unidad_negocio_id === 'u-n' && Object.keys(v[0][1]).length === 2)
  chk('vincular: avisa que se creó el cliente', S.__exitos.includes('Se creó el cliente ANATOLIA en Administración → Clientes (Cucuruchos Nuss).'), JSON.stringify(S.__exitos))
  chk('vincular: queda "Cliente y proveedor" y el panel cerrado', f.panelVinculo === null && /data-clasificacion="ambos" aria-pressed="true"/.test(S.__el('ficha-clasificacion').innerHTML))
  chk('vincular: y aparece la cuenta de las dos cosas juntas', S.__llamadas.some(x => x[0] === 'cuenta_unificada' && x[1].p_cliente_id === 'c-nuevo'))
  chk('vincular: el chip de las listas se actualiza', S.esClienteYProveedor('pv1', 'u-n'))
})())
esperas.push((async () => {
  const S = sandbox()
  const f = ficha(S, { vinculos: [] })
  S.__datos.clientes = [{ id: 'c-ya', nombre: 'DIST. ANAT.', unidad_negocio_id: 'u-n', proveedor_id: null }]
  S.__setRpc(async (n) => n === 'vincular_proveedor_cliente' ? { data: 'c-ya', error: null } : { data: [], error: null })
  S.elegirClasificacionCC('ambos')
  await S.confirmarVincularCC()
  chk('vincular: un cliente que ya existía: "Quedó vinculado con el cliente…"', S.__exitos.includes('Quedó vinculado con el cliente DIST. ANAT. de Cucuruchos Nuss.'), JSON.stringify(S.__exitos))
  const S2 = sandbox()
  const f2 = ficha(S2, { vinculos: [] })
  S2.__setRpc(async (n) => n === 'vincular_proveedor_cliente' ? { data: null, error: { message: 'No tenés permiso sobre esa empresa.' } } : { data: [], error: null })
  S2.elegirClasificacionCC('ambos')
  await S2.confirmarVincularCC()
  chk('vincular: el error de la base tal cual, pegado', f2.panelVinculo?.error === 'No tenés permiso sobre esa empresa.' && /clasif-cc__error">No tenés permiso sobre esa empresa\.</.test(S2.__el('ficha-clasificacion').innerHTML))
  chk('vincular: con el panel abierto para reintentar', f2.panelVinculo?.enviando === false && f2.panelVinculo.tipo === 'vincular')
})())
esperas.push((async () => {
  // En todas las unidades: primero se elige la empresa (sin la de pruebas).
  const S = sandbox()
  S.estado.fabrica = { ok: true, unidades: new Set(['u-p']), personas: new Set(), soyDePrueba: false }
  const f = ficha(S, { unidadId: null, vinculos: [] })
  S.elegirClasificacionCC('ambos')
  S.renderizarClasificacionProveedor()
  const h = S.__el('ficha-clasificacion').innerHTML
  chk('todas: pregunta de qué empresa es cliente', /¿De qué empresa es cliente\?/.test(h) && /data-vincular-unidad="u-n"/.test(h) && /data-vincular-unidad="u-d"/.test(h))
  chk('todas: nunca la fábrica de pruebas', !/data-vincular-unidad="u-p"/.test(h))
  chk('todas: sin empresa no hay botón de vincular', !/btn-vincular-cliente/.test(h))
  await S.confirmarVincularCC()
  chk('todas: sin empresa no llama a la base', !S.__llamadas.some(x => x[0] === 'vincular_proveedor_cliente'))
  S.alTocarClasificacionCC({ target: { closest: (s) => s === '[data-vincular-unidad]' ? { dataset: { vincularUnidad: 'u-d' } } : null } })
  chk('todas: tocar una empresa la elige', f.panelVinculo.unidadId === 'u-d')
  S.alTocarClasificacionCC({ target: { closest: (s) => s === '#btn-cancelar-vinculo' ? {} : null } })
  chk('todas: Cancelar cierra', f.panelVinculo === null)
})())

// Separar.
esperas.push((async () => {
  const S = sandbox()
  const f = ficha(S, { vinculos: VINCULADO })
  S.elegirClasificacionCC('proveedor')
  chk('separar: abre la confirmación con el cliente de esa empresa', f.panelVinculo?.tipo === 'desvincular' && f.panelVinculo.clienteId === 'c1')
  S.renderizarClasificacionProveedor()
  chk('separar: pregunta antes (un panel propio)', /¿Separar las dos cuentas en Cucuruchos Nuss\? Distribuidora Anatolia deja de figurar/.test(S.__el('ficha-clasificacion').innerHTML) && !S.__llamadas.length)
  S.__setRpc(async (n) => n === 'desvincular_cliente_proveedor' ? { data: null, error: { message: 'Tiene compensaciones entre sus dos cuentas: no se puede desvincular.' } } : { data: [], error: null })
  await S.confirmarDesvincularCC()
  chk('separar: el error de la base tal cual, pegado', f.panelVinculo?.error === 'Tiene compensaciones entre sus dos cuentas: no se puede desvincular.' && /clasif-cc__error">Tiene compensaciones/.test(S.__el('ficha-clasificacion').innerHTML))
  S.__datos.clientes = []
  S.__setRpc(async () => ({ data: null, error: null }))
  await S.confirmarDesvincularCC()
  const d = S.__llamadas.filter(x => x[0] === 'desvincular_cliente_proveedor')
  chk('separar: desvincular_cliente_proveedor con el cliente', d.length === 2 && d[1][1].p_cliente_id === 'c1' && Object.keys(d[1][1]).length === 1)
  chk('separar: lo dice y queda solo proveedor', S.__exitos.includes('Las dos cuentas quedaron separadas en Cucuruchos Nuss.') && f.panelVinculo === null && /data-clasificacion="proveedor" aria-pressed="true"/.test(S.__el('ficha-clasificacion').innerHTML))
  chk('separar: la cuenta juntas se va', f.unica === null && S.__el('ficha-cuenta-unica').hidden === true)
})())
esperas.push((async () => {
  // Todas las unidades con dos vínculos: se elige cuál separar.
  const S = sandbox()
  const dos = [...VINCULADO, { id: 'c1-d', nombre: 'DIST. ANAT. SRL', unidad_negocio_id: 'u-d', proveedor_id: 'pv1' }]
  const f = ficha(S, { unidadId: null, vinculos: dos })
  S.elegirClasificacionCC('proveedor')
  S.renderizarClasificacionProveedor()
  const h = S.__el('ficha-clasificacion').innerHTML
  chk('separar en todas: pregunta en qué empresa', f.panelVinculo.clienteId === null && /data-desvincular-cliente="c1"/.test(h) && /data-desvincular-cliente="c1-d"/.test(h) && !/btn-desvincular-cliente/.test(h))
  await S.confirmarDesvincularCC()
  chk('separar en todas: sin elegir no llama', !S.__llamadas.length)
})())

// ═══ La cuenta de las dos cosas juntas ═════════════════════════════════════
esperas.push((async () => {
  const S = sandbox()
  const f = ficha(S, { vinculos: VINCULADO })
  S.__setRpc(async (n) => n === 'cuenta_unificada' ? { data: [{ fecha: '2026-09-01', etiqueta: 'Venta', detalle: 'x', moneda: 'ARS', te_debe: 1000, le_debes: 0, neto_acum: 1000, cliente_id: 'c1', proveedor_id: 'pv1', unidad_negocio_id: 'u-n' }, { fecha: '2026-09-02', etiqueta: 'Compra', detalle: 'y', moneda: 'ARS', te_debe: 0, le_debes: 400, neto_acum: 600 }], error: null } : { data: null, error: null })
  await S.prepararCuentaUnicaFicha()
  const u = S.__llamadas.find(x => x[0] === 'cuenta_unificada')
  chk('cuenta: con una empresa vinculada, cuenta_unificada por el cliente', u && u[1].p_cliente_id === 'c1')
  const el = S.__el('ficha-cuenta-unica')
  chk('cuenta: se ve, con el neto (te debe 600)', el.hidden === false && /Te debe \$ 600,00/.test(el.innerHTML), el.innerHTML.slice(0, 300))
  chk('cuenta: con los dos permisos, Compensar', /data-cu-compensar/.test(el.innerHTML))
  tieneFlags(S, ['cuentas_corrientes:registrar_pago', 'retiros:ver'])
  S.pintarCuentaUnicaFicha()
  chk('cuenta: sin cobranzas:procesar, sin Compensar', !/data-cu-compensar/.test(el.innerHTML))
  const antes = S.__llamadas.length
  await S.prepararCuentaUnicaFicha()
  chk('cuenta: no se vuelve a leer si ya está la del mismo cliente', S.__llamadas.length === antes)
  f.unidadId = null
  await S.prepararCuentaUnicaFicha()
  chk('cuenta: en todas las unidades, una nota que dice dónde es cliente', el.hidden === false && /También es cliente en Cucuruchos Nuss.*Elegí esa unidad/.test(el.innerHTML) && f.unica === null)
  f.vinculos = []
  await S.prepararCuentaUnicaFicha()
  chk('cuenta: sin vínculos, nada', el.hidden === true && el.innerHTML === '')
})())

{
  const S = sandbox()
  chk('la cuenta del proveedor nombra la compensación', S.etiquetaPagoDeGasto({ medio_pago: 'compensacion', descripcion: 'Compensación con su cuenta de cliente — X' }) === 'Compensación con su cuenta de cliente')
  chk('un efectivo sigue sin etiqueta propia', S.etiquetaPagoDeGasto({ medio_pago: 'efectivo', descripcion: 'x' }) === null)
}
{
  chk('fuente: importa de js/cuenta-unica.js', /from '\.\.\/js\/cuenta-unica\.js'/.test(FUENTE))
  chk('fuente: la ficha tiene sus dos contenedores', /<div id="ficha-clasificacion"><\/div>/.test(FUENTE) && /<div id="ficha-cuenta-unica" hidden><\/div>/.test(FUENTE))
  chk('fuente: abrir la ficha lee los vínculos y pinta', /cargarFichaRemitos\(\), cargarVinculosFicha\(\)\]\)/.test(FUENTE) && /renderizarFichaBanner\(\)\n\s+renderizarClasificacionProveedor\(\)\n\s+prepararCuentaUnicaFicha\(\)/.test(FUENTE))
  chk('fuente: cambiar de unidad repinta la clasificación y la cuenta', /renderizarFichaRemitos\(\)\n\s+renderizarClasificacionProveedor\(\)\n\s+prepararCuentaUnicaFicha\(\)/.test(FUENTE))
  chk('fuente: los toques de la clasificación y de la cuenta', /getElementById\('ficha-clasificacion'\)\.addEventListener\('click'/.test(FUENTE) && /unicaCC\.addEventListener\('click'/.test(FUENTE))
  chk('fuente: el chip se lee al arrancar', /cargarClientesProveedores\(\),\n\s+\]\)/.test(FUENTE))
  // Los dos confirm() viejos (eliminar una factura, rechazar un proveedor) son
  // de antes; vincular y separar usan un panel propio.
  chk('fuente: ningún confirm() nuevo (siguen los dos de antes)', (FUENTE.match(/(?<![\w./])confirm\(/g) || []).length === 2)
}

fin()
