// CÓMO SE PIDE UNA CANTIDAD (05/10/2026) — js/cantidades.js: unidadCorta,
// modoDeCarga, aUnidadBase, equivalenteDeCarga y desdeUnidadBase.
//
// El caso que lo motivó: 1 bolsa de azúcar de 50 kg se mandó como 1 kg. Exige:
//  - con vista 'bulto' y UN contenido conocido, el campo pide "bultos de 50 kg"
//    y lo escrito se convierte: "1" bolsa de 50 kg manda 50 a la base;
//  - con vista 'base' (o sin contenido) pide en su unidad: "1" kg manda 1;
//  - un lote con dos presentaciones o una parte suelta se pide en la unidad
//    base, con el aviso de por qué;
//  - el rótulo nunca es vacío ("kg", "L", "u");
//  - vacío no es cero, y en una unidad entera 2,5 bultos de 3 u no se
//    redondean: se avisa.
//
// Se EJECUTA el código real de js/cantidades.js (sin import/export) con las
// funciones de números reales de js/utils.js.
//
//   node pruebas/test-cantidades-escribir.js
// ARCHIVO_JS_CANTIDADES cambia el archivo (para las mutaciones).

const fs = require('fs')
const path = require('path')
const { fuenteNumeros } = require('./numeros-comun')
const { arnes } = require('./circuito-comun')

const RUTA = process.env.ARCHIVO_JS_CANTIDADES || path.join(__dirname, '..', 'js', 'cantidades.js')
const src = fs.readFileSync(RUTA, 'utf8')
console.log(`ARCHIVO ${RUTA} (${src.length} bytes)`)
const cuerpo = src.replace(/^import .*$/gm, '').replace(/^export /gm, '')
const C = new Function(fuenteNumeros() + cuerpo +
  '\nreturn { unidadCorta, modoDeCarga, aUnidadBase, equivalenteDeCarga, desdeUnidadBase, DECIMALES_BULTOS_CARGA }')()

const { chk, fin } = arnes()
const nb = s => String(s ?? '').replace(/ /g, ' ')

// ── La unidad al lado del campo ──────────────────────────────────────────
chk('kg → kg', C.unidadCorta('kg') === 'kg')
chk('lt → L', C.unidadCorta('lt') === 'L')
chk('un → u', C.unidadCorta('un') === 'u')
chk('un. → u', C.unidadCorta('un.') === 'u')
chk('Litros → L', C.unidadCorta('Litros') === 'L')
chk('una unidad rara se muestra tal cual', C.unidadCorta('m') === 'm')
chk('sin unidad: nunca vacío', C.unidadCorta('') === 'unidades' && C.unidadCorta(null) === 'unidades')

// ── EL CASO OBLIGATORIO: 1 bolsa de azúcar de 50 kg y 1 kg ───────────────
const azucar = C.modoDeCarga({ unidad: 'kg', vista: 'bulto', contenidos: [50] })
chk('azúcar en bultos', azucar.enBultos === true)
chk('el campo dice "bultos de 50 kg"', nb(azucar.rotulo) === 'bultos de 50 kg', azucar.rotulo)
chk('"1" bolsa de 50 kg manda 50 a la base', C.aUnidadBase(1, azucar).base === 50)
chk('debajo, "= 50 kg"', nb(C.equivalenteDeCarga(1, azucar)) === '= 50 kg', C.equivalenteDeCarga(1, azucar))
chk('sin aviso', azucar.aviso === null)
chk('los bultos admiten medio bulto (3 decimales)', azucar.decimales === C.DECIMALES_BULTOS_CARGA && C.DECIMALES_BULTOS_CARGA === 3)
chk('medio bulto de 50 kg = 25', C.aUnidadBase(0.5, azucar).base === 25)

const kilos = C.modoDeCarga({ unidad: 'kg', vista: 'base', contenidos: [50] })
chk('vista base: en su unidad', kilos.enBultos === false)
chk('el campo dice "kg"', kilos.rotulo === 'kg')
chk('"1" kg manda 1', C.aUnidadBase(1, kilos).base === 1)
chk('en su unidad no hay "= …" debajo', C.equivalenteDeCarga(1, kilos) === null)
chk('vista base: 3 decimales por defecto', kilos.decimales === 3)

// ── Sin contenido conocido: en su unidad, sin aviso (el caso común) ──────
const sinCont = C.modoDeCarga({ unidad: 'kg', vista: 'bulto', contenidos: [] })
chk('bulto sin contenido: en kg', !sinCont.enBultos && sinCont.rotulo === 'kg')
chk('bulto sin contenido: sin aviso', sinCont.aviso === null)
chk('contenidos null/0/"" no cuentan', !C.modoDeCarga({ unidad: 'kg', vista: 'bulto', contenidos: [null, 0, '', undefined] }).enBultos)
chk('"1" kg sin contenido manda 1', C.aUnidadBase(1, sinCont).base === 1)

// ── Regla 3: dos presentaciones, o una parte suelta ──────────────────────
const dos = C.modoDeCarga({ unidad: 'kg', vista: 'bulto', contenidos: [25, 50] })
chk('dos presentaciones: en kg', !dos.enBultos && dos.rotulo === 'kg')
chk('dos presentaciones: el aviso las nombra', /25 kg/.test(nb(dos.aviso)) && /50 kg/.test(nb(dos.aviso)) && /se pide en kg/.test(nb(dos.aviso)), dos.aviso)
chk('el mismo contenido repetido es UNA presentación', C.modoDeCarga({ unidad: 'kg', vista: 'bulto', contenidos: [50, '50', 50] }).enBultos)
const suelta = C.modoDeCarga({ unidad: 'kg', vista: 'bulto', contenidos: [50], haySueltos: true })
chk('parte suelta: en kg', !suelta.enBultos && suelta.rotulo === 'kg')
chk('parte suelta: el aviso lo dice', /suelta/.test(nb(suelta.aviso)) && /se pide en kg/.test(nb(suelta.aviso)), suelta.aviso)
chk('parte suelta: "1" manda 1', C.aUnidadBase(1, suelta).base === 1)
chk('vista base con dos presentaciones: sin aviso', C.modoDeCarga({ unidad: 'kg', vista: 'base', contenidos: [25, 50] }).aviso === null)

// ── Litros y unidades ────────────────────────────────────────────────────
const bidon = C.modoDeCarga({ unidad: 'lt', vista: 'bulto', contenidos: [5] })
chk('bidón: "bultos de 5 L"', nb(bidon.rotulo) === 'bultos de 5 L', bidon.rotulo)
chk('2 bidones de 5 L = 10', C.aUnidadBase(2, bidon).base === 10 && nb(C.equivalenteDeCarga(2, bidon)) === '= 10 L')
const cajas = C.modoDeCarga({ unidad: 'un', vista: 'bulto', contenidos: [3], decimalesBase: 0 })
chk('cajas: "bultos de 3 u"', nb(cajas.rotulo) === 'bultos de 3 u', cajas.rotulo)
chk('2 bultos de 3 u = 6', C.aUnidadBase(2, cajas).base === 6)
const raro = C.aUnidadBase(2.5, cajas)
chk('2,5 bultos de 3 u no se redondean a 8', raro.base === null && /unidades enteras/.test(nb(raro.error)), raro)
chk('en kg, 2,5 bultos de 3 sí van', C.aUnidadBase(2.5, C.modoDeCarga({ unidad: 'kg', vista: 'bulto', contenidos: [3] })).base === 7.5)
chk('unidad entera en su unidad: decimales 0', C.modoDeCarga({ unidad: 'un', vista: 'base', decimalesBase: 0 }).decimales === 0)
chk('un tercio no deja ruido de coma flotante', C.aUnidadBase(0.1, C.modoDeCarga({ unidad: 'kg', vista: 'bulto', contenidos: [3] })).base === 0.3)

// ── Vacío no es cero ─────────────────────────────────────────────────────
for (const v of [null, undefined, '']) {
  const r = C.aUnidadBase(v, azucar)
  chk(`vacío (${JSON.stringify(v)}) no es cero`, r.base === null && r.error === null)
}
chk('un cero de verdad es cero', C.aUnidadBase(0, azucar).base === 0)
chk('ilegible: error', C.aUnidadBase('x', azucar).base === null && !!C.aUnidadBase('x', azucar).error)
chk('sin modo: tal cual', C.aUnidadBase(7, null).base === 7)

// ── Volver a escribir lo guardado ────────────────────────────────────────
chk('50 kg en bultos de 50 = 1', C.desdeUnidadBase(50, azucar) === 1)
chk('50 kg en kg = 50', C.desdeUnidadBase(50, kilos) === 50)
chk('lo que no entra en 3 decimales de bulto: null', C.desdeUnidadBase(10, C.modoDeCarga({ unidad: 'kg', vista: 'bulto', contenidos: [3] })) === null)
chk('null sigue null', C.desdeUnidadBase(null, azucar) === null)

fin()
