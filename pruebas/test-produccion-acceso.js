// B1 del módulo Producción (22/09/2026): quién entra y en qué unidades.
//
// Desde el 25/09/2026 Producción está partida en dos: a la PLANTA
// (produccion.html) entra SOLO una cuenta de dispositivo con
// produccion:cargar en su fábrica; a la GESTIÓN (produccion-gestion.html),
// una cuenta personal con produccion:ver o :configurar. Las
// tres llevan alcance por unidad, y unidadesCon() tiene que decir lo mismo que
// tiene_tarea_alcance() en la base (leída con pg_get_functiondef el
// 22/09/2026): super_admin todas; {"todas": true} todas; si no, la lista de
// {"unidades": [...]}; sin la tarea, ninguna.
//
//   node pruebas/test-produccion-acceso.js

const path = require('path')
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion, GESTION } = require('./sandbox-produccion')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const ARCHIVO_G = process.env.ARCHIVO_GESTION || GESTION
const FUENTE_G = leer(ARCHIVO_G)
const { chk, fin } = arnes()

function armar(rol, tareas, archivo = ARCHIVO) {
  const S = construirProduccion(archivo)
  S.estado.miRolApp = rol
  S.estado.misTareas = new Map(tareas)
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss'], ['u-dp', 'Dolce Pasta'], ['u-ta', 'Taller']])
  return S
}

// ── Entrar a la planta: solo un dispositivo con cargar en SU fábrica ─────
{
  const S = armar('usuario', [['cargar', { unidades: ['u-cn'] }]])
  const dispo = { empleado_id: 'e1', nombre: 'Tablet Producción · Cucuruchos Nuss', es_dispositivo: true, unidad_negocio_id: 'u-cn' }
  chk('dispositivo con cargar en su fábrica → planta', S.destinoDeSesion(dispo) === 'planta', S.destinoDeSesion(dispo))
  chk('una cuenta personal → gestión', S.destinoDeSesion({ ...dispo, es_dispositivo: false }) === 'gestion')
  chk('sin empleado (null) → gestión (y la gestión dirá que no tiene acceso)', S.destinoDeSesion(null) === 'gestion')
  chk('es_dispositivo que no es true (null) → gestión: no se asume dispositivo', S.destinoDeSesion({ ...dispo, es_dispositivo: null }) === 'gestion')
  chk('dispositivo sin fábrica → sin_fabrica', S.destinoDeSesion({ ...dispo, unidad_negocio_id: null }) === 'sin_fabrica')
  chk('dispositivo con cargar en OTRA fábrica → sin_permiso', S.destinoDeSesion({ ...dispo, unidad_negocio_id: 'u-dp' }) === 'sin_permiso')
  const V = armar('usuario', [['ver', { todas: true }]])
  chk('dispositivo sin cargar (solo ver) → sin_permiso', V.destinoDeSesion(dispo) === 'sin_permiso')
}

// ── Entrar a la gestión: ver o configurar ────────────────────────────────
{
  const g = (rol, tareas) => armar(rol, tareas, ARCHIVO_G).puedeVerGestion()
  chk('gestión: sin ninguna tarea no se entra', !g('usuario', []))
  chk('gestión: con solo cargar NO se entra (cargar es de la tablet)', !g('usuario', [['cargar', { unidades: ['u-cn'] }]]))
  chk('gestión: con ver se entra', g('usuario', [['ver', { todas: true }]]))
  chk('gestión: con configurar se entra', g('usuario', [['configurar', { unidades: [] }]]))
  chk('gestión: una tarea de otro módulo no alcanza', !g('usuario', [['ver_todo', { todas: true }]]))
  chk('gestión: super_admin entra sin filas', g('super_admin', []))
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
  chk('gestión: sin permiso, aviso y vuelta al dashboard', /if \(!puedeVerGestion\(\)\) \{\s*\n\s*sinAcceso\(/.test(FUENTE_G))
  chk('gestión: sinAcceso vuelve al dashboard', /window\.location\.href = '\.\.\/dashboard\.html'/.test(FUENTE_G))
  chk('planta: NINGÚN link ni redirección al dashboard (la cuenta de la tablet no tiene nada que hacer ahí)', !/dashboard\.html/.test(FUENTE))
  chk('planta: una cuenta personal se va a la gestión con replace', /if \(destino === 'gestion'\) \{ window\.location\.replace\('produccion-gestion\.html'\)/.test(FUENTE))
  chk('planta: si mi_sesion_produccion falla NO se redirige: se dice y se ofrecen los links',
    /console\.error\('mi_sesion_produccion:', err\)\s*\n\s*sinAcceso\('No se pudo saber qué cuenta es esta\. Revisá la conexión\.', LINKS_SIN_SESION\)\s*\n\s*return/.test(FUENTE))
  chk('gestión: una cuenta de dispositivo se va a la planta con replace', /es_dispositivo === true\) \{ window\.location\.replace\('produccion\.html'\)/.test(FUENTE_G))
}

// ── La planta: tamaños (la tablet real, 28/09/2026) ───────────────────────
// La planta se diseñó para 1280×800, pero la tablet de Nuss (Galaxy Tab A11)
// mide 1007×604 CSS px, y instalada quedan ~1000×540 apaisada y ~600×940
// parada: casi un tercio menos de ALTO. Todo entra SIN SCROLL a esos tamaños
// (lo mide e2e/8-planta-tamanos.spec.js en un navegador), así que los mínimos
// de antes (texto de 16 px, botones de 48) se aflojaron a propósito. Los que
// quedan: nada por debajo de 11 px (0,6875rem) y nada tocable de menos de
// 30 px de alto; y el teclado del PIN sigue grande (hasta 72 px).
{
  const todoElCss = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))
  const iniCfg = todoElCss.indexOf('/* ── Configuración: LA EXCEPCIÓN DEL MÓDULO')
  const finCfg = todoElCss.indexOf('/* ── fin de Configuración')
  const css = iniCfg > 0 && finCfg > iniCfg ? todoElCss.slice(0, iniCfg) + todoElCss.slice(finCfg) : todoElCss
  const rems = [...css.matchAll(/font-size:\s*([0-9.]+)rem/g)].map(m => Number(m[1]))
  chk('hay tamaños de letra en rem (si da cero, no se está leyendo)', rems.length > 5)
  chk('ningún texto por debajo de 11 px (0,6875rem)', rems.every(r => r >= 0.6875), rems.filter(r => r < 0.6875).join(', '))
  const ems = [...css.matchAll(/font-size:\s*([0-9.]+)em/g)].map(m => Number(m[1]))
  chk('ningún tamaño en em por debajo de 1', ems.every(r => r >= 1), ems.join(', '))
  const pxs = [...css.matchAll(/min-height:\s*([0-9]+)px/g)].map(m => Number(m[1]))
  chk('ningún alto mínimo en px por debajo de 30 (salvo cero)', pxs.every(n => n === 0 || n >= 30), pxs.filter(n => n && n < 30).join(', '))

  const iniReal = css.indexOf('/* ══ LA TABLET REAL (28/09/2026)')
  const iniDos = css.indexOf('/* ══ LA PLANTA CON DOS MODOS')
  const iniParada = css.indexOf('/* ══ LA TABLET PARADA')
  chk('el bloque de la tablet real existe y va después del de dos modos', iniReal > 0 && iniDos > 0 && iniReal > iniDos)
  chk('… y el de la tablet PARADA va último (pisa por orden a todos)', iniParada > iniReal && !/\n    \/\* ══ /.test(css.slice(iniParada + 10)))
  const real = css.slice(iniReal)
  chk('botones de 44 px y texto base de 15 px', /body \{ --pr-alto-boton: 44px; font-size: 15px; \}/.test(real))
  chk('la barra lateral mide 208 px apaisada, y la página se corre lo mismo',
    /@media \(orientation: landscape\) and \(min-width: 761px\) \{\s*\.pr-lateral \{ width: 208px; \}\s*body\.pr-con-lateral \.pr-app \{ margin-left: 208px; \}/.test(real))
  chk('la barra pasa arriba solo con la tablet PARADA (o angosta)', /@media \(orientation: portrait\), \(max-width: 760px\) \{\s*\.pr-lateral \{ position: static;/.test(css))
  chk('el teclado del PIN: grande, de 48 a 72 px según el alto', /\.pr-tecla \{ min-height: clamp\(48px, 9\.5vh, 72px\);/.test(real))
  chk('el tablero: tres columnas apaisada, dos parada', /\.pr-tablero \{ gap: 0\.5rem; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\); \}/.test(real) &&
    /@media \(orientation: portrait\) \{ \.pr-tablero \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \} \}/.test(real))
  chk('el LOTE nunca en dos renglones (white-space: nowrap)', /\.pr-maquina__lote \{[^}]*white-space: nowrap;/.test(real) &&
    /\.pr-lat__maq-lote \{[^}]*white-space: nowrap;/.test(real) && /\.pr-planilla-cab__numero \{[^}]*white-space: nowrap;/.test(real))
  chk('las palabras no se cortan al medio', /\.pr-app, \.pr-lateral \{ overflow-wrap: normal; word-break: normal; hyphens: manual; \}/.test(real))
  chk('el nombre del modo va espaciado en la banda, no solo de color', /\.pr-banda-modo__nombre \{[^}]*letter-spacing: 0\.06em/.test(css))
}

fin()
