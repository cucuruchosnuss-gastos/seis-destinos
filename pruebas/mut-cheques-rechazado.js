// Mutaciones de test-cheques-rechazado.js (el cheque rechazado en la cartera,
// 24/10/2026). Ver mutar.js. Se muta SOLO la región de la cartera de
// administracion.html, y js/cobranzas-comun.js por su lado.
//
//   node pruebas/mut-cheques-rechazado.js
'use strict'
const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')
const { ARCHIVO_CHEQUES, limitesCheques } = require('./fuente-cheques')

const SUITE = path.join(__dirname, 'test-cheques-rechazado.js')
const RAIZ = path.join(__dirname, '..')

correrMutacionesEnVarios([
  {
    suite: SUITE,
    region: limitesCheques,
    original: process.env.ARCHIVO_BASE || ARCHIVO_CHEQUES,
    escape: 'esc',
    funciones: ['htmlLinkNotaRechazo', 'htmlResultadosRechazo', 'htmlElegidoRechazo', 'htmlRenglonesRechazo', 'htmlResumenRechazo', 'htmlOpcionesClienteRechazo'],
    equivalentes: [
      { expr: 'esc(formatearImporte(c.importe))', motivo: 'formatearImporte(): dígitos, puntos, coma y "$", sin ningún carácter que escapar' },
      { expr: 'esc(monto)', motivo: 'formatearImporte() de un total calculado: sin ningún carácter que escapar' },
      { expr: 'esc(g.clave)', motivo: 'la clave del renglón es un número del código (++claveRenglonRechazo)' },
    ],
    manuales: [
      // ── El filtro y la lista ──────────────────────────────────────────────
      { nombre: 'sin el filtro "Rechazados"', de: "      { id: 'rechazados', nombre: 'Rechazados' },\n", a: '' },
      { nombre: '"Rechazados" no filtra', de: "      else if (f.estado === 'rechazados') q = q.eq('estado', 'rechazado')\n", a: '' },
      { nombre: '"Salidos" sin los rechazados', de: "q = q.in('estado', ESTADOS_SALIDOS_Y_RECHAZADOS)", a: "q = q.in('estado', ESTADOS_SALIDOS)" },
      { nombre: 'la lista no lee la fecha ni el motivo del rechazo', de: ', rechazo_fecha, rechazo_motivo, rechazo_estado_anterior', a: '' },
      // ── El color, la leyenda y la salida ──────────────────────────────────
      { nombre: 'un rechazado sin su clave de color', de: "      if (ch.estado === 'rechazado') return ['rechazado']\n", a: '' },
      { nombre: 'la leyenda sin "Rechazado"', de: "      { clave: 'rechazado', nombre: 'Rechazado' },\n", a: '' },
      { nombre: 'la fila sin la clase roja', de: "ch.estado === 'rechazado' ? 'chq-tabla__fila--rechazado' : ", a: '' },
      { nombre: 'la tarjeta sin la clase roja', de: "ch.estado === 'rechazado' ? 'chq-tarjeta--rechazado' : ", a: '' },
      { nombre: 'la tarjeta sin la fecha y el motivo', de: " : ch.estado === 'rechazado' ? textoRechazo(ch) : ''", a: " : ''" },
      { nombre: 'la tarjeta sin el link a la nota', de: "ch.estado === 'rechazado' ? htmlLinkNotaRechazo(ch) : htmlAccionSalida(ch, accionSalida(ch, cob))", a: 'htmlAccionSalida(ch, accionSalida(ch, cob))' },
      { nombre: 'la columna Salida no trata al rechazado', de: "      if (ch.estado === 'rechazado') {\n        const t = textoRechazo(ch)", a: "      if (false) {\n        const t = textoRechazo(ch)" },
      { nombre: 'la columna Salida sin el link', de: '${esc(t)}</span>${htmlLinkNotaRechazo(ch)}</div>`', a: '${esc(t)}</span></div>`' },
      { nombre: 'el texto sin el motivo', de: "      return `Rechazado${cuando}${motivo ? ` · ${motivo}` : ''}`", a: '      return `Rechazado${cuando}`' },
      { nombre: 'una nota anulada no lo dice', de: " + (n.estado === 'anulada' ? ' (anulada)' : '')", a: '' },
      { nombre: 'las notas no se filtran por emitidas', de: "\n          .eq('direccion', 'emitida').in('cheque_id', ids)", a: "\n          .in('cheque_id', ids)" },
      { nombre: 'las notas de todos los cheques, no solo de los rechazados', de: ".filter(c => c?.estado === 'rechazado').map(c => c.id)", a: '.map(c => c.id)' },
      // ── El botón y el buscador ────────────────────────────────────────────
      { nombre: 'el botón para cualquiera', de: '      boton.hidden = !puedeRechazar()\n', a: '      boton.hidden = false\n' },
      { nombre: 'la búsqueda sin espera', de: 'const ESPERA_BUSQUEDA_RECHAZO = 300', a: 'const ESPERA_BUSQUEDA_RECHAZO = 0' },
      { nombre: 'busca desde 1 número', de: 'const LARGO_MINIMO_RECHAZO = 2', a: 'const LARGO_MINIMO_RECHAZO = 1' },
      { nombre: 'no se cancela la búsqueda anterior', de: '      r.busqueda = String(texto ?? \'\')\n      clearTimeout(temporizadorRechazo)\n', a: '      r.busqueda = String(texto ?? \'\')\n' },
      { nombre: 'la fábrica de pruebas aparece en el buscador', de: 'r.resultados = sinUnidadesDePrueba(Array.isArray(res?.data) ? res.data : [], estado.fabrica, c => c?.unidad_negocio_id)', a: 'r.resultados = Array.isArray(res?.data) ? res.data : []' },
      { nombre: 'el error del buscador se tapa', de: "        r.errorBusqueda = res.error.message || 'No se pudo buscar el cheque.'", a: "        r.errorBusqueda = 'No se pudo buscar el cheque.'" },
      { nombre: 'el renglón por defecto sin concepto', de: '        gastos: [renglonGastoRechazo(CONCEPTO_GASTO_RECHAZO)],\n', a: '        gastos: [renglonGastoRechazo()],\n' },
      // ── Validar y lo que viaja ────────────────────────────────────────────
      { nombre: 'se puede mandar sin motivo', de: "      if (!r.motivo) return 'Elegí el motivo: Sin fondos, Firma, Cuenta cerrada u Otro.'\n", a: '' },
      { nombre: '"Otro" sin escribir pasa', de: "      if (motivo === 'Otro') return d\n", a: "      if (motivo === 'Otro') return d || 'Otro'\n" },
      { nombre: 'el detalle se pierde', de: '      return d ? `${motivo}: ${d}` : motivo', a: '      return motivo' },
      { nombre: 'la fecha futura pasa', de: "      if (r.fecha > hoy) return 'La fecha no puede ser futura.'\n", a: '' },
      { nombre: 'la fecha anterior a la salida pasa', de: '      if (esFechaIso(c.salida_fecha) && r.fecha < c.salida_fecha) return', a: '      if (false) return' },
      { nombre: 'sin cliente se puede mandar', de: "      if (!c.cliente_id && !r.clienteId) return 'Elegí a qué cliente se le hace la nota de débito.'\n", a: '' },
      { nombre: 'un gasto sin concepto pasa', de: "      if ((r.gastos ?? []).some(g => aCentavos(g.importe) > 0 && !String(g.concepto ?? '').trim())) return 'Cada gasto al cliente lleva su concepto.'\n", a: '' },
      { nombre: 'viajan también los renglones vacíos', de: '      return (renglones ?? []).filter(g => aCentavos(g.importe) > 0)\n', a: '      return (renglones ?? [])\n' },
      { nombre: 'p_cliente_id siempre null', de: "        p_cliente_id: c.cliente_id ? null : (r.clienteId || null),", a: '        p_cliente_id: null,' },
      { nombre: 'la nota del proveedor viaja aunque no se tilde', de: '      const conProveedor = !!(c.proveedor_id && r.prov?.si)', a: '      const conProveedor = !!c.proveedor_id' },
      { nombre: 'la nota del proveedor sin el PDF', de: '          archivo_url: archivoUrl,', a: '          archivo_url: null,' },
      { nombre: 'la nota del proveedor sin comprobante pasa', de: "        if (!String(r.prov.comprobante ?? '').trim()) return 'Poné el número de comprobante de la nota del proveedor.'\n", a: '' },
      { nombre: 'sin registrar_pago la casilla queda prendida', de: '        si.disabled = !permiso\n', a: '' },
      { nombre: 'un archivo que no es PDF pasa', de: "        if (a && !(a.type === 'application/pdf' || /\\.pdf$/i.test(String(a.name ?? '')))) return 'El archivo de la nota del proveedor tiene que ser un PDF.'\n", a: '' },
      { nombre: 'el PDF fuera de la carpeta del usuario', de: '      return `${uid}/notas-debito/${proveedorId}/${anio}/${ahora}.pdf`', a: '      return `notas-debito/${proveedorId}/${anio}/${ahora}.pdf`' },
      // ── El resumen ────────────────────────────────────────────────────────
      { nombre: 'el resumen no dice lo del banco', de: "      if (['depositado', 'vendido'].includes(c.estado)) return `Se descuentan ${formatearImporte(c.importe)} de ${cuentaDeRechazo(c)}.`\n", a: '' },
      { nombre: 'el total al cliente sin los gastos', de: '      return { cheque, gastosCliente, cliente: cheque + gastosCliente,', a: '      return { cheque, gastosCliente, cliente: cheque,' },
      { nombre: 'el resumen sin la nota del proveedor', de: '      if (c.proveedor_id && r.prov?.si) {\n        lineas.push(', a: '      if (false) {\n        lineas.push(' },
      // ── Confirmar ─────────────────────────────────────────────────────────
      { nombre: 'un doble toque manda dos veces', de: '      // Un doble toque manda una sola vez.\n      if (!r || r.enviando) return\n      leerCamposRechazo(r)', a: '      if (!r) return\n      leerCamposRechazo(r)' },
      { nombre: 'el error de la base se tapa', de: "        r.error = res.error.message || 'No se pudo registrar el rechazo. Probá de nuevo.'", a: "        r.error = 'No se pudo registrar el rechazo. Probá de nuevo.'" },
      { nombre: 'después no se abre la hoja', de: '      abrirHojaNotaDebito(d.nota_debito_cliente_id)\n    }', a: '    }' },
      { nombre: 'la hoja se pide sin el id', de: "      document.dispatchEvent(new CustomEvent('administracion:nota-debito', { detail: { id } }))", a: "      document.dispatchEvent(new CustomEvent('administracion:nota-debito', { detail: {} }))" },
      { nombre: 'no se relee la cartera', de: '      mostrarExito(textoExitoRechazo(d))\n      await refrescarTodo()\n', a: '      mostrarExito(textoExitoRechazo(d))\n' },
      { nombre: 'el PDF no se sube', de: '        const archivoUrl = conPdf ? await subirPdfNotaProveedor(r.prov.archivo, r.cheque.proveedor_id, r.prov.fecha) : null', a: '        const archivoUrl = null' },
    ],
  },
  {
    suite: SUITE,
    variable: 'ARCHIVO_COMUN',
    original: path.join(RAIZ, 'js', 'cobranzas-comun.js'),
    funciones: [],
    manuales: [
      { nombre: 'el común: sin la etiqueta "Rechazado"', de: "  rechazado: 'Rechazado',\n", a: '' },
      { nombre: 'el común: un rechazado vuelve a estar "en cartera" para Cobranzas', de: "['en_banco', ...ESTADOS_SALIDOS, 'rechazado']", a: "['en_banco', ...ESTADOS_SALIDOS]" },
      { nombre: 'el común: "Salidos" de Cobranzas con los rechazados', de: "export const ESTADOS_SALIDOS = ['depositado', 'endosado', 'vendido']", a: "export const ESTADOS_SALIDOS = ['depositado', 'endosado', 'vendido', 'rechazado']" },
    ],
  },
])
