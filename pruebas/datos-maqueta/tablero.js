// Datos de la maqueta y de las pruebas: el TABLERO del dueño (dashboard.html,
// handoff "Esqueleto", pantallas 1a, 1b, 4a, 4b, 5a, 6a, 7a y 7b). Los mismos
// números del diseño: Pablo, 142 cajas, $ 2.914.000 cobrados hoy, etc. El
// reloj de la prueba va fijo en `ahora` (lunes 28/09/2026, 10:30 en Argentina).
// Se generan a e2e/maqueta/datos/tablero.json con `npm run maqueta:datos`.
'use strict';
const { UID, UNIDADES_4 } = require('./comun');

const YO = 'emp-pablo';
const EMPRESA = 'emp-empresa';
const hoy = '2026-09-28';
const ahora = '2026-09-28T13:30:00.000Z';

const gasto = (id, fecha, importe, categoria_id, proveedor_id, extra = {}) => ({
  id, fecha, importe, moneda: 'ARS', categoria_id, proveedor_id, unidad_negocio_id: 'u-n', estado: 'registrado', ...extra,
});

// 118 personas de Naaloo; 33 con acceso a la app, más Pablo: 34 usuarios.
const personas = [];
for (let i = 1; i <= 118; i++) {
  personas.push({ id: `emp-${i}`, nombre: `Persona ${i}`, unidad_negocio_id: 'u-n', tipo: 'naaloo', activo: true, rol_app: 'usuario',
    caja_raiz: false, oculto_como_contraparte: false, tiene_acceso: i <= 33 });
}

const cheque = (i, importe, fecha_pago) => ({ id: `ch-${i}`, importe, tipo: 'diferido', fecha_emision: '2026-08-20', fecha_pago, estado: 'en_cartera',
  cobranzas: { unidad_negocio_id: 'u-n', estado: 'procesada' } });

const cobranza = (id, nombre, total, fecha = hoy) => ({ id, cargada_por_nombre: nombre, total, estado: 'procesada', unidad_negocio_id: 'u-n', fecha });

const pedido = (i, fecha_entrega, estado = 'pendiente') => ({ id: `pe-${i}`, numero: 1000 + i, fecha: '2026-09-20', fecha_entrega, cliente: `Cliente ${i}`,
  estado, cajas_pedidas: 10, cajas_cumplidas: 0, renglones: 1, sin_interpretar: 0, observaciones: null });
const pedidos = [];
let n = 0;
for (let i = 0; i < 11; i++) pedidos.push(pedido(++n, hoy));                 // para hoy
for (let i = 0; i < 16; i++) pedidos.push(pedido(++n, '2026-10-02'));        // el resto de esta semana
for (let i = 0; i < 9; i++) pedidos.push(pedido(++n, '2026-10-09'));         // la que viene
for (let i = 0; i < 2; i++) pedidos.push(pedido(++n, '2026-09-24'));         // atrasados
pedidos.push(pedido(++n, '2026-09-20', 'entregado'));

const vacioProduccion = { fecha: hoy, ahora: [], cajas_por_producto: [], semana: { scrap_kg: 0, masa_kg: 0 }, rendimiento_harina: [], scrap_por_lote: [], pendientes: { planillas_por_completar: 0 } };

// Nos deben $ 23.615.000: los tres del diseño y diez más chicos (1.466.000 cada
// uno); uno con saldo a favor, que no suma.
const clientes = [
  ['c1', 'Caserato', 4120000], ['c2', 'Heladería Duomo', 2860000], ['c3', 'Freddo Tandil', 1975000],
  ...Array.from({ length: 10 }, (_, i) => [`c-${i + 4}`, `Cliente ${i + 4}`, 1466000]),
  ['c-favor', 'Almacén Don José', -250000],
].map(([cliente_id, nombre, saldo]) => ({ cliente_id, nombre, razon_social: null, cuit: null, lista: 'General', saldo, ultimo_movimiento: hoy,
  retiros_mes: 2, es_tambien_proveedor: false, activo: true, codigo_anterior: null }));

const proyecto = (i, extra = {}) => ({ id: `pr-${i}`, nombre: `Proyecto ${i}`, destino: 'externo', categoria: 'maquina', estado: 'en_curso',
  cliente: 'Carrizo', fabrica_destino: null, fecha_entrega_prometida: '2026-11-01', atrasado: false, presupuesto_costo: 1000000, costo_total: 500000,
  horas: 10, horas_estimadas: 40, precio_venta: 2000000, ...extra });

module.exports = {
  uid: UID,
  email: 'pablo@seisdestinos.com.ar',
  meta: { nombre_completo: 'Pablo Nuss' },
  ahora,
  tablas: {
    empleados: [{ id: YO, auth_user_id: UID, nombre: 'Pablo Nuss', rol_app: 'super_admin', activo: true, unidad_negocio_id: 'u-n', es_prueba: false, es_dispositivo: false }],
    empleado_modulos: [],
    empleado_tareas: [],
    unidades_negocio: UNIDADES_4,
    v_empleados_publico: [
      { id: YO, nombre: 'Pablo Nuss', unidad_negocio_id: 'u-n', tipo: 'admin', activo: true, rol_app: 'super_admin', caja_raiz: false, oculto_como_contraparte: false, tiene_acceso: true },
      { id: EMPRESA, nombre: 'Empresa', unidad_negocio_id: null, tipo: 'empresa', activo: false, rol_app: 'usuario', caja_raiz: false, oculto_como_contraparte: false, tiene_acceso: false },
      ...personas,
    ],
    categorias: [
      { id: 'cat-mp', nombre: 'Materia prima' }, { id: 'cat-su', nombre: 'Sueldos y cargas' }, { id: 'cat-fl', nombre: 'Fletes' },
      { id: 'cat-ma', nombre: 'Mantenimiento' }, { id: 'cat-li', nombre: 'Limpieza' }, { id: 'cat-co', nombre: 'Combustible' },
    ],
    // Septiembre: $ 4.380.000; hoy $ 186.500; últimos 7 días $ 912.000; 7 sin proveedor.
    gastos: [
      gasto('g1', hoy, 186500, 'cat-mp', 'prov-1'),
      gasto('g2', '2026-09-25', 725500, 'cat-su', null),
      gasto('g3', '2026-09-10', 1733500, 'cat-mp', 'prov-1'),
      gasto('g4', '2026-09-05', 379500, 'cat-su', null),
      gasto('g5', '2026-09-12', 486000, 'cat-fl', 'prov-2'),
      gasto('g6', '2026-09-03', 200000, 'cat-ma', null),
      gasto('g7', '2026-09-08', 200000, 'cat-ma', null),
      gasto('g8', '2026-09-15', 250000, 'cat-li', null),
      gasto('g9', '2026-09-16', 119000, 'cat-co', null),
      gasto('g10', '2026-09-17', 100000, 'cat-co', null),
      gasto('g-anulado', hoy, 999999, 'cat-mp', null, { estado: 'anulado' }),
    ],
    v_caja_saldos: [
      { empleado_id: YO, moneda: 'ARS', saldo: 1248300 },
      { empleado_id: YO, moneda: 'USD', saldo: 2350 },
    ],
    cuentas_caja: [
      { id: 'c-e1', empleado_id: EMPRESA, moneda: 'ARS', unidad_negocio_id: 'u-n' },
      { id: 'c-e2', empleado_id: EMPRESA, moneda: 'ARS', unidad_negocio_id: 'u-d' },
      { id: 'c-e3', empleado_id: EMPRESA, moneda: 'USD', unidad_negocio_id: 'u-n' },
    ],
    v_caja_saldos_cuenta: [
      { cuenta_id: 'c-e1', saldo: 4840000 }, { cuenta_id: 'c-e2', saldo: 2000000 }, { cuenta_id: 'c-e3', saldo: 18200 },
    ],
    caja_movimientos: [
      { empleado_id: YO, fecha: hoy, tipo: 'ingreso', monto: 420000, moneda: 'ARS' },
      { empleado_id: YO, fecha: hoy, tipo: 'egreso_gasto', monto: 312600, moneda: 'ARS' },
      { empleado_id: YO, fecha: hoy, tipo: 'egreso_traspaso', monto: 50000, moneda: 'ARS' },
      { empleado_id: YO, fecha: hoy, tipo: 'ingreso_traspaso', monto: 50000, moneda: 'ARS' },
    ],
    v_cobranzas: [
      cobranza('co1', 'Ramón Gutiérrez', 1320000), cobranza('co2', 'Marcelo Díaz', 986000), cobranza('co3', 'Juan Pérez', 608000),
      cobranza('co4', 'Ramón Gutiérrez', 5000000, '2026-09-24'), cobranza('co5', 'Marcelo Díaz', 3000000, '2026-09-23'), cobranza('co6', 'Juan Pérez', 2956000, '2026-09-22'),
    ],
    // 12 cheques: $ 18.450.000, plazo promedio 38 días, 2 para depositar hoy y
    // 3 que vencen esta semana (su plazo de 30 días termina antes del 05/10).
    cobranza_cheques: [
      cheque(1, 1000000, '2026-09-02'), cheque(2, 1000000, '2026-09-03'), cheque(3, 1000000, '2026-09-04'),
      cheque(4, 750000, hoy), cheque(5, 750000, hoy),
      cheque(6, 2000000, '2026-11-17'), cheque(7, 2000000, '2026-11-17'), cheque(8, 2000000, '2026-11-17'), cheque(9, 2000000, '2026-11-17'),
      cheque(10, 2000000, '2026-11-17'), cheque(11, 2000000, '2026-11-17'), cheque(12, 1950000, '2026-11-17'),
    ],
    v_saldo_proveedor: [
      { proveedor_id: 'prov-1', unidad_negocio_id: 'u-n', moneda: 'ARS', deuda_pendiente: 3480000, credito_disponible: 0 },
      { proveedor_id: 'prov-2', unidad_negocio_id: 'u-n', moneda: 'ARS', deuda_pendiente: 2115000, credito_disponible: 0 },
      { proveedor_id: 'prov-3', unidad_negocio_id: 'u-d', moneda: 'ARS', deuda_pendiente: 1260000, credito_disponible: 0 },
      { proveedor_id: 'prov-4', unidad_negocio_id: 'u-n', moneda: 'ARS', deuda_pendiente: 1100000, credito_disponible: 0 },
      { proveedor_id: 'prov-7', unidad_negocio_id: 'u-n', moneda: 'ARS', deuda_pendiente: 771400, credito_disponible: 0 },
      { proveedor_id: 'prov-5', unidad_negocio_id: 'u-d', moneda: 'ARS', deuda_pendiente: 1000000, credito_disponible: 0 },
      { proveedor_id: 'prov-6', unidad_negocio_id: 'u-n', moneda: 'ARS', deuda_pendiente: 0, credito_disponible: 5000 },
    ],
    proveedores: [
      { id: 'prov-1', razon_social: 'MOLINO CAÑUELAS SACIFIA', nombre_fantasia: 'Molino Cañuelas' },
      { id: 'prov-2', razon_social: 'LEDESMA SAAI', nombre_fantasia: 'Ledesma' },
      { id: 'prov-3', razon_social: 'CARTONERA DEL SUR SRL', nombre_fantasia: 'Cartonera del Sur' },
      { id: 'prov-4', razon_social: 'FERPLAST S.R.L.', nombre_fantasia: null },
      { id: 'prov-5', razon_social: 'EMBALAJES MERCOSUR S.R.L.', nombre_fantasia: null },
    ],
    materia_prima_ingresos: [
      ...[1, 2, 3, 4].map(i => ({ id: `mi-${i}`, fecha: hoy, unidad_negocio_id: 'u-n' })),
      ...Array.from({ length: 13 }, (_, i) => ({ id: `mi-v${i}`, fecha: '2026-09-24', unidad_negocio_id: 'u-n' })),
    ],
    // Hoy es lunes: las 9 órdenes de la semana son de hoy; dos llevan cajas (96).
    ordenes_retiro: [
      { id: 'o1', fecha: hoy, estado: 'confirmada', unidad_negocio_id: 'u-n' },
      { id: 'o2', fecha: hoy, estado: 'confirmada', unidad_negocio_id: 'u-n' },
      ...Array.from({ length: 7 }, (_, i) => ({ id: `o-s${i}`, fecha: hoy, estado: 'confirmada', unidad_negocio_id: 'u-d' })),
      { id: 'o-anulada', fecha: hoy, estado: 'anulada', unidad_negocio_id: 'u-n' },
    ],
    orden_retiro_items: [
      { orden_id: 'o1', cajas: 60 }, { orden_id: 'o2', cajas: 36 }, { orden_id: 'o2', cajas: null },
    ],
    cliente_movimientos: [
      { cliente_id: 'c1', tipo: 'cobranza', importe: -21280000, fecha: '2026-09-10' },
      { cliente_id: 'c2', tipo: 'cobranza', importe: -20000000, fecha: '2026-09-20' },
    ],
    errores_app: [
      { id: 'e1', creado_en: '2026-09-27T10:00:00Z' }, { id: 'e2', creado_en: '2026-09-25T10:00:00Z' }, { id: 'e3', creado_en: '2026-09-22T10:00:00Z' },
      { id: 'e-viejo', creado_en: '2026-09-01T10:00:00Z' },
    ],
  },
  rpc: {
    mis_pendientes: [
      { modulo: 'cobranzas', clave: 'por_controlar', cantidad: 5, texto: 'Cobranzas por controlar' },
      { modulo: 'cheques', clave: 'por_vencer', cantidad: 3, texto: 'Cheques que vencen esta semana' },
      { modulo: 'caja', clave: 'solicitudes_mi_caja', cantidad: 1, texto: 'Movimientos por aceptar en mi caja' },
      { modulo: 'accesos', clave: 'solicitudes', cantidad: 2, texto: 'Solicitudes de acceso' },
      { modulo: 'materia_prima', clave: 'facturas_por_ingresar', cantidad: 3, texto: 'Facturas por ingresar' },
      { modulo: 'stock', clave: 'transferencias_por_aceptar', cantidad: 2, texto: 'Transferencias por aceptar' },
      { modulo: 'stock', clave: 'recuento_abierto', cantidad: 1, texto: 'Recuentos abiertos' },
      { modulo: 'administracion', clave: 'ordenes_sin_valorizar', cantidad: 4, texto: 'Órdenes de retiro sin valorizar' },
      { modulo: 'administracion', clave: 'clientes_sobre_limite', cantidad: 2, texto: 'Clientes que pasan su límite de crédito' },
      { modulo: 'produccion', clave: 'conos_por_revisar', cantidad: 0, texto: 'Conos nuevos por revisar' },
    ],
    resumen_cobranzas: { __segun: [
      { si: { p_desde: hoy, p_hasta: hoy }, r: [{ por_controlar: 5, cantidad: 3, total: 2914000 }] },
      { si: { p_desde: '2026-09-22', p_hasta: hoy }, r: [{ por_controlar: 5, cantidad: 6, total: 13870000 }] },
      { si: { p_estado: 'registrada' }, r: [{ por_controlar: 5, cantidad: 5, total: 1742000 }] },
    ], __defecto: [{ por_controlar: 0, cantidad: 0, total: 0 }] },
    indicadores_produccion: { __segun: [
      { si: { p_unidad_negocio_id: 'u-n' }, r: {
        fecha: hoy,
        ahora: [
          { maquina: 'Máquina 1', lote: 7033, turno: 'Mañana', estado: 'abierto', encargado: 'Federico Silva', masas: 6, cajas: 38, parada_en_curso: null },
          { maquina: 'Máquina 2', lote: 7033, turno: 'Mañana', estado: 'abierto', encargado: 'Federico Silva', masas: 7, cajas: 52, parada_en_curso: null },
          { maquina: 'Máquina 3', lote: 7031, turno: 'Mañana', estado: 'abierto', encargado: 'Federico Silva', masas: 6, cajas: 44, parada_en_curso: null },
          { maquina: 'Máquina 4', lote: 7034, turno: 'Mañana', estado: 'abierto', encargado: 'Federico Silva', masas: 4, cajas: 8,
            parada_en_curso: { motivo: 'se cortó la cadena', desde: '2026-09-28T13:18:00.000Z' } },
        ],
        cajas_por_producto: [{ producto: 'Cucuruchón Mini', hoy: 100, semana_pasada: 90 }, { producto: 'Cucuruchón Grande', hoy: 42, semana_pasada: 38 }],
        semana: { turnos: 12, cajas: 900, unidades: 400000, masas: 120, scrap_kg: 21, masa_kg: 1000, minutos_parada: 45 },
        rendimiento_harina: [
          { producto: 'Cucuruchón Mini', lote: '7031', kg_harina: 500, unidades: 50000, unidades_por_kg: 100, promedio_del_producto: 116, diferencia_pct: -14 },
          { producto: 'Cucuruchón Mini', lote: '7033', kg_harina: 500, unidades: 60000, unidades_por_kg: 120, promedio_del_producto: 116, diferencia_pct: 3 },
        ],
        scrap_por_lote: [],
        pendientes: { planillas_por_completar: 2, turnos_abiertos_de_otro_dia: 0, conos_por_revisar: 0 },
      } },
    ], __defecto: vacioProduccion },
    pedidos_de: { __segun: [{ si: { p_unidad_negocio_id: 'u-n' }, r: pedidos }], __defecto: [] },
    clientes_con_saldo: { __segun: [{ si: { p_unidad_negocio_id: 'u-n' }, r: clientes }], __defecto: [] },
    proyectos_taller: [
      proyecto(1, { atrasado: true, fecha_entrega_prometida: '2026-09-20' }), proyecto(2, { atrasado: true, fecha_entrega_prometida: '2026-09-25' }),
      proyecto(3, { costo_total: 1500000 }), proyecto(4), proyecto(5), proyecto(6, { destino: 'interno', cliente: null, fabrica_destino: 'Dolce Pasta' }), proyecto(7),
    ],
    sesiones_de: [{ creada: '2026-09-28T10:00:00Z', ultima_actividad: '2026-09-28T13:00:00Z', dispositivo: 'Chrome en Windows', ip: '1.1.1.1' },
      { creada: '2026-09-27T10:00:00Z', ultima_actividad: '2026-09-27T13:00:00Z', dispositivo: 'Chrome en Android', ip: '1.1.1.2' },
      { creada: '2026-09-26T10:00:00Z', ultima_actividad: '2026-09-26T13:00:00Z', dispositivo: 'Safari en iPhone', ip: '1.1.1.3' }],
  },
};
