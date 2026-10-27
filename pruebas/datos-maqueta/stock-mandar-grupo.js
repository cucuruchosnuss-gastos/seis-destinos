// Datos de la maqueta: "Mandar a otra empresa del grupo" (26/10/2026), de
// Stock a la Carga. Ver pruebas/datos-maqueta/README.md. La maqueta guarda los
// datos por pestaña, así que un mismo juego tiene que servir a las DOS
// pantallas: parte de la Carga a otra empresa (retiros-entre-empresas.js: la
// persona con retiros:cargar y stock:ver en todas, el cliente "DOLCE PASTA
// SRL" de Nuss que es Dolce Pasta) SIN cambiarla, y le suma lo que Stock lee
// para dibujarse (stock.js) y "PAZ, MIRTA", el cliente de Dolce Pasta que es
// Cucuruchos Nuss.
//
//   http://localhost:4180/modulos/stock.html?maqueta=stock-mandar-grupo
'use strict';

const base = JSON.parse(JSON.stringify(require('./retiros-entre-empresas')));
const stock = JSON.parse(JSON.stringify(require('./stock')));
const t = base.tablas;

// Lo de Stock que la Carga no tiene (las tablas que tienen las dos quedan
// como las tiene la Carga).
for (const [k, v] of Object.entries(stock.tablas)) {
  if (!(k in t) && !['empleados', 'empleado_modulos', 'empleado_tareas'].includes(k)) t[k] = v;
}
for (const [k, v] of Object.entries(stock.rpc || {})) {
  if (!(k in base.rpc)) base.rpc[k] = v;
}
// Las fábricas completas (con nombre y activo), como las tiene Stock: con las
// de la Carga (solo id) la barra de arriba no tendría ninguna.
t.unidades_negocio = stock.tablas.unidades_negocio;
t.empleado_modulos.push({ empleado_id: 'emp-1', modulo: 'stock', habilitado: true });
t.clientes.push({ id: 'c-paz', unidad_negocio_id: 'u-d', nombre: 'PAZ, MIRTA', razon_social: null, apodos: [], cuit: null,
  domicilio: null, localidad: 'Córdoba', email: null, transporte_habitual: null, activo: true, provisorio: false, unidad_grupo_id: 'u-n' });

module.exports = base;
