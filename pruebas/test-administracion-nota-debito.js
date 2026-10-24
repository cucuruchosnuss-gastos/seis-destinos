// ADMINISTRACIÓN — LA NOTA DE DÉBITO (24/10/2026, pedido de Facu; rama
// ci-prueba/cheque-rechazado).
//
// Lo que se EJECUTA (sandbox-administracion.js, con un Supabase falso):
//  - la hoja (htmlNotaDebito, de datos_nota_debito): A4 vertical en blanco y
//    negro como la orden de pago, ORIGINAL y DUPLICADO (en la pantalla solo el
//    original; al imprimir y en el PDF las dos, cada una en su hoja), el
//    encabezado de la empresa con su logo, "NOTA DE DÉBITO" y el código, los
//    datos del cliente, la tabla de conceptos, el TOTAL en número y en letras,
//    los datos del cheque si es por un rechazo y el sello ANULADA;
//  - Imprimir (#ad-impresion con @page A4 vertical), el nombre del PDF;
//  - Anular con motivo → anular_nota_debito (el error de la base tal cual);
//  - la cuenta del cliente: "Nota de débito N-ND-0001" y "Anulación de nota
//    de débito" con link a la hoja (el id sale de notas_debito por el código);
//  - "+ Nota de débito" suelta: renglones concepto + importe, observaciones →
//    registrar_nota_debito_cliente (parámetros exactos, un doble toque manda
//    una vez) y después se abre la hoja;
//  - el evento de la cartera ('administracion:nota-debito') abre la hoja;
//  - todo texto de la base escapado.
// Las RPCs se leyeron con pg_get_functiondef el 24/10/2026.
//
//   node pruebas/test-administracion-nota-debito.js
'use strict'
process.env.TZ = 'UTC'
const path = require('path')
const fs = require('fs')
const { construirAdministracion } = require('./sandbox-administracion')
const { arnes, marca, chequearMarcas } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/administracion.html')
const src = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${src.length} bytes)`)
const { chk, esperas, fin } = arnes()
const esperar = async () => { for (let i = 0; i < 8; i++) await new Promise(r => setImmediate(r)) }
const N = (s) => String(s ?? '').replace(/ /g, ' ')
const texto = (h) => N(String(h ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim())

const PRELUDIO = `
  var CSS = { escape: (s) => String(s) }
  function CustomEvent(tipo, init) { this.type = tipo; this.detail = init ? init.detail : undefined }
  var __eventos = []
  window.__eventos = __eventos
  document.dispatchEvent = (e) => { __eventos.push(e); return true }
`

function nuevo({ tareas = null, rpc = null } = {}) {
  const S = construirAdministracion(ARCHIVO, { preludioExtra: PRELUDIO })
  if (tareas) S.estado.misTareas = new Map(tareas.map(t => [t, { todas: true }]))
  if (rpc) S.__setRpc(rpc)
  return S
}

const DATOS = {
  id: 'nd-1', direccion: 'emitida', codigo: 'N-ND-0001', comprobante: null, fecha: '2026-10-20', estado: 'vigente', anulada_motivo: null,
  items: [{ concepto: 'Cheque rechazado BANCO MACRO S.A. Nº 43300023', importe: 150000 }, { concepto: 'Gastos de cheque rechazado', importe: 1500.5 }],
  total: 151500.5, moneda: 'ARS', observaciones: 'Rechazo: Sin fondos', archivo_url: null,
  empresa: { nombre: 'Cucuruchos Nuss', razon_social: 'PAZ MIRTA', cuit: '20924106795', domicilio: 'Unión 843', telefono: '351 555', logo_url: 'logo-cucuruchos-nuss.png' },
  cliente: { id: 'cli-1', nombre: 'Molino', razon_social: 'MOLINO SA', cuit: '30712345678', domicilio: 'Ruta 9 km 3', localidad: 'Córdoba', condicion_iva: 'responsable_inscripto', email: null },
  proveedor: null,
  cheque: { banco: 'BANCO MACRO S.A.', numero: '43300023', importe: 150000, fecha_pago: '2026-10-15', rechazo_fecha: '2026-10-20', rechazo_motivo: 'Sin fondos' },
  cargada_por: 'Yanina', cargada_en: '2026-10-20T15:00:00Z',
}
const copias = (html) => html.split('<div class="ndh-copia ').slice(1).map(t => ({
  rotulo: (t.match(/data-copia="([^"]*)"/) || [])[1] ?? null, clase: t.slice(0, t.indexOf('"')), html: t,
}))

// ── La hoja ───────────────────────────────────────────────────────────────
{
  const S = nuevo()
  const h = S.htmlNotaDebito(DATOS)
  const cs = copias(h)
  chk('hoja: dos copias, ORIGINAL y después DUPLICADO', cs.length === 2 && cs[0].rotulo === 'ORIGINAL' && cs[1].rotulo === 'DUPLICADO', cs.map(c => c.rotulo).join())
  chk('hoja: cada copia con su clase (el duplicado salta de hoja al imprimir)', cs[0].clase === 'ndh-copia--original' && cs[1].clase === 'ndh-copia--duplicado')
  for (const c of cs) {
    const t = texto(c.html)
    chk(`${c.rotulo}: "NOTA DE DÉBITO" y el código`, t.includes('NOTA DE DÉBITO N-ND-0001'), t.slice(0, 200))
    chk(`${c.rotulo}: el rótulo de la copia en su recuadro`, new RegExp(`<div class="ndh-cab__copia">${c.rotulo}</div>`).test(c.html))
    chk(`${c.rotulo}: la fecha dd/mm/aaaa`, t.includes('Fecha 20/10/2026'))
    chk(`${c.rotulo}: la empresa (razón social, CUIT con guiones, domicilio y teléfono)`, t.includes('PAZ MIRTA') && t.includes('CUIT 20-92410679-5') && t.includes('Unión 843') && t.includes('Tel. 351 555'))
    chk(`${c.rotulo}: el logo de la empresa`, /<img class="ndh-cab__logo" src="\.\.\/logo-cucuruchos-nuss\.png" alt="">/.test(c.html))
    chk(`${c.rotulo}: los datos del cliente`, t.includes('Cliente MOLINO SA Molino CUIT 30-71234567-8 Ruta 9 km 3, Córdoba IVA: Responsable inscripto'), t)
    chk(`${c.rotulo}: los datos del cheque rechazado`, t.includes('Cheque rechazado Banco N° Fecha de pago Rechazado el Motivo Importe BANCO MACRO S.A. 43300023 15/10/2026 20/10/2026 Sin fondos $ 150.000,00'), t)
    chk(`${c.rotulo}: los conceptos con su importe`, t.includes('Cheque rechazado BANCO MACRO S.A. Nº 43300023 $ 150.000,00') && t.includes('Gastos de cheque rechazado $ 1.500,50'))
    chk(`${c.rotulo}: el TOTAL en número`, t.includes('TOTAL $ 151.500,50'))
    chk(`${c.rotulo}: el total en letras con centavos`, t.includes('Son CIENTO CINCUENTA Y UN MIL QUINIENTOS PESOS CON CINCUENTA CENTAVOS'), t)
    chk(`${c.rotulo}: las observaciones`, t.includes('Observaciones Rechazo: Sin fondos'))
    chk(`${c.rotulo}: las firmas`, t.includes('Recibí conforme — firma y aclaración') && t.includes('Autorizó'))
    chk(`${c.rotulo}: quién la hizo`, t.includes('Hecha por Yanina'))
    chk(`${c.rotulo}: vigente, sin sello`, !/ndh-sello/.test(c.html) && !t.includes('ANULADA'))
  }
  const sinCheque = S.htmlNotaDebito({ ...DATOS, cheque: null })
  chk('hoja: una nota suelta (sin cheque) no tiene la sección del cheque', !texto(sinCheque).includes('Cheque rechazado Banco'))
  const anulada = S.htmlNotaDebito({ ...DATOS, estado: 'anulada', anulada_motivo: 'Se cobró en efectivo' })
  const ca = copias(anulada)
  chk('anulada: el sello ANULADA en las dos copias', ca.every(c => /<div class="ndh-sello" aria-hidden="true">ANULADA<\/div>/.test(c.html)))
  chk('anulada: el motivo escrito en las dos copias', ca.every(c => texto(c.html).includes('ANULADA: Se cobró en efectivo')))
  chk('hoja: un logo que no es un archivo de la raíz no se dibuja', !/<img/.test(S.htmlNotaDebito({ ...DATOS, empresa: { ...DATOS.empresa, logo_url: 'javascript:alert(1)' } })))
  const recibida = S.htmlNotaDebito({ ...DATOS, direccion: 'recibida', codigo: null, comprobante: '0001-4567', cliente: null, proveedor: { razon_social: 'ANATOLIA SRL', cuit: '30711111112', direccion: 'Ruta 19' } })
  chk('recibida: el número del comprobante y el proveedor', texto(recibida).includes('NOTA DE DÉBITO N° 0001-4567') && texto(recibida).includes('Proveedor (la recibimos) ANATOLIA SRL CUIT 30-71111111-2 Ruta 19'))

  // XSS: todo texto de la base.
  const malo = {
    ...DATOS, codigo: marca('codigo'), observaciones: marca('obs'), anulada_motivo: marca('motivo-anula'), estado: 'anulada', cargada_por: marca('cargo'),
    items: [{ concepto: marca('concepto'), importe: 10 }],
    empresa: { ...DATOS.empresa, razon_social: marca('razon'), domicilio: marca('domicilio'), telefono: marca('tel'), cuit: marca('cuit') },
    cliente: { ...DATOS.cliente, razon_social: marca('cli-razon'), nombre: marca('cli-nombre'), cuit: marca('cli-cuit'), domicilio: marca('cli-dom'), localidad: marca('cli-loc'), condicion_iva: marca('iva') },
    cheque: { ...DATOS.cheque, banco: marca('banco'), numero: marca('numero'), rechazo_motivo: marca('rech-motivo') },
  }
  chequearMarcas(chk, 'la hoja', S.htmlNotaDebito(malo), ['codigo', 'obs', 'motivo-anula', 'cargo', 'concepto', 'razon', 'domicilio', 'tel', 'cuit',
    'cli-razon', 'cli-nombre', 'cli-cuit', 'cli-dom', 'cli-loc', 'iva', 'banco', 'numero', 'rech-motivo'])
  chequearMarcas(chk, 'la hoja de una recibida', S.htmlNotaDebito({ ...DATOS, direccion: 'recibida', comprobante: marca('comprobante'), cliente: null,
    proveedor: { razon_social: marca('prov-razon'), cuit: marca('prov-cuit'), direccion: marca('prov-dir') } }), ['comprobante', 'prov-razon', 'prov-cuit', 'prov-dir'])

  // El total en letras.
  const L = S.importeEnLetrasNd
  chk('letras: 1 peso', L(1) === 'UN PESO CON CERO CENTAVOS', L(1))
  chk('letras: 21.000', L(21000) === 'VEINTIÚN MIL PESOS CON CERO CENTAVOS', L(21000))
  chk('letras: un millón justo', L(1000000) === 'UN MILLÓN DE PESOS CON CERO CENTAVOS', L(1000000))
  chk('letras: un centavo', L(0.01) === 'CERO PESOS CON UN CENTAVO', L(0.01))
  chk('letras: 2.531.081,21', L(2531081.21) === 'DOS MILLONES QUINIENTOS TREINTA Y UN MIL OCHENTA Y UN PESOS CON VEINTIÚN CENTAVOS', L(2531081.21))
  chk('el nombre del PDF', S.nombreArchivoNota(DATOS) === 'Nota de debito N-ND-0001.pdf')
  chk('el nombre del PDF no lleva caracteres raros', S.nombreArchivoNota({ codigo: '../x"y' }) === 'Nota de debito _x_y.pdf')
}

// ── El CSS de la hoja ─────────────────────────────────────────────────────
chk('css: en la pantalla se ve solo el ORIGINAL', /#ad-nd-hoja \.ndh-copia--duplicado \{ display: none; \}/.test(src))
chk('css: al imprimir, el duplicado empieza en otra hoja', /\.ndh--papel \.ndh-copia--duplicado \{ break-before: page; page-break-before: always; \}/.test(src))
chk('css: blanco y negro (fondo blanco, letra casi negra)', /\.ndh \{[^}]*background: #fff; color: #111;/.test(src))
chk('css: la ventana de la nota va por encima de la cartera (z 80)', /\.ad-nd \{ z-index: 90; \}/.test(src))
chk('markup: la ventana es hija directa de <body> (fuera de .ad-contenedor) y con Imprimir y Compartir PDF',
  /<div class="ad-dv ad-nd" id="ad-nd" hidden role="dialog"/.test(src) && /id="ad-nd-imprimir"[^>]*>Imprimir</.test(src) && /id="ad-nd-compartir"[^>]*>Compartir PDF</.test(src))
chk('markup: avisa que salen dos hojas', /Se imprimen dos hojas iguales: ORIGINAL y DUPLICADO\./.test(src))
chk('markup: "+ Nota de débito" en la cuenta del cliente', /id="ad-btn-nota-debito" hidden>\+ Nota de débito</.test(src))

// ── Abrir, imprimir, anular ───────────────────────────────────────────────
esperas.push((async () => {
  let datos = DATOS
  const S = nuevo({ rpc: async (n) => n === 'datos_nota_debito' ? { data: datos, error: null } : { data: null, error: null } })
  await S.abrirNotaDebito('nd-1')
  const llam = S.__llamadas.rpc.filter(r => r[0] === 'datos_nota_debito')
  chk('abrir: lee datos_nota_debito con el id', llam.length === 1 && JSON.stringify(llam[0][1]) === '{"p_id":"nd-1"}')
  chk('abrir: la ventana se muestra con la hoja', S.__els.get('ad-nd').hidden === false && S.__els.get('ad-nd-hoja').innerHTML.includes('N-ND-0001'))
  chk('abrir: el título dice el código', S.__els.get('ad-nd-titulo').textContent === 'Nota de débito N-ND-0001')
  chk('abrir: Imprimir y Compartir PDF habilitados', S.__els.get('ad-nd-imprimir').disabled === false && S.__els.get('ad-nd-compartir').disabled === false)
  chk('abrir: con retiros:precios se ofrece Anular', S.__els.get('ad-nd-anular').hidden === false)
  S.imprimirNotaDebito()
  const imp = S.__els.get('ad-impresion').innerHTML
  chk('imprimir: A4 vertical', /@page \{ size: A4 portrait; margin: 8mm; \}/.test(imp))
  chk('imprimir: las dos copias en la hoja de papel', /<div class="ndh ndh--papel">/.test(imp) && copias(imp).length === 2)
  chk('imprimir: llama a window.print', S.__impresiones() === 1)
  // Anular: sin motivo no llama; con motivo, anular_nota_debito y se relee.
  S.pedirAnularNotaDebito()
  chk('anular: se abre el panel del motivo', S.__els.get('ad-nd-anular-panel').hidden === false)
  S.__els.get('ad-nd-motivo').value = 'x'
  await S.confirmarAnularNotaDebito()
  chk('anular: sin motivo lo dice y no llama a la base', !S.__llamadas.rpc.some(r => r[0] === 'anular_nota_debito') && S.__els.get('ad-nd-error').textContent === 'Poné el motivo de la anulación.')
  S.__els.get('ad-nd-motivo').value = '  Se cobró en efectivo '
  datos = { ...DATOS, estado: 'anulada', anulada_motivo: 'Se cobró en efectivo' }
  await S.confirmarAnularNotaDebito()
  await esperar()
  const an = S.__llamadas.rpc.filter(r => r[0] === 'anular_nota_debito')
  chk('anular: UNA llamada con el id y el motivo limpio', an.length === 1 && JSON.stringify(an[0][1]) === '{"p_id":"nd-1","p_motivo":"Se cobró en efectivo"}', JSON.stringify(an))
  chk('anular: el aviso dice que se revirtió en la cuenta', S.__llamadas.exitos.includes('Nota de débito anulada: se revirtió en la cuenta del cliente.'))
  chk('anular: se relee la hoja (con el sello)', S.__llamadas.rpc.filter(r => r[0] === 'datos_nota_debito').length === 2 && /ndh-sello/.test(S.__els.get('ad-nd-hoja').innerHTML))
  chk('anular: una anulada ya no ofrece Anular', S.__els.get('ad-nd-anular').hidden === true)
  chk('anular: el título dice "(anulada)"', S.__els.get('ad-nd-titulo').textContent === 'Nota de débito N-ND-0001 (anulada)')
  const ev = S.__win.__eventos.find(e => e.type === 'administracion:nota-debito-anulada')
  chk('anular: avisa a la cartera de cheques', ev?.detail?.id === 'nd-1')

  // El error de la base, tal cual.
  const S2 = nuevo({ rpc: async (n) => n === 'datos_nota_debito' ? { data: DATOS, error: null } : { data: null, error: { message: 'Ya está anulada.' } } })
  await S2.abrirNotaDebito('nd-1')
  S2.pedirAnularNotaDebito()
  S2.__els.get('ad-nd-motivo').value = 'motivo bueno'
  await S2.confirmarAnularNotaDebito()
  chk('anular: el error de la base tal cual', S2.__els.get('ad-nd-error').textContent === 'Ya está anulada.' && S2.__els.get('ad-nd-error').hidden === false)
  // Sin permiso no se ofrece.
  const S3 = nuevo({ tareas: ['retiros:ver'], rpc: async () => ({ data: DATOS, error: null }) })
  await S3.abrirNotaDebito('nd-1')
  chk('sin retiros:precios ni cobranzas:procesar no se ofrece Anular', S3.__els.get('ad-nd-anular').hidden === true)
  // Si no se puede leer, se dice (escapado) y no se puede imprimir.
  const S4 = nuevo({ rpc: async () => ({ data: null, error: { message: 'No tenés permiso. ' + marca('err') } }) })
  await S4.abrirNotaDebito('nd-1')
  chk('no se pudo leer: lo dice con el error de la base', S4.__els.get('ad-nd-hoja').innerHTML.includes('No se pudo leer la nota de débito: No tenés permiso.'))
  chequearMarcas(chk, 'el error de la hoja', S4.__els.get('ad-nd-hoja').innerHTML, ['err'])
  chk('no se pudo leer: Imprimir apagado', S4.__els.get('ad-nd-imprimir').disabled === true)
  S4.cerrarNotaDebito()
  chk('cerrar: la ventana se esconde', S4.__els.get('ad-nd').hidden === true && S4.estado.notaDebito === null)
})())

// ── La cuenta del cliente ─────────────────────────────────────────────────
esperas.push((async () => {
  const S = nuevo({
    rpc: async (n) => n === 'cuenta_cliente' ? { data: [
      { fecha: '2026-10-01', tipo: 'retiro', detalle: 'Orden de retiro N-0012', importe: 50000, saldo: 50000, orden_retiro_id: null },
      { fecha: '2026-10-20', tipo: 'nota_debito', detalle: 'Nota de débito N-ND-0001', importe: 151500.5, saldo: 201500.5, orden_retiro_id: null },
      { fecha: '2026-10-22', tipo: 'anulacion_nota_debito', detalle: 'Anulación de la nota de débito N-ND-0001: se cobró', importe: -151500.5, saldo: 50000, orden_retiro_id: null },
      { fecha: '2026-10-23', tipo: 'nota_debito', detalle: 'Nota de débito N-ND-0002', importe: 10, saldo: 50010, orden_retiro_id: null },
    ], error: null } : { data: null, error: null },
  })
  S.__tablas.notas_debito = [{ id: 'nd-1', codigo: 'N-ND-0001', estado: 'anulada' }]
  const r = await S.leerCuenta('cli-1')
  const q = S.__llamadas.consultas.find(c => c[0] === 'notas_debito')
  chk('cuenta: con notas de débito, lee notas_debito del cliente', q && q[1].some(f => f[0] === 'eq' && f[1] === 'cliente_id' && f[2] === 'cli-1'))
  chk('cuenta: las notas quedan por código', r.notas.get('N-ND-0001')?.id === 'nd-1')
  const h = S.htmlCuenta({ id: 'cli-1', cuenta: r.cuenta, codigos: r.codigos, notas: r.notas })
  const t = texto(h)
  chk('cuenta: la nota dice "Nota de débito N-ND-0001" y su tipo', t.includes('Nota de débito N-ND-0001 20/10/2026 · Nota de débito · Ver la nota ›'), t)
  chk('cuenta: la anulación dice su tipo y abre la misma hoja', t.includes('22/10/2026 · Anulación de nota de débito · Ver la nota ›'), t)
  chk('cuenta: las dos son botones a la hoja', (h.match(/data-cuenta-nota-debito="nd-1"/g) || []).length === 2)
  chk('cuenta: una nota que no se pudo encontrar no lleva link', t.includes('Nota de débito N-ND-0002 23/10/2026 · Nota de débito') && !t.includes('N-ND-0002 23/10/2026 · Nota de débito · Ver la nota'))
  const S2 = nuevo({ rpc: async () => ({ data: [{ fecha: '2026-10-01', tipo: 'retiro', detalle: 'x', importe: 1, saldo: 1, orden_retiro_id: null }], error: null }) })
  await S2.leerCuenta('cli-1')
  chk('cuenta: sin notas de débito no se consulta notas_debito', !S2.__llamadas.consultas.some(c => c[0] === 'notas_debito'))
  chk('cuenta: el código se reconoce en el detalle', S.notaDeMovimiento({ tipo: 'nota_debito', detalle: 'Nota de débito DP-ND-0034' }, new Map([['DP-ND-0034', { id: 'x' }]]))?.id === 'x')
  chk('cuenta: un movimiento que no es de nota no busca nota', S.notaDeMovimiento({ tipo: 'ajuste', detalle: 'Nota de débito N-ND-0001' }, r.notas) === null)
  chequearMarcas(chk, 'la cuenta con una nota', S.htmlCuenta({ id: 'cli-1', cuenta: [{ fecha: '2026-10-20', tipo: 'nota_debito', detalle: 'Nota de débito N-ND-0001', importe: 1, saldo: 1 }], codigos: new Map(), notas: new Map([['N-ND-0001', { id: marca('nota-id') }]]) }), ['nota-id'])
})())

// ── La nota suelta ────────────────────────────────────────────────────────
{
  const S = nuevo()
  chk('suelta: con retiros:precios en la fábrica', S.puedeNotaDebitoCliente('u-n') === true)
  const S2 = nuevo({ tareas: ['retiros:ver', 'cobranzas:procesar'] })
  chk('suelta: con cobranzas:procesar también', S2.puedeNotaDebitoCliente('u-n') === true)
  const S3 = nuevo({ tareas: ['retiros:ver'] })
  chk('suelta: sin ninguna de las dos, no', S3.puedeNotaDebitoCliente('u-n') === false)
  const n = { fecha: '2026-10-20', renglones: [S.renglonNota('', null)], observaciones: '' }
  chk('validar: sin renglones con importe', S.erroresNotaCliente(n, '2026-10-24') === 'Escribí al menos un renglón con su importe.')
  n.renglones[0].importe = 2500
  chk('validar: un renglón con importe lleva concepto', S.erroresNotaCliente(n, '2026-10-24') === 'Cada renglón lleva su concepto.')
  n.renglones[0].concepto = ' Intereses por mora '
  n.renglones.push(S.renglonNota('vacío', null), S.renglonNota('Flete', 1200.255))
  chk('validar: completo', S.erroresNotaCliente(n, '2026-10-24') === null)
  chk('validar: la fecha no futura', S.erroresNotaCliente({ ...n, fecha: '2026-10-25' }, '2026-10-24') === 'La fecha no puede ser futura.')
  chk('validar: sin fecha', S.erroresNotaCliente({ ...n, fecha: '' }, '2026-10-24') === 'Poné la fecha.')
  n.observaciones = '  '
  chk('viaja: los parámetros exactos de registrar_nota_debito_cliente',
    JSON.stringify(S.parametrosNotaCliente('cli-1', n)) === JSON.stringify({ p_cliente_id: 'cli-1', p_fecha: '2026-10-20', p_items: [{ concepto: 'Intereses por mora', importe: 2500 }, { concepto: 'Flete', importe: 1200.26 }], p_observaciones: null }),
    JSON.stringify(S.parametrosNotaCliente('cli-1', n)))
  chk('el total en centavos', S.totalNota(n.renglones) === 3700.26)
  chequearMarcas(chk, 'los renglones de la nota suelta', S.htmlRenglonesNota([{ clave: marca('clave'), concepto: marca('concepto') }]), ['clave', 'concepto'])
}

esperas.push((async () => {
  let resolver
  const S = nuevo({
    rpc: async (n) => {
      if (n === 'registrar_nota_debito_cliente') { await new Promise(r => { resolver = r }); return { data: { nota_debito_id: 'nd-5', codigo: 'N-ND-0005', total: 2500 }, error: null } }
      if (n === 'datos_nota_debito') return { data: { ...DATOS, id: 'nd-5', codigo: 'N-ND-0005' }, error: null }
      return { data: [], error: null }
    },
  })
  S.estado.cliente = { id: 'cli-1', cuenta: [], codigos: new Map(), notas: new Map(), panel: null, errorPanel: null }
  S.abrirNotaDebitoCliente()
  const c = S.estado.cliente
  chk('abrir el panel: un renglón vacío y la fecha de hoy', c.panel === 'nota_debito' && c.ndc.renglones.length === 1 && /^\d{4}-\d{2}-\d{2}$/.test(c.ndc.fecha))
  chk('abrir el panel: se muestra', S.__els.get('ad-panel-nota-debito').hidden === false)
  c.ndc.renglones[0].concepto = 'Intereses'
  c.ndc.renglones[0].importe = 2500
  S.__els.get('ad-ndc-fecha').value = '2026-10-20'
  S.__els.get('ad-ndc-obs').value = 'Mora de septiembre'
  const una = S.guardarNotaDebitoCliente()
  const otra = S.guardarNotaDebitoCliente()
  await esperar()
  resolver()
  await Promise.all([una, otra])
  await esperar()
  const reg = S.__llamadas.rpc.filter(r => r[0] === 'registrar_nota_debito_cliente')
  chk('guardar: un doble toque manda UNA vez', reg.length === 1, reg.length)
  chk('guardar: con los parámetros exactos', JSON.stringify(reg[0]?.[1]) === JSON.stringify({ p_cliente_id: 'cli-1', p_fecha: '2026-10-20', p_items: [{ concepto: 'Intereses', importe: 2500 }], p_observaciones: 'Mora de septiembre' }), JSON.stringify(reg[0]?.[1]))
  chk('guardar: el aviso con el código y el total', N(S.__llamadas.exitos.find(e => /N-ND-0005/.test(e))) === 'Nota de débito N-ND-0005 por $ 2.500,00: quedó en la cuenta del cliente.')
  chk('guardar: después se abre la hoja de la nota nueva', S.__llamadas.rpc.some(r => r[0] === 'datos_nota_debito' && r[1].p_id === 'nd-5'))
  // El error de la base: tal cual, pegado al botón.
  const S2 = nuevo({ rpc: async (n) => n === 'registrar_nota_debito_cliente' ? { data: null, error: { message: 'No tenés permiso para hacer notas de débito a clientes.' } } : { data: [], error: null } })
  S2.estado.cliente = { id: 'cli-1', cuenta: [], codigos: new Map(), notas: new Map(), panel: null, errorPanel: null }
  S2.abrirNotaDebitoCliente()
  S2.estado.cliente.ndc.renglones[0].concepto = 'x'
  S2.estado.cliente.ndc.renglones[0].importe = 1
  S2.__els.get('ad-ndc-fecha').value = '2026-10-20'
  await S2.guardarNotaDebitoCliente()
  chk('guardar: el error de la base tal cual', S2.__els.get('ad-ndc-error').textContent === 'No tenés permiso para hacer notas de débito a clientes.' && S2.__els.get('ad-ndc-error').hidden === false)
  chk('guardar: con error no se abre ninguna hoja', !S2.__llamadas.rpc.some(r => r[0] === 'datos_nota_debito'))
  // Lo que falta no llama.
  const S3 = nuevo()
  S3.estado.cliente = { id: 'cli-1', cuenta: [], codigos: new Map(), notas: new Map(), panel: null, errorPanel: null }
  S3.abrirNotaDebitoCliente()
  S3.__els.get('ad-ndc-fecha').value = '2026-10-20'
  await S3.guardarNotaDebitoCliente()
  chk('guardar: sin importe lo dice y no llama', !S3.__llamadas.rpc.some(r => r[0] === 'registrar_nota_debito_cliente') && S3.__els.get('ad-ndc-error').textContent === 'Escribí al menos un renglón con su importe.')
})())

// ── El evento de la cartera ───────────────────────────────────────────────
chk('la cartera pide abrir la hoja con el evento administracion:nota-debito',
  /document\.addEventListener\('administracion:nota-debito', \(e\) => abrirNotaDebito\(e\.detail\?\.id\)\)/.test(src))

fin()
