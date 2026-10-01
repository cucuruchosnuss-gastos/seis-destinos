// Mutaciones de test-produccion-teclado.js (el teclado de la tablet,
// 01/10/2026). Ver mutar.js y mutar-produccion.js.
//
//   node pruebas/mut-produccion-teclado.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-teclado.js'),
  escape: 'esc',
  funciones: [],
  manuales: [
    { nombre: 'las cajas con el teclado de letras', de: '<input type="text" id="pr-agregar-cajas" class="pr-contador__valor" inputmode="numeric"', a: '<input type="text" id="pr-agregar-cajas" class="pr-contador__valor"' },
    { nombre: 'el scrap sin decimales', de: 'id="pr-cierre-scrap" class="pr-cierre-num" inputmode="decimal"', a: 'id="pr-cierre-scrap" class="pr-cierre-num" inputmode="numeric"' },
    { nombre: 'las observaciones sugieren palabras', de: '<textarea id="pr-cierre-obs" class="pr-textarea" maxlength="1000" autocomplete="off"></textarea>', a: '<textarea id="pr-cierre-obs" class="pr-textarea" maxlength="1000"></textarea>' },
    { nombre: 'los kilos de la receta con letras', de: 'data-cant="${esc(id)}" inputmode="decimal" enterkeyhint="done" autocomplete="off"', a: 'data-cant="${esc(id)}" enterkeyhint="done" autocomplete="off"' },
    { nombre: 'sin "Listo"', de: '      <button type="button" class="pr-listo" id="pr-teclado-listo" hidden>Listo</button>\n', a: '' },
    { nombre: 'una fecha cuenta como campo de texto', de: "['checkbox', 'radio', 'button', 'submit', 'hidden', 'date', 'range']", a: "['checkbox', 'radio', 'button', 'submit', 'hidden', 'range']" },
    { nombre: 'un textarea no cuenta', de: "      if (el.tagName === 'TEXTAREA') return true\n", a: '' },
    { nombre: 'el teclado siempre abierto', de: '      return !!vv && Number.isFinite(vv.height) && alto - vv.height > MARGEN_TECLADO', a: '      return !!vv' },
    { nombre: 'sin visualViewport se rompe', de: '      return !!vv && Number.isFinite(vv.height) && alto - vv.height > MARGEN_TECLADO', a: '      return alto - vv.height > MARGEN_TECLADO' },
    { nombre: '"Listo" con cualquier foco', de: '      const abierto = campoDeTexto(activo) && tecladoAbierto(vv)', a: '      const abierto = tecladoAbierto(vv)' },
    { nombre: '"Listo" no se esconde', de: '      b.hidden = !abierto\n', a: "      if (abierto) b.hidden = false\n" },
    { nombre: '"Listo" abajo de todo (tapado por el teclado)', de: '      b.style.bottom = `${Math.round(abajo + 8)}px`', a: "      b.style.bottom = '8px'" },
    { nombre: 'el campo tapado no se trae a la vista', de: "if (r && (r.bottom > (vv.offsetTop || 0) + vv.height - 60 || r.top < (vv.offsetTop || 0))) activo.scrollIntoView?.({ block: 'center' })", a: '' },
    { nombre: 'el campo que se ve igual se mueve', de: "if (r && (r.bottom > (vv.offsetTop || 0) + vv.height - 60 || r.top < (vv.offsetTop || 0))) activo.scrollIntoView", a: 'if (r) activo.scrollIntoView' },
    { nombre: '"Listo" no cierra', de: '      if (campoDeTexto(a)) a.blur?.()\n', a: '' },
    { nombre: 'nadie escucha el teclado', de: "      vv?.addEventListener?.('resize', revisarTeclado)\n", a: '' },
    { nombre: 'tocar "Listo" le saca el foco antes', de: "      b?.addEventListener('pointerdown', ev => ev.preventDefault())\n", a: '' },
    { nombre: 'no se conecta al arrancar', de: '      // "Listo" arriba del teclado de la tablet.\n      conectarTeclado()\n', a: '' },
  ],
})
