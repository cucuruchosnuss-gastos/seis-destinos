// ADMINISTRACIÓN — PRÉSTAMOS (13/10/2026).
//
// La sección "Préstamos" (con gastos:gastos_empresa, con bypass de
// super_admin): la lista de prestamos_activos (Activos / Cancelados, con la
// unidad de la barra de arriba), "Nuevo préstamo" → crear_prestamo (cuotas
// iguales en centavos, la última absorbe el redondeo, la suma TIENE que dar el
// total), el detalle (prestamo_detalle) con la barra de % de cada cuota y los
// pagos, "Anular pago" con motivo → anular_pago_prestamo, y "Editar" →
// editar_prestamo. Se EJECUTA el código real con un Supabase falso: el
// cálculo, las validaciones (con los textos de la base), los parámetros, el
// error de la base TAL CUAL, el doble toque y XSS.
//
//   node pruebas/test-administracion-prestamos.js

const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const MARCA = (c) => `"><img src=x data-xss="${c}">`
const crudo = (h) => /data-xss="/.test(h)
const escapada = (h, c) => h.includes(`data-xss=&quot;${c}&quot;`)

function nuevo({ rol = 'usuario', conPermiso = true } = {}) {
  const S = construirAdministracion(ARCHIVO)
  S.estado.miRolApp = rol
  S.estado.misTareas = new Map(conPermiso ? [['gastos:gastos_empresa', null]] : [])
  return S
}
// importeHoja() separa el símbolo con un espacio que no corta (U+00A0): se
// compara con un espacio común.
const nb = (t) => String(t ?? '').replace(/\u00a0/g, ' ')
const html = (S, id) => nb(S.__els.get(id)?.innerHTML)

const PRESTAMOS = [
  { id: 'p-1', unidad_negocio_id: 'u-n', unidad: 'Cucuruchos Nuss', nombre: 'Préstamo Galicia', acreedor: 'Banco Galicia', moneda: 'USD', estado: 'activo',
    total: 20000, pagado: 5000, saldo: 15000, cuotas: 4, cuotas_pagas: 1,
    proxima: { cuota_id: 'q-2', numero: 2, vencimiento: '2026-10-10', importe: 5000, pagado: 0, falta: 5000 } },
  { id: 'p-2', unidad_negocio_id: 'u-d', unidad: 'Dolce Pasta', nombre: 'Leasing horno', acreedor: null, moneda: 'ARS', estado: 'activo',
    total: 1200000, pagado: 0, saldo: 1200000, cuotas: 12, cuotas_pagas: 0,
    proxima: { cuota_id: 'r-1', numero: 1, vencimiento: '2026-11-05', importe: 100000, pagado: 0, falta: 100000 } },
  { id: 'p-3', unidad_negocio_id: 'u-n', unidad: 'Cucuruchos Nuss', nombre: 'Viejo', acreedor: 'X', moneda: 'ARS', estado: 'cancelado',
    total: 1000, pagado: 1000, saldo: 0, cuotas: 1, cuotas_pagas: 1, proxima: null },
]
const DETALLE = {
  prestamo: { id: 'p-1', unidad_negocio_id: 'u-n', unidad: 'Cucuruchos Nuss', nombre: 'Préstamo Galicia', acreedor: 'Banco Galicia', moneda: 'USD',
    fecha_inicio: '2026-08-01', observaciones: 'Tasa fija', estado: 'activo', total: 20000, pagado: 6200 },
  cuotas: [
    { id: 'q-1', numero: 1, vencimiento: '2026-09-10', importe: 5000, pagado: 5000, falta: 0, pct: 100 },
    { id: 'q-2', numero: 2, vencimiento: '2026-10-10', importe: 5000, pagado: 1200, falta: 3800, pct: 24 },
    { id: 'q-3', numero: 3, vencimiento: '2026-11-10', importe: 5000, pagado: 0, falta: 5000, pct: 0 },
    { id: 'q-4', numero: 4, vencimiento: '2026-12-10', importe: 5000, pagado: 0, falta: 5000, pct: 0 },
  ],
  pagos: [
    { id: 'pg-1', cuota_numero: 1, fecha: '2026-09-10', moneda: 'USD', monto: 5000, tipo_cambio: null, imputado: 5000, cuenta: 'Mis dólares', medio: 'efectivo', gasto_id: 'g1', cargado_por: 'Facu', anulado: false, anulado_motivo: null },
    { id: 'pg-2', cuota_numero: 2, fecha: '2026-10-01', moneda: 'ARS', monto: 1560000, tipo_cambio: 1300, imputado: 1200, cuenta: 'Banco Nación', medio: 'transferencia', gasto_id: 'g2', cargado_por: 'Pablo', anulado: false, anulado_motivo: null },
    { id: 'pg-3', cuota_numero: 2, fecha: '2026-10-02', moneda: 'USD', monto: 100, tipo_cambio: null, imputado: 100, cuenta: 'Mis dólares', medio: 'efectivo', gasto_id: 'g3', cargado_por: 'Facu', anulado: true, anulado_motivo: 'Cargado dos veces' },
  ],
}

// ── 1. El permiso, la pestaña y la portada ───────────────────────────────────
esperas.push((async () => {
  const S = nuevo()
  chk('con gastos_empresa se ve la sección Préstamos', S.seccionesVisibles().some(s => s.id === 'prestamos'))
  chk('es global (no depende de la empresa)', S.SECCIONES.find(s => s.id === 'prestamos').global === true && S.VISTAS_GLOBALES.includes('ad-vista-prestamos') && S.VISTAS_GLOBALES.includes('ad-vista-prestamo'))
  const T = nuevo({ conPermiso: false })
  chk('sin gastos_empresa no se ve', !T.seccionesVisibles().some(s => s.id === 'prestamos'))
  T.estado.misTareas = new Map([['gastos:ver_exportar', null], ['gastos:editar_anular', null]])
  chk('otras tareas de gastos no alcanzan', !T.seccionesVisibles().some(s => s.id === 'prestamos'))
  const U = nuevo({ rol: 'super_admin', conPermiso: false })
  chk('super_admin la ve por el bypass', U.seccionesVisibles().some(s => s.id === 'prestamos'))
  chk('la pestaña va después de Cheques', /\['cheques', 'Cheques'\], \['prestamos', 'Préstamos'\]/.test(src))
  chk('Administración lee las tareas de gastos', /\.in\('modulo', \[[^\]]*'gastos'\]\)/.test(src))

  const r = S.resumenPrestamos(PRESTAMOS, '2026-10-13')
  chk('la portada cuenta los activos (no el cancelado)', r.activos === 2)
  chk('la deuda por moneda, en centavos', r.saldos.USD === 1500000 && r.saldos.ARS === 120000000)
  chk('cuenta las cuotas vencidas', r.vencidos === 1)
  chk('la próxima es la que vence primero', r.proxima?.id === 'p-1')
  chk('el texto de la deuda: pesos y dólares', nb(S.textoSaldosPrestamos(r.saldos)) === 'Se deben $ 1.200.000,00 y US$ 15.000,00', S.textoSaldosPrestamos(r.saldos))
  chk('sin deuda: «Nada por pagar»', S.textoSaldosPrestamos({}) === 'Nada por pagar')
  const c = S.contenidoSeccion(S.SECCIONES.find(s => s.id === 'prestamos'), { prestamos: PRESTAMOS })
  chk('la tarjeta: número, unidad y renglones', c.numero === 2 && c.unidad === 'préstamos activos' && c.lineas.some(l => l?.ir === 'Ver préstamos ›'))
  const e = S.contenidoSeccion(S.SECCIONES.find(s => s.id === 'prestamos'), { errorPrestamos: 'No se pudo contar.' })
  chk('si no se pudo contar, lo dice (nunca 0)', e.error === 'No se pudo contar.' && e.numero === null)
  const cargando = S.contenidoSeccion(S.SECCIONES.find(s => s.id === 'prestamos'), {})
  chk('mientras cuenta: barras', cargando.carga === true)

  S.__setRpc(async (n, p) => n === 'prestamos_activos' ? { data: PRESTAMOS, error: null } : { data: null, error: null })
  const p = {}
  S.estado.unidadBarra = 'u-n'
  await S.contarPrestamosPortada(p, 0)
  chk('la portada lee con la unidad de la barra', JSON.stringify(S.__llamadas.rpc.at(-1)) === JSON.stringify(['prestamos_activos', { p_unidad_negocio_id: 'u-n', p_incluir_cancelados: true }]))
  chk('y guarda la lista', p.prestamos?.length === 3)
})())

// ── 2. La lista ──────────────────────────────────────────────────────────────
esperas.push((async () => {
  const S = nuevo()
  S.estado.unidadBarra = null
  S.estado.fabrica = { ok: true, unidades: new Set(['u-x']), personas: new Set(), soyDePrueba: false }
  const conPrueba = [...PRESTAMOS, { ...PRESTAMOS[0], id: 'p-x', unidad_negocio_id: 'u-x', nombre: 'De la fábrica de pruebas' }]
  S.__setRpc(async (n) => n === 'prestamos_activos' ? { data: conPrueba, error: null } : { data: null, error: null })
  await S.mostrarPrestamos()
  chk('pide todas las empresas con la barra en Todas, con los cancelados', JSON.stringify(S.__llamadas.rpc.at(-1)) === JSON.stringify(['prestamos_activos', { p_unidad_negocio_id: null, p_incluir_cancelados: true }]))
  let h = html(S, 'ad-prestamos-lista')
  chk('Activos: los dos activos', (h.match(/data-prestamo-abrir="/g) || []).length === 2 && !/Viejo/.test(h))
  chk('la fábrica de pruebas no aparece', !/fábrica de pruebas/.test(h))
  chk('cada fila: nombre, empresa, saldo, cuotas y la próxima', /Préstamo Galicia/.test(h) && /data-sello-empresa="u-n"/.test(h) && /Saldo US\$ 15\.000,00/.test(h) && /1 de 4 cuotas pagas/.test(h) && /Próxima: cuota 2 · vence 10\/10\/2026/.test(h), h)
  chk('sin acreedor lo dice', /Sin acreedor cargado/.test(h))
  chk('la cuenta', S.__els.get('ad-prestamos-cuenta').textContent === '2 préstamos')
  S.elegirFiltroPrestamos('cancelado')
  h = html(S, 'ad-prestamos-lista')
  chk('Cancelados: solo el cancelado, con su sello', (h.match(/data-prestamo-abrir="/g) || []).length === 1 && /Viejo/.test(h) && />Cancelado</.test(h))
  chk('el cancelado: todas las cuotas pagas', /Todas las cuotas pagas/.test(h))

  // Vencida
  const v = S.htmlFilaPrestamoAd(PRESTAMOS[0], '2026-10-13')
  chk('la cuota vencida se marca', /ad-fila--atencion/.test(v) && /\(vencida\)/.test(v))
  chk('no vencida, sin marca', !/ad-fila--atencion/.test(S.htmlFilaPrestamoAd(PRESTAMOS[0], '2026-10-05')))

  // Error y vacío
  S.__setRpc(async () => ({ data: null, error: { message: 'x' } }))
  await S.mostrarPrestamos()
  chk('si falla, lo dice', /No se pudieron leer los préstamos/.test(html(S, 'ad-prestamos-lista')))
  S.__setRpc(async () => ({ data: [], error: null }))
  S.elegirFiltroPrestamos('activo')
  await S.mostrarPrestamos()
  chk('sin préstamos lo dice', /No hay préstamos activos/.test(html(S, 'ad-prestamos-lista')))

  // Una respuesta vieja no pisa la nueva.
  {
    const V = nuevo()
    let primera, n = 0
    V.__setRpc(async () => { n++; if (n === 1) return new Promise(r => { primera = r }); return { data: [{ ...PRESTAMOS[0], nombre: 'Nueva' }], error: null } })
    const vieja = V.mostrarPrestamos()
    await V.mostrarPrestamos()
    primera({ data: [{ ...PRESTAMOS[0], nombre: 'Vieja' }], error: null })
    await vieja
    chk('una respuesta vieja no pisa la nueva', /Nueva/.test(html(V, 'ad-prestamos-lista')) && !/Vieja/.test(html(V, 'ad-prestamos-lista')))
  }

  // Sin permiso, a la portada.
  const T = nuevo({ conPermiso: false })
  await T.mostrarPrestamos()
  chk('sin permiso no abre la sección', T.estado.vista !== 'ad-vista-prestamos' && !T.__llamadas.rpc.some(r => r[0] === 'prestamos_activos'))

  // XSS
  const X = nuevo()
  X.__setRpc(async () => ({ data: [{ ...PRESTAMOS[0], id: 'i' + MARCA('id'), nombre: 'N' + MARCA('nombre'), acreedor: MARCA('acreedor'), unidad: MARCA('unidad'), unidad_negocio_id: 'u-zz' }], error: null }))
  await X.mostrarPrestamos()
  const hx = html(X, 'ad-prestamos-lista')
  chk('XSS en la lista: ninguna marca cruda', !crudo(hx))
  chk('XSS en la lista: id, nombre, acreedor y empresa escapados', ['id', 'nombre', 'acreedor', 'unidad'].every(c => escapada(hx, c)), hx)
})())

// ── 3. Las cuotas iguales y el alta ──────────────────────────────────────────
esperas.push((async () => {
  const S = nuevo()
  chk('sumar meses: 31/01 + 1 = 28/02', S.sumarMesesIso('2027-01-31', 1) === '2027-02-28')
  chk('sumar meses: cruza el año', S.sumarMesesIso('2026-11-10', 3) === '2027-02-10')
  const c = S.cuotasIguales(1000, 3, '2026-11-10')
  chk('cuotas iguales: 333,33 + 333,33 + 333,34', JSON.stringify(c.map(x => x.importe)) === JSON.stringify([333.33, 333.33, 333.34]), JSON.stringify(c))
  chk('la suma da EXACTO el total', S.sumaCuotasCentavos(c) === 100000)
  chk('los vencimientos son mensuales desde el primero', c.map(x => x.vencimiento).join(',') === '2026-11-10,2026-12-10,2027-01-10')
  const d = S.cuotasIguales(1200000.07, 12, '2026-11-05')
  chk('12 cuotas de 1.200.000,07: suma exacta', S.sumaCuotasCentavos(d) === 120000007 && d.at(-1).importe === 100000.07)
  chk('sin total, sin cantidad o sin fecha: nada', S.cuotasIguales(null, 3, '2026-11-10') === null && S.cuotasIguales(1000, 0, '2026-11-10') === null && S.cuotasIguales(1000, 3, null) === null && S.cuotasIguales(1000, 2.5, '2026-11-10') === null)
  const di = S.cuotasDistintas(2, '2026-11-10')
  chk('cuotas distintas: los vencimientos y los importes para escribir', di.length === 2 && di.every(x => x.importe === null))

  const base = { unidad: 'u-n', moneda: 'USD', nombre: 'Galicia', acreedor: '  Banco  ', fecha: '2026-10-13', total: 1000, cuotas: c, observaciones: '' }
  const v = (cambios) => S.validarAltaPrestamo({ ...base, ...cambios })
  chk('todo bien: sin error', v({}) === null)
  chk('sin empresa', v({ unidad: null }) === 'Elegí la empresa.')
  chk('moneda rara', v({ moneda: 'EUR' }) === 'La moneda tiene que ser pesos o dólares.')
  chk('nombre de una letra', v({ nombre: ' A ' }) === 'Poné un nombre al préstamo.')
  chk('sin fecha', v({ fecha: null }) === 'Falta la fecha del préstamo.')
  chk('sin total', v({ total: null }) === 'Poné el total del préstamo.')
  chk('sin cuotas', v({ cuotas: [] }) === 'Cargá al menos una cuota.')
  chk('cuota sin vencimiento', v({ cuotas: [{ vencimiento: '2026-11-10', importe: 500 }, { vencimiento: null, importe: 500 }] }) === 'La cuota 2 no tiene vencimiento.')
  chk('cuota sin importe', v({ cuotas: [{ vencimiento: '2026-11-10', importe: 0 }, { vencimiento: '2026-12-10', importe: 1000 }] }) === 'La cuota 1 tiene que tener un importe mayor a cero.')
  chk('la suma no da el total: se dice y no se manda', nb(v({ cuotas: [{ vencimiento: '2026-11-10', importe: 999.99 }] })) === 'Las cuotas suman US$ 999,99 y el total es US$ 1.000,00: tienen que dar lo mismo.', v({ cuotas: [{ vencimiento: '2026-11-10', importe: 999.99 }] }))
  const p = S.parametrosAltaPrestamo(base)
  chk('parámetros de crear_prestamo', JSON.stringify(p) === JSON.stringify({ p_unidad_negocio_id: 'u-n', p_nombre: 'Galicia', p_acreedor: 'Banco', p_moneda: 'USD',
    p_fecha_inicio: '2026-10-13', p_cuotas: [{ vencimiento: '2026-11-10', importe: 333.33 }, { vencimiento: '2026-12-10', importe: 333.33 }, { vencimiento: '2027-01-10', importe: 333.34 }],
    p_observaciones: null }), JSON.stringify(p))
  chk('sin acreedor va null', S.parametrosAltaPrestamo({ ...base, acreedor: '  ' }).p_acreedor === null)

  // El formulario
  S.estado.unidadBarra = 'u-d'
  S.abrirAltaPrestamo()
  const a = S.estado.prestamos.alta
  chk('el alta arranca con la empresa de la barra, en pesos, hoy y cuotas iguales', a.unidad === 'u-d' && a.moneda === 'ARS' && a.modo === 'iguales' && /^\d{4}-\d{2}-\d{2}$/.test(a.fecha))
  let h = html(S, 'ad-prestamo-alta')
  chk('el formulario pide lo necesario', ['ad-pr-nombre', 'ad-pr-acreedor', 'ad-pr-empresa', 'ad-pr-fecha', 'ad-pr-total', 'ad-pr-cantidad', 'ad-pr-primer', 'ad-pr-obs', 'ad-pr-guardar'].every(id => h.includes(`id="${id}"`)))
  chk('sin datos: dice qué falta para armar las cuotas', /Poné el total, la cantidad de cuotas y el primer vencimiento/.test(h))
  chk('el botón Nuevo se esconde mientras está el alta', S.__els.get('ad-prestamo-nuevo').hidden === true)
  a.total = 300; a.cantidad = 3; a.primerVenc = '2026-11-01'
  S.armarCuotasAlta(a)
  S.pintarCuotasAlta()
  h = html(S, 'ad-pr-cuotas')
  chk('arma las tres cuotas', (h.match(/data-cuota-importe="/g) || []).length === 3 && /Las cuotas suman \$ 300,00: da el total\./.test(h), h)
  a.modo = 'distintas'
  S.armarCuotasAlta(a)
  chk('con distintas, los importes quedan para escribir', a.cuotas.length === 3 && a.cuotas.every(x => x.importe === null))
  a.cuotas[0].importe = 100
  chk('la suma dice la diferencia', S.textoSumaCuotas(a.cuotas, a.moneda, a.total).mal === true)

  // Guardar
  a.modo = 'iguales'; S.armarCuotasAlta(a); a.nombre = 'Leasing'
  let soltar = []
  S.__setRpc(async (n) => {
    if (n === 'crear_prestamo') return new Promise(r => soltar.push(r))
    if (n === 'prestamos_activos') return { data: PRESTAMOS, error: null }
    return { data: null, error: null }
  })
  const g1 = S.guardarAltaPrestamo(), g2 = S.guardarAltaPrestamo()
  soltar.forEach(r => r({ data: 'nuevo-id', error: null }))
  await g1; await g2
  const crear = S.__llamadas.rpc.filter(r => r[0] === 'crear_prestamo')
  chk('un doble toque crea UNA vez', crear.length === 1, String(crear.length))
  chk('manda lo del formulario', crear[0]?.[1]?.p_nombre === 'Leasing' && crear[0][1].p_unidad_negocio_id === 'u-d' && crear[0][1].p_cuotas.length === 3)
  chk('después avisa, cierra el alta y vuelve a leer la lista', S.__llamadas.exitos.at(-1) === 'Préstamo creado: «Leasing».' && S.estado.prestamos.alta === null && S.__llamadas.rpc.at(-1)[0] === 'prestamos_activos')

  // Error de la base tal cual; validación local no manda.
  S.abrirAltaPrestamo()
  const b = S.estado.prestamos.alta
  S.__setRpc(async () => ({ data: 'otro-id', error: null }))
  const antes = S.__llamadas.rpc.length
  await S.guardarAltaPrestamo()
  chk('validación local: no manda y lo dice pegado al botón', S.__llamadas.rpc.length === antes && S.__els.get('ad-pr-error').textContent === 'Poné un nombre al préstamo.' && S.__els.get('ad-pr-error').hidden === false)
  Object.assign(b, { nombre: 'Otro', total: 100, cantidad: 1, primerVenc: '2026-11-01' })
  S.armarCuotasAlta(b)
  S.__setRpc(async () => ({ data: null, error: { message: 'La cuota 1 tiene que tener un importe mayor a cero. ' + MARCA('base') } }))
  await S.guardarAltaPrestamo()
  chk('el error de la base va TAL CUAL', S.__els.get('ad-pr-error').textContent === 'La cuota 1 tiene que tener un importe mayor a cero. ' + MARCA('base') && b.enviando === false)

  // XSS del formulario
  const X = nuevo()
  X.estado.empresas = [{ id: 'u' + MARCA('idempresa'), nombre: 'E' + MARCA('empresa') }]
  X.abrirAltaPrestamo()
  Object.assign(X.estado.prestamos.alta, { nombre: MARCA('nombre'), acreedor: MARCA('acreedor'), observaciones: '</textarea>' + MARCA('obs') })
  X.pintarAltaPrestamo()
  const hx = html(X, 'ad-prestamo-alta')
  chk('XSS en el alta: ninguna marca cruda', !crudo(hx) && !/<\/textarea><img/.test(hx))
  chk('XSS en el alta: escapadas', ['idempresa', 'empresa', 'nombre', 'acreedor', 'obs'].every(c => escapada(hx, c)))
  chk('una sola empresa: viene elegida', X.estado.prestamos.alta.unidad === 'u' + MARCA('idempresa'))
})())

// ── 4. El detalle y anular un pago ───────────────────────────────────────────
esperas.push((async () => {
  const S = nuevo()
  S.__setRpc(async (n) => n === 'prestamo_detalle' ? { data: DETALLE, error: null } : { data: null, error: null })
  await S.abrirPrestamoAd('p-1')
  chk('pide el detalle', JSON.stringify(S.__llamadas.rpc.at(-1)) === JSON.stringify(['prestamo_detalle', { p_prestamo_id: 'p-1' }]))
  chk('el título es el nombre', S.__els.get('ad-prestamo-titulo').textContent === 'Préstamo Galicia')
  let h = html(S, 'ad-prestamo-cuerpo')
  chk('los datos: total, pagado y saldo', /US\$ 20\.000,00/.test(h) && /US\$ 6\.200,00/.test(h) && /US\$ 13\.800,00/.test(h) && /Tasa fija/.test(h))
  chk('cada cuota con su barra de % pagado', (h.match(/role="progressbar"/g) || []).length === 4 && /aria-valuenow="24"[^>]*><span style="width: 24%">/.test(h) && /ad-prestamo-barra ad-prestamo-barra--completa/.test(h), h)
  chk('la barra se corta entre 0 y 100', S.pctCuota({ pct: 150 }) === 100 && S.pctCuota({ pct: -5 }) === 0 && S.pctCuota({ pct: null }) === 0)
  chk('cada cuota dice pagado y falta', /Pagado US\$ 1\.200,00 \(24 %\) · falta US\$ 3\.800,00/.test(h))
  chk('los pagos: fecha, cuota, monto, tipo de cambio, imputado, cuenta, cómo y quién', /01\/10\/2026 · cuota 2/.test(h) && /\$ 1\.560\.000,00/.test(h) && /a 1\.300 = US\$ 1\.200,00 · desde «Banco Nación» · Transferencia · cargó Pablo/.test(h), h)
  chk('el anulado va tachado con su motivo y sin botón', /ad-prestamo-pago ad-prestamo-pago--anulado" data-pago="pg-3"/.test(h) && /Anulado: Cargado dos veces/.test(h) && !/data-pago-anular="pg-3"/.test(h))
  chk('los demás tienen «Anular pago»', /data-pago-anular="pg-1"/.test(h) && /data-pago-anular="pg-2"/.test(h))
  chk('el botón Editar aparece', S.__els.get('ad-prestamo-editar').hidden === false)

  S.pedirAnularPago('pg-2')
  h = html(S, 'ad-prestamo-cuerpo')
  chk('anular abre un panel propio en ese pago (nunca confirm)', /data-pago="pg-2"[\s\S]*id="ad-pago-motivo"[\s\S]*id="ad-pago-si"/.test(h) && !/confirm\(/.test(src.slice(src.indexOf('function pedirAnularPago'), src.indexOf('function pagadoPorCuota'))))
  const antes = S.__llamadas.rpc.length
  await S.confirmarAnularPago()
  chk('sin motivo: no manda y dice «Poné el motivo.»', S.__llamadas.rpc.length === antes && S.__els.get('ad-pago-error').textContent === 'Poné el motivo.')
  S.estado.prestamoAd.anulando.motivo = 'ab'
  await S.confirmarAnularPago()
  chk('motivo de 2 letras: tampoco', S.__llamadas.rpc.length === antes)
  let soltar = []
  S.__setRpc(async (n) => {
    if (n === 'anular_pago_prestamo') return new Promise(r => soltar.push(r))
    if (n === 'prestamo_detalle') return { data: DETALLE, error: null }
  })
  S.estado.prestamoAd.anulando.motivo = '  Se cargó mal  '
  const a1 = S.confirmarAnularPago(), a2 = S.confirmarAnularPago()
  soltar.forEach(r => r({ data: null, error: null }))
  await a1; await a2
  const anular = S.__llamadas.rpc.filter(r => r[0] === 'anular_pago_prestamo')
  chk('un doble toque anula UNA vez', anular.length === 1)
  chk('manda el pago y el motivo', JSON.stringify(anular[0][1]) === JSON.stringify({ p_pago_id: 'pg-2', p_motivo: 'Se cargó mal' }))
  chk('después avisa y vuelve a leer el préstamo', /Pago anulado/.test(S.__llamadas.exitos.at(-1)) && S.__llamadas.rpc.at(-1)[0] === 'prestamo_detalle' && S.estado.prestamoAd.anulando === null)

  S.pedirAnularPago('pg-1')
  S.estado.prestamoAd.anulando.motivo = 'Error de carga'
  S.__setRpc(async (n) => n === 'anular_pago_prestamo' ? { data: null, error: { message: 'Ese pago ya está anulado.' } } : { data: DETALLE, error: null })
  await S.confirmarAnularPago()
  chk('el error de la base va TAL CUAL, pegado al botón', S.__els.get('ad-pago-error').textContent === 'Ese pago ya está anulado.' && S.__els.get('ad-pago-error').hidden === false && S.estado.prestamoAd.anulando.enviando === false)
  S.cancelarAnularPago()
  chk('No cierra el panel', S.estado.prestamoAd.anulando === null)

  // Si el detalle falla
  const F = nuevo()
  F.__setRpc(async () => ({ data: null, error: { message: 'x' } }))
  await F.abrirPrestamoAd('p-1')
  chk('si el detalle falla lo dice', /No se pudo leer el préstamo/.test(html(F, 'ad-prestamo-cuerpo')) && F.__els.get('ad-prestamo-editar').hidden === true)

  // XSS del detalle
  const X = nuevo()
  const malo = JSON.parse(JSON.stringify(DETALLE))
  Object.assign(malo.prestamo, { unidad: MARCA('unidad'), acreedor: MARCA('acreedor'), observaciones: MARCA('obs') })
  Object.assign(malo.pagos[1], { cuenta: MARCA('cuenta'), cargado_por: MARCA('quien') })
  malo.pagos[2].anulado_motivo = MARCA('motivo')
  malo.pagos[0].id = 'p"' + MARCA('idpago')
  malo.cuotas[0].id = 'q' + MARCA('idcuota')
  X.__setRpc(async () => ({ data: malo, error: null }))
  await X.abrirPrestamoAd('p-1')
  X.pedirAnularPago('pg-2')
  X.estado.prestamoAd.anulando.motivo = '</textarea>' + MARCA('motivoescrito')
  X.pintarPrestamoAd()
  const hx = html(X, 'ad-prestamo-cuerpo')
  chk('XSS en el detalle: ninguna marca cruda', !crudo(hx) && !/<\/textarea><img/.test(hx))
  chk('XSS en el detalle: el id de la cuota', escapada(hx, 'idcuota'))
  X.cancelarAnularPago()
  X.abrirEditarPrestamo()
  Object.assign(X.estado.prestamoAd.editar, { nombre: MARCA('enombre'), acreedor: MARCA('eacreedor'), observaciones: '</textarea>' + MARCA('eobs') })
  X.pintarPrestamoAd()
  const he = html(X, 'ad-prestamo-cuerpo')
  chk('XSS al editar: ninguna marca cruda', !crudo(he) && !/<\/textarea><img/.test(he))
  chk('XSS al editar: escapadas', ['enombre', 'eacreedor', 'eobs'].every(c => escapada(he, c)))
  chk('XSS en el detalle: escapadas', ['unidad', 'acreedor', 'obs', 'cuenta', 'quien', 'motivo', 'idpago', 'motivoescrito'].every(c => escapada(hx, c)),
    ['unidad', 'acreedor', 'obs', 'cuenta', 'quien', 'motivo', 'idpago', 'motivoescrito'].filter(c => !escapada(hx, c)).join(','))
})())

// ── 5. Editar ────────────────────────────────────────────────────────────────
esperas.push((async () => {
  const S = nuevo()
  S.__setRpc(async (n) => n === 'prestamo_detalle' ? { data: DETALLE, error: null } : { data: null, error: null })
  await S.abrirPrestamoAd('p-1')
  S.abrirEditarPrestamo()
  const e = S.estado.prestamoAd.editar
  chk('editar arranca con los datos y las cuotas', e.nombre === 'Préstamo Galicia' && e.cuotas.length === 4 && e.cuotas[1].importe === 5000)
  let h = html(S, 'ad-prestamo-cuerpo')
  chk('el panel de edición: cuotas con lo pagado, agregar y quitar la última', /id="ad-pe-panel"/.test(h) && /Pagado US\$ 1\.200,00/.test(h) && /id="ad-pe-agregar"/.test(h) && /id="ad-pe-quitar"/.test(h))
  S.agregarCuotaEdicion()
  chk('agregar una cuota: un mes después de la última', e.cuotas.length === 5 && e.cuotas[4].vencimiento === '2027-01-10' && e.cuotas[4].importe === null)
  S.quitarUltimaCuotaEdicion()
  chk('quitar la última', e.cuotas.length === 4)
  const V = (cambios) => S.validarEditarPrestamo({ ...e, ...cambios }, DETALLE)
  chk('sin cambios: sin error', V({}) === null)
  chk('una cuota por debajo de lo pagado', nb(V({ cuotas: e.cuotas.map((c, i) => i === 1 ? { ...c, importe: 1000 } : c) })) === 'La cuota 2 ya tiene pagado US$ 1.200,00: no puede valer menos.')
  chk('sacar una cuota con pagos', V({ cuotas: e.cuotas.slice(0, 1) }) === 'Hay cuotas con pagos (aunque estén anulados) que quedarían afuera: no se pueden sacar.')
  chk('nombre corto', V({ nombre: 'x' }) === 'Poné un nombre al préstamo.')
  // La cuota 2 tiene pagos (uno anulado): con dos cuotas no se ofrece quitar la última.
  e.cuotas = e.cuotas.slice(0, 2)
  S.pintarPrestamoAd()
  chk('no se ofrece quitar una cuota con pagos', !/id="ad-pe-quitar"/.test(html(S, 'ad-prestamo-cuerpo')))
  S.quitarUltimaCuotaEdicion()
  chk('y no se quita aunque se llame', e.cuotas.length === 2)
  e.cuotas = DETALLE.cuotas.map(c => ({ vencimiento: c.vencimiento, importe: c.importe }))
  e.cuotas[3].importe = 6000
  e.acreedor = ''
  const p = S.parametrosEditarPrestamo('p-1', e)
  chk('parámetros de editar_prestamo', JSON.stringify(p) === JSON.stringify({ p_prestamo_id: 'p-1', p_nombre: 'Préstamo Galicia', p_acreedor: null, p_observaciones: 'Tasa fija',
    p_cuotas: [{ vencimiento: '2026-09-10', importe: 5000 }, { vencimiento: '2026-10-10', importe: 5000 }, { vencimiento: '2026-11-10', importe: 5000 }, { vencimiento: '2026-12-10', importe: 6000 }] }), JSON.stringify(p))
  let soltar = []
  S.__setRpc(async (n) => n === 'editar_prestamo' ? new Promise(r => soltar.push(r)) : { data: DETALLE, error: null })
  const g1 = S.guardarEditarPrestamo(), g2 = S.guardarEditarPrestamo()
  soltar.forEach(r => r({ data: null, error: null }))
  await g1; await g2
  chk('un doble toque guarda UNA vez', S.__llamadas.rpc.filter(r => r[0] === 'editar_prestamo').length === 1)
  chk('después avisa y vuelve a leer', S.__llamadas.exitos.at(-1) === 'Préstamo actualizado.' && S.estado.prestamoAd.editar === null)
  S.abrirEditarPrestamo()
  S.__setRpc(async (n) => n === 'editar_prestamo' ? { data: null, error: { message: 'La cuota 2 ya tiene pagado 1200.00: no puede valer menos.' } } : { data: DETALLE, error: null })
  await S.guardarEditarPrestamo()
  chk('el error de la base va TAL CUAL', S.__els.get('ad-pe-error').textContent === 'La cuota 2 ya tiene pagado 1200.00: no puede valer menos.' && S.__els.get('ad-pe-error').hidden === false)
})())

// ── 6. Dónde se engancha ─────────────────────────────────────────────────────
{
  chk('la sección se abre desde la pestaña o la portada', /else if \(id === 'prestamos'\) mostrarPrestamos\(\)/.test(src))
  chk('la portada cuenta los préstamos', /if \(SECCIONES\.some\(s => s\.id === 'prestamos' && seccionVisible\(s\)\)\) contarPrestamosPortada\(p, turno\)/.test(src))
  chk('la lista sigue a la barra de arriba', /if \(estado\.vista === 'ad-vista-prestamos'\) mostrarPrestamos\(\)/.test(src))
  chk('los eventos se conectan', /\n      conectarPrestamosAd\(\)\n/.test(src))
  chk('lo vencido en bordó le gana al gris de .ad-fila__meta (que viene más abajo)', /\.ad-fila__meta\.ad-prestamo-vencida \{ color: var\(--bordo-oscuro\)/.test(src))
  chk('en el celular la fecha y el importe de cada cuota van uno abajo del otro', /@media \(max-width: 520px\) \{\n\s*\.ad-prestamo-cuota-fila \{ grid-template-columns: 1\.75rem minmax\(0, 1fr\); \}/.test(src))
  chk('las dos vistas existen', /<section id="ad-vista-prestamos" hidden>/.test(src) && /<section id="ad-vista-prestamo" hidden>/.test(src))
}

fin()
