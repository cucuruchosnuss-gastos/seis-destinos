// Runner de mutaciones: saca cada escCob y exige que la suite se ponga en ROJO.
//
// Tres guards, los tres por bugs ya documentados en el proyecto:
//  - Si la suite NO está verde sobre el archivo limpio, las mutaciones no
//    miden nada: toda mutación se reportaría como "detectada". Se aborta.
//  - Cada mutación usa un ANCLA ÚNICA (se agranda el contexto hasta que lo
//    sea). Si no se consigue, se aborta nombrándola en vez de mutar el renglón
//    equivocado y reportar un hueco que no existe.
//  - Una mutación que no cambia el archivo es un ERROR DEL TEST, nunca
//    cobertura. Y el sub-proceso confirma cuántos bytes leyó.

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { interpolaciones } = require('./escaner-interpolaciones')

const RAIZ = path.join(__dirname, '..')
const ORIGINAL = process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cobranzas.html')
const SOLO = process.env.SOLO || ''          // '' | 'render' (para medir sin el estático)
const TMP = path.join(__dirname, 'mut-tmp.html')

const src = fs.readFileSync(ORIGINAL, 'utf8')

function correr(archivo) {
  try {
    const salida = execFileSync(process.execPath, [path.join(__dirname, 'test-cobranzas-xss.js')], {
      encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: archivo, SOLO },
    })
    return { rojo: false, salida }
  } catch (err) {
    return { rojo: true, salida: (err.stdout || '') + (err.stderr || '') }
  }
}

// ── Guard 1: verde sobre el limpio ────────────────────────────────────────
const limpio = correr(ORIGINAL)
if (limpio.rojo) {
  console.log('ABORTADO: la suite NO está verde sobre el archivo limpio, así que las mutaciones no medirían nada.')
  console.log(limpio.salida)
  process.exit(2)
}
console.log('Suite sobre el limpio:', limpio.salida.trim().split('\n').pop())

// ── Construcción de las mutaciones ────────────────────────────────────────
const { interpolaciones: todas } = interpolaciones(ORIGINAL)
const objetivo = todas.filter(x => x.html && /^\s*escCob\(/.test(x.expr))

function anclaUnica(texto, centro, largoInicial) {
  for (let extra = 0; extra < 400; extra += 10) {
    const ini = Math.max(0, centro - extra)
    const fin = Math.min(texto.length, centro + largoInicial + extra)
    const ancla = texto.slice(ini, fin)
    let cuenta = 0, desde = 0, k
    while ((k = texto.indexOf(ancla, desde)) !== -1) { cuenta++; desde = k + 1; if (cuenta > 1) break }
    if (cuenta === 1) return { ancla, ini, fin }
  }
  return null
}

// EQUIVALENTES declaradas a mano, CON SU MOTIVO. Una mutación equivalente no
// puede cambiar ninguna salida posible, así que no es un hueco de cobertura —
// pero se cuenta APARTE y nunca se suma a las detectadas. La lista es explícita
// justamente para que no crezca sola y tape un hueco de verdad.
const EQUIVALENTES = [{
  expr: "escCob(ch.tipo === 'diferido' ? 'Diferido' : 'Común')",
  motivo: "las dos ramas son literales del código sin ningún carácter escapable: escCob('Diferido') === 'Diferido' y escCob('Común') === 'Común', así que la página sale idéntica",
}]

const mutaciones = []
const ambiguas = []
for (const x of objetivo) {
  // Posición exacta de esta interpolación en el fuente.
  const aguja = '${' + x.expr + '}'
  // Puede haber muchas iguales: se ubica por línea.
  const lineas = src.split('\n')
  const offsetLinea = lineas.slice(0, x.linea - 1).join('\n').length + (x.linea > 1 ? 1 : 0)
  const idx = src.indexOf(aguja, Math.max(0, offsetLinea - 200))
  if (idx === -1) { ambiguas.push(`línea ${x.linea}: no se encontró «${aguja.slice(0, 50)}»`); continue }

  const u = anclaUnica(src, idx, aguja.length)
  if (!u) { ambiguas.push(`línea ${x.linea}: no se consiguió un ancla única para «${aguja.slice(0, 50)}»`); continue }

  const sinEsc = x.expr.trim().replace(/^escCob\(/, '').replace(/\)$/, '')
  const reemplazo = u.ancla.replace(aguja, '${' + sinEsc + '}')
  const equivalente = EQUIVALENTES.some(e => e.expr === x.expr.trim().replace(/\s+/g, ' '))
  mutaciones.push({
    nombre: `línea ${x.linea}: sacar escCob de ${x.expr.trim().replace(/\s+/g, ' ').slice(0, 60)}`,
    ancla: u.ancla, reemplazo, equivalente,
  })
}

// Los .map(escCob) también se mutan.
for (const m of ['cambios.map(escCob).join', 'errores.map(escCob).join', 'todo.map(escCob).join']) {
  const veces = src.split(m).length - 1
  if (veces !== 1) { ambiguas.push(`«${m}» aparece ${veces} veces`); continue }
  mutaciones.push({
    nombre: `sacar el escCob de ${m}`,
    ancla: m, reemplazo: m.replace('.map(escCob)', ''),
  })
}

// Mutaciones de COMPORTAMIENTO: no sacan un escape, rompen una regla de un
// render. Cada ancla tiene que ser ÚNICA en el archivo; si no, se aborta.
const COMPORTAMIENTO = [
  ['pie: el caso CMC-7 muestra el desglose como si se hubiera leído',
    "if (c.completado_desde_cmc7) return '<div class=\"cob-campo__ayuda\">", "if (false) return '<div class=\"cob-campo__ayuda\">"],
  ['pie: el desglose guarda el número pegado a su dígito',
    'Se guarda ${escCob(d.slice(0, largo - 1))}', 'Se guarda ${escCob(d)}'],
  ['pie: un renglón corto también muestra el desglose',
    "if (est !== 'ok') return ''", "if (est !== 'ok' && est !== 'corto') return ''"],
  ['pie: un renglón que no cierra no avisa',
    "if (est === 'mal') return '<div class=\"cob-campo__error\">", "if (false) return '<div class=\"cob-campo__error\">"],
  ['renglones: el prellenado vuelve a pegar el número a su dígito',
    "return `${partes.join('-')} ${dv}`", "return `${partes.join('')}${dv}`"],
  ['renglones: un renglón sin dígito se prellena a medias',
    "if (dv === null || dv === undefined || dv === '') return ''", "if (dv === null) return ''"],
  // Vista de cheques
  ['cheques: un texto sin dígitos ("%") deja de dar cero resultados',
    'if (!d) {', 'if (false) {'],
  ['cheques: el like se arma con el texto CRUDO',
    "q = q.like('numero', `%${fn.digitos}%`)", "q = q.like('numero', `%${f.numero}%`)"],
  ['cheques: 9 dígitos deja de tomarse como número + dígito de control',
    'if (d.length === 9) {', 'if (d.length === 10) {'],
  ['cheques: más de 9 dígitos se recorta en vez de no filtrar',
    "modo: 'demasiado', digitos: ''", "modo: 'exacto', digitos: d.slice(0, 8)"],
  ['cheques: "salidos" deja afuera a los endosados',
    "q.in('estado', ['depositado', 'endosado'])", "q.in('estado', ['depositado'])"],
  ['cheques: "todos" deja afuera a los anulados',
    "// 'todos': sin filtro de estado,", "else q = q.neq('estado', 'anulado') // 'todos': sin filtro de estado,"],
  ['cheques: el orden usa la emisión también en los diferidos',
    "return ch.tipo === 'diferido' && esFechaIso(ch.fecha_pago) ? ch.fecha_pago : ch.fecha_emision", 'return ch.fecha_emision'],
  ['cheques: el total de cartera suma también los salidos',
    "if (ch.estado !== 'en_cartera') continue", "if (ch.estado === 'anulado') continue"],
  ['cheques: el total se suma en pesos y no en centavos',
    'centavos += Math.round(Number(ch.importe) * 100)', 'centavos += Number(ch.importe) * 100'],
  ['cheques: un total que no se pudo calcular se muestra como cero',
    "estado.cheques.cartera = null", "estado.cheques.cartera = { cantidad: 0, total: 0 }"],
  ['cheques: el total no aclara que no sigue a los filtros',
    "if (conFiltros) notas.push(", "if (false) notas.push("],
  ['cheques: la lista de bancos sale de los cheques filtrados',
    "const codigos = [...new Set(filas.map(x => String(x.banco_codigo ?? '')).filter(Boolean))]",
    "const codigos = [...new Set(filas.filter(x => estado.cheques.filtros.estado !== 'salidos' || x.estado !== 'en_cartera').filter(x => x.estado !== 'anulado').map(x => String(x.banco_codigo ?? '')).filter(Boolean))]"],
  ['cheques: el banco elegido desaparece del selector',
    'if (elegido && !codigos.includes(elegido)) codigos.push(elegido)', ''],
  ['cheques: limpiar no borra el banco del campo',
    "document.getElementById('cob-filtro-banco').value = ''", ''],
  ['cheques: limpiar no borra el número del estado',
    'estado.cheques.filtros = { ...FILTROS_CHEQUES_DEFECTO }', "estado.cheques.filtros = { ...FILTROS_CHEQUES_DEFECTO, numero: estado.cheques.filtros.numero }"],
  ['cheques: limpiar no vuelve a consultar',
    "document.getElementById('cob-filtro-banco').value = ''\n      cargarCheques()", "document.getElementById('cob-filtro-banco').value = ''"],
  ['cheques: el botón de limpiar se dibuja siempre',
    "document.getElementById('cob-btn-limpiar-cheques').hidden = !hayFiltrosCheques()", "document.getElementById('cob-btn-limpiar-cheques').hidden = false"],
  ['cheques: un común muestra la fecha de pago vacía en vez de "A la vista"',
    "formatearFechaCob(ch.fecha_pago) : 'A la vista'\n      const etiqueta", "formatearFechaCob(ch.fecha_pago) : formatearFechaCob(ch.fecha_pago)\n      const etiqueta"],
  ['3.3: la tarjeta de un común deja vacía la columna "Paga el"',
    "diferido ? formatearFechaCob(ch.fecha_pago) : 'A la vista')", "diferido ? formatearFechaCob(ch.fecha_pago) : '')"],
  ['3.3: un diferido deja de decir cuántos días faltan',
    "const dias = diferido ? textoDiasHastaPago(ch.fecha_pago, hoy) : ''", "const dias = ''"],
  ['3.3: una fecha no válida inventa días',
    "      if (n === null) return ''\n      if (n > 1)", "      if (n > 1)"],
  ['3.3: el pasado se dice como futuro',
    "return `desde hace ${-n} días`", "return `en ${n} días`"],
  ['3.3: mañana se dice "en 1 días"',
    "if (n === 1) return 'mañana'", "if (n === 1) return `en ${n} días`"],
  ['3.3: el importe del cheque vuelve al color del módulo',
    "      letter-spacing: -0.01em;\n      font-variant-numeric: tabular-nums;\n      color: var(--color-texto);",
    "      letter-spacing: -0.01em;\n      font-variant-numeric: tabular-nums;\n      color: var(--naranja-oscuro);"],
  ['3.3: los inputs de renglón vuelven a quedar sin estilo de campo',
    "    .cob-campo textarea,\n    .cob-renglon input,\n    .cob-titular input {", "    .cob-campo textarea {"],
  ['3.3: el foco pisa el verde del renglón',
    "    .cob-renglon--ok input,\n    .cob-renglon--ok input:focus { border-color: var(--verde); }", "    .cob-renglon--ok input { border-color: var(--verde); }"],
  ['3.3: "En cartera" vuelve al naranja suave',
    ".cob-estado--en_cartera { background: var(--color-superficie); color: var(--color-acento); }", ".cob-estado--en_cartera { background: var(--naranja-suave); color: var(--naranja-oscuro); }"],
  ['3.3: la plegada pierde el botón Ver la foto',
    '<button type="button" class="cob-btn cob-btn--chico" data-mini="${escCob(ch.id)}">Ver la foto</button>', ''],
  ['3.3: el detalle pone la cuenta arriba y no al pie',
    '<div class="cob-cheque__pie">${escCob(nombreBanco(ch.banco_codigo))} · cuenta', '<div class="cob-cheque__sub">${escCob(nombreBanco(ch.banco_codigo))} · cuenta'],
  ['cheques: un depositado no se atenúa',
    "const salido = ch.estado === 'depositado' || ch.estado === 'endosado'\n      // Un cheque común", "const salido = ch.estado === 'endosado'\n      // Un cheque común"],
  ['detalle: un depositado no muestra su salida',
    "const salido = ch.estado === 'depositado' || ch.estado === 'endosado'\n      const porQuien", "const salido = ch.estado === 'endosado'\n      const porQuien"],
  ['3.2: el total de la fila vuelve al color del módulo',
    'Tinta neutra. */\n    .cob-fila__total {\n      font-size: 1.125rem;\n      font-weight: 700;\n      color: var(--color-texto);',
    'Tinta neutra. */\n    .cob-fila__total {\n      font-size: 1.125rem;\n      font-weight: 700;\n      color: var(--naranja-oscuro);'],
  ['3.2: el total de la cartera vuelve al color del módulo',
    'nunca el color del módulo. */\n    .cob-cartera__v {\n      font-size: 1.375rem;\n      font-weight: 700;\n      color: var(--color-texto);',
    'nunca el color del módulo. */\n    .cob-cartera__v {\n      font-size: 1.375rem;\n      font-weight: 700;\n      color: var(--naranja-oscuro);'],
  ['3.2: la fila pierde la clase de su estado',
    'cob-fila cob-fila--${escCob(c.estado)}', 'cob-fila'],
  ['3.2: el estado de la fila vuelve a ser chip',
    'cob-fila__estado cob-fila__estado--${escCob(c.estado)}', 'cob-estado cob-estado--${escCob(c.estado)}'],
  ['3.2: la cantidad de cheques pierde su span',
    '<span class="cob-fila__cheques">', '<span>'],
  ['3.2: sin franja naranja en lo registrado',
    '.cob-fila--registrada { border-left-color: var(--naranja); }', '.cob-fila--registrada { border-left-color: transparent; }'],
  ['3.2: el segmentado dice aria-pressed en todas',
    'aria-pressed="${estado.filtros.estado === e.id ? \'true\' : \'false\'}"', 'aria-pressed="true"'],
  ['3.2: el filtro de cheques vuelve a ser chip',
    'class="cob-segmento__opcion ${f.estado === e.id', 'class="cob-chip ${f.estado === e.id'],
  ['3.2: el segmentado baja de 44px',
    '      min-height: 44px;\n      padding: 0 0.5rem;', '      min-height: 34px;\n      padding: 0 0.5rem;'],
  ['cheques: la columna del número deja de ser fija',
    'position: sticky;', 'position: static;'],
  ['cheques: la tabla deja de scrollear en su caja',
    'overflow-x: auto;\n      -webkit-overflow-scrolling: touch;', 'overflow-x: visible;\n      -webkit-overflow-scrolling: touch;'],
  ['cheques: los salidos se atenúan con opacity',
    '.cob-tabla__fila--salido td { color: var(--color-texto-suave); }', '.cob-tabla__fila--salido td { opacity: 0.55; }'],
  ['cheques: con error se muestra además el "no hay cheques"',
    'vacio.hidden = !!c.error', 'vacio.hidden = false'],
  // Salida de cheques
  ['salida: los botones aparecen sin la tarea procesar',
    "if (!puedeProcesar()) return ''\n      if (ch.estado === 'en_cartera'", "if (ch.estado === 'en_cartera'"],
  ['salida: "Salió" aparece aunque la cobranza no esté procesada',
    "ch.estado === 'en_cartera' && cob?.estado === 'procesada'", "ch.estado === 'en_cartera'"],
  ['salida: un endosado sin destino pasa',
    "if (tipo === 'endosado' && !d)", "if (false && !d)"],
  ['salida: una fecha futura pasa',
    'if (diasEntre(hoy, fecha) > 0)', 'if (false)'],
  ['salida: una fecha anterior a la cobranza pasa',
    'diasEntre(fechaCobranza, fecha) < 0', 'false'],
  ['salida: el tope del destino se corre en uno',
    'if (d.length > LARGO_MAXIMO_DESTINO)', 'if (d.length > LARGO_MAXIMO_DESTINO + 1)'],
  ['salida: el destino viaja crudo (vacío como "")',
    'p_destino: textoOpcional(destino)', 'p_destino: destino'],
  ['salida: con errores locales igual llama a la base',
    "if (errores.length) {\n        err.textContent = errores.join(' ')", "if (false) {\n        err.textContent = errores.join(' ')"],
  ['salida: el error de la base se tapa con un genérico',
    "err.textContent = e?.message || 'No se pudo marcar la salida del cheque.'", "err.textContent = 'No se pudo marcar la salida del cheque.'"],
  ['salida: al salir bien el diálogo queda abierto',
    "cerrarModalSalida()\n        mostrarExito(datos.tipo", "mostrarExito(datos.tipo"],
  ['salida: al salir bien no se recarga la tabla',
    "Cheque marcado como depositado.')\n        await refrescarListado()", "Cheque marcado como depositado.')"],
  ['salida: la fecha no arranca en hoy',
    "fecha.value = hoyArgentina()", "fecha.value = ''"],
  ['salida: la fecha deja de tener mínimo',
    "fecha.min = esFechaIso(cob?.fecha) ? cob.fecha : ''", "fecha.min = ''"],
  ['salida: la pregunta del destino se da vuelta',
    "s.tipo === 'endosado' ? '¿A quién se lo pasaste?'", "s.tipo === 'depositado' ? '¿A quién se lo pasaste?'"],
  ['volver: el error de la base se tapa con un genérico',
    "mostrarError(e?.message || 'No se pudo volver el cheque a cartera.')", "mostrarError('No se pudo volver el cheque a cartera.')"],
  ['volver: llama sin el motivo',
    "{ p_cheque_id: ch.id, p_motivo: motivo }", "{ p_cheque_id: ch.id, p_motivo: '' }"],
  ['error de la base: anular lo tapa con un genérico',
    "mostrarError(err?.message || 'No se pudo completar la acción.')", "mostrarError('No se pudo completar la acción.')"],
  ['error de la base: editar lo tapa con un genérico (en el guardado)',
    'err.textContent = resultado.mensaje', "err.textContent = 'No se pudo guardar.'"],
  ['error de la base: editar lo tapa con un genérico (en la subida)',
    "mensaje: error.message || 'El servidor rechazó la cobranza.'", "mensaje: 'El servidor rechazó la cobranza.'"],
  ['detalle: no avisa que hay cheques afuera',
    'const haySalidos = !anulada && ', 'const haySalidos = false && '],
  ['detalle: el estado del cheque no se muestra',
    "salido ? ` ${escCob(textoSalidaCheque(ch.estado, ch.salida_fecha, ch.salida_destino))}` : ''", "''"],
  ['historial: la salida de un cheque se muestra con la clave cruda',
    "cheque_salida: 'Salida de un cheque', ", ''],
  ['historial: la vuelta a cartera lee el dato del lado equivocado',
    "(h.accion === 'cheque_salida' ? h.despues : h.antes)", 'h.despues'],
]
for (const [nombre, ancla, reemplazo] of COMPORTAMIENTO) {
  const veces = src.split(ancla).length - 1
  if (veces !== 1) { ambiguas.push(`«${nombre}»: el ancla aparece ${veces} veces`); continue }
  mutaciones.push({ nombre, ancla, reemplazo })
}

if (ambiguas.length) {
  console.log('\nMUTACIONES ABORTADAS POR AMBIGÜEDAD (no se reportan como huecos de cobertura):')
  for (const a of ambiguas) console.log('  · ' + a)
}

// ── Correr ────────────────────────────────────────────────────────────────
let detectadas = 0
const escapadas = [], equivalentes = []
for (const m of mutaciones) {
  const mutado = src.replace(m.ancla, m.reemplazo)
  if (mutado === src) { console.log('ERROR DEL TEST: la mutación no cambió nada → ' + m.nombre); process.exit(3) }
  fs.writeFileSync(TMP, mutado)
  const r = correr(TMP)
  // El sub-proceso dice cuántos bytes leyó: así se sabe que leyó el MUTADO.
  const bytes = Number((r.salida.match(/\((\d+) bytes\)/) || [])[1] || 0)
  if (bytes !== mutado.length) {
    console.log(`ERROR DEL TEST: el sub-proceso leyó ${bytes} caracteres y el mutado tiene ${mutado.length} → ${m.nombre}`)
    process.exit(4)
  }
  if (m.equivalente) { equivalentes.push(m.nombre); continue }
  if (r.rojo) detectadas++
  else escapadas.push(m.nombre)
}

fs.existsSync(TMP) && fs.unlinkSync(TMP)
const reales = mutaciones.length - equivalentes.length
console.log(`\nMUTACIONES${SOLO ? ' (SOLO=' + SOLO + ')' : ''}: ${detectadas}/${reales} detectadas` +
  (equivalentes.length ? `, más ${equivalentes.length} EQUIVALENTES contadas aparte` : ''))
for (const e of equivalentes) console.log('  equivalente → ' + e)
if (equivalentes.length) for (const m of EQUIVALENTES) console.log('     motivo: ' + m.motivo)
for (const e of escapadas) console.log('  ESCAPÓ → ' + e)
