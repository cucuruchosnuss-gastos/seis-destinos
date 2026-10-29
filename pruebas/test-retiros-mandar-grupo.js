// LA CARGA ABIERTA DESDE "MANDAR A OTRA EMPRESA DEL GRUPO" (26/10/2026, rama
// ci-prueba/mandar-a-otra-empresa). Stock lleva a retiros.html?cliente=<id>,
// con el cliente que ES la otra empresa (clientes.unidad_grupo_id). Lo que se
// prueba, con las funciones REALES de modulos/retiros.html (init incluido):
//  - la orden arranca en la fábrica de ese cliente y con él ya elegido;
//  - el parámetro sale de la dirección (recargar no vuelve a empezar);
//  - una orden a medio cargar NO se pisa: sigue esa y se avisa;
//  - un cliente que no es otra empresa del grupo, de otra fábrica, inactivo,
//    que no está o que no se pudo leer: se avisa y la Carga sigue como siempre;
//  - el aviso de arriba: "Va al stock de <empresa> con los mismos lotes".
//
//   node pruebas/test-retiros-mandar-grupo.js
//   ARCHIVO_TEST=<copia de modulos/retiros.html> node pruebas/test-retiros-mandar-grupo.js
'use strict'

const path = require('path')
const fs = require('fs')
const { construirRetiros } = require('./sandbox-retiros')
const { arnes, leer } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/retiros.html')
leer(ARCHIVO)
const HTML = fs.readFileSync(ARCHIVO, 'utf8')
const { chk, esperas, fin } = arnes()

// Lo de alrededor de init() y del formulario, de mentira: lo de verdad lo
// prueban sus suites (test-retiros-carga, test-retiros-entre-empresas…).
// Van como ASIGNACIONES (var x = function): el sandbox ya trae las de verdad
// con el mismo nombre, y una declaración se pisaría con la de verdad.
const EXTRA = `
  var console = { log(){}, warn(){}, error(){} }
  __llamadas.urls = []; __llamadas.abiertos = []; __llamadas.elegidos = []; __llamadas.empezadas = 0; __llamadas.iconos = 0
  var history = { state: { x: 1 }, replaceState(s, t, u) { __llamadas.urls.push(u) } }
  // La lista de clientes de cada fábrica, la que leería asegurarDatosEmpresa.
  var __clientesDe = { 'u-n': [{ id: 'c-dolce', nombre: 'DOLCE PASTA SRL', apodos: [], activo: true, unidad_grupo_id: 'u-d' }] }
  var __barra = null
  var abrirFormulario = async function () {
    __llamadas.abiertos.push(estado.empresaId)
    if (!estado.form) estado.form = formVacio()
    // La lista tarda (como la de verdad): quien no espera a abrirFormulario
    // elige el cliente antes de tenerla.
    for (let i = 0; i < 5; i++) await null
    if (estado.clientes === null) estado.clientes = __clientesDe[estado.empresaId] ?? []
  }
  var reconciliarRenglones = function () {}
  var elegirCliente = function (id) { __llamadas.elegidos.push(id); if (estado.form && clienteDe(id)) estado.form.clienteId = id }
  var verificarSesion = async function () { return { user: { id: 'uid-1' } } }
  var asegurarEstilosFaltante = function () {}
  var cargarFabricaDePruebas = async function () { return estado.fabrica }
  var unidadesDeLaBarra = async function () { return { elegida: __barra } }
  var cargarPermisos = async function () {}
  var sinAcceso = function (m) { __llamadas.errores.push('sinAcceso: ' + m) }
  var conectarTodo = function () {}
  var alCambiarUnidad = function () {}
  var empezarOrden = function () { __llamadas.empezadas++ }
`
const FUNCIONES = ['clienteDeLaUrl', 'sacarClienteDeLaUrl', 'abrirConCliente', 'empresaGrupoDe', 'esEntreEmpresas',
  'nombreEmpresaGrupo', 'textoEntreEmpresas', 'init']

const DOLCE_EN_NUSS = { id: 'c-dolce', nombre: 'DOLCE PASTA SRL', unidad_negocio_id: 'u-n', unidad_grupo_id: 'u-d', activo: true }
const COMUN = { id: 'c-comun', nombre: 'KIOSCO', unidad_negocio_id: 'u-n', unidad_grupo_id: null, activo: true }

function armar({ cliente = DOLCE_EN_NUSS, url = '?cliente=c-dolce', error = null } = {}) {
  const S = construirRetiros(ARCHIVO, { funciones: FUNCIONES, preludioExtra: EXTRA })
  S.__win.location.search = url
  S.__setLocation('https://cucuruchosnuss-gastos.github.io/seis-destinos/modulos/retiros.html' + url + '#x')
  S.__tablas.clientes = (f) => {
    if (error) return { data: null, error }
    const id = f.find(x => x[0] === 'eq' && x[1] === 'id')?.[2]
    return { data: cliente && cliente.id === id ? [cliente] : [], error: null }
  }
  return S
}

// ═══ Lo que se lee de la dirección ════════════════════════════════════════
{
  const S = armar({ url: '?vista=x&cliente=c-dolce' })
  chk('lee ?cliente=', S.clienteDeLaUrl() === 'c-dolce')
  S.sacarClienteDeLaUrl()
  chk('lo saca de la dirección y deja lo demás', JSON.stringify(S.__llamadas.urls) === '["/seis-destinos/modulos/retiros.html?vista=x#x"]', JSON.stringify(S.__llamadas.urls))
  const S2 = armar({ url: '' })
  chk('sin ?cliente=: nada', S2.clienteDeLaUrl() === null)
  const S3 = armar({ url: '?cliente=' })
  chk('?cliente= vacío: nada', S3.clienteDeLaUrl() === null)
}

// ═══ Derecho a la orden, con el cliente elegido ═══════════════════════════
esperas.push((async () => {
  const S = armar()
  S.estado.empresaId = 'u-d'   // venía de otra fábrica
  S.estado.clientes = [{ id: 'otro' }]
  const ok = await S.abrirConCliente('c-dolce')
  chk('abre', ok === true)
  chk('en la fábrica del cliente', S.estado.empresaId === 'u-n')
  chk('… recordada para la próxima', S.__ls.get('retiros.empresa') === 'u-n')
  chk('la lista de clientes de la otra fábrica se descarta', S.__llamadas.abiertos.length === 1 && S.estado.clientes.length === 1 && S.estado.clientes[0].id === 'c-dolce')
  chk('elige el cliente con la orden abierta y la lista ya leída', JSON.stringify(S.__llamadas.elegidos) === '["c-dolce"]' && S.estado.form.clienteId === 'c-dolce')
  chk('una orden nueva (con su uuid)', typeof S.estado.form?.uuid === 'string' && S.estado.form.renglones.length >= 1)
  const consulta = S.__llamadas.consultas.find(c => c[0] === 'clientes')
  chk('lee el cliente por id', consulta && consulta[1].some(x => x[0] === 'eq' && x[1] === 'id' && x[2] === 'c-dolce'))
  chk('sin avisos', S.__llamadas.errores.length === 0, JSON.stringify(S.__llamadas.errores))
})())

esperas.push((async () => {
  const S = armar()
  S.estado.empresaId = null
  // abrirFormulario (de mentira) lee la lista con el cliente adentro.
  S.estado.clientes = null
  const ok = await S.abrirConCliente('c-dolce')
  chk('desde el arranque (sin fábrica todavía) también', ok === true && S.estado.empresaId === 'u-n' && S.estado.form?.clienteId === 'c-dolce')
})())

// Ya en Nuss, con una orden en memoria sin nada (no está en el borrador): una nueva.
esperas.push((async () => {
  const S = armar()
  S.estado.empresaId = 'u-n'
  S.estado.clientes = null
  S.estado.form = { ...S.formVacio(), uuid: 'en-memoria' }
  const ok = await S.abrirConCliente('c-dolce')
  chk('en la misma fábrica: una orden nueva, con el cliente', ok === true && S.estado.form.uuid !== 'en-memoria' && S.estado.form.clienteId === 'c-dolce')
})())

// ═══ Una orden a medio cargar no se pisa ══════════════════════════════════
esperas.push((async () => {
  const S = armar()
  S.__ls.set('retiros.borrador', JSON.stringify({ empresaId: 'u-d', form: { uuid: 'uuid-viejo', clienteId: 'c-x', renglones: [{ clave: 1, productoId: 'p1', cajas: 3 }] } }))
  S.estado.misTareas.set('retiros:cargar', { todas: true })
  const ok = await S.abrirConCliente('c-dolce')
  chk('con una orden a medio cargar: sigue esa', ok === true && S.estado.empresaId === 'u-d' && S.estado.form.uuid === 'uuid-viejo')
  chk('… sin elegir el cliente del link', S.__llamadas.elegidos.length === 0)
  chk('… y avisa', S.__llamadas.errores.some(e => e.includes('Tenías una orden a medio cargar') && e.includes('Mandar a otra empresa del grupo')), JSON.stringify(S.__llamadas.errores))
})())

esperas.push((async () => {
  const S = armar()
  S.__ls.set('retiros.borrador', JSON.stringify({ empresaId: 'u-n', form: { uuid: 'uuid-vacio', clienteId: null, observaciones: '', renglones: [{ clave: 1 }] } }))
  const ok = await S.abrirConCliente('c-dolce')
  chk('un borrador vacío no frena: orden nueva con el cliente', ok === true && S.__llamadas.elegidos[0] === 'c-dolce' && S.estado.form.uuid !== 'uuid-vacio')
})())

// ═══ Lo que no se abre ════════════════════════════════════════════════════
const casos = [
  ['un cliente que no es otra empresa del grupo', { cliente: COMUN }, 'c-comun'],
  ['un cliente que no está', { cliente: null }, 'c-dolce'],
  ['un cliente inactivo', { cliente: { ...DOLCE_EN_NUSS, activo: false } }, 'c-dolce'],
  ['un cliente de una fábrica donde no carga', { cliente: { ...DOLCE_EN_NUSS, unidad_negocio_id: 'u-d' } }, 'c-dolce'],
]
for (const [nombre, op, id] of casos) {
  esperas.push((async () => {
    const S = armar(op)
    const ok = await S.abrirConCliente(id)
    chk(`${nombre}: no abre`, ok === false && S.__llamadas.abiertos.length === 0 && S.__llamadas.elegidos.length === 0)
    chk(`${nombre}: avisa`, S.__llamadas.errores.some(e => e.includes('No se encontró esa empresa del grupo')), JSON.stringify(S.__llamadas.errores))
  })())
}
esperas.push((async () => {
  const S = armar({ error: { message: 'sin red' } })
  const ok = await S.abrirConCliente('c-dolce')
  chk('sin poder leer el cliente: no abre y avisa', ok === false && S.__llamadas.errores.some(e => e.includes('No se pudo leer a qué empresa mandar')))
})())

// ═══ init ═════════════════════════════════════════════════════════════════
esperas.push((async () => {
  const S = armar()
  await S.init()
  chk('init con ?cliente=: abre la orden con el cliente', S.__llamadas.elegidos[0] === 'c-dolce' && S.estado.empresaId === 'u-n')
  chk('… y no la elección de siempre', S.__llamadas.empezadas === 0)
  chk('… y saca el parámetro', S.__llamadas.urls.length === 1 && !S.__llamadas.urls[0].includes('cliente='))
})())
esperas.push((async () => {
  const S = armar({ cliente: COMUN, url: '?cliente=c-comun' })
  await S.init()
  chk('init con un link que no sirve: avisa y sigue como siempre', S.__llamadas.empezadas === 1 && S.__llamadas.errores.length === 1)
  chk('… y también saca el parámetro', S.__llamadas.urls.length === 1)
})())
esperas.push((async () => {
  const S = armar({ url: '' })
  await S.init()
  chk('init sin ?cliente=: como siempre, sin consultar el cliente', S.__llamadas.empezadas === 1 && !S.__llamadas.consultas.some(c => c[0] === 'clientes') && S.__llamadas.urls.length === 0)
})())

// ═══ El aviso ═════════════════════════════════════════════════════════════
{
  const S = armar()
  S.estado.empresasGrupo.set('u-d', 'Dolce Pasta')
  chk('el aviso dice adónde va y con los mismos lotes', S.textoEntreEmpresas(DOLCE_EN_NUSS) === 'Es una orden interna: la mercadería va en tránsito hasta que Dolce Pasta la reciba (con los mismos lotes)')
  chk('sin el nombre: "otra empresa del grupo"', S.textoEntreEmpresas({ unidad_grupo_id: 'u-zz' }) === 'Es una orden interna: la mercadería va en tránsito hasta que otra empresa del grupo la reciba (con los mismos lotes)')
  chk('un cliente común: sin aviso', S.textoEntreEmpresas(COMUN) === '')
  chk('el texto viejo ya no está', !HTML.includes('lo que sale entra al stock de'))
}

fin()
