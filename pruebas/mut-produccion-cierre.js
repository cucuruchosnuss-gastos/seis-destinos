// Mutaciones de test-produccion-cierre.js (la planilla, lo producido y el
// cierre, rediseño parte 3). Ver mutar.js.
//
//   node pruebas/mut-produccion-cierre.js

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-cierre.js'),
  escape: 'esc',
  funciones: [
    // Planta v2: htmlLotePlanilla, htmlQuePlanilla, htmlMasasPlanilla,
    // htmlParadas y htmlPasoConoSiNo ya no los dibuja ninguna pantalla de la
    // planta (el lote va en la cabecera, las masas y paradas en sus resúmenes,
    // el cono en su columna): sus mutaciones no medirían nada. Entran los
    // renders nuevos.
    'htmlEstadoPlanilla', 'htmlOpsResumen', 'htmlMasasResumen', 'htmlAccionParo', 'htmlParadasTurno',
    'htmlProducido', 'htmlTotalTurno', 'htmlPasosAgregar', 'htmlPasoProducto',
    'htmlPasoPresentacion', 'htmlMarcas', 'htmlAvisosCierre', 'htmlResumenCierre', 'htmlSublotesDefinitivos',
    'htmlPendientesCompletar', 'htmlFaltaCierre',
  ],
  equivalentes: [
    { expr: 'esc(clases)', motivo: 'las clases de una parada salen del código (pr-parada-item, --curso, --programada): nada escapable' },
    { expr: 'esc(cat)', motivo: 'cat es una clave de NOMBRE_CATEGORIA_PARADA (programada / falla / otro) o null: una categoría desconocida no se dibuja' },
    { expr: 'esc(NOMBRE_CATEGORIA_PARADA[cat])', motivo: "'Programada' / 'Falla' / 'Otro', escritos en el código" },
    // (esc(x.texto) de htmlFaltaCierre ya NO es equivalente: desde la planta
    // v2 trae el texto de que_falta_para_cerrar, y la suite lo cubre.)
    { expr: 'esc(x.ir)', motivo: 'htmlFaltaCierre(): "paradas", "sala", "producido" o "scrap", constantes del código' },
    { expr: 'esc(x.boton)', motivo: 'htmlFaltaCierre(): "Ir a Paradas", "Ir a Sala de masa", "Ir a Lo producido" o "Revisar", constantes del código' },
    { expr: 'esc(a.ir)', motivo: 'htmlFaltaCierre(): "sala" o "producido", constantes del código' },
    { expr: 'esc(a.boton)', motivo: 'htmlFaltaCierre(): "Ir a Sala de masa" o "Corregir producto", constantes del código' },
    { expr: 'esc(cuanto(f.cajas, f.unidades))', motivo: 'htmlResumenCierre(): cajas y unidades con formatearNumeroAr() y "caja(s)"/"u"' },
    { expr: 'esc(cuanto(t.cajas, t.unidades))', motivo: 'htmlResumenCierre(): el total, con formatearNumeroAr()' },
    { expr: 'esc(textoColaFila(p.cola))', motivo: 'textoColaFila() devuelve uno de cuatro textos fijos del código' },
    { expr: 'esc(hasta)', motivo: 'htmlParadasTurno(): horaArgentina() ("HH:MM"), "—" o "ahora"' },
    { expr: 'esc(sub)', motivo: 'htmlMasasResumen(): conteos y textos del código (en htmlAccionParo el sub lleva el motivo y se prueba en test-produccion-paradas-simple.js)' },
    { expr: 'esc(sufijo(t))', motivo: 'htmlPendientesCompletar(): " · cerrada a la fuerza" o " · falta completar", constantes del código' },
    { expr: 'esc(horas)', motivo: 'htmlParadasTurno(): las horas salen de horaArgentina() ("HH:MM") y de textos fijos' },
    { expr: 'esc(dato)', motivo: 'htmlAccionParo(): horas, conteos y textoMinutos(); el motivo va en el sub' },
    { expr: 'esc(gente.length - vistos.length)', motivo: 'htmlOpsResumen(): un conteo' },
    { expr: 'esc(gente.length)', motivo: 'htmlOpsResumen(): un conteo' },
    { expr: 'esc(textoSinCaja(it))', motivo: 'textoSinCaja() devuelve texto constante del código (solo mira si el embolsado es ninguno): ningún dato de la base llega a la salida' },
    { expr: 'esc(p.turno.lote)', motivo: 'el lote es un integer de la base (nextval de una secuencia)' },
    { expr: "esc(horaArgentina(p.turno.abierto_en) || '—')", motivo: 'una hora HH:MM formateada por Intl, o una raya' },
    { expr: 'esc(lista.length)', motivo: 'un conteo' },
    { expr: 'esc(hora)', motivo: 'una hora HH:MM formateada por Intl, o vacío' },
    { expr: "esc(horaArgentina(m.hora) || '—')", motivo: 'una hora HH:MM formateada por Intl, o una raya' },
    { expr: 'esc(desde)', motivo: 'una hora HH:MM formateada por Intl, o una raya' },
    { expr: "esc(horaArgentina(p.fin) || '—')", motivo: 'una hora HH:MM formateada por Intl, o una raya' },
    { expr: 'esc(dur)', motivo: 'duracionTexto() arma números y "h"/"min"' },
    { expr: 'esc(formatearNumeroAr(d.unidadesPorCaja, { decimales: 0 }))', motivo: 'formatearNumeroAr() devuelve dígitos, puntos y comas' },
    { expr: 'esc(formatearNumeroAr(it.cajas, { decimales: 0 }))', motivo: 'formatearNumeroAr() devuelve dígitos, puntos y comas' },
    { expr: 'esc(formatearNumeroAr(it.unidades, { decimales: 0 }))', motivo: 'formatearNumeroAr() devuelve dígitos, puntos y comas' },
    { expr: 'esc(formatearNumeroAr(t.cajas, { decimales: 0 }))', motivo: 'formatearNumeroAr() devuelve dígitos, puntos y comas' },
    { expr: 'esc(formatearNumeroAr(t.unidades, { decimales: 0 }))', motivo: 'formatearNumeroAr() devuelve dígitos, puntos y comas' },
    { expr: 'esc(x.n)', motivo: 'el número del paso, un índice del map' },
    // (esc(x.titulo) es constante en htmlPasosAgregar; en htmlFaltaCierre
    // trae el texto de la base o el nombre del producto, y la suite lo cubre:
    // ahí la mutación da rojo igual.)
    { expr: 'esc(x.titulo)', motivo: 'htmlPasosAgregar(): constante del código, el título de cada paso' },
    { expr: "esc(x.titulo.toLocaleUpperCase('es'))", motivo: 'htmlPasosAgregar(): el título de cada paso, constante del código' },
    { expr: 'esc(x.clave)', motivo: "constante del código: 'producto' | 'cono' | 'presentacion' | 'caja' | 'cajas'" },
    { expr: 'esc(texto)', motivo: 'HTML ya escapado por htmlResaltado(); acá es el término buscado, que sí se escapa' },
    { expr: 'esc(cuantas)', motivo: 'un conteo de presentaciones' },
    { expr: 'esc(formatearNumeroAr(pr.unidades_por_caja, { decimales: 0 }))', motivo: 'formatearNumeroAr() devuelve dígitos, puntos y comas' },
    { expr: 'esc(vivos.length)', motivo: 'un conteo' },
    { expr: 'esc((p?.masas ?? []).length)', motivo: 'un conteo' },
    { expr: 'esc(paradas)', motivo: 'un conteo' },
    { expr: 'esc(textoMinutos(min))', motivo: 'textoMinutos() arma números y "h"/"min"' },
    { expr: 'esc(formatearNumeroAr(s.cajas, { decimales: 0 }))', motivo: 'formatearNumeroAr() devuelve dígitos, puntos y comas' },
    { expr: 'esc(formatearNumeroAr(s.unidades, { decimales: 0 }))', motivo: 'formatearNumeroAr() devuelve dígitos, puntos y comas' },
    { expr: 'esc(cuantas)', motivo: 'texto armado por el código con el conteo de pendientes' },
    { expr: 'esc(dia)', motivo: 'Intl con weekday: martes, miércoles…' },
    { expr: 'esc(dm)', motivo: 'diaMes() saca dd/mm del propio ISO con una regex' },
    { expr: 'esc(quien)', motivo: 'nombrePersona() sale de estado.personal; se escapa igual en la assertion de XSS' },
  ],
  manuales: [
    // Lo producido del cierre simple (07/10/2026): una línea por producto.
    { nombre: 'lo producido del cierre, un renglón por sublote', de: "        const nombre = d ? d.producto : (it.sublote ? `Sublote ${it.sublote}` : 'Producto')", a: "        const nombre = (d ? d.producto : 'Producto') + ' ' + it.sublote" },
    { nombre: 'lo producido del cierre cuenta los anulados', de: '      const vivos = itemsVivos(p?.items)\n      if (!vivos.length) return \'<p class="pr-texto-suave">No se cargó nada producido.</p>\'', a: '      const vivos = p?.items ?? []\n      if (!vivos.length) return \'<p class="pr-texto-suave">No se cargó nada producido.</p>\'' },
    // ── Lo producido: orden, anulados, totales ──────────────────────────
    { nombre: "los sublotes salen en otro orden", de: "      return (items ?? []).map(it => htmlProducido(it, cat)).join('')", a: "      return [...(items ?? [])].reverse().map(it => htmlProducido(it, cat)).join('')" },
    { nombre: "un sublote anulado se esconde", de: "      return (items ?? []).map(it => htmlProducido(it, cat)).join('')", a: "      return itemsVivos(items).map(it => htmlProducido(it, cat)).join('')" },
    { nombre: 'el anulado suma al total', de: '      for (const it of itemsVivos(items)) {\n        cajas += it.cajas', a: '      for (const it of (items ?? [])) {\n        cajas += it.cajas' },
    { nombre: 'las unidades se recalculan contra el catálogo de hoy', de: '        unidades += it.unidades ?? 0', a: '        unidades += it.cajas * (it.unidades_por_caja ?? 0)' },
    { nombre: 'itemsVivos deja pasar los anulados', de: '      return (items ?? []).filter(it => !it.anulado)', a: '      return (items ?? [])' },
    { nombre: "un anulado igual ofrece corregir y borrar", de: "      const botones = it.cola ? htmlEstadoColaFila(it.cola) : it.anulado\n        ? '<span class=\"pr-fp__anulado\">Anulado</span>'", a: "      const botones = it.cola ? htmlEstadoColaFila(it.cola) : false\n        ? '<span class=\"pr-fp__anulado\">Anulado</span>'" },
    { nombre: "un anulado no se marca como anulado", de: "(it.anulado ? ' pr-fila-prod--anulado' : '')", a: "(false ? ' pr-fila-prod--anulado' : '')" },
    { nombre: "la presentación que ya no está no se distingue de un catálogo caído", de: "${cat ? 'Un producto que ya no está en el catálogo' : 'Producto'}", a: "${false ? 'Un producto que ya no está en el catálogo' : 'Producto'}" },

    // ── Corregir y anular ───────────────────────────────────────────────
    { nombre: 'corregir sin motivo', de: "      if (motivo.length < 3) { err.textContent = 'Escribí por qué, con tres letras por lo menos.'; err.hidden = false; return }\n      const cajas = leerCampoNumero", a: "      if (false) { err.textContent = 'Escribí por qué, con tres letras por lo menos.'; err.hidden = false; return }\n      const cajas = leerCampoNumero" },
    { nombre: 'corregir con un motivo de dos letras', de: "      if (motivo.length < 3) { err.textContent = 'Escribí por qué, con tres letras por lo menos.'; err.hidden = false; return }\n      const cajas = leerCampoNumero", a: "      if (motivo.length < 1) { err.textContent = 'Escribí por qué, con tres letras por lo menos.'; err.hidden = false; return }\n      const cajas = leerCampoNumero" },
    { nombre: 'corregir manda el motivo sin recortar', de: "      const motivo = document.getElementById('pr-corregir-motivo').value.trim()", a: "      const motivo = document.getElementById('pr-corregir-motivo').value" },
    { nombre: 'corregir acepta cero cajas', de: "      if (c.modo === 'corregir' && (!Number.isInteger(cajas) || cajas <= 0)) {", a: '      if (false) {' },
    { nombre: 'anular manda las cajas como si fuera una corrección', de: "          ? await supabase.rpc('anular_produccion_item', { p_item_id: c.id, p_motivo: motivo })", a: "          ? await supabase.rpc('corregir_produccion_item', { p_item_id: c.id, p_cajas: cajas, p_motivo: motivo })" },
    { nombre: 'borrar igual pide cajas', de: "      document.getElementById('pr-corregir-campo-cajas').hidden = modo === 'anular'", a: "      document.getElementById('pr-corregir-campo-cajas').hidden = false" },
    { nombre: 'el error de corregir se tapa con un genérico', de: "          : (e?.message || 'No se pudo guardar el cambio.')", a: "          : 'No se pudo guardar el cambio.'" },
    { nombre: 'el panel se cierra aunque la base rechace', de: '        guardado = true\n        await recargarPlanilla()\n        cerrarCorregir()', a: '        cerrarCorregir()\n        guardado = true\n        await recargarPlanilla()' },

    // ── Registrar un producto ───────────────────────────────────────────
    { nombre: 'registrar pierde el cono', de: "p_presentacion_id: a.presentacionId, p_marca_id: a.marcaId ?? null, p_cajas: a.cajas,", a: 'p_presentacion_id: a.presentacionId, p_marca_id: null, p_cajas: a.cajas,' },
    { nombre: 'registrar sin cajas', de: '      if (!Number.isInteger(a.cajas) || a.cajas <= 0) { err.textContent', a: '      if (false) { err.textContent' },
    { nombre: 'no se dice el sublote que devolvió la base', de: "`Sublote ${r.data?.sublote ?? ''} cargado.`", a: "'Listo.'" },
    { nombre: 'no se vuelve a la planilla después de cargar', de: "        await repintarConCola()\n      }\n      mostrarVista('pr-planilla')\n", a: "        await repintarConCola()\n      }\n" },

    // ── Los pasos ───────────────────────────────────────────────────────
    { nombre: "sin cono el paso del cono no dice \"Sin cono\"", de: "(a.conCono ? (marca ? marca.nombre : 'Común') : 'Sin cono')", a: "(a.conCono ? (marca ? marca.nombre : 'Común') : '')" },
    { nombre: "un paso que falta ya muestra un valor", de: "const valor = x.estado === 'actual' ? 'elegí abajo' : (x.estado === 'hecho' ? x.valor : '—')", a: "const valor = x.estado === 'actual' ? 'elegí abajo' : (x.valor || '—')" },
    { nombre: "los pasos hechos no se pueden tocar", de: "if (x.estado === 'hecho') return `<button type=\"button\" class=\"pr-paso pr-paso--hecho\" data-paso-ag=\"${esc(x.clave)}\">${cuerpo}</button>`", a: "if (x.estado === 'hecho') return `<div class=\"pr-paso pr-paso--hecho\">${cuerpo}</div>`" },
    { nombre: 'elegir otro producto deja la presentación del anterior', de: "      if (a.productoId !== id) { a.conCono = null; a.presentacionId = ''; a.marcaId = null; a.marcaElegida = false; soltarCaja(a) }", a: '      if (false) { a.conCono = null }' },
    { nombre: "volver al cono borra la presentación", de: "      if (a.conCono !== true) { a.presentacionId = ''; soltarCaja(a) }", a: "      if (true) { a.presentacionId = ''; soltarCaja(a) }" },
    { nombre: "con cono se saltea el paso del cono", de: "      } else {\n        a.paso = 'cono'\n      }", a: "      } else {\n        a.paso = 'presentacion'\n      }" },
    { nombre: 'elegir "Común" no cuenta como elegir', de: '      a.marcaId = id || null\n      a.marcaElegida = true', a: '      a.marcaId = id || null\n      a.marcaElegida = !!id' },
    // (28/09/2026) Tres columnas: el cono ocupa la columna de las opciones, solo.
    { nombre: "el cono se sigue viendo después de elegirlo", de: "      cono.hidden = a.paso !== 'cono'", a: "      cono.hidden = !a.conCono && a.paso !== 'cono'" },
    { nombre: 'la grilla cambia con el cono', de: "      document.getElementById('pr-ag-grilla').className = 'pr-ag'\n", a: "      document.getElementById('pr-ag-grilla').className = 'pr-ag' + (cono.hidden ? '' : ' pr-ag--cono-cajas')\n" },

    // ── Chocolate ───────────────────────────────────────────────────────
    { nombre: "los de chocolate no se separan", de: "<span class=\"pr-ag__rotulo\">DE CHOCOLATE</span>", a: "" },
    { nombre: "los de chocolate van arriba", de: "      return { comunes: todos.filter(p => !esProductoChocolate(p)), chocolate: todos.filter(p => esProductoChocolate(p)) }", a: "      return { comunes: todos.filter(p => esProductoChocolate(p)), chocolate: todos.filter(p => !esProductoChocolate(p)) }" },
    { nombre: 'el chocolate se adivina por el nombre', de: "      return normalizarBusqueda(p?.tipo_masa).includes('chocolate')", a: "      return normalizarBusqueda(p?.nombre).includes('chocolate')" },
    { nombre: "el grupo de chocolate se dibuja siempre", de: "(chocolate.length ? `<span class=\"pr-ag__rotulo\">DE CHOCOLATE</span>", a: "(true ? `<span class=\"pr-ag__rotulo\">DE CHOCOLATE</span>" },

    // ── Presentaciones y conos ──────────────────────────────────────────
    { nombre: 'las presentaciones no se filtran por con cono', de: '      return (cat?.presentaciones ?? []).filter(pr => pr.producto_id === productoId && (conCono === null || conCono === undefined || pr.con_cono === conCono))', a: '      return (cat?.presentaciones ?? []).filter(pr => pr.producto_id === productoId)' },
    { nombre: "\"Sin cono\" se puede tocar sin presentaciones sin cono", de: "        bSin.disabled = !sinCono", a: "        bSin.disabled = false" },
    { nombre: 'el cono del sublote anterior no se dice', de: "        const notas = (anterior && anterior.marcaId === m.id ? `<span class=\"pr-cono__nota\">el de ${esc(anterior.sublote)}</span>` : '') +", a: "        const notas = '' +" },
    { nombre: 'el cono anterior sale del primero y no del último', de: '      const ult = conMarca[conMarca.length - 1]', a: '      const ult = conMarca[0]' },
    { nombre: 'el cono anterior cuenta los anulados', de: '      const conMarca = itemsVivos(items).filter(it => it.marca_id)', a: '      const conMarca = (items ?? []).filter(it => it.marca_id)' },
    { nombre: "sin \"Común\" no se puede cargar un cono sin marca", de: "? `<button type=\"button\" class=\"pr-cono pr-cono--comun\" data-marca=\"\"", a: "? `<span class=\"pr-cono pr-cono--comun\" data-nada=\"\"" },
    { nombre: 'el buscador de conos distingue acentos', de: "      return String(t ?? '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase()", a: "      return String(t ?? '').toLowerCase()" },
    { nombre: 'una búsqueda sin resultados no dice nada', de: '      const nada = texto && !lista.length ?', a: '      const nada = false ?' },
    { nombre: 'la coincidencia no va en negrita', de: '          `<span>${htmlResaltado(m.nombre, texto)}</span>${notas}</button>`', a: '          `<span>${esc(m.nombre)}</span>${notas}</button>`' },

    // ── Cono nuevo ──────────────────────────────────────────────────────
    { nombre: 'un cono nuevo no se marca como pendiente', de: "          (m.estado_alta === 'pendiente_revision' ? '<span class=\"pr-cono__pendiente\">nuevo, a revisar</span>' : '')", a: "          ''" },
    { nombre: 'un cono nuevo no queda elegido', de: "        elegirCono(id)\n      } catch (e) {\n        console.error('proponer_marca:', e)", a: "        pintarAgregar()\n      } catch (e) {\n        console.error('proponer_marca:', e)" },
    { nombre: 'el cono nuevo viaja sin recortar', de: '      const nombre = campo.value.trim()', a: '      const nombre = campo.value' },
    { nombre: 'un cono sin nombre igual se manda', de: "      if (!nombre) { err.textContent = 'Escribí el nombre del cono.'; err.hidden = false; return }", a: '' },
    { nombre: 'un cono que ya existía y no está activo se agrega igual', de: "          if (data?.ya_existia) throw new Error(", a: "          if (false) throw new Error(" },
    { nombre: 'el error de proponer_marca se tapa', de: "        err.textContent = e?.message || 'No se pudo agregar el cono.'", a: "        err.textContent = 'No se pudo agregar el cono.'" },

    { nombre: 'los campos se enlazan recién al cerrar', de: '      enlazarCamposPlanilla()\n      const pedidoPlanilla', a: '      const pedidoPlanilla' },
    { nombre: 'las cajas se enlazan con decimales', de: "      enlazarCampoNumero(document.getElementById('pr-agregar-cajas'), { decimales: 0 })", a: "      enlazarCampoNumero(document.getElementById('pr-agregar-cajas'), { decimales: 3 })" },
    { nombre: 'el scrap se enlaza sin decimales', de: "      enlazarCampoNumero(document.getElementById('pr-cierre-scrap'), { decimales: 3 })", a: "      enlazarCampoNumero(document.getElementById('pr-cierre-scrap'), { decimales: 0 })" },

    // ── Cajas ───────────────────────────────────────────────────────────
    { nombre: 'las cajas pueden bajar de cero', de: '      ponerNumero(campo, Math.max(0, (leerCampoNumero(campo) ?? 0) + delta))', a: '      ponerNumero(campo, (leerCampoNumero(campo) ?? 0) + delta)' },
    { nombre: "el cálculo no multiplica", de: "? `${formatearNumeroAr(a.cajas * pr.unidades_por_caja, { decimales: 0 })} unidades`", a: "? `${formatearNumeroAr(a.cajas, { decimales: 0 })} unidades`" },

    // ── La planilla: paradas y botones ──────────────────────────────────
    { "nombre": "se puede parar dos veces", "de": "return p?.turno?.estado === 'abierto' && !paradaEnCurso(p?.paradas)", "a": "return p?.turno?.estado === 'abierto'" },
    { nombre: "cerrar se bloquea con una parada en curso", de: "        const off = (sec.deMaquina && !hay) ||", a: "        const off = (sec.deMaquina && !hay) || (sec.id === 'cierre' && parada) ||" },
    { nombre: 'el cierre no se abre con una parada en curso', de: '    async function mostrarCierre() {\n      const p = estado.planilla\n      if (!p) return', a: '    async function mostrarCierre() {\n      const p = estado.planilla\n      if (!p || paradaEnCurso(p.paradas)) return' },
    { nombre: "la parada en curso no va primera", de: "      const orden = [...lista.filter(p => !p.fin), ...[...lista.filter(p => p.fin)]", a: "      const orden = [...[...lista]" },
    // Terminar la tablet, parte 4: el renglón suma la clase del botón de corregir (conAcc/abre).
    { "nombre": "la parada en curso no se marca", "de": "${p.fin ? '' : ' pr-parada-item--curso'}", "a": "" },
    { nombre: 'la franja de parada no aparece', de: "      document.getElementById('pr-parada-activa').hidden = !enCurso", a: "      document.getElementById('pr-parada-activa').hidden = true" },
    { nombre: 'la franja no dice hace cuánto', de: "      document.getElementById('pr-parada-activa-hace').textContent = enCurso", a: "      document.getElementById('pr-parada-activa-hace').textContent = false" },

    // ── Masas ───────────────────────────────────────────────────────────
    { nombre: "el resumen de masas toma la primera como última", de: "      const ultima = lista[lista.length - 1]\n      const quien = ultima ? apellidoDe(ultima.masero_id)", a: "      const ultima = lista[0]\n      const quien = ultima ? apellidoDe(ultima.masero_id)" },
    { nombre: "las masas anuladas también cuentan", de: "es_chocolate, masero_id, descartada, descarte_motivo').eq('turno_id', turnoId).eq('anulada', false).order('nro')", a: "es_chocolate, masero_id, descartada, descarte_motivo').eq('turno_id', turnoId).order('nro')" },
    { nombre: "el resumen de masas no dice las de chocolate", de: "(choco ? `${choco} de chocolate` : (lista.length === 1", a: "(false ? `${choco} de chocolate` : (lista.length === 1" },
    { nombre: "las masas se pueden tocar desde la planilla", de: "<div class=\"pr-res pr-res--masas\" id=\"pr-planilla-masas\"></div>", a: "<button type=\"button\" class=\"pr-res pr-res--masas\" id=\"pr-planilla-masas\"></button>" },

    // ── El total parado ─────────────────────────────────────────────────
    { nombre: 'la parada en curso no cuenta en el total', de: '        const a = new Date(p.inicio), b = p.fin ? new Date(p.fin) : ahora\n        if (Number.isNaN(a.getTime())', a: '        if (!p.fin) continue\n        const a = new Date(p.inicio), b = new Date(p.fin)\n        if (Number.isNaN(a.getTime())' },
    { nombre: 'una parada ilegible rompe el total', de: '        if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) continue', a: '        if (false) continue' },

    // ── El cierre ───────────────────────────────────────────────────────
    { nombre: 'scrap no obligatorio', de: "      if (b.scrap == null) faltan.push({ campo: 'scrap', error: 'Falta el scrap. Si no hubo, poné 0.', nota: 'Si no hubo, poné 0.' })\n", a: '' },
    { nombre: 'scrap 0 cuenta como vacío', de: '      if (b.scrap == null) faltan.push({ campo: \'scrap\'', a: '      if (!b.scrap) faltan.push({ campo: \'scrap\'' },
    { nombre: 'scrap negativo pasa', de: "      else if (b.scrap < 0) faltan.push({ campo: 'scrap', error: 'El scrap no puede ser negativo.', nota: 'No puede ser negativo.' })\n", a: '' },
    { nombre: 'hora no obligatoria', de: "      if (!normalizarHora(b.hora)) {\n        faltan.push({ campo: 'hora'", a: "      if (false) {\n        faltan.push({ campo: 'hora'" },
    { nombre: 'una hora imposible se acepta', de: '      if (h > 23 || min > 59) return \'\'', a: '      if (false) return \'\'' },
    { nombre: "el botón se deshabilita cuando falta algo del formulario", de: "      enviar.disabled = !!estado.cerrando || bloquea > 0", a: "      enviar.disabled = !!estado.cerrando || bloquea > 0 || faltan.length > 0" },
    { nombre: "los bloqueos de la base no traban el botón", de: "      enviar.disabled = !!estado.cerrando || bloquea > 0", a: "      enviar.disabled = !!estado.cerrando" },
    { nombre: 'el error no va pegado al botón', de: '      err.textContent = texto\n      err.hidden = !texto', a: "      err.textContent = ''\n      err.hidden = true" },
    { nombre: 'el error de la base se tapa al repintar', de: "      const texto = (faltan.length && b.intentado) ? faltan.map(f => f.error).join(' ') : (b.errorBase || '')", a: "      const texto = (faltan.length && b.intentado) ? faltan.map(f => f.error).join(' ') : ''" },
    { nombre: 'el error de la base se pierde', de: "        estado.cierre.errorBase = e?.message || 'No se pudo cerrar la planilla. Lo que cargaste quedó guardado en esta tablet.'", a: "        estado.cierre.errorBase = 'No se pudo cerrar la planilla.'" },
    { nombre: "el campo que falta no se marca", de: "document.getElementById(id).className = 'pr-cierre-caja' + extra + (marcados.has(campo) ? ' pr-campo--mal' : '')", a: "document.getElementById(id).className = 'pr-cierre-caja' + extra" },
    { nombre: 'el campo se marca antes de intentar', de: '      const marcados = new Set(b.intentado ? faltan.map(f => f.campo) : [])', a: '      const marcados = new Set(faltan.map(f => f.campo))' },
    { nombre: 'la hora del cierre no queda en el botón', de: "      botonHora.textContent = hora || 'Tocá para poner la hora'", a: "      botonHora.textContent = 'Tocá para poner la hora'" },
    { nombre: 'sin hora se manda', de: "        faltan.push({ campo: 'hora', error: 'Falta a qué hora terminó de producir.', nota: 'Tocá para poner la hora.' })", a: '' },
    { nombre: 'la hora no da la vuelta en medianoche', de: '      const total = ((Number(base.slice(0, 2)) * 60 + Number(base.slice(3)) + minutos) % 1440 + 1440) % 1440', a: '      const total = Number(base.slice(0, 2)) * 60 + Number(base.slice(3)) + minutos' },
    { nombre: 'el scrap puede bajar de cero', de: '      ponerNumero(campo, Math.max(0, redondearKg((leerCampoNumero(campo) ?? 0) + kg)))', a: '      ponerNumero(campo, redondearKg((leerCampoNumero(campo) ?? 0) + kg))' },
    { nombre: 'la hora viaja sin normalizar', de: '        p_hora_apagado: normalizarHora(b.hora),', a: '        p_hora_apagado: b.hora,' },
    { nombre: 'las observaciones vacías viajan como texto', de: "        p_observaciones: b.obs.trim() === '' ? null : b.obs.trim(),", a: '        p_observaciones: b.obs,' },
    { nombre: 'el cierre manda productos', de: '        p_productos: [],', a: '        p_productos: [{ presentacion_id: null, cajas: 1 }],' },
    { nombre: "se manda aunque falte algo", de: "      if (faltanParaCerrar(b).length || bloqueosCierre() > 0) return\n", a: "      if (bloqueosCierre() > 0) return\n" },
    { nombre: "con bloqueos de la base se manda igual", de: "      if (faltanParaCerrar(b).length || bloqueosCierre() > 0) return\n", a: "      if (faltanParaCerrar(b).length) return\n" },

    // ── Los avisos antes de cerrar ──────────────────────────────────────
    { nombre: 'la parada abierta no se avisa', de: '      if (enCurso) {\n        avisos.push(', a: '      if (false) {\n        avisos.push(' },
    { nombre: 'el aviso de la parada no dice el motivo', de: '        avisos.push(`Quedó una parada sin terminar ("${enCurso.motivo}", desde ${horaArgentina(enCurso.inicio) || \'—\'}). ` +', a: '        avisos.push(`Quedó una parada sin terminar. ` +' },
    { nombre: 'no se avisa que la máquina no produjo', de: "      if (!itemsVivos(p?.items).length) avisos.push('No cargaste nada producido. ¿Seguro que esta máquina no produjo?')\n", a: '' },
    { nombre: 'se avisa aunque haya producido', de: '      if (!itemsVivos(p?.items).length) avisos.push(', a: '      if (true) avisos.push(' },
    { nombre: 'se manda sin preguntar', de: '      if (avisos.length && !b.confirmado) {', a: '      if (false) {' },
    { nombre: 'se pregunta siempre, aunque ya se confirmó', de: '      if (avisos.length && !b.confirmado) {', a: '      if (avisos.length) {' },

    // ── El borrador ─────────────────────────────────────────────────────
    { nombre: 'no guarda el borrador', de: "      guardarBorradorCierre(estado.planilla.turno.id, { hora: b.hora, scrap: b.scrap, obs: b.obs, paroAntes: !!b.paroAntes, motivoId: b.motivoId ?? null, motivoDetalle: b.motivoDetalle ?? '' })\n", a: '' },
    { nombre: 'el borrador pierde la hora', de: '{ hora: b.hora, scrap: b.scrap, obs: b.obs, paroAntes:', a: "{ hora: '', scrap: b.scrap, obs: b.obs, paroAntes:" },
    { nombre: 'no recupera el borrador', de: '      const guardado = leerBorradorCierre(p.turno.id)', a: '      const guardado = null' },
    { nombre: 'el borrador se borra aunque falle', de: "        // A la cola, con la hora que se eligió adentro de los parámetros.\n        const r = await mandarCarga({", a: "        guardarPreferencia(claveBorradorCierre(turnoId), null)\n        const r = await mandarCarga({" },
    { nombre: 'el borrador no se borra al cerrar', de: '        // Recién ahora se borra el borrador: la base (o la cola) ya tiene todo.\n        guardarPreferencia(claveBorradorCierre(turnoId), null)\n', a: '' },
    { nombre: 'un JSON roto rompe', de: '      } catch { return null }\n    }\n\n    function guardarBorradorCierre', a: '      } finally {}\n    }\n\n    function guardarBorradorCierre' },
    { nombre: 'un scrap que no es número se acepta', de: "          scrap: typeof b.scrap === 'number' && Number.isFinite(b.scrap) ? b.scrap : null,", a: '          scrap: b.scrap ?? null,' },
    { nombre: 'un cambio no limpia el error de la base', de: "      b.errorBase = ''\n      guardarBorradorCierre", a: '      guardarBorradorCierre' },

    // ── Los sublotes del final ──────────────────────────────────────────
    { nombre: 'la lista final incluye los anulados', de: '      const deAntes = itemsVivos(items).map(it =>', a: '      const deAntes = (items ?? []).map(it =>' },
    { nombre: 'la lista final olvida lo cargado durante el turno', de: '      const subs = [...deAntes, ...(Array.isArray(res?.sublotes) ? res.sublotes : [])]', a: '      const subs = [...(Array.isArray(res?.sublotes) ? res.sublotes : [])]' },
    { nombre: 'lo que agrega el cierre va primero', de: '      const subs = [...deAntes, ...(Array.isArray(res?.sublotes) ? res.sublotes : [])]', a: '      const subs = [...(Array.isArray(res?.sublotes) ? res.sublotes : []), ...deAntes]' },

    // ── Cerrar a la fuerza ──────────────────────────────────────────────
    { nombre: 'forzar sin motivo', de: "      if (motivo.length < 3) { err.textContent = 'Escribí por qué, con tres letras por lo menos.'; err.hidden = false; return }\n      // p_persona_id", a: "      if (false) { err.textContent = 'x'; err.hidden = false; return }\n      // p_persona_id" },
    { nombre: 'forzar con un motivo de dos letras', de: "      if (motivo.length < 3) { err.textContent = 'Escribí por qué, con tres letras por lo menos.'; err.hidden = false; return }\n      // p_persona_id", a: "      if (motivo.length < 1) { err.textContent = 'x'; err.hidden = false; return }\n      // p_persona_id" },
    { nombre: 'forzar manda el motivo sin recortar', de: "      const motivo = document.getElementById('pr-forzar-motivo').value.trim()", a: "      const motivo = document.getElementById('pr-forzar-motivo').value" },
    { nombre: 'forzar no manda la persona de la tablet', de: "        const { error } = await supabase.rpc('forzar_cierre_turno', { p_turno_id: p.turno.id, p_persona_id: persona, p_motivo: motivo })", a: "        const { error } = await supabase.rpc('forzar_cierre_turno', { p_turno_id: p.turno.id, p_persona_id: estado.miEmpleadoId, p_motivo: motivo })" },
    // Terminar la tablet, parte 2: entre el éxito y el tablero ahora va
    // maquinaCerrada(), que saca la máquina de Sala de masa.
    { nombre: 'forzar no vuelve al tablero', de: "        await maquinaCerrada(p.turno.id)\n        await mostrarTablero()", a: '        await maquinaCerrada(p.turno.id)' },
    { nombre: 'una planilla de otro día no se dice', de: "      if (t.estado === 'abierto' && /^\\d{4}-\\d{2}-\\d{2}$/.test(String(t.fecha ?? '')) && String(t.fecha) < String(hoy)) {", a: '      if (false) {' },
    { nombre: 'una planilla de hoy también ofrece cerrar a la fuerza', de: "&& String(t.fecha) < String(hoy)) {", a: '&& true) {' },
    { nombre: 'la pendiente de completar no se dice', de: "      if (t.estado === 'pendiente_completar') {", a: '      if (false) {' },
    { nombre: 'la pendiente no dice quién ni por qué', de: "          `Esta planilla se cerró a la fuerza${quien === '—' ? '' : ` (${esc(quien)})`}${motivo ? `: ${esc(motivo)}` : ''}. ` +", a: '          \'Esta planilla se cerró a la fuerza. \' +' },
    { nombre: 'la pendiente no avisa que el stock todavía no entró', de: "          'La máquina quedó libre, pero <strong>lo que produjo todavía no está en el stock</strong>. ' +", a: "          'La máquina quedó libre. ' +" },
    { nombre: "el botón no dice \"Completar la planilla\"", de: "enviar.textContent = p.turno.estado === 'pendiente_completar' ? 'Completar la planilla' : 'Cerrar planilla'", a: "enviar.textContent = 'Cerrar planilla'" },
    { nombre: "el cierre no dice que se está completando", de: "case 'pr-cierre': return { ctx: ctxPlanilla, titulo: pendiente ? 'Completar la planilla' : 'Cerrar planilla' }", a: "case 'pr-cierre': return { ctx: ctxPlanilla, titulo: 'Cerrar planilla' }" },

    // ── Pendientes de completar en el tablero ───────────────────────────
    { nombre: 'el tablero no avisa de las pendientes', de: '        aviso.innerHTML = htmlPendientesCompletar(await leerPendientesCompletar(estado.unidadId), estado.tablero.map(e => e.maquina))', a: '        await leerPendientesCompletar(estado.unidadId)' },
    { nombre: 'las pendientes se piden sin filtrar por estado', de: ".eq('unidad_negocio_id', unidadId).eq('estado', 'pendiente_completar').order('fecha')", a: ".eq('unidad_negocio_id', unidadId).order('fecha')" },
    { nombre: 'el aviso de pendientes se dibuja sin ninguna', de: '      if (!lista.length) return \'\'\n      const nombre = id =>', a: '      const nombre = id =>' },
    { nombre: 'el aviso de pendientes no lleva a la planilla', de: '`<button type="button" class="pr-btn pr-btn--peligro" data-planilla="${esc(t.id)}">', a: '`<span class="pr-btn pr-btn--peligro" data-nada="${esc(t.id)}">' },

    // ── Sin catálogo ────────────────────────────────────────────────────
    { nombre: "sin catálogo igual se puede agregar", de: "        b.disabled = !p || !estado.catalogo", a: "        b.disabled = !p" },
    // ── La planta con dos modos: 6b y 7 ─────────────────────────────────
    { nombre: "6b sin \"hace cuánto\"", de: "textContent = enCurso && haceParada ? ` · hace ${haceParada}` : ''", a: "textContent = ''" },
    { "nombre": "6b sin \"¿Por qué paró?\"", "de": "<span class=\"pr-pa-paso__n\">1</span>¿Por qué paró?</h2>", "a": "<span class=\"pr-pa-paso__n\">1</span>¿Por qué se para?</h2>" },
    { nombre: "7 sin lo que falta del formulario", de: "if (b?.intentado) for (const f of faltanParaCerrar(b)) avisos.push", a: "if (false) for (const f of faltanParaCerrar(b)) avisos.push" },
    { nombre: "7 no dibuja los avisos de la base (la parada sin terminar)", de: "        } else if (f?.nivel === 'aviso') {", a: "        } else if (false) {" },
    { nombre: "7 no avisa que no hay nada producido", de: "      if (p && !itemsVivos(p.items).length) avisos.push", a: "      if (false) avisos.push" },
    { nombre: "7 lo del formulario nunca en bordó", de: "avisos.push({ texto: f.error, ir: '', boton: '', mal: true })", a: "avisos.push({ texto: f.error, ir: '', boton: '' })" },
    { nombre: "7 lo del formulario se dice antes de intentar", de: "if (b?.intentado) for (const f of faltanParaCerrar(b))", a: "for (const f of faltanParaCerrar(b))" },
    { nombre: "7 sin el botón para ir a la sección", de: "(x.ir ? `<button type=\"button\" class=\"pr-falta__link\" data-cierre-ir=\"${esc(x.ir)}\">${esc(x.boton)}</button>` : '')", a: "''" },
    { nombre: "7 dice \"no falta nada\" aunque falte", de: "      if (!bloques.length && !avisos.length) return '<p class=\"pr-falta__listo\">No falta nada: se puede cerrar.</p>'", a: "      return '<p class=\"pr-falta__listo\">No falta nada: se puede cerrar.</p>'" },
    { nombre: "7 no se pinta", de: "      document.getElementById('pr-cierre-falta').innerHTML = htmlFaltaCierre(b, p)\n", a: "" },
    { nombre: "7 el botón no lleva a la sección", de: "const b = ev.target.closest('[data-cierre-ir]'); if (b) irDesdeCierre(b.dataset.cierreIr)", a: "const b = ev.target.closest('[data-cierre-ir]'); void b" },
    { nombre: "7 un bloqueo de la base no se dibuja", de: "        if (f?.nivel === 'bloquea') {", a: "        if (false) {" },
    { nombre: "7 el bloqueo de chocolate no ofrece ir a Sala de masa", de: "          if (f.clave === 'chocolate_sin_masa') {", a: "          if (false) {" },
    { nombre: "7 no se dice cuántas cosas faltan", de: "      aviso.hidden = !bloquea\n", a: "      aviso.hidden = true\n" },
    { nombre: "7 que_falta_para_cerrar sin el turno", de: "supabase.rpc('que_falta_para_cerrar', { p_turno_id: p.turno.id })", a: "supabase.rpc('que_falta_para_cerrar', {})" },
    { nombre: "7 scrap_de_referencia sin el turno", de: "supabase.rpc('scrap_de_referencia', { p_turno_id: p.turno.id })", a: "supabase.rpc('scrap_de_referencia', {})" },
    { nombre: "7 un error de que_falta se toma como que no falta nada", de: "        }).catch(err => { console.error('que_falta_para_cerrar:', err); base.errorFalta = true }),", a: "        }).catch(err => { console.error('que_falta_para_cerrar:', err) })," },
    { nombre: "7 cuenta los avisos como bloqueos", de: "      return (Array.isArray(base?.falta) ? base.falta : []).filter(f => f?.nivel === 'bloquea').length", a: "      return (Array.isArray(base?.falta) ? base.falta : []).length" },
    { nombre: "7 scrap alto con menos de 5 turnos", de: "      if (scrap == null || !Number.isFinite(prom) || prom <= 0 || !(n >= 5)) return false", a: "      if (scrap == null || !Number.isFinite(prom) || prom <= 0 || !(n >= 1)) return false" },
    { nombre: "7 scrap alto desde 1,5 veces", de: "      return Number(scrap) >= 2 * prom", a: "      return Number(scrap) >= 1.5 * prom" },
    { nombre: "7 el scrap alto no se avisa", de: "      if (scrapAlto(b?.scrap, base?.scrapRef)) avisos.push", a: "      if (false) avisos.push" },
    { nombre: 'abrir agregar sin catálogo', de: '      if (!estado.catalogo || !estado.planilla) return\n      estado.agregar = {', a: '      if (!estado.planilla) return\n      estado.agregar = {' },
  ],
})
