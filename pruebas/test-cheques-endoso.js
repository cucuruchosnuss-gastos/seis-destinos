// Cheques: ENDOSAR A UN PROVEEDOR (29/09/2026, pedido de Facu).
//
// Antes "Endosado" guardaba un texto libre y no tocaba la cuenta del
// proveedor. Ahora: buscador con proveedores_para_endoso (desde 2 letras, con
// la deuda de cada uno por fábrica) → la fábrica cuya deuda se paga (por
// defecto la del cheque; si es otra, "queda como deuda entre empresas") → qué
// facturas se pagan (las más viejas primero) y cuánto queda a favor → se
// confirma con endosar_cheque_a_proveedor. Varios cheques: uno por uno, en
// orden; si uno falla se para y se dice cuáles salieron. Los endosados "con
// texto" de antes muestran "Vincular al proveedor", con la misma función y
// sin fecha. Un endoso a un proveedor NO ofrece "Volver a cartera"
// (volver_cheque_a_cartera no revierte su pago).
//
// Firmas verificadas con pg_get_functiondef el 29/09/2026 (ver el comentario
// "ENDOSAR A UN PROVEEDOR" de la región de Cheques).
//
//   node pruebas/test-cheques-endoso.js

const { construirCheques } = require('./sandbox-cheques')
const { ARCHIVO_CHEQUES, leerCheques } = require('./fuente-cheques')

const ARCHIVO = process.env.ARCHIVO_TEST || ARCHIVO_CHEQUES
const FUENTE = leerCheques(ARCHIVO)
const JS = FUENTE.slice(FUENTE.lastIndexOf('<script type="module">'))

let ok = 0
const fallas = []
const esperas = []
function chk(nombre, cond, detalle) { if (cond) ok++; else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : '')) }
const marca = (campo) => `"><b data-xss="${campo}">`
const escapada = (campo) => `&lt;b data-xss=&quot;${campo}&quot;&gt;`
const cruda = (campo) => `<b data-xss="${campo}">`
// formatearImporte usa Intl: entre "$" y el número va un espacio duro (U+00A0).
const N = (s) => String(s ?? '').replace(/\u00a0/g, ' ')

// Los dos botones de tipo del diálogo: el doble de document.querySelectorAll
// devuelve [] y el endoso apaga su botón sin permiso, así que acá existen.
const PRELUDIO_BOTONES = `
  var __botonesTipo = [nuevoEl('tipo-dep'), nuevoEl('tipo-end')]
  __botonesTipo[0].dataset.salidaTipo = 'depositado'
  __botonesTipo[1].dataset.salidaTipo = 'endosado'
  document.querySelectorAll = (sel) => sel === '[data-salida-tipo]' ? __botonesTipo : []
`

const U_NUSS = 'u-nuss', U_DOLCE = 'u-dolce', U_PRUEBA = 'u-prueba'
const TAREAS_TODAS = ['cobranzas:ver_todo', 'cobranzas:procesar', 'cuentas_corrientes:registrar_pago', 'cuentas_corrientes:ver_todo']

function armar({ tareas = TAREAS_TODAS } = {}) {
  const S = construirCheques(ARCHIVO, { preludioExtra: PRELUDIO_BOTONES })
  S.estado.misTareas = new Set(tareas)
  S.estado.fabrica = { ok: true, unidades: new Set([U_PRUEBA]), personas: new Set(), soyDePrueba: false }
  S.estado.unidadesEndoso = [{ id: U_NUSS, nombre: 'Nuss' }, { id: U_DOLCE, nombre: 'Dolce Pasta' }, { id: U_PRUEBA, nombre: 'Pruebas (robot)' }]
  S.estado.bancos = new Map([['072', 'Santander']])
  S.estado.cobranzas = new Map([
    ['cn', { id: 'cn', cliente: 'Molino', estado: 'procesada', fecha: '2026-09-01', unidad_negocio_id: U_NUSS, unidad_negocio_nombre: 'Nuss' }],
    ['cd', { id: 'cd', cliente: 'Kiosco', estado: 'procesada', fecha: '2026-09-02', unidad_negocio_id: U_DOLCE, unidad_negocio_nombre: 'Dolce Pasta' }],
    ['cs', { id: 'cs', cliente: 'Sin unidad', estado: 'procesada', fecha: '2026-09-03' }],
  ])
  const base = { banco_codigo: '072', tipo: 'comun', fecha_emision: '2026-09-01', fecha_pago: null }
  S.estado.filas = [
    { ...base, id: 'n1', cobranza_id: 'cn', numero: '43300023', importe: 1500000, estado: 'en_cartera' },
    { ...base, id: 'n2', cobranza_id: 'cn', numero: '43300024', importe: 300000, estado: 'en_cartera' },
    { ...base, id: 'd1', cobranza_id: 'cd', numero: '55500001', importe: 100000, estado: 'en_cartera' },
    { ...base, id: 's1', cobranza_id: 'cs', numero: '77700001', importe: 50000, estado: 'en_cartera' },
    { ...base, id: 'viejo', cobranza_id: 'cn', numero: '00600675', importe: 296000, estado: 'endosado', salida_fecha: '2026-09-22', salida_destino: 'Corrugadora centro' },
    { ...base, id: 'pago', cobranza_id: 'cn', numero: '68806281', importe: 658558.68, estado: 'endosado', salida_fecha: '2026-09-29', salida_destino: 'DIMAFLO S.A.', salida_proveedor_id: 'p-dimaflo' },
  ]
  S.estado.seleccion = { activa: false, ids: new Set(), ultimo: null, noPueden: new Set() }
  return S
}
const PROV = {
  id: 'p1', nombre: 'Corrugadora Centro SRL', cuit: '30712345678',
  deuda: [{ unidad_id: U_NUSS, unidad: 'Nuss', pendiente: 1000000 }, { unidad_id: U_DOLCE, unidad: 'Dolce Pasta', pendiente: 20000 }, { unidad_id: U_PRUEBA, unidad: 'Pruebas (robot)', pendiente: 5 },
    // Una fábrica donde no debe nada (la base suma el saldo, puede dar 0): no se muestra.
    { unidad_id: 'u-taller', unidad: 'Taller', pendiente: 0 }],
}
const FACTURAS = [
  { id: 'f3', numero_comprobante: '0001-00000300', fecha_factura: null, created_at: '2026-09-01T10:00:00Z', saldo_pendiente: 400000 },
  { id: 'f2', numero_comprobante: '0001-00000200', fecha_factura: '2026-08-15', created_at: '2026-08-16T10:00:00Z', saldo_pendiente: 700000 },
  { id: 'f1', numero_comprobante: '0001-00000100', fecha_factura: '2026-08-01', created_at: '2026-08-02T10:00:00Z', saldo_pendiente: 500000 },
  { id: 'f0', numero_comprobante: '0001-00000050', fecha_factura: '2026-07-01', created_at: '2026-07-02T10:00:00Z', saldo_pendiente: 0 },
]

// ── Permisos ─────────────────────────────────────────────────────────────
{
  const S = armar({ tareas: ['cobranzas:procesar'] })
  chk('sin registrar_pago no se puede endosar a un proveedor', S.puedeRegistrarPago() === false)
  chk('sin ver_todo de cuentas corrientes no se ven las facturas', S.puedeVerFacturas() === false)
  S.estado.misTareas.add('cuentas_corrientes:registrar_pago')
  chk('con registrar_pago sí', S.puedeRegistrarPago() === true)
  S.estado.misTareas = new Set()
  S.estado.miRolApp = 'super_admin'
  chk('super_admin: las dos por bypass (como tiene_tarea)', S.puedeRegistrarPago() === true && S.puedeVerFacturas() === true)
  chk('los permisos se leen también de cuentas_corrientes (no solo de cobranzas)',
    /\.in\('modulo', \['cobranzas', 'cuentas_corrientes'\]\)/.test(JS))
  chk('la lista de cheques trae salida_proveedor_id', /salida_fecha, salida_destino, salida_proveedor_id[,']/.test(JS))
  chk('init carga la fábrica de pruebas', /cargarFabricaDePruebas\(supabase\)/.test(JS) && /estado\.fabrica = fabrica \?\? FABRICA_SIN_DATOS/.test(JS))
}

// ── La columna Salida: pagado, vincular, volver ──────────────────────────
{
  const S = armar()
  const cob = S.estado.cobranzas.get('cn')
  const pago = S.estado.filas.find(c => c.id === 'pago')
  const viejo = S.estado.filas.find(c => c.id === 'viejo')
  chk('endosado a un proveedor: "pagado", nunca "volver"', S.accionSalida(pago, cob) === 'pagado')
  const hPago = S.htmlSalidaCheque(pago, cob)
  chk('… no ofrece "Volver a cartera"', !/data-volver-cartera/.test(hPago) && !/data-vincular-proveedor/.test(hPago), hPago)
  chk('… y dice por qué ("Pagó su cuenta corriente", con la explicación en title)',
    /Pagó su cuenta corriente/.test(hPago) && /title="[^"]*anular el pago[^"]*"/.test(hPago))
  chk('… se lee "Cheque endosado 072-68806281" y el proveedor', hPago.includes('29/09/2026 · Cheque endosado 072-68806281 · DIMAFLO S.A.'), hPago)
  chk('… también en la tarjeta del celular', S.htmlTarjetaCheque(pago, cob).includes('Cheque endosado 072-68806281 · DIMAFLO S.A.'))
  chk('endosado con texto (de antes), con registrar_pago: "vincular"', S.accionSalida(viejo, cob) === 'vincular')
  const hViejo = S.htmlSalidaCheque(viejo, cob)
  chk('… "Vincular al proveedor" y también "Volver a cartera"', /data-vincular-proveedor="viejo"[^>]*>Vincular al proveedor</.test(hViejo) && /data-volver-cartera="viejo"/.test(hViejo), hViejo)
  chk('… el texto viejo no dice "Cheque endosado" (no pagó ninguna cuenta)', !/Cheque endosado/.test(hViejo) && hViejo.includes('22/09/2026 · Corrugadora centro'))
  const S2 = armar({ tareas: ['cobranzas:ver_todo', 'cobranzas:procesar'] })
  chk('sin registrar_pago, el viejo solo tiene "Volver a cartera"', S2.accionSalida(viejo, cob) === 'volver')
  const S3 = armar({ tareas: ['cobranzas:ver_todo', 'cuentas_corrientes:registrar_pago'] })
  chk('sin procesar: nada, ni en el viejo ni en el pagado', S3.accionSalida(viejo, cob) === null && S3.accionSalida(pago, cob) === null)
  chk('un depositado sigue con "volver"', S.accionSalida({ ...viejo, estado: 'depositado' }, cob) === 'volver')
  S.__doc.getElementById('chq-modal-motivo').hidden = true
  S.abrirVolverACartera('pago')
  chk('volver a cartera un endoso a proveedor no abre el diálogo aunque se llame', S.__doc.getElementById('chq-modal-motivo').hidden === true && S.__accionMotivo() === null)
  S.abrirVolverACartera('viejo')
  chk('… el viejo sí', S.__doc.getElementById('chq-modal-motivo').hidden === false)
  chk('el destino del proveedor va escapado', S.htmlSalidaCheque({ ...pago, salida_destino: marca('dest') }, cob).includes(escapada('dest')) &&
    !S.htmlSalidaCheque({ ...pago, salida_destino: marca('dest') }, cob).includes(cruda('dest')))
}

// ── El reparto: igual que la base ────────────────────────────────────────
{
  const S = armar()
  const ord = S.ordenarFacturasFifo(FACTURAS).map(f => f.id)
  chk('orden: fecha_factura, las sin fecha al final', JSON.stringify(ord) === JSON.stringify(['f0', 'f1', 'f2', 'f3']), ord.join())
  const empate = S.ordenarFacturasFifo([
    { id: 'b', fecha_factura: '2026-08-01', created_at: '2026-08-05T00:00:00Z' },
    { id: 'a', fecha_factura: '2026-08-01', created_at: '2026-08-01T00:00:00Z' },
  ]).map(f => f.id)
  chk('orden: a igual fecha, created_at', JSON.stringify(empate) === '["a","b"]')
  const [r] = S.repartoFifo([1500000], FACTURAS)
  chk('un cheque paga las más viejas primero (la de saldo 0 no cuenta)', r.aplicaciones.map(a => a.factura.id).join() === 'f1,f2,f3' &&
    r.aplicaciones.map(a => a.monto).join() === '500000,700000,300000', JSON.stringify(r.aplicaciones.map(a => [a.factura.id, a.monto])))
  chk('… aplica todo y no queda nada a favor', r.aplicado === 1500000 && r.aFavor === 0)
  const [x, y] = S.repartoFifo([1000000, 1000000], FACTURAS)
  chk('dos cheques, EN ORDEN: el segundo sigue donde dejó el primero', x.aplicado === 1000000 && y.aplicado === 600000 && y.aFavor === 400000 &&
    y.aplicaciones.map(a => a.factura.id).join() === 'f2,f3', JSON.stringify([x.aplicado, y.aplicado, y.aFavor]))
  const [c] = S.repartoFifo([0.3], [{ id: 'a', saldo_pendiente: 0.1, fecha_factura: '2026-01-01' }, { id: 'b', saldo_pendiente: 0.2, fecha_factura: '2026-01-02' }])
  chk('en centavos: 0,1 + 0,2 paga 0,30 exactos', c.aplicado === 0.3 && c.aFavor === 0, JSON.stringify(c))
  chk('centavos: 0,29 son 29 (sin el error del punto flotante)', S.aCentavos(0.29) === 29 && S.aCentavos('1500000.00') === 150000000 && S.aCentavos(null) === 0)
  const [d] = S.repartoFifo([50], [])
  chk('sin facturas: todo a favor', d.aplicado === 0 && d.aFavor === 50)
}

// ── La fábrica por defecto y el aviso entre empresas ─────────────────────
{
  const S = armar()
  const f = (ids) => S.estado.filas.filter(c => ids.includes(c.id))
  chk('un cheque: la fábrica de su cobranza', S.unidadDefectoEndoso(f(['n1']), S.estado.cobranzas) === U_NUSS)
  chk('un cheque sin fábrica: hay que elegirla (null)', S.unidadDefectoEndoso(f(['s1']), S.estado.cobranzas) === null)
  chk('varios de la misma: esa', S.unidadDefectoEndoso(f(['n1', 'n2']), S.estado.cobranzas) === U_NUSS)
  chk('de fábricas distintas: se elige (null)', S.unidadDefectoEndoso(f(['n1', 'd1']), S.estado.cobranzas) === null)
  chk('uno con fábrica y otro sin: la del que tiene', S.unidadDefectoEndoso(f(['n1', 's1']), S.estado.cobranzas) === U_NUSS)
  chk('la misma fábrica: nada que avisar', S.textoEntreEmpresas(f(['n1']), S.estado.cobranzas, U_NUSS, 'Nuss') === '')
  const t = N(S.textoEntreEmpresas(f(['n1']), S.estado.cobranzas, U_DOLCE, 'Dolce Pasta'))
  chk('otra fábrica: "queda como deuda entre empresas", quién le debe a quién', /queda como deuda entre empresas/.test(t) && /Dolce Pasta le va a deber \$ 1\.500\.000,00 a Nuss/.test(t), t)
  chk('un cheque sin fábrica no avisa (la base tampoco lo anota)', S.textoEntreEmpresas(f(['s1']), S.estado.cobranzas, U_DOLCE, 'Dolce Pasta') === '')
  const t2 = N(S.textoEntreEmpresas(f(['n1', 'n2', 'd1']), S.estado.cobranzas, U_DOLCE, 'Dolce Pasta'))
  chk('varios: suma los de otra fábrica', /Hay cheques de otra fábrica/.test(t2) && /\$ 1\.800\.000,00 a Nuss/.test(t2), t2)
  const ops = S.opcionesUnidadEndoso({ proveedor: PROV, cheque: S.estado.filas[0] })
  chk('las fábricas para elegir no incluyen la de pruebas', ops.map(u => u.id).join() === [U_DOLCE, U_NUSS].join(), ops.map(u => u.nombre).join())
  S.estado.fabrica = { ok: true, unidades: new Set([U_PRUEBA]), personas: new Set(), soyDePrueba: true }
  chk('… salvo para una cuenta de prueba', S.opcionesUnidadEndoso({ proveedor: PROV, cheque: S.estado.filas[0] }).some(u => u.id === U_PRUEBA))
  const S2 = armar()
  S2.estado.unidadesEndoso = null
  const ops2 = S2.opcionesUnidadEndoso({ proveedor: PROV, lote: true, cheques: S2.estado.filas.filter(c => ['n1', 'd1'].includes(c.id)) })
  chk('si no se pudieron leer las fábricas, salen de la deuda y de los cheques', ops2.map(u => u.id).sort().join() === [U_DOLCE, U_NUSS].sort().join())
  chk('la deuda que se muestra no incluye la fábrica de pruebas', N(S2.textoDeudaProveedor(PROV)) === 'Debe: Nuss $ 1.000.000,00 · Dolce Pasta $ 20.000,00', N(S2.textoDeudaProveedor(PROV)))
  S2.estado.unidadesEndoso = [{ id: 'u' + marca('uid'), nombre: marca('unom') }]
  const hOps = S2.htmlOpcionesUnidadEndoso({ proveedor: PROV, cheque: S2.estado.filas[0] })
  chk('las opciones de fábrica van escapadas (id y nombre)', ['uid', 'unom'].every(k => hOps.includes(escapada(k)) && !hOps.includes(cruda(k))), hOps)
  chk('sin deuda lo dice',S2.textoDeudaProveedor({ deuda: [] }) === 'Sin deuda en cuenta corriente' && S2.textoDeudaProveedor({ deuda: null }) === 'Sin deuda en cuenta corriente')
}

// ── El diálogo: Endosado sin permiso, con permiso ────────────────────────
{
  const S = armar({ tareas: ['cobranzas:ver_todo', 'cobranzas:procesar'] })
  const doc = S.__doc
  S.abrirModalSalida('n1')
  const [dep, end] = doc.querySelectorAll('[data-salida-tipo]')
  chk('sin registrar_pago: el botón Endosado queda apagado', end.disabled === true && dep.disabled === false)
  chk('… y la nota dice por qué', doc.getElementById('chq-salida-nota-endoso').hidden === false && /Registrar pagos a proveedores/.test(doc.getElementById('chq-salida-nota-endoso').textContent))
  S.estado.salida.tipo = 'endosado'
  S.pintarModalSalida()
  chk('… y aunque quede elegido, el buscador no aparece', doc.getElementById('chq-endoso').hidden === true)
  esperas.push(S.confirmarSalida().then(() => {
    chk('… y si igual llega, confirmar no llama a la base y lo dice', /Registrar pagos a proveedores/.test(doc.getElementById('chq-salida-error').textContent))
  }))
  const S2 = armar()
  S2.abrirModalSalida('n1')
  chk('con registrar_pago: Endosado habilitado y sin nota', S2.__doc.querySelectorAll('[data-salida-tipo]')[1].disabled === false && S2.__doc.getElementById('chq-salida-nota-endoso').hidden === true)
  chk('abrir deja la fábrica por defecto: la del cheque', S2.estado.salida.unidadId === U_NUSS && S2.estado.salida.proveedor === null && S2.estado.salida.modo === 'salida')
  S2.estado.salida.tipo = 'endosado'; S2.pintarModalSalida()
  chk('endosado: el buscador a la vista, sin el campo de texto viejo', S2.__doc.getElementById('chq-endoso').hidden === false &&
    S2.__doc.getElementById('chq-endoso-campo-buscar').hidden === false && S2.__doc.getElementById('chq-salida-campo-destino').hidden === true)
  S2.estado.salida.tipo = 'depositado'; S2.pintarModalSalida()
  chk('depositado: el campo del banco o la cuenta, sin el buscador', S2.__doc.getElementById('chq-endoso').hidden === true && S2.__doc.getElementById('chq-salida-campo-destino').hidden === false)
}

// ── El buscador ──────────────────────────────────────────────────────────
{
  const S = armar()
  const doc = S.__doc
  S.abrirModalSalida('n1')
  S.estado.salida.tipo = 'endosado'
  const llamadas = []
  esperas.push((async () => {
    S.__setRpc(async (...a) => { llamadas.push(a); return { data: [], error: null } })
    await S.buscarProveedoresEndoso('c')
    chk('con 1 letra no busca', llamadas.length === 0 && N(doc.getElementById('chq-endoso-resultados').innerHTML) === '')
    await S.buscarProveedoresEndoso('  co ')
    chk('desde 2 letras llama a proveedores_para_endoso con lo escrito', llamadas.length === 1 && llamadas[0][0] === 'proveedores_para_endoso' &&
      JSON.stringify(llamadas[0][1]) === JSON.stringify({ p_busqueda: 'co' }), JSON.stringify(llamadas))
    chk('sin resultados lo dice', /No hay proveedores que coincidan con «co»/.test(N(doc.getElementById('chq-endoso-resultados').innerHTML)))
    await S.buscarProveedoresEndoso(marca('busq0'))
    chk('… con lo buscado escapado', doc.getElementById('chq-endoso-resultados').innerHTML.includes(escapada('busq0')) && !doc.getElementById('chq-endoso-resultados').innerHTML.includes(cruda('busq0')))
    S.__setRpc(async () => ({ data: null, error: null }))
    await S.buscarProveedoresEndoso('cor')
    chk('null (sin cobranzas:procesar): lo dice', /No tenés permiso para buscar proveedores/.test(N(doc.getElementById('chq-endoso-resultados').innerHTML)))
    S.__setRpc(async () => ({ data: null, error: { message: 'Mensaje de la base <x>' } }))
    await S.buscarProveedoresEndoso('corr')
    chk('el error de la base, entero y escapado', N(doc.getElementById('chq-endoso-resultados').innerHTML).includes('Mensaje de la base &lt;x&gt;'))
    const malo = { id: 'p' + marca('pid'), nombre: marca('pnom'), cuit: marca('pcuit'), deuda: [{ unidad_id: U_NUSS, unidad: marca('puni'), pendiente: 10 }] }
    S.__setRpc(async () => ({ data: [PROV, malo], error: null }))
    await S.buscarProveedoresEndoso(marca('busq'))
    const h = N(doc.getElementById('chq-endoso-resultados').innerHTML)
    chk('los resultados: nombre, CUIT y deuda por fábrica', h.includes('Corrugadora Centro SRL') && h.includes('CUIT 30712345678') && h.includes('Debe: Nuss $ 1.000.000,00 · Dolce Pasta $ 20.000,00'))
    chk('… sin la fábrica de pruebas', !h.includes('Pruebas (robot)'))
    chk('… todo escapado (id, nombre, cuit, fábrica)', ['pid', 'pnom', 'pcuit', 'puni'].every(k => h.includes(escapada(k)) && !h.includes(cruda(k))), h)
    // Una respuesta vieja no pisa la nueva.
    let soltarVieja
    S.__setRpc((n, p) => p.p_busqueda === 'viejo'
      ? new Promise(res => { soltarVieja = () => res({ data: [{ id: 'v', nombre: 'VIEJO', deuda: [] }], error: null }) })
      : Promise.resolve({ data: [{ id: 'n', nombre: 'NUEVO', deuda: [] }], error: null }))
    const p1 = S.buscarProveedoresEndoso('viejo')
    await S.buscarProveedoresEndoso('nuevo')
    soltarVieja(); await p1
    chk('una respuesta vieja no pisa la nueva', /NUEVO/.test(N(doc.getElementById('chq-endoso-resultados').innerHTML)) && !/VIEJO/.test(N(doc.getElementById('chq-endoso-resultados').innerHTML)))
  })())
}

// ── Elegir: el proveedor, la fábrica y qué se paga ───────────────────────
{
  const S = armar()
  const doc = S.__doc
  S.abrirModalSalida('n1')
  S.estado.salida.tipo = 'endosado'
  S.estado.salida.resultados = [{ ...PROV, nombre: marca('elegido') }]
  S.__set((tabla) => tabla === 'facturas_pendientes' ? FACTURAS : [])
  esperas.push((async () => {
    S.elegirProveedorEndoso('p1')
    chk('elegido: se ve el proveedor por textContent (no HTML)', doc.getElementById('chq-endoso-elegido').hidden === false &&
      doc.getElementById('chq-endoso-elegido-texto').textContent.includes(marca('elegido')) && doc.getElementById('chq-endoso-elegido-texto').innerHTML === '')
    chk('… el buscador se esconde y aparece la fábrica', doc.getElementById('chq-endoso-campo-buscar').hidden === true && doc.getElementById('chq-endoso-campo-unidad').hidden === false)
    const sel = doc.getElementById('chq-endoso-unidad')
    chk('la fábrica viene puesta: la del cheque', sel.value === U_NUSS)
    chk('las opciones dicen la deuda de cada fábrica', /value="u-nuss">Nuss · debe \$ 1\.000\.000,00</.test(N(sel.innerHTML)) && /value="u-dolce">Dolce Pasta · debe \$ 20\.000,00</.test(N(sel.innerHTML)) &&
      !N(sel.innerHTML).includes('Pruebas'), N(sel.innerHTML))
    chk('la misma fábrica: sin aviso', doc.getElementById('chq-endoso-aviso-unidad').hidden === true)
    await new Promise(r => setTimeout(r, 0))
    const q = S.__consultas.find(c => c.tabla === 'facturas_pendientes')
    chk('lee las facturas del proveedor en ESA fábrica, en pesos, pendientes o parciales', q &&
      JSON.stringify(q.llamadas.filter(l => l[0] === 'eq')) === JSON.stringify([['eq', 'proveedor_id', 'p1'], ['eq', 'unidad_negocio_id', U_NUSS], ['eq', 'moneda', 'ARS']]) &&
      JSON.stringify(q.llamadas.find(l => l[0] === 'in')) === JSON.stringify(['in', 'estado', ['pendiente', 'parcial']]), JSON.stringify(q && q.llamadas))
    const prev = doc.getElementById('chq-endoso-previa')
    chk('qué se paga: las facturas, las más viejas primero', prev.hidden === false && N(prev.innerHTML).indexOf('0001-00000100') !== -1 &&
      N(prev.innerHTML).indexOf('0001-00000100') < N(prev.innerHTML).indexOf('0001-00000200') && N(prev.innerHTML).indexOf('0001-00000200') < N(prev.innerHTML).indexOf('0001-00000300'), N(prev.innerHTML))
    chk('… la que se paga entera y la que queda a medias', /Factura 0001-00000100 del 01\/08\/2026: se paga entera \(\$ 500\.000,00\)/.test(N(prev.innerHTML)) &&
      /Factura 0001-00000300: se pagan \$ 300\.000,00 de \$ 400\.000,00/.test(N(prev.innerHTML)), N(prev.innerHTML))
    chk('… y el total', /Paga \$ 1\.500\.000,00 de su cuenta\./.test(N(prev.innerHTML)))
    // Otra fábrica: aviso entre empresas, y se recalcula.
    S.__set((tabla) => tabla === 'facturas_pendientes' ? [{ id: 'fd', numero_comprobante: marca('fnum'), fecha_factura: '2026-09-01', saldo_pendiente: 20000 }] : [])
    S.elegirUnidadEndoso(U_DOLCE)
    chk('otra fábrica: "queda como deuda entre empresas"', doc.getElementById('chq-endoso-aviso-unidad').hidden === false &&
      /queda como deuda entre empresas \(Dolce Pasta le va a deber \$ 1\.500\.000,00 a Nuss\)/.test(N(doc.getElementById('chq-endoso-aviso-unidad').textContent)), N(doc.getElementById('chq-endoso-aviso-unidad').textContent))
    await new Promise(r => setTimeout(r, 0))
    chk('… y lo que sobra queda a favor', /Paga \$ 20\.000,00 de su cuenta y quedan \$ 1\.480\.000,00 a favor del proveedor\./.test(N(prev.innerHTML)), N(prev.innerHTML))
    chk('… el número de la factura va escapado', N(prev.innerHTML).includes(escapada('fnum')) && !N(prev.innerHTML).includes(cruda('fnum')))
    S.elegirUnidadEndoso('')
    chk('sin fábrica: lo pide y no hay vista previa', /Elegí de qué fábrica/.test(N(doc.getElementById('chq-endoso-aviso-unidad').textContent)) && prev.hidden === true)
    S.cambiarProveedorEndoso()
    chk('Cambiar: vuelve el buscador', S.estado.salida.proveedor === null && doc.getElementById('chq-endoso-campo-buscar').hidden === false && doc.getElementById('chq-endoso-elegido').hidden === true)
  })())
}
{
  // Sin ver_todo: NO se muestra una lista incompleta; el total sale de la deuda.
  const S = armar({ tareas: ['cobranzas:ver_todo', 'cobranzas:procesar', 'cuentas_corrientes:registrar_pago'] })
  const doc = S.__doc
  S.abrirModalSalida('n1')
  S.estado.salida.tipo = 'endosado'
  S.estado.salida.resultados = [PROV]
  S.elegirProveedorEndoso('p1')
  const prev = doc.getElementById('chq-endoso-previa')
  chk('sin ver_todo: no lee facturas_pendientes', !S.__consultas.some(c => c.tabla === 'facturas_pendientes'))
  chk('… dice por qué no se ven', N(prev.innerHTML).includes('No ves las facturas del proveedor'))
  chk('… y no lista ninguna factura', !/<li>/.test(N(prev.innerHTML)))
  chk('… el total con la deuda (min(importe, deuda)) y lo que queda a favor', /Paga \$ 1\.000\.000,00 de su cuenta y quedan \$ 500\.000,00 a favor del proveedor\./.test(N(prev.innerHTML)), N(prev.innerHTML))
  const S2 = armar()
  S2.abrirModalSalida('s1')
  S2.estado.salida.tipo = 'endosado'
  S2.estado.salida.resultados = [PROV]
  S2.elegirProveedorEndoso('p1')
  chk('un cheque sin fábrica: no viene elegida y se pide', S2.estado.salida.unidadId === null &&
    /El cheque no tiene fábrica: elegí de cuál es la deuda que paga/.test(S2.__doc.getElementById('chq-endoso-aviso-unidad').textContent))
  const S3 = armar()
  S3.__setError({ message: 'sin señal' })
  S3.abrirModalSalida('n1')
  S3.estado.salida.tipo = 'endosado'
  S3.estado.salida.resultados = [PROV]
  S3.elegirProveedorEndoso('p1')
  esperas.push(new Promise(r => setTimeout(r, 0)).then(() => {
    const h = N(S3.__doc.getElementById('chq-endoso-previa').innerHTML)
    chk('si no se pudieron leer las facturas lo dice y estima con la deuda', /No se pudieron leer las facturas/.test(h) && /Paga \$ 1\.000\.000,00/.test(h), h)
  }))
}

// ── Validar antes de llamar ──────────────────────────────────────────────
{
  const S = armar()
  const hoy = '2026-09-29'
  const e = (d, fc = '2026-09-01') => S.erroresEndoso(d, fc, hoy)
  chk('sin proveedor no sigue', e({ proveedor: null, unidadId: U_NUSS, fecha: hoy }).some(x => /Elegí el proveedor/.test(x)))
  chk('sin fábrica no sigue (el mismo texto de la base)', e({ proveedor: PROV, unidadId: null, fecha: hoy }).includes('Elegí de qué fábrica es la deuda que se paga.'))
  chk('fecha futura no sigue', e({ proveedor: PROV, unidadId: U_NUSS, fecha: '2026-09-30' }).some(x => /posterior/.test(x)))
  chk('fecha anterior a la cobranza no sigue', e({ proveedor: PROV, unidadId: U_NUSS, fecha: '2026-08-31' }).some(x => /anterior a la cobranza/.test(x)))
  chk('sin fecha no sigue', e({ proveedor: PROV, unidadId: U_NUSS, fecha: '' }).some(x => /Falta la fecha/.test(x)))
  chk('todo bien: nada', e({ proveedor: PROV, unidadId: U_NUSS, fecha: hoy }).length === 0)
  chk('vincular no mira la fecha (se conserva la suya)', e({ proveedor: PROV, unidadId: U_NUSS, fecha: null, vincular: true }).length === 0)
  chk('parámetros: sin p_aplicaciones (reparte la base); sin fecha viaja null', JSON.stringify(S.parametrosEndoso('c', { proveedorId: 'p', unidadId: 'u', fecha: null })) ===
    JSON.stringify({ p_cheque_id: 'c', p_proveedor_id: 'p', p_unidad_negocio_id: 'u', p_fecha: null }))
}

// ── Confirmar uno ────────────────────────────────────────────────────────
{
  const S = armar()
  const doc = S.__doc
  const llamadas = []
  S.abrirModalSalida('n1')
  S.estado.salida.tipo = 'endosado'
  esperas.push((async () => {
    S.__setRpc(async (...a) => { llamadas.push(a); return { data: { gasto_id: 'g', aplicado: 1000000, a_favor: 500000, entre_empresas: false }, error: null } })
    await S.confirmarSalida()
    chk('sin proveedor elegido no llama y lo dice', llamadas.length === 0 && /Elegí el proveedor/.test(doc.getElementById('chq-salida-error').textContent))
    S.estado.salida.proveedor = PROV
    const MSG = 'Solo se puede endosar un cheque de una cobranza asentada.'
    S.__setRpc(async (...a) => { llamadas.push(a); return { data: null, error: { message: MSG } } })
    await S.confirmarSalida()
    chk('el error de la base, entero', doc.getElementById('chq-salida-error').textContent === 'No se pudo endosar el cheque 072 Nº 43300023: ' + MSG, doc.getElementById('chq-salida-error').textContent)
    chk('… y el diálogo sigue abierto', S.estado.salida !== null && doc.getElementById('chq-modal-salida').hidden === false)
    llamadas.length = 0
    const antes = S.__llamadas.refrescar
    S.__setRpc(async (...a) => { llamadas.push(a); return { data: { gasto_id: 'g', aplicado: 1000000, a_favor: 500000, entre_empresas: true }, error: null } })
    await S.confirmarSalida()
    chk('llama a endosar_cheque_a_proveedor con los parámetros exactos (fecha de hoy)', llamadas.length === 1 && llamadas[0][0] === 'endosar_cheque_a_proveedor' &&
      JSON.stringify(llamadas[0][1]) === JSON.stringify({ p_cheque_id: 'n1', p_proveedor_id: 'p1', p_unidad_negocio_id: U_NUSS, p_fecha: S.hoyArgentina() }), JSON.stringify(llamadas))
    chk('no llama a marcar_salida_cheque (el endoso ya no es un texto)', !llamadas.some(l => /marcar_salida/.test(l[0])))
    chk('al salir bien: cierra y recarga', S.estado.salida === null && doc.getElementById('chq-modal-salida').hidden === true && S.__llamadas.refrescar === antes + 1)
    chk('… y dice qué pagó, qué quedó a favor y la deuda entre empresas',
      N(S.__llamadas.exitos[S.__llamadas.exitos.length - 1]) === 'Cheque endosado a Corrugadora Centro SRL: pagó $ 1.000.000,00 de su cuenta y quedaron $ 500.000,00 a favor. Queda como deuda entre empresas.',
      N(S.__llamadas.exitos[S.__llamadas.exitos.length - 1]))
  })())
}

// ── Varios: uno por uno, en orden; si uno falla, se para ─────────────────
{
  const S = armar()
  const doc = S.__doc
  S.estado.seleccion = { activa: true, ids: new Set(['n1', 'n2', 'd1']), ultimo: null, noPueden: new Set() }
  S.abrirModalSalidaLote()
  S.estado.salida.tipo = 'endosado'
  S.estado.salida.proveedor = PROV
  S.estado.salida.unidadId = U_NUSS
  chk('varios de fábricas distintas: la fábrica no viene puesta', armar().unidadDefectoEndoso(S.estado.salida.cheques, S.estado.cobranzas) === null)
  const llamadas = []
  esperas.push((async () => {
    S.__setRpc(async (n, p) => {
      llamadas.push([n, p])
      if (p.p_cheque_id === 'n2') return { data: null, error: { message: 'Este cheque ya está endosado a un proveedor.' } }
      return { data: { aplicado: 100, a_favor: 0, entre_empresas: false }, error: null }
    })
    await S.confirmarSalida()
    chk('en orden y para en el que falla (no llama al tercero)', llamadas.map(l => l[1].p_cheque_id).join() === 'n1,n2', llamadas.map(l => l[1].p_cheque_id).join())
    const t = doc.getElementById('chq-salida-error').textContent
    chk('dice cuáles salieron, cuál falló (con el mensaje entero) y cuántos no se tocaron',
      t === 'Salió 1: Nº 43300023. No se pudo endosar el cheque 072 Nº 43300024: Este cheque ya está endosado a un proveedor. El que sigue no se tocó.', t)
    chk('el que salió deja el diálogo y la selección', S.estado.salida.cheques.map(c => c.id).join() === 'n2,d1' && !S.estado.seleccion.ids.has('n1'))
    chk('… y la lista se recarga', S.__llamadas.refrescar >= 1)
    llamadas.length = 0
    S.__setRpc(async (n, p) => { llamadas.push([n, p]); return { data: { aplicado: 50, a_favor: 25, entre_empresas: p.p_cheque_id === 'd1' }, error: null } })
    await S.confirmarSalida()
    chk('reintentar sigue con los que faltaban, en orden', llamadas.map(l => l[1].p_cheque_id).join() === 'n2,d1')
    chk('al terminar: "Se endosaron 2 cheques a …", suma lo pagado y lo que queda a favor',
      N(S.__llamadas.exitos[S.__llamadas.exitos.length - 1]) === 'Se endosaron 2 cheques a Corrugadora Centro SRL: pagó $ 100,00 de su cuenta y quedaron $ 50,00 a favor. Queda como deuda entre empresas.',
      N(S.__llamadas.exitos[S.__llamadas.exitos.length - 1]))
    chk('… y limpia la selección', S.estado.seleccion.activa === false && S.estado.seleccion.ids.size === 0)
  })())
  const S2 = armar()
  const fallo0 = S2.textoFalloEndoso({ hechos: [], fallo: S2.estado.filas[0], error: { message: 'X' } }, 3)
  chk('si falla el primero de varios: "No salió ninguno."', fallo0 === 'No salió ninguno. No se pudo endosar el cheque 072 Nº 43300023: X Los 2 que siguen no se tocaron.', fallo0)
}
{
  // La vista previa de varios: el reparto en orden, cheque por cheque.
  const S = armar()
  S.estado.seleccion = { activa: true, ids: new Set(['n1', 'n2']), ultimo: null, noPueden: new Set() }
  S.abrirModalSalidaLote()
  S.estado.salida.tipo = 'endosado'
  S.estado.salida.resultados = [PROV]
  S.__set((tabla) => tabla === 'facturas_pendientes' ? FACTURAS : [])
  S.elegirProveedorEndoso('p1')
  esperas.push(new Promise(r => setTimeout(r, 0)).then(() => {
    const h = N(S.__doc.getElementById('chq-endoso-previa').innerHTML)
    chk('varios: dice el orden y lo que paga cada uno', /Uno por uno, en este orden/.test(h) &&
      /Nº 43300023 \(\$ 1\.500\.000,00\): paga \$ 1\.500\.000,00/.test(h) && /Nº 43300024 \(\$ 300\.000,00\): paga \$ 100\.000,00 · a favor \$ 200\.000,00/.test(h), h)
    chk('… y la fábrica viene puesta (los dos son de Nuss)', S.estado.salida.unidadId === U_NUSS)
    S.estado.salida.cheques[1].numero = marca('cnum')
    const h2 = S.htmlPreviaEndoso(S.estado.salida)
    chk('… el número de cada cheque va escapado', h2.includes(escapada('cnum')) && !h2.includes(cruda('cnum')))
  }))
}

// ── Vincular un endoso viejo ─────────────────────────────────────────────
{
  const S = armar()
  const doc = S.__doc
  const llamadas = []
  S.__setRpc(async (n, p) => { llamadas.push([n, p]); return n === 'proveedores_para_endoso' ? { data: [PROV], error: null } : { data: { aplicado: 296000, a_favor: 0 }, error: null } })
  S.estado.bancos.set('072', marca('banco'))
  S.estado.filas.find(c => c.id === 'viejo').salida_destino = marca('viejo')
  S.abrirVincularProveedor('viejo')
  chk('abre el diálogo en modo vincular, ya en endosado', S.estado.salida?.modo === 'vincular' && S.estado.salida.tipo === 'endosado' && doc.getElementById('chq-modal-salida').hidden === false)
  chk('… sin elegir qué pasó ni la fecha: se conserva la suya', doc.getElementById('chq-salida-campo-tipo').hidden === true && doc.getElementById('chq-salida-campo-fecha').hidden === true &&
    doc.getElementById('chq-salida-nota-fecha').textContent === 'Se conserva la fecha de salida: 22/09/2026.')
  chk('… el cheque se describe por textContent, con lo que se había anotado', doc.getElementById('chq-salida-cheques').textContent.includes(marca('viejo')) && doc.getElementById('chq-salida-cheques').innerHTML === '')
  chk('… el buscador arranca con lo anotado y busca', doc.getElementById('chq-endoso-buscar').value === marca('viejo') && llamadas[0] && llamadas[0][0] === 'proveedores_para_endoso')
  S.abrirVincularProveedor('pago')
  chk('uno ya vinculado a un proveedor no se vuelve a vincular', S.estado.salida.cheque.id === 'viejo')
  esperas.push((async () => {
    await new Promise(r => setTimeout(r, 0))
    S.elegirProveedorEndoso('p1')
    await S.confirmarSalida()
    const ult = llamadas[llamadas.length - 1]
    chk('confirmar: la misma función, SIN fecha (null)', ult[0] === 'endosar_cheque_a_proveedor' &&
      JSON.stringify(ult[1]) === JSON.stringify({ p_cheque_id: 'viejo', p_proveedor_id: 'p1', p_unidad_negocio_id: U_NUSS, p_fecha: null }), JSON.stringify(ult))
    chk('… y cierra', S.estado.salida === null)
  })())
}

// ── Lo que no se rompe ───────────────────────────────────────────────────
{
  chk('el depósito sigue con marcar_salida_cheque (el endoso va aparte)', /if \(s\.tipo === 'endosado' \|\| s\.modo === 'vincular'\) return confirmarEndoso\(\)/.test(JS) &&
    /supabase\.rpc\('marcar_salida_cheque', parametrosSalida\(s\.cheque\.id, datos\)\)/.test(JS))
  chk('el endoso no manda p_aplicaciones: reparte la base', !/p_aplicaciones/.test(JS.replace(/\/\/[^\n]*/g, '')))
  chk('el botón de vincular abre su diálogo', /data-vincular-proveedor\]'\)\.forEach\(b => b\.addEventListener\('click', \(ev\) => \{\s*ev\.stopPropagation\(\); abrirVincularProveedor\(b\.dataset\.vincularProveedor\)/.test(JS))
}

Promise.all(esperas.map(p => p.catch(err => chk('rama async sin excepción', false, String(err && err.stack || err))))).then(() => {
  for (const f of fallas) console.log('  ✗ ' + f)
  console.log(`${ok}/${ok + fallas.length}${fallas.length ? '  ROJO' : '  verde'}`)
  process.exit(fallas.length ? 1 : 0)
})
