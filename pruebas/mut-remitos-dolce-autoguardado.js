// Mutaciones de test-remitos-dolce-autoguardado.js (Remitos Dolce → Revisar:
// el autoguardado, 29/10/2026): mutan modulos/remitos-dolce.html, que la
// suite recibe por ARCHIVO_TEST. Ver mutar.js.
//
// BASELINE FIJO: antes de mutar, la suite tiene que dar ROJO sobre el
// remitos-dolce.html de 2d04d3e (el main del que salió la rama
// ci-prueba/remitos-autoguardado: con el botón Guardar y sin autoguardado).
// Nunca HEAD.
//
//   node pruebas/mut-remitos-dolce-autoguardado.js
//
// UN RUNNER POR VEZ.
'use strict'

const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')
const SUITE = path.join(__dirname, 'test-remitos-dolce-autoguardado.js')
const BASE = '2d04d3e'

if (process.env.MUT_SOLO_ANCLAS !== '1') {
  let viejo = null
  try {
    viejo = execFileSync('git', ['show', `${BASE}:modulos/remitos-dolce.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  } catch {
    console.log(`(sin el historial de git: no se corre el baseline ${BASE})`)
  }
  if (viejo !== null) {
    const tmp = path.join(__dirname, 'mut-tmp-base-remitos-dolce-autoguardado.html')
    fs.writeFileSync(tmp, viejo)
    let rojo = false
    try {
      execFileSync(process.execPath, [SUITE], { encoding: 'utf8', env: { ...process.env, ARCHIVO_TEST: tmp }, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
    } catch { rojo = true } finally { fs.rmSync(tmp, { force: true }) }
    console.log(rojo ? `BASELINE ${BASE}: la suite da ROJO sobre el módulo de antes (bien).` : `ABORTADO: la suite da VERDE sobre ${BASE}: no prueba lo nuevo.`)
    if (!rojo) process.exit(2)
  }
}

correrMutaciones({
  suite: SUITE,
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/remitos-dolce.html'),
  escape: 'esc',
  funciones: ['htmlGuardadoRemito'],
  equivalentes: [],
  manuales: [
    // El retardo de lo que se escribe
    { nombre: 'los campos de texto sin retardo', de: '        rm.form[d.rmCampo] = t.value\n        marcarSucioRemito(true)', a: '        rm.form[d.rmCampo] = t.value\n        marcarSucioRemito()' },
    { nombre: 'la cantidad sin retardo', de: '        r.cantidad = leerCampoNumero(t)\n        marcarSucioRemito(true)', a: '        r.cantidad = leerCampoNumero(t)\n        marcarSucioRemito()' },
    { nombre: 'los lotes sin retardo', de: '        } else l.cajas = leerCampoNumero(t)\n        marcarSucioRemito(true)', a: '        } else l.cajas = leerCampoNumero(t)\n        marcarSucioRemito()' },
    { nombre: 'cada tecla deja su reloj', de: '      if (rm.temporizador !== null && rm.temporizador !== undefined) clearTimeout(rm.temporizador)\n      rm.temporizador = null\n      if (conRetardo) {', a: '      rm.temporizador = null\n      if (conRetardo) {' },
    { nombre: 'el reloj sin el retardo', de: '}, RETARDO_AUTOGUARDADO_REMITO)', a: '}, 0)' },
    { nombre: 'el reloj no guarda', de: '        rm.temporizador = setTimeout(() => { rm.temporizador = null; autoguardarRemito(rm) }, RETARDO_AUTOGUARDADO_REMITO)', a: '        rm.temporizador = setTimeout(() => { rm.temporizador = null }, RETARDO_AUTOGUARDADO_REMITO)' },
    { nombre: 'lo que se toca no guarda', de: '      } else autoguardarRemito(rm)\n    }', a: '      }\n    }' },
    { nombre: 'el retardo de 5 segundos', de: '    const RETARDO_AUTOGUARDADO_REMITO = 800', a: '    const RETARDO_AUTOGUARDADO_REMITO = 5000' },
    // Una sola llamada a la vez y la respuesta vieja
    { nombre: 'dos llamadas a la vez', de: '      if (rm.guardando) return rm.guardando\n', a: '' },
    { nombre: 'la respuesta vieja dice Guardado', de: '            if (rm.version === version) rm.sucio = false', a: '            rm.sucio = false' },
    { nombre: 'la respuesta vieja pisa el formulario', de: 'aplicarFilaRemito(rm, data, false)', a: 'aplicarFilaRemito(rm, data, true)' },
    { nombre: 'la respuesta no deja la fila al día', de: '              if (rm.filaAlDia) aplicarFilaRemito(rm, data, false)\n', a: '' },
    { nombre: 'el error viejo con algo nuevo detrás', de: '            if (rm.version !== version) continue\n', a: '' },
    { nombre: 'manda aunque no cambió nada', de: '            if (clave !== rm.ultimoGuardado) {', a: '            if (true) {' },
    { nombre: 'una vuelta sin soltar el hilo', de: '        await null\n        while (rm.sucio', a: '        while (rm.sucio' },
    { nombre: 'sin permiso también guarda', de: '      if (rm.pausado || !rm.sucio || !puedeGuardarRemito(rm)) return Promise.resolve()', a: '      if (rm.pausado || !rm.sucio) return Promise.resolve()' },
    // El estado chico
    { nombre: 'el error genérico en vez del de la base', de: "            rm.errorGuardado = err?.message || 'No se pudo guardar el remito. Revisá la conexión.'", a: "            rm.errorGuardado = 'No se pudo guardar el remito. Revisá la conexión.'" },
    { nombre: 'el error no se borra al guardar', de: '            rm.ultimoGuardado = clave\n            rm.errorGuardado = null', a: '            rm.ultimoGuardado = clave' },
    { nombre: 'el error sin rojo', de: "return { clase: ' ad-rm-guardado--error', texto: rm.errorGuardado }", a: "return { clase: '', texto: rm.errorGuardado }" },
    { nombre: 'esperando el retardo no dice Guardando', de: '      if (esperando || rm.guardando) return', a: '      if (rm.guardando) return' },
    { nombre: 'el estado chico no se pinta al volver', de: '        rm.guardando = null\n        pintarGuardadoRemito(rm)', a: '        rm.guardando = null' },
    // Salir del campo
    { nombre: 'salir del campo no manda', de: '      clearTimeout(rm.temporizador)\n      rm.temporizador = null\n      return autoguardarRemito(rm)', a: '      return rm.guardando ?? Promise.resolve()' },
    // Confirmar
    { nombre: 'Confirmar no espera la llamada en curso', de: '      await guardarYaRemito(rm)\n      // Si no había', a: '      guardarYaRemito(rm)\n      // Si no había' },
    { nombre: 'Confirmar confirma aunque el guardado falle', de: "        if (!(await esperarGuardadoRemito(rm))) throw new Error(rm.errorGuardado || 'No se pudo guardar el remito. Revisá la conexión.')", a: '        await esperarGuardadoRemito(rm)' },
    { nombre: 'Confirmar reintenta lo que recién falló', de: '      if (rm.sucio && !enCamino) await autoguardarRemito(rm)', a: '      if (rm.sucio) await autoguardarRemito(rm)' },
    { nombre: 'Confirmar no rearma con lo de la base', de: '        if (rm.ultimoGuardado !== null && rm.filaAlDia) aplicarFilaRemito(rm, {}, true)\n', a: '' },
    { nombre: 'Confirmar rearma con una fila vieja', de: 'if (rm.ultimoGuardado !== null && rm.filaAlDia) aplicarFilaRemito', a: 'if (rm.ultimoGuardado !== null) aplicarFilaRemito' },
    { nombre: 'mientras confirma se sigue guardando', de: '        rm.pausado = true\n        const { data, error } = await supabase.rpc(\'confirmar_remito_precarga\'', a: '        const { data, error } = await supabase.rpc(\'confirmar_remito_precarga\'' },
    { nombre: 'si confirmar falla, lo pendiente no se manda', de: '        if (rm.pausado) seguirAutoguardadoRemito(rm)\n', a: '' },
    // Salir del remito
    { nombre: 'sale sin esperar el guardado', de: '        const ok = await esperarGuardadoRemito(rm)', a: '        const ok = true' },
    { nombre: 'sale aunque la base lo rechace', de: '        if (!ok) {\n          rm.aviso', a: '        if (false) {\n          rm.aviso' },
    { nombre: 'sin permiso igual queda pendiente', de: '      if (!puedeGuardarRemito(rm)) return false\n', a: '' },
    { nombre: 'la pestaña sale sin mandar', de: "      if (estado.vista === 'ad-vista-remito' && pendienteRemito(estado.remito)) { volverDeRemito(p); return }", a: '' },
    // Volver a leer y Descartar
    { nombre: 'volver a leer no espera la llamada en curso', de: "      pintarRemito()\n      await frenarAutoguardadoRemito(rm)\n      try {\n        const { data, error } = await supabase.functions.invoke", a: "      pintarRemito()\n      try {\n        const { data, error } = await supabase.functions.invoke" },
    { nombre: 'descartar no espera la llamada en curso', de: "      pintarRemito()\n      await frenarAutoguardadoRemito(rm)\n      try {\n        const { error } = await supabase.rpc('descartar_remito_precarga'", a: "      pintarRemito()\n      try {\n        const { error } = await supabase.rpc('descartar_remito_precarga'" },
    { nombre: 'la pausa no frena la vuelta', de: '        while (rm.sucio && !rm.pausado && ', a: '        while (rm.sucio && ' },
    { nombre: 'frenar sin pausa: la vuelta en curso manda lo que esperaba', de: '    async function frenarAutoguardadoRemito(rm) {\n      rm.pausado = true\n', a: '    async function frenarAutoguardadoRemito(rm) {\n' },
    { nombre: 'después de leer queda el Guardado viejo', de: '          rm.ultimoGuardado = null\n          rm.errorGuardado = null\n          rm.aviso = fila.estado', a: '          rm.aviso = fila.estado' },
    { nombre: 'la pausa no se levanta', de: '    function seguirAutoguardadoRemito(rm) {\n      rm.pausado = false\n', a: '    function seguirAutoguardadoRemito(rm) {\n' },
    // Los avisos de la página
    { nombre: 'sin el change', de: "      document.getElementById('ad-remito-cuerpo').addEventListener('change', () => guardarYaRemito())\n", a: '' },
    { nombre: 'cerrar sin preguntar', de: '        e.preventDefault()\n        e.returnValue', a: '        e.returnValue' },
  ],
})
