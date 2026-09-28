// ADMINISTRACIÓN — Cobranzas por asentar (27/09/2026).
//
// El CHOFER carga la cobranza con el nombre que él le da al cliente
// ("Caserato") y NO ve ninguna lista de clientes (eso lo prueba
// test-cobranzas-cabecera.js sobre cobranzas.html). Acá, quien tiene
// cobranzas:procesar ve las "registrada" (cobranzas_por_asentar), elige el
// cliente —los SUGERIDOS primero y destacados; si no, un buscador de TODOS los
// clientes por nombre, razón social y apodo, con la empresa al lado— y asienta
// con asentar_cobranza(p_id, p_cliente_id): muestra en qué cuenta se descontó
// y el saldo que le queda. Desde la cuenta del cliente, una cobranza asentada
// se abre y se reabre con motivo (reabrir_cobranza).
//
// Los datos salen del módulo compartido de la maqueta
// (pruebas/datos-maqueta/administracion.js): la pantalla que se mira y la que
// se prueba hablan de lo mismo.
//
//   node pruebas/test-administracion-cobranzas.js

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')
const DATOS = require('./datos-maqueta/administracion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()

const POR_ASENTAR = DATOS.rpc.cobranzas_por_asentar
const COB_A = POR_ASENTAR[0].cobranza_id      // "Caserato", con un sugerido y dos cheques
const COB_B = POR_ASENTAR[1].cobranza_id      // sin sugeridos, solo efectivo
const COB_C = DATOS.tablas.cobranzas.find(c => c.cliente_id === 'c1').id   // asentada en c1
const PRUEBA = 'u-robot'
const CLIENTES = [
  ...DATOS.tablas.clientes,
  { id: 'c-robot', nombre: 'Cliente Robot', razon_social: null, apodos: [], unidad_negocio_id: PRUEBA, activo: true },
]
const tick = () => new Promise(r => setImmediate(r))
const esperar = async (n = 6) => { for (let i = 0; i < n; i++) await tick() }

// Un doble de tabla que respeta eq / in (el sandbox ignora los filtros).
function tabla(filas) {
  return (fl) => {
    let r = filas
    for (const f of fl) {
      if (f[0] === 'eq') r = r.filter(x => x[f[1]] === f[2])
      if (f[0] === 'in') r = r.filter(x => f[2].includes(x[f[1]]))
    }
    return { data: r, error: null }
  }
}

function nuevo({ tareas = ['cobranzas:procesar', 'cobranzas:ver_todo'], rol = 'usuario', rpc = null, soyDePrueba = false } = {}) {
  const S = construirAdministracion(ARCHIVO)
  S.estado.miRolApp = rol
  S.estado.misTareas = new Map([['retiros:ver', { unidades: ['u-n'] }], ...tareas.map(t => [t, null])])
  S.estado.empresas = [...DATOS.tablas.unidades_negocio, { id: PRUEBA, nombre: 'Pruebas (robot)', es_prueba: true }]
  S.estado.fabrica = { ok: true, unidades: new Set([PRUEBA]), personas: new Set(), soyDePrueba }
  S.__tablas.cobranza_cheques = tabla(DATOS.tablas.cobranza_cheques)
  S.__tablas.cobranza_fotos = tabla(DATOS.tablas.cobranza_fotos)
  S.__tablas.bancos_bcra = DATOS.tablas.bancos_bcra
  S.__tablas.clientes = tabla(CLIENTES)
  S.__tablas.v_cobranzas = tabla(DATOS.tablas.v_cobranzas)
  S.__tablas.cobranzas = tabla(DATOS.tablas.cobranzas)
  S.__tablas.cliente_movimientos = tabla(DATOS.tablas.cliente_movimientos)
  S.__tablas.ordenes_retiro = [{ id: 'o1', codigo: 'N-0012' }]
  S.__setRpc(rpc ?? (async (n) => {
    if (n === 'cobranzas_por_asentar') return { data: POR_ASENTAR, error: null }
    if (n === 'asentar_cobranza') return { data: DATOS.rpc.asentar_cobranza, error: null }
    if (n === 'cuenta_cliente') return { data: DATOS.rpc.cuenta_cliente, error: null }
    if (n === 'reabrir_cobranza') return { data: null, error: null }
    return { data: null, error: null }
  }))
  return S
}
const html = (S, id) => S.__els.get(id)?.innerHTML ?? ''

async function pruebas() {
  // ══ 1. PERMISOS Y PORTADA ═══════════════════════════════════════════════════
  {
    const S = nuevo()
    chk('con cobranzas:procesar se ve la sección "Cobranzas por asentar"', S.seccionesVisibles().some(s => s.id === 'cobranzas'))
    chk('la sección es global (no depende de la empresa)', S.SECCIONES.find(s => s.id === 'cobranzas')?.global === true)
    const S2 = nuevo({ tareas: ['cobranzas:ver_todo'] })
    chk('solo con ver_todo NO se ve (asentar pide procesar)', !S2.seccionesVisibles().some(s => s.id === 'cobranzas'))
    const S3 = nuevo({ tareas: [], rol: 'super_admin' })
    chk('un super_admin sí la ve (bypass)', S3.seccionesVisibles().some(s => s.id === 'cobranzas'))
    const S4 = nuevo({ tareas: ['cobranzas:procesar'] })
    S4.estado.misTareas = new Map([['cobranzas:procesar', null]])
    chk('quien solo tiene procesar entra a Administración (hay una sección global)', S4.hayGlobales())

    await S.mostrarInicio()
    await esperar()
    const h = html(S, 'ad-secciones')
    chk('la portada tiene la tarjeta con su número', /data-seccion="cobranzas"/.test(h) && />2<\/span>/.test(h) && /cobranzas para elegir el cliente y asentar/.test(h), h)
    const S5 = nuevo({ rpc: async (n) => n === 'cobranzas_por_asentar' ? { data: null, error: { message: 'sin red' } } : { data: [], error: null } })
    await S5.mostrarInicio()
    await esperar()
    chk('si no se puede contar dice "No se pudo contar", nunca un 0', /data-seccion="cobranzas"[\s\S]*?—[\s\S]*?No se pudo contar/.test(html(S5, 'ad-secciones')))
  }

  // ══ 2. LA LISTA: una tarjeta por cobranza ═══════════════════════════════════
  {
    const S = nuevo()
    await S.mostrarCobranzas()
    await esperar()
    chk('llama a cobranzas_por_asentar()', S.__llamadas.rpc.some(r => r[0] === 'cobranzas_por_asentar'))
    const h = html(S, 'ad-cobranzas-lista')
    chk('una tarjeta por cobranza', (h.match(/class="ad-tarjeta ad-cob"/g) || []).length === 2)
    chk('lo que escribió el chofer, bien grande', /<div class="ad-cob__escrito">«Caserato»<\/div>/.test(h))
    chk('quién la cargó y la fecha', /Lo cargó Mariano Chofer · 26\/09\/2026/.test(h))
    chk('efectivo, cheques y total', /Efectivo[\s\S]*?\$\s50\.000,00/.test(h) && /Total[\s\S]*?\$\s437\.300,50/.test(h))
    chk('las observaciones', /Dejó dos cheques y el resto en efectivo\./.test(h))
    chk('los cheques con su banco por nombre, número, importe y pago', /\$\s287\.300,50 · BANCO DE GALICIA Y BUENOS AIRES S\.A\. · Nº 12345678 · paga el 20\/10\/2026/.test(h) && /a la vista/.test(h), h.slice(0, 2000))
    chk('cada cheque con su "Ver la foto"', (h.match(/data-cob-foto="foto-a1"/g) || []).length === 2)
    chk('la de solo efectivo dice "Sin cheques" en cero y no dibuja cheques', /«el de la esquina de la ruta»/.test(h))
    chk('cada tarjeta con su "Asentar"', new RegExp(`data-asentar="${COB_A}"`).test(h) && new RegExp(`data-asentar="${COB_B}"`).test(h))
    chk('la cuenta dice cuántas hay por asentar', S.__els.get('ad-cobranzas-cuenta').textContent === '2 por asentar')
    chk('los cheques se piden en UNA consulta para todas', S.__llamadas.consultas.filter(c => c[0] === 'cobranza_cheques').length === 1)
    chk('sin embeds: el select de los cheques no nombra otra tabla', S.__llamadas.consultas.filter(c => c[0] === 'cobranza_cheques').every(c => !/\(/.test(c[1].find(f => f[0] === 'select')?.[1] ?? '')))
  }
  {
    // Sin ver_todo, los cheques de otros no llegan (su RLS): se dice.
    const S = nuevo({ tareas: ['cobranzas:procesar'] })
    S.__tablas.cobranza_cheques = []
    await S.mostrarCobranzas()
    await esperar()
    chk('sin ver_todo: el aviso de que los cheques de otros no se ven', /los cheques de las que cargaron otras personas no se ven/.test(html(S, 'ad-cobranzas-aviso')))
    chk('y en la tarjeta: "Tiene 2 cheques, pero con tu usuario no se pueden ver"', /Tiene 2 cheques, pero con tu usuario no se pueden ver/.test(html(S, 'ad-cobranzas-lista')))
  }
  {
    const S = nuevo({ rpc: async (n) => n === 'cobranzas_por_asentar' ? { data: [], error: null } : { data: null, error: null } })
    await S.mostrarCobranzas()
    await esperar()
    chk('sin cobranzas: "No hay cobranzas por asentar."', /No hay cobranzas por asentar\./.test(html(S, 'ad-cobranzas-lista')))
    const S2 = nuevo({ rpc: async () => ({ data: null, error: { message: 'x' } }) })
    await S2.mostrarCobranzas()
    await esperar()
    chk('si falla la lectura se dice, en bordó', /ad-aviso--grave">No se pudieron leer las cobranzas por asentar/.test(html(S2, 'ad-cobranzas-lista')))
    const S3 = nuevo({ tareas: ['cobranzas:ver_todo'] })
    await S3.mostrarCobranzas()
    chk('sin procesar no abre la lista (vuelve a la portada)', !S3.__llamadas.rpc.some(r => r[0] === 'cobranzas_por_asentar') && S3.estado.vista === 'ad-vista-inicio')
  }

  // ══ 3b. EL PROYECTO DEL TALLER (28/09/2026) ═════════════════════════════════
  {
    const PROY = [
      { id: 'p1', nombre: 'Máquina barquillo', destino: 'externo', estado: 'en_curso', cliente: 'Carrizo', cliente_id: 'c-taller' },
      { id: 'p2', nombre: 'Viejo', destino: 'externo', estado: 'cancelado', cliente: 'Carrizo', cliente_id: 'c-taller' },
      { id: 'p3', nombre: 'De otro', destino: 'externo', estado: 'aprobado', cliente: 'Otro cliente', cliente_id: 'c-otro' },
      { id: 'p4', nombre: 'Interno', destino: 'interno', estado: 'aprobado', cliente: null, cliente_id: null },
      { id: 'p5', nombre: marca('proyecto'), destino: 'externo', estado: 'aprobado', cliente: 'Carrizo', cliente_id: 'c-taller' },
      // Otro cliente que SE LLAMA igual: el proyecto es de otro id y no se ofrece.
      { id: 'p6', nombre: 'Homónimo', destino: 'externo', estado: 'aprobado', cliente: 'Carrizo', cliente_id: 'c-otro-carrizo' },
    ]
    const conTaller = (proyectos) => {
      const S = nuevo({ rpc: async (n) => {
        if (n === 'cobranzas_por_asentar') return { data: POR_ASENTAR, error: null }
        if (n === 'proyectos_taller') return proyectos
        if (n === 'asentar_cobranza') return { data: DATOS.rpc.asentar_cobranza, error: null }
        return { data: null, error: null }
      } })
      S.estado.empresas = [...S.estado.empresas, { id: 'u-t', nombre: 'Taller' }]
      S.__tablas.clientes = tabla([...CLIENTES, { id: 'c-taller', nombre: 'Carrizo', razon_social: null, apodos: [], unidad_negocio_id: 'u-t', activo: true }])
      return S
    }
    const S = conTaller({ data: PROY, error: null })
    await S.mostrarCobranzas(); await esperar()
    await S.abrirAsentar(COB_A); await esperar()
    S.elegirClienteAsentar('c-taller'); await esperar()
    const h = html(S, 'ad-cobranzas-lista')
    chk('cliente del Taller: busca sus proyectos (proyectos_taller, todos)', S.__llamadas.rpc.some(x => x[0] === 'proyectos_taller' && x[1]?.p_solo_activos === false))
    chk('ofrece los proyectos de ESE cliente, externos y no cancelados', /id="ad-asentar-proyecto"/.test(h) && /value="p1"/.test(h) && !/value="p2"/.test(h) && !/value="p3"/.test(h) && !/value="p4"/.test(h) && !/value="p6"/.test(h))
    chk('se compara por cliente_id, no por nombre', /proyectosDelCliente[\s\S]{0,300}String\(p\.cliente_id\) === String\(cl\.id\)/.test(require('fs').readFileSync(require('path').join(__dirname, '..', 'modulos/administracion.html'), 'utf8')))
    chk('es opcional: "Ninguno en particular" primero', /<option value="">Ninguno en particular<\/option>/.test(h))
    chk('el nombre del proyecto va escapado', !/<b data-xss="proyecto">/.test(h) && /&lt;b data-xss=&quot;proyecto&quot;&gt;/.test(h))
    S.estado.cobranzas.asentando.proyectoId = 'p1'
    await S.confirmarAsentar(); await esperar()
    const r = S.__llamadas.rpc.filter(x => x[0] === 'asentar_cobranza')
    chk('con proyecto elegido, viaja en p_proyecto_id', r[0]?.[1]?.p_proyecto_id === 'p1' && r[0]?.[1]?.p_cliente_id === 'c-taller', JSON.stringify(r[0]?.[1]))

    const S2 = conTaller({ data: PROY, error: null })
    await S2.mostrarCobranzas(); await esperar(); await S2.abrirAsentar(COB_A); await esperar()
    S2.elegirClienteAsentar('c-taller'); await esperar()
    await S2.confirmarAsentar(); await esperar()
    chk('sin elegir proyecto, va null', S2.__llamadas.rpc.find(x => x[0] === 'asentar_cobranza')?.[1]?.p_proyecto_id === null)

    const S3 = conTaller({ data: null, error: null })
    await S3.mostrarCobranzas(); await esperar(); await S3.abrirAsentar(COB_A); await esperar()
    S3.elegirClienteAsentar('c-taller'); await esperar()
    chk('sin taller:ver (la función devuelve null) lo dice y se asienta sin proyecto', /no se ven los proyectos del Taller/.test(html(S3, 'ad-cobranzas-lista')))
    const S4 = conTaller({ data: PROY.filter(p => p.cliente !== 'Carrizo'), error: null })
    await S4.mostrarCobranzas(); await esperar(); await S4.abrirAsentar(COB_A); await esperar()
    S4.elegirClienteAsentar('c-taller'); await esperar()
    chk('un cliente del Taller sin proyectos: no aparece el selector', !/id="ad-asentar-proyecto"/.test(html(S4, 'ad-cobranzas-lista')))
  }

  // ══ 3. ASENTAR: sugeridos primero, después el buscador ══════════════════════
  {
    const S = nuevo()
    await S.mostrarCobranzas()
    await esperar()
    await S.abrirAsentar(COB_A)
    await esperar()
    let h = html(S, 'ad-cobranzas-lista')
    const iSug = h.indexOf('ad-opcion-cliente--sugerido')
    const iBus = h.indexOf('id="ad-asentar-buscar"')
    chk('los sugeridos vienen primero (antes del buscador)', iSug > -1 && iBus > -1 && iSug < iBus)
    chk('el sugerido, destacado y con su empresa', /class="ad-opcion-cliente ad-opcion-cliente--sugerido" data-asentar-cliente="c1"[^>]*>[\s\S]*?Distribuidora Anatolia[\s\S]*?Cucuruchos Nuss/.test(h))
    chk('dice por qué se sugiere', /Sugerido por lo que escribió el chofer/.test(h))
    const res = html(S, 'ad-asentar-resultados') || h
    chk('el buscador arranca con TODOS los demás clientes, con su empresa', /Kiosco Pepe/.test(res) && /Almacén Rivadavia[\s\S]*?RIVADAVIA SRL · Dolce Pasta/.test(res))
    chk('el sugerido no se repite en el buscador', (h.match(/data-asentar-cliente="c1"/g) || []).length === 1 && !/data-asentar-cliente="c1"/.test(res))
    chk('la fábrica de pruebas NO aparece para una cuenta real', !/Cliente Robot/.test(h + res))
    chk('los clientes se leen de la tabla clientes, solo los activos', S.__llamadas.consultas.some(c => c[0] === 'clientes' && c[1].some(f => f[0] === 'eq' && f[1] === 'activo' && f[2] === true)))

    // El buscador: nombre, razón social y apodo, sin acentos.
    S.buscarClienteAsentar('pepe de la')
    chk('busca por apodo ("pepe de la" → Kiosco Pepe)', /Kiosco Pepe/.test(html(S, 'ad-asentar-resultados')) && !/Rivadavia/.test(html(S, 'ad-asentar-resultados')))
    S.buscarClienteAsentar('rivadavia srl')
    chk('busca por razón social', /Almacén Rivadavia/.test(html(S, 'ad-asentar-resultados')))
    S.buscarClienteAsentar('ALMACEN')
    chk('sin acentos ni mayúsculas ("ALMACEN" → Almacén)', /Almacén Rivadavia/.test(html(S, 'ad-asentar-resultados')))
    S.buscarClienteAsentar('zzz')
    chk('sin resultados lo dice', /Ningún cliente coincide con «zzz»\./.test(html(S, 'ad-asentar-resultados')))
    chk('buscar NO redibuja la tarjeta (no se pierde el foco)', html(S, 'ad-cobranzas-lista') === h)

    // Confirmar sin elegir: no llama a nada.
    await S.confirmarAsentar()
    chk('sin elegir no llama a asentar_cobranza', !S.__llamadas.rpc.some(r => r[0] === 'asentar_cobranza'))
    chk('y lo dice pegado', /Elegí el cliente: un sugerido o uno del buscador\./.test(html(S, 'ad-cobranzas-lista')))

    S.elegirClienteAsentar('c1')
    h = html(S, 'ad-cobranzas-lista')
    chk('elegido: dice en qué cuenta se va a asentar', /Se va a asentar en la cuenta de Distribuidora Anatolia \(Cucuruchos Nuss\): baja su deuda en \$\s437\.300,50\./.test(h))
    chk('elegido: el botón marcado', /data-asentar-cliente="c1" data-asentar-sugerido="1" aria-pressed="true"/.test(h))
    S.elegirClienteAsentar('no-existe')
    chk('un cliente que no está no se elige', S.estado.cobranzas.asentando.cliente.id === 'c1')

    await S.confirmarAsentar()
    await esperar()
    const r = S.__llamadas.rpc.filter(x => x[0] === 'asentar_cobranza')
    chk('asentar_cobranza UNA vez', r.length === 1)
    chk('el payload: { p_id, p_cliente_id } y sin proyecto (no es del Taller)', JSON.stringify(r[0]?.[1]) === JSON.stringify({ p_id: COB_A, p_cliente_id: 'c1', p_proyecto_id: null }), JSON.stringify(r[0]?.[1]))
    chk('un cliente que no es del Taller no busca proyectos', !S.__llamadas.rpc.some(x => x[0] === 'proyectos_taller'))
    h = html(S, 'ad-cobranzas-lista')
    chk('muestra en qué cuenta se descontó y el saldo que le queda',
      /Se descontaron \$\s437\.300,50 de la cuenta de Distribuidora Anatolia \(Cucuruchos Nuss\)\. Le queda un saldo a favor de \$\s311\.300,50\./.test(h), h.slice(h.indexOf('Asentada'), h.indexOf('Asentada') + 300))
    chk('ya no dice "Asentar" en esa tarjeta, y tiene "Listo"', !new RegExp(`data-asentar="${COB_A}"`).test(h) && new RegExp(`data-cobranza-listo="${COB_A}"`).test(h))
    chk('la cuenta baja a 1 por asentar', S.__els.get('ad-cobranzas-cuenta').textContent === '1 por asentar')
    chk('el mensaje de éxito', S.__llamadas.exitos.includes('Cobranza asentada.'))
    S.quitarHecho(COB_A)
    chk('"Listo" la saca de la lista', !html(S, 'ad-cobranzas-lista').includes(COB_A))
  }
  {
    // El saldo que queda: con deuda, en cero, y si no vino.
    const S = nuevo()
    chk('saldo con deuda', S.textoSaldoCliente(12000) === 'Le queda un saldo de $\u00a012.000,00.')
    chk('saldo en cero', S.textoSaldoCliente(0) === 'Su cuenta queda en cero.')
    chk('saldo que no vino: nunca un $ 0,00 inventado', S.textoSaldoCliente(null) === 'No se pudo leer el saldo que le queda.' && S.textoSaldoCliente(undefined) === 'No se pudo leer el saldo que le queda.')
  }
  {
    // Sin sugeridos: el buscador, con el foco.
    const S = nuevo()
    await S.mostrarCobranzas()
    await esperar()
    let enfocado = null
    S.__doc.getElementById('ad-asentar-buscar').focus = () => { enfocado = 'ad-asentar-buscar' }
    await S.abrirAsentar(COB_B)
    await esperar()
    const h = html(S, 'ad-cobranzas-lista')
    chk('sin sugeridos lo dice con lo que escribió el chofer', /Ningún cliente se llama «el de la esquina de la ruta» ni tiene ese apodo\. Buscalo:/.test(h))
    chk('sin sugeridos no hay ninguno destacado', !/ad-opcion-cliente--sugerido/.test(h))
    chk('sin sugeridos el foco va al buscador', enfocado === 'ad-asentar-buscar')
    S.elegirClienteAsentar('c-dolce')
    chk('elegido del buscador: nombre y empresa', /Se va a asentar en la cuenta de Almacén Rivadavia \(Dolce Pasta\)/.test(html(S, 'ad-cobranzas-lista')))
    S.cancelarAsentar()
    chk('Cancelar cierra el panel y vuelve el botón', !/ad-asentar-panel/.test(html(S, 'ad-cobranzas-lista')) && new RegExp(`data-asentar="${COB_B}"`).test(html(S, 'ad-cobranzas-lista')))
  }
  {
    // El error de la base, tal cual, y el panel sigue abierto.
    const S = nuevo({ rpc: async (n) => n === 'cobranzas_por_asentar' ? { data: POR_ASENTAR, error: null }
      : n === 'asentar_cobranza' ? { data: null, error: { message: 'Solo se puede asentar una cobranza por controlar (esta está asentada).' } } : { data: null, error: null } })
    await S.mostrarCobranzas()
    await esperar()
    await S.abrirAsentar(COB_A)
    await esperar()
    S.elegirClienteAsentar('c1')
    await S.confirmarAsentar()
    await esperar()
    const h = html(S, 'ad-cobranzas-lista')
    chk('el error de la base se muestra TAL CUAL, pegado', /ad-error-pegado">Solo se puede asentar una cobranza por controlar \(esta está asentada\)\./.test(h))
    chk('el panel sigue abierto con el cliente elegido', /ad-asentar-panel/.test(h) && S.estado.cobranzas.asentando?.cliente?.id === 'c1' && S.estado.cobranzas.asentando.enviando === false)
  }
  {
    // Quien no ve ningún cliente (sin Retiros ni Pedidos): se dice, y quedan los sugeridos.
    const S = nuevo()
    S.__tablas.clientes = []
    await S.mostrarCobranzas()
    await esperar()
    await S.abrirAsentar(COB_A)
    await esperar()
    chk('sin clientes visibles: lo dice y ofrece los sugeridos', /no se ve la lista de clientes de ninguna empresa[\s\S]*elegí uno de los sugeridos/.test(html(S, 'ad-asentar-resultados') || html(S, 'ad-cobranzas-lista')))
    const S2 = nuevo()
    S2.__tablas.clientes = () => ({ data: null, error: { message: 'x' } })
    await S2.mostrarCobranzas()
    await esperar()
    await S2.abrirAsentar(COB_B)
    await esperar()
    chk('si no se pueden leer los clientes se dice en bordó', /ad-aviso--grave">No se pudo leer la lista de clientes/.test(html(S2, 'ad-asentar-resultados')))
  }
  {
    // Una cuenta de la fábrica de pruebas SÍ ve a los clientes de prueba.
    const S = nuevo({ soyDePrueba: true })
    await S.mostrarCobranzas()
    await esperar()
    await S.abrirAsentar(COB_B)
    await esperar()
    chk('cuenta de prueba: ve el cliente de la fábrica de pruebas', /Cliente Robot/.test(html(S, 'ad-asentar-resultados')))
  }

  // ══ 4. UNA COBRANZA ASENTADA: desde la cuenta del cliente, con "Reabrir" ════
  {
    const S = nuevo()
    S.estado.clientes = CLIENTES
    S.estado.catalogo = { productos: [], presentaciones: [], marcas: [] }
    S.estado.catalogoEmpresa = 'u-n'
    await S.abrirCliente('c1')
    await esperar()
    const h = html(S, 'ad-cliente-cuerpo')
    chk('la cuenta muestra la cobranza asentada', /Cobranza del 22\/09\/2026/.test(h))
    chk('y la cobranza se abre (un botón con su id)', new RegExp(`<button type="button" class="ad-renglon ad-renglon--boton" data-cuenta-cobranza="${COB_C}">`).test(h))
    chk('los otros movimientos NO se abren', (h.match(/data-cuenta-cobranza=/g) || []).length === 1)

    await S.abrirCobranza(COB_C, { origen: 'cuenta', clienteOrigen: 'c1' })
    await esperar()
    let d = html(S, 'ad-cobranza-cuerpo')
    chk('el detalle dice asentada, por quién y en qué cuenta', /Asentada por Yanina Godoy en la cuenta de Distribuidora Anatolia \(Cucuruchos Nuss\)\./.test(d), d.slice(0, 400))
    chk('el volver dice "Cuenta del cliente"', S.__els.get('ad-cobranza-volver').textContent === '‹ Cuenta del cliente')
    chk('tiene "Reabrir"', /id="ad-cobranza-reabrir"/.test(d))
    chk('una asentada no tiene "Asentar"', !/data-asentar="/.test(d))
    S.pedirReabrir()
    d = html(S, 'ad-cobranza-cuerpo')
    chk('Reabrir pide el motivo y dice que la deuda vuelve al cliente', /¿Por qué se reabre\? \(obligatorio\)/.test(d) && /la deuda vuelve a la cuenta del cliente/.test(d))
    S.estado.cobranza.reabriendo.motivo = 'no'
    await S.confirmarReabrir()
    chk('un motivo corto no llama a reabrir_cobranza', !S.__llamadas.rpc.some(r => r[0] === 'reabrir_cobranza') && /Escribí por qué se reabre\./.test(html(S, 'ad-cobranza-cuerpo')))
    S.estado.cobranza.reabriendo.motivo = '  Era de otro cliente  '
    S.__els.get('ad-reabrir-motivo').value = '  Era de otro cliente  '
    await S.confirmarReabrir()
    await esperar()
    const r = S.__llamadas.rpc.filter(x => x[0] === 'reabrir_cobranza')
    chk('reabrir_cobranza con p_id y el motivo limpio', r.length === 1 && JSON.stringify(r[0][1]) === JSON.stringify({ p_id: COB_C, p_motivo: 'Era de otro cliente' }), JSON.stringify(r))
    chk('el mensaje dice que la deuda volvió al cliente', S.__llamadas.exitos.includes('Cobranza reabierta: la deuda volvió a la cuenta del cliente.'))
    S.volverDeCobranza()
    await esperar()
    chk('volver lleva a la cuenta del cliente', S.estado.vista === 'ad-vista-cliente' && S.estado.cliente?.id === 'c1')
  }
  {
    // El error de reabrir, tal cual.
    const S = nuevo({ rpc: async (n) => n === 'reabrir_cobranza' ? { data: null, error: { message: 'Solo se puede reabrir una cobranza asentada (esta está por controlar).' } } : { data: null, error: null } })
    await S.abrirCobranza(COB_C, { origen: 'link' })
    await esperar()
    S.pedirReabrir()
    S.__doc.getElementById('ad-reabrir-motivo').value = 'otro cliente'
    await S.confirmarReabrir()
    await esperar()
    chk('el error de reabrir va pegado, tal cual', /ad-error-pegado">Solo se puede reabrir una cobranza asentada \(esta está por controlar\)\./.test(html(S, 'ad-cobranza-cuerpo')))
  }
  {
    // Sin procesar (solo ver_todo): la cobranza se ve, pero sin "Reabrir".
    const S = nuevo({ tareas: ['cobranzas:ver_todo'] })
    await S.abrirCobranza(COB_C, { origen: 'cuenta', clienteOrigen: 'c1' })
    await esperar()
    chk('sin procesar no hay "Reabrir"', !/ad-cobranza-reabrir/.test(html(S, 'ad-cobranza-cuerpo')) && /Asentada/.test(html(S, 'ad-cobranza-cuerpo')))
    await S.abrirCobranza('no-es-un-uuid')
    chk('un id que no es uuid no abre nada', S.estado.cobranza.id === COB_C)
  }
  {
    // Una por asentar, abierta por link: tiene "Asentar" con sus sugeridos.
    const S = nuevo()
    await S.abrirCobranza(COB_A, { origen: 'link' })
    await esperar()
    chk('abierta por link, una por asentar tiene "Asentar"', new RegExp(`data-asentar="${COB_A}"`).test(html(S, 'ad-cobranza-cuerpo')))
    await S.abrirAsentar(COB_A)
    await esperar()
    chk('y sus sugeridos, primero', /ad-opcion-cliente--sugerido" data-asentar-cliente="c1"/.test(html(S, 'ad-cobranza-cuerpo')))
    S.elegirClienteAsentar('c1')
    await S.confirmarAsentar()
    await esperar()
    chk('asentar desde el detalle usa el mismo payload', S.__llamadas.rpc.some(x => x[0] === 'asentar_cobranza' && JSON.stringify(x[1]) === JSON.stringify({ p_id: COB_A, p_cliente_id: 'c1', p_proyecto_id: null })))
    chk('y el detalle muestra lo descontado', /Se descontaron \$\s437\.300,50 de la cuenta de Distribuidora Anatolia/.test(html(S, 'ad-cobranza-cuerpo')))
  }
  {
    // La cuenta: si los movimientos no cierran con cuenta_cliente, NINGUNA se abre.
    const S = nuevo()
    S.estado.clientes = CLIENTES
    S.__tablas.cliente_movimientos = tabla(DATOS.tablas.cliente_movimientos.slice(0, 2))
    await S.abrirCliente('c1')
    await esperar()
    chk('si no cierran, ninguna cobranza se abre (nunca la equivocada)', !/data-cuenta-cobranza/.test(html(S, 'ad-cliente-cuerpo')))
    // Los movimientos son otros (mismo largo): tampoco se abre ninguna.
    const S1 = nuevo()
    S1.estado.clientes = CLIENTES
    S1.__tablas.cliente_movimientos = tabla(DATOS.tablas.cliente_movimientos.map(m => ({ ...m, importe: m.importe + 1 })))
    await S1.abrirCliente('c1')
    await esperar()
    chk('si los importes no coinciden, ninguna se abre', !/data-cuenta-cobranza/.test(html(S1, 'ad-cliente-cuerpo')))
    const S2 = nuevo({ tareas: [] })
    S2.estado.clientes = CLIENTES
    await S2.abrirCliente('c1')
    await esperar()
    chk('sin permisos de cobranzas la fila no se abre', !/data-cuenta-cobranza/.test(html(S2, 'ad-cliente-cuerpo')) && /Cobranza del 22\/09\/2026/.test(html(S2, 'ad-cliente-cuerpo')))
    chk('y ni se consulta cliente_movimientos', !S2.__llamadas.consultas.some(c => c[0] === 'cliente_movimientos'))
    const conId = { id: 'c1', codigos: new Map(), cuenta: [{ fecha: '2026-09-22', tipo: 'cobranza', detalle: 'Cobranza', importe: -1, saldo: 1, cobranza_id: COB_C }] }
    chk('el render tampoco la abre sin permisos, aunque traiga el id', !/data-cuenta-cobranza/.test(S2.htmlCuenta(conId)))
  }

  // ══ 5. LA FOTO ═══════════════════════════════════════════════════════════════
  {
    const S = nuevo()
    await S.mostrarCobranzas()
    await esperar()
    await S.verFotoCobranza('foto-a1')
    const u = S.__urlsFirmadas()
    chk('la foto se firma al tocarla, del bucket cobranzas, por 300 segundos', u.length === 1 && u[0][0] === 'cobranzas' && u[0][1] === DATOS.tablas.cobranza_fotos[0].storage_path && u[0][2] === 300)
    chk('y se muestra en el visor', S.__els.get('ad-visor').hidden === false && /firmada/.test(S.__els.get('ad-visor-img').src))
    S.cerrarVisorCobranza()
    chk('cerrar el visor lo esconde y borra la imagen', S.__els.get('ad-visor').hidden === true && S.__els.get('ad-visor-img').src === '')
    await S.verFotoCobranza('no-existe')
    chk('una foto que no está: se dice', S.__llamadas.errores.some(e => /no tiene una foto que se pueda ver/.test(e)))
  }

  // ══ 6. HTML MALICIOSO EN CADA RENDER ═════════════════════════════════════════
  {
    const S = nuevo()
    const mala = { cobranza_id: COB_A, fecha: '2026-09-26', cliente_escrito: marca('escrito'), cargada_por: marca('cargo'), efectivo: 1, cheques: 1,
      total: 2, moneda: 'ARS', observaciones: marca('obs'), sugeridos: [{ cliente_id: marca('sug-id'), nombre: marca('sug-nombre'), empresa: marca('sug-empresa') }] }
    S.estado.bancos = new Map([['007', marca('banco')]])
    const ch = [{ id: 'k', cobranza_id: COB_A, foto_id: marca('foto'), banco_codigo: '007', numero: marca('numero'), tipo: 'comun', importe: 1 }]
    const c = S.datosCobranza({ ...mala, cobranza_id: marca('cob-id') })
    chequearMarcas(chk, 'tarjeta', S.htmlTarjetaCobranza(c, { cheques: ch }), ['escrito', 'cargo', 'obs', 'banco', 'numero', 'foto', 'cob-id'])
    chequearMarcas(chk, 'tarjeta asentada', S.htmlTarjetaCobranza(c, { hecho: { importe: 1, saldo: 1, cliente: { nombre: 'x' } } }), ['cob-id'])
    const cReg = S.datosCobranza({ ...mala, estado: 'registrada', sugeridos: [] })
    chequearMarcas(chk, 'panel sin sugeridos', S.htmlPanelAsentar(cReg, { id: 'x', sugeridos: [], busqueda: '', cliente: null, error: null }), ['escrito'])
    const cAnu = S.datosCobranza({ ...mala, cobranza_id: marca('cob-id2') })
    chequearMarcas(chk, 'tarjeta en su detalle', S.htmlTarjetaCobranza(cAnu, { asentando: null, conAcciones: true }), ['cob-id2'])
    S.estado.cobranzas.clientes = [{ id: marca('cli-id'), nombre: marca('cli-nombre'), razon_social: marca('cli-razon'), apodos: [], unidad_negocio_id: 'u-n' }]
    const a = { id: COB_A, sugeridos: mala.sugeridos, busqueda: marca('busqueda'), cliente: { id: 'x', nombre: marca('eleg-nombre'), empresa: marca('eleg-empresa') }, error: marca('error') }
    chequearMarcas(chk, 'panel de asentar', S.htmlPanelAsentar(c, a), ['sug-id', 'sug-nombre', 'sug-empresa', 'busqueda', 'eleg-nombre', 'eleg-empresa', 'error'])
    a.busqueda = ''
    chequearMarcas(chk, 'resultados', S.htmlResultadosAsentar(a), ['cli-id', 'cli-nombre', 'cli-razon'])
    chequearMarcas(chk, 'hecho', S.htmlHechoCob({ importe: 1, saldo: 2, cliente: { nombre: marca('h-nombre'), empresa: marca('h-empresa') } }), ['h-nombre', 'h-empresa'])
    S.estado.cobranzas.error = marca('err-lista')
    chequearMarcas(chk, 'error de la lista', S.htmlListaCobranzas(), ['err-lista'])
    const d = { fila: { ...mala, id: COB_C, cobranza_id: COB_C, estado: 'procesada', procesada_por_nombre: marca('proc') }, cliente: { nombre: marca('d-cliente'), empresa: marca('d-empresa') }, clienteId: 'c1', cheques: [],
      reabriendo: { motivo: marca('motivo'), error: marca('r-error'), enviando: false } }
    chequearMarcas(chk, 'detalle con reabrir', S.htmlCobranzaAbierta(d), ['proc', 'd-cliente', 'd-empresa', 'motivo', 'r-error', 'escrito'])
    const cuenta = { id: 'c1', codigos: new Map(), cuenta: [{ fecha: '2026-09-22', tipo: 'cobranza', detalle: marca('mov'), importe: -1, saldo: 1, cobranza_id: marca('mov-id') }] }
    S.estado.clientes = CLIENTES
    chequearMarcas(chk, 'cuenta con una cobranza', S.htmlCuenta(cuenta), ['mov', 'mov-id'])
  }
}

pruebas().then(fin).catch(e => { console.log('EXCEPCIÓN:', e && e.stack || e); console.log('ROJO'); process.exit(1) })
