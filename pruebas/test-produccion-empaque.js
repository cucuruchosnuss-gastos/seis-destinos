// Producción · el EMPAQUE de lo producido (24/09/2026): la caja, el embolsado
// y lo que consume cada renglón.
//
// Contrato con la base (pg_get_functiondef, 24/09/2026):
//  - registrar_produccion_item(p_turno_id, p_presentacion_id, p_marca_id,
//    p_cajas, p_caja_insumo_id DEFAULT null, p_embolsado DEFAULT null). Rechaza
//    una caja no habilitada ("Esa caja no está habilitada para este
//    producto.") solo si la presentación tiene alguna. Embolsado: el que
//    viene; si no, el sugerido de la caja; si no, 'ninguno'; y un cono con
//    doble_bolsa lo pone en 'doble'. Después llama a _descontar_empaque.
//  - _descontar_empaque: 1 caja de cartón por caja producida y cada renglón
//    de presentacion_empaque 'siempre', 'bolsa_grande' si embolsado in
//    (grande, doble), 'bolsa_individual' si in (individual, doble). La
//    pantalla NO descuenta nada: solo elige y DICE lo que se va a consumir.
//  - cerrar_turno: cada renglón de p_productos acepta caja_insumo_id y
//    embolsado, pero hoy ningún camino de la pantalla manda renglones (el
//    cierre manda []).
//
//   node pruebas/test-produccion-empaque.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

// Los datos reales de Cucuruchos Nuss, recortados.
const INSUMOS = [
  { id: 'i-nuss', nombre: 'Caja N°1', marca: 'Nuss' },
  { id: 'i-dolce', nombre: 'Caja N°1', marca: 'Dolce Pasta' },
  { id: 'i-sinimp', nombre: 'Caja N°1', marca: 'Sin impresión' },
  { id: 'i-otra', nombre: 'Caja capelina', marca: null },
  { id: 'i-tiras', nombre: 'Tiras x4', marca: null },
  { id: 'i-sep', nombre: 'Separador N°1', marca: null },
  { id: 'i-bolsa', nombre: 'Bolsa 100x80', marca: null },
  { id: 'i-ppp', nombre: 'Bolsa PPP 15x60', marca: null },
]
const CATALOGO = {
  productos_terminados: [
    { id: 'p-mini', nombre: 'Cucuruchón Mini', tipo_masa: 'Común', orden: 1 },
    { id: 'p-std', nombre: 'Cucuruchón Standard', tipo_masa: 'Común', orden: 2 },
  ],
  producto_presentaciones: [
    { id: 'pr-caja', producto_id: 'p-mini', nombre: 'Caja', con_cono: true, media_caja: false, empaque: null, unidades_por_caja: 600, orden: 1 },
    { id: 'pr-media', producto_id: 'p-mini', nombre: 'Media caja', con_cono: true, media_caja: true, empaque: null, unidades_por_caja: 300, orden: 2 },
    { id: 'pr-sin', producto_id: 'p-std', nombre: 'Sin configurar', con_cono: false, media_caja: false, empaque: null, unidades_por_caja: 400, orden: 1 },
    { id: 'pr-dos', producto_id: 'p-std', nombre: 'Con dos cajas', con_cono: false, media_caja: false, empaque: null, unidades_por_caja: 400, orden: 2 },
    { id: 'pr-una', producto_id: 'p-std', nombre: 'Con una caja', con_cono: false, media_caja: false, empaque: null, unidades_por_caja: 400, orden: 3 },
  ],
  marcas_personalizadas: [
    { id: 'mk-grido', nombre: 'GRIDO', estado_alta: 'aprobada', doble_bolsa: false },
    { id: 'mk-norte', nombre: 'HELADOS DEL NORTE', estado_alta: 'aprobada', doble_bolsa: true },
  ],
  presentacion_cajas: [
    { presentacion_id: 'pr-caja', insumo_id: 'i-nuss', embolsado_sugerido: 'grande' },
    { presentacion_id: 'pr-caja', insumo_id: 'i-dolce', embolsado_sugerido: 'individual' },
    { presentacion_id: 'pr-caja', insumo_id: 'i-sinimp', embolsado_sugerido: 'ninguno' },
    { presentacion_id: 'pr-media', insumo_id: 'i-nuss', embolsado_sugerido: 'grande' },
    { presentacion_id: 'pr-dos', insumo_id: 'i-dolce', embolsado_sugerido: 'individual' },
    { presentacion_id: 'pr-dos', insumo_id: 'i-sinimp', embolsado_sugerido: 'grande' },
    { presentacion_id: 'pr-una', insumo_id: 'i-otra', embolsado_sugerido: 'grande' },
  ],
  presentacion_empaque: [
    { presentacion_id: 'pr-caja', insumo_id: 'i-tiras', cantidad: 1, condicion: 'siempre' },
    { presentacion_id: 'pr-caja', insumo_id: 'i-sep', cantidad: 3, condicion: 'siempre' },
    { presentacion_id: 'pr-caja', insumo_id: 'i-bolsa', cantidad: 1, condicion: 'bolsa_grande' },
    { presentacion_id: 'pr-caja', insumo_id: 'i-ppp', cantidad: 16, condicion: 'bolsa_individual' },
    { presentacion_id: 'pr-media', insumo_id: 'i-tiras', cantidad: 0.5, condicion: 'siempre' },
    { presentacion_id: 'pr-media', insumo_id: 'i-sep', cantidad: 1, condicion: 'siempre' },
    { presentacion_id: 'pr-media', insumo_id: 'i-bolsa', cantidad: 1, condicion: 'bolsa_grande' },
    { presentacion_id: 'pr-media', insumo_id: 'i-ppp', cantidad: 8, condicion: 'bolsa_individual' },
  ],
  insumos: INSUMOS,
  unidades_negocio: [{ id: 'u-cn', caja_predeterminada_id: 'i-nuss' }],
}

const TURNO = { id: 't1', lote: 7023, maquina_id: 'm1', fecha: '2026-09-24', turno: 'Mañana', encargado_id: 'e-fede', abierto_en: '2026-09-24T09:02:00Z', estado: 'abierto', forzado_por: null, forzado_en: null, forzado_motivo: null }

function armar({ tablas = {} } = {}) {
  const S = construirProduccion(ARCHIVO)
  Object.assign(S.__tablas, {
    ...CATALOGO,
    turnos_produccion: filtros => filtros.some(f => f[1] === 'estado' && f[2] === 'pendiente_completar')
      ? { data: [], error: null } : { data: [TURNO], error: null },
    turno_operarios: [], masas: [], paradas_produccion: [], produccion_items: [],
    maquinas: [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }],
    ...tablas,
  })
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva' }
  S.estado.tablero = [{ maquina: { id: 'm1', nombre: 'Máquina 1' }, turno: { id: 't1' } }]
  return S
}

const html = (S, id) => S.__doc.getElementById(id).innerHTML
const rpcs = (S, n) => S.__llamadas.rpc.filter(([x]) => x === n)
const select = (S, tabla) => {
  const c = S.__llamadas.consultas.find(([t]) => t === tabla)
  return c ? (c[1].find(f => f[0] === 'select') || [])[1] ?? '' : ''
}

// Hasta la pantalla de las cajas de la caja completa, con un cono.
async function hastaCajas(S, { presentacion = 'pr-caja', cono = 'mk-grido' } = {}) {
  await S.abrirPlanilla('t1')
  S.abrirAgregar()
  S.elegirProductoAgregar('p-mini')
  S.elegirConoSiNo(true)
  S.elegirPresentacionAgregar(presentacion)
  S.elegirCono(cono)
}

// ── Lo que se lee: el texto de cada select, porque el doble lo ignora ────
esperas.push((async () => {
  const S = armar()
  await S.abrirPlanilla('t1')
  chk('los conos traen doble_bolsa', /\bdoble_bolsa\b/.test(select(S, 'marcas_personalizadas')), select(S, 'marcas_personalizadas'))
  chk('la unidad trae su caja predeterminada', /\bcaja_predeterminada_id\b/.test(select(S, 'unidades_negocio')), select(S, 'unidades_negocio'))
  chk('las cajas de cada presentación traen el embolsado sugerido',
    /\binsumo_id\b/.test(select(S, 'presentacion_cajas')) && /\bembolsado_sugerido\b/.test(select(S, 'presentacion_cajas')))
  chk('el empaque trae cantidad y condición',
    /\bcantidad\b/.test(select(S, 'presentacion_empaque')) && /\bcondicion\b/.test(select(S, 'presentacion_empaque')))
  chk('los insumos traen nombre y marca', /\bnombre\b/.test(select(S, 'insumos')) && /\bmarca\b/.test(select(S, 'insumos')))
  chk('la caja predeterminada es la de ESTA unidad',
    S.__llamadas.consultas.some(([t, f]) => t === 'unidades_negocio' && JSON.stringify(f).includes('["eq","id","u-cn"]')))
  chk('el catálogo guarda la caja predeterminada', S.estado.catalogo.cajaPredeterminadaId === 'i-nuss')

  // Si el empaque no se puede leer, el catálogo NO se cae (24/09/2026, a
  // pedido): los productos siguen y el empaque queda marcado como ilegible,
  // sin cajas a medias. El detalle está en test-produccion-sin-empaque.js.
  const E = armar({ tablas: { presentacion_empaque: () => ({ data: null, error: { message: 'sin red' } }) } })
  await E.abrirPlanilla('t1')
  chk('sin el empaque, el catálogo sigue pero sin cajas a medias',
    E.estado.catalogo?.empaqueError === true && E.estado.catalogo.cajas.length === 0 && E.estado.catalogo.productos.length === 2)
})())

// ── La caja predeterminada viene puesta, y se cambia de un toque ─────────
esperas.push((async () => {
  const S = armar()
  await hastaCajas(S)
  const a = S.estado.agregar
  chk('la caja de la unidad viene puesta', a.cajaId === 'i-nuss' && a.cajaElegida === true)
  chk('… con el embolsado que sugiere', a.embolsado === 'grande')
  chk('… así que del cono se va derecho a las cajas', a.paso === 'cajas')
  const pasos = S.pasosAgregar(a, S.estado.catalogo)
  const caja = pasos.find(x => x.clave === 'caja')
  chk('la caja es un paso entre el cono y las cajas',
    pasos.map(x => x.clave).join(',') === 'producto,cono_si_no,presentacion,cono,caja,cajas', pasos.map(x => x.clave).join(','))
  chk('… hecho, con la caja y el embolsado', caja.estado === 'hecho' && caja.valor === 'Caja N°1 Nuss · bolsa grande', caja.valor)
  chk('… y se puede tocar para cambiarla', /data-paso-ag="caja"/.test(S.htmlPasosAgregar(pasos)))
  const resumen = html(S, 'pr-agregar-empaque')
  chk('al lado de las cajas se ve la caja elegida, con "Cambiar"',
    /data-paso-ag="caja"/.test(resumen) && /Caja N°1 Nuss · bolsa grande/.test(resumen) && /Cambiar/.test(resumen), resumen)

  S.irAPasoAgregar('caja')
  const panel = html(S, 'pr-agregar-panel')
  chk('el paso de la caja se dibuja en el panel', S.__doc.getElementById('pr-agregar-panel').hidden === false && /¿En qué caja\?/.test(panel))
  chk('… con las tres cajas habilitadas para esa presentación',
    /data-ag-caja="i-nuss"/.test(panel) && /data-ag-caja="i-dolce"/.test(panel) && /data-ag-caja="i-sinimp"/.test(panel), panel)
  chk('… y NUNCA una que no está habilitada', !/i-otra/.test(panel))
  chk('… cada una con su marca', /Dolce Pasta/.test(panel) && /Sin impresión/.test(panel))
  chk('… la elegida marcada', /data-ag-caja="i-nuss" aria-pressed="true"/.test(panel))
  chk('… y dice cuál es la de la unidad', /la de la unidad/.test(panel))

  S.elegirCaja('i-dolce')
  chk('un toque cambia la caja', S.estado.agregar.cajaId === 'i-dolce')
  chk('… y el embolsado pasa al que sugiere la nueva', S.estado.agregar.embolsado === 'individual')
  S.elegirCaja('i-otra')
  chk('una caja no habilitada no se puede elegir', S.estado.agregar.cajaId === 'i-dolce')

  // El embolsado tocado a mano se pierde al cambiar de caja: es de la caja.
  S.elegirEmbolsado('doble')
  chk('el embolsado se cambia a mano', S.estado.agregar.embolsado === 'doble')
  S.elegirCaja('i-nuss')
  chk('… y cambiar de caja vuelve al sugerido de la caja', S.estado.agregar.embolsado === 'grande')

  // "Sin bolsa" solo si la caja no sugiere ninguna.
  const opciones = () => S.opcionesEmbolsado(S.estado.agregar, S.estado.catalogo).map(o => o.valor).join(',')
  chk('con una caja que sugiere bolsa, tres opciones y sin "Sin bolsa"', opciones() === 'grande,individual,doble', opciones())
  S.elegirEmbolsado('ninguno')
  chk('… y "ninguno" no se puede elegir', S.estado.agregar.embolsado === 'grande')
  S.elegirCaja('i-sinimp')
  chk('con una caja que no sugiere bolsa, aparece "Sin bolsa"', opciones() === 'grande,individual,doble,ninguno', opciones())
  chk('… y viene elegida', S.estado.agregar.embolsado === 'ninguno' && /data-ag-embolsado="ninguno" aria-pressed="true"/.test(html(S, 'pr-agregar-panel')))

  S.seguirConCajas()
  chk('"Seguir" lleva a las cajas', S.estado.agregar.paso === 'cajas')

  // Otra presentación son otras cajas; la misma no pisa lo elegido.
  S.elegirCaja('i-dolce')
  S.irAPasoAgregar('presentacion')
  S.elegirPresentacionAgregar('pr-caja')
  chk('volver a elegir la MISMA presentación no pisa la caja elegida', S.estado.agregar.cajaId === 'i-dolce')
  S.irAPasoAgregar('presentacion')
  S.elegirPresentacionAgregar('pr-media')
  chk('elegir OTRA presentación vuelve a la caja de la unidad', S.estado.agregar.cajaId === 'i-nuss' && S.estado.agregar.embolsado === 'grande')
  S.irAPasoAgregar('producto')
  S.elegirProductoAgregar('p-std')
  chk('otro producto suelta la caja', S.estado.agregar.cajaId === null && S.estado.agregar.cajaElegida === false && S.estado.agregar.embolsado === null)
})())

// ── Varias cajas y ninguna de la unidad: hay que elegir ──────────────────
esperas.push((async () => {
  const S = armar()
  await S.abrirPlanilla('t1')
  S.abrirAgregar()
  S.elegirProductoAgregar('p-std')
  S.elegirConoSiNo(false)
  S.elegirPresentacionAgregar('pr-dos')
  chk('sin la caja de la unidad y con dos habilitadas, ninguna viene puesta',
    S.estado.agregar.cajaId === null && S.estado.agregar.cajaElegida === false)
  chk('… y sin cono se va al paso de la caja', S.estado.agregar.paso === 'caja')
  chk('… que todavía no marca ningún error', !/pr-error/.test(html(S, 'pr-agregar-panel')))
  S.seguirConCajas()
  chk('"Seguir" sin caja no avanza', S.estado.agregar.paso === 'caja')
  chk('… y dice que falta', /Elegí una caja\./.test(html(S, 'pr-agregar-panel')))
  S.estado.agregar.cajas = 5
  await S.confirmarAgregar()
  chk('sin caja no se manda nada', rpcs(S, 'registrar_produccion_item').length === 0 &&
    S.__doc.getElementById('pr-agregar-error').textContent === 'Elegí la caja.')
  S.elegirCaja('i-sinimp')
  chk('elegida, se puede seguir', S.estado.agregar.cajaElegida === true)

  // Con una sola habilitada, esa viene puesta.
  S.irAPasoAgregar('presentacion')
  S.elegirPresentacionAgregar('pr-una')
  chk('con una sola caja habilitada, esa viene puesta', S.estado.agregar.cajaId === 'i-otra' && S.estado.agregar.paso === 'cajas')
})())

// ── Una presentación sin cajas configuradas ──────────────────────────────
esperas.push((async () => {
  const S = armar()
  await S.abrirPlanilla('t1')
  S.abrirAgregar()
  S.elegirProductoAgregar('p-std')
  S.elegirConoSiNo(false)
  S.elegirPresentacionAgregar('pr-sin')
  chk('sin cajas configuradas se sigue sin caja', S.estado.agregar.cajaId === null && S.estado.agregar.cajaElegida === true)
  chk('… derecho a las cajas', S.estado.agregar.paso === 'cajas')
  const aviso = 'Esta presentación no tiene cajas configuradas: no se va a descontar la caja.'
  chk('… y lo dice en bordó, al lado de las cajas',
    html(S, 'pr-agregar-empaque').includes(`pr-aviso--grave">${aviso}`), html(S, 'pr-agregar-empaque'))
  S.irAPasoAgregar('caja')
  chk('… y en el paso de la caja', html(S, 'pr-agregar-panel').includes(`pr-aviso--grave">${aviso}`))
  chk('… el paso dice "Sin caja"', S.pasosAgregar(S.estado.agregar, S.estado.catalogo).find(x => x.clave === 'caja').valor === 'Sin caja · sin bolsa')
  S.seguirConCajas()
  S.estado.agregar.cajas = 4
  S.__setRpc(async () => ({ data: { sublote: '7023-1' }, error: null }))
  await S.confirmarAgregar()
  const p = rpcs(S, 'registrar_produccion_item')[0]?.[1]
  chk('… y viaja sin caja y sin bolsa', p && p.p_caja_insumo_id === null && p.p_embolsado === 'ninguno', JSON.stringify(p))
})())

// ── El cono con doble bolsa manda ────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  await hastaCajas(S, { cono: 'mk-norte' })
  chk('con un cono de doble bolsa, el embolsado es "las dos"', S.embolsadoEfectivo(S.estado.agregar, S.estado.catalogo) === 'doble')
  S.irAPasoAgregar('caja')
  const panel = html(S, 'pr-agregar-panel')
  chk('… "Las dos" marcada', /data-ag-embolsado="doble" aria-pressed="true">/.test(panel), panel)
  chk('… las otras deshabilitadas',
    /data-ag-embolsado="grande" aria-pressed="false" disabled>/.test(panel) && /data-ag-embolsado="individual" aria-pressed="false" disabled>/.test(panel))
  chk('… y se explica', /Este cono va con doble bolsa/.test(panel))
  chk('… y lo que consume por caja lleva las dos bolsas',
    /Por caja: 1 Caja N°1 Nuss · 1 Tiras x4 · 3 Separador N°1 · 1 Bolsa 100x80 · 16 Bolsa PPP 15x60/.test(panel), panel)
  S.elegirEmbolsado('individual')
  chk('no se puede bajar a una bolsa', S.embolsadoEfectivo(S.estado.agregar, S.estado.catalogo) === 'doble')
  chk('… ni siquiera queda anotada por debajo', S.estado.agregar.embolsado === 'grande')
  S.elegirCaja('i-dolce')
  chk('ni cambiando la caja', S.embolsadoEfectivo(S.estado.agregar, S.estado.catalogo) === 'doble')
  chk('el resumen dice doble bolsa', /doble bolsa/.test(S.textoCajaElegida(S.estado.agregar, S.estado.catalogo)))
  S.seguirConCajas()
  S.estado.agregar.cajas = 2
  await S.confirmarAgregar()
  chk('… y viaja "doble"', rpcs(S, 'registrar_produccion_item')[0]?.[1].p_embolsado === 'doble')

  // Un cono común no fuerza nada.
  const C = armar()
  await hastaCajas(C, { cono: 'mk-grido' })
  C.irAPasoAgregar('caja')
  chk('un cono común no deshabilita ninguna opción', !/disabled/.test(html(C, 'pr-agregar-panel')))
  chk('… ni dice nada de doble bolsa', !/doble bolsa/.test(html(C, 'pr-agregar-panel')))
})())

// ── Lo que consume: la misma regla que _descontar_empaque ────────────────
esperas.push((async () => {
  const S = armar()
  await S.abrirPlanilla('t1')
  const cat = S.estado.catalogo
  const c = (pres, caja, emb) => S.textoConsumo(cat, S.consumoPorCaja(cat, pres, caja, emb))
  chk('caja completa con bolsa grande', c('pr-caja', 'i-nuss', 'grande') === '1 Caja N°1 Nuss · 1 Tiras x4 · 3 Separador N°1 · 1 Bolsa 100x80', c('pr-caja', 'i-nuss', 'grande'))
  chk('… con bolsitas individuales', c('pr-caja', 'i-dolce', 'individual') === '1 Caja N°1 Dolce Pasta · 1 Tiras x4 · 3 Separador N°1 · 16 Bolsa PPP 15x60', c('pr-caja', 'i-dolce', 'individual'))
  chk('… con las dos', c('pr-caja', 'i-nuss', 'doble') === '1 Caja N°1 Nuss · 1 Tiras x4 · 3 Separador N°1 · 1 Bolsa 100x80 · 16 Bolsa PPP 15x60', c('pr-caja', 'i-nuss', 'doble'))
  chk('… sin bolsa', c('pr-caja', 'i-sinimp', 'ninguno') === '1 Caja N°1 Sin impresión · 1 Tiras x4 · 3 Separador N°1', c('pr-caja', 'i-sinimp', 'ninguno'))
  chk('media caja: media plancha, y 1 caja de cartón igual', c('pr-media', 'i-nuss', 'grande') === '1 Caja N°1 Nuss · 0,5 Tiras x4 · 1 Separador N°1 · 1 Bolsa 100x80', c('pr-media', 'i-nuss', 'grande'))
  chk('sin caja, solo el empaque', c('pr-caja', null, 'grande') === '1 Tiras x4 · 3 Separador N°1 · 1 Bolsa 100x80')
  chk('sin empaque ni caja, nada', S.consumoPorCaja(cat, 'pr-sin', null, 'ninguno').length === 0)
  chk('un insumo repetido se suma en una sola línea', (() => {
    const f = S.consumoPorCaja({ empaque: [{ presentacion_id: 'x', insumo_id: 'a', cantidad: 1, condicion: 'siempre' }] }, 'x', 'a', 'grande')
    return f.length === 1 && f[0].cantidad === 2
  })())
  const tot = (pres, caja, emb, n) => S.textoConsumo(cat, S.consumoTotal(S.consumoPorCaja(cat, pres, caja, emb), n))
  chk('por 10 cajas', tot('pr-caja', 'i-nuss', 'grande', 10) === '10 Caja N°1 Nuss · 10 Tiras x4 · 30 Separador N°1 · 10 Bolsa 100x80')
  chk('3 medias cajas: 1,5 planchas', tot('pr-media', 'i-nuss', 'grande', 3) === '3 Caja N°1 Nuss · 1,5 Tiras x4 · 3 Separador N°1 · 3 Bolsa 100x80')
  chk('con miles, con punto', tot('pr-caja', 'i-dolce', 'individual', 100) === '100 Caja N°1 Dolce Pasta · 100 Tiras x4 · 300 Separador N°1 · 1.600 Bolsa PPP 15x60')
  chk('un tercio no deja ruido de coma flotante', S.consumoTotal([{ insumoId: 'a', cantidad: 0.1 }], 3)[0].cantidad === 0.3)

  // En pantalla: por caja en el paso de la caja, y el total en vivo.
  await hastaCajas(S)
  chk('sin cajas cargadas, lo que consume UNA caja', /Por caja: 1 Caja N°1 Nuss · 1 Tiras x4 · 3 Separador N°1 · 1 Bolsa 100x80/.test(html(S, 'pr-agregar-empaque')), html(S, 'pr-agregar-empaque'))
  S.ponerNumero(S.__doc.getElementById('pr-agregar-cajas'), 10)
  S.estado.agregar.cajas = 10
  S.pintarAgregar()
  chk('con 10 cajas, el total en vivo',
    html(S, 'pr-agregar-empaque').includes('10 cajas = 10 Caja N°1 Nuss · 10 Tiras x4 · 30 Separador N°1 · 10 Bolsa 100x80'), html(S, 'pr-agregar-empaque'))
  S.estado.agregar.cajas = 1
  S.pintarAgregar()
  chk('… con una, en singular', html(S, 'pr-agregar-empaque').includes('1 caja = 1 Caja N°1 Nuss'))
  S.irAPasoAgregar('caja')
  chk('el paso de la caja dice lo que consume por caja', /Por caja: 1 Caja N°1 Nuss/.test(html(S, 'pr-agregar-panel')))
  S.elegirEmbolsado('doble')
  chk('… y cambia con el embolsado', /16 Bolsa PPP 15x60/.test(html(S, 'pr-agregar-panel')))
  chk('fuera de las cajas, el resumen no se dibuja', html(S, 'pr-agregar-empaque') === '')
})())

// ── Los payloads ─────────────────────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  await hastaCajas(S)
  S.elegirCaja('i-dolce')
  S.estado.agregar.cajas = 35
  S.__setRpc(async n => n === 'registrar_produccion_item'
    ? { data: { produccion_item_id: 'it-9', sublote: '7023-3', orden: 3, unidades: 21000, embolsado: 'individual' }, error: null }
    : { data: null, error: null })
  await S.confirmarAgregar()
  chk('registrar_produccion_item lleva la caja y el embolsado',
    JSON.stringify(rpcs(S, 'registrar_produccion_item')[0]?.[1]) ===
    '{"p_turno_id":"t1","p_presentacion_id":"pr-caja","p_marca_id":"mk-grido","p_cajas":35,"p_caja_insumo_id":"i-dolce","p_embolsado":"individual"}',
    JSON.stringify(rpcs(S, 'registrar_produccion_item')[0]))
  chk('una caja no habilitada: el error de la base, tal cual', await (async () => {
    const R = armar()
    await hastaCajas(R)
    R.estado.agregar.cajas = 1
    R.__setRpc(async () => ({ data: null, error: { message: 'Esa caja no está habilitada para este producto.' } }))
    await R.confirmarAgregar()
    return R.__doc.getElementById('pr-agregar-error').textContent === 'Esa caja no está habilitada para este producto.'
  })())
  // El cierre manda p_productos VACÍO: ningún camino de la pantalla arma
  // renglones para cerrar_turno (todo se carga con registrar_produccion_item).
  chk('cerrar_turno sigue mandando p_productos vacío',
    JSON.stringify(S.parametrosCerrarTurno('t1', { hora: '14:00', scrap: 0, obs: '' }).p_productos) === '[]')
})())

// ── La pantalla NO toca el stock ─────────────────────────────────────────
{
  const codigo = FUENTE.slice(FUENTE.indexOf('<script type="module">'))
  chk('ningún .insert( en el módulo', !/\.insert\(/.test(codigo))
  chk('ningún .update( ni .delete( sobre stock_movimientos', !/from\('stock_movimientos'\)\s*\.(insert|update|delete|upsert)/.test(codigo))
  const rpcNombres = [...codigo.matchAll(/rpc\('([a-z_]+)'/g)].map(m => m[1])
  chk('ninguna RPC de stock', rpcNombres.length > 0 && !rpcNombres.some(n => /stock/.test(n)), rpcNombres.filter(n => /stock/.test(n)).join(','))
}

// ── Parte 2: la caja y el embolsado de cada renglón ya cargado ───────────
const ITEMS_EMP = [
  { id: 'it-1', orden: 1, sublote: '7023-1', presentacion_id: 'pr-caja', marca_id: 'mk-grido', cajas: 10, unidades_por_caja: 600, unidades: 6000, anulado: false, caja_insumo_id: 'i-nuss', embolsado: 'grande' },
  { id: 'it-2', orden: 2, sublote: '7023-2', presentacion_id: 'pr-caja', marca_id: 'mk-norte', cajas: 2, unidades_por_caja: 600, unidades: 1200, anulado: false, caja_insumo_id: 'i-dolce', embolsado: 'doble' },
  { id: 'it-3', orden: 3, sublote: '7023-3', presentacion_id: 'pr-sin', marca_id: null, cajas: 4, unidades_por_caja: 400, unidades: 1600, anulado: false, caja_insumo_id: null, embolsado: 'ninguno' },
  { id: 'it-4', orden: 4, sublote: '7023-4', presentacion_id: 'pr-caja', marca_id: null, cajas: 5, unidades_por_caja: 600, unidades: 3000, anulado: false, caja_insumo_id: null, embolsado: null },
  { id: 'it-5', orden: 5, sublote: '7023-5', presentacion_id: 'pr-caja', marca_id: null, cajas: 1, unidades_por_caja: 600, unidades: 600, anulado: false, caja_insumo_id: 'i-vieja', embolsado: 'individual' },
]

esperas.push((async () => {
  const S = armar({ tablas: { produccion_items: ITEMS_EMP, insumos: [...INSUMOS, { id: 'i-vieja', nombre: 'Caja vieja', marca: 'Ex' }] } })
  await S.abrirPlanilla('t1')
  chk('la planilla trae la caja y el embolsado de cada renglón',
    /\bcaja_insumo_id\b/.test(select(S, 'produccion_items')) && /\bembolsado\b/.test(select(S, 'produccion_items')), select(S, 'produccion_items'))
  const lista = html(S, 'pr-planilla-producido')
  const renglon = sub => { const i = lista.indexOf(`>${sub}<`); return lista.slice(i, lista.indexOf('pr-producido__botones', i)) }
  chk('un renglón dice su caja y su embolsado', /Caja N°1 Nuss · bolsa grande/.test(renglon('7023-1')), renglon('7023-1'))
  chk('… "doble bolsa"', /Caja N°1 Dolce Pasta · doble bolsa/.test(renglon('7023-2')))
  // Terminar la tablet, parte 5: el embolsado 'ninguno' no se nombra (sin bolsa es lo que no se consumió).
  chk('… sin caja y sin bolsa, no nombra ni caja ni bolsa', /pr-producido__detalle">sin configurar ×400</.test(renglon('7023-3')) && !/sin bolsa/.test(renglon('7023-3')), renglon('7023-3'))
  chk('… uno anterior al empaque no dice nada de más', (renglon('7023-4').match(/pr-producido__detalle/g) || []).length === 1, renglon('7023-4'))
  chk('… y una caja que ya no está en el catálogo se nombra igual', /Caja vieja Ex · bolsitas individuales/.test(renglon('7023-5')), renglon('7023-5'))
  chk('el nombre de esa caja se lee aparte, por id',
    S.__llamadas.consultas.some(([t, f]) => t === 'insumos' && JSON.stringify(f).includes('i-vieja')))
  chk('una caja cuyo nombre no llegó no queda muda', S.nombreCajaItem({ caja_insumo_id: 'x', embolsado: null }, []) === 'caja sin nombre')
})())

// ── Parte 2: el permiso de stock ─────────────────────────────────────────
esperas.push((async () => {
  const S = armar({ tablas: { empleado_tareas: [{ tarea: 'ver', alcance: { unidades: ['u-cn'] } }] } })
  await S.cargarPermisoStock()
  const c = S.__llamadas.consultas.find(([t]) => t === 'empleado_tareas')
  const f = JSON.stringify(c?.[1])
  chk('el permiso de stock se lee de empleado_tareas: stock / ver / habilitado',
    f.includes('["eq","modulo","stock"]') && f.includes('["eq","tarea","ver"]') && f.includes('["eq","habilitado",true]') && f.includes('["eq","empleado_id","emp-tablet"]'), f)
  chk('con alcance en la unidad, puede', S.puedeVerStockEn('u-cn') === true)
  chk('… en otra, no', S.puedeVerStockEn('u-dp') === false)
  S.estado.stockVer = { todas: true }
  chk('con todas, en cualquiera', S.puedeVerStockEn('u-dp') === true)
  S.estado.stockVer = {}
  chk('una fila sin alcance no alcanza (igual que la base)', S.puedeVerStockEn('u-cn') === false)
  S.estado.stockVer = null
  chk('sin la tarea, no', S.puedeVerStockEn('u-cn') === false)
  S.estado.stockVer = undefined
  chk('sin saberlo, null (no un "no")', S.puedeVerStockEn('u-cn') === null)
  S.estado.miRolApp = 'super_admin'
  chk('super_admin siempre', S.puedeVerStockEn('u-cn') === true)

  const N = armar({ tablas: { empleado_tareas: [] } })
  await N.cargarPermisoStock()
  chk('sin fila: no la tiene', N.estado.stockVer === null)
  const E = armar({ tablas: { empleado_tareas: () => ({ data: null, error: { message: 'x' } }) } })
  await E.cargarPermisoStock()
  chk('si falla la lectura: no se sabe', E.estado.stockVer === undefined)
  chk('el permiso se carga al entrar', /await cargarPermisoStock\(\)/.test(FUENTE))
})())

// ── Parte 2: el empaque consumido del turno, en el historial ─────────────
const MOVS = [
  { produccion_item_id: 'it-1', insumo_id: 'i-nuss', cantidad: -10 },
  { produccion_item_id: 'it-1', insumo_id: 'i-tiras', cantidad: -10 },
  { produccion_item_id: 'it-1', insumo_id: 'i-sep', cantidad: -30 },
  { produccion_item_id: 'it-1', insumo_id: 'i-bolsa', cantidad: -10 },
  { produccion_item_id: 'it-1', insumo_id: 'i-sep', cantidad: 6 },
  { produccion_item_id: 'it-2', insumo_id: 'i-tiras', cantidad: -0.5 },
  { produccion_item_id: 'it-2', insumo_id: 'i-ppp', cantidad: -32 },
  { produccion_item_id: 'it-2', insumo_id: 'i-ppp', cantidad: 32 },
]
function armarDetalle({ stockVer = { unidades: ['u-cn'] }, movs = MOVS, items = ITEMS_EMP, unidad = 'u-cn' } = {}) {
  const S = armar({ tablas: {
    turnos_produccion: [{ ...TURNO, unidad_negocio_id: unidad, cerrado_en: null, hora_inicio: null, hora_apagado: null, scrap_kg: null, observaciones: null, completado_por: null, completado_en: null }],
    produccion_items: items, stock_movimientos: movs, produccion_correcciones: [], receta_items: [], ingredientes: [], masa_items: [],
    v_empleados_publico: [], insumos: [...INSUMOS, { id: 'i-vieja', nombre: 'Caja vieja', marca: 'Ex' }],
  } })
  // undefined no se puede pasar: el default del parámetro se lo come.
  S.estado.stockVer = stockVer === 'desconocido' ? undefined : stockVer
  return S
}

esperas.push((async () => {
  const S = armarDetalle()
  const d = await S.leerDetalleTurno('t1')
  chk('el detalle trae la unidad del turno', /\bunidad_negocio_id\b/.test(select(S, 'turnos_produccion')))
  chk('… y la caja y el embolsado de cada sublote',
    /\bcaja_insumo_id\b/.test(select(S, 'produccion_items')) && /\bembolsado\b/.test(select(S, 'produccion_items')))
  const c = S.__llamadas.consultas.find(([t]) => t === 'stock_movimientos')
  chk('los movimientos se piden por los sublotes del turno',
    c && JSON.stringify(c[1]).includes('["in","produccion_item_id",["it-1","it-2","it-3","it-4","it-5"]]'), JSON.stringify(c?.[1]))
  chk('… con insumo y cantidad', /\binsumo_id\b/.test(select(S, 'stock_movimientos')) && /\bcantidad\b/.test(select(S, 'stock_movimientos')))
  const h = S.htmlDetalleTurno(d)
  chk('el sublote dice su caja y embolsado en el historial', /Cucuruchón Mini · con cono · GRIDO · caja ×600 · Caja N°1 Nuss · bolsa grande · 10 cajas = 6\.000 unidades/.test(h), (h.match(/7023-1.{0,200}/) || [''])[0])
  const emp = h.slice(h.indexOf('Empaque consumido'))
  chk('el empaque consumido del turno tiene su sección', h.includes('<h2 class="pr-subtitulo">Empaque consumido</h2>'))
  chk('… neto: la devolución de 6 separadores se resta', /Separador N°1: <strong>24<\/strong>/.test(emp), emp)
  chk('… la caja, en positivo', /Caja N°1 Nuss: <strong>10<\/strong>/.test(emp))
  chk('… con hasta 3 decimales', /Tiras x4: <strong>10,5<\/strong>/.test(emp))
  chk('… lo devuelto entero no se lista', !/Bolsa PPP/.test(emp))
  chk('… ordenado por nombre', emp.indexOf('Bolsa 100x80') < emp.indexOf('Caja N°1 Nuss') && emp.indexOf('Caja N°1 Nuss') < emp.indexOf('Separador'))

  const sp = armarDetalle({ stockVer: null })
  const hsp = sp.htmlDetalleTurno(await sp.leerDetalleTurno('t1'))
  chk('sin stock:ver en la unidad: lo dice', /No se puede ver el stock con este usuario/.test(hsp))
  chk('… y NO consulta el libro (una respuesta vacía mentiría)', !sp.__llamadas.consultas.some(([t]) => t === 'stock_movimientos'))
  chk('… ni dice "no se descontó"', !/No se descontó empaque/.test(hsp))
  const otra = armarDetalle({ stockVer: { unidades: ['u-dp'] } })
  chk('con stock:ver en OTRA unidad, tampoco', /No se puede ver el stock con este usuario/.test(otra.htmlDetalleTurno(await otra.leerDetalleTurno('t1'))))
  // El permiso se mira contra la unidad DEL TURNO, no la de la tablet.
  const ajeno = armarDetalle({ unidad: 'u-dp' })
  chk('un turno de otra unidad se mira con el permiso de ESA unidad',
    /No se puede ver el stock con este usuario/.test(ajeno.htmlDetalleTurno(await ajeno.leerDetalleTurno('t1'))))
  const ds = armarDetalle({ stockVer: 'desconocido' })
  const hds = ds.htmlDetalleTurno(await ds.leerDetalleTurno('t1'))
  chk('sin saber el permiso: lo dice, sin consultar', /No se pudo saber si este usuario puede ver el stock/.test(hds) &&
    !ds.__llamadas.consultas.some(([t]) => t === 'stock_movimientos'))
  const vacio = armarDetalle({ movs: [] })
  chk('sin movimientos: "No se descontó empaque en este turno"',
    /No se descontó empaque en este turno\./.test(vacio.htmlDetalleTurno(await vacio.leerDetalleTurno('t1'))))
  const cero = armarDetalle({ movs: [{ produccion_item_id: 'it-1', insumo_id: 'i-sep', cantidad: -3 }, { produccion_item_id: 'it-1', insumo_id: 'i-sep', cantidad: 3 }] })
  chk('todo devuelto: se dice', /se devolvió/.test(cero.htmlDetalleTurno(await cero.leerDetalleTurno('t1'))))
  const err = armarDetalle({ movs: () => ({ data: null, error: { message: 'x' } }) })
  const herr = err.htmlDetalleTurno(await err.leerDetalleTurno('t1'))
  chk('si falla la lectura del libro, lo dice y el resto del turno se ve igual',
    /No se pudo leer el empaque consumido/.test(herr) && /Lo producido/.test(herr))
  const sinItems = armarDetalle({ items: [] })
  chk('sin sublotes no se consulta el libro', await (async () => {
    await sinItems.leerDetalleTurno('t1')
    return !sinItems.__llamadas.consultas.some(([t]) => t === 'stock_movimientos')
  })())
  chk('el neto redondea a 3 decimales', S.empaqueConsumido([{ insumo_id: 'a', cantidad: -0.1 }, { insumo_id: 'a', cantidad: -0.2 }])[0].cantidad === 0.3)
  const tope = armarDetalle({ movs: Array.from({ length: 1000 }, () => ({ produccion_item_id: 'it-1', insumo_id: 'i-sep', cantidad: -1 })) })
  chk('con 1000 movimientos avisa que puede estar incompleto',
    /solo se leyeron los primeros/.test(tope.htmlEmpaqueTurno(await tope.leerDetalleTurno('t1'))))
})())

// ── Parte 3: Configuración → Empaque, y el tilde "Doble bolsa" ───────────
const INSUMOS_CFG = [
  { id: 'i-nuss', nombre: 'Caja N°1', marca: 'Nuss', categoria: 'Cajas', activo: true },
  { id: 'i-dolce', nombre: 'Caja N°1', marca: 'Dolce Pasta', categoria: 'Cajas', activo: true },
  { id: 'i-sinimp', nombre: 'Caja N°1', marca: 'Sin impresión', categoria: 'Cajas', activo: true },
  { id: 'i-baja', nombre: 'Caja vieja', marca: null, categoria: 'Cajas', activo: false },
  { id: 'i-tiras', nombre: 'Tiras x4', marca: null, categoria: 'Separadores y tiras', activo: true },
  { id: 'i-sep', nombre: 'Separador N°1', marca: null, categoria: 'Separadores y tiras', activo: true },
  { id: 'i-sep2', nombre: 'Separador N°2', marca: null, categoria: 'Separadores y tiras', activo: true },
  { id: 'i-bolsa', nombre: 'Bolsa 100x80', marca: null, categoria: 'Bolsas', activo: true },
]
function armarConfig() {
  const S = construirProduccion(ARCHIVO)
  S.estado.misTareas = new Map([['configurar', { unidades: ['u-cn'] }]])
  Object.assign(S.__tablas, {
    productos_terminados: [
      { id: 'p-mini', nombre: 'Cucuruchón Mini', tipo_masa: 'Común', activo: true, orden: 1 },
      { id: 'p-choco', nombre: 'Cucuruchón Mini Chocolate', tipo_masa: 'Chocolate', activo: true, orden: 2 },
    ],
    producto_presentaciones: [
      { id: 'pr-caja', producto_id: 'p-mini', nombre: 'Caja', media_caja: false, activa: true, orden: 1 },
      { id: 'pr-media', producto_id: 'p-mini', nombre: 'Media caja', media_caja: true, activa: true, orden: 2 },
      { id: 'pr-std', producto_id: 'p-mini', nombre: 'Standard media', media_caja: true, activa: false, orden: 3 },
      { id: 'pr-choco', producto_id: 'p-choco', nombre: 'Caja choco', media_caja: false, activa: true, orden: 1 },
    ],
    presentacion_cajas: [
      { presentacion_id: 'pr-caja', insumo_id: 'i-nuss', embolsado_sugerido: 'grande' },
      { presentacion_id: 'pr-caja', insumo_id: 'i-dolce', embolsado_sugerido: 'individual' },
      { presentacion_id: 'pr-choco', insumo_id: 'i-nuss', embolsado_sugerido: 'grande' },
    ],
    presentacion_empaque: [
      { id: 'e1', presentacion_id: 'pr-caja', insumo_id: 'i-tiras', cantidad: 1, condicion: 'siempre' },
      { id: 'e2', presentacion_id: 'pr-caja', insumo_id: 'i-bolsa', cantidad: 1, condicion: 'bolsa_grande' },
      { id: 'e3', presentacion_id: 'pr-media', insumo_id: 'i-tiras', cantidad: 0.5, condicion: 'siempre' },
    ],
    insumos: INSUMOS_CFG,
    marcas_personalizadas: [
      { id: 'mk-grido', nombre: 'GRIDO', activa: true, estado_alta: 'aprobada', doble_bolsa: false },
      { id: 'mk-norte', nombre: 'HELADOS DEL NORTE', activa: true, estado_alta: 'aprobada', doble_bolsa: true },
    ],
  })
  S.__setRpc(async () => ({ data: null, error: null }))
  return S
}
// Campos falsos del cuerpo de Configuración (el DOM falso no tiene
// querySelectorAll): cada uno responde a su atributo.
function camposCfg(S, campos) {
  S.__doc.getElementById('pr-config-cuerpo').querySelectorAll = (sel) => {
    const attr = (sel.match(/\[([a-z-]+)/) || [])[1]
    return campos.filter(i => attr in i.atributos)
  }
}
function campo(atributos, value = '') {
  const dataset = {}
  for (const [k, v] of Object.entries(atributos)) if (k.startsWith('data-')) dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v
  return { atributos, dataset, getAttribute: (k) => atributos[k] ?? null, value }
}
const cuerpoCfg = S => S.__doc.getElementById('pr-config-cuerpo').innerHTML
async function abrirEmpaque(S) {
  await S.mostrarConfig()
  S.estado.config.tab = 'empaque'
  await S.cargarPestanaConfig()
}
// La tarjeta de UNA presentación dentro del cuerpo.
const tarjeta = (h, presId) => {
  const i = h.indexOf(`data-emp-guardar="${presId}"`)
  const ini = h.lastIndexOf('<div class="pr-config-sub pr-emp', i)
  return h.slice(ini, i)
}

esperas.push((async () => {
  const S = armarConfig()
  chk('Configuración tiene la pestaña Empaque, después de Productos',
    S.PESTANAS_CONFIG.map(([k]) => k).join(',') === 'maquinas,recetas,ingredientes,productos,empaque,marcas,personal')
  await abrirEmpaque(S)
  chk('la pestaña se lee y se dibuja', S.estado.config.datos?.borradores instanceof Map && /Guardar empaque/.test(cuerpoCfg(S)), cuerpoCfg(S).slice(0, 300))
  chk('las cajas se leen con su embolsado sugerido', /\bembolsado_sugerido\b/.test(select(S, 'presentacion_cajas')))
  chk('el empaque, con cantidad y condición', /\bcantidad\b/.test(select(S, 'presentacion_empaque')) && /\bcondicion\b/.test(select(S, 'presentacion_empaque')))
  chk('los insumos, con categoría y si están activos', /\bcategoria\b/.test(select(S, 'insumos')) && /\bactivo\b/.test(select(S, 'insumos')))
  chk('los productos son los de la unidad elegida',
    S.__llamadas.consultas.some(([t, f]) => t === 'productos_terminados' && JSON.stringify(f).includes('["eq","unidad_negocio_id","u-cn"]')))
  const h = cuerpoCfg(S)
  chk('agrupadas por producto, con los de chocolate abajo', h.indexOf('Cucuruchón Mini<') < h.indexOf('pr-ag__corte') && h.indexOf('pr-ag__corte') < h.indexOf('Caja choco'))
  const caja = tarjeta(h, 'pr-caja')
  chk('cada caja habilitada con su embolsado sugerido elegido',
    /Caja N°1 Nuss/.test(caja) && /Caja N°1 Dolce Pasta/.test(caja) && /value="individual" selected/.test(caja), caja.slice(0, 600))
  chk('… el alta ofrece SOLO cajas activas del rubro Cajas que no están',
    /data-emp-caja-nueva="pr-caja"/.test(caja) && /<option value="i-sinimp">/.test(caja) && !/<option value="i-nuss">/.test(caja) &&
    !/<option value="i-baja">/.test(caja) && !/<option value="i-tiras">/.test(caja))
  chk('… los renglones con su cantidad (3 decimales) y su condición',
    /data-emp-cant="pr-caja\|0" data-numero="1" data-decimales="3"/.test(caja) && /value="bolsa_grande" selected/.test(caja))
  chk('una presentación completa no avisa nada', !/Produce sin descontar/.test(caja))
  chk('una activa sin cajas: "Produce sin descontar la caja"', /Produce sin descontar la caja: no tiene ninguna caja/.test(tarjeta(h, 'pr-media')))
  chk('una activa sin renglones: "Produce sin descontar el empaque"', /Produce sin descontar el empaque/.test(tarjeta(h, 'pr-choco')))
  chk('las dos cosas juntas', S.faltaEmpaque({ cajas: [], empaque: [] }, 'x') === 'Produce sin descontar la caja ni el empaque.')
  chk('una INACTIVA no avisa (no produce)', !/Produce sin descontar/.test(tarjeta(h, 'pr-std')) && /inactiva/.test(tarjeta(h, 'pr-std')))
  chk('el buscador de insumos ofrece solo los activos', /<datalist id="pr-emp-insumos">/.test(h) && /value="Separador N°2"/.test(h) && !/value="Caja vieja"/.test(h))

  // Editar el borrador: agregar y quitar, sin llamar a la base.
  camposCfg(S, [
    campo({ 'data-emp-caja-nueva': 'pr-caja' }, 'i-sinimp'),
    campo({ 'data-emp-insumo-nuevo': 'pr-caja' }, 'separador n°2'),
    campo({ 'data-emp-cant': 'pr-caja|0' }, '2'),
    campo({ 'data-emp-cant': 'pr-caja|1' }, '1'),
  ])
  await S.accionEmpaque({ empAgregarCaja: 'pr-caja' })
  const b = () => S.estado.config.datos.borradores.get('pr-caja')
  chk('agregar una caja la suma al borrador (sugiere bolsa grande)', b().cajas.map(x => x.insumo_id).join(',') === 'i-nuss,i-dolce,i-sinimp' && b().cajas[2].embolsado_sugerido === 'grande')
  chk('… las cantidades tipeadas se pasan al borrador antes de redibujar', b().empaque[0].cantidad === 2)
  chk('… y la tarjeta queda marcada sin guardar', /sin guardar/.test(tarjeta(cuerpoCfg(S), 'pr-caja')))
  chk('… sin llamar a la base', S.__llamadas.rpc.length === 0)
  await S.accionEmpaque({ empAgregar: 'pr-caja' })
  chk('agregar un insumo por su nombre (sin acentos ni mayúsculas)', b().empaque.map(x => x.insumo_id).join(',') === 'i-tiras,i-bolsa,i-sep2' && b().empaque[2].condicion === 'siempre' && b().empaque[2].cantidad === null)
  chk('insumoPorTexto: el único que contiene el texto', S.insumoPorTexto(S.estado.config.datos, 'tiras')?.id === 'i-tiras')
  chk('… con dos que lo contienen, ninguno', S.insumoPorTexto(S.estado.config.datos, 'separador') === null)
  chk('… uno desactivado no se ofrece', S.insumoPorTexto(S.estado.config.datos, 'caja vieja') === null)
  camposCfg(S, [campo({ 'data-emp-insumo-nuevo': 'pr-caja' }, 'separador')])
  await S.accionEmpaque({ empAgregar: 'pr-caja' })
  chk('un texto que no es un insumo de la lista: lo dice, pegado', /pr-cfg-error" role="alert">Elegí un insumo de la lista\./.test(tarjeta(cuerpoCfg(S), 'pr-caja')) && b().empaque.length === 3)
  // Lo agregado al borrador NO apaga el aviso: el aviso es de lo guardado,
  // que es con lo que produce la base.
  camposCfg(S, [campo({ 'data-emp-caja-nueva': 'pr-media' }, 'i-nuss'), campo({ 'data-emp-cant': 'pr-media|0' }, '0,5')])
  await S.accionEmpaque({ empAgregarCaja: 'pr-media' })
  const media = tarjeta(cuerpoCfg(S), 'pr-media')
  chk('agregar una caja sin guardar marca la tarjeta', /sin guardar/.test(media) && S.estado.config.datos.borradores.get('pr-media').tocado === true)
  chk('… y el aviso sigue hasta que se guarde', /Produce sin descontar la caja/.test(media))
  camposCfg(S, [])
  await S.accionEmpaque({ empQuitarCaja: 'pr-caja|1' })
  chk('quitar una caja', b().cajas.map(x => x.insumo_id).join(',') === 'i-nuss,i-sinimp')
  await S.accionEmpaque({ empQuitar: 'pr-caja|1' })
  chk('quitar un renglón', b().empaque.map(x => x.insumo_id).join(',') === 'i-tiras,i-sep2')
  S.cambiarSelectEmpaque({ dataset: { empCond: 'pr-caja|1' }, value: 'bolsa_individual' })
  chk('cambiar la condición', b().empaque[1].condicion === 'bolsa_individual')
  S.cambiarSelectEmpaque({ dataset: { empSug: 'pr-caja|1' }, value: 'ninguno' })
  chk('cambiar el embolsado sugerido de una caja', b().cajas[1].embolsado_sugerido === 'ninguno')

  // Guardar: sin cantidad no se manda; con todo, UNA llamada con las dos listas.
  await S.accionEmpaque({ empGuardar: 'pr-caja' })
  chk('un renglón sin cantidad no se manda', S.__llamadas.rpc.length === 0 &&
    /Las cantidades tienen que ser mayores a cero\./.test(tarjeta(cuerpoCfg(S), 'pr-caja')))
  camposCfg(S, [campo({ 'data-emp-cant': 'pr-caja|0' }, '1'), campo({ 'data-emp-cant': 'pr-caja|1' }, '0,5')])
  await S.accionEmpaque({ empGuardar: 'pr-caja' })
  const llamadas = S.__llamadas.rpc.filter(([n]) => n === 'guardar_empaque_presentacion')
  chk('guardar: UNA sola llamada con las dos listas', llamadas.length === 1 && S.__llamadas.rpc.length === 1)
  chk('… con las cajas y el empaque completos',
    JSON.stringify(llamadas[0]?.[1]) === JSON.stringify({
      p_presentacion_id: 'pr-caja',
      p_cajas: [{ insumo_id: 'i-nuss', embolsado_sugerido: 'grande' }, { insumo_id: 'i-sinimp', embolsado_sugerido: 'ninguno' }],
      p_empaque: [{ insumo_id: 'i-tiras', cantidad: 1, condicion: 'siempre' }, { insumo_id: 'i-sep2', cantidad: 0.5, condicion: 'bolsa_individual' }],
    }), JSON.stringify(llamadas[0]?.[1]))
  chk('… y relee lo guardado (el borrador vuelve a la base)', S.estado.config.datos.borradores.get('pr-caja').tocado === false)
  chk('repetido con la misma condición: no se manda',
    S.parametrosGuardarEmpaque('x', { cajas: [], empaque: [{ insumo_id: 'a', cantidad: 1, condicion: 'siempre' }, { insumo_id: 'a', cantidad: 2, condicion: 'siempre' }] }).error)
  chk('… con distinta condición, sí',
    !S.parametrosGuardarEmpaque('x', { cajas: [], empaque: [{ insumo_id: 'a', cantidad: 1, condicion: 'bolsa_grande' }, { insumo_id: 'a', cantidad: 2, condicion: 'bolsa_individual' }] }).error)
  chk('una presentación sin nada se puede guardar vacía', JSON.stringify(S.parametrosGuardarEmpaque('x', { cajas: [], empaque: [] })) === '{"p_presentacion_id":"x","p_cajas":[],"p_empaque":[]}')

  // El error de la base, tal cual y pegado al botón de ESA presentación.
  S.__setRpc(async () => ({ data: null, error: { message: 'Una de las cajas no existe o no es del rubro Cajas.' } }))
  camposCfg(S, [campo({ 'data-emp-cant': 'pr-caja|0' }, '1'), campo({ 'data-emp-cant': 'pr-caja|1' }, '1')])
  await S.accionEmpaque({ empGuardar: 'pr-caja' })
  const t = tarjeta(cuerpoCfg(S), 'pr-caja')
  chk('el error de la base, tal cual, pegado a su botón', /pr-cfg-error" role="alert">Una de las cajas no existe o no es del rubro Cajas\.<\/div><button type="button" class="pr-btn" id="pr-cfg-emp-pr-caja"/.test(t), t.slice(-400))
  chk('… y no en otra presentación', !/Una de las cajas/.test(tarjeta(cuerpoCfg(S), 'pr-media')))

  // El despacho de los eventos.
  chk('los botones de la pestaña van a accionEmpaque', /else if \(tab === 'empaque'\) accionEmpaque\(ds\)/.test(FUENTE))
  chk('los selects, a cambiarSelectEmpaque', /if \(t\.dataset\?\.empSug !== undefined \|\| t\.dataset\?\.empCond !== undefined\) return cambiarSelectEmpaque\(t\)/.test(FUENTE))
  chk('el tilde de doble bolsa, a cambiarDobleBolsa', /if \(t\.dataset\?\.marcaDoble !== undefined\) return cambiarDobleBolsa\(t\.dataset\.marcaDoble, t\.checked\)/.test(FUENTE))
})())

esperas.push((async () => {
  const S = armarConfig()
  await S.mostrarConfig()
  S.estado.config.tab = 'marcas'
  await S.cargarPestanaConfig()
  chk('las marcas se leen con doble_bolsa', S.__llamadas.consultas.some(([t, f]) => t === 'marcas_personalizadas' && f.some(x => x[0] === 'select' && /\bdoble_bolsa\b/.test(x[1]))))
  const h = cuerpoCfg(S)
  chk('cada cono tiene su tilde "Doble bolsa"', /data-marca-doble="mk-grido">/.test(h) && /data-marca-doble="mk-norte" checked>/.test(h), h.slice(0, 800))
  chk('… con la explicación del norte y la humedad', /van al norte, por la humedad/.test(h))
  await S.cambiarDobleBolsa('mk-grido', true)
  const ll = S.__llamadas.rpc.filter(([n]) => n === 'marcar_doble_bolsa')
  chk('tildarlo llama a marcar_doble_bolsa', ll.length === 1 && JSON.stringify(ll[0][1]) === '{"p_marca_id":"mk-grido","p_doble":true}', JSON.stringify(ll))
  await S.cambiarDobleBolsa('mk-norte', false)
  chk('destildarlo manda false', S.__llamadas.rpc.filter(([n]) => n === 'marcar_doble_bolsa')[1]?.[1].p_doble === false)
  S.__setRpc(async () => ({ data: null, error: { message: 'No tenés permiso.' } }))
  await S.cambiarDobleBolsa('mk-grido', true)
  chk('el error de la base, tal cual, pegado a la lista', /pr-cfg-marcas-lista"[^>]*>[^<]*<\/p><div class="pr-cfg-error" role="alert">No tenés permiso\./.test(cuerpoCfg(S)))
  chk('… y el tilde vuelve a lo guardado', /data-marca-doble="mk-grido">/.test(cuerpoCfg(S)))
})())

// ── Parte 4: avisos de stock del empaque, que NO bloquean ────────────────
const STOCK = [
  { insumo_id: 'i-nuss', cantidad_total: 5 },
  { insumo_id: 'i-tiras', cantidad_total: 100 },
  { insumo_id: 'i-sep', cantidad_total: 18 },
  { insumo_id: 'i-bolsa', cantidad_total: 100 },
]
async function conStock({ stockVer = { unidades: ['u-cn'] }, stock = STOCK, presentacion = 'pr-caja' } = {}) {
  const S = armar({ tablas: { v_stock_insumos: stock } })
  S.estado.stockVer = stockVer === 'desconocido' ? undefined : stockVer
  await hastaCajas(S, { presentacion })
  await S.cargarStockAgregar()
  return S
}
const conCajas = (S, n) => { S.ponerNumero(S.__doc.getElementById('pr-agregar-cajas'), n); S.estado.agregar.cajas = n; S.pintarAgregar() }

esperas.push((async () => {
  const S = await conStock()
  const c = S.__llamadas.consultas.find(([t]) => t === 'v_stock_insumos')
  chk('el stock se lee de v_stock_insumos, de la unidad', c && JSON.stringify(c[1]).includes('["eq","unidad_negocio_id","u-cn"]'), JSON.stringify(c?.[1]))
  chk('… solo de los insumos del empaque', c && JSON.stringify(c[1]).includes('["in","insumo_id",["i-nuss","i-dolce","i-sinimp","i-otra","i-tiras","i-sep","i-bolsa","i-ppp"]]'), JSON.stringify(c?.[1]))
  chk('… con insumo y cantidad', /\binsumo_id\b/.test(select(S, 'v_stock_insumos')) && /\bcantidad_total\b/.test(select(S, 'v_stock_insumos')))
  chk('abrir agregar lee el stock solo', /return cargarStockAgregar\(estado\.agregar\)/.test(FUENTE))

  chk('con stock de sobra para una caja, no se avisa nada', !/Falta/.test(html(S, 'pr-agregar-empaque')), html(S, 'pr-agregar-empaque'))
  conCajas(S, 10)
  const h = html(S, 'pr-agregar-empaque')
  chk('con 10 cajas: faltan cajas de cartón', h.includes('Faltan 5 Caja N°1 Nuss: hay 5, se necesitan 10'), h)
  chk('… y separadores', h.includes('Faltan 12 Separador N°1: hay 18, se necesitan 30'))
  chk('… en bordó', /pr-aviso pr-aviso--grave">Faltan 5/.test(h))
  chk('… sin nombrar lo que alcanza', !/Tiras x4: hay/.test(h) && !/Bolsa 100x80: hay/.test(h))
  const J = await conStock({ stock: [...STOCK.filter(r => r.insumo_id !== 'i-sep'), { insumo_id: 'i-sep', cantidad_total: 30 }] })
  conCajas(J, 10)
  chk('lo justo alcanza: no es un faltante', !/Separador N°1: hay/.test(html(J, 'pr-agregar-empaque')), html(J, 'pr-agregar-empaque'))
  chk('… y dice que se puede cargar igual', /Se puede cargar igual\./.test(h))
  chk('… y reemplaza a la línea del consumo (las dos no entran a 1280×800)', !/10 cajas = /.test(h))
  chk('el aviso NO deshabilita el botón', S.__doc.getElementById('pr-agregar-confirmar').disabled === false)
  S.__setRpc(async () => ({ data: { sublote: '7023-1' }, error: null }))
  await S.confirmarAgregar()
  chk('… y agregar anda igual', S.__llamadas.rpc.filter(([n]) => n === 'registrar_produccion_item').length === 1)

  // Un insumo sin fila en la vista es un cero de verdad (con stock:ver).
  const Z = await conStock({ stock: STOCK.filter(r => r.insumo_id !== 'i-bolsa') })
  conCajas(Z, 10)
  chk('sin fila en la vista: hay 0', html(Z, 'pr-agregar-empaque').includes('Faltan 10 Bolsa 100x80: hay 0, se necesitan 10'))

  // Medias planchas y singular.
  const M = await conStock({ presentacion: 'pr-media', stock: [...STOCK.filter(r => r.insumo_id !== 'i-tiras'), { insumo_id: 'i-tiras', cantidad_total: 1 }] })
  conCajas(M, 3)
  chk('media caja: falta media plancha', html(M, 'pr-agregar-empaque').includes('Falta 0,5 Tiras x4: hay 1, se necesitan 1,5'), html(M, 'pr-agregar-empaque'))

  // En el paso de la caja, contra UNA caja si todavía no hay número.
  const P = await conStock({ stock: STOCK.filter(r => r.insumo_id !== 'i-nuss') })
  P.irAPasoAgregar('caja')
  chk('al elegir la caja, avisa si no hay ni una', html(P, 'pr-agregar-panel').includes('Falta 1 Caja N°1 Nuss: hay 0, se necesitan 1'), html(P, 'pr-agregar-panel'))
  P.elegirCaja('i-dolce')
  chk('… y cambia con la caja', !/Caja N°1 Nuss: hay/.test(html(P, 'pr-agregar-panel')) && /Caja N°1 Dolce Pasta: hay 0/.test(html(P, 'pr-agregar-panel')))
  chk('faltantes sin stock leído: null (no se inventa)', P.faltantesEmpaque({ ...P.estado.agregar, stock: { estado: 'error' } }, P.estado.catalogo) === null)
})())

esperas.push((async () => {
  const S = await conStock({ stockVer: null })
  chk('sin stock:ver: no se consulta la vista', !S.__llamadas.consultas.some(([t]) => t === 'v_stock_insumos'))
  conCajas(S, 10)
  chk('… y se dice, en vez de un faltante inventado',
    /No se puede ver el stock con este usuario/.test(html(S, 'pr-agregar-empaque')) && !/Falta/.test(html(S, 'pr-agregar-empaque')))
  chk('… tampoco en el paso de la caja', (() => { S.irAPasoAgregar('caja'); return /No se puede ver el stock con este usuario/.test(html(S, 'pr-agregar-panel')) })())
  const D = await conStock({ stockVer: 'desconocido' })
  chk('sin saber el permiso: se dice, sin consultar', /No se pudo saber si este usuario puede ver el stock/.test(html(D, 'pr-agregar-empaque')) &&
    !D.__llamadas.consultas.some(([t]) => t === 'v_stock_insumos'))
  const E = await conStock({ stock: () => ({ data: null, error: { message: 'x' } }) })
  chk('si falla la lectura: "No se pudo leer el stock"', /No se pudo leer el stock\./.test(html(E, 'pr-agregar-empaque')))
  chk('… y agregar sigue andando', E.__doc.getElementById('pr-agregar-confirmar').disabled === false)
  // Sin nada que consuma, no se dice nada del stock.
  const N = armar()
  N.estado.stockVer = null
  await N.abrirPlanilla('t1')
  N.abrirAgregar()
  N.elegirProductoAgregar('p-std'); N.elegirConoSiNo(false); N.elegirPresentacionAgregar('pr-sin')
  await N.cargarStockAgregar()
  chk('sin empaque que consumir, ningún aviso de stock', !/stock/.test(html(N, 'pr-agregar-empaque')))
  N.irAPasoAgregar('caja')
  chk('… tampoco en el paso de la caja', !/stock/.test(html(N, 'pr-agregar-panel')), html(N, 'pr-agregar-panel'))
  // Una respuesta que llega tarde no pisa otro "Agregar".
  // La PRIMERA lectura llega tarde (después de la segunda).
  let llamada = 0
  const T = armar({ tablas: { v_stock_insumos: () => (++llamada === 1
    ? new Promise(r => setTimeout(() => r({ data: [{ insumo_id: 'i-nuss', cantidad_total: 5 }], error: null }), 20))
    : { data: [{ insumo_id: 'i-nuss', cantidad_total: 999 }], error: null }) } })
  T.estado.stockVer = { todas: true }
  await T.abrirPlanilla('t1')
  const p1 = T.abrirAgregar()
  const p2 = T.abrirAgregar()
  const nuevo = T.estado.agregar
  await Promise.all([p1, p2])
  chk('cada Agregar se queda con SU lectura del stock, aunque la anterior llegue tarde', nuevo.stock.saldos.get('i-nuss') === 999, JSON.stringify([...(nuevo.stock.saldos ?? new Map())]))
})())

// ── XSS: cada render nuevo con HTML malicioso ────────────────────────────
esperas.push((async () => {
  const X = armar()
  await X.abrirPlanilla('t1')
  const catMalo = {
    ...X.estado.catalogo,
    cajaPredeterminadaId: 'i-malo',
    insumos: [
      { id: 'i-malo', nombre: marca('cajaNombre'), marca: marca('cajaMarca') },
      { id: 'i-tiras', nombre: marca('insumoEmpaque'), marca: null },
    ],
    cajas: [{ presentacion_id: 'pr-caja', insumo_id: 'i-malo', embolsado_sugerido: 'grande' }],
    empaque: [{ presentacion_id: 'pr-caja', insumo_id: 'i-tiras', cantidad: 1, condicion: 'siempre' }],
  }
  const a = { paso: 'caja', productoId: 'p-mini', conCono: true, presentacionId: 'pr-caja', marcaId: null, marcaElegida: true,
    cajaId: 'i-malo', cajaElegida: true, embolsado: 'grande', cajas: 3 }
  chequearMarcas(chk, 'paso de la caja', X.htmlPasoCaja(a, catMalo), ['cajaNombre', 'cajaMarca', 'insumoEmpaque'])
  chequearMarcas(chk, 'resumen del empaque', X.htmlEmpaqueAgregar(a, catMalo), ['cajaNombre', 'cajaMarca', 'insumoEmpaque'])
  chequearMarcas(chk, 'resumen del empaque sin cajas cargadas', X.htmlEmpaqueAgregar({ ...a, cajas: null }, catMalo), ['cajaNombre', 'insumoEmpaque'])
  chequearMarcas(chk, 'pasos con la caja', X.htmlPasosAgregar(X.pasosAgregar(a, catMalo)), ['cajaNombre', 'cajaMarca'])
  const conIdMalo = { ...catMalo, cajas: [{ presentacion_id: 'pr-caja', insumo_id: marca('cajaId'), embolsado_sugerido: 'grande' }] }
  chequearMarcas(chk, 'id de la caja en el atributo', X.htmlPasoCaja({ ...a, cajaId: null }, conIdMalo), ['cajaId'])
  // Parte 2: el renglón ya cargado y el empaque del turno.
  const itemMalo = { id: 'it-x', sublote: '7023-9', presentacion_id: 'pr-caja', marca_id: null, cajas: 1, unidades: 600, caja_insumo_id: 'i-malo', embolsado: marca('embolsado') }
  chequearMarcas(chk, 'renglón de la planilla con su caja', X.htmlProducido(itemMalo, catMalo, []), ['cajaNombre', 'cajaMarca', 'embolsado'])
  const dMalo = { turno: { ...TURNO, estado: 'cerrado' }, operarios: [], masas: [], items: [], recItems: [], ingredientes: [], insumos: [], paradas: [],
    producido: [itemMalo], correcciones: [], presentaciones: [], productos: [], marcas: [], nombres: new Map(),
    empaque: { estado: 'ok', movimientos: [{ insumo_id: 'i-malo', cantidad: -1 }] }, insumosEmpaque: catMalo.insumos }
  chequearMarcas(chk, 'detalle del turno con su empaque', X.htmlDetalleTurno(dMalo), ['cajaNombre', 'cajaMarca', 'embolsado'])
  chequearMarcas(chk, 'empaque consumido', X.htmlEmpaqueTurno(dMalo), ['cajaNombre', 'cajaMarca'])
  // Parte 3: la pestaña Empaque.
  const cfgMalo = {
    productos: [{ id: marca('prodIdCfg'), nombre: marca('prodCfg'), tipo_masa: 'Común', activo: true, orden: 1 }],
    presentaciones: [{ id: marca('presIdCfg'), producto_id: marca('prodIdCfg'), nombre: marca('presCfg'), activa: true, orden: 1 }],
    cajas: [], empaque: [],
    insumos: [
      { id: marca('insIdCfg'), nombre: marca('insCfg'), marca: marca('insMarcaCfg'), categoria: 'Cajas', activo: true },
      { id: marca('insId2Cfg'), nombre: marca('ins2Cfg'), marca: null, categoria: 'Cajas', activo: true },
    ],
  }
  cfgMalo.borradores = new Map([[marca('presIdCfg'), {
    cajas: [{ insumo_id: marca('insIdCfg'), embolsado_sugerido: 'grande' }],
    empaque: [{ insumo_id: marca('insIdCfg'), cantidad: 1, condicion: 'siempre' }], tocado: true }]])
  const cMalo = { datos: cfgMalo, error: { texto: marca('errorCfg'), donde: 'pr-cfg-emp-' + marca('presIdCfg') } }
  chequearMarcas(chk, 'pestaña Empaque', X.htmlConfigEmpaque(cMalo), ['prodCfg', 'presCfg', 'presIdCfg', 'insCfg', 'insMarcaCfg', 'insId2Cfg', 'ins2Cfg', 'errorCfg'])
  const marcasMalo = { datos: { marcas: [{ id: marca('marcaIdCfg'), nombre: marca('marcaCfg'), activa: true, estado_alta: 'aprobada', doble_bolsa: true }], nombres: new Map() }, busqueda: '', error: null }
  // Parte 4: el aviso de stock.
  chequearMarcas(chk, 'aviso de faltante', X.htmlAvisoStockEmpaque({ ...a, cajas: 5, stock: { estado: 'ok', saldos: new Map() } }, catMalo), ['cajaNombre', 'cajaMarca', 'insumoEmpaque'])
  chequearMarcas(chk, 'marcas con su tilde de doble bolsa', X.htmlConfigMarcas(marcasMalo), ['marcaIdCfg', 'marcaCfg'])
})())

fin()
