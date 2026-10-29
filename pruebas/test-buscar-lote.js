// Suite: Buscar → "Lote" (modulos/buscar.html, 28/10/2026).
//
// Se EJECUTA el código real de la pantalla con los datos de la maqueta
// (datos-maqueta/buscar.js: el lote 6262-1 como lo devuelve
// trazabilidad_lote, leída con pg_get_functiondef el 28/10/2026):
//  - el armado de la trazabilidad (turno, operarios, lo producido, masas,
//    paradas, stock y salidas), con el insumo de 0 kg oculto y el "sin
//    ingreso encontrado";
//  - el HTML en el orden pedido, todo texto de la base con esc();
//  - la búsqueda: vacía no llama, la fábrica de la barra viaja (Todas = null),
//    sin resultados, el error de la base tal cual, sin permiso en la fábrica,
//    la fábrica de pruebas afuera y una respuesta vieja que no pisa a la nueva;
//  - "Imprimir / PDF" llama a print EN el toque;
//  - quién ve cada pestaña y la tarjeta del menú.
//
//   node pruebas/test-buscar-lote.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-buscar-lote.js

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')
const { extraerConst, extraerFn } = require('./extraer')
const DATOS = require('./datos-maqueta/buscar')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/buscar.html')
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)
const { chk, esperas, fin } = arnes()

// Un document de mentira: cada id es un objeto con lo que la pantalla toca.
const PRELUDIO = fuenteNumeros() + `
  var __els = {}
  function __el(id) {
    if (!__els[id]) __els[id] = { id, innerHTML: '', textContent: '', hidden: false, disabled: false, value: '', oyentes: {},
      addEventListener(t, f) { (this.oyentes[t] = this.oyentes[t] || []).push(f) }, focus() {} }
    return __els[id]
  }
  var document = { getElementById: __el }
  var __impresiones = 0
  var window = { print() { __impresiones++ }, location: { href: 'http://maqueta/modulos/buscar.html' }, history: { replaceState() {} } }
  var __llamadas = []
  var __rpc = async () => ({ data: [], error: null })
  var supabase = { rpc(n, p) { __llamadas.push([n, p]); return __rpc(n, p) } }
  var console = { error() {}, log() {}, warn() {} }
`
const FUNCIONES = ['esc', 'puedeEn', 'unidadesCon', 'vistasDe', 'numeroCobertura', 'fechaCorta', 'horaCorta', 'horaDe',
  'minutosEntre', 'textoMinutos', 'textoKg', 'entero', 'plural', 'textoTipoMasa', 'insumosVisibles', 'textosOrigen',
  'armarTrazabilidad', 'textoSinResultados', 'htmlDato', 'htmlTurno', 'htmlProducido', 'htmlInsumo', 'htmlMasas',
  'htmlParadas', 'htmlAdelante', 'htmlUnTurno', 'htmlResultado', 'mensajeDe', 'pintarAviso', 'nombreUnidad',
  'unidadesLote', 'sinPermisoLote', 'pintarLote', 'buscarLote']
const CONSTANTES = ['ZONA_AR', 'TAREAS_LOTE', 'TAREAS_PRECIOS', 'VISTAS', 'CATEGORIA_PARADA', 'estado']
const nuevo = () => construirCon(ARCHIVO, {
  preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
  retorno: `${CONSTANTES.join(', ')}, __els, __el, __llamadas, __setRpc(f) { __rpc = f }, __impresas() { return __impresiones }`,
})
const S = nuevo()

const NUSS = 'u-n', DOLCE = 'u-d', PRUEBAS = 'u-p'
const NOMBRES = new Map(DATOS.tablas.unidades_negocio.map(u => [u.id, u.nombre]))
const RESP = DATOS.rpc.trazabilidad_lote.__segun
const L6262_1 = RESP.find(c => c.si.p_lote === '6262-1').r
const L6262 = RESP.find(c => c.si.p_lote === '6262').r
const copia = x => JSON.parse(JSON.stringify(x))

// ── 1. El armado de la trazabilidad ─────────────────────────────────────────
{
  const a = S.armarTrazabilidad(L6262_1[0], NOMBRES)
  chk('es la caja 6262-1 del turno 6262, de Cucuruchos Nuss', a.buscado === '6262-1' && a.esCaja === true && a.lote === 6262 && a.fabrica === 'Cucuruchos Nuss', JSON.stringify([a.buscado, a.esCaja, a.lote, a.fabrica]))
  const t = a.turno
  chk('el turno: fecha, turno, máquina y encargado', t.fecha === '27/10/2026' && t.turno === 'Mañana' && t.maquina === 'Máquina 2' && t.encargado === 'Pérez Juan', JSON.stringify(t))
  chk('las horas: inicio, empezó a producir, apagado y fin (hh:mm)', t.inicio === '06:00' && t.largada === '06:40' && t.apagado === '13:50' && t.fin === '14:00', JSON.stringify(t))
  chk('el inicio tarde con su motivo', t.inicioTarde === 'Faltaba gas en la línea')
  chk('el scrap en kg con coma', t.scrap === '3,5 kg', t.scrap)
  chk('las observaciones', t.observaciones === 'Se cambió la plancha 4 a media mañana')
  chk('los operarios con desde / hasta en hora de Argentina', a.operarios.length === 2 && a.operarios[0].nombre === 'Gómez Ana' && a.operarios[0].desde === '06:00' && a.operarios[0].hasta === '14:00', JSON.stringify(a.operarios))
  chk('un operario que sigue: sin hasta', a.operarios[1].hasta === null && a.operarios[1].desde === '08:30', JSON.stringify(a.operarios[1]))
  chk('lo producido: el sublote, producto, presentación, cono, cajas y unidades', a.producido.length === 1 && a.producido[0].sublote === '6262-1' && a.producido[0].cono === 'GRIDO' && a.producido[0].cajas === 40 && a.producido[0].unidades === 4000)
  chk('los totales de lo producido', a.totalCajas === 40 && a.totalUnidades === 4000)
  chk('2 masas, en orden', a.masas.length === 2 && a.masas[0].nro === 1 && a.masas[1].nro === 2)
  chk('la masa: hora, tipo y masero', a.masas[0].hora === '06:10' && a.masas[0].tipo === 'Común · Simple' && a.masas[0].masero === 'Sosa Marta', JSON.stringify(a.masas[0]))
  chk('chocolate y doble', a.masas[1].tipo === 'Chocolate · Doble', a.masas[1].tipo)
  const m1 = a.masas[0].insumos
  chk('el insumo con 0 kg NO se muestra (el agua)', m1.length === 2 && !m1.some(i => i.nombre === 'Agua'), m1.map(i => i.nombre).join(', '))
  const harina = m1.find(i => i.nombre === 'Harina 000')
  chk('el insumo: kg, lote y marca', harina.kg === '25 kg' && harina.lote === 'L-2710' && harina.marca === 'Molino del Sur', JSON.stringify(harina))
  chk('de dónde vino: proveedor, fecha y comprobante del ingreso', harina.origen?.[0] === 'Molino del Sur SA · 20/10/2026 · comprobante 0001-00004321', JSON.stringify(harina.origen))
  const sal = m1.find(i => i.nombre === 'Sal fina')
  chk('sin ingreso: origen null (se dice "sin ingreso encontrado")', sal.origen === null && sal.kg === '0,25 kg', JSON.stringify(sal))
  chk('1 parada: motivo, categoría, desde-hasta y cuánto duró', a.paradas.length === 1 && a.paradas[0].motivo === 'Limpieza de planchas' && a.paradas[0].categoria === 'Programada' &&
    a.paradas[0].desde === '10:00' && a.paradas[0].hasta === '10:25' && a.paradas[0].duracion === '25 min', JSON.stringify(a.paradas))
  chk('el stock que queda del lote', a.stock.length === 1 && a.stock[0].cajas === 12 && a.totalStock === 12)
  chk('2 salidas: fecha, orden, cliente y cajas', a.salidas.length === 2 && a.salidas[0].fecha === '27/10/2026' && a.salidas[0].orden === 'N-0040' &&
    a.salidas[0].cliente === 'HELADERÍA LA ESQUINA' && a.salidas[1].cajas === 18 && a.totalSalidas === 28, JSON.stringify(a.salidas))
}
{
  const a = S.armarTrazabilidad(L6262[0], NOMBRES)
  chk('"6262" es todo el turno: no es una caja, con los dos sublotes', a.esCaja === false && a.producido.length === 2 && a.totalCajas === 52)
  chk('el stock en 0 de un sublote no se lista', a.stock.length === 1 && a.stock[0].lote === '6262-1', JSON.stringify(a.stock))
  chk('un traspaso sin cliente dice "Traspaso a otra fábrica"', a.salidas[2].cliente === 'Traspaso a otra fábrica' && a.salidas[2].orden === null)
}
{
  const v = S.insumosVisibles([{ kg: 0 }, { kg: '0' }, { kg: '0.000' }, { kg: null }, { kg: 0.25 }, { kg: '12.5' }])
  chk('insumosVisibles: 0, "0" y "0.000" afuera; sin dato y los demás adentro', v.length === 3 && v[0].kg === null, JSON.stringify(v))
  chk('textosOrigen: vacío o null es null', S.textosOrigen([]) === null && S.textosOrigen(null) === null)
  chk('textosOrigen: sin proveedor no queda vacío', S.textosOrigen([{ fecha: '2026-01-02' }])[0] === 'Proveedor sin nombre · 02/01/2026')
  chk('un turno sin nada no rompe', (() => { const a = S.armarTrazabilidad({ turno: { lote: 1 } }, NOMBRES); return a.masas.length === 0 && a.turno.fecha === '—' && a.turno.inicioTarde === null && a.fabrica === '' })())
  chk('horaCorta: hh:mm, sin dato "—"', S.horaCorta('6:05:00') === '06:05' && S.horaCorta(null) === '—')
  chk('textoMinutos', S.textoMinutos(25) === '25 min' && S.textoMinutos(60) === '1 h' && S.textoMinutos(95) === '1 h 35 min' && S.textoMinutos(null) === '')
}

// ── 2. El HTML ─────────────────────────────────────────────────────────────
{
  const armados = L6262_1.map(r => S.armarTrazabilidad(r, NOMBRES))
  const h = S.htmlResultado(armados, '6262-1', new Date('2026-10-28T15:00:00Z'))
  const pos = ['turno', 'producido', 'masas', 'paradas', 'adelante'].map(s => h.indexOf(`data-seccion="${s}"`))
  chk('las cinco tarjetas, en el orden pedido (turno, producido, masas, paradas, hacia adelante)', pos.every(p => p > 0) && pos.every((p, i) => !i || p > pos[i - 1]), pos.join(','))
  chk('el botón "Imprimir / PDF"', h.includes('id="bu-imprimir"') && h.includes('Imprimir / PDF'))
  chk('el título de la hoja impresa con el lote y la fecha', h.includes('Trazabilidad del lote 6262-1') && h.includes('impreso el 28/10/2026 12:00'))
  chk('"sin ingreso encontrado" una vez (la sal)', (h.match(/sin ingreso encontrado/g) || []).length === 1)
  chk('el agua (0 kg) no aparece', !/>Agua</.test(h))
  chk('el inicio tarde con el motivo', h.includes('Inicio tarde: Faltaba gas en la línea'))
  chk('los operarios, uno por renglón', (h.match(/<li>Gómez Ana · 06:00 a 14:00<\/li>/g) || []).length === 1 && h.includes('<li>Ríos Luis · desde 08:30</li>'))
  chk('las salidas y el total salido', h.includes('HELADERÍA LA ESQUINA') && h.includes('orden N-0041') && h.includes('28 cajas'))
  chk('la parada con su categoría', h.includes('Limpieza de planchas') && h.includes('>Programada<') && h.includes('10:00 a 10:25'))
  chk('un turno: no dice "N turnos"', !h.includes('turnos con ese lote'))
  const dos = S.htmlResultado([...armados, ...armados], '6262-1')
  chk('dos turnos con ese lote: lo dice y dibuja los dos', dos.includes('2 turnos con ese lote') && (dos.match(/data-seccion="turno"/g) || []).length === 2)
}
{
  // Todo texto de la base con esc(): cada campo con una marca distinta.
  const r = copia(L6262_1[0])
  const campos = []
  const m = (campo) => { campos.push(campo); return marca(campo) }
  Object.assign(r.turno, { turno: m('turno'), maquina: m('maquina'), encargado: m('encargado'), largada_motivo: m('motivo_tarde'), observaciones: m('obs') })
  r.operarios[0].nombre = m('operario')
  Object.assign(r.produccion[0], { producto: m('producto'), presentacion: m('presentacion'), cono: m('cono'), sublote: m('sublote') })
  r.masas[0].masero = m('masero')
  Object.assign(r.masas[0].insumos[1], { insumo: m('insumo'), marca: m('marca'), lote: m('lote_insumo') })
  Object.assign(r.masas[0].insumos[1].origen[0], { proveedor: m('proveedor'), comprobante: m('comprobante') })
  Object.assign(r.paradas[0], { motivo: m('parada'), detalle: m('detalle'), categoria: m('categoria') })
  Object.assign(r.stock_por_lote[0], { lote: m('lote_stock'), presentacion: m('pres_stock') })
  Object.assign(r.salidas[0], { cliente: m('cliente'), orden: m('orden'), lote: m('lote_salida') })
  r.lote_buscado = m('buscado')
  const h = S.htmlResultado([S.armarTrazabilidad(r, NOMBRES)], marca('buscado_titulo'))
  chequearMarcas(chk, 'el resultado del lote', h, [...campos, 'buscado_titulo'])
  chk('el nombre de la fábrica también va escapado', S.htmlTurno(S.armarTrazabilidad(L6262_1[0], new Map([[NUSS, marca('fabrica')]]))).includes('&lt;b data-xss=&quot;fabrica&quot;&gt;'))
}

// ── 3. Quién ve qué ────────────────────────────────────────────────────────
{
  const UNI = [{ id: NUSS, nombre: 'Cucuruchos Nuss' }, { id: DOLCE, nombre: 'Dolce Pasta' }]
  const p = (tareas, rol = 'usuario') => ({ rol, alcances: new Map(tareas) })
  const claves = (perm) => S.vistasDe(UNI, perm).map(v => v.clave).join(',')
  chk('produccion:ver en Nuss → Lote', claves(p([['produccion:ver', { unidades: [NUSS] }]])) === 'lote')
  chk('stock:ver → Lote', claves(p([['stock:ver', { todas: true }]])) === 'lote')
  chk('stock:ver_costos → Precios', claves(p([['stock:ver_costos', { unidades: [DOLCE] }]])) === 'precios')
  chk('retiros:precios → Precios (precios_compra también lo deja)', claves(p([['retiros:precios', { unidades: [NUSS] }]])) === 'precios')
  chk('las dos → Lote y Precios, en ese orden', claves(p([['produccion:ver', { todas: true }], ['stock:ver_costos', { todas: true }]])) === 'lote,precios')
  chk('produccion:cargar sola no alcanza (la base pide ver)', claves(p([['produccion:cargar', { todas: true }]])) === '')
  chk('una tarea sin alcance no da ninguna fábrica (como tiene_tarea_alcance)', claves(p([['produccion:ver', null]])) === '')
  chk('el alcance de otra fábrica no cuenta', S.puedeEn(p([['produccion:ver', { unidades: [DOLCE] }]]), 'produccion:ver', NUSS) === false)
  chk('super_admin ve las dos', claves(p([], 'super_admin')) === 'lote,precios')
  chk('sin fábrica no se puede', S.puedeEn(p([], 'super_admin'), 'produccion:ver', null) === false)
  chk('la pantalla lee las tareas de producción, stock y retiros', /\.in\('modulo', \['produccion', 'stock', 'retiros'\]\)/.test(FUENTE))
}
{
  // La tarjeta del menú (js/modulos.js) y lo que la acompaña.
  const MOD = fs.readFileSync(path.join(__dirname, '..', 'js', 'modulos.js'), 'utf8')
  const M = new Function(extraerConst(MOD, 'MODULOS') + extraerFn(MOD, 'moduloVisible') + '\nreturn { MODULOS, moduloVisible }')()
  const b = M.MODULOS.find(x => x.clave === 'buscar')
  const ve = (t, extra = {}) => M.moduloVisible(b, { esAdmin: false, esSuperAdmin: false, misModulos: [], misTareas: new Set(t), ...extra })
  chk('la tarjeta "Buscar" está en el menú y abre modulos/buscar.html', b?.nombre === 'Buscar' && b.url === 'modulos/buscar.html' && b.sinFilaModulo === true)
  chk('se ve con cualquiera de las cuatro tareas', ['produccion:ver', 'stock:ver', 'stock:ver_costos', 'retiros:precios'].every(t => ve([t])))
  chk('no se ve con otras (conos:ver, produccion:cargar)', !ve(['conos:ver']) && !ve(['produccion:cargar']) && !ve([]))
  chk('super_admin la ve', ve([], { esAdmin: true, esSuperAdmin: true }))
  chk('su color propio en PALETA_MODULO', /\n {2}buscar: \[0\.42, 0\.10, 30\],/.test(MOD))
  const BARRA = fs.readFileSync(path.join(__dirname, '..', 'js', 'barra-lateral.js'), 'utf8')
  chk('su ícono en la barra lateral (la lupa)', /\n {2}buscar: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM20 20l-4-4',/.test(BARRA))
  const TAB = fs.readFileSync(path.join(__dirname, '..', 'js', 'tablero.js'), 'utf8')
  chk('el tablero tiene su tarjeta (sin cifras ni pedir nada a la base)', /\n {2}buscar: cargarBuscar,\n/.test(TAB) && /export async function cargarBuscar\(\) \{\n {2}return \{ estado: 'acceso'/.test(TAB))
  chk('el encabezado del módulo con el mismo ícono y color', FUENTE.includes('<path d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM20 20l-4-4"/>') && FUENTE.includes('--cab-modulo: oklch(0.42 0.1 30)'))
}

// ── 4. La búsqueda ─────────────────────────────────────────────────────────
function preparar({ barra = NUSS, tareas = [['produccion:ver', { unidades: [NUSS] }]], fabrica = null } = {}) {
  const X = nuevo()
  X.estado.permisos = { rol: 'usuario', alcances: new Map(tareas) }
  X.estado.unidades = [{ id: NUSS, nombre: 'Cucuruchos Nuss' }, { id: DOLCE, nombre: 'Dolce Pasta' }]
  X.estado.nombres = NOMBRES
  X.estado.unidadBarra = barra
  if (fabrica) X.estado.fabrica = fabrica
  X.__setRpc(async (n, p) => {
    const c = RESP.find(x => x.si.p_lote === p.p_lote)
    const r = c ? c.r : DATOS.rpc.trazabilidad_lote.__defecto
    return typeof r === 'string' ? { data: null, error: { message: r.slice(6) } } : { data: copia(r), error: null }
  })
  return X
}
const aviso = X => X.__el('bu-lote-aviso').innerHTML
const resultado = X => X.__el('bu-lote-resultado').innerHTML

esperas.push((async () => {
  const X = preparar()
  await X.buscarLote('   ')
  chk('vacío: no llama a la base y pide el lote', X.__llamadas.length === 0 && aviso(X).includes('Escribí el lote de la caja'))
  await X.buscarLote(' 6262-1 ')
  chk('busca con el lote sin espacios y la fábrica de la barra', JSON.stringify(X.__llamadas[0]) === JSON.stringify(['trazabilidad_lote', { p_lote: '6262-1', p_unidad_negocio_id: NUSS }]), JSON.stringify(X.__llamadas))
  chk('dibuja el resultado y borra el aviso', resultado(X).includes('data-seccion="adelante"') && aviso(X) === '')
  chk('el botón vuelve a "Buscar"', X.__el('bu-lote-buscar').textContent === 'Buscar' && X.__el('bu-lote-buscar').disabled === false)
  const oy = X.__el('bu-imprimir').oyentes.click ?? []
  oy.forEach(f => f())
  chk('"Imprimir / PDF" llama a print en el mismo toque (sin await: Safari del iPhone)', oy.length >= 1 && X.__impresas() === 1)
})())

esperas.push((async () => {
  const X = preparar({ barra: null })
  await X.buscarLote('6262-1')
  chk('con "Todas": la fábrica viaja null (la base busca donde puede ver)', X.__llamadas[0][1].p_unidad_negocio_id === null)
  await X.buscarLote('9999')
  chk('sin resultados con "Todas": "en ninguna de tus fábricas"', aviso(X).includes('No se encontró ese lote en ninguna de tus fábricas.') && resultado(X) === '', aviso(X))
})())

esperas.push((async () => {
  const X = preparar()
  await X.buscarLote('9999')
  chk('sin resultados: "No se encontró ese lote en <fábrica>"', aviso(X).includes('No se encontró ese lote en Cucuruchos Nuss.') && resultado(X) === '', aviso(X))
  await X.buscarLote('ABC')
  chk('lote mal escrito: el mensaje de la base tal cual, como error', aviso(X).includes('bu-error') && aviso(X).includes('Escribí el lote como está en la caja, por ejemplo 6262-1.') && resultado(X) === '', aviso(X))
  X.__setRpc(async () => ({ data: null, error: { message: '<b>roto</b>' } }))
  await X.buscarLote('6262-1')
  chk('el error de la base va escapado', aviso(X).includes('&lt;b&gt;roto&lt;/b&gt;'))
})())

esperas.push((async () => {
  const X = preparar({ barra: DOLCE })
  await X.buscarLote('6262-1')
  chk('sin permiso en la fábrica de la barra: no llama y lo dice', X.__llamadas.length === 0 && aviso(X).includes('No tenés permiso para buscar lotes en Dolce Pasta.'), aviso(X))
})())

esperas.push((async () => {
  const fabrica = { ok: true, unidades: new Set([PRUEBAS]), personas: new Set(), soyDePrueba: false }
  const X = preparar({ barra: null, fabrica })
  X.__setRpc(async () => {
    const enPruebas = copia(L6262_1[0]); enPruebas.turno.unidad_negocio_id = PRUEBAS
    return { data: [enPruebas], error: null }
  })
  await X.buscarLote('6262-1')
  chk('un turno de la fábrica de pruebas no se le muestra a una cuenta real', resultado(X) === '' && aviso(X).includes('No se encontró'), aviso(X))
})())

esperas.push((async () => {
  // Dos búsquedas seguidas: la primera contesta tarde y no pisa a la segunda.
  const X = preparar()
  let soltar
  X.__setRpc((n, p) => p.p_lote === '6262-1'
    ? new Promise(r => { soltar = () => r({ data: copia(L6262_1), error: null }) })
    : Promise.resolve({ data: [], error: null }))
  const primera = X.buscarLote('6262-1')
  chk('mientras busca, el botón dice "Buscando…" y se traba', X.__el('bu-lote-buscar').textContent === 'Buscando…' && X.__el('bu-lote-buscar').disabled === true)
  await X.buscarLote('1111')
  soltar()
  await primera
  chk('una respuesta vieja no pisa a la nueva', resultado(X) === '' && aviso(X).includes('No se encontró'), aviso(X))
})())

fin()
