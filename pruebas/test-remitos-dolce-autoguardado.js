// REMITOS DOLCE → REVISAR: EL AUTOGUARDADO (29/10/2026, rama
// ci-prueba/remitos-autoguardado; pedido de Facu: "Guardar" y "Confirmar"
// confundían: tocó Guardar, salió "guardado" y pensó que había confirmado).
// En modulos/remitos-dolce.html, adentro de un remito precargado:
//  - cada cambio (cliente, fecha, número, talonario, transporte,
//    observaciones, un renglón, un producto o insumo, un cono, una cantidad,
//    un lote, "No va en la orden", Aceptar sugerencia) se manda SOLO a
//    actualizar_remito_precarga; lo que se escribe, después de
//    RETARDO_AUTOGUARDADO_REMITO sin tocar nada (no una llamada por tecla), y
//    al salir del campo ('change') sin esperar;
//  - una sola llamada a la vez: una respuesta vieja no pisa lo nuevo (ni el
//    formulario ni el "Guardado"), y lo que cambió mientras tanto se manda
//    cuando vuelve;
//  - el estado chico al lado de Confirmar: "Guardando…" / "Guardado" / el
//    error de la base TAL CUAL (escapado);
//  - sin botón Guardar: Confirmar espera el guardado en curso, manda lo que
//    quedó y recién después llama a confirmar_remito_precarga (si el
//    guardado falla, no confirma);
//  - "‹ Revisar" con un cambio sin mandar lo manda igual y sale cuando la base
//    respondió (si lo rechaza, se queda con el error; el segundo toque sale);
//  - Volver a leer y Descartar esperan la llamada en curso y no mandan lo
//    que esperaba el retardo (se pisa o se tira).
// Los relojes (setTimeout) y las respuestas de la base los maneja la suite.
//
//   node pruebas/test-remitos-dolce-autoguardado.js
'use strict'

const path = require('path')
const fs = require('fs')
const { construirRemitosDolce } = require('./sandbox-remitos-dolce')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/remitos-dolce.html')
leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

// Relojes de mentira: se anotan y corren cuando la suite dice.
const PRELUDIO = `
  supabase.functions = { invoke(n, op) { __llamadas.rpc.push(['fn:' + n, JSON.parse(JSON.stringify(op ?? null))]); return Promise.resolve(window.__fn ? window.__fn(n, op) : { data: null, error: null }) } }
  var __relojes = new Map()
  var __nReloj = 0
  function setTimeout(f, ms) { __nReloj++; __relojes.set(__nReloj, { f, ms }); return __nReloj }
  function clearTimeout(id) { __relojes.delete(id) }
  window.__relojes = __relojes
`
const nuevo = () => construirRemitosDolce(ARCHIVO, { preludioExtra: PRELUDIO })

const CAT = {
  productos: [{ id: 'p-cono', nombre: 'Cono dulce 48', categoria: null, activo: true }, { id: 'p-cap', nombre: 'Capelina Grande', categoria: 'pasta', activo: true }],
  presentaciones: [
    { id: 'pr-cono', producto_id: 'p-cono', nombre: 'Caja x 48 con cono', con_cono: true, unidades_por_caja: 48, activa: true },
    { id: 'pr-cap', producto_id: 'p-cap', nombre: 'Caja x 12', con_cono: false, unidades_por_caja: 12, activa: true },
  ],
  marcas: [{ id: 'm-lel', nombre: 'LELONA' }, { id: 'm-ler', nombre: 'LEROMA' }],
  insumos: [{ id: 'ins-h', nombre: 'Harina 000', marca: 'Wali', unidad_medida: 'kg', activo: true }],
}
const CLIENTES = [{ id: 'c-alm', nombre: 'Almacén Rosario', apodos: [], localidad: 'Rosario', activo: true }]
const ITEMS = [
  { texto_leido: 'Cono dulce 48 Lelona', cantidad: 10, presentacion_id: 'pr-cono', marca_id: 'm-lel', insumo_id: null, lotes: [], revisar: true, omitir: false, nota: '' },
  { texto_leido: 'Capelinas', cantidad: 84, presentacion_id: null, marca_id: null, insumo_id: null, lotes: [], revisar: true, omitir: false, nota: '' },
  { texto_leido: 'Envases', cantidad: 5, presentacion_id: null, marca_id: null, insumo_id: null, lotes: [], revisar: true, omitir: false, nota: '' },
]
const R1 = { id: 'r1', unidad_negocio_id: 'u-d', foto_path: 'u-d/remitos/r1.jpg', subido_en: '2026-10-27T12:00:00+00:00', estado: 'precargada', talonario: 'oficial',
  numero_remito: '0001-00003100', numero_remito_n: 100003100, fecha: '2026-10-26', cliente_id: null, cliente_leido: 'Almacen', transporte: null, observaciones: null, items: ITEMS }

function enDolce(S, { cargar = true } = {}) {
  S.estado.empresaId = 'u-d'
  S.estado.misTareas = new Map([['retiros:ver', { todas: true }], ...(cargar ? [['retiros:cargar', { unidades: ['u-d'] }]] : [])])
  S.estado.sinControl = new Map([['u-d', true], ['u-n', false]])
  S.estado.remitosResueltos = new Set()
  S.estado.clientes = CLIENTES
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-d'
  S.__tablas.remitos_precarga = (filtros) => {
    const id = filtros.find(f => f[0] === 'eq' && f[1] === 'id')
    const todas = JSON.parse(JSON.stringify([R1]))
    return { data: id ? todas.filter(r => r.id === id[2]) : todas, error: null }
  }
  S.__tablas.ordenes_retiro = []
  S.__tablas.unidades_negocio = [{ id: 'u-d', controla_stock_terminado: false }]
  S.estado.remitos = { empresaId: 'u-d', filas: [JSON.parse(JSON.stringify(R1))], error: null }
}

// La base: cada rpc queda ESPERANDO hasta que la suite la responde.
function baseLenta(S) {
  const cola = []
  S.__setRpc((nombre, p) => new Promise(res => cola.push({ nombre, p, res })))
  return cola
}
const vuelta = () => new Promise(r => setImmediate(r))
const cuerpo = (S) => S.__els.get('ad-remito-cuerpo')?.innerHTML ?? ''
const estadoChico = (S) => S.__els.get('ad-rm-guardado').textContent
const guardados = (S) => S.__llamadas.rpc.filter(x => x[0] === 'actualizar_remito_precarga').map(x => x[1])
const ultimo = (S) => guardados(S).slice(-1)[0]
const relojes = (S) => [...S.__win.__relojes.entries()]
function correrRelojes(S) {
  for (const [id, r] of relojes(S)) { S.__win.__relojes.delete(id); r.f() }
}
const escribir = (S, dataset, value) => S.alEscribirRemito({ target: { dataset, value } })
const tocar = (S, dataset) => S.alTocarRemito({ target: { closest: () => ({ disabled: false, dataset }) } })
// La base responde OK (lo que mandó, como fila).
const ok = (p) => ({ data: { ...R1, id: p.p_id, numero_remito: p.p_numero_remito, fecha: p.p_fecha, cliente_id: p.p_cliente_id, transporte: p.p_transporte, observaciones: p.p_observaciones, items: p.p_items, talonario: p.p_talonario, estado: 'precargada' }, error: null })

// ═══ El retardo es chico y fijo ═════════════════════════════════════════
{
  const S = nuevo()
  chk('el retardo: menos de 2 segundos y más que una tecla', S.RETARDO_AUTOGUARDADO_REMITO >= 300 && S.RETARDO_AUTOGUARDADO_REMITO <= 2000, String(S.RETARDO_AUTOGUARDADO_REMITO))
  const fuente = fs.readFileSync(ARCHIVO, 'utf8')
  chk('sin botón Guardar en el remito', !/data-rm-accion="guardar"/.test(fuente) && !/a === 'guardar'/.test(fuente))
  chk('al salir de un campo se manda ya (change → guardarYaRemito)', /getElementById\('ad-remito-cuerpo'\)\.addEventListener\('change', \(\) => guardarYaRemito\(\)\)/.test(fuente))
  chk('al esconder la página se manda ya', /addEventListener\('visibilitychange', \(\) => \{ if \(document\.hidden\) guardarYaRemito\(\) \}\)/.test(fuente) &&
    /addEventListener\('pagehide', \(\) => guardarYaRemito\(\)\)/.test(fuente))
  chk('al cerrar con algo sin mandar, el navegador pregunta', /addEventListener\('beforeunload', \(e\) => \{\s*if \(!pendienteRemito\(estado\.remito\)\) return\s*guardarYaRemito\(\)\s*e\.preventDefault\(\)/.test(fuente))
}

// ═══ Lo que se TOCA se guarda ya, cada tipo de campo ═════════════════════
{
  const S = nuevo()
  enDolce(S)
  esperas.push(S.abrirRemito('r1').then(async () => {
    S.__setRpc(async (n, p) => n === 'actualizar_remito_precarga' ? ok(p) : { data: null, error: null })
    chk('al abrir no se guarda nada', guardados(S).length === 0)
    chk('al abrir, el estado chico explica', /id="ad-rm-guardado"[^>]*>Los cambios se guardan solos\.</.test(cuerpo(S)))
    const casos = [
      ['el cliente', () => tocar(S, { rmCliente: 'c-alm' }), p => p.p_cliente_id === 'c-alm'],
      ['el talonario', () => tocar(S, { rmTalonario: 'acopio' }), p => p.p_talonario === 'acopio'],
      ['Aceptar sugerencia', () => tocar(S, { rmAceptar: '0' }), p => p.p_items[0].revisar === false],
      ['el producto de un renglón', () => tocar(S, { rmProducto: '1', presentacion: 'pr-cono' }), p => p.p_items[1].presentacion_id === 'pr-cono' && p.p_items[1].revisar === false],
      ['el cono', () => tocar(S, { rmMarca: '1', id: 'm-ler' }), p => p.p_items[1].marca_id === 'm-ler'],
      ['"No va en la orden"', () => tocar(S, { rmOmitir: '2', valor: 'si' }), p => p.p_items[2].omitir === true],
      ['"Va en la orden" (deshacer)', () => tocar(S, { rmOmitir: '2', valor: 'no' }), p => p.p_items[2].omitir === false],
      ['un insumo', () => tocar(S, { rmInsumo: '2', id: 'ins-h' }), p => p.p_items[2].insumo_id === 'ins-h'],
      ['agregar un renglón', () => tocar(S, { rmAgregar: '' }), p => p.p_items.length === 4],
      ['quitar un renglón', () => tocar(S, { rmQuitar: '3' }), p => p.p_items.length === 3],
      ['cambiar el cliente', () => tocar(S, { rmClienteCambiar: '' }), p => p.p_cliente_id === null],
    ]
    for (const [nombre, hacer, mira] of casos) {
      const antes = guardados(S).length
      hacer()
      chk(`${nombre}: "Guardando…" en seguida`, estadoChico(S) === 'Guardando…' && relojes(S).length === 0, estadoChico(S))
      await vuelta()
      chk(`${nombre}: se guarda solo, sin retardo`, guardados(S).length === antes + 1 && mira(ultimo(S)), JSON.stringify(ultimo(S)))
      chk(`${nombre}: después, "Guardado"`, estadoChico(S) === 'Guardado' && S.estado.remito.sucio === false, estadoChico(S))
    }
    chk('cada guardado lleva el remito', guardados(S).every(p => p.p_id === 'r1'))
    // Lo que no cambia lo que va a la base (un lote vacío) no se vuelve a mandar.
    const antes = guardados(S).length
    tocar(S, { rmLoteAgregar: '0' })
    await vuelta()
    chk('un lote vacío no cambia nada: no se vuelve a mandar, y sigue "Guardado"', guardados(S).length === antes && estadoChico(S) === 'Guardado')
    chk('…pero las filas de lote siguen en pantalla (el guardado no rearma el formulario)', S.estado.remito.form.renglones[0].lotes.length === 2)
    chk('mirar la foto o abrir el buscador no guarda', (() => { tocar(S, { rmZoom: '1' }); tocar(S, { rmCambiar: '1' }); return guardados(S).length === antes })())
    chk('…y el buscador abierto sigue abierto', S.estado.remito.form.renglones[1].eligiendo === true)
  }))
}

// ═══ Lo que se ESCRIBE: con retardo, una sola llamada ═════════════════════
{
  const S = nuevo()
  enDolce(S)
  esperas.push(S.abrirRemito('r1').then(async () => {
    S.__setRpc(async (n, p) => n === 'actualizar_remito_precarga' ? ok(p) : { data: null, error: null })
    const casos = [
      ['el número', { rmCampo: 'numero' }, ['0', '00', '0001-00003101'], p => p.p_numero_remito === '0001-00003101'],
      ['la fecha', { rmCampo: 'fecha' }, ['2026-10-25'], p => p.p_fecha === '2026-10-25'],
      ['el transporte', { rmCampo: 'transporte' }, ['E', 'Ex', 'Expreso'], p => p.p_transporte === 'Expreso'],
      ['las observaciones', { rmCampo: 'observaciones' }, ['F', 'Frágil'], p => p.p_observaciones === 'Frágil'],
      ['una cantidad', { rmCantidad: '0' }, ['1', '12'], p => p.p_items[0].cantidad === 12],
    ]
    for (const [nombre, dataset, teclas, mira] of casos) {
      const antes = guardados(S).length
      for (const t of teclas) escribir(S, dataset, t)
      await vuelta()
      chk(`${nombre}: mientras se escribe no se manda nada`, guardados(S).length === antes)
      chk(`${nombre}: un solo reloj vivo (cada tecla corre el anterior), del retardo`, relojes(S).length === 1 && relojes(S)[0][1].ms === S.RETARDO_AUTOGUARDADO_REMITO)
      chk(`${nombre}: "Guardando…" mientras espera`, estadoChico(S) === 'Guardando…')
      correrRelojes(S)
      await vuelta()
      chk(`${nombre}: pasado el retardo, UNA llamada con lo último`, guardados(S).length === antes + 1 && mira(ultimo(S)), JSON.stringify(ultimo(S)))
      chk(`${nombre}: "Guardado"`, estadoChico(S) === 'Guardado')
    }
    // Los lotes: el código y las cajas.
    tocar(S, { rmLoteAgregar: '0' })
    escribir(S, { rmLote: '0', k: '0' }, 'l-1')
    escribir(S, { rmLoteCajas: '0', k: '0' }, '12')
    chk('un lote: espera el retardo', relojes(S).length === 1)
    correrRelojes(S)
    await vuelta()
    chk('un lote: se guarda con su código y sus cajas', JSON.stringify(ultimo(S).p_items[0].lotes) === '[{"lote":"L-1","cajas":12}]', JSON.stringify(ultimo(S).p_items[0].lotes))
    // Al salir del campo ('change'), sin esperar el retardo.
    const antes = guardados(S).length
    escribir(S, { rmCampo: 'transporte' }, 'Expreso Sur')
    S.guardarYaRemito()
    chk('al salir del campo: se manda ya y no queda reloj', relojes(S).length === 0)
    await vuelta()
    chk('…con lo escrito', guardados(S).length === antes + 1 && ultimo(S).p_transporte === 'Expreso Sur')
    S.guardarYaRemito()
    await vuelta()
    chk('sin nada esperando, salir del campo no manda nada', guardados(S).length === antes + 1)
    // Buscar (cliente, producto, cono) o escribir el motivo de descartar no guarda.
    escribir(S, { rmClienteBuscar: '' }, 'alm')
    escribir(S, { rmBuscar: '1' }, 'cap')
    escribir(S, { rmConoBuscar: '0' }, 'le')
    chk('buscar no guarda ni pone reloj', relojes(S).length === 0 && S.estado.remito.sucio === false)
  }))
}

// ═══ Una respuesta vieja no pisa a una nueva ═════════════════════════════
{
  const S = nuevo()
  enDolce(S)
  esperas.push(S.abrirRemito('r1').then(async () => {
    const cola = baseLenta(S)
    escribir(S, { rmCampo: 'transporte' }, 'Viejo')
    correrRelojes(S)
    await vuelta()
    chk('la primera llamada sale', cola.length === 1 && cola[0].p.p_transporte === 'Viejo')
    escribir(S, { rmCampo: 'transporte' }, 'Nuevo')
    correrRelojes(S)
    await vuelta()
    chk('con una en curso NO sale otra (una sola a la vez)', cola.length === 1)
    chk('…y sigue "Guardando…"', estadoChico(S) === 'Guardando…')
    // Vuelve la vieja (la base la normaliza: transporte en mayúsculas, por ejemplo).
    cola[0].res({ data: { ...R1, transporte: 'VIEJO DE LA BASE', items: cola[0].p.p_items }, error: null })
    await vuelta()
    chk('la vieja NO pisa lo que se escribió después', S.estado.remito.form.transporte === 'Nuevo')
    chk('…ni dice "Guardado" (todavía falta lo nuevo)', S.estado.remito.sucio === true && estadoChico(S) === 'Guardando…', estadoChico(S))
    chk('al volver la vieja, sale sola la nueva con lo último', cola.length === 2 && cola[1].p.p_transporte === 'Nuevo')
    cola[1].res({ data: { ...R1, transporte: 'Nuevo', items: cola[1].p.p_items }, error: null })
    await vuelta()
    chk('vuelve la nueva: "Guardado"', S.estado.remito.sucio === false && estadoChico(S) === 'Guardado')
    chk('la fila queda con lo último de la base', S.estado.remito.fila.transporte === 'Nuevo')
    chk('…y la lista de arriba también', S.estado.remitos.filas.find(r => r.id === 'r1').transporte === 'Nuevo')
    // Una vieja que FALLA, con algo nuevo esperando: no muestra su error, manda lo nuevo.
    escribir(S, { rmCampo: 'numero' }, '0001-00000000')
    correrRelojes(S)
    await vuelta()
    escribir(S, { rmCampo: 'numero' }, '0001-00003102')
    correrRelojes(S)
    cola[2].res({ data: null, error: { message: 'Error viejo que ya no importa.' } })
    await vuelta()
    chk('una vieja que falla con algo nuevo detrás: no muestra su error', !/Error viejo/.test(estadoChico(S)) && S.estado.remito.errorGuardado === null)
    chk('…y manda lo nuevo', cola.length === 4 && cola[3].p.p_numero_remito === '0001-00003102')
    cola[3].res(ok(cola[3].p))
    await vuelta()
    chk('…que queda "Guardado"', estadoChico(S) === 'Guardado')
  }))
}

// ═══ El error de la base, tal cual ════════════════════════════════════════
{
  const S = nuevo()
  enDolce(S)
  esperas.push(S.abrirRemito('r1').then(async () => {
    S.__setRpc(async (n) => n === 'actualizar_remito_precarga' ? { data: null, error: { message: 'La fecha no puede ser futura.' } } : { data: null, error: null })
    escribir(S, { rmCampo: 'fecha' }, '2099-01-01')
    correrRelojes(S)
    await vuelta()
    chk('el error de la base TAL CUAL en el estado chico', estadoChico(S) === 'La fecha no puede ser futura.')
    chk('…en rojo', S.__els.get('ad-rm-guardado').className === 'ad-rm-guardado ad-rm-guardado--error')
    chk('…y queda pendiente (no dice Guardado)', S.estado.remito.sucio === true && S.pendienteRemito(S.estado.remito) === true)
    S.pintarRemito()
    chk('al redibujar, el error sigue al lado de Confirmar', /data-rm-accion="confirmar"[^>]*>Confirmar<\/button><span class="ad-rm-guardado ad-rm-guardado--error" id="ad-rm-guardado" role="status" aria-live="polite">La fecha no puede ser futura\.<\/span>/.test(cuerpo(S)))
    S.__setRpc(async (n, p) => n === 'actualizar_remito_precarga' ? ok(p) : { data: null, error: null })
    escribir(S, { rmCampo: 'fecha' }, '2026-10-20')
    correrRelojes(S)
    await vuelta()
    chk('el próximo cambio se guarda y borra el error', estadoChico(S) === 'Guardado' && S.__els.get('ad-rm-guardado').className === 'ad-rm-guardado' && S.estado.remito.errorGuardado === null)
    // Sin mensaje: uno propio.
    S.__setRpc(async () => ({ data: null, error: {} }))
    tocar(S, { rmTalonario: 'acopio' })
    await vuelta()
    chk('sin mensaje de la base: "No se pudo guardar el remito…"', /^No se pudo guardar el remito/.test(estadoChico(S)))
    // Escape: el error viene de la base.
    S.estado.remito.errorGuardado = marca('error')
    chequearMarcas(chk, 'el estado chico', S.htmlGuardadoRemito(S.estado.remito), ['error'])
  }))
}

// ═══ Confirmar espera el guardado ════════════════════════════════════════
{
  // Con una llamada en curso: espera que vuelva.
  const S = nuevo()
  enDolce(S)
  esperas.push(S.abrirRemito('r1').then(async () => {
    const cola = baseLenta(S)
    tocar(S, { rmAceptar: '0' })
    await vuelta()
    chk('el guardado está en curso', cola.length === 1 && cola[0].nombre === 'actualizar_remito_precarga')
    const p = S.confirmarRemito()
    await vuelta()
    chk('Confirmar NO llama a confirmar_remito_precarga mientras se guarda', cola.length === 1)
    chk('…y los botones quedan apagados', /data-rm-accion="confirmar" disabled/.test(cuerpo(S)))
    cola[0].res(ok(cola[0].p))
    await vuelta()
    chk('vuelto el guardado, recién ahí confirma', cola.length === 2 && cola[1].nombre === 'confirmar_remito_precarga' && cola[1].p.p_id === 'r1')
    cola[1].res({ data: { orden_id: 'o1', codigo: 'D-0001', numero_remito: '0001-00003100', talonario: 'oficial' }, error: null })
    await p
    chk('confirmado: avisa la orden', S.__llamadas.exitos.some(x => /confirmado: es la orden D-0001/.test(x)))
  }))
}
{
  // Con algo escrito que todavía espera el retardo: lo manda primero.
  const S = nuevo()
  enDolce(S)
  esperas.push(S.abrirRemito('r1').then(async () => {
    const cola = baseLenta(S)
    tocar(S, { rmAceptar: '0' })
    escribir(S, { rmCampo: 'numero' }, '0001-00003105')
    chk('lo escrito espera el retardo', cola.length === 0 && relojes(S).length === 1)
    chk('Aceptar sugerencia sacó el amarillo en pantalla', S.estado.remito.form.renglones[0].revisar === false)
    const p = S.confirmarRemito()
    await vuelta()
    chk('Confirmar manda ya lo que esperaba (sin reloj)', cola.length === 1 && cola[0].nombre === 'actualizar_remito_precarga' && cola[0].p.p_numero_remito === '0001-00003105' && relojes(S).length === 0)
    // La base lo deja en amarillo (por ejemplo, le falta algo): eso es lo que vale al confirmar.
    const r = ok(cola[0].p)
    r.data.items = r.data.items.map((it, i) => i === 0 ? { ...it, revisar: true } : it)
    cola[0].res(r)
    await vuelta()
    chk('…y después confirma', cola.length === 2 && cola[1].nombre === 'confirmar_remito_precarga')
    cola[1].res({ data: null, error: { message: 'El renglón 1 está en amarillo: revisalo antes de confirmar.' } })
    await p
    chk('el error de confirmar, tal cual', /El renglón 1 está en amarillo: revisalo antes de confirmar\./.test(cuerpo(S)))
    chk('…con el formulario como lo dejó la base: el renglón 1 vuelve a estar en amarillo', S.estado.remito.form.renglones[0].revisar === true && /ad-rm-renglon ad-rm-renglon--revisar" data-rm-renglon="0"/.test(cuerpo(S)))
    chk('…y no se volvió a guardar nada', cola.length === 2)
  }))
}
{
  // Si el guardado falla, NO confirma.
  const S = nuevo()
  enDolce(S)
  esperas.push(S.abrirRemito('r1').then(async () => {
    S.__setRpc(async (n) => n === 'actualizar_remito_precarga' ? { data: null, error: { message: 'Ese cliente no es de esta fábrica o no está activo.' } } : { data: { codigo: 'X' }, error: null })
    escribir(S, { rmCampo: 'transporte' }, 'Expreso')
    await S.confirmarRemito()
    chk('el guardado falla: no se llama a confirmar_remito_precarga', !S.__llamadas.rpc.some(x => x[0] === 'confirmar_remito_precarga'))
    chk('…y el error de la base, tal cual, pegado a los botones', /role="alert">Ese cliente no es de esta fábrica o no está activo\.</.test(cuerpo(S)))
    chk('…lo escrito no se pierde', S.estado.remito.form.transporte === 'Expreso' && S.estado.vista === 'ad-vista-remito')
    chk('…y no se reintenta solo en un bucle', S.__llamadas.rpc.filter(x => x[0] === 'actualizar_remito_precarga').length === 1)
  }))
}
{
  // Sin cambios: Confirmar no guarda nada.
  const S = nuevo()
  enDolce(S)
  esperas.push(S.abrirRemito('r1').then(async () => {
    S.__setRpc(async (n) => n === 'confirmar_remito_precarga' ? { data: null, error: { message: 'Elegí el cliente.' } } : { data: null, error: null })
    await S.confirmarRemito()
    chk('sin cambios, Confirmar solo confirma', S.__llamadas.rpc.map(x => x[0]).join() === 'confirmar_remito_precarga')
    // Lo que se cambia MIENTRAS confirma queda para después (no se cruza).
    const cola = baseLenta(S)
    const p = S.confirmarRemito()
    await vuelta()
    escribir(S, { rmCampo: 'transporte' }, 'Durante')
    correrRelojes(S)
    await vuelta()
    chk('mientras confirma, lo que se escribe no se manda', cola.length === 1 && cola[0].nombre === 'confirmar_remito_precarga')
    cola[0].res({ data: null, error: { message: 'Elegí el cliente.' } })
    await p
    await vuelta()
    chk('si confirmar falla, lo escrito mientras tanto se manda', cola.length === 2 && cola[1].nombre === 'actualizar_remito_precarga' && cola[1].p.p_transporte === 'Durante')
    cola[1].res(ok(cola[1].p))
    await vuelta()
  }))
}

{
  // Si la base guardó pero no devolvió la fila, Confirmar NO rearma con la
  // fila vieja (desharía en pantalla lo corregido).
  const S = nuevo()
  enDolce(S)
  esperas.push(S.abrirRemito('r1').then(async () => {
    S.__setRpc(async (n) => n === 'confirmar_remito_precarga' ? { data: null, error: { message: 'Elegí el cliente.' } } : { data: null, error: null })
    escribir(S, { rmCampo: 'transporte' }, 'Corregido')
    await S.confirmarRemito()
    chk('guardado sin fila: lo corregido sigue en pantalla después de Confirmar', S.estado.remito.form.transporte === 'Corregido' && /Elegí el cliente\./.test(cuerpo(S)))
  }))
}

// ═══ Salir del remito con un cambio sin mandar ═══════════════════════════
{
  const S = nuevo()
  enDolce(S)
  esperas.push(S.abrirRemito('r1').then(async () => {
    const cola = baseLenta(S)
    escribir(S, { rmCampo: 'observaciones' }, 'Frágil')
    chk('pendiente: lo escrito', S.pendienteRemito(S.estado.remito) === true)
    const p = S.volverDeRemito()
    await vuelta()
    chk('al salir, lo escrito se manda igual', cola.length === 1 && cola[0].p.p_observaciones === 'Frágil')
    chk('…y espera la respuesta antes de salir', S.estado.vista === 'ad-vista-remito')
    cola[0].res(ok(cola[0].p))
    await p
    await vuelta()
    chk('respondió: sale a Revisar', S.estado.vista === 'rd-vista-revisar' && S.estado.remito === null)
  }))
}
{
  // Con una llamada en curso: espera esa y lo que quedó detrás.
  const S = nuevo()
  enDolce(S)
  esperas.push(S.abrirRemito('r1').then(async () => {
    const cola = baseLenta(S)
    tocar(S, { rmCliente: 'c-alm' })
    await vuelta()
    escribir(S, { rmCampo: 'transporte' }, 'Detrás')
    const p = S.volverDeRemito()
    await vuelta()
    chk('salir con una en curso: no sale todavía', S.estado.vista === 'ad-vista-remito' && cola.length === 1)
    cola[0].res(ok(cola[0].p))
    await vuelta()
    chk('…después manda lo que quedó', cola.length === 2 && cola[1].p.p_transporte === 'Detrás' && cola[1].p.p_cliente_id === 'c-alm')
    cola[1].res(ok(cola[1].p))
    await p
    await vuelta()
    chk('…y sale', S.estado.vista === 'rd-vista-revisar')
  }))
}
{
  // Si la base lo rechaza: se queda con el error; el segundo toque sale.
  const S = nuevo()
  enDolce(S)
  esperas.push(S.abrirRemito('r1').then(async () => {
    S.__setRpc(async (n) => n === 'actualizar_remito_precarga' ? { data: null, error: { message: 'La fecha no puede ser futura.' } } : { data: null, error: null })
    escribir(S, { rmCampo: 'fecha' }, '2099-01-01')
    await S.volverDeRemito()
    chk('rechazado: no sale y lo dice', S.estado.vista === 'ad-vista-remito' && /No se pudo guardar el último cambio/.test(cuerpo(S)) && /La fecha no puede ser futura\./.test(cuerpo(S)))
    await S.volverDeRemito()
    await vuelta()
    chk('el segundo toque sale igual', S.estado.vista === 'rd-vista-revisar' && S.estado.remito === null)
    chk('…sin volver a mandar', guardados(S).length === 1)
  }))
}
{
  // Sin nada pendiente sale en seguida; sin permiso para guardar, también.
  const S = nuevo()
  enDolce(S)
  esperas.push(S.abrirRemito('r1').then(async () => {
    await S.volverDeRemito()
    await vuelta()
    chk('sin cambios sale en seguida, sin llamar a nada', S.estado.vista === 'rd-vista-revisar' && guardados(S).length === 0)
  }))
  const T = nuevo()
  enDolce(T, { cargar: false })
  esperas.push(T.abrirRemito('r1').then(async () => {
    escribir(T, { rmCampo: 'transporte' }, 'x')
    correrRelojes(T)
    tocar(T, { rmTalonario: 'acopio' })
    await vuelta()
    chk('sin Retiros · cargar no se guarda nada', guardados(T).length === 0 && T.pendienteRemito(T.estado.remito) === false)
    await T.volverDeRemito()
    await vuelta()
    chk('…y sale sin preguntar', T.estado.vista === 'rd-vista-revisar')
  }))
}
{
  // Cambiar de pestaña con algo pendiente: lo manda (por volverDeRemito).
  const S = nuevo()
  enDolce(S)
  S.estado.misTareas.set('retiros:cargar', { todas: true })
  esperas.push(S.abrirRemito('r1').then(async () => {
    S.__setRpc(async (n, p) => n === 'actualizar_remito_precarga' ? ok(p) : { data: null, error: null })
    escribir(S, { rmCampo: 'transporte' }, 'Pestaña')
    S.elegirPestana('revisar')
    await vuelta(); await vuelta()
    chk('cambiar de pestaña con algo pendiente: se manda', guardados(S).length === 1 && ultimo(S).p_transporte === 'Pestaña')
    chk('…y vuelve a Revisar', S.estado.vista === 'rd-vista-revisar')
  }))
}

// ═══ Volver a leer y Descartar: no se cruzan con el guardado ═══════════════
{
  const S = nuevo()
  enDolce(S)
  esperas.push(S.abrirRemito('r1').then(async () => {
    const cola = baseLenta(S)
    S.__win.__fn = () => ({ data: { ...R1, transporte: 'LEÍDO', items: [ITEMS[0]] }, error: null })
    tocar(S, { rmCliente: 'c-alm' })
    await vuelta()
    escribir(S, { rmCampo: 'transporte' }, 'Esperando el retardo')
    const p = S.volverALeerRemito()
    await vuelta()
    chk('Volver a leer espera el guardado en curso antes de leer', !S.__llamadas.rpc.some(x => x[0] === 'fn:ocr-remito') && relojes(S).length === 0)
    cola[0].res(ok(cola[0].p))
    await p
    chk('…después lee', S.__llamadas.rpc.some(x => x[0] === 'fn:ocr-remito'))
    chk('…y lo que esperaba el retardo NO se mandó (lo leído pisa todo)', cola.length === 1 && S.estado.remito.form.transporte === 'LEÍDO' && S.estado.remito.sucio === false)
    chk('…sin "Guardado" viejo: el estado vuelve a explicar', estadoChico(S) === 'Los cambios se guardan solos.')
    tocar(S, { rmAceptar: '0' })
    await vuelta()
    chk('después de leer, los cambios se vuelven a guardar solos', cola.length === 2 && cola[1].nombre === 'actualizar_remito_precarga')
    cola[1].res(ok(cola[1].p))
    await vuelta()
  }))
}
{
  const S = nuevo()
  enDolce(S)
  esperas.push(S.abrirRemito('r1').then(async () => {
    const cola = baseLenta(S)
    tocar(S, { rmCliente: 'c-alm' })
    await vuelta()
    escribir(S, { rmCampo: 'transporte' }, 'Se tira')
    const p = S.descartarRemito('foto repetida')
    await vuelta()
    chk('Descartar espera el guardado en curso', cola.length === 1 && cola[0].nombre === 'actualizar_remito_precarga' && relojes(S).length === 0)
    cola[0].res(ok(cola[0].p))
    await vuelta()
    chk('…después descarta, sin mandar lo que esperaba el retardo', cola.length === 2 && cola[1].nombre === 'descartar_remito_precarga')
    cola[1].res({ data: null, error: { message: 'No se pudo.' } })
    await p
    await vuelta()
    chk('si descartar falla, lo pendiente se manda', cola.length === 3 && cola[2].nombre === 'actualizar_remito_precarga' && cola[2].p.p_transporte === 'Se tira')
    cola[2].res(ok(cola[2].p))
    await vuelta()
    chk('…y queda "Guardado"', estadoChico(S) === 'Guardado')
  }))
}

fin()
