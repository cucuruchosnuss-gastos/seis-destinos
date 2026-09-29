// Los pendientes del dashboard (mis_pendientes). Se EJECUTAN las funciones
// reales con la RPC mockeada. Desde el 29/09/2026 (el tablero de resúmenes,
// js/tablero.js) el dashboard ya no pinta burbujas en tarjetas "Abrir →": lo
// pendiente va en el PIE de cada tarjeta ("lo que hay que resolver"). Las
// reglas de siempre se siguen exigiendo ahí: un error nunca deja un número
// viejo, un null o un cero no cuentan, la respuesta vieja no pisa la nueva, y
// se vuelve a pedir al volver a la pestaña. La agrupación por tarjeta
// (agruparPendientes, js/modulos.js) la sigue usando la barra lateral.
//
//   node pruebas/test-dashboard-pendientes.js
//   ARCHIVO_TEST=/otra/copia.html node pruebas/test-dashboard-pendientes.js

const fs = require('fs')
const path = require('path')
const { extraerFn, extraerConst } = require('./extraer')

// El script del dashboard + js/modulos.js (el catálogo se mudó ahí el 27/09/2026).
const src = require('./fuente-dashboard').scriptDashboard()

let ok = 0
const fallas = []
function chk(nombre, cond, detalle) { if (cond) ok++; else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : '')) }

const FUNCIONES = ['moduloVisible', 'escDash', 'textoPendiente', 'agruparPendientes', 'htmlBurbujaBarra']
// El tablero (js/tablero.js), con el código real.
const T = require('./sandbox-tablero').construir()
const { ctxFalso } = require('./sandbox-tablero')
let codigo = `
  var __tarjetas = []
  var __rpc = async () => ({ data: [], error: null })
  var __avisos = []
  var console = { warn: (...a) => __avisos.push(a.join(' ')), error: () => {}, log: () => {} }
  function tarjetaFalsa(clave) {
    const t = { dataset: { clave }, hijos: [],
      insertAdjacentHTML(pos, h) { this.hijos.push(h) } }
    return t
  }
  var document = {
    querySelectorAll(sel) {
      if (sel === '.tarjeta-modulo__burbuja') return __tarjetas.flatMap(t => t.hijos.map((h, i) => ({ remove() { t.hijos = t.hijos.filter(x => x !== h) } })))
      if (sel === '.tarjeta-modulo[data-clave]') return __tarjetas
      return []
    },
  }
  var supabase = { rpc: (...a) => __rpc(...a) }
  var turnoPendientes = 0
`
codigo += extraerConst(src, 'MODULO_DE_PENDIENTE')
codigo += extraerConst(src, 'TAMBIEN_EN_TARJETA')
codigo += extraerConst(src, 'PENDIENTES_URGENTES')
codigo += extraerConst(src, 'MODULOS')
for (const f of FUNCIONES) codigo += extraerFn(src, f) + '\n'
codigo += `return { ${FUNCIONES.join(', ')}, MODULO_DE_PENDIENTE, MODULOS,
  __setTarjetas(c) { __tarjetas = c.map(tarjetaFalsa); return __tarjetas }, __setRpc(f) { __rpc = f }, __avisos }`
const S = new Function(codigo)()

// --- el mapeo de nombres ---------------------------------------------------
const clavesTarjeta = new Set(S.MODULOS.map(m => m.clave))
// Los módulos que devuelve la RPC, leídos de su cuerpo el 23/09/2026
// (pg_get_functiondef de public.mis_pendientes). 'produccion' sale de la rama
// de conos_por_revisar, que la RPC devuelve a quien tenga produccion:configurar.
const DE_LA_RPC = ['cobranzas', 'cheques', 'accesos', 'materia_prima', 'gastos', 'cuentas_corrientes', 'stock', 'caja', 'produccion']
for (const m of DE_LA_RPC) {
  chk(`el módulo «${m}» de la RPC está mapeado`, !!S.MODULO_DE_PENDIENTE[m])
  chk(`«${m}» apunta a una tarjeta que existe`, clavesTarjeta.has(S.MODULO_DE_PENDIENTE[m]), S.MODULO_DE_PENDIENTE[m])
}
chk('materia_prima (guión bajo) → materia-prima (guión medio)', S.MODULO_DE_PENDIENTE.materia_prima === 'materia-prima')
chk('cuentas_corrientes → cuentas-corrientes', S.MODULO_DE_PENDIENTE.cuentas_corrientes === 'cuentas-corrientes')
chk('cheques (por_vencer) → la tarjeta de Cheques', S.MODULO_DE_PENDIENTE.cheques === 'cheques')
chk('produccion (conos_por_revisar) → la tarjeta de Producción', S.MODULO_DE_PENDIENTE.produccion === 'produccion')

// La fila de conos llega a la burbuja de Producción y no al aviso de consola.
{
  const g = S.agruparPendientes([{ modulo: 'produccion', clave: 'conos_por_revisar', cantidad: 3, texto: 'Conos nuevos por revisar' }])
  chk('conos_por_revisar suma en la tarjeta produccion', g.get('produccion')?.total === 3)
  chk('y su detalle lo dice', /3 conos nuevos por revisar/.test(g.get('produccion')?.detalle.join(' ') || ''))
}

// --- la tarjeta de Cheques: módulo cobranzas Y (ver_todo o procesar) --------
{
  const cheques = S.MODULOS.find(m => m.clave === 'cheques')
  chk('hay tarjeta de Cheques que abre la sección Cheques de Administración (se mudó el 26/09/2026)', cheques && cheques.url === 'modulos/administracion.html?seccion=cheques')
  const ver = (ctx) => S.moduloVisible(cheques, { esAdmin: false, esSuperAdmin: false, misModulos: [], misTareas: new Set(), ...ctx })
  chk('Cheques: sin el módulo cobranzas no se ve, aunque tenga la tarea',
    !ver({ misTareas: new Set(['cobranzas:procesar']) }))
  chk('Cheques: con cobranzas y solo "cargar" no se ve',
    !ver({ misModulos: ['cobranzas'], misTareas: new Set(['cobranzas:cargar']) }))
  chk('Cheques: con cobranzas y ver_todo se ve', ver({ misModulos: ['cobranzas'], misTareas: new Set(['cobranzas:ver_todo']) }))
  chk('Cheques: con cobranzas y procesar se ve', ver({ misModulos: ['cobranzas'], misTareas: new Set(['cobranzas:procesar']) }))
  chk('Cheques: una fila "cheques" en empleado_modulos NO alcanza (cuelga de cobranzas)',
    !ver({ misModulos: ['cheques'], misTareas: new Set(['cobranzas:procesar']) }))
  chk('Cheques: super_admin la ve (bypass, como tiene_tarea)', ver({ esAdmin: true, esSuperAdmin: true }))
  chk('Cheques: un "admin" viejo sin la tarea no la ve', !ver({ esAdmin: true }))
  // Las demás tarjetas no cambiaron de regla.
  const gastos = S.MODULOS.find(m => m.clave === 'gastos')
  chk('Gastos: se sigue viendo solo con su módulo', S.moduloVisible(gastos, { esAdmin: false, esSuperAdmin: false, misModulos: ['gastos'], misTareas: new Set() }) &&
    !S.moduloVisible(gastos, { esAdmin: false, esSuperAdmin: false, misModulos: [], misTareas: new Set() }))
  const accesos = S.MODULOS.find(m => m.clave === 'accesos')
  chk('Accesos: solo super_admin', !S.moduloVisible(accesos, { esAdmin: true, esSuperAdmin: false, misModulos: ['accesos'], misTareas: new Set() }) &&
    S.moduloVisible(accesos, { esAdmin: true, esSuperAdmin: true, misModulos: [], misTareas: new Set() }))
}

// --- agrupar --------------------------------------------------------------
{
  const g = S.agruparPendientes([
    { modulo: 'cobranzas', clave: 'por_controlar', cantidad: 5, texto: 'Cobranzas por controlar' },
    { modulo: 'materia_prima', clave: 'pagado_sin_ingresar', cantidad: 2, texto: 'Pagado sin ingresar' },
    { modulo: 'materia_prima', clave: 'insumos_por_revisar', cantidad: 3, texto: 'Insumos nuevos por revisar' },
    { modulo: 'caja', clave: 'x', cantidad: 0, texto: 'Movimientos por aceptar' },
    { modulo: 'gastos', clave: 'x', cantidad: null, texto: 'Facturas' },
    { modulo: 'stock', clave: 'x', cantidad: '4', texto: 'Transferencias por aceptar' },
    { modulo: 'modulo_inventado', clave: 'x', cantidad: 9, texto: '<b>' },
  ])
  chk('cobranzas suma 5', g.get('cobranzas')?.total === 5)
  chk('el detalle dice "5 cobranzas por controlar"', g.get('cobranzas')?.detalle[0] === '5 cobranzas por controlar', g.get('cobranzas')?.detalle[0])
  chk('materia-prima suma sus dos filas: 5', g.get('materia-prima')?.total === 5)
  chk('materia-prima lleva los dos detalles', g.get('materia-prima')?.detalle.length === 2)
  chk('caja con 0 no tiene burbuja', !g.has('caja'))
  chk('una cantidad null no se vuelve 0 ni un número', !g.has('gastos'))
  chk('bigint como texto "4" (PostgREST) se lee', g.get('stock')?.total === 4)
  // Cuatro: las tres de siempre más Administración, donde también se asientan
  // las cobranzas por controlar (TAMBIEN_EN_TARJETA, 27/09/2026).
  chk('un módulo que no existe se ignora', ![...g.keys()].some(k => /inventado/.test(k)) && g.size === 4, [...g.keys()].join())
  chk('las cobranzas por controlar suman también en Administración', g.get('administracion')?.total === 5)
  chk('y se avisa por consola', S.__avisos.some(a => /modulo_inventado/.test(a)))
}

// --- caja con DOS claves (24/09/2026): la tarjeta dice la SUMA ------------
// mis_pendientes() devuelve para caja 'solicitudes_mi_caja' y
// 'solicitudes_empresa'. Antes era una sola y la tarjeta decía 1 cuando había
// uno en cada caja. La tarjeta tiene que decir lo mismo que se ve adentro:
// uno en mi caja + uno en la de la empresa = 2.
{
  const g = S.agruparPendientes([
    { modulo: 'caja', clave: 'solicitudes_mi_caja', cantidad: 1, texto: 'Movimientos por aceptar en mi caja' },
    { modulo: 'caja', clave: 'solicitudes_empresa', cantidad: '1', texto: 'Movimientos por aceptar en la caja de la empresa' },
  ])
  chk('caja: dos claves con 1 cada una → la tarjeta dice 2', g.get('caja')?.total === 2, g.get('caja')?.total)
  chk('caja: el detalle nombra las dos', g.get('caja')?.detalle.join(' | ') ===
    '1 movimientos por aceptar en mi caja | 1 movimientos por aceptar en la caja de la empresa', g.get('caja')?.detalle.join(' | '))
  // La burbuja de la barra lateral dice la suma; el pie de la tarjeta, un
  // renglón por cada caja (así se ve adentro).
  const h = S.htmlBurbujaBarra(g.get('caja'))
  chk('caja: la burbuja de la barra muestra 2', />2<\/span>$/.test(h), h)
  const pie = T.resolverDePendientes('caja', T.mapaPendientes([
    { modulo: 'caja', clave: 'solicitudes_mi_caja', cantidad: 1 }, { modulo: 'caja', clave: 'solicitudes_empresa', cantidad: '1' }]), new Set(['caja']))
  chk('caja: el pie de la tarjeta nombra las dos cajas (1 + 1)', pie.length === 2 && pie.every(r => r.n === 1), JSON.stringify(pie))
  const g2 = S.agruparPendientes([
    { modulo: 'caja', clave: 'solicitudes_mi_caja', cantidad: 0, texto: 'Movimientos por aceptar en mi caja' },
    { modulo: 'caja', clave: 'solicitudes_empresa', cantidad: 3, texto: 'Movimientos por aceptar en la caja de la empresa' },
  ])
  chk('caja: una clave en 0 no suma ni resta', g2.get('caja')?.total === 3 && g2.get('caja')?.detalle.length === 1)
}

// Lo URGENTE (29/09/2026, handoff "Esqueleto"): la barra pinta en bordó la
// burbuja del módulo que tiene algo urgente, y en gris la de lo demás.
{
  const g = S.agruparPendientes([
    { modulo: 'cheques', clave: 'por_vencer', cantidad: 3, texto: 'Cheques que vencen esta semana' },
    { modulo: 'produccion', clave: 'conos_por_revisar', cantidad: 2, texto: 'Conos nuevos por revisar' },
    { modulo: 'cobranzas', clave: 'por_controlar', cantidad: 1, texto: 'Cobranzas por controlar' },
  ])
  chk('urgente: cheques que vencen esta semana', g.get('cheques')?.urgente === true)
  chk('urgente: cobranzas por asentar (en Cobranzas y en Administración)', g.get('cobranzas')?.urgente === true && g.get('administracion')?.urgente === true)
  chk('no urgente: conos por revisar', g.get('produccion')?.urgente === false)
}

// --- el pie de cada tarjeta (lo que era la burbuja) -------------------------
{
  const filas = [
    { modulo: 'cobranzas', clave: 'por_controlar', cantidad: 5, texto: 'Cobranzas por controlar' },
    { modulo: 'accesos', clave: 'solicitudes', cantidad: 2, texto: 'Solicitudes de acceso' },
    { modulo: 'caja', clave: 'solicitudes_mi_caja', cantidad: 0, texto: 'Movimientos por aceptar' },
    { modulo: 'modulo_inventado', clave: 'x', cantidad: 7, texto: '<b>' },
  ]
  const pend = T.mapaPendientes(filas)
  const vis = new Set(['administracion', 'accesos', 'caja', 'gastos'])
  chk('con datos: las cobranzas por controlar van al pie de Administración ("por asentar")', T.resolverDePendientes('administracion', pend, vis).some(r => r.n === 5 && r.t === 'cobranzas por asentar'))
  chk('con datos: accesos tiene su renglón', T.resolverDePendientes('accesos', pend, vis).some(r => r.n === 2))
  chk('con datos: caja en 0 no tiene', T.resolverDePendientes('caja', pend, vis).length === 0)
  chk('con datos: gastos sin fila no tiene', T.resolverDePendientes('gastos', pend, vis).length === 0)
  chk('un módulo que la RPC devuelva y no tenga tarjeta se ignora', ![...vis].some(c => T.resolverDePendientes(c, pend, vis).some(r => r.n === 7)))
  chk('con cero: ningún renglón', T.mapaPendientes([{ modulo: 'cobranzas', clave: 'por_controlar', cantidad: 0 }]).size === 0)
  chk('un null o un texto no se vuelven un número', T.mapaPendientes([{ modulo: 'accesos', clave: 'solicitudes', cantidad: null }, { modulo: 'accesos', clave: 'solicitudes', cantidad: 'x' }]).size === 0)
  const h = T.htmlTarjeta({ clave: 'accesos', nombre: 'Accesos', url: 'modulos/accesos.html', tamano: 'chica' },
    { estado: 'ok', valor: '1', resolver: [{ n: 1, t: '"><img src=x onerror=alert(1)>', url: 'modulos/accesos.html' }] })
  chk('el texto del pie va escapado', !h.includes('<img') && h.includes('&quot;&gt;&lt;img'), h)
  const b = S.htmlBurbujaBarra({ total: 1, detalle: ['1 "><img src=x onerror=alert(1)>'] })
  chk('el detalle de la burbuja de la barra va escapado (también las comillas)', !b.includes('<img') && b.includes('&quot;&gt;&lt;img'), b)
  const caido = T.htmlTarjeta({ clave: 'caja', nombre: 'Caja', url: 'modulos/caja.html', tamano: 'mediana' }, { estado: 'ok', valor: '$ 1', resolver: [], pendError: true })
  chk('si mis_pendientes falló, el pie dice que no se pudo saber (nunca "Nada pendiente")', caido.includes('No se pudo saber qué hay pendiente.') && !caido.includes('Nada pendiente'))
}

// --- con la RPC: error, repetir, respuesta vieja -------------------------
const esperas = []
esperas.push((async () => {
  const vis = new Set(['caja'])
  const cargador = { caja: async () => ({ estado: 'ok', valor: '$ 1', resolver: [] }) }
  const bien = await T.cargarTarjeta('caja', ctxFalso(T, { visibles: vis, pend: Promise.resolve(T.mapaPendientes([{ modulo: 'caja', clave: 'solicitudes_mi_caja', cantidad: 3 }])) }), cargador)
  chk('antes del error había renglón', bien.resolver.length === 1 && bien.resolver[0].n === 3)
  const mal = await T.cargarTarjeta('caja', ctxFalso(T, { visibles: vis, pend: Promise.resolve(null) }), cargador)
  chk('con error: ningún número (nunca uno viejo), y el pie lo dice', mal.resolver.length === 0 && mal.pendError === true)
  const rota = await T.cargarTarjeta('caja', ctxFalso(T, { visibles: vis, pend: Promise.reject(new Error('red caída')) }), cargador)
  chk('con excepción: ningún número', rota.resolver.length === 0 && rota.pendError === true)
  const otra = await T.cargarTarjeta('caja', ctxFalso(T, { visibles: vis, pend: Promise.resolve(T.mapaPendientes([{ modulo: 'caja', clave: 'solicitudes_mi_caja', cantidad: 1 }])) }), cargador)
  chk('volver a cargar no duplica el renglón', otra.resolver.length === 1)
  // Respuesta vieja que llega tarde no pisa la nueva.
  const estado = { modelos: new Map(), turnos: new Map() }
  let soltar
  const vieja = T.refrescarTarjeta(estado, 'caja', {}, () => {}, () => new Promise(r => { soltar = () => r({ estado: 'ok', valor: '9' }) }))
  await T.refrescarTarjeta(estado, 'caja', {}, () => {}, async () => ({ estado: 'ok', valor: '1' }))
  soltar(); await vieja
  chk('la respuesta vieja no pisa la nueva', estado.modelos.get('caja').valor === '1')
})())

// --- estático: una sola llamada al abrir, otra al volver a la pestaña -----
{
  const sinComentarios = src.replace(/^\s*\/\/.*$/gm, '')
  const tab = (require('./imports').leerJs('tablero.js') || '').replace(/^\s*\/\/.*$/gm, '')
  chk('se pide mis_pendientes al cargar el tablero', /sb\.rpc\('mis_pendientes'\)/.test(tab) && /estado\.listo = true\s*\n\s*cargarTodo\(\)/.test(tab))
  chk('se vuelve a pedir al volver a la pestaña', /visibilitychange[\s\S]{0,120}visibilityState === 'visible'[\s\S]{0,40}cargarTodo\(\)/.test(tab))
  chk('la consulta vieja a solicitudes_acceso ya no está', !/from\('solicitudes_acceso'\)/.test(sinComentarios))
  chk('cada tarjeta lleva su clave (data-tarjeta)', /data-tarjeta="\$\{escTab\(t\.clave\)\}"/.test(tab))
}

Promise.all(esperas).catch(e => chk('rama async sin excepción', false, e && e.stack)).then(() => {
  console.log(fallas.map(f => '  ✗ ' + f).join('\n'))
  console.log(`${ok}/${ok + fallas.length} ${fallas.length ? 'ROJO' : 'verde'}`)
  process.exit(fallas.length ? 1 : 0)
})
