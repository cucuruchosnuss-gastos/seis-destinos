// Mutaciones de test-personalizar.js (Personalizar, js/tablero.js): sacan
// cada escTab() de htmlPersonalizar y rompen las reglas de la pantalla y de lo
// que guarda. Ver mutar.js. De a una.
//
//   node pruebas/mut-personalizar.js
'use strict'

const path = require('path')
const { correrMutaciones } = require('./mutar')

correrMutaciones({
  suite: path.join(__dirname, 'test-personalizar.js'),
  original: path.join(__dirname, '..', 'dashboard.html'),
  funciones: ['htmlPersonalizar'],
  escape: 'escTab',
  manuales: [
    { nombre: 'un fijado no se marca', de: 'data-pz-fijar="${escTab(m.clave)}" aria-pressed="${fijado}"', a: 'data-pz-fijar="${escTab(m.clave)}" aria-pressed="false"' },
    { nombre: 'un fijado dice "Fijar"', de: "${fijado ? 'Fijado' : 'Fijar'}</button></div>", a: "Fijar</button></div>" },
    { nombre: 'la barra se arrastra también en Alfabético', de: "(orden === 'mano' && !fijado ?", a: '(!fijado ?' },
    { nombre: 'el interruptor siempre prendido', de: 'aria-checked="${!t.oculta}"', a: 'aria-checked="true"' },
    { nombre: 'una escondida no baja al 55 %', de: "${t.oculta ? ' pz-fila--apagada' : ''}", a: '' },
    { nombre: 'dice "cuenta" aunque la cuenta no haya contestado', de: "(donde === 'dispositivo'", a: "(false" },
    { nombre: 'sin la línea de dónde se guarda', de: "          : '<p class=\"pz-dispositivo\">Se guarda en tu cuenta: lo ves igual en la compu y en el celular.</p>') +", a: "          : '') +" },
    { nombre: 'el orden elegido sin marcar', de: "class=\"pz-orden__op${k === orden ? ' pz-orden__op--activa' : ''}\"", a: 'class="pz-orden__op"' },
    { nombre: 'sin "FIJADOS ARRIBA"', de: "'<div class=\"pz-grupo\">FIJADOS ARRIBA</div>'", a: "'<div class=\"pz-grupo\"></div>'" },
    { nombre: 'la bajada dice "Mi cuenta" sin nombre', de: "Lo que cambies acá se guarda solo para vos${String(nombre ?? '').trim() ? `, ${escTab(nombreDePila(nombre))}` : ''}.", a: 'Lo que cambies acá se guarda solo para vos, ${escTab(nombreDePila(nombre))}.' },
    // El controlador de la pantalla
    { nombre: 'guardar no avisa a la barra lateral', de: "    try { win.dispatchEvent(new CustomEvent('preferencias:cambio')) } catch { /* sin eventos */ }\n", a: '' },
    { nombre: 'acomodar no avisa a la barra lateral', de: "        try { win.dispatchEvent(new CustomEvent('vista:cambio')) } catch { /* sin eventos */ }\n", a: '' },
    { nombre: 'el tablero no lee la cuenta', de: "  cargarPrefs({ sb, empleadoId: yo.id }).then(p => {\n    estado.prefs = normalizarPrefs(p)\n", a: "  Promise.resolve().then(p => {\n" },
    { nombre: 'Personalizar no dice dónde quedaron', de: ', donde: dondeSeGuardanPrefs(yo.id) })', a: ' })' },
    { nombre: '"Volver a como venía" sin confirmar', de: "case 'tb-acomodar-volver-fabrica': case 'pz-volver-fabrica': abrirConfirmar(t); return", a: "case 'tb-acomodar-volver-fabrica': case 'pz-volver-fabrica': volverDeFabrica(); return" },
    { nombre: 'el panel no se cierra con Escape', de: "    if (e.key === 'Escape' && !el('tb-confirmar').hidden) { cerrarConfirmar(); return }\n", a: '' },
    { nombre: 'el foco no vuelve al cerrar el panel', de: '    alCerrar?.focus?.()\n', a: '' },
    { nombre: 'las flechas mueven sin levantar la manija', de: '    if (!delta || !arriba) return', a: '    if (!delta) return' },
    { nombre: 'la barra se arrastra en Alfabético (controlador)', de: "    if (tipo === 'barra' && estado.prefs.barra.orden !== 'mano') return\n", a: '' },
    { nombre: 'Acomodar no entra en modo acomodar', de: "        estado.acomodar = true\n        mostrarVista('tablero')", a: "        mostrarVista('tablero')" },
    { nombre: '"Sí, volver" no hace nada', de: "case 'tb-confirmar-si': volverDeFabrica(); return", a: "case 'tb-confirmar-si': cerrarConfirmar(); return" },
    { nombre: 'Enter no levanta la manija', de: "    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); levantar(tipo, clave, !arriba); return }", a: '' },
    { nombre: 'el tamaño no se guarda', de: 'if (d.pzTamano) { guardar(conTamano(estado.prefs, d.pzTamano, d.tamano)); pintarPersonalizar(); return }', a: 'if (d.pzTamano) { pintarPersonalizar(); return }' },
  ],
})
