// Las funciones y constantes de js/faltante-retiro.js (el cartel "¿de dónde
// salen?" de un faltante de retiro, 13/10/2026), para los sandboxes de las dos
// pantallas que lo usan: la Carga (sandbox-retiros.js) y Administración
// (sandbox-administracion.js). Las suites las encuentran solas en los imports
// (pruebas/imports.js); esta lista dice cuáles hay que exponer.

const FUNCIONES_FR = [
  'escFr', 'limpioFr', 'enteroFr', 'textoCajasFr', 'fechaCortaFr', 'textoPlanilla', 'laMaquinaFr', 'textoEsperando', 'mensajeProduccion',
  'lotesParaFaltante', 'nuevoFaltante', 'puedeResolverFaltante', 'validarMotivoFaltante', 'htmlErrorFr', 'htmlVolverFr', 'htmlPreguntaFr',
  'htmlProduccionFr', 'htmlOtroFr', 'htmlLoteFr', 'htmlAjusteFr', 'htmlListoFr', 'htmlFaltante', 'cargarPlanillas', 'cargarLotesFaltante',
  'elegirPlanillaFr', 'confirmarLoteFr', 'confirmarAjusteFr', 'irAFr', 'accionFaltante', 'escribirMotivoFaltante', 'asegurarEstilosFaltante',
  // "¿De dónde salen?" ANTES de confirmar (20/10/2026)
  'mayusculasFr', 'origenHabitual', 'textoVienenDe', 'prefijoOrigen', 'loteDeOrigen', 'textoPlanillaBoton', 'origenCompleto',
  'textoOrigenElegido', 'notaObservacionOrigen', 'notaFaltaIngreso', 'parametrosIngresoOrigen', 'resolverOrigen', 'resolverOrigenes',
]

const CONSTANTES_FR = ['LARGO_MINIMO_MOTIVO_FALTANTE', 'PASOS_FALTANTE', 'ESTILOS_FALTANTE', 'TEXTO_PRODUJO_ANTES']

module.exports = { FUNCIONES_FR, CONSTANTES_FR }
