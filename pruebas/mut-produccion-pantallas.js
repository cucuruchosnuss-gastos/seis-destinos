// Mutaciones de test-produccion-pantallas.js (la planta en la tablet real,
// parte C, 28/09/2026). Ver mutar.js y mutar-produccion.js.
//
//   node pruebas/mut-produccion-pantallas.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-pantallas.js'),
  escape: 'esc',
  funciones: ['htmlTagsOperarios', 'htmlFilaLote', 'htmlReloj'],
  equivalentes: [
    { expr: 'esc(textoFechaLote(f.desde))', motivo: 'textoFechaLote() arma DD/MM/AAAA con los dígitos que saca un regex de la fecha: nada de la base llega a la salida' },
  ],
  soloPlanta: ['htmlTagsOperarios', 'htmlFilaLote', 'htmlReloj', 'htmlProducido', 'htmlPasoProducto'],
  manuales: [
    // 7. el PIN como ventana
    { nombre: 'el fondo no aparece con el PIN', de: "      document.getElementById('pr-pin-fondo').hidden = !p\n", a: '' },
    { nombre: 'la ventana sin salida con una persona', de: '      otra.hidden = false\n', a: "      otra.hidden = !(p.modo === 'maestro' || reloj)\n" },
    { nombre: 'la salida de la persona guardada no dice "Soy otra persona"', de: "(estado.quienFija ? 'Soy otra persona' : 'Elegir otra persona')", a: "'Elegir otra persona'" },
    { nombre: 'el fondo no cierra', de: "addEventListener('click', () => { if (!estado.pin?.enviando) cerrarPin() })", a: "addEventListener('click', () => {})" },
    { nombre: 'Escape no cierra el PIN', de: "if (estado.vista === 'pr-quien' && estado.pin && !estado.pin.enviando) cerrarPin()", a: "if (false) cerrarPin()" },
    { nombre: 'la ventana no está centrada', de: '      position: fixed; z-index: 61; left: 50%; top: 50%; transform: translate(-50%, -50%);', a: '      position: static; z-index: 61;' },
    { nombre: 'la lista comparte la pantalla con el teclado', de: '    .pr-quien { grid-template-columns: minmax(0, 1fr); gap: 0.5rem; }', a: '    .pr-quien { grid-template-columns: minmax(0, 1fr) 400px; gap: 0.5rem; }' },
    { nombre: 'Asignar PIN sin fondo', de: "      document.getElementById('pr-asignar-fondo').hidden = !persona\n", a: '' },
    { nombre: 'Asignar PIN no dice a quién', de: "? `${persona.tiene_pin ? 'Resetear el PIN de' : 'Asignar PIN a'} ${persona.nombre}` : ''", a: "? '' : ''" },
    { nombre: 'Asignar PIN sin Cancelar', de: "      document.getElementById('pr-asignar-cancelar').addEventListener('click', volverAsignarPin)\n", a: '' },
    // 11. lo producido
    { nombre: 'el producto sin familia', de: "(familia ? `<span class=\"pr-ag__familia\">${esc(familia)}</span>` :", a: "(false ? '' :" },
    { nombre: 'el chocolate no va en marrón', de: "${choco ? ' pr-ag__opcion--choco' : ''}", a: "''" },
    { nombre: 'el marrón del chocolate con letra oscura', de: '.pr-ag__opcion--choco { background: var(--marron-oscuro); border-color: var(--marron-oscuro); color: #fff; }', a: '.pr-ag__opcion--choco { background: var(--marron-suave); border-color: var(--marron-oscuro); color: #111; }' },
    { nombre: 'partir el nombre no busca el número', de: "const k = t.findIndex((x, i) => i > 0 && /^\\d/.test(x))", a: 'const k = -1' },
    { nombre: 'partir no saca "Chocolate"', de: ".replace(/\\s+chocolate\\s*$/i, '')", a: '' },
    { nombre: 'con cono sin colores', de: "${v ? 'pr-ag__opcion--con-cono' : 'pr-ag__opcion--sin-cono'}", a: "''" },
    { nombre: 'la caja no avanza sola', de: "      // El embolsado queda al lado de las cajas.\n      a.paso = 'cajas'\n", a: '' },
    { nombre: 'el cono y las cajas vuelven a compartir', de: "      cono.hidden = !(a.conCono && a.paso === 'cono')", a: "      cono.hidden = !(a.conCono && enFinal)" },
    { nombre: 'las cajas se ven con el cono', de: "      document.getElementById('pr-agregar-cajas-panel').hidden = a.paso !== 'cajas'", a: "      document.getElementById('pr-agregar-cajas-panel').hidden = !enFinal" },
    { nombre: 'el embolsado no va con las cajas', de: '<span class="pr-ag__caja-cambiar">Cambiar</span></button>` +\n        htmlEmbolsado(a, cat)', a: '<span class="pr-ag__caja-cambiar">Cambiar</span></button>`' },
    { nombre: 'la lista de conos no scrollea', de: 'id="pr-agregar-marcas" data-scroll-propio>', a: 'id="pr-agregar-marcas">' },
    // 12. corregir todo
    { nombre: 'corregir abre el panel viejo', de: "      if (modo === 'corregir' && estado.catalogo) return abrirCorregirCompleto(itemId)\n", a: '' },
    { nombre: 'corregir no trae la caja elegida', de: "        cajaId: it.caja_insumo_id ?? null, cajaElegida: !!pr,", a: "        cajaId: null, cajaElegida: !!pr," },
    { nombre: 'corregir no pide motivo', de: "      if (motivo.length < 3) { err.textContent = 'Escribí por qué lo corregís, con tres letras por lo menos.'; err.hidden = false; return }\n", a: '' },
    { nombre: 'corregir manda aunque no cambie nada', de: "      if (!Object.keys(datos).length) { err.textContent = 'No cambiaste nada: tocá el paso que querés corregir.'; err.hidden = false; return }\n", a: '' },
    { nombre: 'corregir manda todas las claves', de: '      for (const [k, v] of Object.entries(ahora)) if ((antes[k] ?? null) !== (v ?? null)) datos[k] = v', a: '      for (const [k, v] of Object.entries(ahora)) datos[k] = v' },
    { nombre: 'sin cono el cono no va en null', de: '        marca_id: pr?.con_cono ? (a.marcaId ?? null) : null,', a: '        marca_id: a.marcaId ?? null,' },
    { nombre: 'sin empaque manda la caja igual', de: '      if (!sinEmpaque) {\n        ahora.caja_insumo_id', a: '      if (true) {\n        ahora.caja_insumo_id' },
    { nombre: 'corregir usa la RPC vieja', de: "supabase.rpc('corregir_produccion_item_completo', { p_item_id: a.corrige.id, p_datos: datos, p_motivo: motivo })", a: "supabase.rpc('corregir_produccion_item', { p_item_id: a.corrige.id, p_cajas: a.cajas, p_motivo: motivo })" },
    { nombre: 'el motivo no se recorta', de: "      const motivo = document.getElementById('pr-agregar-motivo').value.trim()", a: "      const motivo = document.getElementById('pr-agregar-motivo').value" },
    { nombre: 'el título no dice que corrige', de: "a.corrige ? `Corregir el sublote ${a.corrige.sublote}` : 'Agregar producto'", a: "'Agregar producto'" },
    { nombre: 'el motivo se ve al agregar', de: "      document.getElementById('pr-agregar-campo-motivo').hidden = !a.corrige", a: "      document.getElementById('pr-agregar-campo-motivo').hidden = false" },
    { nombre: 'el botón no dice corrección', de: "a.corrige ? 'Guardar la corrección' : 'Agregar a lo producido'", a: "'Agregar a lo producido'" },
    // 13. el renglón
    { nombre: 'el botón vuelve a decir Borrar', de: 'data-borrar="${esc(it.id)}">Anular</button>', a: 'data-borrar="${esc(it.id)}">Borrar</button>' },
    { nombre: 'la línea se parte', de: '    .pr-producido__linea { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;', a: '    .pr-producido__linea { display: block;' },
    { nombre: 'anular dice Borrar', de: "? `Anular el sublote ${it.sublote}` : `Corregir el sublote ${it.sublote}`", a: "? `Borrar el sublote ${it.sublote}` : `Corregir el sublote ${it.sublote}`" },
    { nombre: 'sin empaque en otro renglón', de: "`<div class=\"pr-producido__desc\">${sinCaja ? `<span class=\"pr-sin-caja pr-sin-caja--chip\" title=\"${esc(textoSinCaja(it))}\">sin empaque</span> ` : ''}${desc}</div>` +", a: "`<div class=\"pr-producido__desc\">${desc}${sinCaja ? `<div class=\"pr-sin-caja\">${esc(textoSinCaja(it))}</div>` : ''}</div>` +" },
    // 9, 14, 16
    { nombre: 'los comos apilados', de: '    .pr-receta__comos { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.375rem; }', a: '    .pr-receta__comos { grid-template-columns: minmax(0, 1fr); gap: 0.375rem; }' },
    { nombre: 'vuelve la pastilla del origen', de: "        `<span class=\"pr-chip-rec pr-chip-rec--${esc(clave)}\">${b.doble ? 'Doble' : 'Simple'}</span>`,\n      ]", a: "        `<span class=\"pr-chip-rec pr-chip-rec--${esc(clave)}\">${b.doble ? 'Doble' : 'Simple'}</span>`,\n        `<span class=\"pr-chip-origen\">x</span>`,\n      ]" },
    { nombre: 'Paró ahora sin bordó', de: '    .pr-planilla-cab #pr-btn-parada { background: var(--bordo); border-color: var(--bordo); color: #fff; }', a: '' },
    { nombre: 'las paradas sin su tarjeta bordó', de: 'class="pr-tarjeta pr-bloque--paradas"', a: 'class="pr-tarjeta"' },
    { nombre: 'el reloj en UTC', de: "      const p = new Intl.DateTimeFormat('en-GB', { timeZone: ZONA_AR,", a: "      const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC'," },
    // (Sin mutación para el "24 → 00" de medianoche: Intl de Node ya devuelve
    // 00 con hour12:false, así que sacar la guarda no cambia nada acá; está
    // por los navegadores que devuelven 24 con hourCycle h24.)
    { nombre: 'el reloj no se actualiza', de: "      for (const el of document.querySelectorAll('[data-reloj]')) if (el.textContent !== t) el.textContent = t\n", a: '' },
    { nombre: 'dos relojes por página', de: '      if (relojPlanta !== null) return false\n', a: '' },
    { nombre: 'el reloj no está en la barra', de: '      return htmlReloj(\'pr-lat__reloj\') + htmlBotonOtroModo()', a: '      return htmlBotonOtroModo()' },
    { nombre: 'el reloj no está en ¿Quién sos?', de: "<span class=\"pr-banda-modo__sub\">${subBanda}</span>${htmlReloj('pr-banda-modo__reloj')}${accionBanda}</div>`", a: "<span class=\"pr-banda-modo__sub\">${subBanda}</span>${accionBanda}</div>`" },
    { nombre: 'la planta no arranca el reloj', de: '      iniciarReloj()\n      registrarPantalla()', a: '      registrarPantalla()' },
  ],
})
