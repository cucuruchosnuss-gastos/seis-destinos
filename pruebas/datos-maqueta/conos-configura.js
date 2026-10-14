// Datos de la maqueta y de las pruebas: Conos de papel como lo ve quien
// configura producción (produccion:configurar + conos:ver, 14/10/2026). Ve
// Stock, Pendientes de entrega y "Todos los conos" con LOS TRES interruptores
// habilitados. El catálogo tiene 357 marcas, como la base al 14/10/2026 (las
// de conos.js más apagadas de relleno), para mirar que la lista y el buscador
// anden fluidos.
//
//   http://localhost:4180/modulos/conos.html?maqueta=conos-configura&vista=todos
'use strict';

const { tarea } = require('./comun');
const base = JSON.parse(JSON.stringify(require('./conos')));

const EMP = 'emp-lucia';
base.email = 'lucia@seisdestinos.com';
base.meta = { nombre_completo: 'Lucía Configura' };
base.tablas.empleados = [{ id: EMP, auth_user_id: base.uid, nombre: 'Configura Lucía', rol_app: 'usuario', activo: true, unidad_negocio_id: 'u-n', es_prueba: false, es_dispositivo: false }];
base.tablas.empleado_tareas = [tarea(EMP, 'conos', 'ver'), tarea(EMP, 'produccion', 'configurar')];
base.tablas.cono_papel_precios = [];
base.rpc.conos_por_pedir = 'ERROR:No tenés permiso.';

const NOMBRES = ['HELADOS', 'CAFÉ', 'PANADERÍA', 'DULCERÍA', 'GELATERIA', 'KIOSCO'];
const relleno = [];
for (let i = base.rpc.conos_catalogo.length; i < 357; i++) {
  relleno.push({
    marca_id: `dddddddd-0000-4000-8000-${String(i).padStart(12, '0')}`,
    cono: `${NOMBRES[i % NOMBRES.length]} ${String(i).padStart(3, '0')}`,
    activa: false, doble_bolsa: false, papel_ilustracion: false, estado_alta: 'aprobada', stock: 0, consumo_30d: 0,
  });
}
const activos = base.rpc.conos_catalogo.filter(f => f.activa);
const apagados = base.rpc.conos_catalogo.filter(f => !f.activa).concat(relleno)
  .sort((a, b) => a.cono.localeCompare(b.cono, 'es'));
base.rpc.conos_catalogo = activos.concat(apagados);

module.exports = base;
