// Suite: el aviso "¿Es de un proyecto del Taller? Elegí Taller." del wizard
// de Gastos (02/10/2026).
//
// En el paso donde se elige la empresa del gasto, si se eligió una que NO es
// el Taller, va en chico debajo de las empresas (y arriba de las categorías,
// porque tocar una empresa avanza solo hasta ahí) el texto "¿Es de un
// proyecto del Taller? Elegí Taller.". Solo si hay al menos un proyecto
// abierto y la persona puede elegir el Taller. Por Vehículos no aparece.
// "Elegí Taller." hace lo mismo que tocar la tarjeta del Taller.
//
// Se EJECUTA el código real (debeAvisarTaller, pintarAvisoTaller,
// elegirTaller) con un document falso.
//
//   node pruebas/test-gastos-aviso-taller.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-gastos-aviso-taller.js

const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { extraerFn } = require('./extraer')
const { preludioFabrica } = require('./fabrica-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/gastos.html')
const FUENTE = leer(ARCHIVO)
const { chk, fin } = arnes()

const TALLER = 'u-t', NUSS = 'u-n', PRUEBAS = 'u-x'

const PRELUDIO = preludioFabrica() + `
  var console = { log(){}, warn(){}, error(){} }
  function nuevoEl(id) {
    const el = { id, innerHTML: '', textContent: '', value: '', hidden: false, style: {}, dataset: {}, __on: {},
      addEventListener(t, f) { el.__on[t] = f } }
    return el
  }
  var __els = new Map()
  var document = { getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) } }
  var __pasos = []
  function irASubpaso(id) { __pasos.push(id) }
  var unidadSeleccionada = null, vehiculoSeleccionado = 'v-1', vehiculoFueElegido = true, viaVehiculos = false
  var estado = {
    fabrica: FABRICA_SIN_DATOS,
    maestros: {
      unidades: [{ id: '${NUSS}', nombre: 'Cucuruchos Nuss', prefijo: 'N' }, { id: '${TALLER}', nombre: 'Taller', prefijo: 'T' }],
      proyectos: [{ id: 'p-1', nombre: 'Máquina <b>x</b>', activo: true, estado: 'en_curso' }],
    },
  }
`
const FUNCIONES = ['esc', 'esUnidadTaller', 'unidadesElegibles', 'unidadTallerElegible', 'debeAvisarTaller', 'pintarAvisoTaller', 'elegirTaller']
const CONSTANTES = ['TEXTO_AVISO_TALLER']
const RETORNO = `estado, __el(id){ return document.getElementById(id) }, __pasos,
  __set(k, v){ eval(k + ' = v') }, __get(k){ return eval(k) }`

function sb() { return construirCon(ARCHIVO, { preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES, retorno: RETORNO }) }
const ids = ['aviso-taller-destino', 'aviso-taller-categoria']
const visibles = S => ids.filter(id => S.__el(id).hidden === false)

// ── 1. Cuándo aparece ───────────────────────────────────────────────────────
{
  const S = sb()
  S.__set('unidadSeleccionada', NUSS)
  chk('otra empresa + un proyecto abierto: avisa', S.debeAvisarTaller() === true)
  S.pintarAvisoTaller()
  chk('se ve debajo de las empresas y arriba de las categorías', visibles(S).length === 2, visibles(S).join(','))
  const h = S.__el('aviso-taller-destino').innerHTML
  chk('dice "¿Es de un proyecto del Taller? Elegí Taller."', h.replace(/<[^>]+>/g, '') === '¿Es de un proyecto del Taller? Elegí Taller.', h)
  chk('"Elegí Taller." es un botón', /<button type="button" class="aviso-taller__link" data-elegir-taller>Elegí Taller\.<\/button>/.test(h))
  chk('no muestra el nombre de ningún proyecto', !/Máquina/.test(h))

  S.__set('unidadSeleccionada', TALLER)
  chk('eligió el Taller: no avisa', S.debeAvisarTaller() === false)
  S.pintarAvisoTaller()
  chk('eligió el Taller: no se ve y queda vacío', visibles(S).length === 0 && S.__el('aviso-taller-destino').innerHTML === '')

  S.__set('unidadSeleccionada', null)
  chk('sin empresa elegida: no avisa', S.debeAvisarTaller() === false)

  S.__set('unidadSeleccionada', NUSS); S.__set('viaVehiculos', true)
  chk('por Vehículos: no avisa', S.debeAvisarTaller() === false)
  S.__set('viaVehiculos', false)

  S.estado.maestros.proyectos = []
  chk('sin proyectos abiertos: no avisa', S.debeAvisarTaller() === false)
  S.pintarAvisoTaller()
  chk('sin proyectos abiertos: no se ve', visibles(S).length === 0)
  S.estado.maestros.proyectos = null
  chk('proyectos sin cargar (null): no avisa ni rompe', S.debeAvisarTaller() === false)
}
{
  const S = sb()
  S.estado.maestros.unidades = [{ id: NUSS, nombre: 'Cucuruchos Nuss', prefijo: 'N' }]
  S.__set('unidadSeleccionada', NUSS)
  chk('sin el Taller entre sus empresas: no avisa', S.debeAvisarTaller() === false)
}
{
  const S = sb()
  S.estado.maestros.unidades = [{ id: NUSS, nombre: 'Cucuruchos Nuss', prefijo: 'N' }, { id: TALLER, nombre: 'Taller' }]
  S.__set('unidadSeleccionada', NUSS)
  chk('el Taller sin prefijo se reconoce por el nombre', S.debeAvisarTaller() === true)
}

// ── 2. "Elegí Taller." ──────────────────────────────────────────────────────
{
  const S = sb()
  S.__set('unidadSeleccionada', NUSS)
  S.elegirTaller()
  chk('"Elegí Taller." pone el Taller', S.__get('unidadSeleccionada') === TALLER)
  chk('y va a las categorías', S.__pasos.join(',') === 'categoria', S.__pasos.join(','))
  chk('suelta el vehículo elegido', S.__get('vehiculoSeleccionado') === null && S.__get('vehiculoFueElegido') === false && S.__get('viaVehiculos') === false)
}

// ── 3. Dónde se pinta ───────────────────────────────────────────────────────
{
  const g = extraerFn(FUENTE, 'renderizarGrillaDestino') || ''
  chk('la grilla de empresas pinta el aviso', /actualizarBotonDestinoSiguiente\(\)\n\s*pintarAvisoTaller\(\)/.test(g))
  chk('el paso Categoría pinta el aviso', /if \(id === 'categoria'\) \{\n\s*renderizarGrillaCategorias\(\)\n\s*pintarAvisoTaller\(\)/.test(FUENTE))
  chk('debajo de la grilla de empresas', /<div class="grilla-destino" id="grilla-destino"><\/div>\n\s*<p class="aviso-taller" id="aviso-taller-destino" hidden><\/p>/.test(FUENTE))
  chk('arriba de las categorías', /¿Qué categoría es\?<\/h2>[\s\S]{0,200}<p class="aviso-taller aviso-taller--arriba" id="aviso-taller-categoria" hidden><\/p>/.test(FUENTE))
  chk('tocar "Elegí Taller." llama a elegirTaller', /if \(ev\.target\.closest\('\[data-elegir-taller\]'\)\) elegirTaller\(\)/.test(FUENTE))
  chk('en chico', /\.aviso-taller \{\n\s*margin: 0\.75rem 0 0;\n\s*font-size: 0\.8125rem;/.test(FUENTE))
}

fin()
