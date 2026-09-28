// La tarjeta "Proyectos Taller" (28/09/2026) en dashboard.html y la barra
// lateral (las dos leen js/modulos.js). Se ve con el módulo 'taller'
// habilitado (fila de empleado_modulos); adentro, cualquiera de sus cuatro
// tareas abre la pantalla.
//
//   node pruebas/test-dashboard-taller.js
'use strict'

const fs = require('fs')
const path = require('path')
const { extraerConst, extraerFn } = require('./extraer')
const { arnes } = require('./circuito-comun')

const src = require('./fuente-dashboard').fuenteDashboard()
const { chk, fin } = arnes()

const S = new Function(extraerConst(src, 'MODULOS') + '\n' + extraerConst(src, 'COLORES_MODULO') + '\n' +
  extraerFn(src, 'moduloVisible') + '\nreturn { MODULOS, COLORES_MODULO, moduloVisible }')()
const t = S.MODULOS.find(m => m.clave === 'taller')
chk('hay tarjeta con clave taller (la de la tabla modulos)', !!t)
chk('se llama "Proyectos Taller"', t?.nombre === 'Proyectos Taller')
chk('abre modulos/taller.html', t?.url === 'modulos/taller.html')
chk('el archivo existe', fs.existsSync(path.join(__dirname, '..', 'modulos', 'taller.html')))
chk('no está marcada "próximamente"', t?.proximamente === false)
chk('tiene ícono', typeof t?.icono === 'string' && t.icono.length > 2)
chk('es grafito, con su color en COLORES_MODULO', t?.color === 'grafito' && /var\(--grafito\)/.test(S.COLORES_MODULO.grafito?.fg || ''))
const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'main.css'), 'utf8')
chk('--grafito y --grafito-suave existen en main.css', /--grafito:\s*#3F4655/.test(css) && /--grafito-suave:\s*#E4E7EC/.test(css))
chk('va última (después de Administración)', S.MODULOS.indexOf(t) === S.MODULOS.length - 1)
const ver = (ctx) => S.moduloVisible(t, { esAdmin: false, esSuperAdmin: false, misModulos: [], misTareas: new Set(), ...ctx })
chk('se ve con el módulo taller', ver({ misModulos: ['taller'] }))
chk('no se ve sin el módulo', !ver({ misModulos: ['gastos'] }))
chk('super_admin la ve', ver({ esAdmin: true, esSuperAdmin: true }))

fin()
