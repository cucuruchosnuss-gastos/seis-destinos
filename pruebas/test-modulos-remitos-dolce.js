// LA TARJETA DE REMITOS DOLCE (28/10/2026, rama ci-prueba/modulo-remitos-dolce).
// En el menú principal (dashboard y barra lateral, js/modulos.js) se ve con
// retiros:cargar o retiros:ver EN Dolce Pasta (alcanceEn: la regla de
// tiene_tarea_alcance), y su color, su ícono y su lugar en la barra. Se
// EJECUTA moduloVisible real.
//
//   node pruebas/test-modulos-remitos-dolce.js
// Overrides: ARCHIVO_MODULOS (js/modulos.js), ARCHIVO_BARRA (js/barra-lateral.js).
'use strict'

const fs = require('fs')
const path = require('path')
const { extraerFn, extraerConst } = require('./extraer')
const { arnes } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const RUTA = process.env.ARCHIVO_MODULOS || path.join(RAIZ, 'js', 'modulos.js')
const RUTA_BARRA = process.env.ARCHIVO_BARRA || path.join(RAIZ, 'js', 'barra-lateral.js')
const MOD = fs.readFileSync(RUTA, 'utf8')
const BARRA = fs.readFileSync(RUTA_BARRA, 'utf8')
console.log(`ARCHIVO ${RUTA} (${MOD.length} bytes)`)
console.log(`ARCHIVO ${RUTA_BARRA} (${BARRA.length} bytes)`)
const { chk, fin } = arnes()

const S = new Function(extraerConst(MOD, 'MODULOS') + extraerConst(MOD, 'PALETA_MODULO') + extraerConst(MOD, 'ORDEN_BARRA') +
  extraerFn(MOD, 'moduloVisible') + extraerFn(MOD, 'enOrdenDeBarra') + '\nreturn { MODULOS, PALETA_MODULO, ORDEN_BARRA, moduloVisible, enOrdenDeBarra }')()
const DOLCE = '118b348c-43ec-4f6c-8bc2-27ab6f24b761'
const NUSS = '91d2d5e8-b60f-43bb-97ae-85bb355f57b2'
const m = S.MODULOS.find(x => x.clave === 'remitos-dolce')

chk('la tarjeta existe y abre el módulo', !!m && m.url === 'modulos/remitos-dolce.html' && m.nombre === 'Remitos Dolce' && m.proximamente === false)
chk('cuelga de retiros y pide cargar o ver', m?.requiereModulo === 'retiros' && JSON.stringify(m?.requiereTareas) === '["retiros:cargar","retiros:ver"]')
chk('en Dolce Pasta (el id verificado de unidades_negocio)', m?.alcanceEn === DOLCE)

const ver = (tareas, { modulos = ['retiros'], sa = false, alcances = undefined } = {}) => S.moduloVisible(m, {
  esAdmin: sa, esSuperAdmin: sa, misModulos: modulos, misTareas: new Set(tareas.map(t => t[0])),
  misAlcances: alcances === undefined ? new Map(tareas) : alcances,
})
chk('Manuel: retiros:cargar en Dolce → la ve', ver([['retiros:cargar', { unidades: [DOLCE] }]]))
chk('Yanina: retiros:ver en Dolce → la ve', ver([['retiros:ver', { unidades: [DOLCE] }]]))
chk('con {"todas": true} → la ve', ver([['retiros:ver', { todas: true }]]))
chk('cargar solo en Nuss → NO la ve', !ver([['retiros:cargar', { unidades: [NUSS] }]]))
chk('retiros:precios en Dolce (sin cargar ni ver) → NO la ve', !ver([['retiros:precios', { unidades: [DOLCE] }]]))
chk('alcance null → NO la ve (como tiene_tarea_alcance)', !ver([['retiros:cargar', null]]))
chk('"todas" que no es true → NO la ve', !ver([['retiros:cargar', { todas: 'si' }]]))
chk('sin poder leer los alcances → NO la ve', !ver([['retiros:cargar', { unidades: [DOLCE] }]], { alcances: null }))
chk('sin el módulo retiros → NO la ve', !ver([['retiros:cargar', { unidades: [DOLCE] }]], { modulos: [] }))
chk('super_admin → la ve', ver([], { sa: true, modulos: [] }))
// Los demás módulos no cambian: sin alcanceEn, alcanza con la tarea.
const retiros = S.MODULOS.find(x => x.clave === 'retiros')
chk('la Carga sigue igual (sin alcanceEn): retiros:cargar en Nuss la ve', S.moduloVisible(retiros, { esAdmin: false, esSuperAdmin: false, misModulos: ['retiros'], misTareas: new Set(['retiros:cargar']) }))
chk('ningún otro módulo pide alcanceEn', S.MODULOS.filter(x => x.alcanceEn).map(x => x.clave).join() === 'remitos-dolce')

chk('su color propio (el azul de Rosario)', JSON.stringify(S.PALETA_MODULO['remitos-dolce']) === '[0.5,0.13,250]')
chk('ningún otro módulo usa ese tono', Object.entries(S.PALETA_MODULO).filter(([k, v]) => k !== 'remitos-dolce' && v[2] === 250).length === 0)
chk('en la barra, después de Órdenes de retiro', S.ORDEN_BARRA.indexOf('remitos-dolce') === S.ORDEN_BARRA.indexOf('retiros') + 1)
chk('su ícono en la barra lateral (el del remito)', /'remitos-dolce': 'M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4'/.test(BARRA))
chk('la barra lateral lee el alcance de las tareas', /select\('modulo, tarea, alcance'\)/.test(BARRA) && /modulosDeBarra\(\{ esAdmin, esSuperAdmin, misModulos, misTareas, misAlcances \}\)/.test(BARRA))
const DASH = fs.readFileSync(path.join(RAIZ, 'dashboard.html'), 'utf8')
chk('el dashboard pasa los alcances a las tarjetas y al tablero', /moduloVisible\(modulo, \{ esAdmin, esSuperAdmin, misModulos, misTareas, misAlcances: alcances \}\)/.test(DASH) &&
  /ctxVis: \{ esAdmin, esSuperAdmin, misModulos, misTareas, misAlcances: alcances \}/.test(DASH))

fin()
