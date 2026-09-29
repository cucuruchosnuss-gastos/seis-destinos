// Mutaciones de test-barra-lateral.js. Ver mutar.js (mismos guards). De a una.
// Muta js/barra-lateral.js (ARCHIVO_TEST), js/modulos.js (ARCHIVO_MODULOS),
// js/preferencias.js (ARCHIVO_PREFS) y css/main.css (ARCHIVO_CSS).
//
//   node pruebas/mut-barra-lateral.js

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const suite = path.join(__dirname, 'test-barra-lateral.js')
const RAIZ = path.join(__dirname, '..')

correrMutacionesEnVarios([
  {
    suite, original: path.join(RAIZ, 'js', 'barra-lateral.js'), funciones: [], variable: 'ARCHIVO_TEST',
    manuales: [
      { nombre: 'la planta la dibuja', de: "  if (/\\/modulos\\/produccion\\.html$/.test(pathname || '')) return false\n", a: '' },
      { nombre: 'una tablet la ve', de: '  if (esDispositivo === true) return false\n', a: '' },
      { nombre: 'sin mirar los permisos', de: '  const lista = enOrdenDeBarra(MODULOS.filter(m => !m.proximamente && moduloVisible(m, ctx)))', a: '  const lista = enOrdenDeBarra(MODULOS.filter(m => !m.proximamente))' },
      { nombre: 'sin el orden del diseño', de: '  const lista = enOrdenDeBarra(MODULOS.filter(m => !m.proximamente && moduloVisible(m, ctx)))', a: '  const lista = MODULOS.filter(m => !m.proximamente && moduloVisible(m, ctx))' },
      { nombre: 'Seguridad para cualquiera', de: '  return ctx?.esSuperAdmin ? [...lista, SEGURIDAD] : lista', a: '  return [...lista, SEGURIDAD]' },
      { nombre: 'sin sesión igual se dibuja', de: '    if (!uid) return null\n', a: '' },
      { nombre: 'la tablet se revisa solo por la dirección', de: "    if (!debeMostrarse({ pathname: win.location.pathname, esDispositivo: yo.es_dispositivo })) return null\n", a: '' },
      { nombre: 'barra vacía sin módulos', de: '    if (!modulos.length) return null\n', a: '' },
      { nombre: 'no marca el actual', de: "${esActual ? ' aria-current=\"page\"' : ''}>` +\n    `<span class=\"barra-lateral__icono\"", a: ">` +\n    `<span class=\"barra-lateral__icono\"" },
      { nombre: 'el actual sin su clase', de: "`<a class=\"barra-lateral__item${esActual ? ' barra-lateral__item--actual' : ''}\" href=\"${escDash(href)}\"", a: "`<a class=\"barra-lateral__item\" href=\"${escDash(href)}\"" },
      { nombre: 'Cheques en Administración marca Administración', de: '  if (conParametros) return conParametros.clave\n', a: '' },
      { nombre: 'cheques.html no marca Cheques', de: "  if (archivo === 'cheques.html') return 'cheques'\n", a: '' },
      { nombre: 'el dashboard no marca Inicio', de: "  if (archivo === 'dashboard.html' || archivo === '') return aca.get('vista') === 'personalizar' ? 'personalizar' : 'inicio'\n", a: '' },
      { nombre: 'Personalizar no se marca', de: "aca.get('vista') === 'personalizar' ? 'personalizar' : 'inicio'", a: "'inicio'" },
      { nombre: 'la preferencia no manda', de: "  if (guardado === '1') return true\n", a: '' },
      { nombre: 'no recuerda al achicar', de: '        guardar(colapsada)\n', a: '' },
      { nombre: 'el body no se entera de que está achicada', de: "      doc.body.classList.toggle('barra-lateral-colapsada', colapsada)\n", a: '' },
      { nombre: 'sin la clase del body (la página no se corre)', de: "    doc.body.classList.add('con-barra-lateral')\n", a: '' },
      { nombre: 'al achicar se pierden las burbujas', de: '        dibujar()\n        pintarBurbujasBarra(nav, ultimos)\n        pintarBurbujasAbajo(abajo, ultimos)\n      })', a: '        dibujar()\n      })' },
      { nombre: 'el texto de los pendientes sin escapar', de: "  const detalle = escDash(p.detalle.join(' · '))", a: "  const detalle = p.detalle.join(' · ')" },
      { nombre: 'la burbuja con cero', de: "  if (!p || !(p.total > 0)) return ''", a: "  if (!p) return ''" },
      { nombre: 'sin tope 99+', de: "const numero = p.total > 99 ? '99+' : String(p.total)", a: 'const numero = String(p.total)' },
      { nombre: 'lo urgente no se marca', de: "${p.urgente ? ' barra-lateral__burbuja--urgente' : ''}", a: '' },
      { nombre: 'un error deja la burbuja vieja', de: "  nav.querySelectorAll('.barra-lateral__burbuja').forEach(b => b.remove())\n", a: '' },
      { nombre: 'el cartel del mouse no dice lo pendiente', de: "    if (extra && p?.detalle?.length) extra.textContent = p.detalle.join(' · ')\n", a: '' },
      { nombre: 'un error de mis_pendientes pinta algo', de: '      } catch { porModulo = null }', a: '      } catch { porModulo = new Map([[\'caja\', { total: 1, detalle: [\'x\'] }]]) }' },
      { nombre: 'no se recarga al volver', de: "    doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'visible') cargarPendientes() })\n", a: '' },
      { nombre: 'sin leer las tareas: todo lo que las pide aparece', de: "      misTareas = new Set((t.error ? [] : (t.data || [])).map(x => `${x.modulo}:${x.tarea}`))", a: "      misTareas = new Set((t.data || [{ modulo: 'cobranzas', tarea: 'procesar' }]).map(x => `${x.modulo}:${x.tarea}`))" },
      { nombre: 'las tareas de todos (sin filtrar por persona)', de: "        sb.from('empleado_tareas').select('modulo, tarea').eq('empleado_id', yo.id).eq('habilitado', true),", a: "        sb.from('empleado_tareas').select('modulo, tarea').eq('habilitado', true)," },
      { nombre: 'los módulos deshabilitados cuentan', de: "        sb.from('empleado_modulos').select('modulo').eq('empleado_id', yo.id).eq('habilitado', true),", a: "        sb.from('empleado_modulos').select('modulo').eq('empleado_id', yo.id)," },
      { nombre: 'el logo no lleva al inicio', de: "  return `<a class=\"barra-lateral__logo\" href=\"${escDash(new URL('dashboard.html', raiz).href)}\"", a: "  return `<a class=\"barra-lateral__logo\" href=\"${escDash(new URL('index.html', raiz).href)}\"" },
      { nombre: 'el botón no dice su estado', de: "aria-expanded=\"${colapsada ? 'false' : 'true'}\"", a: 'aria-expanded="true"' },
      { nombre: 'Inicio no va', de: '      htmlItem(INICIO, actual, raiz) +\n', a: '' },
      { nombre: 'los fijados no van', de: '      fijados.map(m => htmlItem(m, actual, raiz)).join(\'\') +\n', a: '' },
      { nombre: 'sin el divisor de los fijados', de: "      (fijados.length && resto.length ? '<div class=\"barra-lateral__divisor\" role=\"separator\"></div>' : '') +\n", a: '' },
      { nombre: 'el ícono sin el color de su módulo', de: '`<span class="barra-lateral__icono" style="background: ${col.t}; color: ${col.c}">${htmlIcono(m.clave)}</span>`', a: '`<span class="barra-lateral__icono">${htmlIcono(m.clave)}</span>`' },
      { nombre: 'Mis sesiones no son las propias', de: 'abrirPanelSesiones({ sb, empleadoId: yo.id, propia: true, doc })', a: 'abrirPanelSesiones({ sb, empleadoId: yo.id, propia: false, doc })' },
      { nombre: 'Salir no cierra la sesión', de: '    const salir = async () => { try { await sb.auth.signOut() } finally {', a: '    const salir = async () => { try { } finally {' },
      { nombre: '"Más" no abre la hoja', de: "addEventListener('click', () => { hoja.hidden = false;", a: "addEventListener('click', () => { hoja.hidden = true;" },
      { nombre: 'no anota el uso', de: '    if (actual && modulos.some(m => m.clave === actual)) { prefs = anotarUso(prefs, actual); guardarPrefs(yo.id, prefs) }\n', a: '' },
      { nombre: 'Personalizar no rearma la barra', de: "    win.addEventListener('preferencias:cambio', () => {\n      prefs = leerPrefs(yo.id)\n", a: "    win.addEventListener('preferencias:cambio', () => {\n" },
      { nombre: '"Más" no suma lo que no está a la vista', de: '  for (const [clave, p] of porModulo) if (!visibles.has(clave)) { restoTotal += p.total; restoUrgente ||= !!p.urgente }\n', a: '' },
      { nombre: 'el tab actual no va en naranja', de: "` style=\"--tab-color: ${esActual ? 'var(--color-acento)' : col.c}\">`", a: "` style=\"--tab-color: ${col.c}\">`" },
    ],
  },
  {
    suite, original: path.join(RAIZ, 'js', 'modulos.js'), funciones: [], variable: 'ARCHIVO_MODULOS',
    manuales: [
      { nombre: 'Accesos para cualquiera', de: '  if (modulo.soloSuperAdmin) return esSuperAdmin\n', a: '' },
      { nombre: 'Cheques sin pedir tareas', de: '  if (!modulo.requiereTareas) return true\n', a: '  return true\n' },
      { nombre: 'nada es urgente', de: "    const urgente = PENDIENTES_URGENTES.includes(`${fila.modulo}:${fila.clave}`)", a: '    const urgente = false' },
      { nombre: 'el fondo del ícono con el color entero', de: "t: `oklch(0.955 ${Math.max(C * 0.28, 0.008).toFixed(3)} ${H})`", a: "t: `oklch(0.955 ${C} ${H})`" },
    ],
  },
  {
    suite, original: path.join(RAIZ, 'js', 'preferencias.js'), funciones: [], variable: 'ARCHIVO_PREFS',
    manuales: [
      { nombre: 'los fijados no van arriba', de: '  const fijados = p.barra.fijados.filter(c => porClave.has(c)).map(c => porClave.get(c))', a: '  const fijados = []' },
      { nombre: 'alfabético no ordena', de: "    resto = [...resto].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))", a: '    resto = [...resto]' },
      { nombre: 'el uso de hace más de 30 días cuenta', de: "  return (prefs?.uso?.[clave] ?? []).filter(t => t >= desde).length", a: "  return (prefs?.uso?.[clave] ?? []).length" },
      { nombre: 'un orden raro se acepta', de: "  v.barra.orden = ORDENES_BARRA.includes(b.orden) ? b.orden : 'mano'", a: "  v.barra.orden = b.orden || 'mano'" },
      { nombre: 'se guarda para todos (sin la persona)', de: '  return `sd.prefs.${empleadoId}`', a: "  return 'sd.prefs'" },
    ],
  },
  {
    suite, original: path.join(RAIZ, 'css', 'main.css'), funciones: [], variable: 'ARCHIVO_CSS',
    manuales: [
      { nombre: 'la barra aparece en el celular', de: '.barra-lateral { display: none; }\n', a: '.barra-lateral { display: flex; }\n' },
      { nombre: 'se muestra desde 768', de: '@media (min-width: 1024px) {\n  body.con-barra-lateral', a: '@media (min-width: 768px) {\n  body.con-barra-lateral' },
      { nombre: 'se imprime', de: '  .barra-lateral, .barra-abajo, .hoja-mas { display: none !important; }', a: '  .hoja-mas { display: none !important; }' },
      { nombre: 'achicada no esconde los nombres', de: '  .barra-lateral-colapsada .barra-lateral__nombre, .barra-lateral-colapsada .barra-lateral__marca { display: none; }\n', a: '' },
      { nombre: 'la barra tapa los modales', de: '    width: var(--ancho-barra-lateral); z-index: 30;', a: '    width: var(--ancho-barra-lateral); z-index: 200;' },
      { nombre: 'la urgente sin bordó', de: '  .barra-lateral__burbuja--urgente { background: var(--bordo); color: #fff; }\n', a: '' },
    ],
  },
])
