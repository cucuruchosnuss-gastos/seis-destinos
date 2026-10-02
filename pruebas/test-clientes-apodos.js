// LOS APODOS DE LOS CLIENTES (02/10/2026).
//
// Exige:
//  - Órdenes de retiro (el depósito): buscar "Turi" encuentra a SALVADOR
//    LOFORTE por su apodo y el resultado dice "SALVADOR LOFORTE · Turi" (el
//    apodo al lado del nombre, resaltado); si el nombre ya coincide, no;
//  - Cobranzas (la cobranza ya asentada): buscar_clientes encuentra por apodo
//    pero no devuelve los apodos; se leen aparte de `clientes` por id y el
//    resultado dice "SALVADOR LOFORTE · Turi"; si no se pueden leer, el nombre
//    solo (nunca se inventa);
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
    funciones: ['escCob', 'formatearImporte', 'textoSaldoCliente', 'normalizarApodo', 'apodoQueCoincide', 'apodosDe', 'htmlOpcionClienteAsentar'],
    constantes: ['MIN_LETRAS_CLIENTE'],
    retorno: `__consultas(){ return __consultas }, __setClientes(c){ __clientes = c }, __setError(e){ __errorClientes = e }`,
  })
}
const FILA = { cliente_id: 'c-turi', nombre: 'SALVADOR LOFORTE', razon_social: null, localidad: 'Córdoba', empresa: 'Cucuruchos Nuss', unidad_negocio_id: 'u-n', activo: true, saldo: 1000 }

async function bloqueCobranzas() {
  const C = cobranzas()
  chk('cobranzas: el apodo que coincide', C.apodoQueCoincide({ nombre: 'SALVADOR LOFORTE', apodos: ['Los Forte', 'Turi'] }, 'turi') === 'Turi')
  chk('cobranzas: sin acentos', C.apodoQueCoincide({ nombre: 'X', apodos: ['Turí'] }, 'TURI') === 'Turí')
  chk('cobranzas: si el nombre coincide, ninguno', C.apodoQueCoincide({ nombre: 'SALVADOR LOFORTE', apodos: ['Los Forte'] }, 'forte') === null)
  chk('cobranzas: con una letra, ninguno', C.apodoQueCoincide({ nombre: 'X', apodos: ['Turi'] }, 't') === null)
  chk('cobranzas: sin apodos, ninguno', C.apodoQueCoincide({ nombre: 'X' }, 'turi') === null)

  C.__setClientes([{ id: 'c-turi', apodos: ['Los Forte', 'Turi'] }])
  const con = await C.apodosDe([{ ...FILA }])
  chk('cobranzas: los apodos se leen de clientes, por id', con[0].apodos?.join() === 'Los Forte,Turi')
  const q = C.__consultas()[0]
  chk('cobranzas: la consulta pide solo id y apodos de esos clientes', q[0] === 'clientes' && q[1].some(f => f[0] === 'select' && f[1] === 'id, apodos') && q[1].some(f => f[0] === 'in' && f[1] === 'id' && f[2].join() === 'c-turi'), JSON.stringify(q))
  const h = C.htmlOpcionClienteAsentar(con[0], 'Turi')
  chk('cobranzas: el resultado dice "SALVADOR LOFORTE · Turi"', /<span class="cob-cliente-op__nombre">SALVADOR LOFORTE<span class="cob-cliente-op__apodo"> · Turi<\/span><\/span>/.test(h), h)
  chk('cobranzas: sin búsqueda, sin apodo', !/cob-cliente-op__apodo/.test(C.htmlOpcionClienteAsentar(con[0], '')))

  // Sin permiso para leer clientes (RLS): llegan vacíos → el nombre solo.
  const D = cobranzas()
  D.__setClientes([])
  const sin = await D.apodosDe([{ ...FILA }])
  chk('cobranzas: sin poder leer los apodos, el nombre solo', !/cob-cliente-op__apodo/.test(D.htmlOpcionClienteAsentar(sin[0], 'Turi')))
  const E = cobranzas()
  E.__setError({ message: 'permiso' })
  const err = await E.apodosDe([{ ...FILA }])
  chk('cobranzas: si falla, los clientes quedan como estaban', err.length === 1 && err[0].cliente_id === 'c-turi' && !('apodos' in err[0]))
  const F = cobranzas()
  const yaTrae = await F.apodosDe([{ ...FILA, apodos: ['Turi'] }])
  chk('cobranzas: si la base ya trae los apodos, no se consulta', F.__consultas().length === 0 && yaTrae[0].apodos.join() === 'Turi')
  // Escapado.
  chequearMarcas(chk, 'cobranzas: el apodo al lado del nombre', C.htmlOpcionClienteAsentar({ ...FILA, apodos: [marca('apodoCob') + ' turi'] }, 'turi'), ['apodoCob'])
  // El cableado: se piden los apodos solo con una búsqueda (2 letras o más).
  const src = fs.readFileSync(COBRANZAS, 'utf8')
  chk('cobranzas: los apodos se piden con la búsqueda escrita', /clientes = clientesDeLaEmpresa\(data, unidad, texto\)\n\s*if \(texto\.length >= MIN_LETRAS_CLIENTE\) clientes = await apodosDe\(clientes\)/.test(src))
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

esperas.push(bloqueCobranzas().then(() => bloqueFicha()))
fin()
