// Mutaciones de test-retiros-entre-empresas.js (la carga de una orden a otra
// empresa del grupo, 24/10/2026): mutan modulos/retiros.html, que la suite
// recibe por ARCHIVO_TEST. Ver mutar.js.
//
// BASELINE FIJO: antes de mutar, la suite tiene que estar en ROJO sobre la
// carga de ANTES del cambio (BASE = d2d1dc1, el main del que salió la rama
// ci-prueba/orden-entre-empresas). Si estuviera verde ahí, no probaría nada
// de lo nuevo. Nunca HEAD: al commitear el cambio, HEAD ya lo tiene.
//
//   node pruebas/mut-retiros-entre-empresas.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-retiros-entre-empresas.js')
const BASE = 'd2d1dc1'

// La suite sobre la carga de antes: tiene que dar rojo.
{
  const viejo = execFileSync('git', ['show', `${BASE}:modulos/retiros.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const tmp = path.join(__dirname, 'mut-tmp-base-retiros-entre-empresas.html')
  fs.writeFileSync(tmp, viejo)
  let rojo = false
  try {
    execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'] })
  } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
  console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre la carga de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo nuevo.`)
  if (!rojo) process.exit(2)
}

const r = correrMutaciones({
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/retiros.html'),
  escape: 'esc',
  funciones: [],
  salir: false,
  manuales: [
    // Lo que se lee
    { nombre: 'leerClientes sin unidad_grupo_id', de: "transporte_habitual, activo, provisorio, unidad_grupo_id')", a: "transporte_habitual, activo, provisorio')" },
    { nombre: 'leerClientes no lee los nombres', de: '      await leerEmpresasGrupo(data ?? [])\n', a: '' },
    { nombre: 'los nombres se vuelven a pedir', de: '.filter(id => !estado.empresasGrupo.has(id))', a: '' },
    { nombre: 'el nombre sin limpiar', de: 'estado.empresasGrupo.set(u.id, limpio(u.nombre))', a: 'estado.empresasGrupo.set(u.id, u.nombre)' },
    { nombre: 'un error de los nombres traba la carga', de: "        console.error('No se pudieron leer los nombres de las empresas del grupo:', err)\n", a: '        throw err\n' },
    { nombre: 'se consulta aunque no haya clientes del grupo', de: '      if (!ids.length) return\n      try {\n        const { data, error } = await supabase.from(\'unidades_negocio\')', a: '      try {\n        const { data, error } = await supabase.from(\'unidades_negocio\')' },
    // Quién es otra empresa
    { nombre: 'un unidad_grupo_id vacío cuenta', de: "      return typeof id === 'string' && id ? id : null", a: '      return id ?? null' },
    { nombre: 'nunca es entre empresas', de: '      return !!empresaGrupoDe(clienteDe(f?.clienteId))', a: '      return false' },
    { nombre: 'sin nombre no dice "otra empresa del grupo"', de: "      return limpio(estado.empresasGrupo?.get(id)) || 'otra empresa del grupo'", a: "      return limpio(estado.empresasGrupo?.get(id)) || ''" },
    { nombre: 'el aviso con otro texto', de: '`Va al stock de ${nombreEmpresaGrupo(id)} con los mismos lotes`', a: '`Va al stock: ${nombreEmpresaGrupo(id)}`' },
    // El cliente elegido
    { nombre: 'sin el sello en el cliente elegido', de: `\`\${empresaGrupoDe(c) ? '<span class="rt-sello rt-sello--entre">Orden interna</span>' : ''}</span>\``, a: "`</span>`" },
    { nombre: 'sin el aviso en el cliente elegido', de: '        (empresaGrupoDe(c) ? `<p class="rt-aviso-entre" id="rt-aviso-entre" role="note">${esc(textoEntreEmpresas(c))}</p>` : \'\')', a: "        ''" },
    { nombre: 'el aviso del cliente sin esc', de: 'id="rt-aviso-entre" role="note">${esc(textoEntreEmpresas(c))}</p>', a: 'id="rt-aviso-entre" role="note">${textoEntreEmpresas(c)}</p>' },
    { nombre: 'el catálogo sin el aviso', de: '      avisoCatalogo.textContent = textoEntreEmpresas(clienteDe(f.clienteId))\n', a: '' },
    { nombre: 'el aviso del catálogo siempre a la vista', de: '      avisoCatalogo.hidden = !avisoCatalogo.textContent', a: '      avisoCatalogo.hidden = false' },
    // Sin devoluciones
    { nombre: 'el botón de devolución sigue a la vista', de: "      document.getElementById('rt-agregar-devolucion').hidden = esEntreEmpresas(f)", a: "      document.getElementById('rt-agregar-devolucion').hidden = false" },
    { nombre: 'la devolución se abre igual', de: '      if (!f || esEntreEmpresas(f)) return', a: '      if (!f) return' },
    { nombre: 'la devolución de antes deja confirmar', de: '      if (esEntreEmpresas(f)) {\n', a: '      if (false) {\n' },
    { nombre: 'todos los renglones se marcan', de: '          if (esRenglonDev(r)) faltan.push(`Renglón ${i + 1}: a otra empresa', a: '          if (true) faltan.push(`Renglón ${i + 1}: a otra empresa' },
    // El resumen y la orden confirmada
    { nombre: 'el resumen sin el aviso', de: '        (empresaGrupoDe(c) ? `<p class="rt-aviso-entre" role="note">${esc(textoEntreEmpresas(c))}</p>` : \'\') +\n', a: '' },
    { nombre: 'el aviso del resumen sin esc', de: '<p class="rt-aviso-entre" role="note">${esc(textoEntreEmpresas(c))}</p>` : \'\') +\n', a: '<p class="rt-aviso-entre" role="note">${textoEntreEmpresas(c)}</p>` : \'\') +\n' },
    { nombre: 'la orden confirmada no sabe que fue entre empresas', de: 'entre: data?.entre_empresas === true || esEntreEmpresas(f) ?', a: 'entre: false ?' },
    { nombre: 'solo la base dice entre empresas (sin el cliente)', de: 'nombreEmpresaGrupo(empresaGrupoDe(clienteDe(f.clienteId))) : null,', a: "'' : null," },
    { nombre: 'la orden confirmada sin el aviso', de: "${entre}${aviso}${htmlEstadoFaltantes(h)}", a: '${aviso}${htmlEstadoFaltantes(h)}' },
    { nombre: 'el aviso de la orden confirmada sin esc', de: "${esc('Orden interna: lo que salió entra al stock de ' + h.entre + '.')}", a: "${'Orden interna: lo que salió entra al stock de ' + h.entre + '.'}" },
    // La orden interna (27/10/2026)
    { nombre: 'la interna se numera como una común', de: "      if (!empresaGrupoDe(c)) return 'Se numera al confirmar'\n      const pref", a: "      return 'Se numera al confirmar'\n      const pref" },
    { nombre: 'la interna sin la I', de: "Se numera al confirmar: ${pref}-I-…", a: "Se numera al confirmar: ${pref}-…" },
    { nombre: 'sin prefijo se inventa uno', de: "      return pref ? `Se numera al confirmar: ${pref}-I-…` : 'Se numera al confirmar (orden interna)'", a: "      return `Se numera al confirmar: ${pref || 'N'}-I-…`" },
    { nombre: 'el número de la carga sin esc', de: '<span class="rt-numerar">${esc(textoNumerarInterna(c))}</span>', a: '<span class="rt-numerar">${textoNumerarInterna(c)}</span>' },
    { nombre: 'la confirmada no dice "Orden interna"', de: "${h.entre ? 'Orden interna confirmada' : 'Retiro confirmado'}", a: 'Retiro confirmado' },
  ],
})
console.log(`\nTOTAL: ${r.detectadas}/${r.total} mutaciones detectadas${r.equivalentes ? ` (+${r.equivalentes} equivalentes)` : ''}`)
process.exit(r.detectadas === r.total && !r.fallas ? 0 : 1)
