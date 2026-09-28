// Mutaciones de test-cheques-unidad.js (tarea A2, 22/09/2026). Ver mutar.js:
// guard de suite verde sobre el limpio, ancla única y mutación que cambia el
// archivo; corren de a una.
//
//   node pruebas/mut-cheques-unidad.js

const path = require('path')
const { correrMutaciones } = require('./mutar')
// La cartera vive en una región de administracion.html: se muta SOLO ahí.
const { ARCHIVO_CHEQUES, limitesCheques } = require('./fuente-cheques')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  region: limitesCheques,
  suite: path.join(__dirname, 'test-cheques-unidad.js'),
  original: process.env.ARCHIVO_BASE || ARCHIVO_CHEQUES,
  escape: 'esc',
  // Cada ${esc(...)} de estas funciones pierde su esc(), de a uno.
  funciones: ['htmlCeldaUnidad'],
  equivalentes: [
    { expr: 'esc(TEXTO_SIN_UNIDAD)', motivo: "constante del código ('Sin unidad'), sin ningún carácter que escapar" },
  ],
  manuales: [
    // ── Tarjeta del celular ──
    { nombre: 'la tarjeta: la unidad sin escapar en el title',
      de: 'tabindex="0" title="${esc(textoUnidad)}"${htmlAriaElegido(ch)}>', a: 'tabindex="0" title="${textoUnidad}"${htmlAriaElegido(ch)}>' },
    { nombre: 'la tarjeta: la unidad sin escapar en el texto oculto',
      de: '<span class="chq-oculto">${esc(textoUnidad)}</span>', a: '<span class="chq-oculto">${textoUnidad}</span>' },
    { nombre: 'la tarjeta: sin la unidad en el title',
      de: 'tabindex="0" title="${esc(textoUnidad)}"${htmlAriaElegido(ch)}>', a: 'tabindex="0"${htmlAriaElegido(ch)}>' },
    { nombre: 'la tarjeta: sin el texto oculto',
      de: '            <span class="chq-oculto">${esc(textoUnidad)}</span>\n', a: '' },
    // ── Columna ──
    { nombre: '"Sin unidad" sin su gris',
      de: '<span class="chq-sin-unidad">${esc(TEXTO_SIN_UNIDAD)}</span>', a: '${esc(TEXTO_SIN_UNIDAD)}' },
    { nombre: 'css: "Sin unidad" deja de ser gris',
      de: '.chq-sin-unidad { color: var(--color-texto-suave); }', a: '.chq-sin-unidad { }' },
    { nombre: 'una unidad sin nombre dice "null"',
      de: "nombre: nombre || 'Unidad sin nombre' }", a: 'nombre: String(cob.unidad_negocio_nombre) }' },
    { nombre: 'la columna no se puede ordenar',
      de: "            ${htmlEncabezadoOrden('unidad', 'Unidad')}", a: '            <th scope="col">Unidad</th>' },
    { nombre: 'Unidad no está en el selector del celular',
      de: "      { id: 'unidad', nombre: 'Unidad', tipo: 'texto' },\n", a: '' },
    { nombre: 'ordenar: "Sin unidad" como nombre (deja de ir al final)',
      de: "        case 'unidad': return unidadDeCheque(ch, cobranzas)?.nombre ?? null", a: "        case 'unidad': return unidadDeCheque(ch, cobranzas)?.nombre ?? TEXTO_SIN_UNIDAD" },
    { nombre: 'ordenar por unidad no mira nada',
      de: "        case 'unidad': return unidadDeCheque(ch, cobranzas)?.nombre ?? null\n", a: '' },
    // ── Consultas ──
    { nombre: 'v_cobranzas sin la unidad',
      de: "select('id, cliente, estado, fecha, cargada_por_nombre, unidad_negocio_id, unidad_negocio_nombre')", a: "select('id, cliente, estado, fecha, cargada_por_nombre')" },
    { nombre: 'el resumen sin cobranza_id',
      de: "select('id, cobranza_id, banco_codigo, estado, importe, tipo, fecha_emision, fecha_pago')", a: "select('id, banco_codigo, estado, importe, tipo, fecha_emision, fecha_pago')" },
    // ── Resumen de la selección ──
    { nombre: 'desglose: "Sin unidad" no va al final',
      de: '(a.id === null) - (b.id === null) || ', a: '' },
    { nombre: 'desglose: total sin centavos',
      de: '        g.centavos += Math.round(Number(ch.importe) * 100)', a: '        g.centavos += Number(ch.importe) * 100' },
    { nombre: 'una sola unidad igual muestra el desglose',
      de: '      if (desglose.length === 1) return desglose[0].nombre\n', a: '' },
    { nombre: 'desglose: plural siempre',
      de: "${g.cantidad === 1 ? '1 cheque' : `${g.cantidad} cheques`}", a: '${g.cantidad} cheques' },
    { nombre: 'el desglose va por innerHTML',
      de: '      unidades.textContent = r.cantidad ? textoUnidadesSeleccion', a: '      unidades.innerHTML = r.cantidad ? textoUnidadesSeleccion' },
    { nombre: 'el desglose nunca se esconde',
      de: '      unidades.hidden = !unidades.textContent', a: '      unidades.hidden = false' },
    { nombre: 'la barra no deja su alto',
      de: "if (Number.isFinite(alto) && document.body.style?.setProperty) document.body.style.setProperty('--chq-alto-barra', `${alto}px`)", a: '' },
    { nombre: 'css: el espacio de abajo no sigue el alto de la barra',
      de: 'calc(var(--chq-alto-barra, 0px) + 1rem)', a: '0px' },
  ],
})
