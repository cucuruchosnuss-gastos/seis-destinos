// Datos de la maqueta: Administración → la orden a OTRA EMPRESA DEL GRUPO
// (24/10/2026). Ver pruebas/datos-maqueta/README.md. Parte de los datos de
// Entre empresas (entre-empresas.js, que a su vez parte de administracion.js)
// SIN cambiarlos, y suma:
//  - el cliente "DOLCE PASTA SRL" de Nuss con unidad_grupo_id = Dolce Pasta y
//    la lista interna "Nuss → Dolce Pasta (interna)" (es_interna);
//  - dos órdenes a ese cliente: N-I-0042 valorizada y N-I-0043 sin valorizar;
//  - en movimientos_entre_empresas, la deuda de la N-I-0042 ("Orden de retiro
//    N-I-0042") y su corrección, y en movimientos_entre_unidades su
//    orden_retiro_id (la tabla que lee super_admin).
//
//   http://localhost:4180/modulos/administracion.html?maqueta=orden-entre-empresas
'use strict';

const base = JSON.parse(JSON.stringify(require('./entre-empresas')));
const t = base.tablas;

t.clientes.push({ id: 'c-dp', codigo_anterior: null, unidad_negocio_id: 'u-n', nombre: 'DOLCE PASTA SRL', razon_social: 'DOLCE PASTA SRL', apodos: [],
  cuit: '33709335419', domicilio: null, localidad: 'Rosario', email: null, transporte_habitual: 'Camión propio', activo: true, lista_precio_id: 'l-int',
  limite_credito: null, condicion_iva: 'responsable_inscripto', proveedor_id: null, comision_habitual: null, pct_parte_a: null, provisorio: false,
  unidad_grupo_id: 'u-d' });
t.listas_precios.push({ id: 'l-int', unidad_negocio_id: 'u-n', nombre: 'Nuss → Dolce Pasta (interna)', moneda: 'ARS', activa: true, es_base: false, es_interna: true });

t.ordenes_retiro.unshift(
  { id: 'o42', numero: 42, codigo: 'N-I-0042', unidad_negocio_id: 'u-n', fecha: '2026-10-24', estado: 'confirmada', estado_valorizacion: 'valorizada',
    total: 500000, moneda: 'ARS', cliente_id: 'c-dp', cargada_por: 'emp-9', cargada_en: '2026-10-24T13:10:00Z', transporte: 'Camión propio', observaciones: null,
    comision_modo: null, comision_valor: null, comision_importe: null, comision_factura_id: null, division_pct_a: null },
  { id: 'o43', numero: 43, codigo: 'N-I-0043', unidad_negocio_id: 'u-n', fecha: '2026-10-24', estado: 'confirmada', estado_valorizacion: 'pendiente',
    total: 0, moneda: 'ARS', cliente_id: 'c-dp', cargada_por: 'emp-9', cargada_en: '2026-10-24T15:40:00Z', transporte: 'Camión propio', observaciones: null,
    comision_modo: null, comision_valor: null, comision_importe: null, comision_factura_id: null, division_pct_a: null },
);
t.orden_retiro_items.push(
  { id: 'i42', orden_id: 'o42', orden: 1, presentacion_id: 'pr1', marca_id: null, cajas: 10, unidades: 1000, precio_caja: 50000, subtotal: 500000, lote: null, tipo: 'retiro' },
  { id: 'i43', orden_id: 'o43', orden: 1, presentacion_id: 'pr1', marca_id: null, cajas: 4, unidades: 400, precio_caja: null, subtotal: null, lote: null, tipo: 'retiro' },
);
t.movimientos_entre_unidades = [
  { id: 'mu-o42', orden_retiro_id: 'o42' },
  { id: 'mu-o42b', orden_retiro_id: 'o42' },
];

// clientes_con_saldo de Nuss: el cliente del grupo con saldo 0 (la base no le
// escribe cliente_movimientos).
const saldos = base.rpc.clientes_con_saldo;
const fila = { cliente_id: 'c-dp', nombre: 'DOLCE PASTA SRL', razon_social: 'DOLCE PASTA SRL', cuit: '33709335419', lista: 'Nuss → Dolce Pasta (interna)', saldo: 0,
  ultimo_movimiento: null, retiros_mes: 2, es_tambien_proveedor: false, activo: true, codigo_anterior: null };
if (Array.isArray(saldos?.__defecto)) saldos.__defecto.push(fila);
else if (Array.isArray(saldos)) saldos.push(fila);

const DE_N = { de_unidad_id: 'u-n', de_unidad: 'Cucuruchos Nuss' }, A_D = { a_unidad_id: 'u-d', a_unidad: 'Dolce Pasta' };
const F = (o) => ({ fecha: '2026-10-24', tipo: 'otro', ...DE_N, ...A_D, moneda: 'ARS', cantidad: null, unidad_medida: null, presentacion_id: null, insumo_id: null,
  referencia_tipo: 'movimiento_entre_unidades', marca_id: null, con_precio: null, ...o });
base.rpc.movimientos_entre_empresas.unshift(
  F({ detalle: 'Corrección de la valorización de la orden N-I-0042', importe: '25000.00', referencia_id: 'mu-o42b' }),
  F({ detalle: 'Orden de retiro N-I-0042', importe: '500000.00', referencia_id: 'mu-o42' }),
);

// Valorizar la N-I-0043 (sin precios cargados en la lista interna: se escriben).
base.rpc.valorizar_orden_retiro = { total: 200000, moneda: 'ARS', saldo_cliente: 0, limite_credito: null, supera_limite: false };

module.exports = base;
