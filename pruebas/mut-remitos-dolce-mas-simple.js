// Mutaciones de test-remitos-dolce-mas-simple.js (Remitos Dolce: un solo
// recorrido, 29/10/2026): mutan modulos/remitos-dolce.html (ARCHIVO_TEST) y
// js/remitos-comun.js (ARCHIVO_COMUN_REMITOS). Ver mutar.js.
//
// BASELINE FIJO: la suite tiene que dar ROJO sobre el remitos-dolce.html de
// 2003aa3 (origin/ci-prueba/recibir-entre-empresas, de donde salió la rama
// ci-prueba/remitos-mas-simple). Nunca HEAD.
//
//   node pruebas/mut-remitos-dolce-mas-simple.js
//
// UN RUNNER POR VEZ.
'use strict'

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-remitos-dolce-mas-simple.js')
const BASE = '2003aa3'

if (process.env.MUT_SOLO_ANCLAS !== '1') {
  let viejo = null
  try {
    viejo = execFileSync('git', ['show', `${BASE}:modulos/remitos-dolce.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  } catch {
    console.log(`(sin el historial de git: no se corre el baseline ${BASE})`)
  }
  if (viejo !== null) {
    const tmp = path.join(__dirname, 'mut-tmp-base-remitos-dolce-mas-simple.html')
    fs.writeFileSync(tmp, viejo)
    let rojo = false
    try {
      execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
    } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
    console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre el módulo de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo nuevo.`)
    if (!rojo) process.exit(2)
  }
}

correrMutacionesEnVarios([{
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/remitos-dolce.html'),
  variable: 'ARCHIVO_TEST',
  escape: 'esc',
  funciones: [],
  equivalentes: [],
  manuales: [
    // 1. Subir: la naranja, el editor ahí mismo, la verde
    { nombre: 'la precargada vuelve a decir "Precargado"', de: "texto: 'Listo para cargar lotes', detalle: detalleListoSubida(f, n)", a: "texto: 'Precargado', detalle: detalleListoSubida(f, n)" },
    { nombre: 'la naranja no se abre', de: "detalle: detalleListoSubida(f, n), acopio: !!n?.acopio, abrir: true }", a: 'detalle: detalleListoSubida(f, n), acopio: !!n?.acopio }' },
    { nombre: 'se abre sin Retiros · cargar', de: "const boton = !!e.abrir && puedeEn('retiros', 'cargar', x.unidadId)", a: 'const boton = !!e.abrir' },
    { nombre: 'la naranja nunca es botón', de: "const boton = !!e.abrir && puedeEn('retiros', 'cargar', x.unidadId)", a: 'const boton = false' },
    { nombre: 'un div adentro del botón', de: "      const caja = boton ? 'span' : 'div'", a: "      const caja = 'div'" },
    { nombre: 'la tarjeta sin data-remito-abrir', de: ' data-remito-abrir="${esc(x.clave)}">${rmInterior}', a: '>${rmInterior}' },
    { nombre: 'data-remito-abrir sin escapar', de: ' data-remito-abrir="${esc(x.clave)}">${rmInterior}', a: ' data-remito-abrir="${x.clave}">${rmInterior}' },
    { nombre: 'la tarjeta sin "Cargar ›"', de: "'<span class=\"rt-remito__ir\" aria-hidden=\"true\">Cargar ›</span></button>'", a: "'</button>'" },
    { nombre: 'el detalle sin el cliente', de: "clienteTarjetaSubida(f) || 'sin cliente', ", a: '' },
    { nombre: 'el detalle sin los renglones', de: ", `${k} ${k === 1 ? 'renglón' : 'renglones'}`].join(' · ')", a: "].join(' · ')" },
    { nombre: '"1 renglones"', de: "${k === 1 ? 'renglón' : 'renglones'}", a: 'renglones' },
    { nombre: 'el cliente de otra fábrica', de: "const c = f?.cliente_id && estado.empresaId === f.unidad_negocio_id ? clienteDe(f.cliente_id) : null", a: 'const c = f?.cliente_id ? clienteDe(f.cliente_id) : null' },
    { nombre: 'el cliente sin lo leído', de: '      return limpio(c?.nombre) || limpio(f?.cliente_leido)', a: '      return limpio(c?.nombre)' },
    { nombre: 'Mis remitos sin los renglones', de: 'client_uuid, cliente_id, cliente_leido, items\')', a: 'client_uuid, cliente_id, cliente_leido\')' },
    { nombre: 'no se leen los clientes de la tarjeta', de: '        asegurarClientesSubida(filas, d)\n', a: '' },
    { nombre: 'la tarjeta abre con otro origen', de: "abrirRemito(b.dataset.remitoAbrir, 'subir')", a: 'abrirRemito(b.dataset.remitoAbrir)' },
    { nombre: 'el origen no se guarda', de: "      estado.origenRemito = origen === 'subir' ? 'subir' : 'revisar'\n", a: '' },
    { nombre: 'desde Subir no pasa a la fábrica del remito', de: '      if (deSubida?.unidad_negocio_id) usarEmpresaRemito(deSubida.unidad_negocio_id)\n', a: '' },
    { nombre: 'volver siempre a la otra pestaña', de: "      if (p === 'subir' && puedeSubirRemitos()) return abrirSubirRemitos()\n", a: '' },
    { nombre: 'la pestaña tocada no cuenta', de: '      salirDeRemito(destino)\n    }', a: '      salirDeRemito()\n    }' },
    { nombre: 'cambiar de pestaña no dice a cuál', de: '{ volverDeRemito(p); return }', a: '{ volverDeRemito(); return }' },
    { nombre: 'confirmada no pasa a verde', de: "      marcarSubidoRemito(rm.id, { estado: 'confirmada',", a: "      marcarSubidoRemito(rm.id, { estado: 'precargada'," },
    { nombre: 'confirmada sin el código de la respuesta', de: 'orden_codigo: res.codigo ?? null,', a: 'orden_codigo: null,' },
    { nombre: 'una lectura vieja la vuelve naranja', de: "      return !r ? filas : filas.map(f => r.has(f.id) && f.estado === 'precargada' ? { ...f, ...r.get(f.id) } : f)", a: '      return filas' },
    { nombre: 'confirmar vuelve siempre a Órdenes cargadas', de: "      if (estado.vista === 'ad-vista-remito') await salirDeRemito()\n    }\n\n    // El mensaje de una Edge Function", a: "      if (estado.vista === 'ad-vista-remito') await mostrarRevisar()\n    }\n\n    // El mensaje de una Edge Function" },
    { nombre: 'descartar no se marca en Subir', de: "      marcarSubidoRemito(rm.id, { estado: 'descartada', descartado_motivo: m })\n", a: '' },
    { nombre: 'la verde dice el texto viejo', de: "texto: codigo ? `Orden cargada · ${codigo}` : 'Orden cargada'", a: "texto: codigo ? `Confirmado: Orden ${codigo}` : 'Confirmado: ya es una orden'" },
    { nombre: 'el texto de ayuda viejo', de: 'Cuando la IA lo lea, tocalo para cargar los lotes y confirmar la orden.</p>', a: 'La IA lo lee y se revisa en «Revisar» antes de que sea una orden.</p>' },
    { nombre: 'el botón vuelve a decir "‹ Revisar"', de: 'id="ad-remito-volver">&lsaquo; Remitos</button>', a: 'id="ad-remito-volver">&lsaquo; Revisar</button>' },
    { nombre: 'la naranja sin color', de: '    .rt-remito--precargada { border: 2px solid var(--naranja); background: var(--naranja-suave); }\n', a: '' },
    { nombre: 'la verde sin color', de: '    .rt-remito--confirmada { border-color: var(--verde); background: var(--verde-suave); }\n', a: '' },
    { nombre: '"Leyendo…" en azul', de: '.rt-remito--leyendo .rt-remito__estado { color: var(--rt-texto-2); }', a: '.rt-remito--leyendo .rt-remito__estado { color: var(--rt-modulo); }' },
    { nombre: 'el sello vuelve a decir "Revisar"', de: "'<span class=\"ad-sello ad-sello--amarillo\">Controlar</span>'", a: "'<span class=\"ad-sello ad-sello--amarillo\">Revisar</span>'" },
    { nombre: 'el pie vuelve a "faltan"', de: 'falta repartir ${esc(enteroHoja(a.falta))}', a: 'faltan ${esc(enteroHoja(a.falta))}' },
    { nombre: '"1 cajas"', de: "${a.falta === 1 ? 'caja' : 'cajas'}</span>`", a: 'cajas</span>`' },
    // 2. Órdenes cargadas
    { nombre: 'la pestaña vuelve a decir "Revisar"', de: 'aria-pressed="false">Órdenes cargadas</button>', a: 'aria-pressed="false">Revisar</button>' },
    { nombre: 'el encabezado dice "Revisar"', de: "'rd-vista-revisar': 'Órdenes cargadas', 'ad-vista-remito': 'Cargar lotes'", a: "'rd-vista-revisar': 'Revisar', 'ad-vista-remito': 'Revisar'" },
    { nombre: 'la etiqueta "Por revisar"', de: "ETIQUETA_ESTADO_REMITO = { precargada: 'Listo para cargar lotes',", a: "ETIQUETA_ESTADO_REMITO = { precargada: 'Por revisar'," },
    { nombre: 'el título viejo de los sin terminar', de: '<h2 class="ad-subtitulo ad-rm-titulo">Sin terminar · para cargar lotes', a: '<h2 class="ad-subtitulo ad-rm-titulo">Remitos precargados · por revisar' },
    { nombre: 'sin ninguno, igual la sección', de: "      if (n === 0 && !rr.error) return ''\n", a: '' },
    { nombre: 'el sello de la lista sin naranja', de: '.ad-sello--rm-precargada {', a: '.ad-sello--rm-otro {' },
    { nombre: 'la regla base pisa el naranja', de: '    .ad-sello.ad-sello--rm-precargada {', a: '    .ad-sello--rm-precargada {' },
    { nombre: 'la regla base pisa el amarillo', de: '    .ad-sello.ad-sello--amarillo {', a: '    .ad-sello--amarillo {' },
    { nombre: 'el buscador no filtra', de: '(!q || digitosRemito(o.numero_remito).includes(q))', a: 'true' },
    { nombre: 'el buscador compara con guiones', de: "      return String(t ?? '').replace(/\\D+/g, '')", a: "      return String(t ?? '')" },
    { nombre: 'el buscador no redibuja', de: "      estado.buscarOrden = String(texto ?? '')\n      const lista = document.getElementById('rd-ordenes-lista')\n      if (lista) lista.innerHTML = htmlListaOrdenesRemito()", a: "      estado.buscarOrden = String(texto ?? '')" },
    { nombre: 'sin "ninguno coincide"', de: "      if (!lista.length && digitosRemito(q)) return `<div class=\"ad-vacio\">${esc('Ningún remito de este talonario tiene «' + q + '» en el número.')}</div>`\n", a: '' },
    { nombre: 'el buscador nunca se ve', de: "if (caja) caja.hidden = !(sinControlStockEmpresa() && Array.isArray(estado.ordenes) && estado.ordenes.length)", a: 'if (caja) caja.hidden = true' },
    { nombre: 'el título viejo de las órdenes', de: "'<h2 class=\"ad-subtitulo\">Órdenes cargadas por N° de remito</h2>", a: "'<h2 class=\"ad-subtitulo\">Órdenes por N° de remito</h2>" },
    // 3. Conos
    { nombre: 'conos con 1 letra', de: '    const MIN_LETRAS_CONO = 2', a: '    const MIN_LETRAS_CONO = 1' },
    { nombre: 'conos sin pista', de: "return '<p class=\"ad-rm-pista\">Escribí 2 o 3 letras del cono</p>'", a: "return ''" },
    { nombre: 'conos: la lista de entrada vuelve', de: "      if (normalizar(r.marcaBusqueda).length < MIN_LETRAS_CONO) return '<p", a: "      if (false) return '<p" },
    { nombre: 'conos sin "empiezan primero"', de: "      return [...empiezan.sort(alfabetico), ...contienen.sort(alfabetico)].slice(0, MAX_CONOS_REMITO)", a: "      return [...empiezan, ...contienen].sort(alfabetico).slice(0, MAX_CONOS_REMITO)" },
    { nombre: 'conos: la palabra no cuenta', de: " || n.split(/[^a-z0-9ñ]+/).some(p => p && p.startsWith(q))) empiezan.push(m)", a: ') empiezan.push(m)' },
    { nombre: 'conos: solo los que empiezan', de: '        else if (n.includes(q)) contienen.push(m)\n', a: '' },
    { nombre: 'conos: con tildes', de: '      const q = normalizar(busqueda)\n      if (q.length < MIN_LETRAS_CONO) return []', a: "      const q = String(busqueda ?? '').toLowerCase().trim()\n      if (q.length < MIN_LETRAS_CONO) return []" },
    { nombre: 'conos: tope 12', de: '    const MAX_CONOS_REMITO = 20', a: '    const MAX_CONOS_REMITO = 12' },
    { nombre: 'conos: sin altura máxima', de: 'max-height: 16rem; overflow-y: auto; overscroll-behavior: contain;', a: 'overscroll-behavior: contain;' },
    { nombre: 'conos: en fila', de: '    .ad-rm-opciones--conos { flex-direction: column; flex-wrap: nowrap; }', a: '    .ad-rm-opciones--conos { flex-direction: row; flex-wrap: wrap; max-height: none; }' },
    { nombre: 'conos: de ancho chico', de: '    .ad-rm-opcion--cono { width: 100%; flex-shrink: 0; }', a: '    .ad-rm-opcion--cono { width: auto; flex-shrink: 0; }' },
    { nombre: 'elegir no cierra', de: '      // Elegido, la lista se cierra y queda el cono con "Cambiar".\n      r.cambiandoCono = false\n', a: '' },
    { nombre: 'el cono leído con la lista abierta', de: '      if (r.marcaId && !r.cambiandoCono) {', a: '      if (false) {' },
    { nombre: '"Cambiar" no abre', de: '      r.cambiandoCono = !!si\n      r.marcaBusqueda = \'\'', a: "      r.marcaBusqueda = ''" },
    { nombre: 'sin "Dejar"', de: "const rmDejarCono = r.marcaId ? `<button", a: "const rmDejarCono = false ? `<button" },
    { nombre: '"Cambiar" del cono sin conectar', de: '      else if (d.rmConoCambiar !== undefined) cambiarConoRemito(d.rmConoCambiar, true)\n', a: '' },
    { nombre: '"Dejar" sin conectar', de: '      else if (d.rmConoDejar !== undefined) cambiarConoRemito(d.rmConoDejar, false)\n', a: '' },
    { nombre: 'el cono elegido sin escapar', de: '<span class="ad-rm-cono-elegido__nombre">${esc(elegido)}</span>', a: '<span class="ad-rm-cono-elegido__nombre">${elegido}</span>' },
    // 4. "× N u." en el editor
    { nombre: 'el renglón elegido sin negrita', de: '<span class="ad-rm-elegido__nombre">${htmlNombreRenglonRemito(cat, r)}</span>', a: '<span class="ad-rm-elegido__nombre">${esc(nombreRenglonRemito(cat, r))}</span>' },
    { nombre: 'la negrita sin escapar', de: '<strong class="ad-rm-unidades">${esc(u)}</strong>${esc(t.slice(k + u.length))}', a: '<strong class="ad-rm-unidades">${u}</strong>${t.slice(k + u.length)}' },
    { nombre: 'las unidades se cortan', de: '.ad-rm-unidades { font-weight: 900; white-space: nowrap; }', a: '.ad-rm-unidades { font-weight: 900; }' },
  ],
}, {
  suite: SUITE,
  original: path.join(RAIZ, 'js', 'remitos-comun.js'),
  variable: 'ARCHIVO_COMUN_REMITOS',
  funciones: [],
  manuales: [
    { nombre: 'el renglón sin las unidades', de: '  return [prod?.nombre ?? \'Producto (no se pudo leer)\', presentacionConUnidadesRc(pr), cono]', a: '  return [prod?.nombre ?? \'Producto (no se pudo leer)\', pr.nombre, cono]' },
    { nombre: 'las opciones sin las unidades', de: 'nombre: `${limpioRc(prod.nombre)} · ${presentacionConUnidadesRc(pr)}`,', a: 'nombre: `${limpioRc(prod.nombre)} · ${limpioRc(pr.nombre)}`,' },
    { nombre: 'el número no se busca', de: "textos: [prod.nombre, pr.nombre, unidadesPresentacionRemito(pr) === null ? '' : String(unidadesPresentacionRemito(pr))] }", a: 'textos: [prod.nombre, pr.nombre] }' },
    { nombre: 'con 1 unidad también', de: '  if (!Number.isInteger(n) || n <= 1) return null', a: '  if (!Number.isInteger(n) || n < 1) return null' },
    { nombre: 'el número del nombre se repite', de: '  return enElNombre.includes(String(n)) ? null : n', a: '  return n' },
    { nombre: 'sin el punto de los miles', de: "`× ${String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.')} u.`", a: '`× ${n} u.`' },
    { nombre: 'otro formato ("x 252")', de: "`× ${String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.')} u.`", a: "`x ${String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.')}`" },
  ],
}])
