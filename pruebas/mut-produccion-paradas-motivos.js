// Mutaciones de test-produccion-paradas-motivos.js (paradas con motivos fijos
// y "anotar una que ya pasó", y en la gestión la limpieza aparte de las
// fallas; 30/09/2026). Ver mutar.js y mutar-produccion.js: cada mutación va
// al archivo donde está su código.
//
//   node pruebas/mut-produccion-paradas-motivos.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-paradas-motivos.js'),
  escape: 'esc',
  funciones: ['htmlMotivosParada', 'renderParadasSemana'],
  soloPlanta: ['htmlMotivosParada'],
  soloGestion: ['renderParadasSemana'],
  equivalentes: [
    { expr: 'esc(momento)', motivo: "momento es 'arranque' o 'final', escrito en el código: ningún carácter escapable" },
    { expr: 'esc(texto)', motivo: "texto es 'Al arrancar' o 'Al terminar', escrito en el código" },
    { expr: 'esc(lim.nombre)', motivo: 'la limpieza se reconoce porque su nombre ES "Limpieza de planchas" (esLimpieza, sin acentos ni mayúsculas): no puede traer ningún carácter escapable' },
  ],
  manuales: [
    // Los motivos: de la base, en su orden, la limpieza primero y en su color.
    { nombre: 'los motivos no se ordenan', de: "const lista = [...(data ?? [])].sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0))", a: 'const lista = [...(data ?? [])]' },
    { nombre: 'se leen también los inactivos', de: ".select('id, nombre, categoria, pide_detalle, orden').eq('activo', true).order('orden')", a: ".select('id, nombre, categoria, pide_detalle, orden').order('orden')" },
    { nombre: 'la limpieza también va en la grilla', de: 'const resto = motivos.filter(m => m !== lim)', a: 'const resto = motivos' },
    { nombre: 'la limpieza en el naranja de lo elegido', de: '.pr-pa-limpieza { display: flex; align-items: center; gap: 10px; background: var(--p-teal-suave);', a: '.pr-pa-limpieza { display: flex; align-items: center; gap: 10px; background: var(--p-acento-suave);' },
    { nombre: 'sin los motivos no se puede escribir', de: "      if (motivos === null) return String(f?.textoLibre ?? '').trim()\n", a: "      if (motivos === null) return ''\n" },
    // "Otro motivo" exige el detalle.
    { nombre: '"Otro motivo" guarda sin detalle', de: "} else if (m.pide_detalle && String(f.detalle ?? '').trim().length < 2) faltan.push('Escribí qué pasó.')", a: '}' },
    { nombre: 'el detalle no viaja con el motivo', de: "      return d ? `${m.nombre}: ${d}` : m.nombre\n", a: '      return m.nombre\n' },
    // A qué hora paró y cuánto duró.
    { nombre: 'la hora arranca en la de ahora (no menos 30)', de: 'inicio: horaConPaso(horaDeReferencia(turno, ahora), -30)', a: 'inicio: horaConPaso(horaDeReferencia(turno, ahora), 0)' },
    { nombre: 'los minutos de a 1 siempre', de: '      const paso = fino ? 1 : 5\n', a: '      const paso = 1\n' },
    { nombre: 'tocar el minuto elegido no afina', de: "      if (tipo === 'm' && actual.slice(3) === v) {", a: '      if (false) {' },
    { nombre: 'la duración en segundos', de: 'const fin = new Date(h.inicio).getTime() + Number(f.duracion) * 60000', a: 'const fin = new Date(h.inicio).getTime() + Number(f.duracion) * 1000' },
    { nombre: '"Todavía no volvió" no la deja abierta', de: "      if (h.error || f.duracion === 'sigue') return h\n", a: '      if (h.error) return h\n' },
    { nombre: 'la vuelta futura no se avisa', de: '      if (fin > tope) {\n', a: '      if (false) {\n' },
    { nombre: '"Todavía no volvió" con una parada en curso', de: "out += puedeQuedarAbierta(p) ? sigue : sigue.replace('<button ', '<button disabled ')", a: 'out += sigue' },
    { nombre: 'al terminar también ofrece "Todavía no terminó"', de: "      if (!limpieza || f.limpieza === 'arranque') {\n", a: '      if (true) {\n' },
    // La limpieza de planchas.
    { nombre: 'la limpieza siempre "al arrancar"', de: "p_momento: f.limpieza === 'arranque' ? 'arranque' : 'final'", a: "p_momento: 'arranque'" },
    { nombre: 'la limpieza sin elegir el momento se manda', de: "      if (!f.limpieza) return { error: 'Elegí si la limpieza fue al arrancar o al terminar.' }\n", a: '' },
    { nombre: '"Paró ahora" también con la limpieza', de: "document.getElementById('pr-btn-parada').hidden = !puedeQuedarAbierta(p) || esLimpieza(m)", a: "document.getElementById('pr-btn-parada').hidden = !puedeQuedarAbierta(p)" },
    // Guardar, el error y el botón.
    { nombre: 'el botón se traba por lo que falta', de: '      g.disabled = !!f.enviando\n', a: '      g.disabled = !!f.enviando || faltanParaParadaNueva(f, p, ahora).length > 0\n' },
    { nombre: 'el error de la base se tapa', de: "        f.errorBase = e?.message || 'No se pudo guardar la parada. Revisá la conexión y probá de nuevo.'\n        return pintarResumenParada(ahora)", a: "        f.errorBase = 'No se pudo guardar la parada. Revisá la conexión y probá de nuevo.'\n        return pintarResumenParada(ahora)" },
    { nombre: '"Paró ahora" sin motivo se manda igual', de: "      if (f.errorBase) return pintarResumenParada()\n      const btn = document.getElementById('pr-btn-parada')", a: "      const btn = document.getElementById('pr-btn-parada')" },
    { nombre: 'el botón de volver no suelta cuánto duró', de: "      if (f.duracion) return 'duracion'\n", a: '' },
    // La lista del turno.
    { nombre: 'una categoría desconocida se dibuja', de: 'const cat = NOMBRE_CATEGORIA_PARADA[p.categoria] ? p.categoria : null', a: 'const cat = p.categoria ?? null' },
    { nombre: 'la limpieza sin su color en la lista', de: "${cat === 'programada' ? ' pr-parada-item--programada' : ''}", a: '' },
    // La gestión: la limpieza aparte de las fallas.
    { nombre: 'la limpieza suma como falla por máquina', de: '        if (cat === \'programada\') m.limpieza += min\n        else m.fallas += min\n', a: '        m.fallas += min\n' },
    { nombre: 'la limpieza entra en "fallas por motivo"', de: "        if (cat === 'programada') continue\n", a: '' },
    { nombre: 'sin categoría cuenta como limpieza', de: "const cat = ['programada', 'falla', 'otro'].includes(p.categoria) ? p.categoria : 'sin'", a: "const cat = ['programada', 'falla', 'otro'].includes(p.categoria) ? p.categoria : 'programada'" },
    { nombre: 'una abierta no cuenta', de: '      const fin = p?.fin ? new Date(p.fin).getTime() : new Date(ahora).getTime()\n', a: '      const fin = p?.fin ? new Date(p.fin).getTime() : new Date(p?.inicio).getTime()\n' },
    { nombre: 'las fallas por motivo de menos a más', de: '.sort((a, z) => z.minutos - a.minutos || z.veces - a.veces || orden(a, z))', a: '.sort((a, z) => a.minutos - z.minutos || orden(a, z))' },
    { nombre: 'sin paradas dibuja ceros', de: "      if (d.cantidad === 0) return htmlSinDatosInd('Sin paradas', 'En los últimos 7 días no se anotó ninguna parada.')\n", a: '' },
    { nombre: 'la limpieza de la gestión en bordó', de: '.pg-par__limp { color: var(--pg-teal-osc); background: var(--pg-teal-suave);', a: '.pg-par__limp { color: var(--bordo-oscuro); background: var(--pg-teal-suave);' },
    { nombre: 'la tarjeta no usa sus datos (falla con la RPC)', de: '      if (t.datos) {\n', a: '      if (false) {\n' },
    { nombre: 'la tarjeta no está en el arreglo', de: "      { id: 'paradas', titulo: 'Paradas de la semana', render: renderParadasSemana, contexto: () => '7 días · la limpieza aparte de las fallas', datos: () => estado.paradasSemana, falla: 'No se pudieron leer las paradas.' },\n", a: '' },
    { nombre: 'la semana es de 14 días', de: '        const desde = sumarDias(fin, -6)\n', a: '        const desde = sumarDias(fin, -13)\n' },
  ],
})
