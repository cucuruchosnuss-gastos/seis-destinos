// La tarjeta "Administración" en dashboard.html (26/09/2026). No existe
// todavía un módulo 'administracion' en la base: sus secciones de hoy usan las
// tareas de 'retiros' (ver / precios), así que la tarjeta cuelga de ese
// módulo y pide una de esas dos. Quien solo carga en el depósito no la ve.
//
//   node pruebas/test-dashboard-administracion.js

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
const a = S.MODULOS.find(m => m.clave === 'administracion')
chk('hay tarjeta Administración', !!a && a.nombre === 'Administración')
chk('abre modulos/administracion.html', a?.url === 'modulos/administracion.html')
chk('no está "próximamente"', a?.proximamente === false)
chk('tiene ícono y color', typeof a?.icono === 'string' && !!S.COLORES_MODULO[a?.color])
chk('cuelga del módulo retiros', a?.requiereModulo === 'retiros')
const ver = (ctx) => S.moduloVisible(a, { esAdmin: false, esSuperAdmin: false, misModulos: [], misTareas: new Set(), ...ctx })
chk('se ve con retiros:ver', ver({ misModulos: ['retiros'], misTareas: new Set(['retiros:ver']) }))
chk('se ve con retiros:precios', ver({ misModulos: ['retiros'], misTareas: new Set(['retiros:precios']) }))
chk('NO se ve solo con retiros:cargar (el depósito)', !ver({ misModulos: ['retiros'], misTareas: new Set(['retiros:cargar']) }))
chk('NO se ve sin el módulo retiros', !ver({ misModulos: ['pedidos'], misTareas: new Set(['retiros:ver']) }))
chk('super_admin la ve', ver({ esAdmin: true, esSuperAdmin: true }))
// La burbuja: mis_pendientes() devuelve 'administracion' con dos claves y la
// tarjeta muestra la SUMA (agruparPendientes ya suma por módulo).
const P = new Function(extraerConst(src, 'MODULO_DE_PENDIENTE') + '\n' + extraerFn(src, 'escDash') + '\n' + extraerFn(src, 'textoPendiente') + '\n' +
  extraerFn(src, 'agruparPendientes') + '\nreturn { MODULO_DE_PENDIENTE, agruparPendientes }')()
chk('los pendientes de administracion van a la tarjeta Administración', P.MODULO_DE_PENDIENTE.administracion === 'administracion')
const g = P.agruparPendientes([
  { modulo: 'administracion', clave: 'ordenes_sin_valorizar', cantidad: 3, texto: 'Órdenes de retiro sin valorizar' },
  { modulo: 'administracion', clave: 'clientes_sobre_limite', cantidad: 2, texto: 'Clientes que pasan su límite de crédito' },
])
chk('la tarjeta dice la suma de sus pendientes (3 + 2 = 5)', g.get('administracion')?.total === 5)
chk('y el detalle nombra los dos', g.get('administracion')?.detalle.length === 2)
chk('el archivo existe', fs.existsSync(path.join(__dirname, '..', 'modulos', 'administracion.html')))

fin()
