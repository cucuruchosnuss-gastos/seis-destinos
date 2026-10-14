// Datos de la maqueta: la sección RETENCIONES de Administración (13/10/2026).
// Ver pruebas/datos-maqueta/README.md.
//
// Parte de los datos de Administración (administracion.js) SIN cambiarlos —las
// otras pruebas los usan tal cual— y suma:
//  - gastos:gastos_empresa (la tarea que pide la sección y las cuatro RPCs);
//  - la Empresa (v_empleados_publico tipo 'empresa') y sus cuentas de banco:
//    dos de Nuss en pesos, una en dólares y una inactiva (no se ofrecen) y la
//    de Dolce Pasta;
//  - retenciones_resumen: por tipo (Nuss y Dolce Pasta) y la lista, con una
//    anulada y una con el nombre de un cliente;
//  - buscar_clientes con la empresa: "turco" encuentra a Distribuidora
//    Anatolia por su apodo ("el Turco");
//  - la cuenta del cliente Anatolia con una retención ("Retención
//    percepcion_iibb · cert. 0001-00012345", como la escribe la base);
//  - las respuestas de registrar_retencion, registrar_retencion_banco y
//    anular_retencion.
//
//   http://localhost:4180/modulos/administracion.html?seccion=retenciones&maqueta=retenciones
'use strict';

const admin = require('./administracion');

const N = 'u-n', D = 'u-d';
const base = JSON.parse(JSON.stringify(admin));
const t = base.tablas;

t.empleado_tareas.push({ empleado_id: 'emp-1', modulo: 'gastos', tarea: 'gastos_empresa', alcance: null, habilitado: true });

t.v_empleados_publico = (t.v_empleados_publico ?? []).concat([{ id: 'emp-empresa', nombre: 'Empresa', tipo: 'empresa' }]);
t.cuentas_caja = (t.cuentas_caja ?? []).filter(c => c.id !== 'cta-banco-nuss').concat([
  { id: 'cta-banco-nuss', nombre: 'Banco Macro · Nuss', unidad_negocio_id: N, medio: 'banco', moneda: 'ARS', activa: true, empleado_id: 'emp-empresa' },
  { id: 'cta-nacion-nuss', nombre: 'Banco Nación · Nuss', unidad_negocio_id: N, medio: 'banco', moneda: 'ARS', activa: true, empleado_id: 'emp-empresa' },
  { id: 'cta-dolares-nuss', nombre: 'Banco Macro USD · Nuss', unidad_negocio_id: N, medio: 'banco', moneda: 'USD', activa: true, empleado_id: 'emp-empresa' },
  { id: 'cta-vieja-nuss', nombre: 'Banco Viejo · Nuss', unidad_negocio_id: N, medio: 'banco', moneda: 'ARS', activa: false, empleado_id: 'emp-empresa' },
  { id: 'cta-galicia-dolce', nombre: 'Banco Galicia · Dolce Pasta', unidad_negocio_id: D, medio: 'banco', moneda: 'ARS', activa: true, empleado_id: 'emp-empresa' },
]);

// Como lo devuelve la base (jsonb): por tipo sin las anuladas; la lista con
// todas, la más nueva arriba.
const POR_TIPO_NUSS = [
  { unidad_negocio_id: N, unidad: 'Cucuruchos Nuss', tipo: 'ganancias', total: 12500.5, cantidad: 1 },
  { unidad_negocio_id: N, unidad: 'Cucuruchos Nuss', tipo: 'percepcion_iibb', total: 3200, cantidad: 2 },
  { unidad_negocio_id: N, unidad: 'Cucuruchos Nuss', tipo: 'sircreb', total: 845.75, cantidad: 1 },
];
const POR_TIPO_DOLCE = [
  { unidad_negocio_id: D, unidad: 'Dolce Pasta', tipo: 'iva', total: 7000, cantidad: 1 },
];
const LISTA_NUSS = [
  { id: 'ret-1', unidad: 'Cucuruchos Nuss', fecha: '2026-10-10', tipo: 'percepcion_iibb', importe: 1200, origen: 'cliente', cliente: 'Distribuidora Anatolia',
    numero_certificado: '0001-00012345', jurisdiccion: 'Córdoba', detalle: null, cargado_por: 'Emanuel Romero', anulado: false, anulado_motivo: null },
  { id: 'ret-2', unidad: 'Cucuruchos Nuss', fecha: '2026-10-08', tipo: 'sircreb', importe: 845.75, origen: 'banco', cliente: null,
    numero_certificado: null, jurisdiccion: 'Córdoba', detalle: 'Banco Macro · Nuss', cargado_por: 'Emanuel Romero', anulado: false, anulado_motivo: null },
  { id: 'ret-3', unidad: 'Cucuruchos Nuss', fecha: '2026-10-05', tipo: 'ganancias', importe: 12500.5, origen: 'proveedor', cliente: null,
    numero_certificado: 'GAN-2026-0099', jurisdiccion: null, detalle: 'Retención de un proveedor que nos compró', cargado_por: 'Emanuel Romero', anulado: false, anulado_motivo: null },
  { id: 'ret-4', unidad: 'Cucuruchos Nuss', fecha: '2026-10-03', tipo: 'percepcion_iibb', importe: 2000, origen: 'cliente', cliente: 'Kiosco Pepe',
    numero_certificado: '0002-00000777', jurisdiccion: 'Córdoba', detalle: null, cargado_por: 'Emanuel Romero', anulado: false, anulado_motivo: null },
  { id: 'ret-5', unidad: 'Cucuruchos Nuss', fecha: '2026-10-02', tipo: 'iva', importe: 999, origen: 'otro', cliente: null,
    numero_certificado: null, jurisdiccion: null, detalle: null, cargado_por: 'Emanuel Romero', anulado: true, anulado_motivo: 'Cargada dos veces' },
];
const LISTA_DOLCE = [
  { id: 'ret-6', unidad: 'Dolce Pasta', fecha: '2026-10-09', tipo: 'iva', importe: 7000, origen: 'cliente', cliente: 'Heladería Sur',
    numero_certificado: 'IVA-55', jurisdiccion: null, detalle: null, cargado_por: 'Emanuel Romero', anulado: false, anulado_motivo: null },
];
const todas = { por_tipo: [...POR_TIPO_NUSS, ...POR_TIPO_DOLCE], lista: [...LISTA_DOLCE.slice(0, 1), ...LISTA_NUSS].sort((a, b) => b.fecha.localeCompare(a.fecha)) };
base.rpc.retenciones_resumen = {
  __segun: [
    { si: { p_unidad_negocio_id: N }, r: { por_tipo: POR_TIPO_NUSS, lista: LISTA_NUSS } },
    { si: { p_unidad_negocio_id: D }, r: { por_tipo: POR_TIPO_DOLCE, lista: LISTA_DOLCE } },
  ],
  __defecto: todas,
};

// "turco": Distribuidora Anatolia por su apodo, en Nuss.
base.rpc.buscar_clientes.__segun.push(
  { si: { p_busqueda: 'turco', p_unidad_negocio_id: N }, r: [
    { cliente_id: 'c1', nombre: 'Distribuidora Anatolia', razon_social: 'ANATOLIA SRL', cuit: '30712345671', localidad: 'Córdoba',
      empresa: 'Cucuruchos Nuss', unidad_negocio_id: N, activo: true, saldo: 96000, parecido: 0.8, apodos: ['el Turco'], apodo_coincide: 'el Turco' },
  ] },
);

// La cuenta de Anatolia con su retención (la de c2 sigue vacía).
const cuentaAnatolia = JSON.parse(JSON.stringify(base.rpc.cuenta_cliente.__defecto)).concat([
  { fecha: '2026-10-10', tipo: 'retencion', detalle: 'Retención percepcion_iibb · cert. 0001-00012345', importe: -1200, saldo: 94800, orden_retiro_id: null },
]);
base.rpc.cuenta_cliente.__segun.push({ si: { p_cliente_id: 'c1' }, r: cuentaAnatolia });

base.rpc.registrar_retencion = 'ret-nueva';
base.rpc.registrar_retencion_banco = 'ret-banco';
base.rpc.anular_retencion = null;

module.exports = base;
