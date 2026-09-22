// B4 del módulo Producción (22/09/2026): la planilla de cada máquina abierta,
// las paradas y el cierre.
//
// Contrato con la base (pg_get_functiondef, 22/09/2026):
//  - iniciar_parada(p_turno_id, p_motivo); terminar_parada(p_parada_id). La
//    base rechaza una segunda parada en curso y cerrar con una parada abierta.
//  - cerrar_turno(p_turno_id, p_hora_apagado, p_scrap_kg, p_observaciones,
//    p_productos [{presentacion_id, cajas, marca_id?}]) → { lote, sublotes:
//    [{sublote, cajas, unidades}] }. El sublote es lote-N en el ORDEN del
//    array: el orden de la pantalla es el orden de los sublotes.
//  - unidades = cajas × unidades_por_caja de la presentación.
//
// Además: el borrador del cierre sobrevive a recargar la tablet, y sin
// productos se pregunta fuerte antes de mandar.
//
//   node pruebas/test-produccion-cierre.js

process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const CATALOGO = {
  productos_terminados: [{ id: 'p-mini', nombre: 'Cucuruchón Mini', tipo_masa: 'Común', orden: 1 }, { id: 'p-gde', nombre: 'Cucuruchón Grande', tipo_masa: 'Común', orden: 2 }],
  producto_presentaciones: [
    { id: 'pr-mini-600', producto_id: 'p-mini', nombre: 'Caja x600', con_cono: true, media_caja: false, empaque: 'bolsa individual 15x60', unidades_por_caja: 600, orden: 1 },
    { id: 'pr-gde-200', producto_id: 'p-gde', nombre: 'Caja x200', con_cono: false, media_caja: true, empaque: null, unidades_por_caja: 200, orden: 1 },
  ],
  marcas_personalizadas: [{ id: 'mk-frigor', nombre: 'FRIGOR' }, { id: 'mk-grido', nombre: 'GRIDO' }],
}
const PLANILLA = {
  turno: { id: 't1', lote: 7023, maquina_id: 'm1', fecha: '2026-09-22', turno: 'Mañana', encargado_id: 'e-fede', abierto_en: '2026-09-22T09:02:00Z', estado: 'abierto' },
  operarios: ['e-op1'], masas: 5, paradas: [], maquinaNombre: 'Máquina 1',
}

function armar() {
  const S = construirProduccion(ARCHIVO)
  Object.assign(S.__tablas, CATALOGO)
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva' }
  S.estado.personal = [{ id: 'e-fede', nombre: 'Federico Silva', puestos: ['encargado'] }, { id: 'e-op1', nombre: 'Operario Uno', puestos: ['operario'] }]
  S.estado.planilla = JSON.parse(JSON.stringify(PLANILLA))
  return S
}
const cat = () => ({ productos: CATALOGO.productos_terminados, presentaciones: CATALOGO.producto_presentaciones, marcas: CATALOGO.marcas_personalizadas })

// ── Sublotes, unidades y orden ────────────────────────────────────────────
{
  const S = armar()
  chk('sublotes provisorios en orden', JSON.stringify(S.sublotesProvisorios(7023, 3)) === '["7023-1","7023-2","7023-3"]')
  chk('sin productos, sin sublotes', S.sublotesProvisorios(7023, 0).length === 0)
  const d = S.describirProducido({ presentacion_id: 'pr-mini-600', marca_id: null, cajas: 12 }, cat())
  chk('unidades = cajas × unidades por caja', d.unidades === 7200 && d.unidadesPorCaja === 600)
  chk('sin marca es "Común"', d.marca === 'Común')
  chk('el detalle dice cono, media caja y empaque', d.detalle === 'con cono · bolsa individual 15x60' &&
    S.describirProducido({ presentacion_id: 'pr-gde-200', cajas: 1 }, cat()).detalle === 'media caja')
  chk('con marca, su nombre', S.describirProducido({ presentacion_id: 'pr-gde-200', marca_id: 'mk-grido', cajas: 1 }, cat()).marca === 'GRIDO')
  chk('una presentación que ya no está: null', S.describirProducido({ presentacion_id: 'vieja', cajas: 1 }, cat()) === null)
  const lista = [{ presentacion_id: 'a', cajas: 1 }, { presentacion_id: 'b', cajas: 2 }, { presentacion_id: 'c', cajas: 3 }]
  chk('bajar el primero', S.moverProducto(lista, 0, 1).map(x => x.presentacion_id).join('') === 'bac')
  chk('subir el último', S.moverProducto(lista, 2, -1).map(x => x.presentacion_id).join('') === 'acb')
  chk('subir el primero no hace nada', S.moverProducto(lista, 0, -1) === lista)
  chk('bajar el último no hace nada', S.moverProducto(lista, 2, 1) === lista)
  chk('mover no cambia la lista original', lista.map(x => x.presentacion_id).join('') === 'abc')
  const t = S.totalesCierre([{ presentacion_id: 'pr-mini-600', cajas: 12 }, { presentacion_id: 'pr-gde-200', cajas: 5 }], cat())
  chk('totales: cajas y unidades', t.cajas === 17 && t.unidades === 8200)

  // El render muestra el sublote provisorio y las unidades.
  const h = S.htmlProducido({ presentacion_id: 'pr-mini-600', marca_id: 'mk-frigor', cajas: 1200 }, 1, 3, '7023-2', cat())
  chk('el renglón muestra su sublote provisorio', /pr-producido__sublote">7023-2</.test(h))
  chk('… y cajas × unidades por caja = unidades, con puntos de miles', h.includes('1.200 cajas × 600 = <strong>720.000 unidades</strong>'), h)
  chk('… la marca', h.includes('Marca: FRIGOR'))
  chk('el del medio se puede subir y bajar', !/data-subir="1" [^>]*disabled/.test(h) && !/data-bajar="1" [^>]*disabled/.test(h))
  chk('el primero no se puede subir', /data-subir="0"[^>]*disabled/.test(S.htmlProducido({ presentacion_id: 'pr-mini-600', cajas: 1 }, 0, 3, 'x', cat())))
  chk('el último no se puede bajar', /data-bajar="2"[^>]*disabled/.test(S.htmlProducido({ presentacion_id: 'pr-mini-600', cajas: 1 }, 2, 3, 'x', cat())))
  chk('uno que ya no está se marca y solo se puede borrar', /pr-producido--invalido/.test(S.htmlProducido({ presentacion_id: 'vieja', cajas: 1 }, 0, 1, 'x', cat())) &&
    !/data-subir/.test(S.htmlProducido({ presentacion_id: 'vieja', cajas: 1 }, 0, 1, 'x', cat())))
}

// ── El payload de cerrar_turno ───────────────────────────────────────────
{
  const S = armar()
  const b = { hora: '14:05', scrap: 0, obs: '  ', productos: [
    { presentacion_id: 'pr-gde-200', marca_id: null, cajas: 5 },
    { presentacion_id: 'pr-mini-600', marca_id: 'mk-grido', cajas: 12 },
  ] }
  const p = S.parametrosCerrarTurno('t1', b)
  chk('payload completo y en el orden de la pantalla', JSON.stringify(p) === JSON.stringify({
    p_turno_id: 't1', p_hora_apagado: '14:05', p_scrap_kg: 0, p_observaciones: null,
    p_productos: [{ presentacion_id: 'pr-gde-200', cajas: 5, marca_id: null }, { presentacion_id: 'pr-mini-600', cajas: 12, marca_id: 'mk-grido' }],
  }), JSON.stringify(p))
  const reordenado = S.parametrosCerrarTurno('t1', { ...b, productos: S.moverProducto(b.productos, 0, 1) })
  chk('reordenar antes de confirmar cambia el orden del payload (y así los sublotes)', reordenado.p_productos[0].presentacion_id === 'pr-mini-600')
  chk('observaciones con texto viajan recortadas', S.parametrosCerrarTurno('t1', { ...b, obs: ' Se cortó la luz ' }).p_observaciones === 'Se cortó la luz')
  chk('scrap 0 es un dato: se puede cerrar', S.faltanParaCerrar(b, cat()).length === 0)
  chk('scrap vacío: falta', S.faltanParaCerrar({ ...b, scrap: null }, cat()).some(x => x.includes('scrap')))
  chk('sin hora: falta', S.faltanParaCerrar({ ...b, hora: '' }, cat()).some(x => x.includes('hora')))
  chk('con un producto que ya no está: falta sacarlo', S.faltanParaCerrar({ ...b, productos: [{ presentacion_id: 'vieja', cajas: 1 }] }, cat()).length === 1)
}

// ── El borrador sobrevive a recargar ─────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  await S.mostrarCierre()
  chk('el cierre abre con la hora de ahora', /^\d{2}:\d{2}$/.test(S.estado.cierre.hora))
  chk('sin borrador no dice que se recuperó', S.__doc.getElementById('pr-cierre-borrador').hidden === true)
  S.ponerNumero(S.__doc.getElementById('pr-cierre-scrap'), 2.5)
  S.__doc.getElementById('pr-cierre-obs').value = 'Se trabó la cinta'
  S.cambioEnCierre()
  chk('cambiar un campo ya lo guarda en la tablet', JSON.parse(S.localStorage.getItem('produccion.cierre.t1') || '{}').scrap === 2.5)
  S.actualizarProductos([{ presentacion_id: 'pr-mini-600', marca_id: null, cajas: 12 }, { presentacion_id: 'pr-gde-200', marca_id: 'mk-frigor', cajas: 3 }])
  const guardado = S.localStorage.getItem('produccion.cierre.t1')
  chk('cada cambio queda guardado en la tablet, por turno', !!guardado && JSON.parse(guardado).productos.length === 2 && JSON.parse(guardado).scrap === 2.5)

  // "Recargar": otra instancia de la página con el mismo localStorage.
  const R = armar()
  for (const [k, v] of S.__ls) R.__ls.set(k, v)
  await R.mostrarCierre()
  chk('al volver, se recupera todo lo cargado', R.estado.cierre.productos.length === 2 && R.estado.cierre.scrap === 2.5 && R.estado.cierre.obs === 'Se trabó la cinta')
  chk('… lo dice', R.__doc.getElementById('pr-cierre-borrador').hidden === false)
  chk('… y el scrap vuelve al campo (con coma) y se lee igual', /^2,50*$/.test(R.__doc.getElementById('pr-cierre-scrap').value) &&
    R.leerCampoNumero(R.__doc.getElementById('pr-cierre-scrap')) === 2.5, R.__doc.getElementById('pr-cierre-scrap').value)
  chk('… con los sublotes provisorios en orden', /7023-1<[\s\S]*Cucuruchón Mini[\s\S]*7023-2<[\s\S]*Cucuruchón Grande/.test(R.__doc.getElementById('pr-cierre-productos').innerHTML))
  chk('… y el resumen con los totales', /15 cajas/.test(R.__doc.getElementById('pr-cierre-resumen').innerHTML) && /7\.800 unidades/.test(R.__doc.getElementById('pr-cierre-resumen').innerHTML))

  chk('un borrador que no es JSON no rompe', (() => { R.__ls.set('produccion.cierre.x', '{roto'); return R.leerBorradorCierre('x') === null })())
  R.__ls.set('produccion.cierre.y', JSON.stringify({ hora: 5, scrap: 'mucho', obs: null, productos: [{ presentacion_id: 'a', cajas: 2.5 }, { presentacion_id: 'b', cajas: 3 }, null] }))
  const y = R.leerBorradorCierre('y')
  chk('un borrador con datos raros se limpia', y.hora === '' && y.scrap === null && y.obs === '' && y.productos.length === 1 && y.productos[0].presentacion_id === 'b')

  // Enviar: con productos, directo, en orden; el borrador se borra recién después.
  R.__setRpc(async (n, p) => n === 'cerrar_turno'
    ? { data: { lote: 7023, sublotes: [{ sublote: '7023-1', cajas: 12, unidades: 7200 }, { sublote: '7023-2', cajas: 3, unidades: 600 }] }, error: null }
    : { data: null, error: null })
  R.estado.cierre.hora = '14:05'
  R.__doc.getElementById('pr-cierre-hora').value = '14:05'
  R.intentarCerrar()
  await new Promise(r => setImmediate(r))
  const llam = R.__llamadas.rpc.filter(([n]) => n === 'cerrar_turno')
  chk('con productos se manda sin preguntar', llam.length === 1 && llam[0][1].p_productos.map(x => x.presentacion_id).join() === 'pr-mini-600,pr-gde-200')
  chk('… con la hora, el scrap y las observaciones', llam[0]?.[1].p_hora_apagado === '14:05' && llam[0]?.[1].p_scrap_kg === 2.5 && llam[0]?.[1].p_observaciones === 'Se trabó la cinta')
  chk('después de cerrar se borra el borrador', R.localStorage.getItem('produccion.cierre.t1') === null)
  chk('y se muestran los sublotes definitivos que devolvió la base', /7023-1<\/span>[\s\S]*7\.200 unidades/.test(R.__doc.getElementById('pr-cerrado-lista').innerHTML) && R.__doc.getElementById('pr-cerrado').hidden === false)

  // Error de la base: el borrador queda.
  const E = armar()
  await E.mostrarCierre()
  E.ponerNumero(E.__doc.getElementById('pr-cierre-scrap'), 0)
  E.cambioEnCierre()
  E.actualizarProductos([{ presentacion_id: 'pr-mini-600', marca_id: null, cajas: 1 }])
  E.__setRpc(async () => ({ data: null, error: { message: 'Hay una parada sin terminar. Terminala antes de cerrar el turno.' } }))
  E.intentarCerrar()
  await new Promise(r => setImmediate(r))
  chk('si la base rechaza: el mensaje tal cual', E.__doc.getElementById('pr-cierre-error').textContent === 'Hay una parada sin terminar. Terminala antes de cerrar el turno.')
  chk('… y el borrador sigue en la tablet', !!E.localStorage.getItem('produccion.cierre.t1'))
  chk('… y el botón vuelve a quedar usable', E.estado.cerrando === false && E.__doc.getElementById('pr-cierre-enviar').disabled === false)

  // Sin productos: aviso fuerte, no se manda hasta confirmar.
  const V = armar()
  await V.mostrarCierre()
  V.ponerNumero(V.__doc.getElementById('pr-cierre-scrap'), 0)
  V.cambioEnCierre()
  V.intentarCerrar()
  await new Promise(r => setImmediate(r))
  chk('sin productos: aparece el aviso', V.__doc.getElementById('pr-cierre-vacio').hidden === false)
  chk('… y no se manda nada todavía', !V.__llamadas.rpc.some(([n]) => n === 'cerrar_turno'))
  V.__setRpc(async () => ({ data: { lote: 7023, sublotes: [] }, error: null }))
  await V.enviarCierre()
  const lv = V.__llamadas.rpc.filter(([n]) => n === 'cerrar_turno')
  chk('confirmado: se manda con la lista vacía', lv.length === 1 && Array.isArray(lv[0][1].p_productos) && lv[0][1].p_productos.length === 0)

  // Sin scrap: no se manda.
  const W = armar()
  await W.mostrarCierre()
  W.intentarCerrar()
  await new Promise(r => setImmediate(r))
  chk('sin scrap no se manda, y se dice qué falta', !W.__llamadas.rpc.some(([n]) => n === 'cerrar_turno') && /scrap/.test(W.__doc.getElementById('pr-cierre-error').textContent))
  chk('… sin llegar a la pregunta de "no produjo"', W.__doc.getElementById('pr-cierre-vacio').hidden === true)
  W.actualizarProductos([{ presentacion_id: 'pr-mini-600', marca_id: null, cajas: 1 }])
  W.intentarCerrar()
  await new Promise(r => setImmediate(r))
  chk('con productos pero sin scrap tampoco se manda', !W.__llamadas.rpc.some(([n]) => n === 'cerrar_turno'))

  // Agregar un producto: producto → presentación → marca → cajas.
  const A = armar()
  await A.mostrarCierre()
  A.abrirAgregar()
  A.estado.agregar.productoId = 'p-mini'
  A.pintarAgregar()
  chk('la presentación depende del producto', /pr-mini-600/.test(A.__doc.getElementById('pr-agregar-presentacion').innerHTML) && !/pr-gde-200/.test(A.__doc.getElementById('pr-agregar-presentacion').innerHTML))
  A.estado.agregar.presentacionId = 'pr-mini-600'
  A.estado.agregar.marcaId = 'mk-grido'
  A.confirmarAgregar()
  chk('sin cajas no se agrega', A.estado.cierre.productos.length === 0 && A.__doc.getElementById('pr-agregar-error').hidden === false)
  A.ponerNumero(A.__doc.getElementById('pr-agregar-cajas'), 7)
  A.pintarAgregar()
  chk('muestra las unidades mientras se carga', A.__doc.getElementById('pr-agregar-unidades').textContent === '7 cajas × 600 = 4.200 unidades')
  A.confirmarAgregar()
  chk('se agrega con su marca', A.estado.cierre.productos.length === 1 && A.estado.cierre.productos[0].marca_id === 'mk-grido' && A.estado.cierre.productos[0].cajas === 7)
  A.abrirAgregar()
  A.estado.agregar.productoId = 'p-gde'
  A.estado.agregar.presentacionId = 'pr-gde-200'
  A.ponerNumero(A.__doc.getElementById('pr-agregar-cajas'), 2)
  A.confirmarAgregar()
  chk('el segundo va al final (será el sublote 2)', A.estado.cierre.productos.map(x => x.presentacion_id).join() === 'pr-mini-600,pr-gde-200')
  chk('marcas: "Común" siempre y el buscador filtra sin acentos ni mayúsculas', /data-marca=""/.test(A.htmlMarcas(cat().marcas, 'grí', null)) &&
    /GRIDO/.test(A.htmlMarcas(cat().marcas, 'grí', null)) && !/FRIGOR/.test(A.htmlMarcas(cat().marcas, 'grí', null)))
  chk('una búsqueda sin resultados lo dice', /Ninguna marca coincide/.test(A.htmlMarcas(cat().marcas, 'zzz', null)))
  chk('"Común" marcado cuando no hay marca', /data-marca="" aria-pressed="true"/.test(A.htmlMarcas(cat().marcas, '', null)))
})())

// ── Planilla y paradas ────────────────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  S.__tablas.turnos_produccion = [PLANILLA.turno]
  S.__tablas.turno_operarios = [{ empleado_id: 'e-op1' }]
  S.__tablas.masas = [{ id: 'a' }, { id: 'b' }]
  S.__tablas.paradas_produccion = [{ id: 'pa1', inicio: '2026-09-22T10:00:00Z', fin: '2026-09-22T10:35:00Z', motivo: 'Cambio de molde' }]
  S.estado.tablero = [{ maquina: { id: 'm1', nombre: 'Máquina 1' }, turno: { id: 't1' } }]
  await S.abrirPlanilla('t1')
  const datos = S.__doc.getElementById('pr-planilla-datos').innerHTML
  chk('planilla: el lote grande', /class="pr-lote">7023</.test(datos))
  chk('… el operario y las masas (solo lectura)', /Operario Uno/.test(datos) && /Masas \(las carga el masero\)<\/span><span class="pr-dato__valor">2</.test(datos))
  chk('… cuenta solo masas sin anular', S.__llamadas.consultas.some(([t, f]) => t === 'masas' && JSON.stringify(f).includes('["eq","anulada",false]')))
  chk('… las paradas con su duración', /Cambio de molde<\/strong> · 07:00 a 07:35 · 35 min/.test(S.__doc.getElementById('pr-planilla-paradas').innerHTML), S.__doc.getElementById('pr-planilla-paradas').innerHTML)
  chk('sin parada en curso: se puede parar y cerrar', S.__doc.getElementById('pr-btn-parada').disabled === false && S.__doc.getElementById('pr-btn-cerrar-planilla').disabled === false)
  chk('… y no hay cartel fijo', S.__doc.getElementById('pr-parada-activa').hidden === true)

  // Iniciar una parada.
  S.__tablas.paradas_produccion = [
    { motivo: 'Cambio de molde' }, { motivo: 'cambio de  molde ' }, { motivo: 'Falta masa' }, { motivo: '' },
  ]
  await S.mostrarFormParada()
  const sug = S.__doc.getElementById('pr-parada-sugerencias').innerHTML
  chk('sugiere los motivos usados antes, sin repetir', (sug.match(/data-sugerencia=/g) || []).length === 2 && /Falta masa/.test(sug))
  S.__doc.getElementById('pr-parada-motivo').value = 'x'
  await S.confirmarParada()
  chk('motivo de una letra: no se manda', !S.__llamadas.rpc.some(([n]) => n === 'iniciar_parada'))
  S.__doc.getElementById('pr-parada-motivo').value = '  Se cortó la luz  '
  S.__tablas.paradas_produccion = [
    { id: 'pa1', inicio: '2026-09-22T10:00:00Z', fin: '2026-09-22T10:35:00Z', motivo: 'Cambio de molde' },
    { id: 'pa2', inicio: '2026-09-22T12:00:00Z', fin: null, motivo: 'Se cortó la luz' },
  ]
  await S.confirmarParada()
  const ip = S.__llamadas.rpc.find(([n]) => n === 'iniciar_parada')
  chk('iniciar_parada con el turno y el motivo recortado', JSON.stringify(ip?.[1]) === '{"p_turno_id":"t1","p_motivo":"Se cortó la luz"}', JSON.stringify(ip))
  chk('con la parada en curso: cartel fijo con "Reanudar"', S.__doc.getElementById('pr-parada-activa').hidden === false &&
    S.__doc.getElementById('pr-parada-activa-texto').textContent === 'Parada: Se cortó la luz · desde 09:00')
  chk('… no se puede parar otra vez ni cerrar', S.__doc.getElementById('pr-btn-parada').disabled === true && S.__doc.getElementById('pr-btn-cerrar-planilla').disabled === true)
  await S.mostrarCierre()
  chk('… y el cierre no se abre', S.__doc.getElementById('pr-cierre').hidden === true)
  S.__tablas.paradas_produccion = [{ id: 'pa2', inicio: '2026-09-22T12:00:00Z', fin: '2026-09-22T12:10:00Z', motivo: 'Se cortó la luz' }]
  await S.reanudar()
  const tp = S.__llamadas.rpc.find(([n]) => n === 'terminar_parada')
  chk('"Reanudar" termina esa parada', JSON.stringify(tp?.[1]) === '{"p_parada_id":"pa2"}')
  chk('… y el cartel se va', S.__doc.getElementById('pr-parada-activa').hidden === true)

  chk('duración de una hora y pico', S.duracionTexto('2026-09-22T10:00:00Z', '2026-09-22T11:05:00Z') === '1 h 05 min')
  chk('duración ilegible: vacía', S.duracionTexto('basura', null) === '')

  // HTML malicioso en todo lo que se dibuja.
  const X = armar()
  X.estado.personal = [{ id: 'e-x', nombre: marca('operario') }]
  chequearMarcas(chk, 'datos de la planilla', X.htmlDatosPlanilla({ turno: { lote: marca('lote'), turno: marca('turno'), abierto_en: null, encargado_id: 'e-x' }, operarios: ['e-x'], masas: 1 }), ['operario', 'lote', 'turno'])
  chequearMarcas(chk, 'paradas', X.htmlParadas([{ motivo: marca('motivoParada'), inicio: null, fin: null }]), ['motivoParada'])
  const catMalo = { productos: [{ id: 'p', nombre: marca('producto') }], presentaciones: [{ id: 'pr', producto_id: 'p', nombre: marca('presentacion'), empaque: marca('empaque'), unidades_por_caja: 1 }], marcas: [{ id: marca('marcaId'), nombre: marca('marca') }] }
  chequearMarcas(chk, 'renglón producido', X.htmlProducido({ presentacion_id: 'pr', marca_id: marca('marcaId'), cajas: 1 }, 0, 1, marca('sublote'), catMalo), ['producto', 'presentacion', 'empaque', 'marca', 'sublote'])
  chequearMarcas(chk, 'renglón que ya no está', X.htmlProducido({ presentacion_id: 'vieja', cajas: 1 }, 0, 1, marca('subViejo'), catMalo), ['subViejo'])
  chequearMarcas(chk, 'marcas', X.htmlMarcas(catMalo.marcas, marca('busqueda') + 'zz', null) + X.htmlMarcas(catMalo.marcas, '', null), ['marcaId', 'marca', 'busqueda'])
  chequearMarcas(chk, 'sublotes definitivos', X.htmlSublotesDefinitivos({ lote: marca('loteRes'), sublotes: [{ sublote: marca('subRes'), cajas: 1, unidades: 1 }] }), ['loteRes', 'subRes'])
  X.__tablas.paradas_produccion = [{ motivo: marca('sugerida') }]
  await X.mostrarFormParada()
  chequearMarcas(chk, 'motivos sugeridos', X.__doc.getElementById('pr-parada-sugerencias').innerHTML, ['sugerida'])
  X.estado.catalogo = {
    productos: [{ id: marca('prodId'), nombre: marca('producto') }],
    presentaciones: [{ id: marca('presId'), producto_id: marca('prodId'), nombre: marca('presentacion'), empaque: marca('empaque'), unidades_por_caja: 1 }],
    marcas: [],
  }
  X.estado.cierre = { productos: [] }
  X.abrirAgregar()
  X.estado.agregar.productoId = marca('prodId')
  X.pintarAgregar()
  chequearMarcas(chk, 'selects de agregar', X.__doc.getElementById('pr-agregar-producto').innerHTML + X.__doc.getElementById('pr-agregar-presentacion').innerHTML, ['prodId', 'presId', 'producto', 'presentacion', 'empaque'])
})())

fin()
