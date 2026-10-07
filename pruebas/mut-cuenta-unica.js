// Mutaciones de test-cuenta-unica.js (06/10/2026): js/cuenta-unica.js (la
// cuenta de cliente y proveedor, compartida) y lo de Administración (la
// cuenta del cliente y la clasificación de la ficha). Ver mutar.js (los tres
// guards). Corren de a una.
//
//   node pruebas/mut-cuenta-unica.js
'use strict'
const path = require('path')
const fs = require('fs')
const { correrMutacionesEnVarios, automaticasEnJs } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-cuenta-unica.js')
const JS = process.env.ARCHIVO_BASE_JS || path.join(RAIZ, 'js/cuenta-unica.js')
const TEXTO_JS = fs.readFileSync(JS, 'utf8')

// Las automáticas: sacar cada escCu() de los renders. Las que escapan un texto
// que no puede traer nada de la base (números en pesos, fechas armadas con
// dígitos, constantes del código) son EQUIVALENTES: se declaran con su motivo
// y no se cuentan (el runner no tiene "equivalente" para las manuales).
const PESOS = 'plataCu() en pesos (la moneda por defecto): un símbolo fijo y formatearNumeroAr(), sin ningún dato de texto'
const EQUIVALENTES = {
  'htmlFilaCu: sin escCu() en escCu(fechaCu(f.fecha))': 'fechaCu(): dígitos y barras armados por una regex, o "—"',
  'htmlCompensar: sin escCu() en escCu(`Te debe ${plataCu(c.saldos.teDebe)} como cliente y le debés ${p': PESOS,
  "htmlCompensar: sin escCu() en escCu(c.enviando ? 'Compensando…' : 'Compensar ' + plataCu(c.monto))": PESOS,
  "htmlFacturasCu: sin escCu() en escCu('Saldo ' + plataCu(f.saldo))": PESOS,
  "htmlResumenCu: sin escCu() en escCu('Aplicado ' + plataCu(aplicadoCu(c.facturas)) + ' de ' + plataCu": PESOS,
  'htmlResumenCu: sin escCu() en escCu(`No se puede compensar más de ${plataCu(c.maximo)}.`)': PESOS,
  'htmlResumenCu: sin escCu() en escCu(textoDespues(c.saldos, c.monto))': PESOS,
  'htmlClasificacion: sin escCu() en escCu(clave)': 'CLASIFICACIONES: constante del código',
  'htmlClasificacion: sin escCu() en escCu(titulo)': 'texto fijo con `propio`, que pone el código (cliente / proveedor)',
  'htmlClasificacion: sin escCu() en escCu(texto)': 'CLASIFICACIONES: constante del código',
}
const automaticas = ['htmlFilaCu', 'htmlCompensar', 'htmlFacturasCu', 'htmlResumenCu', 'htmlCuentaUnica', 'htmlClasificacion']
  .flatMap(f => automaticasEnJs(TEXTO_JS, f, 'escCu'))
// El nombre automático termina con un pedazo del código (a veces con la "}"):
// se compara por el principio.
const claveEq = (nombre) => Object.keys(EQUIVALENTES).find(k => nombre.startsWith(k))
const sinEscape = automaticas.filter(m => !claveEq(m.nombre))
const usadas = automaticas.map(m => claveEq(m.nombre)).filter(Boolean)
for (const n of usadas) console.log(`  EQUIVALENTE (aparte): ${n} — ${EQUIVALENTES[n]}`)
const sobran = Object.keys(EQUIVALENTES).filter(n => !usadas.includes(n))
if (sobran.length) { console.log('ABORTADO: equivalentes declaradas que ya no existen:', sobran.join(' | ')); process.exit(2) }

correrMutacionesEnVarios([
  {
    suite: SUITE, variable: 'ARCHIVO_JS_CUENTA_UNICA', original: JS, funciones: [],
    equivalentes: [],
    manuales: [
      ...sinEscape,
      // ── EL NETO ES te_debe − le_debes ────────────────────────────────────
      { nombre: 'el neto es le_debes − te_debe (al revés)', de: 'neto: (s.te - s.le) / 100', a: 'neto: (s.le - s.te) / 100' },
      { nombre: 'el neto suma las dos columnas', de: 'neto: (s.te - s.le) / 100', a: 'neto: (s.te + s.le) / 100' },
      { nombre: 'el neto sin centavos (arrastra decimales)', de: '    acum.te += te ?? 0\n', a: '    acum.te += (te ?? 0) / 100 * 100 + 0.0000001\n' },
      { nombre: 'una moneda sin importes aparece igual', de: '    if (te === null && le === null) continue\n', a: '' },
      { nombre: 'pesos no van primero', de: "(a === 'ARS' ? -1 : b === 'ARS' ? 1 : a.localeCompare(b))", a: '(a.localeCompare(b))' },
      { nombre: 'pesos al final', de: "(a === 'ARS' ? -1 : b === 'ARS' ? 1 : a.localeCompare(b))", a: "(a === 'ARS' ? 1 : b === 'ARS' ? -1 : a.localeCompare(b))" },
      // ── El texto y los ausentes ──────────────────────────────────────────
      { nombre: 'sin dato el neto dice "Están en cero"', de: "  if (c === null) return '—'\n  if (c > 0) return 'Te debe '", a: "  if (c === null) return 'Están en cero'\n  if (c > 0) return 'Te debe '" },
      { nombre: 'te debe / le debés al revés', de: "  if (c > 0) return 'Te debe ' + plataCu(c / 100, moneda)", a: "  if (c > 0) return 'Le debés ' + plataCu(c / 100, moneda)" },
      { nombre: 'un importe ausente es "$ 0,00"', de: "  if (n === null || n === undefined || n === '' || !Number.isFinite(Number(n))) return '—'", a: "  if (n === null || n === undefined || n === '' || !Number.isFinite(Number(n))) return '$ 0,00'" },
      { nombre: 'la columna vacía dice "$ 0,00"', de: "  return c === 0 ? '' : plataCu(c / 100, moneda)", a: '  return plataCu(c / 100, moneda)' },
      { nombre: 'el negativo sin signo', de: "  return (v < 0 && Math.round(Math.abs(v) * 100) ? '−' : '') + simbolo", a: '  return simbolo' },
      { nombre: 'si la cuenta falla, queda vacía (no dice el error)', de: '    cu.filas = null\n    cu.error =', a: '    cu.filas = []\n    cu.error = null && ' },
      // ── Compensar: cuándo se ofrece ─────────────────────────────────────
      { nombre: 'Compensar sin permiso', de: '  return !!permitido && centavosCu(saldos?.teDebe) > 0', a: '  return centavosCu(saldos?.teDebe) > 0' },
      { nombre: 'Compensar sin que le debas nada', de: ' && centavosCu(saldos?.leDebes) > 0\n', a: '\n' },
      { nombre: 'Compensar sin que te deba nada', de: '  return !!permitido && centavosCu(saldos?.teDebe) > 0 &&', a: '  return !!permitido &&' },
      { nombre: 'Compensar se ofrece con el panel abierto', de: '  const ofrece = puedeOfrecerCompensar(saldos, puedeCompensar) && !cu.comp', a: '  const ofrece = puedeOfrecerCompensar(saldos, puedeCompensar)' },
      // ── EL TOPE: EL MENOR DE LOS DOS SALDOS ─────────────────────────────
      { nombre: 'el máximo es el MAYOR de los dos', de: '  return Math.max(0, Math.min(a, b)) / 100', a: '  return Math.max(0, Math.max(a, b)) / 100' },
      { nombre: 'la compensación puede superar el menor saldo (sin el tope)', de: '  if (m > tope) return `No se puede compensar más de ${plataCu(tope / 100)}: es lo menor entre lo que te debe y lo que le debés.`\n', a: '' },
      { nombre: 'el tope se compara con >= (rechaza el menor justo)', de: '  if (m > tope) return', a: '  if (m >= tope) return' },
      { nombre: 'confirmar no valida (manda cualquier monto)', de: '  c.error = validarCompensacion({ monto: c.monto, maximo: c.maximo, facturas: c.facturas, fecha: c.fecha, hoy: ctx.hoy })', a: '  c.error = null' },
      { nombre: 'el tope usa la columna y no lo abierto en las facturas', de: '    comp.maximo = maximoCompensable(saldos.teDebe, deuda)', a: '    comp.maximo = maximoCompensable(saldos.teDebe, saldos.leDebes)' },
      { nombre: 'sugiere lo que te debe en vez del menor', de: '    comp.monto = comp.maximo\n', a: '    comp.monto = saldos.teDebe\n' },
      { nombre: 'el resumen no avisa que se pasa', de: '  const sobre = centavosCu(c.monto) !== null && centavosCu(c.maximo) !== null && centavosCu(c.monto) > centavosCu(c.maximo)', a: '  const sobre = false' },
      // ── Las facturas ─────────────────────────────────────────────────────
      { nombre: 'sugerir_facturas_fifo con el monto chico (no trae todas)', de: 'p_moneda: \'ARS\', p_monto: TOPE_FACTURAS_CU,', a: 'p_moneda: \'ARS\', p_monto: saldos.teDebe,' },
      { nombre: 'sugerir_facturas_fifo de otra empresa', de: 'p_proveedor_id: cu.proveedorId, p_unidad_negocio_id: cu.unidadId,', a: 'p_proveedor_id: cu.proveedorId, p_unidad_negocio_id: null,' },
      { nombre: 'fifo: cada factura entera aunque no alcance', de: '    const toca = Math.min(resta, saldo)', a: '    const toca = saldo' },
      { nombre: 'aplicaciones con las destildadas', de: "    p_aplicaciones: (facturas ?? []).filter(f => f.checked && (centavosCu(f.monto) ?? 0) > 0)", a: "    p_aplicaciones: (facturas ?? []).filter(f => (centavosCu(f.monto) ?? 0) > 0)" },
      { nombre: 'aplicaciones con la clave monto (no monto_aplicado)', de: '.map(f => ({ factura_pendiente_id: f.id, monto_aplicado: f.monto })),', a: '.map(f => ({ factura_pendiente_id: f.id, monto: f.monto })),' },
      { nombre: 'lo aplicado distinto de lo compensado pasa', de: "  if (Math.round(aplicadoCu(facturas) * 100) !== m) return", a: '  if (false) return' },
      { nombre: 'una factura con más que su saldo pasa', de: '  if (pasada) return', a: '  if (false) return' },
      { nombre: 'sin facturas tildadas pasa', de: "  if (!tildadas.length) return 'Elegí a qué facturas del proveedor se aplica.'\n", a: '' },
      { nombre: 'la fecha futura pasa', de: "  if (hoy && fecha > hoy) return 'La fecha no puede ser futura.'\n", a: '' },
      { nombre: 'cambiar el monto no reparte de nuevo', de: '    c.facturas = repartoFifoCu(c.monto, c.facturas)\n', a: '' },
      { nombre: 'tildar no completa lo que falta', de: '      f.monto = Math.min(falta, centavosCu(f.saldo) ?? 0) / 100\n', a: '' },
      { nombre: 'destildar deja el monto', de: '    if (!f.checked) f.monto = 0\n', a: '' },
      // ── La base ──────────────────────────────────────────────────────────
      { nombre: 'un doble toque manda dos veces', de: '  if (!c || c.enviando || c.cargando) return', a: '  if (!c || c.cargando) return' },
      { nombre: 'el error de la base tapado con uno genérico', de: "    c.error = err?.message || 'No se pudo compensar. Probá de nuevo.'", a: "    c.error = 'No se pudo compensar. Probá de nuevo.'" },
      { nombre: 'después de compensar no avisa a la pantalla', de: '    await ctx.alCompensado?.(data)\n', a: '' },
      { nombre: 'el texto de después con los saldos al revés', de: 'Le debés ${plataCu((centavosCu(leDebes) - m) / 100)}`', a: 'Le debés ${plataCu((centavosCu(teDebe) - m) / 100)}`' },
      // ── La lista ─────────────────────────────────────────────────────────
      { nombre: 'la lista sin filtrar', de: '  const filas = [...filasFiltradas(cu.filas, cu.filtro)].reverse()', a: "  const filas = [...filasFiltradas(cu.filas, '')].reverse()" },
      { nombre: 'la lista con el más viejo arriba', de: '  const filas = [...filasFiltradas(cu.filas, cu.filtro)].reverse()', a: '  const filas = [...filasFiltradas(cu.filas, cu.filtro)]' },
      { nombre: 'una etiqueta desconocida arma la clase con su texto', de: "  return 'cu-chip cu-chip--' + (e ? e[1] : 'otra')", a: "  return 'cu-chip cu-chip--' + (e ? e[1] : etiqueta)" },
      // ── La clasificación ────────────────────────────────────────────────
      { nombre: 'la opción opuesta sola se puede tocar', de: '    const apagado = !puede || ocupado || clave === otro', a: '    const apagado = !puede || ocupado' },
      { nombre: 'sin permiso se puede tocar', de: '    const apagado = !puede || ocupado || clave === otro', a: '    const apagado = ocupado || clave === otro' },
      { nombre: 'dice que se creó sin saber qué había antes', de: '  if (conocidos && id && !conocidos.has(id)) {', a: '  if (id && !conocidos?.has(id)) {' },
    ],
  },
  {
    suite: SUITE, variable: 'ARCHIVO_TEST', original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/administracion.html'), funciones: [],
    manuales: [
      { nombre: 'admin: la cuenta juntas para un cliente sin proveedor', de: '        if (proveedorId) estado.cliente.unica = estadoCuentaUnica(', a: '        estado.cliente.unica = estadoCuentaUnica(' },
      { nombre: 'admin: compensar con UNA de las dos tareas', de: "      return tieneTarea('cobranzas', 'procesar') && tieneTarea('cuentas_corrientes', 'registrar_pago')", a: "      return tieneTarea('cobranzas', 'procesar') || tieneTarea('cuentas_corrientes', 'registrar_pago')" },
      { nombre: 'admin: no se pinta la cuenta juntas', de: '      pintarCuentaUnicaCliente()\n    }', a: '    }' },
      { nombre: 'admin: no se leen las tareas de cuentas_corrientes', de: "'produccion', 'cobranzas', 'cuentas_corrientes']", a: "'produccion', 'cobranzas']" },
      { nombre: 'admin: la lista de clientes sin proveedor_id', de: 'codigo_anterior, proveedor_id\')', a: 'codigo_anterior\')' },
      { nombre: 'admin: vincular sin el proveedor elegido', de: "{ p_cliente_id: f.id, p_proveedor_id: f.proveedorId ?? null }", a: '{ p_cliente_id: f.id, p_proveedor_id: null }' },
      { nombre: 'admin: vincular sin saber qué había antes (nunca dice que se creó)', de: '      const conocidos = estado.idsProveedores ? new Set(estado.idsProveedores) : null', a: '      const conocidos = null' },
      { nombre: 'admin: el padrón se lee sin los ids', de: '      estado.idsProveedores = new Set((data ?? []).map(p => p.id))\n', a: '' },
      { nombre: 'admin: vincular dos veces con un doble toque', de: '      if (!f?.original || f.vinculo.enviando || f.proveedorActual) return', a: '      if (!f?.original || f.proveedorActual) return' },
      { nombre: 'admin: separar dos veces con un doble toque', de: '      if (!f?.original || f.vinculo.enviando || !f.proveedorActual) return', a: '      if (!f?.original || !f.proveedorActual) return' },
      { nombre: 'admin: el error de vincular tapado', de: "error: err?.message || 'No se pudo vincular. Probá de nuevo.'", a: "error: 'No se pudo vincular. Probá de nuevo.'" },
      { nombre: 'admin: el error de separar tapado', de: "error: err?.message || 'No se pudieron separar las cuentas. Probá de nuevo.'", a: "error: 'No se pudieron separar las cuentas. Probá de nuevo.'" },
      { nombre: 'admin: separar sin preguntar', de: "        f.vinculo = { panel: 'desvincular', error: null, enviando: false }\n      } else return", a: "        f.vinculo = { panel: 'desvincular', error: null, enviando: false }\n        confirmarDesvincular()\n      } else return" },
      { nombre: 'admin: "Cliente y proveedor" no abre el panel', de: "        f.vinculo = { panel: 'vincular', error: null, enviando: false }\n", a: '' },
      { nombre: 'admin: "No es proveedor" borra sin preguntar', de: "closest('#ad-f-proveedor-quitar')) elegirClasificacionFicha('cliente')", a: "closest('#ad-f-proveedor-quitar')) confirmarDesvincular()" },
      { nombre: 'admin: la clasificación no se toca', de: "closest('[data-clasificacion]'))) elegirClasificacionFicha(b.dataset.clasificacion)", a: "closest('[data-clasificacion]'))) void 0" },
      { nombre: 'admin: la cuenta no escucha', de: "      unica.addEventListener('click', (e) => { const ctx = ctxCuentaUnica(); if (ctx) alTocarCuentaUnica(e, ctx) })\n", a: '' },
      { nombre: 'admin: la clasificación con el valor al revés', de: "valor: f.proveedorActual ? 'ambos' : 'cliente'", a: "valor: f.proveedorActual ? 'cliente' : 'ambos'" },
    ],
  },
])
