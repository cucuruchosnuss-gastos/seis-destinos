// Mutaciones de test-cuentas-corrientes-arreglos-detalle-pago.js (arreglos de
// la auditoría del 30/10, punto 4: el detalle del pago). Ver mutar.js. De a una.
// La suite ancla su baseline al commit FIJO 1c20f98 (el origin/main del que
// salió la rama), nunca a HEAD.
//
//   node pruebas/mut-cuentas-corrientes-arreglos-detalle-pago.js
'use strict'

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-cuentas-corrientes-arreglos-detalle-pago.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/cuentas-corrientes.html'),
  // Lo nuevo no dibuja nada interpolado (el aviso es un texto fijo).
  funciones: [],
  manuales: [
    // ── b) Los cheques de este pago, como la base ──────────────────────────
    { nombre: 'b: cuentan los cheques que no están endosados',
      de: "        .filter(c => !!c && c.estado === 'endosado' && (c.pago_gasto_id ?? c.salida_gasto_id) === gastoId)",
      a: "        .filter(c => !!c && (c.pago_gasto_id ?? c.salida_gasto_id) === gastoId)" },
    { nombre: 'b: pago_gasto_id O salida_gasto_id en vez del coalesce',
      de: "        .filter(c => !!c && c.estado === 'endosado' && (c.pago_gasto_id ?? c.salida_gasto_id) === gastoId)",
      a: "        .filter(c => !!c && c.estado === 'endosado' && (c.pago_gasto_id === gastoId || c.salida_gasto_id === gastoId))" },
    { nombre: 'b: solo por pago_gasto_id (se pierde el de salida)',
      de: "        .filter(c => !!c && c.estado === 'endosado' && (c.pago_gasto_id ?? c.salida_gasto_id) === gastoId)",
      a: "        .filter(c => !!c && c.estado === 'endosado' && c.pago_gasto_id === gastoId)" },
    { nombre: 'b: el detalle no filtra los cheques',
      de: '      for (const ch of chequesDeEstePagoCC(chPago?.data, chSalida?.data, id)) if',
      a: '      for (const ch of [...(chPago?.data ?? []), ...(chSalida?.data ?? [])]) if' },
    { nombre: 'b: la vista previa de Anular no filtra los cheques',
      de: '      for (const c of chequesDeEstePagoCC(chPago?.data, chSalida?.data, gastoId)) {',
      a: '      for (const c of [...(chPago?.data ?? []), ...(chSalida?.data ?? [])]) {' },
    { nombre: 'b: el detalle no lee pago_gasto_id ni salida_gasto_id',
      de: "fecha_pago, importe, titulares, estado, pago_gasto_id, salida_gasto_id'",
      a: "fecha_pago, importe, titulares, estado'" },
    { nombre: 'b: Anular no lee pago_gasto_id ni salida_gasto_id',
      de: "banco_codigo, numero, importe, estado, pago_gasto_id, salida_gasto_id'",
      a: "banco_codigo, numero, importe, estado'" },

    // ── a) Releer lo de a cuenta y "Anular" después de sacar o agregar ─────
    { nombre: 'a: después de sacar no se relee el panel de acciones',
      de: "        s.error = err?.message || 'No se pudo sacar el cheque. Probá de nuevo.'\n        if (estado.detallePago === dp) pintarDetallePago()\n        return\n      }\n      releerAccionesTrasCambioChequesDP(dp)\n",
      a: "        s.error = err?.message || 'No se pudo sacar el cheque. Probá de nuevo.'\n        if (estado.detallePago === dp) pintarDetallePago()\n        return\n      }\n" },
    { nombre: 'a: después de agregar no se relee el panel de acciones',
      de: "        a.error = err?.message || 'No se pudieron agregar los cheques. Probá de nuevo.'\n        if (estado.detallePago === dp) pintarDetallePago()\n        return\n      }\n      releerAccionesTrasCambioChequesDP(dp)\n",
      a: "        a.error = err?.message || 'No se pudieron agregar los cheques. Probá de nuevo.'\n        if (estado.detallePago === dp) pintarDetallePago()\n        return\n      }\n" },
    { nombre: 'a: se relee aunque el detalle ya no esté abierto',
      de: '      if (estado.detallePago === dp) cargarAccionesDetallePago(dp.gastoId)',
      a: '      cargarAccionesDetallePago(dp.gastoId)' },

    // ── c) La lectura vacía en un pago con cheques ─────────────────────────
    { nombre: 'c: vacío sin error no avisa',
      de: "      return g.estado !== 'anulado' && esPagoConChequesDeCarteraCC(g)\n",
      a: '      return false\n' },
    { nombre: 'c: avisa también en un pago anulado',
      de: "      return g.estado !== 'anulado' && esPagoConChequesDeCarteraCC(g)\n",
      a: '      return esPagoConChequesDeCarteraCC(g)\n' },
    { nombre: 'c: avisa en cualquier pago "con cheque" (también los viejos sin cartera)',
      de: "      return g.estado !== 'anulado' && esPagoConChequesDeCarteraCC(g)\n",
      a: "      return g.estado !== 'anulado'\n" },
    { nombre: 'c: el error al leer los cheques no se anota (de mut-…-detalle-pago-cheques)',
      de: '      dp.chequesError = !!(chPago?.error || chSalida?.error)', a: '      dp.chequesError = false' },
    { nombre: 'c: con error, no avisa si la descripción no dice cartera',
      de: '      if (dp.chequesError) return true\n',
      a: '' },
    { nombre: 'c: avisa aunque se vean cheques',
      de: "      if (!g || g.medio_pago !== 'cheque' || (dp.cheques ?? []).length) return false",
      a: "      if (!g || g.medio_pago !== 'cheque') return false" },
    { nombre: 'c: el cheque endosado no cuenta como pago de la cartera',
      de: " || d.startsWith('Cheque endosado')",
      a: '' },
    { nombre: 'c: el aviso no se dibuja',
      de: '      const sinLeer = noSeVenChequesDP(dp)\n',
      a: '      const sinLeer = false\n' },
    { nombre: 'c: el aviso con el texto viejo',
      de: "'<p class=\"detalle-pago-suave\">No se pueden ver los cheques de este pago con tu usuario.</p>'",
      a: "'<p class=\"detalle-pago-suave\">Con tu usuario no se pueden ver los cheques de este pago (hace falta poder ver sus cobranzas).</p>'" },
    { nombre: 'c: Anular promete cheques en un pago viejo sin cartera',
      de: "      if (g.medio_pago === 'cheque' && (a.cheques?.length || !Array.isArray(a.cheques) || esPagoConChequesDeCarteraCC(g))) {",
      a: "      if (g.medio_pago === 'cheque') {" },
    { nombre: 'c: Anular calla los cheques que no se pudieron leer (error)',
      de: "      if (g.medio_pago === 'cheque' && (a.cheques?.length || !Array.isArray(a.cheques) || esPagoConChequesDeCarteraCC(g))) {",
      a: "      if (g.medio_pago === 'cheque' && (a.cheques?.length || esPagoConChequesDeCarteraCC(g))) {" },

    // ── d) Anular con efectivo o transferencia: vuelve a la caja ───────────
    { nombre: 'd: sin cuenta no dice que vuelve a la caja',
      de: "      if (['efectivo', 'transferencia'].includes(g.medio_pago)) lineas.push(",
      a: "      if (['efectivo', 'transferencia'].includes(g.medio_pago) && g.cuenta_id) lineas.push(" },
    { nombre: 'd: la línea no dice "caja"',
      de: '} a la caja (a la cuenta de la que salieron)`)',
      a: '} a la cuenta de la que salieron`)' },
    { nombre: 'd: con QR también promete plata',
      de: "      if (['efectivo', 'transferencia'].includes(g.medio_pago)) lineas.push(",
      a: "      if (['efectivo', 'transferencia', 'qr'].includes(g.medio_pago)) lineas.push(" },
    { nombre: 'd: transferencia no dice nada',
      de: "      if (['efectivo', 'transferencia'].includes(g.medio_pago)) lineas.push(",
      a: "      if (['efectivo'].includes(g.medio_pago)) lineas.push(" },
  ],
})
