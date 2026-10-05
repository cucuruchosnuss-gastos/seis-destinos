// Mutaciones de test-clientes-apodos.js: Administración (la ficha), Órdenes de
// retiro y Cobranzas. Ver mutar.js (los tres guards). Corren de a una.
//
//   node pruebas/mut-clientes-apodos.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-clientes-apodos.js')

const tandas = [
  {
    suite: SUITE, variable: 'ARCHIVO_TEST', escape: 'esc',
    original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/administracion.html'),
    funciones: ['htmlApodosFicha'],
    equivalentes: [{ expr: 'esc(i)', motivo: 'el índice del apodo en la lista: un número' }],
    manuales: [
      { nombre: 'ficha: no lee los apodos', de: "'id, nombre, apodos, razon_social,", a: "'id, nombre, razon_social," },
      { nombre: 'ficha: repetido se agrega', de: "      if (lista.some(a => normalizar(a) === normalizar(t))) return { apodos: lista, error: `«${t}» ya está en la lista.` }\n", a: '' },
      { nombre: 'ficha: vacío se agrega', de: "      if (!t) return { apodos: lista, error: 'Escribí el apodo antes de agregarlo.' }\n", a: '' },
      { nombre: 'ficha: sin tope de largo', de: "      if (t.length > 60) return { apodos: lista, error: 'El apodo es muy largo: hasta 60 letras.' }\n", a: '' },
      { nombre: 'ficha: no relee la fila (manda lo de cuando se abrió)',
        de: "        const { data: fila, error: errLeer } = await supabase.from('clientes')\n          .select('id, unidad_negocio_id, nombre, localidad, telefono, observaciones, activo').eq('id', f.id).maybeSingle()\n        if (errLeer) throw errLeer",
        a: '        const fila = f.original, errLeer = null' },
      { nombre: 'ficha: el teléfono no viaja (lo borraría)', de: 'p_telefono: fila.telefono ?? null,', a: 'p_telefono: null,' },
      { nombre: 'ficha: las observaciones no viajan', de: 'p_observaciones: fila.observaciones ?? null,', a: 'p_observaciones: null,' },
      { nombre: 'ficha: prende al cliente apagado', de: 'p_activo: fila.activo !== false,', a: 'p_activo: true,' },
      { nombre: 'ficha: sin la guarda del doble toque', de: '      if (!f?.original || f.guardandoApodos) return false', a: '      if (!f?.original) return false' },
      { nombre: 'ficha: el error de la base se tapa', de: "f.errorApodos = err?.message || 'No se pudieron guardar los apodos. Probá de nuevo.'", a: "f.errorApodos = 'No se pudieron guardar los apodos. Probá de nuevo.'" },
      { nombre: 'ficha: guardado no actualiza la lista', de: '        f.apodos = nuevos\n', a: '' },
      { nombre: 'ficha: la lista de clientes no se relee', de: '        estado.clientes = null\n        return true', a: '        return true' },
      { nombre: 'ficha: el campo no se vacía', de: "      if (await guardarApodos(r.apodos) && estado.ficha === f) campo.value = ''", a: '      await guardarApodos(r.apodos)' },
      { nombre: 'ficha: sacar no filtra', de: '      await guardarApodos(f.apodos.filter((_, k) => k !== i))', a: '      await guardarApodos(f.apodos)' },
      { nombre: 'ficha: sacar un índice que no existe manda igual', de: '      if (!Number.isInteger(i) || i < 0 || i >= (f.apodos ?? []).length) return\n', a: '' },
      { nombre: 'ficha: Agregar no se traba', de: "      document.getElementById('ad-f-apodo-agregar').disabled = !!f.guardandoApodos", a: '' },
      { nombre: 'ficha: el error no se muestra', de: '      e.hidden = !f.errorApodos\n    }\n\n    // Lo que va a guardar_cliente', a: '      e.hidden = true\n    }\n\n    // Lo que va a guardar_cliente' },
      { nombre: 'ficha: Enter no agrega', de: "        if (e.key === 'Enter') { e.preventDefault(); agregarApodoFicha() }", a: "        if (e.key === 'Enter') e.preventDefault()" },
      { nombre: 'ficha: las X miden 32 px', de: '      min-width: 44px; min-height: 44px; border: none; background: none; cursor: pointer;', a: '      min-width: 32px; min-height: 32px; border: none; background: none; cursor: pointer;' },
      { nombre: 'ficha: al abrir no dibuja los apodos', de: "        document.getElementById('ad-f-apodo-nuevo').value = ''\n        pintarApodosFicha()\n", a: "        document.getElementById('ad-f-apodo-nuevo').value = ''\n" },
    ],
  },
  {
    suite: SUITE, variable: 'ARCHIVO_RETIROS', escape: 'esc',
    original: process.env.ARCHIVO_BASE_RETIROS || path.join(RAIZ, 'modulos/retiros.html'),
    funciones: [],
    manuales: [
      { nombre: 'retiros: el apodo no va al lado del nombre', de: "${porApodo ? `<span class=\"rt-resultado__apodo\"> · ${resaltar(apodo, busqueda)}</span>` : ''}", a: '' },
      { nombre: 'retiros: el apodo también cuando el nombre coincide', de: '      const porApodo = !!apodo && !normalizar(c.nombre).includes(q)', a: '      const porApodo = !!apodo' },
      { nombre: 'retiros: el apodo sin escapar', de: '<span class="rt-resultado__apodo"> · ${resaltar(apodo, busqueda)}</span>', a: '<span class="rt-resultado__apodo"> · ${apodo}</span>' },
      { nombre: 'retiros: el apodo_coincide de la base no manda', de: '      const apodo = coincide !== undefined\n', a: '      const apodo = false\n' },
      { nombre: 'retiros: la lista de la base no pasa el apodo_coincide', de: ", busqueda, x.apodo_coincide ?? null)", a: ', busqueda)' },
      { nombre: 'retiros: los apodos de la base no se usan', de: '          const apodos = Array.isArray(x.apodos) ? x.apodos : (local?.apodos ?? [])', a: '          const apodos = local?.apodos ?? []' },
    ],
  },
  {
    suite: SUITE, variable: 'ARCHIVO_COBRANZAS', escape: 'escCob',
    original: process.env.ARCHIVO_BASE_COBRANZAS || path.join(RAIZ, 'modulos/cobranzas.html'),
    funciones: [],
    manuales: [
      { nombre: 'cobranzas: el apodo no se dibuja', de: "${apodo ? `<span class=\"cob-cliente-op__apodo\"> · ${escCob(apodo)}</span>` : ''}", a: '' },
      { nombre: 'cobranzas: el apodo sin escapar', de: '<span class="cob-cliente-op__apodo"> · ${escCob(apodo)}</span>', a: '<span class="cob-cliente-op__apodo"> · ${apodo}</span>' },
      { nombre: 'cobranzas: el apodo aunque el nombre coincida', de: '      if (normalizarApodo(c?.nombre).includes(q)) return null\n', a: '' },
      { nombre: 'cobranzas: con una letra igual', de: '      if (q.length < MIN_LETRAS_CLIENTE) return null\n      if (normalizarApodo', a: '      if (normalizarApodo' },
      { nombre: 'cobranzas: no usa el apodo_coincide (siempre ninguno)', de: "      const apodo = String(c?.apodo_coincide ?? '').trim()", a: "      const apodo = ''" },
      { nombre: 'cobranzas: busca por su cuenta en la lista de apodos', de: "      const apodo = String(c?.apodo_coincide ?? '').trim()", a: "      const apodo = String((c?.apodos ?? [])[1] ?? c?.apodo_coincide ?? '').trim()" },
      { nombre: 'cobranzas: vuelve a leer clientes aparte', de: '        else clientes = clientesDeLaEmpresa(data, unidad, texto)\n', a: "        else { clientes = clientesDeLaEmpresa(data, unidad, texto); await supabase.from('clientes').select('id, apodos') }\n" },
      { nombre: 'cobranzas: la lista sin la búsqueda', de: 'a.clientes.map(c => htmlOpcionClienteAsentar(c, texto))', a: 'a.clientes.map(c => htmlOpcionClienteAsentar(c))' },
    ],
  },
]

let det = 0, tot = 0, eq = 0, mal = 0
for (const t of tandas) {
  const r = correrMutaciones({ ...t, salir: false })
  det += r.detectadas; tot += r.total; eq += r.equivalentes; mal += r.fallas
}
console.log(`\nTOTAL: ${det}/${tot} mutaciones detectadas${eq ? ` (+${eq} equivalentes)` : ''}`)
process.exit(det === tot && !mal ? 0 : 1)
