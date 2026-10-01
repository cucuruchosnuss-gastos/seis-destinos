// La cartera de cheques con la ETIQUETA DE LA FORMA DE PAGO (30/09/2026).
//
// Cada cheque dice si es de papel (naranja) o un e-cheque (celeste, la única
// excepción a "sin azules"), en la tabla de la compu —en la celda del banco,
// para no cambiar el alto de la fila— y en la tarjeta del celular, al lado de
// cuándo se cobra. Las clases son las de css/main.css que usan Cobranzas y
// Cobranzas por asentar. La consulta trae es_echeck.
//
//   node pruebas/test-cheques-formas.js

const { construirCheques } = require('./sandbox-cheques')
const { ARCHIVO_CHEQUES, leerCheques } = require('./fuente-cheques')

const ARCHIVO = process.env.ARCHIVO_TEST || ARCHIVO_CHEQUES
const FUENTE = leerCheques(ARCHIVO)

let ok = 0
const fallas = []
function chk(nombre, cond, detalle) { if (cond) ok++; else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : '')) }

const S = construirCheques(ARCHIVO)
S.estado.bancos = new Map([['007', 'Banco de Galicia'], ['011', 'Banco de la Nación']])
const cob = { id: 'c1', cliente: 'JyM', estado: 'procesada', fecha: '2026-09-01' }
const papel = { id: 'p', cobranza_id: 'c1', numero: '00000353', banco_codigo: '007', tipo: 'comun', fecha_emision: '2026-09-01', fecha_pago: null, importe: 1000, estado: 'en_cartera', es_echeck: false }
const echeck = { ...papel, id: 'e', banco_codigo: '011', es_echeck: true }

const PAPEL = '<span class="forma-pago forma-pago--cheque">Cheque</span>'
const ECHEQ = '<span class="forma-pago forma-pago--echeck">E-cheque</span>'

chk('htmlFormaCheque: papel en naranja', S.htmlFormaCheque(papel) === PAPEL)
chk('htmlFormaCheque: e-cheque en celeste', S.htmlFormaCheque(echeck) === ECHEQ)
chk('htmlFormaCheque: sin es_echeck es de papel', S.htmlFormaCheque({}) === PAPEL && S.htmlFormaCheque(null) === PAPEL)

const banco = (h) => (h.match(/<td class="chq-tabla__texto chq-tabla__banco"[^>]*>([\s\S]*?)<\/td>/) || [])[1] || ''
const filaP = S.htmlFilaCheque(papel, cob)
const filaE = S.htmlFilaCheque(echeck, cob)
chk('tabla: la celda del banco lleva la etiqueta del cheque de papel y el banco', banco(filaP) === PAPEL + ' Banco de Galicia', banco(filaP))
chk('tabla: la celda del banco lleva la etiqueta del e-cheque', banco(filaE) === ECHEQ + ' Banco de la Nación', banco(filaE))
chk('tabla: el title del banco sigue siendo solo el nombre', /chq-tabla__banco" title="Banco de la Nación"/.test(filaE))

const l1 = (h) => (h.match(/<div class="chq-tarjeta__l1">([\s\S]*?)<\/div>/) || [])[1] || ''
chk('celular: arriba, al lado de cuándo se cobra, la etiqueta del papel', l1(S.htmlTarjetaCheque(papel, cob)).trim().endsWith(PAPEL))
chk('celular: arriba, la etiqueta del e-cheque', l1(S.htmlTarjetaCheque(echeck, cob)).trim().endsWith(ECHEQ))

chk('la consulta de la cartera trae es_echeck', /from\('cobranza_cheques'\)\.select\(\s*'id, cobranza_id, foto_id, es_echeck,/.test(FUENTE))

for (const f of fallas) console.log('  ✗ ' + f)
console.log(`${ok}/${ok + fallas.length}${fallas.length ? '  ROJO' : '  verde'}`)
process.exit(fallas.length ? 1 : 0)
