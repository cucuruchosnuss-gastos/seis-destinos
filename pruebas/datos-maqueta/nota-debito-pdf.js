// Datos de la maqueta: el PDF de una nota de débito de proveedor (24/10/2026,
// rama ci-prueba/ajustes-24-10). Parte de los datos de Cuentas corrientes
// (cuentas-corrientes.js) SIN cambiarlos y le suma, en la ficha de Harinera
// Uno en Nuss, dos notas de débito recibidas: una cargada CON su PDF
// (notas_debito.archivo_url = la ruta en el bucket 'comprobantes') y otra
// sin PDF. La firma del link la decide cada prueba con
// globalThis.__maqueta.firmar (e2e/maqueta/supabase-falso.js).
//
//   http://localhost:4180/modulos/cuentas-corrientes.html?maqueta=nota-debito-pdf
//   y después ?proveedor=p1&unidad=u-n
'use strict';

const base = JSON.parse(JSON.stringify(require('./cuentas-corrientes')));
const t = base.tablas;
const N = 'u-n';

t.facturas_pendientes.push(
  { id: 'f-nd1', proveedor_id: 'p1', unidad_negocio_id: N, estado: 'pendiente', moneda: 'ARS', importe: 82500, saldo_pendiente: 82500, numero_comprobante: 'Nota de débito 0001-4567', fecha_factura: '2026-10-20', modulo_origen: 'nota_debito', observaciones: null },
  { id: 'f-nd2', proveedor_id: 'p1', unidad_negocio_id: N, estado: 'pendiente', moneda: 'ARS', importe: 1500, saldo_pendiente: 1500, numero_comprobante: 'Nota de débito 0002-0099', fecha_factura: '2026-10-21', modulo_origen: 'nota_debito', observaciones: null },
);
t.v_cuenta_corriente_movimientos.push(
  { proveedor_id: 'p1', unidad_negocio_id: N, moneda: 'ARS', fecha: '2026-10-20', tipo: 'factura', monto: 82500, factura_pendiente_id: 'f-nd1', gasto_id: null, credito_id: null, referencia: 'Nota de débito 0001-4567', saldo_acumulado: 1332500.5, orden_desempate: 2 },
  { proveedor_id: 'p1', unidad_negocio_id: N, moneda: 'ARS', fecha: '2026-10-21', tipo: 'factura', monto: 1500, factura_pendiente_id: 'f-nd2', gasto_id: null, credito_id: null, referencia: 'Nota de débito 0002-0099', saldo_acumulado: 1334000.5, orden_desempate: 3 },
);
t.notas_debito = [
  { id: 'nd-p1', unidad_negocio_id: N, direccion: 'recibida', proveedor_id: 'p1', factura_pendiente_id: 'f-nd1', comprobante: '0001-4567', estado: 'vigente',
    archivo_url: 'uid-maqueta/notas-debito/p1/2026/1729800000000.pdf' },
  { id: 'nd-p2', unidad_negocio_id: N, direccion: 'recibida', proveedor_id: 'p1', factura_pendiente_id: 'f-nd2', comprobante: '0002-0099', estado: 'vigente', archivo_url: null },
];

module.exports = base;
