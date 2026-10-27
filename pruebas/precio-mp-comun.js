// Las funciones y constantes del bloque "EL PRECIO DE COMPRA" de
// modulos/materia-prima.html (27/10/2026, rama ci-prueba/precios-compra), para
// las suites que arman su sandbox con filaItemParaBase, itemDesdeOcr,
// validarItems o cablearItems (todas llaman al precio). Una función nueva del
// precio se suma acá y la ven todas.
'use strict'

const FUNCIONES_PRECIO_MP = [
  'esUnidadEntera', 'formatearNumero',
  'ivaVaEnCero', 'contenidoParaPrecio', 'nombreBultoDe', 'laDelBulto', 'laUnidadDePrecio', 'precioPorUnidadItem',
  'ivaDelItem', 'conIva', 'plataPrecio', 'textoEquivalePrecio', 'textoFinalPrecio', 'faltaPrecioFacturaA',
  'errorPrecioItem', 'precioDesdeOcr', 'ivaDesdeOcr', 'precioParaBase', 'textoPorBulto', 'htmlPrecioItem',
  'refrescarPrecioEnVivo', 'cablearPrecioItem',
]
const CONSTANTES_PRECIO_MP = ['ALICUOTAS_IVA', 'DECIMALES_PRECIO']

// La lista de la suite más lo del precio que le falte (sin repetir).
function conPrecioMp(lista, extra = FUNCIONES_PRECIO_MP) {
  return [...lista, ...extra.filter(f => !lista.includes(f))]
}

module.exports = { FUNCIONES_PRECIO_MP, CONSTANTES_PRECIO_MP, conPrecioMp }
