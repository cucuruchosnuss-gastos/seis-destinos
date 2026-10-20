// "¿DE DÓNDE SALEN?" ANTES DE CONFIRMAR (20/10/2026). Se EJECUTA:
//  1. js/faltante-retiro.js tal cual (sin import/export): el origen habitual,
//     el prefijo y el lote ("MENGUI-2010"), los parámetros EXACTOS de
//     ingresar_producto_terminado, el orden de las llamadas (el ingreso y
//     después faltante_a_lote), sin permiso no se carga el ingreso, y una
//     falla no frena a los demás.
//  2. La Carga (modulos/retiros.html): la pregunta en el renglón según de
//     dónde se hace el producto (la fábrica con planilla, sin planilla con la
//     nota obligatoria, de afuera con su origen habitual, "Otro origen", y sin
//     saber de dónde: las dos cosas); no se puede confirmar sin contestar; al
//     confirmar se resuelve cada faltante con lo contestado; una falla deja el
//     renglón en el cartel (que dice "Cerrar", no "Dejarlo pendiente") y
//     "Volver a intentar" manda el MISMO uuid de ingreso.
//
//   ARCHIVO_TEST=<copia de js/faltante-retiro.js>
//   ARCHIVO_RETIROS=<copia de modulos/retiros.html>
'use strict'
process.env.TZ = 'UTC'

const fs = require('fs')
const path = require('path')
const { arnes, marca } = require('./circuito-comun')
const { construirRetiros } = require('./sandbox-retiros')
const { cargarNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const RUTA = process.env.ARCHIVO_TEST || path.join(RAIZ, 'js', 'faltante-retiro.js')
const RUTA_RET = process.env.ARCHIVO_RETIROS || path.join(RAIZ, 'modulos', 'retiros.html')
const src = fs.readFileSync(RUTA, 'utf8')
console.log(`ARCHIVO ${RUTA} (${src.length} bytes)`)
console.log(`ARCHIVO ${RUTA_RET} (${fs.readFileSync(RUTA_RET, 'utf8').length} bytes)`)
const { chk, esperas, fin } = arnes()
const esperar = async () => { for (let i = 0; i < 10; i++) await new Promise(r => setImmediate(r)) }

// ── 1. El archivo común ────────────────────────────────────────────────────

function cargar() {
  const codigo = src.replace(/^import .*$/gm, '').replace(/^export /gm, '')
  const nombres = [...codigo.matchAll(/^(?:async )?(?:function|const|let) ([A-Za-z_$][\w$]*)/gm)].map(m => m[1])
  return new Function('document', 'formatearNumeroAr', codigo + `\nreturn { ${nombres.join(', ')} }`)(undefined, cargarNumeros().formatearNumeroAr)
}
const F = cargar()

function sbFalso(respuestas = {}) {
  const llamadas = []
  return {
    llamadas,
    rpc(nombre, params) {
      llamadas.push([nombre, JSON.parse(JSON.stringify(params ?? null))])
      const r = respuestas[nombre]
      return Promise.resolve(typeof r === 'function' ? r(params, llamadas) : (r ?? { data: null, error: null }))
    },
  }
}

{
  const unidades = new Map([['u-m', 'Mengui'], ['u-d', 'Dolce Pasta']])
  const proveedores = new Map([['pv-1', 'RODRIGO ARRASCAETA']])
  const h = F.origenHabitual({ origen_tipo: 'unidad', origen_unidad_id: 'u-m' }, { unidades, proveedores })
  chk('origen habitual de otra fábrica: tipo, id y nombre', h.tipo === 'unidad' && h.unidadId === 'u-m' && h.proveedorId === null && h.nombre === 'Mengui')
  const p = F.origenHabitual({ origen_tipo: 'proveedor', origen_proveedor_id: 'pv-1' }, { unidades, proveedores })
  chk('origen habitual de un proveedor', p.tipo === 'proveedor' && p.proveedorId === 'pv-1' && p.nombre === 'RODRIGO ARRASCAETA')
  chk('la fábrica', F.origenHabitual({ origen_tipo: 'fabrica' }).tipo === 'fabrica')
  chk('sin origen (null o raro): no se sabe', F.origenHabitual({ origen_tipo: null }).tipo === null && F.origenHabitual({ origen_tipo: 'xx' }).tipo === null && F.origenHabitual(null).tipo === null)
  chk('una unidad sin id no es un origen afuera', F.origenHabitual({ origen_tipo: 'unidad', origen_unidad_id: null }).tipo === null)
  chk('"Vienen de Mengui"', F.textoVienenDe('Mengui') === 'Vienen de Mengui')
  // El prefijo del lote.
  chk('Dolce Pasta → DOLCE', F.prefijoOrigen({ unidadId: 'u-d', nombre: 'Dolce Pasta' }) === 'DOLCE')
  chk('Mengui → MENGUI', F.prefijoOrigen({ unidadId: 'u-m', nombre: 'Mengui' }) === 'MENGUI')
  chk('una fábrica con otro nombre adelante: igual DOLCE / MENGUI', F.prefijoOrigen({ unidadId: 'u-d', nombre: 'Fábrica Dolce Pasta' }) === 'DOLCE' &&
    F.prefijoOrigen({ unidadId: 'u-m', nombre: 'Heladitos Orly (Mengui)' }) === 'MENGUI')
  chk('un proveedor: las primeras 8 letras en mayúsculas sin espacios', F.prefijoOrigen({ proveedorId: 'pv-1', nombre: 'Rodrigo Arrascaeta' }) === 'RODRIGOA')
  chk('sin acentos', F.prefijoOrigen({ proveedorId: 'pv', nombre: 'Lácteos Ñandú' }) === 'LACTEOSN')
  chk('el lote es <PREFIJO>-ddmm', F.loteDeOrigen({ unidadId: 'u-m', nombre: 'Mengui' }, '2026-10-20') === 'MENGUI-2010')
  chk('la planilla: "Máquina 1 · Tarde · lote 6249"', F.textoPlanillaBoton({ maquina: 'Máquina 1', turno: 'Tarde', lote: 6249 }) === 'Máquina 1 · Tarde · lote 6249')
  // Completa o no.
  chk('una planilla necesita el turno', F.origenCompleto({ tipo: 'planilla', turnoId: 't-1' }) && !F.origenCompleto({ tipo: 'planilla' }))
  chk('"se produjo antes" necesita una nota de 3 letras', !F.origenCompleto({ tipo: 'antes', nota: 'ab' }) && !F.origenCompleto({ tipo: 'antes', nota: '   ' }) && F.origenCompleto({ tipo: 'antes', nota: 'abc' }))
  chk('afuera: el nombre y UNA de las dos (fábrica o proveedor)', F.origenCompleto({ tipo: 'afuera', unidadId: 'u', nombre: 'X' }) &&
    !F.origenCompleto({ tipo: 'afuera', unidadId: 'u', proveedorId: 'p', nombre: 'X' }) && !F.origenCompleto({ tipo: 'afuera', nombre: 'X' }) && !F.origenCompleto({ tipo: 'afuera', unidadId: 'u', nombre: '' }))
  chk('sin respuesta, incompleta', !F.origenCompleto(null) && !F.origenCompleto({ tipo: 'otra' }))
  chk('la nota para Administración: se produjo antes', F.notaObservacionOrigen(2, 'Mini', { tipo: 'antes', nota: 'se hizo el lunes' }, true) === 'Renglón 2 (Mini): se produjo antes y no está cargado — se hizo el lunes')
  chk('la nota sin permiso para el ingreso', F.notaObservacionOrigen(1, '', { tipo: 'afuera', unidadId: 'u', nombre: 'Mengui' }, false) === 'Renglón 1: Viene de Mengui, falta cargar el ingreso')
  chk('con permiso, afuera no deja nota (se carga el ingreso)', F.notaObservacionOrigen(1, '', { tipo: 'afuera', unidadId: 'u', nombre: 'Mengui' }, true) === null)
  chk('una planilla no deja nota', F.notaObservacionOrigen(1, '', { tipo: 'planilla', turnoId: 't' }, true) === null)
}

// Los parámetros EXACTOS del ingreso.
{
  const x = { item_id: 'it-1', presentacion_id: 'pr-mini', marca_id: 'm-lolo', faltaron: 5 }
  const origen = { tipo: 'afuera', unidadId: 'u-m', proveedorId: null, nombre: 'Mengui', uuid: 'uu-1' }
  const p = F.parametrosIngresoOrigen({ unidadId: 'u-n', hoy: '2026-10-20', origen, x, codigo: 'N-0042' })
  chk('ingresar_producto_terminado: los parámetros exactos', JSON.stringify(p) === JSON.stringify({
    p_unidad_negocio_id: 'u-n', p_fecha: '2026-10-20', p_proveedor_id: null, p_unidad_origen_id: 'u-m', p_remito: null,
    p_items: [{ presentacion_id: 'pr-mini', marca_id: 'm-lolo', cajas: 5, lote: 'MENGUI-2010' }],
    p_observaciones: 'Faltante de la orden N-0042', p_client_uuid: 'uu-1',
  }), JSON.stringify(p))
  const pv = F.parametrosIngresoOrigen({ unidadId: 'u-n', hoy: '2026-10-20', origen: { tipo: 'afuera', proveedorId: 'pv-1', nombre: 'RODRIGO ARRASCAETA', uuid: 'uu-2' }, x, codigo: 'N-1' })
  chk('de un proveedor: p_proveedor_id y p_unidad_origen_id null', pv.p_proveedor_id === 'pv-1' && pv.p_unidad_origen_id === null && pv.p_items[0].lote === 'RODRIGOA-2010')
}

// El orden de las llamadas, y sin permiso.
esperas.push((async () => {
  const x = { item_id: 'it-1', presentacion_id: 'pr-mini', marca_id: null, faltaron: 5 }
  const origen = { tipo: 'afuera', unidadId: 'u-m', proveedorId: null, nombre: 'Mengui', uuid: 'uu-1' }
  const sb = sbFalso({ ingresar_producto_terminado: { data: { ok: true }, error: null }, faltante_a_lote: { data: null, error: null } })
  const r = await F.resolverOrigen(sb, { x, origen, unidadId: 'u-n', hoy: '2026-10-20', codigo: 'N-0042', puedeIngresar: true })
  chk('afuera: primero el ingreso, después faltante_a_lote', sb.llamadas.map(l => l[0]).join() === 'ingresar_producto_terminado,faltante_a_lote')
  chk('faltante_a_lote con el mismo lote y "Viene de <origen>"', JSON.stringify(sb.llamadas[1][1]) === JSON.stringify({ p_item_id: 'it-1', p_lote: 'MENGUI-2010', p_motivo: 'Viene de Mengui' }))
  chk('queda aceptada en ese lote', r.revision === 'aceptada' && r.lote === 'MENGUI-2010')

  const sb2 = sbFalso()
  const r2 = await F.resolverOrigen(sb2, { x, origen, unidadId: 'u-n', hoy: '2026-10-20', codigo: 'N-0042', puedeIngresar: false })
  chk('sin permiso para el ingreso: no llama a nada y queda pendiente con su nota', sb2.llamadas.length === 0 && r2.revision === 'pendiente' && r2.nota === 'Viene de Mengui, falta cargar el ingreso')

  const sb3 = sbFalso({ faltante_en_produccion: { data: 'en_produccion', error: null } })
  const r3 = await F.resolverOrigen(sb3, { x, origen: { tipo: 'planilla', turnoId: 't-2', maquina: 'Máquina 2', lote: 6237 }, unidadId: 'u-n', hoy: '2026-10-20', codigo: 'N', puedeIngresar: true })
  chk('planilla: faltante_en_produccion(item, turno)', JSON.stringify(sb3.llamadas) === JSON.stringify([['faltante_en_produccion', { p_item_id: 'it-1', p_turno_id: 't-2' }]]) && r3.revision === 'en_produccion')

  const sb4 = sbFalso()
  const r4 = await F.resolverOrigen(sb4, { x, origen: { tipo: 'antes', nota: 'se hizo ayer' }, unidadId: 'u-n', hoy: '2026-10-20', codigo: 'N', puedeIngresar: true })
  chk('se produjo antes: no llama a nada, queda pendiente con la nota', sb4.llamadas.length === 0 && r4.revision === 'pendiente' && /se hizo ayer/.test(r4.nota))

  // Una falla no frena a los demás; el error va tal cual, con el paso.
  const sb5 = sbFalso({
    ingresar_producto_terminado: { data: null, error: { message: 'No tenés permiso para cargar ingresos en esta fábrica.' } },
    faltante_en_produccion: { data: 'en_produccion', error: null },
  })
  const out = await F.resolverOrigenes(sb5, [
    { x, origen, unidadId: 'u-n', hoy: '2026-10-20', codigo: 'N', puedeIngresar: true },
    { x: { ...x, item_id: 'it-2' }, origen: { tipo: 'planilla', turnoId: 't-2' }, unidadId: 'u-n', hoy: '2026-10-20', codigo: 'N', puedeIngresar: true },
  ])
  chk('falla parcial: el primero falla con el mensaje de la base tal cual', out[0].ok === false && out[0].error === 'No tenés permiso para cargar ingresos en esta fábrica.' && out[0].paso === 'ingreso')
  chk('y el segundo se resuelve igual', out[1].ok === true && out[1].resultado.revision === 'en_produccion')
  chk('si falla el ingreso, no se llama a faltante_a_lote', !sb5.llamadas.some(l => l[0] === 'faltante_a_lote'))
})())

// ── 2. La Carga ─────────────────────────────────────────────────────────────

const CAT = {
  productos: [
    { id: 'p-mini', nombre: 'Cucurucho Mini', categoria: 'cucuruchones' },
    { id: 'p-cap', nombre: 'Capelina', categoria: 'barquillos' },
  ],
  presentaciones: [
    { id: 'pr-mini', producto_id: 'p-mini', nombre: 'Caja x 600', con_cono: false, unidades_por_caja: 600, stock_cajas: 10 },
    { id: 'pr-cap', producto_id: 'p-cap', nombre: 'Caja x 200', con_cono: false, unidades_por_caja: 200, stock_cajas: 0 },
  ],
  marcas: [],
  insumos: [],
}
const LOTES = { 'pr-mini': [{ lote: '7001-1', cajas: 10, desde: '2026-09-01' }], 'pr-cap': [] }
const PLANILLAS = [
  { turno_id: 't-3', fecha: '2026-10-20', turno: 'Mañana', maquina: 'Máquina 2', lote: 6248, estado: 'abierto' },
  { turno_id: 't-2', fecha: '2026-10-20', turno: 'Tarde', maquina: 'Máquina 1', lote: 6249, estado: 'abierto' },
]

function nuevo({ tareas = [['retiros:cargar', { unidades: ['u-n'] }]], origenes = [], planillas = PLANILLAS, rpc = {} } = {}) {
  const S = construirRetiros(RUTA_RET)
  S.estado.misTareas = new Map(tareas)
  S.estado.empresaId = 'u-n'
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.estado.clientes = [{ id: 'c1', nombre: 'Anatolia', apodos: [], activo: true }]
  S.estado.origenes = { unidad: 'u-n', mapa: new Map(origenes), error: null }
  S.estado.planillasForm = planillas === null ? null : { unidad: 'u-n', cargando: false, error: null, lista: planillas }
  S.estado.otrosOrigenes = {
    cargando: false, error: null,
    unidades: [{ id: 'u-d', nombre: 'Dolce Pasta' }, { id: 'u-m', nombre: 'Mengui' }, { id: 'u-n', nombre: 'Cucuruchos Nuss' }],
    proveedores: [{ id: 'pv-1', nombre: 'RODRIGO ARRASCAETA' }, { id: 'pv-2', nombre: 'Molino Fénix' }],
  }
  S.__setRpc(async (n, p) => {
    if (rpc[n]) return rpc[n](p)
    if (n === 'lotes_para_retiro') return { data: LOTES[p.p_presentacion_id] ?? [], error: null }
    if (n === 'mis_ordenes_retiro') return { data: [], error: null }
    // planillas: null = todavía no se leyeron (la base tiene las de PLANILLAS).
    if (n === 'planillas_en_curso') return { data: planillas ?? PLANILLAS, error: null }
    return { data: null, error: null }
  })
  S.estado.form = S.formVacio()
  S.elegirCliente('c1')
  return S
}
// Un renglón: el producto y las cajas, con sus lotes ya leídos.
async function renglon(S, i, prod, pres, cajas) {
  if (i > 0) S.agregarRenglon()
  S.elegirProductoRenglon(i, prod, pres, '')
  await esperar()
  S.estado.form.renglones[i].cajas = cajas
  return S.estado.form.renglones[i]
}
const BTN = (accion, extra = {}) => ({ dataset: { rOrigen: accion, ...extra } })
const MENGUI = ['pr-mini', { tipo: 'unidad', unidadId: 'u-m', proveedorId: null, nombre: 'Mengui' }]

esperas.push((async () => {
  // Fábrica con planilla abierta.
  const S = nuevo({ origenes: [['pr-mini', { tipo: 'fabrica', unidadId: null, proveedorId: null, nombre: null }]] })
  const r = await renglon(S, 0, 'p-mini', 'pr-mini', 15)
  chk('faltan 5: el renglón pregunta', S.faltanteProducto(r) === 5 && S.faltaOrigen(r) === true)
  let h = S.htmlOrigenRenglon(r, 0)
  chk('"Hay 10 cajas, faltan 5 cajas. ¿De dónde salen?"', /<strong>Hay 10 cajas, faltan 5 cajas\.<\/strong> ¿De dónde salen\?/.test(h))
  chk('con las planillas abiertas como botones', /data-r-origen="planilla"[^>]*data-turno="t-2"[^>]*>Máquina 1 · Tarde · lote 6249<\/button>/.test(h))
  chk('un producto de la fábrica no ofrece "otro origen"', !/data-r-origen="otro"/.test(h) && !/Se produjo antes/.test(h))
  chk('sin contestar, no se puede confirmar', S.faltanOrden(S.estado.form).includes('Falta decir de dónde salen las cajas del renglón 1.'))
  S.renglonListo(0)
  chk('"Agregar" tampoco cierra el renglón sin contestar', S.estado.form.editando === 0 && r.pedirOrigen === true)
  chk('y se marca en bordó', /rt-origen--falta/.test(S.htmlOrigenRenglon(r, 0)) && /Falta decir de dónde salen las cajas\./.test(S.htmlOrigenRenglon(r, 0)))
  S.accionOrigen(0, 'planilla', BTN('planilla', { turno: 't-2' }))
  chk('elegida la planilla, queda contestado', !S.faltaOrigen(r) && r.origen.tipo === 'planilla' && r.origen.turnoId === 't-2')
  h = S.htmlOrigenRenglon(r, 0)
  chk('la planilla elegida queda marcada', /rt-origen__op--elegido" data-r-origen="planilla"[^>]*aria-pressed="true"/.test(h))
  chk('la tarjeta dice de dónde salen', /Salen de Máquina 1 · Tarde · lote 6249/.test(S.htmlTarjetaRenglon(r, 0, CAT, true)))
  // Cambiar el producto invalida la respuesta.
  const guardado = r.origen
  r.presentacionId = 'pr-cap'
  chk('si cambia el producto, la respuesta ya no vale', S.origenDe(r) === null)
  r.presentacionId = 'pr-mini'
  chk('y vuelve a valer con el mismo', S.origenDe(r) === guardado)
  // Confirmar: una sola orden y faltante_en_produccion con ese turno.
  let llamadas = 0
  S.__setRpc(async (n, p) => {
    if (n === 'registrar_orden_retiro') { llamadas++; return { data: { orden_id: 'o-1', codigo: 'N-0042', stock_insuficiente: [{ renglon: 1, item_id: 'it-1', presentacion_id: 'pr-mini', marca_id: null, producto: 'Cucurucho Mini', presentacion: 'Caja x 600', pedidas: 15, faltaron: 5 }] }, error: null } }
    if (n === 'faltante_en_produccion') return { data: 'en_produccion', error: null }
    if (n === 'mis_ordenes_retiro') return { data: [], error: null }
    return { data: null, error: null }
  })
  await S.confirmar()
  await esperar()
  const nombres = S.__llamadas.rpc.map(x => x[0]).filter(x => x === 'registrar_orden_retiro' || x === 'faltante_en_produccion')
  chk('al confirmar: la orden y después faltante_en_produccion', llamadas === 1 && nombres.join() === 'registrar_orden_retiro,faltante_en_produccion')
  const fp = S.__llamadas.rpc.find(x => x[0] === 'faltante_en_produccion')[1]
  chk('con el renglón y la planilla elegida', fp.p_item_id === 'it-1' && fp.p_turno_id === 't-2')
  chk('la orden dice que espera esa planilla', /Esperando la planilla de Máquina 1 \(lote 6249\)/.test(S.__els.get('rt-hecho').innerHTML))
  chk('y el cartel NO se abre (ya se contestó)', S.estado.falt === null)
})())

esperas.push((async () => {
  // Fábrica sin planillas: "Se produjo antes" con nota obligatoria.
  const S = nuevo({ origenes: [['pr-mini', { tipo: 'fabrica', unidadId: null, proveedorId: null, nombre: null }]], planillas: [] })
  const r = await renglon(S, 0, 'p-mini', 'pr-mini', 15)
  let h = S.htmlOrigenRenglon(r, 0)
  chk('sin planillas: lo dice y ofrece "Se produjo antes y no está cargado"', /No hay ninguna planilla abierta\./.test(h) && /data-r-origen="antes"[^>]*>Se produjo antes y no está cargado</.test(h))
  S.accionOrigen(0, 'antes', BTN('antes'))
  h = S.htmlOrigenRenglon(r, 0)
  chk('elegido, pide la nota', /data-r-origen-nota="0"/.test(h) && S.faltaOrigen(r))
  S.escribirOrigen({ dataset: { rOrigenNota: '0' }, value: 'ab' })
  chk('con 2 letras sigue faltando', S.faltaOrigen(r))
  S.escribirOrigen({ dataset: { rOrigenNota: '0' }, value: 'se hizo el lunes' })
  chk('con la nota, contestado', !S.faltaOrigen(r))
  chk('la nota va a las observaciones (la ve Administración)', S.parametrosRegistrar(S.estado.form).p_observaciones === 'Renglón 1 (Cucurucho Mini · Caja x 600): se produjo antes y no está cargado — se hizo el lunes')
  S.estado.form.observaciones = 'Retira el lunes'
  chk('debajo de lo que se escribió', S.parametrosRegistrar(S.estado.form).p_observaciones.startsWith('Retira el lunes\nRenglón 1'))
  S.__setRpc(async (n) => {
    if (n === 'registrar_orden_retiro') return { data: { orden_id: 'o-1', codigo: 'N-0043', stock_insuficiente: [{ renglon: 1, item_id: 'it-1', presentacion_id: 'pr-mini', faltaron: 5, producto: 'Cucurucho Mini', presentacion: 'Caja x 600' }] }, error: null }
    return { data: [], error: null }
  })
  await S.confirmar()
  await esperar()
  chk('no llama a nada más que la orden', !S.__llamadas.rpc.some(x => ['faltante_en_produccion', 'ingresar_producto_terminado', 'faltante_a_lote'].includes(x[0])))
  chk('queda pendiente para Administración, con la nota', /Pendiente para Administración: Se produjo antes y no está cargado: se hizo el lunes/.test(S.__els.get('rt-hecho').innerHTML))
  chk('y el cartel no se abre', S.estado.falt === null)
})())

esperas.push((async () => {
  // De afuera, con su origen habitual y permiso para el ingreso.
  const S = nuevo({ tareas: [['retiros:cargar', { unidades: ['u-n'] }], ['materia_prima:cargar', { unidades: ['u-n'] }]], origenes: [MENGUI] })
  const r = await renglon(S, 0, 'p-mini', 'pr-mini', 15)
  let h = S.htmlOrigenRenglon(r, 0)
  chk('afuera: un botón "Vienen de Mengui" y el link "Otro origen"', /data-r-origen="habitual"[^>]*>Vienen de Mengui</.test(h) && /data-r-origen="otro"[^>]*>Otro origen</.test(h))
  chk('no ofrece planillas', !/data-r-origen="planilla"/.test(h))
  S.accionOrigen(0, 'habitual', BTN('habitual'))
  const uuid = r.uuidIngreso
  chk('elegido: contestado, con un uuid de ingreso', !S.faltaOrigen(r) && r.origen.unidadId === 'u-m' && /^[0-9a-f-]{36}$/.test(uuid) && r.origen.uuid === uuid)
  const hoy = S.hoyArgentina()
  const lote = `MENGUI-${hoy.slice(8, 10)}${hoy.slice(5, 7)}`
  chk('dice el lote donde entra', new RegExp(`Al confirmar se carga el ingreso de las 5 cajas en el lote ${lote}\\.`).test(S.htmlOrigenRenglon(r, 0)))
  // Elegir otra vez: el mismo uuid.
  S.accionOrigen(0, 'habitual', BTN('habitual'))
  chk('volver a elegir no cambia el uuid', r.uuidIngreso === uuid)
  let ingresos = 0
  S.__setRpc(async (n) => {
    if (n === 'registrar_orden_retiro') return { data: { orden_id: 'o-1', codigo: 'N-0044', stock_insuficiente: [{ renglon: 1, item_id: 'it-1', presentacion_id: 'pr-mini', marca_id: null, faltaron: 5, producto: 'Cucurucho Mini', presentacion: 'Caja x 600' }] }, error: null }
    if (n === 'ingresar_producto_terminado') { ingresos++; return { data: { ok: true }, error: null } }
    if (n === 'faltante_a_lote') return { data: null, error: null }
    return { data: [], error: null }
  })
  await S.confirmar()
  await esperar()
  const seq = S.__llamadas.rpc.map(x => x[0]).filter(x => ['registrar_orden_retiro', 'ingresar_producto_terminado', 'faltante_a_lote'].includes(x))
  chk('el orden: la orden, el ingreso, faltante_a_lote', seq.join() === 'registrar_orden_retiro,ingresar_producto_terminado,faltante_a_lote')
  const ing = S.__llamadas.rpc.find(x => x[0] === 'ingresar_producto_terminado')[1]
  chk('el ingreso con los parámetros exactos', JSON.stringify(ing) === JSON.stringify({
    p_unidad_negocio_id: 'u-n', p_fecha: hoy, p_proveedor_id: null, p_unidad_origen_id: 'u-m', p_remito: null,
    p_items: [{ presentacion_id: 'pr-mini', marca_id: null, cajas: 5, lote }], p_observaciones: 'Faltante de la orden N-0044', p_client_uuid: uuid,
  }), JSON.stringify(ing))
  const fl = S.__llamadas.rpc.find(x => x[0] === 'faltante_a_lote')[1]
  chk('faltante_a_lote con ese lote y "Viene de Mengui"', fl.p_item_id === 'it-1' && fl.p_lote === lote && fl.p_motivo === 'Viene de Mengui')
  chk('la orden dice el lote', new RegExp(`Salieron del lote ${lote}`).test(S.__els.get('rt-hecho').innerHTML))
  chk('con permiso, afuera no va a las observaciones', !S.__llamadas.rpc.find(x => x[0] === 'registrar_orden_retiro')[1].p_observaciones)
  chk('un solo ingreso', ingresos === 1)
})())

esperas.push((async () => {
  // Afuera SIN permiso para el ingreso (Godoy Yanina: solo retiros:cargar).
  const S = nuevo({ origenes: [MENGUI] })
  const r = await renglon(S, 0, 'p-mini', 'pr-mini', 15)
  S.accionOrigen(0, 'habitual', BTN('habitual'))
  chk('lo avisa antes de confirmar', /Con tu usuario no se puede cargar el ingreso: el renglón queda pendiente con la nota «Viene de Mengui, falta cargar el ingreso»\./.test(S.htmlOrigenRenglon(r, 0)))
  chk('y la nota va a las observaciones', S.parametrosRegistrar(S.estado.form).p_observaciones === 'Renglón 1 (Cucurucho Mini · Caja x 600): Viene de Mengui, falta cargar el ingreso')
  S.__setRpc(async (n) => {
    if (n === 'registrar_orden_retiro') return { data: { orden_id: 'o-1', codigo: 'N-0045', stock_insuficiente: [{ renglon: 1, item_id: 'it-1', presentacion_id: 'pr-mini', faltaron: 5, producto: 'Cucurucho Mini', presentacion: 'Caja x 600' }] }, error: null }
    return { data: [], error: null }
  })
  await S.confirmar()
  await esperar()
  chk('sin permiso no se intenta el ingreso (ningún error feo)', !S.__llamadas.rpc.some(x => x[0] === 'ingresar_producto_terminado' || x[0] === 'faltante_a_lote') && S.__llamadas.errores.length === 0)
  chk('queda pendiente con la nota', /Pendiente para Administración: Viene de Mengui, falta cargar el ingreso/.test(S.__els.get('rt-hecho').innerHTML))
  // Con stock:ajustar_inventario también se puede.
  const S2 = nuevo({ tareas: [['retiros:cargar', { unidades: ['u-n'] }], ['stock:ajustar_inventario', { todas: true }]] })
  chk('con stock:ajustar_inventario también se puede cargar el ingreso', S2.puedeIngresarEn('u-n') === true)
  const S3 = nuevo({ tareas: [['retiros:cargar', { unidades: ['u-n'] }], ['materia_prima:cargar', { unidades: ['u-d'] }]] })
  chk('con materia_prima:cargar en OTRA fábrica, no', S3.puedeIngresarEn('u-n') === false)
})())

esperas.push((async () => {
  // Otro origen: otra fábrica o un proveedor.
  const S = nuevo({ tareas: [['retiros:cargar', { unidades: ['u-n'] }], ['materia_prima:cargar', { todas: true }]], origenes: [MENGUI] })
  const r = await renglon(S, 0, 'p-mini', 'pr-mini', 15)
  S.accionOrigen(0, 'otro', BTN('otro'))
  chk('"Otro origen" abre el buscador', r.otroAbierto === true && /data-r-origen-buscar="0"/.test(S.htmlOrigenRenglon(r, 0)))
  let res = S.htmlResultadosOtro(r, 0)
  chk('las otras fábricas del grupo, sin la propia', /data-tipo="unidad" data-id="u-d"[^>]*>Dolce Pasta</.test(res) && /data-id="u-m"/.test(res) && !/data-id="u-n"/.test(res))
  chk('los proveedores, recién al escribir', !/data-tipo="proveedor"/.test(res) && !/Ningún proveedor/.test(res))
  S.escribirOrigen({ dataset: { rOrigenBuscar: '0' }, value: 'rodr' })
  res = S.htmlResultadosOtro(r, 0)
  chk('al escribir aparece el proveedor', /data-tipo="proveedor" data-id="pv-1"[^>]*>RODRIGO ARRASCAETA</.test(res) && !/Molino/.test(res))
  S.accionOrigen(0, 'elegir', BTN('elegir', { tipo: 'proveedor', id: 'pv-1' }))
  chk('elegido el proveedor: contestado', !S.faltaOrigen(r) && r.origen.proveedorId === 'pv-1' && r.origen.unidadId === null && r.otroAbierto === false)
  chk('se ve "Vienen de RODRIGO ARRASCAETA", marcado', /rt-origen__op--elegido" data-r-origen="otro"[^>]*>Vienen de RODRIGO ARRASCAETA</.test(S.htmlOrigenRenglon(r, 0)))
  S.accionOrigen(0, 'otro', BTN('otro'))
  S.accionOrigen(0, 'elegir', BTN('elegir', { tipo: 'unidad', id: 'u-d' }))
  chk('o Dolce Pasta', r.origen.unidadId === 'u-d' && r.origen.nombre === 'Dolce Pasta')
  const hoy = S.hoyArgentina()
  S.__setRpc(async (n) => {
    if (n === 'registrar_orden_retiro') return { data: { orden_id: 'o-1', codigo: 'N-0046', stock_insuficiente: [{ renglon: 1, item_id: 'it-1', presentacion_id: 'pr-mini', faltaron: 5 }] }, error: null }
    return { data: null, error: null }
  })
  await S.confirmar()
  await esperar()
  const ing = S.__llamadas.rpc.find(x => x[0] === 'ingresar_producto_terminado')?.[1]
  chk('el ingreso desde Dolce Pasta, lote DOLCE-ddmm', ing?.p_unidad_origen_id === 'u-d' && ing.p_proveedor_id === null && ing.p_items[0].lote === `DOLCE-${hoy.slice(8, 10)}${hoy.slice(5, 7)}`)
  chk('faltante_a_lote "Viene de Dolce Pasta"', S.__llamadas.rpc.find(x => x[0] === 'faltante_a_lote')?.[1].p_motivo === 'Viene de Dolce Pasta')
})())

esperas.push((async () => {
  // Sin saber de dónde viene (null): las dos alternativas.
  const S = nuevo({ origenes: [] })
  const r = await renglon(S, 0, 'p-mini', 'pr-mini', 15)
  const h = S.htmlOrigenRenglon(r, 0)
  chk('origen null: las planillas Y "Vienen de otro lado"', /data-r-origen="planilla"/.test(h) && /data-r-origen="otro"[^>]*>Vienen de otro lado</.test(h))
  const S2 = nuevo({ origenes: [], planillas: [] })
  const r2 = await renglon(S2, 0, 'p-mini', 'pr-mini', 15)
  const h2 = S2.htmlOrigenRenglon(r2, 0)
  chk('origen null sin planillas: "Se produjo antes" Y "Vienen de otro lado"', /data-r-origen="antes"/.test(h2) && /data-r-origen="otro"/.test(h2))
  // Sin faltante, no se pregunta.
  r.cajas = 8
  chk('sin faltante no hay pregunta ni bloqueo', S.htmlOrigenRenglon(r, 0) === '' && !S.faltaOrigen(r))
  // Si los lotes no se pudieron leer, no se inventa la pregunta.
  S.estado.lotes.set(S.claveLotesRenglon(r), { cargando: false, error: 'x', lista: [] })
  r.cajas = 50
  chk('con los lotes sin leer, no se pregunta', S.faltanteProducto(r) === 0 && !S.faltaOrigen(r))
  // Las planillas se piden una vez, y "Volver a intentar" las vuelve a pedir.
  const S3 = nuevo({ origenes: [], planillas: null })
  const r3 = await renglon(S3, 0, 'p-mini', 'pr-mini', 15)
  S3.pedirLoQueFaltaDelOrigen(r3)
  await esperar()
  S3.pedirLoQueFaltaDelOrigen(r3)
  await esperar()
  chk('las planillas abiertas se leen solas, una vez', S3.__llamadas.rpc.filter(x => x[0] === 'planillas_en_curso').length === 1 && S3.estado.planillasForm.lista.length === PLANILLAS.length)
  S3.accionOrigen(0, 'reintentar-planillas', BTN('reintentar-planillas'))
  await esperar()
  chk('"Volver a intentar" las vuelve a pedir', S3.__llamadas.rpc.filter(x => x[0] === 'planillas_en_curso').length === 2)
})())

esperas.push((async () => {
  // Falla parcial y reintento sin duplicar el ingreso.
  const S = nuevo({ tareas: [['retiros:cargar', { unidades: ['u-n'] }], ['materia_prima:cargar', { unidades: ['u-n'] }]], origenes: [MENGUI] })
  const r0 = await renglon(S, 0, 'p-mini', 'pr-mini', 15)
  S.accionOrigen(0, 'habitual', BTN('habitual'))
  const r1 = await renglon(S, 1, 'p-cap', 'pr-cap', 3)
  S.accionOrigen(1, 'planilla', BTN('planilla', { turno: 't-2' }))
  chk('dos renglones contestados', !S.faltaOrigen(r0) && !S.faltaOrigen(r1) && S.faltanOrden(S.estado.form).length === 0)
  let falla = true
  S.__setRpc(async (n) => {
    if (n === 'registrar_orden_retiro') return { data: { orden_id: 'o-1', codigo: 'N-0047', stock_insuficiente: [
      { renglon: 1, item_id: 'it-1', presentacion_id: 'pr-mini', marca_id: null, faltaron: 5, producto: 'Cucurucho Mini', presentacion: 'Caja x 600' },
      { renglon: 2, item_id: 'it-2', presentacion_id: 'pr-cap', marca_id: null, faltaron: 3, producto: 'Capelina', presentacion: 'Caja x 200' },
    ] }, error: null }
    if (n === 'ingresar_producto_terminado') return falla ? { data: null, error: { message: 'Esa presentación no está activa "><b data-xss="err">' } } : { data: { ok: true }, error: null }
    if (n === 'faltante_en_produccion') return { data: 'en_produccion', error: null }
    if (n === 'faltante_a_lote') return { data: null, error: null }
    return { data: [], error: null }
  })
  await S.confirmar()
  await esperar()
  const h = S.estado.hecho
  chk('la orden queda confirmada aunque falle uno', S.estado.vista === 'rt-vista-hecho' && h.codigo === 'N-0047')
  chk('el que falló: su error tal cual', h.erroresOrigen['it-1'] === 'Esa presentación no está activa "><b data-xss="err">')
  chk('el otro se resolvió igual', h.resueltos['it-2']?.revision === 'en_produccion')
  const html = S.__els.get('rt-hecho').innerHTML
  chk('el error se ve escapado', /No se pudo guardar: Esa presentación no está activa &quot;&gt;&lt;b data-xss=&quot;err&quot;&gt;/.test(html) && !/<b data-xss="err">/.test(html))
  chk('con "Volver a intentar"', /data-falt-reintentar="it-1"/.test(html))
  chk('el que falló queda en el cartel de hoy', S.estado.falt?.cola?.length === 1 && S.estado.falt.cola[0].itemId === 'it-1')
  chk('el cartel dice "Cerrar", no "Dejarlo pendiente" (ya se contestó)', />Cerrar<\/button>/.test(S.__els.get('rt-falt-pie').innerHTML) && !/Dejarlo pendiente/.test(S.__els.get('rt-falt-pie').innerHTML))
  S.cerrarCartelFaltante()
  const uuid1 = S.__llamadas.rpc.find(x => x[0] === 'ingresar_producto_terminado')[1].p_client_uuid
  falla = false
  await S.reintentarOrigen('it-1')
  await esperar()
  const ingresos = S.__llamadas.rpc.filter(x => x[0] === 'ingresar_producto_terminado')
  chk('el reintento manda el MISMO uuid de ingreso (no se duplica)', ingresos.length === 2 && ingresos[1][1].p_client_uuid === uuid1 && uuid1 === r0.uuidIngreso)
  chk('el reintento no vuelve a mandar el que ya estaba', S.__llamadas.rpc.filter(x => x[0] === 'faltante_en_produccion').length === 1)
  chk('resuelto, se va el error', !S.estado.hecho.erroresOrigen['it-1'] && S.estado.hecho.resueltos['it-1']?.revision === 'aceptada')
  const antes = S.__llamadas.rpc.length
  await S.resolverOrigenesDeHecho(S.estado.hecho)
  chk('con todo resuelto, no se vuelve a mandar nada', S.__llamadas.rpc.length === antes)
})())

esperas.push((async () => {
  // Un reintento de la ORDEN (la base no dice qué faltó): se resuelve al leer
  // la orden, con el mismo uuid de ingreso.
  const S = nuevo({ tareas: [['retiros:cargar', { unidades: ['u-n'] }], ['materia_prima:cargar', { unidades: ['u-n'] }]], origenes: [MENGUI] })
  const r = await renglon(S, 0, 'p-mini', 'pr-mini', 15)
  S.accionOrigen(0, 'habitual', BTN('habitual'))
  S.__setRpc(async (n) => {
    if (n === 'registrar_orden_retiro') return { data: { orden_id: 'o-1', codigo: 'N-0048', reintento: true }, error: null }
    if (n === 'mis_ordenes_retiro') return { data: [{ orden_id: 'o-1', codigo: 'N-0048', renglones: [
      { orden: 1, item_id: 'it-1', presentacion_id: 'pr-mini', marca_id: null, revision: 'pendiente', faltante: 5, producto: 'Cucurucho Mini', presentacion: 'Caja x 600', cajas: 15,
        lotes: [{ lote: '7001-1', cajas: 10 }, { lote: 'SIN STOCK', cajas: 5 }] }] }], error: null }
    if (n === 'ingresar_producto_terminado') return { data: { ok: true }, error: null }
    return { data: null, error: null }
  })
  await S.confirmar()
  await esperar()
  const ing = S.__llamadas.rpc.filter(x => x[0] === 'ingresar_producto_terminado')
  chk('en un reintento se carga el ingreso al leer la orden, con el uuid del renglón', ing.length === 1 && ing[0][1].p_client_uuid === r.uuidIngreso && ing[0][1].p_items[0].cajas === 5)
  chk('y faltante_a_lote', S.__llamadas.rpc.some(x => x[0] === 'faltante_a_lote' && x[1].p_item_id === 'it-1'))
})())

// ── 3. Lo de la base va escapado ────────────────────────────────────────────
esperas.push((async () => {
  chk('se leen las tareas de materia prima (para saber si puede cargar el ingreso)', /\.in\('modulo', \['retiros', 'stock', 'produccion', 'materia_prima'\]\)/.test(fs.readFileSync(RUTA_RET, 'utf8')))
  const S = nuevo({ origenes: [['pr-mini', { tipo: 'unidad', unidadId: 'u-m', proveedorId: null, nombre: marca('origen') }]],
    planillas: [{ turno_id: marca('turno'), turno: marca('tturno'), maquina: marca('maquina'), lote: 1 }] })
  const r = await renglon(S, 0, 'p-mini', 'pr-mini', 15)
  S.estado.otrosOrigenes.proveedores = [{ id: marca('provid'), nombre: marca('prov') + 'rodr' }]
  S.estado.otrosOrigenes.unidades = [{ id: marca('uniid'), nombre: marca('uni') }]
  S.accionOrigen(0, 'otro', BTN('otro'))
  const hUni = S.htmlResultadosOtro(r, 0)
  chk('las fábricas van escapadas (id y nombre)', !/<b data-xss="(uni|uniid)">/.test(hUni) && /&lt;b data-xss=&quot;uni&quot;&gt;/.test(hUni) && /data-id="&quot;&gt;&lt;b data-xss=&quot;uniid/.test(hUni))
  S.escribirOrigen({ dataset: { rOrigenBuscar: '0' }, value: 'rodr' })
  const hProv = S.htmlResultadosOtro(r, 0)
  chk('los proveedores van escapados (id y nombre)', !/<b data-xss="(prov|provid)">/.test(hProv) && /&lt;b data-xss=&quot;prov&quot;&gt;/.test(hProv) && /data-id="&quot;&gt;&lt;b data-xss=&quot;provid/.test(hProv))
  S.escribirOrigen({ dataset: { rOrigenBuscar: '0' }, value: marca('busca') })
  const h = S.htmlOrigenRenglon(r, 0) + S.htmlResultadosOtro(r, 0)
  chk('el nombre del origen y lo buscado van escapados', !/<b data-xss="(origen|busca)">/.test(h) && /&lt;b data-xss=&quot;origen&quot;&gt;/.test(h))
  // Sin permiso para el ingreso: la nota con el nombre, escapada.
  S.accionOrigen(0, 'habitual', BTN('habitual'))
  const hSin = S.htmlOrigenRenglon(r, 0)
  chk('la nota sin permiso va escapada', /falta cargar el ingreso/.test(hSin) && !/<b data-xss="origen">/.test(hSin))
  // La nota de "se produjo antes", escapada en su campo.
  S.estado.origenes.mapa = new Map([['pr-mini', { tipo: 'fabrica', unidadId: null, proveedorId: null, nombre: null }]])
  S.estado.planillasForm = { unidad: 'u-n', cargando: false, error: null, lista: [] }
  S.accionOrigen(0, 'antes', BTN('antes'))
  S.escribirOrigen({ dataset: { rOrigenNota: '0' }, value: '</textarea>' + marca('nota') })
  const hNota = S.htmlOrigenRenglon(r, 0)
  chk('la nota va escapada', !/<b data-xss="nota">/.test(hNota) && /&lt;\/textarea&gt;&quot;&gt;&lt;b data-xss=&quot;nota/.test(hNota))
  r.origen = null
  S.estado.origenes.mapa = new Map()
  S.estado.planillasForm = { unidad: 'u-n', cargando: false, error: null, lista: [{ turno_id: marca('turno'), turno: marca('tturno'), maquina: marca('maquina'), lote: 1 }] }
  r.otroAbierto = false
  const h2 = S.htmlOrigenRenglon(r, 0)
  chk('la planilla va escapada', !/<b data-xss="(turno|tturno|maquina)">/.test(h2) && /&lt;b data-xss=&quot;maquina&quot;&gt;/.test(h2))
})())

fin()
