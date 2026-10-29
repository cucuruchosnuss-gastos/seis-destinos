// Mutaciones de test-administracion-orden-recepcion.js (la orden interna en
// tránsito / recibida en el detalle de Administración, 29/10/2026): mutan
// modulos/administracion.html (ARCHIVO_TEST). Ver mutar.js.
//
// BASELINE FIJO: la suite tiene que dar ROJO sobre la Administración de
// 497c393 (el main del que salió la rama ci-prueba/recibir-entre-empresas).
// Nunca HEAD.
//
//   node pruebas/mut-administracion-orden-recepcion.js
//
// UN RUNNER POR VEZ.
'use strict'

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-administracion-orden-recepcion.js')
const BASE = '497c393'

if (process.env.MUT_SOLO_ANCLAS !== '1') {
  let viejo = null
  try {
    viejo = execFileSync('git', ['show', `${BASE}:modulos/administracion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  } catch {
    console.log(`(sin el historial de git: no se corre el baseline ${BASE})`)
  }
  if (viejo !== null) {
    const tmp = path.join(__dirname, 'mut-tmp-base-administracion-orden-recepcion.html')
    fs.writeFileSync(tmp, viejo)
    let rojo = false
    try {
      execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
    } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
    console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre la Administración de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo nuevo.`)
    if (!rojo) process.exit(2)
  }
}

correrMutaciones({
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/administracion.html'),
  escape: 'esc',
  funciones: ['htmlRecepcionOrden'],
  equivalentes: [],
  manuales: [
    { nombre: 'no lee la recepción', de: '      const recepcion = await leerRecepcionDeOrden(o)\n', a: '      const recepcion = null\n' },
    { nombre: 'lee la recepción de la empresa equivocada', de: "{ p_unidad_negocio_id: destino, p_estado: null }", a: "{ p_unidad_negocio_id: o.unidad_negocio_id, p_estado: null }" },
    { nombre: 'lee solo las en tránsito', de: "{ p_unidad_negocio_id: destino, p_estado: null }", a: "{ p_unidad_negocio_id: destino }" },
    { nombre: 'toma la primera aunque sea de otra orden', de: '.find(r => r?.orden_id === o.id) ?? { sinDato: true }', a: "[0] ?? { sinDato: true }" },
    { nombre: 'una orden común también lee', de: '      const destino = ordenEntreEmpresas(o) ? empresaGrupoDe(clienteDe(o.cliente_id)) : null\n      if (!destino) return null', a: '      const destino = empresaGrupoDe(clienteDe(o.cliente_id)) ?? o.unidad_negocio_id\n      if (!destino) return null' },
    { nombre: 'el error se toma como sin datos', de: "        return { error: true }\n      }\n    }\n\n    function cantidadRecepcion", a: "        return { sinDato: true }\n      }\n    }\n\n    function cantidadRecepcion" },
    { nombre: 'en tránsito dice recibida', de: "      if (rec.estado === 'en_transito') return `En tránsito a ${destino}: entra a su stock cuando la reciban.`", a: "      if (rec.estado === 'en_transito') return `Recibida por ${destino}.`" },
    { nombre: 'la fecha en UTC y no en Argentina', de: 'el ${fechaHoraHoja(rec.recibida_en).slice(0, 5)}.', a: 'el ${String(rec.recibida_en).slice(8, 10)}/${String(rec.recibida_en).slice(5, 7)}.' },
    { nombre: 'la fecha con el año', de: 'el ${fechaHoraHoja(rec.recibida_en).slice(0, 5)}.', a: 'el ${fechaHoraHoja(rec.recibida_en).slice(0, 10)}.' },
    { nombre: 'sin quién recibió', de: "Recibida por ${limpio(rec.recibida_por) || 'alguien de ' + destino} el", a: 'Recibida por alguien el' },
    { nombre: 'la anulada dice en tránsito', de: '      return `La recepción en ${destino} se anuló: no entró nada a su stock.`', a: '      return `En tránsito a ${destino}: entra a su stock cuando la reciban.`' },
    { nombre: 'las diferencias de una en tránsito', de: "      if (rec?.estado !== 'recibida' || !Array.isArray(rec.items)) return []", a: '      if (!Array.isArray(rec?.items)) return []' },
    { nombre: 'lo que llegó igual se lista', de: '&& Number(i.cantidad_recibida) !== Number(i.cantidad_enviada))', a: ')' },
    { nombre: 'un renglón sin recibir es diferencia', de: "rec.items.filter(i => i?.cantidad_recibida !== null && i?.cantidad_recibida !== undefined && Number", a: 'rec.items.filter(i => Number' },
    { nombre: 'la diferencia sin el lote', de: "${limpio(i.lote) ? ' · Lote ' + limpio(i.lote) : ''}", a: '' },
    { nombre: 'la diferencia sin el motivo', de: "          (limpio(i.motivo_diferencia) ? ` (${limpio(i.motivo_diferencia)})` : ''))", a: "          '')" },
    { nombre: 'el insumo como cajas', de: "      return unidad && unidad !== 'cajas' ? cantidadInsumoHoja(n, unidad) : ", a: '      return ' },
    { nombre: 'una caja en plural', de: "${Number(n) === 1 ? 'caja' : 'cajas'}", a: 'cajas' },
    { nombre: 'sin el color de en tránsito', de: "rec?.estado === 'en_transito' ? ' ad-recepcion--transito'", a: "rec?.estado === 'en_transito' ? ''" },
    { nombre: 'sin el color de recibida', de: ": rec?.estado === 'recibida' ? ' ad-recepcion--recibida' : ''", a: ": ''" },
    { nombre: 'sin la lista de diferencias', de: "        (dif.length ? `<ul class=\"ad-recepcion__difs\"", a: "        (false ? `<ul class=\"ad-recepcion__difs\"" },
    { nombre: 'el detalle sin la recepción', de: '${recepcion}${anulada}</div>`', a: '${anulada}</div>`' },
  ],
})
