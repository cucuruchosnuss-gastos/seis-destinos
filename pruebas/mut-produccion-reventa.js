// Mutaciones de test-produccion-reventa.js (la reventa y los traspasos entre
// fábricas en el stock terminado de la gestión, 30/09/2026). Ver mutar.js y
// mutar-produccion.js.
//
//   node pruebas/mut-produccion-reventa.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-reventa.js'),
  escape: 'esc',
  funciones: ['htmlTraspasosStock', 'htmlStockTerminado'],
  equivalentes: [
    { expr: 'esc(fechaDelDia(m.fecha))', motivo: 'una fecha dd/mm/aaaa que arma el código' },
    { expr: 'esc(cuenta)', motivo: 'un número formateado y las palabras "salieron / entraron" y "cajas"' },
    { expr: 'esc(textoEntero(g.cajas))', motivo: 'un número formateado' },
    { expr: 'esc(textoEntero(g.unidades))', motivo: 'un número formateado' },
    { expr: 'esc(textoEntero(s.cajas))', motivo: 'un número formateado' },
    { expr: 'esc(textoEntero(s.unidades))', motivo: 'un número formateado' },
  ],
  manuales: [
    // Qué se pide
    { nombre: 'los productos sin origen_producto_id', de: "select('id, nombre, orden, origen_producto_id')", a: "select('id, nombre, orden')" },
    { nombre: 'el origen sin su unidad', de: "select('id, unidad_negocio_id').in('id', ids)", a: "select('id').in('id', ids)" },
    { nombre: 'se piden todos los productos y no los de origen', de: "select('id, unidad_negocio_id').in('id', ids)", a: "select('id, unidad_negocio_id')" },
    { nombre: 'sin reventa igual se consulta', de: '      if (!ids.length) return new Map()\n', a: '' },
    { nombre: 'un error del origen voltea el stock', de: "        console.error('productos de origen (reventa):', err)\n        return null", a: '        throw err' },
    // La etiqueta
    { nombre: 'un producto propio lleva etiqueta', de: '      if (!prod?.origen_producto_id) return null\n', a: '' },
    { nombre: 'sin fábrica se inventa una', de: "      return nombre ? `Reventa · ${nombre}` : 'Reventa'", a: "      return `Reventa · ${nombre ?? 'Dolce Pasta'}`" },
    { nombre: 'la etiqueta sin la fábrica', de: "      return nombre ? `Reventa · ${nombre}` : 'Reventa'", a: "      return 'Reventa'" },
    { nombre: 'la fábrica del producto propio y no la del origen', de: '      const unidad = cat?.origenes?.get?.(prod.origen_producto_id)', a: '      const unidad = estado.stockUnidad' },
    { nombre: 'el mapa de unidades no se mira: se muestra el id', de: '      const nombre = unidad ? estado.unidades?.get?.(unidad) : null', a: '      const nombre = unidad ?? null' },
    { nombre: 'la etiqueta no se dibuja', de: "${g.reventa ? `<span class=\"pg-reventa\">${esc(g.reventa)}</span>` : ''}", a: '' },
    { nombre: 'los orígenes no llegan al catálogo', de: '      const cat = { productos, presentaciones, marcas, origenes }', a: '      const cat = { productos, presentaciones, marcas }' },
    { nombre: 'la respuesta de otra unidad pisa (origen)', de: '      if (estado.stockUnidad !== unidadStock) return\n', a: '' },
    { nombre: 'la etiqueta en bordó', de: '      background: var(--color-pista); color: var(--color-texto-2); border: 1px solid var(--color-borde);', a: '      background: var(--bordo-suave); color: var(--bordo-oscuro); border: 1px solid var(--color-borde);' },
    // Los traspasos
    { nombre: 'la salida con otro nombre', de: "      traspaso_salida: 'Traspaso a otra fábrica',", a: "      traspaso_salida: 'Traspaso',"},
    { nombre: 'la entrada con otro nombre', de: "      traspaso_entrada: 'Traspaso desde otra fábrica',", a: "      traspaso_entrada: 'Traspaso',"},
    { nombre: 'el tipo se muestra crudo', de: '`<span><strong>${esc(textoTipoStockTerminado(m.tipo))}</strong></span>`', a: '`<span><strong>${esc(m.tipo)}</strong></span>`' },
    { nombre: 'un tipo desconocido se inventa', de: '? NOMBRE_TIPO_STOCK_TERMINADO[t] : t', a: "? NOMBRE_TIPO_STOCK_TERMINADO[t] : 'Ajuste'" },
    { nombre: 'un tipo vacío sin nombre', de: "      if (!t) return 'Movimiento'\n", a: '' },
    { nombre: 'sin hasOwnProperty (toString rompe)', de: 'Object.prototype.hasOwnProperty.call(NOMBRE_TIPO_STOCK_TERMINADO, t)', a: 'NOMBRE_TIPO_STOCK_TERMINADO[t]' },
    { nombre: 'las entradas no se listan', de: "(m => m.tipo === 'traspaso_salida' || m.tipo === 'traspaso_entrada')", a: "(m => m.tipo === 'traspaso_salida')" },
    { nombre: 'se listan todos los movimientos', de: "(m => m.tipo === 'traspaso_salida' || m.tipo === 'traspaso_entrada')", a: '(m => true)' },
    { nombre: 'traspasos: lo más viejo primero', de: "String(y.fecha).localeCompare(String(x.fecha))", a: "String(x.fecha).localeCompare(String(y.fecha))" },
    { nombre: 'traspasos: mismo día sin desempate por la hora', de: " || String(y.created_at ?? '').localeCompare(String(x.created_at ?? ''))", a: '' },
    { nombre: 'traspasos: la salida dice "entraron"', de: '        const sale = m.tipo === \'traspaso_salida\'\n', a: '        const sale = false\n' },
    { nombre: 'traspasos: cajas con signo', de: "${cajasTr === null ? '—' : textoEntero(Math.abs(cajasTr))}", a: "${cajasTr === null ? '—' : textoEntero(cajasTr)}" },
    { nombre: 'traspasos: cajas que no llegaron son cero', de: "${cajasTr === null ? '—' : textoEntero(Math.abs(cajasTr))}", a: '${textoEntero(Math.abs(cajasTr ?? 0))}' },
    { nombre: 'sin traspasos igual se dibuja', de: "      if (!traspasos?.length) return ''\n", a: '' },
    { nombre: 'los traspasos no se dibujan', de: '      if (cajaTraspasos) cajaTraspasos.innerHTML = htmlTraspasosStock(traspasosDeStock(movs), cat)\n', a: '' },
    { nombre: 'la sección de traspasos no se limpia al recargar', de: "      if (cajaTraspasos) cajaTraspasos.innerHTML = ''\n", a: '' },
  ],
})
