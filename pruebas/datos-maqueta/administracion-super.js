// Datos de la maqueta y de las pruebas: Administración vista por un
// super_admin (27/09/2026). Los mismos datos de administracion.js, más lo que
// solo ve un super_admin: los errores de la app.
// Se generan a e2e/maqueta/datos/administracion-super.json con `npm run maqueta:datos`.
'use strict';

const base = JSON.parse(JSON.stringify(require('./administracion')));

base.tablas.empleados = base.tablas.empleados.map(e => ({ ...e, rol_app: 'super_admin' }));
base.tablas.errores_app = [
  { id: 'err-1', empleado_id: 'emp-1', pantalla: 'produccion', mensaje: 'Al volver no se pudo revisar la sesión: Failed to fetch', detalle: 'visible',
    url: 'https://cucuruchosnuss-gastos.github.io/seis-destinos/modulos/produccion.html',
    dispositivo: 'Mozilla/5.0 (Linux; Android 14; SM-X135) AppleWebKit/537.36 Chrome/140 Safari/537.36 · app instalada · 800x1280 · portrait-primary',
    evento: 'reanudar', creado_en: '2026-09-27T12:00:00Z' },
  { id: 'err-2', empleado_id: 'emp-1', pantalla: 'administracion', mensaje: 'clientes_con_saldo: PGRST301 JWT expired', detalle: null,
    url: 'https://cucuruchosnuss-gastos.github.io/seis-destinos/modulos/administracion.html',
    dispositivo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140 · navegador · 1440x900 · landscape-primary',
    evento: 'rpc', creado_en: '2026-09-27T11:30:00Z' },
];
// El registro de seguridad y las sesiones abiertas (27/09/2026).
base.tablas.registro_seguridad = [
  { id: 'seg-1', empleado_id: 'emp-2', accion: 'cerrar_sesiones', motivo: 'Se fue de la empresa', hecho_por: 'emp-1', hecho_en: '2026-09-27T12:30:00Z' },
  { id: 'seg-2', empleado_id: 'emp-1', accion: 'cerrar_sesiones', motivo: 'Perdí el celular', hecho_por: 'emp-1', hecho_en: '2026-09-26T21:00:00Z' },
]
base.rpc = { ...(base.rpc ?? {}), sesiones_de: [
  { creada: '2026-09-27T11:00:00Z', ultima_actividad: '2026-09-27T12:55:00Z', dispositivo: 'Mozilla/5.0 (Linux; Android 14; SM-X135) AppleWebKit/537.36 Chrome/140.0 Safari/537.36', ip: '181.10.20.30' },
  { creada: '2026-09-25T13:00:00Z', ultima_actividad: '2026-09-26T20:10:00Z', dispositivo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36 Edg/140.0', ip: '200.1.2.3' },
] }
base.tablas.v_empleados_publico = [...(base.tablas.v_empleados_publico ?? []).filter(e => e.id !== 'emp-1'), { id: 'emp-1', nombre: 'Emanuel Romero' }, { id: 'emp-2', nombre: 'Franco Díaz' }];

module.exports = base;
