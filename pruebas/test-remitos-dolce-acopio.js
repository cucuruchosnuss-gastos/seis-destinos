// EL SALDO DEL ACOPIO AL REVISAR UN REMITO (27/10/2026 en Administración;
// en Remitos Dolce → Revisar desde el 28/10/2026, rama
// ci-prueba/modulo-remitos-dolce; antes era parte de
// test-administracion-acopios.js). En un remito de talonario Acopio, al lado
// de cada renglón, el saldo de los acopios activos del cliente con el mismo
// producto y cono (en amarillo si no hay o no alcanza); y "(también en Nuss)"
// en el buscador de clientes del remito. Se EJECUTAN las funciones reales.
//
//   node pruebas/test-remitos-dolce-acopio.js
'use strict'

const path = require('path')
const { construirRemitosDolce } = require('./sandbox-remitos-dolce')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/remitos-dolce.html')
leer(ARCHIVO)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirRemitosDolce(ARCHIVO)

const CAT = {
  productos: [
    { id: 'p-tall', nombre: 'Tallarín al huevo', categoria: 'pasta', activo: true },
    { id: 'p-cono', nombre: 'Cono dulce 48', categoria: null, activo: true },
    { id: 'p-viejo', nombre: 'Producto apagado', categoria: null, activo: false },
  ],
  presentaciones: [
    { id: 'pr-tall', producto_id: 'p-tall', nombre: 'Caja x 10', con_cono: false, unidades_por_caja: 10, activa: true },
    { id: 'pr-cono', producto_id: 'p-cono', nombre: 'Caja x 48 con cono', con_cono: true, unidades_por_caja: 48, activa: true },
    { id: 'pr-vieja', producto_id: 'p-tall', nombre: 'Caja vieja', con_cono: false, activa: false },
  ],
  marcas: [{ id: 'm-lel', nombre: 'LELONA' }, { id: 'm-ler', nombre: 'LEROMA' }],
  insumos: [{ id: 'ins-h', nombre: 'Harina 000', marca: 'Wali', unidad_medida: 'kg', activo: true }],
}
const CLIENTES = [
  { id: 'c-ros', nombre: 'Almacén Rosario', razon_social: 'ROSARIO SA', apodos: ['La Rosa'], localidad: 'Rosario', activo: true },
  { id: 'c-fer', nombre: 'FERNANDEZ RICARDO', apodos: [], activo: true, cliente_principal_id: 'c-n-fer' },
  { id: 'c-off', nombre: 'Almacén Cerrado', activo: false },
]
const A = (x) => ({ marca_id: null, cono: null, numero_remito: null, numero_factura: null, precio_caja: null, observaciones: null, ultimo_retiro: null, retiradas: 0, ...x })
const ACOPIOS = [
  A({ id: 'a1', cliente_id: 'c-ros', cliente: 'Almacén Rosario', presentacion_id: 'pr-tall', producto: 'Tallarín al huevo', unidades_por_caja: 10, cajas: 100, retiradas: 30, saldo: 70,
    estado: 'activo', fecha: '2026-10-01', numero_remito: '3021', numero_factura: 'A-0001-00001234', precio_caja: 5400, ultimo_retiro: '2026-10-23' }),
  A({ id: 'a2', cliente_id: 'c-ros', cliente: 'Almacén Rosario', presentacion_id: 'pr-cono', producto: 'Cono dulce 48', unidades_por_caja: 48, marca_id: 'm-ler', cono: 'LEROMA',
    cajas: 20, saldo: 20, estado: 'activo', fecha: '2026-10-12' }),
  A({ id: 'a5', cliente_id: 'c-ros', cliente: 'Almacén Rosario', presentacion_id: 'pr-tall', producto: 'Tallarín al huevo', unidades_por_caja: 10, cajas: 10, saldo: 10,
    estado: 'activo', fecha: '2026-10-15' }),
  A({ id: 'a3', cliente_id: 'c-fer', cliente: 'FERNANDEZ RICARDO', presentacion_id: 'pr-tall', producto: 'Tallarín al huevo', unidades_por_caja: 10, cajas: 40, retiradas: 40, saldo: 0,
    estado: 'terminado', fecha: '2026-09-15' }),
  A({ id: 'a4', cliente_id: 'c-ros', cliente: 'Almacén Rosario', presentacion_id: 'pr-cono', producto: 'Cono dulce 48', unidades_por_caja: 48, marca_id: 'm-lel', cono: 'LELONA',
    cajas: 10, saldo: 10, estado: 'anulado', fecha: '2026-10-05' }),
]

// Dolce: sin control de stock; Nuss: con control.
function enDolce(S, { tareas = [['retiros:ver', { todas: true }], ['retiros:precios', { unidades: ['u-d'] }], ['retiros:cargar', { unidades: ['u-d'] }]] } = {}) {
  S.estado.empresaId = 'u-d'
  S.estado.misTareas = new Map(tareas)
  S.estado.sinControl = new Map([['u-d', true], ['u-n', false]])
  S.estado.hayAcopios = new Map()
  S.estado.principales = new Map([['c-n-fer', 'u-n']])
  S.estado.clientes = CLIENTES
  S.estado.catalogo = CAT
  S.estado.catalogoEmpresa = 'u-d'
}
function rpcAcopios(S, { filas = ACOPIOS, extra = {} } = {}) {
  S.__setRpc(async (n, p) => {
    if (Object.prototype.hasOwnProperty.call(extra, n)) return typeof extra[n] === 'function' ? extra[n](p) : extra[n]
    if (n === 'acopios_lista') return { data: JSON.parse(JSON.stringify(p.p_cliente_id ? filas.filter(a => a.cliente_id === p.p_cliente_id) : filas)), error: null }
    return { data: null, error: null }
  })
}
const rpcDe = (S, n) => S.__llamadas.rpc.filter(r => r[0] === n)
// La plata lleva un espacio duro después del "$": se compara con uno común.
const nb = (t) => String(t ?? '').replace(/ /g, ' ')
const sinEtiquetas = (h) => nb(String(h).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' '))
const cuerpoAcopios = (S) => S.__els.get('ad-acopios-cuerpo')?.innerHTML ?? ''
const cuerpoAcopio = (S) => S.__els.get('ad-acopio-cuerpo')?.innerHTML ?? ''


{
  const S = nuevo()
  enDolce(S)
  S.estado.unidades = [{ id: 'u-n', nombre: 'Cucuruchos Nuss' }, { id: 'u-d', nombre: 'Dolce Pasta' }]
  chk('el vinculado dice dónde más está', S.textoTambienEn(CLIENTES[1]) === ' (también en Nuss)')
  const rm = { form: { clienteBusqueda: 'fern', clienteId: null } }
  chk('el buscador del remito también', /FERNANDEZ RICARDO \(también en Nuss\)/.test(S.htmlClientesRemito(rm)))
}

// ── En la revisión de un remito de talonario ACOPIO ─────────────────────────
function remito(S, { talonario = 'acopio', clienteId = 'c-ros', items } = {}) {
  const f = S.formDesdeRemito({ numero_remito: '977492', fecha: '2026-10-25', talonario, cliente_id: clienteId, items })
  const rm = { id: 'r1', fila: { id: 'r1', unidad_negocio_id: 'u-d', estado: 'precargada' }, form: f, foto: { cargando: true }, zoom: 0 }
  S.estado.remito = rm
  return rm
}
const IT = (x) => ({ texto_leido: '', cantidad: null, presentacion_id: null, marca_id: null, insumo_id: null, lotes: [], revisar: false, omitir: false, nota: '', ...x })
{
  const S = nuevo()
  enDolce(S)
  rpcAcopios(S)
  const rm = remito(S, { items: [IT({ cantidad: 30, presentacion_id: 'pr-tall' }), IT({ cantidad: 25, presentacion_id: 'pr-cono', marca_id: 'm-ler' }),
    IT({ cantidad: 5, presentacion_id: 'pr-cono', marca_id: 'm-lel' }), IT({ cantidad: 3, presentacion_id: 'pr-tall', omitir: true }), IT({ cantidad: 2, insumo_id: 'ins-h' })] })
  const r = rm.form.renglones
  chk('mientras lee el acopio: "Buscando el acopio del cliente…"', /Buscando el acopio del cliente…/.test(S.htmlSaldoAcopioRemito(rm, r[0], 0)))
  esperas.push(S.cargarAcopiosRemito(rm).then(() => {
    const ll = rpcDe(S, 'acopios_lista')[0]
    chk('lee los acopios del cliente del remito, en su fábrica', ll && ll[1].p_unidad_negocio_id === 'u-d' && ll[1].p_cliente_id === 'c-ros')
    const h0 = S.htmlSaldoAcopioRemito(rm, r[0], 0)
    chk('alcanza: suma los activos del mismo producto (70 + 10)', /class="ad-rm-acopio" data-rm-acopio="0">Acopio: quedan 80 cajas; después de este remito, 50\.<\/p>/.test(h0), h0)
    const h1 = S.htmlSaldoAcopioRemito(rm, r[1], 1)
    chk('no alcanza: en amarillo', /ad-rm-acopio--falta/.test(h1) && /No hay acopio de esto para el cliente: quedan 20 cajas y el remito pide 25\./.test(h1), h1)
    const h2 = S.htmlSaldoAcopioRemito(rm, r[2], 2)
    chk('otro cono (el de LELONA está anulado): "No hay acopio de esto para el cliente."', /ad-rm-acopio--falta/.test(h2) && />No hay acopio de esto para el cliente\.<\/p>/.test(h2), h2)
    chk('el omitido no lleva saldo', S.htmlSaldoAcopioRemito(rm, r[3], 3) === '')
    chk('un insumo no lleva saldo', S.htmlSaldoAcopioRemito(rm, r[4], 4) === '')
    const t = S.saldoAcopioRemito(rm, { ...r[0], cantidad: 60 })
    chk('el terminado no cuenta', t.saldo === 80)
    // Cambiar las cajas actualiza el saldo sin redibujar el remito.
    const el = { dataset: { rmAcopio: '1' }, outerHTML: '' }
    S.__els.get('ad-remito-cuerpo').querySelectorAll = (sel) => sel === '[data-rm-acopio]' ? [el] : []
    S.alEscribirRemito({ target: { dataset: { rmCantidad: '1' }, value: '20' } })
    chk('cambiar las cajas actualiza el saldo (20 de 20 alcanza justo)', /class="ad-rm-acopio" data-rm-acopio="1">Acopio: quedan 20 cajas; después de este remito, 0\.<\/p>/.test(el.outerHTML), el.outerHTML)
    S.__els.get('ad-remito-cuerpo').querySelectorAll = () => []
    // Dos renglones del mismo producto suman lo que piden.
    rm.form.renglones.push(S.renglonDesdeItem(IT({ cantidad: 60, presentacion_id: 'pr-tall' })))
    chk('dos renglones del mismo producto: suma lo que piden (90 de 80)', S.saldoAcopioRemito(rm, rm.form.renglones[0]).alcanza === false)
    const html = S.htmlRenglonRemito(rm.form.renglones[1], 1, CAT, rm)
    chk('el saldo va en el renglón, antes de los lotes', /data-rm-acopio="1"[\s\S]*¿De qué lotes\?/.test(html))
    rm.form.talonario = 'oficial'
    chk('con talonario Oficial, nada', S.htmlSaldoAcopioRemito(rm, r[0], 0) === '' && !/data-rm-acopio/.test(S.htmlRenglonRemito(r[0], 0, CAT, rm)))
    rm.form.talonario = 'acopio'
    rm.form.clienteId = null
    chk('sin cliente, nada', S.htmlSaldoAcopioRemito(rm, r[0], 0) === '')
  }))
}

{
  // Elegir el cliente o el talonario Acopio lee el acopio; si falla, lo dice (sin amarillo).
  const S = nuevo()
  enDolce(S)
  rpcAcopios(S, { extra: { acopios_lista: { data: null, error: { message: 'sin red' } } } })
  const rm = remito(S, { clienteId: null, items: [IT({ cantidad: 3, presentacion_id: 'pr-tall' })] })
  S.elegirClienteRemito('c-ros')
  esperas.push((async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve()
    chk('elegir el cliente lee su acopio', rpcDe(S, 'acopios_lista').some(r => r[1].p_cliente_id === 'c-ros'))
    const h = S.htmlSaldoAcopioRemito(rm, rm.form.renglones[0], 0)
    chk('si falla, lo dice sin amarillo', /No se pudo leer el acopio del cliente/.test(h) && !/--falta/.test(h))
    const S2 = nuevo()
    enDolce(S2)
    rpcAcopios(S2)
    remito(S2, { talonario: 'oficial', items: [IT({ cantidad: 3, presentacion_id: 'pr-tall' })] })
    S2.elegirTalonarioRemito('acopio')
    for (let i = 0; i < 10; i++) await Promise.resolve()
    chk('pasar a talonario Acopio lee el acopio', rpcDe(S2, 'acopios_lista').length === 1)
  })())
}
{
  const S = nuevo()
  const rm = { form: { talonario: 'acopio', clienteId: 'c-x', renglones: [] }, acopios: { clienteId: 'c-x', filas: [], error: marca('errorLectura') } }
  chequearMarcas(chk, 'htmlSaldoAcopioRemito', S.htmlSaldoAcopioRemito(rm, { presentacionId: 'pr-x', cantidad: 1 }, 0), ['errorLectura'])
}

fin()
