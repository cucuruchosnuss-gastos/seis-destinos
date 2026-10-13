// EL FALTANTE DE UN RETIRO: "¿DE DÓNDE SALEN?" (13/10/2026). Se EJECUTA:
//  1. js/faltante-retiro.js tal cual (sin import/export): los tres caminos
//     —"Se están produciendo" (planillas_en_curso → faltante_en_produccion),
//     "Entró de otro lado" (lotes_para_retiro → faltante_a_lote) y "Otro /
//     ajustar" (resolver_faltante_retiro)—, con qué parámetros llama a la base,
//     que su error va tal cual, que un doble toque manda una vez y que todo
//     texto de la base va escapado.
//  2. La Carga (modulos/retiros.html): al confirmar con faltante de producto
//     terminado se abre el cartel (uno por renglón), la leyenda vieja ya no
//     está, cerrar lo deja pendiente, y "Mis retiros" dice "Esperando la
//     planilla de …".
//  3. Administración (modulos/administracion.html): "Retiros por revisar"
//     tiene los dos botones + "Otro / ajustar", y la orden dice "Esperando la
//     planilla de …".
//  4. Stock: ?vista=traspaso (el link del cartel) lo prueba
//     test-stock-pendientes.js.
//
//   ARCHIVO_TEST=<copia de js/faltante-retiro.js>
//   ARCHIVO_RETIROS=<copia de modulos/retiros.html>
//   ARCHIVO_ADM=<copia de modulos/administracion.html>
'use strict'
process.env.TZ = 'UTC'

const fs = require('fs')
const path = require('path')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')
const { construirRetiros } = require('./sandbox-retiros')
const { construirAdministracion } = require('./sandbox-administracion')
const { cargarNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const RUTA = process.env.ARCHIVO_TEST || path.join(RAIZ, 'js', 'faltante-retiro.js')
const RUTA_RET = process.env.ARCHIVO_RETIROS || path.join(RAIZ, 'modulos', 'retiros.html')
const RUTA_ADM = process.env.ARCHIVO_ADM || path.join(RAIZ, 'modulos', 'administracion.html')
const src = fs.readFileSync(RUTA, 'utf8')
console.log(`ARCHIVO ${RUTA} (${src.length} bytes)`)
console.log(`ARCHIVO ${RUTA_RET} (${fs.readFileSync(RUTA_RET, 'utf8').length} bytes)`)
console.log(`ARCHIVO ${RUTA_ADM} (${fs.readFileSync(RUTA_ADM, 'utf8').length} bytes)`)
const { chk, esperas, fin } = arnes()
const esperar = async () => { for (let i = 0; i < 8; i++) await new Promise(r => setImmediate(r)) }

// ── 1. El archivo común ────────────────────────────────────────────────────

function cargar() {
  const codigo = src.replace(/^import .*$/gm, '').replace(/^export /gm, '')
  const nombres = [...codigo.matchAll(/^(?:async )?(?:function|const|let) ([A-Za-z_$][\w$]*)/gm)].map(m => m[1])
  return new Function('document', 'formatearNumeroAr', codigo + `\nreturn { ${nombres.join(', ')} }`)(undefined, cargarNumeros().formatearNumeroAr)
}
const F = cargar()

const PLANILLAS = [
  { turno_id: 't-2', fecha: '2026-10-13', turno: 'Mañana', maquina: 'Máquina 2', lote: 6237, estado: 'abierto' },
  { turno_id: 't-1', fecha: '2026-10-12', turno: 'Noche', maquina: 'Máquina 1', lote: 6230, estado: 'pendiente_completar' },
]
const ITEM = { itemId: 'it-9', unidadId: 'u-n', presentacionId: 'pr-mini', marcaId: null, texto: 'Cucurucho Mini · Caja x 600', faltan: 5, codigo: 'N-0042' }

// Un doble de supabase: anota cada rpc y responde con `respuestas[nombre]`
// (un valor, o una función de los parámetros).
function sbFalso(respuestas = {}) {
  const llamadas = []
  return {
    llamadas,
    rpc(nombre, params) {
      llamadas.push([nombre, JSON.parse(JSON.stringify(params))])
      const r = respuestas[nombre]
      return Promise.resolve(typeof r === 'function' ? r(params) : (r ?? { data: null, error: null }))
    },
  }
}

function ctxDe(f, sb, extra = {}) {
  const resueltos = []
  let pintadas = 0
  const ctx = { sb, f, repintar: () => { pintadas++ }, puedeAjustar: false, alResolver: (res, item) => resueltos.push([res, item]), ...extra }
  return { ctx, resueltos, pintadas: () => pintadas }
}

// Los textos.
chk('textoPlanilla: máquina, turno y lote', F.textoPlanilla(PLANILLAS[0], '2026-10-13') === 'Máquina 2 · turno Mañana · lote 6237', F.textoPlanilla(PLANILLAS[0], '2026-10-13'))
chk('textoPlanilla: de otro día suma la fecha y "pendiente de completar"', F.textoPlanilla(PLANILLAS[1], '2026-10-13') === 'Máquina 1 · turno Noche · lote 6230 · 12/10 · pendiente de completar', F.textoPlanilla(PLANILLAS[1], '2026-10-13'))
chk('textoEsperando: "Esperando la planilla de Máquina 2 (lote 6237)"', F.textoEsperando({ maquina: 'Máquina 2', lote: 6237 }) === 'Esperando la planilla de Máquina 2 (lote 6237)')
chk('textoEsperando: sin saber la máquina no la inventa', F.textoEsperando(null) === 'Esperando una planilla en curso')
chk('el mensaje de "se están produciendo" es el del pedido',
  F.mensajeProduccion('en_produccion', { maquina: 'Máquina 2' }) === 'Listo: cuando se cierre la planilla de la Máquina 2 se descuentan de su lote.')
chk('si la planilla ya tenía esa producción, dice que ya salieron', /ya salieron del lote que produjo la Máquina 2/.test(F.mensajeProduccion('aceptada', { maquina: 'Máquina 2' })))
chk('una caja va en singular', F.textoCajasFr(1) === '1 caja' && F.textoCajasFr(1200) === '1.200 cajas')
chk('un número ausente es "—", nunca 0', F.enteroFr(null) === '—' && F.enteroFr('') === '—')
{
  const l = F.lotesParaFaltante([{ lote: 'SIN STOCK', cajas: 9 }, { lote: '6230-1', cajas: 3, desde: '2026-10-12' }, { lote: '6301-2', cajas: 8 }, { lote: '9', cajas: 0 }], 5)
  chk('los lotes: sin "SIN STOCK" ni vacíos, y si alcanzan para lo que falta', l.length === 2 && l[0].lote === '6230-1' && l[0].alcanza === false && l[1].alcanza === true, JSON.stringify(l))
}
{
  const f = F.nuevoFaltante({ ...ITEM, itemId: null })
  const sb = sbFalso()
  F.accionFaltante(ctxDe(f, sb).ctx, 'produccion')
  chk('sin el id del renglón no se puede resolver: no llama a la base', !F.puedeResolverFaltante(f) && sb.llamadas.length === 0 && f.paso === 'pregunta')
}

// La pregunta.
{
  const f = F.nuevoFaltante(ITEM)
  const h = F.htmlFaltante(f, { puedeAjustar: false })
  chk('la pregunta: "Faltan 5 cajas de … en stock. ¿De dónde salen?"', /Faltan 5 cajas de Cucurucho Mini · Caja x 600 en stock\./.test(h) && /¿De dónde salen\?/.test(h))
  chk('con los dos botones grandes', /data-fr="produccion"[^>]*>.*Se están produciendo/.test(h) && /data-fr="otro"[^>]*>.*Entró de otro lado/.test(h))
  chk('sin retiros:precios no ofrece "Otro / ajustar"', !/data-fr="ajuste"/.test(h))
  chk('con retiros:precios lo ofrece, chico', /fr-link--chico" data-fr="ajuste">Otro \/ ajustar</.test(F.htmlFaltante(f, { puedeAjustar: true })))
}

// Camino a) Se están produciendo.
esperas.push((async () => {
  const f = F.nuevoFaltante(ITEM)
  const sb = sbFalso({ planillas_en_curso: { data: PLANILLAS, error: null }, faltante_en_produccion: { data: 'en_produccion', error: null } })
  const { ctx, resueltos } = ctxDe(f, sb)
  await F.accionFaltante(ctx, 'produccion')
  chk('a) pide las planillas en curso de la fábrica de la orden', JSON.stringify(sb.llamadas[0]) === JSON.stringify(['planillas_en_curso', { p_unidad_negocio_id: 'u-n' }]))
  const h = F.htmlFaltante(f, { hoy: '2026-10-13' })
  chk('a) lista "Máquina 2 · turno Mañana · lote 6237"', /data-fr="planilla" data-fr-valor="t-2"[^>]*>Máquina 2 · turno Mañana · lote 6237</.test(h), h)
  const p = F.accionFaltante(ctx, 'planilla', 't-2')
  F.accionFaltante(ctx, 'planilla', 't-2')
  await p
  await esperar()
  const llamadas = sb.llamadas.filter(l => l[0] === 'faltante_en_produccion')
  chk('a) llama a faltante_en_produccion con el renglón y la planilla', llamadas.length === 1 && JSON.stringify(llamadas[0][1]) === JSON.stringify({ p_item_id: 'it-9', p_turno_id: 't-2' }), JSON.stringify(llamadas))
  chk('a) un doble toque manda una sola vez', llamadas.length === 1)
  chk('a) dice el mensaje del pedido', f.paso === 'listo' && f.resultado.mensaje === 'Listo: cuando se cierre la planilla de la Máquina 2 se descuentan de su lote.')
  chk('a) avisa a la pantalla con la revisión, la planilla y el renglón', resueltos.length === 1 && resueltos[0][0].revision === 'en_produccion' && resueltos[0][0].planilla.maquina === 'Máquina 2' && resueltos[0][0].planilla.lote === 6237 && resueltos[0][1].itemId === 'it-9')
  chk('a) el "listo" se ve', /Listo: cuando se cierre/.test(F.htmlFaltante(f)))
})())
esperas.push((async () => {
  const f = F.nuevoFaltante(ITEM)
  const sb = sbFalso({ planillas_en_curso: { data: PLANILLAS, error: null }, faltante_en_produccion: { data: 'aceptada', error: null } })
  const { ctx } = ctxDe(f, sb)
  await F.accionFaltante(ctx, 'produccion')
  await F.accionFaltante(ctx, 'planilla', 't-2')
  chk('a) si la planilla ya tenía esa producción: aceptada y lo dice', f.resultado.revision === 'aceptada' && /ya salieron del lote que produjo la Máquina 2/.test(f.resultado.mensaje))
})())
esperas.push((async () => {
  const f = F.nuevoFaltante(ITEM)
  const sb = sbFalso({ planillas_en_curso: { data: PLANILLAS, error: null }, faltante_en_produccion: { data: null, error: { message: 'Esa planilla ya está cerrada: si la mercadería salió de ahí, ya tendría que estar en el stock.' } } })
  const { ctx, resueltos } = ctxDe(f, sb)
  await F.accionFaltante(ctx, 'produccion')
  await F.accionFaltante(ctx, 'planilla', 't-2')
  chk('a) el error de la base va TAL CUAL y el panel sigue', f.paso === 'produccion' && f.error === 'Esa planilla ya está cerrada: si la mercadería salió de ahí, ya tendría que estar en el stock.' && !f.enviando && resueltos.length === 0)
  chk('a) y se ve pegado', /class="fr-error" role="alert">Esa planilla ya está cerrada/.test(F.htmlFaltante(f)))
})())
esperas.push((async () => {
  const f = F.nuevoFaltante(ITEM)
  const sb = sbFalso({ planillas_en_curso: { data: [], error: null } })
  const { ctx } = ctxDe(f, sb)
  await F.accionFaltante(ctx, 'produccion')
  chk('a) sin planillas abiertas lo dice (no un panel vacío)', /No hay ninguna planilla abierta en esta fábrica/.test(F.htmlFaltante(f)))
  const g = F.nuevoFaltante(ITEM)
  const c2 = ctxDe(g, sbFalso({ planillas_en_curso: { data: null, error: { message: 'x' } } })).ctx
  await F.accionFaltante(c2, 'produccion')
  chk('a) si no se pueden leer las planillas lo dice, con volver a intentar', /No se pudieron leer las planillas abiertas/.test(F.htmlFaltante(g)) && /data-fr="produccion">Volver a intentar/.test(F.htmlFaltante(g)))
  F.accionFaltante(c2, 'volver')
  chk('a) volver desde las planillas vuelve a la pregunta', g.paso === 'pregunta')
  let cerro = 0
  const h = F.nuevoFaltante(ITEM)
  const c3 = ctxDe(h, sbFalso({ planillas_en_curso: { data: [], error: null } }), { alVolverAlPrincipio: () => { cerro++ } }).ctx
  await F.accionFaltante(c3, 'produccion')
  F.accionFaltante(c3, 'volver')
  chk('a) en Administración, volver al principio cierra el panel', cerro === 1)
})())

// Camino b) Entró de otro lado.
esperas.push((async () => {
  const f = F.nuevoFaltante({ ...ITEM, marcaId: 'm-lolo' })
  const sb = sbFalso({
    lotes_para_retiro: { data: [{ lote: '6230-1', cajas: 3, desde: '2026-10-12' }, { lote: 'D-0099', cajas: 8, desde: '2026-10-13' }, { lote: 'SIN STOCK', cajas: -5 }], error: null },
    faltante_a_lote: { data: null, error: null },
  })
  const { ctx, resueltos } = ctxDe(f, sb)
  F.accionFaltante(ctx, 'otro')
  let h = F.htmlFaltante(f, { linkTraspaso: 'stock.html?vista=traspaso' })
  chk('b) explica que primero hay que cargar el traspaso o el ingreso', /Primero hay que cargar lo que entró/.test(h) && /traspaso de producto terminado/.test(h) && /el ingreso/.test(h))
  chk('b) ofrece ir al traspaso, en otra pestaña (se vuelve a esta)', /<a class="fr-boton fr-boton--secundario" href="stock\.html\?vista=traspaso" target="_blank" rel="noopener">Ir al traspaso de producto terminado<\/a>/.test(h))
  chk('b) y "Ya está cargado: elegir el lote"', /data-fr="lote">Ya está cargado: elegir el lote</.test(h))
  await F.accionFaltante(ctx, 'lote')
  chk('b) busca los lotes de esa presentación y ese cono', JSON.stringify(sb.llamadas[0]) === JSON.stringify(['lotes_para_retiro', { p_unidad_negocio_id: 'u-n', p_presentacion_id: 'pr-mini', p_marca_id: 'm-lolo' }]))
  h = F.htmlFaltante(f)
  chk('b) el lote que no alcanza se ve pero no se elige', /data-fr-valor="6230-1" aria-pressed="false" disabled/.test(h) && /tiene 3 cajas y faltan 5 cajas/.test(h), h)
  chk('b) con UN lote que alcanza, viene elegido', f.loteElegido === 'D-0099' && /data-fr-valor="D-0099" aria-pressed="true"/.test(h))
  F.accionFaltante(ctx, 'elegir-lote', '6230-1')
  chk('b) tocar un lote que no alcanza no hace nada', f.loteElegido === 'D-0099')
  await F.accionFaltante(ctx, 'confirmar-lote')
  chk('b) sin motivo no llama a la base y lo dice', !sb.llamadas.some(l => l[0] === 'faltante_a_lote') && /Escribí de dónde vino/.test(f.error))
  F.escribirMotivoFaltante(ctx, '  Traspaso desde Dolce Pasta  ')
  const p = F.accionFaltante(ctx, 'confirmar-lote')
  F.accionFaltante(ctx, 'confirmar-lote')
  await p
  const ll = sb.llamadas.filter(l => l[0] === 'faltante_a_lote')
  chk('b) llama a faltante_a_lote con el renglón, el lote y el motivo limpio', ll.length === 1 && JSON.stringify(ll[0][1]) === JSON.stringify({ p_item_id: 'it-9', p_lote: 'D-0099', p_motivo: 'Traspaso desde Dolce Pasta' }), JSON.stringify(ll))
  chk('b) dice de qué lote salieron', f.paso === 'listo' && f.resultado.mensaje === 'Listo: las 5 cajas salieron del lote D-0099.' && resueltos[0][0].lote === 'D-0099')
})())
esperas.push((async () => {
  const f = F.nuevoFaltante(ITEM)
  const sb = sbFalso({
    lotes_para_retiro: { data: [{ lote: 'D-0099', cajas: 8 }, { lote: 'D-0100', cajas: 9 }], error: null },
    faltante_a_lote: { data: null, error: { message: 'El lote D-0100 tiene 2 cajas y faltan 5. Primero cargá el ingreso completo.' } },
  })
  const { ctx } = ctxDe(f, sb)
  F.accionFaltante(ctx, 'otro')
  await F.accionFaltante(ctx, 'lote')
  chk('b) con varios lotes que alcanzan no elige ninguno solo', f.loteElegido === null)
  F.accionFaltante(ctx, 'elegir-lote', 'D-0100')
  F.escribirMotivoFaltante(ctx, 'traspaso')
  await F.accionFaltante(ctx, 'confirmar-lote')
  chk('b) el error de la base va tal cual', f.error === 'El lote D-0100 tiene 2 cajas y faltan 5. Primero cargá el ingreso completo.' && f.paso === 'lote' && !f.enviando)
  F.accionFaltante(ctx, 'volver')
  chk('b) volver desde los lotes vuelve a la explicación', f.paso === 'otro')
  const g = F.nuevoFaltante(ITEM)
  const c2 = ctxDe(g, sbFalso({ lotes_para_retiro: { data: [], error: null } })).ctx
  F.accionFaltante(c2, 'otro')
  await F.accionFaltante(c2, 'lote')
  chk('b) sin lotes con stock dice que primero hay que cargarlo', /Todavía no hay ningún lote con stock de esto/.test(F.htmlFaltante(g)) && !/data-fr="confirmar-lote"/.test(F.htmlFaltante(g)))
})())

// Camino c) Otro / ajustar.
esperas.push((async () => {
  const f = F.nuevoFaltante(ITEM)
  const sb = sbFalso({ resolver_faltante_retiro: { data: null, error: null } })
  const sinPermiso = ctxDe(f, sb).ctx
  F.accionFaltante(sinPermiso, 'ajuste')
  chk('c) sin retiros:precios el ajuste no se abre', f.paso === 'pregunta')
  const { ctx, resueltos } = ctxDe(f, sb, { puedeAjustar: true })
  F.accionFaltante(ctx, 'ajuste')
  chk('c) con retiros:precios abre el ajuste', f.paso === 'ajuste' && /Ajustar con este motivo/.test(F.htmlFaltante(f, { puedeAjustar: true })))
  F.escribirMotivoFaltante(ctx, 'ab')
  await F.accionFaltante(ctx, 'confirmar-ajuste')
  chk('c) motivo de menos de 3 letras: no llama y lo dice', sb.llamadas.length === 0 && /Escribí qué pasó/.test(f.error))
  F.escribirMotivoFaltante(ctx, 'se compró y no se cargó')
  await F.accionFaltante(ctx, 'confirmar-ajuste')
  chk('c) llama a resolver_faltante_retiro (el ajuste de siempre)', JSON.stringify(sb.llamadas[0]) === JSON.stringify(['resolver_faltante_retiro', { p_item_id: 'it-9', p_motivo: 'se compró y no se cargó' }]))
  chk('c) y queda resuelto', f.paso === 'listo' && resueltos[0][0].ajuste === true)
})())

// Todo texto de la base va escapado.
esperas.push((async () => {
  const it = { ...ITEM, texto: marca('texto'), codigo: marca('codigo') }
  const f = F.nuevoFaltante(it)
  chequearMarcas(chk, 'pregunta', F.htmlFaltante(f, { puedeAjustar: true }), ['texto'])
  const sb = sbFalso({
    planillas_en_curso: { data: [{ turno_id: marca('turno-id'), fecha: '2026-10-13', turno: marca('turno'), maquina: marca('maquina'), lote: marca('lote'), estado: 'abierto' }], error: null },
    lotes_para_retiro: { data: [{ lote: marca('lote-stock'), cajas: 9 }], error: null },
    faltante_a_lote: { data: null, error: { message: marca('error') } },
  })
  const { ctx } = ctxDe(f, sb)
  await F.accionFaltante(ctx, 'produccion')
  chequearMarcas(chk, 'planillas', F.htmlFaltante(f, { hoy: '2026-10-13' }), ['turno-id', 'turno', 'maquina', 'lote', 'texto'])
  F.accionFaltante(ctx, 'volver')
  F.accionFaltante(ctx, 'otro')
  chequearMarcas(chk, 'otro lado', F.htmlFaltante(f, { linkTraspaso: marca('link') }), ['link'])
  await F.accionFaltante(ctx, 'lote')
  F.escribirMotivoFaltante(ctx, marca('motivo'))
  await F.accionFaltante(ctx, 'confirmar-lote')
  chequearMarcas(chk, 'lotes', F.htmlFaltante(f), ['lote-stock', 'motivo', 'error', 'texto'])
  f.paso = 'ajuste'
  chequearMarcas(chk, 'ajuste', F.htmlFaltante(f, { puedeAjustar: true }), ['motivo', 'error'])
  f.paso = 'listo'; f.resultado = { mensaje: marca('mensaje') }
  chequearMarcas(chk, 'listo', F.htmlFaltante(f), ['mensaje'])
  chk('esperando: la máquina se escapa en la pantalla (textoEsperando devuelve texto plano)', F.textoEsperando({ maquina: '<b>' }) === 'Esperando la planilla de <b>')
})())

// ── 2. La Carga ────────────────────────────────────────────────────────────

const CAT = {
  productos: [{ id: 'p-mini', nombre: 'Cucurucho Mini', categoria: 'cucuruchones' }],
  presentaciones: [
    { id: 'pr-mini', producto_id: 'p-mini', nombre: 'Caja x 600', con_cono: false, unidades_por_caja: 600, stock_cajas: 2 },
    { id: 'pr-mini-c', producto_id: 'p-mini', nombre: 'Caja x 600 con cono', con_cono: true, unidades_por_caja: 600, stock_cajas: 2 },
  ],
  marcas: [{ id: 'm-lolo', nombre: 'LOLO', estado_alta: 'aprobada' }],
  insumos: [{ id: 'i-har', nombre: 'Harina 000', marca: 'Molino', categoria: 'Harinas', unidad_medida: 'kg', stock: 1 }],
}
function carga({ insuficiente, rpcExtra = {}, reintento = false, tareas = null } = {}) {
  const S = construirRetiros(RUTA_RET)
  if (tareas) S.estado.misTareas = tareas
  S.estado.empresaId = 'u-n'
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.estado.clientes = [{ id: 'c1', nombre: 'Distribuidora Anatolia', apodos: [], activo: true }]
  S.estado.form = S.formVacio()
  S.elegirCliente('c1')
  S.elegirProductoRenglon(0, 'p-mini')
  S.estado.form.renglones[0].presentacionId = 'pr-mini'
  S.estado.form.renglones[0].cajas = 7
  S.__setRpc(async (n, p) => {
    if (n === 'registrar_orden_retiro') return { data: reintento ? { orden_id: 'o-1', codigo: 'N-0042', reintento: true } : { orden_id: 'o-1', numero: 42, codigo: 'N-0042', stock_insuficiente: insuficiente }, error: null }
    if (rpcExtra[n]) return typeof rpcExtra[n] === 'function' ? rpcExtra[n](p) : rpcExtra[n]
    return { data: [], error: null }
  })
  return S
}
const INSUF = [{ renglon: 1, item_id: 'it-1', producto: 'Cucurucho Mini', presentacion: 'Caja x 600', pedidas: 7, faltaron: 5 }]

esperas.push((async () => {
  const S = carga({ insuficiente: INSUF, rpcExtra: { planillas_en_curso: { data: PLANILLAS, error: null }, faltante_en_produccion: { data: 'en_produccion', error: null } } })
  await S.confirmar()
  await esperar()
  chk('Carga: al confirmar con faltante se abre el cartel', S.__els.get('rt-falt').hidden === false && S.estado.falt?.f?.item?.itemId === 'it-1')
  const cuerpo = S.__els.get('rt-falt-cuerpo').innerHTML
  chk('Carga: "Faltan 5 cajas de Cucurucho Mini · Caja x 600 en stock. ¿De dónde salen?"', /Faltan 5 cajas de Cucurucho Mini · Caja x 600 en stock\./.test(cuerpo) && /¿De dónde salen\?/.test(cuerpo))
  chk('Carga: la presentación y el cono salen del renglón que se mandó', S.estado.falt.f.item.presentacionId === 'pr-mini' && S.estado.falt.f.item.marcaId === null && S.estado.falt.f.item.unidadId === 'u-n')
  chk('Carga: se puede dejar pendiente', /data-falt-pie="cerrar"[^>]*>Dejarlo pendiente</.test(S.__els.get('rt-falt-pie').innerHTML))
  chk('Carga: sin retiros:precios no ofrece "Otro / ajustar"', !/data-fr="ajuste"/.test(cuerpo))
  const hecho = S.__els.get('rt-hecho').innerHTML
  chk('Carga: la leyenda vieja de abajo ya no está', !/No había stock de todo/.test(hecho) && !/salió igual/.test(hecho) && !/rt-aviso--grave/.test(hecho))
  chk('Carga: la orden dice qué faltó, neutro y con el botón', /Lo que no estaba en stock/.test(hecho) && /data-falt-abrir="it-1"/.test(hecho))
  await S.accionFaltante(S.ctxFaltante(), 'produccion')
  chk('Carga: pide las planillas de la empresa de la orden', S.__llamadas.rpc.some(r => r[0] === 'planillas_en_curso' && r[1].p_unidad_negocio_id === 'u-n'))
  await S.accionFaltante(S.ctxFaltante(), 'planilla', 't-2')
  await esperar()
  const h2 = S.__els.get('rt-hecho').innerHTML
  chk('Carga: la orden ahora dice "Esperando la planilla de Máquina 2 (lote 6237)"', /Esperando la planilla de Máquina 2 \(lote 6237\)/.test(h2) && !/data-falt-abrir="it-1"/.test(h2), h2)
  chk('Carga: el cartel dice el mensaje y "Listo"', /cuando se cierre la planilla de la Máquina 2/.test(S.__els.get('rt-falt-cuerpo').innerHTML) && /data-falt-pie="cerrar"[^>]*>Listo</.test(S.__els.get('rt-falt-pie').innerHTML))
  S.cerrarCartelFaltante()
  chk('Carga: cerrar esconde el cartel', S.__els.get('rt-falt').hidden === true && S.estado.falt === null)
})())
esperas.push((async () => {
  const S = carga({ insuficiente: INSUF })
  await S.confirmar()
  S.cerrarCartelFaltante()
  const h = S.__els.get('rt-hecho').innerHTML
  chk('Carga: cerrar sin elegir lo deja como hoy: pendiente, para Administración, con el botón para volver', /Pendiente: queda para revisar en Administración/.test(h) && /data-falt-abrir="it-1"/.test(h))
  chk('Carga: y nada se mandó a la base', !S.__llamadas.rpc.some(r => /faltante/.test(r[0])))
  S.abrirFaltantesDeHecho('it-1')
  chk('Carga: "¿De dónde salen?" vuelve a abrir el cartel', S.__els.get('rt-falt').hidden === false)
})())
esperas.push((async () => {
  const S = carga({ insuficiente: [...INSUF, { renglon: 2, item_id: 'it-2', producto: 'Cucurucho Mini', presentacion: 'Caja x 600 con cono', pedidas: 4, faltaron: 4 }, { renglon: 3, item_id: 'it-3', insumo: 'Harina 000', unidad: 'kg', pedidas: 30, faltaron: 29 }] })
  await S.confirmar()
  chk('Carga: un cartel POR RENGLÓN de producto (los insumos no)', S.estado.falt.cola.length === 2 && /Faltante 1 de 2/.test(S.__els.get('rt-falt-paso').textContent))
  S.estado.falt.f.paso = 'listo'; S.estado.falt.f.resultado = { mensaje: 'ok' }
  S.pintarCartelFaltante()
  chk('Carga: después del primero, "Siguiente faltante"', /data-falt-pie="siguiente"/.test(S.__els.get('rt-falt-pie').innerHTML))
  S.pasarAlSiguienteFaltante()
  chk('Carga: el siguiente es el renglón 2', S.estado.falt.f.item.itemId === 'it-2' && /Faltante 2 de 2/.test(S.__els.get('rt-falt-paso').textContent))
  const h = S.__els.get('rt-hecho').innerHTML
  chk('Carga: el insumo que faltó se lista, sin botón', /Harina 000 · faltaban 29 kg/.test(h) && !/data-falt-abrir="it-3"/.test(h))
})())
esperas.push((async () => {
  const S = carga({ insuficiente: [{ renglon: 1, producto: 'Cucurucho Mini', presentacion: 'Caja x 600', pedidas: 7, faltaron: 5 }] })
  await S.confirmar()
  const h = S.__els.get('rt-hecho').innerHTML
  chk('Carga: si la base no manda el id del renglón, no abre el cartel y queda pendiente (sin botón)', S.estado.falt === null && /Pendiente: queda para revisar/.test(h) && !/data-falt-abrir/.test(h))
  const R = carga({ insuficiente: null, reintento: true })
  await R.confirmar()
  chk('Carga: un reintento no abre el cartel', R.estado.falt === null)
  const T = carga({ insuficiente: [] })
  await T.confirmar()
  chk('Carga: sin faltantes no hay cartel ni lista', T.estado.falt === null && !/Lo que no estaba en stock/.test(T.__els.get('rt-hecho').innerHTML))
  S.abrirFaltantesDeHecho('it-1')
  S.estado.hecho.faltantes = INSUF
  S.estado.hecho.reintento = true
  chk('Carga: en un reintento no se abre el cartel aunque haya faltantes', S.abrirFaltantesDeHecho() === false)
  const Q = carga({ insuficiente: INSUF })
  await Q.confirmar()
  await Q.accionFaltante(Q.ctxFaltante(), 'ajuste')
  chk('Carga: sin retiros:precios el ajuste no se abre (aunque se lo pida)', Q.estado.falt.f.paso === 'pregunta')
  const P = carga({ insuficiente: INSUF, tareas: new Map([['retiros:cargar', { unidades: ['u-n'] }], ['retiros:precios', { unidades: ['u-n'] }]]) })
  await P.confirmar()
  chk('Carga: con retiros:precios en la empresa ofrece "Otro / ajustar"', /data-fr="ajuste"/.test(P.__els.get('rt-falt-cuerpo').innerHTML))
})())
esperas.push((async () => {
  // Con cono: el cono del renglón viaja a los lotes.
  const S = carga({ insuficiente: [{ renglon: 1, item_id: 'it-1', producto: 'Cucurucho Mini', presentacion: 'Caja x 600 con cono', pedidas: 7, faltaron: 5 }] })
  S.estado.form = null
  const T = construirRetiros(RUTA_RET)
  const d = T.faltantesDeProducto([{ renglon: 1, item_id: 'x', producto: 'A', presentacion: 'B', faltaron: 2 }], [{ presentacionId: 'pr-c', marcaId: 'm-lolo' }], 'u-n', 'N-1')
  chk('Carga: el cono del renglón (con cono) va a la búsqueda de lotes', d[0].presentacionId === 'pr-c' && d[0].marcaId === 'm-lolo')
  const e = T.faltantesDeProducto([{ renglon: 1, item_id: 'x', presentacion_id: 'pr-b', marca_id: null, faltaron: 2 }], [{ presentacionId: 'pr-c', marcaId: 'm-lolo' }], 'u-n', 'N-1')
  chk('Carga: si la base manda la presentación y el cono, mandan esos', e[0].presentacionId === 'pr-b' && e[0].marcaId === null)
  chk('Carga: renglonesMandados: sin cono no manda la marca', JSON.stringify(T.renglonesMandados({ renglones: [{ presentacionId: 'p', conCono: false, marcaId: 'm' }, { insumoId: 'i' }] })) === JSON.stringify([{ presentacionId: 'p', marcaId: null }, { insumo: true }]))
})())
esperas.push((async () => {
  // Mis retiros: un renglón que espera una planilla, y uno pendiente.
  const S = construirRetiros(RUTA_RET)
  S.estado.empresaId = 'u-n'
  S.__setRpc(async (n) => n === 'planillas_en_curso' ? { data: PLANILLAS, error: null } : { data: [], error: null })
  const o = { orden_id: 'o-1', codigo: 'N-0042', estado: 'confirmada', cliente: 'X', renglones: [
    { tipo: 'producto', item_id: 'it-1', producto: 'Mini', presentacion: 'Caja', cajas: 5, unidades: 3000, lotes: [], revision: 'en_produccion', turno_produccion_id: 't-2', faltante: 5, presentacion_id: 'pr-mini' },
    { tipo: 'producto', item_id: 'it-2', producto: 'Mini', presentacion: 'Caja', cajas: 2, unidades: 1200, lotes: [], revision: 'pendiente', faltante: 2, presentacion_id: 'pr-mini', revision_motivo: 'La planilla Máquina 1 (lote 6230) cerró y faltan 2 cajas sin lote' },
  ] }
  S.estado.mis = [o]
  S.abrirMia('o-1')
  await esperar()
  const h = S.__els.get('rt-mio-cuerpo').innerHTML
  chk('Mis retiros: "Esperando la planilla de Máquina 2 (lote 6237)" (no es un error)', /rt-item-mio__estado">Esperando la planilla de Máquina 2 \(lote 6237\)/.test(h), h)
  chk('Mis retiros: el pendiente dice por qué y tiene el botón', /rt-item-mio__estado--pend">Faltaban 2 cajas: queda para revisar en Administración · La planilla Máquina 1 \(lote 6230\) cerró/.test(h) && /data-falt-mio="it-2"/.test(h))
  S.abrirFaltanteMio('it-2')
  chk('Mis retiros: el botón abre el cartel de ese renglón', S.estado.falt?.f?.item?.itemId === 'it-2' && S.estado.falt.f.item.faltan === 2)
})())

// ── 3. Administración ──────────────────────────────────────────────────────

const FILAS = [
  { item_id: 'it-1', orden_id: 'o1', codigo: 'N-0042', fecha: '2026-10-13', cliente: 'Distribuidora Anatolia', que: 'Cucurucho Mini · Caja x 600', pedidas: 7, faltante: 5, unidad: 'cajas', cargada_por: 'Emanuel Romero' },
  { item_id: 'it-2', orden_id: 'o2', codigo: 'N-0043', fecha: '2026-10-13', cliente: 'Kiosco Pepe', que: 'Harina 000', pedidas: 30, faltante: 29, unidad: 'kg', cargada_por: 'Franco' },
]
function adm({ rpc = {}, items = [{ id: 'it-1', presentacion_id: 'pr-mini', marca_id: null }] } = {}) {
  const S = construirAdministracion(RUTA_ADM)
  S.__tablas.orden_retiro_items = items
  S.__setRpc(async (n, p) => {
    if (n === 'retiros_por_revisar') return { data: FILAS.map(f => ({ ...f })), error: null }
    if (rpc[n]) return typeof rpc[n] === 'function' ? rpc[n](p) : rpc[n]
    return { data: null, error: null }
  })
  return S
}
esperas.push((async () => {
  const S = adm({ rpc: { planillas_en_curso: { data: PLANILLAS, error: null }, faltante_en_produccion: { data: 'en_produccion', error: null } } })
  await S.mostrarRevisar()
  await esperar()
  let h = S.__els.get('ad-revisar-lista').innerHTML
  chk('Admin: un renglón de producto tiene los dos botones y "Otro / ajustar"', /data-revisar-produccion="it-1">Se están produciendo/.test(h) && /data-revisar-otro="it-1">Entró de otro lado/.test(h) && /data-revisar-aceptar="it-1">Otro \/ ajustar/.test(h))
  chk('Admin: uno de insumo, solo el aceptar de siempre', /data-revisar-aceptar="it-2">Aceptar/.test(h) && !/data-revisar-produccion="it-2"/.test(h))
  chk('Admin: la presentación del renglón se completa de orden_retiro_items', S.estado.revisar.filas[0].presentacion_id === 'pr-mini')
  S.abrirFaltanteRevisar('it-1', 'produccion')
  await esperar()
  h = S.__els.get('ad-revisar-lista').innerHTML
  chk('Admin: "Se están produciendo" abre las planillas adentro de la tarjeta', /ad-panel ad-falt/.test(h) && /Máquina 2 · turno Mañana · lote 6237/.test(h))
  await S.accionFaltante(S.ctxFaltanteRevisar(), 'planilla', 't-2')
  await esperar()
  const ll = S.__llamadas.rpc.find(r => r[0] === 'faltante_en_produccion')
  chk('Admin: llama a faltante_en_produccion', ll && JSON.stringify(ll[1]) === JSON.stringify({ p_item_id: 'it-1', p_turno_id: 't-2' }))
  h = S.__els.get('ad-revisar-lista').innerHTML
  chk('Admin: el renglón sale de la lista y se dice qué pasó', !/data-revisar="it-1"/.test(h) && /N-0042 · Cucurucho Mini · Caja x 600: Listo: cuando se cierre la planilla de la Máquina 2/.test(h))
})())
esperas.push((async () => {
  const S = adm({ items: [] })
  await S.mostrarRevisar()
  await esperar()
  const h = S.__els.get('ad-revisar-lista').innerHTML
  chk('Admin: sin poder leer el producto, "Entró de otro lado" queda apagado y dice por qué', /data-revisar-otro="it-1" disabled title="No se pudo leer qué producto es/.test(h))
  S.abrirFaltanteRevisar('it-1', 'otro')
  chk('Admin: y no se abre', !S.estado.revisar.falt)
  const T = adm({ rpc: { lotes_para_retiro: { data: [{ lote: 'D-0099', cajas: 9 }], error: null }, faltante_a_lote: { data: null, error: null } } })
  await T.mostrarRevisar()
  await esperar()
  T.abrirFaltanteRevisar('it-1', 'otro')
  chk('Admin: "Entró de otro lado" explica y ofrece el traspaso', /stock\.html\?vista=traspaso/.test(T.__els.get('ad-revisar-lista').innerHTML))
  await T.accionFaltante(T.ctxFaltanteRevisar(), 'lote')
  T.escribirMotivoFaltante(T.ctxFaltanteRevisar(), 'traspaso desde Dolce Pasta')
  await T.accionFaltante(T.ctxFaltanteRevisar(), 'confirmar-lote')
  const ll = T.__llamadas.rpc.find(r => r[0] === 'faltante_a_lote')
  chk('Admin: llama a faltante_a_lote con el lote elegido', ll && ll[1].p_lote === 'D-0099' && ll[1].p_item_id === 'it-1')
  T.abrirFaltanteRevisar('it-1', 'produccion')
  chk('Admin: un renglón ya resuelto no abre nada', !T.estado.revisar.falt)
  const U = adm()
  await U.mostrarRevisar()
  await esperar()
  U.abrirFaltanteRevisar('it-1', 'otro')
  U.accionFaltante(U.ctxFaltanteRevisar(), 'volver')
  chk('Admin: volver desde la explicación cierra el panel (los botones están en la tarjeta)', !U.estado.revisar.falt)
  U.abrirFaltanteRevisar('it-1', 'otro')
  U.abrirAceptarRevisar('it-1')
  chk('Admin: abrir "Otro / ajustar" cierra el panel del faltante', !U.estado.revisar.falt && U.estado.revisar.aceptando?.itemId === 'it-1')
})())
esperas.push((async () => {
  // El motivo que deja la base ("La planilla … cerró y faltan N…") se ve, escapado.
  const S = construirAdministracion(RUTA_ADM)
  S.__tablas.orden_retiro_items = []
  S.__setRpc(async (n) => n === 'retiros_por_revisar'
    ? { data: [{ ...FILAS[0], revision_motivo: 'La planilla Máquina 1 (lote 6230) cerró y faltan 5 cajas sin lote' }, { ...FILAS[1], item_id: 'it-x', revision_motivo: marca('motivo-base') }], error: null }
    : { data: null, error: null })
  await S.mostrarRevisar()
  await esperar()
  const h = S.__els.get('ad-revisar-lista').innerHTML
  chk('Admin: dice por qué volvió a revisar (la planilla cerró)', /La planilla Máquina 1 \(lote 6230\) cerró y faltan 5 cajas sin lote/.test(h))
  chequearMarcas(chk, 'revisar: motivo de la base', h, ['motivo-base'])
})())
{
  const S = construirAdministracion(RUTA_ADM)
  const d = { orden: { estado: 'confirmada' }, planillas: PLANILLAS }
  chk('Admin orden: el renglón que espera dice "Esperando la planilla de Máquina 2 (lote 6237)"',
    /Esperando la planilla de Máquina 2 \(lote 6237\)/.test(S.htmlFaltanteRenglon({ revision: 'en_produccion', turno_produccion_id: 't-2' }, d)))
  chk('Admin orden: sin las planillas no inventa la máquina', /Esperando una planilla en curso/.test(S.htmlFaltanteRenglon({ revision: 'en_produccion', turno_produccion_id: 't-9' }, { orden: { estado: 'confirmada' }, planillas: null })))
  chk('Admin orden: el pendiente, por revisar con su motivo', /Faltaban 2 cajas en stock: por revisar · La planilla/.test(S.htmlFaltanteRenglon({ revision: 'pendiente', faltante: 2, revision_motivo: 'La planilla Máquina 1 (lote 6230) cerró y faltan 2 cajas sin lote' }, d)))
  chk('Admin orden: aceptado dice de dónde salió', /Salió del lote D-0099/.test(S.htmlFaltanteRenglon({ revision: 'aceptada', revision_motivo: 'Salió del lote D-0099: traspaso' }, d)))
  chk('Admin orden: un insumo o una anulada no dicen nada', S.htmlFaltanteRenglon({ insumo_id: 'i', revision: 'pendiente', faltante: 2 }, d) === '' && S.htmlFaltanteRenglon({ revision: 'pendiente', faltante: 2 }, { orden: { estado: 'anulada' } }) === '')
  chequearMarcas(chk, 'orden: motivo', S.htmlFaltanteRenglon({ revision: 'pendiente', faltante: 2, revision_motivo: marca('motivo') }, d), ['motivo'])
  chequearMarcas(chk, 'orden: planilla', S.htmlFaltanteRenglon({ revision: 'en_produccion', turno_produccion_id: 't-x' }, { orden: { estado: 'confirmada' }, planillas: [{ turno_id: 't-x', maquina: marca('maquina'), lote: marca('lote') }] }), ['maquina', 'lote'])
  const select = fs.readFileSync(RUTA_ADM, 'utf8').match(/from\('orden_retiro_items'\)\n\s*\.select\('([^']*)'\)\n\s*\.eq\('orden_id', id\)/)
  chk('Admin orden: lee la revisión, el faltante y la planilla de cada renglón', !!select && /faltante, revision, revision_motivo, turno_produccion_id/.test(select[1]))
}

// ── 4. El cableado ─────────────────────────────────────────────────────────
{
  const ret = fs.readFileSync(RUTA_RET, 'utf8')
  const adm = fs.readFileSync(RUTA_ADM, 'utf8')
  chk('la Carga importa el cartel de js/faltante-retiro.js', /from '\.\.\/js\/faltante-retiro\.js'/.test(ret))
  chk('Administración importa el mismo', /from '\.\.\/js\/faltante-retiro\.js'/.test(adm))
  chk('la Carga ya no tiene la leyenda vieja', !/function htmlFaltantes\(/.test(ret) && !/No había stock de todo/.test(ret))
  chk('el cartel de la Carga es un diálogo con su título', /<div class="rt-falt" role="dialog" aria-modal="true" aria-labelledby="fr-titulo">/.test(ret))
  chk('Escape cierra el cartel', /e\.key === 'Escape' && estado\.falt/.test(ret))
  chk('el cartel no se cierra mientras se manda', /if \(!c \|\| c\.f\?\.enviando\) return/.test(ret))
  chk('las dos pantallas cargan los estilos al abrir', /asegurarEstilosFaltante\(\)\n\s*const fabrica = cargarFabricaDePruebas/.test(ret) && /asegurarEstilosFaltante\(\)\n\s*const fabrica = cargarFabricaDePruebas/.test(adm))
  chk('Admin: los botones de la tarjeta llaman al panel',
    /closest\('\[data-revisar-produccion\]'\)\)\) abrirFaltanteRevisar\(b\.dataset\.revisarProduccion, 'produccion'\)/.test(adm) &&
    /closest\('\[data-revisar-otro\]'\)\)\) \{ if \(!b\.disabled\) abrirFaltanteRevisar\(b\.dataset\.revisarOtro, 'otro'\)/.test(adm) &&
    /closest\('\[data-fr\]'\)\)\) \{ if \(!b\.disabled\) accionFaltante\(ctxFaltanteRevisar\(\), b\.dataset\.fr, b\.dataset\.frValor\)/.test(adm))
  chk('los campos del cartel tienen letra de 16 px (el celular no agranda la pantalla)', /\.fr-campo textarea \{[^}]*font-size: 16px/.test(src))
}

fin()
