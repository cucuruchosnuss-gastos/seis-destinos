// Mutaciones de test-cheques-seleccion.js (Parte 7). Ver mutar.js.
//
//   node pruebas/mut-cheques-seleccion.js

const path = require('path')
const { correrMutaciones } = require('./mutar')
// La cartera vive en una región de administracion.html: se muta SOLO ahí.
const { ARCHIVO_CHEQUES, limitesCheques } = require('./fuente-cheques')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  region: limitesCheques,
  suite: path.join(__dirname, 'test-cheques-seleccion.js'),
  original: process.env.ARCHIVO_BASE || ARCHIVO_CHEQUES,
  escape: 'esc',
  funciones: ['htmlCasillaElegir'],
  manuales: [
    { nombre: 'el ponderado pasa a ser el simple',
      de: '        ponderado: centavos > 0 ? Math.round(sumaPonderada / centavos) : null,', a: '        ponderado: n ? Math.round(sumaDias / n) : null,' },
    { nombre: 'uno vencido suma días negativos',
      de: '      return d === null ? 0 : Math.max(0, d)', a: '      return d === null ? 0 : d' },
    { nombre: 'un común cuenta días hasta su fecha de pago',
      de: "      if (ch.tipo !== 'diferido') return 0\n", a: '' },
    { nombre: 'el simple sin redondear',
      de: '        simple: n ? Math.round(sumaDias / n) : null,', a: '        simple: n ? sumaDias / n : null,' },
    { nombre: 'el total sin centavos',
      de: '        const c = Math.round(Number(ch.importe) * 100)', a: '        const c = Number(ch.importe) * 100' },
    { nombre: 'no cuenta los que vencen pronto',
      de: '        if (estadoVencimiento(ch, hoy)) vencenPronto++\n', a: '' },
    { nombre: 'Shift no marca el tramo',
      de: '      if (conShift && s.ultimo && orden.includes(s.ultimo) && orden.includes(id)) {', a: '      if (false) {' },
    { nombre: 'tocar un elegido no lo desmarca',
      de: '      } else if (s.ids.has(id)) {\n        s.ids.delete(id)', a: '      } else if (false) {\n        s.ids.delete(id)' },
    { nombre: 'con la selección activa tocar la fila abre la cobranza',
      de: '          if (estado.seleccion.activa) tocarParaElegir(tr.dataset.chequeFila, conShift)', a: '          if (false) tocarParaElegir(tr.dataset.chequeFila, conShift)' },
    { nombre: 'la casilla cambia dos veces',
      de: "          if (ev.target?.matches?.('[data-elegir-cheque]')) ev.preventDefault()\n", a: '' },
    { nombre: 'marcar no pinta la fila',
      de: "        el.classList.toggle(el.tagName === 'TR' ? 'chq-tabla__fila--elegida' : 'chq-tarjeta--elegida', elegido)", a: '' },
    { nombre: 'la barra no aparece',
      de: '      barra.hidden = !s.activa', a: '      barra.hidden = true' },
    { nombre: 'la barra no resume',
      de: "        r.cantidad ? textoResumenSeleccion(r) : 'Tocá los cheques para elegirlos.'", a: "        'Tocá los cheques para elegirlos.'" },
    { nombre: 'un filtro no limpia la selección',
      de: '      if (!s.activa || !s.ids.size) return\n      s.ids = new Set()', a: '      if (true) return\n      s.ids = new Set()' },
    { nombre: 'limpiar la selección sin avisar',
      de: '      aviso.hidden = false\n      clearTimeout(temporizadorAvisoSeleccion)', a: '      clearTimeout(temporizadorAvisoSeleccion)' },
    { nombre: 'el banco no limpia la selección',
      de: '        estado.filtros.banco = ev.target.value\n        guardarPreferencias()\n        soltarSeleccionPorFiltro()', a: '        estado.filtros.banco = ev.target.value\n        guardarPreferencias()' },
    { nombre: 'Escape no limpia la selección',
      de: '        else if (estado.seleccion.activa) cancelarSeleccion()', a: '' },
    { nombre: 'la selección no le gana al fondo del vencimiento',
      de: '    .chq-tabla__fila--destacada td,\n    .chq-tabla__fila--elegida td { background: var(--naranja-suave); }', a: '    .chq-tabla__fila--destacada td { background: var(--naranja-suave); }' },
    { nombre: 'la barra no respeta el safe-area',
      de: 'padding: 0.625rem 1rem calc(0.625rem + env(safe-area-inset-bottom, 0px));', a: 'padding: 0.625rem 1rem;' },
    { nombre: 'sin casillas en la tabla',
      de: "          ${estado.seleccion.activa ? `<td class=\"chq-tabla__elegir\">${htmlCasillaElegir(ch)}</td>` : ''}\n", a: '' },
  ],
})
