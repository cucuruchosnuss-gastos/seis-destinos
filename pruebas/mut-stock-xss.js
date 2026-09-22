// Mutaciones de test-stock-xss.js. Ver mutar.js.
//
//   node pruebas/mut-stock-xss.js
//
// AUTOMÁTICAS: cada `${esc(...)}` de las funciones de render pierde su esc()
// (también las anidadas, que son interpolaciones propias).
//
// A MANO: los esc() que no están al principio de la interpolación (adentro de
// un ternario, de una concatenación o de un .map(esc)) y que la automática no
// toca, más los cuatro cambios de este barrido (un sink real y tres
// endurecimientos), uno por uno.

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-stock-xss.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/stock.html'),
  funciones: [
    'htmlMarca', 'htmlAgrupado', 'htmlAclaracion',
    'renderizarUnidadesSugeridas', 'renderizarLista', 'abrirDetalleInsumo', 'confirmarImportacion',
    'renderizarChipsUnidadStock', 'renderizarStock', 'abrirLotes',
    'renderizarChipsUnidadRecuento', 'renderizarMetaRecuento', 'renderizarItemsRecuento',
    'renderizarSugerenciasCatalogo', 'renderizarPresentacionesAgregar', 'abrirModalCerrar',
    'renderizarChipsUnidadHistorial', 'renderizarHistorial', 'renderizarCabeceraRecuento',
    'renderizarDetalleRecuento', 'renderizarAjustesRecuento',
    'renderizarAlias', 'htmlFilaAlias', 'abrirModalAlias', 'abrirBorradoAlias', 'renderizarSugerenciasAlias',
    'abrirModalMovimiento', 'renderizarUnidadMov', 'renderizarSugerenciasMov', 'elegirInsumoMov',
    'cargarLotesMov', 'renderizarPresentacionesMov', 'actualizarSaldoMov',
    'renderizarChipsUnidadMerma', 'renderizarMermas',
    'renderizarOrigenTransf', 'renderizarDestinoTransf', 'renderizarItemsTransf', 'renderizarSugerenciasTi',
    'elegirInsumoTi', 'renderizarLotesTi', 'renderizarPresentacionesTi', 'actualizarSaldoTi',
    'renderizarTransito', 'renderizarTransfHistorial', 'renderizarCabeceraTransf', 'renderizarItemsTransfDetalle',
    'poblarSelectorMotivoTipo', 'renderizarChipsOrigenMerma',
  ],
  manuales: [
    // Los cuatro cambios de este barrido: el sink real y los tres endurecimientos.
    { nombre: 'el selector de vista preferida pierde el esc() de la unidad',
      de: '`<option value="base">En su unidad${nom ? ` (${esc(nom)})` : \'\'}</option>`',
      a: '`<option value="base">En su unidad${nom ? ` (${nom})` : \'\'}</option>`' },
    { nombre: 'data-insumo del catálogo pierde el esc()',
      de: '` data-insumo="${esc(i.id)}"`', a: '` data-insumo="${i.id}"`' },
    { nombre: 'la clase chip-tipo del catálogo pierde el esc()',
      de: '<span class="chip-tipo chip-tipo--${esc(i.tipo)}">', a: '<span class="chip-tipo chip-tipo--${i.tipo}">' },
    { nombre: 'la clase chip-tipo del stock pierde el esc()',
      de: '<span class="chip-tipo chip-tipo--${esc(f.tipo)}">', a: '<span class="chip-tipo chip-tipo--${f.tipo}">' },
    // esc() adentro de un ternario, de una concatenación o de un .map(esc).
    { nombre: 'el título del detalle por lote pierde el esc() del nombre',
      de: '        esc(fila.insumo_nombre) + htmlAclaracion(fila.aclaracion)', a: '        fila.insumo_nombre + htmlAclaracion(fila.aclaracion)' },
    { nombre: 'la presentación del renglón del recuento pierde el esc()',
      de: "${i.contenido_por_bulto ? esc(textoPresentacion(i.contenido_por_bulto, i.unidad_medida)) : 'sin presentación'}",
      a: "${i.contenido_por_bulto ? textoPresentacion(i.contenido_por_bulto, i.unidad_medida) : 'sin presentación'}" },
    { nombre: 'la diferencia del renglón del recuento pierde el esc()',
      de: "${delta ? esc(delta.texto) : ''}", a: "${delta ? delta.texto : ''}" },
    { nombre: 'lo contado del detalle del recuento pierde el esc()',
      de: "${i.cantidad_contada === null ? '—' : esc(formatearCantidadStock(i.cantidad_contada, u))}",
      a: "${i.cantidad_contada === null ? '—' : formatearCantidadStock(i.cantidad_contada, u)}" },
    { nombre: 'lo del sistema del detalle del recuento pierde el esc()',
      de: "${i.cantidad_sistema === null ? '—' : esc(formatearCantidadStock(i.cantidad_sistema, u))}",
      a: "${i.cantidad_sistema === null ? '—' : formatearCantidadStock(i.cantidad_sistema, u)}" },
    { nombre: 'el lote de la merma pierde el esc()',
      de: "${f.lote ? ' · lote ' + esc(f.lote) : ''}", a: "${f.lote ? ' · lote ' + f.lote : ''}" },
    { nombre: 'la meta de la merma deja de pasar por .map(esc)',
      de: "            .filter(Boolean).map(esc).join(' · ')", a: "            .filter(Boolean).join(' · ')" },
  ],
  // Escapan CONSTANTES del código (MOTIVOS_BAJA / MOTIVOS_AJUSTE y
  // CHIPS_ORIGEN_MERMA): ningún carácter escapable, así que sin el esc() la
  // página sale idéntica. Se cuentan aparte, no como cobertura.
  equivalentes: [
    { expr: 'esc(m.id)', motivo: 'constante MOTIVOS_BAJA / MOTIVOS_AJUSTE' },
    { expr: 'esc(m.label)', motivo: 'constante MOTIVOS_BAJA / MOTIVOS_AJUSTE' },
    { expr: 'esc(o.id)', motivo: 'constante CHIPS_ORIGEN_MERMA' },
    { expr: 'esc(o.nombre)', motivo: 'constante CHIPS_ORIGEN_MERMA' },
  ],
})
