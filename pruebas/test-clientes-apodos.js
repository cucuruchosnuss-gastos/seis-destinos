// LOS APODOS DE LOS CLIENTES (02/10/2026).
//
// Exige:
//  - Órdenes de retiro (el depósito): buscar "Turi" encuentra a SALVADOR
//    LOFORTE por su apodo y el resultado dice "SALVADOR LOFORTE · Turi" (el
//    apodo al lado del nombre, resaltado); si el nombre ya coincide, no;
//  - buscar_clientes devuelve (desde el 02/10/2026) `apodos` y `apodo_coincide`
//    en cada cliente: Cobranzas (la cobranza ya asentada) y Órdenes de retiro
//    (cuando la base contesta) muestran "SALVADOR LOFORTE · Turi" con ese
//    `apodo_coincide`, y NO leen los apodos aparte de `clientes` (Yanina no
//    tiene permiso); el depósito sin permiso de buscar sigue con su lista;
//  - la ficha del cliente (Administración): los apodos como etiquetas con una
//    X; agregar y sacar se guarda AL MOMENTO con guardar_cliente, con los
//    datos que pisa (nombre, localidad, teléfono, observaciones, activo)
//    RELEÍDOS de la base; vacío o repetido no se agrega y se dice; el error de
//    la base tal cual; un doble toque manda una vez;
//  - todo escapado.
//
//   node pruebas/test-clientes-apodos.js
process.env.TZ = 'UTC'
const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { construirRetiros } = require('./sandbox-retiros')
const { construirCon } = require('./sandbox')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const ADMIN = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/administracion.html')
const RETIROS = process.env.ARCHIVO_RETIROS || path.join(RAIZ, 'modulos/retiros.html')
const COBRANZAS = process.env.ARCHIVO_COBRANZAS || path.join(RAIZ, 'modulos/cobranzas.html')
for (const f of [ADMIN, RETIROS, COBRANZAS]) console.log(`ARCHIVO ${f} (${fs.readFileSync(f, 'utf8').length} bytes)`)
const FUENTE_ADMIN = fs.readFileSync(ADMIN, 'utf8')
const { chk, esperas, fin } = arnes()
const esperar = async () => { for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r)) }

const LOFORTE = { id: 'c-turi', nombre: 'SALVADOR LOFORTE', razon_social: null, apodos: ['Los Forte', 'Turi'], localidad: 'Córdoba', activo: true }

// ═══ 1. ÓRDENES DE RETIRO ═════════════════════════════════════════════════════
{
  const S = construirRetiros(RETIROS)
  S.estado.empresaId = 'u-n'
  S.estado.clientes = [LOFORTE, { id: 'c-otro', nombre: 'Kiosco Pepe', apodos: [], activo: true }]
  chk('retiros: "Turi" encuentra a Loforte por el apodo', S.clientesFiltrados(S.estado.clientes, 'Turi').map(c => c.id).join() === 'c-turi')
  chk('retiros: sin acentos ni mayúsculas', S.clientesFiltrados(S.estado.clientes, 'TURÍ').map(c => c.id).join() === 'c-turi')
  const h = S.htmlResultadoCliente(LOFORTE, 'Cucuruchos Nuss', 'Turi')
  chk('retiros: el resultado dice "SALVADOR LOFORTE · Turi"',
    /<span class="rt-resultado__nombre">SALVADOR LOFORTE<span class="rt-resultado__apodo"> · <mark class="rt-resaltado">Turi<\/mark><\/span><\/span>/.test(h), h)
  chk('retiros: el apodo ya no se repite en la línea chica', !/apodo “/.test(h))
  chk('retiros: los otros apodos siguen en "También"', /También: Los Forte/.test(h))
  // "forte" está en el nombre Y en el apodo "Los Forte": como el nombre ya
  // coincide, el apodo no se agrega.
  const n = S.htmlResultadoCliente(LOFORTE, 'Cucuruchos Nuss', 'forte')
  chk('retiros: si el nombre ya coincide, no se agrega el apodo', !/rt-resultado__apodo/.test(n), n)
  chk('retiros: sin buscar, sin apodo al lado', !/rt-resultado__apodo/.test(S.htmlResultadoCliente(LOFORTE, 'Cucuruchos Nuss', '')))
  // El de la base (buscar_clientes): se usa el cliente de la lista local, que trae los apodos.
  S.estado.form = S.formVacio()
  S.estado.busquedaBase = null
  const desdeBase = S.htmlResultadoCliente(S.estado.clientes[0], 'Cucuruchos Nuss', 'turi')
  chk('retiros: con la búsqueda en minúscula, el apodo como está escrito', / · <mark class="rt-resaltado">Turi<\/mark>/.test(desdeBase), desdeBase)
  // Escapado.
  const mal = { id: marca('id'), nombre: 'Kiosco', apodos: [marca('apodo') + ' turi'], activo: true }
  chequearMarcas(chk, 'retiros: apodo al lado del nombre', S.htmlResultadoCliente(mal, 'E', 'turi'), ['id', 'apodo'])
  // El que dice la base manda: con `coincide` no se busca en la lista.
  chk('retiros: el apodo_coincide de la base manda', / · <mark class="rt-resaltado">Turi<\/mark>/.test(S.htmlResultadoCliente({ ...LOFORTE, apodos: [] }, 'E', 'Turi', 'Turi')))
  chk('retiros: la base dice null → sin apodo', !/rt-resultado__apodo/.test(S.htmlResultadoCliente(LOFORTE, 'E', 'Turi', null)))
  chequearMarcas(chk, 'retiros: el apodo_coincide escapado', S.htmlResultadoCliente({ id: 'x', nombre: 'K', apodos: [] }, 'E', 'turi', marca('apodoBase')), ['apodoBase'])
}

// ── Órdenes de retiro con la base (quien sí puede buscar) ───────────────────
const { servidorBuscarClientes } = require('./buscar-clientes-comun')
const PRELUDIO_TIMERS = `
  var __tm = globalThis.__timersApodos = []
  setTimeout = function (f, ms) { __tm.push({ f, cancelado: false }); return __tm.length }
  clearTimeout = function (id) { if (id && __tm[id - 1]) __tm[id - 1].cancelado = true }
`
async function bloqueRetirosBase() {
  const S = construirRetiros(RETIROS, { preludioExtra: PRELUDIO_TIMERS })
  S.estado.empresaId = 'u-n'
  // La lista local SIN los apodos (que el resultado los tome de la base).
  S.estado.clientes = [{ ...LOFORTE, apodos: [] }]
  S.estado.form = S.formVacio()
  const servidor = servidorBuscarClientes({ clientes: [{ ...LOFORTE, unidad_negocio_id: 'u-n' }], empresas: { 'u-n': 'Cucuruchos Nuss' } })
  S.__setRpc(async (n, p) => (n === 'buscar_clientes' ? { data: servidor(p), error: null } : { data: null, error: null }))
  S.buscarClienteRetiro('Turi')
  for (const t of globalThis.__timersApodos) if (!t.cancelado) { t.cancelado = true; await t.f() }
  await esperar()
  const res = S.__els.get('rt-clientes-resultados')?.innerHTML ?? ''
  chk('retiros con la base: "SALVADOR LOFORTE · Turi" con el apodo_coincide', /SALVADOR LOFORTE<span class="rt-resultado__apodo"> · <mark class="rt-resaltado">Turi<\/mark>/.test(res), res)
  chk('retiros con la base: los otros apodos, de la base', /También: Los Forte/.test(res), res)

  // Lo que la búsqueda local no encuentra y la base sí: "JyM" coincide con el
  // apodo "J y M" por la clave de _clave_nombre().
  const R = construirRetiros(RETIROS, { preludioExtra: PRELUDIO_TIMERS })
  R.estado.empresaId = 'u-n'
  const JYM = { id: 'c-jym', nombre: 'Distribuciones del Centro', razon_social: null, apodos: ['J y M'], localidad: null, activo: true, unidad_negocio_id: 'u-n' }
  R.estado.clientes = [JYM]
  R.estado.form = R.formVacio()
  const srv = servidorBuscarClientes({ clientes: [JYM], empresas: { 'u-n': 'Cucuruchos Nuss' } })
  R.__setRpc(async (n, p) => (n === 'buscar_clientes' ? { data: srv(p), error: null } : { data: null, error: null }))
  globalThis.__timersApodos.length = 0
  R.buscarClienteRetiro('JyM')
  for (const t of globalThis.__timersApodos) if (!t.cancelado) { t.cancelado = true; await t.f() }
  await esperar()
  const r2 = R.__els.get('rt-clientes-resultados')?.innerHTML ?? ''
  chk('retiros con la base: el apodo por la clave ("JyM" → "J y M")', /Distribuciones del Centro<span class="rt-resultado__apodo"> · J y M<\/span>/.test(r2), r2)
}

// ═══ 2. COBRANZAS ═════════════════════════════════════════════════════════════
const { fuenteNumeros } = require('./numeros-comun')
const PRELUDIO_COB = `
  ${fuenteNumeros()}
  var console = { error(){}, log(){}, warn(){} }
  var __consultas = []
  var __clientes = null
  var __errorClientes = null
  var supabase = {
    from(t) {
      const filtros = []
      const q = {}
      for (const op of ['select', 'eq', 'in', 'order']) q[op] = (...a) => { filtros.push([op, ...a]); return q }
      q.then = (r) => {
        __consultas.push([t, filtros])
        if (__errorClientes) return Promise.resolve({ data: null, error: __errorClientes }).then(r)
        const ids = (filtros.find(f => f[0] === 'in') ?? [])[2] ?? []
        return Promise.resolve({ data: (__clientes ?? []).filter(c => ids.includes(c.id)), error: null }).then(r)
      }
      return q
    },
  }
`
function cobranzas() {
  return construirCon(COBRANZAS, {
    preludio: PRELUDIO_COB,
    funciones: ['escCob', 'formatearImporte', 'textoSaldoCliente', 'normalizarApodo', 'apodoQueCoincide', 'htmlOpcionClienteAsentar'],
    constantes: ['MIN_LETRAS_CLIENTE'],
    retorno: `__consultas(){ return __consultas }, __setClientes(c){ __clientes = c }, __setError(e){ __errorClientes = e }`,
  })
}
const FILA = { cliente_id: 'c-turi', nombre: 'SALVADOR LOFORTE', razon_social: null, localidad: 'Córdoba', empresa: 'Cucuruchos Nuss', unidad_negocio_id: 'u-n', activo: true, saldo: 1000 }

async function bloqueCobranzas() {
  const C = cobranzas()
  // Las filas como las devuelve la base (la simulada imita a la real).
  const servidor = servidorBuscarClientes({ clientes: [{ ...LOFORTE, unidad_negocio_id: 'u-n' }], empresas: { 'u-n': 'Cucuruchos Nuss' } })
  const [turi] = servidor({ p_busqueda: 'Turi', p_unidad_negocio_id: 'u-n' })
  chk('la base simulada trae apodos y apodo_coincide', turi?.apodo_coincide === 'Turi' && turi.apodos.join() === 'Los Forte,Turi', JSON.stringify(turi))
  chk('la base simulada: con una letra, apodo_coincide null', servidor({ p_busqueda: 'T', p_unidad_negocio_id: 'u-n' })[0].apodo_coincide === null)
  chk('cobranzas: usa el apodo_coincide de la base', C.apodoQueCoincide(turi, 'Turi') === 'Turi')
  chk('cobranzas: no lo busca por su cuenta (sin apodo_coincide, ninguno)', C.apodoQueCoincide({ nombre: 'X', apodos: ['Otro', 'Turi'], apodo_coincide: null }, 'turi') === null)
  const forte = servidor({ p_busqueda: 'forte', p_unidad_negocio_id: 'u-n' })[0]
  chk('la base manda apodo_coincide aunque el nombre coincida', forte.apodo_coincide === 'Los Forte')
  chk('cobranzas: si el nombre coincide, no se agrega', C.apodoQueCoincide(forte, 'forte') === null)
  chk('cobranzas: con una letra, ninguno', C.apodoQueCoincide({ nombre: 'X', apodo_coincide: 'Turi' }, 't') === null)
  const h = C.htmlOpcionClienteAsentar(turi, 'Turi')
  chk('cobranzas: el resultado dice "SALVADOR LOFORTE · Turi"', /<span class="cob-cliente-op__nombre">SALVADOR LOFORTE<span class="cob-cliente-op__apodo"> · Turi<\/span><\/span>/.test(h), h)
  chk('cobranzas: sin búsqueda, sin apodo', !/cob-cliente-op__apodo/.test(C.htmlOpcionClienteAsentar(turi, '')))
  chk('cobranzas: ninguna consulta aparte', C.__consultas().length === 0)
  // Escapado.
  chequearMarcas(chk, 'cobranzas: el apodo al lado del nombre', C.htmlOpcionClienteAsentar({ ...FILA, apodo_coincide: marca('apodoCob') }, 'turi'), ['apodoCob'])
  // El cableado: la lectura aparte de los apodos se fue.
  const src = fs.readFileSync(COBRANZAS, 'utf8')
  chk('cobranzas: ya no lee clientes aparte', !/from\('clientes'\)/.test(src) && !/apodosDe/.test(src))
  chk('cobranzas: la lista sale tal cual de la base', /else clientes = clientesDeLaEmpresa\(data, unidad, texto\)\n/.test(src))
  chk('cobranzas: la lista dibuja cada opción con la búsqueda', /a\.clientes\.map\(c => htmlOpcionClienteAsentar\(c, texto\)\)/.test(src))
}

// ═══ 3. LA FICHA (Administración) ═════════════════════════════════════════════
function ficha() {
  const S = construirAdministracion(ADMIN)
  const fila = { id: 'c-turi', nombre: 'SALVADOR LOFORTE', apodos: ['Los Forte'], razon_social: null, cuit: null, condicion_iva: null, domicilio: null,
    localidad: 'Córdoba', provincia: null, codigo_postal: null, telefono: '351 555', email: null, contacto_nombre: null, contacto_telefono: null,
    transporte_habitual: null, banco: null, cbu: null, alias_cbu: null, lista_precio_id: null, limite_credito: null, plazo_pago_dias: null,
    proveedor_id: null, observaciones: 'Paga los viernes', unidad_negocio_id: 'u-n', codigo_anterior: 55, activo: true }
  S.__tablas.clientes = (filtros) => ({ data: [{ ...fila }], error: null })
  S.__tablas.listas_precios = []
  S.__tablas.proveedores = []
  S.estado.empresaId = 'u-n'
  return { S, fila }
}

async function bloqueFicha() {
  {
    const { S } = ficha()
    chk('ficha: vacío no se agrega', S.agregarApodoALista(['A'], '   ').error === 'Escribí el apodo antes de agregarlo.')
    chk('ficha: repetido (sin acentos ni mayúsculas) no se agrega', /ya está en la lista/.test(S.agregarApodoALista(['Turí'], 'turi').error))
    chk('ficha: muy largo no', /hasta 60/.test(S.agregarApodoALista([], 'x'.repeat(61)).error))
    chk('ficha: uno nuevo se agrega limpio y al final', S.agregarApodoALista(['A'], '  Turi  ').apodos.join() === 'A,Turi')
  }
  {
    const { S, fila } = ficha()
    await S.abrirFicha('c-turi')
    S.estado.clientes = []
    chk('ficha: se abre bien (sin el aviso de error)', S.__els.get('ad-ficha-aviso').innerHTML === '', S.__els.get('ad-ficha-aviso').innerHTML)
    chk('ficha: lee los apodos', S.__llamadas.consultas.some(c => c[0] === 'clientes' && c[1].some(f => f[0] === 'select' && /\bapodos\b/.test(f[1]))))
    const h = S.__els.get('ad-f-apodos').innerHTML
    chk('ficha: cada apodo es una etiqueta con su X', /<span class="ad-apodo"><span class="ad-apodo__texto">Los Forte<\/span><button type="button" class="ad-apodo__quitar" data-quitar-apodo="0" aria-label="Sacar el apodo Los Forte">×<\/button><\/span>/.test(h), h)

    // Agregar "Turi": relee la fila y manda guardar_cliente con los datos de la base.
    S.__els.get('ad-f-apodo-nuevo').value = 'Turi'
    // Mientras tanto, otra persona cambió el teléfono en la base.
    S.__tablas.clientes = () => ({ data: [{ ...fila, telefono: '351 999' }], error: null })
    S.__setRpc(async (n) => ({ data: n === 'guardar_cliente' ? 'c-turi' : null, error: null }))
    const p = S.agregarApodoFicha()
    const doble = S.agregarApodoFicha()
    chk('ficha: mientras guarda, la X y Agregar se traban', S.__els.get('ad-f-apodo-agregar').disabled === true)
    await p; await doble
    const llamadas = S.__llamadas.rpc.filter(x => x[0] === 'guardar_cliente')
    chk('ficha: un doble toque manda una vez', llamadas.length === 1, llamadas.length)
    const par = llamadas[0]?.[1]
    chk('ficha: guardar_cliente con la lista entera', JSON.stringify(par?.p_apodos) === JSON.stringify(['Los Forte', 'Turi']), JSON.stringify(par))
    chk('ficha: con los datos que pisa RELEÍDOS de la base', par?.p_id === 'c-turi' && par.p_unidad_negocio_id === 'u-n' && par.p_nombre === 'SALVADOR LOFORTE' &&
      par.p_localidad === 'Córdoba' && par.p_telefono === '351 999' && par.p_observaciones === 'Paga los viernes' && par.p_activo === true, JSON.stringify(par))
    chk('ficha: guardado, el campo se vacía', S.__els.get('ad-f-apodo-nuevo').value === '')
    chk('ficha: y la etiqueta aparece', /Turi<\/span><button type="button" class="ad-apodo__quitar" data-quitar-apodo="1"/.test(S.__els.get('ad-f-apodos').innerHTML))
    chk('ficha: la lista de clientes se vuelve a leer (busca por apodo)', S.estado.clientes === null)

    // Sacar "Los Forte".
    await S.quitarApodoFicha(0)
    const ult = S.__llamadas.rpc.filter(x => x[0] === 'guardar_cliente').at(-1)?.[1]
    chk('ficha: sacar uno manda la lista sin él', JSON.stringify(ult?.p_apodos) === JSON.stringify(['Turi']), JSON.stringify(ult))
    chk('ficha: y la etiqueta se va', !/Los Forte/.test(S.__els.get('ad-f-apodos').innerHTML))
    await S.quitarApodoFicha(7)
    chk('ficha: un índice que no existe no manda nada', S.__llamadas.rpc.filter(x => x[0] === 'guardar_cliente').length === 2)

    // Un cliente apagado sigue apagado.
    S.__tablas.clientes = () => ({ data: [{ ...fila, activo: false }], error: null })
    S.__els.get('ad-f-apodo-nuevo').value = 'Salva'
    await S.agregarApodoFicha()
    chk('ficha: un cliente apagado no se prende al guardar apodos', S.__llamadas.rpc.filter(x => x[0] === 'guardar_cliente').at(-1)?.[1]?.p_activo === false)
  }
  {
    // guardarApodos llamado dos veces a la vez (la X y Agregar): una sola llamada.
    const { S: G } = ficha()
    await G.abrirFicha('c-turi')
    G.__setRpc(async () => ({ data: 'c-turi', error: null }))
    await Promise.all([G.guardarApodos(['A']), G.guardarApodos(['B'])])
    chk('ficha: dos guardados a la vez mandan uno', G.__llamadas.rpc.filter(x => x[0] === 'guardar_cliente').length === 1)
  }
  {
    // Repetido: se dice y no se llama a la base.
    const { S } = ficha()
    await S.abrirFicha('c-turi')
    S.__els.get('ad-f-apodo-nuevo').value = 'los forte'
    await S.agregarApodoFicha()
    chk('ficha: repetido se dice, pegado', /ya está en la lista/.test(S.__els.get('ad-f-apodos-error').textContent) && S.__els.get('ad-f-apodos-error').hidden === false)
    chk('ficha: y no llama a la base', !S.__llamadas.rpc.some(x => x[0] === 'guardar_cliente'))
    // El error de la base, tal cual; la lista no cambia y el texto queda.
    S.__els.get('ad-f-apodo-nuevo').value = 'Turi'
    S.__setRpc(async () => ({ data: null, error: { message: 'No tenés permiso en esta empresa.' } }))
    await S.agregarApodoFicha()
    chk('ficha: el error de la base tal cual', S.__els.get('ad-f-apodos-error').textContent === 'No tenés permiso en esta empresa.')
    chk('ficha: con error, los apodos quedan como estaban', !/Turi/.test(S.__els.get('ad-f-apodos').innerHTML))
    chk('ficha: con error, lo escrito queda en el campo', S.__els.get('ad-f-apodo-nuevo').value === 'Turi')
    // Si no se puede releer la fila, tampoco se guarda.
    S.__setRpc(async () => ({ data: 'c-turi', error: null }))
    S.__tablas.clientes = () => ({ data: null, error: { message: 'sin red' } })
    await S.agregarApodoFicha()
    chk('ficha: sin poder releer la fila no se llama a guardar_cliente', S.__llamadas.rpc.filter(x => x[0] === 'guardar_cliente').length === 1)
  }
  {
    // Escapado.
    const { S } = ficha()
    chequearMarcas(chk, 'ficha: etiquetas de apodos', S.htmlApodosFicha([marca('apodoFicha')], false), ['apodoFicha'])
    chk('ficha: sin apodos lo dice', /Sin apodos todavía/.test(S.htmlApodosFicha([], false)))
    chk('ficha: ocupado, las X deshabilitadas', / disabled>×/.test(S.htmlApodosFicha(['A'], true)))
  }
  // El cableado.
  chk('ficha: el HTML tiene el bloque de apodos', /id="ad-f-apodos"/.test(FUENTE_ADMIN) && /id="ad-f-apodo-nuevo"/.test(FUENTE_ADMIN) && /id="ad-f-apodo-agregar"/.test(FUENTE_ADMIN))
  chk('ficha: el apodo nuevo NO es un campo de la ficha (no entra a guardar_ficha_cliente)', !/id="ad-f-apodo-nuevo"[^>]*data-ficha/.test(FUENTE_ADMIN))
  chk('ficha: Enter agrega el apodo', /getElementById\('ad-f-apodo-nuevo'\)\.addEventListener\('keydown', \(e\) => \{\n\s*if \(e\.key === 'Enter'\) \{ e\.preventDefault\(\); agregarApodoFicha\(\) \}/.test(FUENTE_ADMIN))
  chk('ficha: la X saca el suyo', /\[data-quitar-apodo\]'\)\)\) quitarApodoFicha\(Number\(b\.dataset\.quitarApodo\)\)/.test(FUENTE_ADMIN))
  chk('ficha: las X miden 44 px', /\.ad-apodo__quitar \{\n\s*min-width: 44px; min-height: 44px;/.test(FUENTE_ADMIN))
}

esperas.push(bloqueRetirosBase().then(() => bloqueCobranzas()).then(() => bloqueFicha()))
fin()
