// Las funciones compartidas de números de js/utils.js: leer, formatear, y el
// campo que formatea mientras se escribe. Todo se EJECUTA.
//
//   node pruebas/test-numeros.js
//   UTILS_TEST=/otra/copia/utils.js node pruebas/test-numeros.js

const fs = require('fs')
const { cargarNumeros, inputFalso, RUTA_UTILS } = require('./numeros-comun')
console.log(`LEIDO:${fs.readFileSync(RUTA_UTILS, 'utf8').length} de ${RUTA_UTILS}`)

let ok = 0
const fallas = []
function chk(nombre, cond, detalle) { if (cond) ok++; else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : '')) }
const igual = (nombre, real, esperado) => chk(nombre, Object.is(real, esperado), `dio ${JSON.stringify(real)}, se esperaba ${JSON.stringify(esperado)}`)

const N = cargarNumeros()
const { leerNumeroAr: leer, formatearNumeroAr: fmt, enlazarCampoNumero: enlazar, ponerNumero, leerCampoNumero } = N

// --- leerNumeroAr: los casos del pedido ---------------------------------
const CASOS = [
  ['2000000', 2000000], ['2.000.000', 2000000], ['387.300,50', 387300.5],
  ['1.820.917,04', 1820917.04], ['387300.50', 387300.5], ['1.500', 1500], ['1,5', 1.5],
  ['', null], ['abc', null], ['1.2.3,4.5', null], ['%', null],
  // y los bordes que importan
  ['   387.300,50  ', 387300.5], ['$ 387.300,50', 387300.5], ['$387300', 387300],
  ['387300,5', 387300.5], ['0,5', 0.5], [',5', 0.5], ['1,', 1], ['0', 0], ['007', 7],
  ['1.5', 1.5], ['1.55', 1.55], ['1234.567', null], ['12.34.567', null], ['1.50.000', null],
  ['1,2,3', null], ['8 5', null], ['1.500,5,0', null], ['1,5.5', null], ['1,005', null],
  ['-3', null], ['+3', null], ['1e5', null], ['Infinity', null], ['NaN', null], [',', null],
  ['.', null], ['1.', null], ['.5', null], ['1.500.', null], ['٣', null],
]
for (const [t, esp] of CASOS) igual(`leer ${JSON.stringify(t)}`, leer(t), esp)
igual('leer null', leer(null), null)
igual('leer undefined', leer(undefined), null)
igual('leer un número finito lo devuelve tal cual', leer(387300.5), 387300.5)
igual('leer NaN (número) → null', leer(NaN), null)
igual('leer Infinity (número) → null', leer(Infinity), null)
// decimales
igual('0 decimales: "1,5" → null', leer('1,5', { decimales: 0 }), null)
igual('0 decimales: "387300.50" → null', leer('387300.50', { decimales: 0 }), null)
igual('0 decimales: "1.500" → 1500', leer('1.500', { decimales: 0 }), 1500)
igual('3 decimales: "0,300" → 0.3', leer('0,300', { decimales: 3 }), 0.3)
igual('3 decimales: "1,2345" → null', leer('1,2345', { decimales: 3 }), null)
igual('2 decimales: "1,234" → null', leer('1,234', { decimales: 2 }), null)
// negativos
igual('negativos: "-12,5" → -12.5', leer('-12,5', { negativos: true }), -12.5)
igual('negativos: "-1.500" → -1500', leer('-1.500', { negativos: true }), -1500)
igual('negativos: "-" → null', leer('-', { negativos: true }), null)
igual('sin negativos, número negativo → null', leer(-3), null)
igual('con negativos, número negativo → tal cual', leer(-3, { negativos: true }), -3)
igual('"-0" con negativos → 0 (no -0)', leer('-0', { negativos: true }), 0)
// los montos grandes no pierden precisión en los centavos
igual('"99.999.999,99"', leer('99.999.999,99'), 99999999.99)
// Un grupo de miles no empieza con 0 (con "0" de parte entera, el punto es decimal)
igual('"0.300" con 3 decimales → 0.3', leer('0.300', { decimales: 3 }), 0.3)
igual('"0.300" con 2 decimales → null', leer('0.300', { decimales: 2 }), null)
igual('"0.300" por default (2) → null, no 300', leer('0.300'), null)
igual('"00.300" → null', leer('00.300', { decimales: 3 }), null)
igual('"012.345" → null', leer('012.345', { decimales: 3 }), null)
igual('"012.345" con 0 decimales → null', leer('012.345', { decimales: 0 }), null)
igual('"0.5" → 0.5', leer('0.5'), 0.5)
igual('"1.500" → 1500 (igual que antes)', leer('1.500'), 1500)
igual('"0.300,5" → null', leer('0.300,5', { decimales: 3 }), null)
igual('"012.345,5" → null', leer('012.345,5'), null)

// --- formatearNumeroAr ---------------------------------------------------
igual('fmt(null) → "—"', fmt(null), '—')
igual('fmt(undefined) → "—"', fmt(undefined), '—')
igual('fmt("") → "—"', fmt(''), '—')
igual('fmt(NaN) → "—"', fmt(NaN), '—')
igual('fmt("abc") → "—"', fmt('abc'), '—')
igual('fmt(2000000.5)', fmt(2000000.5), '2.000.000,50')
igual('fmt(387300.5)', fmt(387300.5), '387.300,50')
igual('fmt(0) → "0,00" (un cero de verdad sí se muestra)', fmt(0), '0,00')
igual('fmt(1820917.04)', fmt(1820917.04), '1.820.917,04')
igual('fmt(999)', fmt(999), '999,00')
igual('fmt(1000)', fmt(1000), '1.000,00')
igual('fmt(-1500.5)', fmt(-1500.5), '-1.500,50')
igual('fmt(-0.001) → "0,00" sin signo', fmt(-0.001), '0,00')
igual('fmt(1.005) redondea a 2', fmt(1.25), '1,25')
igual('fmt con minimos 0: 1500', fmt(1500, { minimos: 0 }), '1.500')
igual('fmt con minimos 0: 1.5', fmt(1.5, { minimos: 0 }), '1,5')
igual('fmt 3 decimales minimos 0: 0.3', fmt(0.3, { decimales: 3, minimos: 0 }), '0,3')
igual('fmt 0 decimales: 1500.4', fmt(1500.4, { decimales: 0 }), '1.500')
igual('fmt string numérico de la base "1500.50"', fmt('1500.50'), '1.500,50')
// ida y vuelta: lo formateado se vuelve a leer igual
for (const v of [0, 1, 999, 1000, 387300.5, 1820917.04, 2000000, 99999999.99]) {
  igual(`ida y vuelta ${v}`, leer(fmt(v)), v)
}

// --- enlazarCampoNumero: tipear ------------------------------------------
{
  const i = inputFalso()
  enlazar(i)
  igual('pasa a type="text"', i.type, 'text')
  igual('inputmode decimal con decimales', i.atributos.inputmode, 'decimal')
  i.teclear('2000000')
  igual('tipear 2000000 → "2.000.000"', i.value, '2.000.000')
  igual('cursor al final', i.selectionStart, i.value.length)
  igual('leerCampoNumero → 2000000', leerCampoNumero(i), 2000000)
}
{
  const i = inputFalso(); enlazar(i)
  i.teclear('1'); igual('"1"', i.value, '1')
  i.teclear('2'); i.teclear('3'); igual('"123"', i.value, '123')
  i.teclear('4'); igual('punto al cuarto dígito: "1.234"', i.value, '1.234')
}
{
  const i = inputFalso(); enlazar(i)
  i.teclear('387300,50')
  igual('tipear 387300,50', i.value, '387.300,50')
  igual('se lee 387300.5', leerCampoNumero(i), 387300.5)
}
{
  const i = inputFalso(); enlazar(i)
  i.teclear('387300.50')
  igual('el punto tipeado es coma decimal: 387300.50', i.value, '387.300,50')
  igual('se lee 387300.5', leerCampoNumero(i), 387300.5)
}
{
  const i = inputFalso(); enlazar(i)
  i.teclear('1,555')
  igual('no deja escribir un tercer decimal', i.value, '1,55')
  i.teclear(',')
  igual('no deja una segunda coma', i.value, '1,55')
}
{
  const i = inputFalso(); enlazar(i, { decimales: 0 })
  igual('inputmode numeric sin decimales', i.atributos.inputmode, 'numeric')
  i.teclear('1,5')
  igual('sin decimales la coma no entra', i.value, '15')
  i.teclear('.')
  igual('sin decimales el punto tampoco', i.value, '15')
}
{
  const i = inputFalso(); enlazar(i)
  i.teclear('abc12x3')
  igual('las letras no entran', i.value, '123')
  i.teclear('-')
  igual('el signo no entra sin negativos', i.value, '123')
}
{
  const i = inputFalso(); enlazar(i, { negativos: true, decimales: 3 })
  i.teclear('-1234,5')
  igual('con negativos: "-1.234,5"', i.value, '-1.234,5')
  igual('se lee -1234.5', leerCampoNumero(i), -1234.5)
}
// --- el cursor en el medio ---
{
  const i = inputFalso(); enlazar(i)
  i.teclear('123456') // 123.456
  i.cursor(1).teclear('9') // 1|23.456 → 19|23.456 → 1.9|23.456
  igual('insertar en el medio reagrupa', i.value, '1.923.456')
  igual('el cursor queda después del 9', i.value.slice(0, i.selectionStart), '1.9')
}
{
  const i = inputFalso(); enlazar(i)
  i.teclear('1234567') // 1.234.567
  i.cursor(5).borrar() // 1.234|.567 → borra el 4 → 123.567
  igual('borrar en el medio', i.value, '123.567')
  igual('el cursor queda donde estaba el 4', i.value.slice(0, i.selectionStart), '123')
}
{
  const i = inputFalso(); enlazar(i)
  i.teclear('1234567') // 1.234.567
  i.cursor(6).borrar() // 1.234.|567 → el punto: borra el 4
  igual('borrar un punto de miles borra el dígito de al lado', i.value, '123.567')
  igual('cursor tras borrar el punto', i.value.slice(0, i.selectionStart), '123')
}
{
  const i = inputFalso(); enlazar(i)
  i.teclear('1234567')
  i.cursor(5).suprimir() // 1.234|.567 → suprime el punto: borra el 5
  igual('suprimir un punto borra el dígito siguiente', i.value, '123.467')
}
{
  const i = inputFalso(); enlazar(i)
  i.teclear('1000')
  i.cursor(0).suprimir() // |1.000 → .000 → 0
  igual('borrar el primer dígito de 1.000 deja 0', i.value, '0')
}
{
  const i = inputFalso(); enlazar(i)
  i.teclear('0')
  i.teclear('5')
  igual('"05" → "5"', i.value, '5')
  igual('cursor al final tras sacar el cero', i.selectionStart, 1)
}
{
  const i = inputFalso(); enlazar(i)
  i.teclear(',5')
  igual('",5" → "0,5"', i.value, '0,5')
  igual('se lee 0.5', leerCampoNumero(i), 0.5)
}
{
  const i = inputFalso(); enlazar(i)
  i.teclear('12345')
  i.cursor(0).borrar()
  igual('borrar al principio no hace nada', i.value, '12.345')
}
{
  const i = inputFalso(); enlazar(i, { decimales: 0 })
  i.escribirCrudo('1,5')
  igual('sin decimales, una coma que entra sin beforeinput se descarta', i.value, '15')
}
{
  const i = inputFalso(); enlazar(i)
  i.escribirCrudo('0012345', 3) // el cursor después de "001"
  igual('ceros a la izquierda que entran de golpe se sacan', i.value, '12.345')
  igual('y el cursor queda después del 1, no corrido', i.value.slice(0, i.selectionStart), '1')
}
// --- max ---
{
  const i = inputFalso(); enlazar(i, { max: 1000 })
  i.teclear('100')
  i.teclear('0')
  igual('1000 entra con max 1000', i.value, '1.000')
  i.teclear('0')
  igual('10000 no entra con max 1000', i.value, '1.000')
}
// --- pegar ---
{
  const i = inputFalso(); enlazar(i)
  i.pegar('387.300,50')
  igual('pegar "387.300,50"', i.value, '387.300,50')
  igual('pegar dispara input para los listeners', i.eventosInput, 1)
}
{
  const i = inputFalso(); enlazar(i)
  i.pegar('387300.50'); igual('pegar "387300.50"', i.value, '387.300,50')
  igual('se lee 387300.5', leerCampoNumero(i), 387300.5)
}
{
  const i = inputFalso(); enlazar(i)
  i.pegar('$ 2.000.000'); igual('pegar "$ 2.000.000"', i.value, '2.000.000')
}
{
  const i = inputFalso(); enlazar(i)
  i.teclear('55')
  i.pegar('1.2.3,4.5'); igual('pegar algo ilegible no cambia el campo', i.value, '55')
  i.pegar('abc'); igual('pegar letras no cambia el campo', i.value, '55')
}
{
  const i = inputFalso(); enlazar(i, { decimales: 0 })
  i.pegar('1,5'); igual('pegar "1,5" sin decimales no entra', i.value, '')
}
// --- ponerNumero ---
{
  const i = inputFalso(); enlazar(i)
  ponerNumero(i, 387300.5); igual('ponerNumero 387300.5', i.value, '387.300,50')
  ponerNumero(i, 2000000); igual('ponerNumero 2000000 (entero sin ,00)', i.value, '2.000.000')
  ponerNumero(i, null); igual('ponerNumero null → vacío', i.value, '')
  ponerNumero(i, NaN); igual('ponerNumero NaN → vacío', i.value, '')
  ponerNumero(i, '387300'); igual('ponerNumero string "387300" → 387.300', i.value, '387.300')
  igual('y se lee 387300', leerCampoNumero(i), 387300)
  ponerNumero(i, '387300.50'); igual('ponerNumero string "387300.50"', i.value, '387.300,50')
  ponerNumero(i, 1820917.04); igual('ponerNumero 1820917.04', i.value, '1.820.917,04')
  igual('ida y vuelta por el campo', leerCampoNumero(i), 1820917.04)
  i.teclear('9') // al final, con 2 decimales ya puestos, no entra
  igual('después de ponerNumero se sigue editando bien', i.value, '1.820.917,04')
}
{
  const i = inputFalso(); enlazar(i, { decimales: 3 })
  ponerNumero(i, 0.3); igual('ponerNumero 0.3 con 3 decimales', i.value, '0,30')
  igual('se lee 0.3', leerCampoNumero(i), 0.3)
  ponerNumero(i, 0.125); igual('ponerNumero 0.125', i.value, '0,125')
}
{
  // Un campo con valor ANTES de enlazarlo (el HTML traía value="...")
  const i = inputFalso('387300'); enlazar(i)
  igual('enlazar formatea el valor que ya tenía', i.value, '387.300')
  const j = inputFalso('1.2.3'); enlazar(j)
  igual('enlazar sobre un valor ilegible lo deja vacío', j.value, '')
}
{
  const i = inputFalso(); enlazar(i); enlazar(i, { decimales: 0 })
  i.teclear('1,5')
  igual('enlazar dos veces no cambia la configuración', i.value, '1,5')
}

console.log(fallas.map(f => '  ✗ ' + f).join('\n'))
console.log(`${ok}/${ok + fallas.length} ${fallas.length ? 'ROJO' : 'verde'}`)
process.exit(fallas.length ? 1 : 0)
