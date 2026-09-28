// Proyectos Taller (modulos/taller.html, 28/09/2026). Se EJECUTAN las
// funciones reales del módulo con un DOM falso y una base falsa:
//  - SIN taller:precios no hay NINGÚN precio de venta, facturado, cobrado ni
//    margen en lo que se dibuja (aunque el objeto de la base los traiga), ni
//    en el HTML estático; con el permiso, sí;
//  - el costo de las horas sin valor de hora dice "sin valor de hora", nunca $0;
//  - un dato ausente dice "—", nunca "$ 0,00";
//  - guardar_proyecto recibe SOLO las claves que cambiaron (precio_venta solo
//    con permiso); un proyecto nuevo, lo que no está vacío;
//  - facturar / cargar a la fábrica en dos pasos, con la RPC correcta;
//  - las horas: quién, día (no futuro), cuántas (0 a 24);
//  - la barra de unidad: Todas o Taller muestran todo; otra fábrica, los
//    trabajos internos para ella;
//  - las personas sin tablets ni fábrica de pruebas; la ruta del archivo segura;
//  - HTML malicioso en cada render.
//
//   ARCHIVO_TEST=<copia de modulos/taller.html>
'use strict'

const fs = require('fs')
const path = require('path')
const { extraerFn, extraerConst } = require('./extraer')
const { arnes, marca, escapada } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const RUTA = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos', 'taller.html')
const HTML = fs.readFileSync(RUTA, 'utf8')
console.log(`ARCHIVO ${RUTA} (${HTML.length} bytes)`)
const { chk, esperas, fin } = arnes()
const SCRIPT = HTML.slice(HTML.indexOf('<script type="module">'))

const FUNCIONES = ['esc', 'limpio', 'hoyArgentina', 'fechaCorta', 'momentoCorto', 'numero', 'importe', 'horasTexto', 'porcentaje',
  'tieneTarea', 'pasaUnidad', 'textoNotaUnidad', 'filtrarProyectos', 'avanceCosto',
  'htmlBarraCosto', 'htmlTarjetaProyecto', 'htmlLista', 'faltaValorHora', 'dato', 'cifra', 'htmlSeccionDatos', 'htmlSeccionPlata',
  'htmlPanelVenta', 'textoConfirmacionVenta', 'htmlSeccionGastos', 'htmlSeccionHoras', 'htmlPanelHoras', 'htmlSeccionNotas',
  'htmlSeccionArchivos', 'htmlFicha', 'contextoFicha', 'pintarFicha', 'cargarFicha', 'leerPanel', 'faltaVenta', 'faltaHoras',
  'accionFicha', 'nombreSeguro', 'rutaArchivo', 'tipoSugerido', 'personasElegibles', 'fabricasDestino', 'originalDe',
  'datosCambiados', 'valorVigente', 'htmlValorHora', 'pintarAccionesLista', 'leerLinkDirecto']
const CONSTANTES = ['puedeCargar', 'puedeGestionar', 'puedePrecios', 'ZONA_AR', 'ESTADOS', 'ETIQUETA_ESTADO', 'CATEGORIAS', 'ETIQUETA_CATEGORIA', 'TIPOS_ARCHIVO', 'ETIQUETA_TIPO', 'CERRADOS']

function construir() {
  let codigo = `
    ${fuenteNumeros()}
    var __els = new Map()
    function nuevoEl(id) { return { id, innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, dataset: {}, files: null,
      addEventListener() {}, setAttribute() {}, focus() {} } }
    var document = { getElementById(id) { return __els.get(id) ?? null }, querySelectorAll: () => [], createElement: () => nuevoEl('c') }
    function __el(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) }
    var window = { location: { search: '', pathname: '/x/modulos/taller.html' }, scrollTo() {}, open() {} }
    var console = { error() {}, warn() {}, log() {} }
    var __llamadas = { rpc: [], exitos: [], errores: [] }
    var __rpc = async () => ({ data: null, error: null })
    var supabase = { rpc: (n, p) => { __llamadas.rpc.push([n, p]); return __rpc(n, p) } }
    function mostrarExito(m) { __llamadas.exitos.push(m) } function mostrarError(m) { __llamadas.errores.push(m) }
    function abrirEditor() {} function subirArchivo() {}
    var estado = {
      miEmpleadoId: 'emp-yo', miRolApp: 'usuario', misTareas: new Set(), unidades: new Map(), tallerId: 'u-taller',
      fabrica: FABRICA_SIN_DATOS, unidadBarra: null, filtros: { estado: 'activos', destino: '', categoria: '' },
      ficha: null, turnoFicha: 0, personas: [],
    }
  `
  for (const c of CONSTANTES) codigo += extraerConst(SCRIPT, c)
  for (const f of FUNCIONES) codigo += extraerFn(SCRIPT, f) + '\n'
  codigo += `return { ${FUNCIONES.join(', ')}, estado, __els, __el, __llamadas, __setRpc(f) { __rpc = f } }`
  return new Function(codigo)()
}

const U = { taller: { id: 'u-taller', nombre: 'Taller' }, nuss: { id: 'u-nuss', nombre: 'Cucuruchos Nuss' }, dolce: { id: 'u-dolce', nombre: 'Dolce Pasta' }, robot: { id: 'u-robot', nombre: 'Pruebas (robot)' } }
function conUnidades(s) { s.estado.unidades = new Map(Object.values(U).map(u => [u.id, u])); return s }

// Un resumen como el de resumen_proyecto, CON los datos de venta (como si la
// base los mandara: la pantalla no debe mostrarlos sin permiso).
function resumen(extra = {}) {
  return {
    id: 'p1', nombre: 'Máquina barquillo 24', destino: 'externo', categoria: 'maquina', estado: 'en_curso',
    cliente: { id: 'c1', nombre: 'Carrizo', razon_social: 'Carrizo SRL' }, fabrica_destino: null,
    descripcion: 'desc', ubicacion: 'Rosario', observaciones: 'obs', responsable: 'Tomás',
    fecha_inicio: '2026-09-01', fecha_entrega_prometida: '2026-09-20', fecha_entrega_real: null, atrasado: true, moneda: 'ARS',
    presupuesto_costo: 1000000, horas_estimadas: 100, gastado: 600000, horas: 40, costo_horas: 400000, costo_total: 1000000,
    presupuesto_usado_pct: 100, horas_usadas_pct: 40,
    gastos: [{ fecha: '2026-09-10', descripcion: 'Chapa', razon_social: 'Hierros SA', importe: 600000, moneda: 'ARS' }],
    horas_detalle: [{ id: 'h1', fecha: '2026-09-11', persona: 'Edgar', horas: 8, tarea: 'Soldadura' }],
    notas: [{ texto: 'Arrancamos', autor: 'Tomás', fecha: '2026-09-02T12:00:00Z' }],
    archivos: [{ id: 'a1', tipo: 'plano', nombre: 'plano.pdf', ruta: 'p1/1-plano.pdf', fecha: '2026-09-03T12:00:00Z' }],
    precio_venta: 1800000, facturado: 900000, cobrado: 500000, margen: 800000, margen_pct: 44.4,
    ...extra,
  }
}
const CTX = (o = {}) => ({ precios: false, cargar: true, gestionar: true, personas: [], ...o })
const PALABRAS_VENTA = /precio de venta|facturado|cobrado|margen|facturar al cliente|cargar a la fábrica|1\.800\.000|900\.000|800\.000/i

// ── 1. El HTML estático no nombra precios ────────────────────────────────────
{
  const sinComentarios = HTML.slice(HTML.indexOf('<body')).replace(/<!--[\s\S]*?-->/g, '').replace(/<script type="module">[\s\S]*<\/script>/, '')
  chk('el HTML de la página (sin el script) no nombra precios, facturación ni márgenes', !/precio|factur|cobrad|margen/i.test(sinComentarios), (sinComentarios.match(/.{0,40}(precio|factur|cobrad|margen).{0,40}/i) || [])[0])
  chk('la página carga la barra lateral y la barra de unidad', HTML.includes('src="../js/barra-lateral.js"') && HTML.includes('src="../js/barra-unidad.js"'))
}

// ── 2. Sin permiso de precios: nada de venta ─────────────────────────────────
{
  const s = construir()
  const f = { r: resumen(), error: null, panel: null, enviando: false }
  const h = s.htmlFicha(f, CTX({ precios: false }))
  chk('sin precios: la ficha no muestra NADA de venta (aunque la base lo mandara)', !PALABRAS_VENTA.test(h), (h.match(PALABRAS_VENTA) || [])[0])
  chk('sin precios: sí muestra el costo', /Presupuesto de costo/.test(h) && /Costo total/.test(h) && /Gastado/.test(h))
  const hp = s.htmlFicha(f, CTX({ precios: true }))
  chk('con precios: muestra precio de venta, facturado, cobrado y margen', /Precio de venta/.test(hp) && /Facturado/.test(hp) && /Cobrado/.test(hp) && /Margen/.test(hp))
  chk('con precios, externo: botón Facturar al cliente', /data-accion="facturar"/.test(hp) && !/data-accion="fabrica"/.test(hp))
  const hi = s.htmlFicha({ ...f, r: resumen({ destino: 'interno', cliente: null, fabrica_destino: 'Cucuruchos Nuss', cobrado: null }) }, CTX({ precios: true }))
  chk('con precios, interno: Cargar a la fábrica y sin Cobrado', /data-accion="fabrica"/.test(hi) && !/Cobrado/.test(hi) && /Cargado a la fábrica/.test(hi))
  const sinCliente = s.htmlFicha({ ...f, r: resumen({ cliente: null }) }, CTX({ precios: true }))
  chk('sin cliente elegido, Facturar queda deshabilitado y se dice por qué', /data-accion="facturar" disabled/.test(sinCliente) && /elegí el cliente/.test(sinCliente))
  // La lista: proyectos_taller manda precio_venta null sin permiso, pero igual no se dibuja.
  const t = s.htmlTarjetaProyecto({ id: 'p1', nombre: 'X', destino: 'externo', categoria: 'maquina', estado: 'aprobado', cliente: 'C', precio_venta: 1800000, costo_total: 10, presupuesto_costo: 100, horas: 1 })
  chk('la tarjeta de la lista nunca dibuja el precio de venta', !PALABRAS_VENTA.test(t))
  // El botón del valor de la hora solo existe con permiso.
  s.__el('tl-btn-nuevo'); const extra = s.__el('tl-acciones-extra')
  s.estado.misTareas = new Set(['ver']); s.pintarAccionesLista()
  chk('sin precios: no existe el botón "Valor de la hora"', extra.innerHTML === '')
  s.estado.misTareas = new Set(['ver', 'precios']); s.pintarAccionesLista()
  chk('con precios: existe', /tl-btn-valor-hora/.test(extra.innerHTML))
  s.estado.misTareas = new Set(); s.estado.miRolApp = 'super_admin'; s.pintarAccionesLista()
  chk('un super_admin tiene precios (bypass, como _puede_taller)', /tl-btn-valor-hora/.test(extra.innerHTML))
}

// ── 3. El costo, sin valor de hora y sin datos ───────────────────────────────
{
  const s = construir()
  const r = resumen({ costo_horas: 0, costo_total: 600000 })
  chk('horas cargadas y costo de horas en 0: falta el valor de la hora', s.faltaValorHora(r) === true)
  chk('sin horas no falta nada', s.faltaValorHora(resumen({ horas: 0, costo_horas: 0 })) === false)
  chk('con costo de horas, no falta', s.faltaValorHora(resumen()) === false)
  const h = s.htmlSeccionPlata(r, CTX())
  chk('dice "sin valor de hora" y no $ 0,00 en el costo de las horas', /sin valor de hora/.test(h) && !/Costo de las horas<\/div><div class="tl-cifra__valor">\$ 0,00/.test(h))
  chk('y avisa que el costo total no incluye las horas', /No incluye las horas/.test(h))
  chk('un importe ausente es "—", nunca "$ 0,00"', s.importe(null) === '—' && s.importe('') === '—' && s.importe(undefined) === '—' && s.importe(NaN) === '—')
  chk('un cero de verdad es "$ 0,00"', s.importe(0) === '$ 0,00')
  chk('USD con US$', s.importe(10, 'USD') === 'US$ 10,00')
  const sinPres = s.htmlSeccionPlata(resumen({ presupuesto_costo: null, presupuesto_usado_pct: null }), CTX())
  chk('sin presupuesto: "—" y sin barra', /Presupuesto de costo<\/div><div class="tl-cifra__valor">—/.test(sinPres) && !/tl-barra"/.test(sinPres))
  const pasado = s.htmlSeccionPlata(resumen({ presupuesto_usado_pct: 130 }), CTX())
  chk('pasado del 100 %: la cifra y la barra en bordó', /tl-cifra tl-cifra--mal"><div class="tl-cifra__rotulo">Presupuesto usado/.test(pasado) && /tl-barra tl-barra--pasado/.test(pasado))
  chk('la barra no pasa del 100 % de ancho', /width:100%/.test(s.htmlBarraCosto(250)) && /width:0%/.test(s.htmlBarraCosto(-5)))
  chk('avanceCosto: null sin presupuesto', s.avanceCosto({ presupuesto_costo: null, costo_total: 5 }) === null && s.avanceCosto({ presupuesto_costo: 0, costo_total: 5 }) === null)
  chk('avanceCosto: el porcentaje', s.avanceCosto({ presupuesto_costo: 200, costo_total: 50 }) === 25)
  const tarjeta = s.htmlTarjetaProyecto({ id: 'p', nombre: 'n', destino: 'externo', estado: 'en_curso', costo_total: 150, presupuesto_costo: 100, atrasado: true, fecha_entrega_prometida: '2026-09-01' })
  chk('la tarjeta pasada del presupuesto va en bordó', /tl-barra--pasado/.test(tarjeta) && /tl-card__costo--pasado/.test(tarjeta))
  chk('la entrega atrasada va en bordó', /tl-card__entrega--atrasado/.test(tarjeta) && /atrasado/.test(tarjeta))
}

// ── 4. Solo lo que cambió ────────────────────────────────────────────────────
{
  const s = conUnidades(construir())
  s.estado.personas = [{ id: 'e-tomas', nombre: 'Tomás' }]
  const o = s.originalDe(resumen())
  chk('originalDe: el cliente por id y el responsable por nombre', o.cliente_id === 'c1' && o.responsable_id === 'e-tomas')
  const igual = s.datosCambiados(o, { ...o }, { precios: true })
  chk('sin cambios, no se manda nada', Object.keys(igual).length === 0, JSON.stringify(igual))
  const d = s.datosCambiados(o, { ...o, estado: 'terminado', ubicacion: '' }, { precios: true })
  chk('manda solo lo que cambió', JSON.stringify(Object.keys(d).sort()) === '["estado","ubicacion"]', JSON.stringify(d))
  chk('una clave vaciada viaja como "" (borra)', d.ubicacion === '')
  const conPrecio = s.datosCambiados(o, { ...o, precio_venta: 2000000 }, { precios: true })
  chk('con precios, el precio de venta que cambió viaja', conPrecio.precio_venta === 2000000)
  const sinPrecio = s.datosCambiados(o, { ...o, precio_venta: 2000000 }, { precios: false })
  chk('SIN precios, el precio de venta no viaja nunca', !('precio_venta' in sinPrecio))
  const aInterno = s.datosCambiados(o, { ...o, destino: 'interno', cliente_id: '', unidad_destino_id: 'u-nuss' }, {})
  chk('pasar a interno saca el cliente y pone la fábrica', aInterno.destino === 'interno' && aInterno.cliente_id === '' && aInterno.unidad_destino_id === 'u-nuss')
  const nuevo = s.datosCambiados(s.originalDe(null), { ...s.originalDe(null), nombre: 'Nuevo', presupuesto_costo: 500 }, { nuevo: true })
  chk('nuevo: solo lo que no está vacío (con los defaults)', nuevo.nombre === 'Nuevo' && nuevo.presupuesto_costo === 500 && !('ubicacion' in nuevo) && nuevo.destino === 'externo')
  const oi = s.originalDe(resumen({ destino: 'interno', cliente: null, fabrica_destino: 'Dolce Pasta' }))
  chk('originalDe: la fábrica destino por nombre', oi.unidad_destino_id === 'u-dolce')
}

// ── 5. Facturar y cargar a la fábrica, en dos pasos ──────────────────────────
esperas.push((async () => {
  const s = construir()
  s.estado.misTareas = new Set(['ver', 'precios'])
  s.__el('tl-ficha'); s.__el('tl-ficha-titulo')
  s.estado.ficha = { id: 'p1', r: resumen(), error: null, panel: null, enviando: false }
  await s.accionFicha('facturar')
  chk('abre el panel de facturar con la fecha de hoy', s.estado.ficha.panel?.tipo === 'facturar' && s.estado.ficha.panel.fecha === s.hoyArgentina())
  await s.accionFicha('venta-revisar')
  chk('sin importe no pasa a confirmar', !s.estado.ficha.panel.revisar && /importe/.test(s.estado.ficha.panel.error))
  Object.assign(s.estado.ficha.panel, { importe: 500000, concepto: 'Anticipo', fecha: s.hoyArgentina() })
  await s.accionFicha('venta-revisar')
  chk('con todo, pide confirmar', s.estado.ficha.panel.revisar === true)
  chk('la confirmación dice monto, cliente y concepto', /\$ 500\.000,00/.test(s.__els.get('tl-ficha').innerHTML) && /Carrizo/.test(s.__els.get('tl-ficha').innerHTML))
  chk('todavía no se llamó a ninguna RPC', s.__llamadas.rpc.length === 0)
  s.__setRpc(async () => ({ data: null, error: null }))
  await s.accionFicha('venta-confirmar')
  const [n, p] = s.__llamadas.rpc[0] || []
  chk('facturar llama a facturar_proyecto con importe, concepto y fecha', n === 'facturar_proyecto' && p.p_proyecto_id === 'p1' && p.p_importe === 500000 && p.p_concepto === 'Anticipo' && p.p_fecha === s.hoyArgentina(), JSON.stringify([n, p]))

  const s2 = construir()
  s2.estado.misTareas = new Set(['precios']); s2.__el('tl-ficha'); s2.__el('tl-ficha-titulo')
  s2.estado.ficha = { id: 'p2', r: resumen({ destino: 'interno', cliente: null, fabrica_destino: 'Cucuruchos Nuss' }), error: null, enviando: false,
    panel: { tipo: 'fabrica', importe: 100, concepto: 'Cinta', fecha: s2.hoyArgentina(), revisar: true } }
  s2.__setRpc(async () => ({ data: null, error: { message: 'Solo un trabajo interno con fábrica destino se carga a una fábrica.' } }))
  await s2.accionFicha('venta-confirmar')
  chk('cargar a la fábrica llama a cargar_proyecto_a_fabrica', s2.__llamadas.rpc[0]?.[0] === 'cargar_proyecto_a_fabrica')
  chk('el error de la base se muestra TAL CUAL, pegado al panel', s2.estado.ficha.panel?.error === 'Solo un trabajo interno con fábrica destino se carga a una fábrica.' && /Solo un trabajo interno/.test(s2.__els.get('tl-ficha').innerHTML))

  const s3 = construir()
  s3.estado.misTareas = new Set(['ver']); s3.__el('tl-ficha'); s3.__el('tl-ficha-titulo')
  s3.estado.ficha = { id: 'p1', r: resumen(), error: null, panel: null, enviando: false }
  await s3.accionFicha('facturar')
  chk('sin precios, "facturar" no abre nada', s3.estado.ficha.panel === null)
  s3.estado.ficha.panel = { tipo: 'facturar', importe: 1, concepto: 'xxx', fecha: s3.hoyArgentina(), revisar: true }
  await s3.accionFicha('venta-confirmar')
  chk('sin precios, confirmar no llama a la base', s3.__llamadas.rpc.length === 0)
})())

// ── 6. Horas ─────────────────────────────────────────────────────────────────
esperas.push((async () => {
  const s = construir()
  const hoy = s.hoyArgentina()
  chk('horas: pide quién', /quién/.test(s.faltaHoras({ personaId: '', horas: 2, fecha: hoy })))
  chk('horas: pide cuántas', /horas/.test(s.faltaHoras({ personaId: 'e', horas: null, fecha: hoy })))
  chk('horas: 0 no vale', !!s.faltaHoras({ personaId: 'e', horas: 0, fecha: hoy }))
  chk('horas: más de 24 no', /24/.test(s.faltaHoras({ personaId: 'e', horas: 25, fecha: hoy })))
  chk('horas: no a futuro', /futuro/.test(s.faltaHoras({ personaId: 'e', horas: 2, fecha: '2999-01-01' })))
  chk('horas: todo bien', s.faltaHoras({ personaId: 'e', horas: 8, fecha: hoy }) === null)
  s.estado.misTareas = new Set(['cargar']); s.__el('tl-ficha'); s.__el('tl-ficha-titulo')
  s.estado.ficha = { id: 'p1', r: resumen(), error: null, panel: null, enviando: false }
  await s.accionFicha('horas')
  chk('el panel arranca con quien carga y hoy', s.estado.ficha.panel.personaId === 'emp-yo' && s.estado.ficha.panel.fecha === hoy)
  Object.assign(s.estado.ficha.panel, { horas: 7.5, tarea: '  Armado  ' })
  await s.accionFicha('horas-guardar')
  const [n, p] = s.__llamadas.rpc[0] || []
  chk('cargar_horas_proyecto con persona, fecha, horas y tarea limpia', n === 'cargar_horas_proyecto' && p.p_empleado_id === 'emp-yo' && p.p_horas === 7.5 && p.p_tarea === 'Armado' && p.p_fecha === hoy, JSON.stringify(p))
  const h = s.htmlSeccionHoras(resumen(), CTX({ cargar: false, gestionar: false }))
  chk('sin cargar ni gestionar: ni cargar horas ni anular', !/data-accion="horas"/.test(h) && !/data-anular-horas/.test(h))
})())

// ── 7. La barra de unidad ────────────────────────────────────────────────────
{
  const s = conUnidades(construir())
  const lista = [
    { id: '1', destino: 'externo', estado: 'en_curso', cliente: 'C' },
    { id: '2', destino: 'interno', estado: 'aprobado', fabrica_destino: 'Cucuruchos Nuss' },
    { id: '3', destino: 'interno', estado: 'aprobado', fabrica_destino: 'Dolce Pasta' },
    { id: '4', destino: 'externo', estado: 'entregado' },
  ]
  const ids = (u, f) => s.filtrarProyectos(lista, { estado: 'todos', destino: '', categoria: '', ...f }, u).map(p => p.id).join(',')
  chk('Todas: todos', ids(null) === '1,2,3,4')
  chk('Taller: todos', ids('u-taller') === '1,2,3,4')
  chk('Nuss: solo los trabajos internos para Nuss', ids('u-nuss') === '2')
  chk('la nota lo dice con el nombre', /Cucuruchos Nuss/.test(s.textoNotaUnidad('u-nuss')) && s.textoNotaUnidad(null) === '' && s.textoNotaUnidad('u-taller') === '')
  chk('"Activos" saca entregados y cancelados', s.filtrarProyectos(lista, { estado: 'activos', destino: '', categoria: '' }, null).every(p => p.estado !== 'entregado'))
  chk('filtro por destino', ids(null, { destino: 'interno' }) === '2,3')
  chk('filtro por estado', ids(null, { estado: 'aprobado' }) === '2,3')
}

// ── 8. Personas, fábricas, archivos, valor de la hora, link ─────────────────
{
  const s = conUnidades(construir())
  const fab = { ok: true, unidades: new Set(['u-robot']), personas: new Set(['e-robot']), soyDePrueba: false }
  const ps = s.personasElegibles([
    { id: 'e1', nombre: 'Edgar', tipo: 'naaloo', activo: true }, { id: 'e2', nombre: 'Tablet', tipo: 'sistema', activo: true },
    { id: 'e3', nombre: 'Empresa', tipo: 'empresa', activo: false }, { id: 'e-robot', nombre: 'Robot', tipo: 'sistema', activo: true },
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
  const hv = s.htmlValorHora({ lista: vh, error: null })
  chk('valor de la hora: lo que rige hoy, lo futuro y la historia', /Hoy rige/.test(hv) && /\$ 20,00 la hora/.test(hv) && /más adelante/.test(hv) && /Historia/.test(hv))
  chk('sin ningún valor: "sin valor de hora"', /sin valor de hora/.test(s.htmlValorHora({ lista: [], error: null })))
  chk('link directo: solo un uuid', s.leerLinkDirecto('?proyecto=0b0e7d2a-1111-4222-8333-444455556666') === '0b0e7d2a-1111-4222-8333-444455556666' && s.leerLinkDirecto('?proyecto=javascript:1') === null)
  chk('fechas sin pasar por Date', s.fechaCorta('2026-09-28') === '28/09/2026' && s.fechaCorta(null) === '—')
  chk('hoy en Argentina, no en UTC', s.hoyArgentina(new Date('2026-09-28T02:00:00Z')) === '2026-09-27')
}

// ── 9. HTML malicioso en cada render ─────────────────────────────────────────
{
  const s = conUnidades(construir())
  const m = marca
  const r = resumen({
    nombre: m('nombre'), descripcion: m('descripcion'), ubicacion: m('ubicacion'), observaciones: m('observaciones'), responsable: m('responsable'),
    estado: m('estado'), categoria: m('categoria'), moneda: 'ARS',
    cliente: { id: m('cliente_id'), nombre: m('cliente'), razon_social: m('razon') },
    gastos: [{ fecha: '2026-09-10', descripcion: m('gasto'), razon_social: m('gasto_rs'), importe: 1 }],
    horas_detalle: [{ id: m('horas_id'), fecha: '2026-09-11', persona: m('persona'), horas: 1, tarea: m('tarea') }],
    notas: [{ texto: m('nota'), autor: m('autor'), fecha: '2026-09-02T12:00:00Z' }],
    archivos: [{ id: m('archivo_id'), tipo: m('tipo'), nombre: m('archivo'), ruta: 'p1/x', fecha: '2026-09-03T12:00:00Z' }],
  })
  const ctx = CTX({ precios: true, personas: [{ id: m('persona_id'), nombre: m('persona_nombre') }] })
  const htmls = [
    s.htmlFicha({ r, error: null, panel: null, enviando: false }, ctx),
    s.htmlFicha({ r, error: null, panel: { tipo: 'horas', personaId: 'x', fecha: '', tarea: m('tarea_panel'), error: m('error_horas') }, enviando: false }, ctx),
    s.htmlFicha({ r, error: null, panel: { tipo: 'facturar', importe: 1, concepto: m('concepto'), fecha: '', error: m('error_venta') }, enviando: false }, ctx),
    s.htmlFicha({ r, error: null, panel: { tipo: 'facturar', importe: 1, concepto: m('concepto_rev'), fecha: '2026-09-01', revisar: true, error: m('error_revisar') }, enviando: false }, ctx),
    s.htmlFicha({ r, error: null, panel: { tipo: 'fabrica', importe: 1, concepto: 'c', fecha: m('fecha_venta'), error: null }, enviando: false }, ctx),
    s.htmlFicha({ r, error: null, panel: { tipo: 'horas', personaId: 'x', fecha: m('fecha_horas'), tarea: '', error: null }, enviando: false }, ctx),
    s.htmlFicha({ r, error: null, panel: { tipo: 'anular-horas', horasId: 'h1', error: m('error_anular') }, enviando: false }, ctx),
    s.htmlFicha({ r, error: null, panel: { tipo: 'nota', error: m('error_nota') }, enviando: false }, ctx),
    s.htmlFicha({ r, error: null, panel: { tipo: 'archivo', error: m('error_archivo') }, enviando: false }, ctx),
    s.htmlFicha({ r: null, error: m('error_ficha') }, ctx),
    s.htmlTarjetaProyecto({ id: m('p_id'), nombre: m('p_nombre'), destino: 'externo', categoria: m('p_cat'), estado: m('p_estado'), cliente: m('p_cliente'), fecha_entrega_prometida: '2026-01-01', costo_total: 1, presupuesto_costo: 2 }),
    s.htmlTarjetaProyecto({ id: 'x', nombre: 'n', destino: 'interno', fabrica_destino: m('p_fabrica'), estado: 'aprobado' }),
    s.htmlLista(null, m('error_lista')),
    s.htmlValorHora({ lista: [], error: m('error_hora') }),
    s.htmlValorHora({ lista: [{ valor: 1, vigente_desde: '2026-01-01', cargado_en: m('cargado_en') }], error: null }, { error: m('error_guardar_hora') }),
  ]
  const todo = htmls.join('\n')
  chk('ninguna marca maliciosa sale cruda', !/<b data-xss=/.test(todo), (todo.match(/.{0,30}<b data-xss="[^"]+".{0,10}/) || [])[0])
  // El nombre del proyecto va al título con textContent (pintarFicha), no al HTML.
  for (const campo of ['descripcion', 'ubicacion', 'observaciones', 'responsable', 'cliente', 'gasto', 'persona', 'tarea', 'nota', 'autor',
    'archivo', 'archivo_id', 'horas_id', 'persona_nombre', 'tarea_panel', 'error_horas', 'concepto', 'error_venta', 'error_ficha', 'p_nombre',
    'p_cliente', 'p_fabrica', 'p_id', 'error_lista', 'error_hora', 'error_guardar_hora', 'error_revisar', 'fecha_venta', 'fecha_horas',
    'error_anular', 'error_nota', 'error_archivo']) {
    chk(`escapa ${campo}`, todo.includes(escapada(campo)))
  }
}

fin()
