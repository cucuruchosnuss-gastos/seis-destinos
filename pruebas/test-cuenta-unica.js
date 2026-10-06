// LA CUENTA DE CLIENTE Y PROVEEDOR (06/10/2026) — js/cuenta-unica.js y su uso
// en Administración (la cuenta del cliente y la ficha).
//
// Pedido de Facu:
//  1. En la ficha del cliente, "Clasificación": Cliente / Proveedor / Cliente y
//     proveedor. Pasar a "Cliente y proveedor" llama a vincular_cliente_proveedor
//     y avisa si se creó la otra ficha; volver atrás llama a
//     desvincular_cliente_proveedor con una confirmación propia (nunca confirm()).
//  2. La cuenta de alguien vinculado muestra cuenta_unificada: arriba "Te debe
//     $X" / "Le debés $X" / "Están en cero" (neto = te_debe − le_debes), la
//     lista con chips por etiqueta, las columnas Te debe / Le debés y el neto
//     acumulado, y un filtro por etiqueta. Un dato ausente es "—", nunca "$ 0".
//  3. "Compensar" solo si los dos saldos son mayores a cero y con los dos
//     permisos; sugiere el MENOR y no deja poner más (lo dice y no llama a la
//     base); las facturas del proveedor de la más vieja a la más nueva; "El
//     cliente queda debiendo $A · Le debés $B"; el error de la base tal cual; un
//     doble toque manda una sola vez.
// Se EJECUTA el código real (las funciones de js/cuenta-unica.js las encuentra
// extraerFn por el import de administracion.html) con una base falsa.
//
//   node pruebas/test-cuenta-unica.js
// ARCHIVO_TEST: administracion.html; ARCHIVO_JS_CUENTA_UNICA: js/cuenta-unica.js.
'use strict'

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/administracion.html')
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)
const { chk, esperas, fin } = arnes()
const nuevo = () => construirAdministracion(ARCHIVO)
const S0 = nuevo()

const HOY = S0.hoyArgentina()

// Una cuenta: como cliente nos debe 100.000 − 30.000 = 70.000; como
// proveedor le debemos 250.000 + 400.000 − 200.000 = 450.000. Neto: le
// debemos 380.000.
const FILAS = [
  { fecha: '2026-08-20', orden: '2026-08-21T10:00:00Z', lado: 'proveedor', etiqueta: 'Compra', detalle: 'Factura A 0003-00001201', moneda: 'ARS', te_debe: 0, le_debes: 250000, te_debe_acum: 0, le_debes_acum: 250000, neto_acum: -250000, cliente_id: 'c1', proveedor_id: 'pv1', unidad_negocio_id: 'u-n' },
  { fecha: '2026-09-01', orden: '2026-09-01T12:00:00Z', lado: 'cliente', etiqueta: 'Venta', detalle: 'Orden de retiro N° 12', moneda: 'ARS', te_debe: 100000, le_debes: 0, te_debe_acum: 100000, le_debes_acum: 250000, neto_acum: -150000, cliente_id: 'c1', proveedor_id: 'pv1', unidad_negocio_id: 'u-n' },
  { fecha: '2026-09-05', orden: '2026-09-06T10:00:00Z', lado: 'proveedor', etiqueta: 'Compra', detalle: 'Factura A 0003-00001245', moneda: 'ARS', te_debe: 0, le_debes: 400000, te_debe_acum: 100000, le_debes_acum: 650000, neto_acum: -550000, cliente_id: 'c1', proveedor_id: 'pv1', unidad_negocio_id: 'u-n' },
  { fecha: '2026-09-10', orden: '2026-09-10T10:00:00Z', lado: 'proveedor', etiqueta: 'Pago', detalle: 'Pago a proveedor', moneda: 'ARS', te_debe: 0, le_debes: -200000, te_debe_acum: 100000, le_debes_acum: 450000, neto_acum: -350000, cliente_id: 'c1', proveedor_id: 'pv1', unidad_negocio_id: 'u-n' },
  { fecha: '2026-09-22', orden: '2026-09-22T12:00:00Z', lado: 'cliente', etiqueta: 'Cobranza', detalle: null, moneda: 'ARS', te_debe: -30000, le_debes: 0, te_debe_acum: 70000, le_debes_acum: 450000, neto_acum: -380000, cliente_id: 'c1', proveedor_id: 'pv1', unidad_negocio_id: 'u-n' },
]
// Las facturas abiertas que devuelve sugerir_facturas_fifo con el tope.
const FIFO = [
  { factura_pendiente_id: 'fp-1', fecha_factura: '2026-08-20', numero_comprobante: '0003-00001201', saldo_pendiente: 50000, monto_a_aplicar: 50000 },
  { factura_pendiente_id: 'fp-2', fecha_factura: '2026-09-05', numero_comprobante: '0003-00001245', saldo_pendiente: 400000, monto_a_aplicar: 400000 },
]

// ═══ 1. Las reglas puras ════════════════════════════════════════════════════
{
  const S = S0
  chk('plata: un dato ausente es "—"', S.plataCu(null) === '—' && S.plataCu(undefined) === '—' && S.plataCu('') === '—' && S.plataCu('x') === '—')
  chk('plata: "$ 1.234,50"', S.plataCu(1234.5) === '$ 1.234,50')
  chk('plata: el negativo con su signo', S.plataCu(-300) === '−$ 300,00')
  chk('plata: un cero de verdad es "$ 0,00"', S.plataCu(0) === '$ 0,00')
  chk('plata: los dólares', S.plataCu(20, 'USD') === 'US$ 20,00')

  // EL NETO ES te_debe − le_debes (pedido explícito).
  const n = S.netoPorMoneda(FILAS)
  chk('neto: una moneda', n.length === 1 && n[0].moneda === 'ARS', JSON.stringify(n))
  chk('neto: suma lo que te debe', n[0].teDebe === 70000, n[0].teDebe)
  chk('neto: suma lo que le debés', n[0].leDebes === 450000, n[0].leDebes)
  chk('neto: es te_debe − le_debes (−380.000)', n[0].neto === -380000, n[0].neto)
  const a = S.netoPorMoneda([{ moneda: 'ARS', te_debe: 1000, le_debes: 0 }, { moneda: 'ARS', te_debe: 0, le_debes: 300 }])
  chk('neto: te debe más de lo que le debés → positivo (700)', a[0].neto === 700, JSON.stringify(a))
  chk('neto: suma en centavos (0,1 + 0,2 = 0,3)', S.netoPorMoneda([{ moneda: 'ARS', te_debe: 0.1, le_debes: 0 }, { moneda: 'ARS', te_debe: 0.2, le_debes: 0 }])[0].neto === 0.3)
  const dos = S.netoPorMoneda([{ moneda: 'USD', te_debe: 5, le_debes: 0 }, { moneda: 'AAA', te_debe: 5, le_debes: 0 }, { moneda: 'ARS', te_debe: 1, le_debes: 0 }])
  chk('neto: pesos primero (aunque otra moneda vaya antes en el abecedario)', dos.map(x => x.moneda).join() === 'ARS,AAA,USD', dos.map(x => x.moneda).join())
  chk('neto: una moneda sin ningún importe no aparece (nunca "Están en cero" inventado)', S.netoPorMoneda([{ moneda: 'ARS', te_debe: null, le_debes: null }]).length === 0)
  chk('neto: sin filas no hay nada', S.netoPorMoneda([]).length === 0 && S.netoPorMoneda(null).length === 0)

  chk('texto: te debe', S.textoNeto(10000) === 'Te debe $ 10.000,00')
  chk('texto: le debés', S.textoNeto(-380000) === 'Le debés $ 380.000,00')
  chk('texto: están en cero', S.textoNeto(0) === 'Están en cero')
  chk('texto: sin dato, "—" (nunca "$ 0")', S.textoNeto(null) === '—' && S.textoNeto(undefined) === '—')
  chk('texto: en dólares', S.textoNeto(5, 'USD') === 'Te debe US$ 5,00')

  const s = S.saldosCompensables(FILAS)
  chk('saldos: lo que te debe y lo que le debés, en pesos', s.teDebe === 70000 && s.leDebes === 450000, JSON.stringify(s))
  chk('saldos: sin pesos, ceros', JSON.stringify(S.saldosCompensables([{ moneda: 'USD', te_debe: 5, le_debes: 5 }])) === '{"teDebe":0,"leDebes":0}')
  chk('ofrecer: los dos > 0 y con permiso', S.puedeOfrecerCompensar(s, true) === true)
  chk('ofrecer: sin permiso, no', S.puedeOfrecerCompensar(s, false) === false)
  chk('ofrecer: si no te debe nada, no', S.puedeOfrecerCompensar({ teDebe: 0, leDebes: 10 }, true) === false)
  chk('ofrecer: si no le debés nada, no', S.puedeOfrecerCompensar({ teDebe: 10, leDebes: 0 }, true) === false)
  chk('ofrecer: si el cliente tiene saldo a favor, no', S.puedeOfrecerCompensar({ teDebe: -10, leDebes: 10 }, true) === false)

  // EL MÁXIMO ES EL MENOR DE LOS DOS.
  chk('máximo: el menor (te debe menos)', S.maximoCompensable(70000, 450000) === 70000)
  chk('máximo: el menor (le debés menos)', S.maximoCompensable(900000, 450000) === 450000)
  chk('máximo: sin dato, null', S.maximoCompensable(null, 5) === null)
  chk('máximo: nunca negativo', S.maximoCompensable(-5, 10) === 0)

  const r = S.repartoFifoCu(300000, [{ id: 'a', saldo: 250000 }, { id: 'b', saldo: 400000 }, { id: 'c', saldo: 10 }])
  chk('fifo: la más vieja entera, la siguiente lo que queda', r.map(f => f.monto).join() === '250000,50000,0', JSON.stringify(r))
  chk('fifo: tildadas las que llevan algo', r.map(f => f.checked).join() === 'true,true,false')
  chk('fifo: con centavos', S.repartoFifoCu(0.3, [{ id: 'a', saldo: 0.1 }, { id: 'b', saldo: 0.2 }]).map(f => f.monto).join() === '0.1,0.2')
  chk('aplicado: suma solo las tildadas', S.aplicadoCu([{ checked: true, monto: 10 }, { checked: false, monto: 5 }, { checked: true, monto: 0.5 }]) === 10.5)

  chk('después: "El cliente queda debiendo $A · Le debés $B"', S.textoDespues({ teDebe: 70000, leDebes: 450000 }, 70000) === 'El cliente queda debiendo $ 0,00 · Le debés $ 380.000,00',
    S.textoDespues({ teDebe: 70000, leDebes: 450000 }, 70000))
  chk('después: con un monto parcial', S.textoDespues({ teDebe: 70000, leDebes: 450000 }, 20000.5) === 'El cliente queda debiendo $ 49.999,50 · Le debés $ 429.999,50')

  const facts = S.repartoFifoCu(70000, [{ id: 'fp-1', numero: '0003-1', saldo: 50000 }, { id: 'fp-2', numero: '0003-2', saldo: 400000 }])
  const ok = { monto: 70000, maximo: 70000, facturas: facts, fecha: HOY, hoy: HOY }
  chk('validar: todo bien → null', S.validarCompensacion(ok) === null, S.validarCompensacion(ok))
  chk('validar: sin monto', S.validarCompensacion({ ...ok, monto: null }) === 'Escribí cuánto se compensa.')
  chk('validar: monto cero', S.validarCompensacion({ ...ok, monto: 0 }) === 'Escribí cuánto se compensa.')
  // LA COMPENSACIÓN NO PUEDE SUPERAR EL MENOR SALDO.
  const sobre = S.validarCompensacion({ ...ok, monto: 70000.01, facturas: S.repartoFifoCu(70000.01, facts) })
  chk('validar: un centavo más que el menor saldo NO se manda', sobre === 'No se puede compensar más de $ 70.000,00: es lo menor entre lo que te debe y lo que le debés.', sobre)
  chk('validar: sin nada que compensar', /No hay nada que compensar/.test(S.validarCompensacion({ ...ok, maximo: 0 })))
  chk('validar: sin fecha', S.validarCompensacion({ ...ok, fecha: '' }) === 'Poné la fecha.')
  chk('validar: fecha futura', S.validarCompensacion({ ...ok, fecha: '2999-01-01' }) === 'La fecha no puede ser futura.')
  chk('validar: sin facturas tildadas', S.validarCompensacion({ ...ok, facturas: facts.map(f => ({ ...f, checked: false })) }) === 'Elegí a qué facturas del proveedor se aplica.')
  chk('validar: más que el saldo de una factura', /^A la factura 0003-1 le aplicás más que su saldo \(\$ 50\.000,00\)\.$/.test(S.validarCompensacion({ ...ok, facturas: [{ ...facts[0], monto: 60000 }, { ...facts[1], monto: 10000 }] })))
  chk('validar: lo aplicado distinto de lo que se compensa', /tiene que ser igual a lo que se compensa/.test(S.validarCompensacion({ ...ok, facturas: [{ ...facts[0] }, { ...facts[1], monto: 1 }] })))

  const p = S.parametrosCompensar({ clienteId: 'c1', monto: 70000, fecha: HOY, observacion: '  acuerdo de octubre ', facturas: [...facts, { id: 'x', checked: true, monto: 0 }, { id: 'y', checked: false, monto: 5 }] })
  chk('parámetros: los de compensar_cuentas', JSON.stringify(Object.keys(p).sort()) === JSON.stringify(['p_aplicaciones', 'p_cliente_id', 'p_fecha', 'p_monto', 'p_observacion']))
  chk('parámetros: las aplicaciones como en "Registrar pago" (de la más vieja a la más nueva, sin las de cero ni las destildadas)',
    JSON.stringify(p.p_aplicaciones) === JSON.stringify([{ factura_pendiente_id: 'fp-1', monto_aplicado: 50000 }, { factura_pendiente_id: 'fp-2', monto_aplicado: 20000 }]), JSON.stringify(p.p_aplicaciones))
  chk('parámetros: la observación limpia; vacía, null', p.p_observacion === 'acuerdo de octubre' && S.parametrosCompensar({ clienteId: 'c1', monto: 1, fecha: HOY, observacion: '  ', facturas: [] }).p_observacion === null)

  chk('etiquetas: una desconocida va en gris (nunca una clase con el texto de la base)', S.claseEtiquetaCu('"><x') === 'cu-chip cu-chip--otra' && S.claseEtiquetaCu('Compensación') === 'cu-chip cu-chip--compensacion')
  chk('etiquetas: las presentes en el orden de siempre', S.etiquetasPresentes(FILAS).join() === 'Venta,Cobranza,Compra,Pago')
  chk('filtro: solo esa etiqueta', S.filasFiltradas(FILAS, 'Compra').length === 2 && S.filasFiltradas(FILAS, '').length === 5)

  // La clasificación.
  const hc = S.htmlClasificacion({ valor: 'cliente', propio: 'cliente' })
  chk('clasificación: tres opciones', (hc.match(/data-clasificacion=/g) || []).length === 3 && />Cliente y proveedor</.test(hc))
  chk('clasificación: la elegida con aria-pressed', /data-clasificacion="cliente" aria-pressed="true"/.test(hc) && /data-clasificacion="ambos" aria-pressed="false"/.test(hc))
  chk('clasificación: en la ficha de un cliente, "Proveedor" solo va apagado y dice por qué', /data-clasificacion="proveedor" aria-pressed="false" disabled title="Esta es la ficha de un cliente/.test(hc))
  chk('clasificación: "Cliente y proveedor" se puede tocar', /data-clasificacion="ambos" aria-pressed="false">/.test(hc))
  const hp = S.htmlClasificacion({ valor: 'ambos', propio: 'proveedor' })
  chk('clasificación: en la de un proveedor, "Cliente" solo va apagado', /data-clasificacion="cliente" aria-pressed="false" disabled/.test(hp) && /data-clasificacion="proveedor" aria-pressed="false">/.test(hp))
  chk('clasificación: sin permiso, todo apagado', (S.htmlClasificacion({ valor: 'cliente', propio: 'cliente', puede: false }).match(/disabled/g) || []).length === 3)
  chk('clasificación: mientras manda, todo apagado', (S.htmlClasificacion({ valor: 'cliente', propio: 'cliente', ocupado: true }).match(/disabled/g) || []).length === 3)

  chk('vinculado: se creó el proveedor', S.textoVinculado({ id: 'pv9', conocidos: new Set(['pv1']), nombre: 'ACME SA', lado: 'proveedor' }) === 'Se creó el proveedor ACME SA en Cuentas corrientes.')
  chk('vinculado: ya existía', S.textoVinculado({ id: 'pv1', conocidos: new Set(['pv1']), nombre: 'ACME SA', lado: 'proveedor' }) === 'Quedó vinculado con el proveedor ACME SA.')
  chk('vinculado: sin saber qué había antes, no afirma que se creó', S.textoVinculado({ id: 'pv9', conocidos: null, nombre: 'ACME SA', lado: 'proveedor' }) === 'Quedó vinculado con el proveedor ACME SA.')
  chk('vinculado: se creó el cliente (con la empresa)', S.textoVinculado({ id: 'c9', conocidos: new Set(), nombre: 'ACME', lado: 'cliente', donde: 'Cucuruchos Nuss' }) === 'Se creó el cliente ACME en Administración → Clientes (Cucuruchos Nuss).')
  chk('vinculado: un cliente que no se puede leer', S.textoVinculado({ id: 'c9', conocidos: null, nombre: null, lado: 'cliente', donde: 'Nuss' }) === 'Quedó vinculado como cliente de Nuss.')
}

// ═══ 2. El HTML de la cuenta ════════════════════════════════════════════════
{
  const S = S0
  const cu = S.estadoCuentaUnica({ clienteId: 'c1', proveedorId: 'pv1', unidadId: 'u-n' })
  chk('cargando: lo dice', /Cargando la cuenta de cliente y proveedor/.test(S.htmlCuentaUnica(cu)))
  cu.error = 'No se pudo leer la cuenta de cliente y proveedor. Revisá la conexión y volvé a entrar.'
  chk('error: lo dice, en grave', /cu-aviso--grave">No se pudo leer la cuenta/.test(S.htmlCuentaUnica(cu)))
  cu.error = null
  cu.filas = []
  const vacia = S.htmlCuentaUnica(cu, { puedeCompensar: true })
  chk('sin movimientos: "—" y lo dice con palabras (nunca "$ 0")', /cu-neto__monto--cero">—</.test(vacia) && /Todavía no hay movimientos/.test(vacia) && !/\$ 0/.test(vacia))
  chk('sin movimientos: no hay Compensar', !/data-cu-compensar/.test(vacia))
  cu.filas = FILAS
  const h = S.htmlCuentaUnica(cu, { puedeCompensar: true })
  chk('arriba, grande: "Le debés $ 380.000,00"', /cu-neto__monto cu-neto__monto--negativo">Le debés \$ 380\.000,00</.test(h), h.slice(0, 600))
  chk('y el detalle de los dos lados', /Como cliente te debe \$ 70\.000,00 · como proveedor le debés \$ 450\.000,00/.test(h))
  chk('Compensar: con los dos saldos y el permiso', /data-cu-compensar/.test(h))
  chk('Compensar: sin permiso, no', !/data-cu-compensar/.test(S.htmlCuentaUnica(cu, { puedeCompensar: false })))
  chk('las columnas Te debe / Le debés / Neto', /<span>Te debe<\/span><span>Le debés<\/span><span>Neto<\/span>/.test(h))
  chk('un renglón por movimiento, el más nuevo arriba', (h.match(/class="cu-fila"/g) || []).length === 5 && h.indexOf('22/09/2026') < h.indexOf('20/08/2026'))
  chk('chips por etiqueta', /cu-chip cu-chip--compra">Compra</.test(h) && /cu-chip cu-chip--cobranza">Cobranza</.test(h) && /cu-chip cu-chip--pago">Pago</.test(h) && /cu-chip cu-chip--venta">Venta</.test(h))
  chk('la columna vacía va vacía (la otra es la que cuenta)', /data-col="Te debe"><\/div><div class="cu-fila__le" data-col="Le debés">\$ 250\.000,00</.test(h))
  chk('un pago baja lo que le debés (con signo)', /data-col="Le debés">−\$ 200\.000,00</.test(h))
  chk('el neto acumulado, en palabras', /data-col="Neto">le debés \$ 380\.000,00</.test(h) && /data-col="Neto">le debés \$ 250\.000,00</.test(h))
  chk('el filtro: Todo + las etiquetas presentes', /data-cu-filtro><option value="">Todo<\/option><option value="Venta">Venta<\/option><option value="Cobranza">Cobranza<\/option><option value="Compra">Compra<\/option><option value="Pago">Pago<\/option>/.test(h))
  cu.filtro = 'Compra'
  const hf = S.htmlCuentaUnica(cu, { puedeCompensar: true })
  chk('filtrando: solo las compras, el neto de arriba sigue siendo el de todo', (hf.match(/class="cu-fila"/g) || []).length === 2 && /Le debés \$ 380\.000,00/.test(hf) && /value="Compra" selected/.test(hf))
  cu.filtro = 'Ajuste'
  chk('filtrando sin resultados: lo dice', /Ningún movimiento de «Ajuste»/.test(S.htmlCuentaUnica(cu)))
  cu.filtro = ''
  const ausente = S.htmlFilaCu({ fecha: null, etiqueta: 'Venta', moneda: 'ARS', te_debe: null, le_debes: 0, neto_acum: null })
  chk('un renglón con datos ausentes: "—", nunca "$ 0"', /data-col="Te debe">—</.test(ausente) && /data-col="Neto">—</.test(ausente) && !/\$ 0/.test(ausente))
  const enCero = S.htmlCuentaUnica({ ...cu, filas: [{ moneda: 'ARS', te_debe: 100, le_debes: 0 }, { moneda: 'ARS', te_debe: 0, le_debes: 100 }] }, { puedeCompensar: true })
  chk('en cero: "Están en cero"', /cu-neto__monto--cero">Están en cero</.test(enCero))
  chk('en cero con los dos saldos > 0: Compensar se ofrece igual', /data-cu-compensar/.test(enCero))

  // XSS: lo que viene de la base, escapado.
  const fx = [{ fecha: '2026-09-01', etiqueta: marca('etiqueta'), detalle: marca('detalle'), moneda: marca('moneda'), te_debe: 5, le_debes: 3, neto_acum: 2 }]
  // La moneda de la base va en las dos columnas y en el neto.
  const fila = S.htmlFilaCu(fx[0])
  chk('htmlFilaCu: la moneda escapada en las TRES columnas', (fila.match(/&lt;b data-xss=&quot;moneda&quot;&gt;/g) || []).length === 3 && !/<b data-xss/.test(fila))
  chequearMarcas(chk, 'htmlCuentaUnica (error)', S.htmlCuentaUnica({ ...cu, error: marca('error-cuenta') }), ['error-cuenta'])
  const hx = S.htmlCuentaUnica({ ...cu, filas: fx, filtro: marca('etiqueta') }, { puedeCompensar: true })
  chequearMarcas(chk, 'htmlCuentaUnica', hx, ['etiqueta', 'detalle', 'moneda'])
  chk('htmlCuentaUnica: el filtro elegido queda marcado', /selected>&lt;b data-xss/.test(hx) || /&quot;&gt;&lt;b data-xss=&quot;etiqueta&quot;&gt;" selected/.test(hx))
  chequearMarcas(chk, 'htmlCuentaUnica (filtro sin resultados)', S.htmlCuentaUnica({ ...cu, filas: fx, filtro: marca('filtro') }), ['filtro'])
  // La fecha la escribe el campo de fecha: igual se escapa (va en un atributo).
  const comp = { saldos: { teDebe: 5, leDebes: 5 }, maximo: 5, monto: 5, fecha: marca('fecha'), obs: marca('obs'), error: marca('error'), enviando: false,
    facturas: [{ id: 'f', numero: marca('numero'), fecha: '2026-09-01', saldo: 5, checked: true, monto: 5 }] }
  chequearMarcas(chk, 'htmlCompensar', S.htmlCompensar({ comp }, { hoy: marca('hoy') }), ['obs', 'error', 'numero', 'fecha', 'hoy'])
  chequearMarcas(chk, 'htmlCompensar (error de lectura)', S.htmlCompensar({ comp: { errorLectura: marca('lectura') } }), ['lectura'])
  chequearMarcas(chk, 'htmlClasificacion', S.htmlClasificacion({ valor: marca('valor'), propio: 'cliente' }), [])
}

// ═══ 3. Compensar: el panel, el tope, la base ══════════════════════════════
function contenedorFalso() {
  const els = new Map()
  const el = (s) => { if (!els.has(s)) els.set(s, { innerHTML: '', textContent: '', hidden: false, value: '', dataset: {}, addEventListener() {}, setAttribute() {} }); return els.get(s) }
  return { innerHTML: '', querySelector: (s) => el(s), querySelectorAll: () => [], els, el }
}
function ctxFalso(S, { filas = FILAS, puede = true, rpc } = {}) {
  const llamadas = []
  const compensados = []
  const cu = S.estadoCuentaUnica({ clienteId: 'c1', proveedorId: 'pv1', unidadId: 'u-n' })
  cu.filas = filas
  const ctx = {
    sb: { rpc: async (n, p) => { llamadas.push([n, JSON.parse(JSON.stringify(p))]); return rpc ? rpc(n, p) : (n === 'sugerir_facturas_fifo' ? { data: FIFO, error: null } : { data: 'g-1', error: null }) } },
    cu, contenedor: contenedorFalso(), hoy: HOY, puedeCompensar: puede,
    alCompensado: async (g) => { compensados.push(g) },
  }
  return { ctx, llamadas, compensados }
}
const tocar = (S, ctx, sel) => S.alTocarCuentaUnica({ target: { closest: (s) => s.split(',').map(x => x.trim()).includes(sel) ? {} : null } }, ctx)
const cambiar = (S, ctx, sel, props) => S.alCambiarCuentaUnica({ target: { matches: (s) => s === sel, dataset: {}, ...props } }, ctx)

esperas.push((async () => {
  const S = nuevo()
  const { ctx, llamadas, compensados } = ctxFalso(S)
  tocar(S, ctx, '[data-cu-compensar]')
  chk('abrir: dice que está leyendo las facturas', /Leyendo las facturas del proveedor/.test(ctx.contenedor.innerHTML))
  await new Promise(r => setTimeout(r, 0))
  await new Promise(r => setImmediate(r))
  const fifo = llamadas.find(x => x[0] === 'sugerir_facturas_fifo')
  chk('abrir: pide TODAS las facturas abiertas con sugerir_facturas_fifo (en pesos, de esa empresa)', fifo && fifo[1].p_proveedor_id === 'pv1' && fifo[1].p_unidad_negocio_id === 'u-n' && fifo[1].p_moneda === 'ARS' && fifo[1].p_monto === S.TOPE_FACTURAS_CU, JSON.stringify(fifo))
  const c = ctx.cu.comp
  chk('abrir: lo que le debés es lo abierto en las facturas (450.000)', c.saldos.leDebes === 450000 && c.saldos.teDebe === 70000, JSON.stringify(c.saldos))
  chk('abrir: sugiere el MENOR de los dos (70.000)', c.maximo === 70000 && c.monto === 70000)
  chk('abrir: las facturas de la más vieja a la más nueva, repartido', c.facturas.map(f => f.id + ':' + f.monto).join() === 'fp-1:50000,fp-2:20000', JSON.stringify(c.facturas))
  const h = ctx.contenedor.innerHTML
  chk('panel: dice cuánto se puede compensar', /Se puede compensar hasta \$ 70\.000,00: lo menor de los dos\./.test(h))
  chk('panel: "El cliente queda debiendo $A · Le debés $B"', /El cliente queda debiendo \$ 0,00 · Le debés \$ 380\.000,00/.test(h))
  chk('panel: la fecha de hoy, sin pasar de hoy', h.includes(`max="${HOY}" value="${HOY}"`))
  chk('panel: el botón dice cuánto', /data-cu-confirmar>Compensar \$ 70\.000,00</.test(h))
  chk('panel: Compensar ya no se ofrece arriba mientras el panel está abierto', !/data-cu-compensar/.test(h))

  // Más que el menor: lo dice y NO llama a la base.
  cambiar(S, ctx, '[data-cu-monto]', { value: '70.000,01' })
  chk('monto: se lee del campo', c.monto === 70000.01, c.monto)
  chk('monto: el resumen avisa que pasa el tope', /No se puede compensar más de \$ 70\.000,00\./.test(ctx.contenedor.el('[data-cu-resumen]').innerHTML))
  await S.confirmarCompensacion(ctx)
  chk('MÁS QUE EL MENOR SALDO: no llama a compensar_cuentas', !llamadas.some(x => x[0] === 'compensar_cuentas'))
  chk('y lo dice, pegado al botón', c.error === 'No se puede compensar más de $ 70.000,00: es lo menor entre lo que te debe y lo que le debés.' && ctx.contenedor.el('[data-cu-error]').hidden === false &&
    ctx.contenedor.el('[data-cu-error]').textContent === c.error, c.error)

  // Un monto menor: se reparte de nuevo de la más vieja a la más nueva.
  cambiar(S, ctx, '[data-cu-monto]', { value: '30.000' })
  chk('monto menor: se vuelve a repartir', c.facturas.map(f => f.monto).join() === '30000,0' && c.facturas.map(f => f.checked).join() === 'true,false')
  chk('monto menor: el error se fue', c.error === null)
  chk('monto menor: el botón dice el nuevo monto', ctx.contenedor.el('[data-cu-confirmar]').textContent === 'Compensar $ 30.000,00')
  // Destildar la primera y tildar la segunda: se completa con lo que falta.
  cambiar(S, ctx, '[data-cu-fac-check]', { dataset: { cuFacCheck: '0' }, checked: false })
  chk('destildar: esa factura en cero', c.facturas[0].checked === false && c.facturas[0].monto === 0)
  cambiar(S, ctx, '[data-cu-fac-check]', { dataset: { cuFacCheck: '1' }, checked: true })
  chk('tildar: le pone lo que falta (30.000)', c.facturas[1].checked === true && c.facturas[1].monto === 30000)
  cambiar(S, ctx, '[data-cu-fac-monto]', { dataset: { cuFacMonto: '1' }, value: '25.000' })
  chk('editar el monto de una factura', c.facturas[1].monto === 25000)
  await S.confirmarCompensacion(ctx)
  chk('lo aplicado distinto de lo compensado: no se manda', !llamadas.some(x => x[0] === 'compensar_cuentas') && /tiene que ser igual/.test(c.error))
  cambiar(S, ctx, '[data-cu-fac-monto]', { dataset: { cuFacMonto: '1' }, value: '30.000' })
  cambiar(S, ctx, '[data-cu-fecha]', { value: HOY })
  cambiar(S, ctx, '[data-cu-obs]', { value: 'Acuerdo con Anatolia' })

  // El doble toque manda una sola vez.
  // TODOS los que esperan se sueltan (si un segundo pedido pisara al primero,
  // la suite se colgaría y terminaría en silencio).
  const enEspera = []
  const soltar = () => enEspera.splice(0).forEach(f => f())
  ctx.sb.rpc = async (n, p) => { llamadas.push([n, JSON.parse(JSON.stringify(p))]); if (n === 'compensar_cuentas') await new Promise(r => { enEspera.push(r) }); return { data: 'g-1', error: null } }
  const uno = S.confirmarCompensacion(ctx)
  const dos = S.confirmarCompensacion(ctx)
  chk('mientras manda: el botón dice "Compensando…" y está apagado', /data-cu-confirmar disabled>Compensando…</.test(ctx.contenedor.innerHTML))
  await new Promise(r => setImmediate(r))
  soltar()
  await Promise.all([uno, dos])
  const env = llamadas.filter(x => x[0] === 'compensar_cuentas')
  chk('UN doble toque manda UNA sola vez', env.length === 1, env.length)
  const p = env[0]?.[1]
  chk('compensar_cuentas con el cliente, el monto, la fecha, la observación y las facturas',
    p && p.p_cliente_id === 'c1' && p.p_monto === 30000 && p.p_fecha === HOY && p.p_observacion === 'Acuerdo con Anatolia' &&
    JSON.stringify(p.p_aplicaciones) === JSON.stringify([{ factura_pendiente_id: 'fp-2', monto_aplicado: 30000 }]), JSON.stringify(p))
  chk('después: avisa a la pantalla (que recarga) y cierra el panel', compensados.join() === 'g-1' && ctx.cu.comp === null)
})())

esperas.push((async () => {
  const S = nuevo()
  const { ctx, llamadas } = ctxFalso(S, {
    rpc: (n) => n === 'sugerir_facturas_fifo' ? { data: FIFO, error: null } : { data: null, error: { message: 'Le debés $ 450000.00 : no se puede compensar más que eso.' } },
  })
  await S.abrirCompensar(ctx)
  await S.confirmarCompensacion(ctx)
  chk('el error de la base va TAL CUAL', ctx.cu.comp?.error === 'Le debés $ 450000.00 : no se puede compensar más que eso.' && llamadas.some(x => x[0] === 'compensar_cuentas'))
  chk('y se ve pegado al botón', /data-cu-error>Le debés \$ 450000\.00 : no se puede compensar más que eso\.</.test(ctx.contenedor.innerHTML))
  chk('el panel sigue abierto para corregir', ctx.cu.comp && ctx.cu.comp.enviando === false && /data-cu-confirmar>Compensar/.test(ctx.contenedor.innerHTML))
  S.cerrarCompensar(ctx)
  chk('cancelar cierra el panel y vuelve Compensar', ctx.cu.comp === null && /data-cu-compensar/.test(ctx.contenedor.innerHTML))
})())

esperas.push((async () => {
  const S = nuevo()
  const { ctx, llamadas } = ctxFalso(S, { rpc: (n) => ({ data: null, error: { message: 'No autorizado' } }) })
  await S.abrirCompensar(ctx)
  chk('si no se pueden leer las facturas: lo dice y no hay botón para compensar', /No se pudieron leer las facturas del proveedor: No autorizado/.test(ctx.contenedor.innerHTML) && !/data-cu-confirmar/.test(ctx.contenedor.innerHTML))
  await S.confirmarCompensacion(ctx)
  chk('y no se puede mandar nada', !llamadas.some(x => x[0] === 'compensar_cuentas'))
})())

esperas.push((async () => {
  const S = nuevo()
  const { ctx, llamadas } = ctxFalso(S, { puede: false })
  await S.abrirCompensar(ctx)
  chk('sin los dos permisos no se abre ni se leen facturas', ctx.cu.comp === null && !llamadas.length)
  const sinDeuda = ctxFalso(S, { filas: FILAS.filter(f => f.lado === 'cliente') })
  await S.abrirCompensar(sinDeuda.ctx)
  chk('si no le debés nada no se abre', sinDeuda.ctx.cu.comp === null && !sinDeuda.llamadas.length)
})())

esperas.push((async () => {
  // Lo abierto en las facturas (60.000) es MENOS que la columna (450.000, que
  // cuenta créditos) y que lo que te debe (70.000): el tope es lo abierto,
  // como en la base (v_saldo_proveedor.deuda_pendiente).
  const S = nuevo()
  const pocas = [{ factura_pendiente_id: 'fp-9', fecha_factura: '2026-09-01', numero_comprobante: '9', saldo_pendiente: 60000, monto_a_aplicar: 60000 }]
  const { ctx } = ctxFalso(S, { rpc: (n) => n === 'sugerir_facturas_fifo' ? { data: pocas, error: null } : { data: 'g', error: null } })
  await S.abrirCompensar(ctx)
  chk('tope: lo abierto en las facturas (60.000), no la columna', ctx.cu.comp.maximo === 60000 && ctx.cu.comp.saldos.leDebes === 60000, JSON.stringify(ctx.cu.comp.saldos))
  chk('tope: sugiere 60.000', ctx.cu.comp.monto === 60000)
  chk('tope: "El cliente queda debiendo $ 10.000,00 · Le debés $ 0,00"', /El cliente queda debiendo \$ 10\.000,00 · Le debés \$ 0,00/.test(ctx.contenedor.innerHTML))
})())

esperas.push((async () => {
  // Sin facturas abiertas: el máximo es 0 y no deja mandar.
  const S = nuevo()
  const { ctx, llamadas } = ctxFalso(S, { rpc: (n) => n === 'sugerir_facturas_fifo' ? { data: [], error: null } : { data: 'g', error: null } })
  await S.abrirCompensar(ctx)
  chk('sin facturas abiertas: lo dice', /no tiene facturas abiertas en esta empresa/.test(ctx.contenedor.innerHTML))
  await S.confirmarCompensacion(ctx)
  chk('y no se manda', !llamadas.some(x => x[0] === 'compensar_cuentas'))
})())

esperas.push((async () => {
  // El filtro repinta con la etiqueta elegida.
  const S = nuevo()
  const { ctx } = ctxFalso(S)
  S.pintarCuentaUnica(ctx)
  cambiar(S, ctx, '[data-cu-filtro]', { value: 'Pago' })
  chk('filtro: queda elegido y muestra solo los pagos', ctx.cu.filtro === 'Pago' && (ctx.contenedor.innerHTML.match(/class="cu-fila"/g) || []).length === 1)
  // La lectura de la cuenta.
  const cu = S.estadoCuentaUnica({ proveedorId: 'pv1', unidadId: 'u-n' })
  const ll = []
  await S.cargarCuentaUnica({ rpc: async (n, p) => { ll.push([n, p]); return { data: FILAS, error: null } } }, cu)
  chk('por proveedor: cuenta_unificada con el proveedor y la empresa', ll[0][0] === 'cuenta_unificada' && ll[0][1].p_cliente_id === null && ll[0][1].p_proveedor_id === 'pv1' && ll[0][1].p_unidad_negocio_id === 'u-n')
  chk('y el cliente sale de la cuenta', cu.clienteId === 'c1' && cu.filas.length === 5)
  const cu2 = S.estadoCuentaUnica({ clienteId: 'c1' })
  await S.cargarCuentaUnica({ rpc: async () => ({ data: null, error: { message: 'x' } }) }, cu2)
  chk('si falla: el error, sin filas (nunca una cuenta vacía inventada)', cu2.filas === null && /No se pudo leer la cuenta/.test(cu2.error))
})())

// ═══ 4. Administración: la cuenta del cliente ═══════════════════════════════
const CLIENTES = [
  { id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', cuit: '30712345678', limite_credito: null, activo: true, proveedor_id: 'pv1' },
  { id: 'c2', nombre: 'Kiosco Pepe', razon_social: null, cuit: null, limite_credito: null, activo: true, proveedor_id: null },
]
function prepararAdmin(S, { tareas } = {}) {
  S.estado.clientes = CLIENTES
  S.estado.catalogo = { productos: [], presentaciones: [], marcas: [] }
  S.estado.catalogoEmpresa = 'u-n'
  if (tareas) S.estado.misTareas = tareas
  S.__setRpc(async (n) => {
    if (n === 'cuenta_cliente') return { data: [], error: null }
    if (n === 'cuenta_unificada') return { data: FILAS, error: null }
    if (n === 'clientes_con_saldo') return { data: [], error: null }
    return { data: null, error: null }
  })
}
const TODAS = new Map([['retiros:ver', { todas: true }], ['retiros:precios', { todas: true }], ['cobranzas:procesar', null], ['cuentas_corrientes:registrar_pago', null]])

esperas.push((async () => {
  const S = nuevo()
  prepararAdmin(S, { tareas: TODAS })
  await S.abrirCliente('c1')
  const u = S.__llamadas.rpc.find(x => x[0] === 'cuenta_unificada')
  chk('admin: un cliente vinculado lee cuenta_unificada por el cliente', u && u[1].p_cliente_id === 'c1' && u[1].p_proveedor_id === null)
  const el = S.__els.get('ad-cuenta-unica')
  chk('admin: la cuenta de cliente y proveedor se ve, con el neto', el.hidden === false && /Le debés \$ 380\.000,00/.test(el.innerHTML))
  chk('admin: con los dos permisos, Compensar', /data-cu-compensar/.test(el.innerHTML))
  chk('admin: y su cuenta de cliente sigue abajo', S.__llamadas.rpc.some(x => x[0] === 'cuenta_cliente'))
})())
esperas.push((async () => {
  const S = nuevo()
  prepararAdmin(S, { tareas: new Map([['retiros:ver', { todas: true }], ['cobranzas:procesar', null]]) })
  await S.abrirCliente('c1')
  chk('admin: sin cuentas_corrientes:registrar_pago, no hay Compensar', !/data-cu-compensar/.test(S.__els.get('ad-cuenta-unica').innerHTML) && /Le debés/.test(S.__els.get('ad-cuenta-unica').innerHTML))
  chk('admin: puedeCompensarCuentas pide las DOS tareas', S.puedeCompensarCuentas() === false)
  S.estado.misTareas = new Map([['cuentas_corrientes:registrar_pago', null]])
  chk('admin: ...también sin cobranzas:procesar', S.puedeCompensarCuentas() === false)
  S.estado.miRolApp = 'super_admin'
  chk('admin: un super_admin sí', S.puedeCompensarCuentas() === true)
})())
esperas.push((async () => {
  const S = nuevo()
  prepararAdmin(S, { tareas: TODAS })
  await S.abrirCliente('c2')
  chk('admin: un cliente SIN proveedor no pide cuenta_unificada y no la muestra', !S.__llamadas.rpc.some(x => x[0] === 'cuenta_unificada') && S.__els.get('ad-cuenta-unica').hidden === true)
})())
esperas.push((async () => {
  const S = nuevo()
  prepararAdmin(S, { tareas: TODAS })
  S.__setRpc(async (n) => n === 'cuenta_unificada' ? { data: null, error: { message: 'x' } } : { data: [], error: null })
  await S.abrirCliente('c1')
  chk('admin: si cuenta_unificada falla, lo dice (y la cuenta del cliente sigue)', /No se pudo leer la cuenta de cliente y proveedor/.test(S.__els.get('ad-cuenta-unica').innerHTML) && !S.estado.cliente.error)
})())

// ═══ 5. Administración: la clasificación de la ficha ═══════════════════════
const FICHA = (proveedor) => ({ id: 'c2', nombre: 'Kiosco Pepe', razon_social: null, cuit: null, condicion_iva: null, domicilio: null, localidad: null, provincia: null, codigo_postal: null,
  telefono: null, email: null, contacto_nombre: null, contacto_telefono: null, transporte_habitual: null, banco: null, cbu: null, alias_cbu: null,
  lista_precio_id: null, limite_credito: null, plazo_pago_dias: null, proveedor_id: proveedor, observaciones: null, unidad_negocio_id: 'u-n', apodos: [] })
function prepararFicha(S, proveedor, proveedores) {
  S.__tablas.clientes = [FICHA(proveedor)]
  S.__tablas.listas_precios = []
  S.__tablas.proveedores = proveedores ?? [{ id: 'pv1', razon_social: 'KIOSCO PEPE SRL', nombre_fantasia: null, cuit: '30123456789', estado_alta: 'activo', activo: true }]
}

esperas.push((async () => {
  const S = nuevo()
  prepararFicha(S, null)
  await S.abrirFicha('c2')
  const html = () => S.__els.get('ad-f-clasificacion').innerHTML
  chk('ficha: Clasificación con "Cliente" elegido', /data-clasificacion="cliente" aria-pressed="true"/.test(html()))
  chk('ficha: "Proveedor" solo, apagado', /data-clasificacion="proveedor" aria-pressed="false" disabled/.test(html()))
  chk('ficha: los paneles cerrados', S.__els.get('ad-f-vincular').hidden === true && S.__els.get('ad-f-desvincular').hidden === true)
  S.elegirClasificacionFicha('cliente')
  chk('ficha: tocar "Cliente" siendo cliente no hace nada', S.__els.get('ad-f-vincular').hidden === true && S.__els.get('ad-f-desvincular').hidden === true)
  S.elegirClasificacionFicha('ambos')
  chk('ficha: "Cliente y proveedor" abre el panel de vincular', S.__els.get('ad-f-vincular').hidden === false && S.estado.ficha.vinculo.panel === 'vincular')
  chk('ficha: el panel explica que se busca o se crea', /si no hay, se crea en Cuentas corrientes/.test(S.__els.get('ad-f-vincular-texto').textContent))
  // Vincular sin elegir: la base busca o crea. Devuelve uno NUEVO.
  const enEspera = []
  const resolver = () => enEspera.splice(0).forEach(f => f())
  S.__setRpc(async (n, p) => {
    if (n === 'vincular_cliente_proveedor') { await new Promise(r => { enEspera.push(r) }); S.__tablas.proveedores = [...S.__tablas.proveedores, { id: 'pv-nuevo', razon_social: 'KIOSCO PEPE', estado_alta: 'activo', activo: true }]; return { data: 'pv-nuevo', error: null } }
    return { data: null, error: null }
  })
  const uno = S.confirmarVincular()
  const dos = S.confirmarVincular()
  chk('ficha: mientras manda, los botones apagados', S.__els.get('ad-f-vincular-confirmar').disabled === true)
  await new Promise(r => setImmediate(r))
  resolver()
  await Promise.all([uno, dos])
  const v = S.__llamadas.rpc.filter(x => x[0] === 'vincular_cliente_proveedor')
  chk('ficha: un doble toque vincula UNA vez', v.length === 1, v.length)
  chk('ficha: vincular_cliente_proveedor con el cliente y sin proveedor (lo busca la base)', v[0][1].p_cliente_id === 'c2' && v[0][1].p_proveedor_id === null, JSON.stringify(v[0]))
  chk('ficha: avisa que se creó el proveedor en Cuentas corrientes', S.__llamadas.exitos.includes('Se creó el proveedor KIOSCO PEPE en Cuentas corrientes.'), JSON.stringify(S.__llamadas.exitos))
  chk('ficha: queda "Cliente y proveedor"', S.estado.ficha.proveedorActual === 'pv-nuevo' && /data-clasificacion="ambos" aria-pressed="true"/.test(html()))
  chk('ficha: muestra con quién quedó vinculado', /KIOSCO PEPE/.test(S.__els.get('ad-f-proveedor-elegido').innerHTML) && /ad-f-proveedor-quitar/.test(S.__els.get('ad-f-proveedor-elegido').innerHTML))
  chk('ficha: el panel se cerró', S.__els.get('ad-f-vincular').hidden === true)
})())

esperas.push((async () => {
  const S = nuevo()
  prepararFicha(S, null)
  await S.abrirFicha('c2')
  S.elegirClasificacionFicha('ambos')
  S.estado.ficha.busquedaProveedor = 'kiosco'
  S.elegirProveedorFicha('pv1')
  chk('ficha: elegir un proveedor del padrón en el panel', S.estado.ficha.proveedorId === 'pv1' && /Se va a vincular con el proveedor KIOSCO PEPE SRL/.test(S.__els.get('ad-f-vincular-texto').textContent))
  S.__setRpc(async (n) => n === 'vincular_cliente_proveedor' ? { data: 'pv1', error: null } : { data: null, error: null })
  await S.confirmarVincular()
  const v = S.__llamadas.rpc.find(x => x[0] === 'vincular_cliente_proveedor')
  chk('ficha: va con el proveedor elegido', v[1].p_proveedor_id === 'pv1')
  chk('ficha: uno que ya existía: "Quedó vinculado con…" (no dice que se creó)', S.__llamadas.exitos.includes('Quedó vinculado con el proveedor KIOSCO PEPE SRL.'), JSON.stringify(S.__llamadas.exitos))
})())

esperas.push((async () => {
  const S = nuevo()
  prepararFicha(S, null)
  await S.abrirFicha('c2')
  S.elegirClasificacionFicha('ambos')
  S.__setRpc(async (n) => n === 'vincular_cliente_proveedor' ? { data: null, error: { message: 'No tenés permiso sobre ese cliente.' } } : { data: null, error: null })
  await S.confirmarVincular()
  chk('ficha: el error de la base tal cual, pegado', S.__els.get('ad-f-vincular-error').textContent === 'No tenés permiso sobre ese cliente.' && S.__els.get('ad-f-vincular-error').hidden === false)
  chk('ficha: sigue siendo solo cliente, con el panel abierto', S.estado.ficha.proveedorActual === null && S.__els.get('ad-f-vincular').hidden === false)
  S.cerrarPanelVinculo()
  chk('ficha: Cancelar cierra el panel', S.__els.get('ad-f-vincular').hidden === true)
})())

esperas.push((async () => {
  const S = nuevo()
  prepararFicha(S, 'pv1')
  await S.abrirFicha('c2')
  const html = () => S.__els.get('ad-f-clasificacion').innerHTML
  chk('ficha vinculada: "Cliente y proveedor" elegido', /data-clasificacion="ambos" aria-pressed="true"/.test(html()))
  S.elegirClasificacionFicha('cliente')
  chk('ficha vinculada: volver a "Cliente" pide confirmar (un panel propio, no confirm())', S.__els.get('ad-f-desvincular').hidden === false &&
    /¿Separar las dos cuentas\? KIOSCO PEPE SRL deja de figurar como proveedor/.test(S.__els.get('ad-f-desvincular-texto').textContent))
  chk('ficha vinculada: todavía no llamó a la base', !S.__llamadas.rpc.some(x => x[0] === 'desvincular_cliente_proveedor'))
  S.__setRpc(async (n) => n === 'desvincular_cliente_proveedor' ? { data: null, error: { message: 'Tiene compensaciones entre sus dos cuentas: no se puede desvincular.' } } : { data: null, error: null })
  await S.confirmarDesvincular()
  chk('ficha vinculada: el error de la base tal cual, pegado', S.__els.get('ad-f-desvincular-error').textContent === 'Tiene compensaciones entre sus dos cuentas: no se puede desvincular.' && S.__els.get('ad-f-desvincular-error').hidden === false)
  chk('ficha vinculada: sigue vinculado', S.estado.ficha.proveedorActual === 'pv1')
  const enEspera = []
  S.__setRpc(async () => { await new Promise(r => enEspera.push(r)); return { data: null, error: null } })
  const uno = S.confirmarDesvincular()
  const dos = S.confirmarDesvincular()
  chk('ficha vinculada: mientras separa, los botones apagados', S.__els.get('ad-f-desvincular-confirmar').disabled === true)
  await new Promise(r => setImmediate(r))
  enEspera.splice(0).forEach(f => f())
  await Promise.all([uno, dos])
  const d = S.__llamadas.rpc.filter(x => x[0] === 'desvincular_cliente_proveedor')
  chk('ficha vinculada: desvincular_cliente_proveedor con el cliente (un doble toque, UNA vez)', d.length === 2 && d[1][1].p_cliente_id === 'c2' && Object.keys(d[1][1]).length === 1, d.length)
  chk('ficha vinculada: queda solo "Cliente" y lo dice', S.estado.ficha.proveedorActual === null && /data-clasificacion="cliente" aria-pressed="true"/.test(html()) &&
    S.__llamadas.exitos.includes('Las dos cuentas quedaron separadas: KIOSCO PEPE SRL ya no figura como proveedor de este cliente.'), JSON.stringify(S.__llamadas.exitos))
})())

// ═══ 6. Lo que se mira en el fuente ════════════════════════════════════════
{
  chk('admin: importa de js/cuenta-unica.js', /from '\.\.\/js\/cuenta-unica\.js'/.test(FUENTE))
  chk('admin: el clic de la ficha va a la clasificación', /closest\('\[data-clasificacion\]'\)\)\) elegirClasificacionFicha\(b\.dataset\.clasificacion\)/.test(FUENTE))
  chk('admin: "No es proveedor" abre la confirmación de separar (no borra a ciegas)', /closest\('#ad-f-proveedor-quitar'\)\) elegirClasificacionFicha\('cliente'\)/.test(FUENTE))
  chk('admin: la cuenta escucha toques y cambios', /unica\.addEventListener\('click'/.test(FUENTE) && /for \(const tipo of \['input', 'change'\]\) unica\.addEventListener/.test(FUENTE))
  chk('admin: lee las tareas de cuentas_corrientes (registrar_pago)', /'cobranzas', 'cuentas_corrientes'\]\)\.eq\('habilitado', true\)/.test(FUENTE))
  chk('admin: la lista de clientes trae proveedor_id', /codigo_anterior, proveedor_id'\)/.test(FUENTE))
  chk('admin: ningún confirm() (solo lo nombra un comentario)', !/(?<![\w./])confirm\(/.test(FUENTE))
}

fin()
