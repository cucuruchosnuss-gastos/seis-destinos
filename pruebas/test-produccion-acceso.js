// B1 del módulo Producción (22/09/2026): quién entra y en qué unidades.
//
// Se entra con cualquiera de las tres tareas (cargar, ver, configurar). Las
// tres llevan alcance por unidad, y unidadesCon() tiene que decir lo mismo que
// tiene_tarea_alcance() en la base (leída con pg_get_functiondef el
// 22/09/2026): super_admin todas; {"todas": true} todas; si no, la lista de
// {"unidades": [...]}; sin la tarea, ninguna.
//
//   node pruebas/test-produccion-acceso.js

const path = require('path')
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, fin } = arnes()

function armar(rol, tareas) {
  const S = construirProduccion(ARCHIVO)
  S.estado.miRolApp = rol
  S.estado.misTareas = new Map(tareas)
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss'], ['u-dp', 'Dolce Pasta'], ['u-ta', 'Taller']])
  return S
}

// ── Entrar ────────────────────────────────────────────────────────────────
{
  chk('sin ninguna tarea no se entra', !armar('usuario', []).puedeEntrar())
  chk('con cargar se entra', armar('usuario', [['cargar', { unidades: ['u-cn'] }]]).puedeEntrar())
  chk('con ver se entra', armar('usuario', [['ver', { todas: true }]]).puedeEntrar())
  chk('con configurar se entra', armar('usuario', [['configurar', { unidades: [] }]]).puedeEntrar())
  chk('una tarea de otro módulo no alcanza', !armar('usuario', [['ver_todo', { todas: true }]]).puedeEntrar())
  chk('super_admin entra sin filas', armar('super_admin', []).puedeEntrar())
}

// ── Unidades por tarea ───────────────────────────────────────────────────
{
  const S = armar('usuario', [['cargar', { unidades: ['u-cn', 'u-otra-inactiva'] }], ['ver', { todas: true }]])
  chk('cargar con lista: solo las de la lista que están activas', JSON.stringify(S.unidadesCon('cargar')) === '["u-cn"]', JSON.stringify(S.unidadesCon('cargar')))
  chk('ver con todas: las tres activas', S.unidadesCon('ver').length === 3)
  chk('configurar sin la tarea: ninguna', S.unidadesCon('configurar').length === 0)
  const T = armar('usuario', [['cargar', null]])
  chk('cargar con alcance null: ninguna (como la base: ni todas ni lista)', T.unidadesCon('cargar').length === 0)
  const U = armar('usuario', [['cargar', { todas: false, unidades: ['u-dp'] }]])
  chk('todas=false usa la lista', JSON.stringify(U.unidadesCon('cargar')) === '["u-dp"]')
  const A = armar('super_admin', [])
  chk('super_admin: todas en cualquier tarea', A.unidadesCon('configurar').length === 3)
}

// ── Lo que se lee de la base ──────────────────────────────────────────────
{
  chk('lee las tareas de produccion habilitadas, con su alcance',
    /\.from\('empleado_tareas'\)\.select\('tarea, alcance'\)\s*\n\s*\.eq\('empleado_id', emp\.id\)\.eq\('modulo', 'produccion'\)\.eq\('habilitado', true\)/.test(FUENTE))
  chk('sin permiso: aviso y vuelta al dashboard', /if \(!puedeEntrar\(\)\) \{\s*\n\s*sinAcceso\(/.test(FUENTE))
  chk('sinAcceso vuelve al dashboard', /window\.location\.href = '\.\.\/dashboard\.html'/.test(FUENTE))
}

// ── Tablet: tamaños mínimos ───────────────────────────────────────────────
// Botones de 56 px como mínimo y texto de 18 px o más (con la raíz en 16 px,
// 1.125rem). Se lee el <style> del módulo: cada font-size en rem tiene que ser
// ≥ 1.125, ninguno en em por debajo de 1, y el alto mínimo es 56 px.
{
  const css = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))
  const rems = [...css.matchAll(/font-size:\s*([0-9.]+)rem/g)].map(m => Number(m[1]))
  chk('hay tamaños de letra en rem (si da cero, no se está leyendo)', rems.length > 5)
  chk('ningún texto por debajo de 18 px (1.125rem)', rems.every(r => r >= 1.125), rems.filter(r => r < 1.125).join(', '))
  const ems = [...css.matchAll(/font-size:\s*([0-9.]+)em/g)].map(m => Number(m[1]))
  chk('ningún tamaño en em por debajo de 1', ems.every(r => r >= 1), ems.join(', '))
  chk('el texto base del módulo es de 18 px', /body \{[^}]*font-size: 18px;/.test(css))
  chk('el alto mínimo de los botones es 56 px', /--pr-alto-boton: 56px;/.test(css) && /\.pr-btn \{[^}]*min-height: var\(--pr-alto-boton\)/.test(css))
}

fin()
