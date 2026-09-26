// Parte 5 del módulo Cheques (22/09/2026): el celular más compacto.
//
// Cada cheque en DOS renglones: arriba el importe y cuándo se cobra, abajo
// "Nº … · banco · cliente" chico y gris, con el estado al final; a la derecha
// el botón o el texto de la columna Salida, con 44px de alto.
//
// Medido en el navegador interno a 390×844 con diez cheques de prueba
// (22/09/2026): cada tarjeta mide 56–59px, entran 8 sin scroll (6 si se
// descuentan ~94px de barras de Safari), los botones miden 44px, el estado
// nunca queda tapado y la página no scrollea de costado. Ver el traspaso.
//
//   node pruebas/test-cheques-celular.js

const fs = require('fs')
const path = require('path')
const { construirCheques } = require('./sandbox-cheques')
const { ARCHIVO_CHEQUES, leerCheques } = require('./fuente-cheques')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO = process.env.ARCHIVO_TEST || ARCHIVO_CHEQUES
// La cartera vive en una región de administracion.html: FUENTE es esa región.
const FUENTE = leerCheques(ARCHIVO)
const CSS = FUENTE.slice(FUENTE.indexOf('<style>'), FUENTE.indexOf('</style>'))

let ok = 0
const fallas = []
function chk(nombre, cond, detalle) { if (cond) ok++; else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : '')) }
const marca = (campo) => `"><b data-xss="${campo}">`
const escapada = (campo) => `&lt;b data-xss=&quot;${campo}&quot;&gt;`
const regla = (sel) => { const m = new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}').exec(CSS); return m ? m[1] : '' }

const S = construirCheques(ARCHIVO)
S.estado.bancos = new Map([['072', 'Banco Santander Río S.A.'], ['666', marca('tar_banco')]])
const cobs = new Map([
  ['c1', { id: 'c1', cliente: 'JyM', estado: 'procesada', fecha: '2026-09-01' }],
  // La unidad (tarea A2, 22/09/2026) va en el title de la tarjeta y como
  // texto oculto: también tiene que ir escapada.
  ['c2', { id: 'c2', cliente: marca('tar_cliente'), estado: 'registrada', fecha: '2026-09-01', unidad_negocio_id: 'u2', unidad_negocio_nombre: marca('tar_unidad') }],
])
const tarjeta = (ch, cob) => S.htmlTarjetaCheque(ch, cob)
const partes = (html) => ({
  l1: (html.match(/<div class="chq-tarjeta__l1">([\s\S]*?)<\/div>/) || [])[1] || '',
  l2: (html.match(/<div class="chq-tarjeta__l2">([\s\S]*?)<\/div>/) || [])[1] || '',
  lado: (html.match(/<div class="chq-tarjeta__lado">([\s\S]*?)<\/div>/) || [])[1] ?? null,
})

// ── Los dos renglones ────────────────────────────────────────────────────
{
  const comun = tarjeta({ id: 'a', cobranza_id: 'c1', numero: '00000353', banco_codigo: '072', tipo: 'comun',
    fecha_emision: '2026-09-01', fecha_pago: null, importe: 1500000, estado: 'en_cartera' }, cobs.get('c1'))
  const p = partes(comun)
  chk('arriba: el importe', /chq-tarjeta__importe">\$ 1\.500\.000,00</.test(p.l1), p.l1)
  chk('arriba: un común dice "a la vista"', /chq-tarjeta__pago">a la vista</.test(p.l1))
  chk('abajo: "Nº 00000353 · banco · cliente"', /chq-tarjeta__num">Nº 00000353</.test(p.l2) && /chq-tarjeta__banco" title="Banco Santander Río S\.A\.">Banco Santander Río S\.A\.</.test(p.l2) && /chq-tarjeta__cliente" title="JyM">JyM</.test(p.l2), p.l2)
  chk('abajo: el banco con el nombre entero en title', /title="Banco Santander Río S\.A\."/.test(p.l2))
  chk('abajo: el estado como chip, al final del renglón', /<span class="chq-estado chq-estado--en_cartera chq-tarjeta__estado">En cartera<\/span>$/.test(p.l2.trim()), p.l2)
  chk('solo DOS renglones de datos', (comun.match(/chq-tarjeta__l[0-9]/g) || []).length === 2)
  chk('a la derecha: "Dar salida" (cobranza asentada, con permiso)', /data-dar-salida="a"[^>]*>Dar salida</.test(p.lado || ''))
  chk('la tarjeta se toca para abrir la cobranza (data-cheque-fila y data-cheque-cobranza)', /data-cheque-fila="a" data-cheque-cobranza="c1" tabindex="0"/.test(comun))

  const dif = partes(tarjeta({ id: 'b', cobranza_id: 'c1', numero: '1', banco_codigo: '072', tipo: 'diferido',
    fecha_emision: '2026-09-01', fecha_pago: '2026-10-24', importe: 387300.5, estado: 'en_cartera' }, cobs.get('c1')))
  chk('arriba: un diferido dice "paga dd/mm/aa" (fecha corta)', /chq-tarjeta__pago">paga 24\/10\/26</.test(dif.l1), dif.l1)
  chk('fechaCorta: una fecha inválida dice —, no "NaN"', S.fechaCorta(null) === '—' && S.fechaCorta('2026-02-30') === '—')
}

// ── La acción del costado, igual que la columna Salida ───────────────────
{
  const base = { banco_codigo: '072', tipo: 'comun', fecha_emision: '2026-09-01', importe: 10 }
  const nota = partes(tarjeta({ ...base, id: 'n', cobranza_id: 'c2', numero: '2', estado: 'en_cartera' }, cobs.get('c2')))
  chk('por controlar: el texto chico a la derecha', /Asentá la cobranza para darle salida/.test(nota.lado || ''))
  const sal = tarjeta({ ...base, id: 's', cobranza_id: 'c1', numero: '3', estado: 'endosado', salida_fecha: '2026-09-10', salida_destino: marca('tar_destino') }, cobs.get('c1'))
  const ps = partes(sal)
  chk('salido: "Volver a cartera" a la derecha', /data-volver-cartera="s"/.test(ps.lado || ''))
  chk('salido: abajo dice cuándo y a quién, escapado', ps.l2.includes('10/09/2026 · ' + S.esc(marca('tar_destino'))))
  chk('salido: el destino no entra crudo ni en el texto ni en el title', !/<b data-xss=/.test(sal) &&
    (sal.split(escapada('tar_destino')).length - 1) === 2, sal)
  chk('salido: en lugar del cliente (el renglón no da para los dos)', !/chq-tarjeta__cliente/.test(ps.l2))
  chk('salido: con su marca de salido (el fondo verde suave)', /class="chq-tarjeta chq-tarjeta--salido"/.test(sal))
  const anul = tarjeta({ ...base, id: 'x', cobranza_id: 'c1', numero: '4', estado: 'anulado' }, cobs.get('c1'))
  chk('anulado: sin costado (un "—" solo no dice nada)', partes(anul).lado === null && /chq-tarjeta--anulado/.test(anul))
  S.estado.misTareas = new Set(['cobranzas:ver_todo'])
  const sinPermiso = tarjeta({ ...base, id: 'p', cobranza_id: 'c1', numero: '5', estado: 'en_cartera' }, cobs.get('c1'))
  chk('sin permiso: sin costado', partes(sinPermiso).lado === null)
  S.estado.misTareas = new Set(['cobranzas:ver_todo', 'cobranzas:procesar'])
  // La tabla y la tarjeta deciden con la MISMA función.
  chk('la tarjeta y la tabla usan accionSalida()', /htmlAccionSalida\(ch, accionSalida\(ch, cob\)\)/.test(FUENTE) && /const accion = accionSalida\(ch, cob\)/.test(FUENTE))
}

// ── Texto de la base, escapado ───────────────────────────────────────────
{
  const html = tarjeta({ id: marca('tar_id'), cobranza_id: marca('tar_cob'), numero: marca('tar_num'), banco_codigo: '666', tipo: 'comun',
    fecha_emision: '2026-09-01', importe: 1, estado: marca('tar_estado') }, cobs.get('c2'))
  chk('tarjeta: ninguna marca cruda', !/<b data-xss=/.test(html), (html.match(/.{0,40}<b data-xss=[^>]*>/) || [''])[0])
  for (const c of ['tar_id', 'tar_cob', 'tar_num', 'tar_banco', 'tar_cliente', 'tar_estado', 'tar_unidad']) chk(`tarjeta: «${c}» escapado`, html.includes(escapada(c)))
  chk('tarjeta: la unidad escapada en el title Y en el texto oculto', (html.split(escapada('tar_unidad')).length - 1) === 2)
  const sinCob = tarjeta({ id: 'z', cobranza_id: 'q', numero: '9', banco_codigo: null, tipo: 'comun', fecha_emision: '2026-09-01', importe: null, estado: 'en_cartera' }, undefined)
  chk('sin cobranza visible ni importe: "—", nunca "undefined" ni "$ 0,00"', !/undefined|0,00/.test(sinCob) && /chq-tarjeta__importe">—</.test(sinCob))
}

// ── renderizarCheques llena las dos vistas ───────────────────────────────
{
  const S2 = construirCheques(ARCHIVO)
  S2.estado.filas = [
    { id: 'a', cobranza_id: 'c1', numero: '1', banco_codigo: '072', tipo: 'comun', fecha_emision: '2026-09-01', importe: 1, estado: 'en_cartera' },
    { id: 'b', cobranza_id: 'c1', numero: '2', banco_codigo: '072', tipo: 'comun', fecha_emision: '2026-09-02', importe: 2, estado: 'en_cartera' },
  ]
  S2.estado.cobranzas = cobs
  S2.renderizarCheques()
  const lista = S2.__doc.getElementById('chq-lista')
  chk('la lista del celular tiene una tarjeta por cheque', (lista.innerHTML.match(/class="chq-tarjeta[" ]/g) || []).length === 2)
  chk('la lista se muestra', lista.hidden === false)
  chk('y la tabla también (el CSS decide cuál se ve)', S2.__doc.getElementById('chq-tabla-caja').hidden === false)
  S2.estado.filas = []
  S2.renderizarCheques()
  chk('sin cheques: la lista se esconde y se vacía', lista.hidden === true && lista.innerHTML === '')
}

// ── CSS ──────────────────────────────────────────────────────────────────
{
  chk('css: debajo de 900px no se ve la tabla', /@media \(max-width: 899\.98px\) \{\s*\.chq-tabla-scroll \{ display: none; \}/.test(CSS))
  chk('css: desde 900px no se ve la lista', /@media \(min-width: 900px\) \{\s*\.chq-lista \{ display: none; \}/.test(CSS))
  chk('css: la tarjeta mide al menos 56px (no se aplasta)', /min-height: 56px/.test(regla('.chq-tarjeta')))
  chk('css: el botón del costado tiene 44px de alto', /min-height: 44px/.test(regla('.chq-tarjeta__lado .chq-btn')))
  chk('css: el costado tiene ancho fijo (el estado nunca queda tapado)', /flex: 0 0 5\.75rem/.test(regla('.chq-tarjeta__lado')))
  chk('css: el renglón de abajo es de UNA línea y no se desborda', /overflow: hidden/.test(regla('.chq-tarjeta__l2')) && /white-space: nowrap/.test(regla('.chq-tarjeta__l2')))
  chk('css: cada dato se corta con puntos suspensivos', /text-overflow: ellipsis/.test(regla('.chq-tarjeta__dato')))
  chk('css: el estado nunca se achica', /flex: 0 0 auto/.test(regla('.chq-tarjeta__estado')))
  chk('css: el importe en tinta neutra, nunca naranja', /color: var\(--color-texto\)/.test(regla('.chq-tarjeta__importe')) && !/naranja/.test(regla('.chq-tarjeta__importe')))
  chk('css: las tarjetas van juntas en una caja, sin espacio entre ellas', !/margin-bottom/.test(regla('.chq-tarjeta')) && /border-top: 1px solid/.test(regla('.chq-tarjeta')))
}

for (const f of fallas) console.log('  ✗ ' + f)
console.log(`${ok}/${ok + fallas.length}${fallas.length ? '  ROJO' : '  verde'}`)
process.exit(fallas.length ? 1 : 0)
