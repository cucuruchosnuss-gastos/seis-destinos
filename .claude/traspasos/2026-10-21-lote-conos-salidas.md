# Traspaso — 21/10/2026: lote vigente, conos sin negativos y salidas entre fábricas

Rama `ci-prueba/lote-vigente-y-conos` (desde `origin/main` 947538b). **Sin integrar**: la audita el chat de la base.
La documentación ya está en `docs/memoria/produccion.md` (dos entradas nuevas bajo "Cargar ingreso") y `docs/memoria/conos.md` (la entrada TEMPORAL bajo "Stock").

## Qué se hizo
1. **Ingreso de producto terminado** (`modulos/produccion-gestion.html`): con lote vigente, "Último lote: X. ¿Sigue siendo este?" con **Sí** (solo lectura) y **No, es otro** (vacío, obligatorio, con foco); sin vigente, el campo obligatorio. Sin lote o sin contestar no se guarda. Lote en mayúsculas, sin espacios en los bordes, 40 caracteres como mucho. Se fueron el tilde, la llamada a `guardar_lote_vigente` y su mensaje (la base guarda el vigente sola).
2. **Conos** (`modulos/conos.html`): `MOSTRAR_NEGATIVOS_CONOS = false` (TEMPORAL): un negativo se ve 0 sin bordó, sin aviso de "Stock negativo", no cuenta como "pocos" y su "Alcanza" dice "—".
3. **Salidas entre fábricas** (`modulos/produccion-gestion.html`): vista de solo lectura sobre `v_salidas_entre_fabricas`, con origen (Mengui de entrada), período (el mes actual de entrada), producto, totales por producto y "Exportar a Excel".

## Decisiones tomadas sin consultar
- **El conteo y el ajuste de conos también muestran 0** en "Stock según el sistema" (el pedido nombraba solo la lista de stock y "Todos los conos"). Ojo: en un **ajuste** (que suma o resta), quien ve 0 con un negativo real puede creer que el resultado es otro. Si molesta, es una línea (`stockVisible(f?.stock)` → `f?.stock` en `abrirConteoAjuste`).
- **No se tocó la tarjeta de Conos del tablero** (`js/tablero.js`, `cargarConos`): sigue diciendo "N conos con stock negativo" en rojo. El pedido acotaba los archivos a `produccion-gestion.html` y `conos.html`. Si se quiere coherente, hay que llevar la misma constante ahí.
- **Al cambiar de producto en un renglón, la pregunta del lote vuelve a aparecer** (y lo escrito se borra): el lote es de cada producto.
- **"No, es otro" vacía el campo** aunque se hubiera contestado Sí antes; **Sí con algo escrito antes manda el vigente**, no lo escrito.
- **Salidas: el origen ofrece todas las fábricas activas** (las de la barra de arriba, sin la de pruebas), no solo las que tienen salidas. La vista es security_invoker sobre `stock_terminado_movimientos`, cuya RLS mira la fábrica **destino**: cada uno ve las salidas hacia las fábricas donde puede ver el stock terminado (no se avisa si faltan las de otra).
- **Salidas: la tabla se acomoda al ancho de la sección** (container query), no al de la pantalla: a 1280 px con la barra lateral y el menú de la gestión quedan ~740 px y siete columnas no entraban (se veía "Dolce Pasta" partido). Tarjetas con rótulos; desde 500 px de sección totales en tabla y 4 columnas; desde 900 px la tabla de 7.
- **Excel**: SheetJS 0.18.5 de cdnjs cargado al usarlo (como el importador de Administración), no el `xlsx-latest` de cdn.sheetjs.com que carga Gastos en el `<head>`. Exporta lo FILTRADO (también el producto).
- Las salidas no tienen link directo (`?vista=salidas`): no se pidió.

## Lo que no se pudo probar
- Nada con sesión real ni contra la base: todo en la maqueta y con un Supabase falso. **La vista `v_salidas_entre_fabricas` se leyó (definición y columnas) pero no tiene filas reales verificadas desde la pantalla.**
- El Excel de verdad (la prueba de navegador usa un SheetJS falso para no depender de la red); el archivo real con SheetJS de cdnjs solo se puede ver en la app.
- El teclado del celular con el lote (mayúsculas mientras se escribe) en un teléfono de verdad.

## Guion para Facu (2 minutos)
1. Gestión de Producción → Stock terminado → "Cargar ingreso" → elegí un producto con lote vigente: tiene que preguntar "Último lote: …". Probá Sí y "No, es otro" (el cursor queda en el campo).
2. Tocá Guardar sin contestar: tiene que decir qué falta, pegado al botón.
3. Conos de papel → Stock: ningún número negativo ni el cartel rojo de "Stock negativo".
4. Stock terminado → "Salidas entre fábricas": Mengui y este mes; probá el filtro de producto y "Exportar a Excel".

## Qué automatizaría ahora
- **La tarea repetida más cara de esta tanda fue armar el sandbox de cada suite nueva** a prueba y error (`textoPlano`, `ZONA_AR`, `fechaCorta`, `puedeTocar`… aparecieron de a uno, cada uno una corrida). Propuesta: que `construirCon` acepte `funciones: 'auto'` y agregue solo las funciones del mismo archivo que el código extraído nombra y no están definidas (un análisis de identificadores libres sobre lo extraído, repetido hasta que no falte nada). Ahorra 3–5 corridas por suite nueva.
- **Los scripts de edición con plantillas de JS (`${…}` adentro de un template literal) se rompieron dos veces**. La skill `editar-archivos` podría traer un helper `reemplazarDesdeArchivos(archivo, [[deArchivo, aArchivo], …])` que lea el texto viejo y el nuevo de archivos de texto, sin ningún escape.
- El ensayo marcó "SE COLGÓ" en las suites cuando en realidad iban lentas porque la máquina corría mutaciones en paralelo. Que `pruebas/ensayo.js` distinga "colgado" (sin salida nueva en N minutos) de "lento" (sigue imprimiendo) y, si es lento, siga hasta un tope mayor.
