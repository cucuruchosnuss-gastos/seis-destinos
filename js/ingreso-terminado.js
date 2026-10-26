// EL INGRESO DE PRODUCTO TERMINADO, LO QUE COMPARTEN LAS DOS ENTRADAS (26/10/2026).
//
// Las cajas de producto terminado que trae un proveedor (las capelinas de
// Rodrigo Arrascaeta) se cargan desde DOS pantallas:
//   - la gestión de Producción (modulos/produccion-gestion.html), "INGRESO
//     DE PRODUCTO TERMINADO", desde el 14/10/2026;
//   - el Ingreso de materia prima (modulos/materia-prima.html), desde el
//     26/10/2026: el proveedor que tiene productos terminados
//     (productos_terminados.origen_proveedor_id) los ofrece en el paso Ítems,
//     y el buscador del catálogo también los encuentra.
// Las dos graban con la MISMA RPC, ingresar_producto_terminado, y tienen que
// decidir igual qué falta, qué lote viaja y qué parámetros se mandan: dos
// copias distintas serían dos ingresos que divergen en silencio. Por eso la
// lógica vive acá, una sola vez: DECIMOSEXTA excepción consciente a la regla
// de duplicar helpers (ver docs/memoria/arquitectura.md).
//
// Las funciones de abajo son las de la gestión LETRA POR LETRA (la gestión
// todavía tiene su copia en el HTML: el pedido del 26/10 fue no tocarla).
// pruebas/test-ingreso-terminado-comun.js compara cada una contra la de
// produccion-gestion.html y da ROJO si alguien cambia una sola: se cambian
// las dos juntas (o se pasa la gestión a importar este archivo).
//
// La base (pg_get_functiondef, 26/10/2026): ingresar_producto_terminado(
//   p_unidad_negocio_id, p_fecha, p_proveedor_id, p_unidad_origen_id,
//   p_remito, p_items, p_observaciones, p_client_uuid)
//   - pide materia_prima:cargar O stock:ajustar_inventario en la fábrica;
//   - un proveedor O una fábrica de origen, nunca los dos;
//   - p_client_uuid repetido devuelve { ingreso_id, reintento: true } sin
//     cargar de nuevo;
//   - guarda sola el lote de cada renglón como lote vigente del producto en
//     esa fábrica (producto_lote_vigente), salvo 'SIN LOTE';
//   - de un proveedor NO genera deuda en ningún lado (solo de otra fábrica
//     con precio).

import { formatearNumeroAr } from './utils.js'

export const ORIGENES_INGRESO = ['propia', 'proveedor', 'fabrica']
export const TAREAS_INGRESO = ['materia_prima:cargar', 'stock:ajustar_inventario']
export const LARGO_MAXIMO_LOTE = 40

// Mayúsculas y sin espacios en los bordes (los de adentro quedan).
export function normalizarLoteIngreso(texto) {
  return String(texto ?? '').trim().toUpperCase()
}

// En qué está el lote de un renglón: 'sin-producto'; 'pregunta' (tiene
// vigente y todavía no se contestó); 'si' (es el vigente); 'otro' (hay
// que escribirlo: "No, es otro", o el producto no tiene vigente);
// 'fabricacion' (producción propia: se escribe siempre, sin pregunta).
export function modoLoteIngreso(r, ing) {
  if (!r?.productoId) return 'sin-producto'
  if (ing?.origen === 'propia') return 'fabricacion'
  if (!r.loteVigente) return 'otro'
  if (r.loteResp === 'si') return 'si'
  if (r.loteResp === 'otro') return 'otro'
  return 'pregunta'
}

// El lote que viaja: el vigente si se contestó Sí; si no, lo escrito.
export function loteDeRenglon(r, ing) {
  return normalizarLoteIngreso(modoLoteIngreso(r, ing) === 'si' ? r.loteVigente : r.lote)
}

// { p_proveedor_id, p_unidad_origen_id }: exactamente uno con valor.
// Producción propia: el origen es la misma fábrica que recibe.
export function origenParaBase(ing) {
  if (ing.origen === 'propia') return { p_proveedor_id: null, p_unidad_origen_id: ing.unidadId || null }
  if (ing.origen === 'proveedor') return { p_proveedor_id: ing.proveedorId || null, p_unidad_origen_id: null }
  if (ing.origen === 'fabrica') return { p_proveedor_id: null, p_unidad_origen_id: ing.unidadOrigenId || null }
  return { p_proveedor_id: null, p_unidad_origen_id: null }
}

export function presentacionDe(cat, id) {
  return (cat?.presentaciones ?? []).find(p => p.id === id) ?? null
}

// El renglón como lo espera la base. El precio solo de un proveedor (de
// otra fábrica no se pide: la deuda entre fábricas no se carga acá); un
// cono solo en una presentación con cono; el lote normalizado (faltaIngreso
// no deja mandar un renglón sin lote).
export function itemsParaBase(ing, cat) {
  return ing.renglones.filter(r => r.presentacionId).map(r => {
    const pr = presentacionDe(cat, r.presentacionId)
    const lote = loteDeRenglon(r, ing)
    return {
      presentacion_id: r.presentacionId,
      marca_id: pr?.con_cono && r.marcaId ? r.marcaId : null,
      cajas: r.cajas,
      lote: lote || null,
      precio_caja: ing.origen === 'proveedor' && r.precio != null ? r.precio : null,
    }
  })
}

// Lo que falta, en castellano, o null. La base valida todo igual: esto es
// para decirlo antes y pegado al botón.
export function faltaIngreso(ing, cat) {
  if (!ing.unidadId) return 'Elegí la fábrica que recibe.'
  if (!ing.fecha) return 'Poné la fecha.'
  if (!ORIGENES_INGRESO.includes(ing.origen)) return 'Elegí de dónde viene: producción propia, un proveedor o una fábrica del grupo.'
  if (ing.origen === 'proveedor' && !ing.proveedorId) return 'Elegí el proveedor.'
  if (ing.origen === 'fabrica' && !ing.unidadOrigenId) return 'Elegí la fábrica de donde viene.'
  if (ing.origen === 'fabrica' && ing.unidadOrigenId === ing.unidadId) return 'La fábrica de origen tiene que ser otra.'
  const usados = ing.renglones.filter(r => r.productoId || r.presentacionId || r.cajas != null)
  if (!usados.length) return 'Cargá al menos un producto.'
  for (let i = 0; i < usados.length; i++) {
    const r = usados[i], n = i + 1
    if (!r.presentacionId) return `Renglón ${n}: elegí el producto y la presentación.`
    const pr = presentacionDe(cat, r.presentacionId)
    if (pr?.con_cono && !r.marcaId) return `Renglón ${n}: elegí el cono (si es común, elegí la presentación sin cono).`
    if (!Number.isInteger(r.cajas) || r.cajas <= 0) return `Renglón ${n}: las cajas tienen que ser un número entero mayor que cero.`
    if (modoLoteIngreso(r, ing) === 'pregunta') return `Renglón ${n}: contestá si el lote sigue siendo ${r.loteVigente}.`
    const lote = loteDeRenglon(r, ing)
    if (!lote && ing.origen === 'propia') return `Renglón ${n}: poné el lote de fabricación.`
    if (!lote) return `Renglón ${n}: escribí el lote.`
    if (lote.length > LARGO_MAXIMO_LOTE) return `Renglón ${n}: el lote puede tener ${LARGO_MAXIMO_LOTE} caracteres como mucho.`
    if (ing.origen === 'proveedor' && r.precio != null && r.precio < 0) return `Renglón ${n}: el precio no puede ser negativo.`
  }
  return null
}

export function parametrosIngreso(ing, cat) {
  const remito = String(ing.remito ?? '').trim()
  const obs = String(ing.observaciones ?? '').trim()
  return {
    p_unidad_negocio_id: ing.unidadId,
    p_fecha: ing.fecha,
    ...origenParaBase(ing),
    p_remito: remito || null,
    p_items: itemsParaBase(ing, cat),
    p_observaciones: obs || null,
    p_client_uuid: ing.clientUuid,
  }
}

export function textoListoIngreso(res, ing) {
  const cajas = Number(res?.cajas ?? ing.renglones.reduce((s, r) => s + (Number.isInteger(r.cajas) ? r.cajas : 0), 0))
  if (res?.reintento) return 'Listo: ese ingreso ya estaba cargado (no se cargó dos veces).'
  return `Listo: entraron ${formatearNumeroAr(cajas, { decimales: 0 })} ${cajas === 1 ? 'caja' : 'cajas'}.`
}

// El catálogo de la fábrica que recibe: productos (con de qué proveedor
// vienen), presentaciones, conos y lotes vigentes. La misma lectura que
// leerCatalogoIngreso() de la gestión, con `sb` (el cliente de Supabase de
// la pantalla) y además origen_proveedor_id. Productos de reventa incluidos:
// son justamente los que entran.
// OJO (26/10/2026): productos_terminados y producto_presentaciones se leen con
// producción, stock:ver, pedidos o retiros; con SOLO materia_prima:cargar la
// base devuelve la lista vacía (sin error) y no se ofrece nada.
export async function leerCatalogoIngresoTerminado(sb, unidadId) {
  const leer = async (q) => { const { data, error } = await q; if (error) throw error; return data ?? [] }
  const productos = await leer(sb.from('productos_terminados').select('id, nombre, orden, tipo_masa, origen_tipo, origen_proveedor_id').eq('unidad_negocio_id', unidadId).eq('activo', true))
  const ids = productos.map(p => p.id)
  const presentaciones = ids.length ? await leer(sb.from('producto_presentaciones').select('id, producto_id, nombre, con_cono, unidades_por_caja, orden').in('producto_id', ids).eq('activa', true)) : []
  const marcas = await leer(sb.from('marcas_personalizadas').select('id, nombre, activa, estado_alta').eq('activa', true))
  const vigentes = await leer(sb.from('producto_lote_vigente').select('producto_id, lote').eq('unidad_negocio_id', unidadId))
  const orden = (a, b) => (a.orden ?? 0) - (b.orden ?? 0) || String(a.nombre).localeCompare(String(b.nombre))
  return {
    productos: productos.sort(orden),
    presentaciones: presentaciones.sort(orden),
    marcas: marcas.filter(m => m.estado_alta !== 'rechazada').sort((a, b) => String(a.nombre).localeCompare(String(b.nombre))),
    vigentes: new Map(vigentes.map(v => [v.producto_id, v.lote])),
  }
}
