// La barra de unidad en la CARGA de órdenes de retiro (28/09/2026).
//
// La empresa de una orden es la de un registro NUEVO: la pregunta queda, pero
// con una unidad elegida arriba en la que se puede cargar, la orden arranca con
// esa sin preguntar. Una orden a medio cargar NO cambia de empresa porque la
// barra cambie. Con "Todas" o con una unidad donde no carga, se pregunta como
// antes.
//
//   node pruebas/test-retiros-barra-unidad.js
'use strict'

const path = require('path')
const fs = require('fs')
const { construirRetiros } = require('./sandbox-retiros')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/retiros.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, fin } = arnes()
const nuevo = (barra = null) => {
  const S = construirRetiros(ARCHIVO)
  S.estado.misTareas = new Map([['retiros:cargar', { todas: true }]])
  S.estado.unidadBarra = barra
  return S
}

{
  const S = nuevo('u-d')
  S.empezarOrden()
  chk('con Dolce Pasta elegida arriba, la orden arranca en Dolce Pasta sin preguntar', S.estado.vista === 'rt-vista-form' && S.estado.empresaId === 'u-d')
  chk('y se puede cambiar (hay "Cambiar")', /rt-btn-cambiar-empresa/.test(S.htmlEmpresaActual()))
}
{
  const S = nuevo(null)
  S.empezarOrden()
  chk('con Todas arriba, pregunta como siempre', S.estado.vista === 'rt-vista-empresa' && S.estado.empresaId === null)
}
{
  const S = nuevo('u-taller')
  S.empezarOrden()
  chk('con una unidad donde no carga, pregunta (no inventa una empresa)', S.estado.vista === 'rt-vista-empresa' && S.estado.empresaId === null)
}
{
  const S = nuevo(null)
  S.empezarOrden()
  S.alCambiarLaBarra('u-n')
  chk('la barra cambia con la pregunta en pantalla: la orden pasa a esa empresa', S.estado.empresaId === 'u-n' && S.estado.vista === 'rt-vista-form')
  S.alCambiarLaBarra('u-d')
  chk('con la orden vacía, la sigue', S.estado.empresaId === 'u-d')
  S.estado.form.clienteId = 'c1'
  S.alCambiarLaBarra('u-n')
  chk('con una orden a medio cargar NO cambia de empresa', S.estado.empresaId === 'u-d' && S.estado.form.clienteId === 'c1')
  S.alCambiarLaBarra(null)
  chk('volver a Todas no toca la orden', S.estado.empresaId === 'u-d')
  chk('la barra queda anotada', S.estado.unidadBarra === null)
}
{
  const S = construirRetiros(ARCHIVO)
  S.estado.misTareas = new Map([['retiros:cargar', { unidades: ['u-n'] }]])
  chk('empresaDeLaBarra: solo si se puede cargar ahí', S.empresaDeLaBarra(S.empresasDeCarga(), 'u-n')?.id === 'u-n' && S.empresaDeLaBarra(S.empresasDeCarga(), 'u-d') === null && S.empresaDeLaBarra(S.empresasDeCarga(), null) === null)
}
chk('la página importa la barra', /import \{ unidadesDeLaBarra, alCambiarUnidad \} from '\.\.\/js\/barra-unidad\.js'/.test(src))

fin()
