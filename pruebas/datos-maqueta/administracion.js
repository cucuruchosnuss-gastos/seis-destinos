// Datos de la maqueta y de las pruebas: administracion (ver pruebas/datos-maqueta/README.md).
// Se generan a e2e/maqueta/datos/administracion.json con `npm run maqueta:datos`.
'use strict';

module.exports = {
  "tablas": {
    "empleados": [
      {
        "id": "emp-1",
        "rol_app": "usuario",
        "nombre": "Emanuel Romero",
        "auth_user_id": "uid-maqueta",
        "unidad_negocio_id": "u-n",
        "es_prueba": false
      }
    ],
    "empleado_tareas": [
      {
        "empleado_id": "emp-1",
        "modulo": "retiros",
        "tarea": "ver",
        "alcance": {
          "todas": true
        },
        "habilitado": true
      },
      {
        "empleado_id": "emp-1",
        "modulo": "retiros",
        "tarea": "precios",
        "alcance": {
          "todas": true
        },
        "habilitado": true
      },
      {
        "empleado_id": "emp-1",
        "modulo": "retiros",
        "tarea": "anular",
        "alcance": {
          "todas": true
        },
        "habilitado": true
      },
      {
        "empleado_id": "emp-1",
        "modulo": "stock",
        "tarea": "ver",
        "alcance": {
          "todas": true
        },
        "habilitado": true
      },
      {
        "empleado_id": "emp-1",
        "modulo": "cobranzas",
        "tarea": "procesar",
        "alcance": null,
        "habilitado": true
      },
      {
        "empleado_id": "emp-1",
        "modulo": "pedidos",
        "tarea": "configurar",
        "alcance": {
          "todas": true
        },
        "habilitado": true
      },
      {
        "empleado_id": "emp-1",
        "modulo": "cobranzas",
        "tarea": "ver_todo",
        "alcance": null,
        "habilitado": true
      },
      // Endosar a un proveedor (29/09/2026): registrar_pago lo habilita y
      // ver_todo deja ver sus facturas en la vista previa.
      {
        "empleado_id": "emp-1",
        "modulo": "cuentas_corrientes",
        "tarea": "registrar_pago",
        "alcance": null,
        "habilitado": true
      },
      {
        "empleado_id": "emp-1",
        "modulo": "cuentas_corrientes",
        "tarea": "ver_todo",
        "alcance": null,
        "habilitado": true
      }
    ],
    "unidades_negocio": [
      {
        "id": "u-n",
        "nombre": "Cucuruchos Nuss",
        "prefijo": "N",
        "logo_url": "logo-cucuruchos-nuss.png",
        "activo": true,
        "es_prueba": false
      },
      {
        "id": "u-d",
        "nombre": "Dolce Pasta",
        "prefijo": "D",
        "logo_url": "logo-dolce-pasta.png",
        "activo": true,
        "es_prueba": false
      }
    ],
    "clientes": [
      // Un cliente APAGADO (28/09/2026): se ve con "Mostrar apagados"
      // (clientes_con_saldo con p_incluir_apagados, 29/09/2026).
      { "id": "c-apagado", "unidad_negocio_id": "u-n", "nombre": "Kiosco Cerrado", "razon_social": null, "apodos": [], "cuit": null,
        "localidad": "Río Cuarto", "telefono": null, "observaciones": null, "activo": false, "codigo_anterior": 55, "limite_credito": null, "proveedor_id": null },
      {
        "id": "c1",
        "codigo_anterior": 101,
        "unidad_negocio_id": "u-n",
        "nombre": "Distribuidora Anatolia",
        "razon_social": "ANATOLIA SRL",
        "apodos": [
          "el Turco"
        ],
        "cuit": "30712345678",
        "domicilio": "Av. Siempreviva 742",
        "localidad": "Córdoba",
        "email": "compras@anatolia.com",
        "transporte_habitual": "Expreso Norte",
        "activo": true,
        "lista_precio_id": "l1",
        "limite_credito": 100000,
        "condicion_iva": "responsable_inscripto",
        "proveedor_id": "pv1",
        "plazo_pago_dias": 30
      },
      {
        "id": "c2",
        "unidad_negocio_id": "u-n",
        "nombre": "Kiosco Pepe",
        "razon_social": null,
        "apodos": [
          "Pepe de la ruta"
        ],
        "activo": true
      },
      // El cliente completo (30/09/2026): las cuentas de Dolce Pasta de
      // Anatolia (mismo CUIT) y de Kiosco Pepe (sin CUIT).
      { "id": "c1-d", "unidad_negocio_id": "u-d", "nombre": "DIST. ANAT. SRL", "razon_social": "DIST. ANAT. SRL", "apodos": [], "cuit": "30-71234567-8", "activo": true },
      { "id": "c2-d", "unidad_negocio_id": "u-d", "nombre": "Kiosco Pepe", "razon_social": null, "apodos": [], "cuit": null, "activo": true },
      {
        "id": "c-dolce",
        "unidad_negocio_id": "u-d",
        "nombre": "Almacén Rivadavia",
        "razon_social": "RIVADAVIA SRL",
        "apodos": [],
        "activo": true
      },
      // "JyM" (29/09/2026): el mismo cliente en Nuss y en Dolce Pasta, con
      // cuentas separadas, más dos que se le parecen.
      { "id": "c-jm-n", "unidad_negocio_id": "u-n", "nombre": "J&M DISTRIBUCIONES Y SERVICI", "razon_social": "J&M DISTRIBUCIONES Y SERVICI",
        "apodos": [], "cuit": "30711111112", "localidad": "Córdoba", "activo": true },
      { "id": "c-jm-d", "unidad_negocio_id": "u-d", "nombre": "J&M DISTRIBUCIONES Y SERVICI", "razon_social": "J&M DISTRIBUCIONES Y SERVICI",
        "apodos": [], "cuit": "30711111112", "localidad": "Córdoba", "activo": true },
      { "id": "c-jmv", "unidad_negocio_id": "u-n", "nombre": "JM Viandas", "razon_social": null, "apodos": [], "activo": true },
      { "id": "c-juanma", "unidad_negocio_id": "u-d", "nombre": "Juan Manuel Kiosco", "razon_social": null, "apodos": ["Juanma"], "activo": true }
    ],
    "productos_terminados": [
      {
        "id": "p1",
        "unidad_negocio_id": "u-n",
        "nombre": "Cucurucho grande",
        "tipo_masa": "Común",
        "activo": true
      },
      {
        "id": "p2",
        "unidad_negocio_id": "u-n",
        "nombre": "Cucurucho chico",
        "tipo_masa": "Común",
        "activo": true
      },
      {
        "id": "p3",
        "unidad_negocio_id": "u-n",
        "nombre": "Cucurucho choco",
        "tipo_masa": "Chocolate",
        "activo": true
      }
    ],
    "producto_presentaciones": [
      {
        "id": "pr1",
        "producto_id": "p1",
        "nombre": "Caja x 100",
        "con_cono": false,
        "unidades_por_caja": 100,
        "activa": true
      },
      {
        "id": "pr1c",
        "producto_id": "p1",
        "nombre": "Caja x 100 con cono",
        "con_cono": true,
        "unidades_por_caja": 100,
        "activa": true
      },
      {
        "id": "pr2",
        "producto_id": "p2",
        "nombre": "Caja x 320",
        "con_cono": false,
        "unidades_por_caja": 320,
        "activa": true
      },
      {
        "id": "pr3",
        "producto_id": "p3",
        "nombre": "Caja x 50",
        "con_cono": false,
        "unidades_por_caja": 50,
        "activa": true
      }
    ],
    "marcas_personalizadas": [
      {
        "id": "m1",
        "nombre": "LOLO",
        "estado_alta": "aprobada",
        "activa": true
      },
      {
        "id": "m2",
        "nombre": "CASERATO",
        "estado_alta": "aprobada",
        "activa": true
      }
    ],
    "stock_terminado_movimientos": [
      {
        "unidad_negocio_id": "u-n",
        "presentacion_id": "pr1",
        "marca_id": null,
        "lote": "7030-1",
        "cajas": 20,
        "fecha": "2026-09-20",
        "created_at": "2026-09-20T10:00:00Z"
      },
      {
        "unidad_negocio_id": "u-n",
        "presentacion_id": "pr1",
        "marca_id": null,
        "lote": "7010-2",
        "cajas": 8,
        "fecha": "2026-09-10",
        "created_at": "2026-09-10T10:00:00Z"
      },
      {
        "orden_retiro_id": "o1",
        "tipo": "despacho",
        "presentacion_id": "pr1",
        "marca_id": null,
        "lote": "7010-2",
        "cajas": -8
      },
      {
        "orden_retiro_id": "o1",
        "tipo": "despacho",
        "presentacion_id": "pr1",
        "marca_id": null,
        "lote": "7030-1",
        "cajas": -2
      },
      {
        "orden_retiro_id": "o1",
        "tipo": "despacho",
        "presentacion_id": "pr1c",
        "marca_id": "m1",
        "lote": "7032-1",
        "cajas": -4
      }
    ],
    "empleado_modulos": [
      {
        "empleado_id": "emp-1",
        "modulo": "retiros",
        "habilitado": true
      },
      {
        "empleado_id": "emp-1",
        "modulo": "cobranzas",
        "habilitado": true
      },
      {
        "empleado_id": "emp-1",
        "modulo": "cuentas-corrientes",
        "habilitado": true
      }
    ],
    "ordenes_retiro": [
      {
        "id": "o12",
        "numero": 13,
        "codigo": "N-0013",
        "unidad_negocio_id": "u-n",
        "fecha": "2026-09-26",
        "estado": "confirmada",
        "estado_valorizacion": "valorizada",
        "total": 642410,
        "moneda": "ARS",
        "cliente_id": "c1",
        "cargada_por": "emp-9",
        "cargada_en": "2026-09-26T17:32:00Z",
        "transporte": "Expreso Norte",
        "observaciones": "Frágil, no apilar más de 5. Retira el transporte de la tarde; avisar antes de cargar la harina."
      },
      {
        "id": "o1",
        "numero": 12,
        "codigo": "N-0012",
        "unidad_negocio_id": "u-n",
        "fecha": "2026-09-26",
        "estado": "confirmada",
        "estado_valorizacion": "pendiente",
        "total": 0,
        "moneda": "ARS",
        "cliente_id": "c1",
        "cargada_por": "emp-9",
        "cargada_en": "2026-09-26T17:32:00Z",
        "transporte": "Expreso Norte",
        "observaciones": "Frágil"
      },
      {
        "id": "o2",
        "numero": 11,
        "codigo": "N-0011",
        "unidad_negocio_id": "u-n",
        "fecha": "2026-09-25",
        "estado": "confirmada",
        "estado_valorizacion": "valorizada",
        "total": 45000,
        "moneda": "ARS",
        "cliente_id": "c2",
        "cargada_por": "emp-9",
        "cargada_en": "2026-09-25T12:00:00Z"
      },
      {
        "id": "o3",
        "numero": 10,
        "codigo": "N-0010",
        "unidad_negocio_id": "u-n",
        "fecha": "2026-09-24",
        "estado": "anulada",
        "estado_valorizacion": "pendiente",
        "total": 0,
        "moneda": "ARS",
        "cliente_id": "c1",
        "cargada_por": "emp-9",
        "cargada_en": "2026-09-24T12:00:00Z",
        "anulada_motivo": "Se cargó dos veces"
      }
    ],
    "orden_retiro_items": [
      {
        "id": "i1",
        "orden_id": "o1",
        "orden": 1,
        "presentacion_id": "pr1",
        "marca_id": null,
        "cajas": 10,
        "unidades": 1000,
        "precio_caja": null,
        "subtotal": null
      },
      {
        "id": "i2",
        "orden_id": "o1",
        "orden": 2,
        "presentacion_id": "pr1c",
        "marca_id": "m1",
        "cajas": 4,
        "unidades": 400,
        "precio_caja": null,
        "subtotal": null
      },
      {
        "id": "i3",
        "orden_id": "o2",
        "orden": 1,
        "presentacion_id": "pr2",
        "marca_id": null,
        "cajas": 3,
        "unidades": 960,
        "precio_caja": 15000,
        "subtotal": 45000
      },
      {
        "id": "x0",
        "orden_id": "o12",
        "orden": 1,
        "presentacion_id": "pr1",
        "marca_id": null,
        "cajas": 5,
        "unidades": 500,
        "insumo_id": null,
        "cantidad": null,
        "precio_caja": 3000,
        "subtotal": 15000,
        "lote": null
      },
      {
        "id": "x1",
        "orden_id": "o12",
        "orden": 2,
        "presentacion_id": "pr1c",
        "marca_id": null,
        "cajas": 6,
        "unidades": 600,
        "insumo_id": null,
        "cantidad": null,
        "precio_caja": 3250,
        "subtotal": 19500,
        "lote": null
      },
      {
        "id": "x2",
        "orden_id": "o12",
        "orden": 3,
        "presentacion_id": "pr2",
        "marca_id": null,
        "cajas": 7,
        "unidades": 700,
        "insumo_id": null,
        "cantidad": null,
        "precio_caja": 3500,
        "subtotal": 24500,
        "lote": null
      },
      {
        "id": "x3",
        "orden_id": "o12",
        "orden": 4,
        "presentacion_id": "pr3",
        "marca_id": null,
        "cajas": 8,
        "unidades": 800,
        "insumo_id": null,
        "cantidad": null,
        "precio_caja": 3750,
        "subtotal": 30000,
        "lote": null
      },
      {
        "id": "x4",
        "orden_id": "o12",
        "orden": 5,
        "presentacion_id": "pr1",
        "marca_id": null,
        "cajas": 9,
        "unidades": 900,
        "insumo_id": null,
        "cantidad": null,
        "precio_caja": 4000,
        "subtotal": 36000,
        "lote": null
      },
      {
        "id": "x5",
        "orden_id": "o12",
        "orden": 6,
        "presentacion_id": "pr1c",
        "marca_id": null,
        "cajas": 10,
        "unidades": 1000,
        "insumo_id": null,
        "cantidad": null,
        "precio_caja": 4250,
        "subtotal": 42500,
        "lote": null
      },
      {
        "id": "x6",
        "orden_id": "o12",
        "orden": 7,
        "presentacion_id": "pr2",
        "marca_id": null,
        "cajas": 11,
        "unidades": 1100,
        "insumo_id": null,
        "cantidad": null,
        "precio_caja": 4500,
        "subtotal": 49500,
        "lote": null
      },
      {
        "id": "x7",
        "orden_id": "o12",
        "orden": 8,
        "presentacion_id": "pr3",
        "marca_id": null,
        "cajas": 12,
        "unidades": 1200,
        "insumo_id": null,
        "cantidad": null,
        "precio_caja": 4750,
        "subtotal": 57000,
        "lote": null
      },
      {
        "id": "y0",
        "orden_id": "o12",
        "orden": 9,
        "presentacion_id": null,
        "marca_id": null,
        "cajas": null,
        "unidades": null,
        "insumo_id": "ins-1",
        "cantidad": 250.5,
        "precio_caja": 820,
        "subtotal": 205410,
        "lote": null
      },
      {
        "id": "y1",
        "orden_id": "o12",
        "orden": 10,
        "presentacion_id": null,
        "marca_id": null,
        "cajas": null,
        "unidades": null,
        "insumo_id": "ins-2",
        "cantidad": 300,
        "precio_caja": 95,
        "subtotal": 28500,
        "lote": null
      },
      {
        "id": "y2",
        "orden_id": "o12",
        "orden": 11,
        "presentacion_id": null,
        "marca_id": null,
        "cajas": null,
        "unidades": null,
        "insumo_id": "ins-1",
        "cantidad": 25,
        "precio_caja": 820,
        "subtotal": 20500,
        "lote": null
      },
      {
        "id": "y3",
        "orden_id": "o12",
        "orden": 12,
        "presentacion_id": null,
        "marca_id": null,
        "cajas": null,
        "unidades": null,
        "insumo_id": "ins-2",
        "cantidad": 1200,
        "precio_caja": 95,
        "subtotal": 114000,
        "lote": null
      }
    ],
    "listas_precios": [
      {
        "id": "l1",
        "unidad_negocio_id": "u-n",
        "nombre": "Mayoristas",
        "moneda": "ARS",
        "activa": true,
        "es_base": true
      },
      // Sale de Mayoristas con un 10 % (30/09/2026): sus precios sin cono se
      // ven con el recargo y no se editan acá.
      {
        "id": "l2",
        "unidad_negocio_id": "u-n",
        "nombre": "Minoristas",
        "moneda": "ARS",
        "activa": true,
        "base_id": "l1",
        "recargo_pct": 10
      },
      // La lista interna de la fábrica (30/09/2026): la del traspaso.
      {
        "id": "l3",
        "unidad_negocio_id": "u-n",
        "nombre": "Entre fábricas",
        "moneda": "ARS",
        "activa": true,
        "es_interna": true
      }
    ],
    "lista_precios_items": [
      {
        "lista_id": "l1",
        "presentacion_id": "pr1",
        "precio_caja": 2800,
        "vigente_desde": "2026-08-01",
        "cargado_en": "2026-08-01T10:00:00Z"
      },
      {
        "lista_id": "l1",
        "presentacion_id": "pr1",
        "precio_caja": 3000,
        "vigente_desde": "2026-09-01",
        "cargado_en": "2026-09-01T10:00:00Z"
      },
      {
        "lista_id": "l1",
        "presentacion_id": "pr1c",
        "precio_caja": 4000,
        "vigente_desde": "2026-09-01",
        "cargado_en": "2026-09-01T10:00:00Z"
      },
      {
        "lista_id": "l1",
        "presentacion_id": "pr3",
        "precio_caja": 5500,
        "vigente_desde": "2026-09-01",
        "cargado_en": "2026-09-01T10:00:00Z"
      }
    ],
    "cliente_movimientos": [
      { "id": "mov-apagado", "cliente_id": "c-apagado", "tipo": "saldo_inicial", "importe": 12500, "fecha": "2026-09-01", "cargado_en": "2026-09-01T12:00:00Z", "cobranza_id": null },
      {
        "cliente_id": "c1",
        "fecha": "2026-09-01",
        "tipo": "saldo_inicial",
        "importe": 80000,
        "cobranza_id": null,
        "cargado_en": "2026-09-01T12:00:00Z"
      },
      {
        "cliente_id": "c1",
        "fecha": "2026-09-20",
        "tipo": "retiro",
        "importe": 46000,
        "cobranza_id": null,
        "cargado_en": "2026-09-20T12:00:00Z"
      },
      {
        "cliente_id": "c1",
        "fecha": "2026-09-22",
        "tipo": "cobranza",
        "importe": -30000,
        "cobranza_id": "c3333333-3333-4333-8333-333333333333",
        "cargado_en": "2026-09-22T12:00:00Z"
      }
    ],
    "v_empleados_publico": [
      {
        "id": "emp-9",
        "nombre": "Emanuel Romero"
      }
    ],
    // Las facturas de ANATOLIA en las dos fábricas (endosar a un proveedor).
    "facturas_pendientes": [
      { "id": "fp-1", "proveedor_id": "pv1", "unidad_negocio_id": "u-n", "moneda": "ARS", "estado": "pendiente", "numero_comprobante": "0003-00001201", "fecha_factura": "2026-08-20", "created_at": "2026-08-21T10:00:00Z", "saldo_pendiente": 250000 },
      { "id": "fp-2", "proveedor_id": "pv1", "unidad_negocio_id": "u-n", "moneda": "ARS", "estado": "parcial", "numero_comprobante": "0003-00001245", "fecha_factura": "2026-09-05", "created_at": "2026-09-06T10:00:00Z", "saldo_pendiente": 400000 },
      { "id": "fp-3", "proveedor_id": "pv1", "unidad_negocio_id": "u-d", "moneda": "ARS", "estado": "pendiente", "numero_comprobante": "0003-00001300", "fecha_factura": "2026-09-12", "created_at": "2026-09-13T10:00:00Z", "saldo_pendiente": 90000 }
    ],
    "proveedores": [
      {
        "id": "pv1",
        "razon_social": "ANATOLIA SRL",
        "nombre_fantasia": "El Turco",
        "cuit": "30712345678",
        "estado_alta": "activo",
        "activo": true
      },
      {
        "id": "pv2",
        "razon_social": "FERPLAST S.R.L.",
        "cuit": "30708959320",
        "estado_alta": "activo",
        "activo": true
      }
    ],
    "insumos": [
      {
        "id": "ins-1",
        "nombre": "Harina 000",
        "marca": "Molino Cañuelas",
        "unidad_medida": "kg",
        "categoria": "Harinas",
        "activo": true
      },
      {
        "id": "ins-2",
        "nombre": "Caja N°1",
        "marca": "Nuss",
        "unidad_medida": "un",
        "categoria": "Cajas",
        "activo": true
      }
    ],
    "bancos_bcra": [
      {
        "codigo": "007",
        "denominacion": "BANCO DE GALICIA Y BUENOS AIRES S.A."
      },
      {
        "codigo": "011",
        "denominacion": "BANCO DE LA NACION ARGENTINA"
      },
      {
        "codigo": "285",
        "denominacion": "BANCO MACRO S.A."
      }
    ],
    "v_cobranzas": [
      {
        "id": "cob-1",
        "cliente": "Distribuidora Anatolia",
        "estado": "procesada",
        "fecha": "2026-09-10",
        "cargada_por_nombre": "Emanuel Romero",
        "unidad_negocio_id": "u-n",
        "unidad_negocio_nombre": "Cucuruchos Nuss"
      },
      {
        "id": "cob-2",
        "cliente": "Kiosco Pepe",
        "estado": "registrada",
        "fecha": "2026-09-20",
        "cargada_por_nombre": "Franco",
        "unidad_negocio_id": null,
        "unidad_negocio_nombre": null
      },
      {
        "id": "cob-3",
        "cliente": "Heladería Sol",
        "estado": "procesada",
        "fecha": "2026-08-25",
        "cargada_por_nombre": "Emanuel Romero",
        "unidad_negocio_id": "u-d",
        "unidad_negocio_nombre": "Dolce Pasta"
      },
      {
        "id": "a1111111-1111-4111-8111-111111111111",
        "cliente": "Caserato",
        "estado": "registrada",
        "fecha": "2026-09-26",
        "efectivo": 50000,
        "cantidad_cheques": 2,
        "total": 437300.5,
        "moneda": "ARS",
        "observaciones": "Dejó dos cheques y el resto en efectivo.",
        "cargada_por_nombre": "Mariano Chofer",
        "unidad_negocio_id": null,
        "unidad_negocio_nombre": null
      },
      {
        "id": "b2222222-2222-4222-8222-222222222222",
        "cliente": "el de la esquina de la ruta",
        "estado": "registrada",
        "fecha": "2026-09-27",
        "efectivo": 120000,
        "cantidad_cheques": 0,
        "total": 120000,
        "moneda": "ARS",
        "observaciones": null,
        "cargada_por_nombre": "Franco",
        "unidad_negocio_id": null,
        "unidad_negocio_nombre": null
      },
      {
        "id": "c3333333-3333-4333-8333-333333333333",
        "cliente": "Anatolia",
        "estado": "procesada",
        "fecha": "2026-09-22",
        "efectivo": 30000,
        "cantidad_cheques": 0,
        "total": 30000,
        "moneda": "ARS",
        "observaciones": null,
        "cargada_por_nombre": "Mariano Chofer",
        "procesada_por_nombre": "Yanina Godoy",
        "unidad_negocio_id": "u-n",
        "unidad_negocio_nombre": "Cucuruchos Nuss"
      }
    ],
    "cobranza_cheques": [
      {
        "sucursal_codigo": "123",
        "codigo_postal": "5000",
        "dv_ruta": 0,
        "dv_numero": 0,
        "cuenta": "00012345678",
        "dv_cuenta": 0,
        "salida_fecha": null,
        "salida_destino": null,
        "salida_por": null,
        "salida_registrada_en": null,
        "id": "chq-1",
        "cobranza_id": "cob-1",
        "banco_codigo": "007",
        "numero": "66259862",
        "estado": "en_cartera",
        "importe": 387300.5,
        "tipo": "diferido",
        "fecha_emision": "2026-09-01",
        "fecha_pago": "2026-09-28"
      },
      {
        "sucursal_codigo": "123",
        "codigo_postal": "5000",
        "dv_ruta": 0,
        "dv_numero": 0,
        "cuenta": "00012345678",
        "dv_cuenta": 0,
        "salida_fecha": null,
        "salida_destino": null,
        "salida_por": null,
        "salida_registrada_en": null,
        "id": "chq-2",
        "cobranza_id": "cob-1",
        "banco_codigo": "011",
        "numero": "12345678",
        "estado": "en_cartera",
        "importe": 150000,
        "tipo": "comun",
        "fecha_emision": "2026-08-20",
        "fecha_pago": null
      },
      {
        "sucursal_codigo": "123",
        "codigo_postal": "5000",
        "dv_ruta": 0,
        "dv_numero": 0,
        "cuenta": "00012345678",
        "dv_cuenta": 0,
        "salida_fecha": null,
        "salida_destino": null,
        "salida_por": null,
        "salida_registrada_en": null,
        "id": "chq-3",
        "cobranza_id": "cob-2",
        "banco_codigo": "285",
        "numero": "87654321",
        "estado": "en_cartera",
        "importe": 98000,
        "tipo": "diferido",
        "fecha_emision": "2026-09-15",
        "fecha_pago": "2026-11-15"
      },
      {
        "sucursal_codigo": "123",
        "codigo_postal": "5000",
        "dv_ruta": 0,
        "dv_numero": 0,
        "cuenta": "00012345678",
        "dv_cuenta": 0,
        "salida_fecha": "2026-09-02",
        "salida_destino": null,
        "salida_por": "emp-1",
        "salida_registrada_en": "2026-09-02T12:00:00Z",
        "id": "chq-4",
        "cobranza_id": "cob-3",
        "banco_codigo": "007",
        "numero": "11112222",
        "estado": "depositado",
        "importe": 250000,
        "tipo": "diferido",
        "fecha_emision": "2026-08-01",
        "fecha_pago": "2026-09-01"
      },
      {
        "sucursal_codigo": "123",
        "codigo_postal": "5000",
        "dv_ruta": 0,
        "dv_numero": 0,
        "cuenta": "00012345678",
        "dv_cuenta": 0,
        "salida_fecha": "2026-09-05",
        "salida_destino": "Molino Cañuelas",
        "salida_por": "emp-1",
        "salida_registrada_en": "2026-09-05T12:00:00Z",
        "id": "chq-5",
        "cobranza_id": "cob-3",
        "banco_codigo": "011",
        "numero": "33334444",
        "estado": "endosado",
        "importe": 120000,
        "tipo": "comun",
        "fecha_emision": "2026-08-25",
        "fecha_pago": null
      },
      // Endosado A UN PROVEEDOR (29/09/2026): pagó su cuenta corriente.
      {
        "sucursal_codigo": "123",
        "codigo_postal": "5000",
        "dv_ruta": 0,
        "dv_numero": 0,
        "cuenta": "00012345678",
        "dv_cuenta": 0,
        "salida_fecha": "2026-09-22",
        "salida_destino": "ANATOLIA SRL",
        "salida_proveedor_id": "pv1",
        "salida_por": "emp-1",
        "salida_registrada_en": "2026-09-22T12:00:00Z",
        "id": "chq-6",
        "cobranza_id": "cob-1",
        "banco_codigo": "285",
        "numero": "68435161",
        "estado": "endosado",
        "importe": 550000,
        "tipo": "comun",
        "fecha_emision": "2026-09-10",
        "fecha_pago": null
      },
      {
        "id": "chk-a1",
        "cobranza_id": "a1111111-1111-4111-8111-111111111111",
        "foto_id": "foto-a1",
        "banco_codigo": "007",
        "sucursal_codigo": "123",
        "codigo_postal": "5000",
        "dv_ruta": 1,
        "numero": "12345678",
        "dv_numero": 1,
        "cuenta": "00012345678",
        "dv_cuenta": 1,
        "tipo": "diferido",
        "fecha_emision": "2026-09-20",
        "fecha_pago": "2026-10-20",
        "importe": 287300.5,
        "estado": "en_cartera",
        "salida_fecha": null,
        "salida_destino": null,
        "salida_por": null,
        "salida_registrada_en": null
      },
      {
        "id": "chk-a2",
        "cobranza_id": "a1111111-1111-4111-8111-111111111111",
        "foto_id": "foto-a1",
        "banco_codigo": "011",
        "sucursal_codigo": "045",
        "codigo_postal": "5000",
        "dv_ruta": 1,
        "numero": "87654321",
        "dv_numero": 1,
        "cuenta": "00087654321",
        "dv_cuenta": 1,
        "tipo": "comun",
        "fecha_emision": "2026-09-25",
        "fecha_pago": null,
        "importe": 100000,
        "estado": "en_cartera",
        "salida_fecha": null,
        "salida_destino": null,
        "salida_por": null,
        "salida_registrada_en": null
      }
    ],
    "cobranza_fotos": [
      {
        "id": "foto-a1",
        "cobranza_id": "a1111111-1111-4111-8111-111111111111",
        "storage_path": "uid-chofer/a1111111-1111-4111-8111-111111111111/foto-a1.jpg"
      }
    ],
    "cobranzas": [
      {
        "id": "a1111111-1111-4111-8111-111111111111",
        "cliente_id": null
      },
      {
        "id": "b2222222-2222-4222-8222-222222222222",
        "cliente_id": null
      },
      {
        "id": "c3333333-3333-4333-8333-333333333333",
        "cliente_id": "c1"
      }
    ]
  },
  "rpc": {
    // Valorizar (30/09/2026): precio_venta() propone el precio de cada
    // producto. La lista tiene precio solo en la presentación sin cono; con
    // cono suma el conito de la lista. Lo que no está acá no tiene precio.
    "precio_venta": {
      "__segun": [
        { "si": { "p_presentacion_id": "pr1", "p_marca_id": null }, "r": {
          "precio_unitario": 30, "precio_caja": 3000, "unidades_por_caja": 100, "producto_unitario": 30,
          "conito_unitario": 0, "papel_conito": null, "lista": "Mayoristas", "recargo_pct": 0, "sin_precio": false } },
        { "si": { "p_presentacion_id": "pr1c", "p_marca_id": "m1" }, "r": {
          "precio_unitario": 38.5, "precio_caja": 3850, "unidades_por_caja": 100, "producto_unitario": 30,
          "conito_unitario": 8.5, "papel_conito": "comun", "lista": "Mayoristas", "recargo_pct": 0, "sin_precio": false } }
      ],
      "__defecto": { "sin_precio": true, "motivo": "El producto no tiene precio en la lista base." }
    },
    // La grilla completa (30/09/2026): lista_completa() con el sin cono, el
    // con cono (sin cono por unidad + el conito colocado) y los cuatro conitos.
    "lista_completa": {
      "__segun": [
        { "si": { "p_lista_id": "l1" }, "r": {
          "lista": "Mayoristas",
          "productos": [
            { "producto_id": "p1", "producto": "Cucurucho grande", "tipo_masa": "Común", "reventa": false,
              "sin_cono": { "precio_unitario": 30, "precio_caja": 3000, "unidades_por_caja": 100, "producto_unitario": 30, "conito_unitario": 0, "lista": "Mayoristas", "recargo_pct": 0, "sin_precio": false },
              "con_cono": { "precio_unitario": 38.5, "precio_caja": 3850, "unidades_por_caja": 100, "producto_unitario": 30, "conito_unitario": 8.5, "papel_conito": "comun", "lista": "Mayoristas", "recargo_pct": 0, "sin_precio": false } },
            { "producto_id": "p2", "producto": "Cucurucho chico", "tipo_masa": "Común", "reventa": false,
              "sin_cono": { "sin_precio": true, "motivo": "El producto no tiene precio en la lista base." }, "con_cono": null },
            { "producto_id": "p3", "producto": "Cucurucho choco", "tipo_masa": "Chocolate", "reventa": false,
              "sin_cono": { "precio_unitario": 110, "precio_caja": 5500, "unidades_por_caja": 50, "producto_unitario": 110, "conito_unitario": 0, "lista": "Mayoristas", "recargo_pct": 0, "sin_precio": false }, "con_cono": null }
          ],
          "conito": { "comun_suelto": 7.25, "comun_colocado": 8.5, "ilustracion_suelto": 11.5, "ilustracion_colocado": 13 } } },
        { "si": { "p_lista_id": "l2" }, "r": {
          "lista": "Minoristas",
          "productos": [
            { "producto_id": "p1", "producto": "Cucurucho grande", "tipo_masa": "Común", "reventa": false,
              "sin_cono": { "precio_unitario": 33, "precio_caja": 3300, "unidades_por_caja": 100, "producto_unitario": 33, "conito_unitario": 0, "lista": "Minoristas", "recargo_pct": 10, "sin_precio": false },
              "con_cono": { "precio_unitario": 42.35, "precio_caja": 4235, "unidades_por_caja": 100, "producto_unitario": 33, "conito_unitario": 9.35, "papel_conito": "comun", "lista": "Minoristas", "recargo_pct": 10, "sin_precio": false } },
            { "producto_id": "p2", "producto": "Cucurucho chico", "tipo_masa": "Común", "reventa": false,
              "sin_cono": { "sin_precio": true, "motivo": "El producto no tiene precio en la lista base." }, "con_cono": null },
            { "producto_id": "p3", "producto": "Cucurucho choco", "tipo_masa": "Chocolate", "reventa": false,
              "sin_cono": { "precio_unitario": 121, "precio_caja": 6050, "unidades_por_caja": 50, "producto_unitario": 121, "conito_unitario": 0, "lista": "Minoristas", "recargo_pct": 10, "sin_precio": false }, "con_cono": null }
          ],
          "conito": { "comun_suelto": 8, "comun_colocado": 9.35, "ilustracion_suelto": 12.65, "ilustracion_colocado": null } } }
      ],
      "__defecto": "ERROR:No tenés permiso para ver precios."
    },
    // Endosar a un proveedor (29/09/2026): el buscador, con la deuda por fábrica.
    "proveedores_para_endoso": [
      { "id": "pv1", "nombre": "ANATOLIA SRL", "cuit": "30712345678", "deuda": [{ "unidad_id": "u-n", "unidad": "Cucuruchos Nuss", "pendiente": 650000 }, { "unidad_id": "u-d", "unidad": "Dolce Pasta", "pendiente": 90000 }] },
      { "id": "pv2", "nombre": "FERPLAST S.R.L.", "cuit": "30708959320", "deuda": [] }
    ],
    "endosar_cheque_a_proveedor": { "gasto_id": "g-maqueta", "aplicado": 387300.5, "a_favor": 0, "entre_empresas": false },
    // Retiros por revisar (28/09/2026): renglones que salieron sin estar en stock.
    "retiros_por_revisar": [
      { "item_id": "it-1", "orden_id": "o1", "codigo": "N-0042", "fecha": "2026-09-27", "cliente": "Distribuidora Anatolia", "que": "Cucurucho Mini · Caja x 600 · LOLO", "pedidas": 42, "faltante": 5, "unidad": "cajas", "cargada_por": "Emanuel Romero" },
      { "item_id": "it-2", "orden_id": "o12", "codigo": "N-0043", "fecha": "2026-09-28", "cliente": "Kiosco Pepe", "que": "Harina 000 Molino Cañuelas", "pedidas": 250.5, "faltante": 10.5, "unidad": "kg", "cargada_por": "Franco" }
    ],
    "resolver_faltante_retiro": null,
    "mis_unidades_retiro": [
      {
        "id": "u-n",
        "nombre": "Cucuruchos Nuss",
        "prefijo": "N",
        "razon_social": null,
        "cuit": null,
        "domicilio": null,
        "telefono": null,
        "logo_url": "logo-cucuruchos-nuss.png"
      },
      {
        "id": "u-d",
        "nombre": "Dolce Pasta",
        "prefijo": "D",
        "logo_url": "logo-dolce-pasta.png"
      }
    ],
    "registrar_orden_retiro": {
      "orden_id": "o-1",
      "numero": 12,
      "codigo": "N-0012",
      "stock_insuficiente": [
        {
          "renglon": 2,
          "producto": "Cucurucho chico",
          "presentacion": "Caja x 320",
          "pedidas": 10,
          "faltaron": 3
        }
      ]
    },
    "mis_ordenes_retiro": [
      {
        "orden_id": "o-1",
        "codigo": "N-0012",
        "fecha": "2026-09-26",
        "estado": "confirmada",
        "cliente": "Distribuidora Anatolia",
        "transporte": "Expreso Norte",
        "observaciones": "Frágil, no apilar más de 5",
        "cargada_en": "2026-09-26T17:32:00Z",
        "renglones": [
          {
            "orden": 1,
            "tipo": "producto",
            "producto": "Cucurucho grande",
            "presentacion": "Caja x 100",
            "marca": null,
            "cajas": 10,
            "unidades": 1000,
            "lotes": [
              {
                "lote": "7010-2",
                "cajas": 8
              },
              {
                "lote": "7030-1",
                "cajas": 2
              }
            ]
          },
          {
            "orden": 2,
            "tipo": "insumo",
            "insumo": "Harina 000",
            "marca_insumo": "Molino Cañuelas",
            "cantidad": 25.5,
            "unidad_medida": "kg",
            "lotes": [
              {
                "lote": "H-0910",
                "cantidad": 25.5
              }
            ]
          },
          {
            "orden": 3,
            "tipo": "producto",
            "producto": "Cucurucho chico",
            "presentacion": "Caja x 320",
            "marca": null,
            "cajas": 10,
            "unidades": 3200,
            "lotes": [
              {
                "lote": "7031-1",
                "cajas": 7
              },
              {
                "lote": "SIN STOCK",
                "cajas": 3
              }
            ]
          },
          {
            "orden": 4,
            "tipo": "producto",
            "producto": "Cucurucho grande",
            "presentacion": "Caja x 100 con cono",
            "marca": "LOLO",
            "cajas": 4,
            "unidades": 400,
            "lotes": [
              {
                "lote": "7032-1",
                "cajas": 4
              }
            ]
          },
          {
            "orden": 5,
            "tipo": "producto",
            "producto": "Cucurucho choco",
            "presentacion": "Caja x 50",
            "marca": null,
            "cajas": 6,
            "unidades": 300,
            "lotes": [
              {
                "lote": "7033-2",
                "cajas": 6
              }
            ]
          },
          {
            "orden": 6,
            "tipo": "producto",
            "producto": "Cucurucho grande",
            "presentacion": "Caja x 100",
            "marca": null,
            "cajas": 3,
            "unidades": 300,
            "lotes": [
              {
                "lote": "7030-1",
                "cajas": 3
              }
            ]
          },
          {
            "orden": 7,
            "tipo": "producto",
            "producto": "Cucurucho chico",
            "presentacion": "Caja x 320",
            "marca": null,
            "cajas": 2,
            "unidades": 640,
            "lotes": [
              {
                "lote": "7031-1",
                "cajas": 2
              }
            ]
          },
          {
            "orden": 8,
            "tipo": "producto",
            "producto": "Cucurucho grande",
            "presentacion": "Caja x 100 con cono",
            "marca": "CASERATO",
            "cajas": 5,
            "unidades": 500,
            "lotes": [
              {
                "lote": "7034-1",
                "cajas": 5
              }
            ]
          },
          {
            "orden": 9,
            "tipo": "producto",
            "producto": "Cucurucho choco",
            "presentacion": "Caja x 50",
            "marca": null,
            "cajas": 1,
            "unidades": 50,
            "lotes": [
              {
                "lote": "7033-2",
                "cajas": 1
              }
            ]
          },
          {
            "orden": 10,
            "tipo": "producto",
            "producto": "Cucurucho grande",
            "presentacion": "Caja x 100",
            "marca": null,
            "cajas": 7,
            "unidades": 700,
            "lotes": [
              {
                "lote": "7035-1",
                "cajas": 7
              }
            ]
          },
          {
            "orden": 11,
            "tipo": "producto",
            "producto": "Cucurucho chico",
            "presentacion": "Caja x 320",
            "marca": null,
            "cajas": 8,
            "unidades": 2560,
            "lotes": [
              {
                "lote": "7036-1",
                "cajas": 8
              }
            ]
          },
          {
            "orden": 12,
            "tipo": "producto",
            "producto": "Cucurucho grande",
            "presentacion": "Caja x 100 con cono",
            "marca": "LOLO",
            "cajas": 2,
            "unidades": 200,
            "lotes": [
              {
                "lote": "7032-1",
                "cajas": 1
              },
              {
                "lote": "7037-2",
                "cajas": 1
              }
            ]
          },
          {
            "orden": 13,
            "tipo": "producto",
            "producto": "Cucurucho choco",
            "presentacion": "Caja x 50",
            "marca": null,
            "cajas": 9,
            "unidades": 450,
            "lotes": [
              {
                "lote": "7038-1",
                "cajas": 9
              }
            ]
          }
        ]
      }
    ],
    // El cliente completo (30/09/2026): Dolce Pasta tiene su propia cuenta de
    // Anatolia (mismo CUIT) y de Kiosco Pepe (sin CUIT, por el nombre).
    "clientes_con_saldo": { "__segun": [{ "si": { "p_unidad_negocio_id": "u-d" }, "r": [
      { "cliente_id": "c1-d", "nombre": "DIST. ANAT. SRL", "razon_social": "DIST. ANAT. SRL", "cuit": "30-71234567-8", "lista": null, "saldo": 48000,
        "ultimo_movimiento": "2026-09-25", "retiros_mes": 1, "es_tambien_proveedor": false, "activo": true, "codigo_anterior": null },
      { "cliente_id": "c2-d", "nombre": "Kiosco Pepe", "razon_social": null, "cuit": null, "lista": null, "saldo": -2500,
        "retiros_mes": 0, "es_tambien_proveedor": false, "activo": true, "codigo_anterior": null },
      { "cliente_id": "c-dolce", "nombre": "Almacén Rivadavia", "razon_social": "RIVADAVIA SRL", "cuit": null, "lista": null, "saldo": 9000,
        "retiros_mes": 2, "es_tambien_proveedor": false, "activo": true, "codigo_anterior": null }
    ] }], "__defecto": [
      {
        "cliente_id": "c1",
        "nombre": "Distribuidora Anatolia",
        "razon_social": "ANATOLIA SRL",
        "cuit": "30712345678",
        "lista": "Mayoristas",
        "saldo": 126000,
        "ultimo_movimiento": "2026-09-20",
        "retiros_mes": 3,
        "es_tambien_proveedor": true,
        "activo": true,
        "codigo_anterior": 101
      },
      {
        "cliente_id": "c2",
        "nombre": "Kiosco Pepe",
        "razon_social": null,
        "cuit": null,
        "lista": null,
        "saldo": 0,
        "retiros_mes": 0,
        "es_tambien_proveedor": false,
        "activo": true,
        "codigo_anterior": null
      },
      // El apagado (29/09/2026): la maqueta contesta lo mismo con y sin
      // p_incluir_apagados; la pantalla separa por 'activo'.
      { "cliente_id": "c-apagado", "nombre": "Kiosco Cerrado", "razon_social": null, "cuit": null, "lista": "Mayoristas", "saldo": 749.5,
        "ultimo_movimiento": "2026-08-30", "retiros_mes": 1, "es_tambien_proveedor": false, "activo": false, "codigo_anterior": 55 }
    ] },
    "cambiar_activo_cliente": null,
    "cuenta_cliente": [
      {
        "fecha": "2026-09-01",
        "tipo": "saldo_inicial",
        "detalle": "Deuda de agosto",
        "importe": 80000,
        "saldo": 80000,
        "orden_retiro_id": null
      },
      {
        "fecha": "2026-09-20",
        "tipo": "retiro",
        "detalle": "Orden de retiro N° 12",
        "importe": 46000,
        "saldo": 126000,
        "orden_retiro_id": "o1"
      },
      {
        "fecha": "2026-09-22",
        "tipo": "cobranza",
        "detalle": "Cobranza del 22/09/2026",
        "importe": -30000,
        "saldo": 96000,
        "orden_retiro_id": null
      }
    ],
    "cobranzas_por_asentar": [
      {
        "cobranza_id": "a1111111-1111-4111-8111-111111111111",
        "fecha": "2026-09-26",
        "cliente_escrito": "Caserato",
        "cargada_por": "Mariano Chofer",
        "efectivo": 50000,
        "cheques": 2,
        "total": 437300.5,
        "moneda": "ARS",
        "observaciones": "Dejó dos cheques y el resto en efectivo.",
        "sugeridos": [
          {
            "cliente_id": "c1",
            "nombre": "Distribuidora Anatolia",
            "empresa": "Cucuruchos Nuss"
          }
        ]
      },
      {
        "cobranza_id": "b2222222-2222-4222-8222-222222222222",
        "fecha": "2026-09-27",
        "cliente_escrito": "el de la esquina de la ruta",
        "cargada_por": "Franco",
        "efectivo": 120000,
        "cheques": 0,
        "total": 120000,
        "moneda": "ARS",
        "observaciones": null,
        "sugeridos": []
      },
      // El chofer escribió "JyM" (29/09/2026): cuatro sugeridos, ya ordenados
      // por parecido; los tres primeros van como botones y el cuarto de lista
      // inicial del buscador. J&M está en las dos empresas: se elige cuál.
      {
        "cobranza_id": "c3333333-3333-4333-8333-333333333333",
        "fecha": "2026-09-28",
        "cliente_escrito": "JyM",
        "cargada_por": "Mariano Chofer",
        "efectivo": 80000,
        "cheques": 0,
        "total": 80000,
        "moneda": "ARS",
        "observaciones": null,
        "sugeridos": [
          { "cliente_id": "c-jm-n", "nombre": "J&M DISTRIBUCIONES Y SERVICI", "empresa": "Cucuruchos Nuss", "veces": 3 },
          { "cliente_id": "c-jm-d", "nombre": "J&M DISTRIBUCIONES Y SERVICI", "empresa": "Dolce Pasta", "veces": 1 },
          { "cliente_id": "c-jmv", "nombre": "JM Viandas", "empresa": "Cucuruchos Nuss", "veces": 0 },
          { "cliente_id": "c-juanma", "nombre": "Juan Manuel Kiosco", "empresa": "Dolce Pasta", "veces": 0 }
        ]
      }
    ],
    // buscar_clientes (29/09/2026), sin fábrica (p_unidad_negocio_id null):
    // cada resultado con su empresa y su saldo. Lo que no está acá no coincide.
    "buscar_clientes": {
      "__segun": [
        { "si": { "p_busqueda": "JyM" }, "r": [
          { "cliente_id": "c-jm-n", "nombre": "J&M DISTRIBUCIONES Y SERVICI", "razon_social": "J&M DISTRIBUCIONES Y SERVICI", "cuit": "30711111112",
            "localidad": "Córdoba", "empresa": "Cucuruchos Nuss", "unidad_negocio_id": "u-n", "activo": true, "saldo": 185000, "parecido": 0.9 },
          { "cliente_id": "c-jm-d", "nombre": "J&M DISTRIBUCIONES Y SERVICI", "razon_social": "J&M DISTRIBUCIONES Y SERVICI", "cuit": "30711111112",
            "localidad": "Córdoba", "empresa": "Dolce Pasta", "unidad_negocio_id": "u-d", "activo": true, "saldo": -12500, "parecido": 0.9 },
          { "cliente_id": "c-jmv", "nombre": "JM Viandas", "razon_social": null, "cuit": null,
            "localidad": null, "empresa": "Cucuruchos Nuss", "unidad_negocio_id": "u-n", "activo": true, "saldo": 0, "parecido": 0.9 }
        ] },
        { "si": { "p_busqueda": "pepe de la" }, "r": [
          { "cliente_id": "c2", "nombre": "Kiosco Pepe", "razon_social": null, "cuit": null,
            "localidad": null, "empresa": "Cucuruchos Nuss", "unidad_negocio_id": "u-n", "activo": true, "saldo": 42000, "parecido": 0.4 }
        ] }
      ],
      "__defecto": []
    },
    "asentar_cobranza": {
      "importe": 437300.5,
      "saldo_cliente": -311300.5
    },
    "reabrir_cobranza": null
  },
  "uid": "uid-maqueta"
};
