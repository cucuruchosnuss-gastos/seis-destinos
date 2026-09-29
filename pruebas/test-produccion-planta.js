// La PLANTA (25/09/2026): modulos/produccion.html quedó SOLO para la tablet
// de la fábrica, y lo de la oficina se mudó a modulos/produccion-gestion.html.
//
// Lo que se prueba acá, EJECUTANDO las funciones reales:
//  - el acceso maestro sin pasar por "¿Quién sos?": desde la barra, solo el
//    teclado de 8 números; con UN maestro no se elige nada, con varios una
//    fila chica con SOLO sus nombres en el mismo panel, y nunca se prueba el
//    PIN contra todos (a cada uno le sumaría un intento fallido);
//  - "Dar acceso por hoy" muestra el puesto fijo y si la persona tiene PIN, y
//    deja darle un acceso de un día a un masero FIJO SIN PIN (así
//    otorgar_puesto_temporal le arma un pin_temporal: leído con
//    pg_get_functiondef el 25/09/2026);
//  - el manifest de la planta ("Instalar app" como su propia app);
//  - "← Atrás" arriba a la izquierda;
//  - que no quede nada de la oficina en la planta;
//  - HTML malicioso en cada render nuevo.
//
//   node pruebas/test-produccion-planta.js

const fs = require('fs')
const path = require('path')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const MARTA = { id: 'e-jefa', nombre: 'Marta Jefa', misma_unidad: true, puestos: ['encargado'], puestos_temporales: [], es_maestro: true, tiene_pin: true }
const PERSONAL = [
  { id: 'e-fede', nombre: 'Federico Silva', misma_unidad: true, puestos: ['encargado'], puestos_temporales: [], es_maestro: false, tiene_pin: true },
  MARTA,
  { id: 'e-juan', nombre: 'Juan Masero', misma_unidad: true, puestos: ['masero'], puestos_temporales: [], es_maestro: false, tiene_pin: false },
  { id: 'e-ana', nombre: 'Ana Masera', misma_unidad: true, puestos: ['masero'], puestos_temporales: [], es_maestro: false, tiene_pin: true },
  { id: 'e-op', nombre: 'Operario Uno', misma_unidad: true, puestos: [], puestos_temporales: [], es_maestro: false, tiene_pin: false },
]

function armar({ personal = PERSONAL, respuestas = {} } = {}) {
  const S = construirProduccion(ARCHIVO)
  S.estado.unidades = new Map([['u-cn', 'Cucuruchos Nuss']])
  S.estado.unidadId = 'u-cn'
  S.estado.unidadesPosibles = ['u-cn']
  S.estado.modo = 'produccion'
  S.estado.personal = []
  S.__setRpc(async (nombre, params) => {
    if (nombre === 'personal_produccion') return typeof personal === 'function' ? personal() : { data: personal, error: null }
    const r = respuestas[nombre]
    if (typeof r === 'function') return r(params)
    return { data: r ?? null, error: null }
  })
  return S
}
const rpcs = (S, n) => S.__llamadas.rpc.filter(l => l[0] === n)
// Planta v2: con el último número el PIN se manda solo (la ventana no tiene
// "Entrar"). Tocar 'entrar' después mandaría el panel vacío y taparía el
// mensaje con "Faltan números".
async function tipear(S, pin) {
  let r
  for (const d of String(pin)) r = S.teclaPin(d)
  return r
}

// ── d) El acceso maestro, sin "¿Quién sos?" ──────────────────────────────
esperas.push((async () => {
  const S = armar({ respuestas: { verificar_pin_maestro: { ok: true } } })
  S.estado.persona = null
  // La planta con dos modos (28/09/2026): el acceso maestro está en UN solo
  // lugar, abajo de los nombres de "¿Quién sos?" de Producción.
  chk('el acceso maestro está al pie de "¿Quién sos?"',
    /<div class="pr-quien__pie">[\s\S]*?<button type="button" class="pr-quien__maestro" id="pr-btn-maestro">(<svg[\s\S]*?<\/svg>)?Acceso maestro<\/button>/.test(FUENTE))
  chk('… y se escucha', /getElementById\('pr-btn-maestro'\)\.addEventListener\('click', abrirMaestro\)/.test(FUENTE))
  chk('… y no hay otro atajo en la barra', !/pr-btn-barra-maestro/.test(FUENTE))
  await S.abrirMaestro()
  // Planta v2 (diseño 10a): la ventana del PIN maestro se abre sobre la
  // grilla, que queda detrás (pr-quien--maestro), con solo el teclado.
  chk('abre SOLO el teclado: la ventana del PIN maestro, sobre la grilla', S.estado.pin?.modo === 'maestro' &&
    S.__doc.getElementById('pr-pin').hidden === false && S.__doc.getElementById('pr-quien').classList.contains('pr-quien--maestro'))
  chk('… con la vista de ¿Quién sos? de fondo pero sin pintar la lista', S.estado.vista === 'pr-quien' && S.__doc.getElementById('pr-quien-lista').innerHTML === '')
  chk('… trae el personal para saber quién es maestro', rpcs(S, 'personal_produccion').length === 1)
  chk('con UN solo maestro, ya está elegido', S.estado.pin.personaId === 'e-jefa')
  chk('… y no hay fila de nombres', S.__doc.getElementById('pr-pin-maestros').hidden === true && S.__doc.getElementById('pr-pin-maestros').innerHTML === '')
  await tipear(S, '48271936')
  const l = rpcs(S, 'verificar_pin_maestro')
  chk('se verifica UNA vez, con esa persona', l.length === 1 && l[0][1].p_empleado_id === 'e-jefa' && l[0][1].p_pin === '48271936', JSON.stringify(l))
  // Planta v2: verificado, va a la PANTALLA del acceso maestro (Dar acceso
  // por hoy), y desde su banda entra a un modo como esa persona.
  chk('verificado, abre la pantalla del acceso maestro', S.estado.maestro?.id === 'e-jefa' && S.estado.vista === 'pr-acceso' && S.estado.pin === null, S.estado.vista)
  chk('… ¿Quién sos? (con la ventana del PIN adentro) se esconde, y la grilla deja de estar de fondo',
    S.__doc.getElementById('pr-quien').hidden === true && S.__doc.getElementById('pr-acceso').hidden === false &&
    !S.__doc.getElementById('pr-quien').classList.contains('pr-quien--maestro'))
  await S.entrarComoMaestro('produccion')
  chk('"Ir a Producción" entra DIRECTO al modo como esa persona', S.estado.persona?.id === 'e-jefa' && S.estado.vista === 'pr-produccion', S.estado.vista)
  chk('… los botones de la banda llevan a cada modo', /data-maestro-modo="produccion">Ir a Producción</.test(FUENTE) && /data-maestro-modo="masa">Ir a Sala de masa</.test(FUENTE) &&
    /closest\('\[data-maestro-modo\]'\)/.test(FUENTE) && /entrarComoMaestro\(/.test(FUENTE.slice(FUENTE.indexOf("closest('[data-maestro-modo]')"))))
  chk('… la barra lateral dice que es el acceso maestro', /Acceso maestro/.test(S.htmlLateral()))
  chk('… y no ofrece el acceso maestro otra vez', !/abrirMaestro|pr-btn-maestro/.test(S.htmlLateral()))
  // Cambiar de modo con el maestro activo no pasa por ¿Quién sos?.
  S.estado.abiertasConocido = true
  S.estado.hayTurnoAbierto = true
  await S.tocarModo('masa')
  chk('cambiar de modo con el maestro activo entra derecho', S.estado.modo === 'masa' && S.estado.persona?.id === 'e-jefa' && S.estado.vista !== 'pr-quien', S.estado.vista)

  // Con VARIOS maestros: una fila chica con SOLO sus nombres.
  const V = armar({ personal: PERSONAL.map(p => p.id === 'e-fede' ? { ...p, es_maestro: true } : p), respuestas: { verificar_pin_maestro: { ok: true } } })
  await V.abrirMaestro()
  const fila = V.__doc.getElementById('pr-pin-maestros')
  chk('con varios maestros: la fila con sus nombres', fila.hidden === false && (fila.innerHTML.match(/data-maestro=/g) || []).length === 2, fila.innerHTML)
  chk('… SOLO los maestros', !/Juan Masero|Operario Uno/.test(fila.innerHTML))
  chk('… y ninguno elegido de antemano', V.estado.pin.personaId === null)
  await tipear(V, '48271936')
  chk('sin elegir, NO se prueba el PIN contra nadie', rpcs(V, 'verificar_pin_maestro').length === 0 &&
    /Tocá primero tu nombre/.test(V.__doc.getElementById('pr-pin-mensaje').innerHTML))
  V.elegirMaestro('e-fede')
  chk('tocar un nombre lo elige', V.estado.pin.personaId === 'e-fede' && /data-maestro="e-fede" aria-pressed="true"/.test(fila.innerHTML))
  V.elegirMaestro('e-juan')
  chk('un nombre que no es maestro no se elige', V.estado.pin.personaId === 'e-fede')
  await tipear(V, '48271936')
  chk('elegido, se verifica UNA vez con esa persona', rpcs(V, 'verificar_pin_maestro').length === 1 && rpcs(V, 'verificar_pin_maestro')[0][1].p_empleado_id === 'e-fede')

  // Sin ningún maestro.
  const N = armar({ personal: PERSONAL.map(p => ({ ...p, es_maestro: false })) })
  await N.abrirMaestro()
  await tipear(N, '48271936')
  chk('sin ningún maestro lo dice y no manda nada', rpcs(N, 'verificar_pin_maestro').length === 0 &&
    /No hay ningún acceso maestro/.test(N.__doc.getElementById('pr-pin-mensaje').innerHTML))

  // Si el personal no se puede leer, se dice.
  const F = armar({ personal: () => ({ data: null, error: { message: 'sin red' } }) })
  await F.abrirMaestro()
  chk('si no se puede leer quién es maestro, se dice', /No se pudo leer quién tiene acceso maestro/.test(F.__doc.getElementById('pr-pin-mensaje').innerHTML))

  // Cancelar: vuelve a donde estaba.
  const C = armar()
  C.estado.persona = { id: 'e-fede', nombre: 'Federico Silva', puesto: 'encargado' }
  await C.abrirMaestro()
  C.cerrarPin()
  chk('cancelar con alguien adentro vuelve al modo', C.estado.pin === null && C.estado.vista === 'pr-produccion' && C.__doc.getElementById('pr-quien-col').hidden === false)
  const D = armar()
  D.estado.persona = null
  await D.abrirMaestro()
  D.cerrarPin()
  chk('cancelar sin nadie vuelve a ¿Quién sos? con la lista', D.estado.vista === 'pr-quien' && D.__doc.getElementById('pr-quien-col').hidden === false && D.estado.pin === null)

  // El PIN maestro no queda en el DOM ni en ningún storage.
  const rastro = [...S.__els.values()].map(e => e.innerHTML + e.textContent + e.value).join('|') + JSON.stringify([...S.__ls, ...S.__ss])
  chk('el PIN maestro no queda en el DOM ni en un storage', !rastro.includes('48271936'))
})())

// ── e) Dar acceso por hoy: el puesto fijo y el PIN a la vista ────────────
esperas.push((async () => {
  const S = armar({ respuestas: { otorgar_puesto_temporal: { ok: true, pin_temporal: '5831' } } })
  S.estado.personal = PERSONAL
  S.estado.maestro = { id: 'e-jefa', nombre: 'Marta Jefa' }
  S.abrirDarAcceso()
  const lista = () => S.__doc.getElementById('pr-acceso-personas').innerHTML
  chk('aparece TODO el personal, también quien ya tiene el puesto', (lista().match(/data-acceso-persona=/g) || []).length === 5)
  chk('cada persona dice su puesto fijo', /Juan Masero<span class="pr-acceso__detalle pr-acceso__detalle--sin">Masero · sin PIN<\/span>/.test(lista()), lista())
  chk('… y quien no tiene PIN lo dice en bordó', /Operario Uno<span class="pr-acceso__detalle pr-acceso__detalle--sin">sin PIN</.test(lista()))
  chk('… quien tiene PIN y puesto: solo el puesto', /Ana Masera<span class="pr-acceso__detalle">Masero<\/span>/.test(lista()))
  S.estado.acceso.puesto = 'masero'
  S.pintarDarAcceso()
  const ids = [...lista().matchAll(/data-acceso-persona="([^"]+)"/g)].map(m => m[1])
  chk('con un puesto elegido, primero el que lo tiene fijo SIN PIN', ids[0] === 'e-juan', ids.join(','))
  chk('… y después el resto, en el orden de la base', JSON.stringify(ids.slice(1)) === JSON.stringify(['e-fede', 'e-jefa', 'e-ana', 'e-op']), ids.join(','))
  S.estado.acceso.personaId = 'e-juan'
  S.pintarDarAcceso()
  const nota = S.__doc.getElementById('pr-acceso-nota').innerHTML
  chk('a un masero fijo sin PIN le explica que se le arma un PIN de un día', /no tiene PIN: al darle el acceso se arma uno de un día/.test(nota) && /Ya tiene el puesto fijo/.test(nota), nota)
  await S.confirmarDarAcceso()
  const o = rpcs(S, 'otorgar_puesto_temporal')[0]?.[1]
  chk('se le da el acceso aunque ya tenga el puesto fijo', o && o.p_empleado_id === 'e-juan' && o.p_puesto === 'masero' && o.p_maestro_id === 'e-jefa', JSON.stringify(o))
  chk('… y se muestra su PIN de un día, una vez', S.__doc.getElementById('pr-acceso-pin-numero').textContent === '5831' && S.__doc.getElementById('pr-acceso-pin').hidden === false)
  S.cerrarDarAcceso()
  // Planta v2: con el maestro activo, cerrar vuelve a la pantalla del acceso
  // maestro con un formulario nuevo (sin persona ni puesto elegidos).
  chk('al cerrar, el PIN se borra', S.__doc.getElementById('pr-acceso-pin-numero').textContent === '' &&
    S.__doc.getElementById('pr-acceso-pin').hidden === true && S.estado.acceso?.personaId === null && S.estado.acceso?.pin == null &&
    !JSON.stringify(S.estado).includes('5831'))
  // Con PIN y el puesto fijo: nada que resolver, y se dice.
  S.abrirDarAcceso()
  S.estado.acceso.personaId = 'e-ana'
  S.estado.acceso.puesto = 'masero'
  S.pintarDarAcceso()
  chk('con PIN y el puesto fijo, dice que puede entrar con su PIN', /puede entrar con su PIN de siempre/.test(S.__doc.getElementById('pr-acceso-nota').innerHTML))
  chk('sin nadie elegido, sin nota', S.htmlNotaAcceso(PERSONAL, { personaId: null, puesto: 'masero' }) === '')
  chk('asignar un PIN definitivo NO está en la planta (la base se lo pide a la cuenta que llama)', !/rpc\('asignar_pin_produccion'/.test(FUENTE))
})())

// ── HTML malicioso en los renders nuevos ─────────────────────────────────
esperas.push((async () => {
  const mala = [
    { id: marca('idM1'), nombre: marca('nombreM1'), es_maestro: true, puestos: [], tiene_pin: true },
    { id: 'e2', nombre: marca('nombreM2'), es_maestro: true, puestos: [marca('puesto')], tiene_pin: false },
  ]
  const S = armar({ personal: mala })
  await S.abrirMaestro()
  chequearMarcas(chk, 'fila de maestros', S.__doc.getElementById('pr-pin-maestros').innerHTML, ['idM1', 'nombreM1', 'nombreM2'])
  chequearMarcas(chk, 'persona de dar acceso', S.htmlPersonaAcceso(mala[1], null), ['nombreM2', 'puesto'])
  chequearMarcas(chk, 'persona de dar acceso (id)', S.htmlPersonaAcceso(mala[0], null), ['idM1', 'nombreM1'])
  chequearMarcas(chk, 'nota con PIN y el puesto fijo', S.htmlNotaAcceso([{ id: 'e3', nombre: marca('nombreM3'), puestos: ['masero'], tiene_pin: true }], { personaId: 'e3', puesto: 'masero' }), ['nombreM3'])
  chequearMarcas(chk, 'nota de dar acceso', S.htmlNotaAcceso(mala, { personaId: 'e2', puesto: 'masero' }), ['nombreM2'])
  S.sinAcceso(marca('texto'))
  chequearMarcas(chk, 'cartel sin acceso', S.__doc.getElementById('pr-sin-acceso').innerHTML, ['texto'])
  // Planta v2: la barra lateral ya no nombra la unidad (va en el título de la
  // cabecera, que se escribe con textContent).
  S.estado.unidades = new Map([['u-cn', marca('unidad')]])
  S.estado.persona = { id: 'e-jefa', nombre: marca('maestra'), puesto: 'encargado' }
  chequearMarcas(chk, 'barra con el acceso maestro', S.htmlLateral(), ['maestra'])
  chk('la cabecera (con la unidad) se escribe con textContent', /getElementById\('pr-cab-titulo'\)\s+t\.textContent = c\.titulo/.test(FUENTE))
})())

// ── Sin fábrica / sin permiso: se dice, sin volver al dashboard ─────────
{
  const S = armar()
  S.sinAcceso('Esta tablet no tiene permiso.')
  chk('sinAcceso escribe el texto y NO programa ninguna redirección', /Esta tablet no tiene permiso\./.test(S.__doc.getElementById('pr-sin-acceso').innerHTML) &&
    !/setTimeout|location/.test(require('./extraer').extraerFn(FUENTE, 'sinAcceso')))
  chk('con mi_sesion caída: los dos links (reintentar y la gestión)', /href="produccion\.html"/.test(S.LINKS_SIN_SESION) && /href="produccion-gestion\.html"/.test(S.LINKS_SIN_SESION))
}

// ── Nada de la oficina en la planta ──────────────────────────────────────
{
  for (const id of ['pr-config', 'pr-historial', 'pr-stock', 'pr-cfg-hoja', 'pr-header', 'pr-menu', 'pr-oficina', 'pr-elegir-unidad']) {
    chk(`la planta no tiene #${id}`, !new RegExp(`id="${id}"`).test(FUENTE))
  }
  for (const fn of ['mostrarConfig', 'mostrarHistorial', 'mostrarStockTerminado', 'conectarConfig', 'conectarHistorial', 'cargarBurbujaConos']) {
    chk(`la planta no tiene ${fn}()`, !new RegExp(`function ${fn}\\(`).test(FUENTE))
  }
  chk('ni lecturas de la oficina (indicadores, historial)', !/indicadores_produccion/.test(FUENTE))
}

// ── g) "← Atrás", arriba a la izquierda ───────────────────────────────────
{
  // Planta v2: la planilla ya no tiene "← Atrás" (#pr-planilla-volver se
  // retiró a propósito): se navega con la barra lateral (Inicio, Planilla…).
  chk('planilla: sin "← Atrás" propio, se vuelve por la barra lateral', !/id="pr-planilla-volver"/.test(FUENTE) &&
    /data-seccion="\$\{sec\.id\}"/.test(FUENTE) && /\{ id: 'inicio', texto: 'Inicio'/.test(FUENTE))
  chk('… y no quedó "‹ Máquinas"', !/Máquinas<\/button>/.test(FUENTE))
  const masas = (FUENTE.match(/<div class="pr-fila-titulo pr-masas__titulo">([\s\S]*?)<\/h1>/) || [])[1] ?? ''
  chk('masas del turno: "← Atrás" antes del título', /^\s*<button type="button" class="pr-btn pr-btn--secundario pr-atras" id="pr-masas-volver"><span aria-hidden="true">←<\/span> Atrás<\/button>\s*<h1/.test(masas), masas.slice(0, 160))
  chk('sigue yendo a donde iba', /getElementById\('pr-masas-volver'\)\.addEventListener\('click', mostrarSala\)/.test(FUENTE))
}

// ── h) El manifest de la planta ───────────────────────────────────────────
{
  const ruta = path.join(RAIZ, 'manifest.webmanifest')
  chk('existe manifest.webmanifest en la raíz', fs.existsSync(ruta))
  let m = null
  try { m = JSON.parse(fs.readFileSync(ruta, 'utf8')) } catch { m = null }
  chk('es JSON válido', !!m)
  chk('display standalone', m?.display === 'standalone')
  const start = m ? new URL(m.start_url, 'https://x.test/seis-destinos/manifest.webmanifest').pathname : ''
  chk('start_url abre la planta', start === '/seis-destinos/modulos/produccion.html', start)
  const scope = m ? new URL(m.scope, 'https://x.test/seis-destinos/manifest.webmanifest').pathname : ''
  chk('… y la planta está dentro del scope', start.startsWith(scope), scope)
  for (const tam of ['192x192', '512x512']) {
    const ic = (m?.icons ?? []).find(i => i.sizes === tam)
    const f = ic ? path.join(RAIZ, ic.src) : null
    chk(`ícono ${tam} declarado y existe`, !!f && fs.existsSync(f), ic?.src)
    if (f && fs.existsSync(f)) {
      const b = fs.readFileSync(f)
      const [w, h] = [b.readUInt32BE(16), b.readUInt32BE(20)]
      chk(`… es un PNG de ${tam}`, b.slice(1, 4).toString() === 'PNG' && `${w}x${h}` === tam, `${w}x${h}`)
    }
  }
  chk('la planta usa ESE manifest, no el de la app', /<link rel="manifest" href="\.\.\/manifest\.webmanifest">/.test(FUENTE) && !/href="\.\.\/manifest\.json"/.test(FUENTE))
  // Planta v2: el color del modo Producción es el token --p-prod.
  const prod = (FUENTE.match(/--p-prod: (#[0-9A-Fa-f]{6});/) || [])[1]
  chk('theme-color del modo Producción', !!prod && new RegExp(`<meta name="theme-color" content="${prod}">`).test(FUENTE), prod)
  chk('apple-touch-icon a la de 192', /<link rel="apple-touch-icon" href="\.\.\/icons\/planta-192\.png">/.test(FUENTE))
  const gestion = fs.readFileSync(path.join(RAIZ, 'modulos/produccion-gestion.html'), 'utf8')
  chk('la gestión sigue con el manifest de la app', /<link rel="manifest" href="\.\.\/manifest\.json">/.test(gestion) && !/manifest\.webmanifest/.test(gestion))
}

fin()
