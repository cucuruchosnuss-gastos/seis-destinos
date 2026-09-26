// Mutaciones de test-cheques-cargo.js (Parte 4). Ver mutar.js.
//
//   node pruebas/mut-cheques-cargo.js

const path = require('path')
const { correrMutaciones } = require('./mutar')
// La cartera vive en una región de administracion.html: se muta SOLO ahí.
const { ARCHIVO_CHEQUES, limitesCheques } = require('./fuente-cheques')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  region: limitesCheques,
  suite: path.join(__dirname, 'test-cheques-cargo.js'),
  original: process.env.ARCHIVO_BASE || ARCHIVO_CHEQUES,
  escape: 'esc',
  funciones: [],
  manuales: [
    { nombre: 'el nombre sin escapar en la celda',
      de: '">${esc(cob?.cargada_por_nombre ?? \'—\')}</td>', a: '">${cob?.cargada_por_nombre ?? \'—\'}</td>' },
    { nombre: 'el nombre sin escapar en el title',
      de: 'title="${esc(cob?.cargada_por_nombre ?? \'\')}"', a: 'title="${cob?.cargada_por_nombre ?? \'\'}"' },
    { nombre: 'sin nombre muestra "null"',
      de: "esc(cob?.cargada_por_nombre ?? '—')", a: "esc(String(cob?.cargada_por_nombre))" },
    { nombre: 'la columna no se puede ordenar',
      de: "            ${htmlEncabezadoOrden('cargo', 'Cargó')}", a: '            <th scope="col">Cargó</th>' },
    { nombre: 'ordenar por cargó no mira el nombre',
      de: "        case 'cargo': return cob?.cargada_por_nombre ? String(cob.cargada_por_nombre) : null\n", a: '' },
    { nombre: 'la consulta vuelve a la tabla cobranzas (sin el nombre)',
      de: "supabase.from('v_cobranzas').select('id, cliente, estado, fecha, cargada_por_nombre, unidad_negocio_id, unidad_negocio_nombre')", a: "supabase.from('cobranzas').select('id, cliente, estado, fecha')" },
    { nombre: 'Cargó no está en el selector del celular',
      de: "      { id: 'cargo', nombre: 'Cargó', tipo: 'texto' },\n", a: '' },
  ],
})
