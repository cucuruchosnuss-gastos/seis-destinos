// Mutaciones de test-cuentas-corrientes-comisiones.js (las comisiones del
// proveedor COMISIONES, 06/10/2026). Ver mutar.js.
//
//   node pruebas/mut-cuentas-corrientes-comisiones.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-cuentas-corrientes-comisiones.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/cuentas-corrientes.html'),
  escape: 'esc',
  funciones: ['htmlFilaComision'],
  equivalentes: [],
  manuales: [
    // La ficha
    { nombre: 'la consulta no trae modulo_origen', de: ".select('id, estado, saldo_pendiente, modulo_origen, observaciones').in('id', idsFactura)", a: ".select('id, estado, saldo_pendiente, observaciones').in('id', idsFactura)" },
    { nombre: 'la comisión va por la fila común', de: "        if (infoComision?.modulo_origen === 'comision') {", a: '        if (false) {' },
    { nombre: 'los códigos de todas las facturas', de: "      const idsComision = Object.values(infoFactura).filter(f => f.modulo_origen === 'comision').map(f => f.id)", a: '      const idsComision = Object.keys(infoFactura)' },
    { nombre: 'sin los códigos', de: "      estado.ficha.codigosComision = codigosComision\n", a: '' },
    { nombre: 'la referencia toma lo de la base aunque haya código', de: "      if (codigo) return 'Orden ' + codigo + (cliente ? ' · ' + cliente : '')", a: '' },
    { nombre: 'el cliente incluye lo que agrega la base', de: "      const cliente = m ? String(m[1] ?? '').split(' · ')[0].trim() : ''", a: "      const cliente = m ? String(m[1] ?? '').trim() : ''" },
    { nombre: '"Se la queda" también en una parcial', de: "          (estadoF === 'pendiente' ? `<button type=\"button\" class=\"btn btn--secundario btn-quedarse-comision\"", a: "          (abierta ? `<button type=\"button\" class=\"btn btn--secundario btn-quedarse-comision\"" },
    { nombre: 'botones sin registrar_pago', de: "            puedePagar: tieneTarea('cuentas_corrientes', 'registrar_pago'),\n            quedarse:", a: '            puedePagar: true,\n            quedarse:' },
    { nombre: 'sin "Falta pagar"', de: '            ${faltaPagar}\n', a: '' },
    // Pagar
    { nombre: 'pagar no cambia de unidad', de: '      if (m.unidad_negocio_id && f.unidadId !== m.unidad_negocio_id) cambiarUnidadFicha(m.unidad_negocio_id)\n', a: '' },
    { nombre: 'pagar con cualquier factura', de: "      if (!m || info?.modulo_origen !== 'comision') return\n", a: '      if (!m) return\n' },
    { nombre: 'pagar sin registrar_pago', de: "      if (!f || !tieneTarea('cuentas_corrientes', 'registrar_pago')) return\n      const m = (f.movimientosRaw", a: '      if (!f) return\n      const m = (f.movimientosRaw' },
    { nombre: 'pagar sin el monto', de: "      ponerNumero(document.getElementById('campo-monto-pago'), saldo)\n", a: '' },
    { nombre: 'pagar deja el FIFO', de: '      if (estado.pagoFacturaElegida) facturasParaPago = elegirSoloFactura(facturasParaPago, estado.pagoFacturaElegida, monto)\n', a: '' },
    { nombre: 'pagar no recuerda la factura', de: '      estado.pagoFacturaElegida = facturaId\n', a: '' },
    { nombre: 'la más vieja queda tildada', de: '        : { ...f, checked: false, monto: 0 })', a: '        : f)' },
    { nombre: 'se paga el saldo aunque el monto sea menor', de: '? { ...f, checked: true, monto: Number.isFinite(m) && m > 0 ? Math.min(f.saldo, m) : f.saldo }', a: '? { ...f, checked: true, monto: f.saldo }' },
    { nombre: 'abrir el modal no limpia la factura elegida', de: '      estado.pagoFacturaElegida = null\n      await cargarCuentasParaPago()', a: '      await cargarCuentasParaPago()' },
    { nombre: 'cerrar el modal no limpia la factura elegida', de: "      document.getElementById('modal-pago').hidden = true\n      estado.pagoFacturaElegida = null\n", a: "      document.getElementById('modal-pago').hidden = true\n" },
    // Se la queda la empresa
    { nombre: 'quedarse sin registrar_pago', de: "      if (!estado.ficha || !tieneTarea('cuentas_corrientes', 'registrar_pago') || estado.ficha.quedarse?.enCurso) return", a: '      if (!estado.ficha) return' },
    { nombre: 'doble toque manda dos veces', de: '      if (!q || q.facturaId !== facturaId || q.enCurso) return', a: '      if (!q) return' },
    { nombre: 'el error de la base se tapa', de: "        q.error = error.message || 'No se pudo cerrar la comisión. Probá de nuevo.'", a: "        q.error = 'No se pudo cerrar la comisión. Probá de nuevo.'" },
    { nombre: 'después del error no se puede reintentar', de: '      q.enCurso = false\n      if (error) {', a: '      if (error) {' },
    { nombre: 'no recarga', de: "      mostrarExito('Listo: la comisión se cerró y se la queda la empresa.')\n      await recargarTrasImporte()", a: "      mostrarExito('Listo: la comisión se cerró y se la queda la empresa.')" },
    { nombre: 'cancelar no cierra', de: '      estado.ficha.quedarse = null\n      renderizarFichaMovimientos()\n    }\n\n    async function confirmarQuedarseComision', a: '      renderizarFichaMovimientos()\n    }\n\n    async function confirmarQuedarseComision' },
    { nombre: 'quedarse sin panel', de: "    const panel = quedarse ? `", a: "    const panel = false ? `" },
  ],
})
