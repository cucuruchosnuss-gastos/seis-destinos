// Datos de la maqueta: la Carga de una orden a OTRA EMPRESA DEL GRUPO
// (24/10/2026). Ver pruebas/datos-maqueta/README.md. Parte de los datos de la
// Carga (retiros.js) SIN cambiarlos y suma el cliente "DOLCE PASTA SRL" de
// Nuss con unidad_grupo_id = Dolce Pasta, los nombres de las empresas en
// unidades_negocio y la respuesta de registrar_orden_retiro con
// entre_empresas: true.
//
//   http://localhost:4180/modulos/retiros.html?maqueta=retiros-entre-empresas
'use strict';

const base = JSON.parse(JSON.stringify(require('./retiros')));
const t = base.tablas;

for (const u of t.unidades_negocio) {
  if (u.id === 'u-n') u.nombre = 'Cucuruchos Nuss';
  if (u.id === 'u-d') u.nombre = 'Dolce Pasta';
}
t.clientes.push({ id: 'c-dp', unidad_negocio_id: 'u-n', nombre: 'DOLCE PASTA SRL', razon_social: 'DOLCE PASTA SRL', apodos: [], cuit: '33709335419',
  domicilio: null, localidad: 'Rosario', email: null, transporte_habitual: 'Camión propio', activo: true, provisorio: false, unidad_grupo_id: 'u-d' });

base.rpc.registrar_orden_retiro = { orden_id: 'o-42', numero: 42, codigo: 'N-0042', stock_insuficiente: [], entre_empresas: true };

module.exports = base;
