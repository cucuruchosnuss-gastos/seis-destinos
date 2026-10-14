// Mutaciones de Conos de papel → "Todos los conos" (ver test-conos-todos.js).
// Muta modulos/conos.html y, de Producción → Configuración → Marcas / Conos,
// lo que tiene que mostrar lo mismo (modulos/produccion-gestion.html).
//
//   node pruebas/mut-conos-todos.js
const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const SUITE = path.join(__dirname, 'test-conos-todos.js')
const HTML = path.join(__dirname, '..', 'modulos', 'conos.html')
const GESTION = path.join(__dirname, '..', 'modulos', 'produccion-gestion.html')

correrMutacionesEnVarios([
  { original: HTML, funciones: [], salir: false, suite: SUITE, manuales: [
    // Los filtros
    { nombre: '"En producción" muestra todos', de: "      if (filtro === 'produccion') return f.activa === true", a: "      if (filtro === 'produccion') return true" },
    { nombre: '"Apagados" deja afuera a los rechazados', de: "      if (filtro === 'apagados') return f.activa !== true", a: "      if (filtro === 'apagados') return f.activa !== true && f.estado_alta !== 'rechazada'" },
    { nombre: '"Doble bolsa" filtra por ilustración', de: "      if (filtro === 'doble') return f.doble_bolsa === true", a: "      if (filtro === 'doble') return f.papel_ilustracion === true" },
    { nombre: '"Ilustración" no filtra', de: "      if (filtro === 'ilus') return f.papel_ilustracion === true", a: "      if (filtro === 'ilus') return true" },
    { nombre: 'el buscador no mira el filtro', de: '.filter(f => pasaFiltroTodos(f, filtro) && (!q', a: '.filter(f => (!q' },
    // El buscador
    { nombre: 'el buscador no saca acentos ni mayúsculas', de: "      const q = normalizarBusqueda(busqueda)\n      return (filas ?? []).filter(f => pasaFiltroTodos", a: "      const q = String(busqueda ?? '')\n      return (filas ?? []).filter(f => pasaFiltroTodos" },
    { nombre: 'el buscador usa el nombre crudo', de: "(f._buscar ?? normalizarBusqueda(f.cono)).includes(q)", a: "String(f.cono).includes(q)" },
    { nombre: 'el buscador pinta en cada tecla sin esperar el cuadro', de: 'cuadroTodos = requestAnimationFrame(() => { cuadroTodos = 0; pintarListaTodos() })', a: 'pintarListaTodos()' },
    { nombre: 'el nombre normalizado no se guarda al cargar', de: 'estado.catalogo = filas.map(f => ({ ...f, _buscar: normalizarBusqueda(f.cono) }))', a: 'estado.catalogo = filas.map(f => ({ ...f }))' },
    // Solo el campo tocado
    { nombre: 'configurar_cono recibe un campo de más', de: "      const p = { p_marca_id: marcaId, p_activa: null, p_doble_bolsa: null, p_papel_ilustracion: null }", a: "      const p = { p_marca_id: marcaId, p_activa: true, p_doble_bolsa: null, p_papel_ilustracion: null }" },
    { nombre: 'Doble bolsa mueve p_activa', de: "{ campo: 'doble_bolsa', param: 'p_doble_bolsa', texto: 'Doble bolsa' }", a: "{ campo: 'doble_bolsa', param: 'p_activa', texto: 'Doble bolsa' }" },
    { nombre: 'el valor no va como booleano', de: '      p[i.param] = !!valor', a: '      p[i.param] = valor' },
    { nombre: 'el interruptor se llama "Activo"', de: "{ campo: 'activa', param: 'p_activa', texto: 'En producción' }", a: "{ campo: 'activa', param: 'p_activa', texto: 'Activo' }" },
    // Permisos
    { nombre: 'Ilustración sin conos:precios', de: "return !!(perm?.configurar || perm?.pedir || perm?.precios)", a: "return !!(perm?.configurar || perm?.pedir)" },
    { nombre: 'Ilustración solo con configurar', de: "return !!(perm?.configurar || perm?.pedir || perm?.precios)", a: "return !!perm?.configurar" },
    { nombre: 'En producción y Doble bolsa sin permiso', de: "      return !!perm?.configurar\n    }\n    function porQueNoSePuede", a: "      return true\n    }\n    function porQueNoSePuede" },
    { nombre: 'En producción y Doble bolsa con conos:pedir', de: "      return !!perm?.configurar\n    }\n    function porQueNoSePuede", a: "      return !!(perm?.configurar || perm?.pedir)\n    }\n    function porQueNoSePuede" },
    { nombre: 'sin permiso el interruptor no se deshabilita', de: "${!puede || ocupado ? ' disabled' : ''}", a: "${ocupado ? ' disabled' : ''}" },
    { nombre: 'mientras guarda no se traba', de: "${!puede || ocupado ? ' disabled' : ''}", a: "${!puede ? ' disabled' : ''}" },
    { nombre: 'sin permiso no dice por qué', de: "${puede ? '' : ` title=\"${esc(porQueNoSePuede(i.campo))}\"`}", a: '' },
    { nombre: 'tocarInterruptor no vuelve a mirar el permiso', de: ' || !puedeTocar(estado.perm, campo)) { pintarFilaTodos(marcaId); return }', a: ') { pintarFilaTodos(marcaId); return }' },
    { nombre: 'un segundo toque mientras guarda manda otra vez', de: '      if (!f || estado.conosOcupados.has(marcaId) || !puedeTocar', a: '      if (!f || !puedeTocar' },
    { nombre: 'la pestaña no se ve con permisos de producción', de: "      if (p.ver || p.pedir || p.produccion) v.push({ clave: 'todos'", a: "      if (p.ver || p.pedir) v.push({ clave: 'todos'" },
    { nombre: 'la pestaña se ve con solo precios', de: "      if (p.ver || p.pedir || p.produccion) v.push({ clave: 'todos'", a: "      if (p.ver || p.pedir || p.produccion || p.precios) v.push({ clave: 'todos'" },
    { nombre: 'produccion:configurar se confunde con una tarea de conos', de: "configurar: tieneP('configurar'), produccion:", a: "configurar: tiene('configurar') || tieneP('configurar'), produccion:" },
    { nombre: 'producción sin cargar', de: " || tieneP('ver') || tieneP('cargar'),", a: " || tieneP('ver')," },
    { nombre: 'no se leen las tareas de producción', de: ".in('modulo', ['conos', 'produccion'])", a: ".eq('modulo', 'conos')" },
    { nombre: 'conos_stock se pide sin ver ni pedir', de: "      if (!estado.perm.ver && !estado.perm.pedir) { estado.conos = []; estado.conoPorId = new Map(); return }\n", a: '' },
    // El stock
    { nombre: 'el stock se ve sin conos:ver', de: '      const stock = perm?.ver\n', a: '      const stock = true\n' },
    { nombre: 'el stock se decide por el valor', de: '      const stock = perm?.ver\n', a: '      const stock = f.stock\n' },
    { nombre: 'el stock negativo no va en bordó', de: '<span class="cn-cat-stock${Number(f.stock) < 0 ? \' cn-negativo\' : \'\'}">', a: '<span class="cn-cat-stock">' },
    // "nuevo, a revisar"
    { nombre: 'los nuevos dicen "Por revisar"', de: "const ETIQUETA_ALTA = { pendiente_revision: 'nuevo, a revisar'", a: "const ETIQUETA_ALTA = { pendiente_revision: 'Por revisar'" },
    { nombre: 'los rechazados sin etiqueta', de: ", rechazada: 'Rechazado' }", a: ' }' },
    { nombre: 'el enlace a Configuración para cualquiera', de: '      const donde = perm?.configurar ?', a: '      const donde = true ?' },
    { nombre: 'el aviso no cuenta los nuevos', de: "      const n = (filas ?? []).filter(f => f.estado_alta === 'pendiente_revision').length\n      if (!n) return ''", a: "      const n = 1\n      if (!filas?.length) return ''" },
    // Al tocar
    { nombre: 'si la base rechaza, el interruptor no vuelve', de: '        f[campo] = anterior\n        return { ok: false', a: '        return { ok: false' },
    { nombre: 'el error de la base no va tal cual', de: '        return { ok: false, error: mensajeDe(e) }', a: "        return { ok: false, error: 'No se pudo guardar.' }" },
    { nombre: 'no se usa lo que devolvió la base', de: "        aplicarRespuestaCono(f, await llamar('configurar_cono', params))", a: "        await llamar('configurar_cono', params)" },
    { nombre: 'se usa la respuesta de otro cono', de: " || r.marca_id !== f.marca_id) return f", a: ') return f' },
    { nombre: 'mientras guarda no muestra el valor nuevo', de: '      f[campo] = !!valor\n      alCambiar()', a: '      alCambiar()\n      f[campo] = !!valor' },
    { nombre: 'el nombre devuelto no actualiza el buscador', de: "{ f.cono = r.cono; f._buscar = normalizarBusqueda(r.cono) }", a: '{ f.cono = r.cono }' },
    { nombre: 'al tocar se rearma la lista (el cono desaparece bajo el dedo)', de: '      estado.conosOcupados.add(marcaId)\n      if (estado.errorTodos', a: '      estado.conosOcupados.add(marcaId)\n      estado.listaTodos = null\n      if (estado.errorTodos' },
    { nombre: 'al tocar se repinta la lista entera', de: '      el.outerHTML = htmlFilaDe(f)', a: '      pintarListaTodos()' },
    { nombre: 'el aviso de guardado de En producción dice otra cosa', de: "return f.activa ? `${f.cono}: en producción.`", a: "return f.activa ? `${f.cono}: activo.`" },
    // El escape
    { nombre: 'el nombre del cono sin escapar en la fila', de: '<span class="cn-cat-nombre">${esc(f.cono)}', a: '<span class="cn-cat-nombre">${f.cono}' },
    { nombre: 'el id del cono sin escapar en la fila', de: 'data-cat-cono="${esc(f.marca_id)}"', a: 'data-cat-cono="${f.marca_id}"' },
    { nombre: 'el error sin escapar', de: '<div class="cn-error cn-cat-error" role="alert">${esc(error)}</div>', a: '<div class="cn-error cn-cat-error" role="alert">${error}</div>' },
  ] },
  { original: GESTION, funciones: [], salir: false, suite: SUITE, variable: 'ARCHIVO_GESTION', manuales: [
    { nombre: 'Configuración sin el tilde Ilustración tildado', de: "data-marca-ilus=\"${esc(m.id)}\"${m.papel_ilustracion ? ' checked' : ''}", a: 'data-marca-ilus="${esc(m.id)}"' },
    { nombre: 'Configuración no lee papel_ilustracion', de: "doble_bolsa, papel_ilustracion').order('nombre')", a: "doble_bolsa').order('nombre')" },
    { nombre: 'Configuración manda un campo de más a configurar_cono', de: 'p_marca_id: m.id, p_activa: null, p_doble_bolsa: null, p_papel_ilustracion: !!valor', a: 'p_marca_id: m.id, p_activa: true, p_doble_bolsa: null, p_papel_ilustracion: !!valor' },
    { nombre: 'Configuración: los nuevos dicen "Por revisar"', de: "pendiente_revision: ['Nuevo, a revisar', 'naranja']", a: "pendiente_revision: ['Por revisar', 'naranja']" },
    { nombre: 'Configuración: el interruptor se llama "Activo"', de: 'aria-label="En producción: ${esc(m.nombre)}"', a: 'aria-label="Activo: ${esc(m.nombre)}"' },
    { nombre: 'Configuración: el filtro dice "Activos"', de: "['activos', 'En producción']", a: "['activos', 'Activos']" },
    { nombre: 'Configuración: la cabecera dice ACTIVO', de: '<span class="pc-cab-largo">EN PRODUCCIÓN</span>', a: '<span class="pc-cab-largo">ACTIVO</span>' },
  ] },
])
