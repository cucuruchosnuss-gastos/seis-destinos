// Producción · máquinas y abrir turno (B3, rediseñado el 22/09/2026 — parte 2).
//
// - El tablero: una tarjeta por máquina. Libre, abierta, parada, y la ABIERTA
//   DE AYER a todo el ancho ANTES que todas. Orden: de ayer → paradas →
//   abiertas → libres. Cada abierta dice su lote, la hora, las masas y los
//   sublotes, y lleva a su planilla.
// - Abrir turno: fecha con ‹ › (nunca futura), turno, y una fila por máquina
//   con VARIOS operarios, que se agregan de a uno con el buscador que se abre
//   DENTRO de la fila. La abierta de ayer aparece al final y NO se puede
//   marcar. UNA sola llamada a abrir_turnos(p_fecha, p_turno, p_encargado_id,
//   p_maquinas [{maquina_id, operarios: [uuid, …]}]) — la firma leída con
//   pg_get_functiondef el 22/09/2026 — y los lotes que devuelve, a 124px.
// - Con el turno abierto se suman y se sacan operarios
//   (agregar_operario_turno / quitar_operario_turno). El que se va NO se borra:
//   la RPC le pone `hasta`, así que sigue en la lista con su hora de salida.
// - Pantalla encendida (Wake Lock) mientras haya un turno abierto, con
//   try/catch.
//
//   node pruebas/test-produccion-abrir.js

// La tablet puede estar en cualquier zona: las horas tienen que salir en la de
// Argentina igual. Con la zona del proceso en UTC, una hora sin timeZone da
// otra cosa y la suite se pone en rojo.
process.env.TZ = 'UTC'

const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
leer(ARCHIVO)
const FUENTE = require('fs').readFileSync(ARCHIVO, 'utf8')
const { chk, esperas, fin } = arnes()

// 06:02 de Argentina = 09:02 UTC.
const HOY = '2026-09-22'
const TABLAS = {
  maquinas: [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }, { id: 'm2', nombre: 'Máquina 2', orden: 2 }, { id: 'm3', nombre: 'Máquina 3', orden: 3 }],
  turnos_produccion: [{ id: 't1', lote: 7023, maquina_id: 'm1', fecha: HOY, turno: 'Mañana', encargado_id: 'e-fede', abierto_en: '2026-09-22T09:02:00Z' }],
  masas: [{ turno_id: 't1' }, { turno_id: 't1' }, { turno_id: 't1' }, { turno_id: 't1' }, { turno_id: 't1' }],
  paradas_produccion: [],
  produccion_items: [{ turno_id: 't1', cajas: 12 }, { turno_id: 't1', cajas: 30 }],
}

function armar(tablas = TABLAS) {
  const S = construirProduccion(ARCHIVO)
  Object.assign(S.__tablas, conHoy(S, tablas))
  S.estado.modo = 'produccion'
  S.estado.persona = { id: 'e-fede', nombre: 'Federico Silva' }
  S.estado.personal = [
    { id: 'e-fede', nombre: 'Federico Silva', misma_unidad: true, puestos: ['encargado'] },
    { id: 'e-op1', nombre: 'Ramón Díaz', misma_unidad: true, puestos: ['operario'] },
    { id: 'e-op2', nombre: 'Marcos Vera', misma_unidad: true, puestos: ['operario'] },
    { id: 'e-op3', nombre: 'Mariela Soto', misma_unidad: true, puestos: ['operario'] },
  ]
  return S
}

// Un turno de HOY tiene que llevar la fecha de hoy DE VERDAD: mostrarTablero()
// llama a hoyArgentina() por dentro y no se le puede pasar otra. Sin esto la
// suite andaría hoy y se pondría en rojo mañana, cuando la fecha fija del
// fixture pase a ser "de ayer" — una assertion atada al día en que se escribió.
// Las fechas VIEJAS a propósito (2020-01-05) no se tocan, y una tabla que es
// una FUNCIÓN (el fixture que hace fallar la lectura) pasa tal cual: por JSON
// se perdería y la consulta devolvería [] en vez del error.
function conHoy(S, tablas) {
  const hoy = S.hoyArgentina()
  const out = {}
  for (const [k, v] of Object.entries(tablas)) {
    out[k] = typeof v === 'function' ? v : JSON.parse(JSON.stringify(v).split(HOY).join(hoy))
  }
  return out
}

// ── Textos y orden ────────────────────────────────────────────────────────
{
  const S = armar()
  chk('masas en singular y plural', S.textoMasas(1) === '1 masa' && S.textoMasas(0) === '0 masas')
  chk('sublotes en singular y plural', S.textoSublotes(1) === '1 sublote' && S.textoSublotes(3) === '3 sublotes')

  chk('la hora sale en la de Argentina', S.horaArgentina('2026-09-22T09:02:00Z') === '06:02', S.horaArgentina('2026-09-22T09:02:00Z'))
  // Un dato ilegible NO se muestra como una hora plausible.
  chk('… y una ilegible no dice "NaN"', S.horaArgentina('basura') === '' && S.horaArgentina(null) === '')
  chk('el día de la semana sale en castellano', S.diaDeLaSemana('2026-09-21') === 'lunes', S.diaDeLaSemana('2026-09-21'))
  chk('… y una fecha ilegible no inventa ninguno', S.diaDeLaSemana('basura') === '' && S.diaDeLaSemana(null) === '')
  chk('día/mes con los dos números parejos', S.diaMes('2026-09-01') === '01/09', S.diaMes('2026-09-01'))
  chk('… y una fecha ilegible da vacío', S.diaMes('2026') === '')

  const libre = { maquina: { id: 'm', nombre: 'M' }, turno: null }
  const hoyAbierta = { maquina: { id: 'm', nombre: 'M' }, turno: { fecha: HOY }, parada: null }
  const ayer = { maquina: { id: 'm', nombre: 'M' }, turno: { fecha: '2026-09-21' }, parada: null }
  const parada = { maquina: { id: 'm', nombre: 'M' }, turno: { fecha: HOY }, parada: { motivo: 'pulpo' } }
  chk('de ayer: turno abierto con fecha anterior a hoy', S.esDeAyer(ayer, HOY) === true)
  chk('… la de hoy no lo es', S.esDeAyer(hoyAbierta, HOY) === false)
  chk('… una libre tampoco', S.esDeAyer(libre, HOY) === false)
  // Sin fecha legible NO se afirma "de ayer": decirlo sin poder saberlo es
  // peor que no decirlo.
  chk('… y sin fecha legible no se afirma nada', S.esDeAyer({ turno: { fecha: null } }, HOY) === false &&
    S.esDeAyer({ turno: { fecha: 'basura' } }, HOY) === false)

  // La planta con dos modos: orden FIJO por número; solo la de ayer se adelanta.
  chk('rangos: de ayer 0; parada, abierta y libre 1 (el mismo lugar)',
    [S.rangoTablero(ayer, HOY), S.rangoTablero(parada, HOY), S.rangoTablero(hoyAbierta, HOY), S.rangoTablero(libre, HOY)].join() === '0,1,1,1')

  const n = (nombre, e) => ({ ...e, maquina: { id: nombre, nombre } })
  const desordenado = [n('libre1', libre), n('abierta1', hoyAbierta), n('ayer1', ayer), n('parada1', parada), n('libre2', libre), n('abierta2', hoyAbierta)]
  chk('el orden: la de ayer primero y después el orden FIJO de las máquinas',
    S.ordenTablero(desordenado, HOY).map(e => e.maquina.nombre).join() === 'ayer1,libre1,abierta1,parada1,libre2,abierta2',
    S.ordenTablero(desordenado, HOY).map(e => e.maquina.nombre).join())
  chk('… y es ESTABLE dentro de cada grupo (no reordena las máquinas)',
    S.ordenTablero([n('b', libre), n('a', libre)], HOY).map(e => e.maquina.nombre).join() === 'b,a')

  chk('el encabezado dice el turno de hoy y la fecha',
    S.encabezadoTablero([{ turno: { fecha: HOY, turno: 'Mañana' } }], HOY) === 'Turno Mañana · martes 22/09',
    S.encabezadoTablero([{ turno: { fecha: HOY, turno: 'Mañana' } }], HOY))
  // Sin ninguna máquina abierta HOY no se inventa un turno: queda la fecha.
  chk('… sin máquinas abiertas hoy, solo la fecha',
    S.encabezadoTablero([{ turno: { fecha: '2026-09-21', turno: 'Noche' } }, { turno: null }], HOY) === 'martes 22/09')

  chk('la fecha de abrir dice "hoy" con el día', S.textoFechaAbrir(HOY, HOY).nota === 'hoy, martes' && S.textoFechaAbrir(HOY, HOY).dia === '22/09/2026')
  chk('… y "ayer" el día anterior', S.textoFechaAbrir('2026-09-21', HOY).nota === 'ayer, lunes')
  chk('… más atrás, solo el día', S.textoFechaAbrir('2026-09-20', HOY).nota === 'domingo')
  chk('… y una fecha ilegible no dibuja nada', S.textoFechaAbrir('', HOY).dia === '' && S.textoFechaAbrir('', HOY).nota === '')

  chk('turno sugerido por hora: 6 → Mañana', S.turnoSegunHora(6) === 'Mañana')
  chk('12 → Mañana', S.turnoSegunHora(12) === 'Mañana')
  chk('14 → Tarde', S.turnoSegunHora(14) === 'Tarde')
  chk('22 → Noche', S.turnoSegunHora(22) === 'Noche')
  chk('3 → Noche', S.turnoSegunHora(3) === 'Noche')
  chk('hoyArgentina a las 23:30 de Argentina del 22 (02:30 UTC del 23) es el 22', S.hoyArgentina(new Date('2026-09-23T02:30:00Z')) === '2026-09-22')
}

// ── El resaltado de la coincidencia ───────────────────────────────────────
{
  const S = armar()
  chk('la coincidencia va en negrita', S.htmlResaltado('Marcos Vera', 'mar') === '<strong>Mar</strong>cos Vera', S.htmlResaltado('Marcos Vera', 'mar'))
  // Normalizar la cadena entera le cambia el largo ("José" → "jose") y el
  // resaltado terminaría sobre las letras equivocadas.
  chk('… acentos incluidos, sin correrse', S.htmlResaltado('José Pérez', 'jose') === '<strong>José</strong> Pérez', S.htmlResaltado('José Pérez', 'jose'))
  chk('… y con un espacio en el medio', S.htmlResaltado('Ramón Díaz', 'ramon d') === '<strong>Ramón D</strong>íaz', S.htmlResaltado('Ramón Díaz', 'ramon d'))
  chk('sin búsqueda no se resalta nada', S.htmlResaltado('Marcos Vera', '') === 'Marcos Vera')
  chk('sin coincidencia tampoco', S.htmlResaltado('Marcos Vera', 'zzz') === 'Marcos Vera')
  chk('el nombre se escapa en los tres pedazos',
    S.htmlResaltado('<b>Mar</b>', 'mar').includes('&lt;b&gt;') && !S.htmlResaltado('<b>Mar</b>', 'mar').includes('<b>'))
}

// ── El tablero ────────────────────────────────────────────────────────────
esperas.push((async () => {
  const S = armar()
  let pedidos = 0
  S.__nav.wakeLock = { request: async () => { pedidos++; return { release: async () => {}, addEventListener() {} } } }
  await S.mostrarTablero()
  const html = S.__doc.getElementById('pr-tablero').innerHTML
  chk('una tarjeta por máquina activa', (html.match(/class="pr-maquina[ "]/g) || []).length === 3, html.match(/class="pr-maquina[ "]/g))
  chk('tocar la andando lleva a Lo producido (no a la planilla)', /data-producido="t1"/.test(html) && !/data-planilla=/.test(html))
  chk('la andando: "Andando", LOTE grande, el encargado, las masas y las CAJAS',
    /pr-maquina__chip">Andando</.test(html) && /pr-maquina__rotulo">LOTE</.test(html) && /class="pr-maquina__lote">7023</.test(html) &&
    /pr-maquina__estado">Federico Silva</.test(html) && /5 masas · 42 cajas/.test(html), html)
  chk('… con la franja del modo', /pr-maquina--activa/.test(html))
  chk('las sin turno: gris punteada, "Sin turno" y su "Abrir turno"',
    (html.match(/pr-maquina__libre">Sin turno</g) || []).length === 2 && (html.match(/pr-maquina--libre/g) || []).length === 2 &&
    /data-abrir-libre="m2">Abrir turno</.test(html) && /data-abrir-libre="m3">Abrir turno</.test(html))
  chk('las cajas se leen de lo producido', S.__llamadas.consultas.some(([t, f]) => t === 'produccion_items' && JSON.stringify(f).includes('turno_id, cajas')))
  chk('mil cajas con su punto de miles', S.textoCajasTablero(1234) === '1.234 cajas' && S.textoCajasTablero(1) === '1 caja' && S.textoCajasTablero(0) === '0 cajas')
  // "Abrir turno" desde la tarjeta: esa máquina ya viene elegida.
  await S.mostrarAbrir('m3')
  chk('"Abrir turno" desde la tarjeta: la máquina viene elegida', S.estado.vista === 'pr-abrir' &&
    S.estado.abrir.filas.find(x => x.maquinaId === 'm3')?.elegida === true && S.estado.abrir.filas.find(x => x.maquinaId === 'm2')?.elegida === false)
  await S.mostrarAbrir({ type: 'click' })
  chk('… y desde el botón (llega el evento) no viene ninguna elegida', S.estado.abrir.filas.every(x => !x.elegida))
  chk('el tablero escucha la tarjeta andando y la sin turno',
    /const p = ev\.target\.closest\('\[data-producido\]'\); if \(p\) \{ tocar\(\); abrirLoProducido\(p\.dataset\.producido\); return \}/.test(FUENTE) &&
    /const a = ev\.target\.closest\('\[data-abrir-libre\]'\); if \(a\) \{ tocar\(\); mostrarAbrir\(a\.dataset\.abrirLibre\) \}/.test(FUENTE))
  chk('el encabezado dice el turno y la fecha', /Turno Mañana · /.test(S.__doc.getElementById('pr-tablero-cuando').textContent),
    S.__doc.getElementById('pr-tablero-cuando').textContent)
  chk('lee las máquinas activas de la unidad', S.__llamadas.consultas.some(([t, f]) => t === 'maquinas' && JSON.stringify(f).includes('["eq","unidad_negocio_id","u-cn"]') && JSON.stringify(f).includes('["eq","activa",true]')))
  // Un turno 'pendiente_completar' NO está abierto: la máquina quedó libre.
  chk('lee SOLO los turnos abiertos de la unidad', S.__llamadas.consultas.some(([t, f]) => t === 'turnos_produccion' && JSON.stringify(f).includes('["eq","estado","abierto"]') && JSON.stringify(f).includes('["eq","unidad_negocio_id","u-cn"]')))
  chk('cuenta solo masas sin anular', S.__llamadas.consultas.some(([t, f]) => t === 'masas' && JSON.stringify(f).includes('["eq","anulada",false]')))
  chk('cuenta solo sublotes sin anular', S.__llamadas.consultas.some(([t, f]) => t === 'produccion_items' && JSON.stringify(f).includes('["eq","anulado",false]')))
  const btn = S.__doc.getElementById('pr-btn-abrir-turno')
  chk('hay libres: se puede abrir otra', btn.disabled === false && btn.textContent === '+ Abrir otra máquina')
  chk('con un turno abierto se pide la pantalla encendida', pedidos === 1 && S.estado.hayTurnoAbierto === true)

  const T = armar({ ...TABLAS, turnos_produccion: [], masas: [], produccion_items: [] })
  await T.mostrarTablero()
  chk('sin turnos abiertos: "Abrir turno"', T.__doc.getElementById('pr-btn-abrir-turno').textContent === 'Abrir turno')
  chk('… y no se pide la pantalla encendida', T.estado.hayTurnoAbierto === false)

  const U = armar({ ...TABLAS, turnos_produccion: ['m1', 'm2', 'm3'].map((m, i) => ({ id: 't' + i, lote: 1 + i, maquina_id: m, abierto_en: null })) })
  await U.mostrarTablero()
  chk('todas abiertas: no hay nada que abrir', U.__doc.getElementById('pr-btn-abrir-turno').disabled === true)

  const V = armar({ ...TABLAS, maquinas: () => ({ data: null, error: { message: 'sin red' } }) })
  await V.mostrarTablero()
  chk('si falla la lectura: aviso, sin tablero viejo', /No se pudieron leer las máquinas/.test(V.__doc.getElementById('pr-tablero-aviso').innerHTML) &&
    V.__doc.getElementById('pr-tablero').innerHTML === '' && V.__doc.getElementById('pr-btn-abrir-turno').disabled === true)

  const W = armar({ ...TABLAS, maquinas: [] })
  await W.mostrarTablero()
  chk('sin máquinas: lo dice', /no tiene máquinas activas/.test(W.__doc.getElementById('pr-tablero-aviso').innerHTML))

  // Wake Lock que tira: no rompe.
  const X = armar()
  X.__nav.wakeLock = { request: async () => { throw new Error('no permitido') } }
  let tiro = false
  try { await X.mostrarTablero() } catch { tiro = true }
  let tiro2 = false
  try { await X.mantenerPantalla(true) } catch { tiro2 = true }
  chk('mantenerPantalla con Wake Lock que falla no tira', !tiro2)
  chk('Wake Lock que falla no rompe el tablero', !tiro && (X.__doc.getElementById('pr-tablero').innerHTML.match(/pr-maquina/g) || []).length >= 3)

  // ── Parada y abierta de ayer ────────────────────────────────────────────
  const Y = armar({
    maquinas: [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }, { id: 'm2', nombre: 'Máquina 2', orden: 2 }, { id: 'm9', nombre: 'Máquina 9', orden: 9 }],
    turnos_produccion: [
      { id: 't-par', lote: 7023, maquina_id: 'm1', fecha: HOY, turno: 'Mañana', abierto_en: '2026-09-22T09:02:00Z' },
      { id: 't-ayer', lote: 7019, maquina_id: 'm2', fecha: '2020-01-05', turno: 'Tarde', abierto_en: '2020-01-05T17:10:00Z' },
    ],
    masas: [{ turno_id: 't-ayer' }],
    produccion_items: [],
    paradas_produccion: [{ id: 'p', turno_id: 't-par', motivo: 'pulpo', inicio: '2026-09-22T13:32:00Z' }],
  })
  await Y.mostrarTablero()
  const hy = Y.__doc.getElementById('pr-tablero').innerHTML
  chk('la de AYER va PRIMERA y a todo el ancho', hy.indexOf('pr-maquina--ayer') >= 0 &&
    hy.indexOf('pr-maquina--ayer') < hy.indexOf('pr-maquina--parada'), hy.slice(0, 120))
  chk('… con el sello, el lote y qué hay que hacer',
    /ABIERTA DE AYER/.test(hy) && /Lote 7019/.test(hy) && /Hay que cerrarla antes de volver a usarla/.test(hy))
  chk('… diciendo cuándo se abrió y cuánto lleva', /Abierta el domingo 05\/01 a las 14:10 · 1 masa · 0 sublotes/.test(hy), hy)
  chk('… y con su botón para cerrar la planilla', /data-planilla="t-ayer"[^>]*>Cerrar planilla de ayer</.test(hy))
  chk('la parada: la tarjeta entera en bordó con "PARADA" y el motivo',
    /pr-maquina pr-maquina--parada/.test(hy) && /pr-maquina__chip">PARADA</.test(hy) && /pulpo/.test(hy), hy)
  const eParada = Y.estado.tablero.find(e => e.parada)
  const tParada = Y.htmlMaquina(eParada, HOY, new Date(new Date(eParada.parada.inicio).getTime() + 12 * 60000))
  chk('… con "Hace 12 min · pulpo"', /pr-maquina__estado">Hace 12 min · pulpo</.test(tParada), tParada)
  chk('… y NO cambia de lugar: va en su orden (m1 antes que m9)', hy.indexOf('pr-maquina--parada') < hy.indexOf('pr-maquina--libre'))
  chk('la parada es la ÚNICA tarjeta oscura (bordó entero, letra blanca)',
    /\.pr-tablero \.pr-maquina--parada \{ background: var\(--bordo\); border-color: var\(--bordo\); color: #fff; \}/.test(FUENTE))

  // HTML malicioso en la tarjeta.
  const Z = armar({
    maquinas: [{ id: 'm1', nombre: marca('maquina'), orden: 1 }, { id: marca('libreId'), nombre: marca('maquinaLibre'), orden: 2 },
      { id: 'm5', nombre: 'Andando', orden: 3 }],
    turnos_produccion: [{ id: marca('turnoId'), lote: marca('lote'), maquina_id: 'm1', fecha: HOY, abierto_en: null },
      { id: 't5', lote: 5, maquina_id: 'm5', fecha: HOY, encargado_id: 'e-malo', abierto_en: null }],
    masas: [], produccion_items: [],
    paradas_produccion: [{ id: 'p', turno_id: marca('turnoId'), motivo: marca('motivo'), inicio: null }],
  })
  Z.estado.personal = [{ id: 'e-malo', nombre: marca('encargado'), misma_unidad: true, puestos: ['encargado'] }]
  await Z.mostrarTablero()
  chequearMarcas(chk, 'tablero', Z.__doc.getElementById('pr-tablero').innerHTML, ['maquina', 'maquinaLibre', 'libreId', 'turnoId', 'lote', 'motivo', 'encargado'])
  chequearMarcas(chk, 'tarjeta de ayer', Z.htmlMaquina({
    maquina: { nombre: marca('mAyer') }, masas: 0, sublotes: 0,
    turno: { id: marca('idAyer'), lote: marca('loteAyer'), fecha: '2020-01-05', abierto_en: null },
  }, HOY), ['mAyer', 'idAyer', 'loteAyer'])

  // ── Abrir turno ─────────────────────────────────────────────────────────
  await S.mostrarAbrir()
  const form = S.estado.abrir
  chk('el formulario ofrece las libres', form.filas.map(f => f.maquinaId).join() === 'm2,m3')
  chk('la fecha arranca en hoy', form.fecha === S.hoyArgentina() &&
    S.__doc.getElementById('pr-abrir-fecha-dia').textContent === S.fechaDelDia(S.hoyArgentina()))
  chk('… y no se puede ir hacia adelante', S.__doc.getElementById('pr-abrir-dia-mas').disabled === true)
  S.cambiarDiaAbrir(-1)
  chk('‹ retrocede un día', S.estado.abrir.fecha === S.sumarDias(S.hoyArgentina(), -1) &&
    /^ayer, /.test(S.__doc.getElementById('pr-abrir-fecha-nota').textContent))
  chk('… y ahí › se habilita', S.__doc.getElementById('pr-abrir-dia-mas').disabled === false)
  S.cambiarDiaAbrir(1)
  S.cambiarDiaAbrir(1)
  chk('› nunca pasa de hoy', S.estado.abrir.fecha === S.hoyArgentina())

  chk('el turno queda sugerido por la hora', S.TURNOS.includes(form.turno))
  chk('el encargado es la persona de "¿Quién sos?"', /Federico Silva/.test(S.__doc.getElementById('pr-abrir-encargado').textContent))
  let filas = S.__doc.getElementById('pr-abrir-maquinas').innerHTML
  chk('cada máquina con su casilla de 56px', (filas.match(/data-abrir-maquina=/g) || []).length === 2 && /class="pr-casilla"/.test(filas))
  chk('sin marcar no se piden operarios', (filas.match(/Sin marcar/g) || []).length === 2 && !/data-mas-operario/.test(filas))
  chk('sin elegir máquina no se puede abrir', S.__doc.getElementById('pr-abrir-confirmar').disabled === true)
  chk('el resumen arranca en cero', S.__doc.getElementById('pr-abrir-resumen').textContent === '0 máquinas · 0 operarios')

  form.filas[0].elegida = true
  S.pintarAbrir()
  filas = S.__doc.getElementById('pr-abrir-maquinas').innerHTML
  // (28/09/2026, la tablet real) Marcada: TODOS los operarios a la vista como
  // etiquetas chicas, y un buscador que NO toma el foco solo.
  chk('marcada: todos los operarios como etiquetas', /class="pr-op-tags" data-res-op="0"/.test(filas) &&
    /data-toggle-op="0" data-op-id="e-op1" aria-pressed="false">Ramón Díaz/.test(filas) &&
    /data-toggle-op="0" data-op-id="e-op2" aria-pressed="false">Marcos Vera/.test(filas), filas)
  chk('… con el buscador en la fila', /data-buscar-op="0"/.test(filas))
  chk('… que no toma el foco solo (sin .focus() en el agregado)', !/function agregarOperarioFila[\s\S]{0,500}?\.focus\(\)\s*\n\s*\}/.test(FUENTE))
  chk('… y sin "+ Operario"', !/data-mas-operario="0"/.test(filas))
  // Una máquina marcada SIN operarios se puede abrir: abrir_turnos no los
  // exige ni valida su puesto (solo agregar_operario_turno lo hace).
  chk('marcada sin operarios: igual se puede abrir', S.faltanParaAbrir(form, S.hoyArgentina()).length === 0)
  chk('… y el resumen lo dice', S.__doc.getElementById('pr-abrir-resumen').textContent === '1 máquina · 0 operarios')

  // El buscador se abre DENTRO de la fila.
  S.abrirBuscadorOperario(0, true)
  filas = S.__doc.getElementById('pr-abrir-maquinas').innerHTML
  chk('el buscador está dentro de la fila', /data-buscar-op="0"/.test(filas) && /data-res-op="0"/.test(filas))
  chk('… con los operarios configurados y no el encargado',
    /Ramón Díaz/.test(filas) && /Marcos Vera/.test(filas) && !/Federico Silva/.test(filas))
  form.filas[0].busqueda = 'mar'
  S.pintarAbrir()
  filas = S.__doc.getElementById('pr-abrir-maquinas').innerHTML
  chk('la búsqueda filtra y resalta la coincidencia',
    /<strong>Mar<\/strong>cos Vera/.test(filas) && /<strong>Mar<\/strong>iela Soto/.test(filas) && !/Ramón/.test(filas), filas)

  S.agregarOperarioFila(0, 'e-op1')
  S.agregarOperarioFila(0, 'e-op2')
  filas = S.__doc.getElementById('pr-abrir-maquinas').innerHTML
  chk('dos operarios en la misma máquina, como etiquetas apretadas',
    /data-toggle-op="0" data-op-id="e-op1" aria-pressed="true">Ramón Díaz/.test(filas) &&
    /data-toggle-op="0" data-op-id="e-op2" aria-pressed="true">Marcos Vera/.test(filas), filas)
  chk('… la búsqueda se vacía para seguir eligiendo', form.filas[0].busqueda === '')
  chk('… y un elegido se ve aunque el filtro no lo nombre', (() => {
    form.filas[0].busqueda = 'mariela'
    const h = S.htmlTagsOperarios(form.filas[0], 0, S.estado.operarios, form)
    form.filas[0].busqueda = ''
    return /data-op-id="e-op1" aria-pressed="true"/.test(h) && /Mariela Soto/.test(h.replace(/<\/?strong>/g, ''))
  })())
  chk('el resumen cuenta los operarios', S.__doc.getElementById('pr-abrir-resumen').textContent === '1 máquina · 2 operarios')

  // El que ya está en otra máquina aparece APAGADO y diciendo dónde.
  form.filas[1].elegida = true
  S.abrirBuscadorOperario(1, true)
  filas = S.__doc.getElementById('pr-abrir-maquinas').innerHTML
  chk('el que está en otra máquina aparece apagado y dice en cuál',
    /data-toggle-op="1" data-op-id="e-op1" aria-pressed="false" disabled>Ramón Díaz <span class="pr-op-tag__nota">· en Máquina 2<\/span>/.test(filas), filas)
  chk('… y quien está libre no', /data-toggle-op="1" data-op-id="e-op3" aria-pressed="false">/.test(filas))
  // El buscador de la PLANILLA ("+ Sumar") sigue usando candidatosOperario()
  // y htmlResultadosOperario(): se prueban directo.
  chk('planilla: la búsqueda de candidatos filtra', (() => {
    const c = S.candidatosOperario(S.estado.operarios, 'mar', [], () => '')
    return c.length > 0 && c.every(x => /mar/i.test(x.nombre))
  })())
  chk('planilla: el que está en otra máquina queda apagado', S.candidatosOperario(S.estado.operarios, '', [], id => id === 'e-op3' ? 'en Máquina 9' : '')
    .find(x => x.id === 'e-op3')?.apagado === true)
  chk('planilla: "Nadie coincide" escapa lo buscado', /Nadie coincide con "&lt;b&gt;"/.test(S.htmlResultadosOperario([], '<b>', 'p')))
  chk('tocar una etiqueta la elige y tocarla de nuevo la suelta (lo escucha el click)',
    /const tag = ev\.target\.closest\('\[data-toggle-op\]'\)/.test(FUENTE) &&
    /f\.operarios\.includes\(tag\.dataset\.opId\) \? quitarOperarioFila\(i, tag\.dataset\.opId\) : agregarOperarioFila\(i, tag\.dataset\.opId\)/.test(FUENTE))
  S.agregarOperarioFila(1, 'e-op3')
  chk('tres operarios repartidos en dos máquinas',
    form.filas[0].operarios.join() === 'e-op1,e-op2' && form.filas[1].operarios.join() === 'e-op3')

  S.agregarOperarioFila(0, 'e-op1')
  chk('el mismo operario no entra dos veces', S.estado.abrir.filas[0].operarios.join() === 'e-op1,e-op2')
  S.quitarOperarioFila(0, 'e-op2')
  chk('la × saca al operario', S.estado.abrir.filas[0].operarios.join() === 'e-op1')
  S.agregarOperarioFila(0, 'e-op2')

  // Al tipear se repinta SOLO la lista de resultados: repintar la fila entera
  // volvería a crear el campo y le sacaría el foco en cada tecla.
  S.abrirBuscadorOperario(0, true)
  const antesDeTipear = S.__doc.getElementById('pr-abrir-maquinas').innerHTML
  const caja = { innerHTML: '' }
  S.__doc.querySelector = (sel) => (sel === '[data-res-op="0"]' ? caja : null)
  S.estado.abrir.filas[0].busqueda = 'marie'
  S.pintarResultadosOperario(0)
  S.__doc.querySelector = () => null
  chk('al tipear se repintan los resultados', /<strong>Marie<\/strong>la Soto/.test(caja.innerHTML), caja.innerHTML)
  chk('… y NO se repinta la fila entera (el campo no se recrea)',
    S.__doc.getElementById('pr-abrir-maquinas').innerHTML === antesDeTipear)
  S.abrirBuscadorOperario(0, false)

  chk('fecha futura: no', S.faltanParaAbrir(form, '2999-01-01').length === 1)
  chk('fecha vacía: no', S.faltanParaAbrir(form, '').length === 1)
  chk('sin turno: no', S.faltanParaAbrir({ ...form, turno: 'Cualquiera' }, S.hoyArgentina()).length === 1)

  const p = S.parametrosAbrirTurnos(form, '2026-09-22', 'e-fede')
  chk('payload de abrir_turnos: cada máquina con SUS operarios en `operarios`',
    JSON.stringify(p) === JSON.stringify({
      p_fecha: '2026-09-22', p_turno: form.turno, p_encargado_id: 'e-fede',
      p_maquinas: [{ maquina_id: 'm2', operarios: ['e-op1', 'e-op2'] }, { maquina_id: 'm3', operarios: ['e-op3'] }],
    }), JSON.stringify(p))
  form.filas[1].elegida = false
  chk('una máquina no elegida no viaja', S.parametrosAbrirTurnos(form, '2026-09-22', 'e-fede').p_maquinas.length === 1)
  form.filas[1].elegida = true

  // Confirmar: UNA sola llamada, y los lotes a 124px con sus operarios.
  S.__setRpc(async (n) => n === 'abrir_turnos'
    ? { data: [{ maquina_id: 'm2', maquina: 'Máquina 2', turno_id: 'x', lote: 7024 }, { maquina_id: 'm3', maquina: 'Máquina 3', turno_id: 'y', lote: 7025 }], error: null }
    : { data: null, error: null })
  S.__llamadas.rpc.length = 0
  await S.confirmarAbrir()
  const llamadas = S.__llamadas.rpc.filter(([n]) => n === 'abrir_turnos')
  chk('una sola llamada a abrir_turnos con las dos máquinas', llamadas.length === 1 && llamadas[0][1].p_maquinas.length === 2)
  chk('… con el encargado de "¿Quién sos?"', llamadas[0]?.[1].p_encargado_id === 'e-fede')
  chk('… y los operarios de cada una', JSON.stringify(llamadas[0]?.[1].p_maquinas) ===
    JSON.stringify([{ maquina_id: 'm2', operarios: ['e-op1', 'e-op2'] }, { maquina_id: 'm3', operarios: ['e-op3'] }]))
  const lotes = S.__doc.getElementById('pr-abiertos-lista').innerHTML
  chk('muestra los lotes asignados, grandes', /class="pr-lote-tarjeta__lote">7024</.test(lotes) && /class="pr-lote-tarjeta__lote">7025</.test(lotes))
  chk('… con los operarios de cada máquina abajo', /Ramón Díaz · Marcos Vera/.test(lotes) && /Mariela Soto/.test(lotes), lotes)
  chk('… y el turno en el título', S.__doc.getElementById('pr-abiertos-titulo').textContent === `Turno ${form.turno} abierto`)
  // SALA DE MASA se habilita ACÁ: las máquinas se acaban de abrir, así que ya
  // se sabe que hay alguna. Esperar a volver al tablero la dejaría apagada un
  // toque de más, justo cuando el masero espera para arrancar. Se mide con una
  // tablet que arranca SIN ninguna máquina abierta: con una ya abierta la
  // bandera viene en true de antes y la afirmación no diría nada.
  const H = armar({ ...TABLAS, turnos_produccion: [], masas: [], produccion_items: [] })
  await H.mostrarTablero()
  chk('sin máquinas abiertas, SALA DE MASA arranca deshabilitada', H.salaDeshabilitada() === true)
  await H.mostrarAbrir()
  H.estado.abrir.filas[0].elegida = true
  H.__setRpc(async () => ({ data: [{ maquina_id: H.estado.abrir.filas[0].maquinaId, maquina: 'M', turno_id: 'z', lote: 1 }], error: null }))
  await H.confirmarAbrir()
  chk('… y al abrir queda habilitada sin volver al tablero',
    H.estado.hayTurnoAbierto === true && H.estado.abiertasConocido === true && H.salaDeshabilitada() === false)
  chk('queda en la pantalla de lotes', S.__doc.getElementById('pr-abiertos').hidden === false)

  // ── La abierta de ayer, en Abrir turno ──────────────────────────────────
  // La de ayer viene PRIMERA por orden de máquina, para que "va última" mida algo.
  const A = armar({
    maquinas: [{ id: 'm1', nombre: 'Máquina 1', orden: 1 }, { id: 'm2', nombre: 'Máquina 2', orden: 2 }],
    turnos_produccion: [{ id: 't-ayer', lote: 7019, maquina_id: 'm1', fecha: '2020-01-05', abierto_en: null }],
    masas: [], produccion_items: [], paradas_produccion: [],
  })
  await A.mostrarTablero()
  await A.mostrarAbrir()
  chk('la abierta de ayer también aparece en Abrir turno', A.estado.abrir.filas.length === 2)
  chk('… y va ÚLTIMA aunque su máquina venga primera',
    A.estado.abrir.filas.map(f => f.maquinaId).join() === 'm2,m1' && A.estado.abrir.filas[1].bloqueada === true,
    A.estado.abrir.filas.map(f => f.maquinaId).join())
  const fa = A.__doc.getElementById('pr-abrir-maquinas').innerHTML
  chk('… con la casilla NO marcable y el motivo',
    /data-abrir-maquina="1" disabled/.test(fa) && /Abierta de ayer \(lote 7019\)\. Cerrala primero\./.test(fa), fa)
  // Marcarla no la deja marcada: la RPC la rechazaría nombrándola.
  A.estado.abrir.filas[1].elegida = true
  chk('aunque se fuerce el estado, la bloqueada no viaja',
    A.parametrosAbrirTurnos(A.estado.abrir, A.hoyArgentina(), 'e-fede').p_maquinas.length === 0)
  chk('… ni cuenta como "al menos una máquina"', A.faltanParaAbrir(A.estado.abrir, A.hoyArgentina()).includes('al menos una máquina'))
  chk('… ni se le puede abrir el buscador', (A.abrirBuscadorOperario(1, true), A.estado.abrir.filas[1].buscando !== true))
  A.estado.abrir.filas[1].elegida = false

  // Sin ninguna libre no se abre la pantalla, aunque haya una de ayer.
  const B = armar({
    maquinas: [{ id: 'm2', nombre: 'Máquina 2', orden: 2 }],
    turnos_produccion: [{ id: 't-ayer', lote: 7019, maquina_id: 'm2', fecha: '2020-01-05', abierto_en: null }],
    masas: [], produccion_items: [], paradas_produccion: [],
  })
  await B.mostrarTablero()
  B.estado.abrir = null
  await B.mostrarAbrir()
  chk('con una sola máquina y abierta de ayer, no hay nada que abrir', B.estado.abrir === null)

  // El error de la base, tal cual.
  const E = armar()
  await E.mostrarTablero()
  await E.mostrarAbrir()
  E.estado.abrir.filas[0].elegida = true
  E.__setRpc(async () => ({ data: null, error: { message: 'Esa persona no figura como encargado de esta unidad.' } }))
  await E.confirmarAbrir()
  chk('el error de la base se muestra tal cual', E.__doc.getElementById('pr-abrir-error').textContent === 'Esa persona no figura como encargado de esta unidad.' &&
    E.__doc.getElementById('pr-abrir-error').hidden === false)
  chk('… y el botón vuelve a quedar usable', E.__doc.getElementById('pr-abrir-confirmar').disabled === false && E.estado.abriendo === false)

  // HTML malicioso en lo que arma Abrir turno.
  chequearMarcas(chk, 'lotes asignados', S.htmlLotesAsignados(
    [{ maquina_id: 'mx', maquina: marca('nombreMaq'), lote: marca('lote2') }],
    { filas: [{ maquinaId: 'mx', operarios: [marca('opId2')] }] },
    [{ id: marca('opId2'), nombre: marca('opNombre2') }]), ['nombreMaq', 'lote2', 'opNombre2'])
  chequearMarcas(chk, 'fila de abrir', S.htmlFilaAbrir(
    { nombre: marca('filaNombre'), elegida: true, operarios: [marca('chipId')], buscando: true, busqueda: marca('busq') }, 0,
    [{ id: marca('chipId'), nombre: marca('chipNombre') }], { filas: [] }),
    ['filaNombre', 'chipId', 'chipNombre', 'busq'])
  chequearMarcas(chk, 'fila bloqueada', S.htmlFilaAbrir({ nombre: marca('bloq'), bloqueada: true, lote: marca('loteBloq') }, 1, [], { filas: [] }),
    ['bloq', 'loteBloq'])
  chequearMarcas(chk, 'buscador', S.htmlBuscadorOperarios(
    [{ id: marca('candId'), nombre: marca('candNombre'), nota: marca('candNota'), apagado: true }], marca('texto'), marca('ctx')),
    ['candId', 'candNombre', 'candNota', 'texto', 'ctx'])
})())

// ── Sumar y sacar operarios con el turno abierto ──────────────────────────
esperas.push((async () => {
  const hoyTablas = {
    ...TABLAS,
    turno_operarios: [
      { empleado_id: 'e-op1', desde: '2026-09-22T09:02:00Z', hasta: null },
      { empleado_id: 'e-op2', desde: '2026-09-22T09:02:00Z', hasta: '2026-09-22T15:40:00Z' },
    ],
  }
  const S = armar(hoyTablas)
  S.estado.tablero = [{ maquina: { id: 'm1', nombre: 'Máquina 1' }, turno: { id: 't1' } }]
  await S.abrirPlanilla('t1')
  let ops = S.__doc.getElementById('pr-planilla-operarios').innerHTML
  chk('el que está adentro va como chip con ×', /Ramón Díaz<button[^>]*data-quitar-op="planilla" data-op-id="e-op1"/.test(ops), ops)
  // quitar_operario_turno NO borra la fila: le pone `hasta`. Esconder al que se
  // fue borraría de la pantalla quién estuvo en ese turno.
  chk('EL QUE SE FUE SIGUE EN LA LISTA, con su hora de salida', /Marcos Vera · salió 12:40/.test(ops), ops)
  chk('… y ya no tiene × (no se lo puede sacar dos veces)', !/data-op-id="e-op2"/.test(ops))
  chk('… y se ofrece "+ Sumar"', /data-mas-operario="planilla"/.test(ops))
  chk('lee turno_operarios con desde y hasta',
    S.__llamadas.consultas.some(([t, f]) => t === 'turno_operarios' && JSON.stringify(f).includes('empleado_id, desde, hasta')))

  // El buscador de la planilla.
  S.estado.opsPlanilla = { buscando: true, busqueda: 'mar', guardando: false }
  S.pintarOperariosPlanilla()
  ops = S.__doc.getElementById('pr-planilla-operarios').innerHTML
  chk('el buscador de la planilla filtra y resalta', /data-buscar-op="planilla"/.test(ops) && /<strong>Mar<\/strong>cos Vera/.test(ops), ops)
  chk('… ofrece al que se fue (el reingreso le pone hasta = null)', /data-elegir-op="planilla" data-op-id="e-op2"/.test(ops))
  // SIN búsqueda: con "mar" puesto, Ramón queda afuera por el filtro y la
  // afirmación no mediría si se lo excluye por estar adentro.
  S.estado.opsPlanilla = { buscando: true, busqueda: '', guardando: false }
  S.pintarOperariosPlanilla()
  ops = S.__doc.getElementById('pr-planilla-operarios').innerHTML
  chk('… y NO ofrece al que ya está adentro',
    !/data-elegir-op="planilla" data-op-id="e-op1"/.test(ops) && /data-elegir-op="planilla" data-op-id="e-op3"/.test(ops), ops)

  // Sumar uno.
  S.__llamadas.rpc.length = 0
  S.__setRpc(async () => ({ data: null, error: null }))
  S.__tablas.turno_operarios = [...hoyTablas.turno_operarios, { empleado_id: 'e-op3', desde: '2026-09-22T16:00:00Z', hasta: null }]
  await S.cambiarOperarioTurno('agregar_operario_turno', 'e-op3', 'No se pudo sumar el operario.')
  chk('sumar llama a agregar_operario_turno con el turno y la persona',
    JSON.stringify(S.__llamadas.rpc) === JSON.stringify([['agregar_operario_turno', { p_turno_id: 't1', p_empleado_id: 'e-op3' }]]),
    JSON.stringify(S.__llamadas.rpc))
  ops = S.__doc.getElementById('pr-planilla-operarios').innerHTML
  chk('… y la lista se relee', /Mariela Soto<button[^>]*data-op-id="e-op3"/.test(ops), ops)
  chk('… cerrando el buscador', S.estado.opsPlanilla.buscando === false && !/data-buscar-op/.test(ops))

  // Sacar uno.
  S.__llamadas.rpc.length = 0
  S.__tablas.turno_operarios = [{ empleado_id: 'e-op1', desde: '2026-09-22T09:02:00Z', hasta: '2026-09-22T17:00:00Z' }]
  await S.cambiarOperarioTurno('quitar_operario_turno', 'e-op1', 'No se pudo sacar el operario.')
  chk('sacar llama a quitar_operario_turno', S.__llamadas.rpc[0]?.[0] === 'quitar_operario_turno' && S.__llamadas.rpc[0]?.[1].p_empleado_id === 'e-op1')
  ops = S.__doc.getElementById('pr-planilla-operarios').innerHTML
  chk('… y el que salió queda con su hora', /Ramón Díaz · salió 14:00/.test(ops), ops)

  // El error de la base, tal cual.
  const E = armar(hoyTablas)
  E.estado.tablero = [{ maquina: { id: 'm1', nombre: 'Máquina 1' }, turno: { id: 't1' } }]
  await E.abrirPlanilla('t1')
  E.__setRpc(async () => ({ data: null, error: { message: 'Esa persona no figura como operario de esta unidad.' } }))
  await E.cambiarOperarioTurno('agregar_operario_turno', 'e-op3', 'No se pudo sumar el operario.')
  const err = E.__doc.getElementById('pr-planilla-error')
  chk('el error de la base se muestra tal cual', err.textContent === 'Esa persona no figura como operario de esta unidad.' && err.hidden === false)
  chk('… y no queda trabado', E.estado.opsPlanilla.guardando === false)

  // Si lo que falla es la RELECTURA, el cambio YA se guardó: el error crudo de
  // la consulta haría creer que el operario no entró y que hay que cargarlo otra
  // vez. Se dice que se guardó, y NO se muestra el mensaje de la consulta.
  const R = armar(hoyTablas)
  R.estado.tablero = [{ maquina: { id: 'm1', nombre: 'Máquina 1' }, turno: { id: 't1' } }]
  await R.abrirPlanilla('t1')
  R.__setRpc(async () => ({ data: null, error: null }))
  R.__tablas.turno_operarios = () => ({ data: null, error: { message: 'JSON object requested, multiple rows returned' } })
  await R.cambiarOperarioTurno('agregar_operario_turno', 'e-op3', 'No se pudo sumar el operario.')
  const errR = R.__doc.getElementById('pr-planilla-error')
  chk('una relectura que falla NO dice que falló el guardado',
    /se guardó, pero no se pudo actualizar la lista/.test(errR.textContent) && errR.hidden === false, errR.textContent)
  chk('… y no muestra el error crudo de la consulta', !/JSON object requested/.test(errR.textContent))
  chk('… y tampoco queda trabado', R.estado.opsPlanilla.guardando === false)

  // HTML malicioso en el bloque de operarios.
  const M = armar(hoyTablas)
  M.estado.personal = [{ id: marca('opPid'), nombre: marca('opPnombre'), misma_unidad: true, puestos: ['operario'] }]
  M.estado.operarios = M.estado.personal
  chequearMarcas(chk, 'operarios de la planilla', M.htmlOperariosPlanilla(
    { operarios: [{ empleado_id: marca('opPid'), hasta: null }] },
    { buscando: false, busqueda: '' }, M.estado.personal), ['opPid', 'opPnombre'])
  // El chip del que SE FUE es otra rama, con su propio nombre y su hora. El
  // nombre sale de estado.personal (nombrePersona) y no de la lista de
  // operarios: alguien puede haber estado en el turno y ya no tener el puesto.
  M.estado.personal = [{ id: 'sal', nombre: marca('opFnombre'), misma_unidad: true, puestos: ['operario'] }]
  chequearMarcas(chk, 'operario que salió', M.htmlOperariosPlanilla(
    { operarios: [{ empleado_id: 'sal', hasta: marca('opFhasta') }] },
    { buscando: false, busqueda: '' }, M.estado.personal), ['opFnombre'])
})())

fin()
