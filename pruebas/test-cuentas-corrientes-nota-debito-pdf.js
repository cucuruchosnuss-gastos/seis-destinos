// CUENTAS CORRIENTES — EL PDF DE UNA NOTA DE DÉBITO DE PROVEEDOR (24/10/2026,
// rama ci-prueba/ajustes-24-10).
//
// En la cuenta del proveedor, la fila de una nota de débito que se cargó con
// PDF (notas_debito.archivo_url = la RUTA en el bucket privado
// 'comprobantes', <uid>/notas-debito/…) lleva "Ver PDF": firma un link de 5
// minutos (createSignedUrl(ruta, 300)) y lo abre en una pestaña que se abrió
// ANTES de esperar (si no, el navegador la frena). Verificado con SELECT a
// storage.buckets y pg_policies el 24/10/2026: el bucket es 'comprobantes'
// (privado) y la policy "comprobantes: ver PDFs de notas de débito" deja
// leer la carpeta notas-debito a quien puede ver la nota.
// Exige:
//  - se lee archivo_url de notas_debito;
//  - "Ver PDF" solo si la nota tiene archivo_url, con el id escapado;
//  - firma en 'comprobantes', la ruta tal cual, 300 segundos; abre la
//    pestaña antes y le pone el link (sin opener);
//  - si la firma falla: se cierra la pestaña y el error de la base TAL CUAL,
//    escapado, debajo de esa fila (no en las demás); al volver a probar bien,
//    se va;
//  - sin archivo_url no firma nada.
// Y nada de lo que había se perdió (ids y data-* de cuentas-corrientes.html
// en el commit FIJO d2d1dc1).
//
//   node pruebas/test-cuentas-corrientes-nota-debito-pdf.js
'use strict'

const fs = require('fs')
const path = require('path')
const { construirCon } = require('./sandbox')
const { arnes, leer, marca, chequearMarcas } = require('./circuito-comun')
const { fuenteNumeros } = require('./numeros-comun')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cuentas-corrientes.html')
const FUENTE = leer(ARCHIVO)
const { chk, esperas, fin } = arnes()

const PRELUDIO = `
  ${fuenteNumeros()}
  var console = { log(){}, warn(){}, error(){} }
  var CSS = { escape: (s) => String(s) }
  function nuevoEl(id) {
    const el = { id, innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, dataset: {}, style: {}, max: '', files: null,
      classList: { add(){}, remove(){}, toggle(){} },
      querySelectorAll: () => [], querySelector: () => null, addEventListener(){}, focus(){}, removeAttribute(k){ if (k === 'hidden') el.hidden = false } }
    return el
  }
  var __els = new Map()
  var document = {
    getElementById(id) { if (!__els.has(id)) __els.set(id, nuevoEl(id)); return __els.get(id) },
    querySelectorAll: () => [], querySelector: (s) => document.getElementById('qs:' + s), body: nuevoEl('body'),
  }
  var location = { href: 'https://x.test/modulos/cuentas-corrientes.html', pathname: '/modulos/cuentas-corrientes.html', search: '' }
  var history = { pushState() {}, replaceState() {} }
  var __pestanas = []
  var window = { open(url, destino) { const p = { url, destino, opener: 'yo', cerrada: false, location: { href: url }, close() { p.cerrada = true } }; __pestanas.push(p); return p } }
  var __datos = {}, __consultas = []
  function __consulta(tabla) {
    const filtros = [], registro = { tabla, eq: [], in: [] }
    __consultas.push(registro)
    const q = {
      select: (c) => { registro.select = c; return q }, order: () => q, limit: () => q, gte: () => q, lte: () => q,
      maybeSingle() { return q },
      eq(c, v) { registro.eq.push([c, v]); filtros.push(r => r[c] === v); return q },
      in(c, vs) { registro.in.push([c, vs]); filtros.push(r => vs.includes(r[c])); return q },
      then(res, rej) {
        const filas = (__datos[tabla] ?? []).filter(r => filtros.every(f => f(r)))
        return Promise.resolve({ data: filas, error: null }).then(res, rej)
      },
    }
    return q
  }
  var __firmas = [], __firma = null
  var supabase = {
    from: (t) => __consulta(t),
    rpc() { return Promise.resolve({ data: null, error: null }) },
    storage: { from: (b) => ({
      createSignedUrl: async (ruta, seg) => { __firmas.push({ b, ruta, seg }); if (typeof __firma === 'function') return __firma(ruta); return { data: { signedUrl: 'https://firmado.test/' + ruta + '?token=t' }, error: null } },
    }) },
  }
  var __errores = [], __exitos = []
  function mostrarError(m) { __errores.push(m) } function mostrarExito(m) { __exitos.push(m) }
  function formatearFecha(f) { if (!f) return '—'; const [a, m, d] = String(f).split('-'); return d + '/' + m + '/' + a }
  function eliminarFactura() { return false }
  function abrirModalPago() {} function abrirModalAplicarCreditoDesdeFicha() {} function abrirModalSaldoInicial() {} function abrirModalNotaCredito() {}
  function abrirModalDetallePago() {} function abrirAnularNd() {}
  async function cargarFichaSaldos() {} async function cargarFichaCreditos() {} function cargarSaldos() {}
  var estado = {
    sesion: { user: { id: 'uid-1' } },
    miRolApp: 'usuario', miEmpleadoId: 'yo',
    misTareas: new Set(['cuentas_corrientes:ver_todo', 'cuentas_corrientes:registrar_pago']),
    unidadElegida: null,
    maestros: { unidades: [{ id: 'u-n', nombre: 'Cucuruchos Nuss' }], proveedores: [{ id: 'p1', razon_social: 'DIMAFLO S.A.' }] },
    fabrica: FABRICA_SIN_DATOS,
    ficha: null, sinImporte: [], fichaSaldos: [], fichaCreditos: [],
  }
  var notaDebitoProv = null
  var claveRenglonNd = 0
  var anularNd = null
`

const FUNCIONES = [
  'pasaFiltroUnidad', 'veUnidad', 'etiquetaUnidad', 'esc', 'importeHtml', 'formatearImporte', 'badgeEstadoFactura', 'tieneTarea', 'nombreUnidad',
  'contarSinImporte', 'contarSinImporteVisible', 'htmlSinImporte', 'esSinImporte', 'htmlFilaSinImporte', 'decimalesImporteSin', 'enlazarCampoImporteSin',
  'cargarCantidadesSinImporte', 'productoUnicoConCantidad', 'textoCantidadInsumo', 'totalImporteFormulario', 'resumenCantidades',
  'saldosFichaVisibles', 'creditosFichaDeUnidad', 'renderizarFichaBanner', 'cargarFichaMovimientos', 'renderizarFichaMovimientos',
  'etiquetaPagoDeGasto', 'cargarEtiquetasDePagos', 'referenciaMovimiento',
  'esSaldoInicial', 'nombreFactura', 'numeroParaMostrar', 'etiquetaTipoMovimiento', 'cargarObservacionesSaldoInicial', 'puedeCargarSaldoInicial',
  'htmlFilaComision', 'cargarCodigosComision', 'fechaISO', 'puedeCargarNotaDebito',
  'cargarNotasDebitoFicha', 'verPdfNd',
]
const CONSTANTES = ['ESTADO_FACTURA_LABEL', 'TIPO_MOVIMIENTO_LABEL', 'MEDIOS_PAGO_LABEL', 'TANDA_GASTOS_PAGO', 'NUMERO_SALDO_INICIAL', 'BUCKET_PDF_ND', 'SEGUNDOS_FIRMA_PDF_ND']

function sandbox() {
  return construirCon(ARCHIVO, {
    preludio: PRELUDIO, funciones: FUNCIONES, constantes: CONSTANTES,
    retorno: `estado, __els, __consultas, __firmas, __pestanas, __setDatos(t, d){ __datos[t] = d }, __setFirma(f){ __firma = f }`,
  })
}
function abrirFicha(S) {
  S.estado.ficha = { proveedorId: 'p1', unidadId: 'u-n', nombre: 'DIMAFLO S.A.', unidades: [], movimientosRaw: [], estadoPorFactura: {},
    filtros: { rangoRapido: null, fechaDesde: '', fechaHasta: '', tipo: 'todos', orden: 'fecha_desc' } }
}
const RUTA = 'uid-1/notas-debito/p1/2026/1729800000000.pdf'
function conCuenta(S, { ruta = RUTA, idNota = 'nd-9' } = {}) {
  S.__setDatos('v_cuenta_corriente_movimientos', [
    { proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', fecha: '2026-10-20', tipo: 'factura', monto: 82500, factura_pendiente_id: 'fp-nd', referencia: 'Nota de débito 0001-4567', saldo_acumulado: 82500, orden_desempate: 2 },
    { proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', fecha: '2026-10-21', tipo: 'factura', monto: 500, factura_pendiente_id: 'fp-nd2', referencia: 'Nota de débito 0002', saldo_acumulado: 83000, orden_desempate: 3 },
    { proveedor_id: 'p1', unidad_negocio_id: 'u-n', moneda: 'ARS', fecha: '2026-10-19', tipo: 'factura', monto: 1000, factura_pendiente_id: 'fp-1', referencia: '0001-0001', saldo_acumulado: 1000, orden_desempate: 1 },
  ])
  S.__setDatos('facturas_pendientes', [
    { id: 'fp-nd', estado: 'pendiente', saldo_pendiente: 82500, modulo_origen: 'nota_debito', observaciones: null },
    { id: 'fp-nd2', estado: 'pendiente', saldo_pendiente: 500, modulo_origen: 'nota_debito', observaciones: null },
    { id: 'fp-1', estado: 'pendiente', saldo_pendiente: 1000, modulo_origen: 'gastos', observaciones: null },
  ])
  S.__setDatos('notas_debito', [
    { id: idNota, factura_pendiente_id: 'fp-nd', comprobante: '0001-4567', estado: 'vigente', archivo_url: ruta },
    { id: 'nd-10', factura_pendiente_id: 'fp-nd2', comprobante: '0002', estado: 'vigente', archivo_url: null },
  ])
}
const filas = (S) => S.__els.get('lista-movimientos-ficha').innerHTML.split('tarjeta-lista fila-movimiento').slice(1)
const filaDe = (S, texto) => filas(S).find(f => f.includes(texto)) ?? ''

esperas.push((async () => {
  {
    const S = sandbox()
    abrirFicha(S)
    conCuenta(S)
    await S.cargarFichaMovimientos()
    const q = S.__consultas.find(c => c.tabla === 'notas_debito')
    chk('se lee archivo_url de notas_debito', /\barchivo_url\b/.test(q?.select ?? ''), q?.select)
    const conPdf = filaDe(S, 'Nota de débito 0001-4567')
    const sinPdf = filaDe(S, 'Nota de débito 0002')
    chk('la nota con PDF lleva "Ver PDF" con su id', /<button type="button" class="btn-ver-pdf-nd" data-ver-pdf-nd="nd-9">Ver PDF<\/button>/.test(conPdf), conPdf)
    chk('la nota sin PDF no lo lleva', !/data-ver-pdf-nd/.test(sinPdf), sinPdf)
    chk('una factura común no lo lleva', !/data-ver-pdf-nd/.test(filaDe(S, '0001-0001')))
    chk('el link no expone la ruta en la pantalla (se firma al tocarlo)', !S.__els.get('lista-movimientos-ficha').innerHTML.includes(RUTA))

    // Tocar: firma 5 minutos en 'comprobantes' y abre la pestaña.
    await S.verPdfNd('nd-9')
    chk('firma en el bucket comprobantes, la ruta tal cual, 300 segundos', S.__firmas.length === 1 && S.__firmas[0].b === 'comprobantes' && S.__firmas[0].ruta === RUTA && S.__firmas[0].seg === 300, JSON.stringify(S.__firmas))
    const p = S.__pestanas[0]
    chk('abre UNA pestaña nueva y le pone el link firmado', S.__pestanas.length === 1 && p.destino === '_blank' && p.location.href === 'https://firmado.test/' + RUTA + '?token=t', JSON.stringify(S.__pestanas))
    chk('… sin opener (la pestaña no puede tocar esta página)', p.opener === null)
    chk('… y bien, sin error en la fila', !/fila-movimiento__error-pdf/.test(S.__els.get('lista-movimientos-ficha').innerHTML))

    // La firma falla: el error de la base tal cual, en ESA fila.
    S.__setFirma(() => ({ data: null, error: { message: 'Object not found' } }))
    await S.verPdfNd('nd-9')
    const p2 = S.__pestanas[1]
    chk('si la firma falla, la pestaña se cierra', p2?.cerrada === true)
    const err = filaDe(S, 'Nota de débito 0001-4567')
    chk('… y el error de la base tal cual, debajo de la fila', /<div class="fila-movimiento__error-pdf" role="alert">No se pudo abrir el PDF: Object not found<\/div>/.test(err), err)
    chk('… solo en esa fila', !/fila-movimiento__error-pdf/.test(filaDe(S, 'Nota de débito 0002')))
    // Una firma sin link.
    S.__setFirma(() => ({ data: {}, error: null }))
    await S.verPdfNd('nd-9')
    chk('una firma sin link también se dice', /No se pudo abrir el PDF: La base no devolvió el link del PDF\./.test(filaDe(S, 'Nota de débito 0001-4567')))
    // Una excepción (sin conexión).
    S.__setFirma(() => { throw new Error('Failed to fetch') })
    await S.verPdfNd('nd-9')
    chk('sin conexión: el mensaje tal cual', /No se pudo abrir el PDF: Failed to fetch/.test(filaDe(S, 'Nota de débito 0001-4567')))
    // Vuelve a andar: el error se va.
    S.__setFirma(null)
    await S.verPdfNd('nd-9')
    chk('al volver a andar, el error se va', !/fila-movimiento__error-pdf/.test(S.__els.get('lista-movimientos-ficha').innerHTML))

    // Sin archivo_url no firma nada.
    const antes = S.__firmas.length
    await S.verPdfNd('nd-10')
    await S.verPdfNd('no-existe')
    chk('sin archivo_url (o una nota que no está) no firma ni abre nada', S.__firmas.length === antes && S.__pestanas.length === 5)
  }

  // Escape: el id de la nota y el error de la base.
  {
    const S = sandbox()
    abrirFicha(S)
    conCuenta(S, { idNota: marca('nd-id') })
    await S.cargarFichaMovimientos()
    S.__setFirma(() => ({ data: null, error: { message: marca('error-firma') } }))
    await S.verPdfNd(S.estado.ficha.notasDebito.get('fp-nd').id)
    chequearMarcas(chk, 'el botón y el error del PDF', S.__els.get('lista-movimientos-ficha').innerHTML, ['nd-id', 'error-firma'])
  }

  // Si la ficha cambió mientras se firmaba, no se toca la nueva.
  {
    const S = sandbox()
    abrirFicha(S)
    conCuenta(S)
    await S.cargarFichaMovimientos()
    let soltar
    S.__setFirma(() => new Promise(r => { soltar = () => r({ data: null, error: { message: 'tarde' } }) }))
    const va = S.verPdfNd('nd-9')
    await new Promise(r => setImmediate(r))
    const vieja = S.estado.ficha
    abrirFicha(S)
    soltar()
    await va
    chk('otra ficha abierta: el error de la vieja no se pega en la nueva', !S.estado.ficha.errorPdfNd && !vieja.errorPdfNd)
  }
})())

// El click está enlazado (la lista se arma con innerHTML).
chk('el click de "Ver PDF" llama a verPdfNd con el id', /querySelectorAll\('\[data-ver-pdf-nd\]'\)\.forEach\(btn => \{\s*btn\.addEventListener\('click', \(\) => verPdfNd\(btn\.dataset\.verPdfNd\)\)/.test(FUENTE))
chk('el botón tiene su estilo (36 px de alto, como Anular)', /\.btn-ver-pdf-nd \{ min-height: 36px;/.test(FUENTE))
chk('los botones de la fila bajan de renglón en el celular (flex-wrap)', /<div style="display:flex; flex-wrap:wrap; justify-content:flex-end; gap:0\.375rem; align-items:center; margin-top:0\.375rem;">\s*<a href="gastos\.html\?factura=/.test(FUENTE))

// ── Nada de lo que había se perdió (baseline FIJO d2d1dc1, nunca HEAD) ────
{
  const BASE_COMMIT = 'd2d1dc1'
  let antes = null
  if (process.env.ARCHIVO_BASE) antes = fs.readFileSync(process.env.ARCHIVO_BASE, 'utf8')
  else {
    try {
      antes = require('child_process').execFileSync('git', ['show', `${BASE_COMMIT}:modulos/cuentas-corrientes.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
    } catch { antes = null }
  }
  chk(`se pudo leer el baseline ${BASE_COMMIT}`, !!antes)
  if (antes) {
    const marcas = t => new Set([...t.matchAll(/\b(id="[a-z][\w-]*"|data-[a-z][\w-]*)/g)].map(m => m[1]))
    const ahora = marcas(FUENTE)
    const faltan = [...marcas(antes)].filter(m => !ahora.has(m))
    chk(`ningún id ni data-* de ${BASE_COMMIT} se perdió`, faltan.length === 0, faltan.join(', '))
    chk(`en ${BASE_COMMIT} la nota de débito no tenía "Ver PDF" (lo que este cambio agrega)`, !/data-ver-pdf-nd/.test(antes))
  }
}

fin()
