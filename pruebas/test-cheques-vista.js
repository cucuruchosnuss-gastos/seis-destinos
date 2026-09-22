// La cartera de cheques, modulos/cheques.html (22/09/2026).
//
// Las pruebas de la vista "Cheques" que vivían en test-cobranzas-xss.js se
// mudaron acá con la pantalla, y se EJECUTAN contra el código real del módulo
// nuevo (las funciones compartidas salen de js/cobranzas-comun.js).
//
// DOS MITADES, como en Cobranzas:
//  1. Renders EJECUTADOS con un document falso y una MARCA DISTINTA POR CAMPO.
//  2. CHEQUEO ESTÁTICO de todo el <script>: cada ${...} que entra a HTML está
//     escapado o figura en la lista de seguras CON SU MOTIVO.
//
//   node pruebas/test-cheques-vista.js
//   ARCHIVO_TEST=/otra/copia.html node pruebas/test-cheques-vista.js

const fs = require('fs')
const path = require('path')
const { construirCheques } = require('./sandbox-cheques')
const { interpolaciones } = require('./escaner-interpolaciones')
const { clasificar } = require('./clasificar')
const { SEGURAS_CHEQUES, SEGURAS_REGEX_CHEQUES } = require('./seguras-cheques')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/cheques.html')
const SOLO = process.env.SOLO || ''

let ok = 0
const fallas = []
const esperas = []
function chk(nombre, cond, detalle) {
  if (cond) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : ''))
}

const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
console.log(`ARCHIVO ${ARCHIVO} (${FUENTE.length} bytes)`)

const marca = (campo) => `"><b data-xss="${campo}">`
const escapada = (campo) => `&lt;b data-xss=&quot;${campo}&quot;&gt;`
function chequearMarcas(render, html, campos) {
  chk(`${render}: no aparece NINGUNA marca cruda`, !/<b data-xss=/.test(html),
    (html.match(/.{0,60}<b data-xss=[^>]*>/) || [''])[0])
  for (const campo of campos) chk(`${render}: «${campo}» aparece escapado`, html.includes(escapada(campo)))
}

if (SOLO !== 'estatico') {
  // ── filtroNumeroCheque ───────────────────────────────────────────────────
  {
    const S = construirCheques(ARCHIVO)
    const f = S.filtroNumeroCheque
    const cuerpo = '66259862'
    const dv = String(S.dvBcra(cuerpo))
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
    chk('dvBcra: los casos de la norma (0110381425 → 7, 0111381425 → 0)',
      S.dvBcra('0110381425') === 7 && S.dvBcra('0111381425') === 0)
  }

  // ── aplicarFiltrosCheques ────────────────────────────────────────────────
  {
    const S = construirCheques(ARCHIVO)
    const correr = (filtros) => {
      const llamadas = []
      const q = {}
      for (const m of ['eq', 'in', 'like', 'ilike', 'neq', 'or', 'filter', 'not', 'match'])
        q[m] = (...a) => { llamadas.push([m, ...a]); return q }
      const r = S.aplicarFiltrosCheques(q, { estado: 'en_cartera', numero: '', banco: '', ...filtros })
      return { ...r, llamadas }
    }
    const likes = (ll) => ll.filter(x => x[0] === 'like' || x[0] === 'ilike')
    chk('filtro: un "%" tipeado da CERO resultados (no consulta)', correr({ numero: '%' }).sinResultados === true)
    chk('filtro: "%%_" tampoco consulta', correr({ numero: '%%_' }).sinResultados === true)
    const mezcla = correr({ numero: '6625%' })
    chk('filtro: "6625%" busca los dígitos, sin el comodín tipeado',
      !mezcla.sinResultados && likes(mezcla.llamadas).length === 1 && likes(mezcla.llamadas)[0][2] === '%6625%',
      JSON.stringify(mezcla.llamadas))
    chk('filtro: el "_" tipeado no llega al patrón', likes(correr({ numero: '12_4' }).llamadas)[0]?.[2] === '%124%')
    const exacto = correr({ numero: '66259862' })
    chk('filtro: 8 dígitos → eq sobre numero, sin like',
      exacto.llamadas.some(x => x[0] === 'eq' && x[1] === 'numero' && x[2] === '66259862') && likes(exacto.llamadas).length === 0)
    const diez = correr({ numero: '6625986212' })
    chk('filtro: más de 9 no filtra por número pero SÍ consulta', !diez.sinResultados && !diez.llamadas.some(x => x[1] === 'numero'))
    chk('filtro: "en cartera" pide estado = en_cartera',
      correr({}).llamadas.some(x => x[0] === 'eq' && x[1] === 'estado' && x[2] === 'en_cartera'))
    const sal = correr({ estado: 'salidos' }).llamadas.find(x => x[1] === 'estado')
    chk('filtro: "salidos" pide depositado y endosado, y nada más',
      sal && sal[0] === 'in' && JSON.stringify(sal[2]) === JSON.stringify(['depositado', 'endosado']))
    chk('filtro: "todos" no filtra por estado (es el único que trae anulados)',
      !correr({ estado: 'todos' }).llamadas.some(x => x[1] === 'estado'))
    chk('filtro: el banco va por eq sobre banco_codigo',
      correr({ banco: '007' }).llamadas.some(x => x[0] === 'eq' && x[1] === 'banco_codigo' && x[2] === '007'))
  }

  // ── Orden y total en cartera ─────────────────────────────────────────────
  {
    const S = construirCheques(ARCHIVO)
    const filas = [
      { id: 'a', numero: '4', tipo: 'diferido', fecha_emision: '2026-08-01', fecha_pago: '2026-10-01' },
      { id: 'b', numero: '1', tipo: 'comun', fecha_emision: '2026-09-20', fecha_pago: null },
      { id: 'c', numero: '3', tipo: 'diferido', fecha_emision: '2026-09-01', fecha_pago: '2026-09-25' },
      { id: 'd', numero: '2', tipo: 'comun', fecha_emision: '2026-11-01', fecha_pago: null },
    ]
    const orden = S.ordenarCheques(filas).map(x => x.id).join('')
    chk('orden: por fecha de cobro ascendente (pago en diferidos, emisión en comunes)', orden === 'bcad', orden)
    chk('orden: no muta el array de entrada', filas.map(x => x.id).join('') === 'abcd')
    const mismoDia = S.ordenarCheques([
      { id: 'z', numero: '30', tipo: 'comun', fecha_emision: '2026-09-01' },
      { id: 'y', numero: '10', tipo: 'comun', fecha_emision: '2026-09-01' },
      { id: 'x', numero: '20', tipo: 'comun', fecha_emision: '2026-09-01' },
    ]).map(x => x.id).join('')
    chk('orden: a igual fecha, por número (estable entre cargas)', mismoDia === 'yxz', mismoDia)
    const r = S.resumenCartera([
      { estado: 'en_cartera', importe: 1.1 }, { estado: 'en_cartera', importe: 2.2 },
      { estado: 'en_cartera', importe: 0.29 },
      { estado: 'depositado', importe: 1000 }, { estado: 'endosado', importe: 1000 }, { estado: 'anulado', importe: 1000 },
    ])
    chk('cartera: cuenta SOLO los en cartera', r.cantidad === 3, r.cantidad)
    chk('cartera: suma en centavos (1,1 + 2,2 + 0,29 da 3,59 exacto)', r.total === 3.59, r.total)
    const sinDato = S.htmlCartera(null, false, false)
    chk('cartera: si no se pudo calcular NO dice $ 0,00', !/\$/.test(sinDato) && /No se pudo/.test(sinDato))
    const conFiltro = S.htmlCartera({ cantidad: 1, total: 5 }, true, false)
    chk('cartera: con filtros aclara que es el total de TODA la cartera', /toda la cartera/.test(conFiltro))
    chk('cartera: singular con un cheque', /1 cheque</.test(conFiltro))
    chk('cartera: sin filtros no agrega la aclaración', !/toda la cartera/.test(S.htmlCartera({ cantidad: 2, total: 5 }, false, false)))
    chk('cartera: con el tope lo dice', /incompleto/.test(S.htmlCartera({ cantidad: 2, total: 5 }, false, true)))
  }

  // ── La tabla: cada columna con texto malicioso, ejecutada ────────────────
  {
    const S = construirCheques(ARCHIVO)
    S.estado.bancos = new Map([['007', marca('tab_banco_denominacion')]])
    const cobs = new Map([['cob1', { id: 'cob1', cliente: marca('tab_cliente'), estado: 'procesada', fecha: '2026-09-01' }]])
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
    const html = S.htmlTablaCheques(filas, cobs)
    chequearMarcas('htmlTablaCheques', html, ['tab_id', 'tab_banco', 'tab_numero', 'tab_destino',
      'tab_cliente', 'tab_cobranza', 'tab_estado', 'tab_banco_denominacion'])
    const tbody = html.slice(html.indexOf('<tbody>'))
    chk('tabla: una fila por cheque', (tbody.match(/<tr /g) || []).length === 4)
    const fila = (id) => { const i = tbody.indexOf(`data-cheque-fila="${id}"`); return tbody.slice(tbody.lastIndexOf('<tr', i), tbody.indexOf('</tr>', i)) }
    const idMal = S.esc(marca('tab_id'))
    chk('tabla: un cheque común dice "A la vista" en el pago', fila('x3').includes('A la vista'))
    chk('tabla: un diferido muestra su fecha de pago', fila(idMal).includes('01/10/2026'))
    chk('tabla: un depositado va atenuado y con su etiqueta', fila('x3').includes('chq-tabla__fila--salido') && fila('x3').includes('>Depositado<'))
    chk('tabla: un endosado va atenuado y con su etiqueta', fila(idMal).includes('chq-tabla__fila--salido') && fila(idMal).includes('>Endosado<'))
    chk('tabla: un salido muestra su fecha de salida', fila('x3').includes('10/09/2026'))
    chk('tabla: un anulado va tachado y NO como salido',
      fila('x4').includes('chq-tabla__fila--anulado') && !fila('x4').includes('chq-tabla__fila--salido'))
    chk('tabla: uno sin cobranza visible dice — en el cliente, no "undefined"', !html.includes('undefined'))
    chk('tabla: el banco muestra el NOMBRE cuando está en el catálogo', fila('x3').includes('tab_banco_denominacion'))
    chk('tabla: un banco fuera del catálogo se DICE con el código', S.nombreBanco('999') === 'Banco 999 (no está en el catálogo)')

    // El cheque pedido desde una cobranza (?cheque=) se marca.
    S.estado.destacado = 'x3'
    chk('tabla: el cheque pedido desde una cobranza va destacado',
      S.htmlTablaCheques(filas, cobs).includes('class="chq-tabla__fila--salido chq-tabla__fila--destacada"'))
  }

  // ── Los botones de cada fila: quién y cuándo ─────────────────────────────
  {
    const S = construirCheques(ARCHIVO)
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
    const filaDe = (html, id) => {
      const i = html.indexOf(`data-cheque-fila="${id}"`)
      return html.slice(i, html.indexOf('</tr>', i))
    }
    const html = S.htmlTablaCheques(filas, cobs)
    chk('salida: en cartera y cobranza asentada → botón de salida', /data-dar-salida="k1"/.test(filaDe(html, 'k1')))
    chk('salida: en cartera pero cobranza por controlar → sin botón', !/data-dar-salida|data-volver/.test(filaDe(html, 'k2')))
    chk('volver: un depositado tiene "Volver a cartera"', /data-volver-cartera="k3"/.test(filaDe(html, 'k3')))
    chk('volver: un endosado también, aunque su cobranza esté por controlar', /data-volver-cartera="k5"/.test(filaDe(html, 'k5')))
    chk('salida: un anulado no tiene ningún botón', !/data-dar-salida|data-volver/.test(filaDe(html, 'k4')))
    S.estado.misTareas = new Set(['cobranzas:ver_todo'])
    chk('sin la tarea procesar no hay ningún botón', !/data-dar-salida|data-volver-cartera/.test(S.htmlTablaCheques(filas, cobs)))
    S.estado.miRolApp = 'super_admin'
    chk('super_admin ve los botones (bypass, igual que tiene_tarea)', /data-dar-salida="k1"/.test(S.htmlTablaCheques(filas, cobs)))
  }

  // ── Tocar un cheque abre su cobranza, con volver= ────────────────────────
  {
    const S = construirCheques(ARCHIVO)
    const u = S.urlDeCobranza('c-1&x=<y>', 'https://app.test/modulos/cheques.html?a=1&b=2')
    chk('link a la cobranza: va a cobranzas.html con ?cobranza=', u.startsWith('cobranzas.html?cobranza='))
    chk('link a la cobranza: el id va codificado', u.includes('cobranza=c-1%26x%3D%3Cy%3E&'), u)
    chk('link a la cobranza: el volver= va codificado entero (no rompe la URL)',
      u.endsWith('&volver=' + encodeURIComponent('https://app.test/modulos/cheques.html?a=1&b=2')), u)
  }

  // ── Selector de banco, filtros y limpiar ─────────────────────────────────
  {
    const S = construirCheques(ARCHIVO)
    S.estado.bancosDeCheques = ['007', marca('sel_banco')]
    S.estado.filtros.banco = marca('sel_elegido')
    S.pintarSelectorBancos()
    const sel = S.__doc.getElementById('chq-filtro-banco')
    chequearMarcas('pintarSelectorBancos', sel.innerHTML, ['sel_banco', 'sel_elegido'])
    chk('selector: un banco elegido que ya no está en la lista queda como opción y seleccionado', sel.value === marca('sel_elegido'))
    chk('selector: visible si hay bancos', S.__doc.getElementById('chq-campo-banco').hidden === false)

    S.estado.filtros = { estado: 'todos', numero: '1234', banco: '007' }
    S.__doc.getElementById('chq-filtro-numero').value = '1234'
    sel.value = '007'
    S.pintarFiltrosCheques()
    chk('limpiar: el botón aparece con filtros puestos', S.__doc.getElementById('chq-btn-limpiar').hidden === false)
    chequearMarcas('pintarFiltrosCheques', S.__doc.getElementById('chq-chips-estado').innerHTML, [])
    chk('segmentado: tres opciones y "Todos" marcada', (S.__doc.getElementById('chq-chips-estado').innerHTML.match(/data-estado-cheque=/g) || []).length === 3 &&
      /aria-pressed="true" data-estado-cheque="todos"/.test(S.__doc.getElementById('chq-chips-estado').innerHTML))
    const antes = S.__llamadas.cargarCheques
    S.limpiarFiltrosCheques()
    const fl = S.estado.filtros
    chk('limpiar: vuelve al estado de arranque (en cartera)', fl.estado === 'en_cartera')
    chk('limpiar: borra el número y el banco del estado', fl.numero === '' && fl.banco === '')
    chk('limpiar: borra el número y el banco de los CAMPOS', S.__doc.getElementById('chq-filtro-numero').value === '' && sel.value === '')
    chk('limpiar: vuelve a consultar', S.__llamadas.cargarCheques === antes + 1)
    S.pintarFiltrosCheques()
    chk('limpiar: sin filtros el botón no se dibuja', S.__doc.getElementById('chq-btn-limpiar').hidden === true)
    S.estado.filtros.numero = '%'
    S.pintarFiltrosCheques()
    chk('aviso: un "%" muestra el aviso', S.__doc.getElementById('chq-aviso-numero').hidden === false &&
      /no tiene ninguno/.test(S.__doc.getElementById('chq-aviso-numero').textContent))
  }

  // ── Preferencias: los filtros sobreviven a la ida y vuelta a Cobranzas ────
  {
    const S = construirCheques(ARCHIVO)
    S.estado.filtros = { estado: 'salidos', numero: '9862', banco: '007' }
    S.guardarPreferencias()
    const S2 = construirCheques(ARCHIVO)
    S2.__almacen.set('cheques-preferencias', S.__almacen.get('cheques-preferencias'))
    S2.leerPreferencias()
    chk('preferencias: los filtros vuelven', JSON.stringify(S2.estado.filtros) === JSON.stringify({ estado: 'salidos', numero: '9862', banco: '007' }),
      JSON.stringify(S2.estado.filtros))
    const S3 = construirCheques(ARCHIVO)
    S3.__almacen.set('cheques-preferencias', JSON.stringify({ filtros: { estado: '<x>', numero: 5, banco: '"><b>' } }))
    S3.leerPreferencias()
    chk('preferencias: un valor raro guardado NO entra (estado inventado, banco que no es un código)',
      S3.estado.filtros.estado === 'en_cartera' && S3.estado.filtros.banco === '' && S3.estado.filtros.numero === '')
    const S4 = construirCheques(ARCHIVO)
    S4.__almacen.set('cheques-preferencias', '{roto')
    S4.leerPreferencias()
    chk('preferencias: un JSON roto no rompe nada', S4.estado.filtros.estado === 'en_cartera')
  }

  // ── renderizarCheques: vacío y error ─────────────────────────────────────
  {
    const S = construirCheques(ARCHIVO)
    S.estado.filas = []
    S.renderizarCheques()
    chk('vacío: sin filtros dice que no hay cheques en cartera',
      S.__doc.getElementById('chq-vacio').textContent === 'No hay cheques en cartera.' && S.__doc.getElementById('chq-tabla-caja').hidden === true)
    S.estado.error = 'No se pudieron cargar los cheques. Revisá la señal.'
    S.renderizarCheques()
    chk('error: se dice, y no se muestra además el "no hay cheques"',
      S.__doc.getElementById('chq-aviso').hidden === false && S.__doc.getElementById('chq-vacio').hidden === true)
    S.estado.error = null
    S.estado.tope = true
    S.estado.filas = [{ id: 'a', cobranza_id: 'c', estado: 'en_cartera', numero: '1', tipo: 'comun', fecha_emision: '2026-09-01', importe: 1 }]
    S.renderizarCheques()
    chk('tope: con 1000 filas se dice que la lista está cortada', /más de 1000 filas/.test(S.__doc.getElementById('chq-aviso').textContent))
    chk('con ver_todo no se avisa que la cartera es parcial', !/cargaste vos/.test(S.__doc.getElementById('chq-aviso').textContent))
    S.estado.tope = false
    S.estado.misTareas = new Set(['cobranzas:procesar'])
    S.renderizarCheques()
    chk('solo con procesar SE DICE que la cartera es solo la de sus cobranzas (la policy lo recorta)',
      S.__doc.getElementById('chq-aviso').hidden === false && /cargaste vos/.test(S.__doc.getElementById('chq-aviso').textContent))
  }

  // ── cargarResumenCheques ─────────────────────────────────────────────────
  {
    const S = construirCheques(ARCHIVO)
    S.estado.filtros.estado = 'salidos'
    S.__set([
      { banco_codigo: '007', estado: 'en_cartera', importe: 100 },
      { banco_codigo: '011', estado: 'anulado', importe: 5 },
      { banco_codigo: '285', estado: 'depositado', importe: 7 },
    ])
    esperas.push(S.cargarResumenCheques().then(() => {
      chk('resumen: la lista de bancos sale de TODOS los cheques', JSON.stringify([...S.estado.bancosDeCheques].sort()) === '["007","011","285"]')
      chk('resumen: el total en cartera cuenta solo los en cartera', S.estado.cartera && S.estado.cartera.cantidad === 1 && S.estado.cartera.total === 100)
      const q = S.__consultas.find(c => c.tabla === 'cobranza_cheques')
      chk('resumen: consulta SIN filtros (ni estado ni banco ni número)', q && q.llamadas.every(l => l[0] === 'select'), JSON.stringify(q && q.llamadas))
    }))
  }
  {
    const S = construirCheques(ARCHIVO)
    S.estado.cartera = { cantidad: 4, total: 99 }
    S.__setError(new Error('sin señal'))
    esperas.push(S.cargarResumenCheques().then(() => {
      chk('resumen con error: la cartera queda en null, no en cero', S.estado.cartera === null)
      const h = S.__doc.getElementById('chq-cartera').innerHTML
      chk('resumen con error: la pantalla dice que no se pudo, sin "$ 0,00"', /No se pudo/.test(h) && !/\$/.test(h))
    }))
  }

  // ── Reglas del diálogo de salida ─────────────────────────────────────────
  {
    const S = construirCheques(ARCHIVO)
    const hoy = '2026-09-21'
    const e = (d, fc = '2026-09-01') => S.erroresSalida(d, fc, hoy)
    chk('diálogo: sin elegir depositado/endosado no sigue', e({ tipo: null, fecha: hoy, destino: '' }).length === 1)
    chk('diálogo: endosado SIN destino no sigue', e({ tipo: 'endosado', fecha: hoy, destino: '   ' }).some(x => /a quién/.test(x)))
    chk('diálogo: depositado sin destino SÍ sigue', e({ tipo: 'depositado', fecha: hoy, destino: '' }).length === 0)
    chk('diálogo: una fecha futura no sigue', e({ tipo: 'depositado', fecha: '2026-09-22', destino: '' }).some(x => /posterior/.test(x)))
    chk('diálogo: anterior a la cobranza no sigue (igual que la RPC)',
      e({ tipo: 'depositado', fecha: '2026-08-31', destino: '' }).some(x => /anterior a la cobranza/.test(x)))
    chk('diálogo: el mismo día de la cobranza sí', e({ tipo: 'depositado', fecha: '2026-09-01', destino: '' }).length === 0)
    chk('diálogo: 150 caracteres de destino entran', e({ tipo: 'endosado', fecha: hoy, destino: 'x'.repeat(150) }).length === 0)
    chk('diálogo: 151 no', e({ tipo: 'endosado', fecha: hoy, destino: 'x'.repeat(151) }).some(x => /150/.test(x)))
    chk('diálogo: sin fecha no sigue', e({ tipo: 'depositado', fecha: '', destino: '' }).some(x => /fecha/.test(x)))
    const p1 = S.parametrosSalida('ch1', { tipo: 'depositado', fecha: hoy, destino: '   ' })
    chk('parámetros: un destino vacío viaja como null', p1.p_destino === null && p1.p_cheque_id === 'ch1' && p1.p_tipo === 'depositado' && p1.p_fecha === hoy)
    chk('parámetros: el destino viaja sin espacios en los bordes',
      S.parametrosSalida('ch1', { tipo: 'endosado', fecha: hoy, destino: '  Molino SA ' }).p_destino === 'Molino SA')
  }

  // ── El diálogo abierto ───────────────────────────────────────────────────
  {
    const S = construirCheques(ARCHIVO)
    S.estado.filas = [{ id: 'z1', cobranza_id: 'c', numero: '12345678', banco_codigo: '007', importe: 50, estado: 'en_cartera' }]
    S.estado.cobranzas = new Map([['c', { id: 'c', cliente: marca('dlg_cliente'), estado: 'procesada', fecha: '2026-09-01' }]])
    S.abrirModalSalida('z1')
    const doc = S.__doc
    const hoy = S.hoyArgentina()
    chk('diálogo: la fecha arranca en hoy (Argentina)', doc.getElementById('chq-salida-fecha').value === hoy)
    chk('diálogo: la fecha no puede ser futura (max = hoy)', doc.getElementById('chq-salida-fecha').max === hoy)
    chk('diálogo: ni anterior a la cobranza (min)', doc.getElementById('chq-salida-fecha').min === '2026-09-01')
    chk('diálogo: arranca sin tipo y sin la pregunta del destino',
      S.estado.salida.tipo === null && doc.getElementById('chq-salida-campo-destino').hidden === true)
    chk('diálogo: el cheque se describe por textContent (no es HTML)',
      doc.getElementById('chq-salida-cheques').textContent.includes(marca('dlg_cliente')) && doc.getElementById('chq-salida-cheques').innerHTML === '')
    S.estado.salida.tipo = 'endosado'; S.pintarModalSalida()
    chk('diálogo: endosado pregunta a quién', doc.getElementById('chq-salida-label-destino').textContent === '¿A quién se lo pasaste?' &&
      doc.getElementById('chq-salida-campo-destino').hidden === false)
    S.estado.salida.tipo = 'depositado'; S.pintarModalSalida()
    chk('diálogo: depositado pregunta en qué banco o cuenta, opcional', /banco o cuenta\? \(opcional\)/.test(doc.getElementById('chq-salida-label-destino').textContent))
  }

  // ── Confirmar: validación local, error TAL CUAL y éxito ──────────────────
  {
    const S = construirCheques(ARCHIVO)
    const doc = S.__doc
    const llamadas = []
    S.estado.filas = [{ id: 'z2', cobranza_id: 'c', numero: '12345678', banco_codigo: '007', importe: 50, estado: 'en_cartera' }]
    S.estado.cobranzas = new Map([['c', { id: 'c', cliente: 'A', estado: 'procesada', fecha: '2026-09-01' }]])
    esperas.push((async () => {
      S.__setRpc(async (...a) => { llamadas.push(a); return { data: null, error: null } })
      S.abrirModalSalida('z2')
      S.estado.salida.tipo = 'endosado'
      doc.getElementById('chq-salida-destino').value = ''
      await S.confirmarSalida()
      chk('confirmar: endosado sin destino NO llama a la base', llamadas.length === 0)
      chk('confirmar: y lo dice en el diálogo', doc.getElementById('chq-salida-error').hidden === false &&
        /a quién/.test(doc.getElementById('chq-salida-error').textContent))
      const MSG = 'Solo se puede marcar la salida de un cheque de una cobranza asentada.'
      S.__setRpc(async () => ({ data: null, error: { message: MSG } }))
      doc.getElementById('chq-salida-destino').value = 'Molino'
      await S.confirmarSalida()
      chk('confirmar: el error de la base se muestra TAL CUAL', doc.getElementById('chq-salida-error').textContent === MSG)
      chk('confirmar: con error el diálogo NO se cierra', S.estado.salida !== null && doc.getElementById('chq-modal-salida').hidden === false)
      const antes = S.__llamadas.refrescar
      S.__setRpc(async (...a) => { llamadas.push(a); return { data: null, error: null } })
      doc.getElementById('chq-salida-destino').value = '  Molino del Centro  '
      await S.confirmarSalida()
      const ult = llamadas[llamadas.length - 1]
      chk('confirmar: llama a marcar_salida_cheque con los parámetros exactos',
        ult && ult[0] === 'marcar_salida_cheque' && JSON.stringify(ult[1]) === JSON.stringify({
          p_cheque_id: 'z2', p_tipo: 'endosado', p_fecha: S.hoyArgentina(), p_destino: 'Molino del Centro' }), JSON.stringify(ult))
      chk('confirmar: al salir bien cierra el diálogo', S.estado.salida === null && doc.getElementById('chq-modal-salida').hidden === true)
      chk('confirmar: y recarga la lista, el total y los bancos', S.__llamadas.refrescar === antes + 1)
    })())
  }

  // ── Volver a cartera ─────────────────────────────────────────────────────
  {
    const S = construirCheques(ARCHIVO)
    S.estado.filas = [{ id: 'z3', cobranza_id: 'c', numero: '12345678', banco_codigo: '007', importe: 50, estado: 'depositado' }]
    esperas.push((async () => {
      S.abrirVolverACartera('z3')
      chk('volver: abre el diálogo de motivo (no un prompt)', S.__doc.getElementById('chq-modal-motivo').hidden === false)
      const MSG = 'Este cheque no salió de cartera (está en_cartera).'
      S.__setRpc(async () => ({ data: null, error: { message: MSG } }))
      await S.__accionMotivo()('se devolvió')
      chk('volver: el error de la base llega TAL CUAL', S.__llamadas.errores[S.__llamadas.errores.length - 1] === MSG)
      const llamadas = []
      S.__setRpc(async (...a) => { llamadas.push(a); return { data: null, error: null } })
      await S.__accionMotivo()('se devolvió')
      chk('volver: llama a volver_cheque_a_cartera con cheque y motivo',
        llamadas[0] && llamadas[0][0] === 'volver_cheque_a_cartera' &&
        JSON.stringify(llamadas[0][1]) === JSON.stringify({ p_cheque_id: 'z3', p_motivo: 'se devolvió' }))
      chk('volver: al salir bien cierra el diálogo', S.__doc.getElementById('chq-modal-motivo').hidden === true)
    })())
  }

  // ── Permisos ─────────────────────────────────────────────────────────────
  {
    const S = construirCheques(ARCHIVO)
    S.estado.misTareas = new Set(['cobranzas:cargar'])
    chk('permisos: solo con cargar NO se ve la cartera', S.puedeVerCartera() === false)
    S.estado.misTareas = new Set(['cobranzas:ver_todo'])
    chk('permisos: con ver_todo se ve', S.puedeVerCartera() === true && S.puedeProcesar() === false)
    S.estado.misTareas = new Set(['cobranzas:procesar'])
    chk('permisos: con procesar se ve y se procesa', S.puedeVerCartera() === true && S.puedeProcesar() === true)
    S.estado.misTareas = new Set()
    S.estado.miRolApp = 'super_admin'
    chk('permisos: super_admin (bypass, igual que tiene_tarea)', S.puedeVerCartera() === true && S.puedeProcesar() === true)
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
    const c = clasificar(x.expr, { escape: 'esc', seguras: SEGURAS_CHEQUES, segurasRegex: SEGURAS_REGEX_CHEQUES })
    if (!c.ok) malas.push(`línea ${x.linea}: ${c.hojasMalas.join(' | ')}`)
  }
  chk('estático: no queda ninguna interpolación de HTML sin escapar ni justificar', malas.length === 0, malas.join('  //  '))
  chk('estático: el escáner encontró interpolaciones en HTML', enHtml.length > 25, `solo ${enHtml.length}`)
  chk('estático: el escáner encontró las asignaciones a innerHTML', r.asignaciones.length >= 4, `solo ${r.asignaciones.length}`)
  const sinComillas = [], enEvento = [], enUrl = []
  for (const x of enHtml) {
    const ultimaEtiqueta = x.antes.lastIndexOf('<')
    const ultimoCierre = x.antes.lastIndexOf('>')
    if (!(ultimaEtiqueta > ultimoCierre)) continue
    const tramo = x.antes.slice(ultimaEtiqueta)
    const dentroDeAtributo = (tramo.match(/"/g) || []).length % 2 === 1
    if (!dentroDeAtributo && /[\w-]+\s*=\s*$/.test(tramo)) sinComillas.push(x.linea)
    if (dentroDeAtributo) {
      const nombreAttr = (tramo.match(/([\w-]+)\s*=\s*"[^"]*$/) || [])[1] || ''
      if (/^on/i.test(nombreAttr)) enEvento.push(`${x.linea} (${nombreAttr})`)
      if (/^(href|src|action|formaction|xlink:href)$/i.test(nombreAttr)) enUrl.push(`${x.linea} (${nombreAttr})`)
    }
  }
  chk('estático: ninguna interpolación cae en un atributo SIN comillas', sinComillas.length === 0, sinComillas.join(', '))
  chk('estático: ninguna interpolación cae dentro de un manejador on*=', enEvento.length === 0, enEvento.join(', '))
  chk('estático: ninguna interpolación cae dentro de un href/src', enUrl.length === 0, enUrl.join(', '))

  // esc cubre los cinco caracteres, EJECUTÁNDOLO.
  const { extraerFn } = require('./extraer')
  const escReal = new Function(extraerFn(FUENTE, 'esc') + '\nreturn esc')()
  for (const [crudo, esperado] of [['&', '&amp;'], ['<', '&lt;'], ['>', '&gt;'], ['"', '&quot;'], ["'", '&#39;']]) {
    chk(`esc escapa ${crudo}`, escReal(crudo) === esperado)
  }
  chk('esc no convierte null en la palabra null', escReal(null) === '')
}

let cerrado = false
function cerrar() {
  if (cerrado) return
  cerrado = true
  for (const f of fallas) console.log('  ✗ ' + f)
  const total = ok + fallas.length
  console.log(`${ok}/${total}${fallas.length ? '  ROJO' : '  verde'}`)
  process.exit(fallas.length ? 1 : 0)
}
Promise.all(esperas.map(p => p.catch(err => chk('rama async sin excepción', false, String(err && err.stack || err)))))
  .then(cerrar)
