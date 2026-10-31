// ADMINISTRACIÓN — ENTRE EMPRESAS: PONER PRECIO A UN MOVIMIENTO (31/10/2026,
// arreglos de la auditoría, punto 7).
//
// La base (pg_get_functiondef, 30/10/2026): movimiento_para_valorizar(
// p_referencia_tipo, p_referencia_id) → { fecha, acreedora_id, acreedora,
// deudora_id, deudora, lista_interna, valorizado, items[{ clave, detalle,
// cantidad, unidad, precio_sugerido, fuente }] } y
// valorizar_movimiento_entre_empresas(p_referencia_tipo, p_referencia_id,
// p_precios [{ clave, precio }], p_concepto) → { id, importe } ("Faltan
// precios: …"). La deuda vuelve en movimientos_entre_empresas como 'otro'
// con referencia_tipo 'traspaso_terminado_precio' y referencia_id = el
// movimiento. Esta suite EJECUTA la pantalla y fija:
//  - "Mercadería sin valorizar" con la mercadería Y los insumos sin precio,
//    un renglón por movimiento (referencia_tipo, referencia_id), con la
//    fecha, quién entrega → quién recibe y el detalle resumido;
//  - "Poner precio" solo con gastos:gastos_empresa (las órdenes, como antes);
//  - la ventana: quién entrega → quién recibe, la fecha, la lista interna, el
//    precio sugerido precargado con su fuente (vacío y en naranja si no hay),
//    el subtotal y el total en vivo, el concepto opcional;
//  - guardar manda TODOS los renglones; "Faltan precios: …" de la base, tal
//    cual; al guardar se recargan el saldo y la lista;
//  - la fila de una valorización: "Valorización" y "Cambiar precio", que
//    reabre la ventana (el tipo, de su mercadería o probando los tres);
//  - ya valorizado: "Valorizado en $ X el dd/mm" y "Cambiar precio";
//  - el ajuste no deja mandar un importe <= 0;
//  - XSS de todo lo nuevo.
//
//   node pruebas/test-administracion-arreglos-entre-empresas.js

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas, estaticoAcotado } = require('./circuito-comun')
const { SEGURAS_ADMINISTRACION, SEGURAS_REGEX_ADMINISTRACION } = require('./seguras-administracion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()

const TAREAS = [['gastos:gastos_empresa', null], ['retiros:ver', { unidades: ['u-n', 'u-d'] }], ['retiros:precios', { unidades: ['u-n', 'u-d'] }]]
const SIN_GASTOS = [['retiros:ver', { unidades: ['u-n', 'u-d'] }], ['retiros:precios', { unidades: ['u-n', 'u-d'] }]]
function nuevo({ tareas = TAREAS, rol = 'usuario' } = {}) {
  const S = construirAdministracion(ARCHIVO)
  S.estado.miRolApp = rol
  S.estado.misTareas = new Map(tareas)
  S.estado.empresas = [
    { id: 'u-n', nombre: 'Cucuruchos Nuss', prefijo: 'N' },
    { id: 'u-d', nombre: 'Dolce Pasta', prefijo: 'D' },
    { id: 'u-m', nombre: 'Mengui', prefijo: 'M' },
  ]
  S.__doc.getElementById('ad-entre-desde').value = '2026-10-01'
  S.__doc.getElementById('ad-entre-hasta').value = '2026-10-31'
  return S
}
const html = (S, id) => S.__els.get(id)?.innerHTML ?? ''
const el = (S, id) => S.__doc.getElementById(id)
const cuantas = (h, re) => (h.match(re) || []).length
const dormir = (ms = 20) => new Promise(r => setTimeout(r, ms))

const F = (o) => ({ fecha: '2026-10-15', tipo: 'otro', de_unidad_id: null, de_unidad: null, a_unidad_id: null, a_unidad: null, detalle: '', moneda: null,
  importe: null, cantidad: null, unidad_medida: null, presentacion_id: null, insumo_id: null, referencia_tipo: null, referencia_id: null,
  marca_id: null, con_precio: null, ...o })
const N = { id: 'u-n', nombre: 'Cucuruchos Nuss' }, D = { id: 'u-d', nombre: 'Dolce Pasta' }
const de = (u) => ({ de_unidad_id: u.id, de_unidad: u.nombre }), a = (u) => ({ a_unidad_id: u.id, a_unidad: u.nombre })

// Lo sin precio de la base (la forma real de movimientos_entre_empresas).
const SIN = [
  // Un traspaso de producto terminado de Nuss a Dolce: dos renglones.
  F({ tipo: 'mercaderia', fecha: '2026-10-27', ...de(N), ...a(D), detalle: 'Capelina Grande · Caja · lote 12', cantidad: '10', unidad_medida: 'cajas', presentacion_id: 'p1', referencia_tipo: 'traspaso_terminado', referencia_id: 'tt-1', con_precio: false }),
  F({ tipo: 'mercaderia', fecha: '2026-10-27', ...de(N), ...a(D), detalle: 'Cucuruchón Chico · Caja sin cono · lote 13', cantidad: '5', unidad_medida: 'cajas', presentacion_id: 'p2', referencia_tipo: 'traspaso_terminado', referencia_id: 'tt-1', con_precio: false }),
  // Una transferencia de insumos de Dolce a Nuss: dos insumos (uno en dos lotes).
  F({ tipo: 'insumos', fecha: '2026-10-25', ...de(D), ...a(N), detalle: 'Harina 000 Cañuelas · lote L1', cantidad: '50', unidad_medida: 'kg', insumo_id: 'i-h', referencia_tipo: 'transferencia_stock', referencia_id: 'st-1', con_precio: false }),
  F({ tipo: 'insumos', fecha: '2026-10-25', ...de(D), ...a(N), detalle: 'Harina 000 Cañuelas · lote L2', cantidad: '25', unidad_medida: 'kg', insumo_id: 'i-h', referencia_tipo: 'transferencia_stock', referencia_id: 'st-1', con_precio: false }),
  F({ tipo: 'insumos', fecha: '2026-10-25', ...de(D), ...a(N), detalle: 'Etiqueta 40 x 40', cantidad: '300', unidad_medida: 'un', insumo_id: 'i-e', referencia_tipo: 'transferencia_stock', referencia_id: 'st-1', con_precio: false }),
  // Insumos ya valorizados: su importe es un 'otro'.
  F({ tipo: 'insumos', fecha: '2026-10-20', ...de(N), ...a(D), detalle: 'Azúcar · lote 9', cantidad: '100', unidad_medida: 'kg', insumo_id: 'i-a', referencia_tipo: 'transferencia_stock', referencia_id: 'st-0', con_precio: true }),
  F({ tipo: 'otro', fecha: '2026-10-20', ...de(N), ...a(D), detalle: 'Valorización Transferencia de insumos del 20/10/2026', moneda: 'ARS', importe: '85000.00', referencia_tipo: 'traspaso_terminado_precio', referencia_id: 'st-0' }),
  // Una orden de retiro sin valorizar: se valoriza en la orden.
  F({ tipo: 'mercaderia', fecha: '2026-10-30', ...de(D), ...a(N), detalle: 'Barquillo 40 x4 · Caja · lote L7 · orden D-I-0002', cantidad: '10', unidad_medida: 'cajas', presentacion_id: 'p3', referencia_tipo: 'orden_retiro', referencia_id: 'o-d2', con_precio: false }),
]

// La respuesta de movimiento_para_valorizar para el traspaso tt-1.
const MOV_TT = {
  referencia_tipo: 'traspaso_terminado', referencia_id: 'tt-1', fecha: '2026-10-27', acreedora_id: 'u-n', acreedora: 'Cucuruchos Nuss',
  deudora_id: 'u-d', deudora: 'Dolce Pasta', lista_interna: { id: 'li-nd', nombre: 'Nuss → Dolce Pasta (interna)' }, valorizado: null,
  items: [
    { clave: 'p1:', presentacion_id: 'p1', marca_id: null, insumo_id: null, detalle: 'Capelina Grande · Caja', cantidad: 10, unidad: 'cajas', precio_sugerido: 12345.67, fuente: 'lista_interna' },
    { clave: 'p2:', presentacion_id: 'p2', marca_id: null, insumo_id: null, detalle: 'Cucuruchón Chico · Caja sin cono', cantidad: 5, unidad: 'cajas', precio_sugerido: null, fuente: null },
  ],
}
// La de la transferencia de insumos st-1 (sin lista interna: costo de compra).
const MOV_ST = {
  referencia_tipo: 'transferencia_stock', referencia_id: 'st-1', fecha: '2026-10-25', acreedora_id: 'u-d', acreedora: 'Dolce Pasta',
  deudora_id: 'u-n', deudora: 'Cucuruchos Nuss', lista_interna: null, valorizado: null,
  items: [
    { clave: 'i-e', presentacion_id: null, marca_id: null, insumo_id: 'i-e', detalle: 'Etiqueta 40 x 40', cantidad: 300, unidad: 'un', precio_sugerido: 3.4567, fuente: 'costo' },
    { clave: 'i-h', presentacion_id: null, marca_id: null, insumo_id: 'i-h', detalle: 'Harina 000 Cañuelas', cantidad: 75, unidad: 'kg', precio_sugerido: 820.5, fuente: 'costo' },
  ],
}

// ── a) El bloque: mercadería e insumos sin precio, uno por movimiento ─────
{
  const S = nuevo()
  const filas = S.normalizarEntre(SIN)
  const g = S.sinValorizarEntre(filas)
  chk('tres movimientos: la orden, el traspaso y la transferencia de insumos', g.length === 3, g.map(x => x.clave).join())
  chk('agrupados por (referencia_tipo, referencia_id)', g.some(x => x.clave === 'traspaso_terminado|tt-1') && g.some(x => x.clave === 'transferencia_stock|st-1') && g.some(x => x.clave === 'orden_retiro|o-d2'))
  chk('los insumos ya valorizados no están', !g.some(x => x.clave === 'transferencia_stock|st-0'))
  chk('el más nuevo arriba', g[0]?.referencia_tipo === 'orden_retiro' && g[2]?.referencia_tipo === 'transferencia_stock')
  // (Sobre una copia de antes no hay grupo de insumos: la suite da ROJO por lo que afirma, sin romperse.)
  const VACIO = { clave: 'x', referencia_tipo: null, de: 'u-d', a: 'u-n', renglones: [], cajas: 0 }
  const st = g.find(x => x.referencia_tipo === 'transferencia_stock') ?? VACIO
  chk('el grupo trae su referencia_id', st.referencia_id === 'st-1')
  const h = S.htmlGrupoSinValorizarEntre(st)
  chk('el título: "Transferencia de insumos"', h.includes('<strong>Transferencia de insumos</strong>'), h.slice(0, 300))
  chk('la fecha', h.includes('25/10/2026'))
  chk('quién entrega → quién recibe (Dolce → Nuss)', /data-sello-empresa="u-d".*→.*data-sello-empresa="u-n"/.test(h), h)
  chk('el detalle resumido con las cantidades', h.includes('Harina 000 Cañuelas · lote L1') && h.includes('50 kg') && h.includes('300 u'))
  chk('los insumos se cuentan (unidades distintas)', h.includes('2 insumos sin precio'))
  chk('"Poner precio" con el tipo y el id', /<button type="button" class="ad-btn ad-btn--suave" data-entre-valorizar="st-1" data-entre-valorizar-tipo="transferencia_stock">Poner precio<\/button>/.test(h), h)
  const tt = S.htmlGrupoSinValorizarEntre(g.find(x => x.referencia_tipo === 'traspaso_terminado') ?? VACIO)
  chk('el traspaso: su título, el total en cajas y "Poner precio"', tt.includes('Traspaso de producto terminado') && tt.includes('Total: 15 cajas sin precio') && tt.includes('data-entre-valorizar="tt-1" data-entre-valorizar-tipo="traspaso_terminado"'))
  chk('el traspaso: Nuss → Dolce', /data-sello-empresa="u-n".*→.*data-sello-empresa="u-d"/.test(tt))
  const ie = S.htmlGrupoSinValorizarEntre(S.sinValorizarEntre(S.normalizarEntre([F({ tipo: 'mercaderia', ...de(N), ...a(D), detalle: 'Vaso 125 · lote 3', cantidad: 2, unidad_medida: 'cajas', referencia_tipo: 'ingreso_externo', referencia_id: 'ie-1', con_precio: false })]))[0])
  chk('el ingreso desde otra empresa: "Poner precio"', ie.includes('data-entre-valorizar="ie-1" data-entre-valorizar-tipo="ingreso_externo">Poner precio'))
  const or = S.htmlGrupoSinValorizarEntre(g.find(x => x.referencia_tipo === 'orden_retiro') ?? VACIO)
  chk('b) la orden: sin "Poner precio" (se valoriza en la orden)', !or.includes('data-entre-valorizar') && or.includes('Orden D-I-0002'))
  chk('b) la orden nunca lleva "Poner precio" (aunque no se sepa de qué empresa es)', S.htmlAccionSvEntre({ referencia_tipo: 'orden_retiro', referencia_id: 'o-1' }) === '' &&
    S.htmlAccionSvEntre({ referencia_tipo: 'otra_cosa', referencia_id: 'x' }) === '')
  // Sin gastos:gastos_empresa: sin el botón, y lo dice.
  const S2 = nuevo({ tareas: SIN_GASTOS })
  const h2 = S2.htmlGrupoSinValorizarEntre(st)
  chk('sin gastos:gastos_empresa: sin "Poner precio"', !h2.includes('data-entre-valorizar') && h2.includes('Le pone precio quien tiene el permiso de gastos de la empresa.'))
  chk('un super_admin: con el botón', nuevo({ tareas: [], rol: 'super_admin' }).htmlGrupoSinValorizarEntre(st).includes('data-entre-valorizar="st-1"'))
  // El detalle resumido: hasta 4 renglones y "y N renglones más".
  const muchos = S.sinValorizarEntre(S.normalizarEntre([1, 2, 3, 4, 5, 6].map(i => F({ tipo: 'insumos', ...de(D), ...a(N), detalle: 'Insumo ' + i, cantidad: i, unidad_medida: 'kg', insumo_id: 'x' + i, referencia_tipo: 'transferencia_stock', referencia_id: 'st-9', con_precio: false }))))[0] ?? VACIO
  const hm = S.htmlGrupoSinValorizarEntre(muchos)
  chk('resumido: 4 renglones', cuantas(hm, /class="ad-entre-sv__renglon"/g) === 4 && hm.includes('Insumo 4') && !hm.includes('Insumo 5'))
  chk('resumido: "y 2 renglones más"', hm.includes('y 2 renglones más'))
  chk('resumido: y 1 más en singular', S.htmlMasRenglonesSvEntre({ renglones: [1, 2, 3, 4, 5] }) .includes('y 1 renglón más'))
  chk('resumido: sin sobrantes, nada', S.htmlMasRenglonesSvEntre({ renglones: [1, 2, 3, 4] }) === '')
  chk('6 insumos', hm.includes('6 insumos sin precio'))
  chk('1 insumo en singular', S.textoTotalSvEntre({ referencia_tipo: 'transferencia_stock', renglones: [{ insumo_id: 'a' }, { insumo_id: 'a' }] }) === '1 insumo sin precio')
  // La fila de la lista: los insumos sin precio y los ya valorizados.
  const [ins] = S.normalizarEntre([SIN[2]])
  chk('la fila de insumos sin precio: "Sin valorizar"', S.htmlFilaEntre(ins).includes('Sin valorizar: todavía no tiene precio y no está en el saldo.'))
  const [insYa] = S.normalizarEntre([SIN[5]])
  chk('la fila de insumos valorizados: "Ya valorizada"', S.htmlFilaEntre(insYa).includes('Ya valorizada'))
}
{
  // En la pantalla: el bloque con los insumos.
  const S = nuevo()
  S.__setRpc((n) => n === 'movimientos_entre_empresas' ? { data: SIN, error: null } : { data: null, error: null })
  esperas.push(S.cargarSaldosEntre().then(() => {
    const h = html(S, 'ad-entre-sin-valorizar')
    chk('el bloque: tres movimientos', cuantas(h, /data-entre-sv="/g) === 3, h)
    chk('el bloque: con los insumos', h.includes('data-entre-sv="transferencia_stock|st-1"'))
    chk('el bloque: dos "Poner precio" (no la orden)', cuantas(h, /data-entre-valorizar="/g) === 2)
    chk('el texto del bloque', h.includes('Es deuda que todavía no tiene precio: no está en el saldo de arriba hasta que se le ponga precio'))
  }))
}

// ── El saldo: los insumos valorizados no se cuentan dos veces ─────────────
{
  const S = nuevo()
  const s = S.saldosEntre(S.normalizarEntre(SIN))
  const nd = s.find(x => x.clave === 'u-d|u-n') ?? { monedas: [] }
  chk('el saldo incluye la valorización ("otro")', nd.monedas[0]?.texto === 'Dolce Pasta le debe a Nuss $ 85.000,00', nd.monedas[0]?.texto)
  // Sin valor: 2 del traspaso + 3 de la transferencia + 1 de la orden (no los insumos ya valorizados).
  chk('los insumos valorizados no cuentan como "sin valor"', nd.sinValor === 6, nd.sinValor)
  chk('yaTienePrecio: insumos con precio', S.yaTienePrecio({ tipo: 'insumos', con_precio: true }) === true && S.yaTienePrecio({ tipo: 'insumos', con_precio: false }) === false)
}

// ── d) La fila de una valorización: "Valorización" y "Cambiar precio" ─────
{
  const S = nuevo()
  const [v] = S.normalizarEntre([SIN[6]])
  let h = S.htmlFilaEntre(v)
  chk('el sello dice "Valorización"', h.includes('>Valorización</span>') && !h.includes('>Otro</span>'), h)
  chk('"Cambiar precio" con el id del movimiento', /data-entre-valorizar="st-0" data-entre-valorizar-tipo="">Cambiar precio<\/button>/.test(h), h)
  chk('el importe', h.includes('$ 85.000,00'))
  // Con la mercadería o los insumos del mismo movimiento a mano: el tipo.
  S.datosEntre().saldos.filas = S.normalizarEntre(SIN)
  h = S.htmlFilaEntre(v)
  chk('el tipo sale de sus insumos', h.includes('data-entre-valorizar="st-0" data-entre-valorizar-tipo="transferencia_stock">Cambiar precio'))
  chk('tipoValorizacionEntre', S.tipoValorizacionEntre('st-0') === 'transferencia_stock' && S.tipoValorizacionEntre('nada') === '' && S.tipoValorizacionEntre(null) === '')
  const S2 = nuevo({ tareas: SIN_GASTOS })
  chk('sin gastos:gastos_empresa: sin "Cambiar precio"', !S2.htmlFilaEntre(v).includes('data-entre-valorizar') && S2.htmlFilaEntre(v).includes('>Valorización</span>'))
  chk('las otras deudas siguen diciendo "Otro"', S.htmlFilaEntre(S.normalizarEntre([F({ ...de(D), ...a(N), detalle: 'Ajuste', moneda: 'ARS', importe: 1, referencia_tipo: 'movimiento_entre_unidades', referencia_id: 'mu-9' })])[0]).includes('>Otro</span>'))
}

// ── c) La ventana: abrir, precargar, total, guardar ───────────────────────
function rpcVentana(ll, { mov = MOV_TT, guardar = () => ({ data: { id: 'mu-n', importe: 123456.7 }, error: null }) } = {}) {
  return (n, p) => {
    ll.push([n, p])
    if (n === 'movimiento_para_valorizar') return typeof mov === 'function' ? mov(p) : { data: mov, error: null }
    if (n === 'valorizar_movimiento_entre_empresas') return guardar(p)
    if (n === 'movimientos_entre_empresas') return { data: [], error: null }
    return { data: null, error: null }
  }
}
{
  const S = nuevo()
  const ll = []
  S.__setRpc(rpcVentana(ll))
  el(S, 'ad-entre-vz').hidden = true
  esperas.push(S.abrirValorizarEntre('traspaso_terminado', 'tt-1').then(() => {
    chk('abre con movimiento_para_valorizar(tipo, id)', JSON.stringify(ll[0]) === JSON.stringify(['movimiento_para_valorizar', { p_referencia_tipo: 'traspaso_terminado', p_referencia_id: 'tt-1' }]), JSON.stringify(ll))
    chk('una sola llamada (el tipo era conocido)', ll.length === 1)
    chk('la ventana visible', el(S, 'ad-entre-vz').hidden === false)
    const h = html(S, 'ad-entre-vz-caja')
    chk('el título "Poner precio"', h.includes('id="ad-entre-vz-titulo">Poner precio</h2>'))
    chk('arriba: quién entrega → quién recibe', /data-sello-empresa="u-n".*→.*data-sello-empresa="u-d"/.test(h))
    chk('la fecha y de dónde salió', h.includes('Traspaso de producto terminado del 27/10/2026'))
    chk('lo que queda debiendo', h.includes('Dolce Pasta le va a deber a Nuss lo que sume.'))
    chk('la lista interna usada', h.includes('Precios sugeridos de la lista interna &quot;Nuss → Dolce Pasta (interna)&quot;.'), h)
    chk('un renglón por item', cuantas(h, /data-entre-vz-item="/g) === 2)
    chk('el detalle y la cantidad', h.includes('Capelina Grande · Caja') && h.includes('10 cajas') && h.includes('5 cajas'))
    chk('el precio por caja', h.includes('Precio por caja ($)'))
    chk('la fuente chiquita: "lista interna"', /data-entre-vz-fuente="0">lista interna<\/span>/.test(h))
    chk('sin sugerido: vacío, en naranja y lo dice', /ad-entre-vz__fuente ad-entre-vz__fuente--falta" data-entre-vz-fuente="1">sin precio sugerido: ponelo a mano/.test(h) && h.includes('ad-entre-vz__precio ad-entre-vz__precio--falta'))
    chk('el sugerido precargado (formato argentino)', el(S, 'ad-entre-vz-precio-0').value === '12.345,67', el(S, 'ad-entre-vz-precio-0').value)
    chk('sin sugerido: el campo vacío', el(S, 'ad-entre-vz-precio-1').value === '')
    chk('el subtotal del precargado', el(S, 'ad-entre-vz-sub-0').textContent === '$ 123.456,70', el(S, 'ad-entre-vz-sub-0').textContent)
    chk('el subtotal sin precio: —', el(S, 'ad-entre-vz-sub-1').textContent === '—')
    chk('el total, con lo que falta', el(S, 'ad-entre-vz-total').textContent === 'Total: $ 123.456,70 · falta 1 precio', el(S, 'ad-entre-vz-total').textContent)
    chk('el concepto opcional (con lo que pone la base)', h.includes('Concepto (opcional)') && h.includes('placeholder="Si queda vacío: Valorización Traspaso del 27/10/2026"'))
    chk('el botón "Guardar precio"', h.includes('data-entre-vz-guardar>Guardar precio</button>'))
    // Total en vivo.
    el(S, 'ad-entre-vz-precio-1').value = '2.000,5'
    S.actualizarValorizarEntre()
    chk('en vivo: el subtotal', el(S, 'ad-entre-vz-sub-1').textContent === '$ 10.002,50', el(S, 'ad-entre-vz-sub-1').textContent)
    chk('en vivo: el total', el(S, 'ad-entre-vz-total').textContent === 'Total: $ 133.459,20', el(S, 'ad-entre-vz-total').textContent)
    // Falta un precio: TODOS los renglones van, y la base contesta.
    el(S, 'ad-entre-vz-precio-1').value = ''
    S.__setRpc(rpcVentana(ll, { guardar: () => ({ data: null, error: { message: 'Faltan precios: Cucuruchón Chico · Caja sin cono' } }) }))
    return S.guardarValorizarEntre()
  }).then(() => {
    const g = ll.filter(x => x[0] === 'valorizar_movimiento_entre_empresas')
    chk('falta un precio: llama igual, con TODOS los renglones', g.length === 1 && JSON.stringify(g[0][1]) === JSON.stringify({ p_referencia_tipo: 'traspaso_terminado', p_referencia_id: 'tt-1',
      p_precios: [{ clave: 'p1:', precio: 12345.67 }, { clave: 'p2:', precio: null }], p_concepto: null }), JSON.stringify(g[0]?.[1]))
    chk('"Faltan precios: …" de la base, tal cual', el(S, 'ad-entre-vz-error').textContent === 'Faltan precios: Cucuruchón Chico · Caja sin cono', el(S, 'ad-entre-vz-error').textContent)
    chk('la ventana sigue abierta', el(S, 'ad-entre-vz').hidden === false && S.estado.entre.vz.abierto === true)
    chk('el botón vuelve a "Guardar precio"', el(S, 'ad-entre-vz-guardar').textContent === 'Guardar precio' && el(S, 'ad-entre-vz-guardar').disabled === false)
    chk('se puede volver a guardar', S.estado.entre.vz.guardando === false)
    // Ahora con los dos precios y un concepto.
    el(S, 'ad-entre-vz-precio-1').value = '2.000,5'
    el(S, 'ad-entre-vz-concepto').value = '  Traspaso de octubre  '
    S.__setRpc(rpcVentana(ll))
    return S.guardarValorizarEntre()
  }).then(() => dormir()).then(() => {
    const g = ll.filter(x => x[0] === 'valorizar_movimiento_entre_empresas')
    chk('guardar: los precios leídos con el parser argentino y el concepto limpio', JSON.stringify(g[1]?.[1]) === JSON.stringify({ p_referencia_tipo: 'traspaso_terminado', p_referencia_id: 'tt-1',
      p_precios: [{ clave: 'p1:', precio: 12345.67 }, { clave: 'p2:', precio: 2000.5 }], p_concepto: 'Traspaso de octubre' }), JSON.stringify(g[1]?.[1]))
    chk('guardar: se cierra la ventana', el(S, 'ad-entre-vz').hidden === true && S.estado.entre.vz.abierto === false)
    chk('guardar: el aviso de listo', S.__llamadas.exitos.includes('Listo: Dolce Pasta le debe a Nuss $ 123.456,70 (Valorización Traspaso del 27/10/2026).'), JSON.stringify(S.__llamadas.exitos))
    const relee = ll.filter(x => x[0] === 'movimientos_entre_empresas').map(x => x[1])
    chk('guardar: se releen el saldo y la lista', relee.length === 2 && relee.some(p => p.p_desde === '2026-10-01'), JSON.stringify(relee))
  }))
}
{
  // Los insumos: por su unidad de medida, el costo de compra, 4 decimales.
  const S = nuevo()
  S.__setRpc(rpcVentana([], { mov: MOV_ST }))
  esperas.push(S.abrirValorizarEntre('transferencia_stock', 'st-1').then(() => {
    const h = html(S, 'ad-entre-vz-caja')
    chk('insumos: por unidad y por kg', h.includes('Precio por unidad ($)') && h.includes('Precio por kg ($)'))
    chk('insumos: la fuente "costo de compra"', /data-entre-vz-fuente="0">costo de compra<\/span>/.test(h))
    chk('insumos: sin lista interna lo dice', h.includes('Dolce Pasta no tiene lista interna: el sugerido sale del costo de compra.'))
    chk('productos sin lista interna: sin sugerido', S.htmlValorizarEntre({ abierto: true, datos: { ...MOV_TT, lista_interna: null } }).includes('Nuss no tiene lista interna: los productos no tienen precio sugerido.'))
    chk('insumos: el título "Transferencia de insumos"', h.includes('Transferencia de insumos del 25/10/2026'))
    chk('insumos: el precio con 4 decimales', el(S, 'ad-entre-vz-precio-0').value === '3,4567', el(S, 'ad-entre-vz-precio-0').value)
    chk('insumos: 300 u', h.includes('300 u') && h.includes('75 kg'))
    // 300 × 3,4567 = 1.037,01 ; 75 × 820,5 = 61.537,50
    chk('insumos: el total', el(S, 'ad-entre-vz-total').textContent === 'Total: $ 62.574,51', el(S, 'ad-entre-vz-total').textContent)
  }))
}
{
  // Ya valorizado: "Valorizado en $ X el dd/mm" y "Cambiar precio".
  const S = nuevo()
  S.__setRpc(rpcVentana([], { mov: { ...MOV_TT, valorizado: { id: 'mu-1', importe: 123456.7, fecha: '2026-10-27' } } }))
  esperas.push(S.abrirValorizarEntre('traspaso_terminado', 'tt-1').then(() => {
    const h = html(S, 'ad-entre-vz-caja')
    chk('ya valorizado: lo dice', h.includes('Valorizado en $ 123.456,70 el 27/10. Al guardar, el precio nuevo reemplaza al anterior.'), h)
    chk('ya valorizado: el título "Cambiar precio"', h.includes('id="ad-entre-vz-titulo">Cambiar precio</h2>'))
    chk('ya valorizado: el botón "Cambiar precio"', h.includes('data-entre-vz-guardar>Cambiar precio</button>'))
    S.__setRpc(rpcVentana([], { guardar: () => ({ data: null, error: { message: 'El total da cero.' } }) }))
    return S.guardarValorizarEntre()
  }).then(() => {
    chk('ya valorizado: tras un error vuelve a "Cambiar precio"', el(S, 'ad-entre-vz-guardar').textContent === 'Cambiar precio' && el(S, 'ad-entre-vz-error').textContent === 'El total da cero.')
  }))
}
{
  // d) Desde la fila de una valorización, sin saber el tipo: prueba los tres.
  const S = nuevo()
  const ll = []
  S.__setRpc(rpcVentana(ll, { mov: (p) => p.p_referencia_tipo === 'transferencia_stock' ? { data: MOV_ST, error: null }
    : { data: null, error: { message: 'No encontré ese movimiento entre dos empresas distintas.' } } }))
  esperas.push(S.abrirValorizarEntre('', 'st-1').then(() => {
    const tipos = ll.filter(x => x[0] === 'movimiento_para_valorizar').map(x => x[1].p_referencia_tipo)
    chk('sin tipo: prueba los tres hasta que uno contesta', JSON.stringify(tipos) === JSON.stringify(['traspaso_terminado', 'ingreso_externo', 'transferencia_stock']), JSON.stringify(tipos))
    chk('sin tipo: abre la que contestó', html(S, 'ad-entre-vz-caja').includes('Transferencia de insumos del 25/10/2026') && S.estado.entre.vz.tipo === 'transferencia_stock')
    S.__setRpc(rpcVentana(ll))
    return S.guardarValorizarEntre()
  }).then(() => {
    const g = ll.filter(x => x[0] === 'valorizar_movimiento_entre_empresas')
    chk('sin tipo: guarda con el tipo que contestó', g[0]?.[1]?.p_referencia_tipo === 'transferencia_stock' && g[0][1].p_referencia_id === 'st-1')
  }))
  // Con los insumos en el saldo: el tipo se sabe, una sola llamada.
  const S2 = nuevo()
  const l2 = []
  S2.__setRpc(rpcVentana(l2, { mov: MOV_ST }))
  S2.datosEntre().saldos.filas = S2.normalizarEntre(SIN)
  esperas.push(S2.abrirValorizarEntre('', 'st-1').then(() => {
    chk('con el saldo: una sola llamada con su tipo', l2.length === 1 && l2[0][1].p_referencia_tipo === 'transferencia_stock', JSON.stringify(l2))
  }))
  // Un error que no es "no lo encontré" (el permiso) no sigue probando.
  const S3 = nuevo()
  const l3 = []
  S3.__setRpc(rpcVentana(l3, { mov: () => ({ data: null, error: { message: 'No tenés permiso para valorizar movimientos entre empresas.' } }) }))
  esperas.push(S3.abrirValorizarEntre('', 'x-1').then(() => {
    chk('el permiso: una sola llamada', l3.length === 1)
    const h = html(S3, 'ad-entre-vz-caja')
    chk('el permiso: el error tal cual, con Reintentar', h.includes('No tenés permiso para valorizar movimientos entre empresas.') && h.includes('data-entre-vz-reintentar'))
  }))
  // Ninguno contesta: el último error.
  const S4 = nuevo()
  S4.__setRpc(rpcVentana([], { mov: () => ({ data: null, error: { message: 'No encontré ese movimiento entre dos empresas distintas.' } }) }))
  esperas.push(S4.abrirValorizarEntre('', 'x-2').then(() => {
    chk('ninguno contesta: lo dice', html(S4, 'ad-entre-vz-caja').includes('No encontré ese movimiento entre dos empresas distintas.'))
  }))
}
{
  // El permiso: sin gastos:gastos_empresa no abre ni guarda.
  const S = nuevo({ tareas: SIN_GASTOS })
  const ll = []
  S.__setRpc(rpcVentana(ll))
  esperas.push(S.abrirValorizarEntre('traspaso_terminado', 'tt-1').then(() => {
    chk('sin permiso: no llama a la base', ll.length === 0)
    chk('sin permiso: la ventana no se abre', html(S, 'ad-entre-vz-caja') === '' && !S.estado.entre?.vz?.abierto)
    chk('puedeValorizarEntre', !S.puedeValorizarEntre() && nuevo().puedeValorizarEntre())
  }))
  // Cerrar mientras carga: la respuesta vieja no la vuelve a abrir.
  const S2 = nuevo()
  let soltar
  S2.__setRpc((n) => n === 'movimiento_para_valorizar' ? new Promise(r => { soltar = () => r({ data: MOV_TT, error: null }) }) : { data: null, error: null })
  const p = S2.abrirValorizarEntre('traspaso_terminado', 'tt-1')
  chk('cargando: "Buscando el movimiento…"', html(S2, 'ad-entre-vz-caja').includes('Buscando el movimiento…') && el(S2, 'ad-entre-vz').hidden === false)
  S2.cerrarValorizarEntre()
  chk('cerrar: oculta y vacía', el(S2, 'ad-entre-vz').hidden === true && html(S2, 'ad-entre-vz-caja') === '')
  soltar?.()
  esperas.push(Promise.resolve(p).then(() => {
    chk('la respuesta vieja no reabre la ventana', el(S2, 'ad-entre-vz').hidden === true && S2.estado.entre?.vz?.abierto === false)
  }))
  // Abrir otro mientras el primero carga: la respuesta vieja no pisa al nuevo.
  const S3 = nuevo()
  let soltar3
  S3.__setRpc((n, prm) => n !== 'movimiento_para_valorizar' ? { data: null, error: null }
    : prm.p_referencia_id === 'tt-1' ? new Promise(r => { soltar3 = () => r({ data: MOV_TT, error: null }) }) : { data: MOV_ST, error: null })
  const p1 = S3.abrirValorizarEntre('traspaso_terminado', 'tt-1')
  esperas.push(S3.abrirValorizarEntre('transferencia_stock', 'st-1').then(() => { soltar3?.(); return p1 }).then(() => {
    const h = html(S3, 'ad-entre-vz-caja')
    chk('la respuesta vieja no pisa la ventana nueva', h.includes('Transferencia de insumos del 25/10/2026') && !h.includes('Traspaso de producto terminado') && S3.estado.entre?.vz?.id === 'st-1', h.slice(0, 200))
  }))
}

// ── Las cuentas ───────────────────────────────────────────────────────────
{
  const S = nuevo()
  const c = S.cuentaValorizarEntre([{ cantidad: 3 }, { cantidad: '0.1' }, { cantidad: 2 }], [0.1, 3, null])
  chk('cuenta: sin error de coma', c.subs[0] === 30 && c.subs[1] === 30 && c.total === 60, JSON.stringify(c))
  chk('cuenta: lo vacío falta', c.subs[2] === null && c.faltan === 1)
  chk('cuenta: precio 0 falta', S.cuentaValorizarEntre([{ cantidad: 1 }], [0]).faltan === 1)
  chk('total con varios faltantes', S.textoTotalValorizarEntre({ total: 0, faltan: 2 }) === 'Total: $ 0,00 · faltan 2 precios')
  chk('precio por L', S.precioPorEntre('lt') === 'Precio por L')
  chk('decimales: caja 2, insumo 4', S.decimalesPrecioEntre('cajas') === 2 && S.decimalesPrecioEntre('kg') === 4)
  chk('dd/mm', S.diaMesEntre('2026-10-07') === '07/10' && S.diaMesEntre(null) === '—')
  chk('el concepto de la base: ingreso', S.conceptoBaseValorizarEntre({ referencia_tipo: 'ingreso_externo', fecha: '2026-10-01' }) === 'Valorización Ingreso del 01/10/2026')
  chk('parámetros: concepto vacío va null', S.parametrosValorizarEntre({ tipo: 't', id: 'i', datos: null }, [], '').p_concepto === null)
}

// ── e) El ajuste: importe <= 0 no llega a la base ─────────────────────────
{
  const S = nuevo()
  const ll = []
  S.__setRpc((n, p) => { ll.push([n, p]); return { data: 'mu', error: null } })
  S.abrirAjusteEntre()
  const v = (id, x) => { el(S, id).value = x }
  v('ad-entre-ajuste-deudora', 'u-n'); v('ad-entre-ajuste-acreedora', 'u-d'); v('ad-entre-ajuste-importe', '0,00')
  v('ad-entre-ajuste-fecha', '2026-10-28'); v('ad-entre-ajuste-concepto', 'Compensación')
  esperas.push(S.guardarAjusteEntre().then(() => {
    chk('ajuste en cero: no llama', !ll.some(x => x[0] === 'registrar_movimiento_entre_empresas'))
    chk('ajuste en cero: lo dice', el(S, 'ad-entre-ajuste-error').textContent === 'El importe tiene que ser mayor que cero.', el(S, 'ad-entre-ajuste-error').textContent)
    v('ad-entre-ajuste-importe', '-500')
    return S.guardarAjusteEntre()
  }).then(() => {
    chk('ajuste negativo: no llama', !ll.some(x => x[0] === 'registrar_movimiento_entre_empresas'))
    chk('ajuste negativo: el campo no lo lee como número', el(S, 'ad-entre-ajuste-error').textContent === 'Poné el importe.')
  }))
  const base = { deudora: 'u-n', acreedora: 'u-d', fecha: '2026-10-30', concepto: 'abc' }
  chk('validar: negativo', S.validarAjusteEntre({ ...base, importe: -5 }) === 'El importe tiene que ser mayor que cero.')
  chk('validar: cero', S.validarAjusteEntre({ ...base, importe: 0 }) === 'El importe tiene que ser mayor que cero.')
  chk('validar: vacío', S.validarAjusteEntre({ ...base, importe: null }) === 'Poné el importe.')
  chk('validar: positivo', S.validarAjusteEntre({ ...base, importe: 0.01 }) === null)
}

// ── XSS ───────────────────────────────────────────────────────────────────
{
  const S = nuevo()
  const raro = (o) => F({ de_unidad_id: 'u-z1', de_unidad: marca('de-unidad'), a_unidad_id: 'u-z2', a_unidad: marca('a-unidad'), ...o })
  const g = S.sinValorizarEntre([raro({ tipo: 'insumos', con_precio: false, cantidad: 2, unidad_medida: 'kg', detalle: marca('insumo'), referencia_tipo: 'transferencia_stock', referencia_id: marca('id-st'), _id: 'm' })])
  chequearMarcas(chk, 'el renglón de insumos', g[0] ? S.htmlGrupoSinValorizarEntre(g[0]) : '', ['de-unidad', 'a-unidad', 'insumo', 'id-st'])
  chequearMarcas(chk, 'la fila de una valorización', S.htmlFilaEntre(raro({ detalle: marca('concepto'), moneda: 'ARS', importe: 1, referencia_tipo: 'traspaso_terminado_precio', referencia_id: marca('id-mov'), _id: 'v' })), ['concepto', 'id-mov'])
  chequearMarcas(chk, 'el botón', S.htmlBotonValorizarEntre(marca('tipo'), marca('id'), false), ['tipo', 'id'])
  const v = { abierto: true, datos: { referencia_tipo: 'traspaso_terminado', fecha: '2026-10-27', acreedora_id: 'u-z1', acreedora: marca('acreedora'), deudora_id: 'u-z2', deudora: marca('deudora'),
    lista_interna: { id: 'l', nombre: marca('lista') }, valorizado: { importe: 1, fecha: '2026-10-27' },
    items: [{ clave: marca('clave'), detalle: marca('detalle'), cantidad: 1, unidad: marca('unidad'), precio_sugerido: 1, fuente: marca('fuente') }] } }
  chequearMarcas(chk, 'la ventana', S.htmlValorizarEntre(v), ['acreedora', 'deudora', 'lista', 'detalle', 'unidad'])
  chequearMarcas(chk, 'el error de la ventana', S.htmlValorizarEntre({ abierto: true, error: marca('error') }), ['error'])
  estaticoAcotado(chk, ARCHIVO, src, ['htmlBotonValorizarEntre', 'htmlAccionSvEntre', 'htmlEntregaRecibeEntre', 'htmlMasRenglonesSvEntre', 'htmlLinkValorizacionEntre',
    'htmlItemValorizarEntre', 'htmlValorizarEntre'],
  { escape: 'esc', seguras: SEGURAS_ADMINISTRACION, segurasRegex: SEGURAS_REGEX_ADMINISTRACION })
}

fin(esperas)
