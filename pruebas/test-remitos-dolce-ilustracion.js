// EL CONO DE PAPEL ILUSTRACIÓN A LA VISTA (30/10/2026, pedido de Facu): los
// conos con marcas_personalizadas.papel_ilustracion (MARBET, RIO, RIO
// OLIMPICOS, QUINTANA al 30/10/2026) se cobran más caros, así que donde se
// nombra el cono va "MARBET (ilustración)": el renglón y el buscador de conos
// de Remitos Dolce (js/remitos-comun.js: nombreConoRemito / nombreRenglonRemito)
// y la hoja de la Carga (modulos/retiros.html: conoParaHoja). Con un cono
// común, nada. Se EJECUTAN las funciones reales.
//
//   node pruebas/test-remitos-dolce-ilustracion.js
//   ARCHIVO_TEST=<copia de remitos-dolce.html> / ARCHIVO_RETIROS=<copia de retiros.html>
'use strict'

const path = require('path')
const fs = require('fs')
const { construirRemitosDolce } = require('./sandbox-remitos-dolce')
const { construirRetiros } = require('./sandbox-retiros')
const { arnes, leer } = require('./circuito-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'modulos/remitos-dolce.html')
const RETIROS = process.env.ARCHIVO_RETIROS || path.join(__dirname, '..', 'modulos/retiros.html')
leer(ARCHIVO)
leer(RETIROS)
const FUENTE = fs.readFileSync(ARCHIVO, 'utf8')
const FUENTE_RET = fs.readFileSync(RETIROS, 'utf8')
// El runner de mutaciones también muta js/remitos-comun.js: necesita saber cuántos bytes leyó de ESE archivo.
const COMUN = process.env.ARCHIVO_COMUN_REMITOS || path.join(__dirname, '..', 'js', 'remitos-comun.js')
console.log(`COMUN ${COMUN} (${fs.readFileSync(COMUN, 'utf8').length} bytes)`)
const { chk, fin } = arnes()
const sinComentarios = (t) => String(t).replace(/\/\/.*$/gm, '')

const CAT = {
  productos: [{ id: 'p-b40', nombre: 'Barquillo 40 x4', activo: true }],
  presentaciones: [
    { id: 'pr-b40-con', producto_id: 'p-b40', nombre: 'Caja con cono', con_cono: true, unidades_por_caja: 252, activa: true },
    { id: 'pr-b40-sin', producto_id: 'p-b40', nombre: 'Caja sin cono', con_cono: false, unidades_por_caja: 252, activa: true },
  ],
  marcas: [
    { id: 'm-mar', nombre: 'MARBET', papel_ilustracion: true },
    { id: 'm-rio', nombre: 'RIO', papel_ilustracion: true },
    { id: 'm-ven', nombre: 'VENEZIA', papel_ilustracion: false },
    { id: 'm-viejo', nombre: 'SIN DATO' },
  ],
  insumos: [],
}

// ── Remitos Dolce: el renglón y el buscador ──────────────────────────────
{
  const S = construirRemitosDolce(ARCHIVO)
  chk('nombreConoRemito: MARBET (ilustración); VENEZIA tal cual; sin el dato, tal cual', S.nombreConoRemito(CAT.marcas[0]) === 'MARBET (ilustración)' &&
    S.nombreConoRemito(CAT.marcas[2]) === 'VENEZIA' && S.nombreConoRemito(CAT.marcas[3]) === 'SIN DATO' && S.nombreConoRemito(null) === '' &&
    S.nombreConoRemito({ nombre: ' ', papel_ilustracion: true }) === '')
  chk('el renglón con MARBET: "Barquillo 40 x4 · Caja con cono × 252 u. · MARBET (ilustración)"',
    S.nombreRenglonRemito(CAT, { presentacionId: 'pr-b40-con', marcaId: 'm-mar' }) === 'Barquillo 40 x4 · Caja con cono × 252 u. · MARBET (ilustración)',
    S.nombreRenglonRemito(CAT, { presentacionId: 'pr-b40-con', marcaId: 'm-mar' }))
  chk('con un cono común, sin "(ilustración)"', S.nombreRenglonRemito(CAT, { presentacionId: 'pr-b40-con', marcaId: 'm-ven' }) === 'Barquillo 40 x4 · Caja con cono × 252 u. · VENEZIA')
  chk('un cono que no se pudo leer lo dice', S.nombreConoPorIdRemito(CAT, 'm-otro') === 'Cono que no se pudo leer' && S.nombreConoPorIdRemito(CAT, null) === '')
  const r = (x) => ({ presentacionId: 'pr-b40-con', marcaId: null, marcaBusqueda: '', cambiandoCono: false, ...x })
  const h = S.htmlMarcasRemito(r({ marcaBusqueda: 'ri' }), 0, CAT)
  chk('el buscador: "RIO (ilustración)"', /data-id="m-rio"[^>]*>RIO \(ilustración\)<\/button>/.test(h), h)
  const hv = S.htmlMarcasRemito(r({ marcaBusqueda: 've' }), 0, CAT)
  chk('…VENEZIA sin nada', />VENEZIA<\/button>/.test(hv))
  const el = S.htmlConoRemito(r({ marcaId: 'm-mar' }), 0, CAT)
  chk('el cono elegido: "MARBET (ilustración)"', /<span class="ad-rm-cono-elegido__nombre">MARBET \(ilustración\)<\/span>/.test(el))
  chk('Remitos Dolce lee papel_ilustracion con su catálogo de conos', /from\('marcas_personalizadas'\)\.select\('id, nombre, papel_ilustracion'\)/.test(FUENTE))
  chk('ningún nombre de cono copiado a mano', !/MARBET|QUINTANA|RIO OLIMPICOS/.test(sinComentarios(FUENTE)) && !/MARBET|QUINTANA|RIO OLIMPICOS/.test(sinComentarios(fs.readFileSync(COMUN, 'utf8'))))
  chk('el nombre se escapa en el buscador', S.htmlMarcasRemito(r({ marcaBusqueda: '<b' }), 0, { marcas: [{ id: 'x', nombre: '<b>X', papel_ilustracion: true }] }).includes('&lt;b&gt;X (ilustración)'))
}

// ── La hoja de la Carga ───────────────────────────────────────────────────
{
  const S = construirRetiros(RETIROS)
  S.estado.catalogo = { ...CAT, insumos: [] }
  const rs = S.renglonesParaHoja({ renglones: [
    { producto: 'Barquillo 40 x4', presentacion: 'Caja con cono', marca: 'MARBET', marca_id: 'm-mar', presentacion_id: 'pr-b40-con', cajas: 5, unidades: 1260, lotes: [] },
    { producto: 'Barquillo 40 x4', presentacion: 'Caja con cono', marca: 'VENEZIA', marca_id: 'm-ven', presentacion_id: 'pr-b40-con', cajas: 2, unidades: 504, lotes: [] },
    { producto: 'Barquillo 40 x4', presentacion: 'Caja con cono', marca: 'NUEVO', marca_id: 'm-nuevo', presentacion_id: 'pr-b40-con', cajas: 1, unidades: 252, lotes: [] },
    { producto: 'Barquillo 40 x4', presentacion: 'Caja sin cono', marca: null, marca_id: null, presentacion_id: 'pr-b40-sin', cajas: 3, unidades: 756, lotes: [] },
  ] })
  chk('la hoja de la Carga: "MARBET (ilustración)"', rs[0].conoNombre === 'MARBET (ilustración)', rs[0].conoNombre)
  chk('…VENEZIA tal cual', rs[1].conoNombre === 'VENEZIA')
  chk('…un cono que no está en el catálogo, con el nombre de la orden', rs[2].conoNombre === 'NUEVO')
  chk('…sin cono, null', rs[3].conoNombre === null)
  chk('…y en la hoja: "con cono MARBET (ilustración)"', S.descripcionCortaHoja(rs[0]) === '×252 · con cono MARBET (ilustración)', S.descripcionCortaHoja(rs[0]))
  chk('la Carga lee papel_ilustracion con su catálogo de conos', /\.select\('id, nombre, estado_alta, papel_ilustracion'\)/.test(FUENTE_RET))
  chk('ningún nombre de cono copiado a mano en la Carga', !/MARBET|QUINTANA|RIO OLIMPICOS/.test(sinComentarios(FUENTE_RET)))
}

fin()
