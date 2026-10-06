// EL TECLADO DE LA TABLET (01/10/2026).
//
// En la tablet, el teclado en pantalla tapa la mitad de abajo y no tiene un
// "Listo" a mano. La planta:
//  - pide el teclado numérico en los campos de número (inputmode) y no
//    sugiere palabras guardadas en ningún campo (autocomplete="off");
//  - con visualViewport sabe si el teclado está abierto sobre un campo de
//    texto, y ahí muestra "Listo" pegado arriba del teclado (lo cierra) y
//    trae el campo a la vista;
//  - el PIN no usa el teclado del sistema: tiene el suyo (ningún <input>).
// Se EJECUTA el código de la planta con su sandbox.
//
//   node pruebas/test-produccion-teclado.js
//   ARCHIVO_TEST=<copia de modulos/produccion.html>

process.env.TZ = 'UTC'
const path = require('path')
const { arnes, leer } = require('./circuito-comun')
const { construirProduccion } = require('./sandbox-produccion')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/produccion.html')
const FUENTE = leer(ARCHIVO)
const { chk, fin } = arnes()

// ── Los campos ──────────────────────────────────────────────────────────
// (Con atributos: un "<input>" suelto es el de un comentario.)
const campos = [...FUENTE.matchAll(/<(input|textarea)\s[^>]*>/g)].map(m => m[0])
const sinAuto = campos.filter(c => !/autocomplete="(off|username|current-password)"/.test(c) && !/type="(date|checkbox|radio|hidden)"/.test(c))
chk('ningún campo sugiere palabras guardadas (autocomplete="off")', sinAuto.length === 0, sinAuto.join('\n'))
for (const [id, modo] of [['pr-agregar-cajas', 'numeric'], ['pr-corregir-cajas', 'numeric'],
  ['pr-cierre-scrap', 'decimal'], ['pr-otro-kg', 'decimal'], ['pr-agregar-ing-kg', 'decimal']]) {
  const c = campos.find(x => x.includes(`id="${id}"`)) ?? ''
  chk(`${id}: teclado ${modo} y "Listo" en la tecla de enviar`, c.includes(`inputmode="${modo}"`) && c.includes('enterkeyhint="done"'), c)
}
chk('los kilos de la receta piden el teclado decimal', /data-cant="\$\{esc\(id\)\}" inputmode="decimal" enterkeyhint="done" autocomplete="off"/.test(FUENTE) &&
  /data-cant-otro="\$\{esc\(o\.id\)\}" inputmode="decimal" enterkeyhint="done" autocomplete="off"/.test(FUENTE))
chk('el PIN no usa el teclado del sistema (ningún campo de PIN)', !campos.some(c => /pin/i.test(c) && !/buscar/.test(c)))
chk('"Listo" existe y arranca escondido', /<button type="button" class="pr-listo" id="pr-teclado-listo" hidden>Listo<\/button>/.test(FUENTE))
chk('"Listo" va fijo, en el naranja de lo que se toca', /\.pr-listo \{[^}]*position: fixed;[^}]*background: var\(--p-acento\)/.test(FUENTE))
chk('se escucha visualViewport y el foco', /vv\?\.addEventListener\?\.\('resize', revisarTeclado\)/.test(FUENTE) && /document\.addEventListener\('focusin', revisarTeclado\)/.test(FUENTE))
chk('tocar "Listo" no le saca el foco antes de tiempo y lo cierra', /b\?\.addEventListener\('pointerdown', ev => ev\.preventDefault\(\)\)/.test(FUENTE) && /b\?\.addEventListener\('click', cerrarTeclado\)/.test(FUENTE))
chk('se conecta al arrancar', /\n\s+conectarTeclado\(\)\n/.test(FUENTE))

// ── La lógica ───────────────────────────────────────────────────────────
function armar({ alto = 540, vvAlto = 540, offset = 0, activo = null } = {}) {
  const S = construirProduccion(ARCHIVO)
  S.__win.innerHeight = alto
  S.__win.visualViewport = vvAlto == null ? undefined : { height: vvAlto, offsetTop: offset }
  S.__doc.activeElement = activo
  return S
}
const campo = (extra = {}) => {
  let vistos = 0, desenfocado = 0
  return Object.assign({ tagName: 'INPUT', type: 'text', getBoundingClientRect: () => ({ top: 400, bottom: 444 }),
    scrollIntoView() { vistos++ }, blur() { desenfocado++ }, vistos: () => vistos, desenfocado: () => desenfocado }, extra)
}

{
  const S = armar()
  chk('un input de texto es campo', S.campoDeTexto({ tagName: 'INPUT', type: 'text' }) && S.campoDeTexto({ tagName: 'INPUT', type: 'search' }))
  chk('un textarea es campo', S.campoDeTexto({ tagName: 'TEXTAREA' }))
  chk('un botón, una casilla o una fecha no', !S.campoDeTexto({ tagName: 'BUTTON' }) && !S.campoDeTexto({ tagName: 'INPUT', type: 'checkbox' }) && !S.campoDeTexto({ tagName: 'INPUT', type: 'date' }) && !S.campoDeTexto(null))
  chk('teclado abierto: la parte visible bastante más baja', S.tecladoAbierto({ height: 260 }, 540) && !S.tecladoAbierto({ height: 500 }, 540) && !S.tecladoAbierto(undefined, 540))
}
{
  const c = campo()
  const S = armar({ vvAlto: 260, activo: c })
  const b = S.__doc.getElementById('pr-teclado-listo')
  b.hidden = true
  chk('con el teclado abierto sobre un campo, aparece "Listo"', S.revisarTeclado() === true && b.hidden === false)
  chk('… pegado arriba del teclado', b.style.bottom === '288px', b.style.bottom)
  chk('… y el campo tapado se trae a la vista', c.vistos() === 1)
  chk('… y el body lo sabe', S.__doc.body?.classList?.contains?.('pr-teclado-abierto') ?? true)
  S.cerrarTeclado()
  chk('"Listo" cierra el teclado (le saca el foco al campo)', c.desenfocado() === 1)
}
{
  const c = campo({ getBoundingClientRect: () => ({ top: 60, bottom: 104 }) })
  const S = armar({ vvAlto: 260, activo: c })
  S.revisarTeclado()
  chk('un campo que ya se ve no se mueve', c.vistos() === 0)
}
{
  const S = armar({ vvAlto: 540, activo: campo() })
  const b = S.__doc.getElementById('pr-teclado-listo')
  b.hidden = false
  chk('sin teclado abierto, no hay "Listo"', S.revisarTeclado() === false && b.hidden === true)
  const T = armar({ vvAlto: 260, activo: { tagName: 'BUTTON' } })
  const bt = T.__doc.getElementById('pr-teclado-listo')
  bt.hidden = false
  chk('con el foco en un botón, tampoco', T.revisarTeclado() === false && bt.hidden === true)
  const U = armar({ vvAlto: null, activo: campo() })
  chk('sin visualViewport (navegador viejo), nada', U.revisarTeclado() === false)
}

fin()
