// Proyectos Taller (modulos/taller.html), con el diseño "Proyectos Taller"
// (29/09/2026). Se EJECUTA el script REAL del módulo (sandbox-taller.js) con
// un DOM falso y una base falsa:
//  - SIN taller:precios (Edgar): se ven TODOS los costos (presupuesto, gastos,
//    costo de las horas, costo total, valor de la hora, "se pasó $ …") y NO
//    aparece ninguna palabra de venta (ni en el HTML estático ni en lo que se
//    dibuja, aunque el objeto de la base la traiga); con el permiso, sí;
//  - un dato ausente dice "—", nunca "$ 0"; sin valor de hora, "sin valor de hora";
//  - guardar_proyecto y guardar_tarea_taller reciben SOLO lo que cambió;
//  - facturar / cargar a la fábrica, horas, anular: la RPC correcta, el error
//    de la base tal cual;
//  - el diagrama: días de lunes a sábado, carriles, horas disponibles (8 h por
//    día), atrasadas y superpuestas, la burbuja, los permisos (arma quien
//    tiene gestionar; quien solo carga ve y marca lo suyo), el arrastre;
//  - la barra de unidad, las personas sin tablets ni fábrica de pruebas;
//  - HTML malicioso en cada render.
//
//   ARCHIVO_TEST=<copia de modulos/taller.html>
'use strict'

const fs = require('fs')
const path = require('path')
const { arnes, marca, escapada } = require('./circuito-comun')
const { construirTaller } = require('./sandbox-taller')
const DISENO = require('./datos-maqueta/taller-diseno')

const RAIZ = path.join(__dirname, '..')
const RUTA = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos', 'taller.html')
const HTML = fs.readFileSync(RUTA, 'utf8')
console.log(`ARCHIVO ${RUTA} (${HTML.length} bytes)`)
const { chk, esperas, fin } = arnes()

// "venta" como palabra: la clase tl-ventana (las ventanas) no es la venta.
const VENTA = /precio de venta|\bventa\b|facturad|cobrad|margen|precio a la f[aá]brica|cargado a/i
const U = { taller: { id: 'u-taller', nombre: 'Taller' }, nuss: { id: 'u-nuss', nombre: 'Cucuruchos Nuss' }, dolce: { id: 'u-dolce', nombre: 'Dolce Pasta' }, robot: { id: 'u-robot', nombre: 'Pruebas (robot)' } }
const HOY = '2026-09-28'
const TAREAS = DISENO.rpc.tareas_taller
const PROYECTOS = DISENO.rpc.proyectos_taller

function nuevo({ tareas = ['ver'], rol = 'usuario', yo = 'emp-yo' } = {}) {
  const s = construirTaller({ archivo: RUTA })
  s.estado.misTareas = new Set(tareas)
  s.estado.miRolApp = rol
  s.estado.miEmpleadoId = yo
  s.estado.unidades = new Map(Object.values(U).map(u => [u.id, u]))
  s.estado.tallerId = 'u-taller'
  return s
}
// Un resumen como el de resumen_proyecto, CON los datos de venta (como si la
// base los mandara: sin permiso la pantalla no debe mostrarlos).
function resumen(extra = {}) {
  return {
    id: 'p1', nombre: 'Máquina barquillo 24', destino: 'externo', categoria: 'maquina', estado: 'en_curso',
    cliente: { id: 'c1', nombre: 'Carrizo', razon_social: 'Carrizo SRL' }, fabrica_destino: null,
    descripcion: 'desc', ubicacion: 'Rosario', observaciones: 'obs', responsable: 'Tomás',
    fecha_inicio: '2026-09-01', fecha_entrega_prometida: '2026-10-15', fecha_entrega_real: null, atrasado: false, moneda: 'ARS',
    presupuesto_costo: 1000000, horas_estimadas: 100, gastado: 600000, horas: 20, costo_horas: 370000, costo_total: 970000,
    presupuesto_usado_pct: 97, horas_usadas_pct: 20,
    gastos: [{ fecha: '2026-09-10', descripcion: 'Chapa', razon_social: 'Hierros SA', importe: 600000, moneda: 'ARS' }],
    horas_detalle: [{ id: 'h1', fecha: '2026-09-11', persona: 'Edgar', horas: 8, tarea: 'Soldadura' }],
    notas: [{ texto: 'Arrancamos', autor: 'Tomás', fecha: '2026-09-02T12:00:00Z' }],
    archivos: [{ id: 'a1', tipo: 'plano', nombre: 'plano.pdf', ruta: 'p1/1-plano.pdf', fecha: '2026-09-03T12:00:00Z' }],
    precio_venta: 1800000, facturado: 900000, cobrado: 500000, margen: 830000, margen_pct: 46.1,
    ...extra,
  }
}
const VH = { lista: [{ valor: 18500, vigente_desde: '2026-09-01', cargado_por: 'e1' }, { valor: 15000, vigente_desde: '2026-03-01', cargado_por: 'e2' }], error: null }
const CTX = (o = {}) => ({ precios: false, cargar: true, gestionar: true, personas: [], valorHora: VH, ...o })
const FICHA = (r, o = {}) => ({ id: r?.id || 'p1', r, error: null, tab: 'gastos', autores: new Map(), notaBorrador: '', archivos: { filtro: 'todos', busca: '' }, subir: false, enviando: false, ...o })
function fichaEntera(s, r, ctx) {
  return ['gastos', 'horas', 'notas', 'archivos'].map(tab => s.htmlFicha(FICHA(r, { tab }), ctx)).join('\n')
}

// ── 1. El HTML estático no nombra la venta ───────────────────────────────────
{
  const cuerpo = HTML.slice(HTML.indexOf('<body'), HTML.indexOf('<script type="module">')).replace(/<!--[\s\S]*?-->/g, '')
  chk('el HTML de la página (sin el script ni los comentarios) no nombra la venta', !VENTA.test(cuerpo), (cuerpo.match(/.{0,40}(venta|factur|cobrad|margen).{0,40}/i) || [])[0])
  chk('la página carga la barra lateral y la barra de unidad', HTML.includes('src="../js/barra-lateral.js"') && HTML.includes('src="../js/barra-unidad.js"'))
}

// ── 2. SIN precios (Edgar): todos los costos, nada de venta ─────────────────
{
  const s = nuevo({ tareas: ['ver', 'cargar', 'gestionar'] })
  const ctx = CTX({ precios: false })
  const r = resumen({ costo_total: 1340000, presupuesto_costo: 1240000 })
  const h = fichaEntera(s, r, ctx)
  chk('sin precios: ninguna palabra de venta en la ficha (en sus cuatro pestañas)', !VENTA.test(h), (h.match(/.{0,40}(venta|factur|cobrad|margen|cargado a).{0,40}/i) || [])[0])
  chk('sin precios: ningún importe de venta (aunque la base lo mande)', !/1\.800\.000|900\.000|500\.000|830\.000/.test(h))
  chk('sin precios: el presupuesto de costo', /PRESUPUESTO DE COSTO/.test(h) && /\$ 1\.240\.000/.test(h))
  chk('sin precios: los gastos', /GASTOS/.test(h) && /\$ 600\.000/.test(h))
  chk('sin precios: el costo de las horas', /HORAS · 20 h/.test(h) && /\$ 370\.000/.test(h))
  chk('sin precios: el costo total contra el presupuesto', /Costo \$ 1\.340\.000 de \$ 1\.240\.000/.test(h))
  chk('sin precios: "se pasó $ …" en bordó', /tl-barra__der--mal">se pasó \$ 100\.000/.test(h))
  chk('sin precios: el valor de la hora ("× $ 18.500 la hora")', /× \$ 18\.500 la hora/.test(h))
  chk('sin precios: el botón del valor de la hora en la cabecera', /data-accion="valor-hora">Valor de la hora · \$ 18\.500/.test(h))
  chk('sin precios: la columna COSTO de las horas', /Costo<\/span>/.test(h) && /\$ 148\.000/.test(h))
  chk('sin precios: "+ Cargar horas" arriba en vez de facturar', /data-accion="horas">\+ Cargar horas/.test(h) && !/data-accion="facturar"|data-accion="fabrica"/.test(h))
  chk('sin precios: dice quién ve lo que se cobra', /lo ve quien tiene permiso de precios/.test(h))
  // La cabecera sola (la pestaña Horas tiene su propio "+ Cargar horas").
  const cab = s.htmlFichaCabecera(resumen(), CTX())
  chk('sin precios: la CABECERA trae "+ Cargar horas"', /data-accion="horas">\+ Cargar horas/.test(cab) && !/data-accion="(facturar|fabrica)"/.test(cab))
  const hi = fichaEntera(s, resumen({ destino: 'interno', cliente: null, fabrica_destino: 'Cucuruchos Nuss' }), ctx)
  chk('sin precios, interno: tampoco "precio a la fábrica" ni "cargado a"', !VENTA.test(hi))
  // La lista.
  const t = PROYECTOS.map(p => s.htmlTarjetaProyecto(p, { precios: false })).join('')
  chk('sin precios: las tarjetas no dibujan la venta', !VENTA.test(t) && !/9\.800\.000|1\.900\.000/.test(t))
  chk('sin precios: las tarjetas sí dicen el costo', /Costo \$ 4\.820\.000 de \$ 5\.200\.000/.test(t) && /se pasó \$ 100\.000/.test(t))
  // El valor de la hora: lo ve, no lo cambia.
  s.__el('tl-btn-nuevo'); const extra = s.__el('tl-acciones-extra')
  s.estado.valorHora = VH
  s.pintarAccionesLista()
  chk('sin precios: el botón "Valor de la hora" está en la lista (es costo)', /tl-btn-valor-hora/.test(extra.innerHTML) && /\$ 18\.500/.test(extra.innerHTML))
  const hv = s.htmlValorHora(VH, { precios: false, nombres: new Map([['e1', 'Tomás']]) })
  chk('sin precios: ve el valor y la historia', /\$ 18\.500/.test(hv) && /\$ 15\.000/.test(hv) && /Tomás/.test(hv))
  chk('sin precios: no hay campo para cambiarlo, y dice quién lo cambia', !/tl-hora-valor/.test(hv) && /lo cambia quien tiene permiso de precios/.test(hv))
  // El editor no ofrece el precio.
  chk('el editor manda el precio de venta solo con permiso', !('precio_venta' in s.datosCambiados(s.originalDe(r), { ...s.originalDe(r), precio_venta: 1 }, { precios: false })))
}

// ── 3. CON precios (Tomás) ───────────────────────────────────────────────────
{
  const s = nuevo({ tareas: ['ver', 'cargar', 'gestionar', 'precios'] })
  const h = s.htmlFicha(FICHA(resumen()), CTX({ precios: true }))
  chk('con precios: precio de venta, facturado, cobrado y margen', /PRECIO DE VENTA/.test(h) && /FACTURADO/.test(h) && /COBRADO/.test(h) && /MARGEN HOY/.test(h))
  chk('con precios: las cifras', /\$ 1\.800\.000/.test(h) && /\$ 900\.000/.test(h) && /\$ 830\.000 · 46 %/.test(h))
  chk('con precios, externo: Facturar al cliente', /data-accion="facturar"/.test(h) && !/data-accion="fabrica"/.test(h))
  // En el celular la cabecera y Datos se esconden: el resumen del celular lleva
  // Editar y Facturar (si no, desde el celular no se podía ni editar ni facturar).
  const celu = s.htmlResumenCelu(resumen(), CTX({ precios: true }))
  chk('celular: el resumen trae Facturar y Editar', /data-accion="facturar"/.test(celu) && /data-accion="editar"/.test(celu))
  const celuInt = s.htmlResumenCelu(resumen({ destino: 'interno', cliente: null, fabrica_destino: 'Cucuruchos Nuss' }), CTX({ precios: true }))
  chk('celular, interno: Cargar a la fábrica', /data-accion="fabrica"/.test(celuInt) && !/data-accion="facturar"/.test(celuInt))
  const celuEd = s.htmlResumenCelu(resumen(), CTX({ precios: false, gestionar: true }))
  chk('celular sin precios: Editar sí, ninguna venta', /data-accion="editar"/.test(celuEd) && !/data-accion="(facturar|fabrica)"/.test(celuEd) && !VENTA.test(celuEd))
  const celuNada = s.htmlResumenCelu(resumen(), CTX({ precios: false, gestionar: false }))
  chk('celular sin gestionar ni precios: sin botones', !/data-accion=/.test(celuNada))
  chk('la ficha dibuja Facturar arriba y en el resumen del celular', (h.match(/data-accion="facturar"/g) || []).length === 2)
  const hi = s.htmlFicha(FICHA(resumen({ destino: 'interno', cliente: null, fabrica_destino: 'Cucuruchos Nuss' })), CTX({ precios: true }))
  chk('con precios, interno: Cargar a la fábrica, "precio a la fábrica" y sin Cobrado', /data-accion="fabrica"/.test(hi) && /PRECIO A LA FÁBRICA/.test(hi) && !/COBRADO/.test(hi))
  const sinCliente = s.htmlFicha(FICHA(resumen({ cliente: null })), CTX({ precios: true }))
  chk('sin cliente elegido, Facturar queda deshabilitado', /data-accion="facturar" disabled/.test(sinCliente) && /elegí el cliente en Datos/.test(sinCliente))
  const sinHora = s.htmlFichaPlata(resumen({ costo_horas: 0 }), CTX({ precios: true }))
  chk('sin valor de hora, el margen dice que falta', /falta el valor de hora/.test(sinHora))
  const res = new Map([['x', { facturado: 100, cobrado: 36 }]])
  const t = s.htmlTarjetaProyecto({ id: 'x', nombre: 'n', destino: 'externo', estado: 'en_curso', precio_venta: 100, costo_total: 1, presupuesto_costo: 2 }, { precios: true, resumenes: res })
  chk('con precios: la tarjeta dice venta y cobrado ("36 % · $ 36")', /VENTA/.test(t) && /36 % · \$ 36/.test(t))
  const t2 = s.htmlTarjetaProyecto({ id: 'y', nombre: 'n', destino: 'interno', estado: 'en_curso', precio_venta: 100 }, { precios: true, resumenes: new Map() })
  chk('mientras llega el resumen dice "…"; interno: "Precio a la fábrica" y "Cargado"', /…/.test(t2) && /PRECIO A LA FÁBRICA/.test(t2) && /CARGADO/.test(t2))
  const t3 = s.htmlTarjetaProyecto({ id: 'z', nombre: 'n', destino: 'externo', estado: 'en_curso', precio_venta: 100 }, { precios: true, resumenes: new Map([['z', null]]) })
  chk('si el resumen no se pudo leer, "—" (nunca "$ 0")', /COBRADO<\/div><div class="tl-kv__v">—/.test(t3))
  s.__el('tl-hora'); s.__el('tl-hora-slot-guardar')
  s.estado.valorHora = VH
  s.pintarValorHora()
  chk('con precios: el campo del valor nuevo y "Guardar el valor nuevo"', /tl-hora-valor/.test(s.__els.get('tl-hora').innerHTML) && /tl-hora-guardar/.test(s.__els.get('tl-hora-slot-guardar').innerHTML))
  const s2 = nuevo({ tareas: ['ver'] }); s2.__el('tl-hora'); s2.__el('tl-hora-slot-guardar'); s2.estado.valorHora = VH; s2.pintarValorHora()
  chk('sin precios: no hay botón de guardar el valor', s2.__els.get('tl-hora-slot-guardar').innerHTML === '')
  const s3 = nuevo({ tareas: [], rol: 'super_admin' })
  chk('un super_admin tiene todo (bypass, como _puede_taller)', s3.puedePrecios() && s3.puedeGestionar() && s3.puedeCargar())
}

// ── 4. El costo: sin valor de hora, sin datos ────────────────────────────────
{
  const s = nuevo()
  chk('horas cargadas y costo de horas en 0: falta el valor de la hora', s.faltaValorHora(resumen({ costo_horas: 0 })) === true)
  chk('sin horas no falta nada', s.faltaValorHora(resumen({ horas: 0, costo_horas: 0 })) === false)
  const h = s.htmlFichaPlata(resumen({ costo_horas: 0, costo_total: 600000 }), CTX())
  chk('dice "sin valor de hora" en el costo de las horas', /sin valor de hora/.test(h) && /Cargá el valor para calcularlo/.test(h))
  chk('y el costo dice que son solo los gastos', /Costo: solo gastos, sin las horas/.test(h))
  chk('un importe ausente es "—", nunca "$ 0"', s.importe(null) === '—' && s.importe('') === '—' && s.importe(undefined) === '—' && s.importe(NaN) === '—')
  chk('un cero de verdad es "$ 0"', s.importe(0) === '$ 0')
  chk('sin centavos si es redondo, con centavos si los tiene', s.importe(1234567) === '$ 1.234.567' && s.importe(10.5) === '$ 10,50')
  chk('USD con US$', s.importe(10, 'USD') === 'US$ 10')
  const sinPres = s.htmlCosto(500, null)
  chk('sin presupuesto: lo dice y no dibuja barra', /sin presupuesto de costo/.test(sinPres) && !/tl-barra__pista/.test(sinPres))
  chk('la barra no pasa del 100 % de ancho ni baja de 0', /width:100%/.test(s.htmlBarraCosto(250)) && /width:0%/.test(s.htmlBarraCosto(-5)))
  chk('avanceCosto: null sin presupuesto', s.avanceCosto({ presupuesto_costo: null, costo_total: 5 }) === null && s.avanceCosto({ presupuesto_costo: 0, costo_total: 5 }) === null)
  chk('avanceCosto: el porcentaje', s.avanceCosto({ presupuesto_costo: 200, costo_total: 50 }) === 25)
  const t = s.htmlTarjetaProyecto({ id: 'p', nombre: 'n', destino: 'externo', estado: 'en_curso', costo_total: 150, presupuesto_costo: 100, atrasado: true, fecha_entrega_prometida: '2026-09-01', horas: 60, horas_estimadas: 48 })
  chk('la tarjeta atrasada: franja bordó, chip y días de atraso', /tl-banda--atrasado/.test(t) && /tl-chip--malo">Atrasado/.test(t) && /atrasado \d+ días/.test(t))
  chk('las horas pasadas de lo estimado, en bordó', /tl-kv__v tl-kv__v--mal">60 de 48 h/.test(t))
  chk('horas sin estimar: solo las cargadas', /HORAS<\/div><div class="tl-kv__v">3 h/.test(s.htmlTarjetaProyecto({ id: 'q', nombre: 'n', estado: 'aprobado', horas: 3 })))
  chk('un proyecto cerrado atrasado no se marca atrasado', !/tl-banda--atrasado/.test(s.htmlTarjetaProyecto({ id: 'q', nombre: 'n', estado: 'entregado', atrasado: true })))
  chk('costo de una carga de horas: horas × el valor de ese día', s.costoDeHoras({ fecha: '2026-09-11', horas: 8 }, VH).texto === '$ 148.000')
  chk('costo de una carga de horas sin valor ese día: "sin valor"', s.costoDeHoras({ fecha: '2026-01-11', horas: 8 }, VH).texto === 'sin valor')
  chk('si no se pudo leer el valor: "—"', s.costoDeHoras({ fecha: '2026-09-11', horas: 8 }, { lista: [], error: 'x' }).texto === '—')
}

// ── 5. Solo lo que cambió (guardar_proyecto) ─────────────────────────────────
{
  const s = nuevo()
  s.estado.personas = [{ id: 'e-tomas', nombre: 'Tomás' }]
  const o = s.originalDe(resumen())
  chk('originalDe: el cliente por id y el responsable por nombre', o.cliente_id === 'c1' && o.responsable_id === 'e-tomas')
  chk('sin cambios, no se manda nada', Object.keys(s.datosCambiados(o, { ...o }, { precios: true })).length === 0)
  const d = s.datosCambiados(o, { ...o, estado: 'terminado', ubicacion: '' }, { precios: true })
  chk('manda solo lo que cambió', JSON.stringify(Object.keys(d).sort()) === '["estado","ubicacion"]', JSON.stringify(d))
  chk('una clave vaciada viaja como "" (borra)', d.ubicacion === '')
  chk('con precios, el precio de venta que cambió viaja', s.datosCambiados(o, { ...o, precio_venta: 2000000 }, { precios: true }).precio_venta === 2000000)
  const aInterno = s.datosCambiados(o, { ...o, destino: 'interno', cliente_id: '', unidad_destino_id: 'u-nuss' }, {})
  chk('pasar a interno saca el cliente y pone la fábrica', aInterno.destino === 'interno' && aInterno.cliente_id === '' && aInterno.unidad_destino_id === 'u-nuss')
  const nuevoP = s.datosCambiados(s.originalDe(null), { ...s.originalDe(null), nombre: 'Nuevo', presupuesto_costo: 500 }, { nuevo: true })
  chk('nuevo: solo lo que no está vacío (con los defaults)', nuevoP.nombre === 'Nuevo' && nuevoP.presupuesto_costo === 500 && !('ubicacion' in nuevoP) && nuevoP.destino === 'externo')
  chk('originalDe: la fábrica destino por nombre', s.originalDe(resumen({ destino: 'interno', cliente: null, fabrica_destino: 'Dolce Pasta' })).unidad_destino_id === 'u-dolce')
}

// ── 6. Facturar y cargar a la fábrica (la ventana) ──────────────────────────
esperas.push((async () => {
  const s = nuevo({ tareas: ['ver', 'precios'] })
  s.__el('tl-modal'); s.__el('tl-ficha'); s.__el('tl-ficha-titulo'); s.__el('tl-cabeza-proyecto-nombre')
  s.estado.ficha = FICHA(resumen())
  s.abrirModalVenta('facturar')
  chk('abre la ventana de facturar, con "Avance" si ya se facturó algo', s.estado.modal?.tipo === 'facturar' && s.estado.modal.clase === 'avance' && s.estado.modal.concepto === 'Avance')
  chk('la ventana dice "pasa de … a …" y lo que falta', /Facturado pasa de \$ 900\.000 a \$ 900\.000/.test(s.__els.get('tl-modal').innerHTML) && /Falta facturar \$ 900\.000 de \$ 1\.800\.000/.test(s.__els.get('tl-modal').innerHTML))
  s.elegirTipoFactura('saldo')
  chk('"Saldo final" pone lo que falta y cambia el concepto', s.estado.modal.importe === 900000 && s.estado.modal.concepto === 'Saldo final')
  s.estado.modal.concepto = 'Mi concepto'
  s.elegirTipoFactura('anticipo')
  chk('cambiar el tipo no pisa un concepto escrito a mano', s.estado.modal.concepto === 'Mi concepto')
  const rv = s.resumenVenta({ tipo: 'facturar', importe: 400000 }, resumen())
  chk('resumenVenta: las dos líneas', rv.linea1 === 'Facturado pasa de $ 900.000 a $ 1.300.000' && rv.linea2 === 'Falta facturar $ 500.000 de $ 1.800.000')
  chk('resumenVenta: sin precio lo dice', /no tiene precio de venta/.test(s.resumenVenta({ tipo: 'facturar', importe: 1 }, resumen({ precio_venta: null })).linea2))
  chk('resumenVenta: por encima del precio lo dice', /por encima del precio de venta/.test(s.resumenVenta({ tipo: 'facturar', importe: 2000000 }, resumen()).linea2))
  chk('faltaVenta: importe y concepto', /importe/.test(s.faltaVenta({ importe: null, concepto: 'xxx' })) && /concepto/.test(s.faltaVenta({ importe: 5, concepto: 'x' })) && s.faltaVenta({ importe: 5, concepto: 'Anticipo' }) === null)
  chk('el botón dice el monto', s.textoConfirmar({ importe: 1960000 }, resumen()) === 'Confirmar · $ 1.960.000')
  Object.assign(s.estado.modal, { importe: null })
  await s.accionModal('venta-confirmar')
  chk('sin importe no llama a la base y lo dice', s.__llamadas.rpc.length === 0 && /importe/.test(s.estado.modal.error))
  Object.assign(s.estado.modal, { importe: 500000, concepto: '  Anticipo  ' })
  await s.accionModal('venta-confirmar')
  const [n, p] = s.__llamadas.rpc[0] || []
  chk('facturar_proyecto con importe, concepto limpio y fecha de hoy', n === 'facturar_proyecto' && p.p_proyecto_id === 'p1' && p.p_importe === 500000 && p.p_concepto === 'Anticipo' && p.p_fecha === s.hoyArgentina(), JSON.stringify([n, p]))
  chk('después se cierra la ventana', s.estado.modal === null)

  const s2 = nuevo({ tareas: ['precios'] }); s2.__el('tl-modal'); s2.__el('tl-ficha'); s2.__el('tl-ficha-titulo'); s2.__el('tl-cabeza-proyecto-nombre')
  s2.estado.ficha = FICHA(resumen({ destino: 'interno', cliente: null, fabrica_destino: 'Cucuruchos Nuss', precio_venta: 1900000, facturado: 1200000 }))
  s2.abrirModalVenta('fabrica')
  chk('cargar a la fábrica arranca con lo que falta del precio', s2.estado.modal.importe === 700000)
  chk('y la pista lo dice', s2.pistaImporte(s2.estado.modal, s2.estado.ficha.r) === 'Lo que falta del precio a la fábrica')
  s2.estado.modal.concepto = 'Cinta'
  s2.__setRpc(async () => ({ data: null, error: { message: 'Solo un trabajo interno con fábrica destino se carga a una fábrica.' } }))
  await s2.accionModal('venta-confirmar')
  chk('cargar a la fábrica llama a cargar_proyecto_a_fabrica', s2.__llamadas.rpc[0]?.[0] === 'cargar_proyecto_a_fabrica')
  chk('el error de la base TAL CUAL, pegado a la ventana', s2.estado.modal?.error === 'Solo un trabajo interno con fábrica destino se carga a una fábrica.' && /Solo un trabajo interno/.test(s2.__els.get('tl-modal').innerHTML))

  const s3 = nuevo({ tareas: ['ver', 'cargar'] }); s3.__el('tl-modal')
  s3.estado.ficha = FICHA(resumen())
  s3.abrirModalVenta('facturar')
  chk('sin precios, facturar no abre nada', s3.estado.modal === null)
  s3.estado.modal = { tipo: 'facturar', importe: 1, concepto: 'xxx' }
  await s3.accionModal('venta-confirmar')
  chk('sin precios, confirmar no llama a la base', s3.__llamadas.rpc.length === 0)
})())

// ── 7. Horas y anular horas ──────────────────────────────────────────────────
esperas.push((async () => {
  const s = nuevo({ tareas: ['ver', 'cargar'] })
  const hoy = s.hoyArgentina()
  chk('horas: pide quién', /quién/.test(s.faltaHoras({ personaId: '', horas: 2, fecha: hoy })))
  chk('horas: pide cuántas', /horas/.test(s.faltaHoras({ personaId: 'e', horas: null, fecha: hoy })))
  chk('horas: 0 no vale', !!s.faltaHoras({ personaId: 'e', horas: 0, fecha: hoy }))
  chk('horas: más de 24 no', /24/.test(s.faltaHoras({ personaId: 'e', horas: 25, fecha: hoy })))
  chk('horas: no a futuro', /futuro/.test(s.faltaHoras({ personaId: 'e', horas: 2, fecha: '2999-01-01' })))
  chk('horas: todo bien', s.faltaHoras({ personaId: 'e', horas: 8, fecha: hoy }) === null)
  s.__el('tl-modal'); s.__el('tl-ficha'); s.__el('tl-ficha-titulo'); s.__el('tl-cabeza-proyecto-nombre')
  s.estado.personas = [{ id: 'emp-yo', nombre: 'Yo' }]
  s.estado.ficha = FICHA(resumen())
  s.abrirModalHoras()
  chk('la ventana arranca con quien carga y hoy', s.estado.modal.personaId === 'emp-yo' && s.estado.modal.fecha === hoy)
  Object.assign(s.estado.modal, { horas: 7.5, tarea: '  Armado  ' })
  await s.accionModal('horas-guardar')
  const [n, p] = s.__llamadas.rpc[0] || []
  chk('cargar_horas_proyecto con persona, fecha, horas y tarea limpia', n === 'cargar_horas_proyecto' && p.p_empleado_id === 'emp-yo' && p.p_horas === 7.5 && p.p_tarea === 'Armado' && p.p_fecha === hoy, JSON.stringify(p))
  s.estado.modal = { tipo: 'anular-horas', horasId: 'h1', texto: '8 h de Edgar', error: null, enviando: false }
  s.__setRpc(async () => ({ data: null, error: { message: 'Solo quien las cargó o quien gestiona puede anularlas.' } }))
  await s.accionModal('anular-horas-confirmar')
  const an = s.__llamadas.rpc.find(r => r[0] === 'anular_horas_proyecto')
  chk('anular_horas_proyecto con el id', an && an[1].p_horas_id === 'h1')
  chk('el error de anular, tal cual', s.estado.modal?.error === 'Solo quien las cargó o quien gestiona puede anularlas.')
  const h = s.htmlTabHoras(resumen(), CTX({ cargar: false, gestionar: false }))
  chk('sin cargar ni gestionar: ni cargar horas ni anular', !/data-accion="horas"/.test(h) && !/data-anular-horas/.test(h))
  const s2 = nuevo({ tareas: ['ver'] }); s2.__el('tl-modal'); s2.estado.ficha = FICHA(resumen())
  s2.abrirModalHoras()
  chk('sin cargar, la ventana de horas no se abre', s2.estado.modal === null)
})())

// ── 8. La lista: filtros y barra de unidad ───────────────────────────────────
{
  const s = nuevo()
  const lista = [
    { id: '1', destino: 'externo', estado: 'en_curso', categoria: 'maquina' },
    { id: '2', destino: 'interno', estado: 'aprobado', fabrica_destino: 'Cucuruchos Nuss', categoria: 'dispositivo' },
    { id: '3', destino: 'interno', estado: 'en_curso', fabrica_destino: 'Dolce Pasta', atrasado: true },
    { id: '4', destino: 'externo', estado: 'entregado', atrasado: true },
  ]
  const ids = (u, f) => s.filtrarProyectos(lista, { estado: 'todos', destino: '', categoria: '', ...f }, u).map(p => p.id).join(',')
  chk('Todas: todos', ids(null) === '1,2,3,4')
  chk('Taller: todos', ids('u-taller') === '1,2,3,4')
  chk('otra fábrica: solo los trabajos internos para ella', ids('u-nuss') === '2')
  chk('la nota lo dice con el nombre', /Cucuruchos Nuss/.test(s.textoNotaUnidad('u-nuss')) && s.textoNotaUnidad(null) === '' && s.textoNotaUnidad('u-taller') === '')
  chk('"Atrasados": solo los atrasados abiertos', ids(null, { estado: 'atrasados' }) === '3')
  chk('filtro por destino y por categoría', ids(null, { destino: 'interno' }) === '2,3' && ids(null, { categoria: 'maquina' }) === '1')
  const c = s.contarEstados(lista, null)
  chk('los números del segmentado', c.todos === 4 && c.en_curso === 2 && c.entregado === 1 && c.atrasados === 1 && c.cancelado === 0)
  chk('el vacío dice qué se filtró', s.textoVacio({ estado: 'cancelado', destino: 'interno', categoria: '' }) === 'No hay proyectos internos cancelados')
  const vacio = s.htmlLista([], null, { filtros: { estado: 'cancelado', destino: 'interno', categoria: '' } })
  chk('el vacío con filtros ofrece sacarlos', /data-accion="sacar-filtros"/.test(vacio))
  chk('la lista con error: esqueletos, y el aviso con Reintentar', /Cargando…/.test(s.htmlLista(null, 'x')) && /data-accion="reintentar-lista"/.test(s.htmlAvisoLista('x')))
  chk('el HTML estático conserva los selects de destino y categoría', /id="tl-filtro-destino"/.test(HTML) && /id="tl-filtro-categoria"/.test(HTML))
}

// ── 9. Personas, fábricas, archivos, valor de la hora, links ────────────────
{
  const s = nuevo()
  const fab = { ok: true, unidades: new Set(['u-robot']), personas: new Set(['e-robot']), soyDePrueba: false }
  const ps = s.personasElegibles([
    { id: 'e1', nombre: 'Edgar', tipo: 'naaloo', activo: true }, { id: 'e2', nombre: 'Tablet', tipo: 'sistema', activo: true },
    { id: 'e3', nombre: 'Empresa', tipo: 'empresa', activo: false }, { id: 'e-robot', nombre: 'Robot', tipo: 'naaloo', activo: true },
    { id: 'e4', nombre: 'Baja', tipo: 'naaloo', activo: false }, { id: 'e5', nombre: 'Ana', tipo: 'admin', activo: true, unidad_negocio_id: 'u-robot' },
  ], fab).map(p => p.id).join(',')
  chk('personas: sin tablets, sin la Empresa, sin bajas y sin la fábrica de pruebas', ps === 'e1', ps)
  s.estado.fabrica = fab
  chk('fábricas destino: sin el Taller y sin la de pruebas', s.fabricasDestino().map(u => u.id).sort().join(',') === 'u-dolce,u-nuss')
  chk('nombre de archivo seguro', s.nombreSeguro('Plano Máquina #1 (v2).PDF') === 'plano-maquina-1-v2-.pdf', s.nombreSeguro('Plano Máquina #1 (v2).PDF'))
  chk('nada de barras ni ".."', !/[\\/]|\.\./.test(s.nombreSeguro('../../etc/passwd')) && !/[\\/]/.test(s.nombreSeguro('a/b\\c')))
  chk('la ruta empieza con el id del proyecto (lo exige registrar_archivo_proyecto)', s.rutaArchivo('p1', 'x.pdf', 5) === 'p1/5-x.pdf')
  chk('tipo sugerido: una imagen es foto', s.tipoSugerido({ type: 'image/jpeg' }) === 'foto' && s.tipoSugerido({ type: 'application/pdf' }) === 'otro')
  const vh = [{ valor: 10, vigente_desde: '2026-01-01' }, { valor: 20, vigente_desde: '2026-06-01' }, { valor: 30, vigente_desde: '2999-01-01' }]
  chk('valor vigente: el más nuevo que no pasa la fecha', s.valorVigente(vh, '2026-09-01').valor === 20 && s.valorVigente(vh, '2025-01-01') === null)
  const hv = s.htmlValorHora({ lista: vh, error: null }, { precios: true, nombres: new Map() })
  chk('valor de la hora: el grande, lo futuro marcado', /\$ 20<\/span>/.test(hv) && /más adelante/.test(hv))
  chk('con precios: la nota de desde cuándo rige', /Las horas cargadas antes del/.test(hv))
  chk('sin ningún valor: "sin valor de hora"', /sin valor de hora/.test(s.htmlValorHora({ lista: [], error: null })))
  chk('link directo: solo un uuid', s.leerLinkDirecto('?proyecto=0b0e7d2a-1111-4222-8333-444455556666') === '0b0e7d2a-1111-4222-8333-444455556666' && s.leerLinkDirecto('?proyecto=javascript:1') === null)
  chk('?vista=diagrama abre el diagrama', s.leerVistaDirecta('?vista=diagrama') === 'diagrama' && s.leerVistaDirecta('?vista=x') !== 'diagrama')
  chk('fechas sin pasar por Date', s.fechaCorta('2026-09-28') === '28/09/2026' && s.fechaCorta(null) === '—' && s.fechaDiaMes('2026-09-28') === '28/09')
  chk('hoy en Argentina, no en UTC', s.hoyArgentina(new Date('2026-09-28T02:00:00Z')) === '2026-09-27')
  const arch = [{ id: 'a', tipo: 'plano', nombre: 'Plano general.pdf' }, { id: 'b', tipo: 'foto', nombre: 'Bastidor.jpg' }]
  chk('archivos: filtro por tipo y búsqueda', s.filtrarArchivos(arch, 'foto', '').length === 1 && s.filtrarArchivos(arch, 'todos', 'plano').length === 1)
  chk('archivos: el autor si se sabe', /Edgar · 26\/09/.test(s.htmlGrillaArchivos([{ id: 'b', tipo: 'foto', nombre: 'b', fecha: '2026-09-26T12:00:00Z' }], new Map([['b', 'Edgar']]))))
  chk('las iniciales de un solo nombre: dos letras', s.inicialesAvatar('Tomás') === 'TO' && s.inicialesAvatar('Edgar Molina') === 'EM')
}

// ── 10. El diagrama: días, carriles, horas, atrasadas, choques ──────────────
{
  const s = nuevo({ tareas: ['ver', 'cargar', 'gestionar'] })
  const dias = s.diasVisibles(HOY, 2)
  chk('2 semanas = 12 días, de lunes a sábado (sin domingos)', dias.length === 12 && dias[0] === '2026-09-28' && dias[5] === '2026-10-03' && dias[6] === '2026-10-05' && !dias.includes('2026-10-04'))
  chk('1 semana = 6 días; Mes = 24', s.diasVisibles(HOY, 1).length === 6 && s.diasVisibles(HOY, s.semanasDelRango('mes')).length === 24)
  chk('el lunes de una fecha', s.lunesDe('2026-10-01') === '2026-09-28' && s.lunesDe('2026-10-04') === '2026-09-28')
  const t06 = TAREAS.find(t => t.id === 't06')
  chk('una atrasada se dibuja desde hoy con sus mismos días', JSON.stringify(s.intervaloDibujo(t06, HOY)) === JSON.stringify({ ini: HOY, fin: '2026-09-29', movida: true }))
  chk('atrasada = avance < 100 y fin < hoy (sin el dato de la base)', s.esAtrasada({ fecha_inicio: '2026-09-20', dias: 2, avance_pct: 50 }, HOY) === true &&
    s.esAtrasada({ fecha_inicio: '2026-09-20', dias: 2, avance_pct: 100 }, HOY) === false && s.esAtrasada({ fecha_inicio: '2026-09-28', dias: 2 }, HOY) === false)
  chk('columnas: las que ocupa, o null si no se ve', JSON.stringify(s.columnasDe(dias, { ini: '2026-09-30', fin: '2026-10-05' })) === '{"a":2,"b":6}' && s.columnasDe(dias, { ini: '2026-12-01', fin: '2026-12-02' }) === null)
  const items = [{ a: 0, b: 1 }, { a: 2, b: 2 }, { a: 2, b: 2 }]
  chk('carriles: dos que se pisan abren el renglón en dos', s.asignarCarriles(items) === 2 && items[0].carril === 0 && items[1].carril !== items[2].carril)
  chk('carriles: sin pisarse, un solo renglón', s.asignarCarriles([{ a: 0, b: 1 }, { a: 2, b: 3 }]) === 1)
  chk('días hábiles sin domingos', s.diasHabiles('2026-10-01', '2026-10-06') === 5)
  chk('horas en el período: proporcional a los días hábiles', s.horasEnRango({ fecha_inicio: '2026-10-01', dias: 6, horas_estimadas: 40 }, s.diasVisibles(HOY, 1), HOY) === 24)
  chk('sin horas estimadas, 8 h por día', s.horasEnRango({ fecha_inicio: '2026-09-29', dias: 2 }, dias, HOY) === 16)
  const pr = s.problemasDiagrama(TAREAS, dias, HOY)
  chk('1 atrasada, 2 que se superponen, 1 choque → burbuja 2', pr.atrasadas.length === 1 && pr.superpuestas.length === 2 && pr.choques.length === 1 && pr.burbuja === 2, JSON.stringify({ a: pr.atrasadas.length, s: pr.superpuestas.length, c: pr.choques.length }))
  const txt = s.textoAviso(pr)
  chk('el aviso: "1 actividad atrasada y 2 que se superponen"', txt.titulo === '1 actividad atrasada y 2 que se superponen', txt.titulo)
  chk('el detalle nombra la atrasada y el choque', txt.detalle === 'Ajuste de la bomba (Julián) tenía que terminar el 26/09 · Julián tiene dos cosas el miércoles 30', txt.detalle)
  chk('una actividad hecha no choca', s.choquesDe(TAREAS.map(t => t.id === 't12' ? { ...t, avance_pct: 100 } : t), dias).length === 0)
  chk('sin problemas no hay aviso', s.htmlAvisoDiagrama(s.problemasDiagrama([], dias, HOY)) === '')
  s.estado.fabrica = { ok: true, unidades: new Set(), personas: new Set(['e-robot']), soyDePrueba: false }
  const personas = [{ id: 'emp-edgar', nombre: 'Edgar Molina' }, { id: 'emp-tomas', nombre: 'Tomás' }, { id: 'emp-julian', nombre: 'Julián Ferreyra' }, { id: 'emp-gustavo', nombre: 'Gustavo Páez' }, { id: 'e-robot', nombre: 'Robot' }]
  const filas = s.filasOperario(TAREAS, personas, s.diasVisibles(HOY, 1), { hoy: HOY, yo: 'emp-tomas' })
  chk('por operario: vos primero, la fábrica de pruebas nunca', filas[0].id === 'emp-tomas' && !filas.some(f => f.id === 'e-robot'))
  const julian = filas.find(f => f.id === 'emp-julian')
  chk('Julián: su renglón en dos carriles y "2 cosas el mié 30"', julian.carriles === 2 && s.textoSubPersona(julian, s.diasVisibles(HOY, 1)) === '2 cosas el mié 30')
  const tomas = filas.find(f => f.id === 'emp-tomas')
  chk('Tomás: "48 h de 48 h" en una semana (lunes a sábado, 8 h por día)', s.textoSubPersona(tomas, s.diasVisibles(HOY, 1)) === '48 h de 48 h')
  chk('el sábado es una columna más angosta', /minmax\(0,0\.6fr\)$/.test(s.columnasCss(s.diasVisibles(HOY, 1), 170)))
  chk('el color de cada proyecto sale del id, siempre el mismo', s.colorProyecto('aaaaaaaa-0000-4000-8000-000000000000').c === s.colorProyecto('aaaaaaaa-0000-4000-8000-000000000000').c &&
    s.colorProyecto('aaaaaaaa-0000-4000-8000-000000000000').c !== s.colorProyecto('aaaaaaaa-0000-4000-8000-000000000001').c)
  chk('un id raro no rompe el color', typeof s.colorProyecto(null).c === 'string' && typeof s.colorProyecto('<x>').c === 'string')
  const grupos = s.gruposProyecto(TAREAS, dias, HOY, PROYECTOS)
  chk('por proyecto: en el orden de la lista de proyectos', grupos[0].nombre === 'Maq Barquillo 24 Carrizo' && grupos[1].nombre === 'Dosificador de masa M3')
  const mis = s.misActividades(TAREAS, 'emp-edgar', HOY)
  chk('mis actividades: hoy y lo que viene', mis.hoy.map(x => x.t.id).join() === 't01' && mis.viene.map(x => x.t.id).join() === 't03')
  chk('"lun 28 al jue 01 · día 1 de 4"', s.textoCuando({ ini: HOY, fin: '2026-10-01' }, HOY) === 'lun 28 al jue 01 · día 1 de 4')
}

// ── 11. El diagrama no muestra plata, y los permisos ─────────────────────────
{
  const dibujar = (s, over = {}) => {
    const ctx = { ...s.contextoDiagrama(), hoy: HOY, dias: s.diasVisibles(HOY, 2), ...over }
    ctx.cols = s.columnasCss(ctx.dias, ctx.ancho)
    return s.htmlDiagrama({ ...s.estado.diag, tareas: TAREAS, error: null, ...over.d }, ctx)
  }
  const g = nuevo({ tareas: ['ver', 'cargar', 'gestionar', 'precios'], yo: 'emp-tomas' })
  g.estado.personas = [{ id: 'emp-tomas', nombre: 'Tomás', unidad_negocio_id: 'u-taller' }]
  const hg = dibujar(g)
  chk('el diagrama no muestra plata (ni con precios)', !/\$/.test(hg) && !VENTA.test(hg))
  chk('con gestionar: "+ Actividad" y el borde para estirar', /data-accion="act-nueva"/.test(hg) && /data-borde="1"/.test(hg))
  chk('las barras atrasada y superpuesta se marcan', /tl-barra-g--atrasada/.test(hg) && /tl-barra-g--superpone/.test(hg) && /atrasada · era hasta el 26\/09/.test(hg))
  g.estado.proyectos = PROYECTOS
  const hp = dibujar(g, { agrupar: 'proyecto' })
  chk('por proyecto: el grupo, el chip de atraso y "Edgar · 32 h / 20 % hecho"', /Maq Barquillo 24 Carrizo/.test(hp) && /Atrasado \d+ días/.test(hp) && /Edgar · 32 h/.test(hp) && /20 % hecho/.test(hp))
  const c = nuevo({ tareas: ['ver', 'cargar'], yo: 'emp-edgar' })
  const hc = dibujar(c)
  chk('solo cargar: sin "+ Actividad" ni borde para estirar', !/data-accion="act-nueva"/.test(hc) && !/data-borde/.test(hc))
  c.estado.personas = [{ id: 'emp-edgar', nombre: 'Edgar Molina', unidad_negocio_id: 'u-taller' }, { id: 'emp-tomas', nombre: 'Tomás', unidad_negocio_id: 'u-taller' }]
  chk('solo cargar: el diagrama muestra solo su renglón', c.contextoDiagrama().personas.map(p => p.id).join() === 'emp-edgar')
  chk('solo cargar: "Cargar horas" y "Marcar avance" en su tarjeta de hoy', /data-accion="mia-horas"/.test(hc) && /data-accion="mia-avance"/.test(hc))
  const v = nuevo({ tareas: ['ver'], yo: 'emp-edgar' })
  chk('solo ver: sin botones en sus tarjetas', !/data-accion="mia-horas"/.test(dibujar(v)))
  v.__el('tl-diagrama'); v.estado.diag.tareas = TAREAS
  v.abrirPanel('t01')
  chk('sin gestionar, tocar una barra no abre el panel de edición', v.estado.diag.panel === null)
  v.nuevaActividad()
  chk('sin gestionar, no se crea una actividad', v.estado.diag.panel === null)
  chk('mientras carga, "Cargando…"; con error, el mensaje y Reintentar', /Cargando…/.test(g.htmlDiagrama({ ...g.estado.diag, tareas: null }, g.contextoDiagrama())) &&
    /data-accion="diag-reintentar"/.test(g.htmlDiagrama({ ...g.estado.diag, error: 'x' }, g.contextoDiagrama())))
}

// ── 12. Guardar, eliminar, horas y avance de una actividad ──────────────────
esperas.push((async () => {
  const s = nuevo({ tareas: ['ver', 'cargar', 'gestionar'] })
  const t = TAREAS.find(x => x.id === 't07')
  const orig = s.panelDeTarea(t)
  chk('el panel toma los datos de la actividad', orig.persona === 'emp-julian' && orig.desde === '2026-09-30' && orig.hasta === '2026-09-30' && orig.horas === 8)
  chk('sin cambios, nada', Object.keys(s.datosActividad({ ...orig }, orig)).length === 0)
  const d = s.datosActividad({ ...orig, persona: 'emp-edgar', hasta: '2026-10-01' }, orig)
  chk('solo lo que cambió; una persona sola', JSON.stringify(d) === '{"fecha_fin":"2026-10-01","personas":["emp-edgar"]}', JSON.stringify(d))
  chk('sacar la persona: personas []', JSON.stringify(s.datosActividad({ ...orig, persona: '' }, orig)) === '{"personas":[]}')
  chk('vaciar las horas: ""', s.datosActividad({ ...orig, horas: null }, orig).horas_estimadas === '')
  const n = s.datosActividad({ id: null, titulo: ' Pintar ', nombre_corto: '', proyecto_id: 'p', persona: 'e', desde: HOY, hasta: HOY, horas: 8, avance: 0 })
  chk('nueva: lo que no está vacío', n.titulo === 'Pintar' && n.proyecto_id === 'p' && n.fecha_inicio === HOY && n.horas_estimadas === 8 && JSON.stringify(n.personas) === '["e"]' && !('nombre_corto' in n))
  chk('faltaActividad: nombre, proyecto, fechas, horas y avance', /nombre/.test(s.faltaActividad({ titulo: 'x' })) && /proyecto/.test(s.faltaActividad({ titulo: 'xx', proyecto_id: '' })) &&
    /anterior/.test(s.faltaActividad({ id: 'a', titulo: 'xx', desde: '2026-10-02', hasta: '2026-10-01' })) && /0 a 100/.test(s.faltaActividad({ id: 'a', titulo: 'xx', desde: HOY, hasta: HOY, avance: 120 })) &&
    s.faltaActividad({ id: 'a', titulo: 'xx', desde: HOY, hasta: HOY, horas: 8, avance: 10 }) === null)
  s.__el('tl-diagrama'); s.__el('tl-burbuja-diagrama')
  s.estado.diag.tareas = TAREAS
  s.__setRpc(async n => ({ data: n === 'tareas_taller' ? TAREAS : null, error: null }))
  s.abrirPanel('t07')
  chk('con gestionar, tocar la barra abre el panel', s.estado.diag.panel?.id === 't07')
  s.estado.diag.panel.hasta = '2026-10-01'
  await s.accionDiagrama('act-guardar')
  const g = s.__llamadas.rpc.find(r => r[0] === 'guardar_tarea_taller')
  chk('guardar_tarea_taller con el id y solo lo que cambió', g && g[1].p_id === 't07' && JSON.stringify(g[1].p_datos) === '{"fecha_fin":"2026-10-01"}', JSON.stringify(g))
  s.abrirPanel('t07')
  s.__llamadas.rpc.length = 0
  await s.accionDiagrama('act-guardar')
  chk('sin cambios, guardar no llama a la base', !s.__llamadas.rpc.some(r => r[0] === 'guardar_tarea_taller'))
  s.abrirPanel('t07')
  s.estado.diag.panel.titulo = ''
  await s.accionDiagrama('act-guardar')
  chk('lo que falta se dice en el panel', /nombre/.test(s.estado.diag.panel.error))
  s.abrirPanel('t07')
  await s.accionDiagrama('act-eliminar')
  chk('eliminar pide confirmar', s.estado.diag.panel.confirmarEliminar === true && !s.__llamadas.rpc.some(r => r[0] === 'mover_tarea_taller'))
  s.__setRpc(async n => n === 'mover_tarea_taller' ? { data: null, error: { message: 'La actividad ya tiene horas cargadas.' } } : { data: [], error: null })
  await s.accionDiagrama('act-eliminar-si')
  const m = s.__llamadas.rpc.find(r => r[0] === 'mover_tarea_taller')
  chk('eliminar = mover_tarea_taller a "cancelada"', m && m[1].p_id === 't07' && m[1].p_estado === 'cancelada')
  chk('el error de la base, tal cual, en el panel', s.estado.diag.panel?.error === 'La actividad ya tiene horas cargadas.')

  // Horas y avance desde "mis actividades".
  const c = nuevo({ tareas: ['ver', 'cargar'], yo: 'emp-edgar' })
  c.__el('tl-modal'); c.__el('tl-diagrama'); c.estado.diag.tareas = TAREAS
  c.__setRpc(async n => ({ data: n === 'tareas_taller' ? TAREAS : null, error: null }))
  await c.accionDiagrama('mia-horas', { dataset: { tarea: 't01' } })
  chk('"Cargar horas" abre su ventana con hoy', c.estado.modal?.tipo === 'horas-tarea' && c.estado.modal.tareaId === 't01')
  Object.assign(c.estado.modal, { horas: 4, nota: '  soldé  ' })
  await c.accionModal('mia-horas-guardar')
  const ch = c.__llamadas.rpc.find(r => r[0] === 'cargar_horas_tarea')
  chk('cargar_horas_tarea con la actividad, el día, las horas y la nota', ch && ch[1].p_tarea_id === 't01' && ch[1].p_horas === 4 && ch[1].p_nota === 'soldé' && ch[1].p_fecha === c.hoyArgentina(), JSON.stringify(ch))
  await c.accionDiagrama('mia-avance', { dataset: { tarea: 't01' } })
  chk('"Marcar avance" arranca en el avance que tiene', c.estado.modal?.tipo === 'avance' && c.estado.modal.avance === 20)
  c.estado.modal.avance = 150
  await c.accionModal('mia-avance-guardar')
  chk('avance fuera de 0 a 100 no se manda', /0 a 100/.test(c.estado.modal.error) && !c.__llamadas.rpc.some(r => r[0] === 'marcar_avance_tarea'))
  c.estado.modal.avance = 62.6
  await c.accionModal('mia-avance-guardar')
  const ma = c.__llamadas.rpc.find(r => r[0] === 'marcar_avance_tarea')
  chk('marcar_avance_tarea con el avance redondeado', ma && ma[1].p_id === 't01' && ma[1].p_avance_pct === 63)
  const v = nuevo({ tareas: ['ver'], yo: 'emp-edgar' }); v.__el('tl-modal'); v.estado.diag.tareas = TAREAS
  await v.accionDiagrama('mia-horas', { dataset: { tarea: 't01' } })
  chk('sin cargar, no se abre la ventana de horas', v.estado.modal === null)
})())

// ── 13. Qué pide a la base el diagrama, y el arrastre ────────────────────────
esperas.push((async () => {
  const g = nuevo({ tareas: ['ver', 'gestionar'], yo: 'emp-tomas' })
  g.__el('tl-burbuja-diagrama')
  g.estado.diag.desde = '2026-09-28'
  await g.cargarTareas()
  const [n, p] = g.__llamadas.rpc[0]
  chk('tareas_taller con p_hasta (el último día) y SIN p_desde (así vienen las atrasadas)', n === 'tareas_taller' && p.p_hasta === '2026-10-10' && !('p_desde' in p) && !('p_empleado_id' in p), JSON.stringify(p))
  const c = nuevo({ tareas: ['ver', 'cargar'], yo: 'emp-edgar' }); c.__el('tl-burbuja-diagrama')
  await c.cargarTareas()
  chk('solo cargar: pide solo lo suyo (p_empleado_id)', c.__llamadas.rpc[0][1].p_empleado_id === 'emp-edgar')
  const sin = nuevo({ tareas: ['ver'] }); sin.__el('tl-burbuja-diagrama')
  sin.__setRpc(async () => ({ data: null, error: null }))
  await sin.cargarTareas()
  chk('null de la base = sin permiso, dicho', /permiso/.test(sin.estado.diag.error))
  const b = nuevo({ tareas: ['ver'] }); const burbuja = b.__el('tl-burbuja-diagrama')
  b.__setRpc(async () => ({ data: TAREAS, error: null }))
  b.estado.diag.desde = '2026-09-28'
  await b.cargarTareas()
  chk('la burbuja de la pestaña dice cuántos problemas hay', burbuja.hidden === false && /^\d+$/.test(burbuja.textContent))

  chk('mover: corre la barra sin salirse', JSON.stringify(g.nuevasColumnas('mover', 2, 4, 20, 12)) === '{"a":9,"b":11}' && JSON.stringify(g.nuevasColumnas('mover', 2, 4, -9, 12)) === '{"a":0,"b":2}')
  chk('estirar: solo el fin, nunca antes del inicio', JSON.stringify(g.nuevasColumnas('estirar', 2, 4, 3, 12)) === '{"a":2,"b":7}' && JSON.stringify(g.nuevasColumnas('estirar', 2, 4, -9, 12)) === '{"a":2,"b":2}')
  // Un arrastre de verdad, con días de 100 px.
  const dias = g.diasVisibles('2026-09-28', 2)
  g.estado.diag.dias = dias
  g.estado.diag.tareas = TAREAS
  g.estado.diag.posiciones = new Map([['t03', { a: 4, b: 9 }]])
  g.document.querySelectorAll = () => dias.map((d, i) => ({ getBoundingClientRect: () => ({ left: i * 100 }) }))
  g.__el('tl-diagrama')
  g.__setRpc(async n => ({ data: n === 'tareas_taller' ? TAREAS : null, error: null }))
  const barra = { dataset: { tarea: 't03' }, style: {}, classList: { add() {} }, setPointerCapture() {} }
  const ev = (x, borde = false) => ({ button: 0, clientX: x, pointerId: 1, target: { closest: sel => sel === '.tl-barra-g' ? barra : (sel === '[data-borde]' && borde ? {} : null) } })
  g.__llamadas.rpc.length = 0
  g.empezarArrastre(ev(450)); g.moverArrastre(ev(650)); await g.terminarArrastre()
  const mv = g.__llamadas.rpc.find(r => r[0] === 'guardar_tarea_taller')
  chk('arrastrar dos días: manda solo el nuevo inicio', mv && JSON.stringify(mv[1].p_datos) === `{"fecha_inicio":"${dias[6]}"}`, JSON.stringify(mv))
  g.__llamadas.rpc.length = 0
  g.empezarArrastre(ev(950, true)); g.moverArrastre(ev(1150, true)); await g.terminarArrastre()
  const es = g.__llamadas.rpc.find(r => r[0] === 'guardar_tarea_taller')
  chk('estirar desde el borde: el mismo inicio y el nuevo fin', es && es[1].p_datos.fecha_inicio === '2026-10-02' && es[1].p_datos.fecha_fin === dias[11], JSON.stringify(es))
  const c2 = nuevo({ tareas: ['ver', 'cargar'] }); c2.__el('tl-diagrama')
  c2.estado.diag.dias = dias; c2.estado.diag.tareas = TAREAS; c2.estado.diag.posiciones = new Map([['t03', { a: 4, b: 9 }]])
  c2.document.querySelectorAll = g.document.querySelectorAll
  c2.empezarArrastre(ev(450)); c2.moverArrastre(ev(850)); await c2.terminarArrastre()
  chk('sin gestionar, arrastrar no mueve nada', !c2.__llamadas.rpc.some(r => r[0] === 'guardar_tarea_taller'))
})())

// ── 14. HTML malicioso en cada render ────────────────────────────────────────
{
  const s = nuevo({ tareas: ['ver', 'cargar', 'gestionar', 'precios'], yo: 'e-x' })
  const m = marca
  const r = resumen({
    nombre: m('nombre'), descripcion: m('descripcion'), ubicacion: m('ubicacion'), observaciones: m('observaciones'), responsable: m('responsable'),
    estado: m('estado'), categoria: m('categoria'), fabrica_destino: null,
    cliente: { id: m('cliente_id'), nombre: m('cliente'), razon_social: m('razon') },
    gastos: [{ fecha: '2026-09-10', descripcion: m('gasto'), razon_social: m('gasto_rs'), importe: 1 }],
    horas_detalle: [{ id: m('horas_id'), fecha: '2026-09-11', persona: m('persona'), horas: 1, tarea: m('tarea') }],
    notas: [{ texto: m('nota'), autor: m('autor'), fecha: '2026-09-02T12:00:00Z' }],
    archivos: [{ id: m('archivo_id'), tipo: m('tipo'), nombre: m('archivo'), ruta: 'p1/x', fecha: '2026-09-03T12:00:00Z' }],
  })
  const ctx = CTX({ precios: true, personas: [{ id: m('persona_id'), nombre: m('persona_nombre') }] })
  s.estado.personas = ctx.personas
  s.estado.ficha = FICHA(r)
  const interno = resumen({ destino: 'interno', cliente: null, fabrica_destino: m('fabrica') })
  const tarea = { id: m('tarea_id'), titulo: m('tarea_titulo'), nombre_corto: m('tarea_corto'), proyecto_id: m('tarea_proy'), proyecto: m('tarea_proyecto'),
    fecha_inicio: HOY, dias: 2, horas_estimadas: 8, avance_pct: 10, personas: [{ id: m('tarea_persona_id'), nombre: m('tarea_persona') }] }
  const tareaUno = { ...tarea, id: 'u1', dias: 1, titulo: m('titulo_uno'), nombre_corto: m('corto_uno') }
  const atrasada = { ...tarea, id: 'u2', fecha_inicio: '2026-09-20', atrasada: true, titulo: m('titulo_atrasada'), personas: [{ id: 'q', nombre: m('persona_atrasada') }] }
  const tareas = [tarea, tareaUno, atrasada, { ...tarea, id: 'u3', personas: tarea.personas }]
  s.estado.proyectos = [{ id: m('tarea_proy'), nombre: m('panel_proyecto'), estado: m('p_estado_diag'), atrasado: true, fecha_entrega_prometida: '2026-09-01' }]
  const dctx = { ...s.contextoDiagrama(), hoy: HOY, dias: s.diasVisibles(HOY, 2), personas: [{ id: m('fila_id'), nombre: m('fila_nombre') }], yo: m('tarea_persona_id') }
  dctx.cols = s.columnasCss(dctx.dias, dctx.ancho)
  dctx.tareas = tareas
  const panel = { ...s.panelDeTarea(tarea), error: m('error_panel'), original: s.panelDeTarea(tarea) }
  const htmls = [
    fichaEntera(s, r, ctx),
    s.htmlFicha(FICHA(r, { tab: 'notas', notaBorrador: m('borrador'), errorNota: m('error_nota'), notaFoto: { name: m('nota_foto') } }), ctx),
    s.htmlFicha(FICHA(r, { tab: 'archivos', subir: true, errorArchivo: m('error_archivo'), autores: new Map([[m('archivo_id'), m('autor_archivo')]]) }), ctx),
    s.htmlFicha(FICHA(r, { tab: 'archivos', archivos: { filtro: 'todos', busca: m('busca') } }), ctx),
    s.htmlFicha(FICHA(interno), ctx),
    s.htmlFicha({ ...FICHA(null), error: m('error_ficha') }, ctx),
    s.htmlTarjetaProyecto({ id: m('p_id'), nombre: m('p_nombre'), destino: 'externo', categoria: m('p_cat'), estado: m('p_estado'), cliente: m('p_cliente'), fecha_entrega_prometida: '2026-01-01', costo_total: 1, presupuesto_costo: 2, moneda: m('p_moneda') }, { precios: true, resumenes: new Map() }),
    s.htmlTarjetaProyecto({ id: 'x', nombre: 'n', destino: 'interno', fabrica_destino: m('p_fabrica'), estado: 'aprobado' }, { precios: true, resumenes: new Map([['x', { facturado: 1 }]]) }),
    s.htmlAvisoLista(m('error_lista')),
    s.htmlModalVenta({ tipo: 'facturar', clase: 'avance', importe: 1, concepto: m('concepto'), error: m('error_venta') }, r),
    s.htmlModalVenta({ tipo: 'fabrica', importe: 1, concepto: 'c', error: null }, interno),
    s.htmlModalHoras({ proyecto: m('horas_proyecto'), personaId: 'x', fecha: m('fecha_horas'), tarea: m('tarea_modal'), error: m('error_horas') }, ctx.personas),
    s.htmlModalAnular({ texto: m('texto_anular'), error: m('error_anular') }),
    s.htmlModalHorasTarea({ titulo: m('mia_titulo'), proyecto: m('mia_proyecto'), fecha: m('mia_fecha'), nota: m('mia_nota'), error: m('error_mia') }),
    s.htmlModalAvance({ titulo: m('avance_titulo'), avance: 10, error: m('error_avance') }),
    s.htmlValorHora({ lista: [], error: m('error_hora') }),
    s.htmlValorHora({ lista: [{ valor: 1, vigente_desde: '2026-01-01', cargado_por: 'e1' }], error: null }, { precios: true, error: m('error_guardar_hora'), nombres: new Map([['e1', m('lo_cambio')]]) }),
    s.htmlDiagrama({ ...s.estado.diag, tareas, error: null, panel: null }, dctx),
    s.htmlDiagrama({ ...s.estado.diag, tareas, error: null, panel: null }, { ...dctx, agrupar: 'proyecto' }),
    s.htmlDiagrama({ ...s.estado.diag, tareas, error: null, panel }, { ...dctx, panel, personasPanel: [{ id: m('panel_persona_id'), nombre: m('panel_persona') }, { id: m('tarea_persona_id'), nombre: m('otra_panel') }] }),
    s.htmlDiagrama({ ...s.estado.diag, error: m('error_diagrama') }, dctx),
    s.htmlDiagrama({ ...s.estado.diag, tareas: [], error: null, panel: null }, { ...dctx, personas: [{ id: 'z1', nombre: '<i zeta' }] }),
  ]
  const todo = htmls.join('\n')
  // Las iniciales del círculo y el nombre de pila del aviso de choque salen de
  // un PEDAZO del nombre: la marca entera no aparece, pero el pedazo sí.
  chk('escapa las iniciales del círculo de la persona', todo.includes('>&lt;Z</span>') && !todo.includes('><Z</span>'))
  const htmlPanel = htmls.find(h => h.includes('tl-panel-act')) || ''
  chk('el panel de la actividad se dibujó', htmlPanel.length > 0)
  chk('escapa el nombre de pila del aviso de choque del panel', htmlPanel.includes('&quot;&gt;&lt;b tiene dos cosas') && !htmlPanel.includes('"><b tiene dos cosas'))
  chk('ninguna marca maliciosa sale cruda', !/<b data-xss=/.test(todo), (todo.match(/.{0,40}<b data-xss="[^"]+".{0,10}/) || [])[0])
  for (const campo of ['nombre', 'descripcion', 'ubicacion', 'observaciones', 'responsable', 'estado', 'cliente', 'gasto', 'gasto_rs', 'persona', 'tarea', 'nota', 'autor',
    'archivo', 'archivo_id', 'horas_id', 'borrador', 'error_nota', 'error_archivo', 'busca', 'autor_archivo', 'fabrica', 'error_ficha', 'p_id', 'p_nombre', 'p_estado',
    'p_cliente', 'p_fabrica', 'error_lista', 'concepto', 'error_venta', 'horas_proyecto', 'persona_id', 'persona_nombre', 'fecha_horas', 'tarea_modal', 'error_horas',
    'texto_anular', 'error_anular', 'mia_titulo', 'mia_proyecto', 'mia_fecha', 'mia_nota', 'error_mia', 'avance_titulo', 'error_avance', 'error_hora', 'error_guardar_hora',
    'lo_cambio', 'tarea_id', 'tarea_titulo', 'tarea_proyecto', 'tarea_corto', 'fila_nombre', 'titulo_atrasada', 'error_panel', 'panel_persona', 'panel_persona_id', 'error_diagrama',
    'nota_foto', 'panel_proyecto', 'titulo_uno']) {
    chk(`escapa ${campo}`, todo.includes(escapada(campo)))
  }
}

fin()
