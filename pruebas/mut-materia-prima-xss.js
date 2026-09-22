// Mutaciones de test-materia-prima-xss.js. Ver mutar.js.
//
//   node pruebas/mut-materia-prima-xss.js
//
// AUTOMÁTICAS: cada `${esc(...)}` de las funciones de render pierde su esc().
// Quedan AFUERA htmlCircuitoDetalle, htmlPagadoSinIngresar y
// renderizarPagadoSinIngresar: esas las muta y las detecta la suite del
// circuito (mut-materia-prima-circuito.js), que es la que las ejecuta.
//
// A MANO: los esc() que no están al principio de la interpolación (adentro de
// un ternario o de un arreglo) y que la mutación automática no toca, más los
// sinks cerrados en este barrido, uno por uno.

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-materia-prima-xss.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/materia-prima.html'),
  funciones: [
    'chipTipoDoc', 'renderizarChipsUnidadIngresos', 'renderizarListaIngresos',
    'abrirDetalleTransferenciaRecibida', 'abrirDetalleIngreso', 'htmlDiferenciaDetalle',
    'poblarSelectUnidades', 'renderizarSugerenciasProveedor', 'renderizarProveedorParecidos',
    'renderizarAvisoDuplicado', 'renderizarProveedorDetectado', 'renderizarRemitos',
    'htmlCategoriaNueva', 'htmlSugerenciasCatalogo', 'avisoTotalOcr', 'htmlItemCerrado',
    'htmlItemAbierto', 'actualizarSumaMixtaEnVivo', 'renderizarConfirmacion',
    'htmlResultadoCircuito', 'renderizarInternos', 'htmlFilaInterno',
    'renderizarResumenInterno', 'renderizarItemsInternos',
  ],
  manuales: [
    // Los sinks cerrados en este barrido.
    { nombre: 'la foto vuelve a un href con el valor crudo de la base',
      de: '<button type="button" data-ruta-foto="${esc(rutaFotoMp(c.foto_url))}" class="comprobante-mp__foto">Ver foto →</button>',
      a: '<a href="${c.foto_url}" class="comprobante-mp__foto">Ver foto →</a>' },
    { nombre: 'rutaFotoMp acepta cualquier esquema como ruta',
      de: '      if (/^[a-z][a-z0-9+.-]*:/i.test(v)) {', a: '      if (false) {' },
    { nombre: 'la ruta del botón de la foto pierde el esc()',
      de: 'data-ruta-foto="${esc(rutaFotoMp(c.foto_url))}"', a: 'data-ruta-foto="${rutaFotoMp(c.foto_url)}"' },
    { nombre: 'la cabecera de la transferencia pierde el esc() de "Recibido por"',
      de: '        esc(textoRecepcion(entrega.base)),', a: '        textoRecepcion(entrega.base),' },
    { nombre: 'la cabecera de la transferencia pierde el esc() de fecha y origen',
      de: '        esc(`${formatearFecha(entrega.base.fecha)} · desde ${origen}`),', a: '        `${formatearFecha(entrega.base.fecha)} · desde ${origen}`,' },
    { nombre: 'la cabecera de la transferencia pierde el esc() de las observaciones',
      de: "entrega.observaciones ? esc(`Observaciones: ${entrega.observaciones}`) : ''", a: "entrega.observaciones ? `Observaciones: ${entrega.observaciones}` : ''" },
    { nombre: 'la cabecera del ingreso pierde el esc() de la unidad',
      de: '        esc(`${formatearFecha(ingreso.fecha)} · ${nombreUnidad(ingreso.unidad_negocio_id)}`),', a: '        `${formatearFecha(ingreso.fecha)} · ${nombreUnidad(ingreso.unidad_negocio_id)}`,' },
    { nombre: 'la cabecera del ingreso pierde el esc() de la fantasía',
      de: "ingreso.nombre_fantasia ? esc(`Fantasía: ${ingreso.nombre_fantasia}`) : ''", a: "ingreso.nombre_fantasia ? `Fantasía: ${ingreso.nombre_fantasia}` : ''" },
    // esc() adentro de un ternario, de un arreglo o de una constante: la
    // automática no los toca.
    { nombre: 'los datos del duplicado dejan de pasar por .map(esc)',
      de: "          .filter(Boolean).map(esc).join(' · ')", a: "          .filter(Boolean).join(' · ')" },
    { nombre: 'el nombre de la ficha técnica pierde el esc()',
      de: "${item.fichaTecnicaUrl ? esc(item.nombreFicha || 'Cargada') : 'Ficha técnica'}", a: "${item.fichaTecnicaUrl ? (item.nombreFicha || 'Cargada') : 'Ficha técnica'}" },
    { nombre: 'la unidad en la etiqueta del número pierde el esc()',
      de: ": item.interpretacion === 'granel' ? esc(item.unidadMedida)", a: ": item.interpretacion === 'granel' ? item.unidadMedida" },
    { nombre: 'la unidad del rótulo de la suma mixta pierde el esc()',
      de: "const rotuloSuma = item.interpretacion === 'bultos' ? 'bultos' : esc(item.unidadMedida)", a: "const rotuloSuma = item.interpretacion === 'bultos' ? 'bultos' : item.unidadMedida" },
    { nombre: 'la unidad de lo recibido pierde el esc()',
      de: "        : esc(item.unidadMedida)\n\n      // En modo 'bultos' se elige", a: "        : item.unidadMedida\n\n      // En modo 'bultos' se elige" },
    { nombre: 'la unidad de la tarjeta abierta pierde el esc() de arriba',
      de: 'const unidadHtml = esc(item.unidadMedida)', a: 'const unidadHtml = item.unidadMedida' },
    { nombre: 'la cantidad recibida de la transferencia pierde el esc()',
      de: "${recibida === null ? '—' : esc(formatearCantidad(recibida, u))}", a: "${recibida === null ? '—' : formatearCantidad(recibida, u)}" },
  ],
  equivalentes: [],
})
