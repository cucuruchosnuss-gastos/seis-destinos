// Suite: pagar la cuota de un préstamo desde el wizard de Gastos (13/10/2026).
//
// Con la empresa elegida y la categoría «Préstamos», quien tiene
// gastos:gastos_empresa ve los préstamos activos de esa empresa
// (prestamos_activos) y paga UNA cuota con pagar_cuota_prestamo(p_cuota_id,
// p_fecha, p_tipo_cambio, p_partes). Se EJECUTA el código real (cálculo,
// validación, parámetros, renders, el pago) con un document y un Supabase
// falsos.
//
//   node pruebas/test-gastos-prestamos.js
//   ARCHIVO_TEST=otra-copia.html node pruebas/test-gastos-prestamos.js

const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer } = require('./circuito-comun')
const { fuenteNumeros, inputFalso } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/gastos.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const NUSS = 'u-n'
const CAT_PRESTAMOS = 'cat-p', CAT_OTRA = 'cat-o'

const PRELUDIO = fuenteNumeros() + `
  var console = { log(){}, warn(){}, error(){} }
  function nuevoEl(id) {
    const el = { id, innerHTML: '', textContent: '', value: '', className: '', hidden: false, disabled: false,
      style: {}, dataset: {}, __on: {}, addEventListener(t, f) { el.__on[t] = f } }
    return el
  }
  var __els = new Map()
  var __campos = {}
  var document = { getElementById(id) {
    if (__campos[id]) return __campos[id]
    if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) } }
  var __hoy = '2026-10-13'
  function hoyIsoAr() { return __hoy }
  var __exitos = [], __errores = [], __cerrados = 0
  function mostrarExito(m) { __exitos.push(m) }
  function mostrarError(m) { __errores.push(m) }
  function cerrarWizard() { __cerrados++ }
  var categoriaSeleccionada = null, unidadSeleccionada = null, viaVehiculos = false
  var turnoPrestamos = 0
  var __rpcs = []
  var __rpc = async () => ({ data: null, error: null })
  var __tablas = { cuentas_caja: [], v_empleados_publico: [] }
  var supabase = {
    from(tabla) {
      const f = []
      const q = {
        select() { return q }, eq(a, b) { f.push([a, b]); return q }, maybeSingle() { q.uno = true; return q },
        then(res, rej) {
          let filas = (__tablas[tabla] ?? []).filter(r => f.every(([a, b]) => r[a] === b))
          return Promise.resolve({ data: q.uno ? (filas[0] ?? null) : filas, error: null }).then(res, rej)
        },
      }
      return q
    },
    rpc(nombre, params) { __rpcs.push([nombre, JSON.parse(JSON.stringify(params ?? null))]); return Promise.resolve(__rpc(nombre, params)) },
  }
  var estado = {
    miEmpleadoId: 'emp-yo', miRolApp: 'usuario', misTareas: new Set(['gastos:gastos_empresa']),
    cuentasPorId: {}, idEmpresa: null, nombreEmpresa: null,
    maestros: {
      categorias: [{ id: '${CAT_PRESTAMOS}', nombre: 'Préstamos' }, { id: '${CAT_OTRA}', nombre: 'Combustible' }],
      unidades: [{ id: '${NUSS}', nombre: 'Cucuruchos Nuss' }],
    },
    prestamo: null,
  }
`
const FUNCIONES = ['esc', 'formatearImporte', 'formatearFecha', 'tieneTarea', 'puedeUsarCuentasEmpresa', 'cargarCuentasDe', 'cuentasDe', 'resolverEmpresa',
  'esCategoriaPrestamos', 'vaAPrestamos', 'pintarAvisoPermisoPrestamos', 'redondearPlata', 'centavosPrestamo', 'numeroPositivo',
  'textoTipoCambio', 'fechaPrestamo', 'mesDeCuota', 'nombreCuota', 'imputadoDeParte', 'necesitaTipoCambio', 'calcularPagoPrestamo',
  'textoTePasas', 'textoCalculoPrestamo', 'validarPagoPrestamo', 'parametrosPagoPrestamo', 'textoResultadoPrestamo',
  'cargarCuentasPrestamo', 'cuentaActivaPrestamo', 'cuentasParaPrestamo', 'abrirPrestamos', 'cuotaElegidaPrestamo', 'cuotasConSaldo',
  'parteNuevaPrestamo', 'reiniciarPartesPrestamo', 'elegirPrestamo', 'elegirCuotaPrestamo', 'volverAPrestamos', 'agregarPartePrestamo',
  'quitarPartePrestamo', 'cambiarMonedaParte', 'htmlTarjetaPrestamo', 'htmlOpcionesCuentaPrestamo', 'htmlPartePrestamo', 'htmlPagoPrestamo',
  'htmlPrestamos', 'enlazarCamposPrestamo', 'pintarPrestamos', 'pintarCalculoPrestamo', 'pintarErrorPrestamo', 'pintarBotonPagarPrestamo',
  'pagarCuotaPrestamo', 'conectarPrestamos']
const CONSTANTES = ['MEDIO_CUENTA_LABEL', 'NOMBRE_CATEGORIA_PRESTAMOS', 'MONEDAS_PRESTAMO', 'NOMBRE_MONEDA_PRESTAMO', 'MESES_PRESTAMO', 'TEXTO_SIN_PERMISO_PRESTAMOS']
const RETORNO = `estado, TEXTO_SIN_PERMISO_PRESTAMOS, __el(id){ return document.getElementById(id) }, __campos, __rpcs, __exitos, __errores, __tablas,
  __cerrados(){ return __cerrados }, __setRpc(f){ __rpc = f }, __set(k, v){ eval(k + ' = v') }, __get(k){ return eval(k) },
  ponerNumero, leerCampoNumero, enlazarCampoNumero`

function sb() { return construirCon(ARCHIVO, { preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES, retorno: RETORNO }) }
const esperar = () => new Promise(r => setTimeout(r, 0))

// Datos: un préstamo en dólares con la cuota de octubre (falta USD 5.000) y
// la de noviembre; las cuentas de quien carga y de la Empresa.
const MARCA = (c) => `"><img src=x data-xss="${c}">`
function prestamoUsd(extra = {}) {
  return {
    id: 'p-1', unidad_negocio_id: NUSS, unidad: 'Cucuruchos Nuss', nombre: 'Préstamo Galicia', acreedor: 'Banco Galicia', moneda: 'USD',
    estado: 'activo', total: 20000, pagado: 5000, saldo: 15000, cuotas: 4, cuotas_pagas: 1,
    proxima: { cuota_id: 'q-2', numero: 2, vencimiento: '2026-10-10', importe: 5000, pagado: 0, falta: 5000 }, ...extra,
  }
}
const DETALLE = {
  prestamo: { id: 'p-1', moneda: 'USD', nombre: 'Préstamo Galicia' },
  cuotas: [
    { id: 'q-1', numero: 1, vencimiento: '2026-09-10', importe: 5000, pagado: 5000, falta: 0, pct: 100 },
    { id: 'q-2', numero: 2, vencimiento: '2026-10-10', importe: 5000, pagado: 0, falta: 5000, pct: 0 },
    { id: 'q-3', numero: 3, vencimiento: '2026-11-10', importe: 5000, pagado: 1200, falta: 3800, pct: 24 },
  ],
  pagos: [],
}
function cuentas(S) {
  S.__tablas.cuentas_caja = [
    { id: 'c-ars-yo', empleado_id: 'emp-yo', nombre: 'Mi efectivo', medio: 'efectivo', moneda: 'ARS', activa: true },
    { id: 'c-usd-yo', empleado_id: 'emp-yo', nombre: 'Mis dólares', medio: 'efectivo', moneda: 'USD', activa: true },
    { id: 'c-usd-vieja', empleado_id: 'emp-yo', nombre: 'Vieja', medio: 'efectivo', moneda: 'USD', activa: false },
    { id: 'c-ars-emp', empleado_id: 'emp-empresa', nombre: 'Banco Nación', medio: 'banco', moneda: 'ARS', activa: true },
  ]
  S.__tablas.v_empleados_publico = [{ id: 'emp-empresa', nombre: 'Empresa', tipo: 'empresa' }]
}

// ── 1. Cuándo va al paso del préstamo ────────────────────────────────────────
{
  const S = sb()
  S.__set('unidadSeleccionada', NUSS); S.__set('categoriaSeleccionada', CAT_PRESTAMOS)
  chk('empresa + «Préstamos» + gastos_empresa: va al préstamo', S.vaAPrestamos() === true)
  S.__set('categoriaSeleccionada', CAT_OTRA)
  chk('otra categoría: formulario común', S.vaAPrestamos() === false)
  S.__set('categoriaSeleccionada', CAT_PRESTAMOS); S.__set('viaVehiculos', true)
  chk('por Vehículos: formulario común', S.vaAPrestamos() === false)
  S.__set('viaVehiculos', false); S.__set('unidadSeleccionada', null)
  chk('sin empresa: formulario común', S.vaAPrestamos() === false)
  S.__set('unidadSeleccionada', NUSS); S.estado.misTareas = new Set()
  chk('sin gastos_empresa: formulario común', S.vaAPrestamos() === false)
  S.pintarAvisoPermisoPrestamos()
  const av = S.__el('aviso-prestamo-permiso')
  chk('sin el permiso, Detalles lo dice en una línea chica', av.hidden === false && av.textContent === S.TEXTO_SIN_PERMISO_PRESTAMOS && /pide el permiso/.test(av.textContent))
  S.estado.miRolApp = 'super_admin'
  chk('super_admin entra por el bypass', S.vaAPrestamos() === true)
  S.pintarAvisoPermisoPrestamos()
  chk('con el permiso la línea no se ve y queda vacía', av.hidden === true && av.textContent === '')
  S.estado.miRolApp = 'usuario'; S.__set('categoriaSeleccionada', CAT_OTRA)
  S.pintarAvisoPermisoPrestamos()
  chk('otra categoría sin permiso: no avisa', av.hidden === true)
}

// ── 2. El cálculo (igual que la base) ────────────────────────────────────────
{
  const S = sb()
  chk('redondeo a 2 como la base: 1,005 → 1,01', S.redondearPlata(1.005) === 1.01)
  chk('redondeo: 333,3333… → 333,33', S.redondearPlata(1000 / 3) === 333.33)
  chk('préstamo en USD, parte en USD: tal cual', S.imputadoDeParte({ moneda: 'USD', monto: 2000 }, 'USD', null) === 2000)
  chk('préstamo en USD, parte en pesos: DIVIDE por el tipo de cambio', S.imputadoDeParte({ moneda: 'ARS', monto: 2600000 }, 'USD', 1300) === 2000)
  chk('préstamo en pesos, parte en USD: MULTIPLICA', S.imputadoDeParte({ moneda: 'USD', monto: 1000 }, 'ARS', 1300.5) === 1300500)
  chk('la conversión se redondea a 2 (1000 / 3 = 333,33)', S.imputadoDeParte({ moneda: 'ARS', monto: 1000 }, 'USD', 3) === 333.33)
  chk('el monto se redondea antes de convertir (10,005 → 10,01)', S.imputadoDeParte({ moneda: 'USD', monto: 10.005 }, 'USD', null) === 10.01)
  chk('otra moneda sin tipo de cambio: no se sabe (null)', S.imputadoDeParte({ moneda: 'ARS', monto: 1000 }, 'USD', null) === null)
  chk('sin monto: null', S.imputadoDeParte({ moneda: 'USD', monto: null }, 'USD', 1) === null && S.imputadoDeParte({ moneda: 'USD', monto: 0 }, 'USD', 1) === null)

  const partes = [{ moneda: 'USD', monto: 2000 }, { moneda: 'ARS', monto: 2600000 }]
  const c = S.calcularPagoPrestamo({ moneda: 'USD', falta: 5000, partes, tc: 1300 })
  chk('el ejemplo: USD 2.000 + $ 2.600.000 a 1.300 = USD 4.000, quedan 1.000', c.imputado === 4000 && c.queda === 1000 && c.pasa === false && c.completo === true, JSON.stringify(c))
  chk('pasarse por más de 0,01 se marca', S.calcularPagoPrestamo({ moneda: 'USD', falta: 5000, partes: [{ moneda: 'USD', monto: 5000.02 }], tc: null }).pasa === true)
  chk('hasta 0,01 de más entra (la tolerancia de la base)', S.calcularPagoPrestamo({ moneda: 'USD', falta: 5000, partes: [{ moneda: 'USD', monto: 5000.01 }], tc: null }).pasa === false)
  chk('la suma va en centavos (0,1 + 0,2 = 0,3 exacto)', S.calcularPagoPrestamo({ moneda: 'ARS', falta: 1, partes: [{ moneda: 'ARS', monto: 0.1 }, { moneda: 'ARS', monto: 0.2 }], tc: null }).imputado === 0.3)

  const t = S.textoCalculoPrestamo({ moneda: 'USD', cuota: { id: 'q', numero: 2, vencimiento: '2026-10-10', falta: 5000 }, partes, tc: 1300 }, '2026-10-13')
  chk('el texto en vivo del ejemplo', t.texto === 'Pagás USD 2.000,00 + $ 2.600.000,00 a 1.300 = USD 4.000,00; quedan USD 1.000,00 de la cuota de octubre.' && !t.mal, t.texto)
  const t2 = S.textoCalculoPrestamo({ moneda: 'USD', cuota: { id: 'q', numero: 2, vencimiento: '2026-10-10', falta: 5000 }, partes: [{ moneda: 'USD', monto: 5000 }], tc: null }, '2026-10-13')
  chk('pagando todo: la cuota queda paga', t2.texto === 'Pagás USD 5.000,00; la cuota de octubre queda paga.', t2.texto)
  const t3 = S.textoCalculoPrestamo({ moneda: 'USD', cuota: { id: 'q', numero: 2, vencimiento: '2027-01-10', falta: 5000 }, partes: [{ moneda: 'USD', monto: 100 }], tc: null }, '2026-10-13')
  chk('una cuota de otro año dice el año', /de la cuota de enero de 2027\.$/.test(t3.texto), t3.texto)
  const t4 = S.textoCalculoPrestamo({ moneda: 'USD', cuota: { id: 'q', numero: 2, vencimiento: '2026-10-10', falta: 5000 }, partes, tc: null }, '2026-10-13')
  chk('sin tipo de cambio lo pide', /Poné el tipo de cambio/.test(t4.texto) && !t4.mal)
  const t5 = S.textoCalculoPrestamo({ moneda: 'USD', cuota: { id: 'q', numero: 2, vencimiento: '2026-10-10', falta: 5000 }, partes: [{ moneda: 'USD', monto: 6000 }], tc: null }, '2026-10-13')
  chk('pasarse: el texto lo dice y va en rojo', t5.mal === true && /Te pasás: de la cuota 2 faltan USD 5\.000,00 y estás pagando USD 6\.000,00\. Lo que sobra cargalo en la cuota siguiente\./.test(t5.texto), t5.texto)
  chk('sin monto: «Escribí cuánto pagás.»', S.textoCalculoPrestamo({ moneda: 'USD', cuota: { id: 'q', falta: 1 }, partes: [{ moneda: 'USD', monto: null }] }).texto === 'Escribí cuánto pagás.')
  chk('el tipo de cambio sin ceros de más (1.300 / 1.300,5)', S.textoTipoCambio(1300) === '1.300' && S.textoTipoCambio(1300.5) === '1.300,5')
}

// ── 3. Validar con los textos de la base ─────────────────────────────────────
{
  const S = sb()
  cuentas(S)
  for (const c of S.__tablas.cuentas_caja) S.estado.cuentasPorId[c.id] = c
  const cuota = { id: 'q-2', numero: 2, vencimiento: '2026-10-10', falta: 5000 }
  const base = { cuota, moneda: 'USD', partes: [{ moneda: 'USD', monto: 1000, cuentaId: 'c-usd-yo' }], tc: null, fecha: '2026-10-13' }
  const v = (cambios) => S.validarPagoPrestamo({ ...base, ...cambios }, '2026-10-13')
  chk('todo bien: sin error', v({}) === null)
  chk('sin cuota', v({ cuota: null }) === 'Elegí la cuota que pagás.')
  chk('cuota paga', v({ cuota: { ...cuota, falta: 0 } }) === 'Esa cuota ya está paga.')
  chk('sin fecha', v({ fecha: '' }) === 'Falta la fecha del pago.')
  chk('fecha futura', v({ fecha: '2026-10-14' }) === 'La fecha no puede ser futura.')
  chk('sin partes', v({ partes: [] }) === 'Decí cómo lo pagás.')
  chk('moneda rara', v({ partes: [{ moneda: 'EUR', monto: 1, cuentaId: 'c-usd-yo' }] }) === 'Parte 1: la moneda tiene que ser pesos o dólares.')
  chk('monto cero', v({ partes: [{ moneda: 'USD', monto: 0, cuentaId: 'c-usd-yo' }] }) === 'Parte 1: el monto tiene que ser mayor a cero.')
  chk('monto que redondea a cero', v({ partes: [{ moneda: 'USD', monto: 0.001, cuentaId: 'c-usd-yo' }] }) === 'Parte 1: el monto tiene que ser mayor a cero.')
  chk('sin cuenta (dice el número de parte)', v({ partes: [base.partes[0], { moneda: 'USD', monto: 1, cuentaId: null }] }) === 'Parte 2: elegí la cuenta de donde sale la plata.')
  chk('cuenta inactiva = sin cuenta', v({ partes: [{ moneda: 'USD', monto: 1, cuentaId: 'c-usd-vieja' }] }) === 'Parte 1: elegí la cuenta de donde sale la plata.')
  chk('cuenta de otra moneda', v({ partes: [{ moneda: 'USD', monto: 1, cuentaId: 'c-ars-yo' }] }) === 'Parte 1: la cuenta Mi efectivo es en ARS, no en USD.')
  chk('otra moneda sin tipo de cambio', v({ partes: [{ moneda: 'ARS', monto: 1000, cuentaId: 'c-ars-yo' }] }) === 'Poné el tipo de cambio (pesos por dólar).')
  chk('con tipo de cambio pasa', v({ partes: [{ moneda: 'ARS', monto: 1000, cuentaId: 'c-ars-yo' }], tc: 1300 }) === null)
  chk('pasarse', /^Te pasás: de la cuota 2 faltan/.test(v({ partes: [{ moneda: 'USD', monto: 5000.02, cuentaId: 'c-usd-yo' }] }) ?? ''))

  const p = S.parametrosPagoPrestamo({ ...base, partes: [{ moneda: 'USD', monto: 2000, cuentaId: 'c-usd-yo' }, { moneda: 'ARS', monto: 2600000.004, cuentaId: 'c-ars-emp' }], tc: 1300 })
  chk('parámetros de pagar_cuota_prestamo (con tipo de cambio)', JSON.stringify(p) === JSON.stringify({ p_cuota_id: 'q-2', p_fecha: '2026-10-13', p_tipo_cambio: 1300,
    p_partes: [{ moneda: 'USD', monto: 2000, cuenta_id: 'c-usd-yo' }, { moneda: 'ARS', monto: 2600000, cuenta_id: 'c-ars-emp' }] }), JSON.stringify(p))
  const p2 = S.parametrosPagoPrestamo({ ...base, tc: 1300 })
  chk('todo en la moneda del préstamo: el tipo de cambio va null', p2.p_tipo_cambio === null)
}

// ── 4. La lista, elegir, la cuota, las partes ───────────────────────────────
esperas.push((async () => {
  const S = sb()
  cuentas(S)
  S.__set('unidadSeleccionada', NUSS)
  const conMarcas = prestamoUsd({ nombre: 'P ' + MARCA('nombre'), acreedor: MARCA('acreedor') })
  S.__setRpc(async (n) => n === 'prestamos_activos'
    ? { data: [conMarcas, prestamoUsd({ id: 'p-c', estado: 'cancelado', nombre: 'Cancelado' })], error: null }
    : n === 'prestamo_detalle' ? { data: DETALLE, error: null } : { data: null, error: null })
  const abriendo = S.abrirPrestamos()
  chk('mientras lee dice «Cargando…»', /Cargando los préstamos/.test(S.__el('prestamo-cuerpo').innerHTML))
  await abriendo
  chk('pide los préstamos de la empresa elegida', JSON.stringify(S.__rpcs[0]) === JSON.stringify(['prestamos_activos', { p_unidad_negocio_id: NUSS }]))
  chk('el título nombra la empresa', S.__el('prestamo-titulo').textContent === 'Préstamos activos de Cucuruchos Nuss')
  let h = S.__el('prestamo-cuerpo').innerHTML
  chk('una tarjeta por préstamo activo (el cancelado no)', (h.match(/data-prestamo="/g) || []).length === 1 && !/Cancelado/.test(h))
  chk('la tarjeta dice saldo y próxima cuota con lo que falta', /Saldo USD 15\.000,00/.test(h) && /Próxima: cuota 2 de 4 · vence 10\/10\/2026 \(vencida\) · falta USD 5\.000,00/.test(h), h)
  chk('XSS: nombre y acreedor escapados', !/data-xss="/.test(h) && /data-xss=&quot;nombre&quot;/.test(h) && /data-xss=&quot;acreedor&quot;/.test(h))

  await S.elegirPrestamo('p-1')
  chk('elegir pide el detalle', JSON.stringify(S.__rpcs[1]) === JSON.stringify(['prestamo_detalle', { p_prestamo_id: 'p-1' }]))
  const pg = S.estado.prestamo.elegido
  chk('por defecto la cuota más vieja con saldo (la próxima)', pg.cuotaId === 'q-2')
  chk('una parte en la moneda del préstamo, con lo que falta', pg.partes.length === 1 && pg.partes[0].moneda === 'USD' && pg.partes[0].monto === 5000)
  chk('con una sola cuenta en esa moneda, viene elegida', pg.partes[0].cuentaId === 'c-usd-yo')
  chk('la fecha arranca hoy (Argentina)', pg.fecha === '2026-10-13')
  h = S.__el('prestamo-cuerpo').innerHTML
  chk('dice la cuota y cuánto falta', /Cuota 2 de 4 · vence 10\/10\/2026/.test(h) && /Faltan USD 5\.000,00/.test(h))
  chk('ofrece las otras cuotas con saldo (no la paga)', /data-cuota="q-2" aria-pressed="true"/.test(h) && /data-cuota="q-3" aria-pressed="false"/.test(h) && !/data-cuota="q-1"/.test(h))
  chk('la cuenta inactiva no se ofrece', !/Vieja/.test(h))
  chk('sin otra moneda, no hay tipo de cambio', !/id="prestamo-tc"/.test(h))
  chk('el cálculo ya está', /Pagás USD 5\.000,00; la cuota de octubre queda paga\./.test(h))
  chk('la fecha no deja elegir el futuro', /id="prestamo-fecha" max="2026-10-13" value="2026-10-13"/.test(h))
  chk('el error arranca escondido, pegado al botón', /id="prestamo-pagar"[^>]*>Pagar la cuota<\/button><p class="campo-error-pegado" id="prestamo-error" role="alert" hidden>/.test(h))

  S.elegirCuotaPrestamo('q-3')
  chk('elegir otra cuota pone lo que falta de esa', pg.cuotaId === 'q-3' && pg.partes[0].monto === 3800)
  S.elegirCuotaPrestamo('q-1')
  chk('una cuota paga no se puede elegir', pg.cuotaId === 'q-3')

  S.agregarPartePrestamo()
  chk('otra parte arranca en la otra moneda', pg.partes.length === 2 && pg.partes[1].moneda === 'ARS' && pg.partes[1].monto === null)
  h = S.__el('prestamo-cuerpo').innerHTML
  chk('con otra moneda aparece el tipo de cambio', /id="prestamo-tc"/.test(h))
  chk('la parte en pesos ofrece las cuentas en pesos, propias y de la Empresa', /Mi efectivo \(Efectivo ARS\)/.test(h) && /Banco Nación — Empresa \(Banco ARS\)/.test(h))
  chk('con dos cuentas posibles no elige ninguna', pg.partes[1].cuentaId === null)
  S.cambiarMonedaParte(1, 'USD')
  chk('cambiar la moneda suelta la cuenta y elige la única', pg.partes[1].moneda === 'USD' && pg.partes[1].cuentaId === 'c-usd-yo')
  S.quitarPartePrestamo(1)
  chk('quitar una parte', pg.partes.length === 1)
  S.quitarPartePrestamo(0)
  chk('la única parte no se quita', pg.partes.length === 1)
  S.volverAPrestamos()
  chk('volver a la lista', S.estado.prestamo.elegido === null && /data-prestamo="p-1"/.test(S.__el('prestamo-cuerpo').innerHTML))
})())

// ── 5. Los campos de plata y el cálculo en vivo ──────────────────────────────
esperas.push((async () => {
  const S = sb()
  cuentas(S)
  S.__set('unidadSeleccionada', NUSS)
  S.__setRpc(async (n) => n === 'prestamos_activos' ? { data: [prestamoUsd()], error: null } : { data: DETALLE, error: null })
  await S.abrirPrestamos()
  S.__campos['prestamo-parte-monto-0'] = inputFalso()
  S.__campos['prestamo-parte-monto-1'] = inputFalso()
  S.__campos['prestamo-tc'] = inputFalso()
  await S.elegirPrestamo('p-1')
  const monto = S.__campos['prestamo-parte-monto-0']
  chk('el monto se enlaza con el formato argentino y trae lo que falta', monto.type === 'text' && monto.value === '5.000', monto.value)
  S.conectarPrestamos()
  const cuerpo = S.__el('prestamo-cuerpo')
  monto.value = ''
  monto.teclear('2000')
  cuerpo.__on.input({ target: Object.assign(monto, { dataset: { parteMonto: '0' } }) })
  const pg = S.estado.prestamo.elegido
  chk('tipear el monto lo lee con leerCampoNumero', pg.partes[0].monto === 2000, String(pg.partes[0].monto))
  chk('y el cálculo se actualiza', S.__el('prestamo-calculo').textContent === 'Pagás USD 2.000,00; quedan USD 3.000,00 de la cuota de octubre.', S.__el('prestamo-calculo').textContent)
  S.agregarPartePrestamo()
  pg.partes[1].monto = 2600000
  const tc = S.__campos['prestamo-tc']
  tc.value = ''
  tc.teclear('1300')
  cuerpo.__on.input({ target: Object.assign(tc, { id: 'prestamo-tc', dataset: {} }) })
  chk('el tipo de cambio se lee', pg.tc === 1300)
  chk('el ejemplo, en vivo', S.__el('prestamo-calculo').textContent === 'Pagás USD 2.000,00 + $ 2.600.000,00 a 1.300 = USD 4.000,00; quedan USD 1.000,00 de la cuota de octubre.', S.__el('prestamo-calculo').textContent)
  pg.partes[1].monto = 5000000
  S.pintarCalculoPrestamo()
  chk('pasarse se pinta en rojo', /prestamo-calculo--mal/.test(S.__el('prestamo-calculo').className))
  cuerpo.__on.change({ target: { id: 'prestamo-fecha', value: '2026-10-01', dataset: {} } })
  chk('cambiar la fecha la guarda', pg.fecha === '2026-10-01')
  cuerpo.__on.change({ target: { value: 'c-ars-emp', dataset: { parteCuenta: '1' } } })
  chk('elegir la cuenta la guarda', pg.partes[1].cuentaId === 'c-ars-emp')
})())

// ── 6. Pagar ─────────────────────────────────────────────────────────────────
esperas.push((async () => {
  const S = sb()
  cuentas(S)
  S.__set('unidadSeleccionada', NUSS)
  // TODOS los que esperan: con un solo resolve, un segundo envío dejaría
  // colgado al primero y la suite terminaría sin decir nada.
  const esperando = []
  const soltar = () => esperando.splice(0).forEach(r => r({ data: { imputado: 4000, falta: 1000, moneda: 'USD', gastos: ['g1', 'g2'] }, error: null }))
  S.__setRpc(async (n, p) => {
    if (n === 'prestamos_activos') return { data: [prestamoUsd()], error: null }
    if (n === 'prestamo_detalle') return { data: DETALLE, error: null }
    if (n === 'pagar_cuota_prestamo') return new Promise(r => { esperando.push(r) })
  })
  await S.abrirPrestamos()
  await S.elegirPrestamo('p-1')
  const pg = S.estado.prestamo.elegido
  pg.partes = [{ moneda: 'USD', monto: 2000, cuentaId: 'c-usd-yo' }, { moneda: 'ARS', monto: 2600000, cuentaId: 'c-ars-emp' }]
  pg.tc = 1300
  const a = S.pagarCuotaPrestamo()
  const b = S.pagarCuotaPrestamo()
  chk('mientras manda, el botón se traba y lo dice', S.__el('prestamo-pagar').disabled === true && S.__el('prestamo-pagar').textContent === 'Registrando el pago…')
  soltar(); await a; await b
  const pagos = S.__rpcs.filter(r => r[0] === 'pagar_cuota_prestamo')
  chk('un doble toque manda UNA sola vez', pagos.length === 1, String(pagos.length))
  chk('manda lo de la pantalla', JSON.stringify(pagos[0][1]) === JSON.stringify({ p_cuota_id: 'q-2', p_fecha: '2026-10-13', p_tipo_cambio: 1300,
    p_partes: [{ moneda: 'USD', monto: 2000, cuenta_id: 'c-usd-yo' }, { moneda: 'ARS', monto: 2600000, cuenta_id: 'c-ars-emp' }] }), JSON.stringify(pagos[0]))
  chk('después dice qué se imputó y qué falta', S.__exitos[0] === 'Pago registrado: se imputaron USD 4.000,00 a la cuota de octubre de «Préstamo Galicia»; quedan USD 1.000,00 de esa cuota.', S.__exitos[0])
  chk('y vuelve a la lista de gastos como el wizard normal', S.__cerrados() === 1)
})())

esperas.push((async () => {
  const S = sb()
  cuentas(S)
  S.__set('unidadSeleccionada', NUSS)
  const MSJ = 'Te pasás: de la cuota 2 faltan 5000.00 USD y estás pagando 6000.00 USD. Lo que sobra cargalo en la cuota siguiente.'
  S.__setRpc(async (n) => n === 'prestamos_activos' ? { data: [prestamoUsd()], error: null }
    : n === 'prestamo_detalle' ? { data: DETALLE, error: null } : { data: null, error: { message: MSJ + ' ' + MARCA('base') } })
  await S.abrirPrestamos()
  await S.elegirPrestamo('p-1')
  const pg = S.estado.prestamo.elegido
  await S.pagarCuotaPrestamo()
  const err = S.__el('prestamo-error')
  chk('el error de la base va TAL CUAL, pegado al botón', err.hidden === false && err.textContent === MSJ + ' ' + MARCA('base'))
  chk('y no se cierra ni avisa éxito', S.__cerrados() === 0 && S.__exitos.length === 0)
  chk('el botón se suelta para reintentar', pg.enviando === false && S.__el('prestamo-pagar').disabled === false)

  // Validación local: no manda nada.
  const antes = S.__rpcs.length
  pg.partes = [{ moneda: 'ARS', monto: 1000, cuentaId: 'c-ars-yo' }]
  pg.tc = null
  await S.pagarCuotaPrestamo()
  chk('sin tipo de cambio no manda y lo dice pegado al botón', S.__rpcs.length === antes && err.textContent === 'Poné el tipo de cambio (pesos por dólar).' && err.hidden === false)
  pg.fecha = '2026-12-01'; pg.tc = 1300
  await S.pagarCuotaPrestamo()
  chk('fecha futura: no manda', S.__rpcs.length === antes && err.textContent === 'La fecha no puede ser futura.')
})())

// ── 7. Errores y vacíos de la lista; turnos ──────────────────────────────────
esperas.push((async () => {
  const S = sb()
  S.__set('unidadSeleccionada', NUSS)
  S.__setRpc(async () => ({ data: null, error: { message: 'falla' } }))
  await S.abrirPrestamos()
  let h = S.__el('prestamo-cuerpo').innerHTML
  chk('si la lectura falla lo dice con «Volver a intentar»', /No se pudieron leer los préstamos/.test(h) && /data-prestamo-reintentar/.test(h))
  S.__setRpc(async () => ({ data: [], error: null }))
  await S.abrirPrestamos()
  h = S.__el('prestamo-cuerpo').innerHTML
  {
    const X = sb()
    X.estado.maestros.unidades = [{ id: NUSS, nombre: 'E ' + MARCA('unidad') }]
    X.__set('unidadSeleccionada', NUSS)
    X.__setRpc(async () => ({ data: [], error: null }))
    await X.abrirPrestamos()
    const hx = X.__el('prestamo-cuerpo').innerHTML
    chk('XSS: el nombre de la empresa escapado', !/data-xss="/.test(hx) && /data-xss=&quot;unidad&quot;/.test(hx))
  }
  chk('sin préstamos lo dice y dice dónde se cargan', /Cucuruchos Nuss no tiene préstamos activos\. Se cargan en Administración → Préstamos\./.test(h), h)

  // Una respuesta vieja no pisa la nueva.
  const T = sb()
  T.__set('unidadSeleccionada', NUSS)
  let primera
  let n = 0
  T.__setRpc(async () => { n++; if (n === 1) return new Promise(r => { primera = r }); return { data: [prestamoUsd({ nombre: 'Nueva' })], error: null } })
  const vieja = T.abrirPrestamos()
  await T.abrirPrestamos()
  primera({ data: [prestamoUsd({ nombre: 'Vieja' })], error: null })
  await vieja
  chk('una respuesta vieja no pisa la nueva', /Nueva/.test(T.__el('prestamo-cuerpo').innerHTML) && !/Vieja/.test(T.__el('prestamo-cuerpo').innerHTML))

  // El detalle que falla: se paga la próxima.
  const U = sb()
  cuentas(U)
  U.__set('unidadSeleccionada', NUSS)
  U.__setRpc(async (nombre) => nombre === 'prestamos_activos' ? { data: [prestamoUsd()], error: null } : { data: null, error: { message: 'x' } })
  await U.abrirPrestamos()
  await U.elegirPrestamo('p-1')
  h = U.__el('prestamo-cuerpo').innerHTML
  chk('si el detalle falla, se paga la próxima y se dice', /se paga la próxima/.test(h) && /Cuota 2 de 4/.test(h) && U.estado.prestamo.elegido.cuotaId === 'q-2')
})())

// XSS en el pago: el nombre, el acreedor, las cuentas y la Empresa.
esperas.push((async () => {
  const S = sb()
  cuentas(S)
  S.__tablas.cuentas_caja.push({ id: 'c-mal', empleado_id: 'emp-yo', nombre: 'C ' + MARCA('cuenta'), medio: 'efectivo', moneda: 'USD', activa: true })
  S.__tablas.v_empleados_publico = [{ id: 'emp-empresa', nombre: 'E ' + MARCA('empresa'), tipo: 'empresa' }]
  S.__tablas.cuentas_caja.push({ id: 'c-usd-emp', empleado_id: 'emp-empresa', nombre: 'Caja USD', medio: 'efectivo', moneda: 'USD', activa: true })
  S.__set('unidadSeleccionada', NUSS)
  S.__setRpc(async (n) => n === 'prestamos_activos' ? { data: [prestamoUsd({ nombre: 'N ' + MARCA('nombre'), acreedor: MARCA('acreedor') })], error: null } : { data: DETALLE, error: null })
  await S.abrirPrestamos()
  await S.elegirPrestamo('p-1')
  const h = S.__el('prestamo-cuerpo').innerHTML
  const marcas = ['nombre', 'acreedor', 'cuenta', 'empresa']
  chk('XSS en el pago: ninguna marca cruda', !/data-xss="/.test(h))
  chk('XSS en el pago: las cuatro escapadas', marcas.every(m => h.includes(`data-xss=&quot;${m}&quot;`)), marcas.filter(m => !h.includes(`data-xss=&quot;${m}&quot;`)).join(','))
})())

// ── 8. Dónde se engancha en el wizard ────────────────────────────────────────
{
  chk('tocar una categoría va al préstamo si corresponde', /irASubpaso\(vaAPrestamos\(\) \? 'prestamo' : 'detalles'\)/.test(FUENTE))
  chk('entrar al paso del préstamo lo abre', /if \(id === 'prestamo'\) abrirPrestamos\(\)/.test(FUENTE))
  chk('el paso Detalles pinta la línea del permiso', /actualizarSelectorCuentaGasto\(\)\n\s*pintarAvisoPermisoPrestamos\(\)/.test(FUENTE))
  chk('el paso existe con su cuerpo, su título y Atrás', /<div class="paso" id="sp-prestamo">[\s\S]{0,900}id="prestamo-titulo"[\s\S]{0,600}id="prestamo-cuerpo"[\s\S]{0,300}id="btn-prestamo-atras"/.test(FUENTE))
  chk('la línea del permiso vive en Detalles, escondida', /id="sp-detalles">[\s\S]{0,400}id="aviso-prestamo-permiso" hidden/.test(FUENTE))
  chk('el préstamo cuenta como el paso 4 de la barra', /'detalles': 4, 'prestamo': 4,/.test(FUENTE))
  chk('Atrás vuelve a las categorías', /getElementById\('btn-prestamo-atras'\)\.addEventListener\('click', \(\) => irASubpaso\('categoria'\)\)/.test(FUENTE))
  chk('los eventos se conectan', /\n    conectarPrestamos\(\)\n/.test(FUENTE))
  chk('los campos del celular con letra de 16 px', /\.prestamo-parte input, \.prestamo-parte select, #prestamo-tc, #prestamo-fecha \{ font-size: 16px; min-height: 44px;/.test(FUENTE))
}

fin()
