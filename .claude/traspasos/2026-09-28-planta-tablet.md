# Traspaso — la planta en la tablet real (28/09/2026)

Arreglos después de probar la planta en la **Samsung Galaxy Tab A11 de Nuss**. Tag de antes:
`antes-de-planta-tablet-2026-09-28`. Supabase en **solo lectura** toda la tanda (cero escrituras).

## A — Errores

### 1. Los operarios salían "—" y "No hay operarios para agregar" — LA CAUSA

El personal (`personal_produccion`) se leía **en un solo lugar: la lista de "¿Quién sos?"**
(`mostrarQuien()`). Pero la tablet entra **sin pasar por esa lista** en dos casos que son los normales
en la fábrica:

- **al recargar** la planta con la persona guardada en `sessionStorage`: `siguientePaso()` va directo a
  `entrarAlModo()`;
- **al volver a un modo** que ya tenía persona: `mostrarQuien()` toma la rama `guardada` y hace
  `return` ANTES del `try` que lee el personal (solo pide el PIN).

En esos caminos `estado.personal` quedaba `[]`: la planilla resolvía los nombres de
`turno_operarios` contra una lista vacía (`nombrePersona()` → "—") y el buscador no tenía a quién
ofrecer. Los datos estaban (37 personas; Villagra Fabián y Tissera Franco en el turno del 7037).

**Arreglo:** `asegurarPersonal()` lee el personal una sola vez (dos pedidos a la vez comparten la
misma promesa) y lo llaman `entrarAlModo()` (sin esperar), `abrirPlanilla()` y `mostrarAbrir()`
(esperando). Si falla, `estado.personalError` y la pantalla dice "No se pudo cargar el personal"
en vez de "No hay operarios para agregar".

### 2. La máquina cerrada seguía elegida

`maquinaCerrada(turnoId)` ahora suelta `estado.planilla` si era esa máquina y repinta la barra: la
tarjeta del lote se va y Lo producido / Paradas / Cerrar planilla quedan apagadas. De paso,
**la barra lateral no se repintaba al terminar de cargar una planilla** (se pintaba al empezar, con la
planilla en null): `pintarPlanilla()` la repinta. El título del cierre decía "Cerrar Máquina" porque el
nombre salía del tablero, que no siempre está cargado: `leerPlanilla()` lee `maquinas.nombre`
(con el tablero como respaldo).

### 3. Tiempo real

Canal de Supabase Realtime sobre las cinco tablas publicadas (verificado con
`pg_publication_tables`). **Las policies de esas tablas son `puede_ver_produccion()` SIN unidad**
(verificado con `pg_policies`): el servidor le mandaría a la tablet los cambios de las otras fábricas.
Por eso el filtro va dos veces: en la suscripción (`turnos_produccion` por `unidad_negocio_id`, el resto
por `turno_id=in.(…)` de los turnos abiertos o pendientes de ESA fábrica, más el de la planilla y el de
la sala) y al recibir (`cambioEsDeMiFabrica()`). Los cambios se juntan 400 ms y se redibuja lo que se
está viendo (tablero, planilla, sala, masas de la receta, historial). Lo que se está escribiendo (el PIN,
una masa, un producto, el cierre) no se toca: solo se releen sus datos. Un cierre desde otra tablet
suelta la máquina y lo avisa. El canal se rearma cuando cambian los turnos, reconecta a los 5 s si se
cae y se rearma al volver del bloqueo (`alReanudar`).

**No probado con la base real** (el Realtime necesita sesión; en e2e el WebSocket no se simula).

### 4. El registro de errores vacío

`js/salud.js` **sí carga en la planta** (lo instala `js/supabase.js`), y ahora hay una prueba que lo
demuestra: `e2e/6-planta-reanudar.spec.js` ve llegar `registrar_error_app` al abrir. `errores_app` tenía
0 filas porque en la mañana de pruebas **no hubo errores que se registren**: los de la base con
`raise` (P0001, como "la planilla ya está cerrada") se consideran de negocio y no se anotan a propósito,
y los bugs de la mañana eran de lógica (no tiraban). Ahora:
- **evento `pantalla`** una vez por sesión: `1007px × 604px · DPR 1.33 · landscape-primary` y un JSON con
  ancho, alto, dpr, orientación e instalada. **Con "px" pegado**: `limpiarTexto()` tapa los números
  sueltos de 4 cifras (por los PIN) y "1000" llegaba como "#".
- evento `planta` cuando no se puede leer una planilla y cuando se cae el tiempo real.

## B — El tamaño real

Bloque de CSS **"LA TABLET REAL"** al final del `<style>` y, último de todo, **"LA TABLET PARADA"**.
Medido en la maqueta a **1000 × 540**, **600 × 940** y **1280 × 800**: **ninguna pantalla scrollea**, nada
se sale de su recuadro, ninguna palabra se corta y el lote nunca va en dos renglones.
- La barra lateral pasa arriba **solo con la tablet parada** (`orientation: portrait`) o angosta (≤ 760):
  apaisada a 1000 px sigue al costado, de **208 px**. Parada va en tres renglones bajos.
- Texto base 15 px, botones 44 px (la suite de acceso pasó de "≥ 16 px y ≥ 48 px" a "≥ 11 px y ≥ 30 px",
  que es lo que la tablet real permite; el teclado del PIN sigue grande, de 48 a 72 px según el alto).
- **Las listas largas scrollean en su recuadro** (`data-scroll-propio`): los conos, lo producido, los
  lotes, las masas del turno.
- `e2e/8-planta-tamanos.spec.js` (6.) abre cada pantalla de los dos modos a los tres tamaños y mide con
  `e2e/medir-pantalla.js`; tiene además una prueba del propio medidor. Corre en cada push (maqueta).
- `node e2e/recorrer-planta.js <carpeta> 1000x540 600x940` (con la maqueta levantada) deja una captura
  y la medición de cada pantalla: es lo que se usó para ajustar.

## C — Pantallas

- **7. PIN como ventana**: la lista ocupa toda la pantalla; al tocar a alguien, el teclado aparece en una
  ventana en el centro con el fondo oscurecido (apaisada en dos columnas: datos a la izquierda, teclado
  del 1 al 0 a la derecha). Siempre tiene salida ("Elegir otra persona" / "Soy otra persona" /
  "Cancelar"); el fondo y Escape la cierran. Igual el maestro y "Asignar PIN" (con su "Cancelar").
- **8. Abrir turno**: fecha y turno en una columna angosta; los operarios como **etiquetas chicas, todas a
  la vista**, que se tocan para elegir; el buscador está pero no toma el foco. Un operario de otra máquina
  aparece apagado y dice en cuál.
- **9. La receta**: la máquina, la masa y el tamaño en UNA fila; **Original / Anterior / Modificar como
  tres botones chicos en una fila**; sin la pastilla aparte del origen; un renglón bajo por ingrediente
  (Ingrediente con la marca al lado | Cantidad | Lote con "quedan" | Otro). Apaisada, "Registrar masa"
  va abajo de las masas del turno, a la derecha.
- **10. La ventana de lotes**: una lista con todos los lotes de todas las marcas, renglones chicos
  ("La Clásica · lote 08/09/26 · quedan 2.425 kg"), **el más viejo arriba con "Usar primero"**, filtros
  por marca, el de la masa anterior marcado. Los "Otro lote de …" por insumo se fueron: queda **un** link
  "El lote no está en la lista: escribirlo" (del insumo elegido o del primero). **Decisión:** el pedido
  decía "sin botones de Otro lote aparte"; se dejó ese único link porque un lote sin ingreso cargado
  tiene que poder escribirse (registrar_masa lo acepta y lo marca `lote_fuera_de_stock`).
- **11. Lo producido en tres columnas**: la barra, los pasos (con lo elegido, tocables) y las opciones del
  paso actual. **Tocar una opción la elige y pasa sola** (la caja también: el embolsado quedó al lado de
  las cajas). Productos: la familia chica arriba y el tamaño grande (`partesNombreProducto`), los de
  chocolate aparte y con la etiqueta entera en marrón. "Con cono" de colores, "Sin cono" blanco. La lista
  de conos es la única que scrollea.
- **12. Corregir todo un renglón**: "Corregir" abre los mismos pasos con lo que ya estaba, en las cajas y
  con el motivo; manda a `corregir_produccion_item_completo` **solo las claves que cambiaron** (sin cono,
  `marca_id: null`; sin empaque legible, no toca caja ni embolsado). Si el catálogo no se pudo leer,
  queda el panel viejo de solo cajas.
- **13.** Cada renglón en una línea (lo que no entra se corta con "…" y el texto entero queda en el
  `title`); "sin empaque" como etiqueta corta; **"Anular"** en vez de "Borrar".
- **14.** Paradas en bordó: "Paró ahora", la tarjeta y su título.
- **15.** La planilla de un vistazo: operarios, masas y paradas en una fila arriba, lo producido a todo el
  ancho abajo.
- **16. El reloj**: "28/09/2026 · 12:37" (hora argentina) arriba de la barra lateral y en la banda de
  "¿Quién sos?"; se reescribe solo al minuto justo y después cada minuto.

## D — Automatizar

- **17.** El hook `sin-one-liners-de-edicion` frena también `sed -i` (y combinado, `-i.bak`,
  `--in-place`), `perl -pi` y un `sed` con reemplazo que escribe a un archivo con `>`/`>>`. Los de solo
  lectura pasan. `test-hook-one-liner.js` 63/63, mut 18/18 (lo que está entre comillas no cuenta: un mensaje de commit que dice "sed -i" pasa). **Lo usé yo en esta misma tanda** antes de
  cambiarlo, y dos heredocs se comieron barras: la regla sirve.
- **18.** La maqueta de la planta tiene volumen real (`pruebas/datos-maqueta/produccion.js`): 10
  ingredientes, harina de tres marcas con 7 lotes, los 8 cucuruchones, 16 conos, 3 cajas, 14 operarios,
  6 masas y 6 sublotes (uno anulado, dos sin caja), dos paradas.

## Lo que la base cambió hoy (verificado, solo lectura)

- `corregir_produccion_item_completo(p_item_id, p_datos, p_motivo)`: leída con `pg_get_functiondef`.
- `supabase_realtime` con las cinco tablas: `pg_publication_tables`.
- Los productos de chocolate con `tipo_masa='Chocolate'` y el orden nuevo: consultado.
- **No se hizo en esta tanda** (queda para la próxima): `resumen_cobranzas` con `p_unidad`, `reabrir_cobranza`
  que limpia la unidad, y `proyectos_taller` con `cliente_id` en Administración. Son de otros módulos y no
  entraban en el orden A-B-C-D.

## Lo que NO se probó

- **Nada en la tablet real ni con sesión**: el tiempo real, el evento `pantalla` con la base, el PIN como
  ventana con el dedo, el reloj anclado.
- `e2e/1-planta.spec.js` (con la base, necesita los secretos del robot) se ajustó a las etiquetas de
  operarios y al paso de la caja, pero **nunca corrió**; usa `#pr-btn-abrir-turno` y
  `[data-modo="produccion"]`, que habría que revisar la primera vez que corra.

## Guion para probar en la tablet

1. Instalá / abrí la planta. Mirá **Administración → Errores de la app**: tiene que haber un evento
   **pantalla** con `1007px × 604px · DPR 1.33` (o parecido) y "instalada: true".
2. ¿Quién sos? → tocá tu nombre: el teclado aparece en una ventana al centro. Tocá afuera: se cierra.
3. Entrá. Arriba de la barra: la fecha y la hora. Esperá un minuto: cambia sola.
4. Recargá la tablet (deslizando) y abrí la planilla de una máquina: **tienen que verse los nombres de
   los operarios**, y "+ Sumar" tiene que ofrecer a los demás.
5. Abrir turno: los operarios como etiquetas; tocá dos. El teclado de Android NO tiene que abrirse solo.
6. Con dos tablets (o la tablet y la compu en la gestión): registrá una masa en Sala de masa y mirá la
   planilla en la otra: **aparece sola**, sin deslizar.
7. Lo producido: tocá Mini → Con cono → la presentación → el cono → la caja: cada toque pasa solo. Mirá
   que Chico/Grande/Standard de chocolate vayan abajo, en marrón.
8. Corregí un renglón: cambiá el cono y las cajas, poné el motivo y guardá. El sublote no cambia.
9. Cerrá la planilla: la tarjeta del lote se va de la barra y "Cerrar planilla" queda apagada.
10. Parada: "Paró ahora" en bordó. Girá la tablet: todo tiene que entrar sin deslizar en las dos
    posiciones.

## Qué automatizaría ahora

**Lo más caro que se repitió en esta tanda:** actualizar a mano las suites viejas de Producción cada vez
que cambia el HTML de un render (abrir, cierre, empaque, lotes, masa, legible, sin-empaque, acceso: ocho
suites tocadas por un rediseño visual). Muchas afirman el HTML exacto con regex (`class="…" data-x="…"
aria-pressed="…">Texto`), así que un cambio de orden de atributos o una clase nueva las rompe aunque la
regla no cambió. **Propuesta:** un helper `consultar(html, selector)` en `pruebas/` (un parser chico de
HTML, sin dependencias, o `node:html` si aparece) para que las suites afirmen por selector y atributo
(`hay('[data-toggle-op="0"][aria-pressed="true"]', 'Ramón Díaz')`) en vez de por texto exacto, y migrar
primero las suites de Producción. Segundo: correr `e2e/recorrer-planta.js` también en CI y subir las
capturas como artefacto, para mirar la tablet sin levantar nada.
