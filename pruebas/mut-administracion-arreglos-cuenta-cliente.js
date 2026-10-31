// Mutaciones de test-administracion-arreglos-cuenta-cliente.js (la cuenta del
// cliente, 31/10/2026, arreglos de la auditoría, puntos 2 y 5b: N1 / N2 en
// la cuenta de cliente y proveedor, y lo que ya tenía aplicado un crédito con
// aplicaciones_credito_cliente). Ver mutar.js. De a una.
//
// Antes de mutar, el BASELINE: sobre el código de antes del cambio
// (git show 1c20f98:modulos/administracion.html, el origin/main del que salió
// la rama; commit FIJO, nunca HEAD) la suite tiene que dar ROJO.
//
//   node pruebas/mut-administracion-arreglos-cuenta-cliente.js
'use strict'
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

const SUITE = path.join(__dirname, 'test-administracion-arreglos-cuenta-cliente.js')
const BASE_ANTES = '1c20f98'
if (process.env.MUT_SOLO_ANCLAS !== '1') {
  const tmp = path.join(__dirname, 'mut-tmp-arreglos-cuenta-cliente-antes.html')
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
    } catch (err) { rojo = true; salida = String(err.stdout || '') + String(err.stderr || '') }
    fs.unlinkSync(tmp)
    console.log(`Baseline ${BASE_ANTES} (antes del cambio): ${salida.trim().split('\n').pop()}`)
    if (!rojo) { console.log('ABORTADO: la suite da VERDE sobre el código de antes del cambio: no lo está probando.'); process.exit(2) }
  }
}

correrMutaciones({
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  region: limitesAdministracion,
  // Automáticas: cada esc() del desplegable (el código de la orden, el
  // mensaje de la base).
  funciones: ['htmlDivisionVentaAd'],
  equivalentes: [
    { expr: 'esc(importeHoja(monto, moneda))', motivo: 'un importe de importeHoja() ("$ " o "US$ ", dígitos, puntos y comas): la moneda solo elige el símbolo, nada escapable' },
    { expr: 'esc(nota)', motivo: '"(incluye comisión de vendedores $ …)": literal del código con un importe de importeHoja(), nada escapable' },
  ],
  manuales: [
    // ── PUNTO 2: N1 / N2 ────────────────────────────────────────────────
    // Cuándo se lee
    { nombre: 'N1/N2: lee la base al pintar, sin que se toque la fila',
      de: "        const abierta = abiertas.has(id)\n        const idPanel = 'ad-n1n2-' + id", a: "        cargarDivisionAd(id)\n        const abierta = abiertas.has(id)\n        const idPanel = 'ad-n1n2-' + id" },
    { nombre: 'N1/N2: sin cache, lee cada vez que se abre',
      de: "      if (ya && ya.tipo !== 'error') return Promise.resolve()\n      const entrada = { tipo: 'cargando', promesa: null }\n      cache.set(ordenId, entrada)\n      entrada.promesa = leerDivisionAd(", a: "      const entrada = { tipo: 'cargando', promesa: null }\n      cache.set(ordenId, entrada)\n      entrada.promesa = leerDivisionAd(" },
    { nombre: 'N1/N2: un corte de conexión queda guardado (no se reintenta)',
      de: "      if (ya && ya.tipo !== 'error') return Promise.resolve()\n      const entrada = { tipo: 'cargando', promesa: null }\n      cache.set(ordenId, entrada)\n      entrada.promesa = leerDivisionAd(", a: "      if (ya) return Promise.resolve()\n      const entrada = { tipo: 'cargando', promesa: null }\n      cache.set(ordenId, entrada)\n      entrada.promesa = leerDivisionAd(" },
    { nombre: 'N1/N2: otra condición en vez de la guardada (p_pct_a)',
      de: "await supabase.rpc('datos_division_orden', { p_orden_id: ordenId, p_pct_a: null, p_comisiones: null })\n        return divisionDeRespuestaAd(", a: "await supabase.rpc('datos_division_orden', { p_orden_id: ordenId, p_pct_a: 50, p_comisiones: null })\n        return divisionDeRespuestaAd(" },
    // Qué filas despliegan
    { nombre: 'N1/N2: la corrección "Comisión" también despliega (sin mirar el chip)',
      de: "        const fila = row.querySelector('.cu-chip--venta') ? filaVentaAd(cu, id) : null", a: '        const fila = filaVentaAd(cu, id)' },
    { nombre: 'N1/N2: filaVentaAd no mira la etiqueta',
      de: "      return (cu?.filas ?? []).find(f => f.etiqueta === 'Venta' && f.orden_retiro_id === ordenId) ?? null\n    }\n\n    function divisionesOrdenAd", a: '      return (cu?.filas ?? []).find(f => f.orden_retiro_id === ordenId) ?? null\n    }\n\n    function divisionesOrdenAd' },
    { nombre: 'N1/N2: decorar dos veces duplica el "Ver N1 / N2"',
      de: "        if (!row.classList.contains('ad-fila-venta')) {", a: '        if (true) {' },
    { nombre: 'N1/N2: el "Ver la orden ›" de la fila no se esconde',
      de: "          for (const v of row.querySelectorAll('.cu-fila__ver')) v.hidden = true\n", a: '' },
    { nombre: 'N1/N2: a un botón también se le pone role y tabindex',
      de: "          if (row.tagName !== 'BUTTON') {\n            row.setAttribute('role', 'button')", a: "          if (true) {\n            row.setAttribute('role', 'button')" },
    { nombre: 'N1/N2: una fila div no lleva role="button"',
      de: "          if (row.tagName !== 'BUTTON') {\n            row.setAttribute('role', 'button')", a: "          if (false) {\n            row.setAttribute('role', 'button')" },
    { nombre: 'N1/N2: repintar arma otro panel en vez de usar el que está',
      de: "        let panel = sig?.classList?.contains('ad-n1n2') && sig.id === idPanel ? sig : null", a: '        let panel = null' },
    { nombre: 'N1/N2: cerrar no saca el panel',
      de: "        if (!abierta) { panel?.remove(); continue }\n        if (!panel) {\n          panel = document.createElement('div')\n          panel.className = 'ad-n1n2'", a: "        if (!abierta) continue\n        if (!panel) {\n          panel = document.createElement('div')\n          panel.className = 'ad-n1n2'" },
    { nombre: 'N1/N2: abierta sigue diciendo "Ver N1 / N2"',
      de: "        if (ver) ver.textContent = abierta ? 'Ocultar N1 / N2 ▴' : 'Ver N1 / N2 ▾'", a: "        if (ver) ver.textContent = 'Ver N1 / N2 ▾'" },
    { nombre: 'N1/N2: sin "Ver la orden ›" en el desplegable',
      de: "        panel.innerHTML = htmlDivisionVentaAd(fila, infoDivisionAd(id)) +\n          (puedeVerLaOrden() ?", a: '        panel.innerHTML = htmlDivisionVentaAd(fila, infoDivisionAd(id)) +\n          (false ?' },
    { nombre: 'N1/N2: "Ver la orden ›" aunque no pueda ver la orden',
      de: "        panel.innerHTML = htmlDivisionVentaAd(fila, infoDivisionAd(id)) +\n          (puedeVerLaOrden() ?", a: '        panel.innerHTML = htmlDivisionVentaAd(fila, infoDivisionAd(id)) +\n          (true ?' },
    { nombre: 'N1/N2: el id de la orden sin escapar en "Ver la orden ›"',
      de: 'data-ad-n1n2-orden="${esc(id)}">Ver la orden ›', a: 'data-ad-n1n2-orden="${id}">Ver la orden ›' },
    { nombre: 'N1/N2: el toque nunca lo atiende Administración',
      de: "      if (!row) return false\n      alternarVentaAd(row.dataset.ordenRetiro)", a: "      if (row || !row) return false\n      alternarVentaAd(row.dataset.ordenRetiro)" },
    { nombre: 'N1/N2: "Ver la orden ›" del desplegable no abre la orden',
      de: '      if (orden) { if (puedeVerLaOrden()) abrirOrdenDesde(orden.dataset.adN1n2Orden); return true }', a: '      if (orden) return true' },
    { nombre: 'N1/N2: otro cliente abierto mientras lee hereda la venta',
      de: '      await cargarDivisionAd(ordenId)\n      if (estado.cliente === c) decorarVentasAd()', a: '      await cargarDivisionAd(ordenId)\n      c.ventasAbiertasAd = abiertas; estado.cliente.ventasAbiertasAd = abiertas; decorarVentasAd()' },
    // Qué se muestra
    { nombre: 'N1/N2: el N2 se muestra aunque sea 0',
      de: "        if (cB !== 0) html += linea(codigoPunto(info.codigo, 'B'), cB / 100)", a: "        html += linea(codigoPunto(info.codigo, 'B'), cB / 100)" },
    { nombre: 'N1/N2: el N1 sin la comisión',
      de: "cCom !== 0 ? `(incluye comisión de vendedores ${importeHoja(cCom / 100, moneda)})` : ''", a: "''" },
    { nombre: 'N1/N2: el total sale de la cuenta y no de N1 + N2',
      de: "        html += linea('Total', (cA + cB) / 100, '', true)", a: "        html += linea('Total', cuenta / 100 + 1, '', true)" },
    { nombre: 'N1/N2: el N2 con el código del N1',
      de: "linea(codigoPunto(info.codigo, 'B'), cB / 100)", a: "linea(codigoPunto(info.codigo, 'A'), cB / 100)" },
    // Sin división / sin permiso
    { nombre: 'N1/N2: guardada = false se toma como división',
      de: "data.guardada !== true) return { tipo: 'sin_division' }\n      return { tipo: 'division', codigo: data.codigo ?? '', totalA", a: "false) return { tipo: 'sin_division' }\n      return { tipo: 'division', codigo: data.codigo ?? '', totalA" },
    { nombre: 'N1/N2: sin "Sin división N1/N2"',
      de: "      if (info?.tipo === 'sin_division') return total + suave(TEXTO_SIN_DIVISION_AD)", a: "      if (info?.tipo === 'sin_division') return total" },
    { nombre: 'N1/N2: sin retiros:precios igual llama a la base',
      de: "      if (!puedeVerDivisionAd()) return Promise.resolve()\n", a: '' },
    { nombre: 'N1/N2: sin retiros:precios muestra "Leyendo…"',
      de: "      if (!puedeVerDivisionAd()) return { tipo: 'sin_permiso' }\n", a: '' },
    { nombre: 'N1/N2: pide retiros:ver en vez de retiros:precios',
      de: "    function puedeVerDivisionAd() {\n      return tieneTarea('retiros', 'precios')", a: "    function puedeVerDivisionAd() {\n      return tieneTarea('retiros', 'ver')" },
    { nombre: 'N1/N2: el rechazo por permiso se toma como "sin división"',
      de: "        if (error.code === '42501' || /permiso|identificar tu usuario/i.test(msg)) return { tipo: 'sin_permiso' }\n        if (error.code === 'P0001' || /condición de venta|no se divide|valorizar|anulada|no existe/i.test(msg)) return { tipo: 'sin_division' }\n        return { tipo: 'error', mensaje: msg }\n      }\n      if (!data || typeof data !== 'object' || data.guardada !== true) return { tipo: 'sin_division' }\n      return { tipo: 'division', codigo: data.codigo ?? '', totalA: data.total_a, comision: data.comision_total, totalB: data.total_b }\n    }\n\n    // Lo que se sabe AHORA de esa orden (sin permiso no se pregunta).\n    function infoDivisionAd",
      a: "        if (error.code === '42501') return { tipo: 'sin_permiso' }\n        if (error.code === 'P0001' || /condición de venta|no se divide|valorizar|anulada|no existe/i.test(msg)) return { tipo: 'sin_division' }\n        return { tipo: 'error', mensaje: msg }\n      }\n      if (!data || typeof data !== 'object' || data.guardada !== true) return { tipo: 'sin_division' }\n      return { tipo: 'division', codigo: data.codigo ?? '', totalA: data.total_a, comision: data.comision_total, totalB: data.total_b }\n    }\n\n    // Lo que se sabe AHORA de esa orden (sin permiso no se pregunta).\n    function infoDivisionAd" },
    { nombre: 'N1/N2: sin conexión no dice nada',
      de: "      if (info?.tipo === 'error') return total + suave('No se pudo leer N1 / N2'", a: "      if (info?.tipo === 'error') return total + ('No se pudo leer N1 / N2'.slice(0, 0)" },
    // El enlace
    { nombre: 'N1/N2: pintar no decora las ventas',
      de: '      pintarCuentaUnica(ctx)\n      decorarVentasAd()\n', a: '      pintarCuentaUnica(ctx)\n' },
    { nombre: 'N1/N2: el click no pasa por alTocarVentaAd',
      de: "unica.addEventListener('click', (e) => { if (alTocarVentaAd(e)) return; const ctx", a: "unica.addEventListener('click', (e) => { const ctx" },
    { nombre: 'N1/N2: Enter y espacio también en un botón (lo abriría dos veces)',
      de: "        if (!e.target?.matches?.('.cu-fila.ad-fila-venta') || e.target.tagName === 'BUTTON') return", a: "        if (!e.target?.matches?.('.cu-fila.ad-fila-venta')) return" },
    { nombre: 'N1/N2: repintar desde cuenta-unica.js no vuelve a decorar',
      de: "      if (typeof MutationObserver === 'function') new MutationObserver(() => decorarVentasAd()).observe(unica, { childList: true })\n", a: '' },
    { nombre: 'N1/N2: sin el estilo de la fila',
      de: '    .cu-fila.ad-fila-venta { cursor: pointer; }\n', a: '' },

    // ── PUNTO 5b: lo que ya tenía MÁS lo nuevo ──────────────────────────
    { nombre: '5b: vuelve el hueco (con algo aplicado no se ofrece Aplicar)',
      de: '      return !!k?.credito_id && centavosAplAd(k.libre) > 0', a: '      return !!k?.credito_id && centavosAplAd(k.libre) > 0 && centavosAplAd(k.aplicado) === 0' },
    { nombre: '5b: solo las cobranzas leen lo que ya tenían',
      de: '        previas: centavosAplAd(k?.aplicado) > 0 ? null : [],', a: "        previas: k?.credito_tipo === 'cobranza' && centavosAplAd(k?.aplicado) > 0 ? null : []," },
    { nombre: '5b: nunca se lee lo que ya tenía',
      de: '        previas: centavosAplAd(k?.aplicado) > 0 ? null : [],', a: '        previas: [],' },
    { nombre: '5b: se lee con recibo_cobranza',
      de: "res = await supabase.rpc('aplicaciones_credito_cliente', { p_cliente_id: c.id, p_credito_tipo: k.credito_tipo, p_credito_id: k.credito_id })", a: "res = await supabase.rpc('recibo_cobranza', { p_cobranza_id: k.credito_id })" },
    { nombre: '5b: otro crédito en la lectura',
      de: "res = await supabase.rpc('aplicaciones_credito_cliente', { p_cliente_id: c.id, p_credito_tipo: k.credito_tipo, p_credito_id: k.credito_id })", a: "res = await supabase.rpc('aplicaciones_credito_cliente', { p_cliente_id: c.id, p_credito_tipo: 'cobranza', p_credito_id: k.credito_id })" },
    { nombre: '5b: lo previo con "monto" en vez de "efectivo"',
      de: '        const cent = centavosAplAd(a?.efectivo ?? a?.monto)', a: '        const cent = centavosAplAd(a?.monto)' },
    { nombre: '5b: lo previo pierde el medio',
      de: 'monto: cent / 100, medio: MEDIOS_APLICAR_AD.includes(a.medio) ? a.medio : null })', a: 'monto: cent / 100, medio: null })' },
    { nombre: '5b: lo previo no se manda',
      de: '      const items = itemsParaEnviarAd(ap.previas, r.nuevos)', a: '      const items = itemsParaEnviarAd([], r.nuevos)' },
    { nombre: '5b: lo mismo dos veces no se suma',
      de: '        if (ya) ya.cent += centavosAplAd(it.monto)\n        else porClave.set', a: '        porClave.set' },
    { nombre: '5b: se suma sin mirar el medio',
      de: "        const k = claveDocAd(it) + '|' + (it.medio ?? '')", a: '        const k = claveDocAd(it)' },
    { nombre: '5b: si la lectura falla, se aplica igual',
      de: "          ap.errorPrevias = 'No se pudo leer lo que este crédito ya tenía aplicado (' + (res?.error?.message || 'no vino nada') + '). Sin eso no se puede aplicar: se borraría.'\n          pintarCliente()\n          return\n", a: '' },
    { nombre: '5b: sin lista, se toma como "nada aplicado"',
      de: '        if (res?.error || !Array.isArray(res?.data)) {', a: '        if (res?.error) {' },
    { nombre: '5b: no se compara lo leído con la cuenta',
      de: '        if (suma !== centavosAplAd(k.aplicado)) {', a: '        if (false) {' },
    { nombre: '5b: el mensaje de la base al leer, sin escapar',
      de: "      if (ap.errorPrevias) return `<div class=\"ad-panel ad-apl\" id=\"ad-apl\">${aplTitulo}<div class=\"ad-aviso ad-aviso--grave\">${esc(ap.errorPrevias)}</div>", a: "      if (ap.errorPrevias) return `<div class=\"ad-panel ad-apl\" id=\"ad-apl\">${aplTitulo}<div class=\"ad-aviso ad-aviso--grave\">${ap.errorPrevias}</div>" },
  ],
})
