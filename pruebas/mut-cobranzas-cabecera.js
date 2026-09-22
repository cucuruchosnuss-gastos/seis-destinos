// Mutaciones de test-cobranzas-cabecera.js. Ver mutar.js.
//
//   node pruebas/mut-cobranzas-cabecera.js
//
// Sin automáticas: los escCob() de htmlResumen y de la tarjeta compacta los
// sacan mut-cobranzas-xss.js (todas las interpolaciones del archivo) y los
// detecta el chequeo estático de test-cobranzas-xss.js. Las de acá rompen, de
// a una, cada garantía de los nombres de estado, las cifras de cabecera y la
// tarjeta compacta. La franja y aria-current de la fila elegida están en
// mut-cobranzas-escritorio.js.

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-cobranzas-cabecera.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cobranzas.html'),
  funciones: [],
  escape: 'escCob',
  manuales: [
    // ── Nombres en pantalla ──────────────────────────────────────────────────
    { nombre: 'la fila vuelve a decir "Registrada"',
      de: "const ETIQUETA_ESTADO_COBRANZA = { registrada: 'Por controlar',", a: "const ETIQUETA_ESTADO_COBRANZA = { registrada: 'Registrada'," },
    { nombre: 'la fila vuelve a decir "Procesada"',
      de: "procesada: 'Asentada', anulada: 'Anulada' }", a: "procesada: 'Procesada', anulada: 'Anulada' }" },
    { nombre: 'el segmentado vuelve a decir "Procesadas"',
      de: "{ id: 'procesada', nombre: 'Asentadas' },", a: "{ id: 'procesada', nombre: 'Procesadas' }," },
    { nombre: 'el segmentado vuelve a decir "Registradas"',
      de: "{ id: 'registrada', nombre: 'Por controlar' },", a: "{ id: 'registrada', nombre: 'Registradas' }," },
    { nombre: 'el segmentado vuelve a arrancar por "Todas"',
      de: "      { id: 'anulada', nombre: 'Anuladas' },\n      { id: '', nombre: 'Todas' },\n",
      a: "      { id: 'anulada', nombre: 'Anuladas' },\n" },
    { nombre: 'el botón vuelve a decir "Marcar como procesada"',
      de: 'id="cob-btn-procesar">Controlada, asentar</button>', a: 'id="cob-btn-procesar">Marcar como procesada</button>' },
    { nombre: 'el historial vuelve a decir "Procesada"',
      de: "alta: 'Alta', edicion: 'Edición', procesada: 'Asentada',", a: "alta: 'Alta', edicion: 'Edición', procesada: 'Procesada'," },
    { nombre: 'el detalle vuelve a decir "Procesada por"',
      de: "datos.push(['Asentada por', c.procesada_por_nombre])", a: "datos.push(['Procesada por', c.procesada_por_nombre])" },
    { nombre: 'el mensaje de éxito vuelve a decir "procesada"',
      de: "'Cobranza asentada.'", a: "'Cobranza marcada como procesada.'" },
    { nombre: 'un mensaje de fotos vuelve a decir "procesar"',
      de: "mostrarError('No se pudo preparar una de las fotos.')", a: "mostrarError('No se pudo procesar una de las fotos.')" },
    // ── Valores que viajan a la base: tienen que seguir siendo los de la base
    { nombre: 'el segmento manda "asentada" (la base no lo conoce)',
      de: "{ id: 'procesada', nombre: 'Asentadas' },", a: "{ id: 'asentada', nombre: 'Asentadas' }," },
    { nombre: 'el segmento manda "por_controlar" (la base no lo conoce)',
      de: "{ id: 'registrada', nombre: 'Por controlar' },", a: "{ id: 'por_controlar', nombre: 'Por controlar' }," },
    { nombre: 'asentar vuelve a la RPC vieja, sin unidad (22/09/2026)',
      de: "accionSimple('marcar_cobranza_asentada',", a: "accionSimple('marcar_cobranza_procesada'," },
    // "Salió" se mudó a cheques.html (22/09/2026): su mutación vive allá.
    { nombre: 'el detalle vuelve a tener un botón de salida',
      de: '            ${htmlLinkChequeEnCartera(ch)}\n', a: '            ${htmlLinkChequeEnCartera(ch)}<button type="button" data-salio="${escCob(ch.id)}">Salió</button>\n' },
    // ── Cifras de cabecera ───────────────────────────────────────────────────
    { nombre: 'al fallar muestra $0 en vez de "No se pudo calcular"',
      de: '        resultado = { ...meta, error: true }', a: '        resultado = { ...meta, porControlar: 0, cantidad: 0, total: 0 }' },
    { nombre: 'no se recalcula al cambiar un filtro ni tras asentar (sin la llamada en cargarCobranzas)',
      de: '        estado.cobranzas = []\n        cargarResumen()\n', a: '        estado.cobranzas = []\n' },
    { nombre: 'no se recalcula tras asentar / reabrir / anular (accionSimple sin refrescar)',
      de: '        await abrirDetalle(params.p_id)\n        await refrescarListado()',
      a: '        await abrirDetalle(params.p_id)' },
    { nombre: '"Cargar más" también recalcula',
      de: '      if (reiniciar) {\n        estado.cobranzas = []\n        cargarResumen()\n      }',
      a: '      cargarResumen()\n      if (reiniciar) {\n        estado.cobranzas = []\n      }' },
    { nombre: 'ignora el filtro de fecha desde',
      de: '        p_desde: desde,\n', a: '        p_desde: null,\n' },
    { nombre: 'ignora el filtro de fecha hasta',
      de: '        p_hasta: hasta,\n', a: '        p_hasta: null,\n' },
    { nombre: 'ignora el filtro de cliente',
      de: '        p_clave: normalizarCliente(f.texto),', a: '        p_clave: null,' },
    { nombre: 'manda el texto del cliente sin normalizar',
      de: '        p_clave: normalizarCliente(f.texto),', a: '        p_clave: f.texto || null,' },
    { nombre: 'ignora el filtro de repartidor',
      de: '        p_repartidor: f.repartidor || null,', a: '        p_repartidor: null,' },
    { nombre: 'ignora el filtro de estado',
      de: '        p_estado: f.estado || null,', a: '        p_estado: null,' },
    { nombre: 'sin fecha, el total no se acota al mes',
      de: "        total: conFecha ? null : { ...base, p_desde: inicioMes, p_hasta: hoy },", a: '        total: null,' },
    { nombre: 'el mes empieza mal (día 1 perdido)',
      de: "      const inicioMes = `${String(hoy).slice(0, 7)}-01`", a: "      const inicioMes = `${String(hoy).slice(0, 7)}-02`" },
    { nombre: '"por controlar" sale de la consulta del MES',
      de: '        const a = fila(rs[0])', a: '        const a = fila(rs[rs.length - 1])' },
    { nombre: 'la etiqueta dice "Total del período" sin filtro de fecha',
      de: "        etiqueta: conFecha ? 'Total del período' : 'Total del mes',", a: "        etiqueta: 'Total del período'," },
    { nombre: 'muestra el número viejo mientras carga',
      de: '      estado.resumen = { ...meta, cargando: true }\n      pintarResumen()\n', a: '' },
    { nombre: 'muestra el número viejo mientras carga (solo sin repintar)',
      de: '      estado.resumen = { ...meta, cargando: true }\n      pintarResumen()\n', a: '      estado.resumen = { ...meta, cargando: true }\n' },
    { nombre: 'una respuesta vieja pisa a la nueva (sin el turno)',
      de: '      if (turno !== turnoResumen) return\n      estado.resumen = resultado', a: '      estado.resumen = resultado' },
    { nombre: 'con "Anuladas" muestra $ 0,00',
      de: "      if (r.estadoFiltro === 'anulada') {", a: '      if (false) {' },
    { nombre: 'un total null termina en "$ 0,00"',
      de: '      if (total === null || cantidad === null) {', a: '      if (cantidad === null) {' },
    { nombre: 'numeroDeResumen convierte null en 0',
      de: "      if (v === null || v === undefined || v === '') return null\n      const n = Number(v)",
      a: '      const n = Number(v)' },
    // (Sacar solo el throw de "sin filas" es EQUIVALENTE: a.por_controlar
    // sobre null tira igual y cae al mismo catch. Por eso la mutación rellena
    // la fila faltante con ceros, que es el error que ese guard existe para
    // no cometer.)
    { nombre: 'sin filas, en vez de "No se pudo calcular" muestra ceros',
      de: '        const fila = (r) => (Array.isArray(r.data) ? r.data[0] : r.data) ?? null',
      a: '        const fila = (r) => (Array.isArray(r.data) ? r.data[0] : r.data) ?? { por_controlar: 0, cantidad: 0, total: 0 }' },
    { nombre: 'se consulta con la RPC equivocada',
      de: "        const llamadas = [supabase.rpc('resumen_cobranzas', p.base)]", a: "        const llamadas = [supabase.rpc('resumen_cobranza', p.base)]" },
    // ── Tarjeta compacta ─────────────────────────────────────────────────────
    { nombre: 'el banco pierde el title con el nombre completo',
      de: ' title="${escCob(bancoCompleto)}"', a: '' },
    { nombre: 'el title del banco pierde la cuenta',
      de: "        const bancoCompleto = `${banco} · cuenta ${ch.cuenta ?? '—'}`", a: '        const bancoCompleto = banco' },
    { nombre: 'la foto ya no se abre desde el cheque (sin data-mini)',
      de: '<button type="button" class="cob-cheque-fila__info" data-mini="${escCob(ch.id)}"', a: '<button type="button" class="cob-cheque-fila__info"' },
    { nombre: 'un común dice "paga —" en vez de "a la vista"',
      de: "const cuando = diferido ? `paga ${formatearFechaCob(ch.fecha_pago).slice(0, 5)}` : 'a la vista'",
      a: "const cuando = `paga ${formatearFechaCob(ch.fecha_pago).slice(0, 5)}`" },
    { nombre: 'la fecha de pago sale con el año',
      de: "`paga ${formatearFechaCob(ch.fecha_pago).slice(0, 5)}`", a: '`paga ${formatearFechaCob(ch.fecha_pago)}`' },
    { nombre: 'la fila deja de tener 72px',
      de: '      min-height: 72px;\n      padding: 0.375rem 0.5rem 0.375rem 0.75rem;', a: '      padding: 0.375rem 0.5rem 0.375rem 0.75rem;' },
    { nombre: 'Editar y Quitar quedan en 40px',
      de: '.cob-cheque-fila__acciones .cob-btn { min-height: 44px; min-width: 44px;', a: '.cob-cheque-fila__acciones .cob-btn { min-width: 44px;' },
    { nombre: 'el banco no se corta con puntos suspensivos',
      de: '      overflow: hidden;\n      text-overflow: ellipsis;\n      white-space: nowrap;\n    }\n    .cob-cheque-fila__monto {',
      a: '      white-space: nowrap;\n    }\n    .cob-cheque-fila__monto {' },
    { nombre: 'el aria-label no dice que está confirmado',
      de: '        const leido = `Cheque confirmado de', a: '        const leido = `Cheque de' },
  ],
})
