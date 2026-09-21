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
      'tarj_emision', 'tarj_pago', 'tarj_importe',
    ])

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
  // lo calculó el sistema y nadie lo leyó del papel; 'mal' dice que no cierra.
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
      chk(`pie cmc7 renglón ${i + 1}: dice que el dígito no se leyó del papel`,
        cuenta(s, 'no se leyó del papel') === 1)
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

  // ══ VISTA DE CHEQUES ════════════════════════════════════════════════════

  // ── filtroNumeroCheque: los cuatro largos, más el vacío y el sin dígitos ──
  {
    const S10 = construir(ARCHIVO)
    const f = S10.filtroNumeroCheque
    const cuerpo = '66259862'
    const dv = String(S10.dvBcra(cuerpo))
    const dvMal = String((Number(dv) + 1) % 10)

    chk('número: vacío no filtra', f('').modo === 'ninguno' && f('   ').modo === 'ninguno')
    chk('número: menos de 8 dígitos es PARCIAL', f('9862').modo === 'parcial' && f('9862').digitos === '9862')
    chk('número: se cuentan DÍGITOS y no caracteres ("285-386" son 6)',
      f('285-386').modo === 'parcial' && f('285-386').digitos === '285386')
    chk('número: exactamente 8 es EXACTO', f(cuerpo).modo === 'exacto' && f(cuerpo).digitos === cuerpo && f(cuerpo).aviso === '')
    const nueve = f(cuerpo + dv)
    chk('número: 9 con el dígito que cierra → exacto sobre los primeros 8',
      nueve.modo === 'exacto' && nueve.digitos === cuerpo && /de control del banco/.test(nueve.aviso))
    const nueveMal = f(cuerpo + dvMal)
    chk('número: 9 con un dígito que no cierra → busca igual y AVISA',
      nueveMal.modo === 'exacto' && nueveMal.digitos === cuerpo && /no coincide/.test(nueveMal.aviso))
    const diez = f(cuerpo + '12')
    chk('número: más de 9 NO filtra y avisa cuántos se escribieron',
      diez.modo === 'demasiado' && diez.digitos === '' && /escribiste 10/.test(diez.aviso))
    chk('número: un "%" solo NO es "ninguno" (que mostraría todos)',
      f('%').modo === 'sin_digitos' && f('%').aviso !== '')
  }

  // ── aplicarFiltrosCheques: qué se le pide de verdad a la consulta ─────────
  {
    const S11 = construir(ARCHIVO)
    const grabar = () => {
      const llamadas = []
      const q = {}
      for (const m of ['eq', 'in', 'like', 'ilike', 'neq', 'or', 'filter', 'not', 'match'])
        q[m] = (...a) => { llamadas.push([m, ...a]); return q }
      return { q, llamadas }
    }
    const correr = (filtros) => {
      const g = grabar()
      const r = S11.aplicarFiltrosCheques(g.q, { estado: 'en_cartera', numero: '', banco: '', ...filtros })
      return { ...r, llamadas: g.llamadas }
    }
    const likes = (ll) => ll.filter(x => x[0] === 'like' || x[0] === 'ilike')

    const pct = correr({ numero: '%' })
    chk('filtro: un "%" tipeado da CERO resultados (no consulta)', pct.sinResultados === true)
    const pct2 = correr({ numero: '%%_' })
    chk('filtro: "%%_" tampoco consulta', pct2.sinResultados === true)
    const mezcla = correr({ numero: '6625%' })
    chk('filtro: "6625%" busca los dígitos, sin el comodín tipeado',
      !mezcla.sinResultados && likes(mezcla.llamadas).length === 1 && likes(mezcla.llamadas)[0][2] === '%6625%',
      JSON.stringify(mezcla.llamadas))
    const guion = correr({ numero: '12_4' })
    chk('filtro: el "_" tipeado no llega al patrón', likes(guion.llamadas)[0]?.[2] === '%124%', JSON.stringify(guion.llamadas))
    // Ningún patrón like puede tener otra cosa que dígitos entre los %.
    const todos = [correr({ numero: '9862' }), mezcla, guion, correr({ numero: 'a%b1' })]
    chk('filtro: todo patrón like es %dígitos%',
      todos.every(r => likes(r.llamadas).every(x => /^%\d+%$/.test(x[2]))))
    const exacto = correr({ numero: '66259862' })
    chk('filtro: 8 dígitos → eq sobre numero, sin like',
      exacto.llamadas.some(x => x[0] === 'eq' && x[1] === 'numero' && x[2] === '66259862') && likes(exacto.llamadas).length === 0)
    const diez = correr({ numero: '6625986212' })
    chk('filtro: más de 9 no filtra por número pero SÍ consulta',
      !diez.sinResultados && !diez.llamadas.some(x => x[1] === 'numero'))
    chk('filtro: "en cartera" pide estado = en_cartera',
      correr({}).llamadas.some(x => x[0] === 'eq' && x[1] === 'estado' && x[2] === 'en_cartera'))
    const sal = correr({ estado: 'salidos' }).llamadas.find(x => x[1] === 'estado')
    chk('filtro: "salidos" pide depositado y endosado, y nada más',
      sal && sal[0] === 'in' && JSON.stringify(sal[2]) === JSON.stringify(['depositado', 'endosado']), JSON.stringify(sal))
    chk('filtro: "todos" no filtra por estado (es el único que trae anulados)',
      !correr({ estado: 'todos' }).llamadas.some(x => x[1] === 'estado'))
    chk('filtro: el banco va por eq sobre banco_codigo',
      correr({ banco: '007' }).llamadas.some(x => x[0] === 'eq' && x[1] === 'banco_codigo' && x[2] === '007'))
  }

  // ── Orden y total en cartera ──────────────────────────────────────────────
  {
    const S12 = construir(ARCHIVO)
    const filas = [
      { id: 'a', numero: '4', tipo: 'diferido', fecha_emision: '2026-08-01', fecha_pago: '2026-10-01' },
      { id: 'b', numero: '1', tipo: 'comun', fecha_emision: '2026-09-20', fecha_pago: null },
      { id: 'c', numero: '3', tipo: 'diferido', fecha_emision: '2026-09-01', fecha_pago: '2026-09-25' },
      { id: 'd', numero: '2', tipo: 'comun', fecha_emision: '2026-11-01', fecha_pago: null },
    ]
    const orden = S12.ordenarCheques(filas).map(x => x.id).join('')
    chk('orden: por fecha de cobro ascendente (pago en diferidos, emisión en comunes)', orden === 'bcad', orden)
    chk('orden: no muta el array de entrada', filas.map(x => x.id).join('') === 'abcd')

    // 1,1 · 2,2 · 0,29: multiplicados por 100 arrastran error de punto
    // flotante (0,1 y 0,2 no: dan exacto y no distinguirían nada).
    const r = S12.resumenCartera([
      { estado: 'en_cartera', importe: 1.1 }, { estado: 'en_cartera', importe: 2.2 },
      { estado: 'en_cartera', importe: 0.29 },
      { estado: 'depositado', importe: 1000 }, { estado: 'endosado', importe: 1000 },
      { estado: 'anulado', importe: 1000 },
    ])
    chk('cartera: cuenta SOLO los en cartera', r.cantidad === 3, r.cantidad)
    chk('cartera: suma en centavos (1,1 + 2,2 + 0,29 da 3,59 exacto)', r.total === 3.59, r.total)

    const sinDato = S12.htmlCartera(null, false, false)
    chk('cartera: si no se pudo calcular NO dice $ 0,00', !/\$/.test(sinDato) && /No se pudo/.test(sinDato))
    const conFiltro = S12.htmlCartera({ cantidad: 1, total: 5 }, true, false)
    chk('cartera: con filtros aclara que es el total de TODA la cartera', /toda la cartera/.test(conFiltro))
    chk('cartera: singular con un cheque', /1 cheque</.test(conFiltro))
    chk('cartera: sin filtros no agrega la aclaración', !/toda la cartera/.test(S12.htmlCartera({ cantidad: 2, total: 5 }, false, false)))
    chk('cartera: con el tope lo dice', /incompleto/.test(S12.htmlCartera({ cantidad: 2, total: 5 }, false, true)))
  }

  // ── La tabla: cada columna con texto malicioso, ejecutada ─────────────────
  {
    const S13 = construir(ARCHIVO)
    S13.estado.bancos = new Map([['007', marca('tab_banco_denominacion')]])
    const cobs = new Map([
      ['cob1', { id: 'cob1', cliente: marca('tab_cliente'), estado: 'procesada', fecha: '2026-09-01' }],
    ])
    const filas = [
      { id: marca('tab_id'), cobranza_id: 'cob1', banco_codigo: marca('tab_banco'), numero: marca('tab_numero'),
        tipo: 'diferido', fecha_emision: '2026-09-01', fecha_pago: '2026-10-01', importe: 1500,
        estado: 'endosado', salida_fecha: '2026-09-15', salida_destino: marca('tab_destino') },
      { id: 'x2', cobranza_id: marca('tab_cobranza'), banco_codigo: '007', numero: '12345678',
        tipo: 'comun', fecha_emision: '2026-09-02', fecha_pago: null, importe: 10,
        estado: marca('tab_estado'), salida_fecha: null, salida_destino: null },
      { id: 'x3', cobranza_id: 'cob1', banco_codigo: '007', numero: '87654321',
        tipo: 'comun', fecha_emision: '2026-09-02', fecha_pago: null, importe: 10,
        estado: 'depositado', salida_fecha: '2026-09-10', salida_destino: null },
      { id: 'x4', cobranza_id: 'cob1', banco_codigo: '007', numero: '11112222',
        tipo: 'comun', fecha_emision: '2026-09-02', fecha_pago: null, importe: 10,
        estado: 'anulado', salida_fecha: null, salida_destino: null },
    ]
    const html = S13.htmlTablaCheques(filas, cobs)
    chequearMarcas('htmlTablaCheques', html, ['tab_id', 'tab_banco', 'tab_numero', 'tab_destino',
      'tab_cliente', 'tab_cobranza', 'tab_estado', 'tab_banco_denominacion'])
    const tbody = html.slice(html.indexOf('<tbody>'))
    chk('tabla: una fila por cheque', (tbody.match(/<tr /g) || []).length === 4)
    chk('tabla: el número va en la primera columna (la fija)',
      /<tr [^>]*>\s*<td>&quot;&gt;&lt;b data-xss=&quot;tab_numero/.test(tbody))
    const fila = (id) => { const i = tbody.indexOf(`data-cheque-fila="${id}"`); return tbody.slice(tbody.lastIndexOf('<tr', i), tbody.indexOf('</tr>', i)) }
    chk('tabla: un cheque común dice "Al día" en el pago', fila('x3').includes('Al día'))
    chk('tabla: un diferido muestra su fecha de pago', fila(escCobDe(S13, marca('tab_id'))).includes('01/10/2026'))
    chk('tabla: un depositado va atenuado y con su etiqueta',
      fila('x3').includes('cob-tabla__fila--salido') && fila('x3').includes('>Depositado<'))
    chk('tabla: un endosado va atenuado y con su etiqueta',
      fila(escCobDe(S13, marca('tab_id'))).includes('cob-tabla__fila--salido') && fila(escCobDe(S13, marca('tab_id'))).includes('>Endosado<'))
    chk('tabla: un salido muestra su fecha de salida', fila('x3').includes('10/09/2026'))
    chk('tabla: un anulado va tachado y NO como salido',
      fila('x4').includes('cob-tabla__fila--anulado') && !fila('x4').includes('cob-tabla__fila--salido'))
    chk('tabla: uno sin cobranza visible dice — en el cliente, no "undefined"',
      !html.includes('undefined') && fila('x2').includes('<td class="cob-tabla__texto">—</td>'))
    chk('tabla: el banco muestra el NOMBRE cuando está en el catálogo', fila('x3').includes('tab_banco_denominacion'))
  }

  // ── Selector de banco, filtros y limpiar ───────────────────────────────────
  {
    const S14 = construir(ARCHIVO)
    S14.estado.bancosDeCheques = ['007', marca('sel_banco')]
    S14.estado.cheques.filtros.banco = marca('sel_elegido')
    S14.pintarSelectorBancos()
    const sel = S14.__doc.getElementById('cob-filtro-banco')
    chequearMarcas('pintarSelectorBancos', sel.innerHTML, ['sel_banco', 'sel_elegido'])
    chk('selector: un banco elegido que ya no está en la lista queda como opción y seleccionado',
      sel.value === marca('sel_elegido'))
    chk('selector: visible si hay bancos', S14.__doc.getElementById('cob-campo-banco').hidden === false)

    // Limpiar: TODOS los filtros, en el estado y en los campos, y vuelve a consultar.
    S14.estado.cheques.filtros = { estado: 'todos', numero: '1234', banco: '007' }
    S14.__doc.getElementById('cob-filtro-cheque').value = '1234'
    sel.value = '007'
    S14.pintarFiltrosCheques()
    chk('limpiar: el botón aparece con filtros puestos', S14.__doc.getElementById('cob-btn-limpiar-cheques').hidden === false)
    const antes = S14.__llamadas.cargarCheques
    S14.limpiarFiltrosCheques()
    const fl = S14.estado.cheques.filtros
    chk('limpiar: vuelve al estado de arranque (en cartera)', fl.estado === 'en_cartera')
    chk('limpiar: borra el número y el banco del estado', fl.numero === '' && fl.banco === '')
    chk('limpiar: borra el número y el banco de los CAMPOS',
      S14.__doc.getElementById('cob-filtro-cheque').value === '' && sel.value === '')
    chk('limpiar: vuelve a consultar', S14.__llamadas.cargarCheques === antes + 1)
    S14.pintarFiltrosCheques()
    chk('limpiar: sin filtros el botón no se dibuja', S14.__doc.getElementById('cob-btn-limpiar-cheques').hidden === true)

    S14.estado.cheques.filtros.numero = '%'
    S14.pintarFiltrosCheques()
    chk('aviso: un "%" muestra el aviso', S14.__doc.getElementById('cob-aviso-cheque').hidden === false &&
      /no tiene ninguno/.test(S14.__doc.getElementById('cob-aviso-cheque').textContent))
  }

  // ── renderizarCheques: vacío y error ───────────────────────────────────────
  {
    const S15 = construir(ARCHIVO)
    S15.estado.cheques.filas = []
    S15.renderizarCheques()
    chk('vacío: sin filtros dice que no hay cheques en cartera',
      S15.__doc.getElementById('cob-cheques-vacio').textContent === 'No hay cheques en cartera.' && S15.__doc.getElementById('cob-tabla-caja').hidden === true)
    S15.estado.cheques.error = 'No se pudieron cargar los cheques. Revisá la señal.'
    S15.renderizarCheques()
    chk('error: se dice, y no se muestra además el "no hay cheques"',
      S15.__doc.getElementById('cob-cheques-aviso').hidden === false && S15.__doc.getElementById('cob-cheques-vacio').hidden === true)
  }

  // ── cargarResumenCheques: bancos de TODOS los cheques, sin filtros ─────────
  {
    const S16 = construir(ARCHIVO)
    // El filtro de estado puesto en "salidos" NO puede recortar la lista.
    S16.estado.cheques.filtros.estado = 'salidos'
    S16.__set([
      { banco_codigo: '007', estado: 'en_cartera', importe: 100 },
      { banco_codigo: '011', estado: 'anulado', importe: 5 },
      { banco_codigo: '285', estado: 'depositado', importe: 7 },
    ])
    esperas.push(S16.cargarResumenCheques().then(() => {
      chk('resumen: la lista de bancos sale de TODOS los cheques', JSON.stringify([...S16.estado.bancosDeCheques].sort()) === '["007","011","285"]',
        JSON.stringify(S16.estado.bancosDeCheques))
      chk('resumen: el total en cartera cuenta solo los en cartera',
        S16.estado.cheques.cartera && S16.estado.cheques.cartera.cantidad === 1 && S16.estado.cheques.cartera.total === 100)
    }))
  }

  // ── cargarResumenCheques con la consulta fallando: NUNCA un cero ──────────
  {
    const S17 = construir(ARCHIVO)
    S17.estado.cheques.cartera = { cantidad: 4, total: 99 }
    S17.__setError(new Error('sin señal'))
    esperas.push(S17.cargarResumenCheques().then(() => {
      chk('resumen con error: la cartera queda en null, no en cero', S17.estado.cheques.cartera === null,
        JSON.stringify(S17.estado.cheques.cartera))
      const h = S17.__doc.getElementById('cob-cartera').innerHTML
      chk('resumen con error: la pantalla dice que no se pudo, sin "$ 0,00"', /No se pudo/.test(h) && !/\$/.test(h))
    }))
  }

  // ══ SALIDA DE CHEQUES ═══════════════════════════════════════════════════

  // El texto EXACTO que arma el trigger _cobranza_cheque_proteger_salida
  // (leído de pg_get_functiondef el 21/09/2026), con un cheque de ejemplo.
  const MSG_TRIGGER = 'El cheque 007 Nº 12345678 ya salió de cartera (depositado). Para editar o anular esta cobranza, primero volvelo a cartera.'

  // ── El botón de cada fila: quién y cuándo ──────────────────────────────────
  {
    const S20 = construir(ARCHIVO)
    const cobs = new Map([
      ['proc', { id: 'proc', cliente: 'A', estado: 'procesada', fecha: '2026-09-01' }],
      ['reg', { id: 'reg', cliente: 'B', estado: 'registrada', fecha: '2026-09-01' }],
    ])
    const base = { banco_codigo: '007', tipo: 'comun', fecha_emision: '2026-09-01', fecha_pago: null, importe: 10 }
    const filas = [
      { ...base, id: 'k1', cobranza_id: 'proc', numero: '11111111', estado: 'en_cartera' },
      { ...base, id: 'k2', cobranza_id: 'reg', numero: '22222222', estado: 'en_cartera' },
      { ...base, id: 'k3', cobranza_id: 'proc', numero: '33333333', estado: 'depositado', salida_fecha: '2026-09-10' },
      { ...base, id: 'k4', cobranza_id: 'proc', numero: '44444444', estado: 'anulado' },
      { ...base, id: 'k5', cobranza_id: 'reg', numero: '55555555', estado: 'endosado', salida_fecha: '2026-09-10', salida_destino: 'X' },
    ]
    const primeraCelda = (html, id) => {
      const i = html.indexOf(`data-cheque-fila="${id}"`)
      const td = html.indexOf('<td>', i)
      return html.slice(td, html.indexOf('</td>', td))
    }
    const html = S20.htmlTablaCheques(filas, cobs)
    chk('salió: en cartera y cobranza procesada → botón "Salió" en la columna fija',
      /data-salio="k1"/.test(primeraCelda(html, 'k1')))
    chk('salió: en cartera pero cobranza registrada → sin botón', !/data-salio|data-volver/.test(primeraCelda(html, 'k2')))
    chk('volver: un depositado tiene "Volver a cartera"', /data-volver-cartera="k3"/.test(primeraCelda(html, 'k3')))
    chk('volver: un endosado también, aunque su cobranza esté registrada', /data-volver-cartera="k5"/.test(primeraCelda(html, 'k5')))
    chk('salió: un anulado no tiene ningún botón', !/data-salio|data-volver/.test(primeraCelda(html, 'k4')))

    S20.estado.misTareas = new Set(['cobranzas:cargar', 'cobranzas:ver_todo'])
    const sinProcesar = S20.htmlTablaCheques(filas, cobs)
    chk('sin la tarea procesar no hay ningún botón', !/data-salio|data-volver-cartera/.test(sinProcesar))
    S20.estado.miRolApp = 'super_admin'
    chk('super_admin ve los botones (bypass, igual que tiene_tarea)', /data-salio="k1"/.test(S20.htmlTablaCheques(filas, cobs)))
  }

  // ── Reglas del diálogo, ejecutadas ─────────────────────────────────────────
  {
    const S21 = construir(ARCHIVO)
    const hoy = '2026-09-21'
    const e = (d, fc = '2026-09-01') => S21.erroresSalida(d, fc, hoy)
    chk('diálogo: sin elegir depositado/endosado no sigue', e({ tipo: null, fecha: hoy, destino: '' }).length === 1)
    chk('diálogo: endosado SIN destino no sigue', e({ tipo: 'endosado', fecha: hoy, destino: '   ' }).some(x => /a quién/.test(x)))
    chk('diálogo: depositado sin destino SÍ sigue', e({ tipo: 'depositado', fecha: hoy, destino: '' }).length === 0)
    chk('diálogo: una fecha futura no sigue', e({ tipo: 'depositado', fecha: '2026-09-22', destino: '' }).some(x => /posterior/.test(x)))
    chk('diálogo: hoy sí', e({ tipo: 'depositado', fecha: hoy, destino: '' }).length === 0)
    chk('diálogo: anterior a la cobranza no sigue (igual que la RPC)',
      e({ tipo: 'depositado', fecha: '2026-08-31', destino: '' }).some(x => /anterior a la cobranza/.test(x)))
    chk('diálogo: el mismo día de la cobranza sí', e({ tipo: 'depositado', fecha: '2026-09-01', destino: '' }).length === 0)
    chk('diálogo: 150 caracteres de destino entran', e({ tipo: 'endosado', fecha: hoy, destino: 'x'.repeat(150) }).length === 0)
    chk('diálogo: 151 no', e({ tipo: 'endosado', fecha: hoy, destino: 'x'.repeat(151) }).some(x => /150/.test(x)))
    chk('diálogo: sin fecha no sigue', e({ tipo: 'depositado', fecha: '', destino: '' }).some(x => /fecha/.test(x)))

    const p1 = S21.parametrosSalida('ch1', { tipo: 'depositado', fecha: hoy, destino: '   ' })
    chk('parámetros: un destino vacío viaja como null, no como ""', p1.p_destino === null && p1.p_cheque_id === 'ch1' && p1.p_tipo === 'depositado' && p1.p_fecha === hoy)
    chk('parámetros: el destino viaja sin espacios en los bordes',
      S21.parametrosSalida('ch1', { tipo: 'endosado', fecha: hoy, destino: '  Molino SA ' }).p_destino === 'Molino SA')
  }

  // ── El diálogo abierto: fecha por defecto, límites y la pregunta del destino
  {
    const S22 = construir(ARCHIVO)
    S22.estado.cheques.filas = [{ id: 'z1', cobranza_id: 'c', numero: '12345678', banco_codigo: '007', importe: 50, estado: 'en_cartera' }]
    S22.estado.cheques.cobranzas = new Map([['c', { id: 'c', cliente: marca('dlg_cliente'), estado: 'procesada', fecha: '2026-09-01' }]])
    S22.abrirModalSalida('z1')
    const doc = S22.__doc
    const hoy = S22.hoyArgentina()
    chk('diálogo: la fecha arranca en hoy (Argentina)', doc.getElementById('cob-salida-fecha').value === hoy)
    chk('diálogo: la fecha no puede ser futura (max = hoy)', doc.getElementById('cob-salida-fecha').max === hoy)
    chk('diálogo: ni anterior a la cobranza (min)', doc.getElementById('cob-salida-fecha').min === '2026-09-01')
    chk('diálogo: arranca sin tipo y sin la pregunta del destino',
      S22.estado.salida.tipo === null && doc.getElementById('cob-salida-campo-destino').hidden === true)
    chk('diálogo: el cheque se describe por textContent (el cliente va crudo ahí, no es HTML)',
      doc.getElementById('cob-salida-cheque').textContent.includes(marca('dlg_cliente')) &&
      doc.getElementById('cob-salida-cheque').innerHTML === '')
    S22.estado.salida.tipo = 'endosado'; S22.pintarModalSalida()
    chk('diálogo: endosado pregunta a quién', doc.getElementById('cob-salida-label-destino').textContent === '¿A quién se lo pasaste?' &&
      doc.getElementById('cob-salida-campo-destino').hidden === false)
    S22.estado.salida.tipo = 'depositado'; S22.pintarModalSalida()
    chk('diálogo: depositado pregunta en qué banco o cuenta, opcional', /banco o cuenta\? \(opcional\)/.test(doc.getElementById('cob-salida-label-destino').textContent))
  }

  // ── Confirmar: validación local, error de la base TAL CUAL y éxito ─────────
  {
    const S23 = construir(ARCHIVO)
    const doc = S23.__doc
    const llamadas = []
    S23.estado.cheques.filas = [{ id: 'z2', cobranza_id: 'c', numero: '12345678', banco_codigo: '007', importe: 50, estado: 'en_cartera' }]
    S23.estado.cheques.cobranzas = new Map([['c', { id: 'c', cliente: 'A', estado: 'procesada', fecha: '2026-09-01' }]])

    esperas.push((async () => {
      // (1) Endosado sin destino: no llama a la base.
      S23.__setRpc(async (...a) => { llamadas.push(a); return { data: null, error: null } })
      S23.abrirModalSalida('z2')
      S23.estado.salida.tipo = 'endosado'
      doc.getElementById('cob-salida-destino').value = ''
      await S23.confirmarSalida()
      chk('confirmar: endosado sin destino NO llama a la base', llamadas.length === 0)
      chk('confirmar: y lo dice en el diálogo', doc.getElementById('cob-salida-error').hidden === false &&
        /a quién/.test(doc.getElementById('cob-salida-error').textContent))

      // (2) La base rechaza: su mensaje llega ENTERO, y el diálogo sigue abierto.
      const MSG = 'Solo se puede marcar la salida de un cheque de una cobranza procesada.'
      S23.__setRpc(async () => ({ data: null, error: { message: MSG } }))
      doc.getElementById('cob-salida-destino').value = 'Molino'
      await S23.confirmarSalida()
      chk('confirmar: el error de la base se muestra TAL CUAL', doc.getElementById('cob-salida-error').textContent === MSG,
        doc.getElementById('cob-salida-error').textContent)
      chk('confirmar: con error el diálogo NO se cierra', S23.estado.salida !== null && doc.getElementById('cob-modal-salida').hidden === false)

      // (3) Éxito: los parámetros exactos, cierra, avisa y refresca.
      const antes = S23.__llamadas.refrescar
      S23.__setRpc(async (...a) => { llamadas.push(a); return { data: null, error: null } })
      doc.getElementById('cob-salida-destino').value = '  Molino del Centro  '
      await S23.confirmarSalida()
      const ult = llamadas[llamadas.length - 1]
      chk('confirmar: llama a marcar_salida_cheque con los parámetros exactos',
        ult && ult[0] === 'marcar_salida_cheque' && JSON.stringify(ult[1]) === JSON.stringify({
          p_cheque_id: 'z2', p_tipo: 'endosado', p_fecha: S23.hoyArgentina(), p_destino: 'Molino del Centro' }),
        JSON.stringify(ult))
      chk('confirmar: al salir bien cierra el diálogo', S23.estado.salida === null && doc.getElementById('cob-modal-salida').hidden === true)
      chk('confirmar: y recarga la tabla, la cartera y el listado', S23.__llamadas.refrescar === antes + 1)
    })())
  }

  // ── Volver a cartera: pide motivo en el diálogo y muestra el error TAL CUAL
  {
    const S24 = construir(ARCHIVO)
    S24.estado.cheques.filas = [{ id: 'z3', cobranza_id: 'c', numero: '12345678', banco_codigo: '007', importe: 50, estado: 'depositado' }]
    esperas.push((async () => {
      S24.abrirVolverACartera('z3')
      chk('volver: abre el diálogo de motivo (no un prompt)', S24.__doc.getElementById('cob-modal-motivo').hidden === false)
      const MSG = 'Este cheque no salió de cartera (está en_cartera).'
      S24.__setRpc(async () => ({ data: null, error: { message: MSG } }))
      const errores = S24.__llamadas.errores
      await (async () => { const f = S24.__accion(); if (f) await f('se devolvió') })()
      chk('volver: el error de la base llega TAL CUAL', errores[errores.length - 1] === MSG, errores[errores.length - 1])
      const llamadas = []
      S24.__setRpc(async (...a) => { llamadas.push(a); return { data: null, error: null } })
      await (async () => { const f = S24.__accion(); if (f) await f('se devolvió') })()
      chk('volver: llama a volver_cheque_a_cartera con cheque y motivo',
        llamadas[0] && llamadas[0][0] === 'volver_cheque_a_cartera' &&
        JSON.stringify(llamadas[0][1]) === JSON.stringify({ p_cheque_id: 'z3', p_motivo: 'se devolvió' }))
    })())
  }

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
      /class="cob-fila__estado cob-fila__estado--registrada">Registrada</.test(reg) && !/cob-estado/.test(reg + proc + anu))
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
    chk('3.2 css: el total de la cartera va en tinta neutra, nunca naranja',
      /color:\s*var\(--color-texto\)/.test(regla('.cob-cartera__v')) && !/naranja/.test(regla('.cob-cartera__v')))
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
    S32.pintarFiltrosCheques()
    const segCh = S32.__els.get('cob-chips-cheques').innerHTML
    const bc = opciones(segCh)
    chk('3.2 segmentado de cheques: tres opciones, "En cartera" activa por defecto',
      bc.length === 3 && !/cob-chip/.test(segCh) &&
      /cob-segmento__opcion--activo" aria-pressed="true" data-estado-cheque="en_cartera"/.test(segCh) &&
      bc.filter(b => /aria-pressed="true"/.test(b)).length === 1)
  }

  // ── CSS de la tabla: lo que un render no puede mostrar ────────────────────
  {
    const css = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))
    const regla = (sel) => { const i = css.indexOf(sel + ' {'); return i === -1 ? '' : css.slice(i, css.indexOf('}', i)) }
    chk('css: la caja de la tabla scrollea de costado', /overflow-x:\s*auto/.test(regla('.cob-tabla-scroll')))
    chk('css: la primera columna es sticky y opaca',
      /th:first-child,\s*\n\s*\.cob-tabla td:first-child \{[^}]*position:\s*sticky[^}]*left:\s*0/.test(css) &&
      /background:\s*var\(--color-fondo\)/.test(regla('.cob-tabla td')))
    chk('css: los salidos se atenúan con color, no con opacity (la celda fija se transparentaría)',
      regla('.cob-tabla__fila--salido td') !== '' && !/opacity/.test(regla('.cob-tabla__fila--salido td')))
    chk('css: la variante de fila salida va DESPUÉS de la regla base de td',
      css.indexOf('.cob-tabla td {') !== -1 && css.indexOf('.cob-tabla__fila--salido td') > css.indexOf('.cob-tabla td {'))
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

  const malas = []
  for (const x of aRevisar) {
    const c = clasificar(x.expr)
    if (!c.ok) malas.push(`línea ${x.linea}: ${c.hojasMalas.join(' | ')}`)
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
  const sinComillas = [], enEvento = [], enUrl = []
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
      if (/^(href|src|action|formaction|xlink:href)$/i.test(nombreAttr)) enUrl.push(`${x.linea} (${nombreAttr})`)
    }
  }
  chk('estático: ninguna interpolación cae en un atributo SIN comillas',
    sinComillas.length === 0, sinComillas.join(', '))
  chk('estático: ninguna interpolación cae dentro de un manejador on*=',
    enEvento.length === 0, enEvento.join(', '))
  chk('estático: ninguna interpolación cae dentro de un href/src (ahí escapar HTML no alcanza)',
    enUrl.length === 0, enUrl.join(', '))
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
