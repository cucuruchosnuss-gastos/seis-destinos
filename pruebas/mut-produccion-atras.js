// Mutaciones de test-produccion-atras.js. Ver mutar.js. De a una.
//
//   node pruebas/mut-produccion-atras.js

const path = require('path')
const { correrMutacionesEnVarios } = require('./mutar')

const suite = path.join(__dirname, 'test-produccion-atras.js')
const RAIZ = path.join(__dirname, '..')

correrMutacionesEnVarios([
  {
    suite, original: path.join(RAIZ, 'modulos', 'produccion.html'), funciones: [], variable: 'ARCHIVO_TEST',
    manuales: [
      { nombre: 'init no instala el atrás', de: '    async function init() {\n      instalarAtras()\n', a: '    async function init() {\n' },
      { nombre: 'popstate no vuelve a poner la entrada', de: "      window.addEventListener('popstate', () => {\n        armarAtras()\n", a: "      window.addEventListener('popstate', () => {\n" },
      { nombre: 'no se re-arma con los toques', de: "      document.addEventListener('pointerdown', armarAtras, true)\n", a: '' },
      { nombre: 'el PIN no se cierra', de: "        if (!estado.pin.enviando) cerrarPin()\n", a: '' },
      { nombre: 'se corta un PIN mandándose', de: "        if (!estado.pin.enviando) cerrarPin()\n", a: "        cerrarPin()\n" },
      { nombre: 'los lotes no se cierran', de: "      if (visible('pr-lote-panel')) { cerrarPanelLote(); return 'ventana' }\n", a: '' },
      { nombre: 'forzar no se cierra', de: "      if (visible('pr-forzar-form')) { document.getElementById('pr-forzar-form').hidden = true; return 'ventana' }\n", a: "      if (visible('pr-forzar-form')) { return 'ventana' }\n" },
      { nombre: 'anular masa no suelta la masa', de: "document.getElementById('pr-anular-masa').hidden = true; estado.anulando = null; return 'ventana' }", a: "document.getElementById('pr-anular-masa').hidden = true; return 'ventana' }" },
      { nombre: 'asignar PIN no suelta la persona', de: "        if (!estado.asignar.enviando) volverAsignarPin()\n", a: '' },
      { nombre: 'el paso anterior es el mismo', de: "        if (i > 0) { irAPasoAgregar(pasos[i - 1].clave); return 'paso' }", a: "        if (i > 0) { irAPasoAgregar(pasos[i].clave); return 'paso' }" },
      { nombre: 'del primer paso no vuelve a la planilla', de: "        document.getElementById('pr-agregar-cancelar').click()\n        return 'seccion'", a: "        return 'seccion'" },
      { nombre: 'la receta no vuelve a la sala', de: "      if (['pr-receta', 'pr-hist-maq', 'pr-masas'].includes(estado.vista)) { mostrarSala(); return 'seccion' }\n", a: '' },
      { nombre: 'la planilla no vuelve al inicio', de: "'pr-abrir', 'pr-abiertos', 'pr-planilla', 'pr-paradas', 'pr-cierre', 'pr-cerrado'].includes", a: "'pr-abrir', 'pr-abiertos', 'pr-paradas', 'pr-cierre', 'pr-cerrado'].includes" },
      { nombre: 'el inicio no dice cómo salir', de: "        : 'Para salir, usá Salir.')", a: "        : 'Volvé.')" },
      { nombre: 'cargando hace algo', de: "      if (!visible('pr-vista')) return 'nada'\n", a: '' },
      { nombre: 'la planta no se anota como instalada', de: '      estado.sesionPlanta = ses\n      marcarPlantaInstalada()\n', a: '      estado.sesionPlanta = ses\n' },
      { nombre: 'la gestión no borra la marca', de: "{ olvidarPlantaInstalada(); window.location.replace('produccion-gestion.html'); return }", a: "{ window.location.replace('produccion-gestion.html'); return }" },
    ],
  },
  {
    suite, original: path.join(RAIZ, 'js', 'salud.js'), funciones: [], variable: 'ARCHIVO_SALUD',
    manuales: [
      { nombre: 'la red no corre al instalar', de: 'export function instalarSalud(supabase, win = globalThis) {\n  volverALaPlantaSiSeSalio(win)\n', a: 'export function instalarSalud(supabase, win = globalThis) {\n' },
      { nombre: 'la red ignora la marca', de: "    if (win.sessionStorage?.getItem(CLAVE_PLANTA_INSTALADA) !== '1') return null\n", a: '' },
      { nombre: 'la red corre en la planta', de: '    if (ruta === planta.pathname) return null\n', a: '' },
      { nombre: 'la red corta el segundo factor', de: "    if (ruta.endsWith('/mfa.html')) return null\n", a: '' },
      { nombre: 'la marca se pone en cualquier pestaña', de: '  try { if (esAppInstalada(win)) win.sessionStorage.setItem(CLAVE_PLANTA_INSTALADA, \'1\') } catch { /* nada */ }', a: '  try { win.sessionStorage.setItem(CLAVE_PLANTA_INSTALADA, \'1\') } catch { /* nada */ }' },
      { nombre: 'olvidar no borra', de: '  try { win.sessionStorage.removeItem(CLAVE_PLANTA_INSTALADA) } catch { /* nada */ }', a: '' },
    ],
  },
])
