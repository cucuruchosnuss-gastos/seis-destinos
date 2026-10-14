// Datos de la maqueta: PRÉSTAMOS (13/10/2026; ver pruebas/datos-maqueta/README.md).
// Se generan a e2e/maqueta/datos/prestamos.json con `npm run maqueta:datos`.
//
// Sirve a las DOS pantallas de préstamos: el wizard de Gastos (empresa +
// categoría «Préstamos» → pagar una cuota) y Administración → Préstamos (la
// lista, el alta y el detalle). La cuenta tiene gastos:gastos_empresa (la
// tarea que piden todas las RPCs de préstamos) y no tiene retiros: en
// Administración entra solo por la sección global de Préstamos.
'use strict';

const { UID, tarea } = require('./comun');

const EMP = 'emp-pr';
const EMPRESA = 'emp-empresa';
const UNIDADES = [
  { id: 'u-n', nombre: 'Cucuruchos Nuss', prefijo: 'N', logo_url: 'logo-cucuruchos-nuss.png', activo: true, es_prueba: false },
  { id: 'u-d', nombre: 'Dolce Pasta', prefijo: 'D', logo_url: 'logo-dolce-pasta.png', activo: true, es_prueba: false },
  { id: 'u-p', nombre: 'Pruebas (robot)', prefijo: 'X', logo_url: null, activo: true, es_prueba: true },
];
const cat = (id, nombre) => ({ id, nombre, icon: null, activo: true });

const GALICIA = {
  id: 'pr-1', unidad_negocio_id: 'u-n', unidad: 'Cucuruchos Nuss', nombre: 'Préstamo Galicia', acreedor: 'Banco Galicia', moneda: 'USD', estado: 'activo',
  total: 20000, pagado: 5000, saldo: 15000, cuotas: 4, cuotas_pagas: 1,
  proxima: { cuota_id: 'q-2', numero: 2, vencimiento: '2026-10-10', importe: 5000, pagado: 0, falta: 5000 },
};
const LEASING = {
  id: 'pr-2', unidad_negocio_id: 'u-d', unidad: 'Dolce Pasta', nombre: 'Leasing horno', acreedor: null, moneda: 'ARS', estado: 'activo',
  total: 1200000, pagado: 0, saldo: 1200000, cuotas: 12, cuotas_pagas: 0,
  proxima: { cuota_id: 'r-1', numero: 1, vencimiento: '2026-11-05', importe: 100000, pagado: 0, falta: 100000 },
};
const VIEJO = {
  id: 'pr-3', unidad_negocio_id: 'u-n', unidad: 'Cucuruchos Nuss', nombre: 'Préstamo viejo', acreedor: 'Socio', moneda: 'ARS', estado: 'cancelado',
  total: 500000, pagado: 500000, saldo: 0, cuotas: 2, cuotas_pagas: 2, proxima: null,
};

const DETALLE_GALICIA = {
  prestamo: { id: 'pr-1', unidad_negocio_id: 'u-n', unidad: 'Cucuruchos Nuss', nombre: 'Préstamo Galicia', acreedor: 'Banco Galicia', moneda: 'USD',
    fecha_inicio: '2026-08-01', observaciones: 'Tasa fija del 9 % anual', estado: 'activo', total: 20000, pagado: 5000 },
  cuotas: [
    { id: 'q-1', numero: 1, vencimiento: '2026-09-10', importe: 5000, pagado: 5000, falta: 0, pct: 100 },
    { id: 'q-2', numero: 2, vencimiento: '2026-10-10', importe: 5000, pagado: 0, falta: 5000, pct: 0 },
    { id: 'q-3', numero: 3, vencimiento: '2026-11-10', importe: 5000, pagado: 0, falta: 5000, pct: 0 },
    { id: 'q-4', numero: 4, vencimiento: '2026-12-10', importe: 5000, pagado: 0, falta: 5000, pct: 0 },
  ],
  pagos: [
    { id: 'pg-1', cuota_numero: 1, fecha: '2026-09-10', moneda: 'ARS', monto: 3900000, tipo_cambio: 1300, imputado: 3000, cuenta: 'Banco Nación', medio: 'transferencia', gasto_id: 'g-1', cargado_por: 'Facu Maqueta', anulado: false, anulado_motivo: null },
    { id: 'pg-2', cuota_numero: 1, fecha: '2026-09-10', moneda: 'USD', monto: 2000, tipo_cambio: null, imputado: 2000, cuenta: 'Dólares en mano', medio: 'efectivo', gasto_id: 'g-2', cargado_por: 'Facu Maqueta', anulado: false, anulado_motivo: null },
    { id: 'pg-3', cuota_numero: 2, fecha: '2026-10-01', moneda: 'USD', monto: 500, tipo_cambio: null, imputado: 500, cuenta: 'Dólares en mano', medio: 'efectivo', gasto_id: 'g-3', cargado_por: 'Facu Maqueta', anulado: true, anulado_motivo: 'Cargado dos veces' },
  ],
};
const DETALLE_LEASING = {
  prestamo: { id: 'pr-2', unidad_negocio_id: 'u-d', unidad: 'Dolce Pasta', nombre: 'Leasing horno', acreedor: null, moneda: 'ARS',
    fecha_inicio: '2026-10-05', observaciones: null, estado: 'activo', total: 1200000, pagado: 0 },
  cuotas: Array.from({ length: 12 }, (_, i) => {
    const mes = 11 + i;
    const anio = 2026 + Math.floor((mes - 1) / 12);
    const m = ((mes - 1) % 12) + 1;
    return { id: 'r-' + (i + 1), numero: i + 1, vencimiento: `${anio}-${String(m).padStart(2, '0')}-05`, importe: 100000, pagado: 0, falta: 100000, pct: 0 };
  }),
  pagos: [],
};

module.exports = {
  uid: UID,
  tablas: {
    empleados: [
      { id: EMP, auth_user_id: UID, nombre: 'Facu Maqueta', rol_app: 'usuario', activo: true, unidad_negocio_id: 'u-n', es_prueba: false, es_dispositivo: false },
    ],
    empleado_modulos: [{ empleado_id: EMP, modulo: 'gastos', habilitado: true }],
    empleado_tareas: [
      tarea(EMP, 'gastos', 'ver_exportar', { todas: true }),
      tarea(EMP, 'gastos', 'gastos_empresa'),
    ],
    unidades_negocio: UNIDADES,
    v_empleados_publico: [
      { id: EMP, nombre: 'Facu Maqueta', unidad_negocio_id: 'u-n', tipo: 'naaloo', activo: true },
      { id: EMPRESA, nombre: 'Empresa', unidad_negocio_id: null, tipo: 'empresa', activo: false },
    ],
    categorias: [cat('c-rep', 'Repuestos'), cat('c-pr', 'Préstamos'), cat('c-com', 'Combustible')],
    vehiculos: [],
    proyectos: [],
    proveedores: [],
    cuentas_caja: [
      { id: 'cta-ars', empleado_id: EMP, nombre: 'Efectivo', medio: 'efectivo', moneda: 'ARS', favorita: true, activa: true },
      { id: 'cta-usd', empleado_id: EMP, nombre: 'Dólares en mano', medio: 'efectivo', moneda: 'USD', favorita: false, activa: true },
      { id: 'cta-emp-ars', empleado_id: EMPRESA, nombre: 'Banco Nación', medio: 'banco', moneda: 'ARS', favorita: false, activa: true },
    ],
    gastos: [],
  },
  rpc: {
    fecha_inicio_circuito_stock: '2026-10-01',
    ingresos_sin_gasto: [],
    mis_pendientes: [],
    prestamos_activos: {
      __segun: [
        { si: { p_unidad_negocio_id: 'u-n', p_incluir_cancelados: true }, r: [GALICIA, VIEJO] },
        { si: { p_unidad_negocio_id: 'u-n' }, r: [GALICIA] },
        { si: { p_unidad_negocio_id: 'u-d', p_incluir_cancelados: true }, r: [LEASING] },
        { si: { p_unidad_negocio_id: 'u-d' }, r: [LEASING] },
      ],
      __defecto: [GALICIA, LEASING, VIEJO],
    },
    prestamo_detalle: {
      __segun: [
        { si: { p_prestamo_id: 'pr-1' }, r: DETALLE_GALICIA },
        { si: { p_prestamo_id: 'pr-2' }, r: DETALLE_LEASING },
      ],
      __defecto: null,
    },
    pagar_cuota_prestamo: { imputado: 4000, falta: 1000, moneda: 'USD', gastos: ['g-nuevo-1', 'g-nuevo-2'] },
    crear_prestamo: 'pr-nuevo',
    editar_prestamo: null,
    anular_pago_prestamo: null,
  },
};
