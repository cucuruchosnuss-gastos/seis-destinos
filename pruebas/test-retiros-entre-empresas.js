// LA CARGA DE UNA ORDEN A OTRA EMPRESA DEL GRUPO (24/10/2026), en
// modulos/retiros.html.
//
// clientes.unidad_grupo_id: el cliente ES otra empresa del grupo ("DOLCE
// PASTA SRL" dentro de Nuss → Dolce Pasta). registrar_orden_retiro (verificada
// con pg_get_functiondef el 24/10/2026) saca el stock de la que entrega como
// siempre, lo hace ENTRAR al de la que recibe, devuelve entre_empresas: true y
// NO acepta renglones de devolución ni reposición ("Las devoluciones entre
// empresas del grupo se cargan como otra orden, desde la empresa que devuelve
// (renglón N)."). Esta suite EJECUTA la carga y fija:
//  - EL AVISO "Entre empresas: lo que sale entra al stock de <empresa>" en el
//    cliente elegido, en el resumen y en la orden confirmada;
//  - que para ese cliente NO se ofrece "Devolución de mercadería" (ni la
//    reposición, que sale de ese mismo botón), y que una devolución que quedó
//    de antes no deja confirmar (con el motivo);
//  - los nombres de las empresas salen de unidades_negocio (si falla, "otra
//    empresa del grupo"), y lo que viaja a la base no cambia;
//  - XSS del nombre.
//
//   node pruebas/test-retiros-entre-empresas.js

process.env.TZ = 'UTC'

const path = require('path')
const fs = require('fs')
const { construirRetiros } = require('./sandbox-retiros')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/retiros.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirRetiros(ARCHIVO)

const CAT = {
  productos: [{ id: 'p-cuc', nombre: 'Cucurucho grande', categoria: 'cucuruchones' }],
  presentaciones: [{ id: 'pr-cuc-sin', producto_id: 'p-cuc', nombre: 'Caja x 100', con_cono: false, unidades_por_caja: 100, stock_cajas: 40 }],
  marcas: [], insumos: [],
}
const CLIENTES = [
  { id: 'c-dp', nombre: 'DOLCE PASTA SRL', razon_social: 'DOLCE PASTA SRL', apodos: [], activo: true, unidad_grupo_id: 'u-d' },
  { id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', apodos: [], activo: true, unidad_grupo_id: null },
]

function conEmpresa(S, { nombres = true } = {}) {
  S.estado.empresaId = 'u-n'
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-n'
  S.estado.clientes = CLIENTES
  if (nombres) S.estado.empresasGrupo.set('u-d', 'Dolce Pasta')
  S.estado.form = S.formVacio()
  return S.estado.form
}
const el = (S, id) => S.__doc.getElementById(id)

// ── Quién es otra empresa del grupo ─────────────────────────────────────────
{
  const S = nuevo()
  const f = conEmpresa(S)
  chk('el cliente con unidad_grupo_id es otra empresa', S.empresaGrupoDe(CLIENTES[0]) === 'u-d')
  chk('uno común no', S.empresaGrupoDe(CLIENTES[1]) === null && S.empresaGrupoDe(null) === null && S.empresaGrupoDe({ unidad_grupo_id: '' }) === null)
  chk('sin cliente elegido no es entre empresas', S.esEntreEmpresas(f) === false)
  f.clienteId = 'c-dp'
  chk('con Dolce Pasta elegido, sí', S.esEntreEmpresas(f) === true)
  chk('el aviso con el nombre', S.textoEntreEmpresas(CLIENTES[0]) === 'Entre empresas: lo que sale entra al stock de Dolce Pasta')
  chk('un cliente común: sin aviso', S.textoEntreEmpresas(CLIENTES[1]) === '')
  const S2 = nuevo()
  conEmpresa(S2, { nombres: false })
  chk('sin el nombre (no se pudo leer): "otra empresa del grupo"', S2.textoEntreEmpresas(CLIENTES[0]) === 'Entre empresas: lo que sale entra al stock de otra empresa del grupo')
}

// ── Elegir el cliente: el aviso y sin devoluciones ─────────────────────────
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirCliente('c-dp')
  const h = el(S, 'rt-cliente-elegido').innerHTML
  chk('el cliente elegido dice "Entre empresas"', /rt-sello--entre">Entre empresas</.test(h))
  chk('el aviso visible, con la empresa que recibe', /id="rt-aviso-entre" role="note">Entre empresas: lo que sale entra al stock de Dolce Pasta</.test(h), h)
  chk('sin "Devolución de mercadería"', el(S, 'rt-agregar-devolucion').hidden === true)
  S.agregarDevolucion()
  chk('y tocarla igual no abre una devolución', !f.renglones.some(S.esRenglonDev))
  chk('agregar un producto sigue', (S.agregarRenglon(), f.renglones.length >= 1) && !S.esRenglonDev(f.renglones[f.renglones.length - 1]))
  S.cambiarCliente()
  chk('al cambiar el cliente vuelve el botón', el(S, 'rt-agregar-devolucion').hidden === false)
  S.elegirCliente('c1')
  const h2 = el(S, 'rt-cliente-elegido').innerHTML
  chk('un cliente común: sin aviso ni sello', !/rt-aviso-entre/.test(h2) && !/Entre empresas/.test(h2))
  chk('un cliente común: con "Devolución de mercadería"', el(S, 'rt-agregar-devolucion').hidden === false)
  S.agregarDevolucion()
  chk('un cliente común: la devolución se abre', f.renglones.some(S.esRenglonDev))
}

// ── Una devolución que quedó de antes no deja confirmar ────────────────────
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirCliente('c1')
  S.elegirProductoRenglon(0, 'p-cuc')
  f.renglones[0].cajas = 5
  f.editando = null
  S.agregarDevolucion()
  const i = f.editando
  S.elegirProductoRenglon(i, 'p-cuc')
  f.renglones[i].cajas = 2
  S.elegirMotivoDevolucion(i, 'Rotura')
  S.elegirTratoDevolucion(i, 'descuenta')
  f.editando = null
  const antes = S.faltanOrden(f).filter(x => /otra empresa del grupo/.test(x))
  chk('con un cliente común la devolución pasa', antes.length === 0)
  f.clienteId = 'c-dp'
  const faltan = S.faltanOrden(f)
  chk('cambiado a Dolce Pasta: no se confirma y dice el renglón', faltan.some(x => x === `Renglón ${i + 1}: a otra empresa del grupo no se le cargan devoluciones ni reposiciones. Sacalo: la devolución se carga como otra orden, desde la empresa que devuelve.`), faltan.join(' | '))
  chk('el renglón de retiro no se marca', !faltan.some(x => /^Renglón 1: a otra empresa/.test(x)))
  f.renglones.splice(i, 1)
  chk('sacada la devolución, ya no falta nada por eso', !S.faltanOrden(f).some(x => /otra empresa del grupo/.test(x)))
}

// ── El resumen y lo que viaja ──────────────────────────────────────────────
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirCliente('c-dp')
  S.elegirProductoRenglon(0, 'p-cuc')
  f.renglones[0].cajas = 10
  f.editando = null
  const h = S.htmlResumen(f, CAT)
  chk('el resumen repite el aviso', /rt-aviso-entre" role="note">Entre empresas: lo que sale entra al stock de Dolce Pasta</.test(h))
  const p = S.parametrosRegistrar(f)
  chk('a la base va el cliente de siempre (la base sabe que es otra empresa)', p.p_cliente_id === 'c-dp' && Object.keys(p).sort().join() === 'p_client_uuid,p_cliente_id,p_fecha,p_items,p_observaciones,p_transporte')
  chk('sin claves nuevas en el renglón', !JSON.stringify(p.p_items).includes('grupo') && !JSON.stringify(p.p_items).includes('entre'))
}

// ── Confirmar: la orden dice adónde entró ──────────────────────────────────
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirCliente('c-dp')
  S.elegirProductoRenglon(0, 'p-cuc')
  f.renglones[0].cajas = 10
  f.editando = null
  S.estado.lotes.set(S.claveLotes('pr-cuc-sin', null), { cargando: false, error: null, lista: [{ lote: '7021-1', saldo: 40, desde: '2026-10-01' }] })
  S.__setRpc((n) => n === 'registrar_orden_retiro'
    ? { data: { orden_id: 'o1', numero: 42, codigo: 'N-0042', stock_insuficiente: [], entre_empresas: true }, error: null }
    : { data: [], error: null })
  esperas.push(S.confirmar().then(() => {
    chk('la orden confirmada sabe que fue entre empresas', S.estado.hecho?.entre === 'Dolce Pasta')
    const h = S.htmlHecho(S.estado.hecho)
    chk('la orden confirmada lo dice', /rt-aviso-entre" role="note">Entre empresas: lo que salió entra al stock de Dolce Pasta\.</.test(h), h)
  }))
}
{
  // Un cliente común: nada nuevo en la orden confirmada.
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirCliente('c1')
  S.elegirProductoRenglon(0, 'p-cuc')
  f.renglones[0].cajas = 10
  f.editando = null
  S.estado.lotes.set(S.claveLotes('pr-cuc-sin', null), { cargando: false, error: null, lista: [{ lote: '7021-1', saldo: 40, desde: '2026-10-01' }] })
  S.__setRpc((n) => n === 'registrar_orden_retiro'
    ? { data: { orden_id: 'o2', numero: 43, codigo: 'N-0043', stock_insuficiente: [] }, error: null } : { data: [], error: null })
  esperas.push(S.confirmar().then(() => {
    chk('cliente común: sin "Entre empresas"', S.estado.hecho?.entre === null && !/rt-aviso-entre/.test(S.htmlHecho(S.estado.hecho)))
  }))
}
{
  // El error de la base sobre una devolución, tal cual (si llegara).
  const S = nuevo()
  const f = conEmpresa(S)
  S.elegirCliente('c-dp')
  S.elegirProductoRenglon(0, 'p-cuc')
  f.renglones[0].cajas = 10
  f.editando = null
  S.estado.lotes.set(S.claveLotes('pr-cuc-sin', null), { cargando: false, error: null, lista: [{ lote: '7021-1', saldo: 40, desde: '2026-10-01' }] })
  const msg = 'Las devoluciones entre empresas del grupo se cargan como otra orden, desde la empresa que devuelve (renglón 1).'
  S.__setRpc((n) => n === 'registrar_orden_retiro' ? { data: null, error: { message: msg, code: 'P0001' } } : { data: [], error: null })
  esperas.push(S.confirmar().then(() => {
    chk('el error de la base, tal cual', el(S, 'rt-confirmar-error').innerHTML.includes(msg), el(S, 'rt-confirmar-error').innerHTML)
  }))
}

// ── Los nombres de las empresas del grupo ──────────────────────────────────
{
  const S = nuevo()
  S.__tablas.clientes = CLIENTES
  S.__tablas.unidades_negocio = [{ id: 'u-d', nombre: '  Dolce Pasta ' }]
  esperas.push(S.leerClientes('u-n').then((lista) => {
    chk('leerClientes trae unidad_grupo_id', lista.length === 2 && S.__llamadas.consultas.some(c => c[0] === 'clientes' && c[1].some(x => x[0] === 'select' && /unidad_grupo_id/.test(x[1]))))
    const u = S.__llamadas.consultas.find(c => c[0] === 'unidades_negocio')
    chk('pide SOLO las empresas que son clientes', !!u && u[1].some(x => x[0] === 'in' && x[1] === 'id' && x[2].join() === 'u-d'))
    chk('guarda el nombre limpio', S.estado.empresasGrupo.get('u-d') === 'Dolce Pasta')
    const antes = S.__llamadas.consultas.filter(c => c[0] === 'unidades_negocio').length
    return S.leerClientes('u-n').then(() => {
      chk('no la vuelve a pedir', S.__llamadas.consultas.filter(c => c[0] === 'unidades_negocio').length === antes)
    })
  }))
}
{
  const S = nuevo()
  S.__tablas.clientes = [CLIENTES[1]]
  esperas.push(S.leerClientes('u-n').then(() => {
    chk('sin clientes del grupo no consulta unidades_negocio', !S.__llamadas.consultas.some(c => c[0] === 'unidades_negocio'))
  }))
}
{
  const S = nuevo()
  S.__tablas.clientes = CLIENTES
  S.__tablas.unidades_negocio = () => ({ data: null, error: { message: 'sin red' } })
  esperas.push(S.leerClientes('u-n').then((lista) => {
    chk('si falla, la carga sigue (los clientes llegan)', lista.length === 2 && !S.estado.empresasGrupo.has('u-d'))
  }))
}

// ── XSS del nombre de la empresa ───────────────────────────────────────────
{
  const S = nuevo()
  const f = conEmpresa(S)
  S.estado.empresasGrupo.set('u-d', marca('empresa'))
  S.elegirCliente('c-dp')
  chequearMarcas(chk, 'el cliente elegido', el(S, 'rt-cliente-elegido').innerHTML, ['empresa'])
  S.elegirProductoRenglon(0, 'p-cuc')
  f.renglones[0].cajas = 1
  f.editando = null
  chequearMarcas(chk, 'el resumen', S.htmlResumen(f, CAT), ['empresa'])
  chequearMarcas(chk, 'la orden confirmada', S.htmlHecho({ codigo: 'N-1', entre: marca('empresa2'), cliente: null, total: '' }), ['empresa2'])
}

fin(esperas)
