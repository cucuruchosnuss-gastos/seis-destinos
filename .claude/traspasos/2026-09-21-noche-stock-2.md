# Traspaso — Stock, PARTE 13 (21/09/2026, noche): recuento listo para la carga inicial del 1/10

Para el chat de arquitectura. Autocontenido. **Sin commit ni push** (lo pidió el agente que lanzó la tarea). Cero SQL: Supabase solo en lectura, y ni siquiera hizo falta consultarla — los tres cambios son solo de `modulos/stock.html`.

## Qué cambió en `modulos/stock.html`

### 1. Bug del resumen previo al cierre (arreglado)
`abrirModalCerrar()` releía `v_stock_por_lote` con `.select('insumo_id, lote, saldo')`, **sin `contenido_por_bulto`**. Como `claveSaldo()` lleva tres componentes (insumo, lote, presentación), la clave salía con el tercero vacío: ningún renglón con presentación encontraba su saldo (se comparaba contra 0) y las presentaciones de un mismo lote se pisaban en el Map, cayendo sobre la clave del renglón "sin presentación". **Las diferencias estimadas antes de cerrar estaban mal**; el cierre real (`cerrar_recuento`, en el servidor) siempre calculó bien. Ahora el `.select()` trae `contenido_por_bulto`, con un comentario que explica por qué no es opcional.
- **Verificado que no hay otro lugar con dos componentes:** las 4 llamadas a `claveSaldo(` del archivo pasan tres, y los **5** `.select()` de `v_stock_por_lote` traen `contenido_por_bulto` (la suite lo chequea sobre el fuente).

### 2. Botón "0" por renglón del recuento abierto (nuevo)
- "Conté y no hay" con un toque, para los ~160 ceros de los insumos precargados en las 4 unidades. Es **acción explícita**: el guion "—" sigue siendo el default y nada se precarga en 0.
- **Mismo camino que tipear un 0:** `ponerCeroRec(itemId)` escribe el campo con `ponerNumero(input, 0)` (el campo ya está enlazado) y llama a `anotarCantidad`, que marca el ítem sucio, pone "Sin guardar" y programa el autoguardado. La observación no se toca: `guardarConteoAhora` la manda siempre junto con la cantidad.
- Botón `.rec-cero`, **44×44 px** mínimo (`min-height/min-width: 2.75rem`), contorno y no relleno (el primario de la pantalla sigue siendo "Cerrar recuento"). `aria-label="No hay: poner 0 en <nombre escapado>"`.
- **Decisión: con el renglón ya en 0 el botón queda DESHABILITADO, no se esconde**, para que la fila no cambie de ancho bajo el dedo. `refrescarFilaRec` lo actualiza al tipear.
- **Solo en recuento abierto**: se dibuja con `estado.recuento?.estado === 'abierto'`. El historial (recuentos cerrados/anulados) tiene su propio render y no lo dibuja.
- La lista **no se reordena** al tocarlo (orden estable, igual que al tipear).

### 3. Aviso al agregar una presentación a un insumo precargado (hecho, era simple)
Al agregar un renglón CON presentación de un insumo que ya está en la lista sin presentación (mismo lote) y ese renglón **no** está en 0, el texto del modal ("Se agregó 1 ítem…") suma: *"Ojo: <insumo> también está en la lista sin presentación. No cuentes dos veces lo mismo: si todo está en bultos, poné ese renglón en 0."* Helper `avisoRenglonSinPresentacion()`, texto plano (va por `textContent`). No avisa si se agrega sin presentación ni si el otro renglón ya está en 0.

## Qué se verificó
- **`pruebas/test-stock-recuento.js` — 33/33** (nueva). EJECUTA el código real con un DOM falso y un supabase mock que **devuelve solo las columnas pedidas en el `.select()`**: dos presentaciones del mismo lote dan dos saldos distintos y una sola diferencia; el botón se dibuja en abierto y no en cerrado/anulado; al tocarlo el campo queda "0", el ítem sucio, entra al autoguardado y `guardar_conteo` lleva `cantidad_contada: '0'` y la observación previa; el aviso en sus cuatro casos. Contra el archivo anterior no arranca (no existe `ponerCeroRec`).
- **`pruebas/mut-stock-recuento.js` — 15/15 detectadas**, incluidas las cuatro pedidas (sacar `contenido_por_bulto` del select, que el botón no marque sucio, que aparezca en un cerrado, que el payload pierda la observación).
- `pruebas/test-stock-numeros.js`: se le sumó `avisoRenglonSinPresentacion` a su lista de funciones (lo llama `confirmarAgregarItem`). **112/112**, `mut-stock-numeros.js` **46/46**.
- `check-scripts.js` OK; todas las `test-*.js` verdes; `controles-cobranzas.js` 354/354. `stock.html` sin CR.
- **No se probó en un navegador.** Conviene un toque real en el celular: que el botón entre en la fila a 375 px junto al campo, la unidad y la diferencia (la fila es `flex-wrap`, así que en el peor caso la diferencia baja de renglón).

## Qué tocar en CLAUDE.md (sección Stock → FASE 3, "La pantalla del recuento")
- Agregar el botón "0": acción explícita, mismo camino que tipear (ponerNumero + anotarCantidad → sucio → autoguardado), deshabilitado con el renglón en 0, solo en recuento abierto, 44 px.
- Agregar el aviso de presentación nueva sobre un precargado.
- En la entrada de `claveSaldo` (tres componentes): anotar que el resumen previo al cierre tuvo el `.select()` sin `contenido_por_bulto` hasta esta tanda — un caso vivo del modo de falla que esa misma entrada describe — y que ahora hay una suite que chequea que todo `.select()` de `v_stock_por_lote` la traiga.
- En "REGLA DE ORO — Las suites viven en `pruebas/`": sumar `test-stock-recuento.js` / `mut-stock-recuento.js` (33/33, 15/15). `pruebas/README.md` no lo toqué (es compartido).

## Pendientes que quedan de la PARTE 0b (no se hicieron)
- Contar en bultos en renglones con presentación; agrupar por categoría; botón "Actualizar" para dos personas contando a la vez.
- Los que necesitan base: `lote_ilegible` en el recuento, RPC para quitar un renglón, `abrir_recuento` vacío, fecha de corte del saldo. Siguen valiendo los riesgos operativos del 1/10 escritos en la PARTE 0b (no cargar movimientos en una unidad con su recuento abierto).

Sin tareas ni permisos nuevos: no hace falta traspaso al chat de permisos.
