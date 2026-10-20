// Mutaciones de "¿de dónde salen?" ANTES de confirmar (ver
// test-retiros-origen.js): el bloque de js/faltante-retiro.js y lo que hace
// con él la Carga (modulos/retiros.html).
const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-retiros-origen.js')

correrMutacionesEnVarios([
  {
    suite: SUITE,
    original: path.join(RAIZ, 'js', 'faltante-retiro.js'),
    funciones: [],
    escape: 'escFr',
    manuales: [
      { nombre: 'el prefijo de una fábrica no es DOLCE / MENGUI', de: "    for (const k of ['DOLCE', 'MENGUI', 'NUSS', 'TALLER']) if (n.includes(k)) return k\n", a: '' },
      { nombre: 'el prefijo del proveedor entero', de: "  return (n.replace(/[^A-Z0-9]/g, '') || 'PROVEED').slice(0, 8)", a: "  return (n.replace(/[^A-Z0-9]/g, '') || 'PROVEED')" },
      { nombre: 'el lote mmdd en vez de ddmm', de: 'm ? m[2] + m[1]', a: 'm ? m[1] + m[2]' },
      { nombre: 'la planilla sin el turno', de: "    limpioFr(p.turno) || null,\n", a: '' },
      { nombre: 'se produjo antes sin nota mínima', de: "  if (o.tipo === 'antes') return limpioFr(o.nota).length >= LARGO_MINIMO_MOTIVO_FALTANTE", a: "  if (o.tipo === 'antes') return true" },
      { nombre: 'afuera con fábrica Y proveedor', de: '(!!o.unidadId !== !!o.proveedorId)', a: '(!!o.unidadId || !!o.proveedorId)' },
      { nombre: 'la nota sin permiso no se deja', de: "  if (o?.tipo === 'afuera' && origenCompleto(o) && !puedeIngresar) return `${cual}: ${notaFaltaIngreso(o)}`\n", a: '' },
      { nombre: 'el ingreso sin la fábrica de origen', de: '    p_unidad_origen_id: origen.unidadId ?? null,', a: '    p_unidad_origen_id: null,' },
      { nombre: 'el ingreso sin el proveedor', de: '    p_proveedor_id: origen.proveedorId ?? null,', a: '    p_proveedor_id: null,' },
      { nombre: 'el ingreso con lo pedido y no lo que faltó', de: 'cajas: Number(x.faltaron), lote: loteDeOrigen(origen, hoy)', a: 'cajas: Number(x.pedidas), lote: loteDeOrigen(origen, hoy)' },
      { nombre: 'el ingreso sin el cono', de: 'marca_id: x.marca_id ?? null, cajas: Number(x.faltaron)', a: 'marca_id: null, cajas: Number(x.faltaron)' },
      { nombre: 'el ingreso sin uuid (se duplica)', de: '    p_client_uuid: origen.uuid ?? null,', a: '    p_client_uuid: null,' },
      { nombre: 'el ingreso sin el código de la orden', de: "    p_observaciones: `Faltante de la orden ${limpioFr(codigo) || 'sin código'}`,", a: "    p_observaciones: 'Faltante',"},
      { nombre: 'la planilla sin el turno elegido', de: "{ p_item_id: item, p_turno_id: origen.turnoId }", a: '{ p_item_id: item, p_turno_id: null }' },
      { nombre: 'sin permiso igual carga el ingreso', de: "  if (!puedeIngresar) return { revision: 'pendiente', nota: notaFaltaIngreso(origen) }\n", a: '' },
      { nombre: 'si falla el ingreso igual sigue', de: "  if (ing.error) tirar('ingreso', ing.error)\n", a: '' },
      { nombre: 'faltante_a_lote a otro lote', de: '{ p_item_id: item, p_lote: lote, p_motivo:', a: "{ p_item_id: item, p_lote: 'SIN STOCK', p_motivo:" },
      { nombre: 'faltante_a_lote sin "Viene de"', de: 'p_motivo: `Viene de ${limpioFr(origen.nombre)}` })', a: "p_motivo: 'Ingreso' })" },
      { nombre: 'una falla frena a los demás', de: "      out.push({ itemId: a?.x?.item_id ?? null, ok: false, error: err?.message || String(err), paso: err?.paso ?? null })\n", a: "      out.push({ itemId: a?.x?.item_id ?? null, ok: false, error: err?.message || String(err), paso: err?.paso ?? null })\n      break\n" },
      { nombre: 'el error de la base se tapa', de: "const e = new Error(error?.message || 'No se pudo guardar.')", a: "const e = new Error('No se pudo guardar.')" },
    ],
  },
  {
    suite: SUITE,
    original: path.join(RAIZ, 'modulos', 'retiros.html'),
    variable: 'ARCHIVO_RETIROS',
    funciones: ['htmlOrigenRenglon', 'htmlOtroOrigen', 'htmlResultadosOtro'],
    escape: 'esc',
    equivalentes: [
      { expr: 'esc(cantidadRenglon(r, hay))', motivo: '"N cajas" (un número formateado), del código' },
      { expr: 'esc(cantidadRenglon(r, falta))', motivo: '"N cajas" (un número formateado), del código' },
      { expr: 'esc(textoCajasFr(falta))', motivo: '"N cajas" (un número formateado), del código' },
      { expr: 'esc(loteDeOrigen(o, hoyArgentina()))', motivo: 'el lote: letras y números en mayúsculas, un guion y la fecha (prefijoOrigen saca todo lo demás)' },
      { expr: 'esc(pl.error)', motivo: 'texto constante del código: lo pone asegurarPlanillasForm()' },
      { expr: 'esc(oo.error)', motivo: 'texto constante del código: lo pone asegurarOtrosOrigenes()' },
      { expr: 'esc(texto)', motivo: 'btn() de htmlOrigenRenglon(): los textos que se le pasan los prueba el escape del nombre del origen (sin esc, la marca de origen sale cruda); de las planillas, el botón propio' },
    ],
    manuales: [
      { nombre: 'confirmar sin contestar de dónde salen', de: "        if (faltaOrigen(r)) faltan.push(`Falta decir de dónde salen las cajas del renglón ${i + 1}.`)\n", a: '' },
      { nombre: '"Agregar" cierra sin contestar', de: "      const falta = faltanRenglon(r) ?? (faltaOrigen(r) ? 'decir de dónde salen las cajas' : null)", a: '      const falta = faltanRenglon(r)' },
      { nombre: 'la respuesta vale aunque cambie el producto', de: "o.clave === claveLotesRenglon(r) ? o : null", a: 'true ? o : null' },
      { nombre: 'la fábrica ofrece "otro origen"', de: "if (hab.tipo === 'fabrica') { /* nada */ } else if (r.otroAbierto)", a: 'if (r.otroAbierto)' },
      { nombre: 'un uuid de ingreso nuevo cada vez', de: '        if (!r.uuidIngreso) r.uuidIngreso = nuevoUuid()', a: '        r.uuidIngreso = nuevoUuid()' },
      { nombre: 'el permiso de ingreso sin mirar la fábrica', de: "        return Array.isArray(alcance?.unidades) && alcance.unidades.map(String).includes(String(unidadId))\n      })", a: '        return true\n      })' },
      { nombre: 'sin leer las tareas de materia prima', de: "['retiros', 'stock', 'produccion', 'materia_prima']", a: "['retiros', 'stock', 'produccion']" },
      { nombre: 'la nota no va a las observaciones', de: "[String(f.observaciones ?? '').trim(), ...notasDeOrigen(f)]", a: "[String(f.observaciones ?? '').trim()]" },
      { nombre: 'al confirmar no se resuelve', de: '        if (!h.reintento) await resolverOrigenesDeHecho(h)\n', a: '' },
      { nombre: 'el error no se guarda', de: '        } else if (!o.ok) h.erroresOrigen[o.itemId] = o.error\n', a: '        }\n' },
      { nombre: 'el cartel dice "Dejarlo pendiente" aunque se contestó', de: "${contestado ? 'Cerrar' : 'Dejarlo pendiente'}", a: 'Dejarlo pendiente' },
      { nombre: 'el reintento vuelve a mandar lo resuelto', de: '.filter(x => x && !x.insumo && x.item_id && !h.resueltos?.[x.item_id] &&', a: '.filter(x => x && !x.insumo && x.item_id &&' },
      { nombre: 'el faltante con la respuesta de otro renglón', de: '      const k = Number(x?.renglon) - 1', a: '      const k = 0' },
      { nombre: 'el reintento de la orden no resuelve', de: '          pintarHecho()\n          await resolverOrigenesDeHecho(h)\n', a: '          pintarHecho()\n' },
      { nombre: '"otro origen" ofrece la propia fábrica', de: 'oo.unidades.filter(u => u.id !== estado.empresaId && (', a: 'oo.unidades.filter(u => (' },
      { nombre: 'los proveedores sin escribir', de: "      if (q.length >= 2) {\n        html += provs.length", a: "      if (true) {\n        html += provs.length" },
      { nombre: 'no pide las planillas', de: '      if (faltanteProducto(r) > 0 && !conOrigenAfuera(origenHabitualDe(r))) asegurarPlanillasForm()\n', a: '' },
      { nombre: 'las planillas se piden cada vez', de: '      if (!unidad || estado.planillasForm?.unidad === unidad) return\n', a: '      if (!unidad) return\n' },
      { nombre: 'la nota no se guarda', de: '        o.nota = t.value\n', a: '' },
      { nombre: 'la planilla elegida es otra', de: "        const p = (estado.planillasForm?.lista ?? []).find(x => String(x.turno_id) === String(b?.dataset.turno))", a: '        const p = (estado.planillasForm?.lista ?? [])[0]' },
      { nombre: 'los lotes sin leer inventan la pregunta', de: '      if (!lista) return 0\n      const a = asignacion(r, lista)\n      return a.faltante > 0 ? a.faltante : 0', a: '      const a = asignacion(r, lista ?? [])\n      return cantidadPedida(r) ?? 0' },
      { nombre: 'la tarjeta no dice de dónde salen', de: "      return origenCompleto(o) ? textoOrigenElegido(o) : 'falta decir de dónde salen'", a: "      return 'queda para revisar en Administración'" },
      { nombre: 'el aviso de sin permiso no aparece', de: '        partes.push(puedeIngresarEn(estado.empresaId)\n', a: '        partes.push(true\n' },
      { nombre: 'el error de la base no se escapa', de: '`<span class="rt-falt-estado__como rt-falt-estado__como--pend">No se pudo guardar: ${esc(error)}</span>`', a: '`<span class="rt-falt-estado__como rt-falt-estado__como--pend">No se pudo guardar: ${error}</span>`' },
    ],
  },
])
