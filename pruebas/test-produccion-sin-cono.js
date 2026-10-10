// UN SOLO "SIN CONO" (10/10/2026, pedido de Facu). En la planta había dos
// formas de decir "sin cono": la presentación "Caja sin cono" y, adentro de
// "Caja con cono", el cono "Común" (marca_id null). Para la fábrica es lo
// mismo, pero quedaban separados en el stock. Desde ahora:
//  - con cono, el cono es OBLIGATORIO y tiene nombre (o se propone uno
//    nuevo): no hay "Común" ni "sin marca"; lo común es la presentación SIN
//    cono;
//  - no se puede guardar "con cono" sin cono elegido: ni al agregar, ni sin
//    internet (no entra a la cola), ni al corregir en la planta o en la gestión;
//  - un renglón viejo con cono y sin marca dice "Falta el cono", nunca "Común"
//    (los datos viejos los pasa Facu a "sin cono").
// Retiros, Pedidos, Stock y Administración tienen lo suyo en sus suites
// (test-retiros-carga/-lotes/-mis, test-pedidos-carga, test-stock-traspaso,
// test-administracion-ordenes).
//
//   node pruebas/test-produccion-sin-cono.js
//   ARCHIVO_TEST=<copia de la planta>  ARCHIVO_GESTION=<copia de la gestión>

process.env.TZ = 'UTC'
const path = require('path')
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const ARCHIVO_GESTION = process.env.ARCHIVO_GESTION || path.join(__dirname, '..', 'modulos/produccion-gestion.html')
const FUENTE = leer(ARCHIVO)
const FUENTE_G = leer(ARCHIVO_GESTION)
const { chk, esperas, fin } = arnes()

const RED = { message: 'TypeError: Failed to fetch', code: '' }
const ELEGI = 'Elegí el cono: con cono tiene que tener un cono con nombre. Si es común, elegí «Sin cono».'
const TURNO = {
  id: 't1', lote: 7023, maquina_id: 'm1', fecha: '2026-10-10', turno: 'Mañana', encargado_id: 'e-fede',
  abierto_en: '2026-10-10T09:02:00Z', estado: 'abierto', forzado_por: null, forzado_en: null, forzado_motivo: null,
  hora_inicio: '06:00:00', hora_fin: null, hora_largada: null,
}
const CATALOGO = {
  productos_terminados: [{ id: 'p-mini', nombre: 'Cucuruchón Mini', tipo_masa: 'Común', orden: 1 }],
  producto_presentaciones: [
    { id: 'pr-con', producto_id: 'p-mini', nombre: 'Caja con cono', con_cono: true, media_caja: false, empaque: null, unidades_por_caja: 320, orden: 1 },
    { id: 'pr-sin', producto_id: 'p-mini', nombre: 'Caja sin cono', con_cono: false, media_caja: false, empaque: null, unidades_por_caja: 600, orden: 2 },
  ],
  marcas_personalizadas: [{ id: 'mk-grido', nombre: 'GRIDO', estado_alta: 'aprobada', activa: true }],
  presentacion_cajas: [], presentacion_empaque: [], insumos: [],
  unidades_negocio: [{ id: 'u-cn', caja_predeterminada_id: null }],
}
// Un sublote VIEJO: con cono y sin marca (el "Común" de antes).
const VIEJO = { id: 'it-viejo', orden: 1, sublote: '7023-1', presentacion_id: 'pr-con', marca_id: null, cajas: 10, unidades_por_caja: 320, unidades: 3200, anulado: false, caja_insumo_id: null, embolsado: null }

function armar({ items = [] } = {}) {
  const S = construirProduccion(ARCHIVO)
  Object.assign(S.__tablas, {
    ...CATALOGO,
    turnos_produccion: filtros => filtros.some(f => f[1] === 'estado' && f[2] === 'pendiente_completar') ? { data: [], error: null } : { data: [TURNO], error: null },
    turno_operarios: [], masas: [], paradas_produccion: [], produccion_items: items,
    maquinas: [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }],
  })
  const red = { on: true, cargas: [] }
  const CARGAS = ['registrar_produccion_item', 'corregir_produccion_item_completo']
  S.__setRpc(async (op, params) => {
    if (!red.on) return { data: null, error: RED }
    if (!CARGAS.includes(op)) return { data: op === 'personal_produccion' ? [] : null, error: null }
    red.cargas.push({ op, params })
    return { data: op === 'registrar_produccion_item' ? { produccion_item_id: 'pi-1', sublote: '7023-2', unidades: params.p_cajas * 320, embolsado: 'ninguno' } : null, error: null }
  })
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva', puesto: 'encargado' }
  S.estado.tablero = [{ maquina: { id: 'm1', nombre: 'Máquina 1' }, turno: { id: 't1' } }]
  S.estado.sesionPlanta = { unidad_negocio_id: 'u-cn' }
  return { S, red, sinRed() { red.on = false; S.__nav.onLine = false } }
}

const html = (S, id) => S.__doc.getElementById(id).innerHTML
const cargas = (red, op) => red.cargas.filter(c => c.op === op)
const COMUN = /data-marca=""|>Común<|Común<span|con cono, sin marca/

// Con cono SIN elegir el cono: el camino que todavía existe en el código
// (data-ag-cono="1"), y también un estado viejo a medio cargar.
function conConoSinCono(S) {
  S.abrirAgregar()
  S.elegirProductoAgregar('p-mini')
  S.elegirConoSiNo(true)
  S.elegirPresentacionAgregar('pr-con')
  if (S.estado.agregar.paso === 'caja') S.seguirConCajas()
  S.estado.agregar.cajas = 3
  S.ponerNumero(S.__doc.getElementById('pr-agregar-cajas'), 3)
}

// ── La lista de conos: sin "Común", se busque lo que se busque ──────────
esperas.push((async () => {
  const { S } = armar()
  await S.abrirPlanilla('t1')
  S.abrirAgregar()
  S.elegirProductoAgregar('p-mini')
  chk('con presentaciones con cono, el paso es el del cono', S.estado.agregar.paso === 'cono')
  const lista = html(S, 'pr-agregar-marcas')
  chk('la lista de conos NO tiene "Común" ni "con cono, sin marca"', !COMUN.test(lista) && /data-marca="mk-grido"/.test(lista), lista)
  for (const t of ['com', 'COMÚN', 'comun']) {
    chk(`… tampoco buscando "${t}"`, !COMUN.test(S.htmlMarcas(CATALOGO.marcas_personalizadas, t, S.estado.agregar, null)))
  }
  chk('"Sin cono" sigue estando, y es lo común', S.__doc.getElementById('pr-agregar-sin-cono').disabled === false)
  S.elegirCono('')
  chk('un cono sin id no es elegir un cono', S.estado.agregar.marcaElegida === false && S.estado.agregar.paso === 'cono')
  chk('el paso del cono, con cono y sin marca, NO dice "Común" ni queda hecho',
    S.pasosAgregar({ paso: 'presentacion', productoId: 'p-mini', conCono: true, marcaElegida: true, marcaId: null }, S.estado.catalogo).find(x => x.clave === 'cono').estado === 'falta')
})())

// ── Con red: con cono y sin cono elegido NO se manda ─────────────────────
esperas.push((async () => {
  const { S, red } = armar()
  await S.abrirPlanilla('t1')
  conConoSinCono(S)
  chk('faltaConoAgregar lo ve', S.faltaConoAgregar(S.estado.agregar) === true)
  await S.confirmarAgregar()
  const err = S.__doc.getElementById('pr-agregar-error')
  chk('con cono y sin cono elegido: NO se manda nada a la base', cargas(red, 'registrar_produccion_item').length === 0 && S.__llamadas.tablet.length === 0)
  chk('… y se dice pegado al botón, con la salida ("Sin cono")', err.hidden === false && err.textContent === ELEGI, err.textContent)
  chk('… sin trabar el botón', S.__doc.getElementById('pr-agregar-confirmar').disabled === false)
  // Eligiendo un cono con nombre, sale.
  S.elegirCono('mk-grido')
  chk('eligiendo el cono vuelve a las cajas (la presentación y la caja ya estaban)', S.estado.agregar.paso === 'cajas' && S.estado.agregar.marcaId === 'mk-grido')
  await S.confirmarAgregar()
  const c = cargas(red, 'registrar_produccion_item')
  chk('con el cono elegido, se manda con su marca', c.length === 1 && c[0].params.p_marca_id === 'mk-grido' && c[0].params.p_presentacion_id === 'pr-con', JSON.stringify(c))
})())

// ── Sin cono: lo común, con marca null ───────────────────────────────────
esperas.push((async () => {
  const { S, red } = armar()
  await S.abrirPlanilla('t1')
  S.abrirAgregar()
  S.elegirProductoAgregar('p-mini')
  S.elegirConoSiNo(false)
  S.elegirPresentacionAgregar('pr-sin')
  if (S.estado.agregar.paso === 'caja') S.seguirConCajas()
  S.estado.agregar.cajas = 2
  S.ponerNumero(S.__doc.getElementById('pr-agregar-cajas'), 2)
  chk('sin cono no falta ningún cono', S.faltaConoAgregar(S.estado.agregar) === false)
  await S.confirmarAgregar()
  const c = cargas(red, 'registrar_produccion_item')
  chk('sin cono se manda con marca null y la presentación sin cono', c.length === 1 && c[0].params.p_marca_id === null && c[0].params.p_presentacion_id === 'pr-sin', JSON.stringify(c))
})())

// ── Sin internet: con cono y sin cono elegido NO entra a la cola ─────────
esperas.push((async () => {
  const { S, red, sinRed } = armar()
  await S.abrirPlanilla('t1')
  sinRed()
  conConoSinCono(S)
  await S.confirmarAgregar()
  chk('sin internet: con cono y sin cono elegido NO entra a la cola', (S.estado.colaLista ?? []).length === 0 && S.__llamadas.tablet.length === 0)
  chk('… y se dice', S.__doc.getElementById('pr-agregar-error').textContent === ELEGI)
  S.elegirCono('mk-grido')
  await S.confirmarAgregar()
  const cola = S.estado.colaLista ?? []
  chk('con el cono elegido, queda en la cola con su marca', cola.length === 1 && cola[0].operacion === 'registrar_produccion_item' && cola[0].params.p_marca_id === 'mk-grido', JSON.stringify(cola))
  chk('… y nada llegó a la base (no hay red)', red.cargas.length === 0)
})())

// ── Corregir en la planta un sublote viejo (con cono, sin marca) ─────────
esperas.push((async () => {
  const { S, red } = armar({ items: [VIEJO] })
  await S.abrirPlanilla('t1')
  const fila = S.htmlProducido(VIEJO, S.estado.catalogo)
  chk('el sublote viejo dice "Falta el cono" en su columna, nunca "Común"', /<span class="pr-fp__falta-cono">Falta el cono<\/span>/.test(fila) && !/Común/.test(fila), fila)
  chk('describirProducido: con cono y sin marca es "Falta el cono"; sin cono, "Sin cono"',
    S.describirProducido(VIEJO, S.estado.catalogo).marca === 'Falta el cono' &&
    S.describirProducido({ ...VIEJO, presentacion_id: 'pr-sin' }, S.estado.catalogo).marca === 'Sin cono')
  S.abrirCorregirCompleto('it-viejo')
  chk('corregirlo abre en el paso del cono, sin darlo por elegido', S.estado.agregar.paso === 'cono' && S.estado.agregar.marcaElegida === false)
  S.__doc.getElementById('pr-agregar-motivo').value = 'Era de GRIDO'
  S.estado.agregar.cajas = 10
  S.estado.agregar.paso = 'cajas'
  const pasos = S.htmlPasosAgregar(S.pasosAgregar(S.estado.agregar, S.estado.catalogo))
  chk('desde las cajas, el paso del cono que falta se puede TOCAR para volver, y dice "falta elegir"',
    /<button type="button" class="pr-paso pr-paso--falta" data-paso-ag="cono">[^]*?falta elegir/.test(pasos), pasos)
  await S.confirmarAgregar()
  chk('sin elegir el cono, la corrección NO se manda', cargas(red, 'corregir_produccion_item_completo').length === 0 &&
    S.__doc.getElementById('pr-agregar-error').textContent === ELEGI)
  S.elegirCono('mk-grido')
  await S.confirmarAgregar()
  const c = cargas(red, 'corregir_produccion_item_completo')
  chk('con el cono elegido, se corrige SOLO el cono', c.length === 1 && JSON.stringify(c[0].params.p_datos) === '{"marca_id":"mk-grido"}', JSON.stringify(c))
  // Un sublote bien cargado (con su cono) abre en las cajas, como siempre.
  const { S: B } = armar({ items: [{ ...VIEJO, marca_id: 'mk-grido' }] })
  await B.abrirPlanilla('t1')
  B.abrirCorregirCompleto('it-viejo')
  chk('un sublote con su cono abre en las cajas, con el cono elegido', B.estado.agregar.paso === 'cajas' && B.estado.agregar.marcaElegida === true)
})())

// ── La gestión: Corregir exige el cono; el stock terminado no dice "Común" ─
{
  const G = construirProduccion(ARCHIVO_GESTION)
  const cat = {
    productos: CATALOGO.productos_terminados, presentaciones: CATALOGO.producto_presentaciones,
    marcas: CATALOGO.marcas_personalizadas, insumos: [], empaqueError: true,
  }
  const p = { id: 'it-viejo', sublote: '7023-1', presentacion_id: 'pr-con', marca_id: null, cajas: 10, caja_insumo_id: null, embolsado: null }
  const e = { modo: 'corregir', cat, catError: false, productoId: 'p-mini', presentacionId: 'pr-con', marcaId: null, motivo: 'Era de GRIDO', cajas: 10, cajaElegida: true }
  const d = { presentaciones: [], marcas: [], productos: [] }
  chk('gestión · con cono y sin cono elegido: falta el cono, y se dice cómo', G.faltaEnCorreccion(e, p) === 'Elegí el cono: con cono tiene que tener un cono con nombre. Si es común, elegí la presentación sin cono.')
  const campos = G.htmlCamposCorreccion(e, p, d)
  chk('gestión · el cono pide elegirlo y NO ofrece "Común (sin marca)"', /<option value="" selected disabled>Elegí el cono<\/option>/.test(campos) && !/Común/.test(campos), campos)
  chk('gestión · con el cono elegido ya no falta (falta otra cosa o nada)', G.faltaEnCorreccion({ ...e, marcaId: 'mk-grido' }, p) !== G.TEXTO_ELEGI_CONO)
  chk('gestión · con el cono elegido, "Elegí el cono" ya no está', !/Elegí el cono/.test(G.htmlCamposCorreccion({ ...e, marcaId: 'mk-grido' }, p, d)))
  chk('gestión · sin cono no hay campo de cono', !/pr-hist-corr-cono/.test(G.htmlCamposCorreccion({ ...e, presentacionId: 'pr-sin' }, { ...p, presentacion_id: 'pr-sin' }, d)))
  chk('gestión · nombreConoStock: la marca, nada sin cono, "falta el cono" con cono y sin marca',
    G.nombreConoStock(cat.presentaciones[0], 'mk-grido', cat.marcas) === 'GRIDO' &&
    G.nombreConoStock(cat.presentaciones[1], null, cat.marcas) === '' &&
    G.nombreConoStock(cat.presentaciones[0], null, cat.marcas) === 'falta el cono')
  const stock = G.htmlStockTerminado([
    { presentacion_id: 'pr-sin', marca_id: null, lote: '7023-2', cajas: 4, unidades: 2400 },
    { presentacion_id: 'pr-con', marca_id: 'mk-grido', lote: '7023-3', cajas: 2, unidades: 640 },
  ], cat)
  chk('gestión · stock terminado: sin cono no agrega "· Común"; con cono, el cono', />Cucuruchón Mini · Caja sin cono</.test(stock) && />Cucuruchón Mini · Caja con cono · GRIDO</.test(stock) && !/Común/.test(stock), stock)
}

// ── El fuente: ningún "Común" de cono quedó escrito ──────────────────────
chk('planta: ningún "?? \'Común\'" de cono', !/\?\? 'Común'/.test(FUENTE) && !/marca \? marca\.nombre : 'Común'/.test(FUENTE))
chk('gestión: ningún "Común" para un cono sin marca', !/\?\? 'Común'/.test(FUENTE_G) && !/: 'Común'\n/.test(FUENTE_G) && !/Común \(sin marca\)/.test(FUENTE_G))

fin()
