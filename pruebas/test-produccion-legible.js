// "Terminar la tablet", parte 5 (25/09/2026): lo que se lee mal.
//
//  a) El renglón de lo producido dice UNA vez qué es, con la misma regla en la
//     planilla y en el historial (partesProducido):
//       producto · con cono / sin cono · cono · caja ×N · caja de empaque · embolsado
//     Antes: "Caja con cono · con cono · Común · caja ×320".
//  b) Las listas de masas (planilla, sala e historial): lo grande es SIMPLE o
//     DOBLE; chip "Modificada" en bordó solo cuando lo es; "Chocolate" solo
//     con cacao; Original y Anterior sin chip.
//  c) El buscador de conos filtra en cada tecla, desde la primera letra, sin
//     acentos ni mayúsculas; solo activos (aprobados y pendientes, estos con
//     "nuevo, a revisar"); rechazados e inactivos nunca. Valores de estado_alta
//     verificados contra el CHECK el 25/09/2026: aprobada / pendiente_revision
//     / rechazada. En la base: 351 conos, 26 activos.
//
//   node pruebas/test-produccion-legible.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion, GESTION } = require('./sandbox-produccion')
const { extraerFn } = require('./extraer')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

// Los nombres reales de la base (producto_presentaciones, 25/09/2026).
const CAT = {
  productos: [
    { id: 'p-mini', nombre: 'Cucuruchón Mini', tipo_masa: 'Común' },
    { id: 'p-vaso', nombre: 'Vaso 90', tipo_masa: 'Común' },
    { id: 'p-cono40', nombre: 'Cono dulce 40 x4', tipo_masa: 'Común' },
  ],
  presentaciones: [
    { id: 'pr-con', producto_id: 'p-mini', nombre: 'Caja con cono', con_cono: true, media_caja: false, unidades_por_caja: 320 },
    { id: 'pr-sin', producto_id: 'p-mini', nombre: 'Caja sin cono', con_cono: false, media_caja: false, unidades_por_caja: 320 },
    { id: 'pr-media', producto_id: 'p-mini', nombre: 'Media caja', con_cono: false, media_caja: true, unidades_por_caja: 160 },
    { id: 'pr-vaso', producto_id: 'p-vaso', nombre: 'Caja', con_cono: false, media_caja: false, unidades_por_caja: 350 },
    { id: 'pr-n2', producto_id: 'p-cono40', nombre: 'Caja N°2', con_cono: false, media_caja: false, unidades_por_caja: 180 },
    { id: 'pr-c40', producto_id: 'p-cono40', nombre: 'Caja con cono', con_cono: true, media_caja: false, unidades_por_caja: 252 },
  ],
  marcas: [
    { id: 'mk-caserato', nombre: 'CASERATO', estado_alta: 'aprobada' },
    { id: 'mk-nueva', nombre: 'HELADERÍA DEL SOL', estado_alta: 'pendiente_revision' },
    { id: 'mk-baja', nombre: 'CONO DADO DE BAJA', estado_alta: 'aprobada', activa: false },
    { id: 'mk-rech', nombre: 'CONO RECHAZADO', estado_alta: 'rechazada', activa: false },
  ],
  insumos: [{ id: 'i-nuss', nombre: 'Caja N°1', marca: 'Nuss' }],
}
const INSUMOS = [{ id: 'i-nuss', nombre: 'Caja N°1', marca: 'Nuss' }]

// El historial vive en la gestión desde el 25/09/2026: sus renders se prueban
// en ese archivo, con la MISMA regla de la planilla.
const ARCHIVO_G = process.env.ARCHIVO_GESTION || GESTION
const FUENTE_G = leer(ARCHIVO_G)
function armar(archivo = ARCHIVO) {
  const S = construirProduccion(archivo)
  S.estado.unidades = new Map([['u', 'Cucuruchos Nuss']])
  S.estado.unidadId = 'u'
  S.estado.misTareas = new Map([['cargar', { todas: true }]])
  return S
}
const S = armar()
const G = armar(ARCHIVO_G)
const item = (extra) => ({ id: 'it', sublote: '7023-1', cajas: 10, unidades: 3200, anulado: false, marca_id: null, caja_insumo_id: null, embolsado: null, ...extra })
const detalle = (html) => (html.match(/pr-producido__detalle">([^<]*)</) || [])[1]
const renglon = (extra) => detalle(S.htmlProducido(item(extra), CAT, INSUMOS))
// El historial, con la MISMA regla.
const D = {
  presentaciones: CAT.presentaciones, productos: CAT.productos, marcas: CAT.marcas, insumosEmpaque: INSUMOS,
  productosConCono: ['p-mini', 'p-cono40'], correcciones: [], nombres: new Map(),
}
const hist = (extra) => {
  const h = G.htmlSubloteHistorial(item(extra), D)
  // Diseño 2a: el renglón y la cuenta de cajas van en dos celdas.
  const fin = h.indexOf('</span><span class="pg-sub__cajas">10 cajas')
  return fin === -1 ? '' : h.slice(h.indexOf('</span> ') + 8, fin)
}

// ── a) el renglón de lo producido ─────────────────────────────────────────
{
  const casos = [
    ['con cono, con marca, caja y bolsa grande',
      { presentacion_id: 'pr-con', marca_id: 'mk-caserato', unidades_por_caja: 320, caja_insumo_id: 'i-nuss', embolsado: 'grande' },
      'con cono · CASERATO · caja ×320 · Caja N°1 Nuss · bolsa grande'],
    ['con cono común', { presentacion_id: 'pr-con', unidades_por_caja: 320 }, 'con cono · Común · caja ×320'],
    ['sin cono, de un producto que también va con cono', { presentacion_id: 'pr-sin', unidades_por_caja: 320 }, 'sin cono · caja ×320'],
    ['media caja', { presentacion_id: 'pr-media', unidades_por_caja: 160, caja_insumo_id: 'i-nuss', embolsado: 'individual' },
      'sin cono · media caja ×160 · Caja N°1 Nuss · bolsitas individuales'],
    ['sin caja y sin bolsa: no nombra ni la caja ni la bolsa', { presentacion_id: 'pr-sin', unidades_por_caja: 320, embolsado: 'ninguno' }, 'sin cono · caja ×320'],
    ['embolsado doble', { presentacion_id: 'pr-con', marca_id: 'mk-caserato', unidades_por_caja: 320, caja_insumo_id: 'i-nuss', embolsado: 'doble' },
      'con cono · CASERATO · caja ×320 · Caja N°1 Nuss · doble bolsa'],
    ['un producto sin variante con cono no dice "sin cono"', { presentacion_id: 'pr-vaso', unidades_por_caja: 350 }, 'caja ×350'],
    ['una caja con nombre propio se conserva', { presentacion_id: 'pr-n2', unidades_por_caja: 180 }, 'sin cono · caja N°2 ×180'],
  ]
  for (const [nombre, extra, esperado] of casos) {
    chk(`planilla: ${nombre}`, renglon(extra) === esperado, renglon(extra))
    chk(`historial: ${nombre}`, hist(extra) === `${D.productos.find(p => p.id === CAT.presentaciones.find(x => x.id === extra.presentacion_id).producto_id).nombre} · ${esperado}`, hist(extra))
  }
  // Nada repetido: ninguna parte aparece dos veces.
  for (const [, extra] of casos) {
    const partes = renglon(extra).split(' · ').map(t => S.normalizarBusqueda(t))
    chk(`sin partes repetidas: ${renglon(extra)}`, new Set(partes).size === partes.length)
  }
  chk('el renglón viejo ("Caja con cono · con cono · Común") no vuelve', !/Caja con cono · con cono/.test(S.htmlProducido(item({ presentacion_id: 'pr-con', unidades_por_caja: 320 }), CAT, INSUMOS)))
  // El producto va arriba en la planilla y NO se repite en el detalle.
  const h = S.htmlProducido(item({ presentacion_id: 'pr-con', unidades_por_caja: 320 }), CAT, INSUMOS)
  chk('planilla: el producto una sola vez', (h.match(/Cucuruchón Mini/g) || []).length === 1 && /pr-producido__nombre">Cucuruchón Mini</.test(h), h)
  chk('planilla: todo en UN renglón de detalle', (h.match(/pr-producido__detalle"/g) || []).length === 1, h)
  // Las unidades por caja GUARDADAS en el renglón, no las del catálogo de hoy.
  chk('las unidades por caja guardadas en el renglón mandan', renglon({ presentacion_id: 'pr-con', unidades_por_caja: 300 }) === 'con cono · Común · caja ×300')
  // Un nombre que ya trae las unidades no las repite; un nombre igual al producto no se repite.
  chk('"Caja x600" no dice "×600" otra vez', S.partesProducido({ producto: 'X', pr: { nombre: 'Caja x600', con_cono: false }, unidadesPorCaja: 600 }).join(' · ') === 'caja x600')
  chk('… pero sí si las unidades son otras', S.partesProducido({ producto: 'X', pr: { nombre: 'Caja x600', con_cono: false }, unidadesPorCaja: 500 }).join(' · ') === 'caja x600 ×500')
  // Datos reales: la presentación "Caja capelina" del Cubanón Chico y el insumo "Caja capelina".
  chk('una caja de empaque que se llama como el envase no se repite',
    S.partesProducido({ producto: 'Cubanón Chico', pr: { nombre: 'Caja capelina', con_cono: false }, unidadesPorCaja: 180, caja: 'Caja capelina', embolsado: 'grande' }).join(' · ') === 'caja capelina ×180 · bolsa grande')
  chk('un cono que se llama como el producto no lo repite',
    S.partesProducido({ producto: 'Soft', pr: { nombre: 'Caja con cono', con_cono: true }, marcaNombre: 'SOFT', unidadesPorCaja: 224 }).join(' · ') === 'con cono · caja ×224')
  chk('un cono que se llama "con cono" no se dice dos veces',
    S.partesProducido({ producto: 'X', pr: { nombre: 'Caja con cono', con_cono: true }, marcaNombre: 'Con cono', unidadesPorCaja: 1 }).join(' · ') === 'con cono · caja ×1')
  chk('una media caja llamada solo "Caja" dice "media caja"',
    S.partesProducido({ producto: 'X', pr: { nombre: 'Caja', con_cono: false, media_caja: true }, unidadesPorCaja: 160 }).join(' · ') === 'media caja ×160')
  chk('una presentación que se llama como el producto no lo repite', S.partesProducido({ producto: 'Obleas dulces', pr: { nombre: 'Obleas dulces', con_cono: false }, unidadesPorCaja: 55 }).join(' · ') === 'caja ×55')
  // Un cono que ya no está en el catálogo (inactivo): el nombre sale de lo que leyó la planilla.
  chk('un cono inactivo de lo ya cargado se nombra igual', detalle(S.htmlProducido(item({ presentacion_id: 'pr-con', marca_id: 'mk-vieja', unidades_por_caja: 320 }), CAT, INSUMOS)) === 'con cono · Cono que ya no está · caja ×320')
  S.estado.planilla = { marcasItems: [{ id: 'mk-vieja', nombre: 'GRIDO' }], insumosCaja: INSUMOS }
  chk('… leído por id en leerPlanilla', detalle(S.htmlProducido(item({ presentacion_id: 'pr-con', marca_id: 'mk-vieja', unidades_por_caja: 320 }), CAT)) === 'con cono · GRIDO · caja ×320')
  S.estado.planilla = null
  // Las marcas que ya existían se mantienen.
  const anul = S.htmlProducido(item({ presentacion_id: 'pr-con', unidades_por_caja: 320, anulado: true }), CAT, INSUMOS)
  chk('el anulado se sigue marcando', /pr-producido--anulado/.test(anul) && />Anulado</.test(anul))
  const sinCaja = S.htmlProducido(item({ presentacion_id: 'pr-sin', unidades_por_caja: 320, embolsado: 'grande' }), CAT, INSUMOS)
  chk('"Sin empaque descontado" sigue', /pr-producido--sin-caja/.test(sinCaja) && /Sin empaque descontado/.test(sinCaja))
  const hAnul = G.htmlSubloteHistorial(item({ presentacion_id: 'pr-con', unidades_por_caja: 320, anulado: true }), {
    ...D, correcciones: [{ produccion_item_id: 'it', tipo: 'anulado', motivo: 'Se cargó dos veces', hecha_por: 'e', hecha_en: '2026-09-22T14:00:00Z' }], nombres: new Map([['e', 'Ana']]) })
  chk('historial: anulado tachado, "no suma" y su corrección', /pr-of-anulado/.test(hAnul) && /anulado, no suma/.test(hAnul) && /Anulado · Se cargó dos veces · Ana/.test(hAnul), hAnul)
  chk('historial: la cuenta no repite las unidades por caja', /10 cajas = 3\.200 unidades/.test(G.htmlSubloteHistorial(item({ presentacion_id: 'pr-con', unidades_por_caja: 320 }), D)))
  // UNA sola regla: las dos pantallas llaman a partesProducido.
  chk('planilla e historial usan partesProducido', /partesProducido\(/.test(extraerFn(FUENTE, 'htmlProducido')) && /partesProducido\(/.test(extraerFn(FUENTE_G, 'htmlSubloteHistorial')))
  chk('el historial lee con_cono y media_caja de sus presentaciones', /from\('producto_presentaciones'\)\.select\('id, producto_id, nombre, con_cono, media_caja'\)/.test(FUENTE_G))
  chk('la planilla lee los conos de lo ya cargado por id', /from\('marcas_personalizadas'\)\.select\('id, nombre'\)\.in\('id', marcaIds\)/.test(extraerFn(FUENTE, 'leerPlanilla')))
}

// ── b) las listas de masas ───────────────────────────────────────────────
{
  const M = [
    { id: 'm1', nro: 1, hora: '2026-09-22T12:00:00Z', doble: false, origen: 'original', es_chocolate: false, anulada: false, turno_id: 't' },
    { id: 'm2', nro: 2, hora: '2026-09-22T12:30:00Z', doble: true, origen: 'anterior', es_chocolate: false, anulada: false, turno_id: 't' },
    { id: 'm3', nro: 3, hora: '2026-09-22T13:00:00Z', doble: false, origen: 'modificada', es_chocolate: true, anulada: false, turno_id: 't' },
  ]
  const fila = (m) => S.htmlFilaMasaTurno(m, false)
  chk('sala: original sin chip', !/pr-chip/.test(fila(M[0])) && /pr-masa-tam">SIMPLE</.test(fila(M[0])), fila(M[0]))
  chk('sala: anterior sin chip, DOBLE grande', !/pr-chip/.test(fila(M[1])) && /pr-masa-tam">DOBLE</.test(fila(M[1])), fila(M[1]))
  chk('sala: modificada con su chip bordó, chocolate con el suyo', /pr-chip-modificada">Modificada</.test(fila(M[2])) && /pr-chip-choco">Chocolate</.test(fila(M[2])))
  chk('sala: chocolate SOLO con cacao', !/Chocolate/.test(fila(M[0]) + fila(M[1])))
  S.estado.defineChocolate = new Set(['i-cacao'])
  const pend = (b) => S.htmlFilaMasaPendiente({ nro: 4, maquinaNombre: 'M1', lote: 7023, doble: true, cambiada: false, cantidades: {}, otros: [], ...b })
  chk('sala, esperando: sin chip si no se tocó', !/pr-chip/.test(pend({})) && /pr-masa-tam">DOBLE</.test(pend({})), pend({}))
  chk('sala, esperando: "Modificada" si se tocó', /pr-chip-modificada/.test(pend({ cambiada: true })))
  chk('sala, esperando: "Chocolate" con la regla de la sala (esChocolate)', /pr-chip-choco/.test(pend({ cantidades: { 'i-cacao': 2 } })) && !/pr-chip-choco/.test(pend({ cantidades: { 'i-cacao': 0, 'i-harina': 25 } })),
    pend({ cantidades: { 'i-cacao': 2 } }))
  const pl = S.htmlMasasPlanilla([M[2], M[1]].reverse())
  chk('planilla: SIMPLE / DOBLE grande', /pr-masa-tam">DOBLE</.test(pl) && /pr-masa-tam">SIMPLE</.test(pl), pl)
  chk('planilla: un solo chip "Modificada" y ninguno de origen', (pl.match(/pr-chip-modificada/g) || []).length === 1 && !/pr-chip-origen|Anterior|Original/.test(pl), pl)
  chk('planilla: chocolate solo en la de cacao', (pl.match(/pr-chip-choco/g) || []).length === 1)
  const d = { items: [], recItems: [], ingredientes: [], insumos: [], nombres: new Map([['e', 'Juan']]) }
  const hm = (m) => G.htmlMasaHistorial({ ...m, tipo_masa: 'Común', receta_id: 'r', masero_id: 'e' }, d)
  chk('historial: original y anterior sin chip', !/pr-chip/.test(hm(M[0]) + hm(M[1])))
  chk('historial: modificada y chocolate con su chip', /pr-chip-modificada/.test(hm(M[2])) && /pr-chip-choco/.test(hm(M[2])))
  chk('historial: SIMPLE / DOBLE', /pr-masa-tam">SIMPLE</.test(hm(M[0])) && /pr-masa-tam">DOBLE</.test(hm(M[1])))
  // El CSS: bordó y grande.
  const css = FUENTE.slice(0, FUENTE.indexOf('</style>'))
  const regla = (sel) => (css.match(new RegExp(sel.replace('.', '\\.') + ' \\{([^}]*)\\}')) || [])[1] || ''
  chk('"Modificada" en bordó', /var\(--bordo-suave\)/.test(regla('.pr-chip-modificada')) && /var\(--bordo-oscuro\)/.test(regla('.pr-chip-modificada')))
  chk('el chip de origen "modificada" de la cabecera también en bordó', /var\(--bordo-suave\)/.test(regla('.pr-chip-origen--modificada')) && !/naranja/.test(regla('.pr-chip-origen--modificada')))
  chk('SIMPLE / DOBLE grande (1,375 rem, 900)', /font-size: 1\.375rem/.test(regla('.pr-masa-tam')) && /font-weight: 900/.test(regla('.pr-masa-tam')))
  chk('en la tablet vertical se va la hora y NO el tamaño', /\.pr-masas__cab span:nth-child\(2\), \.pr-masa-fila__hora \{ display: none; \}/.test(css) && !/\.pr-masa-fila__tam \{ display: none/.test(css))
}

// ── c) el buscador de conos ──────────────────────────────────────────────
{
  const nombres = (texto) => S.conosParaElegir(CAT.marcas, texto).map(m => m.nombre)
  chk('sin texto: solo los activos (aprobados y pendientes)', JSON.stringify(nombres('')) === '["CASERATO","HELADERÍA DEL SOL"]', JSON.stringify(nombres('')))
  chk('una letra alcanza para filtrar', JSON.stringify(nombres('c')) === '["CASERATO"]', JSON.stringify(nombres('c')))
  chk('sin mayúsculas ni acentos', JSON.stringify(nombres('heladeria')) === '["HELADERÍA DEL SOL"]' && JSON.stringify(nombres('HELADERÍA')) === '["HELADERÍA DEL SOL"]')
  chk('un inactivo nunca, aunque se lo busque', nombres('dado de baja').length === 0 && nombres('cono').length === 0)
  chk('un rechazado nunca', nombres('rechazado').length === 0)
  chk('un estado que no se conoce no se ofrece', S.conosParaElegir([{ id: 'x', nombre: 'RARO', estado_alta: 'otra' }], '').length === 0)
  const lista = S.htmlMarcas(CAT.marcas, 'h', { marcaElegida: false }, null)
  chk('el pendiente, con "nuevo, a revisar"', /ELADERÍA DEL SOL/.test(lista) && /pr-cono__pendiente">nuevo, a revisar</.test(lista), lista)
  chk('"Común" sigue siempre', /data-marca="" aria-pressed="false">Común/.test(lista))
  chk('la lista no ofrece el dado de baja ni el rechazado', !/mk-baja|mk-rech/.test(S.htmlMarcas(CAT.marcas, '', {}, null)))
  // En CADA tecla, sin apretar nada: el listener de input vuelve a dibujar la lista.
  chk('filtra en cada tecla (input), sin botón', /getElementById\('pr-agregar-marca-buscar'\)\.addEventListener\('input', ev => \{\s*estado\.agregar\.busqueda = ev\.target\.value\s*document\.getElementById\('pr-agregar-marcas'\)\.innerHTML =\s*htmlMarcas\(/.test(FUENTE))
  chk('htmlMarcas usa conosParaElegir', /conosParaElegir\(marcas, texto\)/.test(extraerFn(FUENTE, 'htmlMarcas')))
  chk('las listas de Configuración siguen con el filtro genérico (no esconde estados)', S.marcasFiltradas([{ nombre: 'X', estado_alta: 'rechazada' }], '').length === 1)
}

// Un cono que ya existía y no está activo: se dice, no se agrega.
esperas.push((async () => {
  const Y = armar()
  Y.estado.catalogo = { ...CAT, marcas: [...CAT.marcas] }
  Y.estado.planilla = { items: [], turno: { id: 't' } }
  Y.estado.agregar = { busqueda: '', marcaElegida: false }
  Y.__doc.getElementById('pr-agregar-cono-nombre').value = 'viejo'
  Y.__setRpc(async () => ({ data: { marca_id: 'mk-otro', ya_existia: true }, error: null }))
  await Y.crearConoNuevo()
  chk('un cono dado de baja no entra al catálogo de la tablet', !Y.estado.catalogo.marcas.some(m => m.id === 'mk-otro'))
  chk('… y se dice', /dado de baja/.test(Y.__doc.getElementById('pr-agregar-cono-error').textContent) && Y.__doc.getElementById('pr-agregar-cono-error').hidden === false)
  const N = armar()
  N.estado.misTareas = new Map([['cargar', { todas: true }], ['configurar', { todas: true }]])
  N.estado.catalogo = { ...CAT, marcas: [...CAT.marcas] }
  N.estado.planilla = { items: [], turno: { id: 't' } }
  N.estado.agregar = { busqueda: '', marcaElegida: false, paso: 'cono' }
  N.__doc.getElementById('pr-agregar-cono-nombre').value = 'nuevo'
  N.__setRpc(async () => ({ data: { marca_id: 'mk-n', ya_existia: false }, error: null }))
  await N.crearConoNuevo()
  chk('uno nuevo de quien configura queda aprobado (sin "a revisar")', N.estado.catalogo.marcas.find(m => m.id === 'mk-n')?.estado_alta === 'aprobada')
})())

// ── HTML malicioso ────────────────────────────────────────────────────────
{
  const catMalo = {
    productos: [{ id: 'p', nombre: marca('producto') }],
    presentaciones: [{ id: 'pr', producto_id: 'p', nombre: marca('presentacion'), con_cono: true, unidades_por_caja: 1 }],
    marcas: [{ id: 'mk', nombre: marca('cono'), estado_alta: 'pendiente_revision' }],
    insumos: [],
  }
  const insMalo = [{ id: 'ci', nombre: marca('caja'), marca: marca('cajaMarca') }]
  const it = item({ presentacion_id: 'pr', marca_id: 'mk', unidades_por_caja: 1, caja_insumo_id: 'ci', embolsado: marca('embolsado') })
  chequearMarcas(chk, 'renglón de la planilla', S.htmlProducido(it, catMalo, insMalo), ['producto', 'presentacion', 'cono', 'caja', 'cajaMarca', 'embolsado'])
  chequearMarcas(chk, 'renglón del historial', G.htmlSubloteHistorial(it, {
    presentaciones: catMalo.presentaciones, productos: catMalo.productos, marcas: catMalo.marcas, insumosEmpaque: insMalo,
    productosConCono: ['p'], correcciones: [{ produccion_item_id: 'it', tipo: 'cajas', cajas_antes: 1, cajas_despues: 2, motivo: marca('motivoCorr'), hecha_por: 'e', hecha_en: null }], nombres: new Map(),
  }), ['producto', 'presentacion', 'cono', 'caja', 'cajaMarca', 'embolsado', 'motivoCorr'])
  chequearMarcas(chk, 'lista de conos', S.htmlMarcas(catMalo.marcas, '', {}, null), ['cono'])
  chequearMarcas(chk, 'masa anulada en la sala', S.htmlFilaMasaTurno({ id: 'x', nro: 1, doble: false, origen: 'modificada', es_chocolate: true, anulada: true, anulada_motivo: marca('motivoMasa') }, true), ['motivoMasa'])
  chequearMarcas(chk, 'masa anulada en el historial', G.htmlMasaHistorial({ id: 'x', nro: 1, doble: true, origen: 'modificada', es_chocolate: true, anulada: true, anulada_motivo: marca('motivoHist'), tipo_masa: marca('tipoMasa'), masero_id: 'e' },
    { items: [], recItems: [], ingredientes: [], insumos: [], nombres: new Map([['e', marca('masero')]]) }), ['motivoHist', 'tipoMasa', 'masero'])
}

fin()
