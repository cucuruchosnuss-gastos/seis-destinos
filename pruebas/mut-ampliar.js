// Mutaciones de la ventana "Ampliar" (ver test-ampliar.js). Cada una rompe una
// regla de js/ampliar.js; la suite se tiene que poner en ROJO.
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-ampliar.js'),
  original: path.join(__dirname, '..', 'js', 'ampliar.js'),
  funciones: [],
  manuales: [
    // El corte y el botón.
    { nombre: 'sin corte: se ve en el celular', de: 'const enCompu = () => !!mq?.matches', a: 'const enCompu = () => true' },
    { nombre: 'el botón no se esconde nunca', de: 'if (boton.hidden !== !ver) boton.hidden = !ver', a: 'boton.hidden = false' },
    { nombre: 'pone hidden aunque no cambie (bucle con el observador)', de: 'if (boton.hidden !== !ver) boton.hidden = !ver', a: 'boton.hidden = !ver' },
    { nombre: 'abrir no mira el corte ni el detalle', de: '    if (!enCompu() || !hayDetalle()) return false\n', a: '' },
    { nombre: 'cambiar el ancho no repinta el botón', de: "  mq?.addEventListener?.('change', () => pintarBoton())\n", a: '' },
    { nombre: 'esconder el botón no cierra la ventana', de: '    if (fondo && !ver) cerrar({ devolverFoco: false })\n', a: '' },
    { nombre: 'sin aria-haspopup', de: "  boton.setAttribute('aria-haspopup', 'dialog')\n", a: '' },
    { nombre: 'sin botón no avisa', de: "  if (!boton) throw new Error('crearAmpliar: falta el botón Ampliar')\n", a: '' },
    // La ventana.
    { nombre: 'no es un diálogo', de: 'role="dialog" aria-modal="true"', a: 'role="region" aria-modal="true"' },
    { nombre: 'no es modal', de: 'role="dialog" aria-modal="true"', a: 'role="dialog" aria-modal="false"' },
    { nombre: 'el título no está enlazado', de: 'aria-labelledby="${id}"', a: 'aria-labelledby="otro"' },
    { nombre: 'el título como HTML', de: "parte('amp__titulo').textContent = String(titulo() ?? '')", a: "parte('amp__titulo').innerHTML = String(titulo() ?? '')" },
    { nombre: 'el rótulo del resumen sin escapar', de: '<h3 class="amp__sub">${escAmp(tituloResumen)}</h3>', a: '<h3 class="amp__sub">${tituloResumen}</h3>' },
    { nombre: 'el aria-label de la grilla sin escapar', de: '<section class="amp__lado" aria-label="${escAmp(tituloGrilla)}">', a: '<section class="amp__lado" aria-label="${tituloGrilla}">' },
    { nombre: 'escAmp no escapa <', de: ".replace(/&/g, '&amp;').replace(/</g, '&lt;')", a: ".replace(/&/g, '&amp;')" },
    { nombre: 'el foco no va a la X al abrir', de: "    parte('amp__cerrar')?.focus()\n    return true", a: '    return true' },
    { nombre: 'la página sigue scrolleando atrás', de: "      doc.documentElement?.classList?.add('amp-abierta')\n", a: '' },
    { nombre: 'cerrar deja la página trabada', de: "    doc.documentElement?.classList?.remove('amp-abierta')\n", a: '' },
    // Las copias.
    { nombre: 'la copia conserva id, name y for', de: "if (QUITAR.includes(nombre) || nombre.startsWith('data-')) c.removeAttribute(nombre)", a: "if (nombre.startsWith('data-')) c.removeAttribute(nombre)" },
    { nombre: 'la copia conserva los data-*', de: "if (QUITAR.includes(nombre) || nombre.startsWith('data-')) c.removeAttribute(nombre)", a: 'if (QUITAR.includes(nombre)) c.removeAttribute(nombre)' },
    { nombre: 'los campos copiados se pueden tocar', de: "if (c.tagName === 'INPUT' || c.tagName === 'SELECT' || c.tagName === 'TEXTAREA') c.disabled = true", a: 'void 0' },
    { nombre: 'la grilla copia lo escondido', de: 'const celdas = lista(grilla).filter(seVeAmpliar)', a: 'const celdas = lista(grilla)' },
    { nombre: 'las acciones copian lo escondido', de: 'const botones = lista(acciones).filter(seVeAmpliar)', a: 'const botones = lista(acciones)' },
    { nombre: 'sin acciones el pie se dibuja igual', de: 'acc.hidden = !botones.length', a: 'acc.hidden = false' },
    { nombre: 'la grilla vacía no lo dice', de: '      g.appendChild(v)\n', a: '' },
    { nombre: 'marcoCelda no se respeta', de: "c.className = marcoCelda ? 'amp__celda' : 'amp__celda amp__celda--sin-marco'", a: "c.className = 'amp__celda'" },
    // La grilla.
    { nombre: '4 por fila con ancho grande', de: 'const base = Number(ancho) >= ANCHO_TRES_COLUMNAS ? 3 : 2', a: 'const base = Number(ancho) >= ANCHO_TRES_COLUMNAS ? 4 : 2' },
    { nombre: 'siempre 3 por fila', de: 'const base = Number(ancho) >= ANCHO_TRES_COLUMNAS ? 3 : 2', a: 'const base = 3' },
    { nombre: 'más columnas que cosas', de: 'return Math.max(1, Math.min(base, n))', a: 'return Math.max(1, base)' },
    { nombre: 'las columnas no se aplican', de: '    g.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`\n', a: '' },
    // Tocar adentro.
    { nombre: 'una acción no cierra la ventana', de: '    cerrar()\n    original.click()\n  }', a: '    original.click()\n  }' },
    { nombre: 'una acción cierra DESPUÉS de tocar el original', de: '    cerrar()\n    original.click()\n  }', a: '    original.click()\n    cerrar()\n  }' },
    { nombre: 'una acción no toca el original', de: '    cerrar()\n    original.click()\n  }', a: '    cerrar()\n  }' },
    { nombre: 'un desplegable cierra la ventana', de: "const queda = original.hasAttribute('aria-expanded') || original.tagName === 'SUMMARY' || !!(quedarse && original.matches?.(quedarse))", a: 'const queda = false' },
    { nombre: 'un desplegable no actualiza la ventana', de: 'if (queda) { original.click(); refrescar(); return }', a: 'if (queda) { original.click(); return }' },
    { nombre: 'tocables se mira en la copia', de: 'esTocable(el, tocables, mapa.get(el))', a: 'esTocable(el, tocables, el)' },
    { nombre: 'tocables no cuenta', de: 'return !!(extra && original?.matches?.(extra))', a: 'return false' },
    { nombre: 'toca un original que ya no está', de: '    if (!original.isConnected) { refrescar(); return }\n', a: '' },
    // Cerrar.
    { nombre: 'tocar el fondo no cierra', de: '    if (e.target === fondo) { cerrar(); return }\n', a: '' },
    { nombre: 'la X no cierra', de: "    if (el.classList?.contains('amp__cerrar')) { cerrar(); return }\n", a: '' },
    { nombre: 'Escape no cierra', de: "    if (e.key === 'Escape') {", a: "    if (e.key === 'Esc') {" },
    { nombre: 'Escape sigue de largo a la página', de: '      e.preventDefault?.()\n      e.stopPropagation?.()\n      cerrar()', a: '      e.preventDefault?.()\n      cerrar()' },
    { nombre: 'el foco no vuelve a Ampliar', de: '    if (devolverFoco && !boton.hidden) boton.focus()\n', a: '' },
    // El foco atrapado.
    { nombre: 'Tab en el último se escapa', de: '    else if (!e.shiftKey && (activo === ultimo || !dentro)) { e.preventDefault?.(); primero.focus() }\n', a: '' },
    { nombre: 'Shift+Tab en el primero se escapa', de: 'if (e.shiftKey && (activo === primero || !dentro)) { e.preventDefault?.(); ultimo.focus() }', a: 'if (false) { void ultimo }' },
    { nombre: 'un campo deshabilitado recibe el foco', de: 'if (!el || el.nodeType !== 1 || el.hidden || el.disabled) return false', a: 'if (!el || el.nodeType !== 1 || el.hidden) return false' },
    // Seguir al panel.
    { nombre: 'no se observa el panel', de: '      obs.observe(raiz, { childList: true, subtree: true, attributes: true, characterData: true })', a: '      void raiz' },
    { nombre: 'refrescar no cierra si el detalle no está', de: '    if (!enCompu() || !hayDetalle()) { cerrar({ devolverFoco: false }); return }', a: '    if (false) { return }' },
    { nombre: 'refrescar no vuelve a copiar', de: '    dibujar()\n    if (r) r.scrollTop = scroll[0]', a: '    if (r) r.scrollTop = scroll[0]' },
    { nombre: 'refrescar pierde el foco', de: "      ;(nuevo ?? parte('amp__cerrar'))?.focus()", a: '      void nuevo' },
  ],
})
