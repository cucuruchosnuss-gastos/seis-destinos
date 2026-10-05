// Proyectos Taller en el celular (02/10/2026) — modulos/taller.html.
//
// Exige:
//  - "+ Nuevo proyecto" (#tl-btn-nuevo) ya NO es tl-solo-compu: se ve en el
//    celular para quien gestiona (pintarAccionesLista lo prende con
//    puedeGestionar), primero en la barra de la lista, a todo el ancho y de
//    48 px;
//  - "Valor de la hora" también se ve en el celular (lo consulta cualquiera);
//  - el formulario del proyecto a 390 px: letra de 16 px en los campos (sin
//    zoom), "¿Para quién es?" en dos botones parejos, una columna, y la barra
//    de abajo escondida mientras se escribe;
//  - editar el proyecto (que cambia también el estado) está en la ficha del
//    celular;
//  - lo que sigue solo en la compu, a propósito: el diagrama de actividades
//    (el celular tiene "Mis actividades"), la búsqueda y los filtros de
//    archivos, y la nota de "las fotos se suben desde el celular".
//
//   node pruebas/test-taller-celu.js
// Archivo bajo prueba: ARCHIVO_TEST, o modulos/taller.html.

const fs = require('fs')
const path = require('path')
const { arnes } = require('./circuito-comun')
const { construirTaller } = require('./sandbox-taller')

const RAIZ = path.join(__dirname, '..')
const RUTA = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos', 'taller.html')
const HTML = fs.readFileSync(RUTA, 'utf8')
console.log(`ARCHIVO ${RUTA} (${HTML.length} bytes)`)
const { chk, fin } = arnes()

const CSS = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>'))
const celu = (() => { const i = CSS.indexOf('@media (max-width: 760px)'); return i < 0 ? '' : CSS.slice(i, CSS.indexOf('\n    }\n', i)) })()

function nuevo(tareas) {
  const s = construirTaller({ archivo: RUTA })
  s.estado.misTareas = new Set(tareas)
  s.estado.miRolApp = 'usuario'
  s.estado.miEmpleadoId = 'emp-yo'
  return s
}

// ── 1. El botón ──────────────────────────────────────────────────────────────
{
  const boton = /<button[^>]*id="tl-btn-nuevo"[^>]*>/.exec(HTML)?.[0] ?? ''
  chk('"+ Nuevo proyecto" existe', !!boton)
  chk('"+ Nuevo proyecto" ya no es solo de la compu', !/tl-solo-compu/.test(boton), boton)
  chk('arranca escondido (lo prende el permiso)', /\shidden[\s>]/.test(boton))
  const g = nuevo(['ver', 'cargar', 'gestionar'])
  g.__el('tl-btn-nuevo'); g.__el('tl-acciones-extra')
  g.pintarAccionesLista()
  chk('con gestionar: se ve', g.__el('tl-btn-nuevo').hidden === false)
  chk('el valor de la hora tampoco es solo de la compu', !/tl-solo-compu/.test(g.__el('tl-acciones-extra').innerHTML), g.__el('tl-acciones-extra').innerHTML)
  const v = nuevo(['ver', 'cargar'])
  v.__el('tl-btn-nuevo'); v.__el('tl-acciones-extra')
  v.pintarAccionesLista()
  chk('sin gestionar: no se ve', v.__el('tl-btn-nuevo').hidden === true)
  chk('celular: primero en la barra, a todo el ancho y de 48 px',
    /#tl-btn-nuevo \{ order: -1; flex: 1 0 100%; height: 48px;/.test(celu), celu.slice(0, 300))
  chk('celular: el valor de la hora a todo el ancho', /#tl-acciones-extra \.tl-btn \{ width: 100%; \}/.test(celu))
}

// ── 2. El formulario a 390 px ───────────────────────────────────────────────
{
  chk('celular: letra de 16 px en los campos del formulario (sin zoom)',
    /#tl-vista-editor \.tl-input, #tl-vista-editor \.tl-textarea, #tl-vista-editor \.tl-campo select \{ font-size: 16px; min-height: 44px; \}/.test(celu))
  chk('celular: "¿Para quién es?" en dos botones parejos', /\.tl-seg-editor \.tl-seg__op \{ flex: 1 1 0; min-height: 44px; white-space: normal;/.test(celu))
  chk('celular: los campos de a dos pasan a una columna', /#tl-vista-editor \.tl-fila-campos \{ grid-template-columns: minmax\(0, 1fr\); \}/.test(celu))
  chk('celular: el campo con el foco queda por encima de la barra de abajo', /:focus \{ scroll-margin-bottom: 96px; \}/.test(celu))
  chk('con el teclado abierto, la barra de abajo se esconde (hasta 1023 px)',
    /@media \(max-width: 1023\.98px\) \{\n\s*body:has\(#tl-vista-editor:not\(\[hidden\]\) :is\(input, textarea, select\):focus\) \.barra-abajo \{ display: none !important; \}/.test(CSS))
  chk('el botón de guardar ocupa el ancho', /id="tl-ed-guardar"/.test(HTML) && /tl-btn--ancho tl-btn--grande" id="tl-ed-guardar"/.test(HTML))
}

// ── 3. Lo de gestión en el celular, y lo que queda en la compu ─────────────
{
  const s = nuevo(['ver', 'cargar', 'gestionar'])
  const r = { id: 'p1', nombre: 'P', destino: 'externo', categoria: 'maquina', estado: 'en_curso', cliente: null, fecha_entrega_prometida: null }
  const h = s.htmlResumenCelu(r, { gestionar: true })
  chk('la ficha del celular tiene "Editar el proyecto" (estado incluido)', /data-accion="editar">Editar el proyecto/.test(h))
  chk('sin gestionar, la ficha del celular no ofrece editar', !/data-accion="editar"/.test(s.htmlResumenCelu(r, {})) && !/data-accion="editar"/.test(s.htmlResumenCelu(r, { precios: true })))
  chk('el estado se cambia en el formulario (que el celular ya abre)', /<select id="tl-ed-estado">/.test(HTML))
  chk('el diagrama de la compu sigue solo en la compu', /<div class="tl-diag-compu tl-solo-compu">/.test(HTML))
  chk('la búsqueda y los filtros de archivos siguen solo en la compu', /let h = '<div class="tl-tool tl-solo-compu"><label class="tl-buscar">/.test(HTML))
  // Ningún otro tl-solo-compu de gestión: los que quedan son los de arriba.
  const quedan = (HTML.match(/tl-solo-compu/g) || []).length
  chk('el "agrupar" del diagrama sigue solo en la compu', /return '<div class="tl-tool tl-solo-compu"><div class="tl-seg" role="group" aria-label="Cómo agrupar">/.test(HTML))
  chk('la nota de las fotos sigue solo en la compu', /<p class="tl-texto-suave tl-solo-compu">Las fotos se pueden subir desde el celular/.test(HTML))
  chk('quedan solo los tl-solo-compu esperados (CSS, archivos ×2, agrupar, diagrama)', quedan === 5, quedan)
}

fin()
