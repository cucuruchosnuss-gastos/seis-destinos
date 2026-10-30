// Mutaciones de test-cobranzas-aplicar.js (a qué se aplica la cobranza y el
// recibo; 30/10/2026). Ver mutar.js.
//
// Antes de mutar, el BASELINE: sobre el código de antes del cambio
// (git show 1aa4b4e:modulos/cobranzas.html, la punta de
// ci-prueba/cobranza-muchos-comprobantes de la que salió esta rama; commit
// FIJO, nunca HEAD) la suite tiene que dar ROJO.
//
//   node pruebas/mut-cobranzas-aplicar.js
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')

const SUITE = path.join(__dirname, 'test-cobranzas-aplicar.js')
const BASE_ANTES = '1aa4b4e'
if (process.env.MUT_SOLO_ANCLAS !== '1') {
  const tmp = path.join(__dirname, 'mut-tmp-aplicar-antes.html')
  let antes = null
  try {
    antes = execFileSync('git', ['show', `${BASE_ANTES}:modulos/cobranzas.html`], { encoding: 'utf8', cwd: path.join(__dirname, '..'), maxBuffer: 64 * 1024 * 1024 })
  } catch {
    console.log(`(sin el historial de git: no se corre el baseline ${BASE_ANTES})`)
  }
  if (antes !== null) {
    fs.writeFileSync(tmp, antes)
    let rojo = false
    let salida = ''
    try {
      salida = execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (err) { rojo = true; salida = String(err.stdout || '') }
    fs.unlinkSync(tmp)
    console.log(`Baseline ${BASE_ANTES} (antes del cambio): ${salida.trim().split('\n').pop()}`)
    if (!rojo) { console.log('ABORTADO: la suite da VERDE sobre el código de antes del cambio: no lo está probando.'); process.exit(2) }
  }
}

correrMutaciones({
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/cobranzas.html'),
  funciones: ['htmlRecibo', 'htmlFilaAplicar', 'htmlRecienAsentada'],
  escape: 'escCob',
  equivalentes: [
    { expr: 'escCob(fechaRecibo(q.emision))', motivo: 'fechaRecibo() devuelve dd/mm/aaaa o "—": nada escapable' },
    { expr: "escCob(q.tipo === 'diferido' ? fechaRecibo(q.pago) : 'A la vista')", motivo: 'una fecha dd/mm/aaaa o el literal "A la vista": nada escapable' },
    { expr: 'escCob(fechaRecibo(t.fecha))', motivo: 'fechaRecibo() devuelve dd/mm/aaaa o "—": nada escapable' },
    { expr: 'escCob(fechaRecibo(d?.fecha))', motivo: 'fechaRecibo() devuelve dd/mm/aaaa o "—": nada escapable' },
    { expr: "escCob((q.tipo === 'diferido' ? 'Diferido' : 'A la vista') + (q.echeq ? ' · eCheq' : ''))", motivo: 'literales del código: nada escapable' },
    { expr: "escCob(medio ?? '')", motivo: "medio es null o 'cheque' / 'transferencia' / 'efectivo' (MEDIOS_APLICAR, una lista fija del código)" },
    { expr: 'escCob(NOMBRE_MEDIO_APLICAR[m])', motivo: 'un nombre de medio de una lista fija del código' },
    { expr: 'escCob(textoSaldoCuenta(d?.saldo_cuenta))', motivo: 'un importe formateado y literales del código: nada escapable' },
    { expr: 'escCob(formatearImporte(ap.aplicado))', motivo: 'formatearImporte() devuelve "$ " y dígitos, puntos y comas: nada escapable' },
    { expr: 'escCob(formatearImporte(ap.a_cuenta))', motivo: 'formatearImporte() devuelve "$ " y dígitos, puntos y comas: nada escapable' },
    { expr: 'escCob(formatearFechaCob(d.fecha))', motivo: 'una fecha dd/mm/aaaa (ya validada con esFechaIso): nada escapable' },
    { expr: 'escCob(formatearImporte(Number(d.monto)))', motivo: 'formatearImporte() devuelve "$ " y dígitos, puntos y comas: nada escapable' },
    { expr: 'escCob(formatearImporte(Number(d.pendiente)))', motivo: 'formatearImporte() devuelve "$ " y dígitos, puntos y comas: nada escapable' },
  ],
  manuales: [
    // Sin corte, nada
    { nombre: 'sin corte también aparece', de: "      if (a.cargando || a.datos?.activo !== true) { sec.hidden = true; return }", a: '      if (a.cargando) { sec.hidden = true; return }' },
    { nombre: 'aplicarActivo no mira el corte', de: ' && a?.formId === f.id && a?.datos?.activo === true', a: ' && a?.formId === f.id && !!a?.datos' },
    { nombre: 'el chofer también lee la cuenta', de: "      if (!f || !puedeProcesar() || !esFormAsentado(f) || !f.cliente_id) { sec.hidden = true; return }\n      if (estado.aplicar?.clienteId", a: "      if (!f || !esFormAsentado(f) || !f.cliente_id) { sec.hidden = true; return }\n      if (estado.aplicar?.clienteId" },
    { nombre: 'mientras lee muestra la sección', de: "      if (a.cargando || a.datos?.activo !== true) { sec.hidden = true; return }", a: "      if (!a.cargando && a.datos?.activo !== true) { sec.hidden = true; return }" },
    { nombre: 'la cuenta leída no se ata al formulario', de: "      if (estado.aplicar?.clienteId !== f.cliente_id || estado.aplicar?.formId !== f.id) { sec.hidden = true; cargarPendientesCliente(f); return }", a: "      if (estado.aplicar?.clienteId !== f.cliente_id) { sec.hidden = true; cargarPendientesCliente(f); return }" },
    { nombre: 'otro cliente no suelta lo elegido', de: '      f.aplicacion = null\n      estado.aplicar = null\n', a: '' },
    { nombre: 'la barra de abajo no muestra lo aplicado', de: "      barra.hidden = false\n      barra.textContent = `Aplicado", a: "      barra.textContent = `Aplicado" },
    { nombre: 'la barra de abajo aparece sin corte', de: "      if (!aplicarActivo(f)) { barra.hidden = true; barra.textContent = ''; return }", a: '' },
    // Aplicar todo
    { nombre: 'sugerir sin el total', de: 'p_monto: Math.round(cobrado * 100) / 100, p_parte: ap.parte', a: 'p_monto: 0, p_parte: ap.parte' },
    { nombre: 'Solo N1/N2 no pasa la parte', de: "      ap.parte = parte === 'N1' || parte === 'N2' ? parte : null\n      if (!(cobrado > 0)) {", a: "      ap.parte = null\n      if (!(cobrado > 0)) {" },
    { nombre: 'la sugerencia no se usa', de: '          if (Number.isFinite(n) && n > 0) montos[claveDocAplicar(it)] = n', a: '' },
    { nombre: 'un total nuevo no vuelve a sugerir', de: "      if (ap && !a.cargando && ap.modo === 'todo' && !ap.tocado && ap.cobradoSugerido !== resumenAplicacion(f, a.datos).cobrado) programarSugerirTodo()", a: '' },
    { nombre: 'lo tocado a mano se pisa', de: "      if (ap && !a.cargando && ap.modo === 'todo' && !ap.tocado && ap.cobradoSugerido", a: "      if (ap && !a.cargando && ap.modo === 'todo' && ap.cobradoSugerido" },
    { nombre: 'sin retardo para sugerir', de: '    const MS_SUGERIR_APLICAR = 400', a: '    const MS_SUGERIR_APLICAR = 0' },
    { nombre: 'escribir a mano no se anota como tocado', de: '      montos[clave] = valor\n      ap.tocado = true\n', a: '      montos[clave] = valor\n' },
    { nombre: 'los items de "Aplicar todo" llevan medio', de: '.map(([d, n]) => item(d, n, null))', a: ".map(([d, n]) => item(d, n, 'efectivo'))" },
    { nombre: 'se ofrece lo ya pagado', de: '      return (Array.isArray(datos?.docs) ? datos.docs : []).filter(d => centavosAplicar(d?.pendiente) > 0)', a: '      return (Array.isArray(datos?.docs) ? datos.docs : [])' },
    { nombre: 'Solo N1 siempre', de: "          ${hay('N1') ? `<button", a: "          ${true ? `<button" },
    // Por medio
    { nombre: 'por medio: los items sin medio', de: '          if (monto > 0) r.push(item(d, monto, m))', a: '          if (monto > 0) r.push(item(d, monto, null))' },
    { nombre: 'por medio: un medio vuelve a tomar lo de otro', de: '        const libre = centavosAplicar(d.pendiente) - (ocupados.get(k) ?? 0)', a: '        const libre = centavosAplicar(d.pendiente)' },
    { nombre: 'por medio: la parte no filtra', de: '        if (parte && d.parte !== parte) continue\n', a: '' },
    { nombre: 'por medio: el último no queda parcial', de: '        const toma = Math.min(resta, libre)', a: '        const toma = libre' },
    { nombre: 'por medio: un bloque por medio aunque no se cobró', de: '      const bloques = MEDIOS_APLICAR.filter(m => centavosAplicar(r.cobradoPorMedio[m]) > 0).map(', a: '      const bloques = MEDIOS_APLICAR.map(' },
    { nombre: 'los e-cheques no cuentan como cheques', de: '      return { cheque: t.cheques + t.echecks, transferencia: t.transferencias, efectivo: t.efectivo }', a: '      return { cheque: t.cheques, transferencia: t.transferencias, efectivo: t.efectivo }' },
    // Lo que frena
    { nombre: 'un renglón pasado no frena', de: '        if ((porDoc.get(k) ?? 0) > centavosAplicar(d.pendiente)) {', a: '        if (false) {' },
    { nombre: 'un medio pasado no frena', de: '          if (porMedio[m] > centavosAplicar(cobradoM[m])) errores.push(', a: '          if (false) errores.push(' },
    { nombre: 'más aplicado que cobrado no frena', de: '      if (aplicadoC > centavosAplicar(cobrado)) errores.push(', a: '      if (false) errores.push(' },
    { nombre: 'los errores no frenan Guardar', de: '      motivos.push(...motivosAplicar(f))\n', a: '' },
    { nombre: 'a cuenta mal calculado', de: '        cobrado, aplicado: aplicadoC / 100, aCuenta: Math.max(0, centavosAplicar(cobrado) - aplicadoC) / 100,', a: '        cobrado, aplicado: aplicadoC / 100, aCuenta: cobrado,' },
    // Guardar
    { nombre: 'después de asentar no se aplica', de: '        if (aplicar && resultado.asentada) {', a: '        if (false) {' },
    { nombre: 'aplica con otro tipo de crédito', de: "p_credito_tipo: 'cobranza', p_credito_id: cobranzaId", a: "p_credito_tipo: 'movimiento', p_credito_id: cobranzaId" },
    { nombre: 'el error de aplicar se tapa', de: "        if (error) return { ok: false, mensaje: error.message || 'No se pudo aplicar la cobranza.' }", a: "        if (error) return { ok: false, mensaje: 'No se pudo aplicar la cobranza.' }" },
    { nombre: 'sin "Volver a intentar aplicar"', de: "          ${ap?.ok ? '' : '<button type=\"button\" class=\"cob-btn cob-btn--chico\" data-recien-reintentar>Volver a intentar aplicar</button>'}", a: '' },
    { nombre: 'sin señal no avisa lo elegido', de: " Lo que elegiste aplicar no se guarda sin señal: queda a cuenta del cliente.' : ''", a: "' : ''" },
    { nombre: 'Guardar no espera la lectura', de: '        await leyendo.promesa\n', a: '' },
    { nombre: 'Guardar no termina la sugerencia pendiente', de: '        await sugerirAplicarTodo(apPend.parte)\n', a: '' },
    { nombre: 'con corte no frena para revisar', de: "        if (aplicarActivo(f)) {\n          btn.disabled = false\n          pintarTotalYGuardado()", a: "        if (false) {\n          btn.disabled = false\n          pintarTotalYGuardado()" },
    // El recibo
    { nombre: 'el recibo no dice el a cuenta', de: "        ${centavosAplicar(aCuenta) > 0 ? `<div class=\"rc-franja\">", a: "        ${false ? `<div class=\"rc-franja\">" },
    { nombre: 'el recibo muestra N1 para un cliente solo N2', de: "      return soloN2 ? e.replace(/^N1-/, 'Orden ') : e", a: '      return e' },
    { nombre: 'el saldo al revés', de: "      if (centavosAplicar(s) > 0) return `${formatearImporte(s)} a pagar`", a: "      if (centavosAplicar(s) > 0) return `${formatearImporte(s)} a favor del cliente`" },
    { nombre: 'el recibo muestra medios vacíos', de: '      const subtotales = MEDIOS_APLICAR.filter(m => centavosAplicar(medios[m]) > 0)', a: '      const subtotales = MEDIOS_APLICAR' },
    { nombre: 'el recibo sin tabla de efectivo', de: "      const tablaEfectivo = efectivo > 0 ?", a: '      const tablaEfectivo = false ?' },
    { nombre: 'el logo con src en la plantilla', de: "'<img class=\"rc-cab__logo\" data-recibo-logo alt=\"\">'", a: "`<img class=\"rc-cab__logo\" data-recibo-logo src=\"../${e.logo_url}\" alt=\"\">`" },
    { nombre: 'el recibo no se compacta', de: "      hoja.className = filasRecibo(res.data) > 14 ? 'rc-hoja rc-hoja--compacta' : 'rc-hoja'", a: "      hoja.className = 'rc-hoja'" },
    { nombre: 'sin turno en el recibo', de: '      if (turno !== estado.turnoRecibo) return\n', a: '' },
    { nombre: 'el nombre del archivo sin la fecha dd-mm-aaaa', de: "      const fecha = esFechaIso(f) ? `${f.slice(8, 10)}-${f.slice(5, 7)}-${f.slice(0, 4)}` : 'sin-fecha'", a: "      const fecha = f || 'sin-fecha'" },
    { nombre: 'el nombre del archivo con caracteres prohibidos', de: ".replace(/[\\\\/:*?\"<>|]+/g, ' ')", a: '' },
    { nombre: 'banco corto sin sacar "Banco de"', de: "        .replace(/^banco\\s+(de\\s+la\\s+|del\\s+|de\\s+)?/i, '')", a: '' },
    { nombre: 'imprimir no aísla la hoja', de: "      raiz.classList.add('rc-imprimiendo')", a: '' },
    { nombre: 'el PDF no se achica a una hoja', de: 'Math.min(190 / canvas.width, 277 / canvas.height)', a: '190 / canvas.width' },
  ],
})
