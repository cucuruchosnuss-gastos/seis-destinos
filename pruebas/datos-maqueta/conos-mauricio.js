// Datos de la maqueta y de las pruebas: Conos de papel como lo ve Mauricio
// Silva (depósito): ver + recibir. Ve el Stock y los Pendientes de entrega con
// el botón Recibir; NO ve "Por pedir" ni ningún precio. Los mismos datos que
// conos.js, sin las tablas que su permiso no lee (cono_papel_precios pide
// conos:precios; conos_por_pedir pide conos:pedir).
//
//   http://localhost:4180/modulos/conos.html?maqueta=conos-mauricio
'use strict';

const { tarea } = require('./comun');
const base = JSON.parse(JSON.stringify(require('./conos')));

const EMP = 'emp-mauricio';
base.email = 'mauricio@seisdestinos.com';
base.meta = { nombre_completo: 'Mauricio Silva' };
base.tablas.empleados = [{ id: EMP, auth_user_id: base.uid, nombre: 'Silva Mauricio Alejandro', rol_app: 'usuario', activo: true, unidad_negocio_id: 'u-n', es_prueba: false, es_dispositivo: false }];
base.tablas.empleado_tareas = [tarea(EMP, 'conos', 'ver'), tarea(EMP, 'conos', 'recibir')];
base.tablas.cono_papel_precios = [];
base.rpc.conos_por_pedir = 'ERROR:No tenés permiso.';

module.exports = base;
