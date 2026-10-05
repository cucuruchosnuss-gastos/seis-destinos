// Mutaciones de los gráficos (ver test-graficos.js).
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-graficos.js'),
  original: path.join(__dirname, '..', 'js', 'graficos.js'),
  funciones: [],
  manuales: [
    { nombre: 'numeroGraf: null es 0', de: "  if (v === null || v === undefined || v === '') return null\n  const n = Number(v)", a: '  const n = Number(v)' },
    { nombre: 'formatoEntero sin miles', de: ".replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.')", a: '' },
    { nombre: 'formatoEntero de null es 0', de: "  if (n === null) return '—'\n  const s", a: '  const s' },
    { nombre: 'topeRedondo no redondea', de: '  for (const f of [1, 2, 2.5, 5, 10]) if (f * p >= m) return f * p', a: '  return m' },
    { nombre: 'barras: el null se dibuja como 0', de: "      if (v === null) {\n        cuerpo += dato(det, `<text class=\"graf-num graf-num--falta\"", a: "      if (false) {\n        cuerpo += dato(det, `<text class=\"graf-num graf-num--falta\"" },
    { nombre: 'barras: escala que no llena el alto', de: '  const escala = max > 0 ? altoUtil / max : 0\n  const base = alto - m.abajo\n  const anchoGrupo', a: '  const escala = max > 0 ? altoUtil / max / 2 : 0\n  const base = alto - m.abajo\n  const anchoGrupo' },
    { nombre: 'barras: sin el número escrito', de: '`<text class="graf-num" x="${r1(cx)}" y="${r1(base - h - 5)}" text-anchor="middle">${escGraf(formato(v))}</text>`)\n    })', a: "'')\n    })" },
    { nombre: 'barras: sin escapar la etiqueta', de: 'text-anchor="middle">${escGraf(cortarGraf(g.etiqueta, maxCar))}</text>`', a: 'text-anchor="middle">${cortarGraf(g.etiqueta, maxCar)}</text>`' },
    { nombre: 'dato: sin escapar el detalle', de: 'data-detalle="${escGraf(detalle)}"', a: 'data-detalle="${detalle}"' },
    { nombre: 'dato: no se puede enfocar', de: '<g class="graf-dato" tabindex="0"', a: '<g class="graf-dato"' },
    { nombre: 'líneas: une los días sin dato', de: '      if (v === null) { if (tramo.length) tramos.push(tramo); tramo = []; return }', a: '      if (v === null) return' },
    { nombre: 'líneas: sin datos dibuja igual', de: "  if (!vals.length) return ''\n  const tope", a: '  const tope' },
    { nombre: 'líneas: sin el último valor escrito', de: '    if (ultimo) {\n', a: '    if (false) {\n' },
    { nombre: 'apiladas: no suma 100 %', de: '      const w = (v / total) * ancho', a: '      const w = (v / total) * ancho * 0.9' },
    { nombre: 'apiladas: número en los angostos', de: '(w >= 34 ?', a: '(w >= 0 ?' },
    { nombre: 'apiladas: fila sin horas no avisa', de: "cuerpo += `<text class=\"graf-num graf-num--falta\" x=\"0\" y=\"${y0 + 38}\">Sin horas en el período</text>`", a: "cuerpo += ''" },
    { nombre: 'apiladas: un negativo resta', de: 'partes.map(p => Math.max(0, numeroGraf(f.partes?.[p.clave]?.valor) ?? 0))', a: 'partes.map(p => numeroGraf(f.partes?.[p.clave]?.valor) ?? 0)' },
    { nombre: 'dona: los arcos no avanzan', de: '    acum += l\n', a: '' },
    { nombre: 'dona: vacía se dibuja', de: "  if (total <= 0) return ''\n  const c = tamano / 2", a: '  const c = tamano / 2' },
    { nombre: 'dona: sin el total en el centro', de: '<text class="graf-centro" x="${c}" y="${c + 2}" text-anchor="middle">${escGraf(centro)}</text>', a: '' },
    { nombre: 'referencia: sin la línea', de: 'cuerpo += `<line class="graf-ref"', a: 'cuerpo += `<line class="graf-ref-no"' },
    { nombre: 'referencia: la línea a otra altura', de: '    const yy = r1(base - ref * escala)', a: '    const yy = r1(base - ref * escala / 2)' },
    { nombre: 'referencia: acepta cualquier tono', de: "const tono = ['bajo', 'mejor'].includes(b.tono) ? b.tono : 'medio'", a: "const tono = b.tono || 'medio'" },
    { nombre: 'leyenda sin escapar', de: '</span>${escGraf(i.nombre)}</li>`', a: '</span>${i.nombre}</li>`' },
    { nombre: 'activarDetalles: no escribe la cifra', de: "    salida.textContent = d.getAttribute('data-detalle') || ''", a: '' },
    { nombre: 'activarDetalles: escucha dos veces', de: '  if (!raiz || !salida || raiz._graficosActivos) return', a: '  if (!raiz || !salida) return' },
    { nombre: 'activarDetalles: el foco no muestra', de: "  raiz.addEventListener('focusin', mostrar)\n", a: '' },
    { nombre: 'escGraf no escapa comillas', de: ".replace(/\"/g, '&quot;')", a: '' },
  ],
})
