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
chk('para una persona abre la GESTIÓN (modulos/produccion-gestion.html)', p?.url === 'modulos/produccion-gestion.html')
chk('para una tablet, la PLANTA (modulos/produccion.html)', p?.urlDispositivo === 'modulos/produccion.html')
chk('su color existe en COLORES_MODULO', !!S.COLORES_MODULO[p?.color], p?.color)
chk('el color es azul (--azul)', /var\(--azul\)/.test(S.COLORES_MODULO[p?.color]?.fg || ''))
const ver = (ctx) => S.moduloVisible(p, { esAdmin: false, esSuperAdmin: false, misModulos: [], misTareas: new Set(), ...ctx })
chk('se ve con el módulo produccion habilitado', ver({ misModulos: ['produccion'] }))
chk('no se ve sin el módulo', !ver({ misModulos: ['stock'] }))
chk('super_admin la ve', ver({ esAdmin: true, esSuperAdmin: true }))

// --- la cuenta de una TABLET entra derecho a la planta --------------------
// Desde el 25/09/2026 decide QUÉ ES la cuenta (empleados.es_dispositivo), no
// cuántas tarjetas ve: una persona con solo Producción ve el dashboard, y su
// tarjeta la lleva a la gestión.
{
  const conCargar = new Set(['produccion:cargar'])
  const der = (ctx) => S.entraDerechoAProduccion({ esDispositivo: true, misTareas: conCargar, ...ctx })

  chk('una tablet con una tarea de producción entra derecho', der())
  chk('son las tres tareas del módulo', S.TAREAS_PRODUCCION.length === 3 &&
    ['produccion:cargar', 'produccion:ver', 'produccion:configurar'].every(t => S.TAREAS_PRODUCCION.includes(t)))
  for (const t of S.TAREAS_PRODUCCION) chk(`entra derecho con ${t}`, der({ misTareas: new Set([t]) }))
  // El guard del bucle: la planta vuelve al dashboard cuando no hay ninguna
  // tarea (su sinAcceso()).
  chk('SIN ninguna tarea de producción NO entra derecho (si no, es un bucle)', !der({ misTareas: new Set() }))
  chk('una tarea de otro módulo no alcanza', !der({ misTareas: new Set(['stock:ver']) }))
  chk('una PERSONA con solo producción NO entra derecho a la planta', !der({ esDispositivo: false }))
  chk('es_dispositivo en null no es una tablet', !der({ esDispositivo: null }))
  chk('es_dispositivo "true" (texto) no es una tablet', !der({ esDispositivo: 'true' }))
}

// El llamado, en el archivo.
chk('la consulta de mi empleado trae es_dispositivo',
  /\.select\('id, rol_app, es_dispositivo'\)\s*\.eq\('auth_user_id', sesion\.user\.id\)/.test(src))
chk('esDispositivo se decide con === true', src.includes('const esDispositivo = miEmpleado.es_dispositivo === true'))
chk('redirige a modulos/produccion.html con replace (no deja el dashboard en el historial)',
  /if \(entraDerechoAProduccion\(\{ esDispositivo, misTareas \}\)\) \{\s*window\.location\.replace\('modulos\/produccion\.html'\)/.test(src))
chk('corta el dibujado después de redirigir', src.includes('await new Promise(() => {})'))
chk('la tarjeta usa la url de la planta solo para una tablet',
  src.includes('href="${(esDispositivo && modulo.urlDispositivo) || modulo.url}"'))

const css = fs.readFileSync(path.join(__dirname, '..', 'css/main.css'), 'utf8')
chk('--azul está definida en main.css', /--azul:\s*#1F5FAD;/.test(css) && /--azul-suave:/.test(css) && /--azul-oscuro:/.test(css))

fin()
