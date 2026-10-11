// Datos de la maqueta: el DETALLE DE UN GASTO, para mirarlo en el celular
// (10/10/2026, e2e/31-vistas-faltantes.spec.js). Ver
// pruebas/datos-maqueta/README.md. Se abre derecho con ?gasto=<id>.
//
// Parte de ampliar-gastos.js (el gasto g-amp, con observaciones largas y la
// foto) SIN cambiarlo, y le suma un gasto ANULADO con motivo, vehículo,
// kilometraje y una razón social larga (g-anu).
//
//   http://localhost:4180/modulos/gastos.html?maqueta=celular-gastos&gasto=g-anu
'use strict';

const base = JSON.parse(JSON.stringify(require('./ampliar-gastos')));
const t = base.tablas;
const molde = t.gastos.find(g => g.id === 'g-01');

t.gastos.push({
  ...molde,
  id: 'g-anu', razon_social: 'ESTACIÓN DE SERVICIO HERMANOS RODRÍGUEZ Y ASOCIADOS S.R.L.', importe: 186450.75,
  numero_doc: '00045-00012345678', unidad_negocio_id: null, medio_pago: 'transferencia', kilometraje: 184350,
  categorias: { id: 'c-com', nombre: 'Combustible', icon: null },
  vehiculos: { id: 'v-1', nombre: 'Kangoo', marca: 'Renault', patente: 'AB123CD' }, vehiculo_id: 'v-1', unidades_negocio: null,
  estado: 'anulado', anulado_por: 'emp-g', anulado_en: '2026-09-21T14:30:00Z',
  motivo_anulacion: 'Se cargó dos veces: el mismo ticket ya estaba en el gasto del 19/09 a nombre de otra persona.',
});

module.exports = base;
