// Mutaciones de test-administracion-aplicar-cobranzas.js (la cuenta del
// cliente: Pendientes desde el corte, aplicar y el recibo; 30/10/2026). Ver
// mutar.js. Muta modulos/administracion.html, fuera de la cartera de cheques.
//
// Antes de mutar, el BASELINE: sobre el código de antes del cambio
// (git show f6c87c1:modulos/administracion.html, la punta de
// ci-prueba/aplicar-cobranzas con la parte de Cobranzas; commit FIJO, nunca
// HEAD) la suite tiene que dar ROJO.
//
//   node pruebas/mut-administracion-aplicar-cobranzas.js
'use strict'
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

const SUITE = path.join(__dirname, 'test-administracion-aplicar-cobranzas.js')
const BASE_ANTES = 'f6c87c1'
if (process.env.MUT_SOLO_ANCLAS !== '1') {
  const tmp = path.join(__dirname, 'mut-tmp-aplicar-cobranzas-antes.html')
  let antes = null
  try {
    antes = execFileSync('git', ['show', `${BASE_ANTES}:modulos/administracion.html`], { encoding: 'utf8', cwd: path.join(__dirname, '..'), maxBuffer: 64 * 1024 * 1024 })
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

const SIN_ESCAPABLE = 'un importe de importeHoja() ("$ ", dígitos, puntos y comas) o una fecha dd/mm/aaaa, con literales del código: nada escapable'
correrMutaciones({
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  region: limitesAdministracion,
  funciones: ['htmlPendientesAd', 'htmlDocPendienteAd', 'htmlCreditoPendienteAd', 'htmlAplicarAd', 'htmlFilaAplicarAd', 'htmlReciboLineaAd', 'htmlReciboAd'],
  equivalentes: [
    { expr: "esc([esFechaIso(d?.fecha) ? fechaCorta(d.fecha) : '', 'Monto ' + importeHoja(d?.monto)].filter(Boolean).join(' · '))", motivo: SIN_ESCAPABLE },
    { expr: "esc('Pendiente ' + importeHoja(d?.pendiente))", motivo: SIN_ESCAPABLE },
    { expr: "esc(datosCredito.filter(Boolean).join(' · '))", motivo: SIN_ESCAPABLE },
    { expr: "esc('Libre ' + importeHoja(k?.libre))", motivo: SIN_ESCAPABLE },
    { expr: "esc('Ya tenía aplicado ' + importeHoja(yaTenia / 100) + ': se mantiene y se le suma lo de abajo.')", motivo: SIN_ESCAPABLE },
    { expr: 'esc(id)', motivo: "'todo' o 'medio': una lista fija del código" },
    { expr: 'esc(texto)', motivo: "'Aplicar todo' o 'Por medio de pago': literales del código" },
    { expr: 'esc(m)', motivo: 'un medio de MEDIOS_APLICAR_AD, una lista fija del código' },
    { expr: "esc(NOMBRE_MEDIO_APLICAR_AD[m] + ' ' + importeHoja(r.disponiblePorMedio[m]))", motivo: SIN_ESCAPABLE },
    { expr: 'esc(importeHoja(r.aplicadoPorMedio[m]))', motivo: SIN_ESCAPABLE },
    { expr: "esc(ap.enviando ? 'Aplicando…' : 'Aplicar')", motivo: 'literales del código' },
    { expr: "esc([esFechaIso(d.fecha) ? fechaCorta(d.fecha) : '', 'Monto ' + importeHoja(d.monto), 'Pendiente ' + importeHoja(d.pendiente)].filter(Boolean).join(' · '))", motivo: SIN_ESCAPABLE },
    { expr: "esc(medio ?? '')", motivo: 'null o un medio de MEDIOS_APLICAR_AD, una lista fija del código' },
    { expr: "esc(fechaReciboAd(q.emision))", motivo: SIN_ESCAPABLE },
    { expr: "esc(q.tipo === 'diferido' ? fechaReciboAd(q.pago) : 'A la vista')", motivo: SIN_ESCAPABLE },
    { expr: "esc((q.tipo === 'diferido' ? 'Diferido' : 'A la vista') + (q.echeq ? ' · eCheq' : ''))", motivo: 'literales del código' },
    { expr: 'esc(fechaReciboAd(t.fecha))', motivo: SIN_ESCAPABLE },
    { expr: "esc('Fecha ' + fechaReciboAd(d?.fecha))", motivo: SIN_ESCAPABLE },
    { expr: 'esc(NOMBRE_MEDIO_APLICAR_AD[m])', motivo: 'un nombre de medio de una lista fija del código' },
    { expr: "esc('Saldo de la cuenta: ' + textoSaldoCuentaAd(d?.saldo_cuenta))", motivo: SIN_ESCAPABLE },
  ],
  manuales: [
    // Sin corte, nada
    { nombre: 'sin corte también aparece la sección', de: '      if (!pendientesActivosAd(c)) return \'\'\n      const docs = docsPendientesAd(p.datos)', a: '      const docs = docsPendientesAd(p.datos)' },
    { nombre: 'pendientesActivosAd no mira el corte', de: '      return c?.pend?.datos?.activo === true', a: '      return !!c?.pend?.datos' },
    { nombre: 'la línea de la cobranza lleva Recibo sin corte', de: "      if (m?.tipo !== 'cobranza' || !m.cobranza_id || !pendientesActivosAd(c)) return ''", a: "      if (m?.tipo !== 'cobranza' || !m.cobranza_id) return ''" },
    { nombre: 'la línea lleva Recibo sin cobranza_id', de: "      if (m?.tipo !== 'cobranza' || !m.cobranza_id || !pendientesActivosAd(c)) return ''", a: "      if (m?.tipo !== 'cobranza' || !pendientesActivosAd(c)) return ''" },
    { nombre: 'la línea lleva Recibo en cualquier movimiento', de: "      if (m?.tipo !== 'cobranza' || !m.cobranza_id || !pendientesActivosAd(c)) return ''", a: "      if (!m.cobranza_id || !pendientesActivosAd(c)) return ''" },
    { nombre: 'la cuenta no muestra la sección', de: '+ htmlAcopiosCliente(c) + htmlPendientesAd(c)', a: '+ htmlAcopiosCliente(c)' },
    { nombre: 'la línea no lleva Recibo', de: "'</button>' : '</div>'}` + htmlReciboLineaAd(m, c)", a: "'</button>' : '</div>'}`" },
    { nombre: 'al abrir la cuenta no se lee cliente_pendientes', de: 'cargarCuentaGrupo(cl), cargarPendientesAd(cl)])', a: 'cargarCuentaGrupo(cl)])' },
    { nombre: 'se lee sin permiso', de: '      if (!puedeLeerPendientesAd()) { c.pend = null; return }\n', a: '' },
    { nombre: 'leer pide solo cobranzas:procesar', de: "      return tieneTarea('cobranzas', 'procesar') || puedeEn('retiros', 'precios')", a: "      return tieneTarea('cobranzas', 'procesar')" },
    { nombre: 'una lectura vieja pisa a la nueva', de: '      if (c.turnoPend !== turno) return\n', a: '' },
    { nombre: 'el error de lectura no se dice', de: "      if (p.error) return `<div class=\"ad-aviso\" id=\"ad-pend\">", a: "      if (p.error) return '' + `<div class=\"ad-aviso\" id=\"ad-pend\" hidden>" },
    // Lo que se lista
    { nombre: 'se listan los docs ya pagados', de: '      return (Array.isArray(datos?.docs) ? datos.docs : []).filter(d => centavosAplAd(d?.pendiente) > 0)', a: '      return (Array.isArray(datos?.docs) ? datos.docs : [])' },
    { nombre: 'se listan los créditos sin nada libre', de: '      return (Array.isArray(datos?.creditos) ? datos.creditos : []).filter(k => centavosAplAd(k?.libre) > 0)', a: '      return (Array.isArray(datos?.creditos) ? datos.creditos : [])' },
    { nombre: '"Aplicar" sin cobranzas:procesar', de: '      if (puedeAplicarAd() && !abierto && creditoAplicableAd(k)) botones.push(', a: '      if (!abierto && creditoAplicableAd(k)) botones.push(' },
    { nombre: 'aplicar no exige cobranzas:procesar al abrir', de: '      if (!c || !puedeAplicarAd() || !pendientesActivosAd(c)) return\n      const k = creditosLibresAd', a: '      if (!c || !pendientesActivosAd(c)) return\n      const k = creditosLibresAd' },
    // Desde el 31/10/2026 (arreglos de la auditoría, punto 5b) no hay hueco:
    // cualquier crédito con algo libre se aplica.
    { nombre: 'vuelve el hueco: con algo aplicado no se ofrece', de: '      return !!k?.credito_id && centavosAplAd(k.libre) > 0', a: '      return !!k?.credito_id && centavosAplAd(k.libre) > 0 && centavosAplAd(k.aplicado) === 0' },
    { nombre: 'vuelve el hueco: solo las cobranzas con algo aplicado', de: '      return !!k?.credito_id && centavosAplAd(k.libre) > 0', a: "      return !!k?.credito_id && centavosAplAd(k.libre) > 0 && (k.credito_tipo === 'cobranza' || centavosAplAd(k.aplicado) === 0)" },
    { nombre: 'un crédito sin libre se puede aplicar', de: '      return !!k?.credito_id && centavosAplAd(k.libre) > 0', a: '      return !!k?.credito_id' },
    { nombre: 'Recibo en cualquier crédito', de: "      if (k?.credito_tipo === 'cobranza' && k.credito_id) botones.push(", a: '      if (k.credito_id) botones.push(' },
    { nombre: 'sin Recibo en Pendientes', de: "      if (k?.credito_tipo === 'cobranza' && k.credito_id) botones.push(", a: "      if (false) botones.push(" },
    // Lo que ya tenía
    { nombre: 'nunca se lee lo que ya tenía', de: '        previas: centavosAplAd(k?.aplicado) > 0 ? null : [],', a: '        previas: [],' },
    { nombre: 'solo las cobranzas leen lo que ya tenían', de: '        previas: centavosAplAd(k?.aplicado) > 0 ? null : [],', a: "        previas: k?.credito_tipo === 'cobranza' && centavosAplAd(k?.aplicado) > 0 ? null : []," },
    { nombre: 'lo que ya tenía no se manda', de: '      const items = itemsParaEnviarAd(ap.previas, r.nuevos)', a: '      const items = itemsParaEnviarAd([], r.nuevos)' },
    { nombre: 'lo que ya tenía pierde el medio', de: 'monto: cent / 100, medio: MEDIOS_APLICAR_AD.includes(a.medio) ? a.medio : null })', a: 'monto: cent / 100, medio: null })' },
    { nombre: 'lo mismo dos veces no se suma', de: '        if (ya) ya.cent += centavosAplAd(it.monto)\n        else porClave.set', a: '        porClave.set' },
    { nombre: 'se suma sin mirar el medio', de: "        const k = claveDocAd(it) + '|' + (it.medio ?? '')", a: '        const k = claveDocAd(it)' },
    { nombre: 'si falla la lectura de lo que ya tenía, se aplica igual', de: "          ap.errorPrevias = 'No se pudo leer lo que este crédito ya tenía aplicado (' + (res?.error?.message || 'no vino nada') + '). Sin eso no se puede aplicar: se borraría.'\n          pintarCliente()\n          return\n", a: '' },
    { nombre: 'no se compara lo que ya tenía con la cuenta', de: '        if (suma !== centavosAplAd(k.aplicado)) {', a: '        if (false) {' },
    { nombre: 'con errorPrevias el selector queda listo', de: '      return !!ap && ap.previas !== null && !ap.errorPrevias && pendientesActivosAd(c)', a: '      return !!ap && pendientesActivosAd(c)' },
    // Sugerir y repartir
    { nombre: 'sugerir sin lo libre', de: "p_monto: Math.round(libre * 100) / 100, p_parte: ap.parte", a: 'p_monto: 0, p_parte: ap.parte' },
    { nombre: 'Solo N1/N2 no pasa la parte', de: "      ap.parte = parte === 'N1' || parte === 'N2' ? parte : null\n      ap.foco = null\n      const libre", a: '      ap.parte = null\n      ap.foco = null\n      const libre' },
    { nombre: 'la sugerencia no se usa', de: '          if (Number.isFinite(n) && n > 0) montos[claveDocAd(it)] = n', a: '' },
    { nombre: 'al abrir no se sugiere', de: '      await sugerirTodoAd(null)\n    }', a: '    }' },
    { nombre: 'disponible: el medio sin restar lo ya aplicado', de: ' - centavosAplAd(k.aplicado_por_medio?.[m])) / 100', a: ') / 100' },
    { nombre: 'un medio sin tope de lo que quedó', de: '      const tope = Math.min(centavosAplAd(disp.porMedio[medio]), Math.max(0, centavosAplAd(disp.libre) - otros)) / 100', a: '      const tope = 1e9' },
    { nombre: 'un medio pisa lo que tomaron los otros', de: '          ocupados.set(k, (ocupados.get(k) ?? 0) + cent)\n', a: '' },
    { nombre: 'Por medio de pago en cualquier crédito', de: '      if (ap.modo === modo || (modo === \'medio\' && !hayMediosAd(ap.credito))) return', a: '      if (ap.modo === modo) return' },
    { nombre: 'los items de "Aplicar todo" llevan medio', de: '.map(([d, n]) => item(d, n, null))\n    }', a: ".map(([d, n]) => item(d, n, 'efectivo'))\n    }" },
    { nombre: 'por medio: los items sin medio', de: '          if (monto > 0) r.push(item(d, monto, m))', a: '          if (monto > 0) r.push(item(d, monto, null))' },
    // Lo que está mal
    { nombre: 'un renglón pasado no se dice', de: '        if ((porDoc.get(k) ?? 0) > centavosAplAd(d.pendiente)) {', a: '        if (false) {' },
    { nombre: 'un medio pasado no se dice', de: '          if (porMedio[m] > centavosAplAd(disp.porMedio[m])) errores.push(', a: '          if (false) errores.push(' },
    { nombre: 'con errores se puede aplicar', de: '      if (!r.nuevos.length || r.errores.length) return\n      const items', a: '      if (!r.nuevos.length) return\n      const items' },
    { nombre: 'el botón se habilita con errores', de: '      if (boton) boton.disabled = !r.nuevos.length || r.errores.length > 0 || ap.enviando', a: '      if (boton) boton.disabled = !r.nuevos.length || ap.enviando' },
    { nombre: 'escribir no repinta las cifras', de: "      ap.foco = { clave, medio: medio ?? '' }\n      pintarCifrasAd()", a: "      ap.foco = { clave, medio: medio ?? '' }" },
    // Aplicar
    { nombre: 'aplicar con otro crédito', de: 'p_credito_tipo: ap.credito.credito_tipo, p_credito_id: ap.credito.credito_id, p_items: items', a: "p_credito_tipo: 'cobranza', p_credito_id: ap.credito.credito_id, p_items: items" },
    { nombre: 'doble toque manda dos veces', de: '      if (!aplicarListoAd(c) || !puedeAplicarAd() || c.aplicar.enviando) return', a: '      if (!aplicarListoAd(c) || !puedeAplicarAd()) return' },
    { nombre: 'el error de la base se cambia', de: "        ap.error = res.error.message || 'No se pudo aplicar.'", a: "        ap.error = 'No se pudo aplicar.'" },
    { nombre: 'con error se cierra el selector', de: "        ap.error = res.error.message || 'No se pudo aplicar.'\n        pintarCliente()\n        return\n", a: '' },
    { nombre: 'después de aplicar no se relee', de: '      await releerPendientesYCuentaAd(c)\n    }', a: '      pintarCliente()\n    }' },
    { nombre: 'al releer no se lee la cuenta', de: '        const [r] = await Promise.all([leerCuenta(c.id), cargarPendientesAd(c)])', a: '        const [r] = await Promise.all([{}, cargarPendientesAd(c)])' },
    { nombre: 'al releer no se lee cliente_pendientes', de: '        const [r] = await Promise.all([leerCuenta(c.id), cargarPendientesAd(c)])', a: '        const [r] = await Promise.all([leerCuenta(c.id)])' },
    { nombre: 'el aviso sin lo que queda a cuenta', de: '      mostrarExito(`Aplicado ${importeHoja(res?.data?.aplicado)} · Queda a cuenta ${importeHoja(res?.data?.a_cuenta)}`)', a: '      mostrarExito(`Aplicado ${importeHoja(res?.data?.aplicado)}`)' },
    { nombre: 'repintar pierde los montos', de: '        if (n !== null && n > 0) ponerNumero(campo, n)\n', a: '' },
    { nombre: 'repintar pierde el foco', de: "        if (ap.foco && ap.foco.clave === campo.dataset.adAplDoc && ap.foco.medio === (medio ?? '')) campo.focus?.()\n", a: '' },
    { nombre: 'pintarCliente no pinta el selector', de: "      document.getElementById('ad-cliente-cuerpo').innerHTML = htmlCuenta(c)\n      pintarAplicarAd()\n", a: "      document.getElementById('ad-cliente-cuerpo').innerHTML = htmlCuenta(c)\n" },
    // El recibo
    { nombre: 'el recibo de otra cobranza', de: "        res = await supabase.rpc('recibo_cobranza', { p_cobranza_id: cobranzaId })", a: "        res = await supabase.rpc('recibo_cobranza', { p_cobranza_id: estado.cliente?.id })" },
    { nombre: 'la hoja nunca compacta', de: '      return filasReciboAd(d) > FILAS_RECIBO_COMPACTO_AD ? ', a: '      return false ? ' },
    { nombre: 'imprimir sin el A4', de: "innerHTML = reglaA4 + `<div class=\"${claseHojaReciboAd(d)} ad-rc-hoja--papel\">", a: "innerHTML = `<div class=\"${claseHojaReciboAd(d)} ad-rc-hoja--papel\">" },
    { nombre: 'imprimir sin olvidar la hoja de la orden', de: "      olvidarHoja(impresionHoja())\n      const reglaA4 = ", a: '      const reglaA4 = ' },
    { nombre: 'el PDF no se achica a una hoja', de: '        const escala = Math.min(190 / canvas.width, 277 / canvas.height)', a: '        const escala = 190 / canvas.width' },
    { nombre: 'el error del recibo no se dice', de: '      err.hidden = !r.error\n', a: '      err.hidden = true\n' },
    { nombre: 'solo N2 dice N1', de: "      return soloN2 ? e.replace(/^N1-/, 'Orden ') : e", a: '      return e' },
    { nombre: 'el banco largo', de: "        .replace(/^banco\\s+(de\\s+la\\s+|del\\s+|de\\s+)?/i, '')", a: '' },
    { nombre: 'el logo sin validar', de: '      const logo = logoSeguro(e.logo_url)\n      const imp = ', a: '      const logo = e.logo_url\n      const imp = ' },
  ],
})
