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
    'htmlLotePlanilla', 'htmlQuePlanilla', 'htmlEstadoPlanilla', 'htmlMasasPlanilla', 'htmlParadas',
    'htmlProducido', 'htmlTotalTurno', 'htmlPasosAgregar', 'htmlPasoProducto', 'htmlPasoConoSiNo',
    'htmlPasoPresentacion', 'htmlMarcas', 'htmlAvisosCierre', 'htmlResumenCierre', 'htmlSublotesDefinitivos',
    'htmlPendientesCompletar', 'mostrarFormParada',
  ],
  equivalentes: [
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
    { expr: 'esc(x.titulo)', motivo: 'constante del código: el título de cada paso' },
    { expr: 'esc(x.clave)', motivo: "constante del código: 'producto' | 'cono_si_no' | 'presentacion' | 'cono' | 'cajas'" },
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
    // ── Lo producido: orden, anulados, totales ──────────────────────────
    { nombre: 'los sublotes salen en otro orden', de: '      return items.map(it => htmlProducido(it, cat)).join(\'\')', a: '      return [...items].reverse().map(it => htmlProducido(it, cat)).join(\'\')' },
    { nombre: 'un sublote anulado se esconde', de: '      if (!(items ?? []).length) {\n        return \'<p class="pr-texto-suave">Todavía no cargaste nada producido.', a: '      items = itemsVivos(items)\n      if (!(items ?? []).length) {\n        return \'<p class="pr-texto-suave">Todavía no cargaste nada producido.' },
    { nombre: 'el anulado suma al total', de: '      for (const it of itemsVivos(items)) {\n        cajas += it.cajas', a: '      for (const it of (items ?? [])) {\n        cajas += it.cajas' },
    { nombre: 'las unidades se recalculan contra el catálogo de hoy', de: '        unidades += it.unidades ?? 0', a: '        unidades += it.cajas * (it.unidades_por_caja ?? 0)' },
    { nombre: 'itemsVivos deja pasar los anulados', de: '      return (items ?? []).filter(it => !it.anulado)', a: '      return (items ?? [])' },
    { nombre: 'un anulado igual ofrece corregir y borrar', de: '      const botones = it.anulado\n        ? \'<span class="pr-producido__detalle">Anulado</span>\'\n        : ', a: '      const botones = false\n        ? \'<span class="pr-producido__detalle">Anulado</span>\'\n        : ' },
    { nombre: 'un anulado no se marca como anulado', de: "      const clases = 'pr-producido' + (it.anulado ? ' pr-producido--anulado' : '')", a: "      const clases = 'pr-producido' + (false ? ' pr-producido--anulado' : '')" },
    { nombre: 'la presentación que ya no está no se distingue de un catálogo caído', de: '        : (cat\n          ? ', a: '        : (false\n          ? ' },

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
    { nombre: 'no se dice el sublote que devolvió la base', de: "        mostrarExito(`Sublote ${data?.sublote ?? ''} cargado.`)", a: "        mostrarExito('Listo.')" },
    { nombre: 'no se vuelve a la planilla después de cargar', de: "        await recargarPlanilla()\n        mostrarVista('pr-planilla')", a: '        await recargarPlanilla()' },

    // ── Los pasos ───────────────────────────────────────────────────────
    { nombre: 'sin cono el paso del cono aparece igual', de: "      if (a.conCono !== false) pasos.push({ clave: 'cono'", a: "      if (true) pasos.push({ clave: 'cono'" },
    { nombre: 'un paso que falta ya muestra un valor', de: "        return `<div class=\"pr-paso-bloque pr-paso-bloque--falta\">${esc(x.n)} · ${esc(x.titulo)}</div>`", a: '        return `<div class="pr-paso-bloque pr-paso-bloque--falta">${cab}${valor}</div>`' },
    { nombre: 'los pasos hechos no se pueden tocar', de: "        if (x.estado === 'hecho') return `<button type=\"button\" class=\"pr-paso-bloque\" data-paso-ag=\"${esc(x.clave)}\">${cab}${valor}</button>`", a: "        if (x.estado === 'hecho') return `<div class=\"pr-paso-bloque\">${cab}${valor}</div>`" },
    { nombre: 'elegir otro producto deja la presentación del anterior', de: "      if (a.productoId !== id) { a.conCono = null; a.presentacionId = ''; a.marcaId = null; a.marcaElegida = false; soltarCaja(a) }", a: '      if (false) { a.conCono = null }' },
    { nombre: 'volver a contestar lo mismo borra lo de abajo', de: "      if (a.conCono !== v) { a.presentacionId = ''; a.marcaId = null; a.marcaElegida = false; soltarCaja(a) }", a: "      if (true) { a.presentacionId = ''; a.marcaId = null; a.marcaElegida = false; soltarCaja(a) }" },
    { nombre: 'con cono se saltea el paso del cono', de: "      a.paso = a.conCono ? 'cono' : (a.cajaElegida ? 'cajas' : 'caja')", a: "      a.paso = 'cajas'" },
    { nombre: 'elegir "Común" no cuenta como elegir', de: '      a.marcaId = id || null\n      a.marcaElegida = true', a: '      a.marcaId = id || null\n      a.marcaElegida = !!id' },
    { nombre: 'sin cono igual se muestra el panel del cono', de: '      cono.hidden = !(a.conCono && enFinal)', a: '      cono.hidden = !enFinal' },
    { nombre: 'la grilla no se ensancha con el cono', de: "      document.getElementById('pr-ag-grilla').className = 'pr-ag' + (cono.hidden ? '' : ' pr-ag--cono-cajas')", a: "      document.getElementById('pr-ag-grilla').className = 'pr-ag'" },

    // ── Chocolate ───────────────────────────────────────────────────────
    { nombre: 'los de chocolate no se separan', de: "      const chocoHtml = chocolate.length\n        ? '<div class=\"pr-ag__corte\">", a: "      const chocoHtml = false\n        ? '<div class=\"pr-ag__corte\">" },
    { nombre: 'los de chocolate van arriba', de: "        `<div class=\"pr-ag__grilla\">${comunes.map(boton).join('')}</div>${chocoHtml}`", a: "        `${chocoHtml}<div class=\"pr-ag__grilla\">${comunes.map(boton).join('')}</div>`" },
    { nombre: 'el chocolate se adivina por el nombre', de: "      return normalizarBusqueda(p?.tipo_masa).includes('chocolate')", a: "      return normalizarBusqueda(p?.nombre).includes('chocolate')" },
    { nombre: 'la línea de chocolate se dibuja siempre', de: "      const chocoHtml = chocolate.length", a: '      const chocoHtml = true' },

    // ── Presentaciones y conos ──────────────────────────────────────────
    { nombre: 'las presentaciones no se filtran por con cono', de: '      return (cat?.presentaciones ?? []).filter(pr => pr.producto_id === productoId && (conCono === null || conCono === undefined || pr.con_cono === conCono))', a: '      return (cat?.presentaciones ?? []).filter(pr => pr.producto_id === productoId)' },
    { nombre: 'la opción sin presentaciones igual se puede tocar', de: "${cuantas ? '' : ' disabled'} aria-pressed=", a: ' aria-pressed=' },
    { nombre: 'el cono del sublote anterior no se dice', de: "        const notas = (anterior && anterior.marcaId === m.id ? `<span class=\"pr-cono__nota\">el de ${esc(anterior.sublote)}</span>` : '') +", a: "        const notas = '' +" },
    { nombre: 'el cono anterior sale del primero y no del último', de: '      const ult = conMarca[conMarca.length - 1]', a: '      const ult = conMarca[0]' },
    { nombre: 'el cono anterior cuenta los anulados', de: '      const conMarca = itemsVivos(items).filter(it => it.marca_id)', a: '      const conMarca = (items ?? []).filter(it => it.marca_id)' },
    { nombre: 'sin "Común" no se puede cargar sin cono', de: '      const comun = `<button type="button" class="pr-cono" data-marca=""', a: '      const comun = `<span class="pr-cono" data-nada=""' },
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

    { nombre: 'los campos se enlazan recién al cerrar', de: '      enlazarCamposPlanilla()\n      estado.planilla = null', a: '      estado.planilla = null' },
    { nombre: 'las cajas se enlazan con decimales', de: "      enlazarCampoNumero(document.getElementById('pr-agregar-cajas'), { decimales: 0 })", a: "      enlazarCampoNumero(document.getElementById('pr-agregar-cajas'), { decimales: 3 })" },
    { nombre: 'el scrap se enlaza sin decimales', de: "      enlazarCampoNumero(document.getElementById('pr-cierre-scrap'), { decimales: 3 })", a: "      enlazarCampoNumero(document.getElementById('pr-cierre-scrap'), { decimales: 0 })" },

    // ── Cajas ───────────────────────────────────────────────────────────
    { nombre: 'las cajas pueden bajar de cero', de: '      ponerNumero(campo, Math.max(0, (leerCampoNumero(campo) ?? 0) + delta))', a: '      ponerNumero(campo, (leerCampoNumero(campo) ?? 0) + delta)' },
    { nombre: 'el cálculo no multiplica', de: "        ? `${formatearNumeroAr(a.cajas * pr.unidades_por_caja, { decimales: 0 })} u` : '—'", a: "        ? `${formatearNumeroAr(a.cajas, { decimales: 0 })} u` : '—'" },

    // ── La planilla: paradas y botones ──────────────────────────────────
    { nombre: 'se puede parar dos veces', de: "      document.getElementById('pr-btn-parada').hidden = !p || !!enCurso", a: "      document.getElementById('pr-btn-parada').hidden = !p" },
    { nombre: 'cerrar se bloquea con una parada en curso', de: '      cerrar.disabled = !p\n', a: '      cerrar.disabled = !p || !!enCurso\n' },
    { nombre: 'el cierre no se abre con una parada en curso', de: '    async function mostrarCierre() {\n      const p = estado.planilla\n      if (!p) return', a: '    async function mostrarCierre() {\n      const p = estado.planilla\n      if (!p || paradaEnCurso(p.paradas)) return' },
    { nombre: 'la parada en curso no va primera', de: '      const orden = [...lista.filter(p => !p.fin), ...lista.filter(p => p.fin)]', a: '      const orden = [...lista]' },
    // Terminar la tablet, parte 4: el renglón suma la clase del botón de corregir (conAcc/abre).
    { nombre: 'la parada en curso no se marca', de: '          return `<div class="pr-renglon pr-renglon--curso${conAcc}">${abre}` +', a: '          return `<div class="pr-renglon${conAcc}">${abre}` +' },
    { nombre: 'la franja de parada no aparece', de: "      document.getElementById('pr-parada-activa').hidden = !enCurso", a: "      document.getElementById('pr-parada-activa').hidden = true" },
    { nombre: 'la franja no dice hace cuánto', de: "      document.getElementById('pr-parada-activa-hace').textContent = enCurso", a: "      document.getElementById('pr-parada-activa-hace').textContent = false" },
    { nombre: 'motivo de parada de una letra', de: "      if (motivo.length < 2) { err.textContent", a: "      if (motivo.length < 1) { err.textContent" },
    { nombre: 'sugerencias de parada repetidas', de: '        if (!t || vistos.has(k)) continue', a: '        if (!t) continue' },
    { nombre: 'terminar_parada con otra parada', de: "supabase.rpc('terminar_parada', { p_parada_id: enCurso.id })", a: "supabase.rpc('terminar_parada', { p_parada_id: estado.planilla.paradas[0].id })" },

    // ── Masas ───────────────────────────────────────────────────────────
    { nombre: 'las masas muestran las dos primeras', de: '      const ultimas = lista.slice(-2).reverse()', a: '      const ultimas = lista.slice(0, 2)' },
    { nombre: 'las masas anuladas también cuentan', de: "        .select('id, nro, hora, doble, origen, es_chocolate').eq('turno_id', turnoId).eq('anulada', false).order('nro')", a: "        .select('id, nro, hora, doble, origen, es_chocolate').eq('turno_id', turnoId).order('nro')" },
    { nombre: 'los chips de la masa no se dibujan', de: '        `${chipsDeMasa(m)}</div>`).join(\'\')', a: '        \'</div>\').join(\'\')' },
    { nombre: 'las masas se pueden editar desde la planilla', de: '      return \'<div class="pr-masas__cuenta">\' +', a: '      return \'<button type="button" class="pr-masas__cuenta">\' +' },

    // ── El total parado ─────────────────────────────────────────────────
    { nombre: 'la parada en curso no cuenta en el total', de: '        const a = new Date(p.inicio), b = p.fin ? new Date(p.fin) : ahora\n        if (Number.isNaN(a.getTime())', a: '        if (!p.fin) continue\n        const a = new Date(p.inicio), b = new Date(p.fin)\n        if (Number.isNaN(a.getTime())' },
    { nombre: 'una parada ilegible rompe el total', de: '        if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) continue', a: '        if (false) continue' },

    // ── El cierre ───────────────────────────────────────────────────────
    { nombre: 'scrap no obligatorio', de: "      if (b.scrap == null) faltan.push({ campo: 'scrap', error: 'Falta el scrap. Si no hubo, poné 0.', nota: 'Si no hubo, poné 0.' })\n", a: '' },
    { nombre: 'scrap 0 cuenta como vacío', de: '      if (b.scrap == null) faltan.push({ campo: \'scrap\'', a: '      if (!b.scrap) faltan.push({ campo: \'scrap\'' },
    { nombre: 'scrap negativo pasa', de: "      else if (b.scrap < 0) faltan.push({ campo: 'scrap', error: 'El scrap no puede ser negativo.', nota: 'No puede ser negativo.' })\n", a: '' },
    { nombre: 'hora no obligatoria', de: "      if (!normalizarHora(b.hora)) {\n        faltan.push({ campo: 'hora'", a: "      if (false) {\n        faltan.push({ campo: 'hora'" },
    { nombre: 'una hora imposible se acepta', de: '      if (h > 23 || min > 59) return \'\'', a: '      if (false) return \'\'' },
    { nombre: 'el botón se deshabilita cuando falta algo', de: "      document.getElementById('pr-cierre-enviar').disabled = !!estado.cerrando", a: "      document.getElementById('pr-cierre-enviar').disabled = faltan.length > 0 || !!estado.cerrando" },
    { nombre: 'el error no va pegado al botón', de: '      err.textContent = texto\n      err.hidden = !texto', a: "      err.textContent = ''\n      err.hidden = true" },
    { nombre: 'el error de la base se tapa al repintar', de: "      const texto = (faltan.length && b.intentado) ? faltan.map(f => f.error).join(' ') : (b.errorBase || '')", a: "      const texto = (faltan.length && b.intentado) ? faltan.map(f => f.error).join(' ') : ''" },
    { nombre: 'el error de la base se pierde', de: "        estado.cierre.errorBase = e?.message || 'No se pudo cerrar la planilla. Lo que cargaste quedó guardado en esta tablet.'", a: "        estado.cierre.errorBase = 'No se pudo cerrar la planilla.'" },
    { nombre: 'el campo que falta no se marca', de: "        document.getElementById(id).className = 'pr-campo' + extra + (marcados.has(campo) ? ' pr-campo--mal' : '')", a: "        document.getElementById(id).className = 'pr-campo' + extra" },
    { nombre: 'el campo se marca antes de intentar', de: '      const marcados = new Set(b.intentado ? faltan.map(f => f.campo) : [])', a: '      const marcados = new Set(faltan.map(f => f.campo))' },
    { nombre: '"se rompió" no cambia la etiqueta de la hora', de: "      document.getElementById('pr-cierre-hora-rotulo').textContent = rota ? 'Hora en que se rompió' : 'Hora en que se apagó el fuego'", a: "      document.getElementById('pr-cierre-hora-rotulo').textContent = 'Hora en que se apagó el fuego'" },
    { nombre: '"se rompió" no hace obligatorio contar qué pasó', de: "      if (b.rota && String(b.obs ?? '').trim() === '') {", a: '      if (false) {' },
    { nombre: 'la casilla no queda marcada', de: "      document.getElementById('pr-cierre-rota').setAttribute('aria-pressed', rota ? 'true' : 'false')", a: "      document.getElementById('pr-cierre-rota').setAttribute('aria-pressed', 'false')" },
    { nombre: 'las observaciones siguen diciendo Observaciones', de: "        ? 'Qué pasó <span class=\"pr-obligatorio\">· obligatorio</span>' : 'Observaciones'", a: "        ? 'Observaciones' : 'Observaciones'" },
    { nombre: 'la hora se mueve de a un minuto', de: 'data-hora-paso="5"', a: 'data-hora-paso="1"' },
    { nombre: 'la hora no da la vuelta en medianoche', de: '      const total = ((Number(base.slice(0, 2)) * 60 + Number(base.slice(3)) + minutos) % 1440 + 1440) % 1440', a: '      const total = Number(base.slice(0, 2)) * 60 + Number(base.slice(3)) + minutos' },
    { nombre: 'el scrap puede bajar de cero', de: '      ponerNumero(campo, Math.max(0, redondearKg((leerCampoNumero(campo) ?? 0) + kg)))', a: '      ponerNumero(campo, redondearKg((leerCampoNumero(campo) ?? 0) + kg))' },
    { nombre: 'la hora viaja sin normalizar', de: '        p_hora_apagado: normalizarHora(b.hora),', a: '        p_hora_apagado: b.hora,' },
    { nombre: 'las observaciones vacías viajan como texto', de: "        p_observaciones: b.obs.trim() === '' ? null : b.obs.trim(),", a: '        p_observaciones: b.obs,' },
    { nombre: 'el cierre manda productos', de: '        p_productos: [],', a: '        p_productos: [{ presentacion_id: null, cajas: 1 }],' },
    { nombre: 'se manda aunque falte algo', de: '      if (faltanParaCerrar(b).length) return\n', a: '' },

    // ── Los avisos antes de cerrar ──────────────────────────────────────
    { nombre: 'la parada abierta no se avisa', de: '      if (enCurso) {\n        avisos.push(', a: '      if (false) {\n        avisos.push(' },
    { nombre: 'el aviso de la parada no dice el motivo', de: '        avisos.push(`Quedó una parada sin terminar ("${enCurso.motivo}", desde ${horaArgentina(enCurso.inicio) || \'—\'}). ` +', a: '        avisos.push(`Quedó una parada sin terminar. ` +' },
    { nombre: 'no se avisa que la máquina no produjo', de: "      if (!itemsVivos(p?.items).length) avisos.push('No cargaste nada producido. ¿Seguro que esta máquina no produjo?')\n", a: '' },
    { nombre: 'se avisa aunque haya producido', de: '      if (!itemsVivos(p?.items).length) avisos.push(', a: '      if (true) avisos.push(' },
    { nombre: 'se manda sin preguntar', de: '      if (avisos.length && !b.confirmado) {', a: '      if (false) {' },
    { nombre: 'se pregunta siempre, aunque ya se confirmó', de: '      if (avisos.length && !b.confirmado) {', a: '      if (avisos.length) {' },

    // ── El borrador ─────────────────────────────────────────────────────
    { nombre: 'no guarda el borrador', de: "      guardarBorradorCierre(estado.planilla.turno.id, { hora: b.hora, scrap: b.scrap, obs: b.obs, rota: !!b.rota })\n", a: '' },
    { nombre: 'el borrador pierde "se rompió"', de: '{ hora: b.hora, scrap: b.scrap, obs: b.obs, rota: !!b.rota }', a: '{ hora: b.hora, scrap: b.scrap, obs: b.obs, rota: false }' },
    { nombre: 'no recupera el borrador', de: '      const guardado = leerBorradorCierre(p.turno.id)', a: '      const guardado = null' },
    { nombre: 'el borrador se borra aunque falle', de: "        const { data, error } = await supabase.rpc('cerrar_turno', parametrosCerrarTurno(turnoId, estado.cierre))\n        if (error) throw error", a: "        guardarPreferencia(claveBorradorCierre(turnoId), null)\n        const { data, error } = await supabase.rpc('cerrar_turno', parametrosCerrarTurno(turnoId, estado.cierre))\n        if (error) throw error" },
    { nombre: 'el borrador no se borra al cerrar', de: '        // Recién ahora se borra el borrador: la base ya tiene todo.\n        guardarPreferencia(claveBorradorCierre(turnoId), null)\n', a: '' },
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
    { nombre: 'el botón no dice "Completar la planilla"', de: "      cerrar.textContent = p && p.turno.estado === 'pendiente_completar' ? 'Completar la planilla' : 'Cerrar planilla'", a: "      cerrar.textContent = 'Cerrar planilla'" },
    { nombre: 'el cierre no dice que se está completando', de: "      document.getElementById('pr-cierre-titulo').textContent = `${p.turno.estado === 'pendiente_completar' ? 'Completar' : 'Cerrar'} ${p.maquinaNombre} · lote ${p.turno.lote}`", a: '      document.getElementById(\'pr-cierre-titulo\').textContent = `Cerrar ${p.maquinaNombre} · lote ${p.turno.lote}`' },

    // ── Pendientes de completar en el tablero ───────────────────────────
    { nombre: 'el tablero no avisa de las pendientes', de: '        aviso.innerHTML = htmlPendientesCompletar(await leerPendientesCompletar(estado.unidadId), estado.tablero.map(e => e.maquina))', a: '        await leerPendientesCompletar(estado.unidadId)' },
    { nombre: 'las pendientes se piden sin filtrar por estado', de: ".eq('unidad_negocio_id', unidadId).eq('estado', 'pendiente_completar').order('fecha')", a: ".eq('unidad_negocio_id', unidadId).order('fecha')" },
    { nombre: 'el aviso de pendientes se dibuja sin ninguna', de: '      if (!lista.length) return \'\'\n      const nombre = id =>', a: '      const nombre = id =>' },
    { nombre: 'el aviso de pendientes no lleva a la planilla', de: '`<button type="button" class="pr-btn pr-btn--peligro" data-planilla="${esc(t.id)}">', a: '`<span class="pr-btn pr-btn--peligro" data-nada="${esc(t.id)}">' },

    // ── Sin catálogo ────────────────────────────────────────────────────
    { nombre: 'sin catálogo igual se puede agregar', de: '      agregar.disabled = !p || !estado.catalogo', a: '      agregar.disabled = !p' },
    { nombre: 'abrir agregar sin catálogo', de: '      if (!estado.catalogo || !estado.planilla) return\n      estado.agregar = {', a: '      if (!estado.planilla) return\n      estado.agregar = {' },
  ],
})
