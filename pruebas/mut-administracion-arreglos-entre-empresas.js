// Mutaciones de test-administracion-arreglos-entre-empresas.js (31/10/2026,
// arreglos de la auditoría, punto 7: "Poner precio" a un traspaso, un
// ingreso desde otra empresa o una transferencia de insumos, los insumos en
// "Mercadería sin valorizar", la fila de una valorización y el ajuste que no
// deja mandar un importe <= 0): mutan modulos/administracion.html, que la
// suite recibe por ARCHIVO_TEST. Ver mutar.js.
//
// BASELINE FIJO: antes de mutar, la suite tiene que estar en ROJO sobre la
// Administración de ANTES del cambio (BASE = 1c20f98, el main del que salió
// la rama arreglos-30-10/p7). Nunca HEAD.
//
//   node pruebas/mut-administracion-arreglos-entre-empresas.js
//
// UN RUNNER POR VEZ.

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')
const { limitesAdministracion } = require('./fuente-cheques')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-administracion-arreglos-entre-empresas.js')
const BASE = '1c20f98'

if (!process.env.MUT_SOLO_ANCLAS) {
  const viejo = execFileSync('git', ['show', `${BASE}:modulos/administracion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const tmp = path.join(__dirname, 'mut-tmp-base-administracion-arreglos-entre-empresas.html')
  fs.writeFileSync(tmp, viejo)
  let rojo = false
  try {
    execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
  } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
  console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre la Administración de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo nuevo.`)
  if (!rojo) process.exit(2)
}

correrMutaciones({
  region: limitesAdministracion,
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/administracion.html'),
  escape: 'esc',
  funciones: ['htmlBotonValorizarEntre', 'htmlAccionSvEntre', 'htmlEntregaRecibeEntre', 'htmlMasRenglonesSvEntre', 'htmlLinkValorizacionEntre',
    'htmlItemValorizarEntre', 'htmlValorizarEntre'],
  equivalentes: [
    { expr: 'esc(origen)', motivo: 'texto armado con constantes del código (ORIGEN_MERCADERIA_ENTRE o "Movimiento") y una fecha validada con esFechaIso: no tiene caracteres que escapar' },
  ],
  manuales: [
    // a) El bloque: mercadería e insumos, uno por movimiento
    { nombre: 'los insumos no van al bloque', de: "    const TIPOS_SIN_VALORIZAR_ENTRE = ['mercaderia', 'insumos']", a: "    const TIPOS_SIN_VALORIZAR_ENTRE = ['mercaderia']" },
    { nombre: 'el grupo sin su referencia_id', de: 'referencia_tipo: f.referencia_tipo ?? null, referencia_id: f.referencia_id ?? null, de, a,', a: 'referencia_tipo: f.referencia_tipo ?? null, de, a,' },
    { nombre: 'el renglón sin "Poner precio"', de: '      if (!accion) accion = htmlAccionSvEntre(g)\n', a: '' },
    { nombre: 'entrega y recibe al revés', de: "      return htmlSelloEmpresa(g?.de, g?.de_unidad) + '<span class=\"ad-entre-sv__flecha\" title=\"le entregó a\">→</span>' + htmlSelloEmpresa(g?.a, g?.a_unidad)", a: "      return htmlSelloEmpresa(g?.a, g?.a_unidad) + '<span class=\"ad-entre-sv__flecha\" title=\"le entregó a\">→</span>' + htmlSelloEmpresa(g?.de, g?.de_unidad)" },
    { nombre: 'el detalle sin resumir', de: 'g.renglones.slice(0, MAX_RENGLONES_SV_ENTRE).map(', a: 'g.renglones.map(' },
    { nombre: 'sin "y N renglones más"', de: "      if (mas <= 0) return ''\n", a: "      return ''\n" },
    { nombre: 'los insumos se suman como cajas', de: "      if (g?.referencia_tipo === 'transferencia_stock') {", a: '      if (false) {' },
    { nombre: 'los insumos de un lote y otro se cuentan dos veces', de: '(g.renglones ?? []).map(f => f?.insumo_id || f?.detalle)).size', a: '(g.renglones ?? []).map(f => f?._id || f?.detalle)).size' },
    { nombre: 'la fila de insumos sin precio no lo dice', de: "        : TIPOS_SIN_VALORIZAR_ENTRE.includes(f?.tipo) && f?.con_precio === false ? 'Sin valorizar:", a: "        : f?.tipo === 'mercaderia' && f?.con_precio === false ? 'Sin valorizar:" },
    { nombre: 'los insumos valorizados se cuentan sin valor', de: "      if (f?.tipo === 'insumos') return f?.con_precio === true\n", a: '' },
    // b) / c) El botón y el permiso
    { nombre: 'la orden con "Poner precio"', de: "      if (!TIPOS_VALORIZABLES_ENTRE.includes(g?.referencia_tipo)) return ''", a: "      if (!g?.referencia_id) return ''" },
    { nombre: 'el botón sin permiso', de: "      if (!puedeValorizarEntre() || !id) return ''", a: "      if (!id) return ''" },
    { nombre: 'sin permiso no lo dice', de: "      if (!puedeValorizarEntre()) return '<p class=\"ad-texto-suave\">Le pone precio quien tiene el permiso de gastos de la empresa.</p>'\n", a: '' },
    { nombre: 'el permiso de otra tarea', de: "    function puedeValorizarEntre() {\n      return tieneTarea('gastos', 'gastos_empresa')", a: "    function puedeValorizarEntre() {\n      return tieneTarea('retiros', 'precios')" },
    { nombre: 'abrir sin permiso', de: '      if (!puedeValorizarEntre() || !id) return\n      const e = datosEntre()', a: '      if (!id) return\n      const e = datosEntre()' },
    // La ventana
    { nombre: 'la ventana no se muestra', de: '      capa.hidden = false\n', a: '' },
    { nombre: 'cerrar no oculta', de: "      if (!v.abierto) { capa.hidden = true; caja.innerHTML = ''; return }", a: "      if (!v.abierto) { caja.innerHTML = ''; return }" },
    { nombre: 'sin precargar el sugerido', de: '        ponerNumero(input, Number(it?.precio_sugerido) > 0 ? Number(it.precio_sugerido) : null)', a: '        ponerNumero(input, null)' },
    { nombre: 'el insumo con 2 decimales', de: "      return unidad === 'cajas' ? 2 : 4", a: '      return 2' },
    { nombre: 'sin la fuente', de: "      const fuente = sugerido ? (FUENTE_PRECIO_ENTRE[it?.fuente] ?? '') : 'sin precio sugerido: ponelo a mano'", a: "      const fuente = sugerido ? '' : 'sin precio sugerido: ponelo a mano'" },
    { nombre: 'sin sugerido no avisa', de: "      const fuente = sugerido ? (FUENTE_PRECIO_ENTRE[it?.fuente] ?? '') : 'sin precio sugerido: ponelo a mano'", a: "      const fuente = FUENTE_PRECIO_ENTRE[it?.fuente] ?? ''" },
    { nombre: 'sin sugerido no va en naranja', de: "'<span class=\"ad-entre-vz__fuente' + (sugerido ? '' : ' ad-entre-vz__fuente--falta')", a: "'<span class=\"ad-entre-vz__fuente' + ''" },
    { nombre: 'el precio de un insumo dice "por caja"', de: "      if (u === 'cajas') return 'Precio por caja'", a: "      return 'Precio por caja'" },
    { nombre: 'el subtotal sin la cantidad', de: '        return centavosEntre(c * p)', a: '        return centavosEntre(p)' },
    { nombre: 'el precio 0 cuenta', de: "        if (p === null || p === undefined || !(p > 0) ||", a: "        if (p === null || p === undefined ||" },
    { nombre: 'el total no dice lo que falta', de: '      if (!cuenta.faltan) return t\n', a: '      return t\n' },
    { nombre: 'el total no se calcula al pintar', de: '        if (i === 0) input.focus?.()\n      })\n      actualizarValorizarEntre()', a: '        if (i === 0) input.focus?.()\n      })' },
    { nombre: 'el subtotal no se pinta', de: "      cuenta.subs.forEach((c, i) => { document.getElementById('ad-entre-vz-sub-' + i).textContent = c === null ? '—' : plataEntre(c / 100, 'ARS') })\n", a: '' },
    { nombre: 'sin la lista interna', de: "      const lista = d.lista_interna ? 'Precios sugeridos de la lista interna \"'", a: "      const lista = false ? 'Precios sugeridos de la lista interna \"'" },
    { nombre: 'sin lista: los productos dicen "costo de compra"', de: "        : d.referencia_tipo === 'transferencia_stock' ? entrega + ' no tiene lista interna: el sugerido sale del costo de compra.'", a: "        : true ? entrega + ' no tiene lista interna: el sugerido sale del costo de compra.'" },
    // Guardar
    { nombre: 'solo van los renglones con precio', de: '        p_precios: (v?.datos?.items ?? []).map((it, i) => ({ clave: it?.clave, precio: precios?.[i] ?? null })),', a: '        p_precios: (v?.datos?.items ?? []).map((it, i) => ({ clave: it?.clave, precio: precios?.[i] ?? null })).filter(x => x.precio !== null),' },
    { nombre: 'el concepto vacío va como ""', de: '        p_concepto: concepto || null }', a: '        p_concepto: concepto }' },
    { nombre: 'el concepto sin limpiar', de: "limpio(document.getElementById('ad-entre-vz-concepto').value))", a: "String(document.getElementById('ad-entre-vz-concepto').value))" },
    { nombre: 'el error de la base se tapa', de: "        errorEl.textContent = err?.message || 'No se pudo guardar el precio.'", a: "        errorEl.textContent = 'No se pudo guardar el precio.'" },
    { nombre: 'tras el error el botón dice siempre "Guardar precio"', de: "        boton.textContent = d.valorizado ? 'Cambiar precio' : 'Guardar precio'", a: "        boton.textContent = 'Guardar precio'" },
    { nombre: 'tras el error no se puede volver a guardar', de: '        v.guardando = false\n        boton.disabled = false', a: '        boton.disabled = false' },
    { nombre: 'al guardar no se cierra', de: '      cerrarValorizarEntre()\n      mostrarExito(', a: '      mostrarExito(' },
    { nombre: 'al guardar no se recarga', de: '      // El movimiento sale del bloque y el saldo por par ya lo incluye.\n      cargarSaldosEntre()\n      cargarEntre()\n', a: '' },
    // Ya valorizado y "Cambiar precio"
    { nombre: 'ya valorizado: el título no cambia', de: "id=\"ad-entre-vz-titulo\">' + (d?.valorizado ? 'Cambiar precio' : 'Poner precio')", a: "id=\"ad-entre-vz-titulo\">' + 'Poner precio'" },
    { nombre: 'ya valorizado: no lo dice', de: '      const valorizado = d.valorizado\n', a: '      const valorizado = false\n' },
    { nombre: 'ya valorizado: la fecha entera', de: "' el ' + diaMesEntre(v?.fecha)", a: "' el ' + fechaCorta(v?.fecha)" },
    // d) La fila de una valorización
    { nombre: 'la fila no dice "Valorización"', de: "      return f?.referencia_tipo === 'traspaso_terminado_precio' ? 'Valorización' : nombreTipoEntre(f?.tipo)", a: '      return nombreTipoEntre(f?.tipo)' },
    { nombre: 'la fila sin "Cambiar precio"', de: "      if (f?.referencia_tipo === 'traspaso_terminado_precio') return htmlLinkValorizacionEntre(f)\n", a: '' },
    { nombre: 'el tipo no se toma del saldo', de: '      return f?.referencia_tipo ?? \'\'\n    }\n\n    function htmlLinkValorizacionEntre', a: '      return \'\'\n    }\n\n    function htmlLinkValorizacionEntre' },
    { nombre: 'sin tipo no prueba los tres', de: '      for (const t of conocido ? [conocido] : TIPOS_VALORIZABLES_ENTRE) {', a: "      for (const t of [conocido || 'traspaso_terminado']) {" },
    { nombre: 'el permiso no corta las pruebas', de: '          if (!/^No encontré/.test(error)) break\n', a: '' },
    { nombre: 'el tipo que contestó no se guarda', de: "tipo: datos?.referencia_tipo || e.vz.tipo }", a: 'tipo: e.vz.tipo }' },
    { nombre: 'la respuesta vieja reabre', de: '      if (e.vz?.turno !== turno) return\n', a: '' },
    // e) El ajuste
    { nombre: 'el ajuste deja pasar cero o negativo', de: "      if (a.importe !== null && a.importe <= 0) return 'El importe tiene que ser mayor que cero.'\n", a: '' },
  ],
})
