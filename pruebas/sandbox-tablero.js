// El sandbox del tablero de resúmenes (js/tablero.js, 29/09/2026): arma, con
// el código REAL, todas las funciones puras del tablero y lo que importan
// (js/modulos.js, js/utils.js, js/barra-unidad.js, js/barra-lateral.js,
// js/preferencias.js), para ejecutarlas en las suites con datos falsos.
//
// Se parte de dashboard.html y extraer.js sigue sus imports (imports.js): así
// una mutación de js/tablero.js llega por ARCHIVO_JS_TABLERO.
//
//   ARCHIVO_TEST        otra copia de dashboard.html
//   ARCHIVO_JS_TABLERO  otra copia de js/tablero.js (la usa el runner de mutaciones)
'use strict'

const fs = require('fs')
const path = require('path')
const { extraerFn, extraerConst } = require('./extraer')

const RUTA = process.env.ARCHIVO_TEST || path.join(__dirname, '..', 'dashboard.html')

// De los módulos que importa el tablero.
const IMPORTADAS_CONST = ['MODULOS', 'PALETA_MODULO', 'ICONOS', 'TAMANOS', 'ORDENES_BARRA', 'DIAS_USO']
const IMPORTADAS_FN = ['moduloVisible', 'colorDeModulo', 'htmlIcono', 'formatearNumeroAr', 'sinPersonasDePrueba', 'pasaFiltroUnidad',
  'nombreDePila', 'prefsVacias', 'normalizarPrefs', 'ordenarBarra', 'vecesUsado', 'enOrdenDeBarra', 'modulosDeBarra']
// Del tablero.
const CONSTANTES = ['ORDEN_TABLERO', 'TAMANOS_POR_DEFECTO', 'SEGURIDAD_TABLERO', 'NOMBRE_TARJETA', 'MS_DIA', 'DIAS_SEMANA', 'MESES_TABLERO',
  'RESOLVER_PENDIENTES', 'PRIORIDAD_FRANJA', 'TOPE_FILAS', 'FLECHA_DER', 'MANIJA', 'OJO_TACHADO', 'VOLVER', 'NOMBRE_TAMANO',
  'NOMBRE_ORDEN_BARRA', 'ORDEN_BARRA', 'SEGURIDAD']
const FUNCIONES = ['escTab', 'tarjetasPosibles', 'tamanoDe', 'tarjetasOrdenadas', 'conTamano', 'conOculta', 'conOrden', 'moverClave',
  'prefsDeFabrica', 'relojAr', 'hoyAr', 'horaAr', 'sumarDias', 'diaSemana', 'lunesDe', 'primeroDelMes', 'diasEntre', 'nombreMes', 'saludo',
  'esNumero', 'num', 'plata', 'entero', 'plural', 'mapaPendientes', 'resolverDePendientes', 'usaPendientes', 'itemsFranja', 'avisoParcial',
  'nombreUnidad', 'sinPermisoEn', 'consulta', 'cargarGastos', 'cargarCaja', 'cargarCobranzas', 'plazoCheque', 'cargarCheques',
  'cargarCuentasCorrientes', 'cargarIngreso', 'cargarStock', 'cargarProduccion', 'cargarPedidos', 'cargarRetiros', 'cargarAdministracion',
  'cargarTaller', 'cargarAccesos', 'cargarEmpleados', 'cargarSeguridad', 'cargarTarjeta', 'htmlTono', 'htmlCtx', 'htmlMaquinas',
  'htmlTendencia', 'htmlCuerpo', 'htmlPie', 'htmlTarjeta', 'htmlFranja', 'htmlEscondidas', 'htmlPersonalizar', 'unidadesPermitidas',
  'refrescarTarjeta']

function fuente() { return fs.readFileSync(RUTA, 'utf8') }

// Todas las funciones del tablero, vivas. `consola` junta lo que se loguea.
function construir() {
  const src = fuente()
  let codigo = 'var __log = []\nvar console = { error: (...a) => __log.push(a.map(String).join(" ")), warn() {}, log() {} }\n'
  for (const c of IMPORTADAS_CONST) codigo += extraerConst(src, c) + '\n'
  for (const f of IMPORTADAS_FN) codigo += extraerFn(src, f) + '\n'
  for (const c of CONSTANTES) codigo += extraerConst(src, c) + '\n'
  for (const f of FUNCIONES) codigo += extraerFn(src, f) + '\n'
  codigo += extraerConst(src, 'CARGADORES') + '\n'
  codigo += `return { ${[...IMPORTADAS_CONST, ...CONSTANTES, 'CARGADORES', ...IMPORTADAS_FN, ...FUNCIONES].join(', ')}, __log }`
  return new Function(codigo)()
}

// Un Supabase falso: tablas (un Error = la consulta falla; 'ESPERAR' = no
// responde nunca) y rpc (un valor, una función de los parámetros, o un Error).
// Anota cada llamada en `llamadas`.
function sbFalso({ tablas = {}, rpc = {} } = {}) {
  const llamadas = []
  function from(tabla) {
    const filtros = []
    const q = {
      select(cols) { llamadas.push(['select', tabla, cols]); return q },
      eq(a, b) { filtros.push(r => r[a] === b); llamadas.push(['eq', tabla, a, b]); return q },
      neq(a, b) { filtros.push(r => r[a] !== b); return q },
      in(a, b) { filtros.push(r => b.includes(r[a])); return q },
      gte(a, b) { filtros.push(r => r[a] >= b); llamadas.push(['gte', tabla, a, b]); return q },
      lte(a, b) { filtros.push(r => r[a] <= b); llamadas.push(['lte', tabla, a, b]); return q },
      limit(n) { llamadas.push(['limit', tabla, n]); return q },
      order() { return q },
      then(res, rej) {
        const v = tablas[tabla]
        if (v === 'ESPERAR') return new Promise(() => {})
        if (v instanceof Error) return Promise.resolve({ data: null, error: v }).then(res, rej)
        const filas = (v || []).filter(r => filtros.every(f => f(r)))
        return Promise.resolve({ data: filas, error: null }).then(res, rej)
      },
    }
    return q
  }
  return {
    llamadas,
    from,
    rpc(nombre, params) {
      llamadas.push(['rpc', nombre, params])
      let v = rpc[nombre]
      if (typeof v === 'function') v = v(params)
      if (v === 'ESPERAR') return new Promise(() => {})
      if (v instanceof Error) return Promise.resolve({ data: null, error: v })
      return Promise.resolve({ data: v === undefined ? null : v, error: null })
    },
  }
}

// El contexto de un cargador, con lo mínimo y lo que se pise.
function ctxFalso(S, extra = {}) {
  const tareas = extra.tareas ?? new Set()
  const unidades = extra.unidades ?? [{ id: 'u-n', nombre: 'Cucuruchos Nuss', prefijo: 'N' }, { id: 'u-d', nombre: 'Dolce Pasta', prefijo: 'D' }]
  const ahora = extra.ahora ?? new Date('2026-09-28T13:30:00.000Z')
  const esSuperAdmin = extra.esSuperAdmin ?? false
  const elegida = extra.elegida ?? null
  const alcances = extra.alcances ?? new Map()
  return {
    sb: extra.sb, yo: extra.yo ?? { id: 'emp-yo' }, esSuperAdmin,
    tieneTarea: t => esSuperAdmin || tareas.has(t),
    elegida, unidades, ahora, hoy: S.hoyAr(ahora),
    unidadesDe: ts => S.unidadesPermitidas({ tareas: ts, esSuperAdmin, alcances, todas: unidades.map(u => u.id), elegida }),
    pend: extra.pend ?? Promise.resolve(new Map()),
    visibles: extra.visibles ?? new Set(),
    fabrica: extra.fabrica ?? { ok: false, unidades: new Set(), personas: new Set(), soyDePrueba: false },
  }
}

module.exports = { construir, sbFalso, ctxFalso, fuente, RUTA }
