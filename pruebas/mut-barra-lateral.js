// Mutaciones de test-barra-lateral.js. Ver mutar.js (mismos guards). De a una.
// Muta js/barra-lateral.js (ARCHIVO_TEST), js/modulos.js (ARCHIVO_MODULOS) y
// css/main.css (ARCHIVO_CSS).
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
      { nombre: 'sin mirar los permisos', de: '  return MODULOS.filter(m => !m.proximamente && moduloVisible(m, ctx))', a: '  return MODULOS.filter(m => !m.proximamente)' },
      { nombre: 'sin sesión igual se dibuja', de: '    if (!uid) return null\n', a: '' },
      { nombre: 'la tablet se revisa solo por la dirección', de: "    if (!debeMostrarse({ pathname: win.location.pathname, esDispositivo: yo.es_dispositivo })) return null\n", a: '' },
      { nombre: 'barra vacía sin módulos', de: '    if (!modulos.length) return null\n', a: '' },
      { nombre: 'no marca el actual', de: "${esActual ? ' aria-current=\"page\"' : ''}", a: '' },
      { nombre: 'el actual sin su clase', de: "${esActual ? ' barra-lateral__item--actual' : ''}", a: '' },
      { nombre: 'Cheques en Administración marca Administración', de: '  if (conParametros) return conParametros.clave\n', a: '' },
      { nombre: 'cheques.html no marca Cheques', de: "  if (archivo === 'cheques.html') return 'cheques'\n", a: '' },
      { nombre: 'la preferencia no manda', de: "  if (guardado === '1') return true\n", a: '' },
      { nombre: 'no recuerda al achicar', de: '        guardar(colapsada)\n', a: '' },
      { nombre: 'el body no se entera de que está achicada', de: "      doc.body.classList.toggle('barra-lateral-colapsada', colapsada)\n", a: '' },
      { nombre: 'sin la clase del body (la página no se corre)', de: "    doc.body.classList.add('con-barra-lateral')\n", a: '' },
      { nombre: 'al achicar se pierden las burbujas', de: '        pintarBurbujasBarra(nav, ultimos)\n', a: '' },
      { nombre: 'el texto de los pendientes sin escapar', de: "  const detalle = escDash(p.detalle.join(' · '))", a: "  const detalle = p.detalle.join(' · ')" },
      { nombre: 'la burbuja con cero', de: "  if (!p || !(p.total > 0)) return ''", a: "  if (!p) return ''" },
      { nombre: 'sin tope 99+', de: "p.total > 99 ? '99+' : String(p.total)", a: 'String(p.total)' },
      { nombre: 'un error deja la burbuja vieja', de: "  nav.querySelectorAll('.barra-lateral__burbuja').forEach(b => b.remove())\n  if (!porModulo) return", a: '  if (!porModulo) return' },
      { nombre: 'un error de mis_pendientes pinta algo', de: '      } catch { porModulo = null }', a: '      } catch { porModulo = new Map([[\'caja\', { total: 1, detalle: [\'x\'] }]]) }' },
      { nombre: 'no se recarga al volver', de: "    doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'visible') cargarPendientes() })\n", a: '' },
      { nombre: 'sin leer las tareas: todo lo que las pide aparece', de: "      misTareas = new Set((t.error ? [] : (t.data || [])).map(x => `${x.modulo}:${x.tarea}`))", a: "      misTareas = new Set((t.data || [{ modulo: 'cobranzas', tarea: 'procesar' }]).map(x => `${x.modulo}:${x.tarea}`))" },
      { nombre: 'las tareas de todos (sin filtrar por persona)', de: "        sb.from('empleado_tareas').select('modulo, tarea').eq('empleado_id', yo.id).eq('habilitado', true),", a: "        sb.from('empleado_tareas').select('modulo, tarea').eq('habilitado', true)," },
      { nombre: 'los módulos deshabilitados cuentan', de: "        sb.from('empleado_modulos').select('modulo').eq('empleado_id', yo.id).eq('habilitado', true),", a: "        sb.from('empleado_modulos').select('modulo').eq('empleado_id', yo.id)," },
      { nombre: 'el logo no lleva al inicio', de: "new URL('dashboard.html', raiz).href", a: "new URL('index.html', raiz).href" },
      { nombre: 'el botón no dice su estado', de: "aria-expanded=\"${colapsada ? 'false' : 'true'}\"", a: 'aria-expanded="true"' },
      { nombre: 'achicada sin tooltip', de: ` title="\${escDash(m.nombre)}"\${esActual`, a: `\${esActual` },
    ],
  },
  {
    suite, original: path.join(RAIZ, 'js', 'modulos.js'), funciones: [], variable: 'ARCHIVO_MODULOS',
    manuales: [
      { nombre: 'Accesos para cualquiera', de: '  if (modulo.soloSuperAdmin) return esSuperAdmin\n', a: '' },
      { nombre: 'Cheques sin pedir tareas', de: '  if (!modulo.requiereTareas) return true\n', a: '  return true\n' },
    ],
  },
  {
    suite, original: path.join(RAIZ, 'css', 'main.css'), funciones: [], variable: 'ARCHIVO_CSS',
    manuales: [
      { nombre: 'la barra aparece en el celular', de: '.barra-lateral { display: none; }\n', a: '.barra-lateral { display: flex; }\n' },
      { nombre: 'se muestra desde 768', de: '@media (min-width: 1024px) {\n  body.con-barra-lateral', a: '@media (min-width: 768px) {\n  body.con-barra-lateral' },
      { nombre: 'se imprime', de: '  .barra-lateral { display: none !important; }\n  body.con-barra-lateral { margin-left: 0 !important; }', a: '  body.con-barra-lateral { margin-left: 0 !important; }' },
      { nombre: 'achicada no esconde los nombres', de: '  .barra-lateral-colapsada .barra-lateral__nombre { display: none; }\n', a: '' },
      { nombre: 'la barra tapa los modales', de: '    z-index: 30;\n    box-sizing: border-box;\n    padding: 0.75rem 0.5rem;', a: '    z-index: 200;\n    box-sizing: border-box;\n    padding: 0.75rem 0.5rem;' },
    ],
  },
])
