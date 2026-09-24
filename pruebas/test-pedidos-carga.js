// Parte 3 de Pedidos: cargar un pedido. Cliente con buscador, fecha (hoy por
// defecto), entrega opcional, observaciones y los renglones: producto → sin
// cono (puesto) / con cono (y ahí el buscador de conos) → presentación →
// cajas, más "No sé qué es" para un renglón de TEXTO LIBRE. Una sola llamada a
// guardar_pedido con todos los renglones.
//
//   node pruebas/test-pedidos-carga.js

const path = require('path')
const fs = require('fs')
const { construirPedidos } = require('./sandbox-pedidos')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/pedidos.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirPedidos(ARCHIVO)

const CAT = {
  productos: [
    { id: 'p-cuc', nombre: 'Cucurucho grande', tipo_masa: 'Común', orden: 1 },
    { id: 'p-cho', nombre: 'Cucurucho choco', tipo_masa: 'Chocolate', orden: 2 },
    { id: 'p-cap', nombre: 'Capelina', tipo_masa: 'Común', orden: 3 },
  ],
  presentaciones: [
    { id: 'pr-cuc-sin', producto_id: 'p-cuc', nombre: 'Caja x 100', con_cono: false, media_caja: false, empaque: null, unidades_por_caja: 100 },
    { id: 'pr-cuc-con', producto_id: 'p-cuc', nombre: 'Caja x 100 con cono', con_cono: true, media_caja: false, empaque: null, unidades_por_caja: 100 },
    { id: 'pr-cho-sin', producto_id: 'p-cho', nombre: 'Caja x 50', con_cono: false, media_caja: false, empaque: null, unidades_por_caja: 50 },
    { id: 'pr-cap-a', producto_id: 'p-cap', nombre: 'Caja x 200', con_cono: false, media_caja: false, empaque: null, unidades_por_caja: 200 },
    { id: 'pr-cap-b', producto_id: 'p-cap', nombre: 'Media caja', con_cono: false, media_caja: true, empaque: 'bolsa', unidades_por_caja: 100 },
  ],
  marcas: [{ id: 'm-lolo', nombre: 'LOLO', estado_alta: 'activo' }, { id: 'm-pepe', nombre: 'PEPE', estado_alta: 'pendiente_revision' }],
}
const CLIENTES = [
  { id: 'c1', nombre: 'Distribuidora Anatolia', apodos: ['el Turco'], activo: true },
  { id: 'c2', nombre: 'Viejo Distri', apodos: [], activo: false },
]

function conForm(S) {
  S.estado.catalogo = CAT
  S.estado.clientes = CLIENTES
  S.estado.form = S.formPedidoVacio()
  return S.estado.form
}

// ── lo que viene puesto ──────────────────────────────────────────────────────
{
  const S = nuevo()
  const f = S.formPedidoVacio()
  chk('la fecha viene en HOY', f.fecha === S.hoyArgentina() && S.esFechaIso(f.fecha))
  chk('la entrega viene vacía (es opcional)', f.entrega === '')
  chk('arranca con un renglón de producto', f.renglones.length === 1 && f.renglones[0].tipo === 'producto')
  chk('SIN CONO viene puesto', f.renglones[0].conCono === false)
  chk('no trae texto_original inventado', f.textoOriginal === null)
  chk('hoyArgentina usa la zona de Argentina', /timeZone: ZONA_AR/.test(src) && S.ZONA_AR === 'America/Argentina/Buenos_Aires')
}

// ── "sin cono" puesto, y el buscador de conos recién con "con cono" ──────────
{
  const S = nuevo()
  const f = conForm(S)
  S.elegirProductoRenglon(0, 'p-cuc')
  const r = f.renglones[0]
  chk('elegir el producto lo guarda', r.productoId === 'p-cuc')
  chk('con una sola presentación sin cono, se elige sola', r.presentacionId === 'pr-cuc-sin')
  let h = S.htmlRenglon(r, 0, CAT, false)
  chk('"Sin cono" se ve marcado', /data-valor="no" aria-pressed="true"/.test(h) && /data-valor="si" aria-pressed="false"/.test(h))
  chk('sin cono NO hay buscador de conos', !/data-r-cono-buscar/.test(h) && !/data-r-marca=/.test(h))
  S.elegirConoRenglon(0, true)
  h = S.htmlRenglon(r, 0, CAT, false)
  chk('con cono aparece el buscador de conos', /data-r-cono-buscar="0"/.test(h))
  chk('con cono aparecen los conos para elegir', /data-r-marca="0" data-id="m-lolo"/.test(h))
  chk('y "Cono común" viene elegido', /data-id="" aria-pressed="true">Cono común/.test(h))
  chk('con cono cambia la presentación a la de con cono', r.presentacionId === 'pr-cuc-con')
  S.buscarConoRenglon(0, 'lol')
  chk('buscar el cono guarda lo escrito', r.marcaBusqueda === 'lol')
  chk('el buscador filtra', S.htmlMarcasRenglon(r, 0, CAT).includes('LOLO') && !S.htmlMarcasRenglon(r, 0, CAT).includes('PEPE'))
  chk('un cono que no está lo dice', /Ningún cono coincide/.test(S.htmlMarcasRenglon({ ...r, marcaBusqueda: 'zz' }, 0, CAT)))
  S.elegirMarcaRenglon(0, 'm-lolo')
  chk('elegir un cono', r.marcaId === 'm-lolo')
  S.elegirMarcaRenglon(0, 'no-existe')
  chk('un cono que no está en el catálogo no se elige', r.marcaId === 'm-lolo')
  S.elegirConoRenglon(0, false)
  chk('volver a sin cono olvida el cono', r.marcaId === null && r.marcaBusqueda === '')
  chk('y vuelve a la presentación sin cono', r.presentacionId === 'pr-cuc-sin')
  S.elegirMarcaRenglon(0, 'm-lolo')
  chk('sin cono no se puede elegir un cono', r.marcaId === null)
}

// ── productos: los de chocolate al final, separados ──────────────────────────
{
  const S = nuevo()
  const h = S.htmlProductosRenglon(0, CAT)
  const iCho = h.indexOf('p-cho'), iSep = h.indexOf('pe-separador'), iCap = h.indexOf('p-cap'), iCuc = h.indexOf('p-cuc')
  chk('los tres productos están', iCho > 0 && iCap > 0 && iCuc > 0)
  chk('hay una línea que separa el chocolate', iSep > 0 && /Chocolate/.test(h))
  chk('el de chocolate va DESPUÉS de la línea y de los comunes', iCho > iSep && iSep > iCap && iSep > iCuc)
  chk('lo decide el tipo de masa, no el nombre', S.esProductoChocolate({ nombre: 'Algo', tipo_masa: 'Chocolate' }) && !S.esProductoChocolate({ nombre: 'Chocolatoso', tipo_masa: 'Común' }))
  chk('sin productos de chocolate no hay línea', !/pe-separador/.test(S.htmlProductosRenglon(0, { ...CAT, productos: CAT.productos.filter(p => p.tipo_masa !== 'Chocolate') })))
}

// ── presentaciones ────────────────────────────────────────────────────────
{
  const S = nuevo()
  const f = conForm(S)
  S.elegirProductoRenglon(0, 'p-cap')
  const r = f.renglones[0]
  chk('con DOS presentaciones no se elige ninguna sola', r.presentacionId === null)
  S.elegirPresentacionRenglon(0, 'pr-cap-b')
  chk('elegir la presentación', r.presentacionId === 'pr-cap-b')
  S.elegirPresentacionRenglon(0, 'pr-cuc-sin')
  chk('una presentación de OTRO producto no se elige', r.presentacionId === 'pr-cap-b')
  S.elegirProductoRenglon(0, 'p-cuc')
  chk('cambiar de producto suelta la presentación del anterior', r.presentacionId === 'pr-cuc-sin')
  S.elegirProductoRenglon(0, 'p-cap')
  chk('y vuelve a pedir elegir', r.presentacionId === null)
  S.elegirPresentacionRenglon(0, 'pr-cap-b')
  chk('el detalle dice media caja y el empaque', S.detallePresentacion(CAT.presentaciones[4]).includes('media caja') && S.detallePresentacion(CAT.presentaciones[4]).includes('bolsa'))
  S.elegirConoRenglon(0, true)
  chk('sin presentaciones con cono, lo dice', /no tiene presentaciones con cono/.test(S.htmlRenglon(r, 0, CAT, false)))
  S.cambiarProductoRenglon(0)
  chk('"Cambiar" el producto vuelve a la lista', r.productoId === null && r.presentacionId === null)
}

// ── el payload de guardar_pedido ────────────────────────────────────────────
{
  const S = nuevo()
  const f = conForm(S)
  f.clienteId = 'c1'
  f.entrega = ''
  f.observaciones = '  para el viernes '
  S.elegirProductoRenglon(0, 'p-cuc')
  f.renglones[0].cajas = 10.5
  S.agregarRenglon('producto')
  S.elegirProductoRenglon(1, 'p-cuc')
  S.elegirConoRenglon(1, true)
  S.elegirMarcaRenglon(1, 'm-lolo')
  f.renglones[1].cajas = 4
  f.renglones[1].observacion = ' sin sellar '
  S.agregarRenglon('texto')
  f.renglones[2].texto = '  3 de las rosadas  '
  S.agregarRenglon('texto')
  f.renglones[3].texto = 'lo de siempre'
  f.renglones[3].cajas = 2
  const p = S.parametrosGuardarPedido(f, 'u-cn')
  chk('ocho parámetros, los de la firma', JSON.stringify(Object.keys(p).sort()) === JSON.stringify(['p_cliente_id', 'p_fecha', 'p_fecha_entrega', 'p_id', 'p_items', 'p_observaciones', 'p_texto_original', 'p_unidad_negocio_id'].sort()))
  chk('p_id null en un pedido nuevo', p.p_id === null)
  chk('la entrega vacía viaja null', p.p_fecha_entrega === null)
  chk('las observaciones sin los bordes', p.p_observaciones === 'para el viernes')
  chk('texto_original null (no se inventa)', p.p_texto_original === null)
  chk('los CUATRO renglones en UNA lista', Array.isArray(p.p_items) && p.p_items.length === 4)
  const [a, b, c, d] = p.p_items
  chk('producto sin cono: presentación, cajas y marca null', a.presentacion_id === 'pr-cuc-sin' && a.cajas === 10.5 && a.marca_id === null)
  chk('producto con cono: la marca elegida', b.presentacion_id === 'pr-cuc-con' && b.marca_id === 'm-lolo' && b.cajas === 4)
  chk('la nota del renglón va limpia', b.observacion === 'sin sellar' && a.observacion === null)
  chk('texto libre: el texto limpio', c.texto_libre === '3 de las rosadas')
  chk('texto libre sin cajas: null (la base pone 1)', c.cajas === null)
  chk('texto libre con cajas: las cajas', d.cajas === 2)
  chk('NUNCA viajan los dos campos juntos',
    p.p_items.every(x => ('presentacion_id' in x) !== ('texto_libre' in x)))
  chk('un renglón de producto NO lleva la clave texto_libre', !('texto_libre' in a) && !('texto_libre' in b))
  chk('un renglón de texto NO lleva presentacion_id ni marca_id', !('presentacion_id' in c) && !('marca_id' in c))
  // Un renglón que era texto y se identificó: ya es producto y nada más.
  S.identificarRenglon(2)
  chk('"Ya sé qué es" lo pasa a producto', f.renglones[2].tipo === 'producto')
  chk('y lo que decía el mensaje queda como nota', f.renglones[2].observacion === '3 de las rosadas')
  const p2 = S.itemParaBase(f.renglones[2])
  chk('el identificado viaja sin texto_libre', !('texto_libre' in p2))
  // Con cono y "Cono común": marca null.
  const r = S.renglonProducto(); r.productoId = 'p-cuc'; r.conCono = true; r.presentacionId = 'pr-cuc-con'; r.cajas = 1
  chk('con cono común, marca_id null', S.itemParaBase(r).marca_id === null)
  // Un renglón que tuvo cono y volvió a sin cono no manda la marca vieja.
  r.conCono = false; r.marcaId = 'm-lolo'
  chk('sin cono no manda marca aunque haya quedado una', S.itemParaBase(r).marca_id === null)
  chk('cuando el pedido se corrige, texto_original se conserva', S.parametrosGuardarPedido({ ...f, id: 'ped1', textoOriginal: 'hola, mandame 10' }, 'u-cn').p_texto_original === 'hola, mandame 10')
}

// ── lo que falta ──────────────────────────────────────────────────────────
{
  const S = nuevo()
  const f = conForm(S)
  let faltan = S.faltanPedido(f)
  chk('sin cliente falta', faltan.some(x => /cliente/.test(x)))
  chk('un renglón sin producto falta', faltan.some(x => /Renglón 1: elegí el producto/.test(x)))
  f.clienteId = 'c1'
  S.elegirProductoRenglon(0, 'p-cap')
  chk('sin presentación falta', S.faltanPedido(f).some(x => /presentación/.test(x)))
  S.elegirPresentacionRenglon(0, 'pr-cap-a')
  chk('sin cajas falta', S.faltanPedido(f).some(x => /cajas/.test(x)))
  f.renglones[0].cajas = 0
  chk('cero cajas falta', S.faltanPedido(f).some(x => /cajas/.test(x)))
  f.renglones[0].cajas = 3
  chk('completo no falta nada', S.faltanPedido(f).length === 0)
  f.entrega = '2000-01-01'
  chk('la entrega antes del pedido falta', S.faltanPedido(f).some(x => /anterior/.test(x)))
  f.entrega = ''
  S.agregarRenglon('texto')
  chk('un texto vacío falta', S.faltanPedido(f).some(x => /Renglón 2: escribí lo que dice el mensaje/.test(x)))
  f.renglones[1].texto = 'x'
  chk('un texto de una letra falta', S.faltanPedido(f).length === 1)
  S.quitarRenglon(1)
  S.quitarRenglon(0)
  chk('sin renglones falta', S.faltanPedido(f).some(x => /al menos un renglón/.test(x)))
}

// ── guardar: una sola llamada, todo o nada ────────────────────────────────
esperas.push((async () => {
  const S = nuevo()
  const f = conForm(S)
  S.estado.vista = 'pe-vista-form'
  await S.guardarPedido()
  chk('con cosas faltando NO se llama a la base', S.__llamadas.rpc.length === 0)
  chk('y lo que falta se dice pegado al botón', S.__els.get('pe-form-error').hidden === false && /cliente/.test(S.__els.get('pe-form-error').textContent))
  chk('el botón NO se deshabilita por lo que falta', S.__els.get('pe-form-guardar').disabled === false)
  chk('el renglón incompleto se marca', /pe-renglon--error/.test(S.__els.get('pe-form-renglones').innerHTML))
  f.clienteId = 'c1'
  S.elegirProductoRenglon(0, 'p-cuc')
  f.renglones[0].cajas = 5
  S.agregarRenglon('texto')
  f.renglones[1].texto = 'las de siempre'
  S.__els.get('pe-form-fecha').value = '2026-09-20'
  S.__els.get('pe-form-entrega').value = '2026-09-25'
  S.__els.get('pe-form-observaciones').value = 'urgente'
  S.__setRpc(() => ({ data: { pedido_id: 'ped-9', numero: 42 }, error: null }))
  await S.guardarPedido()
  chk('UNA sola llamada', S.__llamadas.rpc.length === 1 && S.__llamadas.rpc[0][0] === 'guardar_pedido')
  const p = S.__llamadas.rpc[0][1]
  chk('con los dos renglones juntos', p.p_items.length === 2 && 'presentacion_id' in p.p_items[0] && 'texto_libre' in p.p_items[1])
  chk('las fechas de los campos', p.p_fecha === '2026-09-20' && p.p_fecha_entrega === '2026-09-25')
  chk('las observaciones del campo', p.p_observaciones === 'urgente')
  chk('avisa con el número', S.__llamadas.exitos.some(m => /42/.test(m)))
  chk('y suelta el formulario', S.estado.form === null)
})())

esperas.push((async () => {
  const S = nuevo()
  const f = conForm(S)
  f.clienteId = 'c1'
  S.elegirProductoRenglon(0, 'p-cuc')
  f.renglones[0].cajas = 5
  S.pintarFormEntero()
  S.__setRpc(() => ({ data: null, error: { message: 'El cliente no existe o no está activo en esta unidad.' } }))
  await S.guardarPedido()
  chk('el error de la base se muestra TAL CUAL', S.__els.get('pe-form-error').textContent === 'El cliente no existe o no está activo en esta unidad.')
  chk('y se ve', S.__els.get('pe-form-error').hidden === false)
  chk('el formulario sigue abierto con lo cargado', S.estado.form === f && f.renglones[0].cajas === 5)
  chk('el botón vuelve a habilitarse', S.__els.get('pe-form-guardar').disabled === false)
})())

// ── el pedido con renglones cumplidos NO manda la lista entera ─────────────
esperas.push((async () => {
  const S = nuevo()
  S.estado.catalogo = CAT
  S.estado.clientes = CLIENTES
  const ped = { id: 'ped1', cliente_id: 'c1', fecha: '2026-09-20', fecha_entrega: null, observaciones: null, texto_original: 'mandame 10' }
  const items = [
    { id: 'i1', presentacion_id: 'pr-cuc-con', marca_id: 'm-lolo', cajas: 10, cajas_cumplidas: 4, texto_libre: null, observacion: null },
    { id: 'i2', presentacion_id: null, marca_id: null, cajas: 1, cajas_cumplidas: 0, texto_libre: 'las rosas', observacion: 'ojo' },
  ]
  const f = S.formPedidoDesde(ped, items, CAT)
  chk('al abrir para corregir, sabe que tiene cumplidos', f.tieneCumplidos === true)
  chk('reconstruye el producto, el cono y la marca', f.renglones[0].productoId === 'p-cuc' && f.renglones[0].conCono === true && f.renglones[0].marcaId === 'm-lolo')
  chk('reconstruye el texto libre', f.renglones[1].tipo === 'texto' && f.renglones[1].texto === 'las rosas' && f.renglones[1].observacion === 'ojo')
  chk('conserva el texto_original', f.textoOriginal === 'mandame 10')
  S.estado.form = f
  S.pintarFormEntero()
  chk('el formulario avisa que hay que corregir de a uno', /de a uno/.test(S.__els.get('pe-form-aviso').innerHTML))
  await S.guardarPedido()
  chk('guardar NO manda la lista entera', S.__llamadas.rpc.length === 0)
  chk('y lo dice pegado al botón', /de a uno/.test(S.__els.get('pe-form-error').textContent) && S.__els.get('pe-form-error').hidden === false)
  const sinCumplir = S.formPedidoDesde(ped, items.map(i => ({ ...i, cajas_cumplidas: 0 })), CAT)
  chk('sin nada cumplido se puede reemplazar', sinCumplir.tieneCumplidos === false)
})())

// ── HTML malicioso en los renders de la carga ──────────────────────────────
{
  const S = nuevo()
  const catMal = {
    productos: [{ id: marca('prodid'), nombre: marca('prodnombre'), tipo_masa: 'Común' }, { id: 'pch', nombre: marca('choconombre'), tipo_masa: 'Chocolate' }],
    presentaciones: [{ id: marca('presid'), producto_id: 'px', nombre: marca('presnombre'), con_cono: true, empaque: marca('empaque'), unidades_por_caja: 10 }],
    marcas: [{ id: marca('marcaid'), nombre: marca('marcanombre') }],
  }
  chequearMarcas(chk, 'productos', S.htmlProductosRenglon(0, catMal), ['prodid', 'prodnombre', 'choconombre'])
  const r = { ...S.renglonProducto(), productoId: 'px', conCono: true, marcaBusqueda: marca('busquedacono') }
  chequearMarcas(chk, 'cono', S.htmlConoRenglon(r, 0, catMal), ['busquedacono'])
  chequearMarcas(chk, 'conos', S.htmlMarcasRenglon({ ...r, marcaBusqueda: '' }, 0, catMal), ['marcaid', 'marcanombre'])
  chequearMarcas(chk, 'presentaciones', S.htmlPresentacionesRenglon(r, 0, catMal), ['presid', 'presnombre', 'empaque'])
  const t = { ...S.renglonTexto(marca('textolibre')), observacion: marca('notatexto') }
  const ht = S.htmlRenglon(t, 0, catMal, false)
  chequearMarcas(chk, 'renglón de texto libre', ht, ['textolibre', 'notatexto'])
  chk('el renglón de texto libre va en bordó', /pe-renglon--texto/.test(ht))
  chk('con el sello "Falta identificar"', /<span class="pe-sello">Falta identificar<\/span>/.test(ht))
  const hp = S.htmlRenglon({ ...S.renglonProducto(), productoId: marca('prodid'), observacion: marca('notaprod') }, 0, catMal, false)
  chequearMarcas(chk, 'renglón de producto', hp, ['notaprod', 'prodnombre'])
  S.estado.clientes = [{ id: marca('cid'), nombre: marca('cnombre'), apodos: [marca('capodo')], activo: true }]
  chequearMarcas(chk, 'resultados de clientes', S.htmlResultadosClientes(''), ['cid', 'cnombre', 'capodo'])
  chequearMarcas(chk, 'sin coincidencias', S.htmlResultadosClientes(marca('cbusca')), ['cbusca'])
  chequearMarcas(chk, 'cliente elegido', S.htmlClienteElegido({ clienteId: marca('cid') }), ['cnombre'])
  chk('un inactivo NO se ofrece en un pedido nuevo', !/Viejo Distri/.test((S.estado.clientes = CLIENTES, S.htmlResultadosClientes(''))))
  chk('el activo sí', /Distribuidora Anatolia/.test(S.htmlResultadosClientes('')))
  chk('se busca también por apodo', /Distribuidora Anatolia/.test(S.htmlResultadosClientes('turco')))
  S.estado.clientes = []
  chk('sin clientes activos, lo dice', /todavía no tiene clientes activos/.test(S.htmlResultadosClientes('')))
}

// ── descripción de un renglón ───────────────────────────────────────────────
{
  const S = nuevo()
  chk('producto sin cono', S.descripcionRenglon(CAT, { presentacion_id: 'pr-cuc-sin' }) === 'Cucurucho grande · Caja x 100 · sin cono')
  chk('producto con cono de marca', S.descripcionRenglon(CAT, { presentacion_id: 'pr-cuc-con', marca_id: 'm-lolo' }) === 'Cucurucho grande · Caja x 100 con cono · cono LOLO')
  chk('producto con cono común', /cono común$/.test(S.descripcionRenglon(CAT, { presentacion_id: 'pr-cuc-con', marca_id: null })))
  chk('texto libre', S.descripcionRenglon(CAT, { presentacion_id: null, texto_libre: '  las rosas ' }) === 'las rosas')
  chk('sin catálogo no inventa un producto', /no se pudo leer/.test(S.descripcionRenglon(null, { presentacion_id: 'x' })))
}

// ── catálogo vacío (sin permiso de Producción) ─────────────────────────────
{
  const S = nuevo()
  S.estado.catalogo = { productos: [], presentaciones: [], marcas: [] }
  chk('sin productos visibles, lo explica y ofrece "No sé qué es"', /No se ve ningún producto/.test(S.htmlAvisoCatalogo()) && /No sé qué es/.test(S.htmlAvisoCatalogo()))
  S.estado.catalogo = CAT
  chk('con productos no dice nada', S.htmlAvisoCatalogo() === '')
}

// ── números y resumen ─────────────────────────────────────────────────────
{
  const S = nuevo()
  chk('cajas enteras sin decimales', S.textoCajas(40) === '40')
  chk('cajas con decimales', S.textoCajas(10.5) === '10,5')
  chk('miles con punto', S.textoCajas(1500) === '1.500')
  chk('un dato ausente es "—", nunca 0', S.textoCajas(null) === '—' && S.textoCajas(undefined) === '—')
  chk('cajas con hasta 2 decimales', S.DECIMALES_CAJAS === 2)
  const f = conForm(S)
  f.renglones[0].cajas = 3
  S.agregarRenglon('texto')
  chk('el resumen cuenta renglones, cajas y sin identificar', S.textoResumenForm(f) === '2 renglones · 3 cajas · 1 sin identificar')
  chk('los campos de cajas se enlazan con enlazarCampoNumero y se escriben con ponerNumero',
    /enlazarCampoNumero\(input, \{ decimales: DECIMALES_CAJAS \}\)/.test(src) && /ponerNumero\(input, r\.cajas\)/.test(src))
  chk('las cajas se leen con leerCampoNumero', /r\.cajas = leerCampoNumero\(t\)/.test(src))
}

// ── leer el catálogo ─────────────────────────────────────────────────────
esperas.push((async () => {
  const S = nuevo()
  S.__tablas.productos_terminados = CAT.productos
  S.__tablas.producto_presentaciones = CAT.presentaciones
  S.__tablas.marcas_personalizadas = CAT.marcas
  const c = await S.leerCatalogo('u-cn')
  chk('lee productos, presentaciones y marcas', c.productos.length === 3 && c.presentaciones.length === 5 && c.marcas.length === 2)
  const qp = S.__llamadas.consultas.find(x => x[0] === 'productos_terminados')[1]
  chk('los productos de la unidad y activos', qp.some(f => f[0] === 'eq' && f[1] === 'unidad_negocio_id' && f[2] === 'u-cn') && qp.some(f => f[0] === 'eq' && f[1] === 'activo' && f[2] === true))
  const qpr = S.__llamadas.consultas.find(x => x[0] === 'producto_presentaciones')[1]
  chk('las presentaciones activas', qpr.some(f => f[0] === 'eq' && f[1] === 'activa' && f[2] === true))
  chk('trae con_cono', /con_cono/.test(qpr.find(f => f[0] === 'select')[1]))
  const qm = S.__llamadas.consultas.find(x => x[0] === 'marcas_personalizadas')[1]
  chk('los conos rechazados no se ofrecen', qm.some(f => f[0] === 'neq' && f[1] === 'estado_alta' && f[2] === 'rechazada'))
})())

// ── abrir un pedido nuevo: solo con cargar ────────────────────────────────
esperas.push((async () => {
  const S = nuevo()
  S.estado.misTareas = new Map([['ver', { unidades: ['u-cn'] }]])
  S.pintarAccionesInicio()
  chk('sin cargar, el botón no se ve', S.__els.get('pe-btn-nuevo').hidden === true)
  await S.abrirPedidoNuevo()
  chk('sin cargar, no se abre', S.estado.vista !== 'pe-vista-form')
  S.estado.misTareas = new Map([['cargar', { unidades: ['u-cn'] }]])
  S.pintarAccionesInicio()
  chk('con cargar se ve', S.__els.get('pe-btn-nuevo').hidden === false)
  S.__tablas.clientes = CLIENTES
  await S.abrirPedidoNuevo()
  chk('con cargar se abre el formulario', S.estado.vista === 'pe-vista-form' && !!S.estado.form)
  chk('y lee los clientes de la unidad', S.estado.clientes?.length === 2)
})())

fin()
