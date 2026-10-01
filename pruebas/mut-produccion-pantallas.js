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
  funciones: ['htmlTagsOperarios', 'htmlFilaLote', 'htmlReloj', 'htmlFilaAbrir', 'htmlOperariosAbrir'],
  equivalentes: [
    { expr: 'esc(textoFechaLote(f.desde))', motivo: 'textoFechaLote() arma DD/MM/AAAA con los dígitos que saca un regex de la fecha: nada de la base llega a la salida' },
    { expr: 'esc(textoCantidad(f.queda))', motivo: 'textoCantidad() pasa por Number() y formatearNumeroAr(): solo dígitos, puntos, comas y "kg"/"g"' },
  ],
  soloPlanta: ['htmlTagsOperarios', 'htmlFilaLote', 'htmlReloj', 'htmlProducido', 'htmlPasoProducto', 'htmlFilaAbrir', 'htmlOperariosAbrir'],
  manuales: [
    // 7. el PIN como ventana
    { nombre: 'el fondo no aparece con el PIN', de: "      document.getElementById('pr-pin-fondo').hidden = !p\n", a: '' },
    // Planta v2: la salida es la ✕ fija de la ventana (sin hidden).
    { nombre: 'la ventana sin salida', de: 'class="pr-pin__cerrar" id="pr-pin-otra" aria-label="Cerrar">', a: 'class="pr-pin__cerrar" id="pr-pin-otra" hidden aria-label="Cerrar">' },
    { nombre: 'la salida no dice qué hace', de: "      document.getElementById('pr-pin-otra').setAttribute('aria-label', p.modo === 'maestro' ? 'Cancelar' :", a: "      document.getElementById('pr-pin-otra').setAttribute('aria-label', p.modo === 'maestro' ? 'Cerrar' :" },
    { nombre: 'la salida de la persona guardada no dice "Soy otra persona"', de: "(estado.quienFija ? 'Soy otra persona' : 'Elegir otra persona')", a: "'Elegir otra persona'" },
    { nombre: 'el fondo no cierra', de: "addEventListener('click', () => { if (!estado.pin?.enviando) cerrarPin() })", a: "addEventListener('click', () => {})" },
    { nombre: 'Escape no cierra el PIN', de: "if (estado.vista === 'pr-quien' && estado.pin && !estado.pin.enviando) cerrarPin()", a: "if (false) cerrarPin()" },
    { nombre: 'la ventana no está centrada', de: '    .pr-pin {\n      position: fixed; z-index: 50; left: 50%; top: 50%; transform: translate(-50%, -50%);', a: '    .pr-pin {\n      position: static; z-index: 50;' },
    { nombre: 'la ventana queda debajo del fondo', de: '.pr-pin-fondo { position: fixed; inset: 0; z-index: 49;', a: '.pr-pin-fondo { position: fixed; inset: 0; z-index: 51;' },
    { nombre: 'la lista no llena el alto', de: '    .pr-quien__nombres {\n      flex: 1; min-height: 0; display: grid;', a: '    .pr-quien__nombres {\n      flex: 0 0 auto; min-height: 0; display: grid;' },
    { nombre: 'Asignar PIN sin fondo', de: "      document.getElementById('pr-asignar-fondo').hidden = !persona\n", a: '' },
    { nombre: 'Asignar PIN no dice a quién', de: "? `${persona.tiene_pin ? 'Resetear el PIN de' : 'Asignar PIN a'} ${persona.nombre}` : ''", a: "? '' : ''" },
    { nombre: 'Asignar PIN sin Cancelar', de: "      document.getElementById('pr-asignar-cancelar').addEventListener('click', volverAsignarPin)\n", a: '' },
    // 11. lo producido
    { nombre: 'el producto sin familia', de: "(familia ? `<span class=\"pr-ag__familia\">${esc(familia)}</span>` :", a: "(false ? '' :" },
    // Planta v2: el chocolate en su grupo y en marrón (COLOR_CHOCO).
    { nombre: 'el chocolate no va en su botón marrón', de: '        if (col.choco && !col.elegido) {\n', a: '        if (false) {\n' },
    { nombre: 'el marrón del chocolate pasa a azul', de: "const COLOR_CHOCO = { mini: 'oklch(0.44 0.07 55)'", a: "const COLOR_CHOCO = { mini: 'oklch(0.44 0.07 250)'" },
    { nombre: 'el marrón del chocolate con letra oscura', de: '.pr-ag__producto--choco { color: #fff;', a: '.pr-ag__producto--choco { color: #111;' },
    { nombre: 'el chocolate sin su grupo aparte', de: '<span class="pr-ag__rotulo">DE CHOCOLATE</span>', a: '' },
    { nombre: 'partir el nombre no busca el número', de: "const k = t.findIndex((x, i) => i > 0 && /^\\d/.test(x))", a: 'const k = -1' },
    { nombre: 'partir no saca "Chocolate"', de: ".replace(/\\s+chocolate\\s*$/i, '')", a: '' },
    // Planta v2: Producto → Cono → Presentación → (Caja) → Cajas.
    { nombre: 'los conos sin colores', de: 'style="background: ${col.bg}; color: ${col.fg}; border-color: ${col.bd}"', a: '' },
    { nombre: '"Sin cono" no es blanco', de: '.pr-ag__sin-cono { flex: 0 0 34%; height: 56px; border-radius: 14px; background: #fff;', a: '.pr-ag__sin-cono { flex: 0 0 34%; height: 56px; border-radius: 14px; background: var(--p-caja);' },
    { nombre: 'el producto no pasa al cono', de: "      } else {\n        a.paso = 'cono'\n      }", a: "      } else {\n        a.paso = 'presentacion'\n      }" },
    { nombre: 'el cono no pasa a la presentación', de: "      a.paso = a.presentacionId ? (a.cajaElegida ? 'cajas' : 'caja') : 'presentacion'\n", a: "      a.paso = 'cajas'\n" },
    { nombre: 'la caja no avanza sola', de: "      // El embolsado queda al lado de las cajas.\n      a.paso = 'cajas'\n", a: '' },
    { nombre: 'el cono y las cajas vuelven a compartir', de: "      cono.hidden = a.paso !== 'cono'", a: "      cono.hidden = !['cono', 'cajas'].includes(a.paso)" },
    { nombre: 'las cajas se ven con el cono', de: "      document.getElementById('pr-agregar-cajas-panel').hidden = a.paso !== 'cajas'", a: "      document.getElementById('pr-agregar-cajas-panel').hidden = !['cono', 'cajas'].includes(a.paso)" },
    { nombre: 'la chapa de la caja no dice el embolsado', de: "      return `${caja} · ${TEXTO_EMBOLSADO[embolsadoEfectivo(a, cat)] ?? ''}`", a: '      return caja' },
    { nombre: 'el paso de la caja no deja cambiar el embolsado', de: "      if (a.cajaElegida) h += htmlEmbolsado(a, cat) + '<button", a: "      if (a.cajaElegida) h += '<button" },
    { nombre: '"Seguir" aparece sin caja elegida', de: "      if (a.cajaElegida) h += htmlEmbolsado(a, cat) + '<button", a: "      h += htmlEmbolsado(a, cat) + '<button" },
    { nombre: 'la lista de conos no scrollea', de: 'id="pr-agregar-marcas" data-scroll-propio>', a: 'id="pr-agregar-marcas">' },
    { nombre: 'la lista de conos sin scroll propio en el CSS', de: '.pr-ag__conos { flex: 1; min-height: 0; overflow: auto;', a: '.pr-ag__conos { flex: 1; min-height: 0; overflow: visible;' },
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
    { nombre: 'el botón no dice corrección', de: "confirmar.textContent = a.corrige ? 'Guardar la corrección'", a: "confirmar.textContent = false ? 'Guardar la corrección'" },
    // 13. el renglón
    // Planta v2: el renglón es una fila de la tabla, con botones de ícono.
    { nombre: 'el botón vuelve a decir Borrar', de: 'data-borrar="${esc(it.id)}" title="Anular" aria-label="Anular el sublote ${esc(it.sublote)}"', a: 'data-borrar="${esc(it.id)}" title="Borrar" aria-label="Borrar el sublote ${esc(it.sublote)}"' },
    { nombre: 'la fila se parte', de: '    .pr-fp__l1, .pr-fp__l2, .pr-fp__num { display: contents; }', a: '    .pr-fp__l1, .pr-fp__l2, .pr-fp__num { display: flex; }' },
    { nombre: 'el title no trae el texto entero', de: "<div class=\"${clases}\" title=\"${esc(d ? [d.producto, ...partes].join(' · ') : '')}\">", a: '<div class="${clases}" title="">' },
    { nombre: 'anular dice Borrar', de: "? `Anular el sublote ${it.sublote}` : `Corregir el sublote ${it.sublote}`", a: "? `Borrar el sublote ${it.sublote}` : `Corregir el sublote ${it.sublote}`" },
    { nombre: 'sin empaque en otro renglón', de: "${sinCaja ? `<span class=\"pr-sin-caja pr-sin-caja--chip\" title=\"${esc(textoSinCaja(it))}\">sin empaque</span> ` : ''}", a: "${sinCaja ? `<div class=\"pr-sin-caja\">${esc(textoSinCaja(it))}</div>` : ''}" },
    // 9, 14, 16
    { nombre: 'los comos se parten en varias filas', de: '    .pr-seg-rec { display: flex; gap: 3px;', a: '    .pr-seg-rec { display: flex; flex-wrap: wrap; gap: 3px;' },
    { nombre: 'la receta se apila en angosto', de: '    .pr-receta__tabla--modificar .pr-rec { min-height: 30px; }', a: '    .pr-receta__tabla--modificar .pr-rec { min-height: 30px; }\n    @media (max-width: 1100px) { .pr-rec { display: flex; } }' },
    { nombre: 'vuelve la pastilla del origen', de: "      const chips = ['<span class=\"pr-chip-modificada\">Modificada</span>']", a: "      const chips = ['<span class=\"pr-chip-origen\">x</span>', '<span class=\"pr-chip-modificada\">Modificada</span>']" },
    { nombre: 'Paró ahora sin bordó', de: '.pr-pa-ahora { flex: 1; min-height: 50px; border-radius: 12px; border: 1.5px solid var(--p-mal); background: #fff; color: var(--p-mal);', a: '.pr-pa-ahora { flex: 1; min-height: 50px; border-radius: 12px; border: 1.5px solid var(--p-borde); background: #fff; color: var(--p-tinta);' },
    { "nombre": "Paró ahora sin su clase bordó", "de": "class=\"pr-pa-ahora\" id=\"pr-btn-parada\"", "a": "class=\"pr-btn\" id=\"pr-btn-parada\"" },
    { nombre: 'la parada en curso sin bordó', de: '.pr-parada-activa { background: var(--p-mal); color: #fff;', a: '.pr-parada-activa { background: var(--p-tarjeta); color: #fff;' },
    { nombre: 'el reloj en UTC', de: "      const p = new Intl.DateTimeFormat('en-GB', { timeZone: ZONA_AR,", a: "      const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC'," },
    // (Sin mutación para el "24 → 00" de medianoche: Intl de Node ya devuelve
    // 00 con hour12:false, así que sacar la guarda no cambia nada acá; está
    // por los navegadores que devuelven 24 con hourCycle h24.)
    { nombre: 'el reloj no se actualiza', de: "      for (const el of document.querySelectorAll('[data-reloj]')) if (el.textContent !== t) el.textContent = t\n", a: '' },
    { nombre: 'dos relojes por página', de: '      if (relojPlanta !== null) return false\n', a: '' },
    { nombre: 'el reloj no está en la barra', de: "htmlBotonOtroModo() + htmlLatPersona() + htmlRelojDoble('pr-lat__reloj') + cuerpoLat", a: 'htmlBotonOtroModo() + htmlLatPersona() + cuerpoLat' },
    { nombre: 'el reloj de dos líneas no se actualiza', de: "      for (const el of document.querySelectorAll('[data-reloj-hora]')) if (el.textContent !== (h ?? '')) el.textContent = h ?? ''\n", a: '' },
    { nombre: 'el reloj no está en la cabecera', de: '<span class="pr-reloj pr-cab__reloj" data-reloj aria-label="Fecha y hora"></span>', a: '' },
    { nombre: 'el reloj no está en ¿Quién sos?', de: "${htmlReloj('pr-banda-modo__reloj')}${accionBanda}", a: '${accionBanda}' },
    { nombre: 'la planta no arranca el reloj', de: '      iniciarReloj()\n      registrarPantalla()', a: '      registrarPantalla()' },
    // Todo entra sin scroll (planta v2).
    { nombre: 'la página scrollea', de: '    .pr-app { height: 100dvh; display: flex; flex-direction: row; overflow: hidden; }', a: '    .pr-app { min-height: 100dvh; display: flex; flex-direction: row; }' },
    { nombre: 'parada, la barra no va arriba', de: '    @media (orientation: portrait) { .pr-app { flex-direction: column; } }', a: '' },
    { nombre: 'lo que scrollea no scrollea en su recuadro', de: '    [data-scroll-propio] { overflow-y: auto; min-height: 0; overscroll-behavior: contain; }', a: '    [data-scroll-propio] { overscroll-behavior: contain; }' },
    { nombre: 'lo producido sin recuadro propio', de: 'id="pr-planilla-producido" data-scroll-propio>', a: 'id="pr-planilla-producido">' },
    { nombre: 'la receta sin recuadro propio', de: 'id="pr-receta-filas" data-scroll-propio>', a: 'id="pr-receta-filas">' },
  ],
})
