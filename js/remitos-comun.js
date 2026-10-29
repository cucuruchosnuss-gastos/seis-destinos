// LOS REMITOS DE DOLCE: LO QUE COMPARTEN DOS PANTALLAS (28/10/2026, rama
// ci-prueba/modulo-remitos-dolce). Decimoséptima excepción consciente a la
// regla de duplicar helpers (docs/memoria/arquitectura.md).
//
// Desde el 28/10/2026 los remitos de Rosario viven en su propio módulo
// (modulos/remitos-dolce.html: subir y revisar). Administración se queda con
// los Acopios ("Nuevo acopio" elige el producto con el MISMO catálogo que un
// renglón de remito) y con la ficha de la orden ("Remito N° X"). Copiado en
// los dos archivos serían dos catálogos que ordenan distinto y dos maneras de
// decir el número del remito.
//
//  - talonarioDe(x): 'acopio' o 'oficial' (null o cualquier otra cosa = oficial).
//  - textoNumeroRemito(o): "Remito N° 0001-00003100" / "Acopio N° 977492"; sin número, ''.
//    Lee numero_remito y talonario (como vienen de la base).
//  - htmlSelloAcopio(o): el sello "Acopio" (la ficha y las listas de Revisar).
//  - El catálogo de un renglón (el de la Carga sin control de stock): tres
//    grupos (SIN CONO, CON CONO y, al buscar, los insumos), los productos todos
//    y sin cuánto hay. `categorias` es el orden de las categorías de cada
//    pantalla (su CATEGORIAS_PRODUCTO: [{ clave }]).
//
// Puro: no toca el DOM ni la base. Las suites lo pegan detrás del script del
// módulo con pruebas/fuente-cobranzas.js (fuenteConComun), sin los `export`.

export const GRUPOS_REMITO = [
  { tipo: 'sin_cono', titulo: 'Producto terminado · SIN CONO' },
  { tipo: 'con_cono', titulo: 'Producto terminado · CON CONO' },
  { tipo: 'insumos', titulo: 'Materia prima e insumos' },
]

// Los helpers de texto de este archivo (cada pantalla conserva los suyos).
function limpioRc(t) {
  return String(t ?? '').replace(/\s+/g, ' ').trim()
}

function normalizarRc(t) {
  return String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

export function talonarioDe(x) {
  return x?.talonario === 'acopio' ? 'acopio' : 'oficial'
}

// "Remito N° 0001-00003100" o "Acopio N° 977492"; sin número, ''.
export function textoNumeroRemito(o) {
  const n = limpioRc(o?.numero_remito)
  if (!n) return ''
  return `${talonarioDe(o) === 'acopio' ? 'Acopio' : 'Remito'} N° ${n}`
}

// El sello "Acopio" (el talonario celeste) al lado del N°: en la ficha de la
// orden (Administración) y en las listas de Revisar. Las dos pantallas tienen
// las clases ad-sello / ad-sello--acopio.
export function htmlSelloAcopio(o) {
  return o?.talonario === 'acopio' ? '<span class="ad-sello ad-sello--acopio">Acopio</span>' : ''
}

export function presentacionRemito(cat, id) {
  return id ? (cat?.presentaciones ?? []).find(p => p.id === id) ?? null : null
}

export function productoDePresentacionRemito(cat, pr) {
  return pr ? (cat?.productos ?? []).find(p => p.id === pr.producto_id) ?? null : null
}

function insumoRemito(cat, id) {
  return id ? (cat?.insumos ?? []).find(i => i.id === id) ?? null : null
}

// "Cucurucho grande · Caja x 100 · LOLO", o un insumo: "Harina 000 · Molino".
export function nombreRenglonRemito(cat, r) {
  if (r?.insumoId) {
    const ins = insumoRemito(cat, r.insumoId)
    return [ins?.nombre ?? 'Insumo (no se pudo leer)', ins?.marca].map(limpioRc).filter(Boolean).join(' · ')
  }
  const pr = presentacionRemito(cat, r?.presentacionId)
  if (!pr) return r?.presentacionId ? 'Producto (no se pudo leer)' : ''
  const prod = productoDePresentacionRemito(cat, pr)
  const cono = pr.con_cono ? (r.marcaId ? ((cat?.marcas ?? []).find(m => m.id === r.marcaId)?.nombre ?? 'Cono que no se pudo leer') : 'falta el cono') : ''
  return [prod?.nombre ?? 'Producto (no se pudo leer)', pr.nombre, cono].map(limpioRc).filter(Boolean).join(' · ')
}

export function ordenCategoriaRemito(c, categorias = []) {
  const lista = Array.isArray(categorias) ? categorias : []
  const i = lista.findIndex(x => x.clave === c)
  return i === -1 ? lista.length : i
}

export function opcionesRemito(cat, categorias = []) {
  const productos = new Map((cat?.productos ?? []).filter(p => p.activo !== false).map(p => [p.id, p]))
  const sin = []
  const con = []
  for (const pr of cat?.presentaciones ?? []) {
    const prod = productos.get(pr.producto_id)
    if (!prod || pr.activa === false) continue
    const o = { presentacionId: pr.id, conCono: pr.con_cono === true, categoria: prod.categoria ?? null,
      nombre: `${limpioRc(prod.nombre)} · ${limpioRc(pr.nombre)}`, textos: [prod.nombre, pr.nombre] }
    if (o.conCono) con.push({ ...o, grupo: 'con_cono' })
    else sin.push({ ...o, grupo: 'sin_cono' })
  }
  const orden = (a, b) => ordenCategoriaRemito(a.categoria, categorias) - ordenCategoriaRemito(b.categoria, categorias)
  const insumos = (cat?.insumos ?? []).filter(i => i.activo !== false).map(i => ({ grupo: 'insumos', insumoId: i.id,
    nombre: [limpioRc(i.nombre), limpioRc(i.marca)].filter(Boolean).join(' · '), textos: [i.nombre, i.marca] }))
  return { sin_cono: sin.sort(orden), con_cono: con.sort(orden), insumos }
}

// Los grupos que coinciden con lo escrito; los insumos, solo al buscar.
export function gruposRemito(cat, busqueda, categorias = []) {
  const q = normalizarRc(busqueda)
  const coincide = (o) => !q || (o.textos ?? []).some(t => normalizarRc(t).includes(q))
  const todas = opcionesRemito(cat, categorias)
  return GRUPOS_REMITO.map(g => ({ ...g, lista: g.tipo === 'insumos' && !q ? [] : todas[g.tipo].filter(coincide) }))
    .filter(g => g.lista.length)
}
