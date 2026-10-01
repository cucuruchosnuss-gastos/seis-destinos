// EL BOTÓN DE VOLVER de la planta (30/09/2026). Para salir de una sección
// había que buscar "Inicio" en la barra lateral. Ahora cada pantalla que no es
// el Inicio tiene "‹ Inicio" arriba a la izquierda: vuelve al Inicio DEL MODO
// (nunca cambia de modo), en los pasos de Agregar producto vuelve al paso
// anterior, y si hay algo a medio cargar pregunta "¿Salir sin guardar?".
// Se EJECUTAN pintarVolver() y volverEnPlanta() con el sandbox de la planta.
//
//   node pruebas/test-produccion-volver.js
//   ARCHIVO_TEST=<copia de modulos/produccion.html> node pruebas/test-produccion-volver.js

process.env.TZ = 'UTC'
const path = require('path')
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const src = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

function armar(modo = 'produccion') {
  const S = construirProduccion(ARCHIVO)
  S.estado.modo = modo
  S.estado.persona = { id: 'p1', nombre: 'Robot Encargado', puestos: ['encargado', 'masero'] }
  S.__setRpc(() => ({ data: [], error: null }))
  const el = id => S.__doc.getElementById(id)
  return { S, el }
}
const espera = () => new Promise(r => setImmediate(r))

// ── Fuente: el botón vive en la cabecera, primero, con su tamaño fijo ─────
chk('el botón está en la cabecera, antes del contexto',
  /<header class="pr-cab" id="pr-cab" hidden>[\s\S]*?id="pr-cab-volver"[\s\S]*?id="pr-cab-ctx"/.test(src))
chk('ancho fijo (misma posición y tamaño en todas las pantallas)', /\.pr-cab__volver \{[^}]*width: 112px;[^}]*min-height: 44px;/.test(src))
chk('el botón se escucha', /getElementById\('pr-cab-volver'\)\.addEventListener\('click', volverEnPlanta\)/.test(src))
chk('la pregunta tiene sus dos botones escuchados',
  /getElementById\('pr-confirma-no'\)\.addEventListener\('click', \(\) => responderConfirma\(false\)\)/.test(src) &&
  /getElementById\('pr-confirma-si'\)\.addEventListener\('click', \(\) => responderConfirma\(true\)\)/.test(src))
chk('pintarCabeceraVista pinta el botón', /function pintarCabeceraVista\(\) \{[\s\S]*?pintarVolver\(\)[\s\S]*?\n    \}/.test(src))
chk('pintarAgregar pinta el botón (cambia con el paso)', /function pintarAgregar\(\) \{[\s\S]*?pintarVolver\(\)\n    \}/.test(src))

esperas.push((async () => {
  // 1 · Se ve en toda pantalla que no es el Inicio, y no en el Inicio.
  for (const [modo, vistas] of [['produccion', ['pr-abrir', 'pr-abiertos', 'pr-planilla', 'pr-paradas', 'pr-cierre', 'pr-cerrado']], ['masa', ['pr-receta', 'pr-hist-maq', 'pr-masas']]]) {
    for (const v of vistas) {
      const { S, el } = armar(modo)
      S.estado.vista = v
      S.pintarVolver()
      chk(`${modo} · ${v}: "‹ Inicio" a la vista`, el('pr-cab-volver').hidden === false && el('pr-cab-volver-texto').textContent === 'Inicio')
      chk(`${modo} · ${v}: dice a qué Inicio va`, el('pr-cab-volver').getAttribute('aria-label') === `Volver al Inicio de ${modo === 'masa' ? 'Sala de masa' : 'Producción'}`)
    }
  }
  for (const [modo, v] of [['produccion', 'pr-produccion'], ['masa', 'pr-sala']]) {
    const { S, el } = armar(modo)
    S.estado.vista = v
    S.pintarVolver()
    chk(`${v}: en el Inicio no hay botón`, el('pr-cab-volver').hidden === true)
  }
  {
    const { S, el } = armar()
    S.estado.vista = 'pr-planilla'
    S.estado.persona = null
    S.pintarVolver()
    chk('sin nadie adentro (sin barra) no hay botón', el('pr-cab-volver').hidden === true)
  }

  // 2 · Vuelve al Inicio DEL MODO, sin cambiar de modo.
  {
    const { S } = armar('produccion')
    S.estado.vista = 'pr-planilla'
    const r = S.volverEnPlanta()
    await espera()
    chk('Producción · planilla: al Inicio de Producción', r === 'inicio' && S.estado.vista === 'pr-produccion' && S.estado.modo === 'produccion')
  }
  {
    const { S } = armar('masa')
    S.estado.vista = 'pr-hist-maq'
    const r = S.volverEnPlanta()
    await espera()
    chk('Sala de masa · historial: al Inicio de Sala de masa', r === 'inicio' && S.estado.vista === 'pr-sala' && S.estado.modo === 'masa')
  }
  {
    const { S } = armar('masa')
    S.estado.vista = 'pr-receta'
    S.volverEnPlanta()
    await espera()
    chk('Sala de masa · receta: al Inicio de Sala de masa (la masa queda en su borrador)', S.estado.vista === 'pr-sala' && !S.estado.confirma)
  }
  {
    const { S } = armar('produccion')
    S.estado.vista = 'pr-produccion'
    chk('en el Inicio no hace nada', S.volverEnPlanta() === 'nada' && S.estado.vista === 'pr-produccion')
  }

  // 3 · Agregar producto: paso anterior; del primero, al Inicio.
  {
    const { S, el } = armar()
    S.estado.vista = 'pr-agregar-prod'
    S.estado.catalogo = { productos: [{ id: 'p', nombre: 'Mini' }], presentaciones: [], marcas: [] }
    S.estado.agregar = { paso: 'presentacion', productoId: 'p', conCono: true, marcaElegida: true, marcaId: null, presentacionId: '', cajas: null, cajaElegida: false }
    S.pintarVolver()
    chk('agregar en Presentación: dice "Atrás"', el('pr-cab-volver-texto').textContent === 'Atrás' && el('pr-cab-volver').getAttribute('aria-label') === 'Volver al paso anterior')
    chk('agregar en Presentación: vuelve al Cono', S.volverEnPlanta() === 'paso' && S.estado.agregar.paso === 'cono')
    chk('agregar en Cono: vuelve al Producto', S.volverEnPlanta() === 'paso' && S.estado.agregar.paso === 'producto')
    chk('con el producto elegido, el primer paso dice "Inicio"', el('pr-cab-volver-texto').textContent === 'Inicio')
    chk('con algo elegido, del primer paso PREGUNTA', S.volverEnPlanta() === 'pregunta' && S.estado.vista === 'pr-agregar-prod' && el('pr-confirma').hidden === false)
    chk('la pregunta dice "¿Salir sin guardar?"', el('pr-confirma-titulo').textContent === '¿Salir sin guardar?' && el('pr-confirma-si').textContent === 'Sí, salir')
    S.responderConfirma(false)
    chk('"No, seguir": se queda y la pregunta se va', S.estado.vista === 'pr-agregar-prod' && el('pr-confirma').hidden === true && S.estado.confirma === null)
    S.volverEnPlanta()
    await S.responderConfirma(true)
    chk('"Sí, salir": al Inicio de Producción', S.estado.vista === 'pr-produccion' && el('pr-confirma').hidden === true)
  }
  {
    const { S } = armar()
    S.estado.vista = 'pr-agregar-prod'
    S.estado.catalogo = { productos: [], presentaciones: [], marcas: [] }
    S.estado.agregar = { paso: 'producto', productoId: '', conCono: null, marcaElegida: false, presentacionId: '', cajas: null }
    const r = S.volverEnPlanta()
    await espera()
    chk('agregar sin nada elegido: al Inicio sin preguntar', r === 'inicio' && S.estado.vista === 'pr-produccion')
  }
  {
    const { S } = armar()
    S.estado.vista = 'pr-agregar-prod'
    S.estado.catalogo = { productos: [], presentaciones: [], marcas: [] }
    S.estado.agregar = { paso: 'producto', productoId: '', corrige: { sublote: '7023-1' } }
    chk('corrigiendo un sublote: pregunta', S.volverEnPlanta() === 'pregunta')
  }

  // 4 · Abrir turno con máquinas elegidas: pregunta.
  {
    const { S } = armar()
    S.estado.vista = 'pr-abrir'
    S.estado.abrir = { filas: [{ elegida: true, bloqueada: false }] }
    chk('abrir con una máquina elegida: pregunta', S.volverEnPlanta() === 'pregunta' && S.estado.vista === 'pr-abrir')
  }
  {
    const { S } = armar()
    S.estado.vista = 'pr-abrir'
    S.estado.abrir = { filas: [{ elegida: false }, { elegida: true, bloqueada: true }] }
    S.volverEnPlanta()
    await espera()
    chk('abrir sin nada elegido: al Inicio', S.estado.vista === 'pr-produccion')
  }
  {
    const { S } = armar()
    S.estado.vista = 'pr-cierre'
    S.volverEnPlanta()
    await espera()
    chk('cerrar planilla (el borrador se guarda solo): al Inicio sin preguntar', S.estado.vista === 'pr-produccion' && !S.estado.confirma)
  }

  // 5 · Cambiar de pantalla saca una pregunta que quedó abierta.
  {
    const { S, el } = armar()
    S.estado.vista = 'pr-abrir'
    S.estado.abrir = { filas: [{ elegida: true }] }
    S.volverEnPlanta()
    S.mostrarVista('pr-planilla')
    chk('mostrarVista saca la pregunta', S.estado.confirma === null && el('pr-confirma').hidden === true)
  }
})())

fin()
