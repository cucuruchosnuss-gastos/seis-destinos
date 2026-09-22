// La tarjeta de Producción en dashboard.html (22/09/2026).
//
//   node pruebas/test-dashboard-produccion.js

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
const p = S.MODULOS.find(m => m.clave === 'produccion')
chk('hay tarjeta con clave produccion', !!p)
chk('se llama Producción', p?.nombre === 'Producción')
chk('abre modulos/produccion.html', p?.url === 'modulos/produccion.html')
chk('su color existe en COLORES_MODULO', !!S.COLORES_MODULO[p?.color], p?.color)
chk('el color es azul (--azul)', /var\(--azul\)/.test(S.COLORES_MODULO[p?.color]?.fg || ''))
const ver = (ctx) => S.moduloVisible(p, { esAdmin: false, esSuperAdmin: false, misModulos: [], misTareas: new Set(), ...ctx })
chk('se ve con el módulo produccion habilitado', ver({ misModulos: ['produccion'] }))
chk('no se ve sin el módulo', !ver({ misModulos: ['stock'] }))
chk('super_admin la ve', ver({ esAdmin: true, esSuperAdmin: true }))
const css = fs.readFileSync(path.join(__dirname, '..', 'css/main.css'), 'utf8')
chk('--azul está definida en main.css', /--azul:\s*#1F5FAD;/.test(css) && /--azul-suave:/.test(css) && /--azul-oscuro:/.test(css))

fin()
