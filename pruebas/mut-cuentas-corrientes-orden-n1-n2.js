// Mutaciones de test-cuentas-corrientes-orden-n1-n2.js (la venta y sus
// puntos N1 / N2 en la cuenta de cliente y proveedor). Ver mutar.js. De a una.
// La suite ancla su baseline al commit FIJO e6e0c74 (el origin/main del que
// salió la rama), nunca a HEAD.
//
//   node pruebas/mut-cuentas-corrientes-orden-n1-n2.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-cuentas-corrientes-orden-n1-n2.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/cuentas-corrientes.html'),
  // Automáticas: cada esc() del desplegable (el código de la orden, la
  // moneda, el mensaje de la base).
  funciones: ['htmlDivisionVentaCC'],
  manuales: [
    // Cuándo se lee
    { nombre: 'lee la base al pintar, sin que se toque la fila',
      de: '        const abierta = abiertas.has(id)\n        const idPanel', a: '        cargarDivisionCC(id)\n        const abierta = abiertas.has(id)\n        const idPanel' },
    { nombre: 'sin cache: lee cada vez que se abre',
      de: "      if (ya && ya.tipo !== 'error') return Promise.resolve()\n", a: '' },
    { nombre: 'un corte de conexión queda guardado (no se reintenta)',
      de: "      if (ya && ya.tipo !== 'error') return Promise.resolve()", a: '      if (ya) return Promise.resolve()' },
    { nombre: 'dos toques mientras lee: dos lecturas',
      de: "      if (ya?.tipo === 'cargando') return ya.promesa\n", a: '' },
    { nombre: 'otra condición en vez de la guardada (p_pct_a)',
      de: "{ p_orden_id: ordenId, p_pct_a: null, p_comisiones: null }", a: "{ p_orden_id: ordenId, p_pct_a: 50, p_comisiones: null }" },
    { nombre: 'otra RPC',
      de: "supabase.rpc('datos_division_orden',", a: "supabase.rpc('datos_orden',", },
    // Qué filas despliegan
    { nombre: 'la corrección "Comisión" también despliega (sin mirar el chip)',
      de: "        const fila = row.querySelector('.cu-chip--venta') ? filaVentaCC(cu, id) : null", a: '        const fila = filaVentaCC(cu, id)' },
    { nombre: 'filaVentaCC no mira la etiqueta',
      de: "find(f => f.etiqueta === 'Venta' && f.orden_retiro_id === ordenId)", a: 'find(f => f.orden_retiro_id === ordenId)' },
    { nombre: 'decorar dos veces duplica el "Ver N1 / N2"',
      de: "        if (!row.classList.contains('cc-fila-venta')) {", a: '        if (true) {' },
    { nombre: 'repintar arma otro panel en vez de usar el que está',
      de: "        let panel = sig?.classList?.contains('cc-n1n2') && sig.id === idPanel ? sig : null", a: '        let panel = null' },
    { nombre: 'cerrar no saca el panel',
      de: '        if (!abierta) { panel?.remove(); continue }', a: '        if (!abierta) continue' },
    { nombre: 'aria-expanded siempre "false"',
      de: "        row.setAttribute('aria-expanded', abierta ? 'true' : 'false')", a: "        row.setAttribute('aria-expanded', 'false')" },
    { nombre: 'abierta sigue diciendo "Ver N1 / N2"',
      de: "abierta ? 'Ocultar N1 / N2 ▴' : 'Ver N1 / N2 ▾'", a: "'Ver N1 / N2 ▾'" },
    { nombre: 'sin role="button" (no se puede tocar con el teclado)',
      de: "          row.setAttribute('role', 'button')\n", a: '' },
    { nombre: 'el toque nunca lo atiende este módulo',
      de: '      if (!row) return false\n      alternarVentaCC(row.dataset.ordenRetiro)', a: '      if (row || !row) return false\n      alternarVentaCC(row.dataset.ordenRetiro)' },
    { nombre: 'una orden que no es Venta igual se abre',
      de: '      if (!f?.unica || !filaVentaCC(f.unica, ordenId)) return\n', a: '      if (!f?.unica) return\n' },
    // Qué se muestra
    { nombre: 'el N1 se muestra aunque sea 0',
      de: '        if (cA !== 0) html +=', a: '        if (true) html +=' },
    { nombre: 'el N2 se muestra aunque sea 0',
      de: '        if (cB !== 0) html +=', a: '        if (true) html +=' },
    { nombre: 'el N1 sin la comisión',
      de: "cCom !== 0 ? `(incluye comisión de vendedores ${formatearImporte(cCom / 100, moneda)})` : ''", a: "''" },
    { nombre: '"incluye comisión" aunque no haya vendedores',
      de: "cCom !== 0 ? `(incluye comisión", a: "true ? `(incluye comisión" },
    { nombre: 'el total con división sale de la cuenta y no de N1 + N2',
      de: "        html += linea('Total', (cA + cB) / 100, '', true)", a: "        html += linea('Total', cuenta / 100, '', true)" },
    { nombre: 'sin el total con división',
      de: "        html += linea('Total', (cA + cB) / 100, '', true)\n", a: '' },
    { nombre: 'sin el aviso de que la cuenta dice otra cosa',
      de: '        if (cuenta !== null && cuenta !== cA + cB) html +=', a: '        if (false) html +=' },
    { nombre: 'el código del punto: el número después del guion',
      de: "(_, letra) => letra + n + '-')", a: "(_, letra) => letra + '-' + n)" },
    { nombre: 'el N2 con el código del N1',
      de: "linea(codigoPuntoCC(info.codigo, 'B'), cB / 100)", a: "linea(codigoPuntoCC(info.codigo, 'A'), cB / 100)" },
    // Sin división
    { nombre: 'guardada = false se toma como división',
      de: "data.guardada !== true) return { tipo: 'sin_division' }", a: "false) return { tipo: 'sin_division' }" },
    { nombre: 'sin "Sin división N1/N2"',
      de: "      if (info?.tipo === 'sin_division') return total + suave(TEXTO_SIN_DIVISION_CC)", a: "      if (info?.tipo === 'sin_division') return total" },
    { nombre: 'otro texto de "Sin división"',
      de: "    const TEXTO_SIN_DIVISION_CC = 'Sin división N1/N2'", a: "    const TEXTO_SIN_DIVISION_CC = 'Sin división'" },
    // Permisos
    { nombre: 'sin retiros:precios igual llama a la base',
      de: "      if (!puedeVerDivisionCC()) return Promise.resolve()\n", a: '' },
    { nombre: 'sin retiros:precios muestra "Leyendo…"',
      de: "      if (!puedeVerDivisionCC()) return { tipo: 'sin_permiso' }\n", a: '' },
    { nombre: 'pide retiros:ver en vez de retiros:precios',
      de: "      return tieneTarea('retiros', 'precios')", a: "      return tieneTarea('retiros', 'ver')" },
    { nombre: 'el rechazo por permiso se toma como "sin división"',
      de: "/permiso|identificar tu usuario/i.test(msg)", a: 'false' },
    { nombre: 'un corte de conexión se toma como "sin división"',
      de: "        return { tipo: 'error', mensaje: msg }", a: "        return { tipo: 'sin_division' }" },
    { nombre: 'sin conexión no dice nada',
      de: "      if (info?.tipo === 'error') return total + suave(", a: "      if (info?.tipo === 'error') return total + suave('') + (" },
    { nombre: 'el mensaje de la conexión se pierde',
      de: "        return { tipo: 'error', mensaje: err?.message || '' }\n      }\n    }", a: "        return { tipo: 'error', mensaje: '' }\n      }\n    }" },
    // El enlace
    { nombre: 'pintar no decora las ventas',
      de: 'pintarCuentaUnica(ctx); decorarVentasCC(); return }', a: 'pintarCuentaUnica(ctx); return }' },
    { nombre: 'el click no pasa por alTocarVentaCC',
      de: "unicaCC.addEventListener('click', (ev) => { if (alTocarVentaCC(ev)) return; const ctx", a: "unicaCC.addEventListener('click', (ev) => { const ctx" },
    { nombre: 'sin Enter ni espacio',
      de: "      if (ev.key !== 'Enter' && ev.key !== ' ') return\n      if (!ev.target?.matches?.('.cu-fila.cc-fila-venta')) return\n      ev.preventDefault()\n      alternarVentaCC(ev.target.dataset.ordenRetiro)",
      a: "      if (ev.key !== 'Enter' && ev.key !== ' ') return\n      if (!ev.target?.matches?.('.cu-fila.cc-fila-venta')) return\n      ev.preventDefault()" },
    { nombre: 'repintar desde cuenta-unica.js no vuelve a decorar',
      de: "    if (typeof MutationObserver === 'function') new MutationObserver(() => decorarVentasCC()).observe(unicaCC, { childList: true })\n", a: '' },
    { nombre: 'sin el estilo de la fila (no parece que se toque)',
      de: '    .cu-fila.cc-fila-venta { cursor: pointer; }\n', a: '' },
  ],
})
