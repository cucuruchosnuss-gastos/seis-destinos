// Mutaciones de la nota de crédito de un proveedor (ver
// test-cuentas-corrientes-nota-credito.js).
const path = require('path')
const { correrMutacionesEn } = require('./mutar')

correrMutacionesEn({
  suite: path.join(__dirname, 'test-cuentas-corrientes-nota-credito.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/cuentas-corrientes.html'),
  escape: 'esc',
  funciones: ['htmlFacturasNota', 'htmlResultadosInsumoNota', 'htmlAjustesNota'],
  equivalentes: [
    { expr: "esc(formatearFecha(f.fecha))", motivo: 'la fecha de la factura (columna date) como dd/mm/aaaa' },
    { expr: "esc(formatearImporte(f.saldo))", motivo: 'un importe formateado: "$", dígitos, puntos y coma' },
    { expr: 'esc(n.errorInsumos)', motivo: 'texto constante del código: lo pone asegurarInsumosNota()' },
    { expr: 'esc(n.errorFacturas)', motivo: 'texto constante del código: lo pone abrirModalNotaCredito()' },
    { expr: 'esc(nombreUnidad(n.unidadId))', motivo: 'el nombre de la fábrica de la ficha (de unidades_negocio, que escribe la base); lo prueba el escape de la fábrica en el resto del módulo' },
  ],
  manuales: [
    // El permiso.
    { nombre: 'el gate es otra tarea', de: "    function puedeCargarNotaCredito() {\n      return tieneTarea('cuentas_corrientes', 'aplicar_credito')", a: "    function puedeCargarNotaCredito() {\n      return tieneTarea('cuentas_corrientes', 'registrar_pago')" },
    { nombre: 'el botón sin permiso', de: "          ${tieneTarea('cuentas_corrientes', 'aplicar_credito') ? `<button type=\"button\" class=\"banner-ficha-cc__btn banner-ficha-cc__btn--secundario\" id=\"btn-nota-credito-ficha\" ${dis}>", a: "          ${true ? `<button type=\"button\" class=\"banner-ficha-cc__btn banner-ficha-cc__btn--secundario\" id=\"btn-nota-credito-ficha\" ${dis}>" },
    { nombre: 'el botón habilitado en "todas"', de: 'id="btn-nota-credito-ficha" ${dis}>', a: 'id="btn-nota-credito-ficha">' },
    { nombre: 'abre sin fábrica', de: "      if (!estado.ficha.unidadId) { mostrarError('Elegí la fábrica para cargar una nota de crédito.'); return }\n", a: '' },
    // Las facturas.
    { nombre: 'las facturas de todas las fábricas', de: "        .eq('unidad_negocio_id', n.unidadId)\n        .eq('moneda', 'ARS')", a: "        .eq('moneda', 'ARS')" },
    { nombre: 'las facturas en cualquier moneda', de: "        .eq('unidad_negocio_id', n.unidadId)\n        .eq('moneda', 'ARS')", a: "        .eq('unidad_negocio_id', n.unidadId)" },
    { nombre: 'las facturas sin saldo también', de: '.filter(f => Number(f.saldo_pendiente) > 0)', a: '.filter(f => true)' },
    { nombre: 'las más viejas: en el orden que vienen', de: "const orden = [...(facturas ?? [])].sort((a, b) => String(a.fecha ?? '').localeCompare(String(b.fecha ?? '')))", a: 'const orden = [...(facturas ?? [])]' },
    { nombre: 'las más viejas: sin tope de saldo', de: 'const toma = Math.max(0, Math.min(resta, centavosNota(f.saldo)))', a: 'const toma = Math.max(0, resta)' },
    { nombre: 'tildar no propone el monto', de: "        if (f.tildada && !(Number(f.monto) > 0)) {", a: '        if (false) {' },
    { nombre: 'destildar deja el monto', de: '        if (!f.tildada) f.monto = null\n', a: '' },
    { nombre: 'el pie no dice lo que queda a favor', de: ' · Queda a favor ${formatearImporte(t.aFavor / 100)}`', a: '`' },
    // Lo que falta.
    { nombre: 'sin número igual se manda', de: "      if (!String(n.numero ?? '').trim()) return 'Escribí el número de la nota de crédito.'\n", a: '' },
    { nombre: 'la fecha futura se acepta', de: "      if (hoy && n.fecha > hoy) return 'La fecha no puede ser futura.'\n", a: '' },
    { nombre: 'importe cero se acepta', de: "      if (!(importe > 0)) return 'El importe tiene que ser mayor a cero.'\n", a: '' },
    { nombre: 'más que el saldo de una factura', de: '        if (centavosNota(f.monto) > centavosNota(f.saldo)) return', a: '        if (false) return' },
    { nombre: 'lo aplicado pasa del importe', de: '      if (t.aplicado > t.importe) return `Lo aplicado', a: '      if (false) return `Lo aplicado' },
    { nombre: 'materia prima sin lote', de: "          if (a.tipo === 'materia_prima' && !String(a.lote ?? '').trim()) return", a: '          if (false) return' },
    { nombre: 'el ajuste sin insumo pasa', de: "          if (!a.insumoId) return `${cual}: elegí el insumo.`\n", a: '' },
    // Lo que viaja.
    { nombre: 'el comprobante sin el tipo', de: '        p_comprobante: comprobanteNota(n.tipo, n.numero),', a: '        p_comprobante: String(n.numero ?? \'\').trim(),' },
    { nombre: 'viajan las destildadas', de: "p_aplicaciones: (n.facturas ?? []).filter(f => f.tildada && Number(f.monto) > 0)", a: "p_aplicaciones: (n.facturas ?? []).filter(f => Number(f.monto) > 0)" },
    { nombre: 'el ajuste sin signo', de: "            cantidad: a.sentido === 'suma' ? Number(a.cantidad) : -Number(a.cantidad),", a: '            cantidad: Number(a.cantidad),' },
    { nombre: 'el lote vacío viaja vacío', de: "            lote: String(a.lote ?? '').trim() || null,", a: "            lote: String(a.lote ?? '')," },
    { nombre: 'los ajustes viajan aunque esté apagado', de: '        p_ajustes_stock: n.conAjuste\n', a: '        p_ajustes_stock: true\n' },
    { nombre: 'el insumo inactivo se ofrece', de: '      else n.insumos = (data ?? []).filter(i => i.activo !== false)', a: '      else n.insumos = data ?? []' },
    // El error.
    { nombre: '"la función no existe" crudo', de: "      if (error?.code === 'PGRST202' ||", a: '      if (false &&' },
    { nombre: 'el error de la base se tapa', de: "      return m || 'No se pudo cargar la nota de crédito.'", a: "      return 'No se pudo cargar la nota de crédito.'" },
    { nombre: 'doble toque manda dos', de: '      // Un doble toque manda una sola vez.\n      if (!n || n.enviando) return\n      n.numero', a: '      if (!n) return\n      n.numero' },
    { nombre: 'mientras manda se cierra', de: '      if (notaCredito?.enviando) return\n      document.getElementById(\'modal-nota-credito\').hidden = true', a: "      document.getElementById('modal-nota-credito').hidden = true" },
    { nombre: 'no relee la ficha', de: '        await Promise.all([cargarFichaSaldos(), cargarFichaMovimientos(), cargarFichaCreditos()])\n        if (estado.ficha === ficha) renderizarFichaBanner()', a: '        if (estado.ficha === ficha) renderizarFichaBanner()' },
    { nombre: 'el éxito con "$ 0,00" para un ausente', de: '`Nota de crédito cargada: aplicada ${formatearImporte(data?.aplicado)}', a: '`Nota de crédito cargada: aplicada ${formatearImporte(data?.aplicado ?? 0)}' },
  ],
})
