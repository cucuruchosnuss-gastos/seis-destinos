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
  extraerConst(src, 'TAREAS_PRODUCCION') + '\n' +
  extraerFn(src, 'moduloVisible') + '\n' + extraerFn(src, 'entraDerechoAProduccion') +
  '\nreturn { MODULOS, COLORES_MODULO, moduloVisible, entraDerechoAProduccion, TAREAS_PRODUCCION }')()
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

// --- entrar derecho a la tablet cuando Producción es el único módulo --------
// La cuenta de una tablet no tiene por qué ver un dashboard de una sola
// tarjeta. Lo decide entraDerechoAProduccion(), que es pura para poder
// ejecutarla acá.
{
  const soloProd = [p]
  const conCargar = new Set(['produccion:cargar'])
  const der = (ctx) => S.entraDerechoAProduccion({
    esAdmin: false, esSuperAdmin: false, modulosVisibles: soloProd,
    misTareas: conCargar, yaFue: false, ...ctx })

  chk('con Producción sola y una tarea, entra derecho', der())
  chk('son las tres tareas del módulo', S.TAREAS_PRODUCCION.length === 3 &&
    ['produccion:cargar', 'produccion:ver', 'produccion:configurar'].every(t => S.TAREAS_PRODUCCION.includes(t)))
  for (const t of S.TAREAS_PRODUCCION) chk(`entra derecho con ${t}`, der({ misTareas: new Set([t]) }))

  // El guard del bucle: produccion.html vuelve al dashboard cuando no hay
  // ninguna tarea (su sinAcceso()), así que sin este chequeo serían dos
  // pantallas rebotando sin salida por la UI.
  chk('SIN ninguna tarea de producción NO entra derecho (si no, es un bucle)',
    !der({ misTareas: new Set() }))
  chk('una tarea de otro módulo no alcanza', !der({ misTareas: new Set(['stock:ver']) }))

  chk('con dos módulos visibles NO entra derecho',
    !der({ modulosVisibles: [p, S.MODULOS.find(m => m.clave === 'stock')] }))
  chk('con un único módulo que no es Producción, tampoco',
    !der({ modulosVisibles: [S.MODULOS.find(m => m.clave === 'stock')] }))
  chk('sin ningún módulo visible, tampoco', !der({ modulosVisibles: [] }))
  chk('un admin no entra derecho', !der({ esAdmin: true }))
  chk('un super_admin tampoco', !der({ esSuperAdmin: true }))

  // Una vez por sesión: si no, el "Volver al inicio de la app" de la tablet
  // rebotaría para siempre contra esta redirección.
  chk('ya habiendo entrado derecho en esta sesión, no se repite', !der({ yaFue: true }))
}

// El llamado, en el archivo.
chk('redirige a modulos/produccion.html con replace (no deja el dashboard en el historial)',
  src.includes("window.location.replace('modulos/produccion.html')"))
chk('solo redirige si pudo dejar constancia (si no, la vuelta al inicio queda atrapada)',
  /if \(recordado\) \{[\s\S]{0,240}window\.location\.replace\('modulos\/produccion\.html'\)/.test(src))
chk('lee la marca de sessionStorage con try/catch',
  /try \{ yaFueAProduccion = sessionStorage\.getItem\('dashboard\.directoProduccion'\)/.test(src))
chk('escribe la marca de sessionStorage con try/catch',
  /try \{ sessionStorage\.setItem\('dashboard\.directoProduccion', '1'\); recordado = true \} catch/.test(src))
chk('corta el dibujado después de redirigir', src.includes('await new Promise(() => {})'))

const css = fs.readFileSync(path.join(__dirname, '..', 'css/main.css'), 'utf8')
chk('--azul está definida en main.css', /--azul:\s*#1F5FAD;/.test(css) && /--azul-suave:/.test(css) && /--azul-oscuro:/.test(css))

fin()
