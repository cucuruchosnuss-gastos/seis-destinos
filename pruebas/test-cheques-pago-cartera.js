// Cheques: EL PAGO CON CHEQUES DE LA CARTERA (05/10/2026) y SIN "EMITIDOS"
// (11/10/2026).
//
//  - En la cartera, un cheque usado en un pago desde Cuentas corrientes
//    (pagar_proveedor_con_cheques_cartera: estado 'endosado' y pago_gasto_id)
//    dice a qué proveedor fue, tiene "Ver el pago" y NO ofrece volver a
//    cartera (igual que un endoso a proveedor).
//  - La pestaña "Emitidos" (los cheques propios, cheques_emitidos) se SACÓ el
//    11/10/2026: la empresa no emite cheques propios. La cartera es la única
//    vista, sin el segmentado Cartera | Emitidos. Esta suite exige que no
//    vuelva (da rojo con el archivo de antes). Antes se llamaba
//    test-cheques-emitidos.js.
//
//   node pruebas/test-cheques-pago-cartera.js
'use strict'

const { construirCheques } = require('./sandbox-cheques')
const { ARCHIVO_CHEQUES, leerCheques } = require('./fuente-cheques')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || ARCHIVO_CHEQUES
const FUENTE = leerCheques(ARCHIVO)
const { chk, esperas, fin } = arnes()

function armar(tareas = ['cobranzas:ver_todo', 'cobranzas:procesar']) {
  const S = construirCheques(ARCHIVO)
  S.estado.misTareas = new Set(tareas)
  return S
}
const el = (S, id) => S.__els.get(id) ?? { innerHTML: '', hidden: undefined, textContent: '' }

async function main() {
  // ══ 1. El cheque que pagó a un proveedor desde Cuentas corrientes ══════════
  {
    const S = armar()
    const pagado = { id: 'c1', cobranza_id: 'cob', estado: 'endosado', banco_codigo: '072', numero: '00000111', salida_fecha: '2026-10-05', salida_destino: 'DIMAFLO S.A.', salida_proveedor_id: null, pago_gasto_id: 'g-77' }
    const cob = { id: 'cob', estado: 'procesada' }
    chk('pago con cheques de la cartera = pagó a un proveedor', S.pagoAProveedor(pagado) === true)
    chk('el endoso a proveedor de antes también', S.pagoAProveedor({ estado: 'endosado', salida_proveedor_id: 'p', salida_gasto_id: 'g' }) === true)
    chk('un endosado con texto (sin proveedor ni pago), no', S.pagoAProveedor({ estado: 'endosado' }) === false)
    chk('un depositado, no', S.pagoAProveedor({ estado: 'depositado', pago_gasto_id: 'g' }) === false)
    chk('el gasto del pago: pago_gasto_id, o salida_gasto_id', S.gastoDelPago(pagado) === 'g-77' && S.gastoDelPago({ salida_gasto_id: 'g-e' }) === 'g-e' && S.gastoDelPago({}) === null)
    chk('NO se ofrece volver a cartera: "pagado"', S.accionSalida(pagado, cob) === 'pagado')
    chk('sin procesar, nada', armar(['cobranzas:ver_todo']).accionSalida(pagado, cob) === null)
    const h = S.htmlAccionSalida(pagado, 'pagado')
    chk('"Pagó su cuenta corriente" con el link al pago en Cuentas corrientes',
      h.includes('Pagó su cuenta corriente') && h.includes('<a class="chq-link-pago" href="cuentas-corrientes.html?pago=g-77">Ver el pago</a>'), h)
    chk('sin volver a cartera ni vincular', !/data-volver-cartera|data-vincular-proveedor/.test(h))
    chk('la salida dice a qué proveedor fue', S.textoSalidaCorto(pagado) === '05/10/2026 · Cheque endosado 072-00000111 · DIMAFLO S.A.', S.textoSalidaCorto(pagado))
    const raro = S.htmlLinkPago({ pago_gasto_id: 'g"><b data-xss="x">' })
    chk('el id del pago va por encodeURIComponent (comillas dobles)', !raro.includes('"><b') && raro.includes('g%22%3E%3Cb'), raro)
    chk('sin pago, no hay link', S.htmlLinkPago({ estado: 'endosado' }) === '')
    S.estado.filas = [pagado]
    S.abrirVolverACartera('c1')
    chk('abrirVolverACartera no abre el motivo para un pago', S.__accionMotivo() === null)
  }
  chk('la lista de cheques trae las dos marcas del pago', /salida_proveedor_id, salida_gasto_id, pago_gasto_id'\)/.test(FUENTE))
  chk('"Ver el pago" no abre además la cobranza (stopPropagation)', /cont\.querySelectorAll\('\.chq-link-pago'\)\.forEach\(a => a\.addEventListener\('click', \(ev\) => ev\.stopPropagation\(\)\)\)/.test(FUENTE))

  // ══ 2. Sin "Emitidos" (11/10/2026): la empresa no emite cheques propios ══
  chk('no vuelve el segmentado Cartera | Emitidos', !/data-chq-vista=|id="chq-vistas"/.test(FUENTE))
  chk('no vuelve el panel de los emitidos', !/id="chq-panel-emitidos"|id="chq-emi-/.test(FUENTE))
  chk('la cartera no queda envuelta en un panel (se ve como antes del segmentado)', !/id="chq-panel-cartera"/.test(FUENTE))
  chk('no vuelve la lectura de cheques_emitidos', !/from\(\s*['"]cheques_emitidos['"]/.test(FUENTE))
  chk('no vuelve su lógica', !/function (puedeVerEmitidos|cargarEmitidos|mostrarVistaCheques|pintarEmitidos|emitidosFiltrados|pendientePorCuenta)\b/.test(FUENTE))
  chk('la cartera sigue: su tabla, su lista y el link a Cobranzas', /<table class="chq-tabla" id="chq-tabla"><\/table>/.test(FUENTE) && /<div class="chq-lista" id="chq-lista" hidden><\/div>/.test(FUENTE) && /id="chq-link-cobranzas"/.test(FUENTE))
}

esperas.push(main())
fin()
