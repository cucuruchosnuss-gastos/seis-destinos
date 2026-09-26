// La cartera de cheques vive DENTRO de modulos/administracion.html desde el
// 26/09/2026, entre dos marcas:
//
//   <!-- ══ CHEQUES: inicio …   …   <!-- ══ CHEQUES: fin …
//
// Las suites de Cheques leen SOLO esa región: así una assertion sobre el
// fuente ("no hay X", "el CSS dice Y") mira el código de la cartera y no el
// de Administración, y extraer.js encuentra la función de la cartera (las
// dos pantallas tienen, por ejemplo, su propio esc() y su propio
// hoyArgentina()).
//
// La región se devuelve con TANTOS SALTOS DE LÍNEA ADELANTE como líneas hay
// antes de ella en el archivo: los números de línea quedan iguales a los del
// archivo, que es lo que usan escaner-interpolaciones.js y mutar.js.
//
// Sobre un archivo SIN las marcas (el cheques.html de antes de la mudanza,
// por ejemplo un baseline), devuelve el archivo entero.

const fs = require('fs')
const path = require('path')

const RAIZ = path.join(__dirname, '..')
const ARCHIVO_CHEQUES = path.join(RAIZ, 'modulos', 'administracion.html')
const MARCA_INICIO = '<!-- ══ CHEQUES: inicio'
const MARCA_FIN = '<!-- ══ CHEQUES: fin'

function limitesCheques(texto) {
  const ini = texto.indexOf(MARCA_INICIO)
  const fin = texto.indexOf(MARCA_FIN)
  if (ini === -1 || fin === -1 || fin < ini) return null
  return { ini, fin }
}

function regionCheques(texto) {
  const l = limitesCheques(texto)
  if (!l) return texto
  const lineasAntes = texto.slice(0, l.ini).split('\n').length - 1
  return '\n'.repeat(lineasAntes) + texto.slice(l.ini, l.fin)
}

// Lo contrario: el archivo SIN la región de la cartera (reemplazada por la
// misma cantidad de saltos de línea, así los números de línea no cambian).
// Lo usan las suites de Administración, que no tienen que ver lo de Cheques.
function sinCheques(texto) {
  const l = limitesCheques(texto)
  if (!l) return texto
  const lineas = texto.slice(l.ini, l.fin).split(String.fromCharCode(10)).length - 1
  return texto.slice(0, l.ini) + String.fromCharCode(10).repeat(lineas) + texto.slice(l.fin)
}

// Para mutar SOLO la parte de Administración: todo lo que está ANTES de la
// región de la cartera (que va al final del archivo).
function limitesAdministracion(texto) {
  const l = limitesCheques(texto)
  return { ini: 0, fin: l ? l.ini : texto.length }
}

// Lee el archivo bajo prueba e imprime la línea "ARCHIVO … (N bytes)" con el
// largo del ARCHIVO ENTERO (mutar.js la compara contra lo que escribió).
function leerCheques(archivo) {
  const todo = fs.readFileSync(archivo, 'utf8')
  console.log(`ARCHIVO ${archivo} (${todo.length} bytes)`)
  return regionCheques(todo)
}

module.exports = { ARCHIVO_CHEQUES, MARCA_INICIO, MARCA_FIN, limitesCheques, regionCheques, sinCheques, limitesAdministracion, leerCheques }
