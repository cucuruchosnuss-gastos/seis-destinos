// Mutaciones de test-cuentas-corrientes-nota-debito.js (la nota de débito de
// un proveedor, 24/10/2026). Ver mutar.js.
//
//   node pruebas/mut-cuentas-corrientes-nota-debito.js
'use strict'
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-cuentas-corrientes-nota-debito.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/cuentas-corrientes.html'),
  escape: 'esc',
  funciones: ['htmlRenglonesNd'],
  manuales: [
    // ── El botón ──────────────────────────────────────────────────────────
    { nombre: 'el botón para cualquiera', de: "          ${tieneTarea('cuentas_corrientes', 'registrar_pago') ? `<button type=\"button\" class=\"banner-ficha-cc__btn banner-ficha-cc__btn--secundario\" id=\"btn-nota-debito-ficha\"", a: "          ${true ? `<button type=\"button\" class=\"banner-ficha-cc__btn banner-ficha-cc__btn--secundario\" id=\"btn-nota-debito-ficha\"" },
    { nombre: 'el botón prendido en "todas las unidades"', de: 'id="btn-nota-debito-ficha" ${dis}>', a: 'id="btn-nota-debito-ficha">' },
    { nombre: 'abre sin fábrica', de: "      if (!estado.ficha.unidadId) { mostrarError('Elegí la fábrica para cargar una nota de débito.'); return }\n", a: '' },
    // ── Validar y lo que viaja ────────────────────────────────────────────
    { nombre: 'sin comprobante pasa', de: "      if (!String(n.comprobante ?? '').trim()) return 'Poné el número de comprobante.'\n", a: '' },
    { nombre: 'la fecha futura pasa', de: "      if (n.fecha > hoy) return 'La fecha no puede ser futura.'\n      const items = itemsNd(n.renglones)", a: '      const items = itemsNd(n.renglones)' },
    { nombre: 'sin renglones pasa', de: "      if (!items.length) return 'Escribí al menos un renglón con su importe.'\n", a: '' },
    { nombre: 'un renglón sin concepto pasa', de: "      if (items.some(g => !g.concepto)) return 'Cada renglón lleva su concepto.'\n", a: '' },
    { nombre: 'un archivo que no es PDF pasa', de: "      if (a && !(a.type === 'application/pdf' || /\\.pdf$/i.test(String(a.name ?? '')))) return 'El archivo tiene que ser un PDF.'\n", a: '' },
    { nombre: 'un PDF de más de 10 MB pasa', de: "      if (a && Number(a.size) > TOPE_PDF_ND) return 'El PDF pesa más de 10 MB.'\n", a: '' },
    { nombre: 'viajan los renglones vacíos', de: '      return (renglones ?? []).filter(g => centavosNd(g.importe) > 0)\n', a: '      return (renglones ?? [])\n' },
    { nombre: 'el comprobante sin limpiar', de: "        p_comprobante: String(n.comprobante ?? '').trim(), p_items: itemsNd(n.renglones),", a: '        p_comprobante: n.comprobante, p_items: itemsNd(n.renglones),' },
    { nombre: 'sin la fábrica', de: '        p_proveedor_id: n.proveedorId, p_unidad_negocio_id: n.unidadId, p_fecha: n.fecha,', a: '        p_proveedor_id: n.proveedorId, p_unidad_negocio_id: null, p_fecha: n.fecha,' },
    { nombre: 'las observaciones vacías viajan como ""', de: '        p_observaciones: obs || null, p_archivo_url: archivoUrl,', a: '        p_observaciones: obs, p_archivo_url: archivoUrl,' },
    { nombre: 'el PDF no viaja', de: '        p_observaciones: obs || null, p_archivo_url: archivoUrl,', a: '        p_observaciones: obs || null, p_archivo_url: null,' },
    { nombre: 'el PDF fuera de la carpeta del usuario', de: '      return `${uid}/notas-debito/${proveedorId}/${anio}/${ahora}.pdf`', a: '      return `notas-debito/${proveedorId}/${anio}/${ahora}.pdf`' },
    { nombre: 'el PDF no se sube', de: '        const ruta = n.archivo ? await subirPdfNd(n.archivo, n.proveedorId, n.fecha) : null', a: '        const ruta = null' },
    // ── Confirmar ─────────────────────────────────────────────────────────
    { nombre: 'un doble toque manda dos veces', de: '      // Un doble toque manda una sola vez.\n      if (!n || n.enviando) return\n      n.comprobante =', a: '      if (!n) return\n      n.comprobante =' },
    { nombre: 'el error de la base se tapa', de: "        n.error = error.message || 'No se pudo cargar la nota de débito.'", a: "        n.error = 'No se pudo cargar la nota de débito.'" },
    { nombre: 'después no se relee la ficha', de: '      if (notaDebitoProv === n) cerrarModalNotaDebito()\n      const ficha = estado.ficha\n      if (ficha && ficha.proveedorId === n.proveedorId) {\n        await Promise.all([cargarFichaSaldos(), cargarFichaMovimientos(), cargarFichaCreditos()])', a: '      if (notaDebitoProv === n) cerrarModalNotaDebito()\n      const ficha = estado.ficha\n      if (false) {\n        await Promise.all([cargarFichaSaldos(), cargarFichaMovimientos(), cargarFichaCreditos()])' },
    // ── La cuenta del proveedor ───────────────────────────────────────────
    { nombre: 'no se leen las notas de débito', de: "      const ids = Object.values(infoFactura ?? {}).filter(f => f.modulo_origen === 'nota_debito').map(f => f.id)", a: '      const ids = []' },
    { nombre: 'la nota no dice "Nota de débito"', de: "${esc(esNotaDebito ? 'Nota de débito' : etiquetaTipoMovimiento(m))}", a: '${esc(etiquetaTipoMovimiento(m))}' },
    { nombre: 'la nota se puede eliminar como una factura', de: '        const puedeEliminar = esFactura && !esNotaDebito\n', a: '        const puedeEliminar = esFactura\n' },
    { nombre: 'una nota con pagos ofrece Anular', de: "infoNd?.estado === 'pendiente' && tieneTarea('cuentas_corrientes', 'registrar_pago')", a: "tieneTarea('cuentas_corrientes', 'registrar_pago')" },
    { nombre: 'Anular sin registrar_pago', de: "notaNd.estado !== 'anulada' && infoNd?.estado === 'pendiente' && tieneTarea('cuentas_corrientes', 'registrar_pago')", a: "notaNd.estado !== 'anulada' && infoNd?.estado === 'pendiente'" },
    { nombre: 'el id de la nota sin escapar', de: 'data-anular-nd="${esc(notaNd.id)}">Anular</button>', a: 'data-anular-nd="${notaNd.id}">Anular</button>' },
    { nombre: 'la fila no lleva el botón', de: '            ${botonAnularNd}\n', a: '' },
    // ── Anular ────────────────────────────────────────────────────────────
    { nombre: 'anular sin motivo', de: "      if (motivo.length < 3) { a.error = 'Poné el motivo de la anulación.'; pintarAnularNd(); return }\n", a: '' },
    { nombre: 'anular manda el motivo sin limpiar', de: "      const motivo = String(document.getElementById('campo-anular-nd-motivo').value ?? '').trim()", a: "      const motivo = String(document.getElementById('campo-anular-nd-motivo').value ?? '')" },
    { nombre: 'anular con el id de la factura', de: "({ error } = await supabase.rpc('anular_nota_debito', { p_id: a.notaId, p_motivo: motivo }))", a: "({ error } = await supabase.rpc('anular_nota_debito', { p_id: 'fp-nd', p_motivo: motivo }))" },
    { nombre: 'el error de anular se tapa', de: "        a.error = error.message || 'No se pudo anular la nota.'", a: "        a.error = 'No se pudo anular la nota.'" },
  ],
})
