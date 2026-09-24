// Parte 5 de Pedidos: "Imprimir el pedido". La hoja que baja al depósito:
// cliente, fecha, entrega y los renglones con un casillero para tildar, con
// window.print() y estilos de impresión.
//
//   node pruebas/test-pedidos-imprimir.js

const path = require('path')
const fs = require('fs')
const { construirPedidos } = require('./sandbox-pedidos')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/pedidos.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, fin } = arnes()
const nuevo = () => construirPedidos(ARCHIVO)

const CAT = {
  productos: [{ id: 'p-cuc', nombre: 'Cucurucho grande', tipo_masa: 'Común' }],
  presentaciones: [{ id: 'pr-1', producto_id: 'p-cuc', nombre: 'Caja x 100', con_cono: false }],
  marcas: [],
}
const D = {
  pedido: { id: 'a', numero: 42, fecha: '2026-09-22', fecha_entrega: '2026-09-25', estado: 'en_produccion', observaciones: 'tocar timbre',
    unidad_negocio_id: 'u-cn', clientes: { nombre: 'Anatolia', localidad: 'Córdoba', telefono: '351 555-1234' } },
  items: [
    { id: 'i1', presentacion_id: 'pr-1', marca_id: null, cajas: 30, cajas_cumplidas: 12, texto_libre: null, observacion: 'sin sellar' },
    { id: 'i2', presentacion_id: null, marca_id: null, cajas: 1, cajas_cumplidas: 0, texto_libre: 'las rosas', observacion: null },
  ],
}

{
  const S = nuevo()
  const h = S.htmlImpresion(D, CAT)
  chk('el número del pedido', h.includes('Pedido Nº 42'))
  chk('el cliente, con su localidad y teléfono', h.includes('Anatolia · Córdoba · 351 555-1234'))
  chk('la fecha y la entrega', h.includes('22/09/2026') && h.includes('25/09/2026'))
  chk('sin entrega lo dice', S.htmlImpresion({ ...D, pedido: { ...D.pedido, fecha_entrega: null } }, CAT).includes('sin fecha'))
  chk('las observaciones', h.includes('tocar timbre'))
  chk('un renglón por item, cada uno con su casillero', (h.match(/<span class="pe-casillero"><\/span>/g) || []).length === 2)
  chk('las cajas de cada renglón', /pe-impresion__cajas">30</.test(h) && /pe-impresion__cajas">1</.test(h))
  chk('la descripción del producto', h.includes('Cucurucho grande · Caja x 100 · sin cono'))
  chk('lo que ya está hecho', h.includes('(ya hay 12)'))
  chk('la nota del renglón', h.includes('Nota: sin sellar'))
  chk('el texto libre dice que falta identificar', h.includes('FALTA IDENTIFICAR: </span>las rosas'))
  chk('el total de cajas', /pe-impresion__cajas">31<\/td><td>Total de cajas/.test(h))
  chk('un anulado se imprime como ANULADO', S.htmlImpresion({ ...D, pedido: { ...D.pedido, estado: 'anulado' } }, CAT).includes('ANULADO'))
  chk('uno sin anular no dice ANULADO', !h.includes('ANULADO'))
}

{
  const S = nuevo()
  S.estado.catalogo = CAT
  S.estado.detalle = { ...D, errores: {}, accion: null }
  S.imprimirPedido()
  chk('imprimir llama a window.print()', S.__impresiones() === 1)
  chk('y antes arma la hoja', S.__els.get('pe-impresion').innerHTML.includes('Pedido Nº 42'))
  const S2 = nuevo()
  S2.estado.detalle = null
  S2.imprimirPedido()
  chk('sin pedido abierto no imprime', S2.__impresiones() === 0)
  S.pintarAccionesDetalle()
  chk('con un pedido abierto se ve el botón', S.__els.get('pe-btn-imprimir').hidden === false)
  S.estado.misTareas = new Map([['ver', { unidades: ['u-cn'] }]])
  S.pintarAccionesDetalle()
  chk('también con solo ver (la hoja es para el depósito)', S.__els.get('pe-btn-imprimir').hidden === false)
}

// Los estilos de impresión: en pantalla no se ve; al imprimir es lo único.
{
  const css = src.slice(src.indexOf('<style>'), src.indexOf('</style>'))
  chk('en pantalla la hoja no se ve', /\.pe-impresion \{ display: none; \}/.test(css))
  const print = css.slice(css.indexOf('@media print'))
  chk('hay estilos de impresión', css.includes('@media print'))
  chk('al imprimir se esconde todo lo demás', /body > \*:not\(#pe-impresion\) \{ display: none !important; \}/.test(print))
  chk('y se muestra la hoja', /\.pe-impresion \{ display: block !important;/.test(print))
  chk('el casillero es un cuadrado con borde', /\.pe-casillero \{[^}]*border: 2px solid #000/.test(print))
  chk('la hoja vive fuera de la app (si no, la escondería el :not)', /<\/div>\s*\n\s*<!-- La hoja para imprimir[^>]*-->\s*\n\s*<div class="pe-impresion" id="pe-impresion"><\/div>/.test(src))
}

// HTML malicioso
{
  const S = nuevo()
  const d = {
    pedido: { numero: marca('numero'), fecha: '2026-09-22', fecha_entrega: null, estado: 'pendiente', observaciones: marca('obs'),
      clientes: { nombre: marca('cliente'), localidad: marca('localidad'), telefono: marca('telefono') } },
    items: [
      { id: 'i', presentacion_id: null, cajas: 1, cajas_cumplidas: 0, texto_libre: marca('textolibre'), observacion: marca('nota') },
    ],
  }
  chequearMarcas(chk, 'hoja impresa', S.htmlImpresion(d, CAT), ['numero', 'obs', 'cliente', 'localidad', 'telefono', 'textolibre', 'nota'])
}

fin()
