// Barrido de escapado de modulos/cobranzas.html.
//
// DOS MITADES, y ninguna reemplaza a la otra:
//  1. EJECUTA los renders con un document falso y una MARCA DISTINTA POR CAMPO.
//     Es lo único que prueba que el helper existe y que escapa el argumento
//     correcto.
//  2. CHEQUEO ESTÁTICO: recorre el <script> y exige que cada ${...} que entra a
//     una plantilla que arma HTML —y cada asignación a innerHTML— esté escapada
//     o figure en la lista de seguras CON SU MOTIVO. Una interpolación nueva
//     sin escapar pone esto en rojo NOMBRANDO la expresión y la línea.
//     NO se cuentan los innerHTML: un conteo exacto se rompe solo con cualquier
//     cambio y después nadie sabe si fue una regresión o un render nuevo.
//
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/cobranzas.html.

const fs = require('fs')
const path = require('path')
const { construir } = require('./sandbox')
const { interpolaciones } = require('./escaner-interpolaciones')
const { clasificar } = require('./clasificar')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cobranzas.html')
const SOLO = process.env.SOLO || ''   // 'render' | 'estatico' | ''

let ok = 0, fallas = []
// Las ramas ASYNC se juntan acá y la suite cierra cuando terminan TODAS: un
// cierre por timeout podría cortar antes de que una afirme nada.
const esperas = []
const escCobDe = (S, t) => S.escCob(t)
function chk(nombre, condicion, detalle) {
  if (condicion) ok++
  else fallas.push(nombre + (detalle ? ` — ${detalle}` : ''))
}

// El sub-proceso VERIFICA que leyó el archivo que el runner le pasó, no lo
// asume: un runner que a veces lee el limpio invierte el significado del
// resultado en vez de dar un falso negativo.
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)
require('./mutar-cobranzas-comun').informarComun()

const marca = (campo) => `"><b data-xss="${campo}">`
const escapada = (campo) => `&lt;b data-xss=&quot;${campo}&quot;&gt;`

function chequearMarcas(render, html, campos) {
  chk(`${render}: no aparece NINGUNA marca cruda`, !/<b data-xss=/.test(html),
    (html.match(/.{0,60}<b data-xss=[^>]*>/) || [''])[0])
  for (const campo of campos) {
    chk(`${render}: «${campo}» aparece escapado`, html.includes(escapada(campo)))
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 1. RENDERS EJECUTADOS
// ══════════════════════════════════════════════════════════════════════════

if (SOLO !== 'estatico') {
  const S = construir(ARCHIVO)

  // ── htmlFilaCobranza ────────────────────────────────────────────────────
  {
    const c = {
      id: marca('fila_id'), cliente: marca('fila_cliente'), estado: marca('fila_estado'),
      fecha: '2026-09-17', total: 1500.5, efectivo: 500, cantidad_cheques: 2,
      created_at: '2026-09-16T12:00:00Z', cargada_por_nombre: marca('fila_cargada_por'),
      editada: true,
    }
    chequearMarcas('htmlFilaCobranza', S.htmlFilaCobranza(c),
      ['fila_id', 'fila_cliente', 'fila_estado', 'fila_cargada_por'])
    // Cobranza anulada, solo efectivo, sin cheques: la otra rama de la tarjeta.
    const c2 = { ...c, estado: 'anulada', cantidad_cheques: 0, efectivo: 0, total: 0 }
    chequearMarcas('htmlFilaCobranza (anulada, sin cheques)', S.htmlFilaCobranza(c2),
      ['fila_id', 'fila_cliente', 'fila_cargada_por'])
  }

  // ── htmlDetalle ─────────────────────────────────────────────────────────
  const chequeConMarcas = (sufijo, bancoEnCatalogo) => ({
    id: marca('ch_id' + sufijo),
    cobranza_id: 'c1',
    foto_id: marca('ch_foto' + sufijo),
    banco_codigo: bancoEnCatalogo ? '007' : marca('ch_banco' + sufijo),
    sucursal_codigo: '386', codigo_postal: '3218', dv_ruta: 6,
    numero: marca('ch_numero' + sufijo), dv_numero: 8,
    cuenta: marca('ch_cuenta' + sufijo), dv_cuenta: 0,
    tipo: 'diferido', fecha_emision: '2026-09-01', fecha_pago: '2026-10-01',
    importe: 1000, importe_letras: marca('ch_letras' + sufijo),
    beneficiario: marca('ch_benef' + sufijo),
    titulares: [{ nombre: marca('ch_tit_nombre' + sufijo), cuit: marca('ch_tit_cuit' + sufijo) }],
    estado: 'en_cartera',
  })

  {
    const S2 = construir(ARCHIVO)
    // El nombre del banco sale de la tabla bancos_bcra: también es texto de la
    // base y se marca.
    S2.estado.bancos = new Map([['007', marca('banco_denominacion')]])

    const d = {
      cabecera: {
        id: 'c1', empleado_id: 'emp-1', cliente: marca('det_cliente'), estado: 'anulada',
        fecha: '2026-09-17', efectivo: 800, cantidad_cheques: 1, total_cheques: 1000, total: 1800,
        comprobante_referencia: marca('det_referencia'),
        observaciones: marca('det_observaciones'),
        cargada_por_nombre: marca('det_cargada_por'),
        procesada_por_nombre: marca('det_procesada_por'),
        anulada_por_nombre: marca('det_anulada_por'),
        motivo_anulacion: marca('det_motivo_anulacion'),
      },
      cheques: [chequeConMarcas('', false), chequeConMarcas('_b', true)],
      fotos: [{ id: marca('det_foto_id'), storage_path: 'x/y.jpg' }],
      historial: [
        { accion: marca('hist_accion'), empleado_id: 'e9', motivo: marca('hist_motivo'), created_at: '2026-09-17T10:00:00Z' },
        {
          accion: 'edicion', empleado_id: 'e9', motivo: null, created_at: '2026-09-17T11:00:00Z',
          antes: { cabecera: { cliente: marca('hist_cliente_antes'), observaciones: 'x' }, cheques: [{ id: 'k', importe: 1, banco_codigo: '1', sucursal_codigo: '2', numero: marca('hist_num_antes'), cuenta: '4' }] },
          despues: { cabecera: { cliente: 'otro', observaciones: marca('hist_obs_despues') }, cheques: [{ id: 'k', importe: 2, banco_codigo: '1', sucursal_codigo: '2', numero: marca('hist_num_despues'), cuenta: '4' }] },
        },
      ],
      nombres: new Map([['e9', marca('hist_quien')]]),
    }
    chequearMarcas('htmlDetalle', S2.htmlDetalle(d), [
      'det_cliente', 'det_referencia', 'det_observaciones', 'det_cargada_por',
      'det_procesada_por', 'det_anulada_por', 'det_motivo_anulacion', 'det_foto_id',
      'ch_id', 'ch_foto', 'ch_banco', 'ch_numero', 'ch_cuenta', 'ch_benef',
      'ch_tit_nombre', 'ch_tit_cuit', 'banco_denominacion',
      'hist_accion', 'hist_motivo', 'hist_quien',
      'hist_cliente_antes', 'hist_obs_despues', 'hist_num_antes', 'hist_num_despues',
    ])

    // Cobranza sin cheques y en estado marcado (la otra rama de la cabecera).
    const d2 = {
      cabecera: { id: 'c2', empleado_id: 'emp-1', cliente: 'x', estado: marca('det_estado'), fecha: '2026-09-17', efectivo: 0, cantidad_cheques: 0, total_cheques: 0, total: 0 },
      cheques: [], fotos: [], historial: [], nombres: new Map(),
    }
    chequearMarcas('htmlDetalle (sin cheques ni fotos)', S2.htmlDetalle(d2), ['det_estado'])

    // Un cheque común NO muestra fecha de pago, y un beneficiario null no
    // dibuja el aviso de endoso: los dos casos límite, ejecutados.
    const comun = { ...chequeConMarcas('_c', false), tipo: 'comun', fecha_pago: null, beneficiario: null, titulares: [] }
    const htmlComun = S2.htmlChequeDetalle(comun)
    // Sin titulares, ch.id no se interpola en esta rama: se esperan solo los
    // campos que SÍ salen a la página.
    chequearMarcas('htmlChequeDetalle (común, sin beneficiario)', htmlComun,
      ['ch_foto_c', 'ch_banco_c', 'ch_numero_c', 'ch_cuenta_c'])
    chk('htmlChequeDetalle: un cheque común no dibuja la fecha de pago', !/pago /.test(htmlComun))
  }

  // ── htmlTarjetaCheque ───────────────────────────────────────────────────
  {
    const S3 = construir(ARCHIVO)
    S3.estado.bancos = new Map([['007', marca('tarj_banco_denominacion')]])
    const foto = { id: 'f1', storage_path: 'x/y.jpg', blob: null, subida: true, leida: true, error: null }
    const base = {
      id: marca('tarj_id'), foto_id: 'f1',
      r1: marca('tarj_r1'), r2: marca('tarj_r2'), r3: marca('tarj_r3'),
      banco_codigo: marca('tarj_banco'), sucursal_codigo: null, codigo_postal: null, dv_ruta: null,
      numero: marca('tarj_numero'), dv_numero: null, cuenta: null, dv_cuenta: null,
      // Los tres van CRUDOS a un value="…" del formulario: no pasan por ningún
      // formateador que los limpie, así que se marcan.
      tipo: 'diferido', fecha_emision: marca('tarj_emision'), fecha_pago: marca('tarj_pago'),
      importe: marca('tarj_importe'), importe_letras: marca('tarj_letras'),
      beneficiario: marca('tarj_benef'),
      titulares: [{ nombre: marca('tarj_tit_nombre'), cuit: marca('tarj_tit_cuit') }],
      confirmado: false, abierto: true,
      ocr_propuesto: { notas: marca('tarj_notas') },
      controles: { cuits_ok: false, fechas_ok: false, completado_desde_cmc7: true, cmc7_coincide: false },
      duplicado: { nivel: 'parcial', texto: marca('tarj_duplicado') },
    }
    const f = { id: 'form1', fotos: [foto], cheques: [base] }
    chequearMarcas('htmlTarjetaCheque (abierta)', S3.htmlTarjetaCheque(base, f), [
      'tarj_id', 'tarj_r1', 'tarj_r2', 'tarj_r3', 'tarj_letras', 'tarj_benef',
      'tarj_tit_nombre', 'tarj_tit_cuit', 'tarj_banco', 'tarj_notas', 'tarj_duplicado',
      'tarj_emision', 'tarj_pago',
    ])
    // El importe YA NO se interpola en la plantilla (21/09/2026): el campo se
    // enlaza con enlazarCampoNumero y el valor lo escribe ponerNumero después
    // de insertar el HTML. Donde antes había un sink escapado ahora no hay
    // ninguno, y eso es lo que se afirma: la marca no aparece NI escapada.
    chk('htmlTarjetaCheque (abierta): el importe tipeado no entra al HTML (lo escribe ponerNumero)',
      !S3.htmlTarjetaCheque(base, f).includes('tarj_importe'))

    // Plegada: el otro camino de la misma función.
    const plegado = { ...base, confirmado: true, abierto: false, banco_codigo: '007' }
    chequearMarcas('htmlTarjetaCheque (plegada)', S3.htmlTarjetaCheque(plegado, { ...f, cheques: [plegado] }),
      ['tarj_id', 'tarj_numero', 'tarj_banco_denominacion'])

    // Un banco que NO está en el catálogo se muestra con su número: esa rama
    // de nombreBanco también imprime dato de la base.
    chk('nombreBanco: un código fuera del catálogo se escapa',
      S3.escCob(S3.nombreBanco(marca('bk'))).includes(escapada('bk')))
  }

  // ── El pie de los tres renglones: sus TRES estados, ejecutados ──────────
  // Un solo pie por renglón. 'ok' sin CMC-7 dice qué se guarda y qué queda
  // aparte; 'ok' CON CMC-7 NO muestra ni el ✓ ni el desglose, porque el dígito
  // pudo calcularlo el sistema y no leerse del papel; 'mal' dice que no cierra.
  {
    const S8 = construir(ARCHIVO)
    const conDv = (cuerpo) => cuerpo + String(S8.dvBcra(cuerpo))
    const r1 = conDv('2853863218'), r2 = conDv('66259862'), r3 = conDv('09420314667')
    const foto = { id: 'f1', storage_path: 'x/y.jpg' }
    const tarjeta = (extra) => {
      const ch = { ...S8.chequeVacio('f1'), r1, r2, r3, ...extra }
      S8.aplicarRenglones(ch)
      return S8.htmlTarjetaCheque(ch, { id: 'form', fotos: [foto], cheques: [ch] })
    }
    // Parte el HTML en los tres renglones, para afirmar renglón por renglón.
    const renglones = (html) => html.split('class="cob-renglon').slice(1, 4)
      .map(s => s.slice(0, s.indexOf('class="cob-campo">') === -1 ? s.length : s.indexOf('class="cob-campo">')))
    const cuenta = (s, t) => s.split(t).length - 1

    // (1) 'ok' sin CMC-7: el desglose, uno por renglón.
    const ok = renglones(tarjeta({ controles: null }))
    chk('pie ok: hay tres renglones', ok.length === 3, ok.length)
    const partes = [[r1, 11], [r2, 9], [r3, 12]]
    ok.forEach((s, i) => {
      const [txt, largo] = partes[i]
      chk(`pie ok renglón ${i + 1}: un solo ✓`, cuenta(s, '✓') === 1, cuenta(s, '✓'))
      chk(`pie ok renglón ${i + 1}: dice qué se guarda y qué dígito queda aparte`,
        s.includes(`Se guarda ${txt.slice(0, largo - 1)} y el ${txt.slice(largo - 1)} queda aparte`))
      chk(`pie ok renglón ${i + 1}: no aparece el texto de la banda magnética`, !s.includes('banda magnética'))
      chk(`pie ok renglón ${i + 1}: no aparece el error`, !s.includes('cob-campo__error'))
    })

    // (2) 'ok' CON completado_desde_cmc7: ni ✓ ni desglose en NINGÚN renglón.
    const cmc = renglones(tarjeta({ controles: { completado_desde_cmc7: true } }))
    cmc.forEach((s, i) => {
      chk(`pie cmc7 renglón ${i + 1}: sin ✓`, cuenta(s, '✓') === 0)
      chk(`pie cmc7 renglón ${i + 1}: sin desglose`, !s.includes('Se guarda'))
      chk(`pie cmc7 renglón ${i + 1}: dice, con el texto exacto, que puede no haberse leído del papel`,
        cuenta(s, 'Puede que este renglón no se haya leído del papel: en este cheque el sistema completó datos desde la banda magnética y calculó su dígito. Comparalo con lo impreso.') === 1)
      chk(`pie cmc7 renglón ${i + 1}: ya no afirma que el renglón lo calculó el sistema`,
        !s.includes('lo calculó el sistema') && !s.includes('no se leyó del papel'))
    })

    // (3) 'mal': el dígito no cierra. Error, y nunca un ✓ ni un desglose.
    const malR2 = r2.slice(0, 8) + String((Number(r2[8]) + 1) % 10)
    const mal = renglones(tarjeta({ r2: malR2, controles: { completado_desde_cmc7: true } }))
    chk('pie mal: el renglón 2 muestra el error', cuenta(mal[1], 'No coincide con el dígito de control') === 1)
    chk('pie mal: el renglón 2 no muestra ✓ ni desglose ni el texto de la banda',
      !mal[1].includes('✓') && !mal[1].includes('Se guarda') && !mal[1].includes('banda magnética'))

    // (4) vacío y corto: sin pie.
    const vacios = renglones(tarjeta({ r1: '', r2: '6625', controles: null }))
    for (const [i, s] of [[0, vacios[0]], [1, vacios[1]]]) {
      chk(`pie vacío/corto renglón ${i + 1}: no dibuja ningún pie`,
        !s.includes('✓') && !s.includes('cob-campo__error') && !s.includes('Se guarda'))
    }

    // (5) Texto malicioso con los dígitos justos: el renglón da 'ok', el pie
    // muestra SOLO dígitos y el value del input sale escapado.
    const html5 = tarjeta({ r2: marca('pie_rdos') + r2, controles: null })
    chequearMarcas('pie ok con texto malicioso en el renglón', html5, ['pie_rdos'])
    chk('pie ok con texto malicioso: el desglose sale igual, solo con dígitos',
      html5.includes(`Se guarda ${r2.slice(0, 8)} y el ${r2[8]} queda aparte`))
  }

  // ── Prellenado de los renglones: separado, como está impreso ─────────────
  // Pegado, el dígito de control se lee como la última cifra del número.
  {
    const S9 = construir(ARCHIVO)
    const deBase = S9.chequeDesdeBase({
      id: 'c', foto_id: 'f', banco_codigo: '285', sucursal_codigo: '386', codigo_postal: '3218',
      dv_ruta: 6, numero: '66259862', dv_numero: 8, cuenta: '09420314667', dv_cuenta: 0,
      tipo: 'comun', fecha_emision: '2026-09-01', importe: 10, titulares: [],
    })
    chk('prellenado desde la base: renglón 1 separado', deBase.r1 === '285-386-3218 6', deBase.r1)
    chk('prellenado desde la base: renglón 2 separado', deBase.r2 === '66259862 8', deBase.r2)
    chk('prellenado desde la base: renglón 3 separado (con el 0 del dígito)', deBase.r3 === '09420314667 0', deBase.r3)
    chk('prellenado desde la base: los campos siguen iguales al repartir',
      deBase.numero === '66259862' && deBase.dv_numero === 8 && deBase.cuenta === '09420314667')
    const deOcr = S9.chequeDesdeOcr({ banco_codigo: '285', sucursal_codigo: '386', codigo_postal: '3218',
      dv_ruta: 6, numero: '66259862', dv_numero: 8, cuenta: null, dv_cuenta: 0 }, 'f')
    chk('prellenado desde el OCR: renglón 2 separado', deOcr.r2 === '66259862 8', deOcr.r2)
    chk('prellenado desde el OCR: un renglón sin dato queda VACÍO, no a medias', deOcr.r3 === '', deOcr.r3)
    chk('prellenado desde el OCR: sin dígito el renglón queda vacío',
      S9.renglonComoImpreso(['66259862'], null) === '' && S9.renglonComoImpreso(['66259862'], undefined) === '')
  }

  // ══ ACCESOS A LA CARTERA Y LINK DIRECTO (22/09/2026) ════════════════════
  // La cartera de cheques se mudó a modulos/cheques.html. Acá quedan: el link
  // "Cartera de cheques →", el "Ver en Cheques" de cada cheque del detalle y
  // el link directo cobranzas.html?cobranza=<id>&volver=<url>. Las pruebas de
  // la cartera (filtros, tabla, salida, volver a cartera) viven en
  // pruebas/test-cheques-*.js.

  const AQUI = 'https://cucuruchosnuss-gastos.github.io/seis-destinos/modulos/cobranzas.html'
  const CHEQUES_ABS = 'https://cucuruchosnuss-gastos.github.io/seis-destinos/modulos/cheques.html'
  const UUID = '0b2d6c1e-3f4a-4b5c-8d9e-0123456789ab'

  // ── destinoVolver: SOLO una URL de esta misma app ─────────────────────────
  {
    const S40 = construir(ARCHIVO)
    const d = (v) => S40.destinoVolver(v, AQUI)
    const RECHAZOS = [
      ['javascript:', 'javascript:alert(1)'],
      ['javascript: codificado', encodeURIComponent('javascript:alert(document.cookie)')],
      ['javascript: en mayúsculas', 'JaVaScRiPt:alert(1)'],
      ['data:', 'data:text/html,<script>alert(1)</script>'],
      ['otro origen', 'https://evil.example/cheques.html'],
      ['otro origen, codificado', encodeURIComponent('https://evil.example/cheques.html')],
      ['//evil (relativa al protocolo)', '//evil.example/cheques.html'],
      ['http en vez de https (otro origen)', 'http://cucuruchosnuss-gastos.github.io/seis-destinos/modulos/cheques.html'],
      ['otro subdominio', 'https://cucuruchosnuss-gastos.github.io.evil.example/cheques.html'],
      ['un % que no decodifica', '%E0%A4%A'],
      ['blob: del mismo origen (no es http/https)', 'blob:https://cucuruchosnuss-gastos.github.io/0b2d6c1e'],
      ['vacío', ''],
      ['null', null],
    ]
    for (const [nombre, v] of RECHAZOS) chk(`volver=: ${nombre} se ignora (null)`, d(v) === null, String(d(v)))
    chk('volver=: relativa "cheques.html" resuelve a la de esta misma carpeta', d('cheques.html') === CHEQUES_ABS, d('cheques.html'))
    chk('volver=: relativa con query conserva la query', d('cheques.html?estado=salidos') === CHEQUES_ABS + '?estado=salidos')
    chk('volver=: absoluta del mismo origen se acepta tal cual', d(CHEQUES_ABS + '?cheque=k1') === CHEQUES_ABS + '?cheque=k1')
    chk('volver=: absoluta del mismo origen codificada una vez más (como la manda Cheques) también',
      d(encodeURIComponent(CHEQUES_ABS)) === CHEQUES_ABS)
    chk('volver=: otra página de la app se acepta', d('gastos.html') === 'https://cucuruchosnuss-gastos.github.io/seis-destinos/modulos/gastos.html')

    chk('texto: a cheques.html dice "‹ Volver a los cheques"', S40.textoVolver(CHEQUES_ABS) === '‹ Volver a los cheques')
    chk('texto: con query también', S40.textoVolver(CHEQUES_ABS + '?cheque=k1#x') === '‹ Volver a los cheques')
    chk('texto: otra página de la app es "‹ Volver"', S40.textoVolver('https://cucuruchosnuss-gastos.github.io/seis-destinos/modulos/gastos.html') === '‹ Volver')
    chk('texto: un nombre que solo TERMINA parecido no es la cartera',
      S40.textoVolver('https://cucuruchosnuss-gastos.github.io/seis-destinos/modulos/micheques.html') === '‹ Volver')
    chk('texto: una URL rota no rompe', S40.textoVolver('no es url') === '‹ Volver')
  }

  // ── leerLinkDirecto y la barra de direcciones ─────────────────────────────
  {
    const S41 = construir(ARCHIVO)
    const l = (q) => S41.leerLinkDirecto(q, AQUI)
    chk('link: sin ?cobranza no hay link (null)', l('') === null && l('?volver=cheques.html') === null)
    const ok = l(`?cobranza=${UUID}&volver=cheques.html`)
    chk('link: uuid válido y volver relativo', ok && ok.id === UUID && ok.volver && ok.volver.url === CHEQUES_ABS &&
      ok.volver.texto === '‹ Volver a los cheques', JSON.stringify(ok))
    chk('link: el uuid se normaliza a minúsculas', l(`?cobranza=${UUID.toUpperCase()}`).id === UUID)
    chk('link: sin volver, volver es null', l(`?cobranza=${UUID}`).volver === null)
    chk('link: un id que no es uuid da id null (no se consulta nada)',
      l('?cobranza=abc').id === null && l("?cobranza=1' or '1'='1").id === null && l('?cobranza=').id === null)
    chk('link: volver=javascript: se descarta, el id sigue', (() => { const x = l(`?cobranza=${UUID}&volver=javascript:alert(1)`); return x.id === UUID && x.volver === null })())
    chk('link: volver de otro origen se descarta', l(`?cobranza=${UUID}&volver=${encodeURIComponent('https://evil.example/cheques.html')}`).volver === null)

    chk('barra: se sacan ?cobranza y ?volver, y queda lo demás',
      S41.urlSinLinkDirecto(`${AQUI}?a=1&cobranza=${UUID}&volver=cheques.html#h`) === '/seis-destinos/modulos/cobranzas.html?a=1#h',
      S41.urlSinLinkDirecto(`${AQUI}?a=1&cobranza=${UUID}&volver=cheques.html#h`))
    chk('barra: sin otra query queda la ruta sola', S41.urlSinLinkDirecto(`${AQUI}?cobranza=${UUID}`) === '/seis-destinos/modulos/cobranzas.html')

    // Abrir: la barra se limpia ANTES de abrir el detalle.
    const S42 = construir(ARCHIVO)
    S42.abrirLinkDirecto({ id: UUID, volver: { url: CHEQUES_ABS, texto: '‹ Volver a los cheques' } })
    chk('abrir: limpia la barra y DESPUÉS abre el detalle', S42.__llamadas.orden.join() === 'replace,abrir', S42.__llamadas.orden.join())
    chk('abrir: abre ESA cobranza', S42.__llamadas.abrirDetalle.length === 1 && S42.__llamadas.abrirDetalle[0][0] === UUID)
    chk('abrir: recuerda a qué cobranza le vale el volver', S42.estado.linkDirecto && S42.estado.linkDirecto.cobranzaId === UUID &&
      S42.estado.linkDirecto.volver.url === CHEQUES_ABS)
    const S43 = construir(ARCHIVO)
    S43.abrirLinkDirecto({ id: null, volver: null })
    chk('abrir: un id inválido NO abre nada, lo dice, y limpia la barra igual',
      S43.__llamadas.abrirDetalle.length === 0 && /no apunta a una cobranza válida/.test(S43.__llamadas.errores.join()) &&
      S43.__llamadas.replace.length === 1 && S43.estado.linkDirecto === null)

    // Volver: al destino SOLO desde la cobranza del link.
    const S44 = construir(ARCHIVO)
    S44.estado.linkDirecto = { cobranzaId: UUID, volver: { url: CHEQUES_ABS, texto: '‹ Volver a los cheques' } }
    S44.estado.cobranzaSeleccionadaId = UUID
    S44.irAtrasDelDetalle()
    chk('volver: desde la cobranza del link navega a Cheques', S44.__location.href === CHEQUES_ABS && S44.__llamadas.vistas.length === 0,
      S44.__location.href)
    const S45 = construir(ARCHIVO)
    S45.estado.linkDirecto = { cobranzaId: UUID, volver: { url: CHEQUES_ABS, texto: '‹ Volver a los cheques' } }
    S45.estado.cobranzaSeleccionadaId = 'otra'
    S45.irAtrasDelDetalle()
    chk('volver: desde otra cobranza vuelve al listado, sin navegar', S45.__llamadas.vistas.join() === 'listado' && S45.__location.href === AQUI)
    const S46 = construir(ARCHIVO)
    S46.estado.linkDirecto = { cobranzaId: UUID, volver: null }
    S46.estado.cobranzaSeleccionadaId = UUID
    S46.irAtrasDelDetalle()
    chk('volver: link sin volver= vuelve al listado', S46.__llamadas.vistas.join() === 'listado' && S46.__location.href === AQUI)
    S46.pintarBotonVolver(UUID)
    chk('botón: sin volver dice "‹ Volver al listado"', S46.__doc.getElementById('cob-btn-volver-listado').textContent === '‹ Volver al listado')
    S44.pintarBotonVolver(UUID)
    chk('botón: con volver a Cheques dice "‹ Volver a los cheques"', S44.__doc.getElementById('cob-btn-volver-listado').textContent === '‹ Volver a los cheques')
  }

  // ── "Cartera de cheques →" del listado: con y sin permiso ─────────────────
  {
    const casos = [
      [['cobranzas:cargar'], 'usuario', true, 'solo cargar: oculto'],
      [['cobranzas:cargar', 'cobranzas:editar_anular'], 'usuario', true, 'cargar + editar_anular: oculto'],
      [['cobranzas:ver_todo'], 'usuario', false, 'ver_todo: visible'],
      [['cobranzas:procesar'], 'usuario', false, 'procesar: visible'],
      [[], 'super_admin', false, 'super_admin: visible'],
    ]
    for (const [tareas, rol, oculto, nombre] of casos) {
      const S47 = construir(ARCHIVO)
      S47.estado.misTareas = new Set(tareas)
      S47.estado.miRolApp = rol
      S47.pintarAccesoCheques()
      chk(`acceso a la cartera, ${nombre}`, S47.__doc.getElementById('cob-acceso-cheques').hidden === oculto)
    }
    // El HTML estático: el link existe, va a cheques.html y arranca oculto.
    const bloque = (FUENTE.match(/<div class="cob-acceso-cheques" id="cob-acceso-cheques" hidden>\s*<a class="cob-link-cheques" id="cob-link-cheques" href="cheques\.html">Cartera de cheques &rarr;<\/a>\s*<\/div>/) || [])[0]
    chk('acceso a la cartera: el HTML trae el link a cheques.html, oculto de arranque', !!bloque)
    chk('acceso a la cartera: vive DENTRO del listado', FUENTE.indexOf('id="cob-acceso-cheques"') > FUENTE.indexOf('<div id="cob-vista-listado" hidden>') &&
      FUENTE.indexOf('id="cob-acceso-cheques"') < FUENTE.indexOf('id="cob-banner-local"'))
    chk('acceso a la cartera: se pinta al arrancar', /pintarAccesoCheques\(\)\n\s*mostrarVistaCob\('listado'\)/.test(FUENTE))
    chk('link directo: init lo lee de la URL y lo abre',
      /const link = leerLinkDirecto\(location\.search, location\.href\)\n\s*if \(link\) abrirLinkDirecto\(link\)/.test(FUENTE))
    chk('link directo: el botón del detalle va por irAtrasDelDetalle',
      /getElementById\('cob-btn-volver-listado'\)\.addEventListener\('click', irAtrasDelDetalle\)/.test(FUENTE))
    const css = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))
    const regla = (sel) => { const i = css.indexOf('\n    ' + sel + ' {'); return i === -1 ? '' : css.slice(i, css.indexOf('}', i)) }
    chk('acceso a la cartera: 44px táctil y el naranja oscuro del módulo',
      /min-height:\s*44px/.test(regla('.cob-link-cheques')) && /color:\s*var\(--naranja-oscuro\)/.test(regla('.cob-link-cheques')))
  }

  // ── "Ver en Cheques" de cada cheque del detalle ───────────────────────────
  {
    const S48 = construir(ARCHIVO)
    const idRaro = `k"1'<b>&x`
    const ch = { id: idRaro, estado: 'en_cartera', banco_codigo: '007', numero: '00000001', cuenta: '1', tipo: 'comun',
      fecha_emision: '2026-09-17', importe: 1, titulares: [] }
    const h = S48.htmlChequeDetalle(ch, new Map())
    const esperado = `href="cheques.html?cheque=${encodeURIComponent(idRaro)}"`
    chk('ver en Cheques: el id va con encodeURIComponent, entre comillas DOBLES', h.includes(esperado), (h.match(/href="[^"]*"/) || [''])[0])
    chk('ver en Cheques: nada del id sale crudo (ni comillas ni <)', !h.includes(idRaro) && !/<b>/.test(h))
    chk('ver en Cheques: el texto es "Ver en Cheques"', /<a class="cob-btn[^"]*" href="cheques\.html\?cheque=[^"]*">Ver en Cheques<\/a>/.test(h))
    for (const [tareas, rol, ve, nombre] of [
      [['cobranzas:cargar'], 'usuario', false, 'solo cargar: no lo ve'],
      [['cobranzas:ver_todo'], 'usuario', true, 'ver_todo: lo ve'],
      [['cobranzas:procesar'], 'usuario', true, 'procesar: lo ve'],
      [[], 'super_admin', true, 'super_admin: lo ve'],
    ]) {
      const S49 = construir(ARCHIVO)
      S49.estado.misTareas = new Set(tareas)
      S49.estado.miRolApp = rol
      chk(`ver en Cheques, ${nombre}`, /Ver en Cheques/.test(S49.htmlChequeDetalle(ch, new Map())) === ve)
    }
    chk('ver en Cheques: un cheque sin id no dibuja el link', S48.htmlLinkChequeEnCartera({ ...ch, id: null }) === '')
  }

  // ── El detalle NO tiene botones de salida: se dan en Cheques ──────────────
  {
    const S50 = construir(ARCHIVO)
    S50.estado.misTareas = new Set(['cobranzas:cargar', 'cobranzas:ver_todo', 'cobranzas:procesar', 'cobranzas:editar_anular'])
    const base = { banco_codigo: '007', numero: '00000001', cuenta: '1', tipo: 'comun', fecha_emision: '2026-09-17', importe: 1, titulares: [] }
    const d = {
      cabecera: { id: 'c1', empleado_id: 'emp-1', cliente: 'X', estado: 'procesada', fecha: '2026-09-17', efectivo: 0, cantidad_cheques: 3, total_cheques: 3, total: 3 },
      cheques: [
        { ...base, id: 'k1', estado: 'en_cartera' },
        { ...base, id: 'k2', estado: 'depositado', salida_fecha: '2026-09-18', salida_destino: 'Galicia' },
        { ...base, id: 'k3', estado: 'endosado', salida_fecha: '2026-09-18', salida_destino: 'Molino' },
      ],
      fotos: [], historial: [], nombres: new Map(),
    }
    const h = S50.htmlDetalle(d)
    chk('detalle: ningún botón de salida ni de volver a cartera',
      !/data-salio|data-dar-salida|data-volver-cartera|data-salida-tipo/.test(h) && !/>\s*Sali[óo]\s*</.test(h) && !/>\s*Volver a cartera\s*</.test(h))
    chk('detalle: el estado y la salida de cada cheque se siguen leyendo',
      h.includes('>En cartera<') && h.includes('Depositado el 18/09/2026 en Galicia') && h.includes('Endosado el 18/09/2026 a Molino'))
    chk('detalle: el aviso de cheques afuera dice que se vuelven desde Cheques',
      /primero hay que volverlos a cartera \(desde Cheques\)/.test(h))
    chk('fuente: no queda ninguna llamada a las RPCs de salida',
      !/marcar_salida_cheque|volver_cheque_a_cartera/.test(FUENTE))
    chk('fuente: no queda el diálogo de salida ni la vista Cheques',
      !/id="cob-modal-salida"|id="cob-vista-cheques"|id="cob-pestanas"/.test(FUENTE))
  }

  // ══ ERROR DE LA BASE CON UN CHEQUE AFUERA ═══════════════════════════════

  // El texto EXACTO que arma el trigger _cobranza_cheque_proteger_salida
  // (leído de pg_get_functiondef el 21/09/2026), con un cheque de ejemplo.
  const MSG_TRIGGER = 'El cheque 007 Nº 12345678 ya salió de cartera (depositado). Para editar o anular esta cobranza, primero volvelo a cartera.'

  // ── El error de la BASE al editar o anular una cobranza con un cheque afuera
  // Tiene que llegar ENTERO a la persona, por los dos caminos.
  {
    const S25 = construir(ARCHIVO)
    const hoy = S25.hoyArgentina()
    S25.estado.form = {
      id: 'cob-prueba', modo: 'edicion', estadoLocal: 'borrador', cliente: 'Cliente', fecha: hoy,
      efectivo: '', comprobante_referencia: '', observaciones: '',
      fotos: [{ id: 'f1', storage_path: 'u/cob-prueba/x.jpg', subida: true, leida: true }],
      cheques: [{ ...S25.chequeVacio('f1'), id: 'q1', confirmado: true, importe: '1000', tipo: 'comun',
        fecha_emision: hoy, r1: '', r2: '', r3: '' }],
    }
    S25.__setRpc(async () => ({ data: null, error: { message: MSG_TRIGGER } }))
    esperas.push(S25.guardarCobranza().then(() => {
      const err = S25.__doc.getElementById('cob-error-guardar')
      chk('editar con un cheque afuera: el mensaje de la base se ve ENTERO', err.textContent === MSG_TRIGGER && err.hidden === false,
        err.textContent)
      chk('editar con un cheque afuera: la cobranza queda abierta para corregir', S25.estado.form && S25.estado.form.estadoLocal === 'borrador')
    }))

    const S26 = construir(ARCHIVO)
    S26.__setRpc(async () => ({ data: null, error: { message: MSG_TRIGGER } }))
    esperas.push(S26.accionSimple('anular_cobranza', { p_id: 'c', p_motivo: 'x' }, 'ok').then(() => {
      const e = S26.__llamadas.errores
      chk('anular con un cheque afuera: el mensaje de la base se ve ENTERO', e[e.length - 1] === MSG_TRIGGER, e[e.length - 1])
    }))
  }

  // ── Detalle e historial: el destino es texto libre y va escapado ───────────
  {
    const S27 = construir(ARCHIVO)
    S27.estado.bancos = new Map([['007', 'BANCO DE GALICIA']])
    const ch = {
      id: 'q9', cobranza_id: 'c9', foto_id: 'f9', banco_codigo: '007', numero: '12345678', cuenta: '09420314667',
      tipo: 'comun', fecha_emision: '2026-09-01', fecha_pago: null, importe: 10, titulares: [], beneficiario: null,
      estado: 'endosado', salida_fecha: '2026-09-12', salida_destino: marca('det_destino'), salida_por: 'e5',
    }
    const d = {
      cabecera: { id: 'c9', empleado_id: 'emp-1', cliente: 'x', estado: 'registrada', fecha: '2026-09-01',
        efectivo: 0, cantidad_cheques: 1, total_cheques: 10, total: 10 },
      cheques: [ch], fotos: [],
      historial: [
        { accion: 'cheque_salida', empleado_id: 'e5', motivo: null, created_at: '2026-09-12T12:00:00Z',
          despues: { cheque_id: 'q9', banco_codigo: marca('hist_banco'), numero: marca('hist_numero'), importe: 10,
            estado: 'endosado', fecha: '2026-09-12', destino: marca('hist_destino') } },
        { accion: 'cheque_vuelve_cartera', empleado_id: 'e5', motivo: marca('hist_motivo_vuelta'), created_at: '2026-09-13T12:00:00Z',
          antes: { cheque_id: 'q9', banco_codigo: '007', numero: '12345678', importe: 10,
            estado: 'depositado', fecha: '2026-09-12', destino: marca('hist_destino_antes'), por: 'e5' } },
      ],
      nombres: new Map([['e5', marca('det_salida_por')]]),
    }
    const html = S27.htmlDetalle(d)
    chequearMarcas('detalle con un cheque salido', html,
      ['det_destino', 'det_salida_por', 'hist_banco', 'hist_numero', 'hist_destino', 'hist_motivo_vuelta', 'hist_destino_antes'])
    chk('detalle: el cheque muestra su estado', html.includes('cob-estado--endosado') && html.includes('>Endosado<'))
    chk('detalle: y la fecha de salida', html.includes('Endosado el 12/09/2026 a '))
    chk('detalle: con un cheque afuera avisa que hay que volverlo a cartera para editar o anular',
      /primero hay que volverlos a cartera/.test(html))
    chk('historial: la salida se lee en castellano', html.includes('Salida de un cheque') && html.includes(': endosado el 12/09/2026 a '))
    chk('historial: la vuelta a cartera dice lo que el cheque ERA',
      html.includes('Cheque vuelto a cartera') && html.includes('volvió a cartera. Figuraba depositado el 12/09/2026 en '))
    chk('historial: ninguna acción cruda (cheque_salida) en pantalla', !/>cheque_salida|>cheque_vuelve_cartera/.test(html))

    const depositado = S27.htmlChequeDetalle({ ...ch, estado: 'depositado', salida_destino: marca('det_destino_dep') }, d.nombres)
    chequearMarcas('detalle con un cheque depositado', depositado, ['det_destino_dep', 'det_salida_por'])
    chk('detalle: un depositado muestra fecha y dónde', depositado.includes('>Depositado<') && depositado.includes('Depositado el 12/09/2026 en '))
    const depSinDestino = S27.htmlChequeDetalle({ ...ch, estado: 'depositado', salida_destino: null }, d.nombres)
    chk('detalle: un depositado sin destino no deja un "en" colgando', depSinDestino.includes('Depositado el 12/09/2026<'))

    const sinSalidos = S27.htmlDetalle({ ...d, cheques: [{ ...ch, estado: 'en_cartera', salida_fecha: null, salida_destino: null, salida_por: null }], historial: [] })
    chk('detalle: sin cheques afuera no hay aviso', !/primero hay que volverlos a cartera/.test(sinSalidos))
    chk('detalle: un cheque en cartera dice "En cartera" y ninguna salida', sinSalidos.includes('>En cartera<') && !/Depositado el|Endosado el/.test(sinSalidos))
    const anulada = S27.htmlDetalle({ ...d, cabecera: { ...d.cabecera, estado: 'anulada' }, historial: [] })
    chk('detalle: en una cobranza anulada no se sugiere volver cheques a cartera', !/primero hay que volverlos a cartera/.test(anulada))
  }

  // ── Rediseño 3.4: la escala de avisos ────────────────────────────────────
  // Dos escalones: .cob-aviso a secas INFORMA (neutro) y .cob-aviso--grave
  // dice que un dato está mal o que no se puede seguir (bordó). Sin ámbar y
  // sin naranja. Se ejecutan los renders de cada caso.
  {
    const S34 = construir(ARCHIVO)
    S34.estado.bancos = new Map([['007', 'Banco de Galicia']])
    const claseAviso = (html) => (html.match(/<div class="(cob-aviso[^"]*)"/) || [])[1]
    const neutro = (html) => claseAviso(html) === 'cob-aviso'
    const grave = (html) => /\bcob-aviso--grave\b/.test(claseAviso(html) || '')

    // Los estados de las fotos: todos informan.
    const f = { id: 'form', fotos: [], cheques: [{ id: 'c1', foto_id: 'leida' }] }
    const estadosFoto = {
      subiendo: { id: 's', enCurso: true, fase: 'subiendo' },
      leyendo: { id: 'l', enCurso: true, fase: 'leyendo', leyendoDesde: 0 },
      lenta: { id: 'l2', enCurso: true, fase: 'leyendo', leyendoDesde: -200000 },
      errorLector: { id: 'e', error: 'No se pudo leer la foto. Cargá los cheques a mano.', subida: true },
      sinSenal: { id: 'n', subida: false, leida: false, errorRed: true },
      reintenta: { id: 'r', subida: true, leida: false },
      sinCheques: { id: 'v', subida: true, leida: true },
      leida: { id: 'leida', subida: true, leida: true },
    }
    for (const [nombre, foto] of Object.entries(estadosFoto)) {
      const html = S34.htmlAvisoFoto(foto, 0, f, 1000)
      chk(`3.4 foto (${nombre}): aviso neutro, ni bordó ni ámbar ni naranja`, neutro(html), html.slice(0, 120))
    }

    // La tarjeta abierta: lo que está MAL va bordó, lo que informa va neutro.
    const conDv = (c) => c + String(S34.dvBcra(c))
    const tarjeta = (extra) => {
      const ch = { ...S34.chequeVacio('f1'), id: 'k', r1: conDv('0073863218'), r2: conDv('66259862'), r3: conDv('09420314667'), abierto: true, ...extra }
      S34.aplicarRenglones(ch)
      return S34.htmlTarjetaCheque(ch, { id: 'form', fotos: [{ id: 'f1' }], cheques: [ch] })
    }
    const avisos = (html) => html.match(/<div class="cob-aviso[^"]*"[^>]*>[^<]*/g) || []
    const avisoCon = (html, texto) => avisos(html).find(a => a.includes(texto)) || ''
    const dvMal = tarjeta({ r2: '662598620' })
    chk('3.4 tarjeta: un dígito que no cierra marca el renglón y la lista de errores va bordó',
      dvMal.includes('No coincide con el dígito de control') && /class="cob-aviso cob-aviso--grave"/.test(dvMal))
    const t1 = tarjeta({
      controles: { completado_desde_cmc7: true, letras_coinciden: false, cuits_ok: false, cmc7_coincide: false, fechas_ok: false },
      ocr_propuesto: { importe: 1000, importe_letras_valor: 900, notas: 'borroso' },
    })
    chk('3.4 tarjeta: "se completaron desde la banda magnética" informa (neutro)',
      /^<div class="cob-aviso">/.test(avisoCon(t1, 'banda magnética. Verificá')))
    chk('3.4 tarjeta: letras distintas de números es un dato mal (bordó)', /cob-aviso--grave/.test(avisoCon(t1, 'En letras dice')))
    chk('3.4 tarjeta: un CUIT inválido es un dato mal (bordó)', /cob-aviso--grave/.test(avisoCon(t1, 'CUIT')))
    chk('3.4 tarjeta: la banda que no coincide con el recuadro es un dato mal (bordó)', /cob-aviso--grave/.test(avisoCon(t1, 'no coincide con el recuadro')))
    chk('3.4 tarjeta: las fechas que no cierran son un dato mal (bordó)', /cob-aviso--grave/.test(avisoCon(t1, 'fechas leídas')))
    chk('3.4 tarjeta: la nota del lector informa (neutro)', /^<div class="cob-aviso">/.test(avisoCon(t1, 'El lector anotó')))
    const dupP = tarjeta({ duplicado: { nivel: 'parcial', texto: 'Mismo número en otra cuenta' } })
    const dupC = tarjeta({ duplicado: { nivel: 'completo', texto: 'Este cheque ya está cargado' } })
    chk('3.4 tarjeta: el choque parcial de numeración informa; el cheque repetido es grave',
      !/cob-aviso--grave/.test(avisoCon(dupP, 'Mismo número')) && /cob-aviso--grave/.test(avisoCon(dupC, 'ya está cargado')))
    chk('3.4 tarjeta: dólares no se puede cargar (bordó)', /cob-aviso--grave/.test(avisoCon(tarjeta({ controles: { moneda_ok: false } }), 'dólares')))

    // El detalle.
    const ch = { id: 'k1', foto_id: 'f1', banco_codigo: '007', numero: '66259862', cuenta: '09420314667', tipo: 'comun',
      fecha_emision: '2026-09-15', fecha_pago: null, importe: 1, estado: 'en_cartera', titulares: [], beneficiario: 'Otro SA' }
    chk('3.4 detalle: el aviso de endoso informa (neutro)', /^<div class="cob-aviso" /.test(avisoCon(S34.htmlChequeDetalle(ch, new Map()), 'endosado al dorso')))
    const d = { cabecera: { id: 'c1', empleado_id: 'emp-1', cliente: 'x', estado: 'registrada', fecha: '2026-09-17', efectivo: 0, cantidad_cheques: 1, total_cheques: 1, total: 1 },
      cheques: [{ ...ch, estado: 'depositado', salida_fecha: '2026-09-18' }], fotos: [], historial: [], nombres: new Map() }
    chk('3.4 detalle: "hay cheques que ya salieron" informa (neutro)', /^<div class="cob-aviso">/.test(avisoCon(S34.htmlDetalle(d), 'ya salieron de cartera')))
    const dAn = { ...d, cabecera: { ...d.cabecera, estado: 'anulada', motivo_anulacion: 'error' }, cheques: [] }
    chk('3.4 detalle: el motivo de una anulada va bordó', /cob-aviso--grave/.test(avisoCon(S34.htmlDetalle(dAn), 'Anulada:')))

    // Lo que falta para guardar informa: faltar un dato no es tener uno mal.
    S34.estado.form = { id: 'f', cliente: '', fecha: '2026-09-17', efectivo: '', cheques: [], fotos: [] }
    S34.pintarTotalYGuardado()
    chk('3.4 lo que falta para guardar informa (neutro)', S34.__els.get('cob-form-pendientes').className === 'cob-aviso')

    const css = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))
    const regla = (sel) => { const i = css.indexOf('\n    ' + sel + ' {'); return i === -1 ? '' : css.slice(i, css.indexOf('}', i)) }
    chk('3.4 css: el aviso base es neutro (superficie, franja gris terciaria, texto secundario)',
      /background:\s*var\(--color-superficie\)/.test(regla('.cob-aviso')) &&
      /border-left:\s*4px solid var\(--color-texto-suave\)/.test(regla('.cob-aviso')) &&
      /color:\s*var\(--cob-texto-secundario\)/.test(regla('.cob-aviso')))
    chk('3.4 css: el aviso grave es bordó', /--bordo-suave/.test(regla('.cob-aviso--grave')) && /--bordo\)/.test(regla('.cob-aviso--grave')) && /--bordo-oscuro/.test(regla('.cob-aviso--grave')))
    const iAv = css.indexOf('\n    .cob-aviso {')
    chk('3.4 css: la variante grave va DESPUÉS de su base', iAv !== -1 && css.indexOf('\n    .cob-aviso--grave {') > iAv)
    chk('3.4 módulo: no queda ámbar (ni la variable ni la clase)', !/amarillo|cob-aviso--ambar|cob-aviso--naranja|cob-aviso--alerta/.test(FUENTE))
    chk('3.4 css: Endosado es un estado gris, como Depositado',
      regla('.cob-estado--endosado').replace('.cob-estado--endosado', '') === regla('.cob-estado--depositado').replace('.cob-estado--depositado', ''))
    chk('3.4 css: el total de la barra de carga va en tinta neutra',
      /color:\s*var\(--color-texto\)/.test(regla('.cob-barra-fija__cifra')) && !/naranja/.test(regla('.cob-barra-fija__cifra')))
    chk('3.4 html: el aviso de cobranzas solo en el celular es neutro', FUENTE.includes('<div class="cob-aviso" id="cob-banner-local" hidden>'))
  }

  // ── Rediseño 3.3: la tarjeta de cheque en tres niveles ────────────────────
  // Importe solo arriba; Emisión · Paga el · N° cheque con etiqueta; banco y
  // cuenta al pie. "A la vista" en comunes y "en N días" en diferidos. Las
  // miniaturas salieron de las tarjetas: "Ver la foto" es un botón.
  {
    const S33 = construir(ARCHIVO)
    S33.estado.bancos = new Map([['007', 'Banco de Galicia']])
    const hoy = '2026-09-17'
    chk('3.3 días: 59 días', S33.textoDiasHastaPago('2026-11-15', hoy) === 'en 59 días')
    chk('3.3 días: mañana, hoy, ayer y el pasado', S33.textoDiasHastaPago('2026-09-18', hoy) === 'mañana' &&
      S33.textoDiasHastaPago('2026-09-17', hoy) === 'hoy' && S33.textoDiasHastaPago('2026-09-16', hoy) === 'desde ayer' &&
      S33.textoDiasHastaPago('2026-09-10', hoy) === 'desde hace 7 días')
    chk('3.3 días: una fecha que falta o no es válida no inventa días (nunca NaN)',
      [null, undefined, '', 'basura', '2026-02-30'].every(x => S33.textoDiasHastaPago(x, hoy) === ''))
    chk('3.3 días: un "hoy" que no es válido tampoco inventa días', S33.textoDiasHastaPago('2026-11-15', null) === '')

    const dif = { id: 'k1', foto_id: 'f1', banco_codigo: '007', numero: '66259862', cuenta: '09420314667',
      tipo: 'diferido', fecha_emision: '2026-09-15', fecha_pago: '2026-11-15', importe: 827500, estado: 'en_cartera', titulares: [] }
    const com = { ...dif, id: 'k2', tipo: 'comun', fecha_pago: null }
    const dDif = S33.htmlDatosCheque(dif, hoy), dCom = S33.htmlDatosCheque(com, hoy)
    const col = (html, etq) => { const i = html.indexOf(`>${etq}<`); return i === -1 ? '' : html.slice(i, html.indexOf('</div>\n            </div>', i)) }
    chk('3.3 datos: tres columnas etiquetadas, en orden Emisión · Paga el · N° cheque',
      dDif.indexOf('>Emisión<') !== -1 && dDif.indexOf('>Emisión<') < dDif.indexOf('>Paga el<') && dDif.indexOf('>Paga el<') < dDif.indexOf('>N&deg; cheque<'))
    chk('3.3 datos: el diferido dice su fecha de pago y cuántos días faltan',
      col(dDif, 'Paga el').includes('15/11/2026') && dDif.includes('<div class="cob-cheque__dias">en 59 días</div>'))
    chk('3.3 datos: el común dice "A la vista" y ningún conteo de días',
      col(dCom, 'Paga el').includes('>A la vista<') && !dCom.includes('cob-cheque__dias'))
    chk('3.3 datos: un diferido sin fecha de pago no dice "NaN"', !/NaN/.test(S33.htmlDatosCheque({ ...dif, fecha_pago: null }, hoy)))

    const det = S33.htmlChequeDetalle(dif, new Map())
    chk('3.3 detalle: el importe va solo arriba, con el chip de tipo al lado',
      /<div class="cob-cheque__top">\s*<span class="cob-cheque__monto">\$\s827\.500,00<\/span>\s*<span class="cob-cheque__tipo">Diferido<\/span>/.test(det))
    chk('3.3 detalle: banco y cuenta al pie, después de los datos',
      /<div class="cob-cheque__pie">Banco de Galicia · cuenta <span class="cob-cheque__num">09420314667<\/span><\/div>/.test(det) &&
      det.indexOf('cob-cheque__pie') > det.indexOf('cob-cheque__datos'))
    chk('3.3 detalle: sin miniatura y con "Ver la foto" de ancho completo',
      !/<img/.test(det) && /class="cob-btn cob-btn--chico cob-btn--ancho" data-ver-foto="f1">Ver la foto</.test(det))

    const foto = { id: 'f1', storage_path: 'x/y.jpg' }
    const pleg = { ...S33.chequeVacio('f1'), ...dif, confirmado: true, abierto: false, importe: '827.500,00' }
    const htmlPleg = S33.htmlTarjetaCheque(pleg, { id: 'form', fotos: [foto], cheques: [pleg] })
    // La plegada es la FILA COMPACTA (septiembre 2026); el detalle de arriba
    // queda igual. La fila en detalle: test-cobranzas-cabecera.js.
    chk('3.3 plegada: fila compacta con el importe, "Nº · paga DD/MM" y el banco (cuenta en el title)',
      /<span class="cob-cheque-fila__monto">\$\s827\.500,00<\/span>/.test(htmlPleg) &&
      /<span class="cob-cheque-fila__sub">Nº 66259862 · paga 15\/11<\/span>/.test(htmlPleg) &&
      /<span class="cob-cheque-fila__banco" title="Banco de Galicia · cuenta 09420314667">Banco de Galicia<\/span>/.test(htmlPleg))
    chk('3.3 plegada: sin miniatura; la foto se abre desde el cheque (data-mini), Editar y Quitar como botones',
      !/<img/.test(htmlPleg) && /<button[^>]*class="cob-cheque-fila__info" data-mini="k1"/.test(htmlPleg) &&
      /data-editar-cheque="k1"/.test(htmlPleg) && /data-quitar-cheque="k1"/.test(htmlPleg))
    const conDv = (c) => c + String(S33.dvBcra(c))
    const abierta = { ...S33.chequeVacio('f1'), id: 'k9', r1: conDv('0073863218'), r2: conDv('66259862'), r3: conDv('09420314667'), abierto: true }
    S33.aplicarRenglones(abierta)
    const htmlAb = S33.htmlTarjetaCheque(abierta, { id: 'form', fotos: [foto], cheques: [pleg, abierta] })
    chk('3.3 abierta: "Cheque 2 de 2", banco · foto 1 y el botón Ver la foto, sin miniatura',
      htmlAb.includes('>Cheque 2 de 2<') && htmlAb.includes('Banco de Galicia · foto 1') &&
      /<button[^>]*data-mini="k9">Ver la foto<\/button>/.test(htmlAb) && !/<img/.test(htmlAb))

    const css = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))
    const regla = (sel) => { const i = css.indexOf('\n    ' + sel + ' {'); return i === -1 ? '' : css.slice(i, css.indexOf('}', i)) }
    chk('3.3 css: el importe del cheque va en tinta neutra, nunca naranja',
      /color:\s*var\(--color-texto\)/.test(regla('.cob-cheque__monto')) && !/naranja/.test(regla('.cob-cheque__monto')))
    chk('3.3 css: los inputs de los renglones y los titulares reciben el estilo de campo (ancho y 44px)',
      /\.cob-renglon input,\s*\n\s*\.cob-titular input \{[^}]*width:\s*100%[^}]*min-height:\s*44px/.test(css))
    chk('3.3 css: con el foco, el borde de validación del renglón sigue ganando',
      /\.cob-renglon--ok input:focus \{ border-color: var\(--verde\); \}/.test(css) &&
      /\.cob-renglon--mal input:focus \{ border-color: var\(--bordo\); \}/.test(css) &&
      css.indexOf('.cob-renglon--ok input:focus') > css.indexOf('.cob-renglon input:focus'))
    chk('3.3 css: "En cartera" es neutro, no el naranja suave de "registrada"',
      !/naranja/.test(regla('.cob-estado--en_cartera')))
    chk('3.3 css: la tarjeta confirmada no lleva fondo teñido', !/background/.test(regla('.cob-cheque--confirmado')))
    chk('3.3 css: no queda la regla de la miniatura', !css.includes('.cob-cheque__mini'))
    chk('3.3 módulo: no queda ningún "Al día"', !FUENTE.includes('Al día'))
  }

  // ── Rediseño 3.2: jerarquía del listado ──────────────────────────────────
  // El total va en tinta neutra, el estado de la fila es TEXTO (la franja
  // izquierda ya lo marca con color) y los filtros de estado son un
  // segmentado, distinto del chip de estado. Se ejecutan los renders; el
  // color, que un render no puede mostrar, se mira en el CSS.
  {
    const S32 = construir(ARCHIVO)
    const base = { id: 'c1', cliente: 'Cliente', fecha: '2026-09-17', total: 1500, efectivo: 500,
      cantidad_cheques: 2, created_at: '2026-09-17T12:00:00Z', cargada_por_nombre: 'X', editada: false }
    const reg = S32.htmlFilaCobranza({ ...base, estado: 'registrada' })
    const proc = S32.htmlFilaCobranza({ ...base, estado: 'procesada' })
    const anu = S32.htmlFilaCobranza({ ...base, estado: 'anulada' })
    chk('3.2 fila: lleva la clase de su estado (la franja sale de ahí)',
      /class="tarjeta-lista cob-fila cob-fila--registrada"/.test(reg) && /cob-fila--anulada/.test(anu) && /cob-fila--procesada/.test(proc))
    chk('3.2 fila: el estado es texto y no chip',
      /class="cob-fila__estado cob-fila__estado--registrada">Por controlar</.test(reg) && !/cob-estado/.test(reg + proc + anu))
    chk('3.2 fila: la cantidad de cheques va en su propio span',
      /<span class="cob-fila__cheques">2 cheques<\/span>/.test(reg))
    chk('3.2 fila: fecha, cheques y efectivo separados por el punto medio',
      /<span class="cob-fila__detalle"><span>17\/09\/2026<\/span> · <span class="cob-fila__cheques">2 cheques<\/span> · <span>\$\s500,00 en efectivo<\/span><\/span>/.test(reg))
    const soloEf = S32.htmlFilaCobranza({ ...base, estado: 'procesada', cantidad_cheques: 0, efectivo: 0 })
    chk('3.2 fila: sin cheques ni efectivo lo dice, sin "0 cheques"',
      soloEf.includes('Sin cheques ni efectivo') && !soloEf.includes('0 cheques'))

    const css = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))
    const regla = (sel) => { const i = css.indexOf('\n    ' + sel + ' {'); return i === -1 ? '' : css.slice(i, css.indexOf('}', i)) }
    chk('3.2 css: el total de la fila va en tinta neutra, nunca naranja',
      /color:\s*var\(--color-texto\)/.test(regla('.cob-fila__total')) && !/naranja/.test(regla('.cob-fila__total')))
    chk('3.2 css: franja naranja en lo registrado y bordó en lo anulado',
      /border-left-color:\s*var\(--naranja\)/.test(regla('.cob-fila--registrada')) &&
      /border-left-color:\s*var\(--bordo\)/.test(regla('.cob-fila--anulada')))
    const iBase = css.indexOf('\n    .cob-fila {')
    chk('3.2 css: las variantes de franja van DESPUÉS de .cob-fila',
      iBase !== -1 && css.indexOf('\n    .cob-fila--registrada {') > iBase && css.indexOf('\n    .cob-fila--anulada {') > iBase)
    chk('3.2 css: el segmentado respeta el mínimo táctil de 44px', /min-height:\s*44px/.test(regla('.cob-segmento__opcion')))
    const iSeg = css.indexOf('\n    .cob-segmento__opcion {')
    chk('3.2 css: la opción activa va DESPUÉS de su base',
      iSeg !== -1 && css.indexOf('\n    .cob-segmento__opcion--activo {') > iSeg)
    chk('3.2 css: no queda el CSS muerto .cob-estado--local', !css.includes('.cob-estado--local'))

    const opciones = (html) => html.match(/<button[^>]*>/g) || []
    S32.estado.filtros.estado = 'procesada'
    S32.renderizarChipsEstado()
    const seg = S32.__els.get('cob-chips-estado').innerHTML
    const bs = opciones(seg)
    chk('3.2 segmentado: cuatro opciones, ninguna con el tratamiento de chip',
      bs.length === 4 && bs.every(b => /class="cob-segmento__opcion /.test(b)) && !/cob-chip/.test(seg))
    chk('3.2 segmentado: UNA sola activa, la del filtro, y aria-pressed lo dice',
      bs.filter(b => /cob-segmento__opcion--activo/.test(b)).length === 1 &&
      bs.filter(b => /aria-pressed="true"/.test(b)).length === 1 &&
      /cob-segmento__opcion--activo" aria-pressed="true" data-estado="procesada"/.test(seg))
  }

  // ── pintarEstadoFotos ───────────────────────────────────────────────────
  {
    const S4 = construir(ARCHIVO)
    S4.estado.form = {
      id: 'form1', cheques: [],
      fotos: [
        { id: marca('foto_id'), error: marca('foto_error'), subida: true, leida: true },
        { id: 'f2', error: null, subida: false, leida: false },
      ],
    }
    S4.pintarEstadoFotos()
    chequearMarcas('pintarEstadoFotos', S4.__els.get('cob-fotos-estado').innerHTML,
      ['foto_id', 'foto_error'])
  }

  // ── pintarBannerLocal ───────────────────────────────────────────────────
  {
    const S5 = construir(ARCHIVO)
    S5.estado.locales = [
      { id: marca('local_id'), cliente: marca('local_cliente'), fecha: '2026-09-17', estadoLocal: 'lista_para_subir' },
    ]
    S5.pintarBannerLocal()
    chequearMarcas('pintarBannerLocal', S5.__els.get('cob-banner-local').innerHTML,
      ['local_id', 'local_cliente'])
    // Sin pendientes no se dibuja nada: un banner que aparece cuando no hay
    // nada que avisar entrena a ignorarlo.
    S5.estado.locales = []
    S5.pintarBannerLocal()
    chk('pintarBannerLocal: sin pendientes no dibuja nada', S5.__els.get('cob-banner-local').innerHTML === '')
  }

  // ── cargarRepartidores (el <option> del filtro) ──────────────────────────
  {
    const S6 = construir(ARCHIVO)
    S6.estado.miRolApp = 'super_admin'
    S6.__set([{ id: marca('rep_id'), nombre: marca('rep_nombre') }])
    esperas.push(S6.cargarRepartidores().then(() => {
      chequearMarcas('cargarRepartidores', S6.__els.get('cob-filtro-repartidor').innerHTML,
        ['rep_id', 'rep_nombre'])
    }))
  }

  // ── renderizarChipsEstado / pintarTotalYGuardado ─────────────────────────
  {
    const S7 = construir(ARCHIVO)
    S7.renderizarChipsEstado()
    chk('renderizarChipsEstado: dibuja los cuatro chips',
      (S7.__els.get('cob-chips-estado').innerHTML.match(/data-estado=/g) || []).length === 4)
    S7.estado.form = { id: 'f', cliente: '', fecha: '2026-09-17', efectivo: '', cheques: [], fotos: [{ id: 'z' }] }
    S7.pintarTotalYGuardado()
    const caja = S7.__els.get('cob-form-pendientes')
    chk('pintarTotalYGuardado: avisa lo que falta', /Falta el cliente\./.test(caja.innerHTML))
    chk('pintarTotalYGuardado: el botón queda deshabilitado desde JS',
      S7.__els.get('cob-btn-guardar').disabled === true)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 2. CHEQUEO ESTÁTICO
// ══════════════════════════════════════════════════════════════════════════

if (SOLO !== 'render') {
  const r = interpolaciones(ARCHIVO)
  const enHtml = r.interpolaciones.filter(i => i.html)
  const aRevisar = enHtml.concat(r.asignaciones.map(a => ({ ...a, html: true, sink: true })))

  // Hojas seguras PROPIAS de este archivo que todavía no están en la lista de
  // clasificar.js, CADA UNA CON SU MOTIVO (22/09/2026).
  const SEGURAS_LOCALES = new Map([
    ['htmlLinkChequeEnCartera(ch)', 'HTML armado por htmlLinkChequeEnCartera(): literal del código + encodeURIComponent(ch.id) entre comillas dobles'],
  ])
  const malas = []
  for (const x of aRevisar) {
    const c = clasificar(x.expr)
    const hojas = c.hojasMalas.filter(h => !SEGURAS_LOCALES.has(h))
    if (hojas.length) malas.push(`línea ${x.linea}: ${hojas.join(' | ')}`)
  }
  chk('estático: no queda ninguna interpolación de HTML sin escapar ni justificar',
    malas.length === 0, malas.join('  //  '))

  // El escáner tiene que estar VIENDO el archivo, no una versión pelada a la
  // que se le comió medio contenido.
  chk('estático: el escáner encontró interpolaciones en HTML', enHtml.length > 100,
    `solo ${enHtml.length}`)
  chk('estático: el escáner encontró las asignaciones a innerHTML', r.asignaciones.length >= 10,
    `solo ${r.asignaciones.length}`)
  chk('estático: hay escapes de verdad, no todo justificado por lista',
    enHtml.filter(i => /^escCob\(/.test(i.expr.trim())).length > 60)

  // ── En qué CONTEXTO del HTML cae cada interpolación ──────────────────────
  // escCob alcanza para el contenido y para un atributo ENTRE COMILLAS. No
  // alcanza para un atributo sin comillas (un espacio ya rompe afuera) ni para
  // un manejador de evento o una URL, donde el contenido es código.
  const sinComillas = [], enEvento = [], enUrl = [], urlsPermitidas = []
  for (const x of enHtml) {
    // Último '<' del texto previo: dice si estamos dentro de una etiqueta.
    const ultimaEtiqueta = x.antes.lastIndexOf('<')
    const ultimoCierre = x.antes.lastIndexOf('>')
    const dentroDeEtiqueta = ultimaEtiqueta > ultimoCierre
    if (!dentroDeEtiqueta) continue
    const tramo = x.antes.slice(ultimaEtiqueta)
    const comillas = (tramo.match(/"/g) || []).length
    const dentroDeAtributo = comillas % 2 === 1
    if (!dentroDeAtributo && /[\w-]+\s*=\s*$/.test(tramo)) sinComillas.push(x.linea)
    if (dentroDeAtributo) {
      const nombreAttr = (tramo.match(/([\w-]+)\s*=\s*"[^"]*$/) || [])[1] || ''
      if (/^on/i.test(nombreAttr)) enEvento.push(`${x.linea} (${nombreAttr})`)
      if (/^(href|src|action|formaction|xlink:href)$/i.test(nombreAttr)) {
        // LA ÚNICA EXCEPCIÓN (22/09/2026): un link RELATIVO a otra página del
        // módulo con el esquema fijado por el literal ("cheques.html?cheque=")
        // y SOLO un encodeURIComponent(...) interpolado como valor. Ahí el
        // valor no puede cambiar a dónde apunta el link ni cerrar el atributo
        // (encodeURIComponent codifica la comilla doble). Cualquier otra forma
        // sigue en rojo.
        const valorHastaAca = (tramo.match(/[\w-]+\s*=\s*"([^"]*)$/) || [])[1]
        if (/^href$/i.test(nombreAttr) && /^[a-z-]+\.html\?[a-z_]+=$/.test(valorHastaAca) &&
            /^encodeURIComponent\([^()]*\)$/.test(x.expr.trim())) urlsPermitidas.push(`${x.linea}: ${valorHastaAca}\${${x.expr.trim()}}`)
        else enUrl.push(`${x.linea} (${nombreAttr})`)
      }
    }
  }
  chk('estático: ninguna interpolación cae en un atributo SIN comillas',
    sinComillas.length === 0, sinComillas.join(', '))
  chk('estático: ninguna interpolación cae dentro de un manejador on*=',
    enEvento.length === 0, enEvento.join(', '))
  chk('estático: ninguna interpolación cae dentro de un href/src (ahí escapar HTML no alcanza)',
    enUrl.length === 0, enUrl.join(', '))
  chk('estático: el único href interpolado es el "Ver en Cheques", con encodeURIComponent',
    urlsPermitidas.length === 1 && /cheques\.html\?cheque=\$\{encodeURIComponent\(ch\.id\)\}$/.test(urlsPermitidas[0]), urlsPermitidas.join(' | '))
}

// ══════════════════════════════════════════════════════════════════════════
// 3. CONTROLES DE CALIBRACIÓN — si estos dan mal, el barrido está mal
// ══════════════════════════════════════════════════════════════════════════

{
  // (1) El aviso de cheque duplicado SÍ se escapa.
  chk('control 1: el aviso de duplicado se escapa',
    /escCob\(ch\.duplicado\.texto\)/.test(FUENTE))
  // (2) mostrarError/mostrarExito NO son sink: los toasts usan textContent.
  const utils = fs.readFileSync(path.join(RAIZ, 'js/utils.js'), 'utf8')
  chk('control 2: los toasts de js/utils.js usan textContent y no innerHTML',
    /toast\.textContent\s*=/.test(utils) && !/toast\.innerHTML\s*=/.test(utils))
  // (3) escCob cubre los cinco caracteres, EJECUTÁNDOLO: sin la comilla doble,
  // un value="..." se sigue pudiendo cerrar desde adentro del atributo.
  const { extraerFn } = require('./extraer')
  const escCobReal = new Function(extraerFn(FUENTE, 'escCob') + '\nreturn escCob')()
  for (const [crudo, esperado] of [['&', '&amp;'], ['<', '&lt;'], ['>', '&gt;'], ['"', '&quot;'], ["'", '&#39;']]) {
    chk(`control 3: escCob escapa ${crudo}`, escCobReal(crudo) === esperado, escCobReal(crudo))
  }
  chk('control 3: escCob no convierte null en la palabra null', escCobReal(null) === '')
}

let cerrado = false
function cerrar() {
  if (cerrado) return
  cerrado = true
  const total = ok + fallas.length
  for (const f of fallas) console.log('  ✗ ' + f)
  console.log(`${ok}/${total}${fallas.length ? '  ROJO' : '  verde'}`)
  process.exit(fallas.length ? 1 : 0)
}

// Las ramas async (cargarRepartidores, cargarResumenCheques) cierran al
// terminar. Una que falle con excepción es una falla, no un silencio.
Promise.all(esperas.map(p => p.catch(err => chk('rama async sin excepción', false, String(err && err.stack || err)))))
  .then(cerrar)
