// Mutaciones de test-caja-saldo-corriente.js: rompe cada regla del saldo
// corriente de caja.html, de a una, y exige que la suite se ponga en rojo. Las
// automáticas sacan cada esc() de las funciones nuevas que arman HTML. Ver
// mutar.js (suite verde sobre el limpio, ancla única, la mutación cambia el
// archivo, el sub-proceso leyó el mutado).
//
//   node pruebas/mut-caja-saldo-corriente.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-caja-saldo-corriente.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos', 'caja.html'),
  funciones: ['htmlAvisoSaldoCorriente', 'htmlAperturaSaldo'],
  manuales: [
    // ── El orden ──────────────────────────────────────────────────────────
    { nombre: 'el orden por fecha, al revés',
      de: 'if (fa !== fb) return fa < fb ? -1 : 1', a: 'if (fa !== fb) return fa < fb ? 1 : -1' },
    { nombre: 'sin desempate por created_at',
      de: '      if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return ta < tb ? -1 : 1\n      const ca = String(a.created_at ?? \'\'), cb = String(b.created_at ?? \'\')\n      if (ca !== cb) return ca < cb ? -1 : 1\n', a: '' },
    { nombre: 'el created_at, al revés',
      de: 'ta !== tb) return ta < tb ? -1 : 1', a: 'ta !== tb) return ta < tb ? 1 : -1' },
    { nombre: 'sin desempate por id',
      de: 'return ia < ib ? -1 : ia > ib ? 1 : 0', a: 'return 0' },
    { nombre: 'se acumula en el orden de llegada (sin ordenar)',
      de: 'const orden = [...movs].sort(compararCronologico)', a: 'const orden = [...movs]' },
    // ── Por cuenta ────────────────────────────────────────────────────────
    { nombre: 'todas las cuentas en una sola bolsa',
      de: '        if (!porCuenta.has(m.cuenta_id)) porCuenta.set(m.cuenta_id, [])\n        porCuenta.get(m.cuenta_id).push(m)',
      a: '        if (!porCuenta.has(\'todas\')) porCuenta.set(\'todas\', [])\n        porCuenta.get(\'todas\').push(m)' },
    // ── El signo ──────────────────────────────────────────────────────────
    { nombre: 'solo "ingreso" a secas suma (la devolución resta)',
      de: "return String(m.tipo ?? '').startsWith('ingreso') ? c : -c", a: "return m.tipo === 'ingreso' ? c : -c" },
    { nombre: 'el signo al revés',
      de: "return String(m.tipo ?? '').startsWith('ingreso') ? c : -c", a: "return String(m.tipo ?? '').startsWith('ingreso') ? -c : c" },
    { nombre: 'sin centavos enteros (coma flotante)',
      de: 'return Number.isFinite(n) ? Math.round(n * 100) : null', a: 'return Number.isFinite(n) ? n * 100 : null' },
    { nombre: 'un monto ausente se toma como 0',
      de: "      if (valor === null || valor === undefined || valor === '') return null\n      const n = Number(valor)", a: '      const n = Number(valor)' },
    // ── El color y el "—" ─────────────────────────────────────────────────
    { nombre: 'un saldo negativo, en verde',
      de: "const clase = s < 0 ? 'movimiento__saldo--negativo' : 'movimiento__saldo--positivo'", a: "const clase = 'movimiento__saldo--positivo'" },
    { nombre: 'el cero cuenta como negativo',
      de: "const clase = s < 0 ? 'movimiento__saldo--negativo' : 'movimiento__saldo--positivo'", a: "const clase = s <= 0 ? 'movimiento__saldo--negativo' : 'movimiento__saldo--positivo'" },
    { nombre: 'un negativo pierde el signo',
      de: 'return importeHtml(centavos / 100, moneda)', a: 'return importeHtml(Math.abs(centavos) / 100, moneda)' },
    { nombre: 'un saldo que no se sabe dice "$ 0"',
      de: '      if (s === undefined || s === null) {\n', a: '      if (s === undefined || s === null) {\n        return `<div class="movimiento__saldo movimiento__saldo--positivo">Saldo ${htmlCentavos(0, m.moneda)}</div>`\n' },
    { nombre: 'un movimiento sin cuenta toma un saldo igual',
      de: "(sc.estado === 'listo' && m.cuenta_id) ?", a: "(sc.estado === 'listo') ?" },
    { nombre: 'mientras carga, un número',
      de: "if (sc.estado === 'cargando') return '<div class=\"movimiento__saldo movimiento__saldo--sin\">Saldo …</div>'", a: '' },
    // ── Que el último coincida con la cuenta ──────────────────────────────
    { nombre: 'no se compara con la vista',
      de: 'const cierra = valido && v !== null && v === saldo', a: 'const cierra = valido' },
    { nombre: 'una cuenta que no cierra muestra sus saldos igual',
      de: 'if (cierra) for (const [id, s] of parciales) porMovimiento.set(id, s)', a: 'for (const [id, s] of parciales) porMovimiento.set(id, s)' },
    { nombre: 'el aviso de "no cierra" no se dibuja',
      de: 'const malas = cuentas.map(id => [id, sc.resultado.cuentas.get(id)]).filter(([, c]) => c && !c.cierra)', a: 'const malas = []' },
    { nombre: 'un error se calla',
      de: "      if (sc.estado === 'error') {\n", a: "      if (sc.estado === 'error') return ''\n      if (false) {\n" },
    { nombre: 'incompleto se calla',
      de: "      if (sc.estado !== 'listo') {\n", a: "      if (sc.estado !== 'listo') return ''\n      if (false) {\n" },
    // ── Toda la historia (de a 1000, con el conteo exacto) ────────────────
    { nombre: 'una sola página',
      de: '        if (filas.length >= total || !pag.length) break', a: '        break' },
    { nombre: 'lo leído a medias pasa por completo',
      de: 'return { filas: filas.length === total ? filas : null }', a: 'return { filas }' },
    { nombre: 'sin conteo se supone que está todo',
      de: '        if (total === null) return { filas: null }\n', a: '        if (total === null) total = (data || []).length\n' },
    { nombre: 'la historia sin el conteo',
      de: ".select('id, cuenta_id, tipo, monto, moneda, fecha, created_at', { count: 'exact' })", a: ".select('id, cuenta_id, tipo, monto, moneda, fecha, created_at')" },
    { nombre: 'las páginas se pisan (siempre la primera)',
      de: '        const ini = pagina * PAGINA_HISTORIA_CAJA\n', a: '        const ini = 0\n' },
    { nombre: 'un error de la vista no se dice',
      de: 'if (hist.error || vista.error) return', a: 'if (hist.error) return' },
    // ── El arranque con filtro de fechas ──────────────────────────────────
    { nombre: 'la apertura incluye el primer día del filtro',
      de: 'if (desde && String(m.fecha) < desde) apertura = saldo', a: 'if (desde && String(m.fecha) <= desde) apertura = saldo' },
    { nombre: 'la apertura queda en 0',
      de: 'if (desde && String(m.fecha) < desde) apertura = saldo', a: 'if (false) apertura = saldo' },
    { nombre: 'la apertura de una cuenta que no cierra se muestra igual',
      de: 'apertura: cierra && desde ? apertura : null,', a: 'apertura: desde ? apertura : null,' },
    { nombre: 'el desde es el período que vino primero (no el más viejo)',
      de: 'return periodos.map(p => periodoARango(p).desde).sort()[0] || null', a: 'return periodos.map(p => periodoARango(p).desde)[0] || null' },
    { nombre: 'la ficha de Empresa sin "Saldo al"',
      de: 'await cargarSaldoFicha(turno, desdeDePeriodos(estado.filtrosFichaEmpresa.periodos))', a: 'await cargarSaldoFicha(turno, null)' },
    { nombre: 'Retiros sin "Saldo al"',
      de: "const sc = await leerSaldoCorriente(cuentasDeLista(estado.retiros), fecha_desde || null)", a: 'const sc = await leerSaldoCorriente(cuentasDeLista(estado.retiros), null)' },
    { nombre: 'el "Saldo al" arriba en vez de abajo',
      de: "      cont.innerHTML = htmlAvisoSaldoCorriente(sc, cuentas, deTodasLasCajas) +\n        movimientos.map(m => renderizarFilaMovimiento(m, { conUnidad, mostrarPersona: deTodasLasCajas, saldo: legible(m) ? sc : null })).join('') +\n        htmlAperturaSaldo(sc, cuentas, deTodasLasCajas)",
      a: "      cont.innerHTML = htmlAvisoSaldoCorriente(sc, cuentas, deTodasLasCajas) + htmlAperturaSaldo(sc, cuentas, deTodasLasCajas) +\n        movimientos.map(m => renderizarFilaMovimiento(m, { conUnidad, mostrarPersona: deTodasLasCajas, saldo: legible(m) ? sc : null })).join('')" },
    { nombre: 'la apertura sin poder leer dice un número',
      de: "        let valor = '—'\n", a: "        let valor = '$ 0,00'\n" },
    // ── Cada lista lo pide ────────────────────────────────────────────────
    { nombre: 'la ficha no pasa el saldo a la fila',
      de: "renderizarFilaMovimiento(m, { conUnidad, mostrarPersona: deTodasLasCajas, saldo: legible(m) ? sc : null })", a: "renderizarFilaMovimiento(m, { conUnidad, mostrarPersona: deTodasLasCajas })" },
    // ── Los ajustes de saldo (01/10/2026) ─────────────────────────────────
    { nombre: 'los ajustes no mueven el saldo',
      de: '      if (c === null) return null\n', a: "      if (c === null) return null\n      if (/_ajuste$/.test(String(m.tipo))) return 0\n" },
    { nombre: 'el ajuste que resta, suma',
      de: "return String(m.tipo ?? '').startsWith('ingreso') ? c : -c", a: "return String(m.tipo ?? '').startsWith('ingreso') || m.tipo === 'egreso_ajuste' ? c : -c" },
    // ── Con una empresa elegida: la cuenta entera, y solo si se puede leer ─
    { nombre: 'la historia del saldo se filtra por la empresa elegida',
      de: "          .in('cuenta_id', ids)\n          .order('fecha', { ascending: true })",
      a: "          .in('cuenta_id', ids)\n          .eq('unidad_negocio_id', estado.movimientosPorUnidad || undefined)\n          .order('fecha', { ascending: true })" },
    { nombre: 'en una lista que mezcla cajas, el saldo va en todos los renglones',
      de: "saldo: legible(m) ? sc : null })", a: "saldo: sc })" },
    { nombre: 'toda cuenta se considera legible',
      de: '      const c = cuentaId ? estado.cuentasPorId[cuentaId] : null\n      if (!c) return false\n', a: '      const c = cuentaId ? estado.cuentasPorId[cuentaId] : null\n      return true\n' },
    { nombre: 'sin poder leer todas las cajas, ninguna es legible (ni la propia)',
      de: '      return !!estado.miEmpleado && c.empleado_id === estado.miEmpleado.id\n', a: '      return false\n' },
    { nombre: 'con movimientos_todos igual no se lee la de otra persona',
      de: '      if (puedeVerMovimientosDeTodos()) return true\n', a: '' },
    { nombre: 'la historia se pide también para las cuentas que no se pueden leer',
      de: '      return estado.movimientosPorUnidad ? cuentas.filter(cuentaConSaldoLegible) : cuentas', a: '      return cuentas' },
    { nombre: 'el aviso y el "Saldo al" incluyen las cuentas que no se pueden leer',
      de: "      const cuentas = cuentasDeLista(movimientos).filter(id => !deTodasLasCajas || cuentaConSaldoLegible(id))", a: "      const cuentas = cuentasDeLista(movimientos)" },
    { nombre: 'Todos los movimientos no lee el saldo',
      de: 'const sc = await leerSaldoCorriente(cuentasDeLista(estado.todosMovimientos), desde)', a: "const sc = { estado: 'cargando', desde }" },
    { nombre: 'la fila no dibuja el saldo',
      de: '              ${htmlSaldoDeFila(m, saldo)}\n', a: '' },
    // ── El turno ──────────────────────────────────────────────────────────
    { nombre: 'el saldo de Retiros sin turno',
      de: '      if (turno !== estado.turnoRetiros) return\n      estado.saldoRetiros = sc', a: '      estado.saldoRetiros = sc' },
  ],
})
