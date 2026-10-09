// LA TABLA DE PRODUCCIÓN (modulos/produccion-gestion.html, 09/10/2026).
// Se EJECUTAN las funciones reales del archivo, con datos falsos:
//  - el TOTAL GENERAL no cambia al cambiar Filas / Columnas (las 49
//    combinaciones), y cada renglón y cada columna suman ese total;
//  - Máquina × Turno: la suma de las celdas es la suma de los renglones;
//  - los filtros (período, máquina, turno, producto) se aplican, también a
//    las tarjetas;
//  - los períodos de las tarjetas (Ayer, Esta semana del lunes, Este mes,
//    Mes pasado), en los bordes de mes y de año;
//  - el promedio por planilla cuenta planillas DISTINTAS (fecha, turno,
//    máquina), nunca la suma de la columna;
//  - UNA consulta por período (la de las tarjetas sirve para la tabla si el
//    período entra), el turno contra respuestas viejas, el error con
//    Reintentar, el tope de 400 días;
//  - un dato ausente es "—", nunca "0"; todo texto de la base escapado;
//  - lo que se recuerda (localStorage, y que si tira no rompe nada).
//
//   ARCHIVO_TEST=<copia de modulos/produccion-gestion.html>
'use strict'

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { arnes } = require('./circuito-comun')
const { extraerFn, extraerConst } = require('./extraer')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const RUTA = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos', 'produccion-gestion.html')
const src = fs.readFileSync(RUTA, 'utf8')
console.log(`ARCHIVO ${RUTA} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()

// El commit FIJO de antes de la tabla (nunca HEAD): lo que la tabla no tenía
// por qué tocar tiene que quedar igual.
const BASE = '26d4624'
const antes = execFileSync('git', ['show', `${BASE}:modulos/produccion-gestion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

const CONSTANTES = ['DIMENSIONES_TABLA', 'TURNOS_TABLA', 'MESES_TABLA', 'DIAS_TABLA', 'MAX_DIAS_TABLA', 'CLAVE_TABLA']
const FUNCIONES = ['esc', 'numeroInd', 'sumarDias', 'lunesDe', 'diasEntreInd', 'fechaCorta', 'fechaDelDia', 'leerPreferencia', 'guardarPreferencia',
  'esFechaTabla', 'normalizarResumen', 'periodosTarjetasTabla', 'rangoBaseTabla', 'errorPeriodoTabla', 'filtrarResumen', 'sumaUnidadesTabla',
  'textoDiaTabla', 'textoMesTabla', 'grupoTabla', 'armarTabla', 'promediosTabla', 'cambiarDimensionTabla', 'estadoInicialTabla', 'guardarTabla',
  'datosDeLaTabla', 'hayFiltrosTabla', 'unidadesTexto', 'rangoCortoTabla', 'htmlTarjetasTabla', 'opcionesFiltroTabla', 'htmlOpcionesTabla',
  'htmlDimensionesTabla', 'textoDimension', 'celdaTabla', 'htmlTablaProduccion', 'htmlPromediosTabla', 'htmlCuerpoTabla', 'pintarTabla',
  'leerResumen', 'cargarTabla', 'mostrarTabla', 'cambiarUnidadTabla', 'ponerPeriodoTabla', 'elegirPeriodoTabla', 'alCambiarFechasTabla',
  'cambiarFiltroTabla', 'elegirDimensionTabla']

function construir() {
  const partes = []
  for (const c of CONSTANTES) { const t = extraerConst(src, c); if (!t) throw new Error('falta la constante ' + c); partes.push(t.replace(/^const /, 'var ')) }
  for (const f of FUNCIONES) { const t = extraerFn(src, f); if (!t) throw new Error('falta la función ' + f); partes.push(t) }
  const codigo = `
    ${fuenteNumeros()}
    var ZONA_AR = 'America/Argentina/Buenos_Aires'
    var console = { error() {}, log() {}, warn() {} }
    var __hoy = '2026-10-09'
    function hoyArgentina() { return __hoy }
    var estado = { unidadId: 'u-1', unidadBarra: null, unidades: new Map([['u-1', 'Nuss']]), vista: null }
    var __errores = []
    function mostrarError(t) { __errores.push(t) }
    function sinUnidadPorBarra() { return false }
    function textoSinProduccionEnBarra() { return 'sin produccion' }
    function mostrarVista(id) { estado.vista = id }
    function abrirMenu() {}
    var __guardado = {}
    var __storageRoto = false
    var localStorage = {
      getItem(k) { if (__storageRoto) throw new Error('roto'); return Object.prototype.hasOwnProperty.call(__guardado, k) ? __guardado[k] : null },
      setItem(k, v) { if (__storageRoto) throw new Error('roto'); __guardado[k] = String(v) },
      removeItem(k) { if (__storageRoto) throw new Error('roto'); delete __guardado[k] },
    }
    var __elementos = {}
    function el(id) { return __elementos[id] || (__elementos[id] = { id, value: '', hidden: false, innerHTML: '' }) }
    var document = { getElementById: el, querySelector: () => null }
    var __llamadas = []
    var __respuesta = null
    var supabase = { rpc(nombre, params) {
      const llamada = { nombre, params }
      __llamadas.push(llamada)
      const r = typeof __respuesta === 'function' ? __respuesta(params, llamada) : __respuesta
      return Promise.resolve(r)
    } }
    ${partes.join('\n')}
    let turnoTabla = 0
    return { ${[...CONSTANTES, ...FUNCIONES].join(', ')}, formatearNumeroAr, estado, __elementos, supabase,
      get llamadas() { return __llamadas }, set respuesta(v) { __respuesta = v }, set hoy(v) { __hoy = v },
      get guardado() { return __guardado }, set storageRoto(v) { __storageRoto = v }, get errores() { return __errores } }
  `
  return new Function(codigo)()
}
const S = construir()

// ── Datos falsos: dos máquinas, tres turnos, dos productos, varios días ──
let n = 0
function r(o = {}) {
  n++
  return {
    fecha: o.fecha ?? '2026-10-01', turno: o.turno ?? 'Mañana', maquina_id: o.maquina_id ?? 'm1', maquina: o.maquina ?? (o.maquina_id === 'm2' ? 'Máquina 2' : 'Máquina 1'),
    producto: o.producto ?? 'Mini', presentacion_id: o.presentacion_id ?? 'pr1', presentacion: o.presentacion ?? 'Caja x 600',
    planillas: 'planillas' in o ? o.planillas : 1, cajas: o.cajas ?? 10, unidades: 'unidades' in o ? o.unidades : 1000 + n * 10,
  }
}
const DATOS = []
for (const fecha of ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-05', '2026-10-08']) {
  for (const maq of ['m1', 'm2']) {
    for (const turno of ['Mañana', 'Tarde', 'Noche']) {
      if (maq === 'm2' && turno === 'Noche') continue
      DATOS.push(r({ fecha, maquina_id: maq, turno }))
      if (maq === 'm1') DATOS.push(r({ fecha, maquina_id: maq, turno, producto: 'Cono dulce', presentacion_id: 'pr2', presentacion: 'Caja x 100' }))
    }
  }
}
const sumaDe = (filas) => filas.reduce((a, f) => a + (f.unidades ?? 0), 0)
const TOTAL = sumaDe(DATOS)

// ── Normalizar lo que devuelve la RPC ───────────────────────────────────
{
  const norm = S.normalizarResumen([
    { fecha: '2026-10-01', turno: 'Mañana', maquina_id: 'm1', maquina: 'Máquina 1', producto: 'Mini', presentacion_id: 'p', presentacion: 'x', planillas: '2', cajas: '15', unidades: '9000' },
    { fecha: '2026-10-02T00:00:00', turno: null, maquina_id: null, maquina: null, producto: null, presentacion_id: null, presentacion: null, planillas: 1, cajas: 3, unidades: 100 },
    { fecha: null, unidades: 5 }, null, { fecha: 'mañana', unidades: 5 },
    { fecha: '2026-10-03', unidades: null, planillas: '', cajas: undefined },
  ])
  chk('los bigint que llegan como texto se convierten', norm[0].unidades === 9000 && norm[0].planillas === 2 && norm[0].cajas === 15, JSON.stringify(norm[0]))
  chk('la fecha queda aaaa-mm-dd', norm[1].fecha === '2026-10-02')
  chk('los textos null quedan vacíos (nunca "null")', norm[1].turno === '' && norm[1].maquina === '' && norm[1].producto === '')
  chk('una fila sin fecha válida no se cuenta', norm.length === 3, norm.length)
  chk('unas unidades que faltan quedan null (nunca 0)', norm[2].unidades === null && norm[2].planillas === null)
  chk('sin datos: una lista vacía', S.normalizarResumen(null).length === 0 && S.normalizarResumen({}).length === 0)
}

// ── Los períodos de las tarjetas ────────────────────────────────────────
{
  const p = S.periodosTarjetasTabla('2026-10-09') // viernes
  const de = (k) => p.find(x => x.clave === k)
  chk('cuatro tarjetas en orden', p.map(x => x.clave).join() === 'ayer,semana,mes,mes_pasado' && p.map(x => x.titulo).join() === 'Ayer,Esta semana,Este mes,Mes pasado')
  chk('Ayer', de('ayer').desde === '2026-10-08' && de('ayer').hasta === '2026-10-08')
  chk('Esta semana: del lunes a hoy', de('semana').desde === '2026-10-05' && de('semana').hasta === '2026-10-09', JSON.stringify(de('semana')))
  chk('Este mes: del 1º a hoy', de('mes').desde === '2026-10-01' && de('mes').hasta === '2026-10-09')
  chk('Mes pasado: entero', de('mes_pasado').desde === '2026-09-01' && de('mes_pasado').hasta === '2026-09-30')
  const d = S.periodosTarjetasTabla('2026-03-01') // domingo, 1º de mes
  chk('un domingo: la semana empieza el lunes anterior', d[1].desde === '2026-02-23' && d[1].hasta === '2026-03-01', JSON.stringify(d[1]))
  chk('el 1º: ayer es del mes pasado y este mes es un solo día', d[0].desde === '2026-02-28' && d[2].desde === '2026-03-01' && d[2].hasta === '2026-03-01')
  chk('febrero entero como mes pasado', d[3].desde === '2026-02-01' && d[3].hasta === '2026-02-28')
  const e = S.periodosTarjetasTabla('2026-01-05') // lunes
  chk('un lunes: la semana es ese día', e[1].desde === '2026-01-05' && e[1].hasta === '2026-01-05')
  chk('en enero el mes pasado es diciembre del año anterior', e[3].desde === '2025-12-01' && e[3].hasta === '2025-12-31', JSON.stringify(e[3]))
  const rb = S.rangoBaseTabla('2026-10-09')
  chk('la consulta de las tarjetas va del 1º del mes pasado a hoy', rb.desde === '2026-09-01' && rb.hasta === '2026-10-09')
  for (const hoy of ['2026-10-09', '2026-03-01', '2026-01-05', '2026-05-31']) {
    const b = S.rangoBaseTabla(hoy)
    chk(`las cuatro tarjetas entran en la consulta base (${hoy})`, S.periodosTarjetasTabla(hoy).every(x => x.desde >= b.desde && x.hasta <= b.hasta))
  }
}

// ── El período: obligatorio y hasta 400 días ────────────────────────────
{
  chk('400 días se aceptan', S.errorPeriodoTabla('2025-09-04', '2026-10-09') === '')
  chk('401 días no', S.errorPeriodoTabla('2025-09-03', '2026-10-09') === 'El período no puede pasar de 400 días.', S.errorPeriodoTabla('2025-09-03', '2026-10-09'))
  chk('desde después de hasta', /antes/.test(S.errorPeriodoTabla('2026-10-09', '2026-10-01')))
  chk('las dos fechas son obligatorias', S.errorPeriodoTabla('', '2026-10-01') === 'Elegí las dos fechas.' && S.errorPeriodoTabla('2026-10-01', null) === 'Elegí las dos fechas.')
  chk('un solo día vale', S.errorPeriodoTabla('2026-10-01', '2026-10-01') === '')
}

// ── EL TOTAL NO CAMBIA CON FILAS / COLUMNAS (las 49 combinaciones) ─────
{
  const dims = S.DIMENSIONES_TABLA.map(d => d.clave)
  chk('siete dimensiones: Día, Semana, Mes, Máquina, Turno, Producto, Ninguna', dims.join() === 'dia,semana,mes,maquina,turno,producto,ninguna')
  let combinaciones = 0, malas = []
  for (const df of dims) {
    for (const dc of dims) {
      combinaciones++
      const t = S.armarTabla(DATOS, df, dc)
      let celdas = 0
      for (const m of t.celdas.values()) for (const v of m.values()) celdas += v ?? 0
      const porFila = [...t.totFila.values()].reduce((a, v) => a + (v ?? 0), 0)
      const porCol = [...t.totCol.values()].reduce((a, v) => a + (v ?? 0), 0)
      if (t.total !== TOTAL || celdas !== TOTAL || porFila !== TOTAL || porCol !== TOTAL) malas.push(`${df}×${dc}: ${t.total}/${celdas}/${porFila}/${porCol}`)
      // Cada renglón suma su total, cada columna el suyo.
      for (const f of t.filas) {
        const s = [...(t.celdas.get(f.clave) ?? new Map()).values()].reduce((a, v) => a + (v ?? 0), 0)
        if (s !== t.totFila.get(f.clave)) malas.push(`${df}×${dc}: renglón ${f.clave}`)
      }
      for (const c of t.cols) {
        let s = 0
        for (const m of t.celdas.values()) s += m.get(c.clave) ?? 0
        if (s !== t.totCol.get(c.clave)) malas.push(`${df}×${dc}: columna ${c.clave}`)
      }
    }
  }
  chk('49 combinaciones probadas', combinaciones === 49)
  chk('el total general es el mismo en TODAS las combinaciones, y renglones y columnas lo suman', malas.length === 0, malas.slice(0, 5).join(' | '))
  // Lo mismo en el HTML: el total de la esquina de abajo.
  const tot = S.formatearNumeroAr(TOTAL, { decimales: 0 })
  const malasHtml = []
  for (const df of dims) for (const dc of dims) {
    const h = S.htmlTablaProduccion(S.armarTabla(DATOS, df, dc), df, dc)
    const pie = h.slice(h.indexOf('<tfoot>'))
    if (!pie.includes(`<td class="pt-total">${tot}</td>`)) malasHtml.push(`${df}×${dc}`)
  }
  chk('el HTML dice el mismo total en todas las combinaciones', malasHtml.length === 0, malasHtml.join())
}

// ── Máquina × Turno ─────────────────────────────────────────────────────
{
  const t = S.armarTabla(DATOS, 'maquina', 'turno')
  chk('renglones: las dos máquinas, en orden', t.filas.map(f => f.etiqueta).join() === 'Máquina 1,Máquina 2')
  chk('columnas: los turnos Mañana · Tarde · Noche (no alfabético)', t.cols.map(c => c.etiqueta).join() === 'Mañana,Tarde,Noche', t.cols.map(c => c.etiqueta).join())
  let celdas = 0
  for (const m of t.celdas.values()) for (const v of m.values()) celdas += v ?? 0
  chk('la suma de las celdas es la suma de los renglones de datos', celdas === TOTAL)
  const esperado = sumaDe(DATOS.filter(f => f.maquina_id === 'm1' && f.turno === 'Tarde'))
  chk('una celda: Máquina 1 · Tarde', t.celdas.get('m1').get('Tarde') === esperado, `${t.celdas.get('m1').get('Tarde')} vs ${esperado}`)
  chk('Máquina 2 no tiene turno Noche: la celda no existe', !t.celdas.get('m2').has('Noche'))
  const h = S.htmlTablaProduccion(t, 'maquina', 'turno')
  const renglon2 = h.slice(h.indexOf('Máquina 2</th>'), h.indexOf('</tr>', h.indexOf('Máquina 2</th>')))
  chk('… y se dibuja "—", nunca "0"', /<td class="pt-sin">—<\/td>/.test(renglon2) && !/>0<\/td>/.test(renglon2), renglon2)
  chk('la esquina dice "Máquina / Turno"', h.includes('<th scope="col" class="pt-esquina">Máquina / Turno</th>'))
  chk('la primera columna son encabezados de renglón (fijos)', /<th scope="row" title="Máquina 1">Máquina 1<\/th>/.test(h))
  chk('punto de miles', h.includes(S.formatearNumeroAr(TOTAL, { decimales: 0 })) && /\d\.\d{3}/.test(S.formatearNumeroAr(TOTAL, { decimales: 0 })))
}

// ── Día, semana, mes ────────────────────────────────────────────────────
{
  const t = S.armarTabla(DATOS, 'dia', 'ninguna')
  chk('un día sin producción no aparece (sábados, domingos, el 06 y el 07)', t.filas.length === 7 && !t.filas.some(f => ['2026-10-03', '2026-10-04', '2026-10-06', '2026-10-07'].includes(f.clave)))
  chk('los días de la más vieja a la más nueva', t.filas.map(f => f.clave).join() === '2026-09-28,2026-09-29,2026-09-30,2026-10-01,2026-10-02,2026-10-05,2026-10-08')
  chk('la etiqueta del día con el día de la semana', t.filas[0].etiqueta === 'lun 28/09/2026', t.filas[0].etiqueta)
  const s = S.armarTabla(DATOS, 'semana', 'ninguna')
  chk('las semanas empiezan el lunes', s.filas.map(f => f.clave).join() === '2026-09-28,2026-10-05', s.filas.map(f => f.clave).join())
  chk('"Semana del 28/09"', s.filas[0].etiqueta === 'Semana del 28/09')
  const m = S.armarTabla(DATOS, 'mes', 'ninguna')
  chk('los meses, con su nombre', m.filas.map(f => f.etiqueta).join() === 'Septiembre 2026,Octubre 2026', m.filas.map(f => f.etiqueta).join())
  const sep = sumaDe(DATOS.filter(f => f.fecha < '2026-10-01'))
  chk('el total de septiembre', m.totFila.get('2026-09') === sep)
  const h = S.htmlTablaProduccion(t, 'dia', 'ninguna')
  chk('con Columnas = Ninguna solo queda la columna Total', (h.match(/<th scope="col"/g) || []).length === 2 && h.includes('<th scope="col" class="pt-esquina">Día</th>'))
  const h2 = S.htmlTablaProduccion(S.armarTabla(DATOS, 'ninguna', 'ninguna'), 'ninguna', 'ninguna')
  chk('con las dos en Ninguna: solo el total', !h2.includes('<tbody><tr>') && h2.includes(`<td class="pt-total">${S.formatearNumeroAr(TOTAL, { decimales: 0 })}</td>`))
  const h3 = S.htmlTablaProduccion(S.armarTabla(DATOS, 'ninguna', 'maquina'), 'ninguna', 'maquina')
  chk('con Filas = Ninguna: una columna por máquina y el renglón de Total', h3.includes('>Máquina 1</th>') && h3.includes('>Máquina 2</th>') && !h3.includes('<tbody><tr>'))
}

// ── Unidades ausentes ───────────────────────────────────────────────────
{
  const conNull = [r({ fecha: '2026-10-01', unidades: null }), r({ fecha: '2026-10-02', unidades: 500 })]
  const t = S.armarTabla(conNull, 'dia', 'ninguna')
  chk('un día con solo unidades desconocidas: "—", no 0', t.totFila.get('2026-10-01') === null && t.total === 500)
  chk('sumaUnidadesTabla sin nada conocido es null', S.sumaUnidadesTabla([r({ unidades: null })]) === null && S.sumaUnidadesTabla([]) === null)
  chk('celdaTabla(null) es "—"', S.celdaTabla(null) === '<td class="pt-sin">—</td>' && S.celdaTabla(undefined, 'pt-total') === '<td class="pt-sin pt-total">—</td>')
  chk('un 0 de verdad sí es 0', S.celdaTabla(0) === '<td>0</td>')
  chk('unidadesTexto(null) es "—"', S.unidadesTexto(null) === '—' && S.unidadesTexto(12345) === '12.345 u')
}

// ── Los filtros ─────────────────────────────────────────────────────────
{
  const f1 = S.filtrarResumen(DATOS, { maquina: 'm2' })
  chk('máquina', f1.length > 0 && f1.every(f => f.maquina_id === 'm2'))
  const f2 = S.filtrarResumen(DATOS, { turno: 'Noche' })
  chk('turno', f2.length > 0 && f2.every(f => f.turno === 'Noche'))
  const f3 = S.filtrarResumen(DATOS, { producto: 'Cono dulce' })
  chk('producto', f3.length > 0 && f3.every(f => f.producto === 'Cono dulce'))
  const f4 = S.filtrarResumen(DATOS, { desde: '2026-09-30', hasta: '2026-10-01' })
  chk('período: desde y hasta incluidos', f4.length > 0 && f4.every(f => f.fecha >= '2026-09-30' && f.fecha <= '2026-10-01') && f4.some(f => f.fecha === '2026-09-30') && f4.some(f => f.fecha === '2026-10-01'))
  const f5 = S.filtrarResumen(DATOS, { maquina: 'm1', turno: 'Mañana', producto: 'Mini' })
  chk('los filtros se combinan', f5.length === 7 && f5.every(f => f.maquina_id === 'm1' && f.turno === 'Mañana' && f.producto === 'Mini'), f5.length)
  chk('sin filtros, todo', S.filtrarResumen(DATOS, {}).length === DATOS.length && S.filtrarResumen(DATOS).length === DATOS.length)
  const op = S.opcionesFiltroTabla(DATOS, 'turno', '')
  chk('las opciones de turno salen de los datos, en orden', op.map(o => o.v).join() === 'Mañana,Tarde,Noche')
  const opM = S.opcionesFiltroTabla(DATOS, 'maquina', 'm9', 'Máquina vieja')
  chk('una máquina elegida que no está en los datos se conserva con su nombre', opM.some(o => o.v === 'm9' && o.t === 'Máquina vieja') && opM.some(o => o.v === 'm1' && o.t === 'Máquina 1'))
  const opP = S.opcionesFiltroTabla(DATOS, 'producto', '')
  chk('productos', opP.map(o => o.v).join() === 'Cono dulce,Mini')
  const html = S.htmlOpcionesTabla(op, 'Tarde', 'Todos')
  chk('la opción elegida va seleccionada y arranca con "Todos"', html.startsWith('<option value="">Todos</option>') && html.includes('<option value="Tarde" selected>'))
}

// ── EL PROMEDIO POR PLANILLA: planillas distintas ───────────────────────
{
  // Una planilla (Máquina 1, Mañana, 01/10) con DOS presentaciones: la
  // columna `planillas` dice 1 en cada una; sumarla daría 2.
  const una = [r({ fecha: '2026-10-01', unidades: 600, planillas: 1 }), r({ fecha: '2026-10-01', unidades: 400, planillas: 1, producto: 'Cono dulce', presentacion_id: 'pr2' })]
  const p = S.promediosTabla(una)
  chk('dos presentaciones de la misma planilla son UNA planilla', p.planillas === 1, p.planillas)
  chk('… y el promedio por planilla es el total', p.porPlanilla === 1000)
  const dos = [...una, r({ fecha: '2026-10-01', turno: 'Tarde', unidades: 1000 }), r({ fecha: '2026-10-02', maquina_id: 'm2', unidades: 500 })]
  const q = S.promediosTabla(dos)
  chk('tres planillas distintas (fecha, turno, máquina)', q.planillas === 3 && q.porPlanilla === 2500 / 3, `${q.planillas} ${q.porPlanilla}`)
  chk('promedio por día con producción: dos días', q.dias === 2 && q.porDia === 1250)
  const relanzada = [r({ fecha: '2026-10-01', unidades: 600, planillas: 2 }), r({ fecha: '2026-10-01', unidades: 400, planillas: 1, producto: 'Cono dulce' })]
  chk('una máquina relanzada con lote nuevo en el mismo turno (planillas = 2) cuenta dos', S.promediosTabla(relanzada).planillas === 2)
  chk('planillas sin dato cuenta una', S.promediosTabla([r({ planillas: null })]).planillas === 1)
  const vacio = S.promediosTabla([])
  chk('sin datos: los promedios son null (nunca 0)', vacio.porDia === null && vacio.porPlanilla === null)
  const h = S.htmlPromediosTabla(q)
  chk('el texto de los promedios', h.includes('Promedio por día con producción: <strong>1.250 u</strong>') && h.includes('por planilla: <strong>833 u</strong>'), h)
  const todo = S.promediosTabla(DATOS)
  chk('con los datos de prueba: 7 días y 35 planillas', todo.dias === 7 && todo.planillas === 35, `${todo.dias} ${todo.planillas}`)
}

// ── Filas y Columnas ────────────────────────────────────────────────────
{
  const a = S.cambiarDimensionTabla({ filas: 'dia', columnas: 'maquina' }, 'columnas', 'dia')
  chk('Columnas = lo que tiene Filas: se intercambian', a.filas === 'maquina' && a.columnas === 'dia')
  const b = S.cambiarDimensionTabla({ filas: 'dia', columnas: 'maquina' }, 'filas', 'turno')
  chk('elegir otra cosa no toca la otra', b.filas === 'turno' && b.columnas === 'maquina')
  const c = S.cambiarDimensionTabla({ filas: 'ninguna', columnas: 'maquina' }, 'columnas', 'ninguna')
  chk('Ninguna en las dos se puede', c.filas === 'ninguna' && c.columnas === 'ninguna')
  const d = S.cambiarDimensionTabla({ filas: 'dia', columnas: 'maquina' }, 'filas', 'cualquiera')
  chk('un valor desconocido no cambia nada', d.filas === 'dia' && d.columnas === 'maquina')
}

// ── Lo que se recuerda ──────────────────────────────────────────────────
{
  const def = S.estadoInicialTabla(null, '2026-10-09')
  chk('por defecto: Filas = Día, Columnas = Máquina, Este mes', def.filas === 'dia' && def.columnas === 'maquina' && def.periodoClave === 'mes' && def.desde === '2026-10-01' && def.hasta === '2026-10-09')
  chk('un JSON roto es como nada', S.estadoInicialTabla('{no', '2026-10-09').filas === 'dia')
  const g = S.estadoInicialTabla(JSON.stringify({ filas: 'producto', columnas: 'turno', maquina: 'm1', turno: 'Tarde', producto: 'Mini', periodoClave: 'semana', desde: '2020-01-01', hasta: '2020-01-02', unidadId: 'u-1' }), '2026-10-09')
  chk('se recuerdan filas, columnas y filtros', g.filas === 'producto' && g.columnas === 'turno' && g.maquina === 'm1' && g.turno === 'Tarde' && g.producto === 'Mini' && g.unidadId === 'u-1')
  chk('una tarjeta recordada se recalcula con el hoy nuevo', g.periodoClave === 'semana' && g.desde === '2026-10-05' && g.hasta === '2026-10-09')
  const f = S.estadoInicialTabla(JSON.stringify({ periodoClave: null, desde: '2026-08-01', hasta: '2026-08-15' }), '2026-10-09')
  chk('un período de fechas se recuerda tal cual', f.periodoClave === null && f.desde === '2026-08-01' && f.hasta === '2026-08-15')
  const mal = S.estadoInicialTabla(JSON.stringify({ desde: '2020-01-01', hasta: '2026-10-09' }), '2026-10-09')
  chk('un período recordado de más de 400 días vuelve a "Este mes"', mal.periodoClave === 'mes')
  const igual = S.estadoInicialTabla(JSON.stringify({ filas: 'maquina', columnas: 'maquina' }), '2026-10-09')
  chk('Filas y Columnas iguales recordadas: Columnas pasa a Ninguna', igual.filas === 'maquina' && igual.columnas === 'ninguna')
  const raras = S.estadoInicialTabla(JSON.stringify({ filas: 'xx', columnas: 3, maquina: 5 }), '2026-10-09')
  chk('valores raros vuelven al defecto', raras.filas === 'dia' && raras.columnas === 'maquina' && raras.maquina === '')
  S.guardarTabla({ ...g, base: { filas: [1] } })
  const guardado = JSON.parse(S.guardado[S.CLAVE_TABLA])
  chk('se guarda en localStorage, sin los datos', guardado.filas === 'producto' && guardado.periodoClave === 'semana' && !('base' in guardado))
  S.storageRoto = true
  let tiro = false
  try { S.guardarTabla(g); S.estadoInicialTabla(S.leerPreferencia(S.CLAVE_TABLA), '2026-10-09') } catch { tiro = true }
  S.storageRoto = false
  chk('sin localStorage no se rompe nada', !tiro)
}

// ── Las tarjetas y el escape ────────────────────────────────────────────
{
  const t = { ...S.estadoInicialTabla(null, '2026-10-09'), base: { unidadId: 'u-1', desde: '2026-09-01', hasta: '2026-10-09', filas: DATOS } }
  const h = S.htmlTarjetasTabla(t, '2026-10-09')
  const ayer = sumaDe(DATOS.filter(f => f.fecha === '2026-10-08'))
  chk('Ayer suma lo de ayer', h.includes(`${S.formatearNumeroAr(ayer, { decimales: 0 })} u`))
  const mesPasado = sumaDe(DATOS.filter(f => f.fecha >= '2026-09-01' && f.fecha <= '2026-09-30'))
  chk('Mes pasado suma septiembre', h.includes(`${S.formatearNumeroAr(mesPasado, { decimales: 0 })} u`))
  chk('Este mes es la tarjeta elegida', /data-tabla-periodo="mes" aria-pressed="true"/.test(h) && /data-tabla-periodo="ayer" aria-pressed="false"/.test(h))
  const filt = S.htmlTarjetasTabla({ ...t, maquina: 'm2' }, '2026-10-09')
  const ayerM2 = sumaDe(DATOS.filter(f => f.fecha === '2026-10-08' && f.maquina_id === 'm2'))
  chk('las tarjetas usan los mismos filtros que la tabla', filt.includes(`${S.formatearNumeroAr(ayerM2, { decimales: 0 })} u`))
  const sinAyer = S.htmlTarjetasTabla({ ...t, base: { ...t.base, filas: DATOS.filter(f => f.fecha !== '2026-10-08') } }, '2026-10-09')
  chk('un período sin producción: "—" y lo dice (nunca "0 u")', /Ayer<\/span><span class="pt-tarjeta__n">—<\/span><span class="pt-tarjeta__rango">Sin producción/.test(sinAyer) && !sinAyer.includes('>0 u<'))
  chk('cargando: "…"', S.htmlTarjetasTabla({ ...t, base: { cargando: true } }, '2026-10-09').includes('Cargando…'))
  chk('error: "No se pudo leer" y ningún número', /No se pudo leer/.test(S.htmlTarjetasTabla({ ...t, base: { error: 'x' } }, '2026-10-09')))
  const malo = '<img src=x onerror=alert(1)>'
  const datosMalos = [r({ producto: malo, maquina: malo, turno: malo, maquina_id: malo })]
  const tm = S.armarTabla(datosMalos, 'producto', 'maquina')
  const hm = S.htmlTablaProduccion(tm, 'producto', 'maquina') + S.htmlOpcionesTabla(S.opcionesFiltroTabla(datosMalos, 'maquina', ''), '', 'Todas') +
    S.htmlOpcionesTabla(S.opcionesFiltroTabla(datosMalos, 'turno', malo), malo, 'Todos') + S.htmlTablaProduccion(S.armarTabla(datosMalos, 'turno', 'ninguna'), 'turno', 'ninguna')
  chk('todo texto de la base va escapado', !hm.includes('<img') && hm.includes('&lt;img src=x onerror=alert(1)&gt;'))
  const cuerpo = S.htmlCuerpoTabla({ ...t, desde: '2099-01-01', hasta: '2099-01-31', periodo: { unidadId: 'u-1', desde: '2099-01-01', hasta: '2099-01-31', filas: [] } })
  chk('sin datos: con palabras', cuerpo.includes('No hubo producción del 01/01/2099 al 31/01/2099.') && !cuerpo.includes('pt-tabla'))
  const cuerpoF = S.htmlCuerpoTabla({ ...t, producto: 'Nada', periodo: { usaBase: true } })
  chk('sin datos por los filtros: lo dice', cuerpoF.includes('con estos filtros'))
  const err = S.htmlCuerpoTabla({ ...t, periodo: { error: 'Se cortó <b>' } })
  chk('error: el mensaje escapado con Reintentar', err.includes('Se cortó &lt;b&gt;') && err.includes('data-tabla-reintentar'))
  chk('cargando', S.htmlCuerpoTabla({ ...t, periodo: { cargando: true } }).includes('Cargando…'))
  chk('período inválido: el aviso, sin tabla', S.htmlCuerpoTabla({ ...t, periodo: { validacion: true, error: 'El período no puede pasar de 400 días.' } }).includes('400 días'))
  const ok = S.htmlCuerpoTabla({ ...t, periodo: { usaBase: true } })
  chk('con datos: la tabla y los promedios', ok.includes('class="pt-tabla"') && ok.includes('Promedio por día con producción'))
  chk('la tabla nunca muestra cajas', !/caja/i.test(ok.replace(/Caja x \d+/g, '')))
}

// ── La consulta: una por período ────────────────────────────────────────
const tick = () => new Promise(res => setTimeout(res, 0))
esperas.push((async () => {
  S.hoy = '2026-10-09'
  S.estado.tabla = null
  delete S.guardado[S.CLAVE_TABLA] // lo que guardó la parte de "lo que se recuerda"
  S.estado.unidadId = 'u-1'
  S.respuesta = (p) => ({ data: DATOS.map(f => ({ ...f, unidades: String(f.unidades) })).filter(f => f.fecha >= p.p_desde && f.fecha <= p.p_hasta), error: null })
  S.mostrarTabla()
  await tick(); await tick()
  chk('mostrarTabla abre la sección', S.estado.vista === 'pr-tabla')
  chk('con "Este mes": UNA sola consulta (la de las tarjetas sirve para la tabla)', S.llamadas.length === 1, S.llamadas.length)
  const l = S.llamadas[0]
  chk('la consulta: produccion_resumen de la unidad, del 1º del mes pasado a hoy', l.nombre === 'produccion_resumen' && l.params.p_unidad_negocio_id === 'u-1' && l.params.p_desde === '2026-09-01' && l.params.p_hasta === '2026-10-09', JSON.stringify(l))
  const cuerpo = S.__elementos['pr-tabla-cuerpo'].innerHTML
  const mes = sumaDe(DATOS.filter(f => f.fecha >= '2026-10-01'))
  chk('la tabla de este mes, con su total', cuerpo.includes(`<td class="pt-total">${S.formatearNumeroAr(mes, { decimales: 0 })}</td>`))
  chk('las tarjetas se dibujan', (S.__elementos['pr-tabla-tarjetas'].innerHTML.match(/data-tabla-periodo/g) || []).length === 4)
  chk('los campos de fecha quedan con el período', S.__elementos['pr-tabla-desde'].value === '2026-10-01' && S.__elementos['pr-tabla-hasta'].value === '2026-10-09')
  chk('los filtros se llenan con los datos', S.__elementos['pr-tabla-maquina'].innerHTML.includes('Máquina 2') && S.__elementos['pr-tabla-turno'].innerHTML.includes('Noche'))

  // Tocar "Mes pasado": la tabla usa la misma consulta, y su total es el de la tarjeta.
  S.elegirPeriodoTabla('mes_pasado')
  await tick(); await tick()
  chk('una tarjeta dentro de la consulta base: ninguna llamada nueva', S.llamadas.length === 1, S.llamadas.length)
  const sep = sumaDe(DATOS.filter(f => f.fecha >= '2026-09-01' && f.fecha <= '2026-09-30'))
  const c2 = S.__elementos['pr-tabla-cuerpo'].innerHTML
  chk('el total de la tabla es el de la tarjeta', c2.includes(`<td class="pt-total">${S.formatearNumeroAr(sep, { decimales: 0 })}</td>`) &&
    S.__elementos['pr-tabla-tarjetas'].innerHTML.includes(`${S.formatearNumeroAr(sep, { decimales: 0 })} u`))
  chk('la tarjeta queda elegida y se recuerda', /data-tabla-periodo="mes_pasado" aria-pressed="true"/.test(S.__elementos['pr-tabla-tarjetas'].innerHTML) &&
    JSON.parse(S.guardado[S.CLAVE_TABLA]).periodoClave === 'mes_pasado')

  // Un filtro: solo se repinta, sin consultar.
  S.cambiarFiltroTabla('maquina', 'm2', 'Máquina 2')
  chk('un filtro no consulta', S.llamadas.length === 1)
  chk('… y se aplica', !S.__elementos['pr-tabla-cuerpo'].innerHTML.includes('Máquina 1') && S.__elementos['pr-tabla-cuerpo'].innerHTML.includes('Máquina 2'))
  S.cambiarFiltroTabla('maquina', '')
  S.elegirDimensionTabla('columnas', 'turno')
  chk('cambiar Columnas no consulta y cambia la tabla', S.llamadas.length === 1 && S.__elementos['pr-tabla-cuerpo'].innerHTML.includes('>Noche</th>'))

  // Un período fuera de la consulta base: UNA consulta de ese período.
  S.__elementos['pr-tabla-desde'].value = '2026-06-01'
  S.__elementos['pr-tabla-hasta'].value = '2026-06-30'
  S.alCambiarFechasTabla()
  await tick(); await tick()
  chk('un período fuera de la consulta base: su propia consulta', S.llamadas.length === 2 && S.llamadas[1].params.p_desde === '2026-06-01' && S.llamadas[1].params.p_hasta === '2026-06-30', JSON.stringify(S.llamadas[1]))
  chk('ninguna tarjeta queda elegida', !/aria-pressed="true"/.test(S.__elementos['pr-tabla-tarjetas'].innerHTML))
  chk('sin producción en junio: con palabras', S.__elementos['pr-tabla-cuerpo'].innerHTML.includes('No hubo producción del 01/06/2026 al 30/06/2026'))

  // Más de 400 días: no se consulta.
  S.__elementos['pr-tabla-desde'].value = '2024-01-01'
  S.__elementos['pr-tabla-hasta'].value = '2026-06-30'
  S.alCambiarFechasTabla()
  await tick(); await tick()
  chk('más de 400 días: no se consulta y se dice', S.llamadas.length === 2 && S.__elementos['pr-tabla-cuerpo'].innerHTML.includes('El período no puede pasar de 400 días.'))

  // El turno: una respuesta vieja no pisa la nueva.
  let soltar
  S.respuesta = (p) => p.p_desde === '2026-05-01' ? new Promise(res => { soltar = () => res({ data: [r({ fecha: '2026-05-04', unidades: 77777 })], error: null }) }) : { data: [r({ fecha: '2026-04-06', unidades: 4242 })], error: null }
  S.__elementos['pr-tabla-desde'].value = '2026-05-01'
  S.__elementos['pr-tabla-hasta'].value = '2026-05-31'
  S.alCambiarFechasTabla()
  S.__elementos['pr-tabla-desde'].value = '2026-04-01'
  S.__elementos['pr-tabla-hasta'].value = '2026-04-30'
  S.alCambiarFechasTabla()
  await tick(); await tick()
  soltar()
  await tick(); await tick()
  const c3 = S.__elementos['pr-tabla-cuerpo'].innerHTML
  chk('la respuesta vieja no pisa la nueva', c3.includes('4.242') && !c3.includes('77.777'), c3.slice(0, 200))

  // Error: se dice, con Reintentar, y Reintentar vuelve a pedir.
  S.respuesta = { data: null, error: { message: 'El período no puede pasar de 400 días.' } }
  S.__elementos['pr-tabla-desde'].value = '2026-03-01'
  S.__elementos['pr-tabla-hasta'].value = '2026-03-31'
  S.alCambiarFechasTabla()
  await tick(); await tick()
  chk('el error de la base, tal cual, con Reintentar', S.__elementos['pr-tabla-cuerpo'].innerHTML.includes('El período no puede pasar de 400 días.') && S.__elementos['pr-tabla-cuerpo'].innerHTML.includes('data-tabla-reintentar'))
  const antesReintento = S.llamadas.length
  S.respuesta = { data: [r({ fecha: '2026-03-02', unidades: 3030 })], error: null }
  await S.cargarTabla()
  chk('Reintentar vuelve a pedir y dibuja', S.llamadas.length > antesReintento && S.__elementos['pr-tabla-cuerpo'].innerHTML.includes('3.030'))

  // Tocar una tarjeta MIENTRAS la consulta base está en vuelo: la respuesta
  // de la primera se descarta por el turno, así que la segunda tiene que
  // volver a pedir (si no, quedaría "Cargando…" para siempre).
  S.estado.tabla = null
  S.estado.unidadId = 'u-1'
  delete S.guardado[S.CLAVE_TABLA]
  S.respuesta = (p) => ({ data: DATOS.filter(f => f.fecha >= p.p_desde && f.fecha <= p.p_hasta), error: null })
  S.mostrarTabla()
  S.elegirPeriodoTabla('semana')
  await tick(); await tick()
  const c4 = S.__elementos['pr-tabla-cuerpo'].innerHTML
  const semana = sumaDe(DATOS.filter(f => f.fecha >= '2026-10-05' && f.fecha <= '2026-10-09'))
  chk('una tarjeta tocada con la consulta en vuelo termina dibujando la tabla', !c4.includes('Cargando…') && c4.includes(S.formatearNumeroAr(semana, { decimales: 0 })), c4.slice(0, 120))

  // Cambiar de unidad: se vuelve a pedir y la máquina elegida se suelta.
  S.estado.tabla.maquina = 'm1'
  S.estado.unidadId = 'u-2'
  const antesUnidad = S.llamadas.length
  S.cambiarUnidadTabla('u-2')
  await tick(); await tick()
  chk('otra unidad: la máquina elegida se suelta y se consulta esa unidad', S.estado.tabla.maquina === '' && S.llamadas.slice(antesUnidad).every(x => x.params.p_unidad_negocio_id === 'u-2') && S.llamadas.length > antesUnidad)
})())

// ── El archivo: menú, sección, y que lo demás no cambió ─────────────────
{
  const sinComent = src.replace(/<!--[\s\S]*?-->/g, '')
  const control = sinComent.slice(sinComent.indexOf('id="pr-menu-bloque-control"'), sinComent.indexOf('id="pr-menu-bloque-catalogo"'))
  const primero = control.match(/<button[^>]*class="pg-menu__item"[^>]*>/)
  chk('"Tabla de producción" es la PRIMERA entrada de Control', primero && /data-menu="tabla"/.test(primero[0]) && /id="pr-menu-tabla"/.test(primero[0]), primero && primero[0])
  chk('la vista está en VISTAS', /const VISTAS = \[[^\]]*'pr-tabla'/.test(src))
  chk('el menú la muestra con ver o configurar', /for \(const id of \['pr-menu-tabla'[^\]]*\]\) document\.getElementById\(id\)\.hidden = !ver/.test(src))
  chk('navegar("tabla") abre la tabla', /if \(destino === 'tabla'\) return mostrarTabla\(\)/.test(src))
  chk('al cambiar la unidad de la gestión, la tabla la sigue', /estado\.vista === 'pr-tabla'\) \{\s*cambiarUnidadTabla\(id\)/.test(src))
  chk('el período con el control de período, fechas obligatorias', /crearPeriodo\(\{ desde: d, hasta: h, obligatorias: true \}\)\s*document\.getElementById\('pr-tabla-volver'\)/.test(src))
  chk('la primera columna es fija (sticky)', /\.pt-tabla th\[scope="row"\], \.pt-tabla \.pt-esquina \{\s*position: sticky; left: 0;/.test(src))
  chk('la tabla scrollea adentro de su caja', /\.pt-scroll \{\s*overflow-x: auto; max-width: 100%;/.test(src))
  for (const f of ['cargarMaquinas', 'mostrarHistorial', 'mostrarStockTerminado', 'cargarIndicadores', 'sumarTurnos']) {
    chk(`${f} no cambió (contra ${BASE})`, extraerFn(src, f) === extraerFn(antes, f))
  }
}

fin()
