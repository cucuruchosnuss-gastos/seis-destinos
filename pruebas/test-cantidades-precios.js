// CÓMO SE PIDE Y SE MUESTRA UN PRECIO (23/10/2026) — js/cantidades.js:
// contenidoUnico, modoDePrecio, precioABase y precioDesdeBase.
//
// El pedido de Facu: con insumos.vista_preferida = 'bulto' y un contenido
// conocido, el precio se escribe y se ve POR BULTO ("bulto de 25 kg ·
// $ 17.500") y a la base va el precio por unidad base (precio / contenido).
// Exige:
//  - harina 25 kg, azúcar 50 kg, óleo 20 kg: $ 17.500 la bolsa manda 700,
//    350 y 875 el kilo;
//  - lecitina (vista 'base'): el precio es por kg, tal cual;
//  - sin contenido conocido (o con dos presentaciones), por su unidad;
//  - EL REDONDEO: lo que se manda, multiplicado por el contenido y redondeado
//    a centavos, da EXACTO lo que escribió la persona — también guardado con
//    2 decimales (orden_retiro_items.precio_caja) o con 4
//    (lista_precios_items.precio_unitario), y también en una bolsa de 30 kg,
//    donde el kilo no da exacto;
//  - el subtotal que calcula valorizar_orden_retiro (round(precio × cantidad,
//    2)) da el precio del bulto por la cantidad de bultos.
//
// Se EJECUTA el código real de js/cantidades.js (sin import/export) con las
// funciones de números reales de js/utils.js.
//
//   node pruebas/test-cantidades-precios.js
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
  '\nreturn { contenidoUnico, modoDePrecio, precioABase, precioDesdeBase, DECIMALES_PRECIO_BASE }')()

const { chk, fin } = arnes()
const nb = s => String(s ?? '').replace(/[  ]/g, ' ')

// Lo que hace la base con un numeric que recibe con más decimales que su
// columna: redondea (half away from zero, positivos acá).
const guardar = (x, dec) => Math.round(x * Math.pow(10, dec)) / Math.pow(10, dec)
// El subtotal de valorizar_orden_retiro: round(v_precio * v_cant, 2), con el
// precio TAL COMO LLEGA (antes de guardarlo en precio_caja).
const subtotalBase = (precio, cant) => Math.round(precio * cant * 100) / 100

const harina = C.modoDePrecio({ unidad: 'kg', vista: 'bulto', contenido: 25 })
const azucar = C.modoDePrecio({ unidad: 'kg', vista: 'bulto', contenido: 50 })
const oleo = C.modoDePrecio({ unidad: 'kg', vista: 'bulto', contenido: 20 })
const lecitina = C.modoDePrecio({ unidad: 'kg', vista: 'base', contenido: 25 })

// ── El contenido de un bulto ─────────────────────────────────────────────
chk('un solo contenido: ese', C.contenidoUnico([25, 25, null]) === 25)
chk('dos presentaciones: ninguno', C.contenidoUnico([25, 50]) === null)
chk('sin contenidos: ninguno', C.contenidoUnico([]) === null && C.contenidoUnico(null) === null)
chk('los null, "" y 0 no cuentan', C.contenidoUnico([null, '', 0, '25']) === 25)

// ── Cómo se pide ─────────────────────────────────────────────────────────
chk('harina: por bulto', harina.porBulto === true && harina.contenido === 25)
chk('harina: "bulto de 25 kg"', nb(harina.rotulo) === 'bulto de 25 kg', harina.rotulo)
chk('azúcar: "bulto de 50 kg"', nb(azucar.rotulo) === 'bulto de 50 kg', azucar.rotulo)
chk('óleo: "bulto de 20 kg"', nb(oleo.rotulo) === 'bulto de 20 kg', oleo.rotulo)
chk('lecitina (vista base): por kg', lecitina.porBulto === false && lecitina.rotulo === 'kg')
const sinContenido = C.modoDePrecio({ unidad: 'kg', vista: 'bulto', contenido: null })
chk('vista bulto sin contenido conocido: por kg, sin romperse', sinContenido.porBulto === false && sinContenido.rotulo === 'kg')
chk('contenido 0 o ilegible: por su unidad',
  C.modoDePrecio({ unidad: 'kg', vista: 'bulto', contenido: 0 }).porBulto === false &&
  C.modoDePrecio({ unidad: 'kg', vista: 'bulto', contenido: 'x' }).porBulto === false)
chk('litros: "L"', C.modoDePrecio({ unidad: 'lt', vista: 'base' }).rotulo === 'L')
chk('unidades: "unidad"', C.modoDePrecio({ unidad: 'un', vista: 'base' }).rotulo === 'unidad')
chk('bidón de 20 L', nb(C.modoDePrecio({ unidad: 'lt', vista: 'bulto', contenido: 20 }).rotulo) === 'bulto de 20 L')

// ── Lo que va a la base ──────────────────────────────────────────────────
chk('$ 17.500 la bolsa de harina de 25 kg → $ 700 el kilo', C.precioABase(17500, harina) === 700)
chk('$ 17.500 la bolsa de azúcar de 50 kg → $ 350 el kilo', C.precioABase(17500, azucar) === 350)
chk('$ 17.500 el balde de óleo de 20 kg → $ 875 el kilo', C.precioABase(17500, oleo) === 875)
chk('lecitina: $ 4.200 el kilo va tal cual', C.precioABase(4200, lecitina) === 4200)
chk('vacío no es cero', C.precioABase(null, harina) === null && C.precioABase('', harina) === null && C.precioABase(undefined, harina) === null)
chk('ilegible: null', C.precioABase('abc', harina) === null)
chk('se manda con 8 decimales', C.DECIMALES_PRECIO_BASE === 8 && C.precioABase(17500, C.modoDePrecio({ unidad: 'kg', vista: 'bulto', contenido: 30 })) === 583.33333333)

// ── EL REDONDEO: ida y vuelta ────────────────────────────────────────────
// Una tanda de precios por bulto (enteros, con 50 centavos, con centavos
// sueltos) y de contenidos (los de Facu y uno que no divide: 30, 12,5, 3).
const PRECIOS = [17500, 17500.5, 17499.99, 18250, 1, 0.01, 999999.99, 45678.9, 33333.33, 12345.67]
const CONTENIDOS = [25, 50, 20, 30, 12.5, 3, 1]
let idaVuelta = 0, idaVueltaMal = []
let guardado2 = 0, guardado2Mal = []
let guardado4 = 0, guardado4Mal = []
let subtotales = 0, subtotalesMal = []
for (const c of CONTENIDOS) {
  const modo = C.modoDePrecio({ unidad: 'kg', vista: 'bulto', contenido: c })
  for (const p of PRECIOS) {
    const base = C.precioABase(p, modo)
    // 1. Lo mandado × contenido, a centavos, es lo escrito.
    idaVuelta++
    if (Math.round(base * c * 100) / 100 !== p) idaVueltaMal.push(`${p}/${c}`)
    // 2. Guardado con 4 decimales (precio_unitario de la lista), vuelve igual.
    guardado4++
    if (C.precioDesdeBase(guardar(base, 4), modo, { decimalesBase: 4 }) !== p) guardado4Mal.push(`${p}/${c}`)
    // 3. Guardado con 2 decimales (precio_caja del renglón) y con su
    //    subtotal, para 1, 2, 4 y 10 bultos: vuelve igual.
    for (const n of [1, 2, 4, 10]) {
      const cant = n * c
      const sub = subtotalBase(base, cant)
      subtotales++
      if (sub !== Math.round(p * n * 100) / 100) subtotalesMal.push(`${p}/${c}×${n}=${sub}`)
      guardado2++
      const vuelta = C.precioDesdeBase(guardar(base, 2), modo, { decimalesBase: 2, subtotal: sub, cantidad: cant })
      if (vuelta !== p) guardado2Mal.push(`${p}/${c}×${n}→${vuelta}`)
    }
  }
}
chk(`ida y vuelta: lo mandado × contenido da lo escrito (${idaVuelta} casos)`, !idaVueltaMal.length, idaVueltaMal.join(', '))
chk(`guardado con 4 decimales (lista), vuelve lo escrito (${guardado4} casos)`, !guardado4Mal.length, guardado4Mal.join(', '))
chk(`el subtotal de la base da precio × bultos (${subtotales} casos)`, !subtotalesMal.length, subtotalesMal.join(', '))
chk(`guardado con 2 decimales y su subtotal (orden), vuelve lo escrito (${guardado2} casos)`, !guardado2Mal.length, guardado2Mal.join(', '))

// EL CASO DE LA BOLSA DE 30 KG: sin la búsqueda, 583,33 × 30 = 17.499,90.
const bolsa30 = C.modoDePrecio({ unidad: 'kg', vista: 'bulto', contenido: 30 })
chk('bolsa de 30 kg a $ 17.500: guardado 583,33, se ve $ 17.500 (no 17.499,90)',
  C.precioDesdeBase(583.33, bolsa30, { decimalesBase: 2 }) === 17500, C.precioDesdeBase(583.33, bolsa30, { decimalesBase: 2 }))
chk('… y con su subtotal de 3 bolsas ($ 52.500)',
  C.precioDesdeBase(583.33, bolsa30, { decimalesBase: 2, subtotal: 52500, cantidad: 90 }) === 17500)
chk('un subtotal que no cierra con ningún precio: multiplica y redondea (no inventa)',
  C.precioDesdeBase(583.33, bolsa30, { decimalesBase: 2, subtotal: 1, cantidad: 90 }) === 17499.9)
// Con 2 decimales y sin subtotal, entre los que dan lo guardado gana el más
// redondo: $ 17.500,01 en 25 kg guarda 700,00 → sin subtotal se ve 17.500.
// El subtotal de UNA bolsa (17.500,01) lo desempata.
chk('el subtotal desempata centavos: $ 17.500,01 la bolsa de 25 kg',
  C.precioDesdeBase(700, harina, { decimalesBase: 2, subtotal: 17500.01, cantidad: 25 }) === 17500.01)
// El borde: $ 14.000,10 el balde de 20 kg son 700,005 el kilo, que la base
// guarda como 700,01 (no 700). Con 700 guardado, ese precio NO puede ser el
// escrito aunque su subtotal cierre: no se inventa, multiplica y redondea.
chk('un precio que la base habría guardado distinto no gana (el borde de medio centavo)',
  C.precioDesdeBase(700, oleo, { decimalesBase: 2, subtotal: 14000.1, cantidad: 20 }) === 14000)
chk('costo + % de la lista (712,37 el kilo, 2 decimales) en 25 kg: 17.809,25 exacto',
  C.precioDesdeBase(712.37, harina, { decimalesBase: 4 }) === 17809.25)
chk('una devolución (subtotal negativo) se compara en valor absoluto',
  C.precioDesdeBase(583.33, bolsa30, { decimalesBase: 2, subtotal: -52500, cantidad: 90 }) === 17500)

// ── Lecitina y lo que no va por bulto ────────────────────────────────────
chk('lecitina: lo guardado se ve tal cual', C.precioDesdeBase(4200.5, lecitina) === 4200.5)
chk('sin bulto, 4 decimales tal cual', C.precioDesdeBase(583.3333, sinContenido, { decimalesBase: 4 }) === 583.3333)
chk('ausente es null, nunca $ 0', C.precioDesdeBase(null, harina) === null && C.precioDesdeBase('', harina) === null)
chk('cero es cero', C.precioDesdeBase(0, harina) === 0 && C.precioABase(0, harina) === 0)

fin()
