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

const { correrMutacionesComun } = require('./mutar-cobranzas-comun')

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

// ── Las funciones que viven en js/cobranzas-comun.js (22/09/2026) ─────────
// El detalle las usa para mostrar el estado de cada cheque y el banco.
correrMutacionesComun({
  suite: path.join(__dirname, 'test-cobranzas-xss.js'),
  manuales: [
    { nombre: 'común: un banco fuera del catálogo pierde su número', de: '`Banco ${codigo} (no está en el catálogo)`', a: "'Banco (no está en el catálogo)'" },
    { nombre: 'común: el endoso pierde a quién', de: "`Endosado${cuando}${d ? ` a ${d}` : ''}`", a: '`Endosado${cuando}`' },
    { nombre: 'común: el depósito pierde la fecha', de: "if (estadoCheque === 'depositado') return `Depositado${cuando}", a: "if (estadoCheque === 'depositado') return `Depositado" },
    { nombre: 'común: "En cartera" se muestra con la clave cruda', de: "en_cartera: 'En cartera',", a: "en_cartera: 'en_cartera'," },
    { nombre: 'común: la fecha sale al revés', de: 'return `${d}/${m}/${a}`', a: 'return `${a}/${m}/${d}`' },
  ],
})

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
  ['pie: el caso CMC-7 vuelve a afirmar que el renglón lo calculó el sistema (texto viejo)',
    "Puede que este renglón no se haya leído del papel: en este cheque el sistema completó datos desde la banda magnética y calculó su dígito. Comparalo con lo impreso.", "Este dígito lo calculó el sistema desde la banda magnética: no se leyó del papel. Contralo contra el cheque."],
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
  ['3.4: el aviso grave pasa a verse neutro',
    '.cob-aviso--grave { background: var(--bordo-suave); border-left-color: var(--bordo); color: var(--bordo-oscuro); font-weight: 600; }', '.cob-aviso--grave { font-weight: 600; }'],
  ['3.4: el aviso base vuelve a una franja de color de módulo',
    '      border-left: 4px solid var(--color-texto-suave);\n    }', '      border-left: 4px solid var(--naranja);\n    }'],
  ['3.4: letras distintas de números deja de ser grave',
    '`<div class="cob-aviso cob-aviso--grave">En letras dice ', '`<div class="cob-aviso">En letras dice '],
  ['3.4: un CUIT inválido deja de ser grave',
    "'<div class=\"cob-aviso cob-aviso--grave\">Algún CUIT", "'<div class=\"cob-aviso\">Algún CUIT"],
  ['3.4: el error del lector se pinta como dato mal',
    '        return `<div class="cob-aviso">Foto ${i + 1}: ${escCob(foto.error)}</div>`', '        return `<div class="cob-aviso cob-aviso--grave">Foto ${i + 1}: ${escCob(foto.error)}</div>`'],
  ['3.4: el cheque repetido deja de ser grave',
    "ch.duplicado.nivel === 'completo' ? 'cob-aviso--grave' : ''", "ch.duplicado.nivel === 'completo' ? '' : ''"],
  ['3.4: la lista de errores de la tarjeta deja de ser grave',
    '`<div class="cob-aviso cob-aviso--grave">${errores.map(', '`<div class="cob-aviso">${errores.map('],
  ['3.4: lo que falta para guardar se pinta como grave',
    "      caja.className = 'cob-aviso'", "      caja.className = motivos.length ? 'cob-aviso cob-aviso--grave' : 'cob-aviso'"],
  ['3.4: el total de la barra de carga vuelve al color del módulo',
    '      font-weight: 800;\n      font-variant-numeric: tabular-nums;\n      color: var(--color-texto);', '      font-weight: 800;\n      font-variant-numeric: tabular-nums;\n      color: var(--naranja-oscuro);'],
  ['3.4: Endosado vuelve a un color propio',
    '.cob-estado--endosado { background: var(--color-superficie); color: var(--color-texto-suave); }', '.cob-estado--endosado { background: var(--naranja-suave); color: var(--naranja-oscuro); }'],
  ['3.4: el motivo de la anulada deja de ser grave',
    '<div class="cob-aviso cob-aviso--grave" style="margin-top:.625rem">Anulada: ', '<div class="cob-aviso" style="margin-top:.625rem">Anulada: '],
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
  // (Antes decía "la plegada" con un ancla que ya no existía desde la tarjeta
  // compacta del 21/09/2026: el runner la salteaba en silencio. 22/09/2026.)
  ['3.3: la tarjeta abierta pierde el botón Ver la foto',
    '<button type="button" class="cob-btn cob-btn--chico cob-cheque__verfoto" data-mini="${escCob(ch.id)}">Ver la foto</button>', ''],
  ['3.3: el detalle pone la cuenta arriba y no al pie',
    '<div class="cob-cheque__pie">${escCob(nombreBanco(ch.banco_codigo))} · cuenta', '<div class="cob-cheque__sub">${escCob(nombreBanco(ch.banco_codigo))} · cuenta'],
  ['detalle: un depositado no muestra su salida',
    "const salido = ch.estado === 'depositado' || ch.estado === 'endosado'\n      const porQuien", "const salido = ch.estado === 'endosado'\n      const porQuien"],
  ['3.2: el total de la fila vuelve al color del módulo',
    'Tinta neutra. */\n    .cob-fila__total {\n      font-size: 1.125rem;\n      font-weight: 700;\n      color: var(--color-texto);',
    'Tinta neutra. */\n    .cob-fila__total {\n      font-size: 1.125rem;\n      font-weight: 700;\n      color: var(--naranja-oscuro);'],
  ['3.2: la fila pierde la clase de su estado',
    'cob-fila cob-fila--${escCob(c.estado)}', 'cob-fila'],
  ['3.2: el estado de la fila vuelve a ser chip',
    // Con la comilla delante: desde el rediseño 3.5 la celda de escritorio
    // también lleva cob-fila__estado (detrás de cob-celda), y sin la comilla
    // el texto deja de ser único.
    'class="cob-fila__estado cob-fila__estado--${escCob(c.estado)}"', 'class="cob-estado cob-estado--${escCob(c.estado)}"'],
  ['3.2: la cantidad de cheques pierde su span',
    '<span class="cob-fila__cheques">', '<span>'],
  // Con el salto de línea y la sangría: la regla de escritorio
  // (.cob-maestro--activo .cob-fila--registrada) tiene el mismo texto, y sin
  // esto el ancla no era única y el runner la salteaba (22/09/2026).
  ['3.2: sin franja naranja en lo registrado',
    '\n    .cob-fila--registrada { border-left-color: var(--naranja); }', '\n    .cob-fila--registrada { border-left-color: transparent; }'],
  ['3.2: el segmentado dice aria-pressed en todas',
    'aria-pressed="${estado.filtros.estado === e.id ? \'true\' : \'false\'}"', 'aria-pressed="true"'],
  ['3.2: el segmentado baja de 44px',
    '      min-height: 44px;\n      padding: 0 0.5rem;', '      min-height: 34px;\n      padding: 0 0.5rem;'],
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
  // ── Accesos a la cartera y link directo (22/09/2026) ──────────────────────
  ['volver=: se acepta cualquier protocolo del mismo origen (blob:)',
    'if (!/^https?:$/.test(destino.protocol) || destino.origin !== origen) return null', 'if (destino.origin !== origen) return null'],
  ['volver=: se acepta otro origen',
    'if (!/^https?:$/.test(destino.protocol) || destino.origin !== origen) return null', 'if (!/^https?:$/.test(destino.protocol)) return null'],
  ['volver=: no se decodifica (el javascript: codificado pasa como relativo)',
    'destino = new URL(decodeURIComponent(crudo), aqui)', 'destino = new URL(crudo, aqui)'],
  ['volver=: se usa tal cual, sin validar',
    '      if (!crudo) return null\n      let destino, origen', '      if (!crudo) return null\n      return crudo\n      let destino, origen'],
  ['volver=: un % roto rompe en vez de ignorarse',
    '      } catch { return null }\n      if (!/^https?:$/', '      } catch { return crudo }\n      if (!/^https?:$/'],
  ['texto: cualquier nombre que TERMINE en cheques.html es la cartera',
    "/(^|\\/)cheques\\.html$/.test(ruta)", "/cheques\\.html$/.test(ruta)"],
  ['texto: el volver a Cheques dice "‹ Volver" a secas',
    "? '‹ Volver a los cheques' : '‹ Volver'", "? '‹ Volver' : '‹ Volver'"],
  ['link: un id que no es uuid se consulta igual',
    'id: UUID_COB.test(crudo) ? crudo.toLowerCase() : null,', 'id: crudo || null,'],
  ['link: el uuid no se normaliza',
    'id: UUID_COB.test(crudo) ? crudo.toLowerCase() : null,', 'id: UUID_COB.test(crudo) ? crudo : null,'],
  ['link: el volver= no se valida',
    "const url = destinoVolver(p.get('volver'), aqui)", "const url = p.get('volver')"],
  ['barra: ?volver queda en la barra',
    "      u.searchParams.delete('volver')\n", ''],
  ['barra: ?cobranza queda en la barra (recargar reabre)',
    "      u.searchParams.delete('cobranza')\n", ''],
  ['abrir: no limpia la barra',
    "        history.replaceState(history.state, '', urlSinLinkDirecto(location.href))\n", ''],
  ['abrir: limpia la barra DESPUÉS de abrir',
    "      estado.linkDirecto = { cobranzaId: link.id, volver: link.volver }\n      abrirDetalle(link.id)",
    "      estado.linkDirecto = { cobranzaId: link.id, volver: link.volver }\n      abrirDetalle(link.id)\n      history.replaceState(history.state, '', urlSinLinkDirecto(location.href))"],
  ['abrir: un id inválido abre igual',
    '      if (!link.id) {\n        mostrarError', '      if (false) {\n        mostrarError'],
  ['abrir: no recuerda a qué cobranza le vale el volver',
    '      estado.linkDirecto = { cobranzaId: link.id, volver: link.volver }\n', ''],
  ['volver: desde la cobranza del link no navega',
    '      if (v) { window.location.href = v.url; return }\n', ''],
  ['init: el link directo no se lee al arrancar',
    '      const link = leerLinkDirecto(location.search, location.href)\n      if (link) abrirLinkDirecto(link)\n', ''],
  ['listener: el botón del detalle vuelve siempre al listado',
    "addEventListener('click', irAtrasDelDetalle)", "addEventListener('click', () => mostrarVistaCob('listado'))"],
  ['acceso: "procesar" no ve la cartera',
    'const puedeVerCartera = () => puedeVerTodo() || puedeProcesar()', 'const puedeVerCartera = () => puedeVerTodo()'],
  ['acceso: todos ven la cartera',
    'const puedeVerCartera = () => puedeVerTodo() || puedeProcesar()', 'const puedeVerCartera = () => true'],
  ['acceso: el link del listado no se pinta al arrancar',
    '      pintarAccesoCheques()\n      mostrarVistaCob', '      mostrarVistaCob'],
  ['acceso: el link del listado sale del listado',
    '      <div class="cob-acceso-cheques" id="cob-acceso-cheques" hidden>', '      <div class="cob-acceso-cheques" id="cob-acceso-cheques">'],
  ['acceso: el link pierde los 44px',
    '      display: inline-flex;\n      align-items: center;\n      min-height: 44px;\n      padding: 0 0.25rem;', '      display: inline-flex;\n      align-items: center;\n      padding: 0 0.25rem;'],
  ['ver en Cheques: el id va crudo',
    'href="cheques.html?cheque=${encodeURIComponent(ch.id)}"', 'href="cheques.html?cheque=${ch.id}"'],
  ['ver en Cheques: el atributo pasa a comillas simples',
    'href="cheques.html?cheque=${encodeURIComponent(ch.id)}">Ver en Cheques</a>', "href='cheques.html?cheque=${encodeURIComponent(ch.id)}'>Ver en Cheques</a>"],
  ['ver en Cheques: se dibuja sin permiso',
    "      if (!puedeVerCartera() || !ch?.id) return ''", "      if (!ch?.id) return ''"],
  ['ver en Cheques: el detalle no lo dibuja',
    '            ${htmlLinkChequeEnCartera(ch)}\n', ''],
  ['aviso: ya no dice que se vuelve desde Cheques',
    'primero hay que volverlos a cartera (desde Cheques).', 'primero hay que volverlos a cartera.'],
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
// Una mutación ambigua o una que escapa es rojo, no un número más chico.
process.exit(escapadas.length || ambiguas.length ? 1 : 0)
