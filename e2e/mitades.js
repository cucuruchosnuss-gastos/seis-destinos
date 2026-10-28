// Las dos mitades del trabajo "Navegador" de GitHub (14/10/2026).
//
// Con un solo trabajo, Playwright tardaba ~22 de los 30 minutos de tope y
// cualquier traba lo cortaba. Ahora .github/workflows/navegador.yml corre DOS
// trabajos a la vez, cada uno con E2E_MITAD=1 o E2E_MITAD=2, y
// playwright.config.js le pide a este archivo qué specs le tocan.
//
// LA REGLA: la mitad 1 es la lista de abajo; la mitad 2 es TODO LO DEMÁS.
// Así un spec nuevo nunca queda afuera de las dos: si nadie lo anota, va a la 2.
// pruebas/test-navegador-en-dos.js exige que cada spec corra en UNA sola mitad,
// que las dos tarden parecido (con TIEMPOS) y que los specs que usan la
// fábrica de pruebas real (el robot) vayan juntos en la misma mitad: la fábrica
// es una sola, y dos trabajos a la vez se pisarían los turnos.
//
// Sin E2E_MITAD (npm run e2e en la compu, el ensayo de integración) corre todo,
// como siempre.

const fs = require('fs')
const path = require('path')

const MITADES = 2

// Por qué estos: los dos de dispositivos son los más largos (lanzan Android,
// iPhone y la compu) y con los cuatro de al lado la mitad 1 tarda casi lo
// mismo que todo el resto junto (ver TIEMPOS). La 2 queda apenas más liviana a
// propósito: los specs nuevos caen ahí.
const MITAD_1 = [
  'detalles-dispositivos.spec.js',
  'filtros-dispositivos.spec.js',
  '31-vistas-faltantes.spec.js',
  '9-comparar-planta.spec.js',
  '6-planta-reanudar.spec.js',
  '30-revision-celular.spec.js',
  // 28/10/2026 (tablet-largada-tarde): con los specs 70 y 71 de la tablet la
  // mitad 2 pasaba del 55 % (920 de 1661 s); dos de la planta, solo maqueta,
  // vienen a la 1 y quedan 833 / 828.
  '8-planta-tamanos.spec.js',
  '25-planta-paradas.spec.js',
  // 24/10/2026 (cheque-rechazado): con él, 741 s en la 1 y 792 s en la 2.
  // Va antes de los de abajo: mut-navegador-en-dos.js se ancla en el último.
  '60-cheque-rechazado.spec.js',
  // 28/10/2026 (tablet-sin-internet-pin): con él en la 2, 741 s en la 1 y
  // 912 s en la 2 (55,2 %); en la 1 quedan 791 y 904.
  '70-tablet-sin-internet-pin.spec.js',
  // 24/10/2026 (cheques-importe-completo): con el spec 61 la mitad 2 pasaba
  // del 55 % (819 de 1486 s); los dos de cheques al banco vienen a la 1.
  '37-cheques-banco.spec.js',
  '61-cheques-importe-completo.spec.js',
]

// Segundos de cada spec, medidos en GitHub (corrida 38493299918 de main, el
// 14/10/2026, sin los secretos del robot). Solo sirven para repartir parejo:
// un spec que no está acá cuenta como TIEMPO_SIN_MEDIR.
const TIEMPOS = {
  'detalles-dispositivos.spec.js': 342,
  'filtros-dispositivos.spec.js': 156,
  '0-humo.spec.js': 78,
  '8-planta-tamanos.spec.js': 71,
  '5-maqueta.spec.js': 66,
  '31-vistas-faltantes.spec.js': 60,
  '9-comparar-planta.spec.js': 40,
  '6-planta-reanudar.spec.js': 36,
  '30-revision-celular.spec.js': 33,
  '14-comparar-taller.spec.js': 29,
  '27-ampliar.spec.js': 24,
  '30-planta-360.spec.js': 22,
  '29-planta-390.spec.js': 22,
  '25-planta-paradas.spec.js': 21,
  '37-cheques-banco.spec.js': 19,
  // Sin medir en GitHub: 44 s en la compu (20 pruebas, 24/10/2026); se estima
  // como el 37 (mismas pantallas) con algo más.
  '61-cheques-importe-completo.spec.js': 20,
  // Sin medir en GitHub: 57 s en la compu dentro del ensayo (tres pruebas,
  // 28/10/2026); en GitHub va más rápido.
  '70-tablet-sin-internet-pin.spec.js': 50,
  '34-faltante-retiro.spec.js': 19,
  '7-barra-unidad.spec.js': 18,
  '27-planta-sin-internet.spec.js': 16,
  '11-comparar-esqueleto.spec.js': 16,
  '15-comparar-retiros.spec.js': 16,
  '13-comparar-administracion.spec.js': 14,
  '10-comparar-config.spec.js': 13,
  '18-cobranza-asentada.spec.js': 12,
  '32-conos.spec.js': 12,
  '35-prestamos.spec.js': 11,
  '27-cliente-provisorio.spec.js': 10,
  '17-planta-pestanas.spec.js': 9,
  '12-planta-atras.spec.js': 9,
  '27-comisiones.spec.js': 9,
  '27-cuenta-unica.spec.js': 8,
  '25-cantidades.spec.js': 8,
  '26-cc-clientes-cheques.spec.js': 7,
  '16-planta-sin-zoom.spec.js': 6,
  '29-produccion-tabla.spec.js': 6,
  '22-clientes-apodos.spec.js': 6,
  '26-barra-abajo.spec.js': 5,
  '29-costos-insumos.spec.js': 5,
  '32-celular-pendientes.spec.js': 5,
  '33-resumen-cuenta.spec.js': 4,
  '21-vista-preferida-tablet.spec.js': 4,
  '24-gastos-aviso-taller.spec.js': 4,
  '36-entre-empresas.spec.js': 4,
  '31-sin-cono-unico.spec.js': 3,
  'indicadores-maquinas.spec.js': 3,
  '28-planta-corregir.spec.js': 3,
  '28-planta-operarios-fin.spec.js': 3,
  '23-taller-celu.spec.js': 3,
  '20-stock-dias-habiles.spec.js': 2,
  '28-hoja-retiro.spec.js': 2,
  '19-stock-se-actualiza.spec.js': 2,
  '28-planillas.spec.js': 2,
  // Los del robot se saltean sin sus secretos (hoy no están cargados).
  '3-accesos.spec.js': 1,
  '1-planta.spec.js': 1,
  '2-gestion.spec.js': 1,
  '4-retiros.spec.js': 1,
  // Medido en la compu el 24/10/2026 (31 s): en GitHub se estima algo más.
  '60-cheque-rechazado.spec.js': 35,
}
const TIEMPO_SIN_MEDIR = 8

function tiempoDe(nombre) {
  return TIEMPOS[nombre] ?? TIEMPO_SIN_MEDIR
}

// 1 o 2.
function mitadDe(nombre) {
  return MITAD_1.includes(nombre) ? 1 : 2
}

// Los specs como los encuentra Playwright (testDir = e2e, *.spec.js, también
// en subcarpetas), con la ruta relativa a e2e/ y "/" como separador.
function listarSpecs(dir = __dirname) {
  const out = []
  const recorrer = (d, rel) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules') continue
      const r = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) recorrer(path.join(d, e.name), r)
      else if (/\.spec\.js$/.test(e.name)) out.push(r)
    }
  }
  recorrer(dir, '')
  return out.sort()
}

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Una expresión que reconoce, por el final de la ruta, los specs de la mitad 1.
function reMitad1() {
  return new RegExp(`(^|[\\\\/])(?:${MITAD_1.map(escRe).join('|')})$`)
}

// Lo que playwright.config.js suma a su configuración. Sin mitad: nada (todo).
// Una mitad que no es 1 ni 2 es un error, no "todo": si el workflow manda algo
// raro, que se vea en vez de correr dos veces lo mismo.
function opcionesDeMitad(valor) {
  if (valor === undefined || valor === null || valor === '') return {}
  const n = Number(valor)
  if (!Number.isInteger(n) || n < 1 || n > MITADES) {
    throw new Error(`E2E_MITAD tiene que ser un número de 1 a ${MITADES} (llegó «${valor}»)`)
  }
  if (n === 1) return { testMatch: [reMitad1()] }
  return { testIgnore: [/[\\/]node_modules[\\/]/, reMitad1()] }
}

module.exports = { MITADES, MITAD_1, TIEMPOS, TIEMPO_SIN_MEDIR, tiempoDe, mitadDe, listarSpecs, opcionesDeMitad }
