// Datos de la maqueta y de las pruebas: produccion-gestion (ver pruebas/datos-maqueta/README.md).
// Se generan a e2e/maqueta/datos/produccion-gestion.json con `npm run maqueta:datos`.
'use strict';

// LAS PLANILLAS CERRADAS DE v_turno_metricas (04/10/2026), para los
// indicadores de las máquinas: del 07/09 al 02/10/2026, lunes a viernes, dos
// máquinas y dos turnos (Mañana 6–15, Tarde 15–23:36). Los números salen de
// una cuenta fija (no al azar), así la maqueta es siempre igual. Con sus
// paradas en paradas_produccion, coherentes con los minutos de la vista.
function metricasYParadas() {
  const filas = [], paradas = []
  const HORARIO = { 'Mañana': ['06:00', '15:00', 540], 'Tarde': ['15:00', '23:36', 516] }
  const ts = (fecha, hhmm, mas = 0) => {
    const d = new Date(`${fecha}T${hhmm}:00-03:00`)
    d.setUTCMinutes(d.getUTCMinutes() + mas)
    return d.toISOString().replace('.000Z', '+00:00')
  }
  let n = 0
  for (let d = new Date('2026-09-07T12:00:00Z'); d <= new Date('2026-10-02T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
    if ([0, 6].includes(d.getUTCDay())) continue
    const fecha = d.toISOString().slice(0, 10)
    for (const [maq, nombre, orden] of [['maq-1', 'Máquina 1', 1], ['maq-2', 'Máquina 2', 2]]) {
      for (const turno of ['Mañana', 'Tarde']) {
        n++
        const [ini, fin, minTurno] = HORARIO[turno]
        const arranque = 15 + (n * 7) % 30
        const minReal = minTurno - arranque
        const parada = n % 3 === 0 ? 25 + (n * 11) % 50 : 0
        // Desde el 05/10/2026 hay paradas organizativas (se retiró personal,
        // falta masa) y, desde el 28/09, la hora de "empezó a producir":
        // minutos_arranque (de la hora del turno a la largada) es una parte del
        // horario fuera, y lo que sobra es el cierre.
        const cat = n % 4 === 0 ? 'organizativa' : n % 2 === 0 ? 'falla' : 'programada'
        const conLargada = fecha >= '2026-09-28'
        const minProd = minReal - parada
        const ritmo = (maq === 'maq-1' ? 1300 : 980) + ((n * 37) % 160) - 80
        const unidades = Math.round(ritmo * minProd / 60 / 100) * 100
        const id = `tm-${n}`
        filas.push({
          turno_id: id, unidad_negocio_id: 'u-n', maquina_id: maq, maquina: nombre, maquina_orden: orden,
          fecha, turno, lote: 6900 + n, unidades, cajas: Math.round(unidades / 320), scrap_kg: 2 + (n % 5),
          inicio_turno: ts(fecha, ini), fin_turno: ts(fecha, ini, minTurno), inicio_real: ts(fecha, ini), fin_real: ts(fecha, ini, minReal),
          minutos_turno: minTurno, minutos_real: minReal, minutos_parada_en_marcha: parada, minutos_parada_total: parada,
          minutos_productivos: minProd, parada_por_categoria: parada ? { [cat]: parada } : {},
          u_h_productiva: Math.round(unidades / (minProd / 60)), u_h_turno: Math.round(unidades / (minTurno / 60)),
          minutos_arranque: conLargada ? Math.max(0, arranque - 5) : null, tiene_largada: conLargada,
        })
        if (parada) {
          const motivo = cat === 'falla' ? ['Se cortó la masa', 'Falla del molde', 'Se trabó la cinta'][n % 3] : cat === 'organizativa' ? 'Se retiró personal' : 'Limpieza'
          paradas.push({ turno_id: id, inicio: ts(fecha, ini, 120), fin: ts(fecha, ini, 120 + parada), motivo, categoria: cat })
        }
      }
    }
  }
  return { filas, paradas }
}
const METRICAS = metricasYParadas()

module.exports = {
  "uid": "uid-maqueta",
  "tablas": {
    "empleados": [
      {
        "id": "emp-1",
        "auth_user_id": "uid-maqueta",
        "nombre": "Facu Maqueta",
        "rol_app": "usuario",
        "activo": true,
        "unidad_negocio_id": "u-n",
        "es_prueba": false,
        "es_dispositivo": false
      }
    ],
    // Los módulos habilitados: la barra lateral los lee (27/09/2026).
    "empleado_modulos": [
      { "empleado_id": "emp-1", "modulo": "produccion", "habilitado": true },
      { "empleado_id": "emp-1", "modulo": "stock", "habilitado": true }
    ],
    "empleado_tareas": [
      {
        "empleado_id": "emp-1",
        "modulo": "produccion",
        "tarea": "ver",
        "alcance": {
          "todas": true
        },
        "habilitado": true
      },
      {
        "empleado_id": "emp-1",
        "modulo": "produccion",
        "tarea": "configurar",
        "alcance": {
          "todas": true
        },
        "habilitado": true
      }
    ],
    "unidades_negocio": [
      {
        "id": "u-n",
        "nombre": "Cucuruchos Nuss",
        "activo": true,
        "es_prueba": false
      },
      {
        "id": "u-d",
        "nombre": "Dolce Pasta",
        "activo": true,
        "es_prueba": false
      }
    ],
    "v_empleados_publico": [
      {
        "id": "emp-1",
        "nombre": "Facu Maqueta",
        "unidad_negocio_id": "u-n",
        "tipo": "naaloo",
        "activo": true
      },
      {
        "id": "emp-2",
        "nombre": "Federico Silva",
        "unidad_negocio_id": "u-n",
        "tipo": "naaloo",
        "activo": true
      }
    ],
    "maquinas": [
      {
        "id": "maq-1",
        "unidad_negocio_id": "u-n",
        "nombre": "Máquina 1",
        "activa": true,
        "orden": 1
      },
      {
        "id": "maq-2",
        "unidad_negocio_id": "u-n",
        "nombre": "Máquina 2",
        "activa": true,
        "orden": 2
      }
    ],
    "v_turno_metricas": METRICAS.filas,
    "paradas_produccion": METRICAS.paradas,
    "turnos_produccion": [
      {
        "id": "t1",
        "lote": 7021,
        "maquina_id": "maq-1",
        "unidad_negocio_id": "u-n",
        "fecha": "2026-09-25",
        "turno": "Mañana",
        "encargado_id": "emp-2",
        "estado": "cerrado",
        "abierto_en": "2026-09-25T09:00:00Z",
        "cerrado_en": "2026-09-25T17:00:00Z",
        "hora_inicio": "06:00",
        "hora_apagado": "14:00",
        "scrap_kg": 3,
        "observaciones": null
      }
    ],
    "marcas_personalizadas": [
      {
        "id": "m1",
        "nombre": "LOLO",
        "activa": true,
        "estado_alta": "aprobada",
        "creada_por": null,
        "creada_en": null,
        "doble_bolsa": false
      },
      {
        "id": "m2",
        "nombre": "CASERATO",
        "activa": true,
        "estado_alta": "pendiente_revision",
        "creada_por": "emp-2",
        "creada_en": "2026-09-24T10:00:00Z",
        "doble_bolsa": false
      }
    ],
    "productos_terminados": [
      {
        "id": "p1",
        "unidad_negocio_id": "u-n",
        "nombre": "Mini",
        "tipo_masa": "Común",
        "activo": true,
        "orden": 1
      },
      {
        "id": "p2",
        "unidad_negocio_id": "u-n",
        "nombre": "Cono dulce",
        "tipo_masa": "Común",
        "activo": true,
        "orden": 2,
        "origen_producto_id": "p-d1"
      },
      {
        "id": "p-d1",
        "unidad_negocio_id": "u-d",
        "nombre": "Cono dulce",
        "tipo_masa": "Común",
        "activo": true,
        "orden": 1
      }
    ],
    "stock_terminado_movimientos": [
      {
        "unidad_negocio_id": "u-n",
        "presentacion_id": "pr1",
        "marca_id": null,
        "lote": "7021-1",
        "cajas": 40,
        "unidades": 24000,
        "tipo": "produccion",
        "orden_retiro_id": null,
        "fecha": "2026-09-24",
        "motivo": null,
        "created_at": "2026-09-24T15:00:00Z"
      },
      {
        "unidad_negocio_id": "u-n",
        "presentacion_id": "pr1",
        "marca_id": null,
        "lote": "7021-1",
        "cajas": -5,
        "unidades": -3000,
        "tipo": "traspaso_salida",
        "orden_retiro_id": null,
        "fecha": "2026-09-25",
        "motivo": "Traspaso a otra fábrica",
        "created_at": "2026-09-25T10:00:00Z"
      },
      {
        "unidad_negocio_id": "u-n",
        "presentacion_id": "pr2",
        "marca_id": null,
        "lote": "D-120-1",
        "cajas": 12,
        "unidades": 1200,
        "tipo": "traspaso_entrada",
        "orden_retiro_id": null,
        "fecha": "2026-09-25",
        "motivo": "Traspaso desde otra fábrica",
        "created_at": "2026-09-25T11:00:00Z"
      }
    ],
    "producto_presentaciones": [
      {
        "id": "pr1",
        "producto_id": "p1",
        "nombre": "Caja x 600",
        "con_cono": false,
        "media_caja": false,
        "empaque": null,
        "unidades_por_caja": 600,
        "activa": true,
        "orden": 1
      },
      {
        "id": "pr2",
        "producto_id": "p2",
        "nombre": "Caja x 100",
        "con_cono": false,
        "media_caja": false,
        "empaque": null,
        "unidades_por_caja": 100,
        "activa": true,
        "orden": 1
      }
    ]
  },
  "rpc": {
    "mi_sesion_produccion": {
      "empleado_id": "emp-1",
      "nombre": "Facu Maqueta",
      "es_dispositivo": false,
      "unidad_negocio_id": "u-n"
    },
    "indicadores_produccion": {
      "fecha": "2026-09-25",
      "ahora": [
        {
          "maquina": "Máquina 1",
          "lote": 7021,
          "turno": "Mañana",
          "estado": "abierto",
          "encargado": "Federico Silva",
          "abierto_en": "2026-09-25T09:00:00Z",
          "masas": 4,
          "cajas": 120,
          "parada_en_curso": null
        },
        {
          "maquina": "Máquina 2",
          "lote": 7022,
          "turno": "Mañana",
          "estado": "abierto",
          "encargado": "Agustín Barrera",
          "abierto_en": "2026-09-25T09:00:00Z",
          "masas": 1,
          "cajas": 1,
          "parada_en_curso": {
            "motivo": "Se trabó la cinta",
            "desde": "2026-09-25T13:00:00Z"
          }
        }
      ],
      "cajas_por_producto": [
        {
          "producto": "Mini",
          "hoy": 50,
          "semana_pasada": 48
        },
        {
          "producto": "Chico",
          "hoy": 10,
          "semana_pasada": 11
        },
        {
          "producto": "Vaso",
          "hoy": null,
          "semana_pasada": 3
        }
      ],
      "semana": {
        "desde": "2026-09-19",
        "hasta": "2026-09-25",
        "turnos": 12,
        "cajas": 1500,
        "unidades": 480000,
        "masas": 80,
        "masas_modificadas": 6,
        "masas_chocolate": 9,
        "scrap_kg": 25,
        "masa_kg": 2000,
        "minutos_parada": 135,
        "motivo_parada_mas_comun": "Se trabó la cinta"
      },
      "rendimiento_harina": [
        {
          "producto": "Mini",
          "lote": "H-10",
          "kg_harina": 500,
          "unidades": 150000,
          "unidades_por_kg": 300,
          "promedio_del_producto": 286.7,
          "diferencia_pct": 4.6
        },
        {
          "producto": "Mini",
          "lote": "H-11",
          "kg_harina": 250,
          "unidades": 60000,
          "unidades_por_kg": 240,
          "promedio_del_producto": 286.7,
          "diferencia_pct": -16.3
        }
      ],
      "scrap_por_lote": [
        {
          "lote": "H-10",
          "scrap_pct": 12.4
        },
        {
          "lote": "H-11",
          "scrap_pct": null
        }
      ],
      "pendientes": {
        "planillas_por_completar": 1,
        "turnos_abiertos_de_otro_dia": 0,
        "conos_por_revisar": 2
      }
    },
    "mis_pendientes": [
      {
        "modulo": "produccion",
        "clave": "conos_por_revisar",
        "cantidad": 2,
        "texto": "Conos nuevos por revisar"
      }
    ],
    "personal_produccion": [
      {
        "id": "emp-2",
        "nombre": "Federico Silva",
        "misma_unidad": true,
        "puestos": [
          "encargado",
          "operario"
        ],
        "tiene_pin": true,
        "pin_temporal": false,
        "debe_cambiar_pin": false,
        "es_maestro": false
      },
      {
        "id": "emp-3",
        "nombre": "Agustín Barrera",
        "misma_unidad": true,
        "puestos": [
          "masero"
        ],
        "tiene_pin": false,
        "pin_temporal": false,
        "debe_cambiar_pin": false,
        "es_maestro": false
      }
    ]
  }
};
