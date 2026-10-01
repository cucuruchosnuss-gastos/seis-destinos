// Mutaciones de test-caja-cobranza.js (Caja y las cobranzas, 30/09/2026).
// Ver mutar.js.
//
//   node pruebas/mut-caja-cobranza.js
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-caja-cobranza.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/caja.html'),
  funciones: [],
  manuales: [
    { nombre: 'un movimiento de cobranza se llama como cualquier ingreso',
      de: '      if (m.cobranza_id) {\n        const cliente = clienteDeCobranza(m)', a: '      if (false) {\n        const cliente = clienteDeCobranza(m)' },
    { nombre: 'sin el cliente en la etiqueta',
      de: "return cliente ? 'Cobranza de ' + cliente : 'Cobranza'", a: "return 'Cobranza'" },
    { nombre: 'la referencia queda pegada al cliente',
      de: '(?: del \\d{2}\\/\\d{2}\\/\\d{4}| · [\\s\\S]*)?$/', a: '(?: del \\d{2}\\/\\d{2}\\/\\d{4})?$/' },
    { nombre: 'la fecha queda pegada al cliente',
      de: '(?: del \\d{2}\\/\\d{2}\\/\\d{4}| · [\\s\\S]*)?$/', a: '(?: · [\\s\\S]*)?$/' },
    { nombre: 'la fila no dice que viene de una cobranza',
      de: '              ${refGasto}\n              ${refCobranza}\n', a: '              ${refGasto}\n' },
    { nombre: 'el link a la cobranza sin encodeURIComponent',
      de: 'cobranza=${encodeURIComponent(m.cobranza_id)}', a: 'cobranza=${m.cobranza_id}' },
    { nombre: 'la ficha sin cobranza_id',
      de: '          id, tipo, monto, moneda, medio_pago, cuenta_id, descripcion, fecha, gasto_id, contraparte_empleado_id, cobranza_id,\n          gastos ( razon_social, categorias ( nombre ) )\n        `)\n        .eq(',
      a: '          id, tipo, monto, moneda, medio_pago, cuenta_id, descripcion, fecha, gasto_id, contraparte_empleado_id,\n          gastos ( razon_social, categorias ( nombre ) )\n        `)\n        .eq(' },
    { nombre: '"Todos los movimientos" sin cobranza_id',
      de: 'contraparte_empleado_id, gasto_id, cobranza_id\')', a: 'contraparte_empleado_id, gasto_id\')' },
    { nombre: 'el aviso del ingreso externo siempre escondido',
      de: "document.getElementById('aviso-ingreso-cliente').hidden = !(tipo === 'ingreso' && subtipo === 'externo')",
      a: "document.getElementById('aviso-ingreso-cliente').hidden = true" },
    { nombre: 'el aviso del ingreso externo en cualquier movimiento',
      de: "document.getElementById('aviso-ingreso-cliente').hidden = !(tipo === 'ingreso' && subtipo === 'externo')",
      a: "document.getElementById('aviso-ingreso-cliente').hidden = false" },
    { nombre: 'el aviso sin el link a Cobranzas',
      de: 'cargala en <a href="cobranzas.html">Cobranzas</a> para', a: 'cargala en Cobranzas para' },
  ],
})
