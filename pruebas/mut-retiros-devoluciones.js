// Mutaciones de test-retiros-devoluciones.js (devoluciones y reposiciones en
// la orden de retiro, 22/10/2026): mutan modulos/retiros.html (la carga y Mis
// retiros) y js/retiros-comun.js (la hoja), que la suite recibe por
// ARCHIVO_TEST y ARCHIVO_COMUN_RETIROS. Ver mutar.js.
//
//   node pruebas/mut-retiros-devoluciones.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const { correrMutaciones } = require('./mutar')

const SUITE = path.join(__dirname, 'test-retiros-devoluciones.js')
const CONSTANTE = 'texto constante del código (los motivos son una lista fija; los títulos de los botones, textos fijos)'

const tandas = [
  {
    suite: SUITE,
    original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/retiros.html'),
    escape: 'esc',
    funciones: ['htmlDevolucionRenglon'],
    equivalentes: [
      { expr: 'esc(m)', motivo: CONSTANTE },
      { expr: 'esc(titulo)', motivo: CONSTANTE },
      { expr: 'esc(sub)', motivo: CONSTANTE },
      { expr: 'esc(texto)', motivo: CONSTANTE },
    ],
    manuales: [
      // Lo que viaja a la base
      { nombre: 'la devolución viaja sin tipo', de: '        item.tipo = tipoRenglon(r)\n', a: '' },
      { nombre: 'la reposición viaja como devolución', de: "      return r.dev.trato === 'repone' ? 'reposicion' : 'devolucion'", a: "      return 'devolucion'" },
      { nombre: 'el motivo sin el detalle', de: '      return texto ? `${dev.motivo}: ${texto}` : dev.motivo', a: '      return dev.motivo' },
      { nombre: '"Otro" sin texto pasa', de: "      if (dev.motivo === 'Otro') return texto || null", a: "      if (dev.motivo === 'Otro') return texto || 'Otro'" },
      { nombre: 'cualquier carácter cuenta como letra', de: '/\\p{L}/gu', a: '/./gu' },
      { nombre: 'dos letras alcanzan', de: 'if (letrasDe(motivoDevolucion(d)) < 3)', a: 'if (letrasDe(motivoDevolucion(d)) < 2)' },
      { nombre: 'el lote devuelto sin tope', de: "      if (limpio(d.lote).length > LARGO_LOTE_DEVUELTO) return `el lote devuelto puede tener hasta ${LARGO_LOTE_DEVUELTO} letras`\n", a: '' },
      { nombre: 'sin elegir qué se hace, pasa', de: "      if (d.trato !== 'descuenta' && d.trato !== 'repone') return 'elegí si se descuenta de la orden o se reponen'\n", a: '' },
      { nombre: 'un destino raro pasa', de: "      if (d.destino !== 'descarte' && d.destino !== 'stock') return 'elegí qué se hace con las cajas devueltas'\n", a: '' },
      { nombre: 'la devolución no se valida', de: '      if (esRenglonDev(r)) return faltaDevolucion(r) ?? (saleDelStock(r) ? (lotesAMano(r) ? faltaLotesMano(r) : faltaEnLotes(r)) : null)\n', a: '' },
      { nombre: 'el lote devuelto sin limpiar', de: '        item.lote_devuelto = limpio(r.dev.lote) || null', a: '        item.lote_devuelto = r.dev.lote || null' },
      { nombre: 'el destino siempre descarte', de: "        item.destino = r.dev.destino === 'stock' ? 'stock' : 'descarte'", a: "        item.destino = 'descarte'" },
      { nombre: 'el motivo no viaja', de: '        item.motivo = motivoDevolucion(r.dev)\n', a: '' },
      // El stock
      { nombre: 'la devolución saca stock', de: "      return tipoRenglon(r) !== 'devolucion'\n", a: '      return true\n' },
      { nombre: 'la devolución tiene lotes', de: '      if (!saleDelStock(r)) return null\n', a: '' },
      // 26/10/2026: renglonConLotes también mira lotesAMano (la fábrica sin control).
      { nombre: 'la devolución lee lotes', de: ' && saleDelStock(r) && !lotesAMano(r)\n', a: ' && !lotesAMano(r)\n' },
      { nombre: 'cambiar a devolución no suelta los lotes', de: '      if (r.dev.trato !== trato) r.lotes = {}\n', a: '' },
      // Los totales
      { nombre: 'la devolución suma a lo que se lleva', de: " && tipoRenglon(r) !== 'devolucion' && Number(r.cajas) > 0", a: ' && Number(r.cajas) > 0' },
      { nombre: 'el total sin las devueltas', de: " + (devueltas ? ` · devueltas ${enteroHoja(devueltas)}` : '')\n    }", a: '\n    }' },
      { nombre: 'Mis retiros cuenta la devolución', de: "(r?.movimiento === 'devolucion' ? 0 : (Number(r.cajas) || 0))", a: '(Number(r.cajas) || 0)' },
      // El catálogo
      { nombre: 'la devolución ofrece insumos', de: "GRUPOS_RETIRO.filter(g => !devolucion || g.tipo !== 'insumos')", a: 'GRUPOS_RETIRO' },
      { nombre: 'la devolución esconde lo sin stock', de: '(q || devolucion ? true : hayStock(o))', a: '(q ? true : hayStock(o))' },
      { nombre: 'el retiro muestra lo sin stock sin buscar', de: '(q || devolucion ? true : hayStock(o))', a: '(true)' },
      { nombre: 'el buscador de la devolución con insumos', de: '{ devolucion: esRenglonDev(r) })', a: '{ devolucion: false })' },
      // Los controles
      { nombre: '"Devolución" apila renglones vacíos', de: '      if (abierto && !abierto.productoId && !abierto.insumoId) {\n        if (!esRenglonDev(abierto))', a: '      if (false) {\n        if (!esRenglonDev(abierto))' },
      { nombre: 'un motivo inventado se toma', de: ' || !MOTIVOS_DEVOLUCION.includes(motivo)) return', a: ') return' },
      { nombre: 'un trato inventado se toma', de: "      if (!esRenglonDev(r) || (trato !== 'descuenta' && trato !== 'repone')) return", a: '      if (!esRenglonDev(r)) return' },
      { nombre: 'un destino inventado se toma', de: "      if (!esRenglonDev(r) || (destino !== 'descarte' && destino !== 'stock')) return", a: '      if (!esRenglonDev(r)) return' },
      { nombre: 'tipear redibuja (pierde el foco)', de: 'LARGO_LOTE_DEVUELTO) : String(t.value ?? \'\')\n      pintarPie()\n      guardarBorrador()\n      return true', a: 'LARGO_LOTE_DEVUELTO) : String(t.value ?? \'\')\n      tocarRenglon()\n      return true' },
      { nombre: 'tipear no se guarda', de: 'LARGO_LOTE_DEVUELTO) : String(t.value ?? \'\')\n      pintarPie()\n      guardarBorrador()\n      return true', a: 'LARGO_LOTE_DEVUELTO) : String(t.value ?? \'\')\n      pintarPie()\n      return true' },
      { nombre: 'el lote no se corta en 40', de: '.slice(0, LARGO_LOTE_DEVUELTO)', a: '' },
      // La orden armada y el resumen
      { nombre: 'sin la sección Devoluciones', de: '      const conProducto = todos.filter(([r]) => !esRenglonDev(r))', a: '      const conProducto = todos' },
      { nombre: 'la tarjeta sin "−"', de: "(tipo === 'devolucion' ? '−' : '') + enteroHoja(pedido)", a: 'enteroHoja(pedido)' },
      { nombre: 'la tarjeta de reposición con plata', de: '`Se repone · sin cargo · ${textoDevolucionRenglon(r)}', a: '`Se repone · $ 0 · ${textoDevolucionRenglon(r)}' },
      { nombre: 'el resumen sin "−"', de: "(tipo === 'devolucion' ? '−' : '') + enteroHoja(r.cajas)", a: 'enteroHoja(r.cajas)' },
      { nombre: 'el resumen sin la sección', de: "        (devs.length ? `<p class=\"rt-subtitulo rt-dev-subtitulo\">Devoluciones · ${esc(devs.length)}</p>` + devs.map(fila).join('') : '')", a: "        ''" },
      { nombre: 'el motivo de la tarjeta sin escapar', de: "        `<span class=\"rt-item__lotes\"><span class=\"rt-item__lotes-texto\">${esc(textoLotesR)}</span>`", a: "        `<span class=\"rt-item__lotes\"><span class=\"rt-item__lotes-texto\">${textoLotesR}</span>`" },
      // El borrador
      { nombre: 'el borrador no completa la devolución', de: 'r.dev = { ...devolucionVacia(), ...r.dev }', a: 'r.dev = r.dev' },
      { nombre: 'el borrador deja una devolución rota', de: '        else delete r.dev\n', a: '' },
      // Mis retiros
      { nombre: 'Mis retiros no lee el tipo', de: "movimiento: r.movimiento ?? 'retiro'", a: "movimiento: 'retiro'" },
      { nombre: 'Mis retiros sin el motivo', de: 'motivo: r.motivo_devolucion ?? null,', a: 'motivo: null,' },
      { nombre: 'la hoja de la carga sin ordenar', de: 'renglones: ordenarRenglonesHoja(renglonesParaHoja(o)),', a: 'renglones: renglonesParaHoja(o),' },
      { nombre: 'el detalle mío sin "−"', de: "const desc = (repone ? '' : '−') + enteroHoja(r.cajas)", a: 'const desc = enteroHoja(r.cajas)' },
      { nombre: 'el detalle mío sin la sección', de: "const renglones = comoHoja.map((r, i) => [r, i]).filter(([r]) => !esDev(r))", a: 'const renglones = comoHoja.map((r, i) => [r, i]).filter(() => true)' },
      { nombre: 'el detalle mío sin escapar el motivo', de: '<div class="rt-item__lotes-mio">${esc(detalle)}</div>', a: '<div class="rt-item__lotes-mio">${detalle}</div>' },
      { nombre: 'la fila mía sin las devueltas', de: " + (devueltas ? ` · devolvió ${enteroHoja(devueltas)}` : '')", a: '' },
    ],
  },
  {
    suite: SUITE,
    original: process.env.ARCHIVO_BASE_COMUN || path.join(__dirname, '..', 'js', 'retiros-comun.js'),
    variable: 'ARCHIVO_COMUN_RETIROS',
    funciones: [],
    manuales: [
      { nombre: 'la hoja sin "−" en la devolución', de: "  if (r?.movimiento === 'devolucion') return enteroHoja(r?.cajas) === '—' ? '—' : `−${enteroHoja(r.cajas)}`\n", a: '' },
      { nombre: 'la hoja sin ordenar', de: '  return [...lista.filter(r => !esDevolucionHoja(r)), ...lista.filter(esDevolucionHoja)]', a: '  return lista' },
      { nombre: 'el total de cajas cuenta la devolución', de: "(r?.esInsumo || r?.movimiento === 'devolucion' ? 0 :", a: '(r?.esInsumo ? 0 :' },
      { nombre: 'las unidades cuentan la devolución', de: " && r?.movimiento !== 'devolucion')", a: ')' },
      { nombre: 'sin las devueltas', de: '  return (orden?.renglones ?? []).reduce((s, r) => s + (esDevolucionHoja(r) ? (Number(r.cajas) || 0) : 0), 0)', a: '  return 0' },
      { nombre: 'la reposición no cuenta como devuelta', de: "  return r?.movimiento === 'devolucion' || r?.movimiento === 'reposicion'\n", a: "  return r?.movimiento === 'devolucion'\n" },
      { nombre: 'sin el título DEVOLUCIONES', de: 'k === primeraDev', a: 'false' },
      { nombre: 'el título en todas', de: 'k === primeraDev', a: 'k >= primeraDev' },
      { nombre: 'sin "a favor del cliente"', de: 'const aFavor = conPrecios && Number(orden?.total) < 0', a: 'const aFavor = false' },
      { nombre: '"a favor" también sin precios', de: 'const aFavor = conPrecios && Number(orden?.total) < 0', a: 'const aFavor = Number(orden?.total) < 0' },
      { nombre: 'la reposición con su precio', de: '    precio = repone\n', a: '    precio = false\n' },
      { nombre: 'la devolución sin el subtotal', de: '${escHoja(importeHoja(r?.precio, moneda))}</td><td class="rh-num rh-plata">${escHoja(importeHoja(r?.subtotal, moneda))}</td>`\n  }\n  return `<tr class="rh-fila rh-devuelto', a: '${escHoja(importeHoja(r?.precio, moneda))}</td><td class="rh-num rh-plata"></td>`\n  }\n  return `<tr class="rh-fila rh-devuelto' },
      { nombre: 'sin escHoja en el motivo', de: '${escHoja(detalleDevolucionHoja(r))}', a: '${detalleDevolucionHoja(r)}' },
      { nombre: 'sin escHoja en el lote devuelto', de: '<td class="rh-lote">${escHoja(lote)}</td>', a: '<td class="rh-lote">${lote}</td>' },
      { nombre: 'la reposición sin sus lotes', de: "  const lote = repone ? textoLotesHoja(r?.lotes) : (String(r?.loteDevuelto ?? '').trim() || '—')", a: "  const lote = String(r?.loteDevuelto ?? '').trim() || '—'" },
      { nombre: 'el destino siempre "se descartan"', de: "  return destino === 'stock' ? 'vuelven al stock' : 'se descartan'", a: "  return 'se descartan'" },
      { nombre: 'el detalle sin el lote', de: "    lote ? `lote ${lote}` : '', textoDestinoDevuelto(r?.destino)]", a: "    textoDestinoDevuelto(r?.destino)]" },
      { nombre: 'el texto sin la sección', de: "    lineas.push('', 'Devoluciones:')", a: "    lineas.push('')" },
      { nombre: 'el texto repite las devoluciones', de: '    if (esDevolucionHoja(r)) continue\n', a: '' },
      { nombre: 'el texto sin "−"', de: "${r.movimiento === 'devolucion' ? '−' : ''}${enteroHoja(r.cajas)} cajas · ${desc} (${detalleDevolucionHoja(r)})", a: '${enteroHoja(r.cajas)} cajas · ${desc} (${detalleDevolucionHoja(r)})' },
    ],
  },
]

let det = 0, tot = 0, eq = 0, mal = 0
for (const t of tandas) {
  const r = correrMutaciones({ ...t, salir: false })
  det += r.detectadas; tot += r.total; eq += r.equivalentes; mal += r.fallas
}
console.log(`\nTOTAL: ${det}/${tot} mutaciones detectadas${eq ? ` (+${eq} equivalentes)` : ''}`)
process.exit(det === tot && !mal ? 0 : 1)
