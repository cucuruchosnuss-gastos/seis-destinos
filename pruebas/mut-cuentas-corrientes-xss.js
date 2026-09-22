// Mutaciones de test-cuentas-corrientes-xss.js. Ver mutar.js.
//
//   node pruebas/mut-cuentas-corrientes-xss.js
//
// AUTOMÁTICAS: cada `${esc(...)}` de una plantilla con HTML de las funciones
// de render pierde su esc() (también las anidadas).
//
// A MANO: los helpers que escapan POR DENTRO (importeHtml, la moneda de
// formatearImporteCentavosSuaves, los tres esc de poblarSelect), los esc() que
// viven en plantillas SIN HTML propio (los sufijos " · moneda", la categoría
// del detalle del pago, la etiqueta del banner, las cantidades de una descarga
// sin importe), los encodeURIComponent y el delimitador de los href a
// gastos.html, el color del avatar (va dentro de un style), los dos caminos
// por textContent de la importación por Excel, las guardas de badge y del
// aviso "sin importe", y el deep link (?proveedor= contra el padrón, la query
// de history).

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-cuentas-corrientes-xss.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cuentas-corrientes.html'),
  funciones: [
    'renderizarListaSaldos', 'renderizarListaSinProveedor', 'renderizarSugerenciasAsignar', 'abrirModalDetallePago',
    'cargarPendientesAceptacion', 'renderizarPadron', 'renderizarListaHistorial', 'renderizarSelectorUnidadFicha',
    'renderizarFichaBanner', 'renderizarFichaMovimientos', 'htmlFilaSinImporte', 'htmlRemitosSinFacturar',
    'crearSelectorOrdenFicha', 'abrirModalAplicarCreditoDesdeFicha', 'actualizarSelectorCuentaPago',
    'renderizarFilasFifo', 'poblarSelect',
  ],
  manuales: [
    { nombre: 'importeHtml() deja de escapar',
      de: 'return esc(formatearImporte(importe, moneda))', a: 'return formatearImporte(importe, moneda)' },
    { nombre: 'formatearImporteCentavosSuaves() deja de escapar la moneda',
      de: "const simbolo = moneda === 'ARS' ? '$' : esc(moneda)", a: "const simbolo = moneda === 'ARS' ? '$' : moneda" },
    { nombre: 'lista de saldos: el sufijo de moneda pierde el esc()',
      de: "const sufijoMoneda = multiMoneda ? ` · ${esc(s.moneda)}` : ''", a: "const sufijoMoneda = multiMoneda ? ` · ${s.moneda}` : ''" },
    { nombre: 'padrón: el sufijo de moneda pierde el esc()',
      de: "const sufijo = multiMoneda ? ` · ${esc(l.moneda)}` : ''", a: "const sufijo = multiMoneda ? ` · ${l.moneda}` : ''" },
    { nombre: 'detalle del pago: la categoría pierde el esc()',
      de: '` · ${esc(fp.categorias.nombre)}`', a: '` · ${fp.categorias.nombre}`' },
    { nombre: 'banner: "Saldo a favor · moneda" pierde el esc()',
      de: '`Saldo a favor · ${esc(s.moneda)}`', a: '`Saldo a favor · ${s.moneda}`' },
    { nombre: 'banner: "A pagar · moneda" pierde el esc()',
      de: '`A pagar · ${esc(s.moneda)}`', a: '`A pagar · ${s.moneda}`' },
    { nombre: 'descarga sin importe: las cantidades pierden el esc()',
      de: "cantidades.map(c => esc(textoCantidadInsumo(c))).join('<br>')", a: "cantidades.map(c => textoCantidadInsumo(c)).join('<br>')" },
    { nombre: 'descarga sin importe: la fecha de las filas en "todas" pierde el esc() de la unidad',
      de: "${formatearFecha(m.fecha)}${todas ? ` · ${esc(nombreUnidad(m.unidad_negocio_id))}` : ''}</div>\n            ${cantidadesHtml}",
      a: "${formatearFecha(m.fecha)}${todas ? ` · ${nombreUnidad(m.unidad_negocio_id)}` : ''}</div>\n            ${cantidadesHtml}" },
    { nombre: 'movimientos: la unidad en "todas" pierde el esc()',
      de: "${formatearFecha(m.fecha)}${todas ? ` · ${esc(nombreUnidad(m.unidad_negocio_id))}` : ''}</div>\n            </div>",
      a: "${formatearFecha(m.fecha)}${todas ? ` · ${nombreUnidad(m.unidad_negocio_id)}` : ''}</div>\n            </div>" },
    { nombre: 'historial: la referencia pierde el esc()',
      de: "${referencia ? ` — ${esc(referencia)}` : ''}", a: "${referencia ? ` — ${referencia}` : ''}" },
    { nombre: 'sugerencias: la fantasía pierde el esc()',
      de: '(${esc(p.nombre_fantasia)})</span>', a: '(${p.nombre_fantasia})</span>' },
    { nombre: 'remitos: la unidad pierde el esc()',
      de: "${unidadId ? '' : ` · ${esc(nombreUnidad(r.unidad_negocio_id))}`}", a: "${unidadId ? '' : ` · ${nombreUnidad(r.unidad_negocio_id)}`}" },
    { nombre: 'cuentas del pago: el nombre pierde el esc()',
      de: '${esc(c.nombre)} (${esc(MEDIO_CUENTA_LABEL[c.medio])}', a: '${c.nombre} (${esc(MEDIO_CUENTA_LABEL[c.medio])}' },
    { nombre: 'cuentas del pago: el id pierde el esc()',
      de: 'const opciones = c => `<option value="${esc(c.id)}">', a: 'const opciones = c => `<option value="${c.id}">' },
    { nombre: 'facturas sin proveedor: el href Ver pierde el encodeURIComponent del id',
      de: '<a href="gastos.html?factura=${encodeURIComponent(f.id)}&volver=${encodeURIComponent(\'cuentas-corrientes.html\')}" class="btn-icono-accion" title="Ver">',
      a: '<a href="gastos.html?factura=${f.id}&volver=${encodeURIComponent(\'cuentas-corrientes.html\')}" class="btn-icono-accion" title="Ver">' },
    { nombre: 'facturas sin proveedor: el href Editar pasa a comillas simples',
      de: '<a href="gastos.html?factura=${encodeURIComponent(f.id)}&volver=${encodeURIComponent(\'cuentas-corrientes.html\')}" class="btn-icono-accion" title="Editar">',
      a: '<a href=\'gastos.html?factura=${encodeURIComponent(f.id)}&volver=${encodeURIComponent("cuentas-corrientes.html")}\' class="btn-icono-accion" title="Editar">' },
    { nombre: 'ficha: el href Ver pierde el encodeURIComponent del id',
      de: '<a href="gastos.html?factura=${encodeURIComponent(m.factura_pendiente_id)}&volver=${volverFicha}" class="btn-icono-accion" title="Ver">',
      a: '<a href="gastos.html?factura=${m.factura_pendiente_id}&volver=${volverFicha}" class="btn-icono-accion" title="Ver">' },
    { nombre: 'ficha: el volver deja de codificar location.href',
      de: 'const volverFicha = encodeURIComponent(location.href)', a: 'const volverFicha = location.href' },
    { nombre: 'el color del avatar pasa a ser el nombre',
      de: 'return PALETA_AVATAR[Math.abs(hash) % PALETA_AVATAR.length]', a: 'return texto' },
    { nombre: 'badgeEstadoFactura() deja de cortar con un estado desconocido',
      de: "if (!label) return ''\n      return `<span class=\"badge-estado-factura", a: "return `<span class=\"badge-estado-factura" },
    { nombre: 'htmlSinImporte() deja de cortar si n no es > 0',
      de: "if (!(n > 0)) return ''", a: '' },
    { nombre: 'vista previa del Excel: una celda pasa a innerHTML',
      de: 'td.textContent = c.texto', a: 'td.innerHTML = c.texto' },
    { nombre: 'errores del Excel: el texto pasa a un innerHTML',
      de: "li.appendChild(document.createTextNode(\n          ` — ${err.razon_social ?? 'sin nombre'}: ${err.motivo ?? 'error desconocido'}`\n        ))",
      a: "li.innerHTML += ` — ${err.razon_social ?? 'sin nombre'}: ${err.motivo ?? 'error desconocido'}`" },
    { nombre: '?proveedor= deja de exigir un id del padrón',
      de: 'if (prov) await abrirFicha(proveedorURL, unidadURL, prov.razon_social)', a: 'await abrirFicha(proveedorURL, unidadURL, prov?.razon_social)' },
    { nombre: 'la query de la ficha deja de empezar en "?"',
      de: 'const qs = `?proveedor=${proveedorId}`', a: 'const qs = `${proveedorId}`' },
    { nombre: 'el &unidad= de la URL llega al banner',
      de: '${todas ? `<div class="banner-ficha-cc__ayuda">Elegí una unidad de negocio para registrar un pago</div>` : \'\'}',
      a: '${todas ? `<div class="banner-ficha-cc__ayuda">Elegí una unidad de negocio para registrar un pago</div>` : estado.ficha.unidadId}' },
    { nombre: 'aparece una segunda navegación',
      de: "setTimeout(() => window.location.replace('../dashboard.html'), 1500)",
      a: "setTimeout(() => window.location.replace('../dashboard.html'), 1500); if (0) window.location.href = x" },
  ],
})
