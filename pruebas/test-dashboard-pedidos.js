// La tarjeta de Pedidos en dashboard.html (23/09/2026).
//
//   node pruebas/test-dashboard-pedidos.js

const fs = require('fs')
const path = require('path')
const { extraerConst, extraerFn } = require('./extraer')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'dashboard.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, fin } = arnes()

const S = new Function(extraerConst(src, 'MODULOS') + '\n' + extraerConst(src, 'COLORES_MODULO') + '\n' +
  extraerConst(src, 'TAREAS_PRODUCCION') + '\n' +
  extraerFn(src, 'moduloVisible') + '\n' + extraerFn(src, 'entraDerechoAProduccion') +
  '\nreturn { MODULOS, COLORES_MODULO, moduloVisible, entraDerechoAProduccion }')()
const p = S.MODULOS.find(m => m.clave === 'pedidos')
chk('hay tarjeta con clave pedidos (la de la tabla modulos)', !!p)
chk('se llama Pedidos', p?.nombre === 'Pedidos')
chk('abre modulos/pedidos.html', p?.url === 'modulos/pedidos.html')
chk('no está marcada "próximamente"', p?.proximamente === false)
chk('tiene ícono', typeof p?.icono === 'string' && p.icono.length > 2)
chk('es naranja, el acento del módulo', p?.color === 'naranja' && /var\(--naranja\)/.test(S.COLORES_MODULO[p?.color]?.fg || ''))
// Iba "última" hasta el 26/09/2026: después se sumaron las tarjetas de
// Órdenes de retiro y Administración. Lo que importa es el orden respecto de
// Producción, y eso se sigue exigiendo.
chk('va después de Producción', S.MODULOS.indexOf(p) > S.MODULOS.findIndex(m => m.clave === 'produccion'))
const ver = (ctx) => S.moduloVisible(p, { esAdmin: false, esSuperAdmin: false, misModulos: [], misTareas: new Set(), ...ctx })
chk('se ve con el módulo pedidos habilitado', ver({ misModulos: ['pedidos'] }))
chk('no se ve sin el módulo', !ver({ misModulos: ['produccion'] }))
chk('super_admin la ve', ver({ esAdmin: true, esSuperAdmin: true }))
chk('no pide tareas aparte (como Producción, cualquiera de las tres abre la pantalla)', !p?.requiereTareas && !p?.requiereModulo)

// Pedidos al lado de Producción NO dispara la entrada directa a la tablet.
const prod = S.MODULOS.find(m => m.clave === 'produccion')
chk('con Producción y Pedidos, la tablet no entra derecho', !S.entraDerechoAProduccion({
  esAdmin: false, esSuperAdmin: false, modulosVisibles: [prod, p], misTareas: new Set(['produccion:cargar']), yaFue: false }))

fin()
