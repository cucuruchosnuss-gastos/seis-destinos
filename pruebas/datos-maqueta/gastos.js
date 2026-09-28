// Datos de la maqueta y de las pruebas: gastos (ver pruebas/datos-maqueta/README.md).
// Se generan a e2e/maqueta/datos/gastos.json con `npm run maqueta:datos`.
//
// Para MIRAR la barra de unidad en Gastos (28/09/2026): gastos de Nuss, Dolce
// Pasta, el Taller (uno con proyecto y uno "gasto general") y uno de vehículo
// SIN unidad. La maqueta no puede mover el reloj: las fechas son de septiembre
// de 2026, así que con "Hoy" la lista sale vacía; elegí Período "sep-26".
'use strict';

const { UID } = require('./comun');

const EMP = 'emp-g';
const UNIDADES = [
  { id: 'u-n', nombre: 'Cucuruchos Nuss', prefijo: 'N', logo_url: 'logo-cucuruchos-nuss.png', activo: true, es_prueba: false },
  { id: 'u-d', nombre: 'Dolce Pasta', prefijo: 'D', logo_url: 'logo-dolce-pasta.png', activo: true, es_prueba: false },
  { id: 'u-t', nombre: 'Taller', prefijo: 'T', logo_url: 'logo-taller.png', activo: true, es_prueba: false },
  { id: 'u-p', nombre: 'Pruebas (robot)', prefijo: 'X', logo_url: null, activo: true, es_prueba: true },
];
const unidad = (id) => { const u = UNIDADES.find(x => x.id === id); return u ? { id: u.id, nombre: u.nombre } : null };
const cat = (id, nombre) => ({ id, nombre, icon: null });

function gasto(id, unidadId, razon, importe, extra = {}) {
  return {
    id, fecha: '2026-09-20', fecha_pago: '2026-09-20', periodo: 'sep-26', tipo_doc: 'Factura A', numero_doc: '0001-0000' + id.slice(-2),
    razon_social: razon, importe, moneda: 'ARS', proveedor_id: null, unidad_negocio_id: unidadId,
    medio_pago: 'efectivo', estado: 'registrado', lugar_servicio: null, descripcion: null, observaciones: null, kilometraje: null,
    foto_url: null, cuenta_id: null, anulado_por: null, anulado_en: null, motivo_anulacion: null, empleado_id: EMP,
    categorias: cat('c-rep', 'Repuestos'), empleados: { id: EMP, nombre: 'Facu Maqueta' },
    unidades_negocio: unidad(unidadId), vehiculos: null, proyectos: null,
    ...extra,
  };
}

module.exports = {
  uid: UID,
  tablas: {
    empleados: [
      { id: EMP, auth_user_id: UID, nombre: 'Facu Maqueta', rol_app: 'usuario', activo: true, unidad_negocio_id: 'u-n', es_prueba: false, es_dispositivo: false },
    ],
    empleado_modulos: [{ empleado_id: EMP, modulo: 'gastos', habilitado: true }],
    empleado_tareas: [
      { empleado_id: EMP, modulo: 'gastos', tarea: 'ver_exportar', alcance: { todas: true }, habilitado: true },
      { empleado_id: EMP, modulo: 'gastos', tarea: 'editar_anular', alcance: null, habilitado: true },
    ],
    unidades_negocio: UNIDADES,
    v_empleados_publico: [
      { id: EMP, nombre: 'Facu Maqueta', unidad_negocio_id: 'u-n', tipo: 'naaloo', activo: true },
    ],
    categorias: [cat('c-rep', 'Repuestos'), cat('c-com', 'Combustible'), cat('c-mp', 'Insumos - Materia Prima')].map(c => ({ ...c, activo: true })),
    vehiculos: [{ id: 'v-1', nombre: 'Kangoo', marca: 'Renault', patente: 'AB123CD', unidad_negocio_id: null, activo: true }],
    proyectos: [
      { id: 'p-1', nombre: 'Máquina barquillo', activo: true, estado: 'en_curso' },
      { id: 'p-2', nombre: 'Automatización línea 2', activo: true, estado: 'presupuestado' },
      { id: 'p-3', nombre: 'Horno entregado', activo: true, estado: 'entregado' },
    ],
    proveedores: [],
    cuentas_caja: [{ id: 'cta-1', empleado_id: EMP, nombre: 'Efectivo', medio: 'efectivo', moneda: 'ARS', favorita: true, activa: true }],
    gastos: [
      gasto('g-01', 'u-n', 'Harinera del Sur', 185000),
      gasto('g-02', 'u-n', 'Bolsas Rosario', 42300.5),
      gasto('g-03', 'u-d', 'Distribuidora Dolce', 77000),
      gasto('g-04', 'u-t', 'Ferretería Km 711', 15400, { proyectos: { id: 'p-1', nombre: 'Máquina barquillo', activo: true, estado: 'en_curso' } }),
      gasto('g-05', 'u-t', 'Tornillería Central', 3900),
      gasto('g-06', null, 'YPF Ruta 9', 28000, { categorias: cat('c-com', 'Combustible'), vehiculos: { id: 'v-1', nombre: 'Kangoo', marca: 'Renault', patente: 'AB123CD' } }),
      gasto('g-07', 'u-n', 'Gasto anulado', 9999, { estado: 'anulado' }),
    ],
  },
  rpc: {
    fecha_inicio_circuito_stock: '2026-10-01',
    ingresos_sin_gasto: [
      { ingreso_id: 'i-1', fecha: '2026-10-02', proveedor_id: null, razon_social: 'Harinera del Sur', numero_doc: '0003-00001234', unidad_negocio_id: 'u-n', foto_url: null, importe_ocr: '185000' },
      { ingreso_id: 'i-2', fecha: '2026-10-03', proveedor_id: null, razon_social: 'Ferretería Km 711', numero_doc: '0001-00000777', unidad_negocio_id: 'u-t', foto_url: null, importe_ocr: null },
    ],
    mis_pendientes: [],
  },
};
