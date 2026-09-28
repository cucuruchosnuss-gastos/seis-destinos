// La barra de unidad en la GESTIÓN de Producción (28/09/2026). La unidad de
// toda la gestión (indicadores, historial, stock terminado, configuración) la
// decide la barra de arriba:
//  - con una unidad donde la persona ve Producción, es esa y los selectores
//    de la gestión no se dibujan;
//  - con una donde NO ve Producción, lo dice (en los indicadores y al abrir
//    cualquier sección) y no abre nada con otra unidad;
//  - con "Todas", todo en la gestión es de UNA unidad: se elige ahí mismo
//    (regla f), con la guardada si todavía vale;
//  - cambiar la barra con la pantalla abierta la sigue.
//
//   node pruebas/test-produccion-gestion-barra-unidad.js
'use strict'

const { arnes, leer, marca } = require('./circuito-comun')
const { construirProduccion, GESTION } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_GESTION || process.env.ARCHIVO_TEST || GESTION
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

function armar(barra = null) {
  const S = construirProduccion(ARCHIVO)
  S.estado.miRolApp = 'usuario'
  S.estado.misTareas = new Map([['ver', { unidades: ['u-cn', 'u-dp'] }], ['configurar', { unidades: ['u-cn', 'u-dp'] }]])
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss'], ['u-dp', 'Dolce Pasta'], ['u-ta', 'Taller']])
  S.estado.unidadId = 'u-cn'
  S.estado.unidadBarra = barra
  S.__setRpc(async () => ({ data: null, error: null }))
  return S
}

{
  const S = armar(null)
  chk('Todas: la unidad se elige acá (undefined)', S.unidadSegunBarra() === undefined)
  chk('Todas: sin sección bloqueada', S.sinUnidadPorBarra() === false)
  S.pintarSelectorGestion()
  chk('Todas: el selector de arriba se dibuja (hay dos unidades)', S.__doc.getElementById('pr-gestion-unidad-campo').hidden === false)
}
{
  const S = armar('u-dp')
  chk('una unidad de la gestión: es esa', S.unidadSegunBarra() === 'u-dp')
  S.pintarSelectorGestion()
  chk('con la barra fija, el selector de arriba no se dibuja', S.__doc.getElementById('pr-gestion-unidad-campo').hidden === true)
}
{
  const S = armar('u-ta')
  chk('una unidad sin Producción: null', S.unidadSegunBarra() === null && S.sinUnidadPorBarra() === true)
  chk('el aviso nombra la unidad', /Con Taller elegida arriba no tenés Producción\. Elegí otra unidad o "Todas"\./.test(S.textoSinProduccionEnBarra()))
}
esperas.push((async () => {
  const S = armar('u-ta')
  S.estado.unidadId = null
  await S.cargarIndicadores()
  const h = S.__doc.getElementById('pr-indicadores').innerHTML
  chk('los indicadores lo dicen, sin pedir nada a la base', /no tenés Producción/.test(h) && !S.__llamadas.rpc.some(r => r[0] === 'indicadores_produccion'))
  await S.mostrarHistorial()
  await S.mostrarStockTerminado()
  await S.mostrarConfig('maquinas')
  chk('ninguna sección abre con otra unidad: avisan', S.__llamadas.errores.filter(e => /no tenés Producción/.test(e)).length === 3)
})())
esperas.push((async () => {
  const S = armar(null)
  S.estado.vista = 'pr-inicio'
  S.alCambiarLaBarra('u-dp')
  chk('la barra cambia: la gestión la sigue', S.estado.unidadId === 'u-dp' && S.estado.unidadBarra === 'u-dp')
  S.alCambiarLaBarra('u-ta')
  chk('a una unidad sin Producción: sin unidad', S.estado.unidadId === null)
  S.alCambiarLaBarra(null)
  S.pintarSelectorGestion()
  chk('volver a Todas: aparece el selector para elegir', S.estado.unidadBarra === null && S.__doc.getElementById('pr-gestion-unidad-campo').hidden === false)
})())
{
  const S = armar('u-ta')
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss'], ['u-dp', 'Dolce Pasta'], ['u-ta', marca('unidad')]])
  chk('el nombre de la unidad es texto (lo escapa quien lo pinta)', S.textoSinProduccionEnBarra().includes('data-xss'))
  chk('y los indicadores lo escapan', /cont\.innerHTML = sinUnidadPorBarra\(\) \? `<div class="pr-aviso">\$\{esc\(textoSinProduccionEnBarra\(\)\)\}<\/div>`/.test(FUENTE))
}
chk('la página importa la barra', /import \{ unidadesDeLaBarra, alCambiarUnidad \} from '\.\.\/js\/barra-unidad\.js'/.test(FUENTE))
chk('los selectores de cada sección tampoco con la barra fija', /toggleAttribute\?\.\('hidden', unidades\.length < 2 \|\| !!estado\.unidadBarra\)/.test(FUENTE))

fin()
