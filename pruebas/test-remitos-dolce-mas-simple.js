// REMITOS DOLCE: UN SOLO RECORRIDO (29/10/2026, rama ci-prueba/remitos-mas-simple).
// Pedido de Facu: "que Manuel suba la foto y cargue los lotes en el mismo
// lugar, sin ir a otra pestaña a revisar". Lo que se prueba, con las
// funciones REALES de modulos/remitos-dolce.html y js/remitos-comun.js:
//  1. SUBIR: leído, el remito queda en NARANJA "Listo para cargar lotes" (N°,
//     cliente y renglones); tocarlo abre el editor ahí mismo (abrirRemito con
//     origen 'subir'); "‹ Remitos" vuelve a Subir; al confirmar, VERDE "Orden
//     cargada · D-00XX" (también D-I-…) aunque una lectura vieja lo traiga
//     precargado; el texto de ayuda nuevo; sin Retiros · cargar se ve igual
//     pero no se abre; el pie "falta repartir X"; el sello "Controlar".
//  2. LA SEGUNDA PESTAÑA se llama "Órdenes cargadas" (por dentro 'revisar':
//     ?pestana=revisar sigue andando), con los sin terminar de cualquiera y
//     el buscador por N° de remito; ninguna "Revisar" a la vista.
//  3. EL BUSCADOR DE CONOS: con 0 o 1 letra ninguno (la pista); con 2,
//     primero los que empiezan así (nombre o palabra), sin tildes, hasta 20;
//     la lista con altura máxima y scroll; elegido, se cierra con "Cambiar".
//  4. "× N u." (producto_presentaciones.unidades_por_caja) en el renglón y en
//     las opciones; con 1 no va; "180" encuentra la Caja N°2; en negrita en
//     el renglón elegido.
//
//   node pruebas/test-remitos-dolce-mas-simple.js
//   ARCHIVO_TEST=<copia del módulo> node pruebas/test-remitos-dolce-mas-simple.js
'use strict'

const path = require('path')
const fs = require('fs')
const { construirRemitosDolce } = require('./sandbox-remitos-dolce')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/remitos-dolce.html')
leer(ARCHIVO)
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
// El runner de mutaciones también muta js/remitos-comun.js (lo pega
// fuente-cobranzas.js): necesita saber cuántos bytes leyó de ESE archivo.
const COMUN = process.env.ARCHIVO_COMUN_REMITOS || path.join(__dirname, '..', 'js', 'remitos-comun.js')
console.log(`COMUN ${COMUN} (${fs.readFileSync(COMUN, 'utf8').length} bytes)`)
const { chk, esperas, fin } = arnes()

const PRELUDIO = `
  supabase.functions = { invoke(n, op) { __llamadas.rpc.push(['fn:' + n, JSON.parse(JSON.stringify(op ?? null))]); return Promise.resolve({ data: null, error: null }) } }
`
const nuevo = () => construirRemitosDolce(ARCHIVO, { preludioExtra: PRELUDIO })
const vuelta = () => new Promise(r => setImmediate(r))
const sinEtiquetas = (h) => String(h).replace(/<[^>]+>/g, '')

// El catálogo de Dolce como está en la base (SELECT del 29/10/2026).
const CAT = {
  productos: [
    { id: 'p-b40', nombre: 'Barquillo 40 x4', categoria: 'barquillos', activo: true },
    { id: 'p-b45', nombre: 'Barquillo 45 x4', categoria: 'barquillos', activo: true },
    { id: 'p-cch', nombre: 'Cucuruchón Chico', categoria: 'cucuruchones', activo: true },
    { id: 'p-pap', nombre: 'Conos de papel sueltos', categoria: null, activo: true },
    { id: 'p-vaso', nombre: 'Vaso CERO', categoria: null, activo: true },
    { id: 'p-cono0', nombre: 'Cono CERO', categoria: null, activo: true },
  ],
  presentaciones: [
    { id: 'pr-b40-con', producto_id: 'p-b40', nombre: 'Caja con cono', con_cono: true, media_caja: false, unidades_por_caja: 252, activa: true },
    { id: 'pr-b40-n2', producto_id: 'p-b40', nombre: 'Caja N°2 con cono', con_cono: true, media_caja: false, unidades_por_caja: 180, activa: true },
    { id: 'pr-b40-sin', producto_id: 'p-b40', nombre: 'Caja sin cono', con_cono: false, media_caja: false, unidades_por_caja: 252, activa: true },
    { id: 'pr-b45-con', producto_id: 'p-b45', nombre: 'Caja con cono', con_cono: true, media_caja: false, unidades_por_caja: 216, activa: true },
    { id: 'pr-b45-n2', producto_id: 'p-b45', nombre: 'Caja N°2', con_cono: false, media_caja: false, unidades_por_caja: 168, activa: true },
    { id: 'pr-cch-media', producto_id: 'p-cch', nombre: 'Media caja', con_cono: false, media_caja: true, unidades_por_caja: 128, activa: true },
    { id: 'pr-pap', producto_id: 'p-pap', nombre: 'Por cono', con_cono: true, media_caja: false, unidades_por_caja: 1, activa: true },
    { id: 'pr-vaso', producto_id: 'p-vaso', nombre: 'Caja ×1800', con_cono: false, media_caja: false, unidades_por_caja: 1800, activa: true },
    { id: 'pr-cono0', producto_id: 'p-cono0', nombre: 'Caja', con_cono: false, media_caja: false, unidades_por_caja: 1600, activa: true },
  ],
  marcas: [
    { id: 'm-gl', nombre: 'GLACE' }, { id: 'm-glo', nombre: 'Glória' }, { id: 'm-lag', nombre: 'LA GLORIOSA' }, { id: 'm-igl', nombre: 'IGLÚ' },
    { id: 'm-aba', nombre: 'ABACO' }, { id: 'm-lel', nombre: 'LELONA' },
  ],
  insumos: [{ id: 'ins-h', nombre: 'Harina 000', marca: 'Wali', unidad_medida: 'kg', activo: true }],
}
const CLIENTES = [{ id: 'c-alm', nombre: 'Almacén Rosario', apodos: [], activo: true, unidad_grupo_id: null }]

const item = (x) => ({ texto_leido: '', cantidad: null, presentacion_id: null, marca_id: null, insumo_id: null, lotes: [], revisar: false, omitir: false, nota: '', ...x })
const ITEMS = [
  item({ texto_leido: 'Barquillo 40 x4 GLACE 31', cantidad: 31, presentacion_id: 'pr-b40-con', marca_id: 'm-gl', lotes: [{ lote: 'A', cajas: 25 }] }),
  item({ texto_leido: 'Barquillo 40 x4 con cono', cantidad: 4, presentacion_id: 'pr-b40-n2', revisar: true, nota: 'no se lee el cono' }),
  item({ texto_leido: 'Media caja chico', cantidad: 2, presentacion_id: 'pr-cch-media', lotes: [{ lote: 'B', cajas: 1 }] }),
]
// El remito como lo tiene la base: CAMPOS_REMITO (leerRemito) y lo de Subir.
const R = { id: 'r-1', unidad_negocio_id: 'u-d', foto_path: 'uid-1/remitos/r-1.jpg', subido_por: 'emp-1', subido_en: new Date(Date.now() - 600000).toISOString(),
  estado: 'precargada', talonario: 'oficial', numero_remito: '0001-00003100', numero_remito_n: 100003100, fecha: '2026-10-29', cliente_id: 'c-alm',
  cliente_leido: 'Almacen Rosario', transporte: null, observaciones: null, items: ITEMS, error: null, leido_en: null, orden_id: null, orden_codigo: null,
  descartado_motivo: null, client_uuid: 'cu-1' }
const OTRO = { ...R, id: 'r-2', subido_por: 'emp-2', numero_remito: '0001-00003101', numero_remito_n: 100003101, cliente_id: null, cliente_leido: 'Kiosco Pepe', items: [ITEMS[0]] }

// Manuel: solo Retiros · cargar en Dolce (Subir); con ver, también Órdenes cargadas.
function preparar(S, { ver = false, cargar = true, filas = [R] } = {}) {
  S.estado.empresaId = null
  S.estado.misTareas = new Map([...(cargar ? [['retiros:cargar', { unidades: ['u-d'] }]] : []), ...(ver ? [['retiros:ver', { unidades: ['u-d'] }]] : [])])
  S.estado.empresas = [{ id: 'u-d', nombre: 'Dolce Pasta' }]
  S.estado.sinControlIds = new Set(['u-d'])
  S.estado.sinControl = new Map([['u-n', false], ['u-d', true]])
  const base = JSON.parse(JSON.stringify(filas))
  S.__tablas.remitos_precarga = (f) => {
    const id = f.find(x => x[0] === 'eq' && x[1] === 'id')
    if (id) return { data: base.filter(x => x.id === id[2]), error: null }
    const yo = f.find(x => x[0] === 'eq' && x[1] === 'subido_por')
    if (yo) return { data: base.filter(x => x.subido_por === yo[2]), error: null }
    return { data: base.filter(x => ['precargada', 'error', 'leyendo'].includes(x.estado)), error: null }
  }
  S.__tablas.clientes = CLIENTES
  S.__tablas.productos_terminados = CAT.productos
  S.__tablas.producto_presentaciones = CAT.presentaciones
  S.__tablas.marcas_personalizadas = CAT.marcas
  S.__tablas.insumos = CAT.insumos
  S.__tablas.ordenes_retiro = []
  return base
}
const lista = (S) => S.__els.get('rt-remitos-lista')?.innerHTML ?? ''
const cuerpo = (S) => S.__els.get('ad-remito-cuerpo')?.innerHTML ?? ''

// ═══ 1. SUBIR: la tarjeta naranja, el editor ahí mismo y la verde ════════
{
  const S = nuevo()
  preparar(S)
  esperas.push((async () => {
    S.abrirSubirRemitos()
    await vuelta(); await vuelta(); await vuelta()
    const h = lista(S)
    chk('leído: la tarjeta en NARANJA (rt-remito--precargada)', /<button type="button" class="rt-remito rt-remito--precargada" data-remito="r-1" data-remito-estado="precargada" data-remito-abrir="r-1">/.test(h), h.slice(0, 300))
    chk('…dice "Listo para cargar lotes"', /<span class="rt-remito__estado">Listo para cargar lotes<\/span>/.test(h))
    chk('…con el N°, el cliente y los renglones', /Remito N° 0001-00003100 · Almacén Rosario · 3 renglones/.test(h), sinEtiquetas(h))
    chk('…y "Cargar ›"', /<span class="rt-remito__ir" aria-hidden="true">Cargar ›<\/span><\/button>/.test(h))
    chk('ya no dice "Precargado"', !/Precargado/.test(h))
    // Tocar la tarjeta: el editor, sin pasar por la otra pestaña.
    await S.abrirRemito('r-1', 'subir')
    chk('tocarla abre el editor (ad-vista-remito)', S.estado.vista === 'ad-vista-remito' && S.estado.remito?.id === 'r-1' && S.estado.origenRemito === 'subir')
    chk('…sin pestañas y el encabezado "Cargar lotes"', S.__els.get('rd-tabs').hidden === true && S.__els.get('rd-sub').textContent === 'Cargar lotes')
    chk('…con el remito leído de la base (CAMPOS_REMITO)', S.estado.remito.form?.numero === '0001-00003100' && S.estado.remito.form.renglones.length === 3)
    chk('…de la fábrica del remito', S.estado.empresaId === 'u-d')
    const c = cuerpo(S)
    chk('…con Confirmar (tiene Retiros · cargar)', /data-rm-accion="confirmar"/.test(c))
    chk('el sello amarillo dice "Controlar"', /<span class="ad-sello ad-sello--amarillo">Controlar<\/span>/.test(c) && !/>Revisar</.test(c))
    chk('el pie: "Lotes: 25 de 31 cajas · falta repartir 6 cajas"', /data-rm-lotes-pie="0">[^]*?Lotes: 25 de 31 cajas<\/span> · <span class="ad-rm-estado-lotes ad-rm-estado-lotes--falta">falta repartir 6 cajas<\/span>/.test(c))
    chk('…y con una sola: "falta repartir 1 caja"', /falta repartir 1 caja</.test(c))
    // "‹ Remitos": vuelve a Subir.
    await S.volverDeRemito()
    chk('"‹ Remitos" vuelve a Subir', S.estado.vista === 'rt-vista-remitos' && S.estado.pestana === 'subir' && S.estado.remito === null)
    // Confirmar desde Subir: VERDE con el código.
    await S.abrirRemito('r-1', 'subir')
    S.__setRpc(async (n) => n === 'confirmar_remito_precarga' ? { data: { orden_id: 'o-42', codigo: 'D-0042', numero_remito: '0001-00003100', talonario: 'oficial' }, error: null } : { data: null, error: null })
    await S.confirmarRemito()
    await vuelta(); await vuelta(); await vuelta()
    chk('al confirmar, vuelve a Subir', S.estado.vista === 'rt-vista-remitos' && S.estado.remito === null)
    const v = lista(S)
    chk('…y la tarjeta pasa a VERDE "Orden cargada · D-0042"', /<div class="rt-remito rt-remito--confirmada" data-remito="r-1" data-remito-estado="confirmada">/.test(v) && /<span class="rt-remito__estado">Orden cargada · D-0042<\/span>/.test(v), v.slice(0, 400))
    chk('…aunque la lectura siguiente todavía lo traiga precargado', S.__llamadas.consultas.filter(q => q[0] === 'remitos_precarga').length >= 3 && !/data-remito-abrir="r-1"/.test(v))
    chk('…y no se abre más (no es botón)', !/<button[^>]*data-remito="r-1"/.test(v))
  })())
}
{
  // La orden interna: D-I-0007; descartar desde Subir también vuelve ahí.
  const S = nuevo()
  preparar(S, { filas: [R, { ...R, id: 'r-3', client_uuid: 'cu-3' }] })
  esperas.push((async () => {
    S.abrirSubirRemitos()
    await vuelta(); await vuelta()
    await S.abrirRemito('r-1', 'subir')
    S.__setRpc(async (n) => n === 'confirmar_remito_precarga' ? { data: { orden_id: 'o-7', codigo: 'D-I-0007' }, error: null } : { data: null, error: null })
    await S.confirmarRemito()
    await vuelta(); await vuelta()
    chk('el código de la orden interna: "Orden cargada · D-I-0007"', /Orden cargada · D-I-0007/.test(lista(S)))
    await S.abrirRemito('r-3', 'subir')
    S.__setRpc(async () => ({ data: null, error: null }))
    await S.descartarRemito('Foto repetida')
    await vuelta(); await vuelta()
    chk('descartar desde Subir vuelve a Subir', S.estado.vista === 'rt-vista-remitos' && /data-remito="r-3" data-remito-estado="descartada"/.test(lista(S)))
  })())
}
{
  // Sin la orden_codigo (una respuesta vieja): "Orden cargada".
  const S = nuevo()
  preparar(S)
  chk('confirmada sin código: "Orden cargada"', S.estadoRemitoSubido({ id: 'x', estado: 'confirmada', orden_codigo: null }).texto === 'Orden cargada')
  chk('confirmada con código: "Orden cargada · D-0012"', S.estadoRemitoSubido({ id: 'x', estado: 'confirmada', orden_codigo: ' D-0012 ' }).texto === 'Orden cargada · D-0012')
  chk('la roja sigue: "No se pudo leer"', S.estadoRemitoSubido({ id: 'x', estado: 'error', error: 'movida' }).texto === 'No se pudo leer')
  chk('leyendo: "Leyendo…"', S.estadoRemitoSubido({ id: 'x', estado: 'leyendo', subido_en: new Date().toISOString() }).texto === 'Leyendo…')
  const pre = S.estadoRemitoSubido({ id: 'x', estado: 'precargada', numero_remito: null, cliente_leido: 'Kiosco Pepe', items: [ITEMS[0]], unidad_negocio_id: 'u-d' })
  chk('sin cliente elegido: lo leído; sin N°; "1 renglón"', pre.detalle === 'Sin N° leído · Kiosco Pepe · 1 renglón' && pre.abrir === true, pre.detalle)
  chk('sin nada: "sin cliente"', S.detalleListoSubida({ id: 'x', items: [] }) === 'Sin N° leído · sin cliente · 0 renglones')
  S.estado.empresaId = 'u-d'
  S.estado.clientes = CLIENTES
  chk('con los clientes de la fábrica: el nombre', S.clienteTarjetaSubida({ cliente_id: 'c-alm', cliente_leido: 'otro', unidad_negocio_id: 'u-d' }) === 'Almacén Rosario')
  chk('…de otra fábrica, lo leído', S.clienteTarjetaSubida({ cliente_id: 'c-alm', cliente_leido: 'otro', unidad_negocio_id: 'u-n' }) === 'otro')
  // Sin Retiros · cargar en esa fábrica: se ve igual, no se abre.
  const x = { clave: 'x', cuando: new Date().toISOString(), unidadId: 'u-n', estado: pre }
  const h = S.htmlRemitoSubido(x, false)
  chk('sin Retiros · cargar en la fábrica: la tarjeta se ve igual…', /Listo para cargar lotes/.test(h) && /rt-remito--precargada/.test(h))
  chk('…pero no se abre', !/data-remito-abrir/.test(h) && !/^<button/.test(h))
  chk('con permiso, sí', /^<button type="button" class="rt-remito rt-remito--precargada"[^>]*data-remito-abrir="x"/.test(S.htmlRemitoSubido({ ...x, unidadId: 'u-d' }, false)))
  // El escape de lo que viene de la base en la tarjeta.
  const malo = S.estadoRemitoSubido({ id: 'x', estado: 'precargada', numero_remito: marca('numero'), cliente_leido: marca('clienteLeido'), items: [], unidad_negocio_id: 'u-d' })
  chequearMarcas(chk, 'la tarjeta naranja', S.htmlRemitoSubido({ clave: marca('clave'), cuando: '', unidadId: 'u-d', estado: malo }, false), ['numero', 'clienteLeido', 'clave'])
}
{
  // Abierto desde Subir con Órdenes cargadas mirando otra fábrica: pasa a la
  // del remito (sus clientes y su catálogo).
  const S = nuevo()
  preparar(S, { ver: true })
  S.estado.empresaId = 'u-otra'
  S.estado.clientes = [{ id: 'c-otra', nombre: 'De otra fábrica', activo: true }]
  S.datosRemitos().filas = [JSON.parse(JSON.stringify(R))]
  esperas.push((async () => {
    await S.abrirRemito('r-1', 'subir')
    chk('desde Subir, el remito con la fábrica del remito', S.estado.empresaId === 'u-d' && S.estado.clientes === CLIENTES)
    chk('…y sus clientes leídos de ahí', S.__llamadas.consultas.some(q => q[0] === 'clientes' && q[1].some(f => f[0] === 'eq' && f[1] === 'unidad_negocio_id' && f[2] === 'u-d')))
  })())
}
{
  // Los clientes para nombrar la tarjeta: se leen al costado, una vez.
  const S = nuevo()
  preparar(S)
  esperas.push((async () => {
    S.abrirSubirRemitos()
    for (let k = 0; k < 6; k++) await vuelta()
    chk('se leen los clientes de la fábrica del remito (para nombrarlo)', S.__llamadas.consultas.some(q => q[0] === 'clientes' && q[1].some(f => f[0] === 'eq' && f[1] === 'unidad_negocio_id' && f[2] === 'u-d')))
    const sel = S.__llamadas.consultas.find(q => q[0] === 'remitos_precarga')[1].find(f => f[0] === 'select')[1]
    chk('Mis remitos trae el cliente y los renglones', /\bcliente_id\b/.test(sel) && /\bcliente_leido\b/.test(sel) && /\bitems\b/.test(sel))
  })())
}
{
  // Abierto desde Órdenes cargadas: vuelve ahí. Y cambiar de pestaña con algo
  // sin mandar lo manda y va a esa pestaña.
  const S = nuevo()
  preparar(S, { ver: true, filas: [R, OTRO] })
  S.estado.empresaId = 'u-d'
  esperas.push((async () => {
    await S.mostrarRevisar()
    await vuelta()
    await S.abrirRemito('r-2')
    await S.volverDeRemito()
    chk('abierto desde Órdenes cargadas, "‹ Remitos" vuelve ahí', S.estado.vista === 'rd-vista-revisar' && S.estado.pestana === 'revisar')
    await S.abrirRemito('r-2')
    const mandados = []
    S.__setRpc(async (n, p) => { if (n === 'actualizar_remito_precarga') mandados.push(p); return { data: null, error: null } })
    S.estado.remito.form.transporte = 'Expreso'
    S.marcarSucioRemito(true)
    S.elegirPestana('subir')
    for (let k = 0; k < 6; k++) await vuelta()
    chk('cambiar de pestaña con algo sin mandar: lo manda…', mandados.length === 1 && mandados[0].p_transporte === 'Expreso')
    chk('…y va a la pestaña tocada (Subir)', S.estado.vista === 'rt-vista-remitos' && S.estado.pestana === 'subir')
  })())
}
{
  // El cableado: la tarjeta abre con origen 'subir'; el texto de ayuda; el botón.
  chk('la tarjeta naranja abre el remito con origen "subir" (conectarTodo)', /else if \(\(b = e\.target\.closest\('\[data-remito-abrir\]'\)\)\) abrirRemito\(b\.dataset\.remitoAbrir, 'subir'\)/.test(FUENTE))
  chk('el texto de ayuda de arriba', FUENTE.includes('>Sacale una foto a cada remito, de a uno y que se lea entero. Cuando la IA lo lea, tocalo para cargar los lotes y confirmar la orden.</p>'))
  chk('el botón de volver dice "‹ Remitos"', /id="ad-remito-volver">&lsaquo; Remitos<\/button>/.test(FUENTE))
  chk('la naranja y la verde tienen su color', /\.rt-remito--precargada \{ border: 2px solid var\(--naranja\); background: var\(--naranja-suave\); \}/.test(FUENTE) &&
    /\.rt-remito--confirmada \{ border-color: var\(--verde\); background: var\(--verde-suave\); \}/.test(FUENTE))
  chk('"Leyendo…" en gris', /\.rt-remito--leyendo \.rt-remito__estado \{ color: var\(--rt-texto-2\); \}/.test(FUENTE))
}

// ═══ 2. "Órdenes cargadas" ═══════════════════════════════════════════════
{
  chk('la pestaña se llama "Órdenes cargadas" (por dentro, revisar)', /id="rd-tab-revisar" data-pestana="revisar" aria-pressed="false">Órdenes cargadas<\/button>/.test(FUENTE))
  const visible = FUENTE.replace(/<script[^]*?<\/script>/g, '').replace(/<style[^]*?<\/style>/g, '').replace(/<!--[^]*?-->/g, '')
  chk('en el HTML a la vista no queda "Revisar" como paso', !/Revisar|Precargad|por revisar/i.test(sinEtiquetas(visible)), (sinEtiquetas(visible).match(/.{0,40}(Revisar|Precargad|por revisar).{0,40}/i) || [''])[0])
  chk('…ni en los textos del script ("‹ Revisar", "Por revisar", "Precargado")', !/«‹ Revisar»|'Por revisar'|'Precargado'|Remitos precargados · por revisar|'Revisar'/.test(FUENTE))
  const S = nuevo()
  preparar(S, { ver: true, filas: [R, OTRO] })
  S.estado.empresaId = 'u-d'
  S.mostrarVista('rd-vista-revisar')
  chk('el encabezado dice "Órdenes cargadas"', S.__els.get('rd-sub').textContent === 'Órdenes cargadas')
  chk('?pestana=revisar sigue abriendo esa pestaña', S.pestanasVisibles().includes('revisar'))
  esperas.push((async () => {
    S.elegirPestana('revisar')
    for (let k = 0; k < 4; k++) await vuelta()
    chk('elegirPestana("revisar") la abre', S.estado.vista === 'rd-vista-revisar' && S.__els.get('rd-tab-revisar').atributos['aria-pressed'] === 'true')
    const q = S.__llamadas.consultas.filter(c => c[0] === 'remitos_precarga').pop()[1]
    chk('los sin terminar son de cualquiera (no se filtra por quién subió)', !q.some(f => f[0] === 'eq' && f[1] === 'subido_por'))
    const h = S.__els.get('ad-remitos').innerHTML
    chk('…con el de otro usuario, para que otro lo termine', /data-remito="r-2"/.test(h) && /data-remito="r-1"/.test(h))
    chk('…en naranja "Listo para cargar lotes"', /<span class="ad-sello ad-sello--rm-precargada">Listo para cargar lotes<\/span>/.test(h))
    chk('…bajo "Sin terminar · para cargar lotes"', /Sin terminar · para cargar lotes <span class="ad-rm-contador" data-remitos-cuenta>2<\/span>/.test(h))
    chk('…con el sello en naranja', /\.ad-sello--rm-precargada \{ background: var\(--naranja-suave\); color: var\(--naranja-oscuro\); border-color: var\(--naranja\);/.test(FUENTE))
  })())
  const S2 = nuevo()
  preparar(S2, { ver: true, filas: [] })
  S2.estado.empresaId = 'u-d'
  S2.estado.remitos = { empresaId: 'u-d', filas: [], error: null }
  chk('sin ninguno sin terminar, la sección no se ve', S2.htmlRemitosPrecarga() === '')
  // Una sola pestaña: no se muestran.
  const S3 = nuevo()
  preparar(S3, { ver: true, cargar: false })
  S3.mostrarVista('rd-vista-revisar')
  chk('con una sola pestaña, la barra no se ve', S3.__els.get('rd-tabs').hidden === true && S3.pestanasVisibles().join() === 'revisar')
  // El buscador por N° de remito.
  const S4 = nuevo()
  preparar(S4, { ver: true })
  S4.estado.empresaId = 'u-d'
  S4.estado.ordenes = [
    { id: 'o1', numero_remito: '0001-00003100', numero_remito_n: 100003100, talonario: 'oficial', fecha: '2026-10-28' },
    { id: 'o2', numero_remito: '0001-00003095', numero_remito_n: 100003095, talonario: 'oficial', fecha: '2026-10-27' },
    { id: 'o3', numero_remito: '977492', numero_remito_n: 977492, talonario: 'acopio', fecha: '2026-10-27' },
  ]
  S4.buscarOrdenRemito('3100')
  chk('buscar "3100": solo esa orden', S4.ordenesVisibles().map(o => o.id).join() === 'o1' && /data-orden="o1"/.test(S4.__els.get('rd-ordenes-lista').innerHTML) && !/data-orden="o2"/.test(S4.__els.get('rd-ordenes-lista').innerHTML))
  S4.buscarOrdenRemito('0001-0000309')
  chk('con guiones también (los dígitos)', S4.ordenesVisibles().map(o => o.id).join() === 'o2')
  S4.buscarOrdenRemito('000100003100')
  chk('…y sin el guion, igual lo encuentra', S4.ordenesVisibles().map(o => o.id).join() === 'o1')
  S4.buscarOrdenRemito('')
  chk('vacío: todas las del talonario, por N°', S4.ordenesVisibles().map(o => o.id).join() === 'o1,o2')
  S4.buscarOrdenRemito('5555')
  chk('sin ninguna: lo dice', /Ningún remito de este talonario tiene «5555» en el número\./.test(S4.htmlListaOrdenesRemito()))
  S4.buscarOrdenRemito(marca('busqueda'))
  chequearMarcas(chk, 'el buscador de órdenes', S4.htmlListaOrdenesRemito(), [])
  chk('el título "Órdenes cargadas por N° de remito"', /Órdenes cargadas por N° de remito/.test(S4.htmlTalonariosOrdenes()))
  S4.pintarOrdenesRemito()
  chk('el buscador se ve con las órdenes leídas', S4.__els.get('rd-buscar-orden-caja').hidden === false)
}

// ═══ 3. El buscador de conos ═════════════════════════════════════════════
{
  const S = nuevo()
  const r = (x) => ({ presentacionId: 'pr-b40-n2', marcaId: null, marcaBusqueda: '', cambiandoCono: false, ...x })
  const ids = (h) => [...h.matchAll(/data-rm-marca="0" data-id="([^"]+)"/g)].map(m => m[1])
  for (const q of ['', 'g', ' G ']) {
    const h = S.htmlMarcasRemito(r({ marcaBusqueda: q }), 0, CAT)
    chk(`con «${q}» (menos de 2 letras): NINGÚN cono, solo la pista`, ids(h).length === 0 && h === '<p class="ad-rm-pista">Escribí 2 o 3 letras del cono</p>', h)
  }
  chk('con 2 letras: primero los que empiezan así, después los que lo contienen', ids(S.htmlMarcasRemito(r({ marcaBusqueda: 'gl' }), 0, CAT)).join() === 'm-gl,m-glo,m-lag,m-igl',
    ids(S.htmlMarcasRemito(r({ marcaBusqueda: 'gl' }), 0, CAT)).join())
  chk('…una palabra del nombre que empieza cuenta como "empieza"', S.conosParaBuscar(CAT.marcas, 'glo').map(m => m.id).join() === 'm-glo,m-lag')
  chk('sin tildes ni mayúsculas', S.conosParaBuscar(CAT.marcas, 'GLÓR').map(m => m.id).join() === 'm-glo,m-lag' && S.conosParaBuscar(CAT.marcas, 'iglu').map(m => m.id).join() === 'm-igl')
  const muchos = Array.from({ length: 30 }, (_, k) => ({ id: 'm' + k, nombre: 'Cono ' + String(k).padStart(2, '0') }))
  chk('hasta 20 resultados', S.conosParaBuscar(muchos, 'co').length === 20)
  chk('ninguno coincide: lo dice', /Ningún cono coincide con «zzz»/.test(S.htmlMarcasRemito(r({ marcaBusqueda: 'zzz' }), 0, CAT)))
  chk('la lista: vertical, con altura máxima y scroll propio', /\.ad-rm-opciones \{[^}]*max-height: 16rem; overflow-y: auto;/.test(FUENTE) &&
    /\.ad-rm-opciones--conos \{ flex-direction: column; flex-wrap: nowrap; \}/.test(FUENTE) && !/max-height: none; \}/.test(FUENTE.match(/\.ad-rm-opciones--conos \{[^}]*\}/)?.[0] ?? ''))
  chk('…de a uno por renglón (ancho entero)', /\.ad-rm-opcion--cono \{ width: 100%;/.test(FUENTE))
  // Sin cono: el buscador abierto con la pista.
  const sin = S.htmlConoRemito(r(), 0, CAT)
  chk('sin cono elegido: el buscador con la pista y ningún cono', /data-rm-cono-buscar="0"/.test(sin) && /Escribí 2 o 3 letras del cono/.test(sin) && ids(sin).length === 0)
  // El que leyó la IA: elegido y la lista cerrada.
  const ia = S.htmlConoRemito(r({ marcaId: 'm-gl' }), 0, CAT)
  chk('con el cono que leyó la IA: elegido y la lista cerrada', /data-rm-cono-elegido="0"><span class="ad-rm-cono-elegido__nombre">GLACE<\/span><button type="button" class="ad-link" data-rm-cono-cambiar="0">Cambiar<\/button>/.test(ia) &&
    !/data-rm-cono-buscar/.test(ia) && ids(ia).length === 0)
  chequearMarcas(chk, 'el cono elegido', S.htmlConoRemito(r({ marcaId: 'm-x' }), 0, { marcas: [{ id: 'm-x', nombre: marca('cono') }] }), ['cono'])
}
{
  // Elegir cierra; "Cambiar" abre; "Dejar" vuelve.
  const S = nuevo()
  preparar(S, { ver: true })
  S.estado.empresaId = 'u-d'
  esperas.push((async () => {
    await S.abrirRemito('r-1', 'subir')
    S.__setRpc(async () => ({ data: null, error: null }))
    const r1 = () => (cuerpo(S).match(/data-rm-renglon="1"[^]*?(?=data-rm-renglon="2"|$)/) || [''])[0]
    chk('el renglón sin cono: el buscador con la pista', /data-rm-cono-buscar="1"/.test(r1()) && /Escribí 2 o 3 letras del cono/.test(r1()) && !/data-rm-marca="1"/.test(r1()))
    S.estado.remito.form.renglones[1].marcaBusqueda = 'la'
    S.alEscribirRemito({ target: { value: 'la', dataset: { rmConoBuscar: '1' } } })
    S.elegirMarcaRemito(1, 'm-lag')
    chk('al elegir, la lista se cierra y queda el cono con "Cambiar"', /data-rm-cono-elegido="1"><span class="ad-rm-cono-elegido__nombre">LA GLORIOSA<\/span>/.test(r1()) && !/data-rm-cono-buscar="1"/.test(r1()) && S.estado.remito.form.renglones[1].marcaId === 'm-lag')
    S.cambiarConoRemito(1, true)
    chk('"Cambiar": el buscador vacío (la pista) y "Dejar LA GLORIOSA"', /data-rm-cono-buscar="1"/.test(r1()) && /Escribí 2 o 3 letras del cono/.test(r1()) && /data-rm-cono-dejar="1">Dejar LA GLORIOSA</.test(r1()))
    S.cambiarConoRemito(1, false)
    chk('"Dejar": vuelve cerrado con el mismo', /data-rm-cono-elegido="1"/.test(r1()) && S.estado.remito.form.renglones[1].marcaId === 'm-lag')
    S.cambiarConoRemito(1, true)
    S.elegirMarcaRemito(1, 'm-gl')
    chk('"Cambiar" y elegir otro: se cierra con el nuevo', /data-rm-cono-elegido="1"><span class="ad-rm-cono-elegido__nombre">GLACE<\/span>/.test(r1()) && !/data-rm-cono-buscar="1"/.test(r1()))
    chk('el toque de "Cambiar" está conectado', (() => { S.alTocarRemito({ target: { closest: () => ({ disabled: false, dataset: { rmConoCambiar: '1' } }) } }); return /data-rm-cono-buscar="1"/.test(r1()) })())
    chk('…y el de "Dejar"', (() => { S.alTocarRemito({ target: { closest: () => ({ disabled: false, dataset: { rmConoDejar: '1' } }) } }); return /data-rm-cono-elegido="1"/.test(r1()) })())
  })())
}

// ═══ 4. "× N u." ═════════════════════════════════════════════════════════
{
  const S = nuevo()
  const n = (presentacionId, marcaId = null) => S.nombreRenglonRemito(CAT, { presentacionId, marcaId })
  chk('el renglón: "Barquillo 40 x4 · Caja con cono × 252 u. · GLACE"', n('pr-b40-con', 'm-gl') === 'Barquillo 40 x4 · Caja con cono × 252 u. · GLACE', n('pr-b40-con', 'm-gl'))
  chk('la Caja N°2: "× 180 u."', n('pr-b40-n2', 'm-gl') === 'Barquillo 40 x4 · Caja N°2 con cono × 180 u. · GLACE')
  chk('el 45 x4: 216 y la Caja N°2 de 168', n('pr-b45-con', 'm-gl') === 'Barquillo 45 x4 · Caja con cono × 216 u. · GLACE' && n('pr-b45-n2') === 'Barquillo 45 x4 · Caja N°2 × 168 u.')
  chk('media caja igual: "Media caja × 128 u."', n('pr-cch-media') === 'Cucuruchón Chico · Media caja × 128 u.')
  chk('con 1 ("Por cono"): nada', n('pr-pap', 'm-gl') === 'Conos de papel sueltos · Por cono · GLACE')
  chk('si el nombre ya trae el número, no se repite', n('pr-vaso') === 'Vaso CERO · Caja ×1800')
  chk('los miles con punto: "× 1.600 u."', n('pr-cono0') === 'Cono CERO · Caja × 1.600 u.')
  chk('sin unidades (null): nada', S.textoUnidadesRemito({ nombre: 'Caja', unidades_por_caja: null }) === '' && S.unidadesPresentacionRemito({ unidades_por_caja: 0 }) === null)
  chk('un insumo, como antes', S.nombreRenglonRemito(CAT, { insumoId: 'ins-h' }) === 'Harina 000 · Wali')
  const op = S.opcionesRemito(CAT, S.CATEGORIAS_PRODUCTO)
  const nombre = (id) => [...op.sin_cono, ...op.con_cono].find(o => o.presentacionId === id)?.nombre
  chk('las opciones también: "Barquillo 40 x4 · Caja con cono × 252 u."', nombre('pr-b40-con') === 'Barquillo 40 x4 · Caja con cono × 252 u.' && nombre('pr-b40-n2') === 'Barquillo 40 x4 · Caja N°2 con cono × 180 u.', nombre('pr-b40-con'))
  chk('…con 1 unidad, sin "×"', nombre('pr-pap') === 'Conos de papel sueltos · Por cono')
  const busca = (q) => S.gruposRemito(CAT, q, S.CATEGORIAS_PRODUCTO).flatMap(g => g.lista.map(o => o.presentacionId ?? o.insumoId))
  // (El "Caja ×1800" del Vaso CERO también tiene 180 en el nombre.)
  chk('buscar "180" encuentra la Caja N°2 (y no la de 252)', busca('180').join() === 'pr-vaso,pr-b40-n2', busca('180').join())
  chk('buscar "216" encuentra el 45 x4 con cono', busca('216').join() === 'pr-b45-con', busca('216').join())
  chk('buscar "252": las dos del 40 x4', busca('252').sort().join() === 'pr-b40-con,pr-b40-sin')
  chk('buscar "168": la Caja N°2 del 45 x4', busca('168').join() === 'pr-b45-n2')
  chk('en el selector se ve el número', /Caja N°2 con cono × 180 u\./.test(S.htmlOpcionesRemito(0, CAT, '180')))
  // En el renglón elegido, en negrita.
  chk('en el renglón elegido, "× 252 u." en negrita', S.htmlNombreRenglonRemito(CAT, { presentacionId: 'pr-b40-con', marcaId: 'm-gl' }) === 'Barquillo 40 x4 · Caja con cono <strong class="ad-rm-unidades">× 252 u.</strong> · GLACE')
  chk('…sin unidades, sin negrita', S.htmlNombreRenglonRemito(CAT, { presentacionId: 'pr-pap', marcaId: 'm-gl' }) === 'Conos de papel sueltos · Por cono · GLACE')
  chk('…escapado (antes y después de las unidades)', S.htmlNombreRenglonRemito({ productos: [{ id: 'p', nombre: '<b>x' }], presentaciones: [{ id: 'q', producto_id: 'p', nombre: 'C&C', con_cono: true, unidades_por_caja: 5 }], marcas: [{ id: 'm', nombre: '<i>' }] }, { presentacionId: 'q', marcaId: 'm' }) ===
    '&lt;b&gt;x · C&amp;C <strong class="ad-rm-unidades">× 5 u.</strong> · &lt;i&gt;')
  chk('…sin cortarse en dos renglones', /\.ad-rm-unidades \{ font-weight: 900; white-space: nowrap; \}/.test(FUENTE))
  const R0 = S.renglonDesdeItem(ITEMS[0])
  chk('el editor usa el nombre con negrita', /<span class="ad-rm-elegido__nombre">Barquillo 40 x4 · Caja con cono <strong class="ad-rm-unidades">× 252 u\.<\/strong> · GLACE<\/span>/.test(S.htmlRenglonRemito(R0, 0, CAT, { form: { renglones: [R0] } })))
}

fin()
