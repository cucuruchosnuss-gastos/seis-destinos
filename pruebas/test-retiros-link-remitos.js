// EL LINK A REMITOS DOLCE EN LA CARGA (28/10/2026, rama
// ci-prueba/modulo-remitos-dolce). "Subir remitos Rosario" se mudó a su
// propio módulo (test-remitos-dolce-subir.js); en la Carga queda un link
// chico "Remitos Dolce →", solo con retiros:cargar en una fábrica sin
// control de stock, en la elección de fábrica, en "Mis retiros" y mientras
// se busca el cliente. Se EJECUTAN las funciones reales de modulos/retiros.html.
//
//   node pruebas/test-retiros-link-remitos.js
'use strict'

const path = require('path')
const { construirRetiros } = require('./sandbox-retiros')
const { arnes, leer } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/retiros.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

function armar({ tareas, sinControl = ['u-d'], rol = 'usuario' } = {}) {
  const S = construirRetiros(ARCHIVO)
  S.estado.miRolApp = rol
  S.estado.misTareas = new Map(tareas ?? [['retiros:cargar', { todas: true }]])
  S.estado.sinControlIds = new Set(sinControl)
  return S
}

// ═══ Quién ve el link ═════════════════════════════════════════════════════
{
  chk('con retiros:cargar en todas y Dolce sin control: hay link', armar().puedeSubirRemitos())
  chk('cargar solo en Nuss: no hay link', !armar({ tareas: [['retiros:cargar', { unidades: ['u-n'] }]] }).puedeSubirRemitos())
  chk('cargar con alcance en Dolce: hay link', armar({ tareas: [['retiros:cargar', { unidades: ['u-d'] }]] }).puedeSubirRemitos())
  chk('solo retiros:ver: no hay link', !armar({ tareas: [['retiros:ver', { todas: true }]] }).puedeSubirRemitos())
  chk('super_admin: hay link', armar({ tareas: [], rol: 'super_admin' }).puedeSubirRemitos())
  chk('todas con control: no hay link', !armar({ sinControl: [] }).puedeSubirRemitos())
  const S = armar()
  S.estado.sinControlIds = null
  chk('sin saber todavía qué fábricas controlan: no hay link', !S.puedeSubirRemitos())
}
for (const [filas, error, esperado, nombre] of [
  [[{ id: 'u-n', controla_stock_terminado: true }, { id: 'u-d', controla_stock_terminado: false }], null, 'u-d', 'false → sin control'],
  [[{ id: 'u-d', controla_stock_terminado: null }], null, '', 'null → con control'],
  [[{ id: 'u-x', controla_stock_terminado: false }], null, '', 'una fábrica donde no carga no cuenta'],
  [null, { message: 'x' }, '', 'si no se puede leer → ninguna'],
]) {
  esperas.push((async () => {
    const S = armar({ sinControl: [] })
    S.__tablas.unidades_negocio = () => ({ data: filas, error })
    await S.leerFabricasSinControl()
    chk(`leerFabricasSinControl: ${nombre}`, [...S.estado.sinControlIds].join() === esperado, [...S.estado.sinControlIds].join())
  })())
}

// ═══ Dónde se ve (la llamada real de pintarEncabezado) ═══════════════════
{
  const S = armar()
  const entrada = () => S.__els.get('rt-remitos-entrada')
  for (const [vista, paso, visible] of [
    ['rt-vista-empresa', null, true], ['rt-vista-mis', null, true], ['rt-vista-form', 'cliente', true],
    ['rt-vista-form', 'orden', false], ['rt-vista-form', 'productos', false], ['rt-vista-resumen', null, false], ['rt-vista-hecho', null, false],
  ]) {
    S.pintarEntradaRemitos(vista, paso)
    chk(`el link en ${vista}${paso ? ' · ' + paso : ''}: ${visible ? 'se ve' : 'no se ve'}`, entrada().hidden === !visible)
  }
  S.estado.vista = 'rt-vista-mis'
  S.pintarEncabezado()
  chk('pintarEncabezado() prende el link', entrada().hidden === false)
  S.estado.sinControlIds = new Set()
  S.pintarEncabezado()
  chk('sin fábrica sin control, pintarEncabezado() lo apaga', entrada().hidden === true)
}

// ═══ En la página: el link y nada más ════════════════════════════════════
{
  chk('el link chico "Remitos Dolce →" a la pestaña Subir, escondido de entrada',
    /<div class="rt-remitos-entrada" id="rt-remitos-entrada" hidden>\s*<a class="rt-link-remitos" id="rt-link-remitos" href="remitos-dolce\.html\?pestana=subir">Remitos Dolce →<\/a>/.test(FUENTE))
  const sinComentarios = FUENTE.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
  chk('ya no está "Subir remitos Rosario" ni "Mis remitos subidos"', !/Subir remitos Rosario|Mis remitos subidos/.test(sinComentarios))
  chk('ni la pantalla de subir ni su flecha', !/id="rt-vista-remitos"|id="rt-remitos-volver"|id="rt-remitos-camara"/.test(FUENTE))
  chk('ni la cola, la lectura ni la lista', !/function (encolarFotos|procesarRemito|leerRemitoConIa|leerMisRemitos|pintarRemitos)\(/.test(FUENTE) && !/crear_remito_precarga|ocr-remito/.test(FUENTE.replace(/\/\/[^\n]*/g, '')))
  chk('al arrancar se lee qué fábricas no controlan el stock, sin esperar', /\n\s+leerFabricasSinControl\(\)\.then\(/.test(FUENTE))
}

fin()
