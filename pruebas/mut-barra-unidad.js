// Mutaciones de la barra de unidad (ver test-barra-unidad.js).
const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-barra-unidad.js'),
  original: path.join(__dirname, '..', 'js', 'barra-unidad.js'),
  funciones: [],
  manuales: [
    // Embebida (05/10/2026): Cuentas corrientes → Clientes abre Administración adentro.
    { nombre: 'embebida, la barra se dibuja igual (dos barras)', de: '    if (doc.documentElement?.dataset?.embebido) {\n      if (estado.mostrar) seguirOtraPestana(win)\n      return null\n    }\n', a: '' },
    { nombre: 'embebida, no sigue a la pantalla de afuera', de: '      if (estado.mostrar) seguirOtraPestana(win)\n      return null', a: '      return null' },
    { nombre: 'super_admin no ve todas', de: "if (yo.rol_app === 'super_admin') return new Set(todas)", a: "if (yo.rol_app === 'super_admin_x') return new Set(todas)" },
    { nombre: 'no suma la unidad propia', de: 'ids.add(yo.unidad_negocio_id)', a: 'void 0' },
    { nombre: 'el alcance {todas:true} no suma', de: 'if (a.todas === true) { for (const id of todas) ids.add(id); continue }', a: 'if (a.todas === true) continue' },
    { nombre: 'acepta ids de alcance que no existen', de: 'if (todas.includes(id)) ids.add(id)', a: 'ids.add(id)' },
    { nombre: 'con una sola unidad filtra igual', de: 'if (!Array.isArray(unidades) || unidades.length < 2) return null', a: 'if (!Array.isArray(unidades)) return null' },
    { nombre: 'una recordada que ya no es de la persona queda', de: 'return unidades.some(u => u.id === guardado) ? guardado : null', a: 'return guardado' },
    { nombre: 'una fila sin unidad desaparece', de: "if (unidadId == null || unidadId === '') return true", a: '' },
    { nombre: 'Todas no deja pasar todo', de: '  if (!elegida) return true\n', a: '' },
    { nombre: 'no saca la fábrica de pruebas', de: 'ordenarUnidades(sinUnidadesDePrueba(activas.filter(u => ids.has(u.id)), fabrica))', a: 'ordenarUnidades(activas.filter(u => ids.has(u.id)))' },
    { nombre: 'no escapa el nombre del chip', de: '<span class="barra-unidad__texto">${escUni(texto)}</span>', a: '<span class="barra-unidad__texto">${texto}</span>' },
    { nombre: 'no escapa el title', de: 'title="${escUni(titulo)}">', a: 'title="${titulo}">' },
    { nombre: 'no escapa la nota', de: '<span class="barra-unidad__nota">${escUni(nota)}</span>', a: '<span class="barra-unidad__nota">${nota}</span>' },
    { nombre: 'escUni no escapa <', de: ".replace(/</g, '&lt;')", a: '' },
    { nombre: 'acepta cualquier logo', de: "return /^[a-z0-9][a-z0-9._-]*\\.(png|jpe?g|webp)$/i.test(t) && !t.includes('..') ? t : null", a: 'return t || null' },
    { nombre: 'se dibuja con una sola unidad', de: 'mostrar: r.unidades.length > 1', a: 'mostrar: r.unidades.length > 0' },
    { nombre: 'se muestra en la planta', de: "if (/\\/modulos\\/produccion\\.html$/.test(pathname || '')) return false\n  if (/\\/(index", a: "if (/\\/(index" },
    { nombre: 'se muestra a una tablet', de: 'export function debeMostrarseUnidad({ pathname, esDispositivo }) {\n  if (esDispositivo === true) return false', a: 'export function debeMostrarseUnidad({ pathname, esDispositivo }) {' },
    { nombre: 'no guarda la elección', de: "localStorage.setItem(CLAVE_ELEGIDA, id || TODAS)", a: 'void 0' },
    { nombre: 'no avisa al cambiar', de: '  pintar()\n  avisar()\n}', a: '  pintar()\n}' },
    { nombre: 'la nota sale siempre', de: "notaPagina = meta?.getAttribute('content') === 'no-filtra' ? 'Esta pantalla muestra todas las unidades.' : ''", a: "notaPagina = 'Esta pantalla muestra todas las unidades.'" },
    { nombre: 'no sigue a otra pestaña', de: "if (ev.key !== CLAVE_ELEGIDA || !estado) return", a: 'return' },
    // La barra de arriba (29/09/2026): el usuario y su menú.
    { nombre: 'la pastilla no escapa el nombre', de: '<span class="barra-arriba__nombre">${escUni(nombreDePila(nombre))}</span>', a: '<span class="barra-arriba__nombre">${nombreDePila(nombre)}</span>' },
    { nombre: 'el menú no escapa el mail', de: '<span class="barra-arriba__menu-mail">${escUni(email || \'\')}</span>', a: '<span class="barra-arriba__menu-mail">${email || \'\'}</span>' },
    { nombre: 'inventa "0 abiertas" sin saber', de: "Number.isInteger(sesiones) && sesiones > 0 ?", a: 'true ?' },
    { nombre: 'Mi cuenta no lleva al dashboard', de: "new URL('dashboard.html?cuenta=mi-cuenta', raiz)", a: "new URL('dashboard.html', raiz)" },
    { nombre: 'el nombre sale de la ficha (Apellido Nombre)', de: "  yo.nombreVisible = meta.nombre_completo || meta.full_name || yo.nombre || ''", a: "  yo.nombreVisible = yo.nombre || ''" },
    // pasarBarraAUnidad (02/10/2026): un módulo pasa la barra a una unidad.
    { nombre: 'pasarBarraAUnidad acepta una unidad que no es de la persona', de: '  if (!estado.unidades.some(u => u.id === id)) return false\n  elegirUnidad(id)', a: '  elegirUnidad(id)' },
    { nombre: 'pasarBarraAUnidad no cambia la barra', de: '  elegirUnidad(id)\n  return estado.elegida === id', a: '  return estado.elegida === id' },
    { nombre: 'pasarBarraAUnidad dice que sí sin mirar', de: '  return estado.elegida === id\n}', a: '  return true\n}' },
    { nombre: 'pasarBarraAUnidad antes de cargar tira', de: '  if (!estado || !id) return false\n  if (!estado.unidades', a: '  if (!estado.unidades' },
    { nombre: 'con una unidad no marca "sin fábricas"', de: "  nav.classList.toggle('barra-arriba--sin-fabricas', !estado.mostrar)\n", a: '' },
  ],
})
