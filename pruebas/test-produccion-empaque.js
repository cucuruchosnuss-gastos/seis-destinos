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

  // Si el empaque no se puede leer, NO se puede agregar: agregar sin la caja
  // la dejaría sin descontar en silencio.
  const E = armar({ tablas: { presentacion_empaque: () => ({ data: null, error: { message: 'sin red' } }) } })
  await E.abrirPlanilla('t1')
  chk('sin el empaque, el catálogo no queda a medias', E.estado.catalogo === null)
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
  chk('… sin caja, solo "sin bolsa"', /pr-producido__detalle">sin bolsa</.test(renglon('7023-3')), renglon('7023-3'))
  chk('… uno anterior al empaque no dice nada de más', (renglon('7023-4').match(/pr-producido__detalle/g) || []).length === 1, renglon('7023-4'))
  chk('… y una caja que ya no está en el catálogo se nombra igual', /Caja vieja Ex · bolsitas individuales/.test(renglon('7023-5')), renglon('7023-5'))
  chk('el nombre de esa caja se lee aparte, por id',
    S.__llamadas.consultas.some(([t, f]) => t === 'insumos' && JSON.stringify(f).includes('i-vieja')))
  chk('una caja cuyo nombre no llegó no queda muda', S.textoEmpaqueItem({ caja_insumo_id: 'x', embolsado: null }, []) === 'caja sin nombre')
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
  chk('el sublote dice su caja y embolsado en el historial', /GRIDO · Caja N°1 Nuss · bolsa grande · 10 cajas/.test(h), (h.match(/7023-1.{0,200}/) || [''])[0])
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
})())

fin()
