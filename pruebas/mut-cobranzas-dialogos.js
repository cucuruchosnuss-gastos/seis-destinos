// Mutaciones de test-cobranzas-dialogos.js. Ver mutar.js.
//
//   node pruebas/mut-cobranzas-dialogos.js
//
// Sin automáticas: el diálogo de fotos solo interpola el índice (un número),
// y los escCob() del archivo los cubre mut-cobranzas-xss.js. Las de acá rompen,
// de a una, cada garantía de los diálogos que reemplazan a prompt / confirm.

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-cobranzas-dialogos.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cobranzas.html'),
  funciones: [],
  escape: 'escCob',
  manuales: [
    // ── Sí / no invertidos ───────────────────────────────────────────────────
    { nombre: '"Descartar" resuelve false (sí y no invertidos, lado sí)',
      de: "addEventListener('click', () => cerrarDialogo(true))", a: "addEventListener('click', () => cerrarDialogo(false))" },
    { nombre: '"Cancelar" del confirmar resuelve true (sí y no invertidos, lado no)',
      de: "getElementById('cob-dlg-confirmar-no').addEventListener('click', () => cerrarDialogo(false))",
      a: "getElementById('cob-dlg-confirmar-no').addEventListener('click', () => cerrarDialogo(true))" },
    { nombre: 'descartar borra con la respuesta al revés',
      de: '      if (!si) return\n      await dbBorrar(STORE_BORRADORES, id)', a: '      if (si) return\n      await dbBorrar(STORE_BORRADORES, id)' },
    // ── Escape ──────────────────────────────────────────────────────────────
    { nombre: 'Escape confirma en vez de cancelar',
      de: '        ev.preventDefault()\n        cerrarDialogo(d.valorCancelar)', a: '        ev.preventDefault()\n        cerrarDialogo(true)' },
    { nombre: 'Escape no hace nada',
      de: "      if (ev.key === 'Escape') {", a: "      if (ev.key === 'Esc_no') {" },
    { nombre: 'Cancelar de la foto elige la primera (0 en vez de null)',
      // Anclado al id: desde el 22/09/2026 el diálogo de la unidad tiene su
      // propio "Cancelar" con el mismo listener.
      de: "getElementById('cob-dlg-foto-cancelar').addEventListener('click', () => cerrarDialogo(null))",
      a: "getElementById('cob-dlg-foto-cancelar').addEventListener('click', () => cerrarDialogo(0))" },
    { nombre: 'el diálogo de la foto cancela con 0 (Escape elige la foto 1)',
      de: "const respuesta = abrirDialogo('cob-dialogo-foto', null)", a: "const respuesta = abrirDialogo('cob-dialogo-foto', 0)" },
    // ── Foco ────────────────────────────────────────────────────────────────
    { nombre: 'no devuelve el foco al cerrar',
      de: "      if (d.volverA && typeof d.volverA.focus === 'function') d.volverA.focus()\n", a: '' },
    { nombre: 'al abrir el foco no va al diálogo',
      de: '        enfocablesDe(el)[0]?.focus()\n', a: '' },
    { nombre: 'Tab desde el último no vuelve al primero',
      de: "else if (!ev.shiftKey && (activo === ultimo || afuera)) { ev.preventDefault(); primero.focus() }", a: 'else {}' },
    { nombre: 'Shift+Tab desde el primero no va al último',
      de: 'if (ev.shiftKey && (activo === primero || afuera)) { ev.preventDefault(); ultimo.focus() }', a: 'if (false) {}' },
    { nombre: 'al cerrar se sigue escuchando el teclado',
      de: "      document.removeEventListener('keydown', teclaEnDialogo)\n", a: '' },
    // ── Elegir foto ─────────────────────────────────────────────────────────
    { nombre: 'con una sola foto abre el diálogo',
      de: '      if (f.fotos.length === 1) {\n        f.cheques.push', a: '      if (false) {\n        f.cheques.push' },
    { nombre: 'el botón de la foto elige la siguiente (índice corrido)',
      de: "cerrarDialogo(Number(b.dataset.elegirFoto))", a: "cerrarDialogo(Number(b.dataset.elegirFoto) + 1)" },
    { nombre: 'el botón dice "Foto 0" (sin el +1)',
      de: '<span>Foto ${i + 1}</span>', a: '<span>Foto ${i}</span>' },
    { nombre: 'sin guard de formulario cambiado',
      de: '        if (estado.form !== f) return\n', a: '' },
    { nombre: 'cancelar no avisa',
      de: "        mostrarError('No se agregó el cheque: hay que decir a qué foto corresponde.')\n", a: '' },
    { nombre: 'sin la guarda de foto (red detrás del botón deshabilitado)',
      de: '      if (!f.fotos.length) {\n        mostrarError(', a: '      if (false) {\n        mostrarError(' },
    // ── Estático: vuelve un nativo ──────────────────────────────────────────
    { nombre: 'vuelve window.confirm al descartar',
      de: '      if (!si) return\n      await dbBorrar', a: "      if (!si || !window.confirm('¿Seguro?')) return\n      await dbBorrar" },
    { nombre: 'vuelve un alert() suelto',
      de: "      if (!f) return\n      // La foto es OBLIGATORIA", a: "      if (!f) { alert('sin formulario'); return }\n      // La foto es OBLIGATORIA" },
  ],
})
