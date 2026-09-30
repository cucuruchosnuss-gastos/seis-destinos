// La barra de unidad en Administración (28/09/2026). La empresa la decide la
// barra de arriba: nunca dos lugares para lo mismo.
//  - Con una unidad elegida donde hay Administración, es esa y el selector de
//    acá no se dibuja.
//  - Con una unidad donde NO hay, se dice, y quedan solo las secciones que no
//    son de una empresa (Cheques, Cobranzas por asentar).
//  - Con "Todas", órdenes, clientes, listas e importar necesitan UNA empresa:
//    se pide elegirla acá mismo (regla f), sin cambiar la barra.
//  - Cambiar la barra con la pantalla abierta cambia la empresa y vuelve a la
//    portada; una vista global (Cheques, Cobranzas) no se toca.
//
//   node pruebas/test-administracion-barra-unidad.js
'use strict'

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, fin } = arnes()

function nuevo(barra = null) {
  const S = construirAdministracion(ARCHIVO)
  S.estado.misTareas = new Map([['retiros:ver', { todas: true }], ['retiros:precios', { todas: true }]])
  S.estado.empresas = [...S.estado.empresas, { id: 'u-t', nombre: 'Taller', prefijo: 'T' }]
  S.estado.misTareas.set('retiros:ver', { unidades: ['u-n', 'u-d'] })
  S.estado.misTareas.set('retiros:precios', { unidades: ['u-n', 'u-d'] })
  S.estado.unidadBarra = barra
  return S
}

{
  const S = nuevo(null)
  chk('Todas: la empresa se elige acá (undefined = elegir)', S.empresaSegunBarra() === undefined)
  const h = S.htmlEmpresas()
  chk('Todas: dibuja el selector con las dos empresas y dice por qué', /data-empresa="u-n"/.test(h) && /data-empresa="u-d"/.test(h) && /Con "Todas" elegido arriba, elegí acá/.test(h))
}
{
  const S = nuevo('u-d')
  chk('una unidad de Administración: es esa', S.empresaSegunBarra() === 'u-d')
  chk('y el selector de acá no se dibuja', S.htmlEmpresas() === '')
}
{
  const S = nuevo('u-t')
  chk('una unidad sin Administración: null', S.empresaSegunBarra() === null)
  const h = S.htmlEmpresas()
  chk('lo dice, con el nombre de la unidad', /Con Taller elegida arriba no tenés órdenes, clientes ni precios/.test(h) && !/data-empresa=/.test(h))
  chk('sin empresa, las secciones de una empresa no se ven', !S.seccionesVisibles(null).some(s => !s.global))
}
{
  const S = nuevo(null)
  S.estado.empresaId = 'u-n'
  S.estado.vista = 'ad-vista-ordenes'
  S.estado.ordenes = [{ id: 'o1' }]
  S.alCambiarLaBarra('u-d')
  chk('la barra cambia: la empresa la sigue', S.estado.empresaId === 'u-d' && S.estado.unidadBarra === 'u-d')
  chk('y se descarta lo leído de la otra empresa', S.estado.ordenes === null && S.estado.clientes === null)
  chk('y vuelve a la portada', S.estado.vista === 'ad-vista-inicio')
  chk('el selector de acá se va', S.__els.get('ad-empresas')?.innerHTML === '')
  S.alCambiarLaBarra('u-t')
  chk('una unidad sin Administración deja la empresa en null', S.estado.empresaId === null)
  S.alCambiarLaBarra(null)
  chk('Todas: la empresa se conserva y aparece el selector para elegir', S.estado.empresaId === null && /data-empresa="u-n"/.test(S.__els.get('ad-empresas')?.innerHTML ?? ''))
}
{
  const S = nuevo(null)
  S.estado.empresaId = 'u-n'
  S.estado.vista = 'ad-vista-cheques'
  S.alCambiarLaBarra('u-d')
  chk('en una vista global (Cheques) la empresa cambia pero la vista no', S.estado.empresaId === 'u-d' && S.estado.vista === 'ad-vista-cheques')
}
{
  const S = nuevo('u-t')
  S.estado.empresas = [...S.estado.empresas.filter(e => e.id !== 'u-t'), { id: 'u-t', nombre: marca('unidad') }]
  chk('el nombre de la unidad va escapado', !/<b data-xss=/.test(S.htmlEmpresas()))
}
chk('la página importa la barra', /import \{ unidadesDeLaBarra, alCambiarUnidad[^}]*\} from '\.\.\/js\/barra-unidad\.js'/.test(src))
chk('init respeta la barra antes que la preferencia guardada', /const segun = empresaSegunBarra\(lista\)\n\s+estado\.empresaId = segun === undefined \? empresaInicial\(lista, leerPreferencia\(CLAVE_EMPRESA\)\) : segun/.test(src))

fin()
