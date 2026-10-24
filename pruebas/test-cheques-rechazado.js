// CHEQUES: EL CHEQUE RECHAZADO (24/10/2026, pedido de Facu; rama
// ci-prueba/cheque-rechazado).
//
// En la cartera (región de Cheques de administracion.html):
//  - "Cheque rechazado": el buscador (buscar_cheques_para_rechazo, desde 2
//    números y con 300 ms de espera), elegir el cheque, la fecha, el motivo
//    con chips (Sin fondos / Firma / Cuenta cerrada / Otro + texto), los
//    gastos al cliente (por defecto "Gastos de cheque rechazado" vacío), el
//    cliente si la cobranza no tiene, la nota de débito del proveedor si el
//    cheque se le dio a uno (con el PDF en la carpeta del usuario), el
//    resumen y UNA llamada a registrar_cheque_rechazado; después se pide abrir
//    la hoja de la nota (evento 'administracion:nota-debito').
//  - El estado "Rechazado": filtro propio (y en "Salidos"), en rojo, con la
//    fecha, el motivo y el link a su nota de débito; no vuelve a cartera.
//  - js/cobranzas-comun.js: la etiqueta "Rechazado" y fuera de la cartera
//    (Cobranzas no deja editar la cobranza).
//
// Firmas verificadas con pg_get_functiondef el 24/10/2026. Se EJECUTAN las
// funciones reales con un document y una base falsos.
//
//   node pruebas/test-cheques-rechazado.js
'use strict'

const fs = require('fs')
const path = require('path')
const { construirCheques } = require('./sandbox-cheques')
const { ARCHIVO_CHEQUES, leerCheques } = require('./fuente-cheques')
const { arnes, marca, escapada, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || ARCHIVO_CHEQUES
const FUENTE = leerCheques(ARCHIVO)
const RUTA_COMUN = process.env.ARCHIVO_COMUN || path.join(__dirname, '..', 'js', 'cobranzas-comun.js')
const COMUN = fs.readFileSync(RUTA_COMUN, 'utf8')
// El runner de mutaciones confirma con esta línea que leyó el archivo mutado.
console.log(`COMUN ${RUTA_COMUN} (${COMUN.length} bytes)`)
const { chk, esperas, fin } = arnes()
const N = (s) => String(s ?? '').replace(/ /g, ' ')

const PRELUDIO = `
  var __timers = []
  function setTimeout(fn, ms) { __timers.push({ fn, ms }); return __timers.length }
  function clearTimeout(id) { if (id && __timers[id - 1]) __timers[id - 1].fn = null }
  function __correrTimers() { const t = __timers.splice(0); for (const x of t) if (x.fn) x.fn() }
  function CustomEvent(tipo, init) { this.type = tipo; this.detail = init ? init.detail : undefined }
  var __eventos = []
  document.dispatchEvent = (e) => { __eventos.push(e); return true }
  var __subidas = [], __errorSubida = null
  supabase.storage = { from: (bucket) => ({ upload: async (ruta, archivo, op) => { __subidas.push({ bucket, ruta, archivo, op }); return { data: null, error: __errorSubida } } }) }
`
const RETORNO = '__timers: () => __timers, __correrTimers, __eventos: () => __eventos, __subidas: () => __subidas, __setErrorSubida(e) { __errorSubida = e }'

const U_NUSS = 'u-nuss', U_PRUEBA = 'u-prueba'
function armar({ tareas = ['cobranzas:ver_todo', 'cobranzas:procesar', 'cuentas_corrientes:registrar_pago'] } = {}) {
  const S = construirCheques(ARCHIVO, { preludioExtra: PRELUDIO, retornoExtra: RETORNO })
  S.estado.misTareas = new Set(tareas)
  S.estado.fabrica = { ok: true, unidades: new Set([U_PRUEBA]), personas: new Set(), soyDePrueba: false }
  S.estado.bancos = new Map([['072', 'Santander'], ['285', 'Macro']])
  S.estado.notasPorCheque = new Map()
  S.estado.rechazo = null
  S.estado.cobranzas = new Map([['cob-1', { id: 'cob-1', cliente: 'Molino', estado: 'procesada', unidad_negocio_id: U_NUSS, unidad_negocio_nombre: 'Nuss' }]])
  S.estado.filas = []
  return S
}
// Lo que devuelve buscar_cheques_para_rechazo (las columnas de la base).
const DEPOSITADO = {
  cheque_id: 'ch-dep', banco_codigo: '285', banco: 'BANCO MACRO S.A.', numero: '43300023', importe: 150000, fecha_pago: null, es_echeck: false,
  estado: 'depositado', salida_fecha: '2026-10-10', destino: 'Banco Macro · Nuss', cliente_id: 'cli-1', cliente: 'Molino', unidad_negocio_id: U_NUSS,
  proveedor_id: null, proveedor: null, titulares: [],
}
const ENDOSADO = {
  ...DEPOSITADO, cheque_id: 'ch-end', numero: '43300024', importe: 80000, estado: 'endosado', salida_fecha: '2026-10-12', destino: 'ANATOLIA SRL',
  proveedor_id: 'prov-1', proveedor: 'ANATOLIA SRL',
}
const SIN_CLIENTE = { ...DEPOSITADO, cheque_id: 'ch-sc', numero: '43300025', cliente_id: null, cliente: null }
const EN_BANCO = { ...DEPOSITADO, cheque_id: 'ch-ban', numero: '43300026', estado: 'en_banco', salida_fecha: '2026-10-11' }
const DE_PRUEBA = { ...DEPOSITADO, cheque_id: 'ch-prueba', numero: '43300099', unidad_negocio_id: U_PRUEBA }
const HOY = (() => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()))()

// Abre el diálogo y elige un cheque (con la búsqueda real).
async function conCheque(S, cheque, rpc) {
  S.__setRpc(rpc ?? (async (n) => n === 'buscar_cheques_para_rechazo' ? { data: [cheque], error: null } : { data: null, error: null }))
  S.abrirRechazo()
  S.alEscribirBusquedaRechazo('4330')
  S.__correrTimers()
  await new Promise(r => setImmediate(r))
  S.elegirChequeRechazo(cheque.cheque_id)
  await new Promise(r => setImmediate(r))
  return S.estado.rechazo
}

// ── El común (js/cobranzas-comun.js) ──────────────────────────────────────
chk('el común: la etiqueta de "rechazado" es "Rechazado"', /rechazado: 'Rechazado'/.test(COMUN))
chk('el común: un rechazado está fuera de la cartera (Cobranzas no deja editar su cobranza)',
  /export const ESTADOS_FUERA_DE_CARTERA = \[[^\]]*'rechazado'[^\]]*\]/.test(COMUN))
chk('el común: "Salidos" de Cobranzas no cambia (sigue siendo depositado, endosado y vendido)',
  /export const ESTADOS_SALIDOS = \['depositado', 'endosado', 'vendido'\]/.test(COMUN))

// ── El filtro, el color y la leyenda ──────────────────────────────────────
{
  const S = armar()
  const correr = (f) => {
    const reg = { llamadas: [] }
    const q = {}
    for (const m of ['select', 'eq', 'in', 'like', 'order']) q[m] = (...a) => { reg.llamadas.push([m, ...a]); return q }
    S.aplicarFiltrosCheques(q, { numero: '', banco: '', ...f })
    return reg.llamadas
  }
  chk('filtro: hay "Rechazados"', S.ESTADOS_FILTRO_CHEQUES.some(e => e.id === 'rechazados' && e.nombre === 'Rechazados'))
  chk('filtro: "Rechazados" va antes de "Todos"', S.ESTADOS_FILTRO_CHEQUES.findIndex(e => e.id === 'rechazados') < S.ESTADOS_FILTRO_CHEQUES.findIndex(e => e.id === 'todos'))
  const r = correr({ estado: 'rechazados' }).find(x => x[1] === 'estado')
  chk('filtro: "Rechazados" pide estado = rechazado', r && r[0] === 'eq' && r[2] === 'rechazado')
  const sal = correr({ estado: 'salidos' }).find(x => x[1] === 'estado')
  chk('filtro: "Salidos" trae también los rechazados', sal && sal[0] === 'in' && sal[2].includes('rechazado') && sal[2].includes('vendido'))
  chk('filtro: "Todos" no filtra por estado (trae los rechazados)', !correr({ estado: 'todos' }).some(x => x[1] === 'estado'))
  chk('la lista lee la fecha, el motivo y el estado anterior del rechazo',
    /rechazo_fecha, rechazo_motivo, rechazo_estado_anterior'/.test(FUENTE))

  const ch = { id: 'r1', cobranza_id: 'cob-1', banco_codigo: '285', numero: '43300023', tipo: 'comun', fecha_emision: '2026-10-01', importe: 150000,
    estado: 'rechazado', salida_fecha: '2026-10-10', salida_destino: 'Banco Macro · Nuss', rechazo_fecha: '2026-10-20', rechazo_motivo: 'Sin fondos' }
  chk('claves: un rechazado es "rechazado" (ni salido ni en cartera)', S.clavesEstadoCheque(ch, S.estado.cobranzas.get('cob-1'), HOY).join() === 'rechazado')
  chk('leyenda: "Rechazado" está en LEYENDA_ESTADOS', S.LEYENDA_ESTADOS.some(e => e.clave === 'rechazado' && e.nombre === 'Rechazado'))
  chk('leyenda: con un rechazado a la vista, la leyenda lo nombra', S.leyendaDeCheques([ch], S.estado.cobranzas, HOY).some(e => e.clave === 'rechazado'))
  chk('un rechazado no ofrece ninguna acción de salida (no vuelve a cartera)', S.accionSalida(ch, S.estado.cobranzas.get('cob-1')) === null)
  chk('textoRechazo: la fecha y el motivo', S.textoRechazo(ch) === 'Rechazado el 20/10/2026 · Sin fondos', S.textoRechazo(ch))
  chk('textoRechazo: sin motivo ni fecha, "Rechazado"', S.textoRechazo({ estado: 'rechazado' }) === 'Rechazado')

  // Sin la nota todavía leída: el texto, sin link.
  let fila = S.htmlFilaCheque(ch, S.estado.cobranzas.get('cob-1'))
  chk('fila: la clase roja de rechazado', /class="[^"]*chq-tabla__fila--rechazado/.test(fila))
  chk('fila: el chip dice "Rechazado"', /chq-estado chq-estado--rechazado">Rechazado</.test(fila))
  chk('fila: la columna Salida dice la fecha y el motivo', fila.includes('Rechazado el 20/10/2026 · Sin fondos'))
  chk('fila: sin la nota leída, no hay link', !/data-ver-nota-debito/.test(fila))
  chk('fila: no ofrece "Volver a cartera"', !/data-volver-cartera/.test(fila))
  S.estado.notasPorCheque.set('r1', { id: 'nd-1', cheque_id: 'r1', codigo: 'N-ND-0001', estado: 'vigente' })
  fila = S.htmlFilaCheque(ch, S.estado.cobranzas.get('cob-1'))
  chk('fila: el link a su nota de débito, con su código', /data-ver-nota-debito="nd-1">Nota de débito N-ND-0001</.test(fila), fila)
  const tarjeta = S.htmlTarjetaCheque(ch, S.estado.cobranzas.get('cob-1'))
  chk('tarjeta: la clase roja de rechazado', /chq-tarjeta--rechazado/.test(tarjeta))
  chk('tarjeta: la fecha y el motivo en el renglón', tarjeta.includes('Rechazado el 20/10/2026 · Sin fondos'))
  chk('tarjeta: el link a la nota, a la derecha', /chq-tarjeta__lado">\s*<button type="button" class="chq-link-nota" data-ver-nota-debito="nd-1"/.test(tarjeta), tarjeta)
  S.estado.notasPorCheque.set('r1', { id: 'nd-1', codigo: 'N-ND-0001', estado: 'anulada' })
  chk('link: una nota anulada lo dice', /Nota de débito N-ND-0001 \(anulada\)/.test(S.htmlFilaCheque(ch, S.estado.cobranzas.get('cob-1'))))

  // XSS: el motivo, el código y el id vienen de la base.
  S.estado.notasPorCheque.set('r1', { id: marca('nota-id'), codigo: marca('codigo'), estado: 'vigente' })
  const conMarcas = { ...ch, rechazo_motivo: marca('motivo') }
  chequearMarcas(chk, 'fila de un rechazado', S.htmlFilaCheque(conMarcas, S.estado.cobranzas.get('cob-1')), ['motivo', 'nota-id', 'codigo'])
  chequearMarcas(chk, 'tarjeta de un rechazado', S.htmlTarjetaCheque(conMarcas, S.estado.cobranzas.get('cob-1')), ['motivo', 'nota-id', 'codigo'])

  // La nota de débito de los rechazados que se ven.
  esperas.push((async () => {
    const S2 = armar()
    S2.__set([{ id: 'nd-9', cheque_id: 'r1', codigo: 'N-ND-0009', estado: 'vigente', direccion: 'emitida' }])
    await S2.cargarNotasDeRechazados([ch, { ...ch, id: 'otro', estado: 'depositado' }], 0)
    const q = S2.__consultas.find(c => c.tabla === 'notas_debito')
    chk('notas: se leen de notas_debito', !!q)
    chk('notas: solo las emitidas (al cliente)', q && q.llamadas.some(x => x[0] === 'eq' && x[1] === 'direccion' && x[2] === 'emitida'))
    chk('notas: solo de los cheques rechazados de la lista', q && q.llamadas.some(x => x[0] === 'in' && x[1] === 'cheque_id' && JSON.stringify(x[2]) === '["r1"]'))
    chk('notas: quedan por cheque', S2.estado.notasPorCheque.get('r1')?.id === 'nd-9')
    const S3 = armar()
    await S3.cargarNotasDeRechazados([{ ...ch, estado: 'depositado' }], 0)
    chk('notas: sin rechazados, no se consulta', !S3.__consultas.some(c => c.tabla === 'notas_debito'))
  })())
}

// ── El botón ──────────────────────────────────────────────────────────────
{
  // El sandbox trae textoSalidaCheque solo; en el navegador hace falta el import.
  chk('la región importa textoSalidaCheque de js/cobranzas-comun.js', /import \{[^}]*\btextoSalidaCheque\b[^}]*\} from '\.\.\/js\/cobranzas-comun\.js'/.test(FUENTE))
  chk('el botón "Cheque rechazado" está en la cartera', /id="chq-btn-rechazado"[^>]*>Cheque rechazado</.test(FUENTE))
  chk('el botón se muestra solo con cobranzas:procesar', /boton\.hidden = !puedeRechazar\(\)/.test(FUENTE) && /const puedeRechazar = \(\) => puedeProcesar\(\)/.test(FUENTE))
  chk('los cuatro chips del motivo', ['Sin fondos', 'Firma', 'Cuenta cerrada', 'Otro'].every(m => FUENTE.includes(`data-rech-motivo="${m}">${m}<`)))
  chk('el PDF del proveedor es opcional y solo PDF', /id="chq-rech-prov-pdf" accept="application\/pdf"/.test(FUENTE))
}

// ── El buscador ───────────────────────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  const llamadas = []
  S.__setRpc(async (n, p) => { llamadas.push({ n, p }); return { data: [DEPOSITADO, ENDOSADO, DE_PRUEBA], error: null } })
  S.abrirRechazo()
  const r = S.estado.rechazo
  chk('al abrir: un renglón "Gastos de cheque rechazado" vacío', r.gastos.length === 1 && r.gastos[0].concepto === 'Gastos de cheque rechazado' && r.gastos[0].importe === null)
  chk('al abrir: la fecha es hoy y no hay motivo elegido', r.fecha === HOY && r.motivo === null)
  chk('al abrir: el diálogo se muestra', S.__els.get('chq-modal-rechazo').hidden === false)
  S.alEscribirBusquedaRechazo('4')
  chk('con 1 número no busca', S.__timers().filter(t => t.fn).length === 0 && llamadas.length === 0)
  S.alEscribirBusquedaRechazo('43')
  S.alEscribirBusquedaRechazo('433')
  const vivos = S.__timers().filter(t => t.fn)
  chk('espera 300 ms y solo la última búsqueda queda viva', vivos.length === 1 && vivos[0].ms === 300, vivos.map(t => t.ms).join())
  chk('mientras espera dice "Buscando…"', S.__els.get('chq-rech-buscando').textContent === 'Buscando…')
  S.__correrTimers()
  await new Promise(x => setImmediate(x))
  chk('una sola llamada a buscar_cheques_para_rechazo con lo escrito', llamadas.length === 1 && llamadas[0].n === 'buscar_cheques_para_rechazo' && llamadas[0].p.p_texto === '433', JSON.stringify(llamadas))
  chk('la fábrica de pruebas no aparece para una cuenta real', r.resultados.length === 2 && !r.resultados.some(c => c.cheque_id === 'ch-prueba'))
  const html = N(S.__els.get('chq-rech-resultados').innerHTML)
  chk('cada resultado: banco, número e importe', html.includes('Cheque BANCO MACRO S.A. · Nº 43300023 · $ 150.000,00'), html)
  chk('cada resultado: el cliente y cómo salió', html.includes('Molino · Depositado el 10/10/2026 en Banco Macro · Nuss'), html)
  chk('el endosado dice a quién se dio', html.includes('Endosado el 12/10/2026 a ANATOLIA SRL'), html)
  chk('cada resultado es un botón con el id del cheque', /data-rech-cheque="ch-dep"/.test(html) && /data-rech-cheque="ch-end"/.test(html))
  // Un error de la base: tal cual.
  S.__setRpc(async () => ({ data: null, error: { message: 'No tenés permiso.' } }))
  S.alEscribirBusquedaRechazo('4330')
  S.__correrTimers()
  await new Promise(x => setImmediate(x))
  chk('el error de la base se muestra tal cual', S.__els.get('chq-rech-buscando').textContent === 'No tenés permiso.')
  S.__setRpc(async () => ({ data: [], error: null }))
  S.alEscribirBusquedaRechazo('99')
  S.__correrTimers()
  await new Promise(x => setImmediate(x))
  chk('sin resultados lo dice', S.__els.get('chq-rech-buscando').textContent === 'No hay cheques salidos con ese número.')
  // XSS de los resultados.
  const S2 = armar()
  S2.__setRpc(async () => ({ data: [{ ...DEPOSITADO, banco: marca('banco'), numero: marca('numero'), cliente: marca('cliente'), destino: marca('destino'), cheque_id: marca('id') }], error: null }))
  S2.abrirRechazo()
  S2.alEscribirBusquedaRechazo('43')
  S2.__correrTimers()
  await new Promise(x => setImmediate(x))
  chequearMarcas(chk, 'resultados del buscador', S2.__els.get('chq-rech-resultados').innerHTML, ['banco', 'numero', 'cliente', 'destino', 'id'])
})())

// ── Elegir, validar y lo que viaja ────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  const r = await conCheque(S, DEPOSITADO)
  chk('elegir: queda el cheque', r.cheque?.cheque_id === 'ch-dep')
  chk('elegir: se esconde el buscador y aparece el formulario', S.__els.get('chq-rech-campo-buscar').hidden === true && S.__els.get('chq-rech-form').hidden === false)
  chk('elegir: la fecha no puede ser anterior a la salida', S.__els.get('chq-rech-fecha').min === '2026-10-10')
  chk('elegir: con cliente en la cobranza no se pide el cliente', S.__els.get('chq-rech-campo-cliente').hidden === true)
  chk('elegir: sin proveedor, no hay bloque de su nota', S.__els.get('chq-rech-prov').hidden === true)
  const H = '2026-10-24'
  r.fecha = '2026-10-20'
  chk('validar: sin motivo', S.erroresRechazo(r, H) === 'Elegí el motivo: Sin fondos, Firma, Cuenta cerrada u Otro.')
  S.elegirMotivoRechazo('Otro')
  r.detalle = 'xy'
  chk('validar: "Otro" con menos de 3 letras', S.erroresRechazo(r, H) === 'Con «Otro», escribí el motivo del rechazo.')
  r.detalle = ''
  chk('validar: "Otro" sin escribir nada', S.erroresRechazo(r, H) === 'Con «Otro», escribí el motivo del rechazo.')
  S.elegirMotivoRechazo('Sin fondos')
  r.detalle = ''
  chk('validar: con el chip alcanza', S.erroresRechazo(r, H) === null)
  chk('motivo: el chip solo', S.motivoRechazo('Sin fondos', '') === 'Sin fondos')
  chk('motivo: el chip y el detalle', S.motivoRechazo('Firma', ' no coincide ') === 'Firma: no coincide')
  chk('motivo: "Otro" es solo lo escrito', S.motivoRechazo('Otro', 'cheque adulterado') === 'cheque adulterado')
  r.fecha = '2026-10-25'
  chk('validar: la fecha no puede ser futura', S.erroresRechazo(r, H) === 'La fecha no puede ser futura.')
  r.fecha = '2026-10-09'
  chk('validar: la fecha no puede ser anterior a la salida', /no puede ser anterior a la salida del cheque \(10\/10\/2026\)/.test(S.erroresRechazo(r, H)))
  r.fecha = '2026-10-20'
  r.gastos[0].concepto = ''
  r.gastos[0].importe = 1500
  chk('validar: un gasto con importe lleva concepto', S.erroresRechazo(r, H) === 'Cada gasto al cliente lleva su concepto.')
  r.gastos[0].concepto = 'Gastos de cheque rechazado'
  r.gastos.push(S.renglonGastoRechazo('Comisión bancaria', 350.5), S.renglonGastoRechazo('vacío', null))
  chk('validar: completo', S.erroresRechazo(r, H) === null)
  const p = S.parametrosRechazo(r)
  chk('viaja: el cheque, la fecha y el motivo', p.p_cheque_id === 'ch-dep' && p.p_fecha === '2026-10-20' && p.p_motivo === 'Sin fondos')
  chk('viaja: solo los gastos con importe, con su concepto', JSON.stringify(p.p_gastos) === JSON.stringify([{ concepto: 'Gastos de cheque rechazado', importe: 1500 }, { concepto: 'Comisión bancaria', importe: 350.5 }]), JSON.stringify(p.p_gastos))
  chk('viaja: con cliente en la cobranza, p_cliente_id es null', p.p_cliente_id === null)
  chk('viaja: sin proveedor, p_nd_proveedor es null', p.p_nd_proveedor === null)
  chk('viaja: exactamente los seis parámetros de la función', Object.keys(p).sort().join() === 'p_cheque_id,p_cliente_id,p_fecha,p_gastos,p_motivo,p_nd_proveedor')
  // El resumen.
  const res = N(S.__els.get('chq-rech-resumen').innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))
  S.pintarResumenRechazo()
  const resumen = N(S.__els.get('chq-rech-resumen').innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))
  chk('resumen: lo que pasa con el banco', resumen.includes('Se descuentan $ 150.000,00 de Banco Macro · Nuss.'), resumen)
  chk('resumen: el total de la nota al cliente (cheque + gastos)', resumen.includes('Nota de débito al cliente (Molino) $ 151.850,50'), resumen)
  chk('resumen: el detalle cheque + gastos', resumen.includes('Cheque $ 150.000,00 + gastos $ 1.850,50'), resumen)
  chk('resumen: sin proveedor, no habla de su nota', !resumen.includes('del proveedor') && typeof res === 'string')
  chk('totales en centavos', JSON.stringify(S.totalesRechazo(r)) === JSON.stringify({ cheque: 15000000, gastosCliente: 185050, cliente: 15185050, gastosProveedor: 0, proveedor: 15000000 }))
  chk('textoBanco: en el banco no se descuenta nada', S.textoBancoRechazo(EN_BANCO) === 'Estaba en el banco esperando que acredite: no se descuenta nada de la cuenta.')
  chk('textoBanco: endosado, a quién se le dio', S.textoBancoRechazo(ENDOSADO) === 'Se lo habíamos dado a ANATOLIA SRL: no se descuenta nada del banco.')
  chk('textoBanco: vendido también se descuenta', N(S.textoBancoRechazo({ ...DEPOSITADO, estado: 'vendido' })) === 'Se descuentan $ 150.000,00 de Banco Macro · Nuss.')
})())

// Una cobranza sin cliente: el selector de cliente.
esperas.push((async () => {
  const S = armar()
  S.__set((tabla) => tabla === 'clientes'
    ? [{ id: 'c1', nombre: 'Almacén Sur', unidad_negocio_id: U_NUSS, activo: true }, { id: 'c2', nombre: 'Apagado', unidad_negocio_id: U_NUSS, activo: false }, { id: 'c3', nombre: 'Robot', unidad_negocio_id: U_PRUEBA, activo: true }]
    : [])
  const r = await conCheque(S, SIN_CLIENTE)
  await new Promise(x => setImmediate(x))
  chk('sin cliente: se muestra el selector', S.__els.get('chq-rech-campo-cliente').hidden === false)
  const q = S.__consultas.find(c => c.tabla === 'clientes')
  chk('sin cliente: lee los clientes de la fábrica del cheque', q && q.llamadas.some(x => x[0] === 'eq' && x[1] === 'unidad_negocio_id' && x[2] === U_NUSS))
  const ops = S.__els.get('chq-rech-cliente').innerHTML
  chk('sin cliente: solo los prendidos y sin la fábrica de pruebas', /value="c1"/.test(ops) && !/value="c2"/.test(ops) && !/value="c3"/.test(ops), ops)
  S.elegirMotivoRechazo('Firma')
  chk('sin cliente: sin elegir, no deja confirmar', S.erroresRechazo(r, '2026-10-24') === 'Elegí a qué cliente se le hace la nota de débito.')
  r.clienteId = 'c1'
  chk('sin cliente: elegido, sí', S.erroresRechazo(r, '2026-10-24') === null)
  chk('sin cliente: viaja p_cliente_id', S.parametrosRechazo(r).p_cliente_id === 'c1')
  S.pintarResumenRechazo()
  chk('sin cliente: el resumen nombra al elegido', S.__els.get('chq-rech-resumen').innerHTML.includes('Nota de débito al cliente (Almacén Sur)'))
  r.clientes = [{ id: marca('cli-id'), nombre: marca('cli-nombre') }]
  chequearMarcas(chk, 'el selector de clientes', S.htmlOpcionesClienteRechazo(r), ['cli-id', 'cli-nombre'])
})())

// El cheque que se le dio a un proveedor: su nota de débito (opcional).
esperas.push((async () => {
  const S = armar()
  const r = await conCheque(S, ENDOSADO)
  chk('proveedor: aparece el bloque de su nota', S.__els.get('chq-rech-prov').hidden === false)
  chk('proveedor: el título nombra al proveedor', S.__els.get('chq-rech-prov-titulo').textContent === 'Nota de débito del proveedor (ANATOLIA SRL)')
  chk('proveedor: arranca sin tildar y con los campos escondidos', r.prov.si === false && S.__els.get('chq-rech-prov-campos').hidden === true)
  S.elegirMotivoRechazo('Sin fondos')
  chk('proveedor: sin tildar, viaja p_nd_proveedor null', S.parametrosRechazo(r).p_nd_proveedor === null)
  r.prov.si = true
  S.pintarRechazo()
  chk('proveedor: tildado, se ven sus campos', S.__els.get('chq-rech-prov-campos').hidden === false)
  chk('proveedor: sin comprobante no deja confirmar', S.erroresRechazo(r, '2026-10-24') === 'Poné el número de comprobante de la nota del proveedor.')
  r.prov.comprobante = ' 0001-00004567 '
  r.prov.fecha = '2026-10-21'
  r.prov.gastos[0].importe = 2500
  r.prov.observaciones = '  '
  chk('proveedor: completo', S.erroresRechazo(r, '2026-10-24') === null)
  r.prov.archivo = { name: 'nota.jpg', type: 'image/jpeg', size: 10 }
  chk('proveedor: el archivo tiene que ser PDF', S.erroresRechazo(r, '2026-10-24') === 'El archivo de la nota del proveedor tiene que ser un PDF.')
  r.prov.archivo = { name: 'nota.pdf', type: 'application/pdf', size: 11 * 1024 * 1024 }
  chk('proveedor: el PDF hasta 10 MB', S.erroresRechazo(r, '2026-10-24') === 'El PDF de la nota del proveedor pesa más de 10 MB.')
  r.prov.archivo = null
  const p = S.parametrosRechazo(r, 'uid/notas-debito/x.pdf')
  chk('proveedor: viaja su nota (comprobante, fecha, sus gastos, observaciones y el PDF)',
    JSON.stringify(p.p_nd_proveedor) === JSON.stringify({ comprobante: '0001-00004567', fecha: '2026-10-21', gastos: [{ concepto: 'Gastos de cheque rechazado', importe: 2500 }], observaciones: null, archivo_url: 'uid/notas-debito/x.pdf' }), JSON.stringify(p.p_nd_proveedor))
  S.pintarResumenRechazo()
  const resumen = N(S.__els.get('chq-rech-resumen').innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))
  chk('resumen: el total de la nota del proveedor', resumen.includes('Nota de débito del proveedor (ANATOLIA SRL) $ 82.500,00'), resumen)
  chk('resumen: el endoso no descuenta del banco', resumen.includes('Se lo habíamos dado a ANATOLIA SRL'), resumen)
  chk('ruta del PDF: adentro de la carpeta del usuario', S.rutaPdfNotaProveedor('uid-1', 'prov-1', '2026-10-21', 123) === 'uid-1/notas-debito/prov-1/2026/123.pdf')
  // Sin "Registrar pagos a proveedores": no se puede tildar.
  const S2 = armar({ tareas: ['cobranzas:ver_todo', 'cobranzas:procesar'] })
  const r2 = await conCheque(S2, ENDOSADO)
  chk('sin registrar_pago: la casilla queda apagada y lo dice', S2.__els.get('chq-rech-prov-si').disabled === true && S2.__els.get('chq-rech-prov-permiso').hidden === false)
  r2.prov.si = true
  S2.elegirMotivoRechazo('Sin fondos')
  chk('sin registrar_pago: si igual se tildara, no deja mandar', /Registrar pagos a proveedores/.test(S2.erroresRechazo(r2, '2026-10-24') ?? ''))
})())

// ── Confirmar ─────────────────────────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  const llamadas = []
  let resolver
  const r = await conCheque(S, DEPOSITADO, async (n, p) => {
    if (n === 'buscar_cheques_para_rechazo') return { data: [DEPOSITADO], error: null }
    llamadas.push({ n, p })
    await new Promise(x => { resolver = x })
    return { data: { nota_debito_cliente_id: 'nd-77', codigo: 'N-ND-0007', total_cliente: 151500, nota_debito_proveedor_id: null, caja_movimiento_id: 'cm-1', proveedor_id: null, estado_anterior: 'depositado' }, error: null }
  })
  S.__els.get('chq-rech-fecha').value = '2026-10-20'
  S.elegirMotivoRechazo('Sin fondos')
  r.gastos[0].importe = 1500
  const una = S.confirmarRechazo()
  const otra = S.confirmarRechazo()
  await new Promise(x => setImmediate(x))
  chk('confirmar: el botón se traba mientras manda', S.__els.get('chq-rech-confirmar').disabled === true && S.__els.get('chq-rech-confirmar').textContent === 'Registrando…')
  resolver()
  await Promise.all([una, otra])
  chk('confirmar: un doble toque manda UNA sola vez', llamadas.length === 1, llamadas.length)
  chk('confirmar: llama a registrar_cheque_rechazado', llamadas[0]?.n === 'registrar_cheque_rechazado')
  chk('confirmar: con la fecha del campo', llamadas[0]?.p.p_fecha === '2026-10-20')
  chk('confirmar: el diálogo se cierra', S.estado.rechazo === null && S.__els.get('chq-modal-rechazo').hidden === true)
  chk('confirmar: el aviso dice la nota, el total y que se descontó del banco',
    N(S.__llamadas.exitos.at(-1)) === 'Cheque rechazado. Nota de débito N-ND-0007 al cliente por $ 151.500,00. Se descontó de la cuenta del banco.', S.__llamadas.exitos.at(-1))
  chk('confirmar: se relee la cartera', S.__llamadas.refrescar === 1)
  const ev = S.__eventos().find(e => e.type === 'administracion:nota-debito')
  chk('confirmar: se pide abrir la hoja de la nota al cliente', ev?.detail?.id === 'nd-77')
})())

esperas.push((async () => {
  // El error de la base: tal cual, sin cerrar, sin hoja.
  const S = armar()
  const r = await conCheque(S, DEPOSITADO, async (n) => n === 'buscar_cheques_para_rechazo'
    ? { data: [DEPOSITADO], error: null }
    : { data: null, error: { message: 'La fecha del rechazo no puede ser anterior a la salida del cheque.' } })
  S.__els.get('chq-rech-fecha').value = '2026-10-20'
  S.elegirMotivoRechazo('Firma')
  await S.confirmarRechazo()
  chk('error: el mensaje de la base, tal cual, pegado al botón', S.__els.get('chq-rech-error').textContent === 'La fecha del rechazo no puede ser anterior a la salida del cheque.' && S.__els.get('chq-rech-error').hidden === false)
  chk('error: el diálogo sigue abierto y se puede reintentar', S.estado.rechazo === r && S.__els.get('chq-rech-confirmar').disabled === false)
  chk('error: no se abre ninguna hoja', !S.__eventos().some(e => e.type === 'administracion:nota-debito'))
  // Lo que falta no llama a la base.
  const S2 = armar()
  const llamadas = []
  await conCheque(S2, DEPOSITADO, async (n) => { if (n !== 'buscar_cheques_para_rechazo') llamadas.push(n); return { data: [DEPOSITADO], error: null } })
  S2.__els.get('chq-rech-fecha').value = '2026-10-20'
  await S2.confirmarRechazo()
  chk('falta el motivo: lo dice y no llama a la base', llamadas.length === 0 && /Elegí el motivo/.test(S2.__els.get('chq-rech-error').textContent))
})())

esperas.push((async () => {
  // Con el PDF del proveedor: primero se sube a la carpeta del usuario, y viaja la RUTA.
  const S = armar()
  const llamadas = []
  const r = await conCheque(S, ENDOSADO, async (n, p) => {
    if (n === 'buscar_cheques_para_rechazo') return { data: [ENDOSADO], error: null }
    llamadas.push({ n, p })
    return { data: { nota_debito_cliente_id: 'nd-1', codigo: 'N-ND-0001', total_cliente: 80000, nota_debito_proveedor_id: 'nd-2', caja_movimiento_id: null }, error: null }
  })
  S.__els.get('chq-rech-fecha').value = '2026-10-20'
  S.elegirMotivoRechazo('Cuenta cerrada')
  r.prov.si = true
  S.__els.get('chq-rech-prov-comprobante').value = '0001-1'
  S.__els.get('chq-rech-prov-fecha').value = '2026-10-21'
  r.prov.archivo = { name: 'nota.pdf', type: 'application/pdf', size: 1000 }
  await S.confirmarRechazo()
  const sub = S.__subidas()[0]
  chk('PDF: se sube al bucket comprobantes', sub?.bucket === 'comprobantes' && sub.op?.contentType === 'application/pdf' && sub.op?.upsert === false)
  chk('PDF: adentro de la carpeta del usuario', /^uid-de-prueba\/notas-debito\/prov-1\/2026\/\d+\.pdf$/.test(sub?.ruta ?? ''), sub?.ruta)
  chk('PDF: viaja la ruta (nunca una URL firmada)', llamadas[0]?.p.p_nd_proveedor?.archivo_url === sub?.ruta)
  chk('PDF: el motivo es el chip', llamadas[0]?.p.p_motivo === 'Cuenta cerrada')
  chk('PDF: el aviso dice que la nota del proveedor quedó en su cuenta', /La nota del proveedor quedó en su cuenta corriente\./.test(S.__llamadas.exitos.at(-1) ?? ''))
  // Si el PDF no sube, no se registra el rechazo.
  const S2 = armar()
  const llamadas2 = []
  const r2 = await conCheque(S2, ENDOSADO, async (n) => { if (n !== 'buscar_cheques_para_rechazo') llamadas2.push(n); return { data: [ENDOSADO], error: null } })
  S2.__setErrorSubida({ message: 'new row violates row-level security policy' })
  S2.__els.get('chq-rech-fecha').value = '2026-10-20'
  S2.elegirMotivoRechazo('Firma')
  r2.prov.si = true
  S2.__els.get('chq-rech-prov-comprobante').value = '0001-1'
  S2.__els.get('chq-rech-prov-fecha').value = '2026-10-21'
  r2.prov.archivo = { name: 'nota.pdf', type: 'application/pdf', size: 1000 }
  await S2.confirmarRechazo()
  chk('PDF que no sube: no se registra el rechazo y se dice por qué', llamadas2.length === 0 && /No se pudo subir el PDF: new row violates/.test(S2.__els.get('chq-rech-error').textContent))
})())

// XSS del elegido y del resumen (los nombres vienen de la base).
esperas.push((async () => {
  const S = armar()
  const malo = { ...ENDOSADO, banco: marca('banco'), numero: marca('numero'), cliente: marca('cliente'), proveedor: marca('proveedor'), destino: marca('destino') }
  const r = await conCheque(S, malo)
  r.prov.si = true
  r.gastos[0].concepto = marca('concepto')
  S.pintarRechazo()
  chequearMarcas(chk, 'el cheque elegido', S.__els.get('chq-rech-elegido-texto').innerHTML, ['banco', 'numero', 'cliente', 'proveedor'])
  chequearMarcas(chk, 'el resumen', S.__els.get('chq-rech-resumen').innerHTML, ['cliente', 'proveedor'])
  chequearMarcas(chk, 'los renglones de gastos', S.__els.get('chq-rech-gastos').innerHTML, ['concepto'])
  chk('el título del proveedor va por textContent', S.__els.get('chq-rech-prov-titulo').textContent.includes(marca('proveedor')))
})())

fin()
