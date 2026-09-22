// Mutaciones de test-cheques-vista.js. Ver mutar.js: corren DE A UNA, con los
// tres guards (suite verde sobre el limpio, ancla única, mutación que cambia).
//
//   node pruebas/mut-cheques-vista.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-cheques-vista.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/cheques.html'),
  escape: 'esc',
  // Automáticas: cada ${esc(...)} de estas funciones pierde su esc().
  funciones: ['htmlCartera', 'pintarSelectorBancos', 'pintarFiltrosCheques', 'htmlFilaCheque', 'htmlSalidaCheque'],
  manuales: [
    { nombre: 'el like usa el texto crudo y no los dígitos',
      de: "q = q.like('numero', `%${fn.digitos}%`)", a: "q = q.like('numero', `%${f.numero}%`)" },
    { nombre: 'sin dígitos consulta igual',
      de: "if (fn.modo === 'sin_digitos') return { q, sinResultados: true }", a: "if (false) return { q, sinResultados: true }" },
    { nombre: '"salidos" trae también los anulados',
      de: "q.in('estado', ['depositado', 'endosado'])", a: "q.in('estado', ['depositado', 'endosado', 'anulado'])" },
    { nombre: 'la cartera suma sin pasar a centavos',
      de: 'centavos += Math.round(Number(ch.importe) * 100)', a: 'centavos += Number(ch.importe) * 100' },
    { nombre: 'la cartera cuenta también los salidos',
      de: "if (ch.estado !== 'en_cartera') continue\n        cantidad++", a: "cantidad++" },
    { nombre: 'la cartera con error queda en cero',
      de: '        estado.cartera = null\n', a: '        estado.cartera = { cantidad: 0, total: 0 }\n' },
    { nombre: 'el orden pierde el desempate por número',
      de: "return String(a.numero ?? '').localeCompare(String(b.numero ?? ''))\n      })\n    }\n\n    // Cuánto", a: "return 0\n      })\n    }\n\n    // Cuánto" },
    { nombre: 'Dar salida se ofrece con la cobranza por controlar',
      de: "      if (cob?.estado === 'procesada') {", a: "      if (cob) {" },
    { nombre: 'Dar salida se ofrece sin la tarea procesar',
      de: "if (ch.estado !== 'en_cartera' || !puedeProcesar()) return '—'", a: "if (ch.estado !== 'en_cartera') return '—'" },
    { nombre: 'Volver a cartera se ofrece sin la tarea procesar',
      de: "        const volver = puedeProcesar()", a: "        const volver = true" },
    { nombre: 'la cobranza por controlar no dice por qué no hay botón',
      de: "      if (cob?.estado === 'registrada') {", a: "      if (false) {" },
    { nombre: 'el botón vuelve a decir "Salió"',
      de: 'data-dar-salida="${esc(ch.id)}">Dar salida</button>', a: 'data-dar-salida="${esc(ch.id)}">Salió</button>' },
    { nombre: 'el botón vuelve a ir debajo del número',
      de: "          <td>${esc(ch.numero ?? '—')}</td>", a: "          <td>${esc(ch.numero ?? '—')}${htmlSalidaCheque(ch, cob)}</td>" },
    { nombre: 'la salida no muestra el destino',
      de: "[formatearFechaCob(ch.salida_fecha), String(ch.salida_destino ?? '').trim()]", a: "[formatearFechaCob(ch.salida_fecha)]" },
    { nombre: 'las filas dejan de tener el mismo alto',
      de: '    .chq-tabla tbody td { height: 3.5rem; vertical-align: middle; }\n', a: '' },
    { nombre: 'solo con cargar se ve la cartera',
      de: "const puedeVerCartera = () => tieneTarea('ver_todo') || tieneTarea('procesar')", a: "const puedeVerCartera = () => tieneTarea('ver_todo') || tieneTarea('procesar') || tieneTarea('cargar')" },
    { nombre: 'endosado sin destino pasa',
      de: "if (tipo === 'endosado' && !d) e.push('Escribí a quién se lo pasaste.')", a: '' },
    { nombre: 'una fecha futura pasa',
      de: "if (diasEntre(hoy, fecha) > 0) e.push('La fecha no puede ser posterior a hoy.')", a: '' },
    { nombre: 'el destino vacío viaja como ""',
      de: 'p_destino: textoOpcional(destino) }', a: 'p_destino: destino }' },
    { nombre: 'el error de la base se tapa con un genérico',
      de: "err.textContent = e?.message || 'No se pudo marcar la salida del cheque.'", a: "err.textContent = 'No se pudo marcar la salida del cheque.'" },
    { nombre: 'el diálogo describe el cheque con innerHTML',
      de: "document.getElementById('chq-salida-cheques').textContent =", a: "document.getElementById('chq-salida-cheques').innerHTML =" },
    { nombre: 'el volver= no se codifica',
      de: '&volver=${encodeURIComponent(volverA)}', a: '&volver=${volverA}' },
    { nombre: 'las preferencias aceptan cualquier banco',
      de: "estado.filtros.banco = typeof f.banco === 'string' && /^[0-9]{3}$/.test(f.banco) ? f.banco : ''", a: "estado.filtros.banco = f.banco ?? ''" },
    { nombre: 'limpiar no vacía el campo del número',
      de: "      document.getElementById('chq-filtro-numero').value = ''\n      document.getElementById('chq-filtro-banco').value = ''", a: "      document.getElementById('chq-filtro-banco').value = ''" },
    { nombre: 'la lista de bancos sale de los cheques filtrados',
      de: ".from('cobranza_cheques').select('banco_codigo, estado, importe')", a: ".from('cobranza_cheques').select('banco_codigo, estado, importe').eq('estado', estado.filtros.estado)" },
    { nombre: 'volver a cartera tapa el error de la base',
      de: "mostrarError(e?.message || 'No se pudo volver el cheque a cartera.')", a: "mostrarError('No se pudo volver el cheque a cartera.')" },
    { nombre: 'sin ver_todo no se avisa que la cartera es parcial',
      de: "      if (!tieneTarea('ver_todo')) lineas.push(AVISO_CARTERA_PARCIAL)\n", a: '' },
  ],
})
