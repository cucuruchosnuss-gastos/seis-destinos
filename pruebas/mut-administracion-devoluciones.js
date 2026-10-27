// Mutaciones de test-administracion-devoluciones.js (devoluciones y
// reposiciones en una orden: la lista, el detalle, valorizar, la hoja y la
// hoja "Dividir para facturar", 22/10/2026). Ver mutar.js.
//
//   node pruebas/mut-administracion-devoluciones.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

correrMutaciones({
  region: limitesAdministracion,
  suite: path.join(__dirname, 'test-administracion-devoluciones.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  escape: 'esc',
  funciones: [],
  manuales: [
    // Los ayudantes
    { nombre: 'cualquier tipo vale', de: "      return it?.tipo === 'devolucion' || it?.tipo === 'reposicion' ? it.tipo : 'retiro'", a: "      return it?.tipo ?? 'retiro'" },
    { nombre: 'la devolución sale del stock (cuenta cajas)', de: "      return tipoItem(it) === 'devolucion' ? 0 : (Number(it?.cajas) || 0)", a: '      return Number(it?.cajas) || 0' },
    { nombre: 'la devolución se valoriza en positivo', de: "      return tipoItem(it) === 'devolucion' ? -n : n", a: '      return n' },
    { nombre: 'el texto de la devolución sin el destino', de: "limpio(it.lote_devuelto) : '', textoDestinoDevuelto(it?.destino_devuelto)]", a: "limpio(it.lote_devuelto) : '']" },
    { nombre: 'sin "a favor del cliente"', de: "      return Number(total) < 0 ? ' · a favor del cliente' : ''", a: "      return ''" },
    { nombre: '"a favor" con total positivo', de: "      return Number(total) < 0 ? ' · a favor del cliente' : ''", a: "      return Number(total) !== 0 ? ' · a favor del cliente' : ''" },
    // Los lotes por renglón
    { nombre: 'los lotes sin el renglón (se mezclan)', de: '      return lotes.filter(l => l.orden_retiro_item_id\n        ? l.orden_retiro_item_id === it.id\n        : l.presentacion_id', a: '      return lotes.filter(l => l.presentacion_id' },
    { nombre: 'los movimientos viejos no se ven', de: '        ? l.orden_retiro_item_id === it.id\n        : l.presentacion_id === it.presentacion_id', a: '        ? l.orden_retiro_item_id === it.id\n        : false && l.presentacion_id === it.presentacion_id' },
    { nombre: 'no se lee el renglón de cada lote', de: "'presentacion_id, marca_id, lote, cajas, orden_retiro_item_id'", a: "'presentacion_id, marca_id, lote, cajas'" },
    // La lista
    { nombre: 'la lista no lee el tipo', de: "select('orden_id, cajas, unidades, insumo_id, tipo')", a: "select('orden_id, cajas, unidades, insumo_id')" },
    { nombre: 'la lista cuenta la devolución', de: '(cajas.get(it.orden_id) ?? 0) + cajasQueSalen(it))', a: '(cajas.get(it.orden_id) ?? 0) + (Number(it.cajas) || 0))' },
    { nombre: 'la lista sin las devueltas', de: "(o.devueltas ? ` · devolvió ${enteroHoja(o.devueltas)}` : '')", a: "''" },
    { nombre: 'la fila sin "a favor"', de: "        ? importeHoja(totalFila, o.moneda) + textoAFavor(totalFila) : 'sin valorizar'", a: "        ? importeHoja(totalFila, o.moneda) : 'sin valorizar'" },
    // El detalle
    { nombre: 'el detalle no lee el tipo', de: 'turno_produccion_id, tipo, motivo_devolucion, lote_devuelto, destino_devuelto', a: 'turno_produccion_id' },
    { nombre: 'el detalle sin la sección', de: '      const renglones = d.items.filter(it => !esItemDev(it)).map(', a: '      const renglones = d.items.map(' },
    { nombre: 'el detalle sin "−"', de: "      desc = (tipo === 'devolucion' ? '−' : '') + (suelto ?", a: '      desc = (suelto ?' },
    { nombre: 'la devolución con lotes de stock', de: "        if (tipo === 'devolucion') detalle = textoDevolucionItem(it)\n", a: '' },
    { nombre: 'la reposición sin sus lotes', de: "detalle = textoDevolucionItem(it) + ' · sale de ' + textoLotesIt", a: 'detalle = textoDevolucionItem(it)' },
    { nombre: 'sin el sello del tipo', de: "      const sello = esItemDev(it) ?", a: '      const sello = false ?' },
    // Valorizar
    { nombre: 'la reposición con el precio de la lista', de: "      for (const it of d.items) v.precios[it.id] = tipoItem(it) === 'reposicion' ? 0 : vigente(it) ? Number(it.precio_caja) : null", a: '      for (const it of d.items) v.precios[it.id] = vigente(it) ? Number(it.precio_caja) : null' },
    { nombre: 'la reposición le pide precio a la lista', de: " && !vigente(it) && tipoItem(it) !== 'reposicion') : []", a: ' && !vigente(it)) : []' },
    { nombre: 'la reposición con campo de precio', de: "      if (tipoItem(it) === 'reposicion' && (d.valorizar || d.orden.estado_valorizacion === 'valorizada')) {", a: '      if (false) {' },
    { nombre: 'la reposición dice "faltan en la lista"', de: " && tipoItem(it) !== 'reposicion') && d.orden.estado_valorizacion !== 'valorizada') partes.push(", a: ") && d.orden.estado_valorizacion !== 'valorizada') partes.push(" },
    { nombre: 'el total de valorizar sin "a favor"', de: "'Total ' + importeHoja(t, d.orden.moneda) + textoAFavor(t)", a: "'Total ' + importeHoja(t, d.orden.moneda)" },
    { nombre: 'el total valorizado sin "a favor"', de: 'importeHoja(o.total, moneda) + textoAFavor(o.total))}</p>`)', a: 'importeHoja(o.total, moneda))}</p>`)' },
    // La hoja con precios
    { nombre: 'la hoja sin ordenar', de: '        renglones: ordenarRenglonesHoja(d.items.map(it => {', a: '        renglones: (d.items.map(it => {' },
    { nombre: 'la hoja sin el tipo', de: '            movimiento: tipoItem(it), motivo:', a: "            movimiento: 'retiro', motivo:" },
    { nombre: 'la hoja sin el motivo', de: 'motivo: it.motivo_devolucion ?? null, loteDevuelto', a: 'motivo: null, loteDevuelto' },
    // Dividir para facturar
    { nombre: 'la división vuelve a filtrar cant > 0', de: 'return Number.isFinite(n) && n !== 0 })', a: 'return n > 0 })' },
    { nombre: 'la división deja pasar lo que no es número', de: 'return Number.isFinite(n) && n !== 0 })', a: 'return n !== 0 })' },
    { nombre: 'el pie de la división sin "a favor"', de: " + importeHoja(datos.total_orden, moneda) + textoAFavor(datos.total_orden))}</p></div>`", a: " + importeHoja(datos.total_orden, moneda))}</p></div>`" },
  ],
})
