// Mutaciones de test-stock-fabrica-pruebas.js. Ver mutar.js (los tres guards:
// suite verde sobre el limpio, ancla única, mutación que cambia algo). Corren
// de a una. Cada una SACA un filtro de la fábrica de pruebas (o rompe su
// cableado) y la suite tiene que ponerse en ROJO.
//
//   node pruebas/mut-stock-fabrica-pruebas.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-stock-fabrica-pruebas.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/stock.html'),
  funciones: [],
  manuales: [
    { nombre: 'unidades de stock sin filtrar',
      de: 'estado.unidadesStock = sinUnidadesDePrueba(unidades.data ?? [], estado.fabrica)',
      a: 'estado.unidadesStock = unidades.data ?? []' },
    { nombre: 'filas de stock sin filtrar',
      de: 'estado.stock = sinUnidadesDePrueba(filas.data ?? [], estado.fabrica, f => f?.unidad_negocio_id)',
      a: 'estado.stock = filas.data ?? []' },
    { nombre: 'filas de stock filtradas por la clave equivocada (id)',
      de: 'estado.stock = sinUnidadesDePrueba(filas.data ?? [], estado.fabrica, f => f?.unidad_negocio_id)',
      a: 'estado.stock = sinUnidadesDePrueba(filas.data ?? [], estado.fabrica)' },
    { nombre: 'unidades de ajuste (recuento) sin filtrar',
      de: 'estado.unidadesAjuste = sinUnidadesDePrueba(data ?? [], estado.fabrica)',
      a: 'estado.unidadesAjuste = data ?? []' },
    { nombre: 'historial de recuentos sin filtrar',
      de: 'estado.recuentos = sinUnidadesDePrueba(data ?? [], estado.fabrica, r => r?.unidad_negocio_id)',
      a: 'estado.recuentos = data ?? []' },
    { nombre: 'mermas sin filtrar',
      de: 'estado.mermas = sinUnidadesDePrueba(data ?? [], estado.fabrica, m => m?.unidad_negocio_id)',
      a: 'estado.mermas = data ?? []' },
    { nombre: 'unidades de baja sin filtrar',
      de: 'estado.unidadesBaja = sinUnidadesDePrueba(data ?? [], estado.fabrica)',
      a: 'estado.unidadesBaja = data ?? []' },
    { nombre: 'unidades de envío sin filtrar',
      de: 'estado.unidadesEnvio = sinUnidadesDePrueba(data ?? [], estado.fabrica)',
      a: 'estado.unidadesEnvio = data ?? []' },
    { nombre: 'destinos de transferencia sin filtrar',
      de: 'estado.destinos = sinUnidadesDePrueba(data ?? [], estado.fabrica)',
      a: 'estado.destinos = data ?? []' },
    { nombre: 'tránsito sin filtrar',
      de: 'estado.transito = sinPrueba(transito.data ?? []).filter(x =>',
      a: 'estado.transito = (transito.data ?? []).filter(x =>' },
    { nombre: 'historial de transferencias sin filtrar',
      de: 'estado.transferencias = sinPrueba(hist.data ?? [])',
      a: 'estado.transferencias = hist.data ?? []' },
    { nombre: 'transferencias: sin el filtro por ORIGEN',
      de: '        sinUnidadesDePrueba(xs, estado.fabrica, x => x?.unidad_origen_id),',
      a: '        xs,' },
    { nombre: 'transferencias: sin el filtro por DESTINO',
      de: '        estado.fabrica, x => x?.unidad_destino_id)',
      a: '        estado.fabrica, x => x?.unidad_origen_id)' },
    { nombre: 'v_transferencias no trae las unidades (el filtro no tiene con qué)',
      de: ".select('id, estado, fecha, unidad_origen_id, origen_nombre, unidad_destino_id, destino_nombre,",
      a: ".select('id, estado, fecha, origen_nombre, destino_nombre," },
    { nombre: 'init no carga la fábrica',
      de: '      const fabricaP = cargarFabricaDePruebas(supabase)\n',
      a: '      const fabricaP = Promise.resolve(FABRICA_SIN_DATOS)\n' },
    { nombre: 'init no la guarda en el estado',
      de: '      estado.fabrica = await fabricaP\n',
      a: '      await fabricaP\n' },
  ],
})
