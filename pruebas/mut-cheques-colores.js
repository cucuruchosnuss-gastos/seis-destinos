// Mutaciones de test-cheques-colores.js (el color de cada estado, 22/09/2026).
// Ver mutar.js: guard de suite verde sobre el limpio, ancla única y mutación
// que cambia el archivo; corren de a una.
//
//   node pruebas/mut-cheques-colores.js

const path = require('path')
const { correrMutaciones } = require('./mutar')
// La cartera vive en una región de administracion.html: se muta SOLO ahí.
const { ARCHIVO_CHEQUES, limitesCheques } = require('./fuente-cheques')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  region: limitesCheques,
  suite: path.join(__dirname, 'test-cheques-colores.js'),
  original: process.env.ARCHIVO_BASE || ARCHIVO_CHEQUES,
  escape: 'esc',
  funciones: ['htmlLeyendaEstados'],
  equivalentes: [
    { expr: 'esc(e.clave)', motivo: 'constante del código (LEYENDA_ESTADOS), sin ningún carácter que escapar' },
    { expr: 'esc(e.nombre)', motivo: 'constante del código (LEYENDA_ESTADOS), sin ningún carácter que escapar' },
  ],
  manuales: [
    // ── El fondo de cada estado ──
    { nombre: 'un salido vuelve a fondo blanco',
      de: '    .chq-tabla__fila--salido td { background: var(--verde-suave); }', a: '    .chq-tabla__fila--salido td { }' },
    { nombre: 'un salido en el naranja del módulo en vez del verde',
      de: '    .chq-tabla__fila--salido td { background: var(--verde-suave); }', a: '    .chq-tabla__fila--salido td { background: var(--naranja-suave); }' },
    { nombre: 'la tarjeta de un salido, sin fondo',
      de: '    .chq-tarjeta--salido { background: var(--verde-suave); }', a: '    .chq-tarjeta--salido { }' },
    { nombre: 'un anulado sin fondo',
      de: '    .chq-tabla__fila--anulado td { background: var(--bordo-suave); }', a: '    .chq-tabla__fila--anulado td { }' },
    { nombre: 'la tarjeta de un anulado, sin fondo',
      de: '    .chq-tarjeta--anulado { background: var(--bordo-suave); }', a: '    .chq-tarjeta--anulado { }' },
    { nombre: 'el fondo del salido con un hex suelto en vez de la variable',
      de: '    .chq-tabla__fila--salido td { background: var(--verde-suave); }', a: '    .chq-tabla__fila--salido td { background: #E6F4EC; }' },

    // ── Que no vuelva la atenuación ──
    { nombre: 'vuelve el texto gris del salido (parecía deshabilitado)',
      de: '    .chq-tabla__fila--salido td { background: var(--verde-suave); }', a: '    .chq-tabla__fila--salido td { background: var(--verde-suave); color: var(--color-texto-suave); }' },
    { nombre: 'vuelve el texto gris en la tarjeta del salido',
      de: '    .chq-tarjeta--salido { background: var(--verde-suave); }', a: '    .chq-tarjeta--salido { background: var(--verde-suave); color: var(--color-texto-suave); }' },
    { nombre: 'un salido atenuado con opacity (y la celda sticky se vuelve transparente)',
      de: '    .chq-tabla__fila--salido td { background: var(--verde-suave); }', a: '    .chq-tabla__fila--salido td { background: var(--verde-suave); opacity: 0.5; }' },
    { nombre: 'un anulado atenuado con opacity',
      de: '    .chq-tarjeta--anulado { background: var(--bordo-suave); }', a: '    .chq-tarjeta--anulado { background: var(--bordo-suave); opacity: 0.6; }' },

    // ── El tachado del anulado ──
    { nombre: 'el anulado deja de tacharse (tabla)',
      de: '    .chq-tabla__fila--anulado .chq-tabla__num { text-decoration: line-through; }\n', a: '' },
    { nombre: 'el anulado deja de tacharse (celular)',
      de: '    .chq-tarjeta--anulado .chq-tarjeta__importe { text-decoration: line-through; }\n', a: '' },
    { nombre: 'vuelve el tachado de la FILA ENTERA (tacha también el chip)',
      de: '    .chq-tabla__fila--anulado td { background: var(--bordo-suave); }', a: '    .chq-tabla__fila--anulado td { background: var(--bordo-suave); text-decoration: line-through; }' },
    { nombre: 'el importe sale de la celda que se tacha',
      de: '          <td class="chq-tabla__num">${esc(formatearImporte(ch.importe))}</td>', a: '          <td>${esc(formatearImporte(ch.importe))}</td>' },

    // ── El chip nombra el estado ──
    { nombre: 'el chip de un salido pierde su verde',
      de: '    .chq-estado--endosado { background: var(--color-fondo); color: var(--verde-oscuro); }', a: '    .chq-estado--endosado { }' },
    { nombre: 'el chip de un salido se pinta del mismo verde que su fila (desaparece)',
      de: '    .chq-estado--endosado { background: var(--color-fondo); color: var(--verde-oscuro); }', a: '    .chq-estado--endosado { background: var(--verde-suave); color: var(--verde-oscuro); }' },
    { nombre: 'el depositado deja de compartir la regla del endosado',
      de: '    .chq-estado--depositado,\n    .chq-estado--endosado {', a: '    .chq-estado--endosado {' },
    { nombre: 'el chip del anulado vuelve a pintarse de su propio fondo',
      de: '    .chq-estado--anulado { background: var(--color-fondo); color: var(--bordo-oscuro); text-transform: uppercase; letter-spacing: 0.04em; }',
      a: '    .chq-estado--anulado { background: var(--bordo-suave); color: var(--bordo-oscuro); }' },
    { nombre: 'el chip del anulado deja de gritar (sin mayúsculas)',
      de: '    .chq-estado--anulado { background: var(--color-fondo); color: var(--bordo-oscuro); text-transform: uppercase; letter-spacing: 0.04em; }',
      a: '    .chq-estado--anulado { background: var(--color-fondo); color: var(--bordo-oscuro); }' },
    { nombre: 'la fila deja de dibujar el chip del estado',
      de: '          <td><span class="chq-estado chq-estado--${esc(ch.estado)}">${esc(etiqueta)}</span></td>', a: '          <td>${esc(etiqueta)}</td>' },

    // ── La franja de "cobranza por controlar" ──
    { nombre: 'la franja de "por controlar" desaparece de la tabla',
      de: "        esPorControlar(ch, cob) ? 'chq-tabla__fila--por-controlar' : '',\n", a: '' },
    { nombre: 'la franja de "por controlar" desaparece de la tarjeta',
      de: "        esPorControlar(ch, cob) ? 'chq-tarjeta--por-controlar' : '',\n", a: '' },
    { nombre: 'la franja de "por controlar" en bordó (se confunde con "no sale")',
      de: '    .chq-tabla__fila--por-controlar td:first-child { box-shadow: inset 4px 0 0 var(--naranja); }', a: '    .chq-tabla__fila--por-controlar td:first-child { box-shadow: inset 4px 0 0 var(--bordo); }' },
    { nombre: 'la tarjeta pierde su franja',
      de: '    .chq-tarjeta--por-controlar { box-shadow: inset 4px 0 0 var(--naranja); }\n', a: '' },
    { nombre: 'esPorControlar pasa a depender del permiso',
      de: "      return ch.estado === 'en_cartera' && cob?.estado === 'registrada'", a: "      return ch.estado === 'en_cartera' && cob?.estado === 'registrada' && puedeProcesar()" },
    { nombre: 'esPorControlar no mira el estado del cheque (marca uno que ya salió)',
      de: "      return ch.estado === 'en_cartera' && cob?.estado === 'registrada'", a: "      return cob?.estado === 'registrada'" },
    { nombre: 'esPorControlar sin cobranza a la vista marca igual',
      de: "      return ch.estado === 'en_cartera' && cob?.estado === 'registrada'", a: "      return ch.estado === 'en_cartera' && cob?.estado !== 'procesada'" },

    // ── La leyenda ──
    { nombre: 'la leyenda aparece aunque no haya ningún color que explicar',
      de: "      if (![...presentes].some(c => c !== 'en_cartera')) return []\n", a: '' },
    { nombre: 'la leyenda nombra estados que no están en la lista',
      de: '      return LEYENDA_ESTADOS.filter(e => presentes.has(e.clave))', a: '      return LEYENDA_ESTADOS' },
    { nombre: 'la leyenda sale en el orden de la lista y no en el suyo',
      de: '      return LEYENDA_ESTADOS.filter(e => presentes.has(e.clave))', a: '      return [...presentes].map(c => LEYENDA_ESTADOS.find(e => e.clave === c))' },
    { nombre: 'la leyenda nunca se esconde',
      de: '      el.hidden = entradas.length === 0', a: '      el.hidden = false' },
    { nombre: 'con la lista vacía queda la leyenda de lo anterior',
      de: '        pintarLeyendaEstados([])\n', a: '' },
    { nombre: 'la leyenda no se dibuja',
      de: '      pintarLeyendaEstados(visibles)\n', a: '' },
    { nombre: 'un anulado aporta además "En cartera" a la leyenda',
      de: "      if (ch.estado === 'anulado') return ['anulado']", a: "      if (ch.estado === 'anulado') return ['anulado', 'en_cartera']" },
    { nombre: 'uno marcado por el plazo aporta además "En cartera" (una muestra blanca que su fila no tiene)',
      de: "      claves.push(venc ? (venc.nivel === 'vencido' ? 'vencido' : 'vence') : 'en_cartera')", a: "      claves.push('en_cartera')\n      if (venc) claves.push(venc.nivel === 'vencido' ? 'vencido' : 'vence')" },
    { nombre: 'la franja de "por controlar" no entra en la leyenda',
      de: "      const claves = esPorControlar(ch, cob) ? ['por_controlar'] : []", a: '      const claves = []' },
    { nombre: 'depositado y endosado como dos entradas distintas del mismo verde',
      de: "      if (ch.estado === 'depositado' || ch.estado === 'endosado') return ['salido']", a: "      if (ch.estado === 'depositado' || ch.estado === 'endosado') return [ch.estado]" },
    { nombre: 'la muestra del anulado pierde su tachado (se confunde con el plazo)',
      de: '    .chq-leyenda__muestra--anulado::after {', a: '    .chq-leyenda__muestra--anulado__nada::after {' },
    { nombre: 'la muestra del salido pierde su verde',
      de: '    .chq-leyenda__muestra--salido { background: var(--verde-suave); }', a: '    .chq-leyenda__muestra--salido { }' },
    { nombre: 'la muestra de "por controlar" pierde su franja',
      de: '    .chq-leyenda__muestra--por_controlar { box-shadow: inset 4px 0 0 var(--naranja); }', a: '    .chq-leyenda__muestra--por_controlar { }' },
    { nombre: 'la muestrita deja de ser decorativa para el lector de pantalla',
      de: ' aria-hidden="true"></span>${esc(e.nombre)}', a: '></span>${esc(e.nombre)}' },

    // ── La caja del filtro "Salidos" ──
    { nombre: 'la caja no cambia con el filtro "Salidos"',
      de: "      const soloSalidos = estado.filtros.estado === 'salidos'", a: '      const soloSalidos = false' },
    { nombre: 'la caja se tiñe con cualquier filtro',
      de: "      const soloSalidos = estado.filtros.estado === 'salidos'", a: "      const soloSalidos = estado.filtros.estado !== 'en_cartera'" },
    { nombre: 'la lista del celular no toma el color de la caja',
      de: "      lista.classList.toggle('chq-lista--salidos', soloSalidos)\n", a: '' },
    { nombre: 'la caja de la tabla tampoco',
      de: "      caja.classList.toggle('chq-tabla-scroll--salidos', soloSalidos)\n", a: '' },
    { nombre: 'el verde de la caja, con un hex en vez de la variable',
      de: '      --chq-salidos-caja: color-mix(in srgb, var(--verde) 5%, var(--color-fondo));', a: '      --chq-salidos-caja: #f5f9f6;' },
    { nombre: 'el encabezado de la tabla no toma el color de la caja',
      de: '    .chq-tabla-scroll--salidos .chq-tabla th,\n', a: '' },
    { nombre: 'la caja del celular pierde su fondo',
      de: '    .chq-lista--salidos { background: var(--chq-salidos-caja); }', a: '    .chq-lista--salidos { }' },

    // ── La precedencia de los fondos ──
    { nombre: 'una copia del fondo de salido DESPUÉS de la selección (le gana a lo elegido)',
      de: '    .chq-tabla__fila--destacada td,\n    .chq-tabla__fila--elegida td { background: var(--naranja-suave); }',
      a: '    .chq-tabla__fila--destacada td,\n    .chq-tabla__fila--elegida td { background: var(--naranja-suave); }\n    .chq-tabla__fila--salido td { background: var(--verde-suave); }' },
    { nombre: 'una copia del fondo de anulado DESPUÉS de la selección',
      de: '    .chq-tarjeta--destacada,\n    .chq-tarjeta--elegida { background: var(--naranja-suave); }',
      a: '    .chq-tarjeta--destacada,\n    .chq-tarjeta--elegida { background: var(--naranja-suave); }\n    .chq-tarjeta--anulado { background: var(--bordo-suave); }' },
    { nombre: 'la franja naranja copiada DESPUÉS de la bordó de "no sale" (le gana)',
      de: '    .chq-tabla__fila--no-sale td:first-child { box-shadow: inset 4px 0 0 var(--bordo); }',
      a: '    .chq-tabla__fila--no-sale td:first-child { box-shadow: inset 4px 0 0 var(--bordo); }\n    .chq-tabla__fila--por-controlar td:first-child { box-shadow: inset 4px 0 0 var(--naranja); }' },
    { nombre: 'la franja naranja de la tarjeta, copiada DESPUÉS de la de "no sale"',
      de: '    .chq-tarjeta--no-sale { box-shadow: inset 4px 0 0 var(--bordo); }',
      a: '    .chq-tarjeta--no-sale { box-shadow: inset 4px 0 0 var(--bordo); }\n    .chq-tarjeta--por-controlar { box-shadow: inset 4px 0 0 var(--naranja); }' },
  ],
})
