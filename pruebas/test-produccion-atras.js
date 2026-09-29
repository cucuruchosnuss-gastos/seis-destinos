// El "atrás" de Android en la planta (29/09/2026). Caso real: con la app
// anclada, un "atrás" sacaba a Android de produccion.html y la tablet quedaba
// en blanco. Se EJECUTA atrasDeLaPlanta() de la planta con su sandbox en cada
// situación, y la red de js/salud.js (volver sola a la planta).
// (La prueba en un navegador real es e2e/12-planta-atras.spec.js.)
//
//   node pruebas/test-produccion-atras.js
//   ARCHIVO_TEST=<copia de modulos/produccion.html>  ARCHIVO_SALUD=<copia de js/salud.js>

process.env.TZ = 'UTC'
const fs = require('fs')
const path = require('path')
const { pathToFileURL } = require('url')
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const SALUD = process.env.ARCHIVO_SALUD || path.join(__dirname, '..', 'js', 'salud.js')
const src = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

function armar() {
  const S = construirProduccion(ARCHIVO, { funciones: ['atrasDeLaPlanta', 'armarAtras'], constantes: ['visible', 'ESTADO_ATRAS'] })
  const el = id => S.__doc.getElementById(id)
  // La vista a la vista; todas las ventanas cerradas.
  el('pr-vista').hidden = false
  for (const id of ['pr-acceso-pin', 'pr-lote-panel', 'pr-agregar-ing', 'pr-otro', 'pr-anular-masa', 'pr-ops-ventana',
    'pr-parada-editor', 'pr-corregir', 'pr-forzar-form', 'pr-cierre-confirmar', 'pr-agregar-cono-form']) el(id).hidden = true
  return { S, el }
}

// ── Fuente: se instala al arrancar y se re-arma con cada toque ──────────
chk('init instala el "atrás" antes de esperar nada', /async function init\(\) \{\n      instalarAtras\(\)/.test(src))
chk('popstate vuelve a poner la entrada y maneja el atrás', /addEventListener\('popstate', \(\) => \{\n        armarAtras\(\)\n        try \{ atrasDeLaPlanta\(\) \}/.test(src))
chk('se re-arma con cada toque (Chrome saltea entradas sin toque)', /document\.addEventListener\('pointerdown', armarAtras, true\)/.test(src))
chk('la planta se anota como app instalada (la red de salud.js)', /estado\.sesionPlanta = ses\n      marcarPlantaInstalada\(\)/.test(src))
chk('al mandar a la gestión se borra la marca (sin bucle)', /olvidarPlantaInstalada\(\); window\.location\.replace\('produccion-gestion\.html'\)/.test(src))

esperas.push((async () => {
  // 1 · Ventanas
  {
    const { S, el } = armar()
    S.estado.vista = 'pr-receta'
    el('pr-lote-panel').hidden = false
    S.estado.panelLote = { ingredienteId: 'i1' }
    chk('ventana de lotes abierta: la cierra', S.atrasDeLaPlanta() === 'ventana' && el('pr-lote-panel').hidden === true)
  }
  {
    const { S, el } = armar()
    S.estado.vista = 'pr-quien'
    S.estado.pin = { digitos: '12', largo: 4, modo: 'comun' }
    chk('PIN abierto: lo cierra', S.atrasDeLaPlanta() === 'ventana' && S.estado.pin === null)
  }
  {
    const { S } = armar()
    S.estado.vista = 'pr-quien'
    S.estado.pin = { digitos: '1234', largo: 4, modo: 'comun', enviando: true }
    chk('PIN mandándose: no lo corta', S.atrasDeLaPlanta() === 'ventana' && S.estado.pin?.enviando === true)
  }
  {
    const { S, el } = armar()
    S.estado.vista = 'pr-cierre'
    el('pr-forzar-form').hidden = false
    chk('cerrar a la fuerza abierto: lo cierra', S.atrasDeLaPlanta() === 'ventana' && el('pr-forzar-form').hidden === true)
  }
  {
    const { S, el } = armar()
    S.estado.vista = 'pr-sala'
    el('pr-otro').hidden = false
    chk('"Otro" abierto: lo cierra', S.atrasDeLaPlanta() === 'ventana' && el('pr-otro').hidden === true)
  }
  {
    const { S, el } = armar()
    S.estado.vista = 'pr-masas'
    el('pr-anular-masa').hidden = false
    S.estado.anulando = 'm1'
    chk('anular masa abierto: lo cierra', S.atrasDeLaPlanta() === 'ventana' && el('pr-anular-masa').hidden === true && S.estado.anulando === null)
  }
  {
    const { S } = armar()
    S.estado.vista = 'pr-asignar'
    S.estado.maestro = { id: 'm', nombre: 'Marta' }
    S.estado.asignar = { personaId: 'p1', digitos: '12', primero: null, error: null }
    chk('asignar PIN con persona elegida: la suelta y borra lo tipeado', S.atrasDeLaPlanta() === 'ventana' && S.estado.asignar?.personaId === null && S.estado.asignar?.digitos === '')
  }

  // 2 · Agregar producto: paso anterior
  {
    const { S } = armar()
    S.estado.vista = 'pr-agregar-prod'
    S.estado.catalogo = { productos: [{ id: 'p', nombre: 'Mini' }], presentaciones: [], marcas: [] }
    S.estado.agregar = { paso: 'presentacion', productoId: 'p', conCono: true, marcaElegida: true, marcaId: null, presentacionId: '', cajas: null, cajaElegida: false }
    chk('agregar en Presentación: vuelve al Cono', S.atrasDeLaPlanta() === 'paso' && S.estado.agregar.paso === 'cono')
    chk('agregar en Cono: vuelve al Producto', S.atrasDeLaPlanta() === 'paso' && S.estado.agregar.paso === 'producto')
    let cancelado = false
    S.__doc.getElementById('pr-agregar-cancelar').click = () => { cancelado = true }
    chk('agregar en el primer paso: a la planilla (Cancelar)', S.atrasDeLaPlanta() === 'seccion' && cancelado)
  }

  // 3 · Secciones: al Inicio del modo
  for (const v of ['pr-abrir', 'pr-planilla', 'pr-paradas', 'pr-cierre', 'pr-cerrado']) {
    const { S } = armar()
    S.estado.vista = v
    S.__setRpc(() => ({ data: [], error: null }))
    const r = S.atrasDeLaPlanta()
    chk(`${v}: vuelve al Inicio de Producción`, r === 'seccion')
  }
  for (const v of ['pr-receta', 'pr-hist-maq', 'pr-masas']) {
    const { S } = armar()
    S.estado.vista = v
    chk(`${v}: vuelve al Inicio de Sala de masa`, S.atrasDeLaPlanta() === 'seccion')
  }

  // 4 · Inicio: no hace nada y dice cómo salir
  for (const v of ['pr-produccion', 'pr-sala', 'pr-quien']) {
    const { S } = armar()
    S.estado.vista = v
    S.estado.pin = null
    const antes = S.estado.vista
    chk(`${v}: no hace nada`, S.atrasDeLaPlanta() === 'inicio' && S.estado.vista === antes)
    chk(`${v}: dice "Para salir, usá Salir."`, S.__llamadas.exitos.at(-1) === 'Para salir, usá Salir.')
  }
  {
    const { S } = armar()
    S.estado.vista = 'pr-acceso'
    S.estado.maestro = { id: 'm', nombre: 'Marta' }
    chk('acceso maestro: no se sale, y lo dice', S.atrasDeLaPlanta() === 'inicio' && S.__llamadas.exitos.at(-1) === 'Para salir del acceso maestro, usá Salir.')
  }
  {
    const { S, el } = armar()
    el('pr-vista').hidden = true
    S.estado.vista = 'pr-planilla'
    chk('cargando / login: nada', S.atrasDeLaPlanta() === 'nada')
  }

  // ── La red de js/salud.js ──────────────────────────────────────────────
  const tmp = path.join(__dirname, '..', 'js', `.tmp-salud-atras-${process.pid}.mjs`)
  fs.writeFileSync(tmp, fs.readFileSync(SALUD, 'utf8'))
  console.log(`COMUN ${SALUD} (${fs.readFileSync(SALUD, 'utf8').length} bytes)`)
  try {
    const M = await import(pathToFileURL(tmp).href + '?v=' + Date.now())
    const base = 'https://x.github.io/seis-destinos/js/salud.js'
    const ventana = ({ ruta, marca, instalada = true }) => {
      const ss = new Map(marca ? [[M.CLAVE_PLANTA_INSTALADA, '1']] : [])
      return {
        location: { pathname: ruta, reemplazos: [], replace(x) { this.reemplazos.push(x) } },
        sessionStorage: { getItem: k => ss.get(k) ?? null, setItem: (k, v) => ss.set(k, v), removeItem: k => ss.delete(k) },
        matchMedia: q => ({ matches: instalada && q === '(display-mode: standalone)' }),
        navigator: {},
        _ss: ss,
      }
    }
    chk('red: la planta instalada que cae en otra página vuelve a la planta',
      M.destinoRedPlanta(ventana({ ruta: '/seis-destinos/dashboard.html', marca: true }), base) === 'https://x.github.io/seis-destinos/modulos/produccion.html')
    chk('red: en la planta no hace nada', M.destinoRedPlanta(ventana({ ruta: '/seis-destinos/modulos/produccion.html', marca: true }), base) === null)
    chk('red: sin la marca (cualquier otra pestaña) no hace nada', M.destinoRedPlanta(ventana({ ruta: '/seis-destinos/dashboard.html', marca: false }), base) === null)
    chk('red: el segundo factor no se corta', M.destinoRedPlanta(ventana({ ruta: '/seis-destinos/mfa.html', marca: true }), base) === null)
    const w = ventana({ ruta: '/seis-destinos/modulos/produccion.html', marca: false })
    M.marcarPlantaInstalada(w)
    chk('red: la marca se pone solo en la app instalada', w._ss.get(M.CLAVE_PLANTA_INSTALADA) === '1')
    const w2 = ventana({ ruta: '/x', marca: false, instalada: false })
    M.marcarPlantaInstalada(w2)
    chk('red: en una pestaña común no se pone', !w2._ss.has(M.CLAVE_PLANTA_INSTALADA))
    M.olvidarPlantaInstalada(w)
    chk('red: olvidar borra la marca', !w._ss.has(M.CLAVE_PLANTA_INSTALADA))
    const salud = fs.readFileSync(SALUD, 'utf8')
    chk('red: instalarSalud la corre en TODAS las pantallas, antes de todo', /export function instalarSalud\(supabase, win = globalThis\) \{\n  volverALaPlantaSiSeSalio\(win\)/.test(salud))
  } finally {
    try { fs.unlinkSync(tmp) } catch { /* nada */ }
  }
})())

fin()
