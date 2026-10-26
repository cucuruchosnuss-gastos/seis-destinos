// js/ingreso-terminado.js (26/10/2026, decimosexta excepción) tiene la lógica
// del ingreso de producto terminado de la gestión de Producción LETRA POR
// LETRA: la usa el Ingreso de materia prima, y la gestión conserva su copia en
// modulos/produccion-gestion.html (el pedido del 26/10 fue no tocarla). Esta
// suite da ROJO si las dos copias dejan de ser iguales —qué falta, qué lote
// viaja, qué parámetros van a ingresar_producto_terminado—: se cambian juntas.
// Y que las dos entradas sigan en pie: la gestión con su botón y su llamada,
// Ingreso importando el archivo sin declarar copias propias.
//
//   node pruebas/test-ingreso-terminado-comun.js
//   ARCHIVO_TEST=<copia de js/ingreso-terminado.js>  ARCHIVO_GESTION=<copia de la gestión>
'use strict'

const fs = require('fs')
const path = require('path')
const { extraerFn } = require('./extraer')
const { arnes, leer } = require('./circuito-comun')

const RAIZ = path.join(__dirname, '..')
const COMUN = process.env.ARCHIVO_TEST || path.join(RAIZ, 'js', 'ingreso-terminado.js')
const GESTION = process.env.ARCHIVO_GESTION || path.join(RAIZ, 'modulos', 'produccion-gestion.html')
const MP = path.join(RAIZ, 'modulos', 'materia-prima.html')
const C = leer(COMUN)
const G = leer(GESTION)
const M = fs.readFileSync(MP, 'utf8')
const { chk, fin } = arnes()

const FUNCIONES = ['normalizarLoteIngreso', 'modoLoteIngreso', 'loteDeRenglon', 'origenParaBase', 'presentacionDe',
  'itemsParaBase', 'faltaIngreso', 'parametrosIngreso', 'textoListoIngreso']
const CONSTANTES = ['ORIGENES_INGRESO', 'TAREAS_INGRESO', 'LARGO_MAXIMO_LOTE']

// La gestión está adentro del <script> (4 espacios de sangría); el común, en
// la columna 0.
const sinSangria = (t) => t.split('\n').map(l => l.startsWith('    ') ? l.slice(4) : l).join('\n')

for (const f of FUNCIONES) {
  let g = null, c = null
  try { g = sinSangria(extraerFn(G, f)) } catch (e) { chk(`la gestión tiene ${f}`, false, e.message); continue }
  try { c = extraerFn(C, f) } catch (e) { chk(`js/ingreso-terminado.js tiene ${f}`, false, e.message); continue }
  chk(`${f}: igual letra por letra en la gestión y en js/ingreso-terminado.js`, g === c,
    `\n--- gestión\n${g}\n--- común\n${c}`)
  chk(`${f}: exportada`, new RegExp(`^export function ${f}\\(`, 'm').test(C))
}
for (const k of CONSTANTES) {
  const g = (G.match(new RegExp(`\\n    const ${k} = ([^\\n]*)\\n`)) || [])[1]
  const c = (C.match(new RegExp(`\\nexport const ${k} = ([^\\n]*)\\n`)) || [])[1]
  chk(`${k}: la misma en las dos`, g != null && g === c, `${g} / ${c}`)
}

// La lectura del catálogo: la de la gestión, con el cliente como parámetro y
// además de qué proveedor viene cada producto.
const lecturaG = extraerFn(G, 'leerCatalogoIngreso')
const lecturaC = extraerFn(C, 'leerCatalogoIngresoTerminado')
chk('el catálogo lee lo mismo que la gestión, más origen_proveedor_id',
  lecturaC.replace(/\bsb\./g, 'supabase.').replace(', origen_proveedor_id', '').replace('leerCatalogoIngresoTerminado(sb, unidadId)', 'leerCatalogoIngreso(unidadId)') === sinSangria(lecturaG))

// La base pide materia_prima:cargar o stock:ajustar_inventario (leído el
// 26/10/2026); el wizard de Ingreso solo abre donde hay materia_prima:cargar.
chk('las tareas que acepta la base', /export const TAREAS_INGRESO = \['materia_prima:cargar', 'stock:ajustar_inventario'\]/.test(C))

// Las dos entradas siguen: la gestión con su botón y su llamada, Ingreso
// importando el común (sin copias propias de esas funciones).
chk('la gestión sigue con "Cargar ingreso" en el stock terminado', /id="pr-stock-ingresar"/.test(G) && G.includes("supabase.rpc('ingresar_producto_terminado', parametrosIngreso(ing, ing.catalogo))"))
chk('Ingreso importa js/ingreso-terminado.js', /import \{[^}]*\bfaltaIngreso\b[^}]*\bparametrosIngreso\b[^}]*\} from '\.\.\/js\/ingreso-terminado\.js'/.test(M))
for (const f of [...FUNCIONES, 'leerCatalogoIngresoTerminado']) {
  chk(`Ingreso no declara su propia ${f}`, !new RegExp(`\\n\\s*(?:async\\s+)?function ${f}\\s*\\(`).test(M))
}
chk('Ingreso graba con la misma RPC y los parámetros del común', M.includes("supabase.rpc('ingresar_producto_terminado', parametrosIngreso(ingresoTerminado(w), w.terminadoCat?.cat))"))

fin()
