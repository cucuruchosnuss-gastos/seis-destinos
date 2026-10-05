// Un doble de public.buscar_clientes(p_busqueda, p_unidad_negocio_id) para las
// suites (29/09/2026). Imita lo que hace la función real (leída con
// pg_get_functiondef ese día): solo clientes ACTIVOS, nunca la fábrica de
// pruebas, filtra por empresa si viene p_unidad_negocio_id, con menos de 2
// letras no filtra, y si no busca por nombre, razón social, CUIT, apodo o la
// clave de _clave_nombre() ("JyM" → "jm", prefijo). Devuelve las filas con la
// forma real: { cliente_id, nombre, razon_social, cuit, localidad, empresa,
// unidad_negocio_id, activo, saldo, parecido, apodos, apodo_coincide }.
//
// Desde el 02/10/2026 la función devuelve además `apodos` (la lista) y
// `apodo_coincide`: el primer apodo que coincide con lo escrito (contiene el
// texto, o tiene la misma clave de _clave_nombre), solo con 2 letras o más;
// si no, null. OJO: viene aunque el nombre también coincida.
//
// No mide el parecido de verdad (trigram): ordena por nombre. Lo que importa
// en las suites es la FORMA y que la pantalla muestre lo que vuelve.

'use strict'

function normal(t) {
  return String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}
function clave(t) {
  return normal(t).replace(/[^a-z0-9]+/g, '').replace(/^(.)y(.)$/, '$1$2')
}

// clientes: filas de la tabla clientes (id, nombre, razon_social, cuit,
// apodos, unidad_negocio_id, activo). empresas: { id → nombre }. pruebas:
// Set de unidades de la fábrica de pruebas. saldos: { cliente_id → saldo }.
function servidorBuscarClientes({ clientes, empresas, pruebas = new Set(), saldos = {} }) {
  return (params) => {
    const q = String(params?.p_busqueda ?? '').trim()
    const qn = normal(q), qc = clave(q)
    const unidad = params?.p_unidad_negocio_id ?? null
    return clientes
      .filter(c => c.activo !== false && !pruebas.has(c.unidad_negocio_id) && (!unidad || c.unidad_negocio_id === unidad))
      .filter(c => q.length < 2 || normal(c.nombre).includes(qn) || normal(c.razon_social).includes(qn) ||
        String(c.cuit ?? '').includes(q) || (qc && clave(c.nombre).startsWith(qc)) ||
        (Array.isArray(c.apodos) ? c.apodos : []).some(a => normal(a).includes(qn) || (qc && clave(a) === qc)))
      .sort((a, b) => normal(a.nombre).localeCompare(normal(b.nombre)))
      .map(c => ({
        cliente_id: c.id, nombre: c.nombre, razon_social: c.razon_social ?? null, cuit: c.cuit ?? null,
        localidad: c.localidad ?? null, empresa: empresas[c.unidad_negocio_id] ?? null, unidad_negocio_id: c.unidad_negocio_id,
        activo: true, saldo: c.id in saldos ? saldos[c.id] : 0, parecido: 0.5,
        apodos: Array.isArray(c.apodos) ? [...c.apodos] : [],
        apodo_coincide: q.length < 2 ? null
          : ((Array.isArray(c.apodos) ? c.apodos : []).find(a => normal(a).includes(qn) || (qc && clave(a) === qc)) ?? null),
      }))
  }
}

module.exports = { servidorBuscarClientes, clave }
