// Chequeo estático de escapado de TODO modulos/conos.html (10/10/2026).
//
// Cada `${...}` de una plantilla que arma HTML tiene que estar escapado con
// esc() o figurar en SEGURAS con su motivo. Los renders se EJECUTAN con texto
// malicioso en test-conos.js; esto es la otra mitad: una interpolación nueva
// sin escapar pone esta suite en rojo nombrándola.
//
//   node pruebas/test-conos-xss.js

const path = require('path')
const { arnes, leer, estaticoAcotado } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/conos.html')
const FUENTE = leer(ARCHIVO)
const { chk, fin } = arnes()

const ANIDADA = 'HTML de una plantilla anidada: sus interpolaciones las revisa este mismo chequeo'
// Lo que entra sin esc(), cada uno con su motivo.
const SEGURAS = [
  ['cod', 'fila(): llega ya escapado desde htmlOrdenCompra (o es "0" / "")'],
  ['desc', 'fila(): llega ya escapado desde htmlOrdenCompra'],
  ['cant', 'fila(): llega ya escapado; en las otras plantillas es un número de TAMANOS_PLIEGO'],
  ['pu', 'fila(): llega ya escapado desde htmlOrdenCompra (o "-")'],
  ['iva', 'fila(): "X" o "", constante'],
  ['tot', 'fila(): llega ya escapado desde htmlOrdenCompra (o "-")'],
  ['clase', 'fila(): "" / "oc-logo" / "oc-final", constantes del código'],
  ['t', 'número de TAMANOS_PLIEGO, constante del código'],
  ['n', 'número de BOTONES_PLIEGO, constante del código'],
  ['b.n', 'número de BOTONES_ANOTAR, constante del código'],
  ['its.length', 'número'],
  ['Number(p.version)', 'número'],
  ['DIAS_AVISO', 'número, constante del código'],
  ['f.html', 'pintarHistorial: el HTML de cada renglón se armó arriba con esc()'],
  ['cuerpo', 'abrirModal: cada abrir…() arma el cuerpo con esc()'],
  ['atributo', 'htmlResultados: el nombre del atributo es una constante del código ("data-anotar-cono" / "data-agregar-cono")'],
  ['estado.filtroEstado === f.v', 'booleano'],
  ['pestanaActiva() === v.clave', 'booleano'],
  ['htmlChipEstado(p.estado)', 'htmlChipEstado escapa por dentro'],
  ['opcionesPapel(p.papel)', 'opcionesPapel escapa por dentro'],
  ['opcionesPapel(fila.papel)', 'opcionesPapel escapa por dentro'],
  ["opcionesPapel('obra')", 'opcionesPapel escapa por dentro'],
  ["acciones.join('')", 'botones armados arriba con esc() del id'],
  ["conos.join('')", 'renglones armados arriba con fila() y esc()'],
  ["fila('', '', '', '-', 'X', '-')", 'fila() con constantes'],
  ["fila('0', esc(papel?.descripcion_oc ?? nombrePapel(pliego.papel)), '-', '-', '', '-')", 'fila() con el texto escapado'],
  ["fila('0', '', esc(miles(cuentas.cantidad)), '', '', '', 'oc-final')", 'fila() con el número escapado'],
  ['plataOC(cuentas.subtotal)', 'plataOC escapa por dentro'],
  ['plataOC(cuentas.impuesto)', 'plataOC escapa por dentro'],
  ["negativos.map(f => esc(f.cono) + ' (' + esc(miles(f.stock)) + ')').join(', ')", 'cada parte con esc()'],
  ["pocos.map(f => esc(f.cono) + ' (' + esc(textoAlcanza(diasAlcanza(f.stock, f.consumo_30d))) + ')').join(', ')", 'cada parte con esc()'],
  ["coincide.map(i => esc(nombreCono(i.marca_id)) + ' ' + esc(miles(i.cantidad))).join(', ')", 'cada parte con esc()'],
]
const SEGURAS_REGEX = [
  [/^[\w.?()[\]]+\.map\(\w+ => `/s, ANIDADA],
  [/^\(?[\w.?()[\] |]*\)?\.map\(\w+ => `/s, ANIDADA],
  [/^renglones\(pliego\.comentarios\)\.map\(r => `/s, ANIDADA],
]
const script = FUENTE.slice(FUENTE.indexOf('<script type="module">'))
const nombres = [...new Set([...script.matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/gm)].map(m => m[1]))]
chk('se encontraron las funciones del archivo', nombres.length > 30, nombres.length)
estaticoAcotado(chk, ARCHIVO, FUENTE, nombres, { escape: 'esc', seguras: SEGURAS, segurasRegex: SEGURAS_REGEX })

fin()
