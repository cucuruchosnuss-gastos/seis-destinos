// Mutaciones de test-produccion-anterior.js (el botón "Anterior (última)"
// dice qué masa fue y cuándo, 30/09/2026). Ver mutar.js y mutar-produccion.js.
//
//   node pruebas/mut-produccion-anterior.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-anterior.js'),
  escape: 'esc',
  manuales: [
    // El rótulo
    { nombre: 'el rótulo vuelve a decir "Anterior"', de: "hayAnterior ? 'Anterior (última)' : 'Anterior'", a: "'Anterior'" },
    { nombre: 'el detalle no va debajo', de: "textoDeHtml(detalleAnterior(d)), hayAnterior) +", a: 'textoDeHtml(detalleAnterior(d))) +' },
    { nombre: 'el apilado sin su clase', de: "class=\"pr-como${apilado ? ' pr-como--apilado' : ''}\"", a: 'class="pr-como"' },
    { nombre: 'el CSS apilado no va en columna', de: '.pr-como--apilado { flex-direction: column;', a: '.pr-como--apilado {' },
    // diaDeLaMasa
    { nombre: '"hoy" en UTC y no en Argentina', de: '      const dia = hoyArgentina(d)\n      const hoy = hoyArgentina(ahora)', a: '      const dia = d.toISOString().slice(0, 10)\n      const hoy = ahora.toISOString().slice(0, 10)' },
    { nombre: 'ayer se calcula mal (dos días)', de: 'Date.UTC(y, m - 1, dd - 1)', a: 'Date.UTC(y, m - 1, dd - 2)' },
    { nombre: 'sin hora igual dice un día', de: "      if (momento == null || momento === '') return null\n      const d = new Date(momento)\n      if (Number.isNaN(d.getTime())) return null\n      const dia = hoyArgentina(d)", a: "      const d = new Date(momento || 0)\n      const dia = hoyArgentina(d)" },
    { nombre: 'una hora ilegible no se rechaza', de: '      if (Number.isNaN(d.getTime())) return null\n      const dia = hoyArgentina(d)', a: '      const dia = hoyArgentina(d)' },
    // cuandoFueLaAnterior
    { nombre: 'hoy sin la hora', de: "        return h ? `hoy ${h}` : 'hoy'", a: "        return 'hoy'" },
    { nombre: 'ayer sin el turno', de: "      if (cual === 'ayer') return a.turno_nombre ? `ayer, turno ${a.turno_nombre}` : 'ayer'", a: "      if (cual === 'ayer') return 'ayer'" },
    { nombre: 'ayer sin turno leído inventa uno', de: "a.turno_nombre ? `ayer, turno ${a.turno_nombre}` : 'ayer'", a: "`ayer, turno ${a.turno_nombre ?? 'Mañana'}`" },
    { nombre: 'antes con el mes y el día dados vuelta', de: '        return `${dd}/${m}`', a: '        return `${m}/${dd}`' },
    { nombre: 'antes con la fecha en UTC', de: "        const [, m, dd] = hoyArgentina(new Date(a.hora)).split('-')", a: "        const [, m, dd] = new Date(a.hora).toISOString().slice(0, 10).split('-')" },
    // El detalle corto
    { nombre: 'el corto sin el cuándo', de: "Masa ${esc(a.nro)}${cuando ? ` · ${esc(cuando)}` : ''}</span>", a: 'Masa ${esc(a.nro)}</span>' },
    { nombre: 'el corto sin escapar el cuándo', de: "${cuando ? ` · ${esc(cuando)}` : ''}</span>${a.es_chocolate", a: "${cuando ? ` · ${cuando}` : ''}</span>${a.es_chocolate" },
    { nombre: 'el corto sin el número', de: '">Masa ${esc(a.nro)}${cuando', a: '">Masa${cuando' },
    // El largo
    { nombre: 'el title sin "del turno que sea"', de: '`La última masa de esta máquina, del turno que sea: masa ${esc(a.nro)}', a: '`Masa ${esc(a.nro)}' },
    { nombre: 'el title sin el cuándo', de: "masa ${esc(a.nro)}${cuando ? `, ${esc(cuando)}` : ''}`]", a: 'masa ${esc(a.nro)}`]' },
    { nombre: 'el title sin escapar el cuándo', de: "${cuando ? `, ${esc(cuando)}` : ''}`]", a: "${cuando ? `, ${cuando}` : ''}`]" },
    // La lectura del turno
    { nombre: 'el turno no se lee nunca', de: '          estado.datosMasa.anterior.turno_nombre = await leerTurnoDeLaAnterior(estado.datosMasa.anterior)', a: '          estado.datosMasa.anterior.turno_nombre = null' },
    { nombre: 'un error del turno voltea la sala', de: "          console.error('turno de la masa anterior:', err)\n          estado.datosMasa.anterior.turno_nombre = null", a: '          throw err' },
    { nombre: 'el turno se lee aunque no sea ayer', de: "      if (ant?.lote == null || diaDeLaMasa(ant.hora, ahora) !== 'ayer') return null", a: '      if (ant?.lote == null) return null' },
    { nombre: 'el turno se busca por otra cosa', de: ".select('turno').eq('lote', ant.lote).maybeSingle()", a: ".select('turno').eq('id', ant.masa_id).maybeSingle()" },
    { nombre: 'la respuesta del turno se ignora', de: '      return data?.turno ?? null\n    }', a: '      return null\n    }' },
    // Punto 2: los segmentos en una fila, de alto fijo, con "…"
    { nombre: 'los segmentos vuelven a bajar de renglón', de: '.pr-receta__opciones { display: flex; gap: 8px; flex-wrap: nowrap;', a: '.pr-receta__opciones { display: flex; gap: 8px; flex-wrap: wrap;' },
    { nombre: '"Anterior" sin alto fijo', de: '      height: 40px; min-width: 0; flex-shrink: 1; overflow: hidden; }', a: '      min-width: 0; flex-shrink: 1; overflow: hidden; }' },
    { nombre: '"Anterior" no se achica', de: '      height: 40px; min-width: 0; flex-shrink: 1; overflow: hidden; }', a: '      height: 40px; overflow: hidden; }' },
    { nombre: 'el detalle sin "…"', de: '.pr-como--apilado .pr-como__cuando { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }', a: '.pr-como--apilado .pr-como__cuando { min-width: 0; overflow: hidden; white-space: nowrap; }' },
    { nombre: 'el "· chocolate" se puede cortar', de: '    .pr-como--apilado .pr-como__choco { flex-shrink: 0; }\n', a: '' },
    { nombre: 'el "· chocolate" adentro de lo que se corta', de: "</span>${a.es_chocolate ? ' <span class=\"pr-como__choco\">· chocolate</span>' : ''}${anteriorFueTirada(a)", a: "${a.es_chocolate ? ' <span class=\"pr-como__choco\">· chocolate</span>' : ''}</span>${anteriorFueTirada(a)" },
    { nombre: 'el grupo de segmentos no se achica', de: '    .pr-receta__comos { flex-shrink: 1; }\n', a: '' },
    { nombre: 'el chocolate vuelve a decir "de chocolate"', de: "' <span class=\"pr-como__choco\">· chocolate</span>'", a: "' <span class=\"pr-como__choco\">· de chocolate</span>'" },
    // Punto 1: el botón Registrar
    { nombre: 'vuelve la banda verde', de: '      pintarReceta()\n      cargarMasasReceta()', a: '      pintarReceta()\n      document.getElementById(\'pr-receta\').insertAdjacentHTML?.(\'afterbegin\', \'<div id="pr-sala-exito"></div>\')\n      cargarMasasReceta()' },
    { nombre: 'mientras guarda no dice "Registrando"', de: "      btn.textContent = estado.enviandoMasa ? 'Registrando masa…'", a: "      btn.textContent = estado.enviandoMasa ? 'Registrar masa'" },
    { nombre: 'guardada no lo dice en el botón', de: '        : e ? e.texto\n', a: '\n' },
    { nombre: 'registrada con el número del borrador y no el de la base', de: '      const nro = res ? (res.nro ?? b.nro) : b.nro', a: '      const nro = b.nro' },
    { nombre: 'registrada sin el tilde', de: "texto: `Masa ${nro ?? ''} registrada ✓`", a: "texto: `Masa ${nro ?? ''} registrada`" },
    { nombre: 'el verde se puede tocar (doble toque)', de: '      btn.disabled = !!estado.enviandoMasa || !!e\n', a: '      btn.disabled = !!estado.enviandoMasa\n' },
    { nombre: 'el detalle no va en el title', de: "      btn.title = e?.detalle ?? ''\n", a: '' },
    { nombre: 'el verde dura 6 segundos', de: '    const MS_BOTON_REGISTRADA = 2500', a: '    const MS_BOTON_REGISTRADA = 6000' },
    { nombre: 'el verde no se apaga solo', de: '      relojBotonRegistrada = setTimeout(ocultarRegistrada, MS_BOTON_REGISTRADA)\n', a: '' },
    { nombre: 'sin señal el botón no lo dice', de: "      mostrarRegistrada(b, r.resultado === 'ok' ? (r.data ?? {}) : null)", a: "      if (r.resultado === 'ok') mostrarRegistrada(b, r.data ?? {})" },
    { nombre: 'sin señal no dice que no la cargue de nuevo', de: "            detalle: 'Sin señal: se manda sola cuando vuelva. No la cargues de nuevo.' }", a: "            detalle: 'Sin señal.' }" },
    { nombre: 'CSS: guardando no es naranja pálido', de: '    .pr-receta__registrar--guardando, .pr-receta__registrar--guardando:disabled { background: var(--p-acento-suave);', a: '    .pr-receta__registrar--guardando, .pr-receta__registrar--guardando:disabled { background: var(--p-acento);' },
    { nombre: 'CSS: registrada no es verde', de: '    .pr-receta__registrar--ok, .pr-receta__registrar--ok:disabled { background: var(--p-bien);', a: '    .pr-receta__registrar--ok, .pr-receta__registrar--ok:disabled { background: var(--p-acento);' },
    { nombre: 'CSS: el botón puede bajar de renglón', de: '      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n    /* La confirmación', a: '      overflow: hidden; }\n    /* La confirmación' },
    // Punto 3: pasar a chocolate
    { nombre: 'pasar a chocolate pide motivo igual', de: "      if (b.como === 'modificar' && !pasaAChocolate(b, estado.defineChocolate) && String", a: "      if (b.como === 'modificar' && String" },
    { nombre: 'no se mira la masa de partida', de: '      return !esChocolate({ cantidades: b.base ?? {} }, definen) && esChocolate(b, definen)', a: '      return esChocolate(b, definen)' },
    { nombre: 'no se mira la masa que se registra', de: '      return !esChocolate({ cantidades: b.base ?? {} }, definen) && esChocolate(b, definen)', a: '      return !esChocolate({ cantidades: b.base ?? {} }, definen)' },
    { nombre: 'sin saber qué define el chocolate, no se pide', de: "      if (!b || b.como !== 'modificar' || !definen) return false", a: "      if (!b || b.como !== 'modificar') return false\n      if (!definen) return true" },
    { nombre: 'aplica también sin Modificar', de: "      if (!b || b.como !== 'modificar' || !definen) return false", a: '      if (!b || !definen) return false' },
    { nombre: 'no viaja "Pasada a chocolate"', de: "      const motivo = escrito || (pasaAChocolate(b, estado.defineChocolate) ? MOTIVO_PASADA_A_CHOCOLATE : '')", a: '      const motivo = escrito' },
    { nombre: 'pisa el motivo escrito', de: "      const motivo = escrito || (pasaAChocolate(b, estado.defineChocolate) ? MOTIVO_PASADA_A_CHOCOLATE : '')", a: "      const motivo = pasaAChocolate(b, estado.defineChocolate) ? MOTIVO_PASADA_A_CHOCOLATE : escrito" },
    { nombre: 'el texto no es "Pasada a chocolate"', de: "    const MOTIVO_PASADA_A_CHOCOLATE = 'Pasada a chocolate'", a: "    const MOTIVO_PASADA_A_CHOCOLATE = 'Chocolate'" },
  ],
})
