// Mutaciones de test-produccion-masa-tamano.js (el tamaño de la masa arranca
// sin elegir, 16/10/2026). Ver mutar.js y mutar-produccion.js.
//
//   node pruebas/mut-produccion-masa-tamano.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-masa-tamano.js'),
  escape: 'esc',
  manuales: [
    // Lo que arranca en null
    { nombre: 'el borrador nuevo vuelve a arrancar en Simple', de: 'tipo: null, doble: null, // null hasta', a: 'tipo: null, doble: false, // null hasta' },
    { nombre: 'el estado vuelve a arrancar en Simple', de: '      salaDoble: null,     // el tamaño elegido', a: '      salaDoble: false,     // el tamaño elegido' },
    { nombre: 'la masa siguiente copia el tamaño de la anterior', de: '      estado.salaDoble = null\n      const como = prev.como', a: '      estado.salaDoble = prev.doble\n      const como = prev.como' },
    { nombre: 'la masa siguiente arranca en Simple', de: '      estado.salaDoble = null\n      const como = prev.como', a: '      estado.salaDoble = false\n      const como = prev.como' },
    // El tri-estado
    { nombre: 'tamanoElegido convierte null en Simple', de: 'return v === true ? true : v === false ? false : null', a: 'return !!v' },
    { nombre: 'tamanoElegido acepta cualquier cosa "verdadera"', de: 'return v === true ? true : v === false ? false : null', a: 'return v ? true : v === false ? false : null' },
    { nombre: 'retomar un borrador con !! (null → Simple)', de: '      estado.salaDoble = tamanoElegido(estado.masa?.doble)', a: '      estado.salaDoble = !!estado.masa?.doble' },
    { nombre: 'retomar un borrador sin normalizar el campo', de: '      if (estado.masa) estado.masa.doble = tamanoElegido(estado.masa.doble)\n', a: '' },
    { nombre: 'elegirComo con !! (null → Simple)', de: '      b.doble = tamanoElegido(estado.salaDoble)', a: '      b.doble = !!estado.salaDoble' },
    // (Sacar esa línea de elegirComo es EQUIVALENTE hoy: la masa ya existe
    // cuando se toca Simple / Doble, y estado.salaDoble siempre copia a
    // masa.doble. Por eso no va como mutación.)
    { nombre: 'elegir Doble no queda en la masa', de: 'if (estado.masa) { estado.masa.doble = doble === true;', a: 'if (estado.masa) { estado.masa.doble = false;' },
    { nombre: 'elegir Doble no queda en el estado', de: '      estado.salaDoble = doble === true\n', a: '      estado.salaDoble = false\n' },
    // Los botones
    { nombre: 'Simple marcado cuando no hay nada elegido', de: 'data-doble="no" aria-pressed="${tam === false ? \'true\' : \'false\'}"', a: 'data-doble="no" aria-pressed="${tam ? \'false\' : \'true\'}"' },
    { nombre: 'Doble no se marca al elegirlo', de: 'data-doble="si" aria-pressed="${tam === true ? \'true\' : \'false\'}"', a: 'data-doble="si" aria-pressed="false"' },
    { nombre: 'el grupo sin elegir no se resalta', de: "${tam === null ? ' pr-receta__tamano--falta' : ''}", a: '' },
    { nombre: 'el grupo queda resaltado después de elegir', de: "${tam === null ? ' pr-receta__tamano--falta' : ''}", a: " pr-receta__tamano--falta" },
    { nombre: 'el resaltado sin borde de aviso', de: '.pr-receta__tamano--falta { box-shadow: 0 0 0 3px var(--p-mal-borde);', a: '.pr-receta__tamano--falta {' },
    // El aviso
    { nombre: 'el aviso no se muestra', de: "document.getElementById('pr-receta-tamano-aviso').hidden = tamanoElegido(b.doble) !== null", a: "document.getElementById('pr-receta-tamano-aviso').hidden = true" },
    { nombre: 'el aviso no se va al elegir', de: "document.getElementById('pr-receta-tamano-aviso').hidden = tamanoElegido(b.doble) !== null", a: "document.getElementById('pr-receta-tamano-aviso').hidden = false" },
    { nombre: 'el aviso con otro texto', de: 'hidden>Elegí SIMPLE o DOBLE</p>', a: 'hidden>Elegí el tamaño</p>' },
    // No deja registrar
    { nombre: 'sin tamaño igual deja registrar', de: "      if (tamanoElegido(b.doble) === null) faltan.push('elegir SIMPLE o DOBLE')\n", a: '' },
    // El ×2 y el payload
    { nombre: 'sin elegir se calcula como doble', de: 'return tamanoElegido(b?.doble) === true ? 2 : 1', a: 'return tamanoElegido(b?.doble) === false ? 1 : 2' },
    { nombre: 'el ×2 no se aplica nunca', de: 'return tamanoElegido(b?.doble) === true ? 2 : 1', a: 'return 1' },
    { nombre: 'p_doble viaja null sin elegir', de: '        p_doble: tamanoElegido(b.doble) === true,', a: '        p_doble: tamanoElegido(b.doble),' },
    { nombre: 'p_doble siempre false', de: '        p_doble: tamanoElegido(b.doble) === true,', a: '        p_doble: false,' },
    { nombre: 'la anterior armada en la tablet pierde el doble', de: 'doble: tamanoElegido(b.doble), es_de_hoy: true,', a: 'doble: false, es_de_hoy: true,' },
  ],
})
