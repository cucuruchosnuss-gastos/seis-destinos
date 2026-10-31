// Maqueta "remitos-dolce-mas-simple" (29/10/2026, rama ci-prueba/remitos-mas-simple):
// Remitos Dolce con UN SOLO RECORRIDO. La de Subir (remitos-dolce-subir.js:
// Dolce Pasta sin control de stock, Manuel con retiros:cargar solo) con:
//  - el catálogo de Dolce como está en la base (SELECT del 29/10/2026): el
//    Barquillo 40 x4 en caja de 252 y en Caja N°2 de 180, el Cucuruchón Chico
//    en media caja de 128 y los conos de papel "Por cono" (1 unidad);
//  - muchos conos (para ver el buscador: nada de entrada, con 2 letras los que
//    empiezan así, hasta 20 con scroll): GLACE, Glória, LA GLORIOSA, IGLÚ y 26
//    "CONO 01…26";
//  - mis remitos: uno leyendo, uno LISTO PARA CARGAR LOTES (rp-listo: 3
//    renglones, Almacén Rosario, el 1° con 25 de 31 cajas en lotes, el 2° sin
//    cono), uno con la orden D-0005 y uno que no se pudo leer.
// La foto se firma con globalThis.__maqueta.firmar (la pone el e2e 99).
//
//   http://localhost:4180/modulos/remitos-dolce.html?maqueta=remitos-dolce-mas-simple
'use strict'
const base = JSON.parse(JSON.stringify(require('./remitos-dolce-subir')))
const t = base.tablas

t.productos_terminados.push(
  { id: 'p-d-b40', unidad_negocio_id: 'u-d', nombre: 'Barquillo 40 x4', tipo_masa: 'Común', categoria: 'barquillos', orden: 1, activo: true },
  { id: 'p-d-b45', unidad_negocio_id: 'u-d', nombre: 'Barquillo 45 x4', tipo_masa: 'Común', categoria: 'barquillos', orden: 2, activo: true },
  { id: 'p-d-cch', unidad_negocio_id: 'u-d', nombre: 'Cucuruchón Chico', tipo_masa: 'Común', categoria: 'cucuruchones', orden: 3, activo: true },
  { id: 'p-d-pap', unidad_negocio_id: 'u-d', nombre: 'Conos de papel sueltos', tipo_masa: null, categoria: null, orden: 4, activo: true },
)
t.producto_presentaciones.push(
  { id: 'pr-d-b40-con', producto_id: 'p-d-b40', nombre: 'Caja con cono', con_cono: true, media_caja: false, unidades_por_caja: 252, activa: true, orden: 1 },
  { id: 'pr-d-b40-n2', producto_id: 'p-d-b40', nombre: 'Caja N°2 con cono', con_cono: true, media_caja: false, unidades_por_caja: 180, activa: true, orden: 2 },
  { id: 'pr-d-b40-sin', producto_id: 'p-d-b40', nombre: 'Caja sin cono', con_cono: false, media_caja: false, unidades_por_caja: 252, activa: true, orden: 3 },
  { id: 'pr-d-b45-con', producto_id: 'p-d-b45', nombre: 'Caja con cono', con_cono: true, media_caja: false, unidades_por_caja: 216, activa: true, orden: 1 },
  { id: 'pr-d-b45-n2', producto_id: 'p-d-b45', nombre: 'Caja N°2', con_cono: false, media_caja: false, unidades_por_caja: 168, activa: true, orden: 2 },
  { id: 'pr-d-cch-media', producto_id: 'p-d-cch', nombre: 'Media caja', con_cono: false, media_caja: true, unidades_por_caja: 128, activa: true, orden: 1 },
  { id: 'pr-d-pap', producto_id: 'p-d-pap', nombre: 'Por cono', con_cono: true, media_caja: false, unidades_por_caja: 1, activa: true, orden: 1 },
)
t.marcas_personalizadas.push(
  { id: 'm-d-gl', nombre: 'GLACE', estado_alta: 'aprobada', activa: true },
  { id: 'm-d-glo', nombre: 'Glória', estado_alta: 'aprobada', activa: true },
  { id: 'm-d-lag', nombre: 'LA GLORIOSA', estado_alta: 'aprobada', activa: true },
  { id: 'm-d-igl', nombre: 'IGLÚ', estado_alta: 'aprobada', activa: true },
  ...Array.from({ length: 26 }, (_, k) => ({ id: `m-d-c${k + 1}`, nombre: `CONO ${String(k + 1).padStart(2, '0')}`, estado_alta: 'aprobada', activa: true })),
)

const item = (x) => ({ texto_leido: '', cantidad: null, presentacion_id: null, marca_id: null, insumo_id: null, lotes: [], revisar: false, omitir: false, nota: '', ...x })
const remito = (id, minutos, extra) => ({
  id, unidad_negocio_id: 'u-d', foto_path: `uid-maqueta/remitos/${id}.jpg`, subido_por: 'emp-1',
  subido_en: new Date(Date.parse('2026-10-27T18:00:00Z') - minutos * 60000).toISOString(),
  estado: 'leyendo', talonario: 'oficial', numero_remito: null, numero_remito_n: null, fecha: null, cliente_id: null, cliente_leido: null,
  transporte: null, observaciones: null, items: [], error: null, leido_en: null, orden_id: null, orden_codigo: null, descartado_motivo: null,
  client_uuid: `00000000-0000-4000-8000-${String(minutos).padStart(12, '0')}`, ...extra,
})
t.remitos_precarga = [
  remito('rp-leyendo', 1, {}),
  remito('rp-listo', 12, { estado: 'precargada', numero_remito: '0001-00003100', numero_remito_n: 100003100, fecha: '2026-10-27',
    cliente_id: 'c-ros', cliente_leido: 'Almacen Rosario', leido_en: '2026-10-27T17:49:00Z', items: [
      item({ texto_leido: 'Barquillo 40 x4 GLACE 31', cantidad: 31, presentacion_id: 'pr-d-b40-con', marca_id: 'm-d-gl', lotes: [{ lote: '10430', cajas: 25 }] }),
      item({ texto_leido: 'Barquillo 40 x4 caja 2 con cono', cantidad: 4, presentacion_id: 'pr-d-b40-n2', revisar: true, nota: 'no se lee el cono' }),
      item({ texto_leido: 'Media caja cucuruchón chico', cantidad: 2, presentacion_id: 'pr-d-cch-media', lotes: [{ lote: '10431', cajas: 1 }] }),
    ] }),
  remito('rp-conf', 90, { estado: 'confirmada', numero_remito: '0001-00003095', numero_remito_n: 100003095, orden_id: 'o-d-5', orden_codigo: 'D-0005' }),
  remito('rp-err', 140, { estado: 'error', error: 'No se ve el número del remito: la foto está movida.' }),
]

module.exports = base
