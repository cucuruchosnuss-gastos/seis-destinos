// "REMITO N° X" EN LA HOJA DE LA ORDEN (27/10/2026, los remitos de Rosario,
// rama ci-prueba/remitos-rosario-revisar). Una orden que salió de un remito
// precargado lleva ordenes_retiro.numero_remito y talonario ('acopio' o el
// oficial). La hoja impresa, el PDF (generarPdf arma la MISMA htmlHoja) y el
// texto para compartir dicen "Remito N° 0001-00003100" o "Acopio N° 977492",
// escapado, en el recuadro de la orden. Sin número, la hoja queda igual que
// antes. Se EJECUTA htmlHoja de js/retiros-comun.js.
//
//   node pruebas/test-retiros-hoja-remito.js
// Overrides: ARCHIVO_TEST (retiros.html), ARCHIVO_COMUN_RETIROS (el común).
'use strict'

const path = require('path')
const fs = require('fs')
const { construirRetiros } = require('./sandbox-retiros')
const { arnes, leer, marca, escapada } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/retiros.html')
const COMUN = process.env.ARCHIVO_COMUN_RETIROS || path.join(__dirname, '..', 'js', 'retiros-comun.js')
leer(ARCHIVO)
const { chk, fin } = arnes()
const S = construirRetiros(ARCHIVO)
const fuenteComun = fs.readFileSync(COMUN, 'utf8')

const EMPRESA = { id: 'u-d', nombre: 'Dolce Pasta', logo_url: 'logo-dolce-pasta.png' }
const orden = (extra = {}) => ({
  codigo: 'D-0007', estado: 'confirmada', fecha: '2026-10-26', cargadaPor: 'Yanina', empresa: EMPRESA,
  cliente: { nombre: 'ALMACÉN ROSARIO' }, renglones: [{ producto: 'Capelina Grande', presentacion: 'Caja x 12', cono: 'Sin cono', cajas: 84, unidades: 1008, lotes: [{ lote: '10430', cajas: 84 }] }],
  ...extra,
})
const hoja = (o, op = {}) => S.htmlHoja(o, { copias: ['ORIGINAL', 'DUPLICADO'], ...op })
const recuadro = (h) => (h.match(/<div class="rh-orden">.*?<\/div><\/header>/) || [''])[0]

{
  const h = hoja(orden({ numeroRemito: '0001-00003100' }))
  chk('la hoja: "Remito N° 0001-00003100" en el recuadro de la orden', recuadro(h).includes('<span class="rh-orden__remito">Remito N° 0001-00003100</span>'), recuadro(h))
  chk('…en las dos copias', (h.match(/rh-orden__remito/g) || []).length === 2)
  chk('…después de la fecha', recuadro(h).indexOf('rh-orden__fecha') < recuadro(h).indexOf('rh-orden__remito'))
  chk('…el código de la orden sigue', /<span class="rh-codigo">D-0007<\/span>/.test(h))
  chk('…en hojas enteras también', /Remito N° 0001-00003100/.test(hoja(orden({ numeroRemito: '0001-00003100' }), { plan: { modo: 'entera', paginas: [[0, 1]] } })))
  chk('…y con precios', /Remito N° 0001-00003100/.test(hoja(orden({ numeroRemito: '0001-00003100' }), { conPrecios: true })))
}
{
  const h = hoja(orden({ numeroRemito: '977492', talonario: 'acopio' }))
  chk('de acopio: "Acopio N° 977492"', recuadro(h).includes('<span class="rh-orden__remito">Acopio N° 977492</span>'), recuadro(h))
  chk('oficial (o null): "Remito N°"', /Remito N° 1/.test(hoja(orden({ numeroRemito: '1', talonario: 'oficial' }))) && /Remito N° 1/.test(hoja(orden({ numeroRemito: '1', talonario: null }))))
}
{
  const sin = hoja(orden())
  chk('sin número: la hoja no nombra ningún remito', !/rh-orden__remito/.test(sin) && !/Remito N°/.test(sin))
  chk('…ni con el número vacío o en blanco', !/rh-orden__remito/.test(hoja(orden({ numeroRemito: '   ' }))) && !/rh-orden__remito/.test(hoja(orden({ numeroRemito: null }))))
  chk('sin número la hoja es la misma de antes', sin === hoja(orden({ numeroRemito: '' })))
}
{
  chk('el texto: textoRemitoHoja', S.textoRemitoHoja({ numeroRemito: ' 0001-00003100 ' }) === 'Remito N° 0001-00003100' &&
    S.textoRemitoHoja({ numeroRemito: '977492', talonario: 'acopio' }) === 'Acopio N° 977492' && S.textoRemitoHoja({}) === '' && S.textoRemitoHoja(null) === '')
  const t = S.textoOrden(orden({ numeroRemito: '0001-00003100' }))
  chk('el texto para compartir dice "Remito N° X" debajo del título', t.split('\n')[1] === 'Remito N° 0001-00003100', t.split('\n').slice(0, 3).join(' | '))
  chk('sin número, el texto no cambia', !/Remito N°/.test(S.textoOrden(orden())) && S.textoOrden(orden()).split('\n')[1].startsWith('Fecha:'))
}
{
  const h = hoja(orden({ numeroRemito: marca('numero') }))
  chk('el número va escapado', h.includes(escapada('numero')) && !/<b data-xss=/.test(h))
}
{
  chk('el estilo: chico, en negrita y que corta si no entra en el recuadro', /\.rh-orden__remito \{ font-size: 11px; font-weight: 800;[^}]*overflow-wrap: anywhere;/.test(S.ESTILOS_HOJA))
  // El PDF arma la MISMA htmlHoja (no tiene su propia cabecera).
  const pdf = fuenteComun.slice(fuenteComun.indexOf('export async function generarPdf('), fuenteComun.indexOf('export async function enviarOrden('))
  chk('el PDF usa htmlHoja (lleva el mismo "Remito N°")', /cont\.innerHTML = htmlHoja\(orden, \{ conPrecios, copias: COPIAS_PDF, plan \}\)/.test(pdf))
}

fin()
