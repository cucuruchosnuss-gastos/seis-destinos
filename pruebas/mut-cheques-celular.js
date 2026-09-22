// Mutaciones de test-cheques-celular.js (Parte 5). Ver mutar.js.
//
//   node pruebas/mut-cheques-celular.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-cheques-celular.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cheques.html'),
  escape: 'esc',
  funciones: ['htmlTarjetaCheque'],
  equivalentes: [
    { expr: 'esc(clases)', motivo: 'las clases son literales del código' },
    { expr: 'esc(formatearImporte(ch.importe))', motivo: 'formatearImporte solo devuelve dígitos, puntos, comas, "$", "-" o "—"' },
    { expr: 'esc(pago)', motivo: '"a la vista" o "paga dd/mm/aa" (fechaCorta solo arma dígitos y barras)' },
  ],
  manuales: [
    { nombre: 'un común dice la fecha de pago (null)',
      de: "const pago = ch.tipo === 'diferido' ? `paga ${fechaCorta(ch.fecha_pago)}` : 'a la vista'", a: "const pago = `paga ${fechaCorta(ch.fecha_pago)}`" },
    { nombre: 'la fecha vuelve a ser larga',
      de: "      return `${d}/${m}/${a.slice(2)}`", a: "      return `${d}/${m}/${a}`" },
    { nombre: 'el banco sin title',
      de: '<span class="chq-tarjeta__dato chq-tarjeta__banco" title="${esc(banco)}">', a: '<span class="chq-tarjeta__dato chq-tarjeta__banco">' },
    { nombre: 'el salido muestra también el cliente',
      de: "${salido ? '' : `<span class=\"chq-tarjeta__dato chq-tarjeta__cliente\"", a: "${false ? '' : `<span class=\"chq-tarjeta__dato chq-tarjeta__cliente\"" },
    { nombre: 'la tarjeta decide la acción por su cuenta (siempre "Dar salida")',
      de: "      const accion = htmlAccionSalida(ch, accionSalida(ch, cob))", a: "      const accion = htmlAccionSalida(ch, 'dar')" },
    { nombre: 'la lista no se llena',
      de: '      lista.innerHTML = htmlListaCheques(estado.filas, estado.cobranzas)\n', a: '' },
    { nombre: 'sin cheques la lista queda a la vista',
      de: "        lista.hidden = true\n        lista.innerHTML = ''", a: "        lista.innerHTML = ''" },
    { nombre: 'se ven la tabla y la lista en el celular',
      de: '      .chq-tabla-scroll { display: none; }\n      .chq-header', a: '      .chq-header' },
    { nombre: 'se ven las dos en escritorio',
      de: '    @media (min-width: 900px) {\n      .chq-lista { display: none; }\n    }', a: '' },
    { nombre: 'el botón del costado pierde los 44px',
      de: '    .chq-tarjeta__lado .chq-btn { min-height: 44px;', a: '    .chq-tarjeta__lado .chq-btn {' },
    { nombre: 'el costado deja de tener ancho fijo',
      de: 'flex: 0 0 5.75rem;', a: 'flex: 0 0 auto;' },
    { nombre: 'el renglón de abajo se desborda',
      de: '      align-items: center;\n      min-width: 0;\n      overflow: hidden;', a: '      align-items: center;\n      min-width: 0;' },
    { nombre: 'la tarjeta se aplasta',
      de: '      min-height: 56px;\n      padding: 0.4375rem 0.75rem;', a: '      padding: 0.4375rem 0.75rem;' },
  ],
})
