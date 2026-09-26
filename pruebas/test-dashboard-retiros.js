// La tarjeta "Órdenes de retiro" (la CARGA en el depósito) en dashboard.html
// (26/09/2026). Se ve con el módulo 'retiros' habilitado Y la tarea
// retiros:cargar: el módulo lo tiene también quien solo administra, y a esa
// persona la carga no le sirve.
//
//   node pruebas/test-dashboard-retiros.js

const fs = require('fs')
const path = require('path')
const { extraerConst, extraerFn } = require('./extraer')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'dashboard.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, fin } = arnes()

const S = new Function(extraerConst(src, 'MODULOS') + '\n' + extraerConst(src, 'COLORES_MODULO') + '\n' +
  extraerFn(src, 'moduloVisible') + '\nreturn { MODULOS, COLORES_MODULO, moduloVisible }')()
const r = S.MODULOS.find(m => m.clave === 'retiros')
chk('hay tarjeta con clave retiros (la de la tabla modulos)', !!r)
chk('se llama "Órdenes de retiro"', r?.nombre === 'Órdenes de retiro')
chk('abre la carga, modulos/retiros.html', r?.url === 'modulos/retiros.html')
chk('no está marcada "próximamente"', r?.proximamente === false)
chk('tiene ícono', typeof r?.icono === 'string' && r.icono.length > 2)
chk('es naranja, la cara comercial', r?.color === 'naranja' && !!S.COLORES_MODULO[r?.color])
chk('va después de Pedidos', S.MODULOS.indexOf(r) > S.MODULOS.findIndex(m => m.clave === 'pedidos'))
const ver = (ctx) => S.moduloVisible(r, { esAdmin: false, esSuperAdmin: false, misModulos: [], misTareas: new Set(), ...ctx })
chk('se ve con el módulo retiros y la tarea retiros:cargar', ver({ misModulos: ['retiros'], misTareas: new Set(['retiros:cargar']) }))
chk('NO se ve con el módulo pero solo ver/precios (eso es Administración)', !ver({ misModulos: ['retiros'], misTareas: new Set(['retiros:ver', 'retiros:precios']) }))
chk('no se ve sin el módulo', !ver({ misModulos: ['pedidos'], misTareas: new Set(['retiros:cargar']) }))
chk('super_admin la ve', ver({ esAdmin: true, esSuperAdmin: true }))

fin()
