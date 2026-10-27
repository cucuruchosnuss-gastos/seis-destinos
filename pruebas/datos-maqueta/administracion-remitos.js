// Datos de la maqueta: los remitos precargados de Rosario en Administración
// (27/10/2026, rama ci-prueba/remitos-rosario-revisar). Ver
// pruebas/datos-maqueta/README.md.
//
// Parte de administracion.js SIN cambiarlo (lo usan otras pruebas) y le suma:
//  - unidades_negocio con controla_stock_terminado: Dolce Pasta (u-d) false,
//    Cucuruchos Nuss (u-n) true; y retiros:cargar en todas;
//  - en Dolce: el Cono dulce 48 (con cono), la Capelina Grande y el Tallarín,
//    los conos LELONA y LEROMA y el cliente "Almacén Rosario";
//  - órdenes de Dolce oficiales y de acopio, con y sin N° de remito,
//    valorizadas y no;
//  - remitos_precarga: una precargada con renglones AMARILLOS ("Cono dulce 48
//    con cono Lelona", nota "leí Lelona, ¿LEROMA?"; uno sin producto; unos
//    envases de terceros; una reposición), una en error, una leyendo, una de
//    acopio y una confirmada (que no se ve).
// La foto se firma con globalThis.__maqueta.firmar (la pone el e2e 71).
//
//   http://localhost:4180/modulos/administracion.html?maqueta=administracion-remitos
'use strict';

const base = JSON.parse(JSON.stringify(require('./administracion')));
const t = base.tablas;

t.unidades_negocio = t.unidades_negocio.map(u => ({ ...u, controla_stock_terminado: u.id !== 'u-d' }));
t.empleado_tareas.push({ empleado_id: 'emp-1', modulo: 'retiros', tarea: 'cargar', alcance: { todas: true }, habilitado: true });

t.productos_terminados.push(
  { id: 'p-d-cono', unidad_negocio_id: 'u-d', nombre: 'Cono dulce 48', tipo_masa: 'Dulce', categoria: null, activo: true },
  { id: 'p-d-cap', unidad_negocio_id: 'u-d', nombre: 'Capelina Grande', tipo_masa: 'Pasta', categoria: 'pasta', activo: true },
  { id: 'p-d-tall', unidad_negocio_id: 'u-d', nombre: 'Tallarín al huevo', tipo_masa: 'Pasta', categoria: 'pasta', activo: true },
);
t.producto_presentaciones.push(
  { id: 'pr-d-cono', producto_id: 'p-d-cono', nombre: 'Caja x 48 con cono', con_cono: true, unidades_por_caja: 48, activa: true },
  { id: 'pr-d-cap', producto_id: 'p-d-cap', nombre: 'Caja x 12', con_cono: false, unidades_por_caja: 12, activa: true },
  { id: 'pr-d-tall', producto_id: 'p-d-tall', nombre: 'Caja x 10', con_cono: false, unidades_por_caja: 10, activa: true },
);
t.marcas_personalizadas.push(
  { id: 'm-lel', nombre: 'LELONA', estado_alta: 'aprobada', activa: true },
  { id: 'm-ler', nombre: 'LEROMA', estado_alta: 'aprobada', activa: true },
);
t.clientes.push({ id: 'c-d-ros', unidad_negocio_id: 'u-d', nombre: 'Almacén Rosario', razon_social: 'ROSARIO ALIMENTOS SA', apodos: ['La Rosa'], cuit: null, localidad: 'Rosario', activo: true });

const orden = (id, numero, extra) => ({
  id, numero, codigo: 'D-' + String(numero).padStart(4, '0'), unidad_negocio_id: 'u-d', estado: 'confirmada', estado_valorizacion: 'pendiente',
  total: 0, moneda: 'ARS', cliente_id: 'c-d-ros', cargada_por: 'emp-1', transporte: null, observaciones: null,
  numero_remito: null, numero_remito_n: null, talonario: null, ...extra,
});
t.ordenes_retiro.push(
  orden('od1', 1, { fecha: '2026-10-20', cargada_en: '2026-10-20T14:00:00Z', estado_valorizacion: 'valorizada', total: 186000, numero_remito: '0001-00003050', numero_remito_n: 100003050, talonario: 'oficial', observaciones: 'Remito 0001-00003050' }),
  orden('od2', 2, { fecha: '2026-10-21', cargada_en: '2026-10-21T14:00:00Z' }),
  orden('od3', 3, { fecha: '2026-10-22', cargada_en: '2026-10-22T14:00:00Z', numero_remito: '0001-00003099', numero_remito_n: 100003099, talonario: 'oficial', observaciones: 'Remito 0001-00003099' }),
  orden('od4', 4, { fecha: '2026-10-23', cargada_en: '2026-10-23T14:00:00Z', estado_valorizacion: 'valorizada', total: 54000, numero_remito: '977490', numero_remito_n: 977490, talonario: 'acopio', observaciones: 'Acopio 977490' }),
  orden('od5', 5, { fecha: '2026-10-24', cargada_en: '2026-10-24T14:00:00Z', cliente_id: 'c-dolce' }),
  orden('od6', 6, { fecha: '2026-10-25', cargada_en: '2026-10-25T14:00:00Z', numero_remito: '977485', numero_remito_n: 977485, talonario: 'acopio', observaciones: 'Acopio 977485' }),
);
t.orden_retiro_items.push(
  { id: 'id1', orden_id: 'od1', orden: 1, presentacion_id: 'pr-d-cap', marca_id: null, cajas: 84, unidades: 1008, insumo_id: null, cantidad: null, precio_caja: null, subtotal: null, tipo: 'retiro' },
  { id: 'id3', orden_id: 'od3', orden: 1, presentacion_id: 'pr-d-cono', marca_id: 'm-ler', cajas: 10, unidades: 480, insumo_id: null, cantidad: null, precio_caja: null, subtotal: null, tipo: 'retiro' },
  { id: 'id4', orden_id: 'od4', orden: 1, presentacion_id: 'pr-d-tall', marca_id: null, cajas: 30, unidades: 300, insumo_id: null, cantidad: null, precio_caja: null, subtotal: null, tipo: 'retiro' },
);

const item = (x) => ({ texto_leido: '', cantidad: null, presentacion_id: null, marca_id: null, insumo_id: null, lotes: [], revisar: false, omitir: false, nota: '', ...x });
t.remitos_precarga = [
  { id: 'rm-1', unidad_negocio_id: 'u-d', foto_path: 'u-d/remitos/rm-1.jpg', subido_por: 'emp-1', subido_en: '2026-10-27T12:10:00+00:00', estado: 'precargada', talonario: 'oficial',
    numero_remito: '0001-00003100', numero_remito_n: 100003100, fecha: '2026-10-26', cliente_id: null, cliente_leido: 'Almacen Rosario', transporte: null, observaciones: null,
    error: null, leido_en: '2026-10-27T12:11:00+00:00', items: [
      item({ texto_leido: 'Cono dulce 48 con cono Lelona', cantidad: 10, presentacion_id: 'pr-d-cono', marca_id: 'm-lel', revisar: true, nota: 'leí Lelona, ¿LEROMA?' }),
      item({ texto_leido: 'Capelinas grandes', cantidad: 84, revisar: true, nota: 'no encontré el producto' }),
      item({ texto_leido: 'Tallarines x10', cantidad: 20, presentacion_id: 'pr-d-tall', lotes: [{ lote: '10430', cajas: 20 }] }),
      item({ texto_leido: 'Envases térmicos', cantidad: 5, revisar: true, nota: '¿mercadería de terceros?' }),
      item({ texto_leido: 'Capelina reposición', cantidad: 2, presentacion_id: 'pr-d-cap', revisar: true, nota: 'reposición' }),
    ] },
  { id: 'rm-2', unidad_negocio_id: 'u-d', foto_path: 'u-d/remitos/rm-2.jpg', subido_por: 'emp-1', subido_en: '2026-10-27T13:00:00+00:00', estado: 'error', talonario: 'oficial',
    numero_remito: null, numero_remito_n: null, fecha: null, cliente_id: null, cliente_leido: null, transporte: null, observaciones: null,
    error: 'La foto está muy oscura: no se leen los renglones.', leido_en: '2026-10-27T13:01:00+00:00', items: [] },
  { id: 'rm-3', unidad_negocio_id: 'u-d', foto_path: 'u-d/remitos/rm-3.jpg', subido_por: 'emp-1', subido_en: '2026-10-27T13:20:00+00:00', estado: 'leyendo', talonario: 'oficial',
    numero_remito: null, numero_remito_n: null, fecha: null, cliente_id: null, cliente_leido: null, transporte: null, observaciones: null, error: null, leido_en: null, items: [] },
  { id: 'rm-4', unidad_negocio_id: 'u-d', foto_path: 'u-d/remitos/rm-4.jpg', subido_por: 'emp-1', subido_en: '2026-10-27T11:00:00+00:00', estado: 'precargada', talonario: 'acopio',
    numero_remito: '977492', numero_remito_n: 977492, fecha: '2026-10-25', cliente_id: 'c-d-ros', cliente_leido: 'Almacén Rosario', transporte: 'Expreso Rosario', observaciones: null,
    error: null, leido_en: '2026-10-27T11:01:00+00:00', items: [item({ texto_leido: 'Tallarín al huevo', cantidad: 30, presentacion_id: 'pr-d-tall' })] },
  { id: 'rm-5', unidad_negocio_id: 'u-d', foto_path: 'u-d/remitos/rm-5.jpg', subido_por: 'emp-1', subido_en: '2026-10-27T10:00:00+00:00', estado: 'confirmada', talonario: 'oficial',
    numero_remito: '0001-00003099', numero_remito_n: 100003099, fecha: '2026-10-22', cliente_id: 'c-d-ros', items: [] },
];

module.exports = base;
