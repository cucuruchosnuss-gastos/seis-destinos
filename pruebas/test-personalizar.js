// Personalizar (dashboard.html?vista=personalizar, pantalla 6a del handoff
// "Esqueleto") y lo que guarda: el orden de la barra (a mano / alfabético /
// los que más uso), los fijados, el orden, el tamaño y el "mostrar" de cada
// tarjeta del tablero, y "Volver a como venía" con un panel propio. Se
// EJECUTA htmlPersonalizar con nombres maliciosos, y se prueba que cada cambio
// de preferencias sea el que la pantalla dice.
//
//   node pruebas/test-personalizar.js
'use strict'

const { arnes, marca } = require('./circuito-comun')
const { construir, fuente } = require('./sandbox-tablero')

const { chk, fin } = arnes()
const S = construir()
const crudas = h => (h.match(/<b data-xss="[^"]+">/g) || []).map(x => x.match(/"([^"]+)"/)[1])
const SUPER = { esAdmin: true, esSuperAdmin: true, misModulos: [], misTareas: new Set() }

// ── La pantalla ───────────────────────────────────────────────────────────
{
  const mods = S.modulosDeBarra(SUPER)
  const prefs = { barra: { orden: 'mano', manual: [], fijados: ['produccion', 'cobranzas', 'caja'] } }
  const { fijados, resto } = S.ordenarBarra(mods, prefs)
  const tablero = S.tarjetasOrdenadas(S.tarjetasPosibles(SUPER), { tablero: { ocultas: ['seguridad'] } })
  const h = S.htmlPersonalizar({ nombre: 'Pablo Nuss', orden: 'mano', fijados, resto, tablero })
  chk('el título y la bajada con el nombre de pila', h.includes('>Personalizar</h1>') && h.includes('se guarda solo para vos, Pablo. Los demás siguen viendo lo suyo.'))
  chk('el segmentado A mano / Alfabético / Los que más uso, con el elegido marcado', h.includes('data-orden-barra="alfa"') && h.includes('data-orden-barra="uso"') &&
    /pz-orden__op pz-orden__op--activa" data-orden-barra="mano" aria-pressed="true">A mano/.test(h))
  chk('"FIJADOS ARRIBA" y "EL RESTO"', h.includes('FIJADOS ARRIBA') && h.includes('EL RESTO'))
  chk('un fijado dice "Fijado" (naranja suave) y aria-pressed', /pz-fijar pz-fijar--si" data-pz-fijar="produccion" aria-pressed="true">[\s\S]*?Fijado<\/button>/.test(h))
  chk('uno sin fijar dice "Fijar"', /pz-fijar" data-pz-fijar="gastos" aria-pressed="false">[\s\S]*?Fijar<\/button>/.test(h))
  chk('en "A mano", el resto tiene manija (los fijados no)', h.includes('data-pz-manija-barra="gastos"') && !h.includes('data-pz-manija-barra="produccion"'))
  chk('el tablero: cada tarjeta con manija, tamaño e interruptor', h.includes('data-pz-manija-tablero="produccion"') && h.includes('data-pz-tamano="produccion" data-tamano="ancha"') && h.includes('data-pz-mostrar="produccion"'))
  chk('el tamaño actual marcado (Producción ancha)', /tb-seg__op tb-seg__op--activa" data-pz-tamano="produccion" data-tamano="ancha" aria-pressed="true"/.test(h))
  chk('el interruptor prendido: role=switch, aria-checked="true"', /pz-interruptor pz-interruptor--si" role="switch" aria-checked="true" data-pz-mostrar="produccion"/.test(h))
  chk('una escondida: el interruptor apagado y la fila al 55 %', /pz-interruptor" role="switch" aria-checked="false" data-pz-mostrar="seguridad"/.test(h) && /pz-fila pz-fila--tablero pz-fila--apagada" data-pz-tablero="seguridad"/.test(h))
  chk('"Acomodar sobre el tablero"', h.includes('id="pz-acomodar"') && h.includes('Acomodar sobre el tablero'))
  chk('"Volver a como venía" y lo que hace', h.includes('id="pz-volver-fabrica"') && h.includes('Deja la barra y el tablero como vienen de fábrica.'))
  chk('la línea chica: "Se guarda en este dispositivo."', h.includes('Se guarda en este dispositivo.'))
  const alfa = S.htmlPersonalizar({ nombre: 'P', orden: 'alfa', fijados: [], resto: mods, tablero: [] })
  chk('en Alfabético no hay manijas en la barra (no se arrastra)', !alfa.includes('data-pz-manija-barra'))
  chk('sin fijados: "LOS MÓDULOS"', alfa.includes('LOS MÓDULOS') && !alfa.includes('FIJADOS ARRIBA'))
  chk('sin nombre: la bajada no dice "Mi cuenta"', !S.htmlPersonalizar({ nombre: '', orden: 'mano', fijados: [], resto: [], tablero: [] }).includes('Mi cuenta'))
  const mal = S.htmlPersonalizar({ nombre: marca('nombre'), orden: 'mano', fijados: [{ clave: marca('clave-fijado'), nombre: marca('fijado') }], resto: [{ clave: marca('clave-resto'), nombre: marca('resto') }],
    tablero: [{ clave: marca('clave-tablero'), nombre: marca('tablero'), tamano: 'chica', oculta: false }] })
  chk('todo nombre escapado (también en los aria-label)', crudas(mal).length === 0, crudas(mal).join())
  for (const c of ['fijado', 'resto', 'tablero']) chk(`"${c}" aparece escapado`, mal.includes(`data-xss=&quot;${c}&quot;`))
  chk('el nombre de pila (su primera palabra) aparece escapado', mal.includes('para vos, &quot;&gt;&lt;b.'))
}

// ── Lo que guarda cada cambio ─────────────────────────────────────────────
{
  const mods = S.modulosDeBarra(SUPER)
  const alfa = S.ordenarBarra(mods, { barra: { orden: 'alfa', fijados: ['stock'] } })
  chk('los fijados van siempre arriba, también en Alfabético', alfa.fijados.map(m => m.clave).join() === 'stock' && alfa.resto[0].nombre === 'Accesos')
  const mano = S.ordenarBarra(mods, { barra: { orden: 'mano', manual: ['gastos', 'caja'] } })
  chk('"A mano": el orden guardado primero', mano.resto[0].clave === 'gastos' && mano.resto[1].clave === 'caja')
  const orden = mano.resto.map(m => m.clave)
  chk('mover con el teclado una fila de la barra', S.moverClave(orden, 'caja', -1).slice(0, 2).join() === 'caja,gastos')
  let p = S.conTamano(null, 'cheques', 'mediana')
  p = S.conOculta(p, 'seguridad', true)
  chk('cambiar el tamaño y esconder se guardan en las preferencias', p.tablero.tamanos.cheques === 'mediana' && p.tablero.ocultas.includes('seguridad'))
  const f = S.prefsDeFabrica({ ...p, barra: { orden: 'uso', manual: ['a'], fijados: ['b'] } })
  chk('volver a como venía: todo de fábrica', JSON.stringify(f.tablero) === '{"orden":[],"tamanos":{},"ocultas":[]}' && JSON.stringify(f.barra) === '{"orden":"mano","manual":[],"fijados":[]}')
}

// ── Estático: la pantalla ─────────────────────────────────────────────────
{
  const js = require('./imports').leerJs('tablero.js') || ''
  const html = fuente()
  const sinC = t => t.replace(/^\s*\/\/.*$/gm, '')
  const j = sinC(js)
  chk('cada cambio se guarda al momento (sin botón de guardar)', /if \(d\.pzTamano\) \{ guardar\(conTamano/.test(j) && /if \(d\.pzFijar\) \{/.test(j) && /if \(d\.ordenBarra\) \{[^}]*guardar\(p\)/.test(j))
  chk('guardar escribe las preferencias Y avisa a la barra lateral', /guardarPrefs\(yo\.id, estado\.prefs\)\s*\n\s*try \{ win\.dispatchEvent\(new CustomEvent\('preferencias:cambio'\)\)/.test(j))
  chk('"Volver a como venía" pide confirmación en un panel propio (no confirm())', /case 'tb-acomodar-volver-fabrica': case 'pz-volver-fabrica': abrirConfirmar\(t\)/.test(j) && !/\bconfirm\(/.test(j))
  chk('el panel se cierra con Escape y devuelve el foco', /e\.key === 'Escape' && !el\('tb-confirmar'\)\.hidden\) \{ cerrarConfirmar\(\)/.test(j) && /alCerrar\?\.focus\?\.\(\)/.test(j))
  chk('solo "Sí, volver a como venía" borra', /case 'tb-confirmar-si': volverDeFabrica\(\)/.test(j))
  chk('"Acomodar sobre el tablero" pasa al tablero en modo acomodar', /case 'pz-acomodar':[\s\S]{0,200}estado\.acomodar = true[\s\S]{0,40}mostrarVista\('tablero'\)/.test(j))
  chk('en Alfabético o Los que más uso no se arrastra la barra', /if \(tipo === 'barra' && estado\.prefs\.barra\.orden !== 'mano'\) return/.test(j))
  chk('flechas mueven SOLO con la manija levantada; Enter la levanta y la suelta', /if \(e\.key === 'Enter' \|\| e\.key === ' '\) \{ e\.preventDefault\(\); levantar\(tipo, clave, !arriba\)/.test(j) && /if \(!delta \|\| !arriba\) return/.test(j))
  chk('el panel de confirmación está en la página (role=dialog, aria-modal)', /id="tb-confirmar" hidden role="dialog" aria-modal="true"/.test(html))
}

fin()
