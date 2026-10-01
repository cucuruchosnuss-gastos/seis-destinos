// Mutaciones de test-cheques-formas.js (la etiqueta de la forma de pago en la
// cartera, 30/09/2026). Ver mutar.js.
//
//   node pruebas/mut-cheques-formas.js

const path = require('path')
const { correrMutaciones } = require('./mutar')
// La cartera vive en una región de administracion.html: se muta SOLO ahí.
const { ARCHIVO_CHEQUES, limitesCheques } = require('./fuente-cheques')

correrMutaciones({
  region: limitesCheques,
  suite: path.join(__dirname, 'test-cheques-formas.js'),
  original: process.env.ARCHIVO_BASE || ARCHIVO_CHEQUES,
  escape: 'esc',
  funciones: [],
  manuales: [
    { nombre: 'todo cheque se etiqueta de papel',
      de: 'return ch?.es_echeck\n', a: 'return false\n' },
    { nombre: 'el e-cheque en naranja',
      de: "? '<span class=\"forma-pago forma-pago--echeck\">E-cheque</span>'", a: "? '<span class=\"forma-pago forma-pago--cheque\">E-cheque</span>'" },
    { nombre: 'la tabla sin la etiqueta',
      de: '">${htmlFormaCheque(ch)} ${esc(nombreBanco(ch.banco_codigo))}</td>', a: '">${esc(nombreBanco(ch.banco_codigo))}</td>' },
    { nombre: 'la tarjeta sin la etiqueta',
      de: '<span class="chq-tarjeta__pago">${esc(pago)}</span>${htmlFormaCheque(ch)}', a: '<span class="chq-tarjeta__pago">${esc(pago)}</span>' },
    { nombre: 'la consulta sin es_echeck',
      de: "'id, cobranza_id, foto_id, es_echeck, banco_codigo, numero,", a: "'id, cobranza_id, foto_id, banco_codigo, numero," },
  ],
})
