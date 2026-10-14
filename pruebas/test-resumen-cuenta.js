// EL RESUMEN DE CUENTA (11/10/2026, js/resumen-cuenta.js). Se EJECUTA el
// archivo real (sin los import/export), con formatearNumeroAr de js/utils.js y
// logoSeguro de js/retiros-comun.js de verdad:
//  - el Debe y el Haber con el signo de los libros de la empresa (proveedor:
//    factura al haber, pago al debe; cliente: retiro al debe, cobranza al haber);
//  - el saldo final del resumen es el mismo que muestra la ficha a esa fecha
//    (el saldo_acumulado de la vista / el saldo de cuenta_cliente);
//  - el período filtra bien (los dos bordes adentro) y el saldo anterior es el
//    último antes de "desde";
//  - la empresa filtra bien y "Todas, separadas" arma una sección por empresa,
//    cada una con sus datos y su saldo;
//  - un dato ausente es "—", nunca "$ 0,00";
//  - los cortes de página del PDF no cortan un renglón;
//  - todo texto de la base va escapado;
//  - las dos pantallas lo usan (el botón, el import y cómo nombran cada
//    movimiento).
//
//   ARCHIVO_TEST=<copia de js/resumen-cuenta.js>
//   ARCHIVO_CC=<copia de modulos/cuentas-corrientes.html>
//   ARCHIVO_ADM=<copia de modulos/administracion.html>
'use strict'

const fs = require('fs')
const path = require('path')
const { arnes } = require('./circuito-comun')
const { cargarNumeros } = require('./numeros-comun')
const { extraerFn, extraerConst } = require('./extraer')

const RAIZ = path.join(__dirname, '..')
const RUTA = process.env.ARCHIVO_TEST || path.join(RAIZ, 'js', 'resumen-cuenta.js')
const RUTA_CC = process.env.ARCHIVO_CC || path.join(RAIZ, 'modulos', 'cuentas-corrientes.html')
const RUTA_ADM = process.env.ARCHIVO_ADM || path.join(RAIZ, 'modulos', 'administracion.html')
const src = fs.readFileSync(RUTA, 'utf8')
const cc = fs.readFileSync(RUTA_CC, 'utf8')
const adm = fs.readFileSync(RUTA_ADM, 'utf8')
console.log(`ARCHIVO ${RUTA} (${src.length} bytes)`)
console.log(`ARCHIVO ${RUTA_CC} (${cc.length} bytes)`)
console.log(`ARCHIVO ${RUTA_ADM} (${adm.length} bytes)`)
const { chk, fin } = arnes()

// ── Cargar el módulo ─────────────────────────────────────────────────────

const { formatearNumeroAr } = cargarNumeros()
const retirosComun = fs.readFileSync(path.join(RAIZ, 'js', 'retiros-comun.js'), 'utf8')
const logoSeguro = new Function(extraerFn(retirosComun, 'logoSeguro').replace(/^export /, '') + '\nreturn logoSeguro')()

function cargar() {
  const codigo = src.replace(/^import .*$/gm, '').replace(/^export /gm, '')
  const nombres = [...codigo.matchAll(/^(?:async )?(?:function|const|let) ([A-Za-z_$][\w$]*)/gm)].map(m => m[1])
  return new Function('formatearNumeroAr', 'logoSeguro', 'crearPeriodo', 'rangoDePeriodo', 'hoyIsoAr', 'LIBRERIAS_PDF', 'cargarScript',
    codigo + `\nreturn { ${nombres.join(', ')} }`)(formatearNumeroAr, logoSeguro, () => null, () => null, () => '2026-10-11', [], async () => {})
}
const R = cargar()

// ── Las reglas del Debe y el Haber ────────────────────────────────────────

const desc = () => ({ comprobante: 'X', detalle: 'Y' })
let f = R.filaProveedor({ fecha: '2026-09-10', monto: '500000.5', saldo_acumulado: '500000.5' }, desc)
chk('proveedor: una factura va al HABER', f.haber === 500000.5 && f.debe === null, JSON.stringify(f))
f = R.filaProveedor({ fecha: '2026-09-05', monto: -300000, saldo_acumulado: 0 }, desc)
chk('proveedor: un pago va al DEBE (en positivo)', f.debe === 300000 && f.haber === null, JSON.stringify(f))
chk('proveedor: el saldo es el de la vista', f.saldo === 0)
f = R.filaProveedor({ fecha: '2026-10-05', monto: null, saldo_acumulado: 1752501 }, desc)
chk('proveedor: una factura sin importe no va a ninguna columna y se marca', f.debe === null && f.haber === null && f.sinImporte === true)
chk('proveedor: el comprobante y el detalle los dice la pantalla', f.comprobante === 'X' && f.detalle === 'Y')
f = R.filaCliente({ fecha: '2026-09-20', importe: 46000, saldo: 126000 }, desc)
chk('cliente: un retiro va al DEBE', f.debe === 46000 && f.haber === null, JSON.stringify(f))
f = R.filaCliente({ fecha: '2026-09-22', importe: '-30000', saldo: '96000' }, desc)
chk('cliente: una cobranza va al HABER (en positivo)', f.haber === 30000 && f.debe === null && f.saldo === 96000, JSON.stringify(f))

// ── Las cuentas de un proveedor, con los datos de la maqueta ─────────────

const datosProv = require('./datos-maqueta/resumen-proveedor')
const movsP1 = datosProv.tablas.v_cuenta_corriente_movimientos.filter(m => m.proveedor_id === 'p1')
// Desordenadas a propósito: el orden lo pone el módulo (fecha y orden_desempate).
const desordenadas = [...movsP1].reverse()
const describirP = (m) => ({ comprobante: m.tipo, detalle: m.referencia || '' })
const cuentas = R.cuentasProveedor(desordenadas, describirP)
chk('una cuenta por empresa y moneda', cuentas.length === 2, cuentas.length)
const cN = cuentas.find(c => c.unidadId === 'u-n'), cD = cuentas.find(c => c.unidadId === 'u-d')
chk('ordenadas por fecha', cN.filas.map(x => x.fecha).join(',') === [...cN.filas].map(x => x.fecha).sort().join(','))
const mismoDia = R.cuentasProveedor([
  { unidad_negocio_id: 'u', moneda: 'ARS', fecha: '2026-09-01', orden_desempate: '2026-09-01T12:00:00Z', monto: -10, saldo_acumulado: 90, tipo: 'pago' },
  { unidad_negocio_id: 'u', moneda: 'ARS', fecha: '2026-09-01', orden_desempate: '2026-09-01T09:00:00Z', monto: 100, saldo_acumulado: 100, tipo: 'factura' },
], describirP)[0].filas
chk('el mismo día, por orden_desempate', mismoDia[0].haber === 100 && mismoDia[1].debe === 10)
chk('la fábrica que no se ve, afuera', R.cuentasProveedor(movsP1, describirP, { unidadVisible: id => id !== 'u-d' }).every(c => c.unidadId !== 'u-d'))
const conDolares = R.cuentasProveedor([
  { unidad_negocio_id: 'u', moneda: 'USD', fecha: '2026-09-01', monto: 10, saldo_acumulado: 10 },
  { unidad_negocio_id: 'u', moneda: 'ARS', fecha: '2026-09-01', monto: 10, saldo_acumulado: 10 },
], describirP)
chk('cada moneda es su cuenta, pesos primero', conDolares.length === 2 && conDolares[0].moneda === 'ARS')

// ── El período ───────────────────────────────────────────────────────────

let r = R.resumirCuenta(cN, '2026-09-01', '2026-09-30')
chk('saldo anterior: el último antes de "desde"', r.saldoAnterior === 300000, r.saldoAnterior)
chk('los movimientos del período', r.movimientos.length === 3, r.movimientos.length)
chk('saldo final de septiembre', r.saldoFinal === 502500.5, r.saldoFinal)
r = R.resumirCuenta(cN, '2026-09-10', '2026-09-10')
chk('los dos bordes del período entran', r.movimientos.length === 1 && r.movimientos[0].fecha === '2026-09-10')
chk('con desde = hasta, el anterior es el del día antes', r.saldoAnterior === 0 && r.saldoFinal === 500000.5)
r = R.resumirCuenta(cN, '2026-09-30', '2026-10-31')
chk('el período que toca el borde de arriba y abajo', r.movimientos.length === 3 && r.saldoAnterior === 500000.5)
chk('un movimiento sin importe se cuenta', r.sinImporte === 1)
r = R.resumirCuenta(cD, '2026-09-01', '2026-09-30')
chk('sin movimientos antes, el anterior es cero de verdad', r.saldoAnterior === 0 && r.saldoFinal === 0)
r = R.resumirCuenta(cN, '', '2026-09-30')
chk('sin "desde" no hay saldo anterior', r.saldoAnterior === null && r.movimientos.length === 4)
r = R.resumirCuenta(cN, '2026-11-01', '2026-11-30')
chk('un período sin movimientos: el saldo sigue', r.movimientos.length === 0 && r.saldoAnterior === 1752501 && r.saldoFinal === 1752501)
const conNull = { filas: [
  { fecha: '2026-09-01', saldo: null, sinImporte: true, debe: null, haber: null },
  { fecha: '2026-09-02', saldo: 100, debe: null, haber: 100 },
  { fecha: '2026-09-03', saldo: null, sinImporte: true, debe: null, haber: null },
] }
r = R.resumirCuenta(conNull, '2026-09-01', '2026-09-30')
chk('un saldo null conserva el de antes (como la ficha)', r.movimientos.map(m => m.saldo).join(',') === '0,100,100')

// El saldo final es el que muestra la ficha a esa fecha: el saldo_acumulado
// del último movimiento hasta "hasta", por empresa y moneda (la ficha lo
// muestra en cada renglón, renderizarFichaMovimientos).
for (const hasta of ['2026-08-31', '2026-09-05', '2026-09-29', '2026-09-30', '2026-10-02', '2026-10-31']) {
  for (const c of cuentas) {
    const ultimas = movsP1.filter(m => m.unidad_negocio_id === c.unidadId && m.fecha <= hasta)
      .sort((a, b) => a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : String(a.orden_desempate) < String(b.orden_desempate) ? -1 : 1)
    const ficha = ultimas.length ? Number(ultimas[ultimas.length - 1].saldo_acumulado) : 0
    const res = R.resumirCuenta(c, '2026-09-01', hasta)
    chk(`proveedor ${c.unidadId} al ${hasta}: el saldo es el de la ficha`, res.saldoFinal === ficha, `${res.saldoFinal} vs ${ficha}`)
    // Y cierra: anterior + haber − debe = final (lo que le debemos).
    if (hasta >= '2026-09-01') {
      const cierra = (res.saldoAnterior ?? 0) + res.movimientos.reduce((s, m) => s + (m.haber ?? 0) - (m.debe ?? 0), 0)
      chk(`proveedor ${c.unidadId} al ${hasta}: anterior + haber − debe = final`, Math.abs(cierra - res.saldoFinal) < 0.005, `${cierra} vs ${res.saldoFinal}`)
    }
  }
}

// El cliente: el saldo de la cuenta (htmlCuenta de Administración) es el del
// último renglón de cuenta_cliente.
const datosCli = require('./datos-maqueta/resumen-cliente')
const filasC1 = datosCli.rpc.cuenta_cliente.__defecto
const filasC1d = datosCli.rpc.cuenta_cliente.__segun.find(s => s.si.p_cliente_id === 'c1-d').r
const cuentaC1 = R.cuentaCliente(filasC1, { unidadId: 'u-n', titular: { nombre: 'Distribuidora Anatolia' }, describir: desc })
const cuentaC1d = R.cuentaCliente(filasC1d, { unidadId: 'u-d', titular: { nombre: 'DIST. ANAT. SRL' }, describir: desc })
r = R.resumirCuenta(cuentaC1, '2026-09-01', '2030-12-31')
chk('cliente: el saldo final es el de la cuenta (el último renglón)', r.saldoFinal === filasC1[filasC1.length - 1].saldo, r.saldoFinal)
const cierraC = (r.saldoAnterior ?? 0) + r.movimientos.reduce((s, m) => s + (m.debe ?? 0) - (m.haber ?? 0), 0)
chk('cliente: anterior + debe − haber = final (lo que nos debe)', Math.abs(cierraC - r.saldoFinal) < 0.005, cierraC)
r = R.resumirCuenta(cuentaC1d, '2026-09-01', '2026-09-30')
chk('cliente: anterior y final de septiembre', r.saldoAnterior === 20000 && r.saldoFinal === 48000 && r.movimientos.length === 1)

// ── La empresa ───────────────────────────────────────────────────────────

const nombres = { 'u-n': 'Cucuruchos Nuss', 'u-d': 'Dolce Pasta' }
const ops = R.opcionesEmpresa(cuentas, id => nombres[id])
chk('las empresas donde tiene cuenta', ops.map(o => o.nombre).sort().join('|') === 'Cucuruchos Nuss|Dolce Pasta')
chk('por defecto, la de la barra', R.eleccionPorDefecto(ops, 'u-d') === 'u-d')
chk('con la barra en otra (o Todas), todas separadas', R.eleccionPorDefecto(ops, 'u-x') === R.TODAS_SEPARADAS && R.eleccionPorDefecto(ops, null) === R.TODAS_SEPARADAS)
chk('con una sola, esa', R.eleccionPorDefecto([{ id: 'u-n' }], null) === 'u-n')
chk('sin cuentas, nada', R.eleccionPorDefecto([], 'u-n') === '')
chk('elegir una empresa deja solo la suya', R.cuentasDeEleccion(cuentas, 'u-d').every(c => c.unidadId === 'u-d') && R.cuentasDeEleccion(cuentas, 'u-d').length === 1)
chk('todas separadas deja todas', R.cuentasDeEleccion(cuentas, R.TODAS_SEPARADAS).length === 2)
chk('una cuenta sin empresa es "Sin empresa"', R.opcionesEmpresa([{ unidadId: null }])[0].nombre === 'Sin empresa' && R.cuentasDeEleccion([{ unidadId: null }], '').length === 1)

// ── La hoja ──────────────────────────────────────────────────────────────

const empresas = new Map([
  ['u-n', { id: 'u-n', nombre: 'Cucuruchos Nuss', razon_social: 'SEIS DESTINOS SAS', cuit: '30719434777', domicilio: 'Unión 843, Córdoba', logo_url: 'logo-cucuruchos-nuss.png' }],
  ['u-d', { id: 'u-d', nombre: 'Dolce Pasta', razon_social: 'DOLCE PASTA SRL', cuit: '33709335419', domicilio: 'Rosario', logo_url: null }],
])
const base = { tipo: 'proveedor', titular: { nombre: 'Harinera Uno SA', cuit: '30111111118' }, empresas, nombreUnidad: id => nombres[id], generado: '11/10/2026 12:00' }
let html = R.htmlResumen({ ...base, cuentas: R.cuentasDeEleccion(cuentas, R.TODAS_SEPARADAS), desde: '2026-09-01', hasta: '2026-09-30' })
const secciones = html.split('<section class="rc-seccion">').slice(1)
chk('todas separadas: una sección por empresa', secciones.length === 2, secciones.length)
const sN = secciones.find(s => s.includes('SEIS DESTINOS SAS')), sD = secciones.find(s => s.includes('DOLCE PASTA SRL'))
chk('cada sección con sus datos', !!sN && !!sD && sN.includes('CUIT 30719434777') && sD.includes('CUIT 33709335419') && !sN.includes('DOLCE PASTA SRL'))
chk('cada sección con su saldo', sN.includes('$ 502.500,50') && sD.includes('rc-final__monto">$ 0,00'))
chk('el título, el titular y el período', html.includes('RESUMEN DE CUENTA') && html.includes('Harinera Uno SA') && html.includes('CUIT 30111111118') && html.includes('Del 01/09/2026 al 30/09/2026'))
chk('"Saldo anterior al" con la fecha de desde', sN.includes('Saldo anterior al 01/09/2026') && sN.includes('$ 300.000,00'))
chk('"Saldo al" con la fecha de hasta', sN.includes('Saldo al 30/09/2026'))
chk('la fecha y hora en que se generó', sN.includes('Generado el 11/10/2026 12:00'))
chk('las seis columnas', ['Fecha', 'Comprobante', 'Detalle', 'Debe', 'Haber', 'Saldo'].every(c => html.includes(`>${c}</th>`)))
chk('punto de miles y 2 decimales en las celdas', sN.includes('>300.000,00<') && sN.includes('>500.000,50<') && sN.includes('>2.500,00<'))
chk('el logo de la empresa (de la raíz del repo)', sN.includes('src="../logo-cucuruchos-nuss.png"') && !sD.includes('<img'))
chk('el saldo dicho en palabras', sN.includes('Cucuruchos Nuss le debe a Harinera Uno SA.') && sD.includes('Cuenta en cero.'))
html = R.htmlResumen({ ...base, cuentas: R.cuentasDeEleccion(cuentas, 'u-n'), desde: '2026-09-01', hasta: '2026-09-30' })
chk('una empresa elegida: una sola sección', html.split('<section class="rc-seccion">').length === 2 && !html.includes('DOLCE PASTA SRL'))

// Nada de "$ 0,00" para un dato ausente.
html = R.htmlResumen({ ...base, cuentas: [cN], desde: '2026-10-05', hasta: '2026-10-05' })
const filaSin = (html.match(/<tbody>([\s\S]*?)<\/tbody>/) || [])[1] || ''
chk('la descarga sin importe dice "—" en Debe y Haber', /<td class="rc-num">—<\/td><td class="rc-num">—<\/td>/.test(filaSin), filaSin)
chk('y dice que no tiene importe', filaSin.includes('sin importe todavía') && html.includes('Hay 1 movimiento sin importe todavía'))
chk('ningún "0,00" en esa fila', !/>0,00</.test(filaSin))
chk('plataRc de un ausente es "—"', R.plataRc(null) === '—' && R.plataRc(undefined, 'USD') === '—' && R.plataRc('', 'ARS') === '—')
chk('plataRc de un cero de verdad es "$ 0,00"', R.plataRc(0) === '$ 0,00')
chk('una celda que no va en esa columna queda vacía', R.celdaRc(null) === '' && R.celdaRc(undefined) === '')
chk('dólares con US$', R.plataRc(1234.5, 'USD') === 'US$ 1.234,50')
chk('sin movimientos en el período, se dice', R.htmlResumen({ ...base, cuentas: [cD], desde: '2026-11-01', hasta: '2026-11-30' }).includes('Sin movimientos en el período.'))

// El cliente.
html = R.htmlResumen({ tipo: 'cliente', titular: { nombre: 'Distribuidora Anatolia', cuit: '30-71234567-8' }, empresas, nombreUnidad: id => nombres[id],
  cuentas: [cuentaC1, cuentaC1d], desde: '2026-09-01', hasta: '2026-09-30', generado: 'x' })
chk('cliente: "Cliente" y el saldo en palabras', html.includes('>Cliente<') && html.includes('Distribuidora Anatolia le debe a Cucuruchos Nuss.'))
chk('cliente: cada cuenta con su titular', html.includes('DIST. ANAT. SRL'))

// ── Textos ───────────────────────────────────────────────────────────────

chk('la hora de Argentina', R.fechaHoraAr(new Date('2026-10-11T02:30:00Z')) === '10/10/2026 23:30', R.fechaHoraAr(new Date('2026-10-11T02:30:00Z')))
chk('el nombre del archivo', R.nombreArchivoResumen('Harinera Ünó S.A.', '2026-09-01', '2026-09-30') === 'resumen-de-cuenta-harinera-uno-s-a-2026-09-01-al-2026-09-30.pdf', R.nombreArchivoResumen('Harinera Ünó S.A.', '2026-09-01', '2026-09-30'))
chk('el texto para compartir', R.textoCompartir('Harinera', '2026-09-01', '2026-09-30') === 'Resumen de cuenta · Harinera · del 01/09/2026 al 30/09/2026')
chk('proveedor con saldo a favor', R.textoSaldo('proveedor', -10, 'Harinera', 'Nuss') === 'Harinera tiene saldo a favor de Nuss.')
chk('cliente con saldo a favor', R.textoSaldo('cliente', -10, 'Kiosco', 'Nuss') === 'Kiosco tiene saldo a su favor.')
chk('un saldo ausente no dice nada', R.textoSaldo('cliente', null, 'Kiosco', 'Nuss') === '')

// ── Los cortes del PDF ───────────────────────────────────────────────────

let cortes = R.cortesDePagina([100, 250, 400, 560, 700, 900], 1000, 500)
chk('cada página lo más llena sin cortar un renglón', JSON.stringify(cortes) === JSON.stringify([[0, 400], [400, 900], [900, 1000]]), JSON.stringify(cortes))
chk('las páginas cubren todo, sin huecos', cortes.every((c, i) => i === 0 ? c[0] === 0 : c[0] === cortes[i - 1][1]) && cortes[cortes.length - 1][1] === 1000)
chk('ninguna página más alta que una hoja', cortes.every(c => c[1] - c[0] <= 500))
cortes = R.cortesDePagina([50, 900], 1000, 300)
chk('un renglón más alto que la hoja igual va (corte a la medida)', JSON.stringify(cortes) === JSON.stringify([[0, 50], [50, 350], [350, 650], [650, 900], [900, 1000]]), JSON.stringify(cortes))
chk('todo entra en una página', JSON.stringify(R.cortesDePagina([10, 20], 200, 500)) === '[[0,200]]')

// ── XSS: todo texto de la base va escapado ───────────────────────────────

const MAL = '"><img src=x onerror=alert(1)>'
const empMal = new Map([['u-x', { id: 'u-x', nombre: 'Fábrica' + MAL, razon_social: 'RS' + MAL, cuit: '30' + MAL, domicilio: 'Calle' + MAL, logo_url: 'javascript:alert(1)' }]])
const cuentaMal = R.cuentaCliente([{ fecha: '2026-09-02', tipo: 'retiro', importe: 10, saldo: 10 }], {
  unidadId: 'u-x', titular: { nombre: 'Cliente' + MAL, cuit: '20' + MAL }, describir: () => ({ comprobante: 'Retiro' + MAL, detalle: 'Detalle' + MAL }),
})
html = R.htmlResumen({ tipo: 'cliente', titular: { nombre: 'T' + MAL }, empresas: empMal, nombreUnidad: () => 'N' + MAL, cuentas: [cuentaMal], desde: '2026-09-01', hasta: '2026-09-30', generado: 'G' + MAL })
chk('ningún <img onerror> crudo', !html.includes('<img src=x'), html.slice(0, 200))
chk('los textos escapados están', (html.match(/&lt;img src=x onerror=alert\(1\)&gt;/g) || []).length >= 8, (html.match(/&lt;img src=x/g) || []).length)
chk('un logo que no es un archivo de imagen no se dibuja', !html.includes('javascript') && !html.includes('class="rc-logo"'))
chk('escRc escapa comillas y &', R.escRc(`a&b"c'd<e>`) === 'a&amp;b&quot;c&#39;d&lt;e&gt;')

// ── Las dos pantallas ────────────────────────────────────────────────────

chk('Cuentas corrientes importa el resumen', /import \{[^}]*\babrirResumenCuenta\b[^}]*\bcuentasProveedor\b[^}]*\} from '\.\.\/js\/resumen-cuenta\.js'/.test(cc))
chk('Cuentas corrientes tiene el botón en la ficha', /<div id="vista-ficha"[\s\S]*id="btn-resumen-cuenta-ficha"[\s\S]*<\/div><!-- \/vista-ficha -->/.test(cc))
chk('el botón abre el resumen del proveedor', /getElementById\('btn-resumen-cuenta-ficha'\)\.addEventListener\('click', \(e\) => abrirResumenProveedor\(/.test(cc))
chk('Administración importa el resumen', /import \{[^}]*\babrirResumenCuenta\b[^}]*\bcuentaCliente\b[^}]*\} from '\.\.\/js\/resumen-cuenta\.js'/.test(adm))
chk('Administración tiene el botón en la cuenta del cliente', /id="ad-cliente-acciones"[\s\S]{0,900}id="ad-btn-resumen"/.test(adm))
chk('el botón abre el resumen del cliente', /getElementById\('ad-btn-resumen'\)\.addEventListener\('click', \(e\) => abrirResumenCliente\(/.test(adm))

// Cómo nombra cada movimiento Cuentas corrientes.
const fnCC = ['esSaldoInicial', 'nombreFactura', 'numeroParaMostrar', 'describirParaResumen'].map(n => extraerFn(cc, n)).join('\n')
const describirCC = new Function('NUMERO_SALDO_INICIAL', 'TIPO_MOVIMIENTO_LABEL', fnCC + '\nreturn describirParaResumen')(
  'SALDO-INICIAL', { factura: 'Factura', pago: 'Pago', credito_aplicado: 'Crédito aplicado', interes: 'Interés' })
const etiquetas = new Map([['g-10', 'Cheque endosado 072-43300023']])
const obs = new Map([['f-si', 'Deuda del sistema viejo']])
let d = describirCC({ tipo: 'factura', referencia: '0001-00011500' }, etiquetas, obs)
chk('CC: una factura es "Factura <número>"', d.comprobante === 'Factura 0001-00011500' && d.detalle === '', JSON.stringify(d))
d = describirCC({ tipo: 'factura', referencia: 'SALDO-INICIAL', factura_pendiente_id: 'f-si' }, etiquetas, obs)
chk('CC: el saldo inicial con su observación', d.comprobante === 'Saldo inicial' && d.detalle === 'Deuda del sistema viejo', JSON.stringify(d))
d = describirCC({ tipo: 'pago', gasto_id: 'g-10' }, etiquetas, obs)
chk('CC: un pago con su etiqueta (cheque endosado)', d.comprobante === 'Pago' && d.detalle === 'Cheque endosado 072-43300023', JSON.stringify(d))
d = describirCC({ tipo: 'credito_aplicado', referencia: '0001-1' }, etiquetas, obs)
chk('CC: un crédito aplicado dice a qué factura', d.comprobante === 'Crédito aplicado' && d.detalle === 'A 0001-1', JSON.stringify(d))
d = describirCC({ tipo: 'interes', referencia: '0001-1' }, etiquetas, obs)
chk('CC: un interés dice sobre qué factura', d.comprobante === 'Interés' && d.detalle === 'Sobre 0001-1', JSON.stringify(d))
chk('CC: lee TODOS los movimientos del proveedor (sin fechas) y de a 1000', /async function leerMovimientosResumen[\s\S]*?\.eq\('proveedor_id', proveedorId\)[\s\S]*?\.range\(p \* 1000, p \* 1000 \+ 999\)/.test(cc) && !/async function leerMovimientosResumen[\s\S]{0,700}\.(gte|lte)\('fecha'/.test(cc))
chk('CC: saca la fábrica de pruebas', /unidadVisible: id => !id \|\| visibles\.has\(id\)/.test(cc) && /const visibles = new Set\(unidadesParaElegir\(/.test(cc))

// Cómo nombra cada movimiento Administración.
// (13/10/2026) detalleMovimiento pasa la retención por detalleRetencion(): el
// tipo legible, igual en la cuenta y en el resumen.
const fnAdm = [extraerFn(adm, 'detalleMovimiento'), extraerFn(adm, 'describirClienteResumen'), extraerFn(adm, 'detalleRetencion'), extraerFn(adm, 'tipoRetencion'),
  extraerConst(adm, 'TIPOS_RETENCION').replace(/^\s*const /, 'var ')].join('\n')
const describirAdm = new Function('ETIQUETA_RESUMEN_CLIENTE', 'ETIQUETA_MOVIMIENTO', fnAdm + '\nreturn describirClienteResumen')(
  { retiro: 'Retiro', cobranza: 'Cobranza', compensacion: 'Compensación', retencion: 'Retención' }, { retiro: 'Retiro', cobranza: 'Cobranza', retencion: 'Retención' })
d = describirAdm({ tipo: 'retencion', detalle: 'Retención percepcion_iibb · cert. 0001-00012345' }, new Map())
chk('Adm: una retención dice su tipo legible y el certificado', d.comprobante === 'Retención' && d.detalle === 'Retención Percepción de IIBB · cert. 0001-00012345', JSON.stringify(d))
d = describirAdm({ tipo: 'retiro', orden_retiro_id: 'o1', detalle: 'Orden de retiro N° 12' }, new Map([['o1', 'N-0012']]))
chk('Adm: un retiro es "Retiro <código>"', d.comprobante === 'Retiro N-0012' && d.detalle === 'Orden de retiro N-0012', JSON.stringify(d))
d = describirAdm({ tipo: 'compensacion', detalle: 'Con su cuenta de proveedor' }, new Map())
chk('Adm: una compensación se nombra', d.comprobante === 'Compensación' && d.detalle === 'Con su cuenta de proveedor', JSON.stringify(d))
chk('Adm: suma las otras fábricas del mismo cliente', /const otras = \(c\.otras\?\.filas \?\? \[\]\)\.map/.test(adm) && /\[propia, \.\.\.leidas\.filter\(Boolean\)\]/.test(adm))
chk('Adm: el botón no se ofrece hasta tener la cuenta', /getElementById\('ad-btn-resumen'\)\.disabled = !c\.cuenta/.test(adm))

fin()
