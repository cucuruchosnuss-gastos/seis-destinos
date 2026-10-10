// Mutaciones de la tabla de producción (ver test-produccion-tabla.js). Cada
// una rompe UNA regla y la suite tiene que ponerse en rojo.
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-produccion-tabla.js'),
  original: path.join(__dirname, '..', 'modulos', 'produccion-gestion.html'),
  funciones: [],
  manuales: [
    // Los números de la RPC.
    { nombre: 'las unidades como texto se concatenan', de: "planillas: numeroInd(f.planillas), cajas: numeroInd(f.cajas), unidades: numeroInd(f.unidades),", a: "planillas: numeroInd(f.planillas), cajas: numeroInd(f.cajas), unidades: f.unidades," },
    { nombre: 'una fila sin fecha se cuenta', de: ".filter(f => f && esFechaTabla(texto(f.fecha).slice(0, 10)))", a: ".filter(f => f)" },
    // Los períodos.
    { nombre: 'la semana empieza el domingo', de: "{ clave: 'semana', titulo: 'Esta semana', desde: lunesDe(hoy), hasta: hoy },", a: "{ clave: 'semana', titulo: 'Esta semana', desde: sumarDias(hoy, -new Date(`${hoy}T12:00:00Z`).getUTCDay()), hasta: hoy }," },
    { nombre: 'ayer es hoy', de: "      const ayer = sumarDias(hoy, -1)\n", a: "      const ayer = hoy\n" },
    { nombre: 'el mes pasado son 30 días', de: "{ clave: 'mes_pasado', titulo: 'Mes pasado', desde: finPasado.slice(0, 8) + '01', hasta: finPasado },", a: "{ clave: 'mes_pasado', titulo: 'Mes pasado', desde: sumarDias(primero, -30), hasta: finPasado }," },
    { nombre: 'la consulta base no cubre el mes pasado', de: "      return { desde: p[3].desde, hasta: hoy }", a: "      return { desde: p[2].desde, hasta: hoy }" },
    { nombre: 'el tope de 400 días con >=', de: "if (diasEntreInd(desde, hasta) > MAX_DIAS_TABLA)", a: "if (diasEntreInd(desde, hasta) >= MAX_DIAS_TABLA)" },
    { nombre: 'sin tope de días', de: "      if (diasEntreInd(desde, hasta) > MAX_DIAS_TABLA) return 'El período no puede pasar de 400 días.'\n", a: '' },
    // Los filtros.
    { nombre: 'el filtro de máquina no filtra', de: "(!f.maquina || r.maquina_id === f.maquina)", a: "(true)" },
    { nombre: 'el filtro de turno no filtra', de: "(!f.turno || r.turno === f.turno)", a: "(true)" },
    { nombre: 'el filtro de producto no filtra', de: "(!f.producto || r.producto === f.producto))", a: "(true))" },
    { nombre: 'el hasta no se incluye', de: "(!f.hasta || r.fecha <= f.hasta)", a: "(!f.hasta || r.fecha < f.hasta)" },
    { nombre: 'las tarjetas sin los filtros', de: "filtrarResumen(base.filas, { desde: p.desde, hasta: p.hasta, maquina: t.maquina, turno: t.turno, producto: t.producto })", a: "filtrarResumen(base.filas, { desde: p.desde, hasta: p.hasta })" },
    // La tabla.
    { nombre: 'una celda se pisa en vez de sumar', de: "m.set(k, (m.get(k) ?? 0) + v) }", a: "m.set(k, v) }" },
    { nombre: 'el total general sin las unidades', de: "        if (r.unidades !== null && r.unidades !== undefined) total = (total ?? 0) + r.unidades\n", a: '' },
    { nombre: 'el total de columna no se suma', de: "        sumar(totCol, gc.clave, r.unidades)\n", a: '' },
    { nombre: 'el total de renglón no se suma', de: "        sumar(totFila, gf.clave, r.unidades)\n", a: '' },
    { nombre: 'la semana agrupa por día', de: "if (dim === 'semana') { const l = lunesDe(r.fecha);", a: "if (dim === 'semana') { const l = r.fecha;" },
    { nombre: 'el mes agrupa por año', de: "if (dim === 'mes') { const m = r.fecha.slice(0, 7);", a: "if (dim === 'mes') { const m = r.fecha.slice(0, 4);" },
    { nombre: 'los turnos por orden alfabético', de: "return { clave: r.turno, orden: `${i < 0 ? 9 : i}|${r.turno}`, etiqueta: r.turno || 'Sin turno' }", a: "return { clave: r.turno, orden: r.turno, etiqueta: r.turno || 'Sin turno' }" },
    { nombre: 'la máquina agrupa por nombre', de: "if (dim === 'maquina') return { clave: r.maquina_id,", a: "if (dim === 'maquina') return { clave: r.producto," },
    { nombre: 'las fechas al revés', de: "const ordenar = (m) => [...m.values()].sort((a, b) => String(a.orden).localeCompare(String(b.orden), 'es', { numeric: true })", a: "const ordenar = (m) => [...m.values()].sort((a, b) => String(b.orden).localeCompare(String(a.orden), 'es', { numeric: true })" },
    { nombre: 'una celda vacía dice 0', de: "      if (v === null || v === undefined) return `<td class=\"pt-sin${clase ? ' ' + clase : ''}\">—</td>`", a: "      if (v === null || v === undefined) return `<td class=\"pt-sin${clase ? ' ' + clase : ''}\">0</td>`" },
    { nombre: 'la celda que no existe es 0', de: "cols.map(c => celdaTabla(fila.has(c.clave) ? fila.get(c.clave) : null)).join('')", a: "cols.map(c => celdaTabla(fila.get(c.clave) ?? 0)).join('')" },
    { nombre: 'sin punto de miles', de: "return `<td${clase ? ` class=\"${clase}\"` : ''}>${esc(formatearNumeroAr(Math.round(v), { decimales: 0 }))}</td>`", a: "return `<td${clase ? ` class=\"${clase}\"` : ''}>${esc(String(Math.round(v)))}</td>`" },
    { nombre: 'la etiqueta del renglón sin escapar', de: "h += `<tr><th scope=\"row\" title=\"${esc(f.etiqueta)}\">${esc(f.etiqueta)}</th>` +", a: "h += `<tr><th scope=\"row\" title=\"${esc(f.etiqueta)}\">${f.etiqueta}</th>` +" },
    { nombre: 'la columna sin escapar', de: "cols.map(c => `<th scope=\"col\">${esc(c.etiqueta)}</th>`).join('')", a: "cols.map(c => `<th scope=\"col\">${c.etiqueta}</th>`).join('')" },
    { nombre: 'las opciones sin escapar', de: "lista.map(o => `<option value=\"${esc(o.v)}\"${o.v === elegido ? ' selected' : ''}>${esc(o.t)}</option>`).join('')", a: "lista.map(o => `<option value=\"${esc(o.v)}\"${o.v === elegido ? ' selected' : ''}>${o.t}</option>`).join('')" },
    { nombre: 'el error sin escapar', de: "`<div class=\"pr-ind__error\" role=\"alert\">${esc(d.error)}</div>` +\n          '<button type=\"button\" class=\"pr-btn pr-btn--secundario\" data-tabla-reintentar=\"1\">Reintentar</button></div></div>'", a: "`<div class=\"pr-ind__error\" role=\"alert\">${d.error}</div>` +\n          '<button type=\"button\" class=\"pr-btn pr-btn--secundario\" data-tabla-reintentar=\"1\">Reintentar</button></div></div>'" },
    { nombre: 'Columnas = Ninguna dibuja las columnas igual', de: "      const cols = sinCols ? [] : tab.cols\n", a: "      const cols = tab.cols\n" },
    // Los promedios.
    { nombre: 'las planillas se suman de la columna', de: "        planillas.set(k, Math.max(planillas.get(k) ?? 0, n))", a: "        planillas.set(k + '|' + r.presentacion_id, n)" },
    { nombre: 'las planillas sin la máquina en la clave', de: "        const k = `${r.fecha}|${r.turno}|${r.maquina_id}`", a: "        const k = `${r.fecha}|${r.turno}`" },
    { nombre: 'el promedio por día sobre días corridos', de: "porDia: total !== null && dias.size > 0 ? total / dias.size : null,", a: "porDia: total !== null && dias.size > 0 ? total / 7 : null," },
    { nombre: 'sin datos el promedio es 0', de: "porPlanilla: total !== null && nPlanillas > 0 ? total / nPlanillas : null,", a: "porPlanilla: total !== null && nPlanillas > 0 ? total / nPlanillas : 0," },
    { nombre: 'una suma vacía es 0', de: "      let s = null\n      for (const r of filas ?? []) if (r?.unidades", a: "      let s = 0\n      for (const r of filas ?? []) if (r?.unidades" },
    // Filas y columnas.
    { nombre: 'Columnas igual a Filas no intercambia', de: "      if (valor !== 'ninguna' && r[otra] === valor) r[otra] = r[cual]\n", a: '' },
    { nombre: 'el defecto es Máquina × Día', de: "filas: dim(g.filas, 'dia'), columnas: dim(g.columnas, 'maquina'),", a: "filas: dim(g.filas, 'maquina'), columnas: dim(g.columnas, 'dia')," },
    // Lo que se recuerda.
    { nombre: 'no se guarda nada', de: "      guardarPreferencia(CLAVE_TABLA, JSON.stringify({", a: "      void (CLAVE_TABLA, JSON.stringify({" },
    { nombre: 'una tarjeta recordada no se recalcula', de: "      if (tarjeta) { t.periodoClave = tarjeta.clave; t.desde = tarjeta.desde; t.hasta = tarjeta.hasta }\n      else if", a: "      if (tarjeta && g.desde) { t.periodoClave = tarjeta.clave; t.desde = g.desde; t.hasta = g.hasta }\n      else if" },
    { nombre: 'leerPreferencia sin try', de: "      try { return localStorage.getItem(clave) } catch { return null }", a: "      return localStorage.getItem(clave)" },
    // La consulta.
    { nombre: 'la tabla siempre hace su propia consulta', de: "      else if (t.desde >= rb.desde && t.hasta <= rb.hasta) t.periodo = { usaBase: true }\n", a: '' },
    { nombre: 'sin turno: una respuesta vieja pisa', de: "      if (turno !== turnoTabla || estado.tabla !== t) return\n      for (const [q, r] of res)", a: "      for (const [q, r] of res)" },
    { nombre: 'Reintentar no vuelve a pedir (un error queda guardado)', de: "c.hasta !== r.hasta || !!c.error || !!c.cargando", a: "c.hasta !== r.hasta || !!c.cargando" },
    { nombre: 'una consulta en vuelo tapada por un turno nuevo no se vuelve a pedir', de: "c.hasta !== r.hasta || !!c.error || !!c.cargando", a: "c.hasta !== r.hasta || !!c.error" },
    { nombre: 'el período inválido se consulta igual', de: "      if (err) t.periodo = { validacion: true, error: err }\n      else if", a: "      if (false) t.periodo = { validacion: true, error: err }\n      else if" },
    { nombre: 'la rpc con otro nombre de parámetro', de: "{ p_unidad_negocio_id: unidadId, p_desde: desde, p_hasta: hasta }", a: "{ p_unidad: unidadId, p_desde: desde, p_hasta: hasta }" },
    { nombre: 'otra unidad no suelta la máquina', de: "      t.unidadId = id; t.maquina = ''; t.maquinaNombre = ''\n", a: "      t.unidadId = id\n" },
    { nombre: 'un filtro no repinta la tabla', de: "      if (campo === 'maquina') t.maquinaNombre = valor ? nombre : ''\n      guardarTabla(t)\n      pintarTabla()", a: "      if (campo === 'maquina') t.maquinaNombre = valor ? nombre : ''\n      guardarTabla(t)" },
    { nombre: 'elegir Filas/Columnas no repinta', de: "      t.filas = r.filas; t.columnas = r.columnas\n      guardarTabla(t)\n      pintarTabla()", a: "      t.filas = r.filas; t.columnas = r.columnas\n      guardarTabla(t)" },
    // La gestión abre en la tabla (09/10/2026).
    { nombre: 'el inicio de la gestión son los indicadores', de: "    const INICIO_GESTION = 'tabla'\n", a: "    const INICIO_GESTION = 'inicio'\n" },
    { nombre: 'al entrar abre los indicadores', de: "      navegar(entrada)\n    }", a: "      mostrarInicioOficina()\n    }" },
    { nombre: '?vista= no se lee', de: "      return v && Object.prototype.hasOwnProperty.call(VISTAS_DE_ENTRADA, v) ? VISTAS_DE_ENTRADA[v] : INICIO_GESTION", a: "      return INICIO_GESTION" },
    { nombre: '?vista= de un prototipo pasa', de: "      return v && Object.prototype.hasOwnProperty.call(VISTAS_DE_ENTRADA, v) ? VISTAS_DE_ENTRADA[v] : INICIO_GESTION", a: "      return v && VISTAS_DE_ENTRADA[v] ? VISTAS_DE_ENTRADA[v] : INICIO_GESTION" },
    { nombre: 'indicadores lleva a la tabla', de: "{ tabla: 'tabla', indicadores: 'inicio',", a: "{ tabla: 'tabla', indicadores: 'tabla'," },
    { nombre: '?vista= queda en la dirección', de: "url.searchParams.delete('vista'); ", a: "" },
    { nombre: 'Indicadores vuelve arriba, suelto', de: "        <button type=\"button\" class=\"pg-menu__item\" data-menu=\"inicio\" id=\"pr-menu-inicio\"><span class=\"pg-menu__txt\">Indicadores</span></button>\n", a: '' },
    { nombre: 'Salir sin guardar vuelve a los indicadores', de: "    function volverDeOficina() {\n      navegar(INICIO_GESTION)", a: "    function volverDeOficina() {\n      mostrarInicioOficina()" },
    { nombre: 'las migas vuelven a los indicadores', de: "addEventListener('click', () => irA(INICIO_GESTION))", a: "addEventListener('click', () => irA('inicio'))" },
    { nombre: 'sin Producción en la barra vuelve a los indicadores', de: "        else navegar(INICIO_GESTION)\n        return", a: "        else mostrarInicioOficina()\n        return" },
    { nombre: 'sin Producción en la barra la tabla no abre', de: "      if (sinUnidadPorBarra()) {\n        mostrarVista('pr-tabla')\n", a: "      if (sinUnidadPorBarra()) {\n        mostrarError(textoSinProduccionEnBarra()); return\n" },
    { nombre: 'sin Producción en la barra la tabla consulta igual', de: "        document.getElementById('pr-tabla-cuerpo').innerHTML = `<div class=\"pr-aviso\">${esc(textoSinProduccionEnBarra())}</div>`\n        return\n      }", a: "        document.getElementById('pr-tabla-cuerpo').innerHTML = `<div class=\"pr-aviso\">${esc(textoSinProduccionEnBarra())}</div>`\n      }" },
    { nombre: 'elegir unidad sin tabla armada no la arma', de: "      if (!t) return mostrarTabla()", a: "      if (!t) return" },
    // El archivo.
    { nombre: 'la tabla no es la primera de Control', de: "        <button type=\"button\" class=\"pg-menu__item\" data-menu=\"tabla\" id=\"pr-menu-tabla\" hidden><span class=\"pg-menu__txt\">Tabla de producción</span></button>\n", a: '' },
    { nombre: 'la primera columna no es fija', de: "      position: sticky; left: 0; z-index: 1; background: #fff; text-align: left; font-weight: 700;", a: "      left: 0; z-index: 1; background: #fff; text-align: left; font-weight: 700;" },
  ],
})
