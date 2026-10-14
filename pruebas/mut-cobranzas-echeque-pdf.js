// Mutaciones de test-cobranzas-echeque-pdf.js (e-cheque desde un PDF,
// 14/10/2026). Ver mutar.js.
//
// Antes de mutar, el BASELINE: sobre el código de antes del arreglo
// (git show e9fdabf:modulos/cobranzas.html, commit FIJO, nunca HEAD) la suite
// tiene que dar ROJO. Si diera verde, la suite no estaría probando el arreglo.
//
//   node pruebas/mut-cobranzas-echeque-pdf.js
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')

const SUITE = path.join(__dirname, 'test-cobranzas-echeque-pdf.js')
const BASE_ANTES = 'e9fdabf'
{
  const tmp = path.join(__dirname, 'mut-tmp-echeque-pdf-antes.html')
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
    console.log(`Baseline ${BASE_ANTES} (antes del arreglo): ${salida.trim().split('\n').pop()}`)
    if (!rojo) { console.log('ABORTADO: la suite da VERDE sobre el código de antes del arreglo: no lo está probando.'); process.exit(2) }
  }
}

correrMutaciones({
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(__dirname, '..', 'modulos/cobranzas.html'),
  // Las dos líneas nuevas de la tarjeta: el escape lo cubre además
  // test-cobranzas-xss.js; acá, que la suite las ejecuta.
  funciones: [],
  escape: 'escCob',
  manuales: [
    // La tarjeta aparece al subir
    { nombre: 'la tarjeta no aparece al subir el comprobante', de: '        f.fotos.push(foto)\n        tarjetaParaComprobante(f, foto)\n', a: '        f.fotos.push(foto)\n' },
    { nombre: 'la tarjeta vacía abierta no se usa', de: '      let e = f.echecks.find(echequeSinDatos)', a: '      let e = null' },
    { nombre: 'una tarjeta con datos se adopta', de: "        ['banco_codigo', 'numero', 'emisor', 'cuit_emisor', 'fecha_pago', 'importe'].every(c => String(e[c] ?? '').trim() === '') &&", a: '' },
    { nombre: 'una tarjeta con comprobante se vuelve a adoptar', de: '      return !e.foto_id && !e.ocr_propuesto &&', a: '      return !e.ocr_propuesto &&' },
    { nombre: 'la tarjeta para el comprobante no lleva el comprobante', de: '      else { e = Object.assign(echequeVacio(), { foto_id: foto.id }); f.echecks.push(e) }', a: '      else { e = echequeVacio(); f.echecks.push(e) }' },
    // Se completa ESA tarjeta
    { nombre: 'lo leído agrega otra tarjeta en vez de completar la que espera', de: '        const esperando = f.echecks.find(e => e.foto_id === foto.id && !e.ocr_propuesto)', a: '        const esperando = null' },
    { nombre: 'el primer e-cheque leído no completa la tarjeta', de: '          if (lista.length) completarEcheque(esperando, lista[0])', a: '' },
    { nombre: 'el segundo e-cheque del PDF se pierde', de: '          lista.slice(1).forEach(pr => f.echecks.push(echequeDesdeOcr(pr, foto.id)))', a: '' },
    { nombre: 'quitada mientras leía: lo leído se pierde', de: '        } else if (lista.length) lista.forEach(pr => f.echecks.push(echequeDesdeOcr(pr, foto.id)))', a: '        } else if (false) lista.forEach(pr => f.echecks.push(echequeDesdeOcr(pr, foto.id)))' },
    // Lo escrito no se pisa
    { nombre: 'lo escrito se pisa', de: "      if (!(e?.escritos ?? []).includes(campo)) return false", a: '      return false' },
    { nombre: 'un campo escrito y borrado no se completa', de: "      return campo === 'tipo' || String(e[campo] ?? '').trim() !== ''", a: '      return true' },
    { nombre: 'escribir no se anota', de: '      if (!e.escritos.includes(campo)) e.escritos.push(campo)', a: '' },
    { nombre: 'el banco escrito se pisa', de: "      for (const campo of ['banco_codigo', 'numero', 'sucursal_codigo', 'codigo_postal', 'cuenta', 'emisor', 'cuit_emisor']) {\n        if (!escritoPorPersona(e, campo))", a: "      for (const campo of ['banco_codigo', 'numero', 'sucursal_codigo', 'codigo_postal', 'cuenta', 'emisor', 'cuit_emisor']) {\n        if (true)" },
    { nombre: 'el emisor no se completa', de: "'cuenta', 'emisor', 'cuit_emisor']) {", a: "'cuenta', 'cuit_emisor']) {" },
    { nombre: 'el CUIT no se completa', de: "'emisor', 'cuit_emisor']) {", a: "'emisor']) {" },
    { nombre: 'el importe escrito se pisa', de: "      if (!escritoPorPersona(e, 'importe')) e.importe =", a: '      e.importe =' },
    { nombre: 'el importe leído no se pone', de: "e.importe = typeof pr?.importe === 'number' && Number.isFinite(pr.importe) ? pr.importe : ''", a: "e.importe = ''" },
    { nombre: 'la fecha de emisión escrita se pisa', de: "      if (!escritoPorPersona(e, 'fecha_emision')) {", a: '      {' },
    { nombre: '"A la vista" elegido mientras leía recibe la fecha de pago', de: "      if (!escritoPorPersona(e, 'fecha_pago') && !(escritoPorPersona(e, 'tipo') && e.tipo === 'comun'))", a: "      if (!escritoPorPersona(e, 'fecha_pago'))" },
    { nombre: 'el tipo elegido se pisa', de: "      if (!escritoPorPersona(e, 'tipo'))\n", a: '' },
    // Sin fecha de emisión: hoy, con la leyenda
    { nombre: 'sin fecha de emisión queda vacía', de: '        e.fecha_emision = pr?.fecha_emision || hoyArgentina()', a: "        e.fecha_emision = pr?.fecha_emision || ''" },
    { nombre: 'sin fecha de emisión no se marca', de: '        e.fechaEmisionNoFigura = !pr?.fecha_emision', a: '        e.fechaEmisionNoFigura = false' },
    { nombre: 'la leyenda no sale', de: "data-echeck-aviso-fecha=\"${escCob(e.id)}\"${e.fechaEmisionNoFigura ? '' : ' hidden'}", a: "data-echeck-aviso-fecha=\"${escCob(e.id)}\" hidden" },
    { nombre: 'cambiar la fecha no saca la leyenda', de: "      if (campo === 'fecha_emision') {\n        e.fechaEmisionNoFigura = false", a: "      if (campo === 'fecha_emision') {\n        e.fechaEmisionNoFigura = e.fechaEmisionNoFigura" },
    { nombre: 'la fecha de hoy puesta por el sistema cuenta como corrección', de: '        (!pr.fecha_emision && e.fechaEmisionNoFigura === true)', a: '        false' },
    { nombre: 'una fecha cambiada a mano no cuenta como corrección', de: '        (!pr.fecha_emision && e.fechaEmisionNoFigura === true)', a: '        !pr.fecha_emision' },
    // "Leyendo el comprobante…"
    { nombre: 'la tarjeta no dice "Leyendo"', de: "      return 'Leyendo el comprobante… Podés ir escribiendo: lo que escribas no se pisa.'", a: "      return ''" },
    { nombre: 'ya leída, la tarjeta sigue diciendo "Leyendo"', de: '      if (!foto || foto.leida || e.ocr_propuesto) return', a: '      if (!foto) return' },
    { nombre: 'el aviso de la tarjeta no se pone en el lugar', de: '        linea.hidden = !texto\n        linea.textContent = texto', a: '' },
    { nombre: 'la línea de "Leyendo" no se dibuja', de: "            <div class=\"cob-aviso\" data-echeck-leyendo=\"${escCob(e.id)}\"${leyendo ? '' : ' hidden'}>${escCob(leyendo)}</div>\n", a: '' },
    // El foco
    { nombre: 'repintar pierde el foco', de: '      restaurarFoco(foco)\n', a: '' },
    { nombre: 'el foco vuelve a otro campo', de: '        .find(x => x.dataset?.[clave] === foco.id && x.dataset?.[campo] === foco.campo)', a: '        .find(x => x.dataset?.[clave] === foco.id)' },
  ],
})
