// NINGÚN CONTROL SE PIERDE en modulos/produccion.html.
//
// El archivo nació el 22/09/2026 y creció de a una sub-parte por commit (B1…B7).
// Cada sub-parte commiteada se suma a BASES: la siguiente tiene que conservar
// TODOS los controles (button, input, select, textarea, a) de CADA base, con
// su id, sus data-* y, si no tiene identidad propia, su texto. Los baselines
// son COMMITS FIJOS, nunca HEAD: contra HEAD la prueba deja de probar en el
// momento en que el cambio se commitea.
//
// Además, sobre el archivo actual: cada getElementById('x'), querySelector con
// '#x' o '[data-x]' y cada `.dataset.x` literal apunta a algo que existe.
//
//   node pruebas/controles-produccion.js
// Overrides: ARCHIVO_TEST (el produccion.html bajo prueba). LISTAR=1 muestra el
// inventario.

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { RAIZ, inventario, referenciasDelJs, veces } = require('./controles-comun')

const ARCHIVO = process.env.ARCHIVO_TEST || path.join(RAIZ, 'modulos/produccion.html')

// Un commit por sub-parte ya cerrada, en orden.
const BASES = [
  '9a70841', // B1: estructura y acceso
  'd995d1f', // B2: modo y ¿Quién sos?
  '7aed9b3', // B3: tablero y abrir turno
  'fa693f2', // B4: planilla, paradas y cierre
  '10df632', // B5: sala de masa
  '7cb199b', // B6: configuración
  'f502c3d', // Rediseño parte 1: barra de modos, fondo por modo y acceso con PIN
  'd3f8203', // Rediseño parte 2: tablero de máquinas y abrir turno con varios operarios
  '54a216d', // Rediseño parte 3: la planilla, carga durante el turno y cierre
]

// Controles que cambiaron de texto a propósito: [clave vieja, clave nueva, motivo].
const RENOMBRADOS = [
  ['control:button[data-menu][type=button]', 'control:button#pr-menu-modo[data-menu][type=button]',
    'B6: "Cambiar el modo" ganó un id para ocultarlo a quien no carga desde la tablet; mismo texto y mismo data-menu'],
  ['control:button#pr-btn-cambiar-persona[type=button]', 'control:button#pr-btn-salir[type=button]',
    'Rediseño parte 1: el botón que dejaba la tablet sin nadie se llama Salir y vive en la barra de modos; hace lo mismo'],
  ['control:input#pr-cierre-hora[type=time]', 'control:input#pr-cierre-hora[type=text]',
    'Rediseño parte 3: la hora del cierre pasó a − / + de a 5 minutos con el número editable (P5d). En la tablet, de pie ' +
    'y con harina en las manos, el reloj nativo de un input[type=time] no se puede usar. Mismo campo, mismo id, mismo dato.'],
  ['control:button#pr-cierre-vacio-si[type=button]', 'control:button#pr-cierre-confirmar-si[type=button]',
    'Rediseño parte 3: el panel dejó de preguntar SOLO por "no produjo nada". Ahora junta todo lo que hay que confirmar ' +
    'antes de mandar —una parada sin terminar, y/o que no se cargó nada producido— así que el id decía menos de lo que pregunta.'],
  ['control:button#pr-cierre-vacio-no[type=button]', 'control:button#pr-cierre-confirmar-no[type=button]',
    'Rediseño parte 3: el par del de arriba. Además ahora vuelve a la planilla, que es donde se reanuda la parada o se ' +
    'carga lo que produjo.'],
  ['control:button#pr-masa-volver[type=button]', 'control:button#pr-receta-cambiar[type=button]',
    'Rediseño parte 4: el botón que sale de la masa y vuelve a elegir máquina se llama "Cambiar" y vive en la cabecera ' +
    'de la receta (6c). Mismo destino que "‹ Máquinas": la pantalla de la sala, que ahora trae la máquina, el tamaño y ' +
    'de dónde sale la masa en una sola vista.'],
  ['control:button#pr-btn-nueva-masa[type=button]', 'control:button#pr-masas-nueva[type=button]',
    'Rediseño parte 4: "Nueva masa" ya no vive en la pantalla de una máquina —empezar una masa ES elegir máquina, ' +
    'tamaño y cómo la hacés en 6a/6b— y quedó como "+ Nueva masa" en Masas del turno (6d), que es la única pantalla ' +
    'desde donde hace falta volver a empezar una.'],
  ['control:button[data-registrar][type=button]', 'control:button#pr-receta-registrar[type=button]',
    'Rediseño parte 4: "Registrar masa" dejó de estar adentro del paso del resumen —que ya no existe— y pasó al pie ' +
    'fijo de la receta, con el error pegado al lado. Mismo botón y misma acción (registrar_masa), ahora con id propio ' +
    'porque el pie es HTML estático.'],
]

// Controles RETIRADOS a propósito: [clave, motivo]. La clave se compara DESPUÉS
// de aplicar RENOMBRADOS, así que una que primero se renombró y después se
// retiró se declara con su nombre nuevo.
//
// NINGÚN CONTROL PUEDE DESAPARECER SIN FIGURAR ACÁ CON SU RAZÓN: esa es toda
// la gracia de este chequeo. Un control que se fue sin explicación es
// indistinguible de uno que se perdió al mover código.
const RETIRADOS = [
  ['control:a#pr-volver-dashboard[href=../dashboard.html]',
    'Rediseño parte 1: la tablet está en modo kiosco y el diseño no tiene "Volver" (README, barra de modos). ' +
    'El dashboard se sigue alcanzando desde el menú de la cabecera, que queda para la oficina.'],
  ['control:button#pr-menu-modo[data-menu][type=button]',
    'Rediseño parte 1: "Cambiar el modo de esta tablet" no existe más porque el cambio de modo son los dos ' +
    'botones de la barra, que además dicen en qué modo está la tablet sin abrir ningún menú.'],
  ['control:input#pr-abrir-fecha[type=date]',
    'Rediseño parte 2: la fecha de Abrir turno pasó a ‹ › de 56×64 con el valor al medio (P4a del handoff). ' +
    'En la tablet, de pie y con harina en las manos, el calendario nativo de un input[type=date] no se puede usar; ' +
    'y la fecha nunca se elige libre: va de hoy hacia atrás, de a un día. El valor vive en estado.abrir.fecha y se ' +
    'escribe con los botones data-abrir-dia.'],
  ['control:select#pr-agregar-producto',
    'Rediseño parte 3: elegir el producto pasó de un <select> a botones de 88px en una grilla de 3 columnas (P5b), con ' +
    'los comunes arriba y los de chocolate abajo separados por una línea. Un <select> nativo en la tablet obliga a ' +
    'desplegar una lista y no deja separar los de chocolate, que es lo que evita tocar "Mini" queriendo "Mini chocolate". ' +
    'El control nuevo es data-ag-producto.'],
  ['control:select#pr-agregar-presentacion',
    'Rediseño parte 3: igual que el producto, pasó a botones (data-ag-presentacion) que muestran las unidades por caja ' +
    'en su propia línea, que en un <option> no entra legible.'],
  ['control:button[data-subir][type=button]',
    'Rediseño parte 3: lo producido se carga DURANTE el turno y cada renglón YA es un sublote en la base, con su número ' +
    'sellado en la caja y su stock adentro. No hay nada que reordenar: el orden es el de carga y lo pone la base. ' +
    'Corregir un renglón cargado es data-corregir (corregir_produccion_item) y sacarlo es data-borrar ' +
    '(anular_produccion_item), los dos con motivo.'],
  ['control:button[data-bajar][type=button]',
    'Rediseño parte 3: el par del de arriba, por el mismo motivo.'],
  ['control:select[data-operario]',
    'Rediseño parte 2: un solo operario por máquina en un <select> pasó a VARIOS operarios como chips, que se ' +
    'agregan de a uno con el buscador que se abre dentro de la fila (P4a). abrir_turnos recibe operarios: [uuid, …] ' +
    'por máquina, así que el select de una sola opción no podía representar lo que la RPC acepta. Los controles ' +
    'nuevos son data-mas-operario, data-buscar-op, data-elegir-op, data-cancelar-op y data-quitar-op.'],
  ['control:button[data-ir][type=button]',
    'Rediseño parte 4: la sala dejó de ser un asistente de pasos (tipo → receta → cantidades → lotes → resumen). ' +
    'Elegir máquina, tamaño y cómo la hacés entra en UNA pantalla (6a/6b) y de ahí se cae en la receta entera (6c), ' +
    'que es una planilla con todo a la vista. No queda ningún "Siguiente" al que ir.'],
  ['control:button[data-partida][type=button]',
    'Rediseño parte 4: "Modificar" ya no pregunta "¿de dónde partís?". Arranca de la última masa de HOY de esa ' +
    'máquina —que es lo que se está ajustando— y de la receta vigente si no hay ninguna, y el propio botón lo dice ' +
    '("Parte de la masa 9" / "Parte de la receta vigente"). Una pregunta menos entre el masero y la masa.'],
  ['control:button[data-mismos][type=button]',
    'Rediseño parte 4: NO se pregunta más "¿mismos lotes que la anterior?". Los lotes VIENEN PUESTOS de la masa ' +
    'anterior de esa máquina, se elija original, anterior o modificada, y solo se tocan si uno se terminó. En la ' +
    'primera masa del día llegan vacíos y hay que cargarlos, con Registrar bloqueado hasta que estén.'],
  ['control:select[data-insumo]',
    'Rediseño parte 4: elegir el insumo dejó de ser un <select> propio. En la planilla (6c) hay UNA sola columna ' +
    'Lote, y cada opción del desplegable ES un par (insumo, lote) con su stock; la columna Marca muestra el insumo ' +
    'del lote elegido. Dos desplegables por renglón no entran en un renglón de 64px y obligaban a tocar dos veces ' +
    'para decir una sola cosa. El control que quedó es data-lote.'],
  ['control:button[data-descartar][type=button]',
    'Rediseño parte 4: no hay nada que descartar a mano. El borrador de una masa sin registrar se retoma solo al ' +
    'volver a elegir cómo la hacés —con SU uuid— y se rehace entero ahí mismo. Y una masa PENDIENTE de envío ya no ' +
    'ocupa el lugar de la siguiente: el borrador se guarda bajo su uuid, no bajo el turno, así que la masa que sigue ' +
    'arranca de cero sin pisarla. Que no exista el botón es, además, lo que hace imposible perder una pendiente.'],
  ['control:button[data-reintentar][type=button]',
    'Rediseño parte 4: el "Reintentar ahora" del asistente se fue con el asistente. El reintento sigue estando —y es ' +
    'el mismo: reintentarPendientes()— en el botón de la banda bordó de pendientes, #pr-sala-reintentar, que ya ' +
    'existía y ahora es el único. Además se reintenta solo al volver la conexión, cada 30 s y al entrar a la sala.'],
]

// Controles que SIGUEN estando pero aparecen MENOS VECES en el fuente:
// [clave, cuántas veces ahora, motivo]. No es una excepción al chequeo —la
// clave tiene que seguir existiendo— y si aparece más veces que lo declarado,
// la declaración sobra y se dice.
const MENOS_COPIAS = [
  ['control:button[data-borrar][type=button]', 1,
    'Rediseño parte 3: htmlProducido() tenía DOS ramas con su propio botón "Borrar" —la del renglón normal y la del ' +
    'producto que ya no está en el catálogo— y ahora las dos comparten los mismos botones, así que el control está ' +
    'escrito una sola vez. El botón no se fue: es el que anula el sublote con anular_produccion_item.'],
  ['control:button[data-base][type=button]', 1,
    'Rediseño parte 4: los tres botones de "¿Cómo la hacés?" (Usar la original / Usar la anterior / Modificar) ' +
    'estaban escritos uno por uno y ahora los arma htmlComo(), que es una sola plantilla con su título, su ' +
    'explicación y su "›". Los tres siguen estando en la pantalla: lo que hay una sola vez es el molde.'],
]

let ok = 0
const fallas = []
function chk(nombre, cond, detalle) {
  if (cond) ok++
  else fallas.push(nombre + (detalle !== undefined ? ` — ${detalle}` : ''))
}

try {
  const actual = fs.readFileSync(ARCHIVO, 'utf8')
  console.log(`ARCHIVO ${ARCHIVO} (${actual.length} bytes)`)
  const A = inventario(actual)
  const renombrada = new Map(RENOMBRADOS.map(([v, n, m]) => { console.log(`RENOMBRADO: ${v} → ${n} (${m})`); return [v, n] }))
  const retirada = new Map(RETIRADOS.map(([k, m]) => { console.log(`RETIRADO: ${k} (${m})`); return [k, m] }))
  // Un RETIRADO que ya no hace falta es ruido que tapa el próximo: si el
  // control sigue en el archivo, la declaración sobra y se dice.
  for (const [k] of RETIRADOS) chk(`el retirado ${k} ya no está en el archivo`, veces(A, k) === 0, 'sigue estando: sacá la declaración de RETIRADOS')
  const copias = new Map(MENOS_COPIAS.map(([k, n, m]) => { console.log(`MENOS COPIAS: ${k} × ${n} (${m})`); return [k, n] }))
  for (const [k, n] of MENOS_COPIAS) {
    chk(`el control ${k} sigue en el archivo`, veces(A, k) > 0, 'ya no está: va en RETIRADOS, no en MENOS_COPIAS')
    chk(`${k} aparece las ${n} veces declaradas`, veces(A, k) === n, `aparece ${veces(A, k)}: actualizá o sacá la declaración`)
  }

  if (!BASES.length) console.log('Sin baseline todavía: es la primera sub-parte del archivo.')
  for (const base of BASES) {
    const html = execFileSync('git', ['show', `${base}:modulos/produccion.html`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    const B = inventario(html)
    const claves = [...B.cuenta.keys()].filter(k => k.startsWith('control:'))
    chk(`el baseline ${base} tiene controles (si da cero, no se está leyendo)`, claves.length > 0)
    for (const k of claves) {
      const nueva = renombrada.get(k) || k
      if (retirada.has(nueva)) continue
      const n = veces(B, k), hay = veces(A, nueva)
      const pide = copias.has(nueva) ? Math.min(n, copias.get(nueva)) : n
      chk(`${base}: ${k} sigue estando`, hay >= pide && hay > 0, hay === 0 ? 'FALTA' : `aparece ${hay} y estaba ${n}`)
    }
  }

  const refs = referenciasDelJs(A.referencias)
  chk('el JS apunta a algún id (si da cero, no se están leyendo las referencias)', refs.length > 0)
  for (const r of refs) {
    const existe = r.tipo === 'id' ? A.ids.has(r.valor) : A.datas.has(r.valor)
    chk(`el JS apunta a ${r.tipo === 'id' ? '#' : ''}${r.valor} y existe`, existe, `referencia sin destino: ${r.como}`)
  }

  console.log(`inventario: ${[...A.cuenta.keys()].filter(k => k.startsWith('control:')).length} claves de control, ${A.ids.size} ids, ${A.datas.size} data-*`)
  if (process.env.LISTAR) for (const [k, n] of [...A.cuenta.entries()].sort()) console.log(`  ${n} ${k}`)
  for (const f of fallas) console.log('FALLA ' + f)
  console.log(`${ok}/${ok + fallas.length} ${fallas.length ? 'ROJO' : 'verde'}`)
  process.exit(fallas.length ? 1 : 0)
} catch (e) {
  console.log('ERROR ' + (e && e.stack || e))
  console.log('ROJO')
  process.exit(1)
}
