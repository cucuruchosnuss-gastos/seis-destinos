// Mutaciones de test-cobranzas-muchos-comprobantes.js (varios comprobantes en
// una cobranza, agrupados y sin repetidos; 30/10/2026). Ver mutar.js.
//
// Antes de mutar, el BASELINE: sobre el código de antes del cambio
// (git show e6e0c74:modulos/cobranzas.html, el origin/main del que salió la
// rama; commit FIJO, nunca HEAD) la suite tiene que dar ROJO.
//
//   node pruebas/mut-cobranzas-muchos-comprobantes.js
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')

const SUITE = path.join(__dirname, 'test-cobranzas-muchos-comprobantes.js')
const BASE_ANTES = 'e6e0c74'
if (process.env.MUT_SOLO_ANCLAS !== '1') {
  const tmp = path.join(__dirname, 'mut-tmp-muchos-comprobantes-antes.html')
  let antes = null
  try {
    antes = execFileSync('git', ['show', `${BASE_ANTES}:modulos/cobranzas.html`], { encoding: 'utf8', cwd: path.join(__dirname, '..'), maxBuffer: 64 * 1024 * 1024 })
  } catch {
    console.log(`(sin el historial de git: no se corre el baseline ${BASE_ANTES})`)
  }
  if (antes !== null) {
    fs.writeFileSync(tmp, antes)
    let rojo = false
    let salida = ''
    try {
      salida = execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (err) { rojo = true; salida = String(err.stdout || '') }
    fs.unlinkSync(tmp)
    console.log(`Baseline ${BASE_ANTES} (antes del cambio): ${salida.trim().split('\n').pop()}`)
    if (!rojo) { console.log('ABORTADO: la suite da VERDE sobre el código de antes del cambio: no lo está probando.'); process.exit(2) }
  }
}

correrMutaciones({
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/cobranzas.html'),
  // Cada escCob() del resumen y del aviso de repetidos pierde su escape: la
  // suite tiene que verlo (lo que viene de la base y del lector).
  funciones: ['htmlResumenTransferencias', 'htmlRepetido'],
  escape: 'escCob',
  equivalentes: [
    { expr: 'escCob(titulo)', motivo: "titulo es un literal del código ('Transferencias' / 'Depósitos en efectivo'), sin nada escapable" },
    { expr: 'escCob(x.cantidad)', motivo: 'x.cantidad es un número que cuenta gruposDeTransferencias()' },
    { expr: 'escCob(formatearImporte(x.total))', motivo: 'formatearImporte() devuelve "$ " y dígitos, puntos y comas: nada escapable' },
    { expr: 'escCob(formatearImporte(g.total))', motivo: 'formatearImporte() devuelve "$ " y dígitos, puntos y comas: nada escapable' },
  ],
  manuales: [
    // La huella
    { nombre: 'la huella no se calcula', de: '        const sha256 = await huellaDeArchivo(archivo)\n', a: '        const sha256 = null\n' },
    { nombre: 'la huella no viaja en p_fotos', de: "; if (x.sha256) fila.sha256 = x.sha256 }", a: ' }' },
    { nombre: 'la huella en mayúsculas', de: "map(b => b.toString(16).padStart(2, '0')).join('')", a: "map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()" },
    { nombre: 'la huella sin ceros a la izquierda', de: "map(b => b.toString(16).padStart(2, '0')).join('')", a: "map(b => b.toString(16)).join('')" },
    { nombre: 'la huella con SHA-1', de: "await sutil.digest('SHA-256', bytes)", a: "await sutil.digest('SHA-1', bytes)" },
    { nombre: 'la huella que falla tira', de: "        console.error('No se pudo calcular la huella del archivo:', err)\n        return null", a: '        throw err' },
    // El avance
    { nombre: 'el avance cuenta desde cero', de: '      return `Leyendo ${leidas + 1} de ${tanda.total}…`', a: '      return `Leyendo ${leidas} de ${tanda.total}…`' },
    { nombre: 'el avance no se pinta', de: '      return `${lineaAvance}<div class="cob-fotos"', a: '      return `<div class="cob-fotos"' },
    { nombre: 'la tanda no se arma', de: '        estado.tandaLector[tipo] = tanda\n', a: '' },
    { nombre: 'un archivo que no entra no baja el total', de: '        if (!listo) { if (tanda) tanda.total--; continue }', a: '        if (!listo) continue' },
    { nombre: 'uno solo también dice avance', de: '      if (!f || !tanda || tanda.formId !== f.id || tanda.total < 2) return', a: '      if (!f || !tanda || tanda.formId !== f.id) return' },
    { nombre: 'la tanda de otra cobranza se mezcla', de: '      if (!f || !tanda || tanda.formId !== f.id || tanda.total < 2) return', a: '      if (!f || !tanda || tanda.total < 2) return' },
    { nombre: 'sin señal dice "Leyendo"', de: "      if (!navigator.onLine || fotos.some(x => x.errorRed)) return `Sin señal:", a: '      if (false) return `Sin señal:' },
    // El resumen
    { nombre: 'el resumen no separa los depósitos', de: "        const medio = esDeposito(t) ? 'deposito_efectivo' : 'transferencia'\n        const banco", a: "        const medio = 'transferencia'\n        const banco" },
    { nombre: 'el resumen distingue mayúsculas en el banco', de: '        const clave = banco.toLowerCase()\n', a: '        const clave = banco\n' },
    { nombre: 'el resumen suma sin centavos', de: '      return { transferencias: aLista(medios.transferencia), depositos: aLista(medios.deposito_efectivo), total: totalCentavos / 100 }', a: '      return { transferencias: aLista(medios.transferencia), depositos: aLista(medios.deposito_efectivo), total: (lista ?? []).reduce((a, t) => a + (leerNumeroAr(t?.importe) ?? 0), 0) }' },
    { nombre: 'el resumen no cuenta', de: '        g.cantidad++\n', a: '' },
    { nombre: 'el resumen sin total', de: "          <div class=\"cob-resumen-transf__total\">Total: ${escCob(formatearImporte(g.total))}</div>`", a: '`' },
    { nombre: 'el resumen con una sola también', de: '      if ((lista ?? []).length < 2) return \'\'\n      const g = gruposDeTransferencias(lista)', a: '      if (!(lista ?? []).length) return \'\'\n      const g = gruposDeTransferencias(lista)' },
    { nombre: 'el resumen no se repinta al cambiar un importe', de: '        pintarLineaTransferencia(t)\n        pintarResumenTransferencias()\n        pintarRepetidos()', a: '        pintarLineaTransferencia(t)\n        pintarRepetidos()' },
    { nombre: 'el resumen no se pinta con la sección', de: '      pintarResumenFormas()\n      pintarResumenTransferencias()\n', a: '      pintarResumenFormas()\n' },
    { nombre: 'el renglón sin el número de operación', de: "        ref ? `Op. N° ${ref}` : null,\n", a: '' },
    // La pregunta a la base
    { nombre: 'no se pregunta al terminar de leer', de: '        programarRevisionRepetidos(0)\n      }\n    }', a: '      }\n    }' },
    { nombre: 'cambiar el número no vuelve a preguntar', de: "      if (campo === 'referencia' || campo === 'importe') programarRevisionRepetidos()", a: "      if (campo === 'importe') programarRevisionRepetidos()" },
    { nombre: 'cambiar el importe no vuelve a preguntar', de: "      if (campo === 'referencia' || campo === 'importe') programarRevisionRepetidos()", a: "      if (campo === 'referencia') programarRevisionRepetidos()" },
    { nombre: 'sin retardo: cada tecla pregunta', de: '      clearTimeout(estado.timerRepetidos)\n', a: '' },
    { nombre: 'el retardo cambia', de: '    const MS_REVISAR_REPETIDOS = 400', a: '    const MS_REVISAR_REPETIDOS = 0' },
    { nombre: 'sin turno: una respuesta vieja pisa una nueva', de: '      if (turno !== estado.turnoRepetidos || estado.form !== f) return', a: '      if (estado.form !== f) return' },
    { nombre: 'la respuesta de otro formulario se aplica', de: '      if (turno !== estado.turnoRepetidos || estado.form !== f) return', a: '      if (turno !== estado.turnoRepetidos) return' },
    { nombre: 'p_cobranza_id siempre null', de: "p_cobranza_id: f.modo === 'edicion' ? f.id : null", a: 'p_cobranza_id: null' },
    { nombre: 'p_cobranza_id siempre el id', de: "p_cobranza_id: f.modo === 'edicion' ? f.id : null", a: 'p_cobranza_id: f.id' },
    { nombre: 'p_items sin la huella', de: '        sha256: huellaDeTransferencia(f, t),\n      })).filter', a: '      })).filter' },
    { nombre: 'p_items con la clave equivocada', de: '        clave: t.id,\n', a: '        clave: t.foto_id,\n' },
    { nombre: 'p_items manda números cortos', de: "        referencia: referenciaNormalizada(t.referencia) ? String(t.referencia).trim() : null,", a: "        referencia: String(t.referencia ?? '').trim() || null," },
    { nombre: 'el chofer también pregunta', de: '    function programarRevisionRepetidos(ms = MS_REVISAR_REPETIDOS) {\n      if (!puedeProcesar()) return\n', a: '    function programarRevisionRepetidos(ms = MS_REVISAR_REPETIDOS) {\n' },
    { nombre: 'una falla borra lo que se sabía', de: "          formId: f.id, porClave: previo?.porClave ?? new Map(), enviados: previo?.enviados ?? new Map(),", a: '          formId: f.id, porClave: new Map(), enviados: new Map(),' },
    { nombre: 'la falla de red no dice "Sin señal"', de: "          error: esErrorDeRed(resp.error) ? 'red' : 'base',", a: "          error: 'base'," },
    { nombre: 'la falla no se avisa', de: '      aviso.hidden = !error\n', a: '      aviso.hidden = true\n' },
    { nombre: 'normalizar sin mayúsculas', de: "      const r = String(ref ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '')", a: "      const r = String(ref ?? '').replace(/[^0-9A-Z]/g, '')" },
    { nombre: 'normalizar sin sacar puntos y guiones', de: "      const r = String(ref ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '')", a: "      const r = String(ref ?? '').toUpperCase()" },
    { nombre: 'normalizar sin el mínimo de 4', de: "      return r.length >= 4 ? r : ''", a: '      return r' },
    // Los colores y lo que bloquea
    { nombre: 'mismo número con otro importe también es rojo', de: '          if (mismoImporte(t.importe, c.importe)) {', a: '          if (true) {' },
    { nombre: 'mismo número con el mismo importe es amarillo', de: '          if (mismoImporte(t.importe, c.importe)) {', a: '          if (false) {' },
    { nombre: 'mismoImporte sin centavos', de: '&& Math.round(x * 100) === Math.round(y * 100)', a: '&& Math.round(x) === Math.round(y)' },
    { nombre: 'mismoImporte: vacío es igual a cero', de: "      return x !== null && b !== null && b !== undefined && b !== '' && Number.isFinite(y)", a: '      return Number.isFinite(y) && (x ?? 0) !== null' },
    { nombre: 'la misma foto no es rojo', de: "        if (c.motivo === 'misma_foto') {\n          if (!sha || enviado?.sha256 !== sha) continue\n          rojos.push(", a: "        if (c.motivo === 'misma_foto') {\n          if (!sha || enviado?.sha256 !== sha) continue\n          revisar.push(" },
    { nombre: 'la misma foto vale aunque cambió el comprobante', de: '          if (!sha || enviado?.sha256 !== sha) continue', a: '          if (!sha) continue' },
    { nombre: 'el mismo número vale aunque cambió el número', de: '          if (!ref || enviado?.ref !== ref) continue', a: '          if (!ref) continue' },
    { nombre: 'el mismo número en la tanda no se marca', de: '      if (conNumero !== -1) rojos.push(', a: '      if (false) rojos.push(' },
    { nombre: 'el mismo número en la tanda marca a la primera', de: '      const anteriores = lista.slice(0, Math.max(0, i))', a: '      const anteriores = lista.filter(x => x !== t)' },
    { nombre: 'el mismo archivo dos veces no se marca', de: '      if (conArchivo !== -1) rojos.push(', a: '      if (false) rojos.push(' },
    { nombre: 'dos operaciones de la misma foto chocan', de: '      const conArchivo = sha ? anteriores.findIndex(x => x.foto_id && x.foto_id !== t.foto_id && huellaDeTransferencia(f, x) === sha) : -1', a: '      const conArchivo = sha ? anteriores.findIndex(x => huellaDeTransferencia(f, x) === sha) : -1' },
    { nombre: 'el rojo sin quién la cargó', de: "          rojos.push(`Ya cargada: ${textoCobranzaDe(c)}${c.cargada_por ? ', la cargó ' + c.cargada_por : ''} (${datos}).`)", a: '          rojos.push(`Ya cargada: ${textoCobranzaDe(c)} (${datos}).`)' },
    { nombre: 'el rojo sin la fecha', de: "      return `cobranza de ${cliente}${esFechaIso(c?.fecha) ? ' del ' + formatearFechaCob(c.fecha) : ''}`", a: '      return `cobranza de ${cliente}`' },
    { nombre: 'el rojo sin importe', de: "${c.importe != null ? ', ' + formatearImporte(Number(c.importe)) : ''}", a: '' },
    { nombre: 'el rojo sin "Sacar"', de: "      const sacar = rep.nivel === 'rojo'\n", a: "      const sacar = false\n" },
    { nombre: '"Sacar" no hace nada', de: '      else if (d.sacarTransf) quitarTransferencia(d.sacarTransf)\n', a: '' },
    { nombre: 'el rojo no es grave', de: "      return rep?.nivel === 'rojo' ? 'cob-aviso cob-aviso--grave' :", a: "      return rep?.nivel === 'rojo' ? 'cob-aviso' :" },
    { nombre: 'el amarillo no es amarillo', de: "rep?.nivel === 'revisar' ? 'cob-aviso cob-aviso--revisar' : 'cob-aviso'", a: "rep?.nivel === 'revisar' ? 'cob-aviso' : 'cob-aviso'" },
    { nombre: 'la tarjeta en rojo no se marca', de: "${rep.nivel === 'rojo' ? ' cob-transferencia--repetida' : ''}", a: '' },
    { nombre: 'con rojo se puede guardar', de: '      if (hayRepetidosRojos(f)) motivos.push(TEXTO_SACAR_REPETIDOS)\n', a: '' },
    { nombre: 'el amarillo bloquea', de: "      return (f?.transferencias ?? []).some((t, i) => repetidoDeTransferencia(f, t, i).nivel === 'rojo')", a: '      return (f?.transferencias ?? []).some((t, i) => repetidoDeTransferencia(f, t, i).nivel !== null)' },
    { nombre: 'la respuesta no se pinta en el lugar', de: '        if (caja) {\n          caja.className = claseRepetido(rep)', a: '        if (false) {\n          caja.className = claseRepetido(rep)' },
    { nombre: 'la tarjeta no se marca en el lugar', de: "        tarjeta?.classList?.toggle?.('cob-transferencia--repetida', rep.nivel === 'rojo')", a: '' },
    { nombre: 'el renglón en el lugar no se actualiza', de: '      el.textContent = linea\n', a: '' },
  ],
})
