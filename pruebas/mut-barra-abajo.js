// Mutaciones de test-barra-abajo.js (la barra de abajo del celular a gusto de
// cada persona, 05/10/2026). Ver mutar.js (mismos guards). De a una. Muta
// js/preferencias.js (ARCHIVO_PREFS), js/barra-lateral.js (ARCHIVO_TEST) y
// css/main.css (ARCHIVO_CSS). Las que importan más: que guardar la barra NO
// borre lo de la pantalla principal (y al revés).
//
//   node pruebas/mut-barra-abajo.js

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const suite = path.join(__dirname, 'test-barra-abajo.js')
const RAIZ = path.join(__dirname, '..')

correrMutacionesEnVarios([
  {
    suite, original: path.join(RAIZ, 'js', 'preferencias.js'), funciones: [], variable: 'ARCHIVO_PREFS',
    manuales: [
      // Guardar la barra no borra lo de la pantalla principal.
      { nombre: 'la barra sube SOLO su clave (borra el tablero)', de: '      const datos = conClave(actual)', a: '      const datos = conClave({})' },
      { nombre: 'la barra sube la copia vieja de la página, sin leer la cuenta', de: '      const actual = Object.keys(data).length ? data : leerPrefs(empleadoId, ls)', a: '      const actual = leerPrefs(empleadoId, ls)' },
      { nombre: 'la barra no lee la cuenta antes de guardar', de: "      const { data, error } = await sb.rpc('mis_preferencias')\n      if (error) throw error\n      if (!data || Array.isArray(data)", a: "      const data = {}, error = null\n      if (!data || Array.isArray(data)" },
      { nombre: 'sin leer la cuenta igual guarda (pisa a ciegas)', de: "      const { data, error } = await sb.rpc('mis_preferencias')\n      if (error) throw error\n      if (!data || Array.isArray(data)", a: "      const { data: d0, error } = await sb.rpc('mis_preferencias')\n      const data = error ? {} : d0\n      if (!data || Array.isArray(data)" },
      { nombre: 'la barra no va en la cola (se cruza con una subida en camino)', de: '  const enCamino = ESTADO_PREFS.cola.get(empleadoId) ?? Promise.resolve()', a: '  const enCamino = Promise.resolve()' },
      { nombre: 'la barra sin la marca v', de: "{ p_datos: { ...datos, v: VERSION_PREFS } }", a: '{ p_datos: { ...datos } }' },
      { nombre: '"automática" no saca la clave', de: '    else delete x.barra_inferior\n    return x', a: '    return x' },
      { nombre: 'la barra no queda en la página después de guardar', de: '      const p = normalizarPrefs(datos)\n      ESTADO_PREFS.memoria.set(empleadoId, p)\n', a: '      const p = normalizarPrefs(datos)\n' },
      { nombre: 'sin la cuenta, la barra no queda ni en el celular', de: "    if (!sb) { enEsteDispositivo(); return { ok: false, donde: 'dispositivo' } }", a: "    if (!sb) { return { ok: false, donde: 'dispositivo' } }" },
      { nombre: 'si falla, no queda en el celular', de: "      console.warn('preferencias: no se pudo guardar la barra de abajo en la cuenta', e)\n      enEsteDispositivo()\n", a: "      console.warn('preferencias: no se pudo guardar la barra de abajo en la cuenta', e)\n" },
      { nombre: 'si falla, dice que quedó en la cuenta', de: "      return { ok: false, donde: 'dispositivo' }\n    }\n  })", a: "      return { ok: true, donde: 'cuenta' }\n    }\n  })" },
      // Guardar el tablero (con una copia vieja) no borra la barra.
      { nombre: 'guardar el tablero borra la barra de abajo', de: '  if (ahora.barra_inferior) p.barra_inferior = ahora.barra_inferior\n  else delete p.barra_inferior\n', a: '' },
      { nombre: 'guardar el tablero tira las claves desconocidas', de: '  for (const [k, x] of Object.entries(ahora)) if (!(k in p)) p[k] = x\n', a: '' },
      { nombre: 'normalizar tira barra_inferior', de: '  if (abajo.length) v.barra_inferior = abajo\n', a: '' },
      { nombre: 'normalizar tira las claves desconocidas', de: '  for (const [k, x] of Object.entries(p)) if (!conocidas.includes(k) && x !== undefined) v[k] = x\n', a: '' },
      { nombre: 'normalizar guarda la marca v', de: "  const conocidas = ['barra', 'tablero', 'uso', 'barra_inferior', 'v']", a: "  const conocidas = ['barra', 'tablero', 'uso', 'barra_inferior']" },
      { nombre: 'normalizar deja repetidos en la barra', de: '  const abajo = [...new Set(lista(p.barra_inferior))]', a: '  const abajo = lista(p.barra_inferior)' },
      // Qué se ve en la barra.
      { nombre: 'lo elegido no manda', de: '  if (elegidos.length) return elegidos.slice(0, cantidad)\n', a: '' },
      { nombre: 'lo elegido no se corta en lo que entra', de: '  if (elegidos.length) return elegidos.slice(0, cantidad)', a: '  if (elegidos.length) return elegidos' },
      { nombre: 'lo elegido sin mirar los permisos', de: '  const elegidos = (p.barra_inferior ?? []).filter(c => porClave.has(c)).map(c => porClave.get(c))', a: "  const elegidos = (p.barra_inferior ?? []).map(c => porClave.get(c) ?? { clave: c, nombre: c, url: '' })" },
      { nombre: 'sin elegir: los fijados antes que los más usados', de: '  for (const m of [...porUso, ...fijados, ...resto]) {', a: '  for (const m of [...fijados, ...porUso, ...resto]) {' },
      { nombre: 'sin elegir: siempre 3', de: '    if (salen.length >= cantidad) break', a: '    if (salen.length >= 3) break' },
    ],
  },
  {
    suite, original: path.join(RAIZ, 'js', 'barra-lateral.js'), funciones: ['htmlEditarAbajo'], escape: 'escDash', variable: 'ARCHIVO_TEST',
    manuales: [
      { nombre: 'capacidad sin piso de 4', de: '  return Math.max(MIN_ABAJO, Math.min(MAX_ABAJO, n))', a: '  return Math.min(MAX_ABAJO, n)' },
      { nombre: 'capacidad sin tope de 6', de: '  return Math.max(MIN_ABAJO, Math.min(MAX_ABAJO, n))', a: '  return Math.max(MIN_ABAJO, n)' },
      { nombre: 'capacidad sin contar Inicio y Más', de: '  const n = Math.floor((Number(ancho) || 0) / ANCHO_TAB_ABAJO) - 2', a: '  const n = Math.floor((Number(ancho) || 0) / ANCHO_TAB_ABAJO)' },
      { nombre: 'agregar pasa de lo que entra', de: "  if (accion === 'agregar') { if (i < 0 && l.length < cantidad) l.push(clave); return l }", a: "  if (accion === 'agregar') { if (i < 0) l.push(clave); return l }" },
      { nombre: 'agregar repite', de: "  if (accion === 'agregar') { if (i < 0 && l.length < cantidad) l.push(clave); return l }", a: "  if (accion === 'agregar') { if (l.length < cantidad) l.push(clave); return l }" },
      { nombre: 'subir no sube', de: "  else if (accion === 'subir' && i > 0) [l[i - 1], l[i]] = [l[i], l[i - 1]]\n", a: '' },
      { nombre: 'bajar el último se sale', de: "  else if (accion === 'bajar' && i < l.length - 1) [l[i + 1], l[i]] = [l[i], l[i + 1]]", a: "  else if (accion === 'bajar') [l[i + 1], l[i]] = [l[i], l[i + 1]]" },
      { nombre: '"Agregar" no se apaga con la barra llena', de: "aria-label=\"Agregar ${n} a la barra\"${lleno ? ' disabled' : ''}>", a: "aria-label=\"Agregar ${n} a la barra\">" },
      { nombre: 'sin el aviso de barra llena', de: "      (lleno && fuera.length ? '<p class=\"editar-abajo__nota\">La barra está llena: sacá uno para agregar otro.</p>' : '') +\n", a: '' },
      { nombre: 'sin "Editar" en la hoja Más', de: "      '<button type=\"button\" class=\"hoja-mas__editar\" id=\"hoja-mas-editar\" aria-haspopup=\"dialog\">Editar la barra de abajo</button>' +\n", a: '' },
      { nombre: 'los íconos de abajo del tamaño de antes', de: "`<span class=\"barra-abajo__icono\">${htmlIcono(m.clave, 23)}</span>", a: "`<span class=\"barra-abajo__icono\">${htmlIcono(m.clave, 21)}</span>" },
      { nombre: 'la barra no usa la cantidad que entra', de: '      abajo.innerHTML = htmlBarraAbajo({ abajo: modulosDeAbajo(modulos, prefs, Date.now(), cantidad), actual, raiz: RAIZ })', a: '      abajo.innerHTML = htmlBarraAbajo({ abajo: modulosDeAbajo(modulos, prefs), actual, raiz: RAIZ })' },
      { nombre: 'Guardar sin ninguno igual guarda', de: "      if (!automatica && !ed.lista.length) { ed.error = 'Elegí al menos un módulo, o tocá «Volver a la automática».'; return pintarEditor() }\n", a: '' },
      { nombre: '"Volver a la automática" guarda la lista', de: '      const r = await guardarBarraInferior({ empleadoId: yo.id, lista: automatica ? [] : ed.lista })', a: '      const r = await guardarBarraInferior({ empleadoId: yo.id, lista: ed.lista })' },
      { nombre: 'después de guardar la barra no se rearma', de: '      const r = await guardarBarraInferior({ empleadoId: yo.id, lista: automatica ? [] : ed.lista })\n      prefs = leerPrefs(yo.id)\n', a: '      const r = await guardarBarraInferior({ empleadoId: yo.id, lista: automatica ? [] : ed.lista })\n' },
      { nombre: 'la ✕ guarda', de: "      if (b.id === 'editar-abajo-cerrar') return cerrarEditor()", a: "      if (b.id === 'editar-abajo-cerrar') return guardarEditor(false)" },
      { nombre: 'el toque largo no abre el editor', de: '      largo = win.setTimeout?.(() => { largo = null; abrioPorLargo = true; abrirEditor() }, MS_TOQUE_LARGO) ?? null', a: '      largo = win.setTimeout?.(() => { largo = null }, MS_TOQUE_LARGO) ?? null' },
      { nombre: 'soltar no cancela el toque largo', de: "    for (const t of ['pointerup', 'pointercancel', 'pointerleave', 'pointermove']) abajo.addEventListener(t, cortarLargo)\n", a: '' },
      { nombre: 'el toque largo además navega', de: "    abajo.addEventListener('click', ev => { if (abrioPorLargo) { abrioPorLargo = false; ev.preventDefault(); ev.stopPropagation() } }, true)\n", a: '' },
      { nombre: 'sale el menú del navegador', de: "    abajo.addEventListener('contextmenu', ev => ev.preventDefault())\n", a: '' },
      { nombre: 'girar el celular no rearma la barra', de: '      cantidad = n\n      dibujar()\n', a: '      cantidad = n\n' },
      { nombre: 'Escape no cierra el editor', de: '      if (!editor.hidden) cerrarEditor()\n      else ', a: '      ' },
    ],
  },
  {
    suite, original: path.join(RAIZ, 'css', 'main.css'), funciones: [], variable: 'ARCHIVO_CSS',
    manuales: [
      { nombre: 'la barra del alto de antes', de: '    height: calc(68px + env(safe-area-inset-bottom, 0px));', a: '    height: calc(64px + env(safe-area-inset-bottom, 0px));' },
      { nombre: 'el nombre del tamaño de antes', de: '  .barra-abajo__nombre { font-size: 12.5px;', a: '  .barra-abajo__nombre { font-size: 11.5px;' },
      { nombre: 'el editor no se esconde con hidden', de: '.hoja-mas[hidden], .hoja-abajo[hidden] { display: none; }', a: '.hoja-mas[hidden] { display: none; }' },
      { nombre: 'el editor no es una hoja fija', de: '  .hoja-mas, .hoja-abajo { position: fixed; inset: 0; z-index: 45;', a: '  .hoja-mas { position: fixed; inset: 0; z-index: 45;' },
      { nombre: 'el editor se imprime', de: '  .barra-lateral, .barra-abajo, .hoja-mas, .hoja-abajo { display: none !important; }', a: '  .barra-lateral, .barra-abajo, .hoja-mas { display: none !important; }' },
      { nombre: 'botones del editor chicos', de: '    min-width: 44px; height: 44px; flex-shrink: 0; border-radius: 10px;', a: '    min-width: 32px; height: 32px; flex-shrink: 0; border-radius: 10px;' },
    ],
  },
])
