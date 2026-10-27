// Mutaciones de test-retiros-hoja-nueva.js: la hoja nueva de la orden
// (26/10/2026: CANT. | PRODUCTO | DESCRIPCIÓN | TOTAL | LOTE). Mutan
// js/retiros-comun.js (que la suite recibe por ARCHIVO_COMUN_RETIROS) y lo que
// arman para la hoja la Carga (ARCHIVO_TEST) y Administración (ARCHIVO_ADMIN).
// Ver mutar.js.
//
//   node pruebas/mut-retiros-hoja-nueva.js
'use strict'

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const SUITE = path.join(__dirname, 'test-retiros-hoja-nueva.js')

correrMutacionesEnVarios([{
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'js', 'retiros-comun.js'),
  variable: 'ARCHIVO_COMUN_RETIROS',
  funciones: [],
  manuales: [
    // Las columnas
    { nombre: 'vuelve el encabezado viejo', de: "'<tr><th class=\"rh-num\">CANT.</th><th>PRODUCTO</th><th>DESCRIPCIÓN</th>", a: "'<tr><th class=\"rh-num\">CAJAS</th><th>PRODUCTO</th><th>DESCRIPCIÓN</th>" },
    { nombre: 'sin la columna DESCRIPCIÓN', de: '<th>PRODUCTO</th><th>DESCRIPCIÓN</th>', a: '<th>PRODUCTO</th>' },
    { nombre: 'P. UNIT. con otro nombre', de: "'<th class=\"rh-num\">P. UNIT.</th><th class=\"rh-num\">IMPORTE</th>'", a: "'<th class=\"rh-num\">PRECIO</th><th class=\"rh-num\">SUBTOTAL</th>'" },
    { nombre: 'la tabla de precios sin su clase', de: "rh-tabla${conPrecios ? ' rh-tabla--precios' : ''}", a: 'rh-tabla' },
    { nombre: 'el producto sin negrita', de: '.rh-producto { font-weight: 800; }', a: '.rh-producto { font-weight: 400; }' },
    { nombre: 'la cantidad del lote del mismo tamaño', de: '.rh-lote__cant { font-size: 11px; }', a: '.rh-lote__cant { font-size: inherit; }' },
    // La descripción del producto terminado: NUNCA la presentación, "sin cono", doble bolsa ni media caja
    { nombre: 'vuelve el nombre de la presentación', de: "  return [n ? `×${enteroHoja(n)}` : '', cono ? `con cono ${cono}` : ''].filter(Boolean).join(' · ')", a: "  return [r?.presentacion, n ? `×${enteroHoja(n)}` : '', cono ? `con cono ${cono}` : ''].filter(Boolean).join(' · ')" },
    { nombre: 'vuelve la presentación en la hoja', de: "  return [n ? escHoja(`×${enteroHoja(n)}`) : '',", a: "  return [escHoja(r?.presentacion ?? ''), n ? escHoja(`×${enteroHoja(n)}`) : '']," },
    { nombre: 'vuelve a decir sin cono', de: "const SIN_NOMBRE_DE_CONO = new Set(['', '—', 'sin cono',", a: "const SIN_NOMBRE_DE_CONO = new Set(['', '—'," },
    { nombre: 'un cono sin nombre se dice', de: "  return SIN_NOMBRE_DE_CONO.has(c.toLowerCase()) ? '' : c", a: '  return c' },
    { nombre: 'el cono sin negrita', de: '`con cono <strong class="rh-cono">${escHoja(cono)}</strong>`', a: '`con cono ${escHoja(cono)}`' },
    { nombre: 'sin "×" de las unidades por caja', de: "  return [n ? escHoja(`×${enteroHoja(n)}`) : '',", a: "  return [''," },
    { nombre: 'las unidades por caja solo de porCaja', de: '  return c > 0 && u > 0 && Number.isInteger(u / c) ? u / c : null', a: '  return null' },
    { nombre: 'unidades ÷ cajas aunque no dé justo', de: '  return c > 0 && u > 0 && Number.isInteger(u / c) ? u / c : null', a: '  return c > 0 && u > 0 ? u / c : null' },
    { nombre: 'el nombre del cono de la pantalla gana', de: "  const c = String(r?.conoNombre ?? r?.cono ?? '').trim()", a: "  const c = String(r?.cono ?? r?.conoNombre ?? '').trim()" },
    // Los insumos
    { nombre: 'sin nombre del bulto no dice "bulto"', de: "    const nombre = String(r?.nombreBulto ?? '').trim() || NOMBRE_BULTO_HOJA", a: "    const nombre = String(r?.nombreBulto ?? '').trim()" },
    { nombre: 'sin "de {contenido}"', de: '    return `${nombre} de ${cantidadInsumoHoja(contenido, u || null)}`', a: '    return nombre' },
    { nombre: '"por unidad" dice "por un."', de: "export const POR_UNIDAD_HOJA = { un: 'por unidad', kg: 'por kg', lt: 'por litro' }", a: "export const POR_UNIDAD_HOJA = { kg: 'por kg', lt: 'por litro' }" },
    { nombre: 'sin la marca', de: '    return conMayuscula([marca, bultoInsumoHoja(r)].filter(Boolean).join(\' · \'))', a: '    return conMayuscula(bultoInsumoHoja(r))' },
    { nombre: 'sin mayúscula al empezar', de: '    return conMayuscula([marca, bultoInsumoHoja(r)].filter(Boolean).join(\' · \'))', a: '    return [marca, bultoInsumoHoja(r)].filter(Boolean).join(\' · \')' },
    { nombre: 'CANT. del insumo en kilos', de: '  if (b !== null) return formatearNumeroAr(b, { decimales: 3, minimos: 0 })', a: '  if (b !== null) return formatearNumeroAr(Number(r.cantidad), { decimales: 3, minimos: 0 })' },
    { nombre: 'CANT. del insumo sin bulto con la unidad', de: '  return formatearNumeroAr(Number(n), { decimales: decimalesDeUnidad(r?.unidad), minimos: 0 })', a: '  return cantidadInsumoHoja(n, r?.unidad)' },
    { nombre: 'TOTAL del insumo en bultos', de: '  if (r?.esInsumo) return cantidadInsumoHoja(r.cantidad, r.unidad)', a: '  if (r?.esInsumo) return cantidadColHoja(r)' },
    // TOTAL del producto terminado
    { nombre: 'TOTAL sin "un."', de: "  return `${r?.movimiento === 'devolucion' ? '−' : ''}${enteroHoja(u)} un.`", a: "  return `${r?.movimiento === 'devolucion' ? '−' : ''}${enteroHoja(u)}`" },
    { nombre: 'TOTAL del producto son las cajas', de: '  let u = Number(r?.unidades)\n', a: '  let u = Number(r?.cajas)\n' },
    { nombre: 'TOTAL sin unidades no se calcula', de: "  if (!(u > 0)) { const n = porCajaHoja(r), c = Number(r?.cajas); u = n && c > 0 ? n * c : NaN }\n", a: '' },
    // LOTE
    { nombre: 'un solo lote con la cantidad', de: "    if (lista.length === 1 || c === null || c === undefined || c === '') return escHoja(lote)", a: "    if (c === null || c === undefined || c === '') return escHoja(lote)" },
    { nombre: 'la cantidad del lote sin paréntesis', de: '<span class="rh-lote__cant">(${escHoja(cuanto(l))})</span>', a: '<span class="rh-lote__cant">${escHoja(cuanto(l))}</span>' },
    { nombre: 'varios lotes separados por coma', de: "(${escHoja(cuanto(l))})</span></span>`\n  }).join(' · ')", a: "(${escHoja(cuanto(l))})</span></span>`\n  }).join(', ')" },
    { nombre: 'el faltante no se nombra en los lotes', de: '    if (lote === LOTE_SIN_STOCK_HOJA) return escHoja(`faltan ${cuanto(l)}`)\n', a: '' },
    { nombre: 'sin lote no dice "—"', de: "  if (!lista.length) return '—'\n  const cuanto = (l) => unidad ? cantidadInsumoHoja(l?.cantidad, unidad) : enteroHoja(l?.cajas)\n  return lista.map(l => {\n    const lote = String(l?.lote ?? '—')\n    const c = unidad ? l?.cantidad : l?.cajas\n    if (lote === LOTE_SIN_STOCK_HOJA) return escHoja", a: "  if (!lista.length) return ''\n  const cuanto = (l) => unidad ? cantidadInsumoHoja(l?.cantidad, unidad) : enteroHoja(l?.cajas)\n  return lista.map(l => {\n    const lote = String(l?.lote ?? '—')\n    const c = unidad ? l?.cantidad : l?.cajas\n    if (lote === LOTE_SIN_STOCK_HOJA) return escHoja" },
    // La fila TOTAL
    { nombre: 'la fila TOTAL con "0 cajas"', de: "    cajas > 0 ? plural(cajas, 'caja de producto', 'cajas de producto') : '',", a: "    plural(cajas, 'caja de producto', 'cajas de producto')," },
    { nombre: 'la fila TOTAL sin los bultos', de: "    bultos > 0 ? plural(bultos, 'bulto', 'bultos') : '',\n", a: '' },
    { nombre: 'la fila TOTAL sin las un.', de: "    unidades > 0 ? `${formatearNumeroAr(unidades, { decimales: 0, minimos: 0 })} un.` : '',\n", a: '' },
    { nombre: 'la fila TOTAL cuenta las devoluciones', de: "    if (!r || r.movimiento === 'devolucion') continue", a: '    if (!r) continue' },
    { nombre: 'la fila TOTAL sin singular', de: "  const plural = (n, uno, varios) => `${formatearNumeroAr(n, { decimales: 3, minimos: 0 })} ${n === 1 ? uno : varios}`", a: "  const plural = (n, uno, varios) => `${formatearNumeroAr(n, { decimales: 3, minimos: 0 })} ${varios}`" },
    { nombre: 'las un. de los insumos por kg también', de: "    else if (String(r.unidad ?? '') === 'un') unidades += Number(r.cantidad) || 0", a: '    else unidades += Number(r.cantidad) || 0' },
    { nombre: 'kilos y litros juntos', de: "  return ['kg', 'lt'].filter(u => suma[u] > 0).map(u => cantidadInsumoHoja(suma[u], u)).join(' + ')", a: "  return suma.kg + suma.lt > 0 ? cantidadInsumoHoja(suma.kg + suma.lt, 'kg') : ''" },
    { nombre: 'la columna TOTAL de la fila TOTAL vacía', de: '`<td class="rh-num rh-tot rh-total__peso">${escHoja(totalPesoHoja(orden))}</td><td></td>`', a: '`<td class="rh-num rh-tot rh-total__peso"></td><td></td>`' },
    // Escapado
    { nombre: 'sin escHoja en el producto', de: "`<td class=\"rh-producto\">${escHoja(String(r?.producto ?? '').trim() || (r?.esInsumo ? 'Insumo' : '—'))}</td>`", a: "`<td class=\"rh-producto\">${String(r?.producto ?? '').trim() || (r?.esInsumo ? 'Insumo' : '—')}</td>`" },
    { nombre: 'sin escHoja en el cono', de: '<strong class="rh-cono">${escHoja(cono)}</strong>', a: '<strong class="rh-cono">${cono}</strong>' },
    { nombre: 'sin escHoja en la descripción del insumo', de: '  if (r?.esInsumo) return escHoja(descripcionCortaHoja(r))', a: '  if (r?.esInsumo) return descripcionCortaHoja(r)' },
    { nombre: 'sin escHoja en un lote entre varios', de: '<span class="rh-lote__uno">${escHoja(lote)} <span', a: '<span class="rh-lote__uno">${lote} <span' },
    { nombre: 'el lote y su cantidad se pueden separar', de: '.rh-lote__uno { display: inline-block; max-width: 100%; }', a: '.rh-lote__uno { display: inline; }' },
    { nombre: 'sin juntar el lote con su cantidad', de: 'return `<span class="rh-lote__uno">${escHoja(lote)} <span class="rh-lote__cant">(${escHoja(cuanto(l))})</span></span>`', a: 'return `${escHoja(lote)} <span class="rh-lote__cant">(${escHoja(cuanto(l))})</span>`' },
  ],
}, {
  suite: SUITE,
  original: path.join(__dirname, '..', 'modulos', 'retiros.html'),
  variable: 'ARCHIVO_TEST',
  funciones: [],
  manuales: [
    { nombre: 'la Carga no lee el nombre del bulto', de: "vista_preferida, contenido_bulto, nombre_bulto').eq('activo', true)", a: "vista_preferida, contenido_bulto').eq('activo', true)" },
    { nombre: 'el catálogo no guarda el nombre del bulto', de: '        i.nombre_bulto = nombresBulto.get(i.id) ?? null\n', a: '' },
    { nombre: 'el nombre del bulto sin limpiar', de: '[i.id, limpio(i.nombre_bulto) || null]', a: '[i.id, i.nombre_bulto]' },
    { nombre: 'el renglón de insumo sin el nombre del bulto', de: 'nombreBulto: insumoDe(estado.catalogo, r.insumo_id)?.nombre_bulto ?? null }', a: 'nombreBulto: null }' },
    { nombre: 'el renglón de producto sin el nombre del cono', de: 'conoNombre: limpio(r.marca) || null,', a: 'conoNombre: null,' },
  ],
}, {
  suite: SUITE,
  original: path.join(__dirname, '..', 'modulos', 'administracion.html'),
  variable: 'ARCHIVO_ADMIN',
  funciones: [],
  manuales: [
    { nombre: 'Administración no lee el nombre del bulto', de: "vista_preferida, contenido_bulto, nombre_bulto').order('categoria')", a: "vista_preferida, contenido_bulto').order('categoria')" },
    { nombre: 'el insumo sin el nombre del bulto', de: 'nombreBulto: ins?.nombre_bulto ?? null,', a: 'nombreBulto: null,' },
    { nombre: 'el producto sin las unidades por caja', de: 'conoNombre, porCaja: pr?.unidades_por_caja ?? null }', a: 'conoNombre, porCaja: null }' },
    { nombre: 'el cono aunque la presentación no lleve', de: 'const conoNombre = pr?.con_cono && it.marca_id ?', a: 'const conoNombre = it.marca_id ?' },
    { nombre: 'el producto sin el nombre del cono', de: 'return { producto: prod?.nombre ?? \'Producto (no se pudo leer)\', presentacion: pr?.nombre ?? \'—\', cono, conoNombre,', a: 'return { producto: prod?.nombre ?? \'Producto (no se pudo leer)\', presentacion: pr?.nombre ?? \'—\', cono, conoNombre: null,' },
  ],
}])
