// Mutaciones de test-gastos-xss.js. Ver mutar.js.
//
//   node pruebas/mut-gastos-xss.js
//
// AUTOMÁTICAS: cada `${esc(...)}` de las funciones de render pierde su esc()
// (también las anidadas, que son interpolaciones propias).
//
// A MANO: los esc() que no están al principio de la interpolación (adentro de
// un ternario, de un .map(esc), de la flecha fila() que se repite en cuatro
// renders), los encodeURIComponent de los links y el control de ?volver=.

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

// fila() es IDÉNTICA en cuatro renders: el ancla es la línea más lo que
// sigue, que en cada uno es distinto.
const FILA = "const fila = (etiqueta, valor) => filaHtml(etiqueta, valor != null && valor !== '' ? esc(valor) : null)"
const sinEscFila = (sufijo) => ({ de: FILA + sufijo, a: FILA.replace('esc(valor)', 'valor') + sufijo })
const FILAS = [
  ['el resumen del wizard', "\n\n      document.getElementById('resumen-contenido').innerHTML = `\n        <div class=\"resumen-seccion\">\n          <div class=\"resumen-seccion__titulo\">Comprobante</div>\n          ${fila('Fecha de pago'"],
  ['el resumen del flujo pendiente', "\n\n      document.getElementById('resumen-contenido').innerHTML = `\n        <div class=\"resumen-seccion\">\n          <div class=\"resumen-seccion__titulo\">Comprobante</div>\n          ${fila('Fecha de factura', formatearFecha(g.fecha_factura))}"],
  ['el detalle del gasto', '\n\n      const esAnulado'],
  ['el detalle de la factura', "\n\n      document.getElementById('detalle-factura-contenido')"],
]

// El importe del resumen es igual en los dos resúmenes y en el detalle: el
// ancla es la fila de ARRIBA, que en cada uno es distinta.
const IMPORTE = '\n          <div class="resumen-fila resumen-fila--importe">\n            <span class="resumen-fila__etiqueta">Importe</span>\n            <span class="resumen-importe">'
const sinEscImporte = (antes) => ({
  de: antes + IMPORTE + '${esc(formatearImporte(g.importe, g.moneda))}',
  a: antes + IMPORTE + '${formatearImporte(g.importe, g.moneda)}',
})

correrMutaciones({
  suite: path.join(__dirname, 'test-gastos-xss.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/gastos.html'),
  funciones: [
    'poblarSelect', 'poblarSelectMoneda', 'crearMultiselect', 'crearSelectorOrden', 'renderizarFiltros',
    'renderizarCardGasto', 'htmlFilasProyectos', 'htmlSeccionComprobante', 'htmlAvisoDuplicado',
    'actualizarBreadcrumb', 'renderizarGrillaDestino', 'renderizarGrillaVehiculos', 'renderizarGrillaCategorias',
    'poblarSelectEmpleados', 'mostrarEstadoOcr', 'htmlAvisoPostGasto', 'htmlIngresosSinGasto',
    'renderizarIngresosSinGasto', 'renderizarSugerenciasProveedorEn',
    // renderizarResumen y renderizarResumenPendiente NO van en automático: su
    // filaHtml() es idéntico en los dos, sin ancla única posible (y su único
    // esc(), el de la etiqueta, es equivalente). Sus demás esc() van a mano.
    'mostrarDetalleGasto', 'mostrarFormularioEdicionGasto',
    'mostrarDetalleFactura', 'mostrarFormularioEdicionFactura', 'mostrarFormularioInteres',
  ],
  manuales: [
    ...FILAS.map(([donde, sufijo]) => ({ nombre: `fila() de ${donde} deja de escapar el valor`, ...sinEscFila(sufijo) })),
    { nombre: 'la meta de la tarjeta del listado pierde el esc()',
      de: "const metaSecundaria = esc([fecha, empleado].filter(Boolean).join(' · '))",
      a: "const metaSecundaria = [fecha, empleado].filter(Boolean).join(' · ')" },
    { nombre: 'los datos del aviso de duplicados dejan de pasar por .map(esc)',
      de: "[cuando, f.razon_social || '', unidad].filter(Boolean).map(esc).join(' · ')",
      a: "[cuando, f.razon_social || '', unidad].filter(Boolean).join(' · ')" },
    { nombre: 'el breadcrumb pierde el esc() de la empresa',
      de: "items.push({ labelHtml: esc(empresaLabel), subpaso: 'destino' })",
      a: "items.push({ labelHtml: empresaLabel, subpaso: 'destino' })" },
    { nombre: 'el breadcrumb pierde el esc() del vehículo',
      de: "items.push({ labelHtml: esc(vehLabel), subpaso: 'vehiculo-destino' })",
      a: "items.push({ labelHtml: vehLabel, subpaso: 'vehiculo-destino' })" },
    { nombre: 'el breadcrumb pierde el esc() de la categoría',
      de: "labelHtml: `${iconoCategoriaHtml(cat.nombre)} ${esc(cat.nombre)}`",
      a: "labelHtml: `${iconoCategoriaHtml(cat.nombre)} ${cat.nombre}`" },
    { nombre: 'la categoría de la tarjeta pierde el esc()',
      de: '${iconoCategoriaHtml(categoria)} ${esc(categoria)}</span>', a: '${iconoCategoriaHtml(categoria)} ${categoria}</span>' },
    { nombre: 'la categoría del detalle del gasto pierde el esc()',
      de: '${iconoCategoriaHtml(g.categorias.nombre)} ${esc(g.categorias.nombre)}', a: '${iconoCategoriaHtml(g.categorias.nombre)} ${g.categorias.nombre}' },
    { nombre: 'la categoría del detalle de la factura pierde el esc()',
      de: '${iconoCategoriaHtml(f.categorias.nombre)} ${esc(f.categorias.nombre)}', a: '${iconoCategoriaHtml(f.categorias.nombre)} ${f.categorias.nombre}' },
    { nombre: 'la categoría del resumen del wizard pierde el esc()',
      de: "${filaHtml('Categoría', catObj ? `${iconoCategoriaHtml(catObj.nombre)} ${esc(catObj.nombre)}` : null)}\n        </div>\n\n        <div class=\"resumen-seccion\">\n          <div class=\"resumen-seccion__titulo\">Detalles</div>\n          ${fila('Empleado',     empObj?.nombre)}\n          ${fila('Proyecto',     proyObj?.nombre)}\n          ${fila('Lugar',        g.lugar_servicio)}",
      a: "${filaHtml('Categoría', catObj ? `${iconoCategoriaHtml(catObj.nombre)} ${catObj.nombre}` : null)}\n        </div>\n\n        <div class=\"resumen-seccion\">\n          <div class=\"resumen-seccion__titulo\">Detalles</div>\n          ${fila('Empleado',     empObj?.nombre)}\n          ${fila('Proyecto',     proyObj?.nombre)}\n          ${fila('Lugar',        g.lugar_servicio)}" },
    { nombre: 'la categoría del resumen pendiente pierde el esc()',
      de: "${filaHtml('Categoría', catObj ? `${iconoCategoriaHtml(catObj.nombre)} ${esc(catObj.nombre)}` : null)}\n        </div>\n\n        <div class=\"resumen-seccion\">\n          <div class=\"resumen-seccion__titulo\">Detalles</div>\n          ${fila('Empleado',     empObj?.nombre)}\n          ${fila('Proyecto',     proyObj?.nombre)}\n          ${fila('Lugar',        g.lugar)}",
      a: "${filaHtml('Categoría', catObj ? `${iconoCategoriaHtml(catObj.nombre)} ${catObj.nombre}` : null)}\n        </div>\n\n        <div class=\"resumen-seccion\">\n          <div class=\"resumen-seccion__titulo\">Detalles</div>\n          ${fila('Empleado',     empObj?.nombre)}\n          ${fila('Proyecto',     proyObj?.nombre)}\n          ${fila('Lugar',        g.lugar)}" },
    { nombre: 'la etiqueta del proyecto de la edición pierde el esc()',
      de: '${esc(p.etiqueta)}</option>', a: '${p.etiqueta}</option>' },
    { nombre: 'las iniciales del avatar pierden el esc()',
      de: '${esc(inicialesEmpresa(razonSocial))}', a: '${inicialesEmpresa(razonSocial)}' },
    { nombre: 'el importe del resumen del wizard pierde el esc()', ...sinEscImporte("${fila('Medio de pago', MEDIOS_PAGO_LABEL[g.medio_pago])}") },
    { nombre: 'el importe del resumen pendiente pierde el esc()', ...sinEscImporte("${fila('Razón social', g.razon_social)}") },
    // Links.
    { nombre: 'el data-url de Gastos pierde el encodeURIComponent',
      de: 'destino: id => `gastos.html?gasto=${encodeURIComponent(id)}`', a: 'destino: id => `gastos.html?gasto=${id}`' },
    { nombre: 'el data-url de Cuentas Corrientes pierde el encodeURIComponent',
      de: 'destino: id => `gastos.html?factura=${encodeURIComponent(id)}`', a: 'destino: id => `gastos.html?factura=${id}`' },
    { nombre: 'el data-url de Ingreso pierde el encodeURIComponent',
      de: 'destino: id => `materia-prima.html?ingreso=${encodeURIComponent(id)}`', a: 'destino: id => `materia-prima.html?ingreso=${id}`' },
    { nombre: 'el href de "Ingresar la mercadería" pierde el encodeURIComponent',
      de: 'desde_gasto=${encodeURIComponent(p.gastoId)}', a: 'desde_gasto=${p.gastoId}' },
    // ?volver=: el control del destino.
    { nombre: '?volver= deja de controlar el origen',
      de: "if (!/^https?:$/.test(destino.protocol) || destino.origin !== location.origin) return false",
      a: "if (!/^https?:$/.test(destino.protocol)) return false" },
    { nombre: '?volver= deja de controlar el protocolo y el origen',
      de: "if (!/^https?:$/.test(destino.protocol) || destino.origin !== location.origin) return false",
      a: '' },
  ],
  // Sin equivalentes: los esc() de constantes (OPCIONES_ORDEN, MENSAJES_FOTO,
  // ORIGENES_DUPLICADO, LOGOS_EMPRESA, las etiquetas de fila()) los detecta el
  // chequeo ESTÁTICO —la hoja sin esc() no está en la lista de seguras—, y los
  // de MEDIOS_PAGO_LABEL, los renders: la suite le agrega a la constante una
  // entrada con marca, así un día que venga de la base ya está cubierto.
})
