// Mutaciones de test-cheques-emitidos.js (los cheques emitidos y el pago con
// cheques de la cartera, 05/10/2026). Ver mutar.js.
//
//   node pruebas/mut-cheques-emitidos.js

const path = require('path')
const { correrMutaciones } = require('./mutar')
// La cartera vive en una región de administracion.html: se muta SOLO ahí.
const { ARCHIVO_CHEQUES, limitesCheques } = require('./fuente-cheques')

correrMutaciones({
  region: limitesCheques,
  suite: path.join(__dirname, 'test-cheques-emitidos.js'),
  original: process.env.ARCHIVO_BASE || ARCHIVO_CHEQUES,
  escape: 'esc',
  funciones: ['htmlEmitido', 'htmlTotalEmitidos', 'pintarFiltroCuentasEmitidos'],
  equivalentes: [
    { expr: 'esc(tipo)', motivo: "'Cheque' o 'E-cheque', literales del código" },
    { expr: 'esc(formatearImporte(c.importe))', motivo: 'formatearImporte() de un número: dígitos, puntos, coma y $' },
    { expr: 'esc(formatearFechaCob(c.fecha_emision))', motivo: 'una fecha dd/mm/aaaa o "—"' },
    { expr: 'esc(formatearFechaCob(c.fecha_pago))', motivo: 'una fecha dd/mm/aaaa o "—"' },
    { expr: 'esc(textoEstadoEmitido(c, hoy))', motivo: 'palabras fijas y una fecha dd/mm/aaaa' },
    { expr: "esc(ESTADO_EMITIDO[c.estado] ? c.estado : 'pendiente')", motivo: 'una de tres claves del código (pendiente, debitado, anulado)' },
    { expr: 'esc(formatearImporte(g.total))', motivo: 'formatearImporte() de un número' },
    { expr: 'esc(formatearFechaCob(g.proximo))', motivo: 'una fecha dd/mm/aaaa o "—"' },
  ],
  manuales: [
    // ── El pago con cheques de la cartera ─────────────────────────────────
    { nombre: 'un pago con cheques de la cartera ofrece volver a cartera', de: "      return ch?.estado === 'endosado' && !!(ch.salida_proveedor_id || ch.pago_gasto_id)", a: "      return ch?.estado === 'endosado' && !!ch.salida_proveedor_id" },
    { nombre: 'el link al pago no usa pago_gasto_id', de: '      return ch?.pago_gasto_id || ch?.salida_gasto_id || null', a: '      return ch?.salida_gasto_id || null' },
    { nombre: '"Pagó su cuenta" sin el link al pago', de: "Pagó su cuenta corriente</span>' + htmlLinkPago(ch)", a: "Pagó su cuenta corriente</span>'" },
    { nombre: 'el link al pago sin encodeURIComponent', de: 'href="cuentas-corrientes.html?pago=${encodeURIComponent(g)}">Ver el pago</a>', a: 'href="cuentas-corrientes.html?pago=${g}">Ver el pago</a>' },
    { nombre: 'la lista no trae pago_gasto_id', de: 'salida_proveedor_id, salida_gasto_id, pago_gasto_id\'),', a: 'salida_proveedor_id, salida_gasto_id\'),' },
    { nombre: '"Ver el pago" además abre la cobranza', de: "      cont.querySelectorAll('.chq-link-pago').forEach(a => a.addEventListener('click', (ev) => ev.stopPropagation()))\n", a: '' },
    // ── Lo pendiente: un cheque propio NO se debita antes de su fecha ─────
    { nombre: 'lo debitado suma como pendiente', de: "        if (c.estado !== 'pendiente' || !pasaFiltroUnidad(c.unidad_negocio_id, unidad)) continue", a: '        if (!pasaFiltroUnidad(c.unidad_negocio_id, unidad)) continue' },
    { nombre: 'lo pendiente no sigue a la barra', de: "        if (c.estado !== 'pendiente' || !pasaFiltroUnidad(c.unidad_negocio_id, unidad)) continue", a: "        if (c.estado !== 'pendiente') continue" },
    { nombre: 'lo pendiente sin centavos', de: '        g.centavos += Math.round(Number(c.importe) * 100)', a: '        g.centavos += Number(c.importe)' },
    { nombre: 'el próximo débito es el más lejano', de: "        if (!g.proximo || String(c.fecha_pago) < g.proximo) g.proximo = c.fecha_pago", a: "        if (!g.proximo || String(c.fecha_pago) > g.proximo) g.proximo = c.fecha_pago" },
    { nombre: 'un pendiente futuro dice que se debita hoy', de: "      return c.fecha_pago <= hoy ? 'Se debita hoy' : `Se debita el ${formatearFechaCob(c.fecha_pago)}`", a: "      return 'Se debita hoy'" },
    { nombre: 'un pendiente dice la fecha de emisión', de: "`Se debita el ${formatearFechaCob(c.fecha_pago)}`", a: "`Se debita el ${formatearFechaCob(c.fecha_emision)}`" },
    // ── Los filtros ───────────────────────────────────────────────────────
    { nombre: 'los emitidos no siguen a la barra', de: '        .filter(c => pasaFiltroUnidad(c.unidad_negocio_id, unidad))\n        .filter(c => estadoFiltro', a: '        .filter(c => estadoFiltro' },
    { nombre: 'el filtro de estado no filtra', de: "        .filter(c => estadoFiltro === 'todos' || c.estado === estadoFiltro)\n", a: '' },
    { nombre: 'el filtro de cuenta no filtra', de: '        .filter(c => !cuenta || c.cuenta_id === cuenta)\n', a: '' },
    { nombre: 'el filtro de fecha no filtra', de: "        .filter(c => (!desde || String(c.fecha_pago) >= desde) && (!hasta || String(c.fecha_pago) <= hasta))\n", a: '' },
    { nombre: 'los pendientes no van primero', de: "          if (pa !== pb) return pa - pb\n", a: '' },
    // ── El permiso ────────────────────────────────────────────────────────
    { nombre: 'los emitidos con solo ver_todo', de: '      return puedeProcesar() || puedeRegistrarPago()\n    }\n\n    function mostrarVistaCheques', a: '      return true\n    }\n\n    function mostrarVistaCheques' },
    { nombre: 'sin permiso igual consulta', de: "        estado.emitidos = []\n        pintarEmitidos()\n        return\n      }\n      sinPermiso.hidden = true", a: "        estado.emitidos = []\n        pintarEmitidos()\n      }\n      sinPermiso.hidden = true" },
    { nombre: 'sin los nombres de las cuentas', de: "          const r = await supabase.from('cuentas_caja').select('id, nombre').in('id', ids)", a: "          const r = { data: [], error: null }" },
    { nombre: 'leer mal deja una lista vacía', de: "      if (estado.emitidos == null) { lista.innerHTML = ''; totales.innerHTML = ''; vacio.hidden = true; return }", a: '      if (estado.emitidos == null) estado.emitidos = []' },
  ],
})
