// Datos de la maqueta: la VENTA POR UNIDAD (27/10/2026, rama
// ci-prueba/venta-por-unidad). Ver pruebas/datos-maqueta/README.md.
// Parte de los de la Carga (retiros.js) SIN cambiarlos y suma:
//  - los "Conos de papel sueltos · Por cono" (con cono, 1 por caja, en 0 y
//    producto_presentaciones.sin_stock = true) y el cono GIOVANI;
//  - el cliente TURI;
//  - el Cucurucho grande de la base se llama "Cucuruchón Grande" (con sus lotes);
//  - registrar_orden_retiro responde la N-0035 y "Mis retiros" la trae como
//    quedó en la base: 3 cajas de Cucuruchón Grande + 720 conos GIOVANI.
//
//   http://localhost:4180/modulos/retiros.html?maqueta=retiros-venta-por-unidad
'use strict';

const base = JSON.parse(JSON.stringify(require('./retiros')));
const t = base.tablas;
const rpc = base.rpc;

const c1 = t.clientes.find(c => c.id === 'c1');
t.clientes.push({ ...c1, id: 'c-turi', nombre: 'TURI', razon_social: 'TURI SRL', apodos: [], cuit: null, email: null, transporte_habitual: null });
t.marcas_personalizadas.push({ id: 'm-giovani', nombre: 'GIOVANI', estado_alta: 'aprobada', activa: true });
t.producto_presentaciones.push({ id: 'pr-conos', producto_id: 'p-conos', nombre: 'Por cono', con_cono: true, unidades_por_caja: 1, activa: true, sin_stock: true });

for (const p of rpc.catalogo_para_retiro.productos) if (p.producto === 'Cucurucho grande') p.producto = 'Cucuruchón Grande';
rpc.catalogo_para_retiro.productos.push({ presentacion_id: 'pr-conos', producto: 'Conos de papel sueltos', presentacion: 'Por cono', categoria: 'especiales',
  con_cono: true, media_caja: false, unidades_por_caja: 1, stock_cajas: 0 });

rpc.registrar_orden_retiro = { orden_id: 'o-35', numero: 35, codigo: 'N-0035', stock_insuficiente: [], entre_empresas: false };
rpc.mis_ordenes_retiro = [{
  orden_id: 'o-35', codigo: 'N-0035', fecha: '2026-10-27', estado: 'confirmada', cliente: 'TURI', transporte: null, observaciones: null,
  cargada_en: '2026-10-27T13:00:00Z',
  renglones: [
    { orden: 1, tipo: 'producto', producto: 'Cucuruchón Grande', presentacion: 'Caja x 100', marca: null, cajas: 3, unidades: 300, movimiento: 'retiro',
      item_id: 'it-35-1', presentacion_id: 'pr1', marca_id: null, lotes: [{ lote: '7021', cajas: 3 }] },
    { orden: 2, tipo: 'producto', producto: 'Conos de papel sueltos', presentacion: 'Por cono', marca: 'GIOVANI', cajas: 720, unidades: 720, movimiento: 'retiro',
      item_id: 'it-35-2', presentacion_id: 'pr-conos', marca_id: 'm-giovani', lotes: [{ lote: 'SIN LOTE', cajas: 720 }] },
  ],
}, ...(Array.isArray(rpc.mis_ordenes_retiro) ? rpc.mis_ordenes_retiro : [])];

module.exports = base;
