// Datos de la maqueta: DESDE LA CUENTA DEL CLIENTE, ABRIR LA ORDEN DE RETIRO
// (14/10/2026). Ver pruebas/datos-maqueta/README.md.
//
// Parte de los de Cliente y proveedor (cuenta-unica.js): Distribuidora
// Anatolia (c1, Nuss) es cliente y proveedor. Cambia:
//  - en la cuenta de cliente y proveedor (cuenta_unificada), las ventas
//    llevan su orden_retiro_id (o1 / o12) y la cobranza su cobranza_id;
//  - la cuenta de cliente (cuenta_cliente) de Anatolia es LARGA (veinte
//    movimientos, cada retiro con su orden), para que haya scroll y se pueda
//    ver que "← Volver" lo repone;
//  - la cobranza existe (v_cobranzas / cobranzas), para abrir su detalle.
//
//   http://localhost:4180/modulos/administracion.html?seccion=clientes&maqueta=cuenta-a-orden
'use strict';

const base = require('./cuenta-unica');

const copia = (x) => JSON.parse(JSON.stringify(x));
const t = copia(base.tablas);
const rpc = copia(base.rpc);

const COB = 'c5555555-5555-4555-8555-555555555555';

// La cuenta de cliente y proveedor: las ventas con su orden y la cobranza
// con su id.
const unica = rpc.cuenta_unificada.__segun[0].r;
for (const f of unica) {
  if (f.etiqueta === 'Venta') f.orden_retiro_id = 'o1';
  if (f.etiqueta === 'Cobranza') f.cobranza_id = COB;
}
// Una venta más (la orden N-0013), para que el filtro "Venta" deje dos.
const ultima = unica[unica.length - 1];
unica.push({ ...ultima, fecha: '2026-09-26', orden: '2026-09-26T18:00:00Z', etiqueta: 'Venta', detalle: 'Orden de retiro N-0013',
  te_debe: 642410, le_debes: 0, te_debe_acum: ultima.te_debe_acum + 642410, neto_acum: ultima.te_debe_acum + 642410 - ultima.le_debes_acum,
  orden_retiro_id: 'o12', cobranza_id: null });

// La cuenta de cliente de Anatolia, larga: el saldo inicial y, de a pares,
// una orden (N-0012 / N-0013 alternadas) y una cobranza.
const larga = [{ fecha: '2026-06-01', tipo: 'saldo_inicial', detalle: 'Deuda de mayo', importe: 80000, saldo: 80000, orden_retiro_id: null }];
let saldo = 80000;
for (let i = 0; i < 10; i++) {
  const dia = String(i * 3 + 1).padStart(2, '0');
  const mes = i < 5 ? '07' : '08';
  saldo += 46000;
  larga.push({ fecha: `2026-${mes}-${dia}`, tipo: 'retiro', detalle: `Orden de retiro ${i % 2 ? 'N-0013' : 'N-0012'}`, importe: 46000, saldo, orden_retiro_id: i % 2 ? 'o12' : 'o1' });
  saldo -= 30000;
  larga.push({ fecha: `2026-${mes}-${dia}`, tipo: 'cobranza', detalle: 'Cobranza de la ruta', importe: -30000, saldo, orden_retiro_id: null });
}
rpc.cuenta_cliente = { __segun: [{ si: { p_cliente_id: 'c1' }, r: larga }, ...rpc.cuenta_cliente.__segun], __defecto: rpc.cuenta_cliente.__defecto };

// La cobranza de la cuenta de cliente y proveedor, para abrir su detalle.
t.v_cobranzas.push({ id: COB, cliente: 'Distribuidora Anatolia', estado: 'procesada', fecha: '2026-09-22', efectivo: 30000, cantidad_cheques: 0,
  total: 30000, moneda: 'ARS', cargada_por_nombre: 'Mariano Chofer', procesada_por_nombre: 'Lucía', procesada_en: '2026-09-22T18:00:00Z',
  unidad_negocio_id: 'u-n', unidad_negocio_nombre: 'Cucuruchos Nuss' });
t.cobranzas.push({ id: COB, cliente_id: 'c1' });

module.exports = { uid: base.uid, tablas: t, rpc };
