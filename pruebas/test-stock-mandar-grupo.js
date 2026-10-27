// "MANDAR A OTRA EMPRESA DEL GRUPO" EN STOCK (26/10/2026, rama
// ci-prueba/mandar-a-otra-empresa). Para mandar mercadería a otra empresa del
// grupo se usa la ORDEN DE RETIRO a esa empresa como cliente
// (clientes.unidad_grupo_id): lleva producto terminado e insumos juntos y
// entra en su stock con los mismos lotes (_orden_grupo_espejar, leída con
// pg_get_functiondef el 26/10/2026). Lo que se prueba, con las funciones
// REALES de modulos/stock.html:
//  - el tercer botón de la entrada (#btn-entrada-grupo) y el que reemplaza a
//    "Enviar a otra unidad" (#btn-mandar-grupo): visibles con retiros:cargar
//    en la fábrica de la barra (con "Todas", en alguna);
//  - qué clientes se leen (los de esas fábricas con unidad_grupo_id) y con qué
//    nombre de empresa;
//  - con UNA empresa, derecho a retiros.html?cliente=<id>; con varias, se
//    elige; sin ninguna o con error, se dice; todo escapado;
//  - el botón de crear transferencias nuevas ya no está, y ver / aceptar /
//    rechazar las que hay sigue en su lugar.
//
//   node pruebas/test-stock-mandar-grupo.js
//   ARCHIVO_TEST=<copia de modulos/stock.html> node pruebas/test-stock-mandar-grupo.js
'use strict'

const path = require('path')
const fs = require('fs')
const { construirCon } = require('./sandbox')
const { arnes, leer, marca, escapada } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos', 'stock.html')
leer(ARCHIVO)
const HTML = fs.readFileSync(ARCHIVO, 'utf8')
const { chk, esperas, fin } = arnes()

const PRELUDIO = `
  var console = { log(){}, warn(){}, error(){} }
  var __els = new Map()
  function __el(id) {
    if (!__els.has(id)) __els.set(id, { id, hidden: true, innerHTML: '', textContent: '', dataset: {}, scrollIntoView() {} })
    return __els.get(id)
  }
  var document = { getElementById: __el }
  var __idas = []
  var __consultas = []
  var __tablas = {}
  var supabase = {
    from(t) {
      const filtros = []
      const q = {
        select(c) { filtros.push(['select', c]); return q }, eq(a, b) { filtros.push(['eq', a, b]); return q },
        in(a, b) { filtros.push(['in', a, b]); return q }, not(a, o, b) { filtros.push(['not', a, o, b]); return q },
        order(a) { filtros.push(['order', a]); return q },
        then(res, rej) {
          __consultas.push([t, filtros])
          const x = __tablas[t]
          const r = typeof x === 'function' ? x(filtros) : { data: x ?? [], error: null }
          return Promise.resolve(r).then(res, rej)
        },
      }
      return q
    },
  }
  var estado = {
    miRolApp: 'usuario', misTareas: new Set(), alcancesTareas: new Map(),
    unidadBarra: null, unidadesBarra: [], unidadesStock: [], grupo: null,
  }
`
const FUNCIONES = ['esc', 'puedeTareaEn', 'nombreDeUnidadBarra', 'fabricasParaMandar', 'pintarMandarGrupo', 'leerClientesGrupo',
  'urlMandarGrupo', 'irA', 'mandarAOtraEmpresa', 'htmlPanelGrupo', 'pintarPanelGrupo', 'cerrarPanelGrupo']

function armar({ alcance = { unidades: ['u-n'] }, barra = null, rol = 'usuario' } = {}) {
  const S = construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES,
    retorno: 'estado, __el, __idas, __consultas, __tablas',
    // irA() navega: en la prueba se anota adónde iría.
    recortar: (src) => src.replace(/function irA\(url\) \{\n\s*window\.location\.href = url\n\s*\}/, 'function irA(url) {\n      __idas.push(url)\n    }'),
  })
  S.estado.miRolApp = rol
  if (alcance) { S.estado.misTareas.add('retiros:cargar'); S.estado.alcancesTareas.set('retiros:cargar', alcance) }
  S.estado.unidadBarra = barra
  S.estado.unidadesBarra = [{ id: 'u-n', nombre: 'Cucuruchos Nuss' }, { id: 'u-d', nombre: 'Dolce Pasta' }, { id: 'u-m', nombre: 'Mengui' }]
  S.estado.unidadesStock = [{ id: 'u-n', nombre: 'Cucuruchos Nuss' }, { id: 'u-d', nombre: 'Dolce Pasta' }]
  return S
}
const NOMBRES = [{ id: 'u-n', nombre: 'Cucuruchos Nuss' }, { id: 'u-d', nombre: 'Dolce Pasta' }, { id: 'u-m', nombre: 'Mengui' }]
const DOLCE_EN_NUSS = { id: 'c-dolce', nombre: 'DOLCE PASTA SRL', unidad_negocio_id: 'u-n', unidad_grupo_id: 'u-d' }
const NUSS_EN_DOLCE = { id: 'c-paz', nombre: 'PAZ, MIRTA', unidad_negocio_id: 'u-d', unidad_grupo_id: 'u-n' }

// ═══ La pantalla: los botones ═════════════════════════════════════════════
{
  const eleccion = HTML.slice(HTML.indexOf('<div class="stock-eleccion" id="stock-eleccion"'), HTML.indexOf('<div class="pestanas-stock"'))
  chk('el tercer botón vive en la entrada (#stock-eleccion)', /id="btn-entrada-grupo"/.test(eleccion))
  chk('dice "Mandar a otra empresa del grupo"', /id="btn-entrada-grupo"[^>]*>\s*<span class="stock-eleccion__titulo">Mandar a otra empresa del grupo<\/span>/.test(eleccion))
  chk('arranca escondido (sin permiso no aparece ni un instante)', /id="btn-entrada-grupo" hidden>/.test(eleccion))
  chk('es grande y a lo ancho, como los otros dos', /\.stock-eleccion__opcion--grupo \{ grid-column: 1 \/ -1;/.test(HTML) && /class="stock-eleccion__opcion stock-eleccion__opcion--grupo"/.test(eleccion))
  chk('el panel para elegir la empresa existe', /<div class="stock-grupo" id="stock-grupo"[^>]*hidden><\/div>/.test(HTML))
  // (El modal de transferencia sigue en el código con su título: solo se fue el botón.)
  chk('"Enviar a otra unidad" ya no está', !/btn-enviar-transferencia/.test(HTML) && !/<button[^>]*>Enviar a otra unidad</.test(HTML))
  chk('en su lugar, "Mandar a otra empresa del grupo"', /<button type="button" class="btn-stock btn-stock--chico" id="btn-mandar-grupo" hidden>Mandar a otra empresa del grupo<\/button>/.test(HTML))
  chk('los dos botones llaman a mandarAOtraEmpresa',
    /getElementById\('btn-mandar-grupo'\)\.addEventListener\('click', mandarAOtraEmpresa\)/.test(HTML) &&
    /getElementById\('btn-entrada-grupo'\)\.addEventListener\('click', mandarAOtraEmpresa\)/.test(HTML))
  chk('nada abre el modal de transferencia nueva', !/addEventListener\('click', abrirModalTransferencia\)/.test(HTML))
  // Ver, aceptar y rechazar las pendientes y el historial siguen igual.
  chk('"En tránsito" sigue', /id="btn-ver-transito"/.test(HTML))
  for (const f of ['renderizarTransito', 'renderizarTransfHistorial', 'abrirModalTransferencia'])
    chk(`${f} sigue en el código`, new RegExp(`function ${f}\\(`).test(HTML))
  chk('al cambiar la barra se repintan los botones y se cierra el panel',
    /async function alCambiarBarra\(e\) \{\n\s*aplicarEstadoBarra\(e\)\n\s*\/\/[^\n]*\n\s*cerrarPanelGrupo\(\)\n\s*pintarMandarGrupo\(\)/.test(HTML))
  chk('init los pinta con la barra ya leída', /await estado\.barraLista\n[^\n]*\n(\s*\/\/[^\n]*\n)*\s*pintarMandarGrupo\(\)/.test(HTML))
}

// ═══ Quién lo ve ══════════════════════════════════════════════════════════
{
  let S = armar({ barra: 'u-n' })
  chk('con retiros:cargar en la fábrica de la barra: esa', JSON.stringify(S.fabricasParaMandar()) === '["u-n"]')
  S.pintarMandarGrupo()
  chk('… y los dos botones se ven', S.__el('btn-entrada-grupo').hidden === false && S.__el('btn-mandar-grupo').hidden === false)

  S = armar({ barra: 'u-d' })
  chk('en otra fábrica de la barra sin el permiso: ninguna', S.fabricasParaMandar().length === 0)
  S.pintarMandarGrupo()
  chk('… y ningún botón', S.__el('btn-entrada-grupo').hidden === true && S.__el('btn-mandar-grupo').hidden === true)

  S = armar({ barra: null })
  chk('con "Todas": las de la barra donde tiene el permiso', JSON.stringify(S.fabricasParaMandar()) === '["u-n"]')
  S = armar({ barra: null, alcance: { todas: true } })
  chk('con alcance a todas y "Todas": todas, sin repetir', JSON.stringify(S.fabricasParaMandar()) === '["u-n","u-d","u-m"]')
  S = armar({ barra: null, alcance: null })
  chk('sin retiros:cargar: ninguna', S.fabricasParaMandar().length === 0)
  S.pintarMandarGrupo()
  chk('… y ningún botón (aunque vea el stock)', S.__el('btn-entrada-grupo').hidden === true && S.__el('btn-mandar-grupo').hidden === true)
  S = armar({ barra: 'u-m', alcance: null, rol: 'super_admin' })
  chk('super_admin: la de la barra', JSON.stringify(S.fabricasParaMandar()) === '["u-m"]')
}

// ═══ Una sola empresa: derecho a la Carga ═════════════════════════════════
esperas.push((async () => {
  const S = armar({ barra: 'u-n' })
  S.__tablas.clientes = [DOLCE_EN_NUSS]
  S.__tablas.unidades_negocio = NOMBRES
  await S.mandarAOtraEmpresa()
  chk('con una sola empresa va derecho a la Carga con el cliente', JSON.stringify(S.__idas) === '["retiros.html?cliente=c-dolce"]', JSON.stringify(S.__idas))
  chk('… sin dejar el panel abierto', S.__el('stock-grupo').hidden === true && S.estado.grupo === null)
  const [t, f] = S.__consultas[0]
  chk('lee clientes', t === 'clientes')
  chk('… de las fábricas donde carga', f.some(x => x[0] === 'in' && x[1] === 'unidad_negocio_id' && JSON.stringify(x[2]) === '["u-n"]'))
  chk('… activos', f.some(x => x[0] === 'eq' && x[1] === 'activo' && x[2] === true))
  chk('… que son otra empresa del grupo', f.some(x => x[0] === 'not' && x[1] === 'unidad_grupo_id' && x[2] === 'is' && x[3] === null))
  chk('el link lleva el id escapado para la URL', S.urlMandarGrupo('a b&c') === 'retiros.html?cliente=a%20b%26c')
})())

// ═══ Varias: se elige ═════════════════════════════════════════════════════
esperas.push((async () => {
  const S = armar({ barra: null, alcance: { todas: true } })
  S.__tablas.clientes = [DOLCE_EN_NUSS, NUSS_EN_DOLCE]
  S.__tablas.unidades_negocio = NOMBRES
  await S.mandarAOtraEmpresa()
  const h = S.__el('stock-grupo').innerHTML
  chk('con varias no navega', S.__idas.length === 0)
  chk('… muestra el panel', S.__el('stock-grupo').hidden === false)
  chk('… pregunta "¿A qué empresa?"', h.includes('¿A qué empresa?'))
  chk('… con cada empresa y su link', h.includes('href="retiros.html?cliente=c-dolce"') && h.includes('<strong>Dolce Pasta</strong>') &&
    h.includes('href="retiros.html?cliente=c-paz"') && h.includes('<strong>Cucuruchos Nuss</strong>'), h)
  chk('… y desde qué fábrica sale (salen de dos distintas)', h.includes('DOLCE PASTA SRL · desde Cucuruchos Nuss') && h.includes('PAZ, MIRTA · desde Dolce Pasta'), h)
  chk('… y se puede cancelar', h.includes('data-grupo-cerrar'))
  S.cerrarPanelGrupo()
  chk('Cancelar cierra el panel', S.__el('stock-grupo').hidden === true && S.__el('stock-grupo').innerHTML === '')
})())

esperas.push((async () => {
  const S = armar({ barra: 'u-n' })
  S.__tablas.clientes = [DOLCE_EN_NUSS, { id: 'c-mengui', nombre: 'HELADITOS ORLY', unidad_negocio_id: 'u-n', unidad_grupo_id: 'u-m' }]
  S.__tablas.unidades_negocio = NOMBRES
  await S.mandarAOtraEmpresa()
  const h = S.__el('stock-grupo').innerHTML
  chk('desde una sola fábrica no repite "desde"', !h.includes(' · desde '), h)
  chk('… y ofrece las dos empresas', h.includes('<strong>Dolce Pasta</strong>') && h.includes('<strong>Mengui</strong>'))
})())

// Un cliente que apunta a su propia fábrica no es "otra empresa".
esperas.push((async () => {
  const S = armar({ barra: 'u-n' })
  S.__tablas.clientes = [{ id: 'c-raro', nombre: 'NUSS', unidad_negocio_id: 'u-n', unidad_grupo_id: 'u-n' }]
  S.__tablas.unidades_negocio = NOMBRES
  await S.mandarAOtraEmpresa()
  const h = S.__el('stock-grupo').innerHTML
  chk('un cliente que es la misma fábrica no cuenta', S.__idas.length === 0 && h.includes('no tiene ninguna otra empresa del grupo'), h)
})())

// ═══ Ninguna, error, sin permiso ══════════════════════════════════════════
esperas.push((async () => {
  const S = armar({ barra: 'u-n' })
  S.__tablas.clientes = []
  await S.mandarAOtraEmpresa()
  const h = S.__el('stock-grupo').innerHTML
  chk('sin ninguna empresa del grupo: se dice, y dónde se carga', h.includes('no tiene ninguna otra empresa del grupo como cliente') && h.includes('Administración → Clientes'), h)
  chk('… sin navegar', S.__idas.length === 0)
})())

esperas.push((async () => {
  const S = armar({ barra: 'u-n' })
  S.__tablas.clientes = () => ({ data: null, error: { message: 'sin red' } })
  await S.mandarAOtraEmpresa()
  const h = S.__el('stock-grupo').innerHTML
  chk('con error al leer: se dice y se puede cerrar', h.includes('No se pudieron leer las empresas del grupo') && h.includes('data-grupo-cerrar'), h)
  chk('… sin navegar', S.__idas.length === 0)
})())

esperas.push((async () => {
  const S = armar({ barra: 'u-n' })
  S.__tablas.clientes = [DOLCE_EN_NUSS]
  S.__tablas.unidades_negocio = () => ({ data: null, error: { message: 'x' } })
  await S.mandarAOtraEmpresa()
  chk('sin los nombres de las empresas igual va', JSON.stringify(S.__idas) === '["retiros.html?cliente=c-dolce"]')
})())

esperas.push((async () => {
  const S = armar({ barra: null, alcance: { todas: true } })
  S.__tablas.clientes = [DOLCE_EN_NUSS, NUSS_EN_DOLCE]
  S.__tablas.unidades_negocio = () => ({ data: null, error: { message: 'x' } })
  await S.mandarAOtraEmpresa()
  const h = S.__el('stock-grupo').innerHTML
  chk('sin los nombres de la tabla, los de la barra', h.includes('<strong>Dolce Pasta</strong>') && h.includes('<strong>Cucuruchos Nuss</strong>') && h.includes('· desde Cucuruchos Nuss'), h)
})())

esperas.push((async () => {
  const S = armar({ barra: 'u-d' })
  S.__tablas.clientes = [NUSS_EN_DOLCE]
  await S.mandarAOtraEmpresa()
  chk('sin permiso en la fábrica de la barra no consulta ni navega', S.__consultas.length === 0 && S.__idas.length === 0)
})())

// ═══ Escapado ═════════════════════════════════════════════════════════════
esperas.push((async () => {
  const S = armar({ barra: null, alcance: { todas: true } })
  S.__tablas.clientes = [
    { id: marca('id'), nombre: marca('cliente'), unidad_negocio_id: 'u-n', unidad_grupo_id: 'u-x' },
    { id: 'c2', nombre: 'OTRO', unidad_negocio_id: 'u-d', unidad_grupo_id: 'u-y' },
  ]
  S.__tablas.unidades_negocio = [{ id: 'u-x', nombre: marca('empresa') }, { id: 'u-y', nombre: 'Y' }, { id: 'u-n', nombre: marca('desde') }, { id: 'u-d', nombre: 'D' }]
  await S.mandarAOtraEmpresa()
  const h = S.__el('stock-grupo').innerHTML
  chk('ninguna marca cruda', !/<b data-xss=/.test(h), h)
  for (const c of ['cliente', 'empresa', 'desde']) chk(`«${c}» escapado`, h.includes(escapada(c)))
  chk('el id va escapado en el link (para la URL) y en el data-*', h.includes('href="retiros.html?cliente=%22%3E%3Cb%20data-xss%3D%22id%22%3E"') && h.includes('data-grupo-cliente="&quot;&gt;'), h)
})())

fin()
