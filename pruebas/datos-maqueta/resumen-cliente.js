// Datos de la maqueta: el resumen de cuenta de un CLIENTE (11/10/2026,
// js/resumen-cuenta.js). Ver pruebas/datos-maqueta/README.md.
// Parte de los datos de Administración (administracion.js) SIN cambiarlos:
// las empresas con razón social, CUIT y domicilio, y una cuenta propia para
// "DIST. ANAT. SRL" en Dolce Pasta (c1-d, el mismo cliente que Distribuidora
// Anatolia de Nuss por su CUIT), así se ve "Todas, separadas":
//   Nuss (c1, la de siempre): 01/09 saldo inicial 80.000 → 20/09 retiro
//        N-0012 46.000 → 22/09 cobranza 30.000 = 96.000.
//   Dolce (c1-d): 10/08 saldo inicial 20.000 → 12/09 retiro 28.000 →
//        02/10 cobranza 8.000 = 40.000 (al 30/09: 48.000).
//
//   http://localhost:4180/modulos/administracion.html?maqueta=resumen-cliente
'use strict';

const base = JSON.parse(JSON.stringify(require('./administracion')));

const DATOS_EMPRESA = {
  'u-n': { razon_social: 'SEIS DESTINOS SAS', cuit: '30719434777', domicilio: 'Unión 843, Córdoba' },
  'u-d': { razon_social: 'DOLCE PASTA SRL', cuit: '33709335419', domicilio: 'Rosario' },
};
base.tablas.unidades_negocio = base.tablas.unidades_negocio.map(u => ({ ...u, ...(DATOS_EMPRESA[u.id] || {}) }));

base.rpc.cuenta_cliente.__segun.unshift({ si: { p_cliente_id: 'c1-d' }, r: [
  { fecha: '2026-08-10', tipo: 'saldo_inicial', detalle: 'Deuda del sistema viejo', importe: 20000, saldo: 20000, orden_retiro_id: null },
  { fecha: '2026-09-12', tipo: 'retiro', detalle: 'Retiro de septiembre', importe: 28000, saldo: 48000, orden_retiro_id: null },
  { fecha: '2026-10-02', tipo: 'cobranza', detalle: 'Cobranza octubre', importe: -8000, saldo: 40000, orden_retiro_id: null },
] });

module.exports = base;
