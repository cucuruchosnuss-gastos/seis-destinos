// Mutaciones de test-administracion-errores.js (Errores de la app en
// castellano, 30/09/2026). Ver mutar.js (los tres guards).
//
//   node pruebas/mut-administracion-errores.js
const path = require('path')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

correrMutaciones({
  suite: path.join(__dirname, 'test-administracion-errores.js'),
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/administracion.html'),
  region: limitesAdministracion,
  funciones: [],
  manuales: [
    // Solo super_admin
    { nombre: 'la sección la ve cualquiera', de: "      if (s.soloSuperAdmin) return estado.miRolApp === 'super_admin'\n", a: "      if (s.soloSuperAdmin) return true\n" },
    { nombre: 'se abre sin ser super_admin', de: "      if (estado.miRolApp !== 'super_admin') { mostrarInicio(); return }\n      mostrarVista('ad-vista-errores')", a: "      mostrarVista('ad-vista-errores')" },
    // Lo que se pide
    { nombre: 'siempre con lo informativo', de: "{ p_dias: DIAS_ERRORES, p_incluir_info: !!info }", a: '{ p_dias: DIAS_ERRORES, p_incluir_info: true }' },
    { nombre: 'otros días', de: '    const DIAS_ERRORES = 7\n', a: '    const DIAS_ERRORES = 30\n' },
    { nombre: 'null se lee como "no hay errores"', de: "      if (data === null || data === undefined) throw new Error('errores_resumen devolvió null (¿no es super_admin?)')\n", a: '' },
    { nombre: 'el tilde no cambia lo que se pide', de: '      estado.errores.info = !!ver\n', a: '' },
    // La tarjeta
    { nombre: 'sin el título', de: '<div class="ad-error-app__mensaje">${esc(g.titulo)}</div>', a: '<div class="ad-error-app__mensaje"></div>' },
    { nombre: 'el título sin escapar', de: '<div class="ad-error-app__mensaje">${esc(g.titulo)}</div>', a: '<div class="ad-error-app__mensaje">${g.titulo}</div>' },
    { nombre: 'sin la explicación', de: "        `<p class=\"ad-error-app__texto\">${esc(g.explicacion)}</p>` +\n", a: '' },
    { nombre: 'sin "qué hacer"', de: "        `${limpio(g.que_hacer) ? `<p class=\"ad-error-app__texto\"><strong>Qué hacer:</strong> ${esc(g.que_hacer)}</p>` : ''}` +\n", a: '' },
    { nombre: '"qué hacer" sin escapar', de: '<strong>Qué hacer:</strong> ${esc(g.que_hacer)}</p>', a: '<strong>Qué hacer:</strong> ${g.que_hacer}</p>' },
    { nombre: 'sin cuántas veces', de: "      const meta = `${veces} ${veces === 1 ? 'vez' : 'veces'} · primera", a: '      const meta = `primera' },
    { nombre: 'sin singular', de: "`${veces} ${veces === 1 ? 'vez' : 'veces'} · primera", a: "`${veces} veces · primera" },
    { nombre: 'la hora sin la zona de Argentina', de: "new Intl.DateTimeFormat('es-AR', { timeZone: ZONA_AR, day: '2-digit'", a: "new Intl.DateTimeFormat('es-AR', { day: '2-digit'" },
    { nombre: 'sin pantallas ni personas', de: "        `<p class=\"ad-fila__meta\">${esc(donde)}</p>` +\n", a: '' },
    { nombre: 'las personas sin escapar', de: '<p class="ad-fila__meta">${esc(donde)}</p>', a: '<p class="ad-fila__meta">${donde}</p>' },
    { nombre: 'la lista corta sin "y N más"', de: "      return v.slice(0, tope).join(', ') + (v.length > tope ? ` y ${v.length - tope} más` : '')", a: "      return v.join(', ')" },
    { nombre: 'sin personas dice vacío', de: "      if (!v.length) return '—'\n", a: '' },
    { nombre: 'el detalle a la vista (sin plegar)', de: '<details><summary>Ver detalle</summary><p class="ad-error-app__detalle">${esc(g.ejemplo)}</p></details>', a: '<p class="ad-error-app__detalle">${esc(g.ejemplo)}</p>' },
    { nombre: 'el detalle sin escapar', de: '<p class="ad-error-app__detalle">${esc(g.ejemplo)}</p></details>', a: '<p class="ad-error-app__detalle">${g.ejemplo}</p></details>' },
    { nombre: 'la clave sin escapar', de: 'data-error-tipo="${esc(g.clave)}"', a: 'data-error-tipo="${g.clave}"' },
    { nombre: 'el aviso en bordó', de: "      aviso: { etiqueta: 'Aviso', clase: 'ad-error-app--aviso' },", a: "      aviso: { etiqueta: 'Aviso', clase: 'ad-error-app--error' }," },
    { nombre: 'una gravedad desconocida sin clase', de: '      const grav = GRAVEDAD_ERROR[g.gravedad] ?? GRAVEDAD_ERROR.error', a: "      const grav = GRAVEDAD_ERROR[g.gravedad] ?? { etiqueta: g.gravedad, clase: '' }" },
    { nombre: 'la cuenta sin veces', de: " · ${veces} ${veces === 1 ? 'vez' : 'veces'} en ${DIAS_ERRORES} días`", a: '`' },
    { nombre: 'la falla se lee como "no hay errores"', de: "        estado.errores.error = 'No se pudieron leer los errores de la app. Revisá la conexión y volvé a entrar.'", a: '        estado.errores.grupos = []' },
    // Arreglar
    { nombre: 'sin "Marcar como arreglado"', de: '        htmlArreglarError(g, estado.errores.arreglando) + `</div>`', a: '        `</div>`' },
    { nombre: 'la nota en otra tarjeta', de: '      if (!a || a.clave !== g.clave) {', a: '      if (!a) {' },
    { nombre: 'sin nota se manda igual', de: "      if (!limpio(a.nota)) { a.error = 'Escribí qué se hizo.'; pintarErrores(); return }\n", a: '' },
    { nombre: 'la nota con espacios', de: "{ p_clave: a.clave, p_nota: limpio(a.nota) }", a: '{ p_clave: a.clave, p_nota: a.nota }' },
    { nombre: 'un doble toque manda dos veces', de: '      if (!a || a.guardando) return\n      if (!limpio(a.nota))', a: '      if (!a) return\n      if (!limpio(a.nota))' },
    { nombre: 'mientras guarda no se traba', de: `\${a.guardando ? ' disabled' : ''}>Marcar como arreglado`, a: '>Marcar como arreglado' },
    { nombre: 'el error de la base no se muestra', de: "        if (estado.errores.arreglando === a) { a.guardando = false; a.error = err?.message || 'No se pudo guardar. Probá de nuevo.' }", a: '        if (estado.errores.arreglando === a) { a.guardando = false }' },
    { nombre: 'el error sin escapar', de: "        `${a.error ? `<p class=\"ad-error-pegado\">${esc(a.error)}</p>` : ''}` +\n        `<div class=\"ad-panel__acciones\"><button type=\"button\" class=\"ad-btn\" id=\"ad-errores-si\"",
      a: "        `${a.error ? `<p class=\"ad-error-pegado\">${a.error}</p>` : ''}` +\n        `<div class=\"ad-panel__acciones\"><button type=\"button\" class=\"ad-btn\" id=\"ad-errores-si\"" },
    { nombre: 'la nota sin escapar', de: '>${esc(a.nota ?? \'\')}</textarea>', a: '>${a.nota ?? \'\'}</textarea>' },
    { nombre: 'no vuelve a leer al arreglar', de: '        estado.errores.arreglando = null\n        await mostrarErrores()', a: '        estado.errores.arreglando = null' },
    { nombre: 'no avisa', de: '        mostrarExito(`Marcado como arreglado', a: '        void(`Marcado como arreglado' },
    { nombre: 'Cancelar no cierra', de: '      if (estado.errores.arreglando?.guardando) return\n      estado.errores.arreglando = null\n      pintarErrores()', a: '      pintarErrores()' },
    // La burbuja
    { nombre: 'la burbuja cuenta lo informativo', de: "      return grupos.filter(g => g?.gravedad !== 'info').reduce(", a: '      return grupos.reduce(' },
    { nombre: 'la burbuja cuenta tipos y no veces', de: '.reduce((a, g) => a + (Number(g?.veces) || 0), 0)\n    }', a: '.length\n    }' },
    { nombre: 'la burbuja pide lo informativo', de: '      const grupos = await leerErrores(false)', a: '      const grupos = await leerErrores(true)' },
  ],
})
